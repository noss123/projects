# Benchmarking Report: benchmarking_result_migan_gpu


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 35.1328 |
| ssim | 0.9491 |
| lpips | 0.0204 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 1.0000 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9906 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9899 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1141 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.1387 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.1565 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 27.8871 |
| masked_ssim | 0.7685 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9996 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9892 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.9885 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 0.0773 |
| 77 | 0077_brick_car_inpainted.jpg | 0.0802 |
| 61 | 0061_playground_car_inpainted.jpg | 0.1519 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 7.5256 |
| brisque | 41.5878 |
| piqe | 50.1701 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.9666 |
| 19 | 0019_tablenwall_giraffe_inpainted.jpg | 0.9647 |
| 24 | 0024_tablenwall_mug_inpainted.jpg | 0.9639 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 0.0184 |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.0850 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 0.1244 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 48.5400 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 48.2400 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 48.1700 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 21.7200 |
| 70 | 0070_beach_book_inpainted.jpg | 21.8200 |
| 57 | 0057_playground_bench_inpainted.jpg | 21.9400 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.9922 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.9920 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 0.9919 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.jpg | 0.8523 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.8589 |
| 77 | 0077_brick_car_inpainted.jpg | 0.8816 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.0023 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.0023 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.0024 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.jpg | 0.0675 |
| 41 | 0041_street_bench_inpainted.jpg | 0.0573 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0540 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 46.6100 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 45.8500 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 45.8400 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 10.3700 |
| 61 | 0061_playground_car_inpainted.jpg | 11.0900 |
| 58 | 0058_playground_tree_inpainted.jpg | 11.3500 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9927 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9925 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9925 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 77 | 0077_brick_car_inpainted.jpg | 0.2019 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.3241 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.3661 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 41 | 0041_street_bench_inpainted.jpg | 3.3977 |
| 42 | 0042_street_tree_inpainted.jpg | 3.4291 |
| 45 | 0045_street_car_inpainted.jpg | 3.4811 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 34.6555 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 33.3339 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 32.3169 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 5.3334 |
| 4 | 0004_grass_plane_inpainted.jpg | 5.5253 |
| 6 | 0006_grass_book_inpainted.jpg | 5.5333 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 99.7268 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 98.5020 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 97.7998 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 41 | 0041_street_bench_inpainted.jpg | 33.7423 |
| 74 | 0074_brick_tree_inpainted.jpg | 34.1272 |
| 19 | 0019_tablenwall_giraffe_inpainted.jpg | 34.3348 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 88.8984 |
| 34 | 0034_sunset_tree_inpainted.jpg | 80.8678 |
| 40 | 0040_sunset_mug_inpainted.jpg | 79.9757 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 0.4958 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.4991 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 0.5470 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.6055 |
| 5 | 0005_grass_car_inpainted.jpg | 0.4723 |
| 6 | 0006_grass_book_inpainted.jpg | 0.5454 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.5020 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.4637 |
| 9 | 0009_empty_room_bench_inpainted.jpg | 0.5605 |
| 10 | 0010_empty_room_tree_inpainted.jpg | 0.7965 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 0.8012 |
| 12 | 0012_empty_room_plane_inpainted.jpg | 0.8008 |
| 13 | 0013_empty_room_car_inpainted.jpg | 0.7291 |
| 14 | 0014_empty_room_book_inpainted.jpg | 0.7954 |
| 15 | 0015_empty_room_ronaldo_inpainted.jpg | 0.4797 |
| 16 | 0016_empty_room_mug_inpainted.jpg | 0.7838 |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.6837 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.7712 |
| 19 | 0019_tablenwall_giraffe_inpainted.jpg | 0.7718 |
| 20 | 0020_tablenwall_plane_inpainted.jpg | 0.7747 |
| 21 | 0021_tablenwall_car_inpainted.jpg | 0.7699 |
| 22 | 0022_tablenwall_book_inpainted.jpg | 0.5459 |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 0.5833 |
| 24 | 0024_tablenwall_mug_inpainted.jpg | 0.7649 |
| 25 | 0025_wall-floor_bench_inpainted.jpg | 0.7490 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9881 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9906 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9899 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9841 |
| 30 | 0030_wall-floor_book_inpainted.jpg | 0.8493 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9886 |
| 32 | 0032_wall-floor_mug_inpainted.jpg | 0.8966 |
| 33 | 0033_sunset_bench_inpainted.jpg | 0.8244 |
| 34 | 0034_sunset_tree_inpainted.jpg | 0.9814 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 0.9897 |
| 36 | 0036_sunset_plane_inpainted.jpg | 1.0000 |
| 37 | 0037_sunset_car_inpainted.jpg | 0.9745 |
| 38 | 0038_sunset_book_inpainted.jpg | 0.9879 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 0.9799 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.9866 |
| 41 | 0041_street_bench_inpainted.jpg | 0.1624 |
| 42 | 0042_street_tree_inpainted.jpg | 0.3869 |
| 43 | 0043_street_giraffe_inpainted.jpg | 0.4104 |
| 44 | 0044_street_plane_inpainted.jpg | 0.5406 |
| 45 | 0045_street_car_inpainted.jpg | 0.3683 |
| 46 | 0046_street_book_inpainted.jpg | 0.3823 |
| 47 | 0047_street_ronaldo_inpainted.jpg | 0.2677 |
| 48 | 0048_street_mug_inpainted.jpg | 0.2472 |
| 49 | 0049_tabletop_bench_inpainted.jpg | 0.7080 |
| 50 | 0050_tabletop_tree_inpainted.jpg | 0.7931 |
| 51 | 0051_tabletop_giraffe_inpainted.jpg | 0.7600 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.8328 |
| 53 | 0053_tabletop_car_inpainted.jpg | 0.7766 |
| 54 | 0054_tabletop_book_inpainted.jpg | 0.8310 |
| 55 | 0055_tabletop_ronaldo_inpainted.jpg | 0.8156 |
| 56 | 0056_tabletop_mug_inpainted.jpg | 0.8302 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.1565 |
| 58 | 0058_playground_tree_inpainted.jpg | 0.3723 |
| 59 | 0059_playground_giraffe_inpainted.jpg | 0.3247 |
| 60 | 0060_playground_plane_inpainted.jpg | 0.5685 |
| 61 | 0061_playground_car_inpainted.jpg | 0.3583 |
| 62 | 0062_playground_book_inpainted.jpg | 0.3465 |
| 63 | 0063_playground_ronaldo_inpainted.jpg | 0.3931 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.1988 |
| 65 | 0065_beach_bench_inpainted.jpg | 0.4288 |
| 66 | 0066_beach_tree_inpainted.jpg | 0.7350 |
| 67 | 0067_beach_giraffe_inpainted.jpg | 0.4623 |
| 68 | 0068_beach_plane_inpainted.jpg | 0.7649 |
| 69 | 0069_beach_car_inpainted.jpg | 0.2967 |
| 70 | 0070_beach_book_inpainted.jpg | 0.1988 |
| 71 | 0071_beach_ronaldo_inpainted.jpg | 0.8228 |
| 72 | 0072_beach_mug_inpainted.jpg | 0.7173 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1141 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.1387 |
| 75 | 0075_brick_giraffe_inpainted.jpg | 0.2894 |
| 76 | 0076_brick_plane_inpainted.jpg | 0.4065 |
| 77 | 0077_brick_car_inpainted.jpg | 0.2392 |
| 78 | 0078_brick_book_inpainted.jpg | 0.2970 |

