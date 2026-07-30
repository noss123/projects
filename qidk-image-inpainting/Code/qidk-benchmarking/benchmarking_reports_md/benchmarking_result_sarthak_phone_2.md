# Benchmarking Report: benchmarking_result_sarthak_phone_2


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 33.2796 |
| ssim | 0.9569 |
| lpips | 0.0374 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9974 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9973 |
| 20 | 0020_tablenwall_plane_inpainted.jpg | 0.9964 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0423 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1242 |
| 41 | 0041_street_bench_inpainted.jpg | 0.1789 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 23.4021 |
| masked_ssim | 0.7218 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9998 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.9893 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9790 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 0.0759 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0941 |
| 61 | 0061_playground_car_inpainted.jpg | 0.1138 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.4266 |
| brisque | 38.6042 |
| piqe | 42.5902 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.9784 |
| 21 | 0021_tablenwall_car_inpainted.jpg | 0.9720 |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 0.9717 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.2542 |
| 34 | 0034_sunset_tree_inpainted.jpg | 0.2750 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.2885 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 20 | 0020_tablenwall_plane_inpainted.jpg | 49.7200 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 49.6500 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 49.5100 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 16.6700 |
| 64 | 0064_playground_mug_inpainted.jpg | 18.2100 |
| 70 | 0070_beach_book_inpainted.jpg | 19.6800 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9983 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9981 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9980 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 73 | 0073_brick_bench_inpainted.jpg | 0.8065 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.8268 |
| 41 | 0041_street_bench_inpainted.jpg | 0.8406 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.0008 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.0009 |
| 54 | 0054_tabletop_book_inpainted.jpg | 0.0010 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 0.1708 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1278 |
| 41 | 0041_street_bench_inpainted.jpg | 0.1215 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.jpg | 39.7600 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 39.1800 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 38.4800 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 64 | 0064_playground_mug_inpainted.jpg | 9.2900 |
| 57 | 0057_playground_bench_inpainted.jpg | 9.5300 |
| 58 | 0058_playground_tree_inpainted.jpg | 11.3100 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9895 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9891 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9880 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 77 | 0077_brick_car_inpainted.jpg | 0.1678 |
| 76 | 0076_brick_plane_inpainted.jpg | 0.1911 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.2834 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 41 | 0041_street_bench_inpainted.jpg | 2.7738 |
| 48 | 0048_street_mug_inpainted.jpg | 3.0396 |
| 47 | 0047_street_ronaldo_inpainted.jpg | 3.1001 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 34 | 0034_sunset_tree_inpainted.jpg | 26.6116 |
| 36 | 0036_sunset_plane_inpainted.jpg | 25.1040 |
| 40 | 0040_sunset_mug_inpainted.jpg | 20.9285 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 24 | 0024_tablenwall_mug_inpainted.jpg | 0.5858 |
| 21 | 0021_tablenwall_car_inpainted.jpg | 0.8145 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.8147 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 40 | 0040_sunset_mug_inpainted.jpg | 100.5210 |
| 36 | 0036_sunset_plane_inpainted.jpg | 97.2807 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 96.8788 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 26.0640 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 26.5341 |
| 22 | 0022_tablenwall_book_inpainted.jpg | 27.0959 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 77.2121 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 77.1269 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 76.8077 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 0.4618 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.6995 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 0.6653 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.8295 |
| 5 | 0005_grass_car_inpainted.jpg | 0.6628 |
| 6 | 0006_grass_book_inpainted.jpg | 0.6592 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.6111 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.5134 |
| 9 | 0009_empty_room_bench_inpainted.jpg | 0.5911 |
| 10 | 0010_empty_room_tree_inpainted.jpg | 0.8988 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 0.9215 |
| 12 | 0012_empty_room_plane_inpainted.jpg | 0.9057 |
| 13 | 0013_empty_room_car_inpainted.jpg | 0.7276 |
| 14 | 0014_empty_room_book_inpainted.jpg | 0.9437 |
| 15 | 0015_empty_room_ronaldo_inpainted.jpg | 0.5396 |
| 16 | 0016_empty_room_mug_inpainted.jpg | 0.7035 |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.9310 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.9391 |
| 19 | 0019_tablenwall_giraffe_inpainted.jpg | 0.9640 |
| 20 | 0020_tablenwall_plane_inpainted.jpg | 0.9964 |
| 21 | 0021_tablenwall_car_inpainted.jpg | 0.9128 |
| 22 | 0022_tablenwall_book_inpainted.jpg | 0.6725 |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 0.6869 |
| 24 | 0024_tablenwall_mug_inpainted.jpg | 0.9413 |
| 25 | 0025_wall-floor_bench_inpainted.jpg | 0.7893 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9782 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9800 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9973 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9974 |
| 30 | 0030_wall-floor_book_inpainted.jpg | 0.6867 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9314 |
| 32 | 0032_wall-floor_mug_inpainted.jpg | 0.7560 |
| 33 | 0033_sunset_bench_inpainted.jpg | 0.7442 |
| 34 | 0034_sunset_tree_inpainted.jpg | 0.7742 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 0.8275 |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.8764 |
| 37 | 0037_sunset_car_inpainted.jpg | 0.7676 |
| 38 | 0038_sunset_book_inpainted.jpg | 0.8249 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 0.7769 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.8472 |
| 41 | 0041_street_bench_inpainted.jpg | 0.1789 |
| 42 | 0042_street_tree_inpainted.jpg | 0.6063 |
| 43 | 0043_street_giraffe_inpainted.jpg | 0.4956 |
| 44 | 0044_street_plane_inpainted.jpg | 0.7209 |
| 45 | 0045_street_car_inpainted.jpg | 0.5259 |
| 46 | 0046_street_book_inpainted.jpg | 0.5218 |
| 47 | 0047_street_ronaldo_inpainted.jpg | 0.3991 |
| 48 | 0048_street_mug_inpainted.jpg | 0.4013 |
| 49 | 0049_tabletop_bench_inpainted.jpg | 0.8721 |
| 50 | 0050_tabletop_tree_inpainted.jpg | 0.8436 |
| 51 | 0051_tabletop_giraffe_inpainted.jpg | 0.7598 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.9846 |
| 53 | 0053_tabletop_car_inpainted.jpg | 0.8010 |
| 54 | 0054_tabletop_book_inpainted.jpg | 0.9603 |
| 55 | 0055_tabletop_ronaldo_inpainted.jpg | 0.8586 |
| 56 | 0056_tabletop_mug_inpainted.jpg | 0.8530 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0423 |
| 58 | 0058_playground_tree_inpainted.jpg | 0.4617 |
| 59 | 0059_playground_giraffe_inpainted.jpg | 0.3740 |
| 60 | 0060_playground_plane_inpainted.jpg | 0.5943 |
| 61 | 0061_playground_car_inpainted.jpg | 0.4501 |
| 62 | 0062_playground_book_inpainted.jpg | 0.3994 |
| 63 | 0063_playground_ronaldo_inpainted.jpg | 0.4468 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.2688 |
| 65 | 0065_beach_bench_inpainted.jpg | 0.2838 |
| 66 | 0066_beach_tree_inpainted.jpg | 0.7081 |
| 67 | 0067_beach_giraffe_inpainted.jpg | 0.4295 |
| 68 | 0068_beach_plane_inpainted.jpg | 0.7481 |
| 69 | 0069_beach_car_inpainted.jpg | 0.3883 |
| 70 | 0070_beach_book_inpainted.jpg | 0.3258 |
| 71 | 0071_beach_ronaldo_inpainted.jpg | 0.7111 |
| 72 | 0072_beach_mug_inpainted.jpg | 0.6578 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1242 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.2513 |
| 75 | 0075_brick_giraffe_inpainted.jpg | 0.4297 |
| 76 | 0076_brick_plane_inpainted.jpg | 0.6074 |
| 77 | 0077_brick_car_inpainted.jpg | 0.4593 |
| 78 | 0078_brick_book_inpainted.jpg | 0.5059 |

