# Benchmarking Report: benchmarking_result_gpu_images


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 37.5635 |
| ssim | 0.9788 |
| lpips | 0.0184 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9969 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9939 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9759 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.png | 0.0684 |
| 73 | 0073_brick_bench_inpainted.png | 0.1098 |
| 57 | 0057_playground_bench_inpainted.png | 0.1247 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 24.8726 |
| masked_ssim | 0.7737 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 56 | 0056_tabletop_mug_inpainted.png | 1.0000 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9818 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9766 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 0.0580 |
| 77 | 0077_brick_car_inpainted.png | 0.1075 |
| 69 | 0069_beach_car_inpainted.png | 0.1477 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.8987 |
| brisque | 39.6097 |
| piqe | 41.7735 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.9530 |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.9472 |
| 21 | 0021_tablenwall_car_inpainted.png | 0.9462 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 0.1718 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.2550 |
| 40 | 0040_sunset_mug_inpainted.png | 0.3228 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 20 | 0020_tablenwall_plane_inpainted.png | 54.6300 |
| 52 | 0052_tabletop_plane_inpainted.png | 54.2400 |
| 56 | 0056_tabletop_mug_inpainted.png | 52.6600 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.png | 21.2400 |
| 64 | 0064_playground_mug_inpainted.png | 21.5700 |
| 69 | 0069_beach_car_inpainted.png | 21.9600 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9990 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9989 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9988 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.png | 0.9166 |
| 74 | 0074_brick_tree_inpainted.png | 0.9227 |
| 57 | 0057_playground_bench_inpainted.png | 0.9272 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 56 | 0056_tabletop_mug_inpainted.png | 0.0003 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.0008 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.0009 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.png | 0.0721 |
| 73 | 0073_brick_bench_inpainted.png | 0.0576 |
| 74 | 0074_brick_tree_inpainted.png | 0.0542 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 56 | 0056_tabletop_mug_inpainted.png | 40.4000 |
| 52 | 0052_tabletop_plane_inpainted.png | 39.4100 |
| 26 | 0026_wall-floor_tree_inpainted.png | 39.0200 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 9.9900 |
| 70 | 0070_beach_book_inpainted.png | 10.7900 |
| 58 | 0058_playground_tree_inpainted.png | 11.1100 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9860 |
| 12 | 0012_empty_room_plane_inpainted.png | 0.9856 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9849 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 77 | 0077_brick_car_inpainted.png | 0.2599 |
| 64 | 0064_playground_mug_inpainted.png | 0.3441 |
| 74 | 0074_brick_tree_inpainted.png | 0.3938 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 48 | 0048_street_mug_inpainted.png | 3.4525 |
| 41 | 0041_street_bench_inpainted.png | 3.4861 |
| 47 | 0047_street_ronaldo_inpainted.png | 3.5115 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 40 | 0040_sunset_mug_inpainted.png | 28.5577 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 28.3273 |
| 36 | 0036_sunset_plane_inpainted.png | 28.0202 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 24 | 0024_tablenwall_mug_inpainted.png | 0.5572 |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.7714 |
| 18 | 0018_tablenwall_tree_inpainted.png | 0.8472 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 103.0718 |
| 35 | 0035_sunset_giraffe_inpainted.png | 101.4219 |
| 40 | 0040_sunset_mug_inpainted.png | 101.0929 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 38 | 0038_sunset_book_inpainted.png | 18.5697 |
| 37 | 0037_sunset_car_inpainted.png | 19.6817 |
| 40 | 0040_sunset_mug_inpainted.png | 21.4241 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.png | 74.7475 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 74.2748 |
| 26 | 0026_wall-floor_tree_inpainted.png | 73.6433 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 0.5834 |
| 2 | 0002_grass_tree_inpainted.png | 0.6780 |
| 3 | 0003_grass_giraffe_inpainted.png | 0.6822 |
| 4 | 0004_grass_plane_inpainted.png | 0.8588 |
| 5 | 0005_grass_car_inpainted.png | 0.6322 |
| 6 | 0006_grass_book_inpainted.png | 0.7215 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.6177 |
| 8 | 0008_grass_mug_inpainted.png | 0.4546 |
| 9 | 0009_empty_room_bench_inpainted.png | 0.6184 |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9063 |
| 11 | 0011_empty_room_giraffe_inpainted.png | 0.9544 |
| 12 | 0012_empty_room_plane_inpainted.png | 0.9519 |
| 13 | 0013_empty_room_car_inpainted.png | 0.7376 |
| 14 | 0014_empty_room_book_inpainted.png | 0.9172 |
| 15 | 0015_empty_room_ronaldo_inpainted.png | 0.5129 |
| 16 | 0016_empty_room_mug_inpainted.png | 0.7984 |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.7519 |
| 18 | 0018_tablenwall_tree_inpainted.png | 0.9302 |
| 19 | 0019_tablenwall_giraffe_inpainted.png | 0.9593 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9969 |
| 21 | 0021_tablenwall_car_inpainted.png | 0.8988 |
| 22 | 0022_tablenwall_book_inpainted.png | 0.6322 |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.6295 |
| 24 | 0024_tablenwall_mug_inpainted.png | 0.9345 |
| 25 | 0025_wall-floor_bench_inpainted.png | 0.7298 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9695 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9695 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9587 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.9245 |
| 30 | 0030_wall-floor_book_inpainted.png | 0.5958 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.9199 |
| 32 | 0032_wall-floor_mug_inpainted.png | 0.7086 |
| 33 | 0033_sunset_bench_inpainted.png | 0.6810 |
| 34 | 0034_sunset_tree_inpainted.png | 0.7620 |
| 35 | 0035_sunset_giraffe_inpainted.png | 0.7723 |
| 36 | 0036_sunset_plane_inpainted.png | 0.8451 |
| 37 | 0037_sunset_car_inpainted.png | 0.7152 |
| 38 | 0038_sunset_book_inpainted.png | 0.7422 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.7536 |
| 40 | 0040_sunset_mug_inpainted.png | 0.7720 |
| 41 | 0041_street_bench_inpainted.png | 0.1840 |
| 42 | 0042_street_tree_inpainted.png | 0.6314 |
| 43 | 0043_street_giraffe_inpainted.png | 0.5707 |
| 44 | 0044_street_plane_inpainted.png | 0.7541 |
| 45 | 0045_street_car_inpainted.png | 0.4888 |
| 46 | 0046_street_book_inpainted.png | 0.4837 |
| 47 | 0047_street_ronaldo_inpainted.png | 0.3219 |
| 48 | 0048_street_mug_inpainted.png | 0.3035 |
| 49 | 0049_tabletop_bench_inpainted.png | 0.7372 |
| 50 | 0050_tabletop_tree_inpainted.png | 0.7855 |
| 51 | 0051_tabletop_giraffe_inpainted.png | 0.7438 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9939 |
| 53 | 0053_tabletop_car_inpainted.png | 0.7973 |
| 54 | 0054_tabletop_book_inpainted.png | 0.9423 |
| 55 | 0055_tabletop_ronaldo_inpainted.png | 0.8589 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.9759 |
| 57 | 0057_playground_bench_inpainted.png | 0.1247 |
| 58 | 0058_playground_tree_inpainted.png | 0.4160 |
| 59 | 0059_playground_giraffe_inpainted.png | 0.3326 |
| 60 | 0060_playground_plane_inpainted.png | 0.6458 |
| 61 | 0061_playground_car_inpainted.png | 0.3952 |
| 62 | 0062_playground_book_inpainted.png | 0.3795 |
| 63 | 0063_playground_ronaldo_inpainted.png | 0.3963 |
| 64 | 0064_playground_mug_inpainted.png | 0.1801 |
| 65 | 0065_beach_bench_inpainted.png | 0.2657 |
| 66 | 0066_beach_tree_inpainted.png | 0.7006 |
| 67 | 0067_beach_giraffe_inpainted.png | 0.4444 |
| 68 | 0068_beach_plane_inpainted.png | 0.7635 |
| 69 | 0069_beach_car_inpainted.png | 0.2252 |
| 70 | 0070_beach_book_inpainted.png | 0.0684 |
| 71 | 0071_beach_ronaldo_inpainted.png | 0.7143 |
| 72 | 0072_beach_mug_inpainted.png | 0.5945 |
| 73 | 0073_brick_bench_inpainted.png | 0.1098 |
| 74 | 0074_brick_tree_inpainted.png | 0.1537 |
| 75 | 0075_brick_giraffe_inpainted.png | 0.3949 |
| 76 | 0076_brick_plane_inpainted.png | 0.6343 |
| 77 | 0077_brick_car_inpainted.png | 0.3596 |
| 78 | 0078_brick_book_inpainted.png | 0.4241 |

