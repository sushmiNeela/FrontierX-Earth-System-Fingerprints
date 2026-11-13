
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Droplets,
  Info,
  Layers3,
  Leaf,
  MapPin,
  Thermometer,
} from "lucide-react";
import EarthGlobe from "../components/common/EarthGlobe";

type VariableKey = "lst" | "ndvi" | "sm";
type RegionKey = "bangladesh" | "igp" | "amazon";

type Dataset = {
  region: RegionKey;
  variable: VariableKey;
  endpoint?: string;
  status: "available" | "processing" | "pending" | "unavailable";
  product: string;
  unit: string;
};

type ApiData = {
  source?: string;
  region?: string;
  variable?: string;
  unit?: string;
  analysis_status?: string;
  observation_count?: number;
  daily_records?: number;
  period?: string;
  first_date?: string;
  last_date?: string;
  total_pixel_observations?: number;
  median_pixels_per_observation?: number;
  mean_value?: number;
  sen_trend?: Record<string, unknown>;
  kendall_trend_test?: Record<string, unknown>;
  kendall_trend?: Record<string, unknown>;
  coverage_filtered_sen?: Record<string, unknown>;
  season_adjusted_sensitivity?: Record<string, unknown>;
  coverage_weighted_linear?: Record<string, unknown>;
  limitations?: string[];
  monthly_series?: unknown[];
  observation_series?: unknown[];
  annual_summary?: unknown[];
  error?: string;
};

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const regions: {
  id: RegionKey;
  name: string;
  description: string;
  coordinates: string;
}[] = [
  {
    id: "bangladesh",
    name: "Bangladesh",
    description: "South Asian delta region",
    coordinates: "20.5°N–26.7°N, 88.0°E–92.7°E",
  },
  {
    id: "igp",
    name: "Indo-Gangetic Plain",
    description: "Large-scale agricultural region",
    coordinates: "21.5°N–31.5°N, 73.5°E–88.5°E",
  },
  {
    id: "amazon",
    name: "Amazon Frontier",
    description: "Tropical forest study region",
    coordinates: "5.0°S–15.0°S, 55.0°W–70.0°W",
  },
];

const variables: {
  id: VariableKey;
  name: string;
  shortName: string;
  unit: string;
  product: string;
  icon: typeof Thermometer;
  color: string;
}[] = [
  {
    id: "lst",
    name: "Land Surface Temperature",
    shortName: "LST",
    unit: "°C",
    product: "MODIS MOD11A1 V061",
    icon: Thermometer,
    color: "#f97316",
  },
  {
    id: "ndvi",
    name: "Normalized Difference Vegetation Index",
    shortName: "NDVI",
    unit: "NDVI",
    product: "MODIS MOD13Q1 V061",
    icon: Leaf,
    color: "#22c55e",
  },
  {
    id: "sm",
    name: "Soil Moisture",
    shortName: "SM",
    unit: "m³/m³",
    product: "SMAP SPL3SMP_E V006",
    icon: Droplets,
    color: "#38bdf8",
  },
];

const datasets: Dataset[] = [
  {
    region: "bangladesh",
    variable: "lst",
    endpoint: "/api/analysis/bangladesh-lst/trend",
    status: "available",
    product: "MOD11A1 V061",
    unit: "°C",
  },
  {
    region: "bangladesh",
    variable: "sm",
    endpoint: "/api/analysis/bangladesh-sm/trend",
    status: "available",
    product: "SPL3SMP_E V006",
    unit: "m³/m³",
  },
  {
    region: "igp",
    variable: "ndvi",
    endpoint: "/api/analysis/igp-ndvi/trend",
    status: "available",
    product: "MOD13Q1 V061",
    unit: "NDVI",
  },
  {
    region: "igp",
    variable: "sm",
    endpoint: "/api/analysis/igp-sm/trend",
    status: "available",
    product: "SPL3SMP_E V006",
    unit: "m³/m³",
  },
  {
    region: "amazon",
    variable: "lst",
    endpoint: "/api/analysis/amazon-lst/trend",
    status: "available",
    product: "MOD11A1 V061",
    unit: "°C",
  },
  {
    region: "amazon",
    variable: "ndvi",
    endpoint: "/api/analysis/amazon-ndvi/trend",
    status: "available",
    product: "MOD13Q1 V061",
    unit: "NDVI",
  },
  {
    region: "amazon",
    variable: "sm",
    endpoint: "/api/analysis/amazon-sm/trend",
    status: "available",
    product: "SPL3SMP_E V006",
    unit: "m³/m³",
  },
];

const statusLabels = {
  available: "Statistics available",
  processing: "NASA task processing",
  pending: "NASA task pending",
  unavailable: "Data unavailable",
};

function formatNumber(value: unknown, digits = 4): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not available";
  }
  return value.toFixed(digits);
}

function getNumber(
  objects: (Record<string, unknown> | undefined)[],
  keys: string[],
): number | undefined {
  for (const object of objects) {
    if (!object) continue;
    for (const key of keys) {
      const value = object[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }
  }
  return undefined;
}

function getTrend(data: ApiData | null) {
  if (!data) return null;

  const sen = data.sen_trend;
  const season = data.season_adjusted_sensitivity;
  const coverage = data.coverage_filtered_sen;
  const kendall = data.kendall_trend_test ?? data.kendall_trend;

  const slope = getNumber(
    [season, sen, coverage],
    [
      "sen_slope_celsius_per_year",
      "slope_celsius_per_year",
      "slope_ndvi_per_year",
      "slope_m3_m3_per_year",
      "slope_per_year",
      "slope",
    ],
  );

  const p = getNumber([season, kendall], ["p_value", "p"]);

  return { slope, p };
}

function getPeriodBoundary(period: string | undefined, boundary: "start" | "end") {
  const match = period?.match(/^(\d{4})-(\d{4})$/);
  if (!match) return undefined;
  return boundary === "start" ? match[1] : match[2];
}

function statusColor(status: Dataset["status"]) {
  if (status === "available") return "#22c55e";
  if (status === "processing") return "#f59e0b";
  if (status === "pending") return "#60a5fa";
  return "#94a3b8";
}

export default function SpatialAnalysis() {
  const [activeRegion, setActiveRegion] =
    useState<RegionKey>("bangladesh");

  const [activeVariable, setActiveVariable] =
    useState<VariableKey>("lst");

  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const selectedRegion =
    regions.find((item) => item.id === activeRegion)!;

  const selectedVariable =
    variables.find((item) => item.id === activeVariable)!;

  const dataset = useMemo(
    () =>
      datasets.find(
        (item) =>
          item.region === activeRegion &&
          item.variable === activeVariable,
      )!,
    [activeRegion, activeVariable],
  );

  useEffect(() => {
    let cancelled = false;

    setData(null);
    setFetchError("");

    if (!dataset.endpoint) {
      setLoading(false);
      return;
    }

    setLoading(true);

    fetch(`${API}${dataset.endpoint}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Backend returned HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((result: ApiData) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFetchError(
          error instanceof Error
            ? error.message
            : "Could not retrieve backend data.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataset]);

  const trend = getTrend(data);
  const Icon = selectedVariable.icon;

  const isPreliminary =
    Boolean(data?.analysis_status) &&
    data!.analysis_status!.toUpperCase().includes("PRELIMINARY");

  return (
    <div className="page-content spatial-page">
      <div className="spatial-header">
        <div>
          <p className="eyebrow">GEOSPATIAL INTELLIGENCE</p>
          <h1>Spatial Analysis</h1>
          <p className="spatial-subtitle">
            Inspect available regional Earth observation statistics
            and identify spatial-data requirements.
          </p>
        </div>

        <div className="spatial-status">
          <span
            className="spatial-status-dot"
            style={{ background: statusColor(dataset.status) }}
          />
          {statusLabels[dataset.status]}
        </div>
      </div>

      <section className="spatial-overview">
        <div className="spatial-overview-icon">
          <Layers3 size={23} />
        </div>
        <div>
          <h3>Spatial Data Workspace</h3>
          <p>
            Regional statistics are retrieved from the project backend.
            A georeferenced raster map is displayed only when validated
            spatial raster data is available.
          </p>
        </div>
      </section>

      <section className="spatial-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / GEOGRAPHIC SELECTION</p>
            <h2>Study Region</h2>
          </div>
          <span className="spatial-section-note">
            <MapPin size={14} /> 3 study regions
          </span>
        </div>

        <div className="spatial-region-grid">
          {regions.map((region, index) => (
            <button
              type="button"
              key={region.id}
              className={`spatial-region-card ${
                activeRegion === region.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveRegion(region.id);
                const available = datasets.filter(
                  (item) => item.region === region.id && item.endpoint,
                );
                if (!available.some((item) => item.variable === activeVariable)) {
                  setActiveVariable(available[0].variable);
                }
              }}
            >
              <span className="spatial-region-number">
                REGION 0{index + 1}
              </span>
              <strong>{region.name}</strong>
              <span>{region.description}</span>
              <span className="spatial-region-coordinate">
                {region.coordinates}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="spatial-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 / VARIABLE CONFIGURATION</p>
            <h2>Observation Layer</h2>
          </div>
        </div>

        <div className="spatial-variable-grid">
          {variables.filter((variable) => datasets.some((item) => item.region === activeRegion && item.variable === variable.id && Boolean(item.endpoint))).map((variable) => {
            const VariableIcon = variable.icon;

            return (
              <button
                type="button"
                key={variable.id}
                className={`spatial-variable-card ${
                  activeVariable === variable.id ? "active" : ""
                }`}
                onClick={() => setActiveVariable(variable.id)}
              >
                <span
                  className="spatial-variable-icon"
                  style={{ color: variable.color }}
                >
                  <VariableIcon size={21} />
                </span>
                <span className="spatial-variable-name">
                  {variable.shortName}
                </span>
                <span className="spatial-variable-description">
                  {variable.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="spatial-map-section">
        <div className="spatial-map-heading">
          <div>
            <p className="eyebrow">03 / DATA AVAILABILITY</p>
            <h2>
              {selectedRegion.name} · {selectedVariable.shortName}
            </h2>
            <p>{selectedVariable.product}</p>
          </div>
        </div>

        <div className="spatial-map-layout">
          <div className="spatial-map-visual spatial-globe-visual">
            <div className="spatial-map-topline">
              <span>
                <span className="spatial-live-dot" />
                STUDY REGION VIEW
              </span>
              <span>{selectedRegion.name.toUpperCase()}</span>
            </div>

            <div className="spatial-globe-frame">
              <EarthGlobe
         focusRegion={activeRegion}
         onRegionSelect={setActiveRegion}
       />
            </div>

            <div className="spatial-map-footer">
              <span>{selectedRegion.coordinates}</span>
              <span>Satellite basemap · Approximate region locator</span>
            </div>
          </div>
          <aside className="spatial-map-sidebar">
            <div className="spatial-layer-info">
              <span className="spatial-layer-icon">
                <Icon size={22} />
              </span>
              <div>
                <span>ACTIVE VARIABLE</span>
                <strong>{selectedVariable.shortName}</strong>
              </div>
            </div>

            <div className="spatial-layer-detail">
              <span>Product</span>
              <strong>{selectedVariable.product}</strong>
            </div>

            <div className="spatial-layer-detail">
              <span>Unit</span>
              <strong>{dataset.unit}</strong>
            </div>

            <div className="spatial-layer-detail">
              <span>Study region</span>
              <strong>{selectedRegion.name}</strong>
            </div>

            <div className="spatial-layer-detail">
              <span>Data status</span>
              <strong style={{ color: statusColor(dataset.status) }}>
                {statusLabels[dataset.status]}
              </strong>
            </div>

            <div className="spatial-layer-detail">
              <span>Source</span>
              <strong>{data?.source ?? "NASA product"}</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="spatial-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">04 / REGIONAL SUMMARY</p>
            <h2>Available Statistics</h2>
          </div>
          {isPreliminary && (
            <span className="spatial-demo-label">
              Preliminary analysis
            </span>
          )}
        </div>

        {loading ? (
          <p>Loading verified backend statistics…</p>
        ) : fetchError ? (
          <p>Statistics unavailable: {fetchError}</p>
        ) : data ? (
          <>
            <div className="spatial-stat-grid">
              <div className="spatial-stat-card">
                <span>Observation records</span>
                <strong>
                  {(data.observation_count ?? data.daily_records)?.toLocaleString() ?? "—"}
                </strong>
                <div className="spatial-stat-foot">
                  <Activity size={14} /> Backend records
                </div>
              </div>

              <div className="spatial-stat-card">
                <span>First observation</span>
                <strong>{data.first_date ?? getPeriodBoundary(data.period, "start") ?? "—"}</strong>
                <div className="spatial-stat-foot">
                  Temporal coverage
                </div>
              </div>

              <div className="spatial-stat-card">
                <span>Last observation</span>
                <strong>{data.last_date ?? getPeriodBoundary(data.period, "end") ?? "—"}</strong>
                <div className="spatial-stat-foot">
                  Temporal coverage
                </div>
              </div>

              <div className="spatial-stat-card">
                <span>Mean value</span>
                <strong>
                  {formatNumber(data.mean_value)}
                </strong>
                <div className="spatial-stat-foot">
                  {data.unit ?? dataset.unit}
                </div>
              </div>
            </div>

            <div className="spatial-stat-grid" style={{ marginTop: 14 }}>
              <div className="spatial-stat-card">
                <span>Sen slope</span>
                <strong>
                  {formatNumber(trend?.slope)}
                </strong>
                <div className="spatial-stat-foot">
                  {dataset.unit} per year
                </div>
              </div>

              <div className="spatial-stat-card">
                <span>Kendall p-value</span>
                <strong>
                  {formatNumber(trend?.p, 6)}
                </strong>
                <div className="spatial-stat-foot">
                  Statistical test
                </div>
              </div>

              <div className="spatial-stat-card">
                <span>Pixel observations</span>
                <strong>
                  {data.total_pixel_observations?.toLocaleString() ?? "—"}
                </strong>
                <div className="spatial-stat-foot">
                  Aggregated pixel records
                </div>
              </div>

              <div className="spatial-stat-card">
                <span>Analysis status</span>
                <strong style={{ fontSize: 13 }}>
                  {data.analysis_status ?? "Not specified"}
                </strong>
                <div className="spatial-stat-foot">
                  Backend metadata
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="spatial-integrity">
            <Info size={20} />
            <div>
              <strong>No statistics available</strong>
              <p>
                The selected region-variable combination has no
                completed statistics endpoint yet.
              </p>
            </div>
          </div>
        )}
      </section>

      {data?.limitations && data.limitations.length > 0 && (
        <section className="spatial-integrity">
          <div className="spatial-integrity-icon">
            <Info size={20} />
          </div>
          <div>
            <strong>Backend-reported limitations</strong>
            <ul>
              {data.limitations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="spatial-integrity">
        <div className="spatial-integrity-icon">
          <Info size={20} />
        </div>
        <div>
          <strong>Scientific Integrity Notice</strong>
          <p>
            Statistics displayed here are retrieved from the project's
            backend. Preliminary area-level statistics are not equivalent
            to pixel-level quality-controlled spatial analysis. A
            georeferenced raster, quality masks, coordinate reference
            validation and regional masking are required before presenting
            spatial distributions. Missing data are not interpreted as
            zero or as evidence of environmental change.
          </p>
        </div>
      </section>
    </div>
  );
}


