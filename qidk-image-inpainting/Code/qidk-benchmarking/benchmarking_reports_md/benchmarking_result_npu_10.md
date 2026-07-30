# Benchmarking Report: benchmarking_result_npu_10


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 24.0480 |
| ssim | 0.8158 |
| lpips | 0.1855 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 21 | result_index_0021.png | 1.0000 |
| 61 | result_index_0061.png | 0.9030 |
| 67 | result_index_0067.png | 0.8603 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 56 | result_index_0056.png | 0.0060 |
| 76 | result_index_0076.png | 0.1440 |
| 55 | result_index_0055.png | 0.6909 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 29.7330 |
| masked_ssim | 0.7305 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 61 | result_index_0061.png | 0.9998 |
| 50 | result_index_0050.png | 0.9978 |
| 60 | result_index_0060.png | 0.9897 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 56 | result_index_0056.png | 0.0000 |
| 76 | result_index_0076.png | 0.2038 |
| 55 | result_index_0055.png | 0.2783 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 5.1627 |
| brisque | 39.7135 |
| piqe | 49.8212 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 69 | result_index_0069.png | 0.9177 |
| 76 | result_index_0076.png | 0.8800 |
| 67 | result_index_0067.png | 0.7826 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 21 | result_index_0021.png | 0.0000 |
| 61 | result_index_0061.png | 0.3639 |
| 60 | result_index_0060.png | 0.4288 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 21 | result_index_0021.png | 42.9600 |
| 61 | result_index_0061.png | 34.6600 |
| 67 | result_index_0067.png | 31.8100 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 56 | result_index_0056.png | 6.7000 |
| 76 | result_index_0076.png | 11.6100 |
| 55 | result_index_0055.png | 20.2300 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 21 | result_index_0021.png | 0.9933 |
| 61 | result_index_0061.png | 0.9849 |
| 67 | result_index_0067.png | 0.9678 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 56 | result_index_0056.png | 0.2334 |
| 76 | result_index_0076.png | 0.4040 |
| 69 | result_index_0069.png | 0.8891 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 21 | result_index_0021.png | 0.0089 |
| 61 | result_index_0061.png | 0.0126 |
| 67 | result_index_0067.png | 0.0210 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 76 | result_index_0076.png | 0.7421 |
| 56 | result_index_0056.png | 0.7200 |
| 69 | result_index_0069.png | 0.0897 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 61 | result_index_0061.png | 50.9700 |
| 50 | result_index_0050.png | 50.7800 |
| 60 | result_index_0060.png | 50.7200 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 56 | result_index_0056.png | 6.8700 |
| 76 | result_index_0076.png | 8.6400 |
| 55 | result_index_0055.png | 11.7800 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 50 | result_index_0050.png | 0.9991 |
| 61 | result_index_0061.png | 0.9988 |
| 21 | result_index_0021.png | 0.9950 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 56 | result_index_0056.png | 0.0714 |
| 76 | result_index_0076.png | 0.4123 |
| 55 | result_index_0055.png | 0.4845 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 69 | result_index_0069.png | 3.0794 |
| 76 | result_index_0076.png | 3.5793 |
| 67 | result_index_0067.png | 3.9035 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 21 | result_index_0021.png | 7.2115 |
| 61 | result_index_0061.png | 6.5516 |
| 60 | result_index_0060.png | 5.9541 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 69 | result_index_0069.png | 8.3301 |
| 76 | result_index_0076.png | 9.0012 |
| 67 | result_index_0067.png | 10.7524 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 21 | result_index_0021.png | 63.6028 |
| 60 | result_index_0060.png | 54.3500 |
| 55 | result_index_0055.png | 52.4830 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 56 | result_index_0056.png | 41.0694 |
| 60 | result_index_0060.png | 46.3730 |
| 53 | result_index_0053.png | 46.8368 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 21 | result_index_0021.png | 69.6914 |
| 67 | result_index_0067.png | 52.7704 |
| 61 | result_index_0061.png | 49.6842 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 21 | result_index_0021.png | 1.0000 |
| 50 | result_index_0050.png | 0.7138 |
| 53 | result_index_0053.png | 0.6939 |
| 55 | result_index_0055.png | 0.6909 |
| 56 | result_index_0056.png | 0.0060 |
| 60 | result_index_0060.png | 0.7733 |
| 61 | result_index_0061.png | 0.9030 |
| 67 | result_index_0067.png | 0.8603 |
| 69 | result_index_0069.png | 0.7124 |
| 76 | result_index_0076.png | 0.1440 |

