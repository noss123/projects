#!/usr/bin/env python3
"""
MI-GAN Inference Script for QNN on HTP/NPU

The MI-GAN Generator model expects:
- Input: (1, 4, 512, 512) float32 tensor where:
  - Channel 0: mask - 0.5 (mask normalized to [-0.5, 0.5])
  - Channels 1-3: image * mask (masked RGB image, normalized to [-1, 1])
- Output: (1, 3, 512, 512) float32 tensor (inpainted image, normalized to [-1, 1])

This is different from AOTGAN which takes two separate inputs.
"""

import numpy as np
from PIL import Image
import subprocess
import os
import json
import glob
import re
import csv

# --- Configuration Variables ---
backend_choice = "1"  # "1" for CPU, "2" for GPU, "3" for HTP/NPU
device_path = "/data/local/tmp/qnn_test"
image_folder = "image_with_object"
mask_folder = "masked_image"
output_folder = "migan_output"
csv_folder = "migan_csv"

# Model files for different backends
model_bin = "migan_generator_512_qnn_fp16.bin"  # For HTP context binary
model_so = "migan.so"          # For CPU/GPU shared library

# --- HTP Backend Configuration ---
HTP_CONFIG = {
    "backend_extensions": {
        "shared_library_path": "libQnnHtpNetRunExtensions.so",
        "config_file_path": "htp_backend_ext.json"
    }
}

HTP_BACKEND_EXT_CONFIG = {
    "devices": [
        {
            "cores": [
                {
                    "perf_profile": "burst",
                    "rpc_control_latency": 100
                }
            ]
        }
    ],
    "graphs": [
        {
            "fp16_relaxed_precision": 1,
            "vtcm_mb": 8,
            "O": 3
        }
    ]
}

def ensure_htp_configs_exist():
    """Create HTP config files if they don't exist."""
    if not os.path.exists("htp_config.json"):
        with open("htp_config.json", "w") as f:
            json.dump(HTP_CONFIG, f, indent=2)
        print("Created htp_config.json")
    
    if not os.path.exists("htp_backend_ext.json"):
        with open("htp_backend_ext.json", "w") as f:
            json.dump(HTP_BACKEND_EXT_CONFIG, f, indent=2)
        print("Created htp_backend_ext.json")

def run_command(command, capture=True):
    """Runs a command and prints its output."""
    print(f"▶️  Executing: {' '.join(command)}")
    try:
        result = subprocess.run(
            command, check=True, text=True, 
            capture_output=capture
        )
        if capture and result.stdout:
            print(result.stdout)
        if capture and result.stderr:
            print(result.stderr)
        print("✅ Success!")
        return True, result.stdout if capture else ""
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if capture:
            print(f"Output:\n{e.stdout}\n{e.stderr}")
        return False, ""

def prepare_migan_input(image_path, mask_path):
    """
    Prepare combined 4-channel input for MI-GAN Generator.
    
    Following exactly the MI-GAN demo.py preprocessing:
    - Image: img * 2 / 255 - 1 → range [-1, 1]  
    - Mask: mask // 255 → 0 or 1, where white(1)=known, black(0)=hole
    - Combined: [mask - 0.5, img * mask]
    
    MI-GAN Convention:
    - mask=1 (white) = KNOWN region (keep original)
    - mask=0 (black) = HOLE (to inpaint)
    
    OUR Mask Convention (INVERTED):
    - mask=0 (black) = KNOWN region (background to keep)
    - mask=255 (white) = HOLE (object to remove)
    
    So we need to INVERT our mask!
    """
    print(f"--- Preparing MI-GAN input for {os.path.basename(image_path)} ---")
    
    # Load image (RGB) and mask (grayscale)
    img = Image.open(image_path).convert('RGB')
    mask = Image.open(mask_path).convert('L')

    # Resize to 512x512 (matching MI-GAN's resize approach)
    img = img.resize((512, 512), Image.BICUBIC)
    mask = mask.resize((512, 512), Image.NEAREST)
    
    # Convert to numpy arrays
    img_np = np.array(img, dtype=np.float32)  # Shape: (512, 512, 3), range [0, 255]
    mask_np = np.array(mask, dtype=np.float32)  # Shape: (512, 512), range [0, 255]
    
    # --- INVERT the mask to match MI-GAN convention ---
    # Our masks: white=hole, black=known
    # MI-GAN: white=known, black=hole
    # So: invert first, then threshold
    mask_np = 255 - mask_np  # Invert
    
    # Mask: Convert to binary 0 or 1 (threshold at 200 for grey areas)
    mask_binary = (mask_np >= 200).astype(np.float32)  # 0 = hole, 1 = known
    
    print(f"   After inversion - known_pixels (mask=1): {(mask_binary==1).sum()}, hole_pixels (mask=0): {(mask_binary==0).sum()}")
    
    # Image: Normalize to [-1, 1]
    img_normalized = img_np * 2 / 255 - 1  # Range [-1, 1]
    
    # Transpose image from (H, W, C) to (C, H, W)
    img_chw = np.transpose(img_normalized, (2, 0, 1))  # Shape: (3, 512, 512)
    
    # Create the 4-channel input: [mask - 0.5, img * mask]
    # Channel 0: mask - 0.5 (range [-0.5, 0.5])
    mask_channel = mask_binary - 0.5  # (512, 512)
    
    # Channels 1-3: img * mask (masked image)
    # Broadcast mask (512, 512) to match img (3, 512, 512)
    masked_image = img_chw * mask_binary  # Broadcasting works: (3, 512, 512) * (512, 512)
    
    # Stack to create (4, 512, 512)
    combined_input = np.concatenate([
        mask_channel[np.newaxis, ...],  # (1, 512, 512)
        masked_image                      # (3, 512, 512)
    ], axis=0)  # Result: (4, 512, 512)
    
    # Add batch dimension
    combined_input = combined_input[np.newaxis, ...]  # (1, 4, 512, 512)
    
    # Save as raw binary file
    combined_input.astype(np.float32).tofile('input.raw')
    print(f"✅ Prepared MI-GAN input: input.raw (shape: {combined_input.shape})")
    
    # Create input_list.txt with single input
    with open('input_list.txt', 'w') as f:
        f.write('input.raw\n')
    
    return mask_binary  # Return mask for post-processing

def postprocess_output(output_raw_path, original_image_path, mask_np, output_path):
    """
    Post-process MI-GAN output following the pipeline's postprocess function.
    
    MI-GAN output: (1, 3, 512, 512) in range [-1, 1]
    Conversion: ((output * 0.5 + 0.5) * 255).clamp(0, 255)
    
    Then blend with original image using the mask.
    """
    # Load the raw output
    output = np.fromfile(output_raw_path, dtype=np.float32)
    output = output.reshape(1, 3, 512, 512)
    
    # Remove batch dimension and transpose to (H, W, C)
    output = output[0]  # (3, 512, 512)
    output = np.transpose(output, (1, 2, 0))  # (512, 512, 3)
    
    # Convert from [-1, 1] to [0, 255] using MI-GAN's formula
    # ((output * 0.5 + 0.5) * 255)
    output = (output * 0.5 + 0.5) * 255
    output = np.clip(output, 0, 255).astype(np.uint8)
    
    # Load original image for blending
    original = Image.open(original_image_path).convert('RGB').resize((512, 512), Image.BICUBIC)
    original_np = np.array(original)
    
    # Blend: use original where mask=1 (known), use output where mask=0 (hole)
    # mask_np: 1 = known, 0 = hole
    mask_3ch = np.stack([mask_np] * 3, axis=-1)
    blended = original_np * mask_3ch + output * (1 - mask_3ch)
    blended = blended.astype(np.uint8)
    
    # Save result
    Image.fromarray(blended).save(output_path)
    print(f"✅ Saved inpainted result to {output_path}")

def process_logs(output_csv_path):
    """Process logs to extract inference time and save to CSV."""
    input_log = "output/qnn-profiling-data_0.log"
    command = ["./qnn-profile-viewer", f"--input_log={input_log}", f"--output={output_csv_path}"]

    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"📊 Saved profiling CSV to: {output_csv_path}")
        return result.stdout + result.stderr
    except subprocess.CalledProcessError as e:
        print(f"Error running qnn-profile-viewer: {e}")
        return None

def extract_timing_from_log(log_path, csv_output_path=None):
    """Extract inference timing from QNN profiling log using qnn-profile-viewer."""
    try:
        # Use qnn-profile-viewer to parse the binary log
        csv_path = csv_output_path if csv_output_path else "temp_profile.csv"
        result = subprocess.run(
            ["./qnn-profile-viewer", f"--input_log={log_path}", f"--output={csv_path}"],
            capture_output=True, text=True
        )
        
        # Parse the output for timing info
        output = result.stdout + result.stderr
        
        # Look for "Accelerator (execute excluding wait) time" in the output
        pattern = r'Accelerator \(execute excluding wait\) time\):\s*(\d+)\s*us'
        match = re.search(pattern, output)
        if match:
            return float(match.group(1)) / 1000  # Convert us to ms
        
        # Alternative pattern
        pattern = r'Backend \(Accelerator \(execute excluding wait\) time\):\s*(\d+)\s*us'
        match = re.search(pattern, output)
        if match:
            return float(match.group(1)) / 1000  # Convert us to ms
            
        # Try to find any execute time
        pattern = r'NetRun:\s*(\d+)\s*us'
        for line in output.split('\n'):
            if 'Execute Stats (Average)' in output:
                match = re.search(pattern, line)
                if match and 'Execute' in output[:output.find(line)]:
                    return float(match.group(1)) / 1000
        
        return None
    except Exception as e:
        # Silently fail - timing is optional
        return None

def run_model():
    """Run the MI-GAN model on device."""
    files_to_push = ["input.raw", "input_list.txt"]
    
    # Push HTP config files only for HTP backend
    if backend_choice == "3":
        files_to_push.extend(["htp_config.json", "htp_backend_ext.json"])

    print("\n--- Cleaning up previous output on device ---")
    run_command(["adb", "shell", f"rm -rf {device_path}/output"])

    print("\n--- Pushing files to device ---")
    for filename in files_to_push:
        target = f"{device_path}/{filename}"
        success, _ = run_command(["adb", "push", filename, target])
        if not success:
            raise RuntimeError(f"Failed to push {filename}")

    # Construct the on-device command based on backend_choice
    run_cmd_str = ""
    if backend_choice == "1":  # CPU
        run_cmd_str = (
            f"export LD_LIBRARY_PATH=. && "
            f"export ADSP_LIBRARY_PATH=. && "
            f"./qnn-net-run "
            f"--model {model_so} "
            f"--input_list input_list.txt "
            f"--backend libQnnCpu.so "
            f"--output_dir output "
            f"--profiling_level basic"
        )
    elif backend_choice == "2":  # GPU
        run_cmd_str = (
            f"export LD_LIBRARY_PATH=. && "
            f"export ADSP_LIBRARY_PATH=. && "
            f"./qnn-net-run "
            f"--model {model_so} "
            f"--input_list input_list.txt "
            f"--backend libQnnGpu.so "
            f"--output_dir output "
            f"--profiling_level basic"
        )
    elif backend_choice == "3":  # HTP/NPU
        run_cmd_str = (
            f"export LD_LIBRARY_PATH=. && "
            f"export ADSP_LIBRARY_PATH=\".:/vendor/dsp/cdsp:/vendor/lib/rfsa/adsp:/system/lib/rfsa/adsp:/dsp\" && "
            f"./qnn-net-run "
            f"--backend libQnnHtp.so "
            f"--retrieve_context {model_bin} "
            f"--input_list input_list.txt "
            f"--output_dir output "
            f"--perf_profile burst "
            f"--config_file htp_config.json "
            f"--profiling_level basic"
        )
    else:
        raise ValueError("Invalid backend_choice. Use '1' (CPU), '2' (GPU), or '3' (HTP/NPU).")

    full_shell_command = f"cd {device_path} && {run_cmd_str}"

    # Print which backend is being used
    backend_names = {"1": "CPU", "2": "GPU", "3": "HTP/NPU"}
    print(f"\n--- Executing MI-GAN on device ({backend_names.get(backend_choice, 'Unknown')}) ---")
    success, _ = run_command(["adb", "shell", full_shell_command])
    if not success:
        raise RuntimeError("Failed to execute model")

    print("\n--- Pulling output from device ---")
    output_path_on_device = f"{device_path}/output"
    success, _ = run_command(["adb", "pull", output_path_on_device, "."])
    if not success:
        raise RuntimeError("Failed to pull output")

    return True

def main():
    # Ensure output directories exist
    os.makedirs(output_folder, exist_ok=True)
    os.makedirs(csv_folder, exist_ok=True)
    
    # Ensure HTP configs exist (only needed for HTP backend)
    if backend_choice == "3":
        ensure_htp_configs_exist()
    
    # Print backend info
    backend_names = {"1": "CPU", "2": "GPU", "3": "HTP/NPU"}
    print(f"\n🔧 Using backend: {backend_names.get(backend_choice, 'Unknown')}")
    if backend_choice in ["1", "2"]:
        print(f"   Model: {model_so}")
    else:
        print(f"   Model: {model_bin}")
    
    # Get image and mask files
    image_files = sorted(glob.glob(f"{image_folder}/*.jpg") + glob.glob(f"{image_folder}/*.png"))
    mask_files = sorted(glob.glob(f"{mask_folder}/*.png") + glob.glob(f"{mask_folder}/*.jpg"))
    
    if not image_files:
        print(f"❌ No images found in {image_folder}")
        return
    
    if not mask_files:
        print(f"❌ No masks found in {mask_folder}")
        return
    
    print(f"Found {len(image_files)} images and {len(mask_files)} masks to process")
    
    # Collect timing results
    inference_times = []
    
    # Process all images
    for i, (image_path, mask_path) in enumerate(zip(image_files, mask_files)):
        print(f"\n{'='*60}")
        print(f"Processing image {i+1}/{len(image_files)}: {os.path.basename(image_path)}")
        print(f"{'='*60}")
        
        try:
            # Prepare input
            mask_np = prepare_migan_input(image_path, mask_path)
            
            # Run model
            run_model()
            
            # Find output file
            output_raw = "output/Result_0/output_0.raw"
            if not os.path.exists(output_raw):
                output_files = glob.glob("output/Result_0/*.raw")
                if output_files:
                    output_raw = output_files[0]
                else:
                    print(f"❌ Output file not found for {os.path.basename(image_path)}")
                    continue
            
            # Post-process and save
            output_path = os.path.join(output_folder, f"inpainted_{os.path.basename(image_path)}")
            postprocess_output(output_raw, image_path, mask_np, output_path)
            
            # Extract timing from profiling log and save CSV
            log_path = "output/qnn-profiling-data_0.log"
            if os.path.exists(log_path):
                # Generate CSV filename based on image name and backend
                backend_suffix = {"1": "cpu", "2": "gpu", "3": "npu"}.get(backend_choice, "unknown")
                base_name = os.path.splitext(os.path.basename(image_path))[0]
                csv_path = os.path.join(csv_folder, f"{base_name}_{backend_suffix}_outputs.csv")
                
                timing = extract_timing_from_log(log_path, csv_path)
                if timing:
                    inference_times.append(timing)
                    print(f"⏱️  Inference time: {timing:.2f} ms")
                    print(f"📊 Saved profiling CSV to: {csv_path}")
        
        except Exception as e:
            print(f"❌ Error processing {os.path.basename(image_path)}: {e}")
            continue
    
    # Print summary
    backend_names = {"1": "CPU", "2": "GPU", "3": "HTP/NPU"}
    print(f"\n{'='*60}")
    print(f"MI-GAN Batch Inference Summary ({backend_names.get(backend_choice, 'Unknown')})")
    print(f"{'='*60}")
    print(f"Total images processed: {len(inference_times)}/{len(image_files)}")
    if inference_times:
        print(f"Average inference time: {np.mean(inference_times):.2f} ms")
        print(f"Min inference time: {np.min(inference_times):.2f} ms")
        print(f"Max inference time: {np.max(inference_times):.2f} ms")
    print(f"Output saved to: {output_folder}/")
    print("\n✅ MI-GAN batch inference complete!")

if __name__ == "__main__":
    main()
