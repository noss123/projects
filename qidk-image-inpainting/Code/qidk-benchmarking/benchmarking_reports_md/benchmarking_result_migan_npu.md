# Benchmarking Report: benchmarking_result_migan_npu


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 35.1265 |
| ssim | 0.9491 |
| lpips | 0.0204 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 1.0000 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9905 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9899 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1127 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.1397 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.1566 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 27.8428 |
| masked_ssim | 0.7685 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9996 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.9941 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9914 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 0.0775 |
| 77 | 0077_brick_car_inpainted.jpg | 0.0808 |
| 61 | 0061_playground_car_inpainted.jpg | 0.1525 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 7.7373 |
| brisque | 41.5752 |
| piqe | 50.5731 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.9682 |
| 24 | 0024_tablenwall_mug_inpainted.jpg | 0.9658 |
| 19 | 0019_tablenwall_giraffe_inpainted.jpg | 0.9656 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 0.0206 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 0.0396 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.1153 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 48.5000 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 48.2100 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 48.1500 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 21.7200 |
| 70 | 0070_beach_book_inpainted.jpg | 21.8300 |
| 57 | 0057_playground_bench_inpainted.jpg | 21.9500 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.9922 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.9919 |
| 38 | 0038_sunset_book_inpainted.jpg | 0.9918 |


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
| 36 | 0036_sunset_plane_inpainted.jpg | 0.0022 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.0023 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.0024 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 70 | 0070_beach_book_inpainted.jpg | 0.0674 |
| 41 | 0041_street_bench_inpainted.jpg | 0.0575 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0539 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 46.2200 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 45.8600 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 45.6100 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 10.3800 |
| 61 | 0061_playground_car_inpainted.jpg | 11.1000 |
| 58 | 0058_playground_tree_inpainted.jpg | 11.3500 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9926 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9925 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9924 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 77 | 0077_brick_car_inpainted.jpg | 0.2014 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.3241 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.3661 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 41 | 0041_street_bench_inpainted.jpg | 3.4100 |
| 42 | 0042_street_tree_inpainted.jpg | 3.4264 |
| 45 | 0045_street_car_inpainted.jpg | 3.4735 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 37.3603 |
| 36 | 0036_sunset_plane_inpainted.jpg | 35.8548 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 35.7880 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 5.2513 |
| 4 | 0004_grass_plane_inpainted.jpg | 5.5106 |
| 6 | 0006_grass_book_inpainted.jpg | 5.5555 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 99.5686 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 98.1097 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 97.6033 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 41 | 0041_street_bench_inpainted.jpg | 33.9103 |
| 74 | 0074_brick_tree_inpainted.jpg | 34.3773 |
| 48 | 0048_street_mug_inpainted.jpg | 34.4406 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 89.0606 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 83.6574 |
| 33 | 0033_sunset_bench_inpainted.jpg | 82.3635 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 0.4961 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.4999 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 0.5472 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.6050 |
| 5 | 0005_grass_car_inpainted.jpg | 0.4723 |
| 6 | 0006_grass_book_inpainted.jpg | 0.5453 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.5018 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.4637 |
| 9 | 0009_empty_room_bench_inpainted.jpg | 0.5604 |
| 10 | 0010_empty_room_tree_inpainted.jpg | 0.7969 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 0.8013 |
| 12 | 0012_empty_room_plane_inpainted.jpg | 0.8009 |
| 13 | 0013_empty_room_car_inpainted.jpg | 0.7290 |
| 14 | 0014_empty_room_book_inpainted.jpg | 0.7952 |
| 15 | 0015_empty_room_ronaldo_inpainted.jpg | 0.4798 |
| 16 | 0016_empty_room_mug_inpainted.jpg | 0.7833 |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.6835 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.7711 |
| 19 | 0019_tablenwall_giraffe_inpainted.jpg | 0.7719 |
| 20 | 0020_tablenwall_plane_inpainted.jpg | 0.7748 |
| 21 | 0021_tablenwall_car_inpainted.jpg | 0.7695 |
| 22 | 0022_tablenwall_book_inpainted.jpg | 0.5457 |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 0.5829 |
| 24 | 0024_tablenwall_mug_inpainted.jpg | 0.7650 |
| 25 | 0025_wall-floor_bench_inpainted.jpg | 0.7487 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9887 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9905 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9899 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9835 |
| 30 | 0030_wall-floor_book_inpainted.jpg | 0.8498 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9884 |
| 32 | 0032_wall-floor_mug_inpainted.jpg | 0.8962 |
| 33 | 0033_sunset_bench_inpainted.jpg | 0.8233 |
| 34 | 0034_sunset_tree_inpainted.jpg | 0.9828 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 0.9870 |
| 36 | 0036_sunset_plane_inpainted.jpg | 1.0000 |
| 37 | 0037_sunset_car_inpainted.jpg | 0.9731 |
| 38 | 0038_sunset_book_inpainted.jpg | 0.9875 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 0.9812 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.9861 |
| 41 | 0041_street_bench_inpainted.jpg | 0.1617 |
| 42 | 0042_street_tree_inpainted.jpg | 0.3868 |
| 43 | 0043_street_giraffe_inpainted.jpg | 0.4111 |
| 44 | 0044_street_plane_inpainted.jpg | 0.5400 |
| 45 | 0045_street_car_inpainted.jpg | 0.3666 |
| 46 | 0046_street_book_inpainted.jpg | 0.3822 |
| 47 | 0047_street_ronaldo_inpainted.jpg | 0.2686 |
| 48 | 0048_street_mug_inpainted.jpg | 0.2483 |
| 49 | 0049_tabletop_bench_inpainted.jpg | 0.7079 |
| 50 | 0050_tabletop_tree_inpainted.jpg | 0.7932 |
| 51 | 0051_tabletop_giraffe_inpainted.jpg | 0.7592 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.8329 |
| 53 | 0053_tabletop_car_inpainted.jpg | 0.7768 |
| 54 | 0054_tabletop_book_inpainted.jpg | 0.8311 |
| 55 | 0055_tabletop_ronaldo_inpainted.jpg | 0.8155 |
| 56 | 0056_tabletop_mug_inpainted.jpg | 0.8302 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.1566 |
| 58 | 0058_playground_tree_inpainted.jpg | 0.3714 |
| 59 | 0059_playground_giraffe_inpainted.jpg | 0.3245 |
| 60 | 0060_playground_plane_inpainted.jpg | 0.5683 |
| 61 | 0061_playground_car_inpainted.jpg | 0.3582 |
| 62 | 0062_playground_book_inpainted.jpg | 0.3465 |
| 63 | 0063_playground_ronaldo_inpainted.jpg | 0.3930 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.1985 |
| 65 | 0065_beach_bench_inpainted.jpg | 0.4283 |
| 66 | 0066_beach_tree_inpainted.jpg | 0.7351 |
| 67 | 0067_beach_giraffe_inpainted.jpg | 0.4621 |
| 68 | 0068_beach_plane_inpainted.jpg | 0.7651 |
| 69 | 0069_beach_car_inpainted.jpg | 0.2968 |
| 70 | 0070_beach_book_inpainted.jpg | 0.1992 |
| 71 | 0071_beach_ronaldo_inpainted.jpg | 0.8227 |
| 72 | 0072_beach_mug_inpainted.jpg | 0.7164 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1127 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.1397 |
| 75 | 0075_brick_giraffe_inpainted.jpg | 0.2892 |
| 76 | 0076_brick_plane_inpainted.jpg | 0.4067 |
| 77 | 0077_brick_car_inpainted.jpg | 0.2395 |
| 78 | 0078_brick_book_inpainted.jpg | 0.2956 |

