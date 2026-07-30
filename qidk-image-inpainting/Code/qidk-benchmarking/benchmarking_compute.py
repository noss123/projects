import os
import subprocess
import re
import pandas as pd
from pathlib import Path
from tqdm import tqdm
import shutil
import sys
import argparse

# --- Configuration ---
ORIGINAL_IMG_DIR = "sample_dataset/original_image"
MASK_IMG_DIR = "sample_dataset/masked_image"
INPAINTED_IMG_PARENT_DIR = "inpainted_images"
BENCHMARKING_INPUT_DIR = "benchmarking_inputs"
BENCHMARKING_RESULT_DIR = "benchmarking_results"

os.makedirs(BENCHMARKING_RESULT_DIR, exist_ok=True)

# --- Helper Functions ---

def find_file_by_serial(directory: Path, pattern: str) -> Path | None:
    for f in directory.glob(pattern):
        return f
    return None

def parse_metrics_output(output: str) -> dict:
    metrics = {}
    patterns = {
        'psnr': r"PSNR:\s*([\d\.]+)",
        'ssim': r"SSIM:\s*([\d\.]+)",
        'lpips': r"LPIPS:\s*([\d\.]+)",
        'masked_psnr': r"Masked PSNR:\s*([\d\.]+)",
        'masked_ssim': r"Masked SSIM \(BBox\):\s*([\d\.]+)",
        'niqe': r"NIQE\s*:\s*([\d\.]+)",
        # Fix: remove extra colon so BRISQUE values are captured
        'brisque': r"BRISQUE\s*:\s*([\d\.]+)",
        'piqe': r"PIQE\s*:\s*([\d\.]+)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, output)
        if match:
            metrics[key] = float(match.group(1))
    return metrics

def run_all_metrics(ref_path: Path, inp_path: Path, mask_path: Path) -> dict:
    all_metrics = {
        "serial": ref_path.name.split('_')[0],
        "ref_file": ref_path.name,
        "inp_file": inp_path.name,
        "mask_file": mask_path.name,
    }
    python_executable = "python3" if shutil.which("python3") else "python"

    # Full-reference
    cmd1 = [python_executable, "metrics/metrics.py", str(ref_path), str(inp_path)]
    result1 = subprocess.run(cmd1, capture_output=True, text=True)
    if result1.returncode == 0:
        all_metrics.update(parse_metrics_output(result1.stdout))

    # Masked
    cmd2 = [python_executable, "metrics/maskedmetrics.py", str(ref_path), str(inp_path), str(mask_path)]
    result2 = subprocess.run(cmd2, capture_output=True, text=True)
    if result2.returncode == 0:
        all_metrics.update(parse_metrics_output(result2.stdout))

    # No-reference
    cmd3 = [python_executable, "metrics/norefmetrics.py", str(inp_path)]
    result3 = subprocess.run(cmd3, capture_output=True, text=True)
    if result3.returncode == 0:
        all_metrics.update(parse_metrics_output(result3.stdout))

    return all_metrics

# --- Combined Metric ---
def compute_combined_metric(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    metrics_fb = ['psnr', 'ssim', 'lpips']
    metrics_mask = ['masked_psnr', 'masked_ssim']
    metrics_noref = ['niqe', 'brisque', 'piqe']

    def normalize_series(s, higher_better=True):
        if s.empty:
            return s
        mn, mx = s.min(), s.max()
        if mn == mx:
            return pd.Series([1.0]*len(s), index=s.index)
        norm = (s - mn) / (mx - mn) if higher_better else (mx - s) / (mx - mn)
        return norm

    # Full-reference
    for m in metrics_fb:
        if m in df.columns:
            hb = m != 'lpips'
            df[f"norm_{m}"] = normalize_series(df[m], higher_better=hb)

    # Masked
    for m in metrics_mask:
        if m in df.columns:
            df[f"norm_{m}"] = normalize_series(df[m], higher_better=True)

    # No-reference
    for m in metrics_noref:
        if m in df.columns:
            df[f"norm_{m}"] = normalize_series(df[m], higher_better=False)

    # Combined metric
    norm_fb = [f"norm_{m}" for m in metrics_fb if f"norm_{m}" in df.columns]
    norm_mask = [f"norm_{m}" for m in metrics_mask if f"norm_{m}" in df.columns]
    norm_noref = [f"norm_{m}" for m in metrics_noref if f"norm_{m}" in df.columns]

    df['combined_metric'] = (
        0.6 * df[norm_fb].mean(axis=1) if norm_fb else 0 +
        0.2 * df[norm_mask].mean(axis=1) if norm_mask else 0 +
        0.2 * df[norm_noref].mean(axis=1) if norm_noref else 0
    )

    return df


# --- Main Execution ---
def main():
    parser = argparse.ArgumentParser(description="Run benchmarking.")
    parser.add_argument("input_file", nargs='?', help="Path to the benchmarking input file.")
    args = parser.parse_args()

    if args.input_file:
        input_file = Path(args.input_file)
        if not input_file.exists():
            print(f"Error: Input file not found at {input_file}")
            return
    else:
        # List input files
        inputs = sorted(list(Path(BENCHMARKING_INPUT_DIR).glob("benchmarking_input_*.txt")))
        if not inputs:
            print(f"No benchmarking input files found in {BENCHMARKING_INPUT_DIR}")
            return
        print("Available input files:")
        for i, f in enumerate(inputs, 1):
            print(f"{i}. {f.name}")

        try:
            choice = int(input(f"Select input file [1-{len(inputs)}]: ") or 1)
            choice = max(1, min(choice, len(inputs)))
        except ValueError:
            choice = 1

        input_file = inputs[choice-1]
    
    print(f"Selected: {input_file.name}")

    # Read input
    with open(input_file, "r") as f:
        lines = [ln.strip() for ln in f.readlines() if ln.strip()]
        sota_folder = lines[0]
        serial_numbers = lines[1].split()
        top_k = int(lines[2]) if len(lines) >= 3 and lines[2].isdigit() else 3

    inpainted_dir = Path(INPAINTED_IMG_PARENT_DIR) / sota_folder
    if not inpainted_dir.exists():
        print(f"Inpainted folder not found: {inpainted_dir}")
        return

    results = []
    print(serial_numbers)
    for serial in tqdm(serial_numbers, desc="Benchmarking images"):
        ref_path = find_file_by_serial(Path(ORIGINAL_IMG_DIR), f"{serial}_*.jpg")

        patterns = [
            f"{serial}_*.png",
            f"{serial}_*.jpg",
            f"*_{serial}.png",
            f"*_{serial}.jpg",
        ]
        inp_path = None
        for pattern in patterns:
            inp_path = find_file_by_serial(inpainted_dir, pattern)
            if inp_path:
                break
            
        mask_path = find_file_by_serial(Path(MASK_IMG_DIR), f"{serial}_*.png")

        print (ref_path , inp_path , mask_path)
        if not (ref_path and inp_path and mask_path):
            tqdm.write(f"Skipping serial {serial}: missing files")
            continue

        metrics = run_all_metrics(ref_path, inp_path, mask_path)
        results.append(metrics)

    if not results:
        print("No images processed. Exiting.")
        return

    df = pd.DataFrame(results)
    df = compute_combined_metric(df)

    output_csv = Path(BENCHMARKING_RESULT_DIR) / f"benchmarking_result_{sota_folder}.csv"
    df.to_csv(output_csv, index=False)
    print(f"Saved benchmarking results: {output_csv}")

    # Call report generator with specific CSV and top_k
    subprocess.run([sys.executable, "benchmarking_report.py", str(output_csv), "--top-k", str(top_k)])

if __name__ == "__main__":
    main()
