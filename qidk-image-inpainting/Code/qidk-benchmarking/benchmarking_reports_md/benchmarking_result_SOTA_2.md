# Benchmarking Report: benchmarking_result_SOTA_2


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 36.3270 |
| ssim | 0.9708 |
| lpips | 0.0143 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 1.0000 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.8648 |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 0.7577 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 51 | 0051_playground_giraffe_inpainted.jpg | 0.0454 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 0.0634 |
| 1 | 0001_grass_bench_inpainted.jpg | 0.3257 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 25.9500 |
| masked_ssim | 0.7916 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 1.0000 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.8502 |
| 41 | 0041_tabletop_bench_inpainted.jpg | 0.7284 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 71 | 0071_office_ronaldo_inpainted.jpg | 0.0661 |
| 51 | 0051_playground_giraffe_inpainted.jpg | 0.0900 |
| 61 | 0061_beach_car_inpainted.jpg | 0.2380 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.9880 |
| brisque | 35.4449 |
| piqe | 43.4714 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 0.9952 |
| 1 | 0001_grass_bench_inpainted.jpg | 0.9069 |
| 81 | 0081_street_plane_giraffe_inpainted.jpg | 0.8877 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.3052 |
| 21 | 0021_wall-floor_car_inpainted.jpg | 0.3676 |
| 61 | 0061_beach_car_inpainted.jpg | 0.5985 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 57.7600 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 47.5500 |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 43.0400 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 51 | 0051_playground_giraffe_inpainted.jpg | 24.2800 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 28.9300 |
| 1 | 0001_grass_bench_inpainted.jpg | 29.3500 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 0.9995 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.9982 |
| 41 | 0041_tabletop_bench_inpainted.jpg | 0.9952 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 51 | 0051_playground_giraffe_inpainted.jpg | 0.9336 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 0.9349 |
| 1 | 0001_grass_bench_inpainted.jpg | 0.9593 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 0.0001 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.0012 |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 0.0023 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 71 | 0071_office_ronaldo_inpainted.jpg | 0.0415 |
| 51 | 0051_playground_giraffe_inpainted.jpg | 0.0321 |
| 1 | 0001_grass_bench_inpainted.jpg | 0.0189 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 46.1500 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 37.2500 |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 31.5100 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 51 | 0051_playground_giraffe_inpainted.jpg | 14.6200 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 18.7900 |
| 61 | 0061_beach_car_inpainted.jpg | 19.1200 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 0.9954 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.9866 |
| 41 | 0041_tabletop_bench_inpainted.jpg | 0.9805 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 71 | 0071_office_ronaldo_inpainted.jpg | 0.4848 |
| 51 | 0051_playground_giraffe_inpainted.jpg | 0.5767 |
| 61 | 0061_beach_car_inpainted.jpg | 0.6550 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 81 | 0081_street_plane_giraffe_inpainted.jpg | 3.8109 |
| 91 | 0091_street_giraffe_tree_inpainted.jpg | 3.8504 |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 4.1144 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 24.9122 |
| 21 | 0021_wall-floor_car_inpainted.jpg | 7.8909 |
| 61 | 0061_beach_car_inpainted.jpg | 6.5036 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 1.6586 |
| 1 | 0001_grass_bench_inpainted.jpg | 2.1969 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 12.5942 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 90.4558 |
| 21 | 0021_wall-floor_car_inpainted.jpg | 64.1534 |
| 61 | 0061_beach_car_inpainted.jpg | 57.6325 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 25.9879 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 30.3036 |
| 81 | 0081_street_plane_giraffe_inpainted.jpg | 34.8399 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 21 | 0021_wall-floor_car_inpainted.jpg | 77.1141 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 52.3584 |
| 51 | 0051_playground_giraffe_inpainted.jpg | 51.0864 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 0.3257 |
| 11 | 0011_tablenwall_giraffe_inpainted.jpg | 0.7577 |
| 21 | 0021_wall-floor_car_inpainted.jpg | 1.0000 |
| 31 | 0031_sunset_ronaldo_inpainted.jpg | 0.8648 |
| 41 | 0041_tabletop_bench_inpainted.jpg | 0.6858 |
| 51 | 0051_playground_giraffe_inpainted.jpg | 0.0454 |
| 61 | 0061_beach_car_inpainted.jpg | 0.4084 |
| 71 | 0071_office_ronaldo_inpainted.jpg | 0.0634 |
| 81 | 0081_street_plane_giraffe_inpainted.jpg | 0.3933 |
| 91 | 0091_street_giraffe_tree_inpainted.jpg | 0.4695 |

