# 🛰️ IITBH UAV Flood Survivor Prediction

A project by **IIT Bhilai** to develop an unmanned aerial vehicle (UAV)-based intelligent system that predicts and identifies flood survivors using aerial imagery and machine learning.

---

## 📖 Overview

In flood disasters, time is critical — locating survivors quickly can save lives.  
This project integrates **UAV-based imaging**, **flood prediction models**, and **machine learning** techniques to identify possible survivor locations and assess flood severity zones.

This repository combines two research modules developed at **IIT Bhilai** —  
1. **Flood_Prediction** → Satellite image–based flood forecasting  
2. **IITBH_UAV** → UAV-based survivor detection and LoRa communication  


---

## 🧩 Key Features

- 🚁 **UAV-based Data Collection** — Autonomous or semi-autonomous path planning for flood-zone imaging.  
- 🌊 **Flood Prediction Module** — Machine-learning model predicts flood severity using environmental data.  
- 🧠 **Survivor Classification** — Image-processing and classification algorithms identify survivor-likely areas.  
- 🗺️ **Geospatial Visualization** — Generates survivor-risk heatmaps for efficient rescue planning.  
- 📦 **Modular Design** — Independent modules for UAV control, flood modeling, and data analytics.

---

## 📂 Repository Structure
```
IITBH_UAV_Flood_Survivor_Prediction-
│
├── Flood_Prediction/ # Flood modeling and risk prediction
│ ├── data/ # Datasets or sample inputs
│ ├── model_notebooks/ # Jupyter notebooks for flood prediction
│ └── scripts/ # Python scripts for model training/testing
│
├── IITBH_UAV/ # UAV and image-processing module
│ ├── path_planning/ # UAV route generation algorithms
│ ├── image_processing/ # Aerial image analysis and segmentation
│ └── detection_models/ # ML models for survivor detection
│
├── requirements.txt # Required dependencies
├── LICENSE # (Add if you use one)
└── README.md # Project documentatio
```

---

## 🌊 Module 1: Flood_Prediction

### 📖 Overview
This module predicts **future flood occurrences** using historical **satellite imagery** and **flood-extent data**.  
The system analyzes sequential images of the same region across different dates to learn water-body growth patterns, enabling early-warning prediction for future dates.

### 🧠 Core Idea
- Uses **temporal satellite image sequences** to identify water-spread progression.  
- Extracts features from multi-date images to train ML models.  
- Predicts whether a flood will occur in a target region on a **future date**.  
- Outputs maps showing predicted flooded vs non-flooded zones.

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Tysondgn/IITBH_UAV_Flood_Survivor_Prediction-.git
cd IITBH_UAV_Flood_Survivor_Prediction-
cd Flood_Prediction
```
### 2️⃣ Create a virtual environment
```bash
python -m venv venv
```
### 3️⃣Activate virtual enviorment
```bash
venv\Scripts\activate  # for Windows
# or
source venv/bin/activate  # for Linux/macOS
```
### 4️⃣ Install dependencies
```bash
pip install numpy pandas matplotlib seaborn scikit-learn opencv-python tensorflow keras rasterio geopandas
```

### 5️⃣ Run the Jupyter notebooks or scripts
```bash
jupyter notebook Flood_Prediction.ipynb
```

## 🚁 Module 2: IITBH_UAV — UAV Survivor Detection & Communication
### 📖 Overview

This system deploys a **UAV** to search for survivors in post-flood environments using onboard camera and **sensors**.
Captured imagery is processed to identify **survivor-likely regions**, and information is relayed to a **base station using LoRa communication**.

### 🧩 Submodules

- Path Planning: Generates optimal flight routes for area coverage.

- Image Processing: Detects human shapes or movement patterns in aerial footage.

- LoRa Communication: Sends detection results (coordinates or alerts) to a ground base.

⚙️ Setup & Execution
---
1️⃣ Navigate to folder
```bash
cd IITBH_UAV
```
2️⃣ Install dependencies
```bash
pip install numpy pandas opencv-python matplotlib scikit-learn pillow pyserial

```
### 🧾 Requirements Summary

| Dependency              | Used In          | Purpose                         |
| ----------------------- | ---------------- | ------------------------------- |
| `opencv-python`         | Both             | Image preprocessing & detection |
| `scikit-learn`          | Both             | ML model training               |
| `geopandas`, `rasterio` | Flood_Prediction | Geospatial image handling       |
| `pyserial`              | IITBH_UAV        | LoRa communication              |
| `tensorflow/keras`      | Flood_Prediction | Deep-learning model training    |



Path Planning Code
https://github.com/gowrysailajav/learn_as_you_go
