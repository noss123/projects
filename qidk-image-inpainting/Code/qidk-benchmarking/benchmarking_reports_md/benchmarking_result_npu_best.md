# Benchmarking Report: benchmarking_result_npu_best


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 36.4800 |
| ssim | 0.9827 |
| lpips | 0.0140 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9967 |
| 4 | 0004_grass_plane_inpainted.png | 0.9000 |
| 6 | 0006_grass_book_inpainted.png | 0.6179 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.png | 0.0000 |
| 1 | 0001_grass_bench_inpainted.png | 0.3011 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.3433 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 23.8110 |
| masked_ssim | 0.8073 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 1.0000 |
| 4 | 0004_grass_plane_inpainted.png | 0.6215 |
| 6 | 0006_grass_book_inpainted.png | 0.4755 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.png | 0.0612 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.1525 |
| 3 | 0003_grass_giraffe_inpainted.png | 0.2503 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 4.7273 |
| brisque | 7.1261 |
| piqe | 39.9657 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 3 | 0003_grass_giraffe_inpainted.png | 0.9456 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.8257 |
| 1 | 0001_grass_bench_inpainted.png | 0.8109 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 0.0112 |
| 9 | 0009_empty_room_bench_inpainted.png | 0.0651 |
| 2 | 0002_grass_tree_inpainted.png | 0.6817 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 46.4000 |
| 4 | 0004_grass_plane_inpainted.png | 43.4900 |
| 3 | 0003_grass_giraffe_inpainted.png | 37.3100 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.png | 28.2700 |
| 9 | 0009_empty_room_bench_inpainted.png | 31.2900 |
| 1 | 0001_grass_bench_inpainted.png | 31.8700 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9973 |
| 4 | 0004_grass_plane_inpainted.png | 0.9948 |
| 6 | 0006_grass_book_inpainted.png | 0.9872 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.png | 0.9694 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.9738 |
| 5 | 0005_grass_car_inpainted.png | 0.9769 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 4 | 0004_grass_plane_inpainted.png | 0.0026 |
| 10 | 0010_empty_room_tree_inpainted.png | 0.0031 |
| 6 | 0006_grass_book_inpainted.png | 0.0068 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.png | 0.0332 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.0178 |
| 5 | 0005_grass_car_inpainted.png | 0.0177 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 36.3600 |
| 4 | 0004_grass_plane_inpainted.png | 27.3400 |
| 6 | 0006_grass_book_inpainted.png | 24.2500 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.png | 17.4700 |
| 9 | 0009_empty_room_bench_inpainted.png | 17.7500 |
| 1 | 0001_grass_bench_inpainted.png | 20.7800 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9848 |
| 4 | 0004_grass_plane_inpainted.png | 0.8971 |
| 6 | 0006_grass_book_inpainted.png | 0.8568 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.6710 |
| 8 | 0008_grass_mug_inpainted.png | 0.7094 |
| 3 | 0003_grass_giraffe_inpainted.png | 0.7284 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 3 | 0003_grass_giraffe_inpainted.png | 4.1669 |
| 7 | 0007_grass_ronaldo_inpainted.png | 4.4469 |
| 1 | 0001_grass_bench_inpainted.png | 4.6652 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 5.0455 |
| 9 | 0009_empty_room_bench_inpainted.png | 4.9414 |
| 2 | 0002_grass_tree_inpainted.png | 4.8794 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 1.3267 |
| 8 | 0008_grass_mug_inpainted.png | 1.5116 |
| 6 | 0006_grass_book_inpainted.png | 1.7677 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 9 | 0009_empty_room_bench_inpainted.png | 28.9212 |
| 10 | 0010_empty_room_tree_inpainted.png | 27.9903 |
| 7 | 0007_grass_ronaldo_inpainted.png | 2.2627 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 37.3000 |
| 8 | 0008_grass_mug_inpainted.png | 37.5128 |
| 6 | 0006_grass_book_inpainted.png | 38.2052 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 10 | 0010_empty_room_tree_inpainted.png | 46.9396 |
| 9 | 0009_empty_room_bench_inpainted.png | 46.1994 |
| 4 | 0004_grass_plane_inpainted.png | 38.9939 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.png | 0.3011 |
| 2 | 0002_grass_tree_inpainted.png | 0.5094 |
| 3 | 0003_grass_giraffe_inpainted.png | 0.5099 |
| 4 | 0004_grass_plane_inpainted.png | 0.9000 |
| 5 | 0005_grass_car_inpainted.png | 0.3847 |
| 6 | 0006_grass_book_inpainted.png | 0.6179 |
| 7 | 0007_grass_ronaldo_inpainted.png | 0.3433 |
| 8 | 0008_grass_mug_inpainted.png | 0.0000 |
| 9 | 0009_empty_room_bench_inpainted.png | 0.4072 |
| 10 | 0010_empty_room_tree_inpainted.png | 0.9967 |

