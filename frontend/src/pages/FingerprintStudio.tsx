
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  CheckCircle2,
  CircleHelp,
  Compass,
  Droplets,
  Flame,
  Leaf,
  Layers3,
  Radar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
} from "lucide-react";

type RegionKey = "bangladesh" | "igp" | "amazon";
type VariableKey = "lst" | "ndvi" | "sm";

type JsonRecord = Record<string, unknown>;

type DatasetSpec = {
  key: string;
  region: RegionKey;
  variable: VariableKey;
  endpoint?: string;
  availability: "available" | "pending" | "processing";
  unavailableMessage?: string;
};

type DatasetResult = {
  state: "loading" | "success" | "error" | "unavailable";
  data?: JsonRecord;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const regions: Record<
  RegionKey,
  {
    name: string;
    short: string;
    zone: string;
    coordinates: string;
    description: string;
  }
> = {
  bangladesh: {
    name: "Bangladesh",
    short: "BD",
    zone: "South Asia",
    coordinates: "20.5°N–26.7°N · 88.0°E–92.7°E",
    description:
      "A densely cultivated delta landscape where thermal conditions, vegetation and soil-water availability can be examined together.",
  },
  igp: {
    name: "Indo-Gangetic Plain",
    short: "IGP",
    zone: "South Asia",
    coordinates: "21.5°N–31.5°N · 73.5°E–88.5°E",
    description:
      "A major agricultural region where land-surface temperature, vegetation dynamics and soil moisture provide complementary environmental evidence.",
  },
  amazon: {
    name: "Amazon Frontier",
    short: "AMZ",
    zone: "South America",
    coordinates: "5.0°S–15.0°S · 55.0°W–70.0°W",
    description:
      "A tropical forest frontier where changes in vegetation, thermal conditions and surface moisture can be investigated together.",
  },
};

const variables: Record<
  VariableKey,
  {
    name: string;
    short: string;
    unit: string;
    product: string;
    description: string;
    icon: typeof Flame;
    color: string;
  }
> = {
  lst: {
    name: "Land Surface Temperature",
    short: "LST",
    unit: "°C/year",
    product: "MODIS MOD11A1 V061",
    description: "Land-surface thermal trend",
    icon: Flame,
    color: "#f59e0b",
  },
  ndvi: {
    name: "Vegetation Index",
    short: "NDVI",
    unit: "NDVI/year",
    product: "MODIS MOD13Q1 V061",
    description: "Vegetation greenness trend",
    icon: Leaf,
    color: "#22c55e",
  },
  sm: {
    name: "Soil Moisture",
    short: "SM",
    unit: "m³/m³/year",
    product: "SMAP SPL3SMP_E V006",
    description: "Near-surface soil-moisture trend",
    icon: Droplets,
    color: "#38bdf8",
  },
};

const variableOrder: VariableKey[] = ["lst", "ndvi", "sm"];

const datasetSpecs: DatasetSpec[] = [
  {
    key: "bangladesh-lst",
    region: "bangladesh",
    variable: "lst",
    endpoint: "/api/analysis/bangladesh-lst/trend",
    availability: "available",
  },
  {
    key: "bangladesh-sm",
    region: "bangladesh",
    variable: "sm",
    endpoint: "/api/analysis/bangladesh-sm/trend",
    availability: "available",
  },
  {
    key: "igp-ndvi",
    region: "igp",
    variable: "ndvi",
    endpoint: "/api/analysis/igp-ndvi/trend",
    availability: "available",
  },
  {
    key: "igp-sm",
    region: "igp",
    variable: "sm",
    endpoint: "/api/analysis/igp-sm/trend",
    availability: "available",
  },
  {
    key: "amazon-lst",
    region: "amazon",
    variable: "lst",
    endpoint: "/api/analysis/amazon-lst/trend",
    availability: "available",
  },
  {
    key: "amazon-ndvi",
    region: "amazon",
    variable: "ndvi",
    endpoint: "/api/analysis/amazon-ndvi/trend",
    availability: "available",
  },
  {
    key: "amazon-sm",
    region: "amazon",
    variable: "sm",
    endpoint: "/api/analysis/amazon-sm/trend",
    availability: "available",
  },
];

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, source);
}

function findNumeric(
  source: unknown,
  acceptedKeys: string[],
  depth = 0,
): number | undefined {
  if (depth > 7 || !isRecord(source)) return undefined;

  for (const key of acceptedKeys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    if (isRecord(value)) {
      const result = findNumeric(value, acceptedKeys, depth + 1);
      if (result !== undefined) return result;
    }
  }

  return undefined;
}

function firstNumericPath(
  source: unknown,
  paths: string[],
): number | undefined {
  for (const path of paths) {
    const value = getPath(source, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function extractSlope(
  data: JsonRecord,
  variable: VariableKey,
): number | undefined {
  const unitPaths: Record<VariableKey, string[]> = {
    lst: [
      "season_adjusted_sensitivity.sen_slope_celsius_per_year",
      "coverage_filtered_sen.slope_celsius_per_year",
      "sen_trend.slope_celsius_per_year",
      "sen_trend.slope_per_year",
      "sen_trend.slope",
      "pixel_count_weighted_linear_slope_per_year",
    ],
    ndvi: [
      "sen_trend.slope_ndvi_per_year",
      "sen_trend.slope_per_year",
      "sen_trend.slope",
      "pixel_count_weighted_linear_slope_per_year",
    ],
    sm: [
      "sen_trend.slope_m3_m3_per_year",
      "sen_trend.slope_per_year",
      "sen_trend.slope",
      "pixel_count_weighted_linear_slope_per_year",
    ],
  };

  const direct = firstNumericPath(data, unitPaths[variable]);
  if (direct !== undefined) return direct;

  const sen = data.sen_trend;
  if (isRecord(sen)) {
    const nested = findNumeric(sen, [
      "slope_celsius_per_year",
      "slope_ndvi_per_year",
      "slope_m3_m3_per_year",
      "slope_per_year",
      "slope",
    ]);
    if (nested !== undefined) return nested;
  }

  const coverage = data.coverage_filtered_sen;
  if (isRecord(coverage)) {
    const nested = findNumeric(coverage, [
      "slope_celsius_per_year",
      "slope_per_year",
      "slope",
    ]);
    if (nested !== undefined) return nested;
  }

  return undefined;
}

function extractPValue(data: JsonRecord): number | undefined {
  const direct = firstNumericPath(data, [
    "kendall_trend_test.p_value",
    "kendall_trend_test.p",
    "kendall_trend.p_value",
    "kendall_trend.p",
    "season_adjusted_sensitivity.p_value",
    "season_adjusted_sensitivity.kendall_p_value",
  ]);

  if (direct !== undefined) return direct;

  const kendall =
    data.kendall_trend_test ?? data.kendall_trend;

  if (isRecord(kendall)) {
    return findNumeric(kendall, ["p_value", "p"]);
  }

  return undefined;
}

function extractObservationCount(data: JsonRecord): number | undefined {
  const value = firstNumericPath(data, [
    "observation_count",
    "daily_records",
    "record_count",
  ]);

  return value;
}

function extractPeriod(data: JsonRecord): string {
  if (typeof data.period === "string") return data.period;

  const start =
    typeof data.first_date === "string" ? data.first_date : undefined;

  const end =
    typeof data.last_date === "string" ? data.last_date : undefined;

  if (start && end) return `${start} — ${end}`;
  if (start) return `From ${start}`;
  return "Period not specified";
}

function extractAnalysisStatus(data: JsonRecord): string {
  return typeof data.analysis_status === "string"
    ? data.analysis_status.replaceAll("_", " ")
    : "Status not reported";
}

function formatNumber(value: number, digits = 5): string {
  if (Math.abs(value) !== 0 && Math.abs(value) < 0.0001) {
    return value.toExponential(3);
  }

  return value.toFixed(digits);
}

function formatPValue(value: number | undefined): string {
  if (value === undefined) return "Not reported";
  if (value < 0.000001) return value.toExponential(2);
  return value.toFixed(6);
}

function slopeDirection(value: number | undefined): string {
  if (value === undefined) return "Unavailable";
  if (value > 0) return "Increasing";
  if (value < 0) return "Decreasing";
  return "No directional change";
}

function TrendIcon({ value }: { value: number | undefined }) {
  if (value === undefined || value === 0) {
    return <Minus size={16} />;
  }

  return value > 0
    ? <TrendingUp size={16} />
    : <TrendingDown size={16} />;
}

function StatusLabel({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const isReady =
    normalized.includes("preliminary") ||
    normalized.includes("complete") ||
    normalized.includes("available");

  return (
    <span className={`fp-live-status ${isReady ? "ready" : "waiting"}`}>
      <span />
      {status}
    </span>
  );
}

export default function FingerprintStudio() {
  const [selectedRegion, setSelectedRegion] =
    useState<RegionKey>("bangladesh");

  const [activeVariable, setActiveVariable] =
    useState<VariableKey>("lst");

  const [comparisonMode, setComparisonMode] = useState(false);

  const [results, setResults] = useState<
    Record<string, DatasetResult>
  >({});

  const [refreshing, setRefreshing] = useState(false);

  const region = regions[selectedRegion];

  async function loadDatasets() {
    setRefreshing(true);

    const initial: Record<string, DatasetResult> = {};

    for (const spec of datasetSpecs) {
      initial[spec.key] =
        spec.availability === "available"
          ? { state: "loading" }
          : { state: "unavailable" };
    }

    setResults(initial);

    const requests = datasetSpecs
      .filter(
        (spec) =>
          spec.availability === "available" && spec.endpoint,
      )
      .map(async (spec) => {
        try {
          const response = await fetch(`${API_BASE}${spec.endpoint}`);

          if (!response.ok) {
            throw new Error(
              `Backend returned HTTP ${response.status}`,
            );
          }

          const json: unknown = await response.json();

          if (!isRecord(json)) {
            throw new Error("Unexpected statistics response format.");
          }

          return {
            key: spec.key,
            result: {
              state: "success" as const,
              data: json,
            },
          };
        } catch (error) {
          return {
            key: spec.key,
            result: {
              state: "error" as const,
              error:
                error instanceof Error
                  ? error.message
                  : "Unable to load statistics.",
            },
          };
        }
      });

    const loaded = await Promise.all(requests);

    setResults((previous) => {
      const next = { ...previous };

      for (const item of loaded) {
        next[item.key] = item.result;
      }

      return next;
    });

    setRefreshing(false);
  }

  useEffect(() => {
    void loadDatasets();
  }, []);

  const selectedSpec = datasetSpecs.find(
    (item) =>
      item.region === selectedRegion &&
      item.variable === activeVariable,
  );

  const selectedResult = selectedSpec
    ? results[selectedSpec.key]
    : undefined;

  const selectedData =
    selectedResult?.state === "success"
      ? selectedResult.data
      : undefined;

  const selectedSlope = selectedData
    ? extractSlope(selectedData, activeVariable)
    : undefined;

  const selectedPValue = selectedData
    ? extractPValue(selectedData)
    : undefined;

  const availableCount = useMemo(
    () =>
      Object.values(results).filter(
        (item) => item.state === "success",
      ).length,
    [results],
  );

  const regionResults = datasetSpecs.filter(
    (item) => item.region === selectedRegion,
  );

  const regionalDirections = regionResults
    .map((spec) => {
      const result = results[spec.key];
      const variable = variables[spec.variable];

      if (result?.state !== "success" || !result.data) {
        return `${variable.short}: data unavailable`;
      }

      const slope = extractSlope(result.data, spec.variable);

      return `${variable.short}: ${slopeDirection(slope).toLowerCase()}`;
    })
    .join(" · ");

  return (
    <main className="page-content fp-page">
      <style>{`
        .fp-live-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          max-width: 100%;
          font-size: 10px;
          line-height: 1.5;
          text-transform: uppercase;
          letter-spacing: .07em;
          color: #a8b6c9;
        }
        .fp-live-status > span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #94a3b8;
          flex: 0 0 auto;
        }
        .fp-live-status.ready > span { background: #34d399; }
        .fp-live-status.waiting > span { background: #fbbf24; }
        .fp-live-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 20px;
        }
        .fp-live-card {
          min-width: 0;
          padding: 19px;
          border: 1px solid rgba(148,163,184,.17);
          border-radius: 13px;
          background: rgba(15,23,42,.45);
        }
        .fp-live-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 17px;
        }
        .fp-live-card-head strong {
          font-size: 13px;
          color: #e2e8f0;
        }
        .fp-live-metric {
          margin: 9px 0 5px;
          font-size: clamp(19px, 2.5vw, 27px);
          font-weight: 700;
          color: #f8fafc;
          overflow-wrap: anywhere;
        }
        .fp-live-unit {
          color: #94a3b8;
          font-size: 11px;
        }
        .fp-live-detail {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-top: 10px;
          margin-top: 10px;
          border-top: 1px solid rgba(148,163,184,.13);
          font-size: 11px;
        }
        .fp-live-detail span { color: #94a3b8; }
        .fp-live-detail strong {
          text-align: right;
          color: #dbeafe;
          overflow-wrap: anywhere;
        }
        .fp-live-empty {
          padding: 20px;
          border: 1px dashed rgba(148,163,184,.25);
          border-radius: 12px;
          color: #a8b6c9;
          font-size: 13px;
          line-height: 1.7;
        }
        .fp-live-error { color: #fca5a5; }
        .fp-live-comparison {
          width: 100%;
          border-collapse: collapse;
          min-width: 570px;
        }
        .fp-live-comparison th,
        .fp-live-comparison td {
          padding: 13px 12px;
          text-align: left;
          border-bottom: 1px solid rgba(148,163,184,.13);
          font-size: 12px;
        }
        .fp-live-comparison th {
          color: #94a3b8;
          font-weight: 600;
        }
        .fp-live-comparison td { color: #dbeafe; }
        .fp-live-comparison small {
          display: block;
          margin-top: 4px;
          color: #94a3b8;
        }
        .fp-live-table-wrap { overflow-x: auto; }
        .fp-live-variable-button {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          text-align: left;
          cursor: pointer;
        }
        .fp-live-variable-button:focus-visible,
        .fp-region-card:focus-visible,
        .fp-compare-toggle:focus-visible {
          outline: 2px solid #43b9ff;
          outline-offset: 3px;
        }
        .fp-live-note {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 16px;
          padding: 13px 15px;
          border-radius: 10px;
          background: rgba(245,158,11,.07);
          color: #cbd5e1;
          font-size: 12px;
          line-height: 1.65;
        }
        .fp-live-note svg { flex: 0 0 auto; color: #fbbf24; }
        .fp-live-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .fp-live-refresh {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 13px;
          border: 1px solid rgba(148,163,184,.25);
          border-radius: 8px;
          color: #cbd5e1;
          background: rgba(15,23,42,.5);
          cursor: pointer;
        }
        .fp-live-refresh:disabled { opacity: .55; cursor: wait; }
        .fp-live-direction {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #cbd5e1;
        }
        @media (max-width: 900px) {
          .fp-live-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="fp-hero">
        <div className="fp-hero-copy">
          <div className="fp-eyebrow">
            <Sparkles size={14} />
            EARTH SYSTEM FINGERPRINTS / ANALYSIS LAB
          </div>

          <h1>
            Fingerprint
            <span> Studio</span>
          </h1>

          <p>
            Examine environmental fingerprints using reported NASA
            observation statistics across three contrasting study regions.
          </p>

          <div className="fp-hero-tags">
            <span><Activity size={13} /> Multi-variable evidence</span>
            <span><Radar size={13} /> Observed trend directions</span>
            <span><Compass size={13} /> Regional investigation</span>
          </div>
        </div>

        <div className="fp-hero-orbit" aria-hidden="true">
          <div className="fp-orbit fp-orbit-one" />
          <div className="fp-orbit fp-orbit-two" />
          <div className="fp-orbit-core">
            <Radar size={38} />
          </div>
          <span className="fp-orbit-label fp-orbit-label-one">LST</span>
          <span className="fp-orbit-label fp-orbit-label-two">NDVI</span>
          <span className="fp-orbit-label fp-orbit-label-three">SM</span>
        </div>
      </section>

      <section className="fp-control-row">
        <div>
          <div className="fp-section-kicker">01 / SELECT A STUDY REGION</div>
          <h2>Explore observed evidence</h2>
        </div>

        <div className="fp-live-heading-row">
          <button
            className={`fp-compare-toggle ${comparisonMode ? "active" : ""}`}
            onClick={() => setComparisonMode((current) => !current)}
          >
            <Layers3 size={16} />
            {comparisonMode ? "Hide comparison" : "Compare all regions"}
          </button>

          <button
            className="fp-live-refresh"
            onClick={() => void loadDatasets()}
            disabled={refreshing}
          >
            <RefreshCw size={14} />
            {refreshing ? "Loading..." : "Refresh data"}
          </button>
        </div>
      </section>

      <section className="fp-region-grid">
        {(Object.keys(regions) as RegionKey[]).map((key, index) => {
          const item = regions[key];

          return (
            <button
              key={key}
              className={`fp-region-card ${
                selectedRegion === key ? "selected" : ""
              }`}
              onClick={() => setSelectedRegion(key)}
            >
              <div className="fp-region-card-top">
                <span className="fp-region-number">0{index + 1}</span>
                {selectedRegion === key && (
                  <CheckCircle2 size={17} className="fp-selected-icon" />
                )}
              </div>

              <h3>{item.name}</h3>
              <p>{item.zone}</p>
              <span className="fp-region-coordinates">
                {item.coordinates}
              </span>
            </button>
          );
        })}
      </section>

      <section className="fp-main-grid">
        <div className="fp-panel fp-signature-panel">
          <div className="fp-panel-heading">
            <div>
              <div className="fp-section-kicker">
                02 / REGIONAL EVIDENCE PROFILE
              </div>
              <h2>{region.name}</h2>
            </div>

            <span className="fp-live-status ready">
              <span />
              LIVE BACKEND DATA
            </span>
          </div>

          <p className="fp-panel-subtitle">{region.description}</p>

          <div className="fp-live-grid">
            {variableOrder.map((key) => {
              const spec = datasetSpecs.find(
                (item) =>
                  item.region === selectedRegion &&
                  item.variable === key,
              );

              const result = spec ? results[spec.key] : undefined;
              const data =
                result?.state === "success" ? result.data : undefined;

              const slope = data ? extractSlope(data, key) : undefined;
              const pValue = data ? extractPValue(data) : undefined;
              const count = data ? extractObservationCount(data) : undefined;
              const meta = variables[key];
              const Icon = meta.icon;

              return (
                <div className="fp-live-card" key={key}>
                  <div className="fp-live-card-head">
                    <strong>
                      <span style={{ color: meta.color }}>
                        <Icon size={17} />
                      </span>{" "}
                      {meta.short}
                    </strong>

                    {result?.state === "success" && (
                      <StatusLabel
                        status={extractAnalysisStatus(data!)}
                      />
                    )}
                  </div>

                  {result?.state === "loading" && (
                    <div className="fp-live-empty">
                      Loading statistics from backend...
                    </div>
                  )}

                  {result?.state === "success" && data && (
                    <>
                      <div className="fp-live-direction">
                        <TrendIcon value={slope} />
                        {slopeDirection(slope)}
                      </div>

                      <div className="fp-live-metric">
                        {slope === undefined
                          ? "Not reported"
                          : formatNumber(slope)}
                      </div>

                      <div className="fp-live-unit">
                        {meta.unit} · Sen / reported trend estimate
                      </div>

                      <div className="fp-live-detail">
                        <span>Kendall p-value</span>
                        <strong>{formatPValue(pValue)}</strong>
                      </div>

                      <div className="fp-live-detail">
                        <span>Observations</span>
                        <strong>
                          {count === undefined
                            ? "Not reported"
                            : count.toLocaleString()}
                        </strong>
                      </div>

                      <div className="fp-live-detail">
                        <span>Period</span>
                        <strong>{extractPeriod(data)}</strong>
                      </div>
                    </>
                  )}

                  {result?.state === "unavailable" && (
                    <div className="fp-live-empty">
                      <AlertTriangle size={17} />
                      <p>
                        {spec?.unavailableMessage ??
                          "Dataset is not currently available."}
                      </p>
                      <small>
                        No synthetic values are displayed.
                      </small>
                    </div>
                  )}

                  {result?.state === "error" && (
                    <div className="fp-live-empty fp-live-error">
                      <AlertTriangle size={17} />
                      <p>Statistics could not be loaded.</p>
                      <small>{result.error}</small>
                    </div>
                  )}

                  {!result && (
                    <div className="fp-live-empty">
                      Waiting for backend response...
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="fp-live-note">
            <CircleHelp size={16} />
            <span>
              Trend estimates retain their original physical units.
              LST, NDVI and soil moisture have different units and must
              not be interpreted as directly comparable score magnitudes.
            </span>
          </div>
        </div>

        <div className="fp-panel fp-variable-panel">
          <div className="fp-section-kicker">
            03 / VARIABLE INVESTIGATION
          </div>

          <h2>Inspect a dataset</h2>

          <p className="fp-panel-subtitle">
            Select a variable to inspect its reported statistics and source.
          </p>

          <div className="fp-variable-list">
            {variableOrder.map((key) => {
              const item = variables[key];
              const Icon = item.icon;

              return (
                <button
                  key={key}
                  className={`fp-variable-item fp-live-variable-button ${
                    activeVariable === key ? "active" : ""
                  }`}
                  onClick={() => setActiveVariable(key)}
                >
                  <span
                    className="fp-variable-icon"
                    style={{ color: item.color }}
                  >
                    <Icon size={19} />
                  </span>

                  <span className="fp-variable-info">
                    <strong>{item.short}</strong>
                    <small>{item.name}</small>
                  </span>

                  <span className="fp-variable-arrow">
                    <ArrowDownRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="fp-active-variable">
            <div className="fp-active-variable-head">
              <span>SELECTED DATASET</span>
              <span>{variables[activeVariable].short}</span>
            </div>

            <h3>{variables[activeVariable].name}</h3>

            <p>{variables[activeVariable].description}.</p>

            <div className="fp-product-source">
              <span>NASA DATA PRODUCT</span>
              <strong>{variables[activeVariable].product}</strong>
              <small>Reported trend unit: {variables[activeVariable].unit}</small>
            </div>

            {selectedResult?.state === "success" && selectedData && (
              <>
                <div className="fp-signature-divider" />

                <div className="fp-dominant-signal">
                  <span>Reported trend estimate</span>
                  <strong>
                    {selectedSlope === undefined
                      ? "Unavailable"
                      : formatNumber(selectedSlope)}
                  </strong>
                </div>

                <div className="fp-dominant-signal">
                  <span>Kendall p-value</span>
                  <strong>{formatPValue(selectedPValue)}</strong>
                </div>

                <div className="fp-dominant-signal">
                  <span>Analysis status</span>
                  <strong>
                    {extractAnalysisStatus(selectedData)}
                  </strong>
                </div>
              </>
            )}

            {selectedResult?.state === "unavailable" && (
              <div className="fp-live-empty">
                {selectedSpec?.unavailableMessage}
              </div>
            )}

            {selectedResult?.state === "error" && (
              <div className="fp-live-empty fp-live-error">
                {selectedResult.error}
              </div>
            )}
          </div>
        </div>
      </section>

      {comparisonMode && (
        <section className="fp-panel fp-comparison-panel">
          <div className="fp-section-kicker">
            04 / CROSS-REGION COMPARISON
          </div>

          <h2>Compare reported trend estimates</h2>

          <p className="fp-panel-subtitle">
            Values are shown in their original units. Missing datasets
            remain explicitly unavailable.
          </p>

          <div className="fp-live-table-wrap">
            <table className="fp-live-comparison">
              <thead>
                <tr>
                  <th>Study region</th>
                  <th>LST (°C/year)</th>
                  <th>NDVI (/year)</th>
                  <th>Soil moisture (m³/m³/year)</th>
                </tr>
              </thead>

              <tbody>
                {(Object.keys(regions) as RegionKey[]).map((regionKey) => (
                  <tr key={regionKey}>
                    <td>
                      <strong>{regions[regionKey].name}</strong>
                      <small>{regions[regionKey].zone}</small>
                    </td>

                    {variableOrder.map((variable) => {
                      const spec = datasetSpecs.find(
                        (item) =>
                          item.region === regionKey &&
                          item.variable === variable,
                      );

                      const result = spec
                        ? results[spec.key]
                        : undefined;

                      const slope =
                        result?.state === "success" && result.data
                          ? extractSlope(result.data, variable)
                          : undefined;

                      return (
                        <td key={variable}>
                          {result?.state === "success" &&
                          slope !== undefined
                            ? formatNumber(slope)
                            : result?.state === "error"
                              ? "Load error"
                              : result?.state === "loading"
                                ? "Loading..."
                                : "Unavailable"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="fp-live-note">
            <CircleHelp size={16} />
            <span>
              A larger absolute slope does not automatically mean a
              stronger environmental impact. Different variables use
              different units, periods and data-processing methods.
              Cross-region interpretation requires harmonized coverage
              and quality control.
            </span>
          </div>
        </section>
      )}

      <section className="fp-panel fp-interpretation">
        <div className="fp-interpretation-icon">
          <Activity size={21} />
        </div>

        <div className="fp-interpretation-copy">
          <div className="fp-section-kicker">
            05 / OBSERVED REGIONAL DIRECTIONS
          </div>

          <h2>What do the available statistics show?</h2>

          <p>{regionalDirections}.</p>

          <p>
            These are descriptions of reported slope directions only.
            They do not establish causation, environmental impact or
            a single combined climate fingerprint.
          </p>
        </div>
      </section>

      <section className="fp-method-strip">
        <div className="fp-method-heading">
          <span className="fp-section-kicker">
            THE SCIENCE BEHIND THE FINGERPRINT
          </span>

          <h2>From observations to evidence</h2>

          <p>
            Statistics are retrieved from the project's NASA data
            processing backend.
          </p>
        </div>

        <div className="fp-method-steps">
          <div className="fp-method-step">
            <span>01</span>
            <Layers3 size={19} />
            <strong>NASA observations</strong>
            <small>MODIS LST · MODIS NDVI · SMAP soil moisture</small>
          </div>

          <ArrowDownRight className="fp-method-arrow" size={18} />

          <div className="fp-method-step">
            <span>02</span>
            <ShieldAlert size={19} />
            <strong>Quality assessment</strong>
            <small>QA flags · missing data · coverage limitations</small>
          </div>

          <ArrowDownRight className="fp-method-arrow" size={18} />

          <div className="fp-method-step">
            <span>03</span>
            <Activity size={19} />
            <strong>Trend statistics</strong>
            <small>Sen's slope · Mann–Kendall · reported p-values</small>
          </div>

          <ArrowDownRight className="fp-method-arrow" size={18} />

          <div className="fp-method-step">
            <span>04</span>
            <Radar size={19} />
            <strong>Fingerprint interpretation</strong>
            <small>Multi-variable evidence with uncertainty context</small>
          </div>
        </div>
      </section>

      <section className="fp-integrity">
        <ShieldAlert size={19} />

        <div>
          <strong>Scientific integrity and data coverage</strong>

          <p>
            This page displays statistics returned by the project's
            backend. Available results may still be preliminary and may
            have limitations involving pixel-level QA filtering,
            spatial coverage, temporal harmonization and
            autocorrelation. A reported p-value is not, by itself,
            proof of a robust environmental trend. Pending datasets
            are not replaced with invented values. Review each dataset's
            analysis status and limitations before drawing conclusions.
          </p>

          <p>
            {availableCount} of 7 available statistics endpoints
            successfully loaded in this session.
          </p>
        </div>
      </section>
    </main>
  );
}
