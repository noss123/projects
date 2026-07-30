#!/usr/bin/env python3
"""
Batch inference script for AOTGAN model.
Prepares all image/mask pairs and creates a single input_list.txt for batch processing.
This eliminates per-inference initialization overhead.
"""

import numpy as np
from PIL import Image
import subprocess
import os
import glob

# --- Configuration ---
device_path = "/data/local/tmp/qnn_test"
image_folder = "image_with_object"
mask_folder = "masked_image"
output_folder = "batch_output"
model_bin = "aotgan_fp16_npu.bin"

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
    import json
    
    if not os.path.exists("htp_config.json"):
        with open("htp_config.json", "w") as f:
            json.dump(HTP_CONFIG, f, indent=2)
        print("Created htp_config.json")
    
    if not os.path.exists("htp_backend_ext.json"):
        with open("htp_backend_ext.json", "w") as f:
            json.dump(HTP_BACKEND_EXT_CONFIG, f, indent=2)
        print("Created htp_backend_ext.json")

def prepare_all_inputs():
    """
    Prepares all image/mask pairs in channels-first format.
    Creates individual raw files and a batch input_list.txt
    """
    print("--- Preparing all inputs (Channels-First format) ---")
    
    image_files = sorted(glob.glob(f"{image_folder}/*.jpg") + glob.glob(f"{image_folder}/*.png"))
    mask_files = sorted(glob.glob(f"{mask_folder}/*.png") + glob.glob(f"{mask_folder}/*.jpg"))
    
    if len(image_files) != len(mask_files):
        raise ValueError(f"Mismatch: {len(image_files)} images vs {len(mask_files)} masks")
    
    # Create local batch folder
    os.makedirs("batch_inputs", exist_ok=True)
    
    input_lines = []
    
    for i, (img_path, mask_path) in enumerate(zip(image_files, mask_files)):
        base_name = os.path.splitext(os.path.basename(img_path))[0]
        
        # Load and process image
        img = Image.open(img_path).convert('RGB').resize((512, 512))
        img_np = np.array(img, dtype=np.float32) / 255.0  # (512, 512, 3)
        img_np = np.transpose(img_np, (2, 0, 1))  # (3, 512, 512)
        img_np = img_np[np.newaxis, ...]  # (1, 3, 512, 512)
        
        # Load and process mask
        # Use threshold of 200 to handle grey areas - everything below 200 becomes black (0), above becomes white (1)
        mask = Image.open(mask_path).convert('L').resize((512, 512))
        mask_np = (np.array(mask) >= 200).astype(np.float32)  # (512, 512)
        mask_np = mask_np[np.newaxis, np.newaxis, ...]  # (1, 1, 512, 512)
        
        # Save raw files
        img_raw = f"batch_inputs/image_{i:04d}.raw"
        mask_raw = f"batch_inputs/mask_{i:04d}.raw"
        img_np.tofile(img_raw)
        mask_np.tofile(mask_raw)
        
        # Add to input list (device paths)
        input_lines.append(f"image:=batch_inputs/image_{i:04d}.raw mask:=batch_inputs/mask_{i:04d}.raw")
        
        if (i + 1) % 20 == 0:
            print(f"  Prepared {i + 1}/{len(image_files)} pairs...")
    
    # Write batch input list
    with open("batch_input_list.txt", "w") as f:
        f.write("\n".join(input_lines))
    
    print(f"✅ Prepared {len(image_files)} image/mask pairs")
    print(f"   Input list saved to: batch_input_list.txt")
    return len(image_files)

def push_batch_to_device():
    """Push all batch inputs to device."""
    print("\n--- Pushing batch inputs to device ---")
    
    # Create device directories
    subprocess.run(["adb", "shell", f"mkdir -p {device_path}/batch_inputs"], check=True)
    subprocess.run(["adb", "shell", f"mkdir -p {device_path}/batch_output"], check=True)
    
    # Push batch inputs folder
    subprocess.run(["adb", "push", "batch_inputs", f"{device_path}/"], check=True)
    
    # Push batch input list
    subprocess.run(["adb", "push", "batch_input_list.txt", f"{device_path}/"], check=True)
    
    # Push HTP config files for backend options
    subprocess.run(["adb", "push", "htp_config.json", f"{device_path}/"], check=True)
    subprocess.run(["adb", "push", "htp_backend_ext.json", f"{device_path}/"], check=True)
    
    print("✅ Batch inputs pushed to device")

def run_batch_inference(num_samples):
    """Run batch inference on device."""
    print("\n--- Running batch inference ---")
    
    # HTP Backend Options (matching benchmark settings):
    # - backend_type: kHtpBackend (using libQnnHtp.so)
    # - htp_options.performance_mode: kHtpBurst (--perf_profile burst)
    # - htp_options.precision: kHtpFp16 (model compiled with FP16, fp16_relaxed_precision in config)
    # - htp_options.useConvHmx: true (use_conv_hmx in htp_backend_ext.json)
    
    # Construct command for batch inference
    run_cmd = (
        f"cd {device_path} && "
        f"export LD_LIBRARY_PATH=. && "
        f"export ADSP_LIBRARY_PATH=\".:/vendor/dsp/cdsp:/vendor/lib/rfsa/adsp:/system/lib/rfsa/adsp:/dsp\" && "
        f"./qnn-net-run "
        f"--backend libQnnHtp.so "
        f"--retrieve_context {model_bin} "
        f"--input_list batch_input_list.txt "
        f"--output_dir batch_output "
        f"--perf_profile burst "
        f"--config_file htp_config.json "
        f"--profiling_level basic"
    )
    
    print(f"Running: {run_cmd}")
    result = subprocess.run(["adb", "shell", run_cmd], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    if result.returncode != 0:
        print(f"❌ Batch inference failed with code {result.returncode}")
        return False
    
    print(f"✅ Batch inference completed for {num_samples} samples")
    return True

def extract_timing_from_log(log_file):
    """
    Parse profiling log using qnn-profile-viewer and extract execute times.
    
    Key metrics explained:
    - NetRun: Total time including I/O and framework overhead
    - QNN (execute) time: QNN framework execute time
    - RPC (execute) time: RPC call to DSP time
    - QNN accelerator (execute) time: Accelerator total time
    - Accelerator (execute) time: Accelerator compute + wait
    - Accelerator (execute excluding wait) time: PURE HTP COMPUTE TIME (best metric!)
    """
    timing_results = {
        'netrun': [],
        'accelerator_pure': [],  # Accelerator (execute excluding wait) - best metric
        'accelerator_total': [],
        'rpc': [],
        'qnn_execute': [],
    }
    
    # Use qnn-profile-viewer to parse the binary log
    viewer_path = "./qnn-profile-viewer"
    if not os.path.exists(viewer_path):
        print(f"⚠️ qnn-profile-viewer not found at {viewer_path}")
        return timing_results
    
    try:
        # Generate CSV output
        csv_output = "temp_profiling_output.csv"
        result = subprocess.run(
            [viewer_path, f"--input_log={log_file}", f"--output={csv_output}"],
            capture_output=True, text=True
        )
        
        # Print the summary stats (from stdout)
        print(result.stdout)
        
        # Parse the CSV file for individual inference times
        if os.path.exists(csv_output):
            with open(csv_output, 'r') as f:
                for line in f:
                    parts = line.strip().split(",")
                    # CSV format: Timestamp,Type,Value,Unit,Source,Level,Name
                    # Example: 15423026395,EXECUTE,480357,US,NETRUN,ROOT,Graph 0: graph_iuk2jz3r
                    if len(parts) >= 7 and parts[1] == "EXECUTE" and parts[3] == "US":
                        try:
                            time_us = int(parts[2])
                            source = parts[4]  # NETRUN or BACKEND
                            metric_name = parts[6]  # Name of the metric
                            
                            if source == "NETRUN" and "Graph" in metric_name:
                                timing_results['netrun'].append(time_us)
                            elif "Accelerator (execute excluding wait)" in metric_name:
                                timing_results['accelerator_pure'].append(time_us)
                            elif "Accelerator (execute) time" in metric_name and "excluding" not in metric_name:
                                timing_results['accelerator_total'].append(time_us)
                            elif "RPC (execute)" in metric_name:
                                timing_results['rpc'].append(time_us)
                            elif "QNN (execute)" in metric_name:
                                timing_results['qnn_execute'].append(time_us)
                        except (ValueError, IndexError):
                            pass
            
            # Clean up temp file
            os.remove(csv_output)
        
    except Exception as e:
        print(f"Error running qnn-profile-viewer: {e}")
    
    return timing_results

def convert_outputs_to_png(num_samples):
    """Convert raw output files to PNG images."""
    print("\n--- Converting outputs to PNG ---")
    
    # Create output PNG folder
    os.makedirs("batch_output_png", exist_ok=True)
    
    # Get original image filenames for naming
    image_files = sorted(glob.glob(f"{image_folder}/*.jpg") + glob.glob(f"{image_folder}/*.png"))
    
    converted = 0
    for i in range(num_samples):
        # Output files are named like: Result_0/output_0.raw, Result_1/output_0.raw, etc.
        # Or they might be flat: output_0.raw, output_1.raw, etc.
        
        # Try different naming patterns
        possible_paths = [
            f"batch_output/Result_{i}/output_0.raw",
            f"batch_output/Result_{i}/output.raw",
            f"batch_output/output_{i}.raw",
        ]
        
        output_raw = None
        for path in possible_paths:
            if os.path.exists(path):
                output_raw = path
                break
        
        if output_raw is None:
            # List what's actually in batch_output
            if i == 0:
                print(f"  Looking for output files... Contents of batch_output:")
                for item in os.listdir("batch_output"):
                    print(f"    {item}")
            continue
        
        try:
            # Load raw output - shape is (1, 3, 512, 512) in channels-first format
            output_data = np.fromfile(output_raw, dtype=np.float32)
            
            if output_data.size == 1 * 3 * 512 * 512:
                # Reshape to (1, 3, 512, 512) then to (3, 512, 512)
                output_data = output_data.reshape(1, 3, 512, 512)[0]
                # Transpose to (512, 512, 3) for PIL
                output_data = np.transpose(output_data, (1, 2, 0))
            elif output_data.size == 3 * 512 * 512:
                # Already (3, 512, 512)
                output_data = output_data.reshape(3, 512, 512)
                output_data = np.transpose(output_data, (1, 2, 0))
            else:
                print(f"  ⚠️ Unexpected output size: {output_data.size} for {output_raw}")
                continue
            
            # Clip to [0, 1] and convert to uint8
            output_data = np.clip(output_data, 0.0, 1.0)
            output_data = (output_data * 255).astype(np.uint8)
            
            # Get original filename for naming
            if i < len(image_files):
                base_name = os.path.splitext(os.path.basename(image_files[i]))[0]
            else:
                base_name = f"output_{i:04d}"
            
            # Save as PNG
            output_png = f"batch_output_png/{base_name}_inpainted.png"
            Image.fromarray(output_data).save(output_png)
            converted += 1
            
            if converted <= 3 or converted % 20 == 0:
                print(f"  Converted {output_raw} -> {output_png}")
                
        except Exception as e:
            print(f"  ❌ Error converting {output_raw}: {e}")
    
    print(f"✅ Converted {converted}/{num_samples} outputs to PNG")
    return converted

def pull_and_analyze_results(num_samples):
    """Pull results and analyze timing."""
    print("\n--- Pulling results ---")
    
    # Pull output folder
    subprocess.run(["adb", "pull", f"{device_path}/batch_output", "."], check=True)
    
    # Look for profiling log
    log_files = glob.glob("batch_output/qnn-profiling-data*.log")
    
    timing_results = {}
    if log_files:
        print(f"\n--- Analyzing profiling data from {log_files[0]} ---")
        
        # Extract timing from log directly
        timing_results = extract_timing_from_log(log_files[0])
        
        print(f"\n" + "=" * 60)
        print("📊 INFERENCE TIMING RESULTS")
        print("=" * 60)
        
        # Print all available metrics
        metrics_info = [
            ('accelerator_pure', 'Pure HTP Compute (best metric)', '⭐'),
            ('accelerator_total', 'Accelerator Total', ''),
            ('rpc', 'RPC Execute Time', ''),
            ('netrun', 'NetRun Total (includes I/O)', ''),
        ]
        
        for key, name, star in metrics_info:
            times = timing_results.get(key, [])
            if times:
                times_ms = [t / 1000.0 for t in times]
                avg_time = sum(times_ms) / len(times_ms)
                min_time = min(times_ms)
                max_time = max(times_ms)
                
                print(f"\n{star} {name}:")
                print(f"    Samples:    {len(times_ms)}")
                print(f"    Average:    {avg_time:.2f} ms")
                print(f"    Min:        {min_time:.2f} ms")
                print(f"    Max:        {max_time:.2f} ms")
                print(f"    Throughput: {1000.0/avg_time:.2f} inf/sec")
        
        # Use pure accelerator time for the main assessment
        pure_times = timing_results.get('accelerator_pure', [])
        if pure_times:
            avg_pure_ms = sum(pure_times) / len(pure_times) / 1000.0
            print(f"\n" + "=" * 60)
            if avg_pure_ms < 100:
                print(f"✅ Pure HTP inference time: {avg_pure_ms:.2f} ms - Good!")
            elif avg_pure_ms < 200:
                print(f"⚠️ Pure HTP inference time: {avg_pure_ms:.2f} ms - Moderate")
            else:
                print(f"❌ Pure HTP inference time: {avg_pure_ms:.2f} ms - Slow (expected ~50ms)")
        
        print("=" * 60)
        
        # Also save to CSV
        viewer_path = "./qnn-profile-viewer"
        if os.path.exists(viewer_path):
            subprocess.run([viewer_path, f"--input_log={log_files[0]}", "--output=batch_timing.csv"])
    
    # Convert outputs to PNG
    convert_outputs_to_png(num_samples)
    
    print(f"\n📊 Results Summary:")
    print(f"   Total samples: {num_samples}")
    print(f"   Raw outputs: batch_output/")
    print(f"   PNG outputs: batch_output_png/")
    
    return timing_results

def main():
    print("=" * 60)
    print("AOTGAN Batch Inference Script")
    print("=" * 60)
    
    # Ensure HTP config files exist
    ensure_htp_configs_exist()
    
    # Step 1: Prepare all inputs
    num_samples = prepare_all_inputs()
    
    # Step 2: Push to device
    push_batch_to_device()
    
    # Step 3: Run batch inference
    success = run_batch_inference(num_samples)
    
    if success:
        # Step 4: Pull and analyze
        pull_and_analyze_results(num_samples)
    
    print("\n✅ Done!")

def analyze_existing_results():
    """Analyze already-pulled results without re-running inference."""
    print("=" * 60)
    print("Analyzing Existing Results")
    print("=" * 60)
    
    # Count samples from existing outputs
    image_files = sorted(glob.glob(f"{image_folder}/*.jpg") + glob.glob(f"{image_folder}/*.png"))
    num_samples = len(image_files)
    
    # Look for profiling log
    log_files = glob.glob("batch_output/qnn-profiling-data*.log")
    
    timing_results = {}
    if log_files:
        print(f"\n--- Analyzing profiling data from {log_files[0]} ---")
        
        # Extract timing from log directly
        timing_results = extract_timing_from_log(log_files[0])
        
        print(f"\n" + "=" * 60)
        print("📊 INFERENCE TIMING RESULTS")
        print("=" * 60)
        
        # Print all available metrics
        metrics_info = [
            ('accelerator_pure', 'Pure HTP Compute (best metric)', '⭐'),
            ('accelerator_total', 'Accelerator Total', ''),
            ('rpc', 'RPC Execute Time', ''),
            ('netrun', 'NetRun Total (includes I/O)', ''),
        ]
        
        for key, name, star in metrics_info:
            times = timing_results.get(key, [])
            if times:
                times_ms = [t / 1000.0 for t in times]
                avg_time = sum(times_ms) / len(times_ms)
                min_time = min(times_ms)
                max_time = max(times_ms)
                
                print(f"\n{star} {name}:")
                print(f"    Samples:    {len(times_ms)}")
                print(f"    Average:    {avg_time:.2f} ms")
                print(f"    Min:        {min_time:.2f} ms")
                print(f"    Max:        {max_time:.2f} ms")
                print(f"    Throughput: {1000.0/avg_time:.2f} inf/sec")
        
        # Use pure accelerator time for the main assessment
        pure_times = timing_results.get('accelerator_pure', [])
        if pure_times:
            avg_pure_ms = sum(pure_times) / len(pure_times) / 1000.0
            print(f"\n" + "=" * 60)
            if avg_pure_ms < 100:
                print(f"✅ Pure HTP inference time: {avg_pure_ms:.2f} ms - Good!")
            elif avg_pure_ms < 200:
                print(f"⚠️ Pure HTP inference time: {avg_pure_ms:.2f} ms - Moderate")
            else:
                print(f"❌ Pure HTP inference time: {avg_pure_ms:.2f} ms - Slow (expected ~50ms)")
        
        print("=" * 60)
    else:
        print("❌ No profiling log found in batch_output/")
    
    # Convert outputs to PNG
    convert_outputs_to_png(num_samples)
    
    print("\n✅ Analysis done!")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--analyze":
        analyze_existing_results()
    else:
        main()
