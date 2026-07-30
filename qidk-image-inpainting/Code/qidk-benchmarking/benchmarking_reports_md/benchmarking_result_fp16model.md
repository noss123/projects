# Benchmarking Report: benchmarking_result_fp16model


## Full-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| psnr | 13.8222 |
| ssim | 0.5389 |
| lpips | 0.4913 |


**Combined Full-Reference (formula):** $0.4\cdot \mathrm{norm}(\mathrm{PSNR}) + 0.4\cdot \mathrm{norm}(\mathrm{SSIM}) + 0.2\cdot \mathrm{norm\_inv}(\mathrm{LPIPS})$


Best Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 41 | inpainted_result_0041.png | 1.0000 |
| 58 | inpainted_result_0058.png | 0.9370 |
| 42 | inpainted_result_0042.png | 0.9269 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_FULLREF |
| --- | --- | --- |
| 31 | inpainted_result_0031.png | 0.0212 |
| 28 | inpainted_result_0028.png | 0.0222 |
| 30 | inpainted_result_0030.png | 0.0224 |


---


## Masked-Region Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| masked_psnr | 15.1949 |
| masked_ssim | 0.5298 |


**Combined Masked (formula):** $\mathrm{mean}(\mathrm{norm}(\text{Masked PSNR}),\ \mathrm{norm}(\text{Masked SSIM}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 50 | inpainted_result_0050.png | 1.0000 |
| 58 | inpainted_result_0058.png | 0.9959 |
| 1 | inpainted_result_0001.png | 0.9419 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_MASKED |
| --- | --- | --- |
| 44 | inpainted_result_0044.png | 0.0079 |
| 52 | inpainted_result_0052.png | 0.0308 |
| 56 | inpainted_result_0056.png | 0.0325 |


---


## No-Reference Metrics - Averages

| METRIC | AVERAGE |
| --- | --- |
| niqe | 6.5804 |
| brisque | 39.2073 |
| piqe | 42.2905 |


**Combined No-Reference (formula):** $\mathrm{mean}(\mathrm{norm\_inv}(\mathrm{NIQE}),\ \mathrm{norm\_inv}(\mathrm{BRISQUE}),\ \mathrm{norm\_inv}(\mathrm{PIQE}))$


Best Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 2 | inpainted_result_0002.png | 0.9541 |
| 72 | inpainted_result_0072.png | 0.9486 |
| 67 | inpainted_result_0067.png | 0.8939 |


Worst Combined:

| SERIAL | INP_FILE | COMBINED_NOREF |
| --- | --- | --- |
| 22 | inpainted_result_0022.png | 0.2775 |
| 25 | inpainted_result_0025.png | 0.3042 |
| 17 | inpainted_result_0017.png | 0.3376 |


---


## Top/Bottom Images per Metric

### Full-Reference

#### PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 41 | inpainted_result_0041.png | 39.5500 |
| 58 | inpainted_result_0058.png | 34.6600 |
| 42 | inpainted_result_0042.png | 33.7900 |


**Worst:**

| SERIAL | INP_FILE | PSNR |
| --- | --- | --- |
| 55 | inpainted_result_0055.png | 6.6100 |
| 53 | inpainted_result_0053.png | 6.6200 |
| 54 | inpainted_result_0054.png | 6.6500 |


#### SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 41 | inpainted_result_0041.png | 0.9899 |
| 42 | inpainted_result_0042.png | 0.9883 |
| 58 | inpainted_result_0058.png | 0.9849 |


**Worst:**

| SERIAL | INP_FILE | SSIM |
| --- | --- | --- |
| 34 | inpainted_result_0034.png | 0.1437 |
| 31 | inpainted_result_0031.png | 0.1675 |
| 30 | inpainted_result_0030.png | 0.1706 |


#### LPIPS (Lower is better)

**Best:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 41 | inpainted_result_0041.png | 0.0071 |
| 58 | inpainted_result_0058.png | 0.0126 |
| 42 | inpainted_result_0042.png | 0.0179 |


**Worst:**

| SERIAL | INP_FILE | LPIPS |
| --- | --- | --- |
| 28 | inpainted_result_0028.png | 0.8903 |
| 31 | inpainted_result_0031.png | 0.8896 |
| 30 | inpainted_result_0030.png | 0.8888 |


---


### Masked-Region

#### MASKED_PSNR (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 50 | inpainted_result_0050.png | 50.7800 |
| 58 | inpainted_result_0058.png | 50.6900 |
| 1 | inpainted_result_0001.png | 45.6800 |


**Worst:**

| SERIAL | INP_FILE | MASKED_PSNR |
| --- | --- | --- |
| 44 | inpainted_result_0044.png | 5.6100 |
| 32 | inpainted_result_0032.png | 6.1600 |
| 18 | inpainted_result_0018.png | 6.1700 |


#### MASKED_SSIM (Higher is better)

**Best:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 50 | inpainted_result_0050.png | 0.9991 |
| 1 | inpainted_result_0001.png | 0.9960 |
| 58 | inpainted_result_0058.png | 0.9933 |


**Worst:**

| SERIAL | INP_FILE | MASKED_SSIM |
| --- | --- | --- |
| 52 | inpainted_result_0052.png | 0.0546 |
| 53 | inpainted_result_0053.png | 0.0560 |
| 54 | inpainted_result_0054.png | 0.0635 |


---


### No-Reference

#### NIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 66 | inpainted_result_0066.png | 3.0794 |
| 30 | inpainted_result_0030.png | 3.1506 |
| 63 | inpainted_result_0063.png | 3.2500 |


**Worst:**

| SERIAL | INP_FILE | NIQE |
| --- | --- | --- |
| 25 | inpainted_result_0025.png | 24.0310 |
| 22 | inpainted_result_0022.png | 24.0207 |
| 17 | inpainted_result_0017.png | 22.9987 |


#### BRISQUE (Lower is better)

**Best:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 72 | inpainted_result_0072.png | 0.4418 |
| 2 | inpainted_result_0002.png | 0.4525 |
| 67 | inpainted_result_0067.png | 0.6622 |


**Worst:**

| SERIAL | INP_FILE | BRISQUE |
| --- | --- | --- |
| 19 | inpainted_result_0019.png | 93.1468 |
| 18 | inpainted_result_0018.png | 92.9713 |
| 20 | inpainted_result_0020.png | 91.6365 |


#### PIQE (Lower is better)

**Best:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 18 | inpainted_result_0018.png | 22.0438 |
| 21 | inpainted_result_0021.png | 22.7270 |
| 19 | inpainted_result_0019.png | 23.6165 |


**Worst:**

| SERIAL | INP_FILE | PIQE |
| --- | --- | --- |
| 11 | inpainted_result_0011.png | 70.3008 |
| 13 | inpainted_result_0013.png | 70.2139 |
| 73 | inpainted_result_0073.png | 70.1984 |


---


## Combined Metric (combined_ref_metric)

| SERIAL | INP_FILE | COMBINED_REF_METRIC |
| --- | --- | --- |
| 1 | inpainted_result_0001.png | 0.9077 |
| 2 | inpainted_result_0002.png | 0.2725 |
| 3 | inpainted_result_0003.png | 0.2733 |
| 4 | inpainted_result_0004.png | 0.2718 |
| 5 | inpainted_result_0005.png | 0.2731 |
| 6 | inpainted_result_0006.png | 0.2727 |
| 7 | inpainted_result_0007.png | 0.2723 |
| 8 | inpainted_result_0008.png | 0.2992 |
| 9 | inpainted_result_0009.png | 0.5807 |
| 10 | inpainted_result_0010.png | 0.5807 |
| 11 | inpainted_result_0011.png | 0.5810 |
| 12 | inpainted_result_0012.png | 0.2737 |
| 13 | inpainted_result_0013.png | 0.5810 |
| 14 | inpainted_result_0014.png | 0.5831 |
| 15 | inpainted_result_0015.png | 0.5818 |
| 16 | inpainted_result_0016.png | 0.5809 |
| 17 | inpainted_result_0017.png | 0.3789 |
| 18 | inpainted_result_0018.png | 0.3826 |
| 19 | inpainted_result_0019.png | 0.3841 |
| 20 | inpainted_result_0020.png | 0.3860 |
| 21 | inpainted_result_0021.png | 0.3821 |
| 22 | inpainted_result_0022.png | 0.3885 |
| 23 | inpainted_result_0023.png | 0.2997 |
| 24 | inpainted_result_0024.png | 0.3844 |
| 25 | inpainted_result_0025.png | 0.9200 |
| 26 | inpainted_result_0026.png | 0.0316 |
| 27 | inpainted_result_0027.png | 0.0300 |
| 28 | inpainted_result_0028.png | 0.0222 |
| 29 | inpainted_result_0029.png | 0.0231 |
| 30 | inpainted_result_0030.png | 0.0224 |
| 31 | inpainted_result_0031.png | 0.0212 |
| 32 | inpainted_result_0032.png | 0.0285 |
| 33 | inpainted_result_0033.png | 0.7772 |
| 34 | inpainted_result_0034.png | 0.0487 |
| 35 | inpainted_result_0035.png | 0.1149 |
| 36 | inpainted_result_0036.png | 0.1155 |
| 37 | inpainted_result_0037.png | 0.1153 |
| 38 | inpainted_result_0038.png | 0.1155 |
| 39 | inpainted_result_0039.png | 0.1152 |
| 40 | inpainted_result_0040.png | 0.1159 |
| 41 | inpainted_result_0041.png | 1.0000 |
| 42 | inpainted_result_0042.png | 0.9269 |
| 43 | inpainted_result_0043.png | 0.1564 |
| 44 | inpainted_result_0044.png | 0.1503 |
| 45 | inpainted_result_0045.png | 0.2441 |
| 46 | inpainted_result_0046.png | 0.1541 |
| 47 | inpainted_result_0047.png | 0.1545 |
| 48 | inpainted_result_0048.png | 0.1593 |
| 49 | inpainted_result_0049.png | 0.7200 |
| 50 | inpainted_result_0050.png | 0.7384 |
| 51 | inpainted_result_0051.png | 0.7154 |
| 52 | inpainted_result_0052.png | 0.0821 |
| 53 | inpainted_result_0053.png | 0.0811 |
| 54 | inpainted_result_0054.png | 0.0821 |
| 55 | inpainted_result_0055.png | 0.0816 |
| 56 | inpainted_result_0056.png | 0.0853 |
| 57 | inpainted_result_0057.png | 0.8001 |
| 58 | inpainted_result_0058.png | 0.9370 |
| 59 | inpainted_result_0059.png | 0.7680 |
| 60 | inpainted_result_0060.png | 0.7533 |
| 61 | inpainted_result_0061.png | 0.0602 |
| 62 | inpainted_result_0062.png | 0.0606 |
| 63 | inpainted_result_0063.png | 0.0601 |
| 64 | inpainted_result_0064.png | 0.0564 |
| 65 | inpainted_result_0065.png | 0.7425 |
| 66 | inpainted_result_0066.png | 0.7431 |
| 67 | inpainted_result_0067.png | 0.0824 |
| 68 | inpainted_result_0068.png | 0.8268 |
| 69 | inpainted_result_0069.png | 0.8107 |
| 70 | inpainted_result_0070.png | 0.1610 |
| 71 | inpainted_result_0071.png | 0.1545 |
| 72 | inpainted_result_0072.png | 0.1550 |
| 73 | inpainted_result_0073.png | 0.5916 |
| 74 | inpainted_result_0074.png | 0.1829 |
| 75 | inpainted_result_0075.png | 0.5133 |
| 76 | inpainted_result_0076.png | 0.3835 |
| 77 | inpainted_result_0077.png | 0.7765 |
| 78 | inpainted_result_0078.png | 0.5111 |

