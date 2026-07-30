import numpy as np
from PIL import Image
import subprocess
import csv
import os
import json

# --- Configuration Variables ---
backend_choice = "1"  # "1" for CPU, "2" for GPU, "3" for HTP/NPU
device_path = "/data/local/tmp/qnn_test"
image_folder = "image_with_object"#"_tmp_image"
mask_folder = "masked_image"#"_tmp_mask"
bench_folder = "bench"
bench_csv_folder = "bench_csv"
model_bin = "aotgan_fp16_npu.bin"
# model_bin = "model.bin"
# model_bin = "migan_generator_512_qnn_fp16.bin"
model_so = "aotgan_fp16_gpu.so"
output_image = "output_0.raw"

# --- HTP Backend Configuration ---
# These settings match the benchmark configuration:
# - backend_type: kHtpBackend
# - htp_options.performance_mode: kHtpBurst  
# - htp_options.precision: kHtpFp16
# - htp_options.useConvHmx: true

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

# Inference times array
inference_times = []

# Create output folders if they don't exist
os.makedirs(bench_folder, exist_ok=True)
os.makedirs(bench_csv_folder, exist_ok=True)

def run_command(command):
    """Runs a command and prints its output, raising an error if it fails."""
    print(f"▶️  Executing: {' '.join(command)}")
    try:
        result = subprocess.run(
            command, check=True, text=True, capture_output=True
        )
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
        print("✅ Success!")
        return True
    except FileNotFoundError:
        print(f"❌ Error: Command '{command[0]}' not found. Is adb in your PATH?")
        return False
    except subprocess.CalledProcessError as e:
        print(f"❌ Error executing command: {' '.join(command)}")
        print(f"Return Code: {e.returncode}")
        print(f"Output:\n{e.stdout}\n{e.stderr}")
        return False

def prepare_inputs(image_path, mask_path):
    """
    Loads, resizes, and converts images to the "channels-first" NumPy format
    required by the model.
    """
    print(f"--- Preparing inputs for {image_path} and {mask_path} ---")
    # Load image (RGB) and mask (grayscale)
    img = Image.open(image_path).convert('RGB')
    mask = Image.open(mask_path).convert('L')

    # Resize to 512x512
    img = img.resize((512, 512))
    mask = mask.resize((512, 512))
    
    # Convert image to NumPy float32 and normalize to [0, 1]
    img_np = np.array(img, dtype=np.float32) / 255.0      # Shape: (512, 512, 3)

    # --- MASK THRESHOLDING --- 🔧
    # Use threshold of 200 to handle grey areas in the mask
    # Everything below 200 becomes black (0), above becomes white (1)
    mask_np = (np.array(mask) >= 200).astype(np.float32)
    # -----------------------
    
    # --- Convert to Channels-First Format ---
    # Transpose image from (H, W, C) to (C, H, W)
    img_np = np.transpose(img_np, (2, 0, 1))              # Shape: (3, 512, 512)

    # Add a channel dimension to the mask
    mask_np = mask_np[np.newaxis, ...]                    # Shape: (1, 512, 512)
    
    # Add a batch dimension to the front
    img_np = img_np[np.newaxis, ...]                      # Final Shape: (1, 3, 512, 512)
    mask_np = mask_np[np.newaxis, ...]                    # Final Shape: (1, 1, 512, 512)
    
    # Save as raw binary files
    img_np.tofile('image.raw')
    mask_np.tofile('mask.raw')
    print("✅ Prepared channels-first inputs: image.raw and mask.raw")

def prepare_inputs_so(image_path, mask_path):
    # Load image (RGB) and mask (grayscale)
    img = Image.open(image_path).convert('RGB')
    mask = Image.open(mask_path).convert('L')  # Grayscale
    
    # Ensure 512x512
    img = img.resize((512, 512))
    mask = mask.resize((512, 512))
    
    # Convert image to NumPy float32 [0,1]
    img_np = np.array(img, dtype=np.float32) / 255.0  # [H, W, C]
    
    # --- MASK THRESHOLDING --- ⚪⚫
    # Use threshold of 200 to handle grey areas in the mask
    # Everything below 200 becomes black (0), above becomes white (1)
    mask_np = (np.array(mask) >= 200).astype(np.float32)  # [H, W] with values 0.0 or 1.0
    # --------------------------
    
    # Add channel dim: [H, W, 1]
    mask_np = mask_np[..., np.newaxis]
    
    # Add batch dim: [1, H, W, C]
    img_np = img_np[np.newaxis, ...]  # Final Shape: [1, 512, 512, 3]
    mask_np = mask_np[np.newaxis, ...]  # Final Shape: [1, 512, 512, 1]
    
    # Save as raw binary
    img_np.tofile('image.raw')
    mask_np.tofile('mask.raw')
    print("Prepared inputs: image.raw and mask.raw")

def run_model():
    """Run the model on device."""
    # Create input_list.txt with both inputs for AOT-GAN (image and mask)
    with open("input_list.txt", "w") as f:
        f.write("image.raw mask.raw\n")
    print("Created input_list.txt with: image.raw mask.raw")
    
    files_to_push = ["image.raw", "mask.raw", "input_list.txt"]
    
    # Push HTP config files for backend options
    if backend_choice == "3":
        files_to_push.extend(["htp_config.json", "htp_backend_ext.json"])

    print("\n--- Cleaning up previous output on device ---")
    if not run_command(["adb", "shell", f"rm -rf {device_path}/output"]):
        print("Warning: Failed to clean up previous output on device.")

    print("\n--- Pushing files to device ---")
    for filename in files_to_push:
        target = f"{device_path}/{filename}"
        if not run_command(["adb", "push", filename, target]):
            raise RuntimeError(f"Failed to push {filename}")

    # Construct the on-device command based on backend_choice
    run_cmd_str = ""
    if backend_choice == "1":  # CPU
        run_cmd_str = f"export LD_LIBRARY_PATH=. && export ADSP_LIBRARY_PATH=. && ./qnn-net-run --model {model_so} --input_list input_list.txt --backend libQnnCpu.so --profiling_level basic"
    elif backend_choice == "2":  # GPU
        run_cmd_str = f"export LD_LIBRARY_PATH=. && export ADSP_LIBRARY_PATH=. && ./qnn-net-run --model {model_so} --input_list input_list.txt --backend libQnnGpu.so --profiling_level basic" #--qnn_options=default_graph_gpu_precision=FLOAT16"
    elif backend_choice == "3":  # HTP/NPU
        # HTP Backend Options (matching benchmark settings):
        # - backend_type: kHtpBackend (using libQnnHtp.so)
        # - htp_options.performance_mode: kHtpBurst (--perf_profile burst)
        # - htp_options.precision: kHtpFp16 (model compiled with FP16, fp16_relaxed_precision in config)
        # - htp_options.useConvHmx: true (use_conv_hmx in htp_backend_ext.json)
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
    else:    # ---------------------------

        raise ValueError("Invalid backend_choice. Use '1', '2', or '3'.")

    full_shell_command = f"cd {device_path} && {run_cmd_str}"

    print("\n--- Executing model on device ---")
    if not run_command(["adb", "shell", full_shell_command]):
        raise RuntimeError("Failed to execute model")

    print("\n--- Pulling output directory from device ---")
    output_path_on_device = f"{device_path}/output"
    if not run_command(["adb", "pull", output_path_on_device, "."]):
        raise RuntimeError("Failed to pull output")
    print(f"\nPulled '{output_path_on_device}' to the current directory.")

    print("\n--- Cleaning up output directory on device ---")
    if not run_command(["adb", "shell", f"rm -rf {output_path_on_device}"]):
        print("Warning: Failed to remove output directory on device.")

def process_logs(output_csv_path):
    """Process logs to extract inference time."""
    input_log = "output/qnn-profiling-data_0.log"
    command = ["./qnn-profile-viewer", f"--input_log={input_log}", f"--output={output_csv_path}"]

    try:
        result = subprocess.run(command, check=True)
        print(f"Command executed successfully: {' '.join(command)}")
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        raise

    # Read the CSV output and extract inference time
    try:
        with open(output_csv_path, 'r') as csvfile:
            reader = csv.reader(csvfile)
            next(reader)  # Skip header
            for row in reader:
                if len(row) > 2 and row[1] == "EXECUTE IPS":
                    ips = float(row[2])
                    inference_time = 1 / ips
                    inference_times.append(inference_time)
                    print(f"Inference time: {inference_time:.6f} seconds per inference")
                    break
        if not inference_times:
            print("EXECUTE IPS not found in the output CSV.")
    except FileNotFoundError:
        print(f"Output file {output_csv_path} not found.")
    except ValueError as e:
        print(f"Error parsing the CSV: {e}")

def visualize_output(output_png_path):
    """Visualize the output."""
    output_raw_path = f"output/Result_0/{output_image}"
    
    if backend_choice == "3":  # HTP/NPU - channels-first format
        # Channels-first: (1, 3, 512, 512)
        output_np = np.fromfile(output_raw_path, dtype=np.float32).reshape(1, 3, 512, 512)
        # Remove batch
        output_np = output_np[0]  # (3, 512, 512)
        # Clip and scale
        output_np = np.clip(output_np, 0, 1) * 255
        # Transpose to (H, W, C)
        output_img = np.transpose(output_np, (1, 2, 0)).astype(np.uint8)
    else:  # For CPU (1) and GPU (2) - channels-last format
        # Channels-last: (1, 512, 512, 3)
        output_np = np.fromfile(output_raw_path, dtype=np.float32).reshape(1, 512, 512, 3)
        # Clip and convert
        output_np = np.clip(output_np, 0, 1)
        output_img = (output_np[0] * 255).astype(np.uint8)
    
    # Save as PNG
    Image.fromarray(output_img).save(output_png_path)
    print(f"🎨 Saved visualized output to: {output_png_path}")

def main():
    """Main script logic."""
    print("Starting combined script...")
    
    # Ensure HTP config files exist for NPU backend
    if backend_choice == "3":
        ensure_htp_configs_exist()

    # Get list of image files
    image_files = sorted([f for f in os.listdir(image_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    mask_files = sorted([f for f in os.listdir(mask_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])

    if len(image_files) != len(mask_files):
        raise ValueError("Number of images and masks must be equal.")

    for i, (img_file, mask_file) in enumerate(zip(image_files, mask_files)):
        print(f"\n--- Processing image {i+1}/{len(image_files)}: {img_file} with mask {mask_file} ---")
        
        image_path = os.path.join(image_folder, img_file)
        mask_path = os.path.join(mask_folder, mask_file)
        
        # Extract filename without extension
        base_name = os.path.splitext(img_file)[0]
        
        # Prepare inputs
        if backend_choice in ["1", "2"]:
            prepare_inputs_so(image_path, mask_path)  # channels-last for CPU/GPU
        else:
            prepare_inputs(image_path, mask_path)  # channels-first for HTP/NPU

        # Run model
        run_model()

        # Process logs
        output_csv_path = os.path.join(bench_csv_folder, f"{base_name}_outputs.csv")
        process_logs(output_csv_path)

        # Visualize output
        output_png_path = os.path.join(bench_folder, f"{base_name}_inpainted.png")
        visualize_output(output_png_path)

    # After all images, compute average inference time
    if inference_times:
        avg_inference_time = sum(inference_times) / len(inference_times)
        print(f"\nAverage inference time: {avg_inference_time:.6f} seconds per inference")
    else:
        print("\nNo inference times collected.")

    print("Script finished.")

if __name__ == "__main__":
    main()