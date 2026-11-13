
import { useState } from "react";

import {
  Activity,
  ArrowUpRight,
  Globe2,
  Layers3,
  Satellite,
  Thermometer,
  Leaf,
  Droplets,
  ShieldCheck,
  Orbit,
} from "lucide-react";

import EarthGlobe from "../components/common/EarthGlobe";
import EarthMoonSystem from "../components/common/EarthMoonSystem";

const regions = [
  {
    number: "01",
    name: "Bangladesh",
    subtitle: "South Asia",
    description: "A regional focus for land, vegetation and moisture dynamics.",
    coordinates: "20.5°N – 26.6°N",
    color: "green",
  },
  {
    number: "02",
    name: "Indo-Gangetic Plain",
    subtitle: "South Asia",
    description: "A major agricultural landscape for environmental trend analysis.",
    coordinates: "IGP Analysis Region",
    color: "blue",
  },
  {
    number: "03",
    name: "Amazon Frontier",
    subtitle: "South America",
    description: "A tropical forest frontier for land and vegetation change.",
    coordinates: "Amazon Analysis Region",
    color: "orange",
  },
];

const variables = [
  {
    short: "LST",
    name: "Land Surface Temperature",
    description: "Surface thermal conditions",
    unit: "Kelvin (K)",
    icon: Thermometer,
    color: "orange",
    source: "MODIS · MOD11A1",
  },
  {
    short: "NDVI",
    name: "Vegetation Index",
    description: "Vegetation greenness and condition",
    unit: "Dimensionless",
    icon: Leaf,
    color: "green",
    source: "MODIS · MOD13Q1",
  },
  {
    short: "SM",
    name: "Soil Moisture",
    description: "Near-surface soil water conditions",
    unit: "m³/m³",
    icon: Droplets,
    color: "blue",
    source: "SMAP · SPL3SMP",
  },
];

export default function Overview() {
  const [globeMode, setGlobeMode] = useState<"earth" | "moon">("earth");

  return (
    <div className="page-content overview-page">

      {/* PAGE INTRO */}
      <section className="overview-hero">
        <div>
          <div className="overview-kicker">
            <span className="status-pulse" />
            EARTH OBSERVATION · RESEARCH PLATFORM
          </div>

          <h1>
            Understand Earth's
            <br />
            <span className="gradient-heading">Environmental Fingerprints.</span>
          </h1>

          <p className="overview-intro">
            Explore contrasting environmental changes across
            multiple regions using NASA Earth observation data,
            statistical analysis and multi-variable fingerprints.
          </p>

          <div className="hero-tags">
            <span><Satellite size={14} /> NASA Earth Observations</span>
            <span><Activity size={14} /> Multi-variable Analysis</span>
          </div>
        </div>

        <div className="hero-orbit-icon">
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <Globe2 size={76} strokeWidth={0.8} />
          <span className="orbit-dot" />
        </div>
      </section>

      {/* TOP METRICS */}
      <section className="overview-metrics">
        <div className="overview-metric">
          <div className="metric-icon purple">
            <Globe2 size={19} />
          </div>
          <div>
            <span>Study Regions</span>
            <strong>03</strong>
            <small>Selected research areas</small>
          </div>
          <ArrowUpRight className="metric-arrow" size={17} />
        </div>

        <div className="overview-metric">
          <div className="metric-icon cyan">
            <Layers3 size={19} />
          </div>
          <div>
            <span>Core Variables</span>
            <strong>03</strong>
            <small>LST · NDVI · Soil Moisture</small>
          </div>
          <ArrowUpRight className="metric-arrow" size={17} />
        </div>

        <div className="overview-metric">
          <div className="metric-icon green">
            <Satellite size={19} />
          </div>
          <div>
            <span>Planned Data Sources</span>
            <strong>03</strong>
            <small>MODIS · SMAP</small>
          </div>
          <ArrowUpRight className="metric-arrow" size={17} />
        </div>

        <div className="overview-metric">
          <div className="metric-icon orange">
            <Activity size={19} />
          </div>
          <div>
            <span>Analysis Methods</span>
            <strong>02</strong>
            <small>Sen's slope · Mann–Kendall</small>
          </div>
          <ArrowUpRight className="metric-arrow" size={17} />
        </div>
      </section>

      {/* GLOBE EXPLORER */}
      <section className="globe-panel overview-globe-panel">

        <div className="overview-section-header">
          <div>
            <div className="section-eyebrow">
              <span className="section-indicator" />
              INTERACTIVE PLANETARY VIEW
            </div>
            <h2>
              {globeMode === "earth"
                ? "Explore Our Planet"
                : "Earth–Moon System"}
            </h2>
            <p>
              {globeMode === "earth"
                ? "Navigate Earth and explore the selected environmental study regions."
                : "Examine the relative scale and orbital relationship of Earth and Moon."}
            </p>
          </div>

          <div className="globe-mode-switch">
            <button
              className={globeMode === "earth" ? "mode-button active" : "mode-button"}
              onClick={() => setGlobeMode("earth")}
            >
              <Globe2 size={15} />
              Earth
            </button>

            <button
              className={globeMode === "moon" ? "mode-button active" : "mode-button"}
              onClick={() => setGlobeMode("moon")}
            >
              <Orbit size={15} />
              Earth–Moon
            </button>
          </div>
        </div>

        <div className="globe-visual-container">
          {globeMode === "earth" ? (
            <EarthGlobe />
          ) : (
            <EarthMoonSystem />
          )}
        </div>

        {globeMode === "earth" ? (
          <>
            <div className="globe-region-legend">
              <span>
                <i className="legend-dot green" />
                Bangladesh
              </span>
              <span>
                <i className="legend-dot blue" />
                Indo-Gangetic Plain
              </span>
              <span>
                <i className="legend-dot orange" />
                Amazon Frontier
              </span>
            </div>

            <p className="globe-note">
              Region markers are approximate visual locators,
              not validated research boundaries.
            </p>
          </>
        ) : (
          <p className="globe-note">
            Earth radius: 6,371 km · Moon radius: 1,737.4 km ·
            Mean separation: 384,400 km. Orbital motion is a
            simplified Keplerian approximation, not live JPL ephemeris.
          </p>
        )}
      </section>

      {/* STUDY REGIONS */}
      <section className="dashboard-section overview-dashboard-section">
        <div className="overview-section-header">
          <div>
            <div className="section-eyebrow">
              <span className="section-indicator" />
              RESEARCH GEOGRAPHY
            </div>
            <h2>Study Regions</h2>
            <p>Three contrasting environmental landscapes.</p>
          </div>

          <span className="section-count">03 REGIONS</span>
        </div>

        <div className="region-grid overview-region-grid">
          {regions.map((region) => (
            <article className={`region-card overview-region-card ${region.color}`} key={region.number}>
              <div className="region-card-top">
                <span className="region-number">{region.number}</span>
                <ArrowUpRight size={18} />
              </div>

              <span className="region-subtitle">{region.subtitle}</span>
              <h3>{region.name}</h3>
              <p>{region.description}</p>

              <div className="region-card-bottom">
                <span>{region.coordinates}</span>
                <span className="region-status">Study Region</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CORE VARIABLES */}
      <section className="dashboard-section overview-dashboard-section">
        <div className="overview-section-header">
          <div>
            <div className="section-eyebrow">
              <span className="section-indicator" />
              EARTH OBSERVATION DATA
            </div>
            <h2>Environmental Variables</h2>
            <p>Three complementary dimensions of environmental change.</p>
          </div>

          <span className="section-count">03 VARIABLES</span>
        </div>

        <div className="variable-grid overview-variable-grid">
          {variables.map((variable) => {
            const VariableIcon = variable.icon;

            return (
              <article className={`variable-card overview-variable-card ${variable.color}`} key={variable.short}>
                <div className="variable-card-top">
                  <div className="variable-icon">
                    <VariableIcon size={21} />
                  </div>
                  <span className="variable-short">{variable.short}</span>
                </div>

                <h3>{variable.name}</h3>
                <p>{variable.description}</p>

                <div className="variable-card-bottom">
                  <span>{variable.source}</span>
                  <small>{variable.unit}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ANALYTICAL FRAMEWORK */}
      <section className="analysis-framework">
        <div>
          <div className="section-eyebrow">
            <span className="section-indicator" />
            ANALYTICAL FRAMEWORK
          </div>
          <h2>From Earth Observations to Environmental Insights</h2>
          <p>
            Examine the direction, magnitude and statistical
            significance of environmental trends.
          </p>
        </div>

        <div className="analysis-methods">
          <div className="method-item">
            <Activity size={19} />
            <div>
              <strong>Sen's Slope</strong>
              <span>Trend magnitude and direction</span>
            </div>
          </div>

          <div className="method-item">
            <ShieldCheck size={19} />
            <div>
              <strong>Mann–Kendall</strong>
              <span>Statistical trend significance</span>
            </div>
          </div>
        </div>
      </section>

      {/* SCIENTIFIC INTEGRITY */}
      <section className="integrity-panel overview-integrity">
        <div className="integrity-icon">
          <ShieldCheck size={21} />
        </div>

        <div>
          <h2>Scientific Integrity & Data Status</h2>
          <p>
            This platform is under development. The regions and
            variables describe the planned research configuration.
            No environmental trend or statistical result is presented
            as validated until quality-controlled satellite observations
            and statistical analysis are completed.
          </p>
        </div>

        <span className="development-label">IN DEVELOPMENT</span>
      </section>

    </div>
  );
}
