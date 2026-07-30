# Benchmarking Report: benchmarking_result_lama_npu


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 36.7151 |
| ssim | 0.9779 |
| lpips | 0.0186 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9938 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9871 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9732 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.png | 0.0452 |
| 57 | 0057_playground_bench_inpainted.png | 0.1243 |
| 73 | 0073_brick_bench_inpainted.png | 0.1277 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 24.6554 |
| masked_ssim | 0.7766 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9978 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9969 |
| 11 | 0011_empty_room_giraffe_inpainted.png | 0.9843 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 0.0571 |
| 77 | 0077_brick_car_inpainted.png | 0.1054 |
| 61 | 0061_playground_car_inpainted.png | 0.1617 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.7428 |
| brisque | 38.4588 |
| piqe | 41.7638 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.9434 |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.9387 |
| 24 | 0024_tablenwall_mug_inpainted.png | 0.9333 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 0.2059 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.3271 |
| 35 | 0035_sunset_giraffe_inpainted.png | 0.3635 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 20 | 0020_tablenwall_plane_inpainted.png | 50.4200 |
| 52 | 0052_tabletop_plane_inpainted.png | 49.5600 |
| 19 | 0019_tablenwall_giraffe_inpainted.png | 49.1100 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.png | 21.1800 |
| 64 | 0064_playground_mug_inpainted.png | 21.8500 |
| 57 | 0057_playground_bench_inpainted.png | 22.5200 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9984 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9982 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9981 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.png | 0.9178 |
| 74 | 0074_brick_tree_inpainted.png | 0.9242 |
| 70 | 0070_beach_book_inpainted.png | 0.9269 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 56 | 0056_tabletop_mug_inpainted.png | 0.0006 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.0010 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.0014 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.png | 0.0723 |
| 73 | 0073_brick_bench_inpainted.png | 0.0565 |
| 41 | 0041_street_bench_inpainted.png | 0.0531 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 39.1700 |
| 56 | 0056_tabletop_mug_inpainted.png | 39.1400 |
| 11 | 0011_empty_room_giraffe_inpainted.png | 38.4500 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 10.2800 |
| 70 | 0070_beach_book_inpainted.png | 10.7400 |
| 58 | 0058_playground_tree_inpainted.png | 11.0600 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 12 | 0012_empty_room_plane_inpainted.png | 0.9871 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9847 |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9846 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 77 | 0077_brick_car_inpainted.png | 0.2669 |
| 64 | 0064_playground_mug_inpainted.png | 0.3492 |
| 74 | 0074_brick_tree_inpainted.png | 0.4065 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 48 | 0048_street_mug_inpainted.png | 3.4592 |
| 41 | 0041_street_bench_inpainted.png | 3.4667 |
| 46 | 0046_street_book_inpainted.png | 3.5180 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 29.9850 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 24.9431 |
| 35 | 0035_sunset_giraffe_inpainted.png | 23.0588 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 24 | 0024_tablenwall_mug_inpainted.png | 0.0195 |
| 18 | 0018_tablenwall_tree_inpainted.png | 0.1777 |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.1834 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 97.7040 |
| 35 | 0035_sunset_giraffe_inpainted.png | 96.5505 |
| 40 | 0040_sunset_mug_inpainted.png | 96.3557 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 34 | 0034_sunset_tree_inpainted.png | 17.1714 |
| 40 | 0040_sunset_mug_inpainted.png | 17.6583 |
| 38 | 0038_sunset_book_inpainted.png | 19.5217 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.png | 73.9556 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 72.0138 |
| 28 | 0028_wall-floor_plane_inpainted.png | 71.7114 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 0.6276 |
| 2 | 0002_grass_tree_inpainted.png | 0.7032 |
| 3 | 0003_grass_giraffe_inpainted.png | 0.7085 |
| 4 | 0004_grass_plane_inpainted.png | 0.8939 |
| 5 | 0005_grass_car_inpainted.png | 0.6230 |
| 6 | 0006_grass_book_inpainted.png | 0.7464 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.6422 |
| 8 | 0008_grass_mug_inpainted.png | 0.4708 |
| 9 | 0009_empty_room_bench_inpainted.png | 0.6321 |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9317 |
| 11 | 0011_empty_room_giraffe_inpainted.png | 0.9704 |
| 12 | 0012_empty_room_plane_inpainted.png | 0.9676 |
| 13 | 0013_empty_room_car_inpainted.png | 0.7315 |
| 14 | 0014_empty_room_book_inpainted.png | 0.9433 |
| 15 | 0015_empty_room_ronaldo_inpainted.png | 0.5228 |
| 16 | 0016_empty_room_mug_inpainted.png | 0.8399 |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.7708 |
| 18 | 0018_tablenwall_tree_inpainted.png | 0.9520 |
| 19 | 0019_tablenwall_giraffe_inpainted.png | 0.9679 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9938 |
| 21 | 0021_tablenwall_car_inpainted.png | 0.8178 |
| 22 | 0022_tablenwall_book_inpainted.png | 0.6530 |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.6475 |
| 24 | 0024_tablenwall_mug_inpainted.png | 0.9509 |
| 25 | 0025_wall-floor_bench_inpainted.png | 0.7553 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9683 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9642 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9586 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.8261 |
| 30 | 0030_wall-floor_book_inpainted.png | 0.6144 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.9431 |
| 32 | 0032_wall-floor_mug_inpainted.png | 0.7492 |
| 33 | 0033_sunset_bench_inpainted.png | 0.6917 |
| 34 | 0034_sunset_tree_inpainted.png | 0.7908 |
| 35 | 0035_sunset_giraffe_inpainted.png | 0.8108 |
| 36 | 0036_sunset_plane_inpainted.png | 0.8784 |
| 37 | 0037_sunset_car_inpainted.png | 0.6668 |
| 38 | 0038_sunset_book_inpainted.png | 0.7750 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.7780 |
| 40 | 0040_sunset_mug_inpainted.png | 0.8075 |
| 41 | 0041_street_bench_inpainted.png | 0.1895 |
| 42 | 0042_street_tree_inpainted.png | 0.6592 |
| 43 | 0043_street_giraffe_inpainted.png | 0.5946 |
| 44 | 0044_street_plane_inpainted.png | 0.7906 |
| 45 | 0045_street_car_inpainted.png | 0.5059 |
| 46 | 0046_street_book_inpainted.png | 0.4995 |
| 47 | 0047_street_ronaldo_inpainted.png | 0.3410 |
| 48 | 0048_street_mug_inpainted.png | 0.3193 |
| 49 | 0049_tabletop_bench_inpainted.png | 0.7558 |
| 50 | 0050_tabletop_tree_inpainted.png | 0.8090 |
| 51 | 0051_tabletop_giraffe_inpainted.png | 0.7727 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9871 |
| 53 | 0053_tabletop_car_inpainted.png | 0.7917 |
| 54 | 0054_tabletop_book_inpainted.png | 0.9513 |
| 55 | 0055_tabletop_ronaldo_inpainted.png | 0.8849 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9732 |
| 57 | 0057_playground_bench_inpainted.png | 0.1243 |
| 58 | 0058_playground_tree_inpainted.png | 0.4198 |
| 59 | 0059_playground_giraffe_inpainted.png | 0.3384 |
| 60 | 0060_playground_plane_inpainted.png | 0.6738 |
| 61 | 0061_playground_car_inpainted.png | 0.4155 |
| 62 | 0062_playground_book_inpainted.png | 0.3989 |
| 63 | 0063_playground_ronaldo_inpainted.png | 0.4051 |
| 64 | 0064_playground_mug_inpainted.png | 0.1826 |
| 65 | 0065_beach_bench_inpainted.png | 0.2602 |
| 66 | 0066_beach_tree_inpainted.png | 0.7153 |
| 67 | 0067_beach_giraffe_inpainted.png | 0.4365 |
| 68 | 0068_beach_plane_inpainted.png | 0.7817 |
| 69 | 0069_beach_car_inpainted.png | 0.2625 |
| 70 | 0070_beach_book_inpainted.png | 0.0452 |
| 71 | 0071_beach_ronaldo_inpainted.png | 0.7309 |
| 72 | 0072_beach_mug_inpainted.png | 0.5993 |
| 73 | 0073_brick_bench_inpainted.png | 0.1277 |
| 74 | 0074_brick_tree_inpainted.png | 0.1776 |
| 75 | 0075_brick_giraffe_inpainted.png | 0.4143 |
| 76 | 0076_brick_plane_inpainted.png | 0.6707 |
| 77 | 0077_brick_car_inpainted.png | 0.3710 |
| 78 | 0078_brick_book_inpainted.png | 0.4390 |

