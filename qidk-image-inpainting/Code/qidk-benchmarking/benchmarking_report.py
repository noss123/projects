import pandas as pd
from pathlib import Path
import argparse

# ---------------- Configuration ----------------
BENCHMARK_RESULT_DIR = Path("benchmarking_results")
MD_REPORT_DIR = Path("benchmarking_reports_md")
LATEX_REPORT_DIR = Path("benchmarking_reports_latex")
DEFAULT_TOP_K = 3  # default number of best/worst images to show

MD_REPORT_DIR.mkdir(exist_ok=True)
LATEX_REPORT_DIR.mkdir(exist_ok=True)

# Metric groups
METRIC_GROUPS = {
    "Full-Reference": ["psnr", "ssim", "lpips"],
    "Masked-Region": ["masked_psnr", "masked_ssim"],
    "No-Reference": ["niqe", "brisque", "piqe"]
}

# Optional weights for combined metric (Full-Reference only)
COMBINED_WEIGHTS = {
    "psnr": 0.4,
    "ssim": 0.4,
    "lpips": 0.2
}

# ---------------- Helper Functions ----------------
def normalize_series(s: pd.Series, higher_better=True):
    """Normalize a series to 0-1 range; higher_better=True means higher value => 1"""
    if s.empty:
        return s
    s_min, s_max = s.min(), s.max()
    if s_max == s_min:
        return pd.Series([1.0]*len(s), index=s.index)
    norm = (s - s_min) / (s_max - s_min)
    if not higher_better:
        norm = 1 - norm
    return norm

def compute_combined_metric(df: pd.DataFrame):
    """Compute combined metric for PSNR+SSIM+LPIPS and overall normalized combined"""
    combined_name = "combined_ref_metric"
    available = [m for m in COMBINED_WEIGHTS if m in df.columns]
    if not available:
        df[combined_name] = 0
        return df

    normed = [normalize_series(df[m], higher_better=(m != "lpips")) * COMBINED_WEIGHTS[m] 
              for m in available]
    df[combined_name] = sum(normed) / sum(COMBINED_WEIGHTS[m] for m in available)
    return df

# New: compute per-group combined metrics for reporting
def compute_group_combineds(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Full-Reference combined (weighted, handles missing by reweighting)
    available = [m for m in COMBINED_WEIGHTS if m in df.columns]
    if available:
        # Reweight to available metrics
        total_w = sum(COMBINED_WEIGHTS[m] for m in available)
        parts = []
        for m in available:
            hb = (m != "lpips")
            parts.append(normalize_series(df[m], higher_better=hb) * (COMBINED_WEIGHTS[m] / total_w))
        df['combined_fullref'] = sum(parts)

    # Masked combined (simple mean of normalized masked_psnr, masked_ssim)
    masked_metrics = [m for m in METRIC_GROUPS["Masked-Region"] if m in df.columns]
    if masked_metrics:
        norm_cols = [normalize_series(df[m], higher_better=True) for m in masked_metrics]
        df['combined_masked'] = sum(norm_cols) / len(norm_cols)

    # No-ref combined (simple mean of normalized inverted niqe/brisque/piqe)
    noref_metrics = [m for m in METRIC_GROUPS["No-Reference"] if m in df.columns]
    if noref_metrics:
        norm_cols = [normalize_series(df[m], higher_better=False) for m in noref_metrics]
        df['combined_noref'] = sum(norm_cols) / len(norm_cols)

    return df

# Build top/bottom helpers
def build_top_bottom(df: pd.DataFrame, metrics: list, top_k: int):
    results = {}
    for m in metrics:
        if m not in df.columns:
            continue
        higher_better = True if m not in ["niqe","brisque","piqe","lpips"] else False
        best = df.sort_values(by=m, ascending=not higher_better).head(top_k)
        worst = df.sort_values(by=m, ascending=higher_better).head(top_k)
        results[m] = {"best": best, "worst": worst, "higher_better": higher_better}
    return results

def df_to_markdown_table(df: pd.DataFrame, headers_map: dict = None):
    if df.empty:
        return ""
    headers_map = headers_map or {}
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

def df_to_latex_table(df: pd.DataFrame, caption="Table", label=None):
    if df.empty:
        return ""
    label_str = f"\\label{{{label}}}" if label else ""
    latex = "\\begin{table}[h!]\n\\centering\n"
    latex += "\\begin{tabular}{" + " | ".join(['l']*len(df.columns)) + "}\n"
    latex += " \\hline\n"
    latex += " & ".join(df.columns) + " \\\\\n \\hline\n"
    for _, row in df.iterrows():
        latex += " & ".join(f"{v:.4f}" if isinstance(v,float) else str(v) for v in row) + " \\\\\n"
    latex += " \\hline\n"
    latex += "\\end{tabular}\n"
    latex += f"\\caption{{{caption}}} {label_str}\n"
    latex += "\\end{table}\n"
    return latex


# ---------------- Main Report Generation ----------------
def generate_report(result_file: Path, top_k: int):
    df = pd.read_csv(result_file)

    # Compute combined metric(s)
    # Respect existing combined metrics if present; otherwise compute
    if "combined_ref_metric" not in df.columns:
        df = compute_combined_metric(df)
    # Always compute per-group combineds for reporting
    df = compute_group_combineds(df)

    # Markdown & LaTeX builders
    md_lines = [f"# Benchmarking Report: {result_file.stem}\n\n"]
    latex_lines = [f"\\section*{{Benchmarking Report: {result_file.stem}}}\n"]

    # Section: Averages per group + combined per group
    for group_name, metrics in METRIC_GROUPS.items():
        available = [m for m in metrics if m in df.columns]
        if not available:
            continue
        md_lines.append(f"## {group_name} Metrics - Averages\n")
        latex_lines.append(f"\\subsection*{{{group_name} Metrics - Averages}}\n")

        avg_df = df[available].mean().reset_index()
        avg_df.columns = ["Metric","Average"]

        md_lines.append(df_to_markdown_table(avg_df) + "\n")
        latex_lines.append(df_to_latex_table(avg_df, caption=f"{group_name} Metrics Averages") + "\n")

        # Combined per-group metric with math formula and top/bottom lists
        if group_name == "Full-Reference" and 'combined_fullref' in df.columns:
            # Markdown math formula
            md_lines.append("**Combined Full-Reference (formula):** $0.4\\cdot \\mathrm{norm}(\\mathrm{PSNR}) + 0.4\\cdot \\mathrm{norm}(\\mathrm{SSIM}) + 0.2\\cdot \\mathrm{norm\\_inv}(\\mathrm{LPIPS})$\n\n")
            # LaTeX math formula
            latex_lines.append("$0.4\\cdot \\mathrm{norm}(\\mathrm{PSNR}) + 0.4\\cdot \\mathrm{norm}(\\mathrm{SSIM}) + 0.2\\cdot \\mathrm{norm\\_inv}(\\mathrm{LPIPS})$\\\n\n")
            col = 'combined_fullref'
            best = df.sort_values(by=col, ascending=False).head(top_k)[["serial","inp_file",col]]
            worst = df.sort_values(by=col, ascending=True).head(top_k)[["serial","inp_file",col]]
            md_lines.append("Best Combined:\n")
            md_lines.append(df_to_markdown_table(best) + "\n")
            md_lines.append("Worst Combined:\n")
            md_lines.append(df_to_markdown_table(worst) + "\n")
            latex_lines.append(df_to_latex_table(best, caption="Best Combined Full-Reference") + "\n")
            latex_lines.append(df_to_latex_table(worst, caption="Worst Combined Full-Reference") + "\n")
        elif group_name == "Masked-Region" and 'combined_masked' in df.columns:
            md_lines.append("**Combined Masked (formula):** $\\mathrm{mean}(\\mathrm{norm}(\\text{Masked PSNR}),\\ \\mathrm{norm}(\\text{Masked SSIM}))$\n\n")
            latex_lines.append("$\\mathrm{mean}(\\mathrm{norm}(\\text{Masked\ PSNR}),\\ \\mathrm{norm}(\\text{Masked\ SSIM}))$\\\n\n")
            col = 'combined_masked'
            best = df.sort_values(by=col, ascending=False).head(top_k)[["serial","inp_file",col]]
            worst = df.sort_values(by=col, ascending=True).head(top_k)[["serial","inp_file",col]]
            md_lines.append("Best Combined:\n")
            md_lines.append(df_to_markdown_table(best) + "\n")
            md_lines.append("Worst Combined:\n")
            md_lines.append(df_to_markdown_table(worst) + "\n")
            latex_lines.append(df_to_latex_table(best, caption="Best Combined Masked") + "\n")
            latex_lines.append(df_to_latex_table(worst, caption="Worst Combined Masked") + "\n")
        elif group_name == "No-Reference" and 'combined_noref' in df.columns:
            md_lines.append("**Combined No-Reference (formula):** $\\mathrm{mean}(\\mathrm{norm\\_inv}(\\mathrm{NIQE}),\\ \\mathrm{norm\\_inv}(\\mathrm{BRISQUE}),\\ \\mathrm{norm\\_inv}(\\mathrm{PIQE}))$\n\n")
            latex_lines.append("$\\mathrm{mean}(\\mathrm{norm\\_inv}(\\mathrm{NIQE}),\\ \\mathrm{norm\\_inv}(\\mathrm{BRISQUE}),\\ \\mathrm{norm\\_inv}(\\mathrm{PIQE}))$\\\n\n")
            col = 'combined_noref'
            best = df.sort_values(by=col, ascending=False).head(top_k)[["serial","inp_file",col]]
            worst = df.sort_values(by=col, ascending=True).head(top_k)[["serial","inp_file",col]]
            md_lines.append("Best Combined:\n")
            md_lines.append(df_to_markdown_table(best) + "\n")
            md_lines.append("Worst Combined:\n")
            md_lines.append(df_to_markdown_table(worst) + "\n")
            latex_lines.append(df_to_latex_table(best, caption="Best Combined No-Reference") + "\n")
            latex_lines.append(df_to_latex_table(worst, caption="Worst Combined No-Reference") + "\n")

        # Section separator (line)
        md_lines.append("---\n\n")
        latex_lines.append("\\noindent\\rule{\\linewidth}{0.4pt}\n")

    # Section: Top/Bottom Images per Metric
    md_lines.append("## Top/Bottom Images per Metric\n")
    latex_lines.append("\\subsection*{Top/Bottom Images per Metric}\n")

    for group_name, metrics in METRIC_GROUPS.items():
        available = [m for m in metrics if m in df.columns]
        if not available:
            continue
        md_lines.append(f"### {group_name}\n")
        latex_lines.append(f"\\subsubsection*{{{group_name}}}\n")

        top_bottom = build_top_bottom(df, available, top_k)
        for m, info in top_bottom.items():
            direction = "Higher is better" if info["higher_better"] else "Lower is better"
            md_lines.append(f"#### {m.upper()} ({direction})\n")
            latex_lines.append(f"\\paragraph{{{m.upper()} ({direction})}}\n")

            md_lines.append("**Best:**\n")
            md_lines.append(df_to_markdown_table(info["best"]["serial inp_file ".split()+[m]]) + "\n")
            md_lines.append("**Worst:**\n")
            md_lines.append(df_to_markdown_table(info["worst"]["serial inp_file ".split()+[m]]) + "\n")

            latex_lines.append(df_to_latex_table(info["best"]["serial inp_file ".split()+[m]], caption=f"Best {m.upper()}") + "\n")
            latex_lines.append(df_to_latex_table(info["worst"]["serial inp_file ".split()+[m]], caption=f"Worst {m.upper()}") + "\n")

        # Section separator
        md_lines.append("---\n\n")
        latex_lines.append("\\noindent\\rule{\\linewidth}{0.4pt}\n")

    # Section: Overall Combined Metric (from CSV if present)
    combined_cols = [c for c in ["combined_ref_metric", "combined_metric"] if c in df.columns]
    if combined_cols:
        col = combined_cols[0]
        md_lines.append(f"## Combined Metric ({col})\n")
        latex_lines.append(f"\\subsection*{{Combined Metric ({col})}}\n")

        md_lines.append(df_to_markdown_table(df[["serial","inp_file",col]]) + "\n")
        latex_lines.append(df_to_latex_table(df[["serial","inp_file",col]], caption="Combined Metric") + "\n")

    # Save files
    md_path = MD_REPORT_DIR / f"{result_file.stem}.md"
    latex_path = LATEX_REPORT_DIR / f"{result_file.stem}.tex"
    md_path.write_text("\n".join(md_lines), encoding="utf-8")
    latex_path.write_text("\n".join(latex_lines), encoding="utf-8")
    print(f"Saved reports: {md_path}, {latex_path}")

# ---------------- Main ----------------
def main():
    parser = argparse.ArgumentParser(description="Generate benchmarking reports from CSV")
    parser.add_argument("csv", nargs="?", help="Path to a specific CSV file; if omitted, process all in benchmarking_results")
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K, dest="top_k", help="Number of best/worst images per metric")
    args = parser.parse_args()

    if args.csv:
        result_file = Path(args.csv)
        if not result_file.exists():
            print(f"CSV not found: {result_file}")
            return
        print(f"Generating report for {result_file.name} ...")
        generate_report(result_file, args.top_k)
    else:
        # Iterate over all result CSV files
        for result_file in BENCHMARK_RESULT_DIR.glob("*.csv"):
            print(f"Generating report for {result_file.name} ...")
            generate_report(result_file, args.top_k)

if __name__ == "__main__":
    main()
