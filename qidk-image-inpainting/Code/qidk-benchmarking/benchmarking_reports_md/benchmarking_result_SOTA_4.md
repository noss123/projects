# Benchmarking Report: benchmarking_result_SOTA_4


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 38.0713 |
| ssim | 0.9661 |
| lpips | 0.0175 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 1.0000 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 0.9919 |
| 54 | 0054_tabletop_book_inpainted.jpg | 0.9763 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0000 |
| 41 | 0041_street_bench_inpainted.jpg | 0.0797 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1878 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 28.0377 |
| masked_ssim | 0.7743 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 1.0000 |
| 54 | 0054_tabletop_book_inpainted.jpg | 0.9931 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 0.9877 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0000 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.0302 |
| 61 | 0061_playground_car_inpainted.jpg | 0.0546 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.9108 |
| brisque | 39.4363 |
| piqe | 42.4179 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.9709 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.9684 |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 0.9665 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.2396 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 0.3474 |
| 34 | 0034_sunset_tree_inpainted.jpg | 0.3558 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 56.3300 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 55.8300 |
| 54 | 0054_tabletop_book_inpainted.jpg | 54.2600 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 18.4600 |
| 64 | 0064_playground_mug_inpainted.jpg | 20.3200 |
| 65 | 0065_beach_bench_inpainted.jpg | 21.2300 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9994 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9994 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9993 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 0.8441 |
| 41 | 0041_street_bench_inpainted.jpg | 0.8472 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.8649 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.0001 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.0001 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.0001 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0954 |
| 41 | 0041_street_bench_inpainted.jpg | 0.0778 |
| 70 | 0070_beach_book_inpainted.jpg | 0.0777 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 45.0700 |
| 54 | 0054_tabletop_book_inpainted.jpg | 44.8100 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 44.6700 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 11.3100 |
| 64 | 0064_playground_mug_inpainted.jpg | 11.3900 |
| 58 | 0058_playground_tree_inpainted.jpg | 12.1900 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9953 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 0.9953 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9947 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 57 | 0057_playground_bench_inpainted.jpg | 0.3724 |
| 61 | 0061_playground_car_inpainted.jpg | 0.3938 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.4085 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 43 | 0043_street_giraffe_inpainted.jpg | 3.6617 |
| 45 | 0045_street_car_inpainted.jpg | 3.7023 |
| 48 | 0048_street_mug_inpainted.jpg | 3.7600 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 24.5726 |
| 40 | 0040_sunset_mug_inpainted.jpg | 22.7513 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 20.8341 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.1009 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.4563 |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 0.5305 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 36 | 0036_sunset_plane_inpainted.jpg | 94.5568 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 92.8665 |
| 34 | 0034_sunset_tree_inpainted.jpg | 91.9145 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 37 | 0037_sunset_car_inpainted.jpg | 21.5515 |
| 40 | 0040_sunset_mug_inpainted.jpg | 22.3123 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 23.1819 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 77.2949 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 77.1141 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 77.1141 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 0.5552 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.6798 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 0.6645 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.7810 |
| 5 | 0005_grass_car_inpainted.jpg | 0.6081 |
| 6 | 0006_grass_book_inpainted.jpg | 0.7207 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.6250 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.5829 |
| 9 | 0009_empty_room_bench_inpainted.jpg | 0.5153 |
| 10 | 0010_empty_room_tree_inpainted.jpg | 0.9398 |
| 11 | 0011_empty_room_giraffe_inpainted.jpg | 0.9919 |
| 12 | 0012_empty_room_plane_inpainted.jpg | 0.9481 |
| 13 | 0013_empty_room_car_inpainted.jpg | 0.7429 |
| 14 | 0014_empty_room_book_inpainted.jpg | 0.9746 |
| 15 | 0015_empty_room_ronaldo_inpainted.jpg | 0.4274 |
| 16 | 0016_empty_room_mug_inpainted.jpg | 0.8323 |
| 17 | 0017_tablenwall_bench_inpainted.jpg | 0.8875 |
| 18 | 0018_tablenwall_tree_inpainted.jpg | 0.9335 |
| 19 | 0019_tablenwall_giraffe_inpainted.jpg | 0.9405 |
| 20 | 0020_tablenwall_plane_inpainted.jpg | 0.9687 |
| 21 | 0021_tablenwall_car_inpainted.jpg | 0.9161 |
| 22 | 0022_tablenwall_book_inpainted.jpg | 0.7185 |
| 23 | 0023_tablenwall_ronaldo_inpainted.jpg | 0.6660 |
| 24 | 0024_tablenwall_mug_inpainted.jpg | 0.9381 |
| 25 | 0025_wall-floor_bench_inpainted.jpg | 0.9159 |
| 26 | 0026_wall-floor_tree_inpainted.jpg | 0.9590 |
| 27 | 0027_wall-floor_giraffe_inpainted.jpg | 0.9693 |
| 28 | 0028_wall-floor_plane_inpainted.jpg | 1.0000 |
| 29 | 0029_wall-floor_car_inpainted.jpg | 0.9739 |
| 30 | 0030_wall-floor_book_inpainted.jpg | 0.8139 |
| 31 | 0031_wall-floor_ronaldo_inpainted.jpg | 0.9581 |
| 32 | 0032_wall-floor_mug_inpainted.jpg | 0.8314 |
| 33 | 0033_sunset_bench_inpainted.jpg | 0.9050 |
| 34 | 0034_sunset_tree_inpainted.jpg | 0.9101 |
| 35 | 0035_sunset_giraffe_inpainted.jpg | 0.8845 |
| 36 | 0036_sunset_plane_inpainted.jpg | 0.9126 |
| 37 | 0037_sunset_car_inpainted.jpg | 0.8686 |
| 38 | 0038_sunset_book_inpainted.jpg | 0.8774 |
| 39 | 0039_sunset_ronaldo_inpainted.jpg | 0.9228 |
| 40 | 0040_sunset_mug_inpainted.jpg | 0.9094 |
| 41 | 0041_street_bench_inpainted.jpg | 0.0797 |
| 42 | 0042_street_tree_inpainted.jpg | 0.5748 |
| 43 | 0043_street_giraffe_inpainted.jpg | 0.4645 |
| 44 | 0044_street_plane_inpainted.jpg | 0.6898 |
| 45 | 0045_street_car_inpainted.jpg | 0.5089 |
| 46 | 0046_street_book_inpainted.jpg | 0.4519 |
| 47 | 0047_street_ronaldo_inpainted.jpg | 0.3886 |
| 48 | 0048_street_mug_inpainted.jpg | 0.3785 |
| 49 | 0049_tabletop_bench_inpainted.jpg | 0.9219 |
| 50 | 0050_tabletop_tree_inpainted.jpg | 0.8376 |
| 51 | 0051_tabletop_giraffe_inpainted.jpg | 0.7672 |
| 52 | 0052_tabletop_plane_inpainted.jpg | 0.9708 |
| 53 | 0053_tabletop_car_inpainted.jpg | 0.8037 |
| 54 | 0054_tabletop_book_inpainted.jpg | 0.9763 |
| 55 | 0055_tabletop_ronaldo_inpainted.jpg | 0.8553 |
| 56 | 0056_tabletop_mug_inpainted.jpg | 0.9084 |
| 57 | 0057_playground_bench_inpainted.jpg | 0.0000 |
| 58 | 0058_playground_tree_inpainted.jpg | 0.4255 |
| 59 | 0059_playground_giraffe_inpainted.jpg | 0.3841 |
| 60 | 0060_playground_plane_inpainted.jpg | 0.6013 |
| 61 | 0061_playground_car_inpainted.jpg | 0.4434 |
| 62 | 0062_playground_book_inpainted.jpg | 0.4108 |
| 63 | 0063_playground_ronaldo_inpainted.jpg | 0.4323 |
| 64 | 0064_playground_mug_inpainted.jpg | 0.2701 |
| 65 | 0065_beach_bench_inpainted.jpg | 0.2376 |
| 66 | 0066_beach_tree_inpainted.jpg | 0.7341 |
| 67 | 0067_beach_giraffe_inpainted.jpg | 0.3769 |
| 68 | 0068_beach_plane_inpainted.jpg | 0.7117 |
| 69 | 0069_beach_car_inpainted.jpg | 0.3894 |
| 70 | 0070_beach_book_inpainted.jpg | 0.2384 |
| 71 | 0071_beach_ronaldo_inpainted.jpg | 0.7126 |
| 72 | 0072_beach_mug_inpainted.jpg | 0.6983 |
| 73 | 0073_brick_bench_inpainted.jpg | 0.1878 |
| 74 | 0074_brick_tree_inpainted.jpg | 0.3234 |
| 75 | 0075_brick_giraffe_inpainted.jpg | 0.4547 |
| 76 | 0076_brick_plane_inpainted.jpg | 0.6194 |
| 77 | 0077_brick_car_inpainted.jpg | 0.4897 |
| 78 | 0078_brick_book_inpainted.jpg | 0.5333 |

