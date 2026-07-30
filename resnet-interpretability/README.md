This is my work for the recruitment task released in 2026 by the Precog research group.

The directory structure of the repo is as follows:
.
├── control/
│   ├── FashionMNIST/
│   └── MNIST/
├── data/
│   ├── FashionMNIST/
│   └── MNIST/
├── FashionMNIST/
│   ├── controlmodel.pth
│   ├── lazymodel.pth
│   ├── robustmodelv1.pth
│   ├── robustmodelv2.pth
│   ├── robustmodelv3.pth
│   └── robustmodelv4.pth
├── fashionmnist-lazyartist.ipynb
├── MNIST/
│   ├── controlmodel.pth
│   ├── lazymodel.pth
│   ├── robustmodelv1.pth
│   ├── robustmodelv2.pth
│   ├── robustmodelv3.pth
│   ├── robustmodelv4.pth
│   ├── sae_complete.pth
│   └── SAEweights.pth
├── mnist-lazyartist.ipynb
├── mnist-updated-tasks-2-and-6.ipynb 
└── README.md

The project code is stored in three .ipynb notebooks:-
* mnist-lazyartist.ipynb
* fashionmnist-lazyartist.ipynb
* mnist-updated-tasks-2-and-6.ipynb (refer to this notebook for the latest version of tasks 2 and 6 using the MNIST dataset)

The control and data folders store the datasets required (not pushed to Github, will be created on running the notebooks).
The MNIST and FashionMNIST folders in the root directory contain the stored models. These will not be pushed to Github, so it is recommended to run the notebooks so that these models are created and saved on your device.

The project can be run by selecting 'Run All' in the python notebooks.

Approach followed is detailed in the project report, which is also pushed here. This version on Github is the latest version of the project report!

Dependencies:-
* numpy
* matplotlib
* seaborn
* opencv-python
* torch
* torchvision
* scikit-learn
* tqdm
