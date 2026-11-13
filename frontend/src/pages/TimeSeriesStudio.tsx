
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  CalendarDays,
  Droplets,
  Leaf,
  MapPin,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Info,
  BarChart3,
  LoaderCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

type VariableKey = "LST" | "NDVI" | "SM";
type RegionKey =
  | "Bangladesh"
  | "Indo-Gangetic Plain"
  | "Amazon Frontier";

type RecordData = Record<string, unknown>;

type ApiPayload = RecordData & {
  source?: string;
  region?: string;
  period?: string;
  analysis_status?: string;
  variable?: string;
  unit?: string;
  observation_count?: number;
  daily_records?: number;
  eligible_months?: number;
  excluded_months?: number;
  first_date?: string;
  last_date?: string;
  mean_value?: number;
  monthly_series?: RecordData[];
  observation_series?: RecordData[];
  annual_summary?: RecordData[];
  limitations?: string[];
};

type SeriesPoint = {
  date: string;
  value: number;
};

const API_BASE = "http://127.0.0.1:8000";

const regions: RegionKey[] = [
  "Bangladesh",
  "Indo-Gangetic Plain",
  "Amazon Frontier",
];

const variables = [
  {
    key: "LST" as VariableKey,
    name: "Land Surface Temperature",
    shortName: "LST",
    unit: "Â°C",
    color: "#fb923c",
    icon: Thermometer,
    description: "Surface thermal conditions",
  },
  {
    key: "NDVI" as VariableKey,
    name: "Vegetation Index",
    shortName: "NDVI",
    unit: "NDVI",
    color: "#4ade80",
    icon: Leaf,
    description: "Vegetation greenness",
  },
  {
    key: "SM" as VariableKey,
    name: "Surface Soil Moisture",
    shortName: "Soil Moisture",
    unit: "mÂ³/mÂ³",
    color: "#38bdf8",
    icon: Droplets,
    description: "Near-surface soil water",
  },
];

const endpointMap: Record<
  RegionKey,
  Partial<Record<VariableKey, string>>
> = {
  Bangladesh: {
    LST: "bangladesh-lst",
    SM: "bangladesh-sm",
  },
  "Indo-Gangetic Plain": {
    NDVI: "igp-ndvi",
    SM: "igp-sm",
  },
  "Amazon Frontier": {
    LST: "amazon-lst",
    NDVI: "amazon-ndvi",
    SM: "amazon-sm",
  },
};

function asObject(value: unknown): RecordData | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordData)
    : null;
}

function numeric(
  object: RecordData | null | undefined,
  keys: string[],
): number | null {
  if (!object) return null;

  for (const key of keys) {
    const value = object[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function firstObject(
  payload: ApiPayload,
  keys: string[],
): RecordData | null {
  for (const key of keys) {
    const result = asObject(payload[key]);
    if (result) return result;
  }
  return null;
}

function extractSeries(
  payload: ApiPayload,
  variable: VariableKey,
): SeriesPoint[] {
  let rows: RecordData[] = [];
  let dateKeys = ["month", "date", "Date"];
  let valueKeys: string[] = [];

  if (variable === "LST") {
    rows = Array.isArray(payload.monthly_series)
      ? payload.monthly_series
      : [];
    valueKeys = ["lst_celsius", "mean_celsius"];
  } else if (variable === "NDVI") {
    if (
      Array.isArray(payload.observation_series) &&
      payload.observation_series.length > 0
    ) {
      rows = payload.observation_series;
      dateKeys = ["date"];
      valueKeys = ["ndvi"];
    } else if (Array.isArray(payload.annual_summary)) {
      rows = payload.annual_summary;
      dateKeys = ["year"];
      valueKeys = ["weighted_mean_ndvi"];
    }
  } else if (variable === "SM") {
    rows = Array.isArray(payload.observation_series)
      ? payload.observation_series
      : [];
    dateKeys = ["date"];
    valueKeys = ["value"];
  }

  return rows
    .map((row) => {
      const dateValue = dateKeys
        .map((key) => row[key])
        .find((value) => value !== undefined && value !== null);

      const value = numeric(row, valueKeys);

      if (
        (typeof dateValue !== "string" && typeof dateValue !== "number") ||
        value === null
      ) {
        return null;
      }

      return {
        date: String(dateValue),
        value,
      };
    })
    .filter((point): point is SeriesPoint => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}


function getTrendMetrics(
  payload: ApiPayload,
  variable: VariableKey,
) {
  const isBangladeshLst =
    variable === "LST" && payload.region === "Bangladesh";

  const sen = firstObject(
    payload,
    isBangladeshLst
      ? ["coverage_filtered_sen"]
      : ["sen_trend"],
  );

  const kendall = firstObject(
    payload,
    isBangladeshLst
      ? ["season_adjusted_sensitivity"]
      : ["kendall_trend", "kendall_trend_test"],
  );

  const sensitivity = asObject(payload.season_adjusted_sensitivity);

  const slopeKeys: Record<VariableKey, string[]> = {
    LST: [
      "slope_celsius_per_year",
      "slope_per_year",
      "sen_slope_celsius_per_year",
      "sen_slope",
    ],
    NDVI: [
      "slope_ndvi_per_year",
      "sen_slope_ndvi_per_year",
      "sen_slope",
      "slope",
    ],
    SM: [
      "slope_m3_m3_per_year",
      "slope_per_year",
      "sen_slope_m3_m3_per_year",
      "sen_slope",
      "slope",
    ],
  };

  const slope =
    numeric(sen, slopeKeys[variable]) ??
    numeric(sensitivity, slopeKeys[variable]);

  const lower = numeric(sen, ["ci95_lower"]);
  const upper = numeric(sen, ["ci95_upper"]);

  const pValue = numeric(kendall, ["p_value"]);
  const tau = numeric(kendall, ["kendall_tau", "tau"]);

  return { slope, lower, upper, pValue, tau };
}

function formatSlope(value: number, variable: VariableKey) {
  if (variable === "LST") return `${value.toFixed(4)} Â°C/year`;
  if (variable === "NDVI") return `${value.toFixed(5)} NDVI/year`;
  return `${value.toFixed(5)} mÂ³/mÂ³/year`;
}

function formatValue(value: number, variable: VariableKey) {
  return value.toFixed(variable === "LST" ? 3 : 5);
}

function getDisplayPeriod(payload: ApiPayload | null) {
  if (!payload) return "Selected study period";

  if (typeof payload.period === "string") return payload.period;

  if (payload.first_date && payload.last_date) {
    return `${payload.first_date} to ${payload.last_date}`;
  }

  return "Period not reported";
}

export default function TimeSeriesStudio() {
  const [activeRegion, setActiveRegion] =
    useState<RegionKey>("Bangladesh");

  const [activeVariable, setActiveVariable] =
    useState<VariableKey>("LST");

  const [activePeriod, setActivePeriod] =
    useState<"5Y" | "10Y">("10Y");

  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedVariable =
    variables.find((item) => item.key === activeVariable) ?? variables[0];

  const endpoint = endpointMap[activeRegion][activeVariable];

  useEffect(() => {
    let cancelled = false;

    setPayload(null);
    setError("");

    if (!endpoint) {
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);

      try {
        const response = await fetch(
          `${API_BASE}/api/analysis/${endpoint}/trend`,
        );

        if (!response.ok) {
          throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const data = (await response.json()) as ApiPayload;

        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load NASA analysis data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const allSeries = useMemo(
    () => (payload ? extractSeries(payload, activeVariable) : []),
    [payload, activeVariable],
  );

  const series = useMemo(() => {
    if (activePeriod === "10Y" || allSeries.length === 0) {
      return allSeries;
    }

    const latestDate = allSeries[allSeries.length - 1].date;
    const cutoff = Number(latestDate.slice(0, 4)) - 5;

    return allSeries.filter(
      (point) => Number(point.date.slice(0, 4)) >= cutoff,
    );
  }, [allSeries, activePeriod]);

  const chart = useMemo(() => {
    const width = 900;
    const height = 320;
    const left = 72;
    const right = 25;
    const top = 25;
    const bottom = 48;

    if (series.length < 2) {
      return {
        width,
        height,
        left,
        right,
        top,
        bottom,
        lower: 0,
        upper: 1,
        path: "",
        x: (_index: number) => left,
        y: (_value: number) => height / 2,
      };
    }

    const values = series.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.12;

    const lower = minValue - padding;
    const upper = maxValue + padding;

    const x = (index: number) =>
      left +
      (index / (series.length - 1)) * (width - left - right);

    const y = (value: number) =>
      top +
      ((upper - value) / (upper - lower)) *
        (height - top - bottom);

    const path = series
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`,
      )
      .join(" ");

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      lower,
      upper,
      x,
      y,
      path,
    };
  }, [series]);

  const metrics = payload
    ? getTrendMetrics(payload, activeVariable)
    : null;

  const isBangladeshLst =
    activeRegion === "Bangladesh" && activeVariable === "LST";

  const isIgpNdvi =
    activeRegion === "Indo-Gangetic Plain" && activeVariable === "NDVI";

  const hasRealSeries = series.length >= 2;

  const recordCount =
    payload?.observation_count ??
    payload?.daily_records ??
    null;

  const pending = !endpoint;

  const meanValue = numeric(payload, ["mean_value"]);

  const chartSourceLabel = isBangladeshLst
    ? "Monthly area-statistics series"
    : isIgpNdvi
      ? "NDVI observation series"
      : "Backend observation series";

  return (
    <div className="page-content time-page">
      <div className="time-heading">
        <div>
          <p className="eyebrow">TEMPORAL ANALYSIS / EARTH OBSERVATIONS</p>
          <h1>Time Series Studio</h1>
          <p className="page-description">
            Explore NASA-derived environmental trend analysis across
            the selected study regions.
          </p>
        </div>

        <div className="time-heading-icon">
          <Activity size={25} />
        </div>
      </div>

      <div className="time-control-panel">
        <div className="time-control-group">
          <label>
            <MapPin size={15} />
            STUDY REGION
          </label>

          <div className="time-region-options">
            {regions.map((region) => (
              <button
                key={region}
                className={`time-region-button ${
                  activeRegion === region ? "active" : ""
                }`}
                onClick={() => setActiveRegion(region)}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <div className="time-control-group time-period-group">
          <label>
            <CalendarDays size={15} />
            DISPLAY PERIOD
          </label>

          <div className="time-period-options">
            <button
              className={activePeriod === "5Y" ? "active" : ""}
              onClick={() => setActivePeriod("5Y")}
            >
              5 Years
            </button>

            <button
              className={activePeriod === "10Y" ? "active" : ""}
              onClick={() => setActivePeriod("10Y")}
            >
              Full period
            </button>
          </div>
        </div>
      </div>

      <section className="time-variable-section">
        <div className="time-section-heading">
          <div>
            <p className="eyebrow">OBSERVATION VARIABLES</p>
            <h2>Select a variable to investigate</h2>
          </div>

          <span className="time-demo-tag">NASA DATA</span>
        </div>

        <div className="time-variable-grid">
          {variables.map((variable) => {
            const Icon = variable.icon;
            const isActive = activeVariable === variable.key;

            return (
              <button
                key={variable.key}
                className={`time-variable-card ${
                  isActive ? "active" : ""
                }`}
                onClick={() => setActiveVariable(variable.key)}
                style={
                  {
                    "--variable-color": variable.color,
                  } as CSSProperties
                }
              >
                <div className="time-variable-top">
                  <div className="time-variable-icon">
                    <Icon size={21} />
                  </div>

                  {isActive && <span className="time-selected-dot" />}
                </div>

                <span className="time-variable-short">
                  {variable.shortName}
                </span>

                <strong>{variable.name}</strong>

                <span className="time-variable-description">
                  {variable.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="time-chart-section">
        <div className="time-chart-heading">
          <div>
            <p className="eyebrow">TEMPORAL TREND</p>
            <h2>{selectedVariable.name}</h2>
            <p>
              {activeRegion} Â· {getDisplayPeriod(payload)}
            </p>
          </div>

          <div className="time-chart-unit">
            <span>MEASUREMENT UNIT</span>
            <strong>{selectedVariable.unit}</strong>
          </div>
        </div>

        {hasRealSeries && (
          <div className="time-chart-legend">
            <span
              className="time-legend-line"
              style={{ background: selectedVariable.color }}
            />
            <span>
              {selectedVariable.shortName} Â· {chartSourceLabel}
            </span>
          </div>
        )}

        {loading && (
          <div className="time-method-note">
            <LoaderCircle size={19} />
            <div>
              <strong>Loading NASA analysisâ€¦</strong>
              <p>Retrieving the selected region and variable.</p>
            </div>
          </div>
        )}

        {pending && (
          <div className="time-method-note">
            <AlertTriangle size={19} />
            <div>
              <strong>DATA_PENDING</strong>
              <p>
                No completed analysis endpoint is currently available
                for {activeRegion} â€” {activeVariable}. No synthetic
                observations are displayed.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="time-method-note">
            <AlertTriangle size={19} />
            <div>
              <strong>Unable to load analysis</strong>
              <p>
                {error}. Check that the FastAPI backend is running.
              </p>
            </div>
          </div>
        )}

        {!loading && !pending && !error && payload && hasRealSeries && (
          <div className="time-chart-scroll">
            <svg
              className="time-chart-svg"
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              role="img"
              aria-label={`${selectedVariable.name} NASA analysis time series`}
            >
              {[0, 1, 2, 3, 4].map((index) => {
                const yPosition =
                  chart.top +
                  (index / 4) *
                    (chart.height - chart.top - chart.bottom);

                const labelValue =
                  chart.upper -
                  (index / 4) * (chart.upper - chart.lower);

                return (
                  <g key={index}>
                    <line
                      x1={chart.left}
                      y1={yPosition}
                      x2={chart.width - chart.right}
                      y2={yPosition}
                      stroke="#293950"
                      strokeDasharray="4 5"
                    />

                    <text
                      x={chart.left - 10}
                      y={yPosition + 4}
                      fill="#8292a9"
                      fontSize="11"
                      textAnchor="end"
                    >
                      {formatValue(labelValue, activeVariable)}
                    </text>
                  </g>
                );
              })}

              <path
                d={chart.path}
                fill="none"
                stroke={selectedVariable.color}
                strokeWidth="2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {series.map((point, index) => (
                <g key={`${point.date}-${index}`}>
                  <circle
                    cx={chart.x(index)}
                    cy={chart.y(point.value)}
                    r={series.length > 100 ? 2.2 : 3.8}
                    fill={selectedVariable.color}
                    stroke="#111c2e"
                    strokeWidth="1.5"
                  />

                  {(
                    index === 0 ||
                    index === series.length - 1 ||
                    index % Math.ceil(series.length / 6) === 0
                  ) && (
                    <text
                      x={chart.x(index)}
                      y={chart.height - 13}
                      fill="#8292a9"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {point.date}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        )}

        {!loading && !pending && !error && payload && !hasRealSeries && (
          <div className="time-method-note">
            <Info size={19} />
            <div>
              <strong>
                Statistical summary available â€” time-series chart unavailable
              </strong>
              <p>
                The selected API returned statistical analysis records,
                but did not provide a date-value observation series.
                The record count is not treated as a monthly chart series.
                No chart points have been fabricated.
              </p>
            </div>
          </div>
        )}

        <div className="time-chart-footnote">
          <Info size={15} />
          <span>
            Charts use actual date-value observations supplied by the
            backend. Summary statistics are never substituted for
            time-series measurements.
          </span>
        </div>
      </section>

      <section className="time-metrics-section">
        <div className="time-section-heading">
          <div>
            <p className="eyebrow">STATISTICAL ANALYSIS</p>
            <h2>Trend indicators</h2>
          </div>
        </div>

        <div className="time-metrics-grid">
          <div className="time-metric-card">
            <span>Sen's slope</span>
            <strong>
              {metrics?.slope !== null && metrics?.slope !== undefined
                ? formatSlope(metrics.slope, activeVariable)
                : "Not reported"}
            </strong>
            <small>Estimated rate of change</small>
          </div>

          <div className="time-metric-card">
            <span>95% confidence interval</span>
            <strong>
              {metrics?.lower !== null &&
              metrics?.lower !== undefined &&
              metrics?.upper !== null &&
              metrics?.upper !== undefined
                ? `${metrics.lower.toFixed(5)} to ${metrics.upper.toFixed(5)}`
                : "Not reported"}
            </strong>
            <small>Interval for the reported Sen's slope</small>
          </div>

          <div className="time-metric-card">
            <span>Kendall p-value</span>
            <strong>
              {metrics?.pValue !== null && metrics?.pValue !== undefined
                ? metrics.pValue.toExponential(3)
                : "Not reported"}
            </strong>
            <small>
              {activeRegion === "Bangladesh" && activeVariable === "LST"
                ? "Season-adjusted sensitivity test"
                : "Backend-reported Kendall test"}
            </small>
          </div>

          <div className="time-metric-card">
            <span>
              {hasRealSeries ? "Chart observations" : "Area-stat records"}
            </span>
            <strong>
              {hasRealSeries
                ? series.length.toLocaleString()
                : recordCount !== null && recordCount !== undefined
                  ? recordCount.toLocaleString()
                  : "Not reported"}
            </strong>
            <small>
              {hasRealSeries
                ? "Actual date-value points plotted"
                : "Backend record count; not chart points"}
            </small>
          </div>
        </div>

        {meanValue !== null && (
          <div className="time-direction-panel">
            <Info size={20} />
            <div>
              <strong>Reported area-statistics mean</strong>
              <p>
                {meanValue.toFixed(5)} {payload?.unit ?? selectedVariable.unit}.
                This is a summary statistic, not a trend estimate.
              </p>
            </div>
          </div>
        )}

        {metrics?.tau !== null && metrics?.tau !== undefined && (
          <div className="time-direction-panel">
            <Activity size={20} />
            <div>
              <strong>Kendall rank correlation</strong>
              <p>
                Tau: {metrics.tau.toFixed(5)}. This indicates the
                direction and strength of the rank association.
              </p>
            </div>
          </div>
        )}

        {metrics?.slope !== null && metrics?.slope !== undefined && (
          <div className="time-direction-panel">
            {metrics.slope >= 0 ? (
              <TrendingUp size={21} />
            ) : (
              <TrendingDown size={21} />
            )}

            <div>
              <strong>
                {metrics.slope >= 0
                  ? "Positive estimated trend"
                  : "Negative estimated trend"}
              </strong>
              <p>
                The reported Sen's slope is{" "}
                {formatSlope(metrics.slope, activeVariable)}.
                This preliminary estimate does not establish causation.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="time-comparison-section">
        <div className="time-section-heading">
          <div>
            <p className="eyebrow">REGIONAL DATA COVERAGE</p>
            <h2>Available analysis endpoints</h2>
            <p>Endpoint availability for {activeRegion}</p>
          </div>

          <BarChart3 size={22} className="time-comparison-icon" />
        </div>

        <div className="time-comparison-grid">
          {variables.map((variable) => {
            const Icon = variable.icon;
            const available = Boolean(
              endpointMap[activeRegion][variable.key],
            );

            return (
              <div className="time-comparison-card" key={variable.key}>
                <div
                  className="time-comparison-icon"
                  style={{ color: variable.color }}
                >
                  <Icon size={19} />
                </div>

                <div className="time-comparison-info">
                  <strong>{variable.shortName}</strong>
                  <span>{variable.name}</span>
                </div>

                <div className="time-comparison-change">
                  {available ? "Available" : "DATA_PENDING"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="time-method-note">
        <ShieldCheck size={19} />

        <div>
          <strong>Scientific integrity and limitations</strong>

          <p>
            Source: {payload?.source ?? "NASA AppEEARS analysis endpoint"}.
            Analysis status: {payload?.analysis_status ?? "No result loaded"}.
            {payload?.eligible_months !== undefined &&
              ` Eligible months: ${payload.eligible_months}.`}
            {payload?.excluded_months !== undefined &&
              ` Excluded months: ${payload.excluded_months}.`}
            {" "}Results are preliminary. Area-level statistics are not
            equivalent to pixel-level QA-filtered analysis. Coverage
            filtering is not an official NASA QA rule. Autocorrelation-
            robust inference and pixel-level validation remain pending
            where specified by the backend.
          </p>

          {payload?.limitations &&
            Array.isArray(payload.limitations) &&
            payload.limitations.length > 0 && (
              <ul>
                {payload.limitations.map((limitation, index) => (
                  <li key={index}>{limitation}</li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
}

