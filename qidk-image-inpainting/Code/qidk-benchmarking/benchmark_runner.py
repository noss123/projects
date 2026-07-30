import os
import subprocess
import re
import pandas as pd
from pathlib import Path
from tqdm import tqdm
import shutil

# --- Configuration ---
# Directories where your datasets are located.
ORIGINAL_IMG_DIR = "sample_dataset/original_image"
MASK_IMG_DIR = "sample_dataset/masked_image"
INPAINTED_IMG_PARENT_DIR = "inpainted_images"

# --- Helper Functions ---

def find_file_by_serial(directory: Path, pattern: str) -> Path | None:
    """Finds the first file in a directory matching a serial number pattern."""
    for f in directory.glob(pattern):
        return f
    return None

def parse_metrics_output(output: str) -> dict:
    """Parses the stdout of the metric scripts to extract float values."""
    metrics = {}
    patterns = {
        'psnr': r"PSNR:\s*([\d\.]+)",
        'ssim': r"SSIM:\s*([\d\.]+)",
        'lpips': r"LPIPS:\s*([\d\.]+)",
        'masked_psnr': r"Masked PSNR:\s*([\d\.]+)",
        'masked_ssim': r"Masked SSIM \(BBox\):\s*([\d\.]+)",
        'niqe': r"NIQE\s*:\s*([\d\.]+)",
        'brisque': r"BRISQUE:\s*([\d\.]+)",
        'piqe': r"PIQE\s*:\s*([\d\.]+)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, output)
        if match:
            metrics[key] = float(match.group(1))
    return metrics

def run_all_metrics(ref_path: Path, inp_path: Path, mask_path: Path) -> dict:
    """Runs all three metric scripts for a given set of images."""
    all_metrics = {
        "serial": ref_path.name.split('_')[0],
        # Store filenames for reporting
        "ref_file": ref_path.name,
        "inp_file": inp_path.name,
        "mask_file": mask_path.name,
    }
    
    # Get the correct python executable
    python_executable = "python3" if shutil.which("python3") else "python"

    # 1. Run metrics.py (Full-Reference)
    cmd1 = [python_executable, "metrics/metrics.py", str(ref_path), str(inp_path)]
    result1 = subprocess.run(cmd1, capture_output=True, text=True)
    if result1.returncode == 0:
        all_metrics.update(parse_metrics_output(result1.stdout))
    else:
        tqdm.write(f"Error running metrics.py for {ref_path.name}: {result1.stderr}")

    # 2. Run maskedmetrics.py (Masked Full-Reference)
    cmd2 = [python_executable, "metrics/maskedmetrics.py", str(ref_path), str(inp_path), str(mask_path)]
    result2 = subprocess.run(cmd2, capture_output=True, text=True)
    if result2.returncode == 0:
        all_metrics.update(parse_metrics_output(result2.stdout))
    else:
        tqdm.write(f"Error running maskedmetrics.py for {ref_path.name}: {result2.stderr}")

    # 3. Run norefmetrics.py (No-Reference)
    cmd3 = [python_executable, "metrics/norefmetrics.py", str(inp_path)]
    result3 = subprocess.run(cmd3, capture_output=True, text=True)
    if result3.returncode == 0:
        all_metrics.update(parse_metrics_output(result3.stdout))
    else:
        tqdm.write(f"Error running norefmetrics.py for {inp_path.name}: {result3.stderr}")
        
    return all_metrics

# ---------------- New: grouping and combined metrics ----------------

def _metric_specs():
    return {
        'psnr': True,
        'ssim': True,
        'lpips': False,
        'masked_psnr': True,
        'masked_ssim': True,
        'niqe': False,
        'brisque': False,
        'piqe': False,
    }

# New: groups for report structuring

def _metric_groups():
    return {
        "Full-Reference Quality Metrics": ['psnr', 'ssim', 'lpips'],
        "Masked-Region Quality Metrics": ['masked_psnr', 'masked_ssim'],
        "No-Reference (Blind) Quality Metrics": ['niqe', 'brisque', 'piqe'],
    }

# Combined metric helpers

def _normalize_series(s: pd.Series, higher_better: bool) -> pd.Series:
    if s is None or s.empty:
        return s
    mn, mx = s.min(), s.max()
    if pd.isna(mn) or pd.isna(mx) or mx == mn:
        return pd.Series([1.0] * len(s), index=s.index)
    norm = (s - mn) / (mx - mn)
    return norm if higher_better else (1 - norm)


def compute_group_combineds(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Full-Reference weighted combined: 0.4*PSNR + 0.4*SSIM + 0.2*inv(LPIPS)
    available = [m for m in ['psnr', 'ssim', 'lpips'] if m in df.columns]
    if available:
        weights = {'psnr': 0.4, 'ssim': 0.4, 'lpips': 0.2}
        total_w = sum(weights[m] for m in available)
        parts = []
        for m in available:
            hb = (m != 'lpips')
            parts.append(_normalize_series(df[m], hb) * (weights[m] / total_w))
        df['combined_fullref'] = sum(parts)
    # Masked combined: mean of norm(masked_psnr), norm(masked_ssim)
    masked = [m for m in ['masked_psnr', 'masked_ssim'] if m in df.columns]
    if masked:
        parts = [_normalize_series(df[m], True) for m in masked]
        df['combined_masked'] = sum(parts) / len(parts)
    # No-ref combined: mean of inv-norm(niqe, brisque, piqe)
    noref = [m for m in ['niqe', 'brisque', 'piqe'] if m in df.columns]
    if noref:
        parts = [_normalize_series(df[m], False) for m in noref]
        df['combined_noref'] = sum(parts) / len(parts)
    return df

# ---------------- Report Builders ----------------

def _colored(text: str, color: str) -> str:
    # Markdown with HTML span for color (may not render on some platforms)
    return f'<span style="color:{color}">{text}</span>'

def build_top_bottom_lists(df: pd.DataFrame, top_k: int) -> dict:
    specs = _metric_specs()
    results = {}
    for metric, higher_better in specs.items():
        if metric not in df.columns:
            continue
        # Best
        best_df = df.sort_values(by=metric, ascending=not higher_better).head(top_k)
        # Worst
        worst_df = df.sort_values(by=metric, ascending=higher_better).head(top_k)
        # Keep only needed columns
        sel_cols = [c for c in ["serial", "inp_file", metric] if c in df.columns]
        results[metric] = {
            "best": best_df[sel_cols].reset_index(drop=True),
            "worst": worst_df[sel_cols].reset_index(drop=True),
            "higher_better": higher_better,
        }
    return results

def df_to_markdown_table(df: pd.DataFrame, headers_map: dict) -> str:
    if df.empty:
        return ""
    cols = list(df.columns)
    header = "| " + " | ".join(headers_map.get(c, c).upper() for c in cols) + " |\n"
    sep = "| " + " | ".join(["---" for _ in cols]) + " |\n"
    rows = []
    for _, row in df.iterrows():
        vals = []
        for c in cols:
            v = row[c]
            if isinstance(v, float):
                vals.append(f"{v:.4f}")
            else:
                vals.append(str(v))
        rows.append("| " + " | ".join(vals) + " |\n")
    return header + sep + "".join(rows)

def generate_markdown_report(df: pd.DataFrame, sota_folder: str, top_k: int) -> str:
    # Compute per-group combineds
    df = compute_group_combineds(df)
    # Averages
    avg_scores = df.mean(numeric_only=True)
    higher_better = {k for k, v in _metric_specs().items() if v}

    md = []
    md.append(f"# Benchmarking Report: {sota_folder}\n")
    md.append("---\n")
    md.append(f"Processed images: **{len(df)}**  |  Top/Bottom per metric: **{top_k}**\n\n")

    # Overall averages
    md.append("## Overall Averages\n")
    if not avg_scores.empty:
        avg_df = avg_scores.reset_index()
        avg_df.columns = ["metric", "average"]
        md.append(df_to_markdown_table(avg_df, {"metric": "Metric", "average": "Average"}))
        md.append("\n")

    # Full vs Masked interpretation
    psnr_diff = avg_scores.get('psnr', 0) - avg_scores.get('masked_psnr', 0)
    ssim_diff = avg_scores.get('ssim', 0) - avg_scores.get('masked_ssim', 0)
    md.append("## Full vs. Masked Metrics\n")
    md.append(f"- PSNR vs. Masked PSNR: {abs(psnr_diff):.2f} dB " + ("higher" if psnr_diff >= 0 else "lower") + " on full image.\n")
    md.append(f"- SSIM vs. Masked SSIM: {abs(ssim_diff):.4f} " + ("higher" if ssim_diff >= 0 else "lower") + " on full image.\n")
    if psnr_diff < -2 or ssim_diff < -0.05:
        md.append(_colored("Interpretation: Masked region is much better; inpainting may hurt surroundings.", "orange") + "\n")
    elif psnr_diff > 2 or ssim_diff > 0.05:
        md.append(_colored("Interpretation: Full image scores exceed masked region; patch likely weaker.", "orange") + "\n")
    else:
        md.append(_colored("Interpretation: Scores are close; minimal side-effects.", "green") + "\n")

    # Grouped per-metric top/bottom lists with averages and combined metric per section
    lists = build_top_bottom_lists(df, top_k)
    groups = _metric_groups()
    for title, metrics in groups.items():
        md.append(f"\n---\n\n")
        md.append(f"## {title}\n")
        # Combined per group
        if title.startswith("Full-Reference") and 'combined_fullref' in df.columns:
            md.append("**Combined Full-Reference (formula):** 0.4·norm(PSNR) + 0.4·norm(SSIM) + 0.2·norm_inv(LPIPS)\n\n")
            md.append(df_to_markdown_table(df[["serial","inp_file","combined_fullref"]], {"serial":"Serial","inp_file":"File","combined_fullref":"COMBINED_FULLREF"}))
            md.append("\n")
        if title.startswith("Masked-Region") and 'combined_masked' in df.columns:
            md.append("**Combined Masked (formula):** mean(norm(Masked PSNR), norm(Masked SSIM))\n\n")
            md.append(df_to_markdown_table(df[["serial","inp_file","combined_masked"]], {"serial":"Serial","inp_file":"File","combined_masked":"COMBINED_MASKED"}))
            md.append("\n")
        if title.startswith("No-Reference") and 'combined_noref' in df.columns:
            md.append("**Combined No-Reference (formula):** mean(norm_inv(NIQE), norm_inv(BRISQUE), norm_inv(PIQE))\n\n")
            md.append(df_to_markdown_table(df[["serial","inp_file","combined_noref"]], {"serial":"Serial","inp_file":"File","combined_noref":"COMBINED_NOREF"}))
            md.append("\n")

        for metric in metrics:
            if metric not in lists:
                continue
            info = lists[metric]
            direction = _colored("Higher is better", "green") if info["higher_better"] else _colored("Lower is better", "orange")
            md.append(f"### {metric.upper()} — {direction}\n")
            avg_val = avg_scores.get(metric)
            if avg_val is not None:
                md.append(f"Average {metric.upper()}: **{avg_val:.4f}**\n\n")
            if not info["best"].empty:
                md.append("Best:\n")
                md.append(df_to_markdown_table(info["best"], {"serial": "Serial", "inp_file": "File", metric: metric.upper()}))
            if not info["worst"].empty:
                md.append("\nWorst:\n")
                md.append(df_to_markdown_table(info["worst"], {"serial": "Serial", "inp_file": "File", metric: metric.upper()}))
            md.append("\n")
        md.append("\n")

    md.append("\n")
    return "".join(md)

def generate_text_report(df: pd.DataFrame, sota_folder: str, top_k: int) -> str:
    # Compute per-group combineds
    df = compute_group_combineds(df)
    lines = []
    lines.append(f"BENCHMARKING REPORT: {sota_folder}\n")
    lines.append("="*70 + "\n\n")
    lines.append(f"Processed images: {len(df)}\n")
    lines.append(f"Top/Bottom per metric: {top_k}\n\n")

    # Averages
    lines.append("-- Averages --\n")
    avg = df.mean(numeric_only=True)
    if not avg.empty:
        for k, v in avg.items():
            lines.append(f"{k.upper():<14}: {v:.4f}\n")
    lines.append("\n")

    # Full vs Masked
    psnr_diff = avg.get('psnr', 0) - avg.get('masked_psnr', 0)
    ssim_diff = avg.get('ssim', 0) - avg.get('masked_ssim', 0)
    lines.append("-- Full vs. Masked --\n")
    lines.append(f"PSNR vs Masked: {abs(psnr_diff):.2f} dB {'higher' if psnr_diff>=0 else 'lower'} on full image\n")
    lines.append(f"SSIM vs Masked: {abs(ssim_diff):.4f} {'higher' if ssim_diff>=0 else 'lower'} on full image\n\n")

    # Grouped per-metric lists with averages and combined per section
    lines.append("-- Best and Worst per Metric --\n")
    lists = build_top_bottom_lists(df, top_k)
    groups = _metric_groups()
    for title, metrics in groups.items():
        lines.append("-"*70 + "\n")
        lines.append(f"[{title}]\n")
        # Combined per group
        if title.startswith("Full-Reference") and 'combined_fullref' in df.columns:
            lines.append(" Combined Full-Reference (formula): 0.4·norm(PSNR) + 0.4·norm(SSIM) + 0.2·norm_inv(LPIPS)\n")
        if title.startswith("Masked-Region") and 'combined_masked' in df.columns:
            lines.append(" Combined Masked (formula): mean(norm(Masked PSNR), norm(Masked SSIM))\n")
        if title.startswith("No-Reference") and 'combined_noref' in df.columns:
            lines.append(" Combined No-Reference (formula): mean(norm_inv(NIQE), norm_inv(BRISQUE), norm_inv(PIQE))\n")

        for metric in metrics:
            if metric not in lists:
                continue
            info = lists[metric]
            lines.append(f" {metric.upper()} ({'Higher' if info['higher_better'] else 'Lower'} is better)\n")
            avg_val = avg.get(metric)
            if avg_val is not None:
                lines.append(f"  Average {metric.upper()}: {avg_val:.4f}\n")
            if not info["best"].empty:
                lines.append("  Best:\n")
                for idx, row in info["best"].iterrows():
                    lines.append(f"    #{idx+1}: {row['serial']} | {row.get('inp_file','-')} | {metric.upper()}={row[metric]:.4f}\n")
            if not info["worst"].empty:
                lines.append("  Worst:\n")
                for idx, row in info["worst"].iterrows():
                    lines.append(f"    #{idx+1}: {row['serial']} | {row.get('inp_file','-')} | {metric.upper()}={row[metric]:.4f}\n")
        lines.append("\n")
    lines.append("\n")
    return "".join(lines)

def save_reports(df: pd.DataFrame, sota_folder: str, top_k: int):
    md_text = generate_markdown_report(df, sota_folder, top_k)
    plain_text = generate_text_report(df, sota_folder, top_k)

    md_path = f"benchmark_report_{sota_folder}.md"
    txt_path = f"benchmark_report_{sota_folder}.txt"

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_text)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(plain_text)

    print(f"Saved reports: '{md_path}', '{txt_path}'")

# --- Main Execution ---

def main():
    """Main function to read config, run benchmarks, and print analysis."""
    # Choose input file interactively
    try:
        choice = input("Select input file (1/2/3) -> benchmarking_input_X.txt [1]: ").strip()
    except EOFError:
        choice = "1"
    if choice not in {"1", "2", "3"}:
        choice = "1"
    selected_input = f"benchmarking_input_{choice}.txt"

    # Read inputs from selected file, with fallback to benchmarking_input.txt
    try:
        input_path = Path(selected_input)
        if not input_path.exists():
            # Backward compatibility
            fallback = Path("benchmarking_input.txt")
            if fallback.exists():
                print(f"⚠️ '{selected_input}' not found. Falling back to '{fallback.name}'.")
                input_path = fallback
            else:
                print(f"Error: '{selected_input}' not found and no fallback 'benchmarking_input.txt'.")
                return

        with open(input_path, "r") as f:
            lines = [ln.strip() for ln in f.readlines() if ln.strip()]
            sota_folder = lines[0]
            serial_numbers = lines[1].split()
            top_k = int(lines[2]) if len(lines) >= 3 and lines[2].isdigit() else None
        print(f"Using input file: {input_path}")
    except FileNotFoundError:
        print(f"Error: '{selected_input}' not found. Please create it as benchmarking_input_X.txt (X in 1/2/3) or provide 'benchmarking_input.txt'.")
        print("Each file should contain three lines:")
        print("1. The SOTA folder name (e.g., SOTA_2)")
        print("2. Space-separated serial numbers (e.g., 0001 0011)")
        print("3. An integer N for top/bottom count per metric (e.g., 3)")
        return
    except Exception as e:
        print(f"Error reading input file: {e}")
        return

    # Interactive prompt if top_k missing
    if top_k is None:
        try:
            top_k_in = input("Enter N for best/worst per metric [default 3]: ").strip()
            top_k = int(top_k_in) if top_k_in else 3
        except ValueError:
            print("Invalid input. Using default N=3.")
            top_k = 3

    inpainted_dir = Path(INPAINTED_IMG_PARENT_DIR) / sota_folder
    if not inpainted_dir.exists():
        print(f"Error: Inpainted directory not found at '{inpainted_dir}'")
        return

    results = []
    print(f"Starting benchmark for SOTA folder: '{sota_folder}'")
    print(f"Processing {len(serial_numbers)} images... (top/bottom N={top_k})")

    # Use tqdm for a progress bar
    for serial in tqdm(serial_numbers, desc="Benchmarking Images"):
        # Find the corresponding files for each serial number
        ref_path = find_file_by_serial(Path(ORIGINAL_IMG_DIR), f"{serial}_*.jpg")
        inp_path = find_file_by_serial(inpainted_dir, f"{serial}_*.png")
        if not inp_path: # Fallback to jpg if png not found
             inp_path = find_file_by_serial(inpainted_dir, f"{serial}_*.jpg")
        mask_path = find_file_by_serial(Path(MASK_IMG_DIR), f"{serial}_*.png")

        if not (ref_path and inp_path and mask_path):
            tqdm.write(f"⚠️ Warning: Skipping serial '{serial}'. Could not find all required files.")
            tqdm.write(f"  - Ref: {'Found' if ref_path else 'Missing'}")
            tqdm.write(f"  - Inp: {'Found' if inp_path else 'Missing'}")
            tqdm.write(f"  - Mask: {'Found' if mask_path else 'Missing'}")
            continue
        
        # Run metrics and store results
        metrics = run_all_metrics(ref_path, inp_path, mask_path)
        results.append(metrics)

    if not results:
        print("\nNo images were processed. Exiting.")
        return

    # --- Analysis and Reporting ---
    df = pd.DataFrame(results)
    
    # Sort by LPIPS to find best/worst images (lower is better)
    if 'lpips' in df.columns:
        df_sorted = df.sort_values(by='lpips', ascending=True)

        print("\n\n" + "="*30 + " BENCHMARKING RESULTS " + "="*30)
        
        print("\n--- Average Metric Scores ---")
        print(df.mean(numeric_only=True).to_string(float_format="%.4f"))
        
        # Console quick peek for LPIPS
        print("\n\n--- Top Best Images (by LPIPS) ---")
        print(df_sorted.head(min(top_k, len(df_sorted))).to_string(index=False, float_format="%.4f"))
        
        print("\n\n--- Top Worst Images (by LPIPS) ---")
        print(df_sorted.tail(min(top_k, len(df_sorted))).sort_values(by='lpips', ascending=False).to_string(index=False, float_format="%.4f"))

    # Save markdown and text reports
    save_reports(df, sota_folder, top_k)


if __name__ == "__main__":
    # The script now reads from selected benchmarking_input_X.txt or fallback
    main()
