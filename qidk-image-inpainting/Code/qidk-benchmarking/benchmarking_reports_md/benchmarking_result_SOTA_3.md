# Benchmarking Report: benchmarking_result_SOTA_3


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 36.3050 |
| ssim | 0.9741 |
| lpips | 0.0115 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 1.0000 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.7705 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.7341 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.jpg | 0.0466 |
| 1 | 0001_grass_bench_inpainted.jpg | 0.0562 |
| 5 | 0005_grass_car_inpainted.jpg | 0.1018 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 25.8590 |
| masked_ssim | 0.7882 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 1.0000 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.7203 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.4629 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.0369 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.2041 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.2049 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 4.7608 |
| brisque | 2.0168 |
| piqe | 35.6508 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 1.0000 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.9793 |
| 5 | 0005_grass_car_inpainted.jpg | 0.1806 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.0197 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.0262 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.1012 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 50.6500 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 40.9600 |
| 4 | 0004_grass_plane_inpainted.jpg | 40.4800 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 29.3500 |
| 8 | 0008_grass_mug_inpainted.jpg | 31.0000 |
| 5 | 0005_grass_car_inpainted.jpg | 31.3400 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 0.9940 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.9934 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.9900 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.jpg | 0.9580 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.9589 |
| 1 | 0001_grass_bench_inpainted.jpg | 0.9593 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 0.0007 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.0042 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.0054 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 5 | 0005_grass_car_inpainted.jpg | 0.0237 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.0219 |
| 1 | 0001_grass_bench_inpainted.jpg | 0.0189 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 41.3600 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 30.7600 |
| 4 | 0004_grass_plane_inpainted.jpg | 26.8800 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 20.3500 |
| 5 | 0005_grass_car_inpainted.jpg | 21.6500 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 21.9000 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 0.9605 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.9423 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.8327 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.6286 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 0.7062 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.7136 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 4.0603 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 4.0667 |
| 2 | 0002_grass_tree_inpainted.jpg | 4.7148 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 5.0108 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 5.0102 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 4.9861 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 0.2838 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.4220 |
| 5 | 0005_grass_car_inpainted.jpg | 2.1222 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 8 | 0008_grass_mug_inpainted.jpg | 2.7787 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 2.6783 |
| 2 | 0002_grass_tree_inpainted.jpg | 2.5252 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 26.2487 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 26.2489 |
| 5 | 0005_grass_car_inpainted.jpg | 36.4480 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 2 | 0002_grass_tree_inpainted.jpg | 39.2639 |
| 8 | 0008_grass_mug_inpainted.jpg | 39.0937 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 39.0267 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | 0001_grass_bench_inpainted.jpg | 0.0562 |
| 2 | 0002_grass_tree_inpainted.jpg | 0.3485 |
| 3 | 0003_grass_giraffe_inpainted.jpg | 0.3663 |
| 4 | 0004_grass_plane_inpainted.jpg | 0.7341 |
| 5 | 0005_grass_car_inpainted.jpg | 0.1018 |
| 6 | 0006_grass_book_inpainted.jpg | 0.5277 |
| 7 | 0007_grass_ronaldo_inpainted.jpg | 0.2085 |
| 8 | 0008_grass_mug_inpainted.jpg | 0.0466 |
| 9 | 0009_tablenwall_bench_inpainted.jpg | 0.7705 |
| 10 | 0010_tablenwall_tree_inpainted.jpg | 1.0000 |

