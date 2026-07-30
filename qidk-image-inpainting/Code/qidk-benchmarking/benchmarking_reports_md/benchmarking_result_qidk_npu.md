# Benchmarking Report: benchmarking_result_qidk_npu


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 33.5086 |
| ssim | 0.9616 |
| lpips | 0.0326 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9939 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9852 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.9734 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.png | 0.0387 |
| 73 | 0073_brick_bench_inpainted.png | 0.1097 |
| 41 | 0041_street_bench_inpainted.png | 0.1497 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 23.3446 |
| masked_ssim | 0.7251 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 1.0000 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.9988 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9799 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 0.0656 |
| 57 | 0057_playground_bench_inpainted.png | 0.0850 |
| 77 | 0077_brick_car_inpainted.png | 0.1184 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.5180 |
| brisque | 39.5516 |
| piqe | 40.5334 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.9327 |
| 22 | 0022_tablenwall_book_inpainted.png | 0.9325 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9295 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 0.2898 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.3512 |
| 34 | 0034_sunset_tree_inpainted.png | 0.3584 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 20 | 0020_tablenwall_plane_inpainted.png | 48.8500 |
| 52 | 0052_tabletop_plane_inpainted.png | 47.7000 |
| 29 | 0029_wall-floor_car_inpainted.png | 47.1000 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.png | 17.8300 |
| 64 | 0064_playground_mug_inpainted.png | 18.8100 |
| 70 | 0070_beach_book_inpainted.png | 19.7400 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9980 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9977 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.9976 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.png | 0.8511 |
| 74 | 0074_brick_tree_inpainted.png | 0.8648 |
| 57 | 0057_playground_bench_inpainted.png | 0.8653 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 0.0007 |
| 54 | 0054_tabletop_book_inpainted.png | 0.0013 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.0017 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.png | 0.1158 |
| 41 | 0041_street_bench_inpainted.png | 0.1028 |
| 73 | 0073_brick_bench_inpainted.png | 0.1017 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 38.3500 |
| 29 | 0029_wall-floor_car_inpainted.png | 38.3000 |
| 20 | 0020_tablenwall_plane_inpainted.png | 37.6300 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.png | 9.5600 |
| 57 | 0057_playground_bench_inpainted.png | 9.5600 |
| 70 | 0070_beach_book_inpainted.png | 11.2900 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9865 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.9859 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9854 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 77 | 0077_brick_car_inpainted.png | 0.1793 |
| 76 | 0076_brick_plane_inpainted.png | 0.1880 |
| 64 | 0064_playground_mug_inpainted.png | 0.2852 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 48 | 0048_street_mug_inpainted.png | 3.0252 |
| 41 | 0041_street_bench_inpainted.png | 3.1427 |
| 47 | 0047_street_ronaldo_inpainted.png | 3.1960 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 26.3526 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 22.0188 |
| 40 | 0040_sunset_mug_inpainted.png | 21.9827 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 0.4118 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.4244 |
| 8 | 0008_grass_mug_inpainted.png | 0.6509 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.png | 94.1597 |
| 40 | 0040_sunset_mug_inpainted.png | 93.1959 |
| 35 | 0035_sunset_giraffe_inpainted.png | 92.3768 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 37 | 0037_sunset_car_inpainted.png | 19.4784 |
| 40 | 0040_sunset_mug_inpainted.png | 21.5714 |
| 35 | 0035_sunset_giraffe_inpainted.png | 21.8083 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 72.8120 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 70.2398 |
| 26 | 0026_wall-floor_tree_inpainted.png | 70.0901 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 0.4242 |
| 2 | 0002_grass_tree_inpainted.png | 0.6840 |
| 3 | 0003_grass_giraffe_inpainted.png | 0.6553 |
| 4 | 0004_grass_plane_inpainted.png | 0.8361 |
| 5 | 0005_grass_car_inpainted.png | 0.6347 |
| 6 | 0006_grass_book_inpainted.png | 0.6424 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.6237 |
| 8 | 0008_grass_mug_inpainted.png | 0.4395 |
| 9 | 0009_empty_room_bench_inpainted.png | 0.5986 |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9183 |
| 11 | 0011_empty_room_giraffe_inpainted.png | 0.9456 |
| 12 | 0012_empty_room_plane_inpainted.png | 0.9174 |
| 13 | 0013_empty_room_car_inpainted.png | 0.7158 |
| 14 | 0014_empty_room_book_inpainted.png | 0.9510 |
| 15 | 0015_empty_room_ronaldo_inpainted.png | 0.4865 |
| 16 | 0016_empty_room_mug_inpainted.png | 0.6893 |
| 17 | 0017_tablenwall_bench_inpainted.png | 0.8052 |
| 18 | 0018_tablenwall_tree_inpainted.png | 0.9422 |
| 19 | 0019_tablenwall_giraffe_inpainted.png | 0.9595 |
| 20 | 0020_tablenwall_plane_inpainted.png | 0.9939 |
| 21 | 0021_tablenwall_car_inpainted.png | 0.9295 |
| 22 | 0022_tablenwall_book_inpainted.png | 0.6545 |
| 23 | 0023_tablenwall_ronaldo_inpainted.png | 0.6461 |
| 24 | 0024_tablenwall_mug_inpainted.png | 0.9437 |
| 25 | 0025_wall-floor_bench_inpainted.png | 0.7905 |
| 26 | 0026_wall-floor_tree_inpainted.png | 0.9646 |
| 27 | 0027_wall-floor_giraffe_inpainted.png | 0.9698 |
| 28 | 0028_wall-floor_plane_inpainted.png | 0.9669 |
| 29 | 0029_wall-floor_car_inpainted.png | 0.9734 |
| 30 | 0030_wall-floor_book_inpainted.png | 0.6672 |
| 31 | 0031_wall-floor_ronaldo_inpainted.png | 0.9425 |
| 32 | 0032_wall-floor_mug_inpainted.png | 0.7375 |
| 33 | 0033_sunset_bench_inpainted.png | 0.7522 |
| 34 | 0034_sunset_tree_inpainted.png | 0.7635 |
| 35 | 0035_sunset_giraffe_inpainted.png | 0.7983 |
| 36 | 0036_sunset_plane_inpainted.png | 0.8715 |
| 37 | 0037_sunset_car_inpainted.png | 0.7471 |
| 38 | 0038_sunset_book_inpainted.png | 0.8018 |
| 39 | 0039_sunset_ronaldo_inpainted.png | 0.7696 |
| 40 | 0040_sunset_mug_inpainted.png | 0.8297 |
| 41 | 0041_street_bench_inpainted.png | 0.1497 |
| 42 | 0042_street_tree_inpainted.png | 0.5829 |
| 43 | 0043_street_giraffe_inpainted.png | 0.4455 |
| 44 | 0044_street_plane_inpainted.png | 0.7370 |
| 45 | 0045_street_car_inpainted.png | 0.4851 |
| 46 | 0046_street_book_inpainted.png | 0.4994 |
| 47 | 0047_street_ronaldo_inpainted.png | 0.3286 |
| 48 | 0048_street_mug_inpainted.png | 0.3429 |
| 49 | 0049_tabletop_bench_inpainted.png | 0.8074 |
| 50 | 0050_tabletop_tree_inpainted.png | 0.8357 |
| 51 | 0051_tabletop_giraffe_inpainted.png | 0.7497 |
| 52 | 0052_tabletop_plane_inpainted.png | 0.9852 |
| 53 | 0053_tabletop_car_inpainted.png | 0.8171 |
| 54 | 0054_tabletop_book_inpainted.png | 0.9501 |
| 55 | 0055_tabletop_ronaldo_inpainted.png | 0.8538 |
| 56 | 0056_tabletop_mug_inpainted.png | 0.8723 |
| 57 | 0057_playground_bench_inpainted.png | 0.0387 |
| 58 | 0058_playground_tree_inpainted.png | 0.4328 |
| 59 | 0059_playground_giraffe_inpainted.png | 0.3054 |
| 60 | 0060_playground_plane_inpainted.png | 0.5829 |
| 61 | 0061_playground_car_inpainted.png | 0.4125 |
| 62 | 0062_playground_book_inpainted.png | 0.3493 |
| 63 | 0063_playground_ronaldo_inpainted.png | 0.4117 |
| 64 | 0064_playground_mug_inpainted.png | 0.1816 |
| 65 | 0065_beach_bench_inpainted.png | 0.2818 |
| 66 | 0066_beach_tree_inpainted.png | 0.6740 |
| 67 | 0067_beach_giraffe_inpainted.png | 0.3502 |
| 68 | 0068_beach_plane_inpainted.png | 0.7488 |
| 69 | 0069_beach_car_inpainted.png | 0.3115 |
| 70 | 0070_beach_book_inpainted.png | 0.2090 |
| 71 | 0071_beach_ronaldo_inpainted.png | 0.6778 |
| 72 | 0072_beach_mug_inpainted.png | 0.6300 |
| 73 | 0073_brick_bench_inpainted.png | 0.1097 |
| 74 | 0074_brick_tree_inpainted.png | 0.1626 |
| 75 | 0075_brick_giraffe_inpainted.png | 0.3615 |
| 76 | 0076_brick_plane_inpainted.png | 0.6045 |
| 77 | 0077_brick_car_inpainted.png | 0.3971 |
| 78 | 0078_brick_book_inpainted.png | 0.4599 |

