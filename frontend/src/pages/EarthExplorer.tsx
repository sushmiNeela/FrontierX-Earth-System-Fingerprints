
import { useState } from "react";

import {
  Globe2,
  MapPin,
  Thermometer,
  Leaf,
  Droplets,
  Layers3,
  Satellite,
  Info,
  ArrowUpRight,
} from "lucide-react";

import EarthGlobe from "../components/common/EarthGlobe";

const regions = [
  {
    id: "01",
    name: "Bangladesh",
    location: "South Asia",
    description:
      "Regional environmental observations across Bangladesh.",
    coordinates: "20.5°N – 26.6°N",
    color: "green",
  },
  {
    id: "02",
    name: "Indo-Gangetic Plain",
    location: "South Asia",
    description:
      "Agricultural and environmental dynamics across the IGP.",
    coordinates: "IGP Analysis Region",
    color: "blue",
  },
  {
    id: "03",
    name: "Amazon Frontier",
    location: "South America",
    description:
      "Tropical forest and land-change observations.",
    coordinates: "Amazon Analysis Region",
    color: "orange",
  },
];

const layers = [
  {
    id: "LST",
    name: "Land Surface Temperature",
    description: "Surface thermal conditions",
    source: "MOD11A1 V061",
    unit: "Kelvin (K)",
    icon: Thermometer,
    color: "orange",
  },
  {
    id: "NDVI",
    name: "Vegetation Index",
    description: "Vegetation greenness and condition",
    source: "MOD13Q1 V061",
    unit: "Dimensionless",
    icon: Leaf,
    color: "green",
  },
  {
    id: "SM",
    name: "Soil Moisture",
    description: "Near-surface soil water conditions",
    source: "SPL3SMP_E",
    unit: "m³/m³",
    icon: Droplets,
    color: "blue",
  },
];

export default function EarthExplorer() {
  const [selectedRegion, setSelectedRegion] = useState("01");
  const [selectedLayer, setSelectedLayer] = useState("LST");

  const activeRegion =
    regions.find((region) => region.id === selectedRegion) ?? regions[0];

  const activeLayer =
    layers.find((layer) => layer.id === selectedLayer) ?? layers[0];

  return (
    <div className="page-content explorer-page">

      {/* HEADER */}
      <section className="explorer-hero">
        <div>
          <div className="overview-kicker">
            <span className="status-pulse" />
            NASA EARTH OBSERVATION EXPLORER
          </div>

          <h1>
            Explore the
            <br />
            <span className="gradient-heading">Living Earth.</span>
          </h1>

          <p>
            Navigate the planet, examine research regions and
            explore the environmental variables used in Earth
            System Fingerprints.
          </p>

          <div className="hero-tags">
            <span><Globe2 size={14} /> Interactive 3D Globe</span>
            <span><Satellite size={14} /> NASA Data Framework</span>
          </div>
        </div>

        <div className="hero-orbit-icon">
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <Globe2 size={76} strokeWidth={0.8} />
          <span className="orbit-dot" />
        </div>
      </section>

      {/* GLOBE */}
      <section className="globe-panel explorer-globe-panel">
        <div className="overview-section-header">
          <div>
            <div className="section-eyebrow">
              <span className="section-indicator" />
              GLOBAL SPATIAL EXPLORER
            </div>

            <h2>Planetary View</h2>

            <p>
              Navigate the 3D globe and locate the selected
              environmental study regions.
            </p>
          </div>

          <span className="section-count">
            <Globe2 size={12} /> 3 STUDY REGIONS
          </span>
        </div>

        <div className="explorer-globe-frame">
          <EarthGlobe />
        </div>

        <div className="globe-region-legend">
          <span><i className="legend-dot green" /> Bangladesh</span>
          <span><i className="legend-dot blue" /> Indo-Gangetic Plain</span>
          <span><i className="legend-dot orange" /> Amazon Frontier</span>
        </div>

        <p className="globe-note">
          Region markers are approximate visual locators,
          not validated research boundaries.
        </p>
      </section>

      {/* REGION SELECTION */}
      <section className="dashboard-section">
        <div className="overview-section-header">
          <div>
            <div className="section-eyebrow">
              <span className="section-indicator" />
              SPATIAL RESEARCH
            </div>

            <h2>Select a Study Region</h2>

            <p>
              Choose a region to inspect its research context.
            </p>
          </div>

          <span className="section-count">REGION SELECTOR</span>
        </div>

        <div className="region-grid">
          {regions.map((region) => (
            <button
              type="button"
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`region-card overview-region-card ${region.color} explorer-region-card ${
                selectedRegion === region.id ? "selected" : ""
              }`}
            >
              <div className="region-card-top">
                <span className="region-number">{region.id}</span>
                <ArrowUpRight size={18} />
              </div>

              <span className="region-subtitle">{region.location}</span>

              <h3>{region.name}</h3>

              <p>{region.description}</p>

              <div className="region-card-bottom">
                <span>{region.coordinates}</span>
                <span className="region-status">
                  {selectedRegion === region.id ? "SELECTED" : "VIEW REGION"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SELECTED REGION INFORMATION */}
      <section className="explorer-info-panel">
        <div className="explorer-info-icon">
          <MapPin size={22} />
        </div>

        <div className="explorer-info-content">
          <span>SELECTED RESEARCH REGION</span>
          <h2>{activeRegion.name}</h2>
          <p>{activeRegion.description}</p>
          <small>
            {activeRegion.coordinates} · {activeRegion.location}
          </small>
        </div>
      </section>

      {/* ENVIRONMENTAL LAYERS */}
      <section className="dashboard-section">
        <div className="overview-section-header">
          <div>
            <div className="section-eyebrow">
              <span className="section-indicator" />
              ENVIRONMENTAL DATA
            </div>

            <h2>Observation Variables</h2>

            <p>
              Select a variable to inspect its dataset information.
            </p>
          </div>

          <span className="section-count">03 DATA LAYERS</span>
        </div>

        <div className="variable-grid">
          {layers.map((layer) => {
            const LayerIcon = layer.icon;

            return (
              <button
                type="button"
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                className={`variable-card overview-variable-card ${layer.color} explorer-layer-card ${
                  selectedLayer === layer.id ? "selected" : ""
                }`}
              >
                <div className="variable-card-top">
                  <div className="variable-icon">
                    <LayerIcon size={21} />
                  </div>

                  <span className="variable-short">{layer.id}</span>
                </div>

                <h3>{layer.name}</h3>

                <p>{layer.description}</p>

                <div className="variable-card-bottom">
                  <span>{layer.source}</span>
                  <small>{layer.unit}</small>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* DATASET INFORMATION */}
      <section className="explorer-dataset-panel">
        <div className="explorer-dataset-heading">
          <div className="explorer-info-icon">
            <Layers3 size={21} />
          </div>

          <div>
            <span>SELECTED DATA LAYER</span>
            <h2>{activeLayer.name}</h2>
          </div>
        </div>

        <div className="explorer-dataset-details">
          <div>
            <span>VARIABLE</span>
            <strong>{activeLayer.id}</strong>
          </div>

          <div>
            <span>NASA PRODUCT</span>
            <strong>{activeLayer.source}</strong>
          </div>

          <div>
            <span>MEASUREMENT UNIT</span>
            <strong>{activeLayer.unit}</strong>
          </div>
        </div>

        <p className="globe-note">
          Dataset selection currently updates the information panel.
          Actual raster visualization and pixel-level values will be
          connected after the quality-controlled data processing pipeline.
        </p>
      </section>

      {/* SCIENTIFIC NOTICE */}
      <section className="integrity-panel">
        <div className="integrity-icon">
          <Info size={21} />
        </div>

        <div>
          <h2>Data & Spatial Integrity</h2>
          <p>
            The globe markers are approximate visual locators.
            Selecting a region or variable does not yet load
            validated satellite raster layers. Scientific maps
            and observations will be added after data processing,
            quality control and spatial alignment.
          </p>
        </div>

        <span className="development-label">DEVELOPMENT COMPLETE</span>
      </section>

    </div>
  );
}
