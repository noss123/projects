# Benchmarking Report: benchmarking_result_aot_npu


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 34.4822 |
| ssim | 0.9662 |
| lpips | 0.0214 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9985 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9936 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9935 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.png | 0.0765 |
| 70 | 0070_beach_book_inpainted.png | 0.0832 |
| 74 | 0074_brick_tree_inpainted.png | 0.0965 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 25.5917 |
| masked_ssim | 0.7822 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.png | 1.0000 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9873 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.9783 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 0.0720 |
| 77 | 0077_brick_car_inpainted.png | 0.0863 |
| 57 | 0057_playground_bench_inpainted.png | 0.1577 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 5.7254 |
| brisque | 37.1004 |
| piqe | 41.9427 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 21 | 0021_tablenwall_car_inpainted.png | 0.9794 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9763 |
| 22 | 0022_tablenwall_book_inpainted.png | 0.9752 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 0.1280 |
| 35 | 0035_sunset_giraffe_inpainted.png | 0.1315 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.1652 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.png | 48.1800 |
| 26 | 0026_wall-floor_tree_inpainted.png | 47.7900 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 47.7600 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 22.1000 |
| 57 | 0057_playground_bench_inpainted.png | 22.3700 |
| 70 | 0070_beach_book_inpainted.png | 22.5200 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.9969 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9969 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9969 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.png | 0.8972 |
| 74 | 0074_brick_tree_inpainted.png | 0.9042 |
| 70 | 0070_beach_book_inpainted.png | 0.9114 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.0007 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.0008 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.0008 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 74 | 0074_brick_tree_inpainted.png | 0.0715 |
| 73 | 0073_brick_bench_inpainted.png | 0.0681 |
| 70 | 0070_beach_book_inpainted.png | 0.0645 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.png | 43.8100 |
| 26 | 0026_wall-floor_tree_inpainted.png | 43.0200 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 42.4200 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 10.6700 |
| 58 | 0058_playground_tree_inpainted.png | 11.4200 |
| 57 | 0057_playground_bench_inpainted.png | 11.8000 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9947 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9939 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.9936 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 77 | 0077_brick_car_inpainted.png | 0.2334 |
| 64 | 0064_playground_mug_inpainted.png | 0.3431 |
| 74 | 0074_brick_tree_inpainted.png | 0.4293 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 46 | 0046_street_book_inpainted.png | 3.8319 |
| 41 | 0041_street_bench_inpainted.png | 3.8529 |
| 47 | 0047_street_ronaldo_inpainted.png | 3.8627 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 12.0637 |
| 35 | 0035_sunset_giraffe_inpainted.png | 11.7216 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 11.0692 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 21 | 0021_tablenwall_car_inpainted.png | 0.0237 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9230 |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.9492 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 65.6820 |
| 35 | 0035_sunset_giraffe_inpainted.png | 63.2690 |
| 34 | 0034_sunset_tree_inpainted.png | 61.7277 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 19 | 0019_tablenwall_giraffe_inpainted.png | 19.3627 |
| 17 | 0017_tablenwall_bench_inpainted.png | 19.9176 |
| 22 | 0022_tablenwall_book_inpainted.png | 20.1447 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 26 | 0026_wall-floor_tree_inpainted.png | 68.1426 |
| 29 | 0029_wall-floor_car_inpainted.png | 67.4964 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 67.4721 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 0.6378 |
| 2 | 0002_grass_tree_inpainted.png | 0.6483 |
| 3 | 0003_grass_giraffe_inpainted.png | 0.6367 |
| 4 | 0004_grass_plane_inpainted.png | 0.7702 |
| 5 | 0005_grass_car_inpainted.png | 0.5905 |
| 6 | 0006_grass_book_inpainted.png | 0.7075 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.5568 |
| 8 | 0008_grass_mug_inpainted.png | 0.5105 |
| 9 | 0009_empty_room_bench_inpainted.png | 0.6670 |
| 10 | 0010_empty_room_tree_inpainted.png | 0.8205 |
| 11 | 0011_empty_room_giraffe_inpainted.png | 0.9166 |
| 12 | 0012_empty_room_plane_inpainted.png | 0.9187 |
| 13 | 0013_empty_room_car_inpainted.png | 0.7433 |
| 14 | 0014_empty_room_book_inpainted.png | 0.9167 |
| 15 | 0015_empty_room_ronaldo_inpainted.png | 0.5568 |
| 16 | 0016_empty_room_mug_inpainted.png | 0.8310 |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.7770 |
| 18 | 0018_tablenwall_tree_inpainted.png | 0.9012 |
| 19 | 0019_tablenwall_giraffe_inpainted.png | 0.9113 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9112 |
| 21 | 0021_tablenwall_car_inpainted.png | 0.8253 |
| 22 | 0022_tablenwall_book_inpainted.png | 0.6404 |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.6991 |
| 24 | 0024_tablenwall_mug_inpainted.png | 0.8990 |
| 25 | 0025_wall-floor_bench_inpainted.png | 0.8006 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9935 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9936 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9985 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.8232 |
| 30 | 0030_wall-floor_book_inpainted.png | 0.5733 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.9853 |
| 32 | 0032_wall-floor_mug_inpainted.png | 0.6725 |
| 33 | 0033_sunset_bench_inpainted.png | 0.5779 |
| 34 | 0034_sunset_tree_inpainted.png | 0.5895 |
| 35 | 0035_sunset_giraffe_inpainted.png | 0.6458 |
| 36 | 0036_sunset_plane_inpainted.png | 0.6400 |
| 37 | 0037_sunset_car_inpainted.png | 0.5655 |
| 38 | 0038_sunset_book_inpainted.png | 0.5982 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.6300 |
| 40 | 0040_sunset_mug_inpainted.png | 0.6302 |
| 41 | 0041_street_bench_inpainted.png | 0.1857 |
| 42 | 0042_street_tree_inpainted.png | 0.5566 |
| 43 | 0043_street_giraffe_inpainted.png | 0.5394 |
| 44 | 0044_street_plane_inpainted.png | 0.5877 |
| 45 | 0045_street_car_inpainted.png | 0.4405 |
| 46 | 0046_street_book_inpainted.png | 0.4344 |
| 47 | 0047_street_ronaldo_inpainted.png | 0.3266 |
| 48 | 0048_street_mug_inpainted.png | 0.3177 |
| 49 | 0049_tabletop_bench_inpainted.png | 0.7556 |
| 50 | 0050_tabletop_tree_inpainted.png | 0.7494 |
| 51 | 0051_tabletop_giraffe_inpainted.png | 0.7543 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.8910 |
| 53 | 0053_tabletop_car_inpainted.png | 0.7928 |
| 54 | 0054_tabletop_book_inpainted.png | 0.8866 |
| 55 | 0055_tabletop_ronaldo_inpainted.png | 0.8592 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.8914 |
| 57 | 0057_playground_bench_inpainted.png | 0.1183 |
| 58 | 0058_playground_tree_inpainted.png | 0.3863 |
| 59 | 0059_playground_giraffe_inpainted.png | 0.3344 |
| 60 | 0060_playground_plane_inpainted.png | 0.5982 |
| 61 | 0061_playground_car_inpainted.png | 0.3905 |
| 62 | 0062_playground_book_inpainted.png | 0.3659 |
| 63 | 0063_playground_ronaldo_inpainted.png | 0.3612 |
| 64 | 0064_playground_mug_inpainted.png | 0.1775 |
| 65 | 0065_beach_bench_inpainted.png | 0.3002 |
| 66 | 0066_beach_tree_inpainted.png | 0.6253 |
| 67 | 0067_beach_giraffe_inpainted.png | 0.4142 |
| 68 | 0068_beach_plane_inpainted.png | 0.6895 |
| 69 | 0069_beach_car_inpainted.png | 0.2556 |
| 70 | 0070_beach_book_inpainted.png | 0.0832 |
| 71 | 0071_beach_ronaldo_inpainted.png | 0.6893 |
| 72 | 0072_beach_mug_inpainted.png | 0.5671 |
| 73 | 0073_brick_bench_inpainted.png | 0.0765 |
| 74 | 0074_brick_tree_inpainted.png | 0.0965 |
| 75 | 0075_brick_giraffe_inpainted.png | 0.2912 |
| 76 | 0076_brick_plane_inpainted.png | 0.3859 |
| 77 | 0077_brick_car_inpainted.png | 0.2424 |
| 78 | 0078_brick_book_inpainted.png | 0.3128 |

