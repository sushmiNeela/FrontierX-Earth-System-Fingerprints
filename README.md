
# Earth System Fingerprints
### Investigating Environmental Change Through NASA Earth Observation Data

**Earth System Fingerprints** is an interactive Earth observation platform designed to investigate how land surface temperature, vegetation activity, and soil moisture evolve across different geographical regions.

By integrating NASA satellite datasets with statistical trend analysis and geospatial visualization, the platform helps identify environmental patterns, compare regional changes, and explore the interconnected behavior of key Earth system variables.

---

## Overview

Environmental changes rarely occur in isolation. Rising land surface temperatures, changing vegetation conditions, and variations in soil moisture can occur simultaneously, creating complex environmental patterns that require more than single-variable analysis.

Earth System Fingerprints addresses this challenge by bringing multiple Earth observation variables into one analytical environment.

The platform focuses on three contrasting geographical regions:

- **Bangladesh** — A climate-sensitive region influenced by monsoon patterns, agricultural activity, and seasonal environmental variability.
- **Indo-Gangetic Plain** — A major agricultural region where land surface conditions and vegetation dynamics are important for understanding environmental change.
- **Amazon Frontier (BR-163)** — A region experiencing significant land-use and ecosystem changes, providing a contrasting environmental perspective.

Through a consistent analytical framework, the project investigates how these regions differ in their environmental trends and how multiple variables change over time.

## The Scientific Approach

Rather than examining each environmental variable independently, Earth System Fingerprints explores their combined behavior.

The analysis focuses on three essential indicators:

| Environmental Variable | NASA Dataset | What It Helps Investigate |
|---|---|---|
| Land Surface Temperature (LST) | MODIS MOD11A1 V061 | Changes in surface thermal conditions |
| Vegetation Index (NDVI) | MODIS MOD13Q1 V061 | Changes in vegetation activity and greenness |
| Soil Moisture | SMAP SPL3SMP_E V006 | Variations in surface soil moisture |

Together, these variables provide complementary perspectives on environmental conditions.

The project uses them to investigate regional environmental patterns—not to assume direct causal relationships between the variables.

## NASA Earth Observation Data

The platform integrates satellite-derived datasets from NASA Earth observation missions.

### 1. Land Surface Temperature (MODIS)

**Dataset:** MODIS/Terra Land Surface Temperature and Emissivity Daily L3 Global 1 km SIN Grid, Version 6.1 (MOD11A1 V061)

Used to investigate changes in land surface thermal conditions.

[Official NASA Dataset](https://doi.org/10.5067/MODIS/MOD11A1.061)

### 2. Vegetation Index (MODIS)

**Dataset:** MODIS/Terra Vegetation Indices 16-Day L3 Global 250 m SIN Grid, Version 6.1 (MOD13Q1 V061)

Used to examine vegetation activity and changes in surface greenness through NDVI.

[Official NASA Dataset](https://doi.org/10.5067/MODIS/MOD13Q1.061)

### 3. Soil Moisture (SMAP)

**Dataset:** SMAP L3 Radiometer Global Daily 9 km EASE-Grid Soil Moisture, Version 6 (SPL3SMP_E V006)

Used to investigate variations in surface soil moisture conditions.

[Official NASA Dataset](https://doi.org/10.5067/M20OXIZHY3RJ)

### Data Access and Processing

- [NASA Earthdata Search](https://search.earthdata.nasa.gov/)
- [NASA AppEEARS](https://appeears.earthdatacloud.nasa.gov/)
- [NASA Earthdata Documentation](https://www.earthdata.nasa.gov/)

Dataset acquisition and processing are designed around NASA's official Earth observation data services.

## How the Platform Works

Earth System Fingerprints follows a structured analytical workflow:

1. **Region Selection** — Select one of the three study regions for investigation.
2. **Variable Selection** — Choose LST, NDVI, or soil moisture.
3. **Data Acquisition** — Retrieve the relevant satellite observations through NASA data services.
4. **Data Processing** — Prepare the observations for temporal and spatial analysis, accounting for dataset-specific characteristics.
5. **Time-Series Analysis** — Explore how environmental variables change over the selected period.
6. **Trend Detection** — Apply statistical methods to identify long-term increasing or decreasing trends.
7. **Regional Comparison** — Compare environmental patterns across the selected geographical regions.
8. **Environmental Interpretation** — Examine the combined behavior of the variables to understand regional environmental fingerprints.

## Statistical Methodology

To distinguish long-term trends from short-term fluctuations, the project incorporates non-parametric statistical techniques.

### Sen's Slope Estimator

Estimates the magnitude and direction of a temporal trend. It provides a robust measure of how an environmental variable changes over time.

### Mann–Kendall Trend Test

Evaluates whether a statistically significant monotonic trend exists in a time series without requiring the data to follow a normal distribution.

### Uncertainty and Data Quality Assessment

Satellite observations may contain missing values, retrieval errors, and measurement uncertainty. The analytical workflow considers data quality and uncertainty when interpreting results.

**Important:** Statistical significance does not establish causation. Results must be interpreted in the context of temporal sampling, spatial resolution, seasonality, and dataset limitations.

## Platform Features

Earth System Fingerprints is organized into interconnected analytical modules.

### Overview
Provides a high-level introduction to the platform, study regions, environmental variables, and key analytical information.

### Earth Explorer
Offers a geographical interface for exploring the selected study regions and their environmental context.

### Investigations
Organizes regional and variable-based investigations into structured analytical workflows.

### Dataset Catalog
Presents information about the NASA datasets used in the project, including their sources and characteristics.

### Time Series Studio
Supports exploration of temporal environmental observations through time-series visualizations.

### Spatial Analysis
Provides a geographical perspective for examining the spatial distribution of environmental observations and patterns.

### Fingerprint Studio
Brings multiple environmental variables together to investigate their combined temporal behavior and regional environmental patterns.

### Regional Comparison
Enables comparative investigation of Bangladesh, the Indo-Gangetic Plain, and the Amazon Frontier.

## Technical Architecture

The project uses a modern web-based architecture with a Python backend for data access and processing.

### Frontend

- React
- TypeScript
- Vite
- Cesium
- Plotly
- Axios
- Lucide React

### Backend

- Python
- FastAPI
- Requests
- python-dotenv

### Data and Scientific Analysis

- NASA AppEEARS API
- NASA Earthdata services
- MODIS and SMAP satellite observations
- Time-series analysis
- Sen's Slope
- Mann–Kendall trend testing

### Architecture Overview

```text
        NASA Earth Observation Data
                    |
          NASA Earthdata / AppEEARS
                    |
                    v
          Python Backend (FastAPI)
                    |
          Data Access and Processing
                    |
                    v
             Analytical Layer
          /         |          \
        LST        NDVI      Soil Moisture
          \         |          /
                    |
          Statistical Analysis
          /                  \
     Sen's Slope         Mann–Kendall
          \                  /
                    |
                    v
          Frontend Visualization
                    |
          React + TypeScript
                    |
        Cesium + Plotly + Vite
                    |
                    v
          Earth System Fingerprints
```

## Why This Matters

Understanding environmental change requires examining more than isolated measurements.

Earth System Fingerprints provides a unified analytical perspective for investigating:

- Long-term changes in land surface temperature.
- Regional variations in vegetation activity.
- Changes in surface soil moisture.
- Differences in environmental trends across geographical regions.
- Combined patterns that may help guide further environmental research.

The platform is intended to support environmental exploration, comparative analysis, and evidence-based investigation using publicly available NASA Earth observation data.

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js and npm
- Python 3.10+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/sushmiNeela/FrotierX-Earth-System-Fingerprints.git

cd FrotierX-Earth-System-Fingerprints
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside the backend directory:

```env
APPEEARS_USERNAME=your_appeears_username
APPEEARS_PASSWORD=your_appeears_password
```

Replace the placeholder values with your own NASA AppEEARS credentials.

**Security:** Never commit your `.env` file or expose your NASA credentials in a public repository.

### 4. Configure the Data Directory

Configure the local data directory according to your environment.

Example:

```text
E:\EarthSystemFingerprintsData\raw\appeears
```

Update the corresponding backend configuration if your data directory is different.

### 5. Run the Backend

```bash
uvicorn main:app --reload
```

### 6. Run the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

*Note: Adjust directory names and startup commands if your repository structure differs.*

## Project Structure

```text
Earth-System-Fingerprints/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── data/
│   └── README.md
│
├── docs/
│
├── .gitignore
└── README.md
```

*The structure above represents the intended organization; update it to match the actual repository.*

## Team

**Team FrontierX**

A collaborative project developed for NASA Space Apps Challenge 2026.

## Challenge

**Be An Earth System Trend Detective!**

NASA Space Apps Challenge 2026

## Acknowledgments

We acknowledge NASA and its Earth observation missions for providing publicly accessible satellite datasets that support environmental research and scientific exploration.

We also acknowledge the NASA Earthdata and AppEEARS platforms for facilitating access to Earth science data.

---

<p align="center">
  <strong>Earth System Fingerprints</strong><br/>
  Exploring environmental change, one fingerprint at a time.
</p>
