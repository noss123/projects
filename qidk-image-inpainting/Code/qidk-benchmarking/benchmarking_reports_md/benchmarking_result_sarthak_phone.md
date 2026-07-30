# Benchmarking Report: benchmarking_result_sarthak_phone


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 33.9223 |
| ssim | 0.9630 |
| lpips | 0.0312 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 20 | 0020_wall-floor_plane_inpainted.jpg | 0.9981 |
| 44 | 0044_tabletop_plane_inpainted.jpg | 0.9972 |
| 73 | 0073_tabletop_mug_ronaldo_inpainted.jpg | 0.9885 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 49 | 0049_playground_bench_inpainted.jpg | 0.0264 |
| 77 | 0077_office_car_book_inpainted.jpg | 0.0273 |
| 70 | 0070_office_book_inpainted.jpg | 0.0709 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 23.5924 |
| masked_ssim | 0.7233 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 44 | 0044_tabletop_plane_inpainted.jpg | 0.9952 |
| 73 | 0073_tabletop_mug_ronaldo_inpainted.jpg | 0.9769 |
| 76 | 0076_wall-floor_giraffe_book_inpainted.jpg | 0.9553 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 56 | 0056_playground_mug_inpainted.jpg | 0.0000 |
| 53 | 0053_playground_car_inpainted.jpg | 0.0300 |
| 52 | 0052_playground_plane_inpainted.jpg | 0.0829 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.6408 |
| brisque | 35.7787 |
| piqe | 44.5753 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 16 | 0016_tablenwall_mug_inpainted.jpg | 0.9815 |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 0.9742 |
| 13 | 0013_tablenwall_car_inpainted.jpg | 0.9685 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 28 | 0028_sunset_plane_inpainted.jpg | 0.2342 |
| 32 | 0032_sunset_mug_inpainted.jpg | 0.2512 |
| 27 | 0027_sunset_giraffe_inpainted.jpg | 0.2536 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 44 | 0044_tabletop_plane_inpainted.jpg | 51.4100 |
| 20 | 0020_wall-floor_plane_inpainted.jpg | 51.4100 |
| 73 | 0073_tabletop_mug_ronaldo_inpainted.jpg | 50.7300 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 56 | 0056_playground_mug_inpainted.jpg | 20.2100 |
| 49 | 0049_playground_bench_inpainted.jpg | 20.7000 |
| 54 | 0054_playground_book_inpainted.jpg | 21.0700 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 20 | 0020_wall-floor_plane_inpainted.jpg | 0.9986 |
| 21 | 0021_wall-floor_car_inpainted.jpg | 0.9983 |
| 24 | 0024_wall-floor_mug_inpainted.jpg | 0.9983 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 49 | 0049_playground_bench_inpainted.jpg | 0.8855 |
| 70 | 0070_office_book_inpainted.jpg | 0.8884 |
| 77 | 0077_office_car_book_inpainted.jpg | 0.8894 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 44 | 0044_tabletop_plane_inpainted.jpg | 0.0005 |
| 73 | 0073_tabletop_mug_ronaldo_inpainted.jpg | 0.0005 |
| 42 | 0042_tabletop_tree_inpainted.jpg | 0.0008 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 77 | 0077_office_car_book_inpainted.jpg | 0.0968 |
| 70 | 0070_office_book_inpainted.jpg | 0.0903 |
| 65 | 0065_office_bench_inpainted.jpg | 0.0882 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 44 | 0044_tabletop_plane_inpainted.jpg | 41.3100 |
| 73 | 0073_tabletop_mug_ronaldo_inpainted.jpg | 39.9100 |
| 12 | 0012_tablenwall_plane_inpainted.jpg | 38.5700 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 56 | 0056_playground_mug_inpainted.jpg | 9.9700 |
| 54 | 0054_playground_book_inpainted.jpg | 11.3100 |
| 55 | 0055_playground_ronaldo_inpainted.jpg | 11.4200 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 76 | 0076_wall-floor_giraffe_book_inpainted.jpg | 0.9961 |
| 73 | 0073_tabletop_mug_ronaldo_inpainted.jpg | 0.9949 |
| 19 | 0019_wall-floor_giraffe_inpainted.jpg | 0.9903 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 56 | 0056_playground_mug_inpainted.jpg | 0.2078 |
| 53 | 0053_playground_car_inpainted.jpg | 0.2171 |
| 52 | 0052_playground_plane_inpainted.jpg | 0.3002 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 70 | 0070_office_book_inpainted.jpg | 3.1311 |
| 37 | 0037_street_car_inpainted.jpg | 3.1503 |
| 67 | 0067_office_giraffe_inpainted.jpg | 3.2500 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 32 | 0032_sunset_mug_inpainted.jpg | 26.2624 |
| 30 | 0030_sunset_book_inpainted.jpg | 25.2015 |
| 27 | 0027_sunset_giraffe_inpainted.jpg | 25.1197 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 0.4485 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.6028 |
| 16 | 0016_tablenwall_mug_inpainted.jpg | 0.6311 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 29 | 0029_sunset_car_inpainted.jpg | 99.2408 |
| 26 | 0026_sunset_tree_inpainted.jpg | 99.1859 |
| 27 | 0027_sunset_giraffe_inpainted.jpg | 97.0159 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 16 | 0016_tablenwall_mug_inpainted.jpg | 25.1716 |
| 13 | 0013_tablenwall_car_inpainted.jpg | 26.7081 |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 27.2725 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 24 | 0024_wall-floor_mug_inpainted.jpg | 78.7955 |
| 21 | 0021_wall-floor_car_inpainted.jpg | 78.4910 |
| 18 | 0018_wall-floor_tree_inpainted.jpg | 77.3572 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 0.3340 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.6161 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 0.5855 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.7929 |
| 5 | 0005_grass_car_inpainted.jpg | 0.5593 |
| 6 | 0006_grass_book_inpainted.jpg | 0.5820 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.5425 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.3458 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.8332 |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 0.8842 |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 0.7951 |
| 12 | 0012_tablenwall_plane_inpainted.jpg | 0.9570 |
| 13 | 0013_tablenwall_car_inpainted.jpg | 0.5175 |
| 14 | 0014_tablenwall_book_inpainted.jpg | 0.9478 |
| 15 | 0015_tablenwall_ronaldo_inpainted.jpg | 0.7967 |
| 16 | 0016_tablenwall_mug_inpainted.jpg | 0.5379 |
| 17 | 0017_wall-floor_bench_inpainted.jpg | 0.8015 |
| 18 | 0018_wall-floor_tree_inpainted.jpg | 0.9466 |
| 19 | 0019_wall-floor_giraffe_inpainted.jpg | 0.9709 |
| 20 | 0020_wall-floor_plane_inpainted.jpg | 0.9981 |
| 21 | 0021_wall-floor_car_inpainted.jpg | 0.9595 |
| 22 | 0022_wall-floor_book_inpainted.jpg | 0.8689 |
| 23 | 0023_wall-floor_ronaldo_inpainted.jpg | 0.8293 |
| 24 | 0024_wall-floor_mug_inpainted.jpg | 0.9604 |
| 25 | 0025_sunset_bench_inpainted.jpg | 0.6787 |
| 26 | 0026_sunset_tree_inpainted.jpg | 0.7750 |
| 27 | 0027_sunset_giraffe_inpainted.jpg | 0.7837 |
| 28 | 0028_sunset_plane_inpainted.jpg | 0.7959 |
| 29 | 0029_sunset_car_inpainted.jpg | 0.7623 |
| 30 | 0030_sunset_book_inpainted.jpg | 0.7080 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.7771 |
| 32 | 0032_sunset_mug_inpainted.jpg | 0.6719 |
| 33 | 0033_street_bench_inpainted.jpg | 0.4115 |
| 34 | 0034_street_tree_inpainted.jpg | 0.4265 |
| 35 | 0035_street_giraffe_inpainted.jpg | 0.3783 |
| 36 | 0036_street_plane_inpainted.jpg | 0.6361 |
| 37 | 0037_street_car_inpainted.jpg | 0.1855 |
| 38 | 0038_street_book_inpainted.jpg | 0.2844 |
| 39 | 0039_street_ronaldo_inpainted.jpg | 0.4463 |
| 40 | 0040_street_mug_inpainted.jpg | 0.3296 |
| 41 | 0041_tabletop_bench_inpainted.jpg | 0.7468 |
| 42 | 0042_tabletop_tree_inpainted.jpg | 0.9488 |
| 43 | 0043_tabletop_giraffe_inpainted.jpg | 0.9220 |
| 44 | 0044_tabletop_plane_inpainted.jpg | 0.9972 |
| 45 | 0045_tabletop_car_inpainted.jpg | 0.8411 |
| 46 | 0046_tabletop_book_inpainted.jpg | 0.7496 |
| 47 | 0047_tabletop_ronaldo_inpainted.jpg | 0.8079 |
| 48 | 0048_tabletop_mug_inpainted.jpg | 0.7063 |
| 49 | 0049_playground_bench_inpainted.jpg | 0.0264 |
| 50 | 0050_playground_tree_inpainted.jpg | 0.4643 |
| 51 | 0051_playground_giraffe_inpainted.jpg | 0.1669 |
| 52 | 0052_playground_plane_inpainted.jpg | 0.3019 |
| 53 | 0053_playground_car_inpainted.jpg | 0.2145 |
| 54 | 0054_playground_book_inpainted.jpg | 0.1071 |
| 55 | 0055_playground_ronaldo_inpainted.jpg | 0.1895 |
| 56 | 0056_playground_mug_inpainted.jpg | 0.1371 |
| 57 | 0057_beach_bench_inpainted.jpg | 0.2645 |
| 58 | 0058_beach_tree_inpainted.jpg | 0.5708 |
| 59 | 0059_beach_giraffe_inpainted.jpg | 0.3279 |
| 60 | 0060_beach_plane_inpainted.jpg | 0.8073 |
| 61 | 0061_beach_car_inpainted.jpg | 0.4220 |
| 62 | 0062_beach_book_inpainted.jpg | 0.7294 |
| 63 | 0063_beach_ronaldo_inpainted.jpg | 0.3052 |
| 64 | 0064_beach_mug_inpainted.jpg | 0.2897 |
| 65 | 0065_office_bench_inpainted.jpg | 0.1252 |
| 66 | 0066_office_tree_inpainted.jpg | 0.3553 |
| 67 | 0067_office_giraffe_inpainted.jpg | 0.2816 |
| 68 | 0068_office_plane_inpainted.jpg | 0.5936 |
| 69 | 0069_office_car_inpainted.jpg | 0.1413 |
| 70 | 0070_office_book_inpainted.jpg | 0.0709 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 0.3698 |
| 72 | 0072_office_mug_inpainted.jpg | 0.4418 |
| 73 | 0073_tabletop_mug_ronaldo_inpainted.jpg | 0.9885 |
| 74 | 0074_tablenwall_giraffe_ronaldo_inpainted.jpg | 0.6801 |
| 75 | 0075_tablenwall_giraffe_mug_inpainted.jpg | 0.8455 |
| 76 | 0076_wall-floor_giraffe_book_inpainted.jpg | 0.9592 |
| 77 | 0077_office_car_book_inpainted.jpg | 0.0273 |
| 78 | 0078_tabletop_tree_plane_inpainted.jpg | 0.7903 |

