
import { useState } from "react";
import {
  FlaskConical,
  MapPin,
  Thermometer,
  Leaf,
  Droplets,
  TrendingUp,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  Clock3,
  Microscope,
} from "lucide-react";

const investigations = [
  {
    id: "01",
    name: "Bangladesh",
    subtitle: "South Asian delta environment",
    focus: "Land surface temperature, vegetation and soil moisture",
    status: "Study region",
    icon: MapPin,
  },
  {
    id: "02",
    name: "Indo-Gangetic Plain",
    subtitle: "Agricultural and environmental transition",
    focus: "Regional warming and vegetation dynamics",
    status: "Study region",
    icon: MapPin,
  },
  {
    id: "03",
    name: "Amazon Frontier",
    subtitle: "Tropical forest transition zone",
    focus: "Vegetation condition and surface moisture",
    status: "Study region",
    icon: MapPin,
  },
];

const variables = [
  {
    code: "LST",
    name: "Land Surface Temperature",
    product: "MODIS · MOD11A1 V061",
    unit: "Kelvin (K)",
    icon: Thermometer,
    description: "Monitor changes in Earth's land surface temperature.",
  },
  {
    code: "NDVI",
    name: "Vegetation Index",
    product: "MODIS · MOD13Q1 V061",
    unit: "Dimensionless",
    icon: Leaf,
    description: "Examine vegetation greenness and its temporal variation.",
  },
  {
    code: "SM",
    name: "Soil Moisture",
    product: "SMAP · SPL3SMP_E",
    unit: "m³/m³",
    icon: Droplets,
    description: "Explore changes in near-surface soil moisture.",
  },
];

const methods = [
  {
    name: "Sen's Slope",
    category: "Trend magnitude",
    description:
      "Estimate the magnitude and direction of a monotonic trend over time.",
    icon: TrendingUp,
  },
  {
    name: "Mann–Kendall Test",
    category: "Trend significance",
    description:
      "Evaluate whether an observed monotonic trend is statistically significant.",
    icon: Activity,
  },
  {
    name: "Quality Assessment",
    category: "Data reliability",
    description:
      "Inspect quality flags, missing observations and uncertainty before interpretation.",
    icon: ShieldCheck,
  },
];

export default function Investigations() {
  const [activeRegion, setActiveRegion] = useState("Bangladesh");
  const [activeVariable, setActiveVariable] = useState("LST");

  const selectedRegion = investigations.find(
    (region) => region.name === activeRegion
  );

  const selectedVariable = variables.find(
    (variable) => variable.code === activeVariable
  );

  return (
    <div className="page-content investigation-page">
      <section className="investigation-hero">
        <div>
          <div className="eyebrow">
            <FlaskConical size={14} />
            RESEARCH WORKSPACE
          </div>

          <h1>Investigations</h1>

          <p>
            Explore environmental changes through multi-variable Earth
            observation analysis and statistical investigation.
          </p>
        </div>

        <div className="investigation-hero-icon">
          <Microscope size={48} />
          <span>SCIENTIFIC WORKSPACE</span>
        </div>
      </section>

      <section className="investigation-metrics">
        <div className="investigation-metric">
          <span>STUDY REGIONS</span>
          <strong>03</strong>
          <small>Geographic investigation areas</small>
        </div>

        <div className="investigation-metric">
          <span>ENVIRONMENTAL VARIABLES</span>
          <strong>03</strong>
          <small>LST · NDVI · Soil Moisture</small>
        </div>

        <div className="investigation-metric">
          <span>STATISTICAL METHODS</span>
          <strong>03</strong>
          <small>Trend and quality assessment</small>
        </div>

        <div className="investigation-metric">
          <span>RESEARCH STATUS</span>
          <strong className="status-text">Prototype</strong>
          <small>Scientific validation pending</small>
        </div>
      </section>

      <section className="investigation-section">
        <div className="investigation-section-heading">
          <div>
            <span className="section-kicker">01 / GEOGRAPHIC SCOPE</span>
            <h2>Study regions</h2>
            <p>Select a region to inspect its research focus.</p>
          </div>
          <span className="section-count">03 REGIONS</span>
        </div>

        <div className="investigation-region-grid">
          {investigations.map((region) => {
            const Icon = region.icon;
            const selected = activeRegion === region.name;

            return (
              <button
                key={region.id}
                className={`investigation-region-card ${
                  selected ? "selected" : ""
                }`}
                onClick={() => setActiveRegion(region.name)}
              >
                <div className="investigation-card-top">
                  <span>{region.id}</span>
                  <Icon size={19} />
                </div>

                <h3>{region.name}</h3>
                <p>{region.subtitle}</p>

                <div className="investigation-card-bottom">
                  <span>{region.status}</span>
                  <ArrowUpRight size={16} />
                </div>
              </button>
            );
          })}
        </div>

        {selectedRegion && (
          <div className="investigation-detail-panel">
            <div className="detail-panel-icon">
              <MapPin size={21} />
            </div>
            <div>
              <span>SELECTED INVESTIGATION REGION</span>
              <h3>{selectedRegion.name}</h3>
              <p>{selectedRegion.focus}</p>
            </div>
            <span className="detail-status">Selected</span>
          </div>
        )}
      </section>

      <section className="investigation-section">
        <div className="investigation-section-heading">
          <div>
            <span className="section-kicker">02 / EARTH OBSERVATIONS</span>
            <h2>Environmental variables</h2>
            <p>Choose a variable to inspect its data source and measurement.</p>
          </div>
          <span className="section-count">03 VARIABLES</span>
        </div>

        <div className="investigation-variable-grid">
          {variables.map((variable) => {
            const Icon = variable.icon;
            const selected = activeVariable === variable.code;

            return (
              <button
                key={variable.code}
                className={`investigation-variable-card ${
                  selected ? "selected" : ""
                }`}
                onClick={() => setActiveVariable(variable.code)}
              >
                <div className="variable-icon">
                  <Icon size={21} />
                </div>
                <span className="variable-code">{variable.code}</span>
                <h3>{variable.name}</h3>
                <p>{variable.description}</p>
                <span className="variable-product">{variable.product}</span>
              </button>
            );
          })}
        </div>

        {selectedVariable && (
          <div className="investigation-detail-panel">
            <div className="detail-panel-icon">
              <LayersIcon />
            </div>
            <div>
              <span>SELECTED DATA VARIABLE</span>
              <h3>{selectedVariable.name}</h3>
              <p>
                {selectedVariable.product} · Measurement:{" "}
                {selectedVariable.unit}
              </p>
            </div>
            <span className="detail-status">{selectedVariable.code}</span>
          </div>
        )}
      </section>

      <section className="investigation-section">
        <div className="investigation-section-heading">
          <div>
            <span className="section-kicker">03 / ANALYTICAL FRAMEWORK</span>
            <h2>Statistical methods</h2>
            <p>Methods planned for environmental trend investigation.</p>
          </div>
          <span className="section-count">03 METHODS</span>
        </div>

        <div className="investigation-method-grid">
          {methods.map((method, index) => {
            const Icon = method.icon;

            return (
              <div className="investigation-method-card" key={method.name}>
                <div className="method-card-top">
                  <span>0{index + 1}</span>
                  <Icon size={21} />
                </div>
                <span className="method-category">{method.category}</span>
                <h3>{method.name}</h3>
                <p>{method.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="investigation-integrity">
        <div className="integrity-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <span>SCIENTIFIC INTEGRITY</span>
          <h3>Prototype research workspace</h3>
          <p>
            These regions, variables and analytical methods define the
            planned research workflow. Actual environmental findings,
            statistical significance and trend estimates will only be
            presented after processing NASA observations and completing
            quality assessment and statistical validation.
          </p>
        </div>
        <div className="integrity-status">
          <Clock3 size={15} />
          Validation pending
        </div>
      </section>
    </div>
  );
}

function LayersIcon() {
  return <TrendingUp size={21} />;
}
