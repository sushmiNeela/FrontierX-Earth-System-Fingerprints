
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  GitCompareArrows,
  Layers3,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";

type RegionKey = "bangladesh" | "igp" | "amazon";
type VariableKey = "lst" | "ndvi" | "sm";

const regions: { id: RegionKey; name: string; subtitle: string }[] = [
  {
    id: "bangladesh",
    name: "Bangladesh",
    subtitle: "South Asian delta region",
  },
  {
    id: "igp",
    name: "Indo-Gangetic Plain",
    subtitle: "Intensively cultivated alluvial plain",
  },
  {
    id: "amazon",
    name: "Amazon Frontier",
    subtitle: "Tropical forest frontier",
  },
];

const variables: {
  id: VariableKey;
  name: string;
  product: string;
  nativeSupport: string;
  unit: string;
  aggregation: string;
}[] = [
  {
    id: "lst",
    name: "Land Surface Temperature",
    product: "MODIS MOD11A1 V061",
    nativeSupport: "Daily · 1 km",
    unit: "Kelvin (K)",
    aggregation:
      "16-day temporal summary; quality-screened spatial aggregation",
  },
  {
    id: "ndvi",
    name: "Vegetation Index",
    product: "MODIS MOD13Q1 V061",
    nativeSupport: "16-day · 250 m",
    unit: "Unitless NDVI",
    aggregation:
      "Native 16-day observations; quality-screened spatial aggregation",
  },
  {
    id: "sm",
    name: "Surface Soil Moisture",
    product: "SMAP SPL3SMP_E V006",
    nativeSupport: "Daily · approximately 9 km",
    unit: "m³/m³",
    aggregation:
      "16-day temporal summary; retrieval-quality screening",
  },
];

const protocolSteps = [
  {
    number: "01",
    title: "Define common study period",
    detail:
      "Use the same start and end dates for every region. Report the actual number of valid observations per dataset.",
  },
  {
    number: "02",
    title: "Harmonize spatial support",
    detail:
      "Aggregate finer-resolution MODIS observations to a documented common grid. Preserve the original SMAP support and report the aggregation method.",
  },
  {
    number: "03",
    title: "Align temporal observations",
    detail:
      "Use a common 16-day analysis interval where justified. Do not treat missing observations as measured values or silently interpolate gaps.",
  },
  {
    number: "04",
    title: "Apply quality screening",
    detail:
      "Apply product-specific QA rules before aggregation. Track valid-observation counts, missingness and retained spatial coverage.",
  },
  {
    number: "05",
    title: "Estimate trends consistently",
    detail:
      "Apply the same trend-estimation and significance-testing framework to each region, variable and eligible grid cell.",
  },
  {
    number: "06",
    title: "Report uncertainty and limitations",
    detail:
      "Show effect size, uncertainty, p-value, data coverage and methodological caveats together—not a trend label alone.",
  },
];

const variableGuidance: Record<
  VariableKey,
  { interpretation: string; caution: string; trendUnit: string }
> = {
  lst: {
    interpretation:
      "A positive slope indicates increasing land surface temperature over the analysis period.",
    caution:
      "LST is not equivalent to near-surface air temperature. Daytime/nighttime selection, emissivity, cloud screening and seasonal sampling must be documented.",
    trendUnit: "K per year",
  },
  ndvi: {
    interpretation:
      "A positive slope indicates an increase in the vegetation index, not automatically an increase in biomass or ecosystem health.",
    caution:
      "Consider phenology, crop calendars, land-cover change, cloud contamination and the bounded nature of NDVI.",
    trendUnit: "NDVI units per year",
  },
  sm: {
    interpretation:
      "A positive slope indicates increasing retrieved surface soil-moisture values over time.",
    caution:
      "SMAP retrieval quality, vegetation effects, frozen-ground conditions, radio-frequency interference and valid retrieval coverage must be considered.",
    trendUnit: "m³/m³ per year",
  },
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const endpointMap: Record<VariableKey, Partial<Record<RegionKey, string>>> = {
  lst: {
    bangladesh: "bangladesh-lst",
    amazon: "amazon-lst",
  },
  ndvi: {
    igp: "igp-ndvi",
    amazon: "amazon-ndvi",
  },
  sm: {
    bangladesh: "bangladesh-sm",
    igp: "igp-sm",
    amazon: "amazon-sm",
  },
};

type ApiResult = Record<string, any>;

function asRecord(value: unknown): ApiResult {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ApiResult
    : {};
}

function firstNumber(objects: ApiResult[], keys: string[]): number | null {
  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];
      if (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
  }
  return null;
}

function getReportedStats(payload: ApiResult, region: RegionKey, variable: VariableKey) {
  const season = asRecord(payload.season_adjusted_sensitivity);
  const coverage = asRecord(payload.coverage_filtered_sen);
  const sen = asRecord(payload.sen_trend);
  const kendall = asRecord(payload.kendall_trend_test);
  const kendallAlt = asRecord(payload.kendall_trend);


  const slopeKeys: Record<VariableKey, string[]> = {
    lst: ["sen_slope_celsius_per_year", "slope_celsius_per_year", "slope_per_year", "sen_slope"],
    ndvi: ["slope_ndvi_per_year", "sen_slope_ndvi_per_year", "sen_slope", "slope"],
    sm: ["slope_m3_m3_per_year", "sen_slope_m3_m3_per_year", "slope_per_year", "sen_slope", "slope"],
  };

  const slope = firstNumber(
    region === "bangladesh" && variable === "lst"
      ? [season, coverage, sen, asRecord(payload)]
      : [sen, coverage, season, asRecord(payload)],
    slopeKeys[variable],
  );

  const pValue = firstNumber(
    [kendall, kendallAlt, asRecord(payload)],
    ["p_value", "pvalue"],
  );

  const count = firstNumber(
    [asRecord(payload)],
    ["observation_count", "daily_records", "n_observations"],
  );

  const start = payload.first_date ?? payload.start_date ?? payload.period_start;
  const end = payload.last_date ?? payload.end_date ?? payload.period_end;
  const status = String(payload.analysis_status ?? payload.status ?? "Status not reported");

  return { slope, pValue, count, start, end, status };
}
export default function RegionalComparison() {
  const [selectedVariable, setSelectedVariable] =
    useState<VariableKey>("lst");

  const [selectedRegions, setSelectedRegions] = useState<RegionKey[]>([
    "bangladesh",
    "igp",
    "amazon",
  ]);

  const [showProtocol, setShowProtocol] = useState(true);
  const [backendData, setBackendData] = useState<Record<string, ApiResult | null>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRegionalStatistics() {
      setLoadingData(true);
      setLoadError("");

      const entries = Object.values(endpointMap).flatMap((regionMap) =>
        Object.values(regionMap).filter(Boolean) as string[]
      );

      const uniqueIds = [...new Set(entries)];
      const results: Record<string, ApiResult | null> = {};

      await Promise.all(uniqueIds.map(async (id) => {
        try {
          const response = await fetch(`${API_BASE}/api/analysis/${id}/trend`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          results[id] = await response.json();
        } catch {
          results[id] = null;
        }
      }));

      if (!cancelled) {
        setBackendData(results);
        setLoadingData(false);
        if (Object.values(results).every((value) => value === null)) {
          setLoadError("Backend statistics could not be reached. Check that the FastAPI server is running.");
        }
      }
    }

    loadRegionalStatistics();
    return () => { cancelled = true; };
  }, []);

  const variable = variables.find(
    (item) => item.id === selectedVariable
  )!;

  const guidance = variableGuidance[selectedVariable];

  const selectedResults = selectedRegions.flatMap((regionId) => {
    const endpoint = endpointMap[selectedVariable][regionId];
    if (!endpoint) return [];

    const payload = backendData[endpoint];
    if (!payload) return [];

    return [{
      regionId,
      regionName: regions.find((region) => region.id === regionId)?.name ?? regionId,
      ...getReportedStats(payload, regionId, selectedVariable),
    }];
  });

  const availableCount = selectedResults.length;
  const expectedCount = selectedRegions.filter(
    (regionId) => Boolean(endpointMap[selectedVariable][regionId])
  ).length;

  const selectedRegionNames = useMemo(
    () =>
      regions
        .filter((region) => selectedRegions.includes(region.id))
        .map((region) => region.name),
    [selectedRegions]
  );

  function toggleRegion(id: RegionKey) {
    setSelectedRegions((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;

        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  return (
    <div className="page-content regional-comparison">
      <section className="comparison-hero">
        <div className="comparison-hero-copy">
          <p className="eyebrow">
            CROSS-REGIONAL SCIENTIFIC ANALYSIS
          </p>

          <h1>Regional Comparison</h1>

          <p className="comparison-lead">
            Compare environmental change across contrasting regions
            using a consistent, quality-controlled analytical
            framework.
          </p>

          <div className="comparison-hero-tags">
            <span>
              <GitCompareArrows size={14} />
              3 study regions
            </span>

            <span>
              <Layers3 size={14} />
              3 Earth observation variables
            </span>

            <span>
              <ShieldCheck size={14} />
              Methodology-first comparison
            </span>
          </div>
        </div>

        <div className="comparison-hero-mark" aria-hidden="true">
          <div className="comparison-orbit orbit-one" />
          <div className="comparison-orbit orbit-two" />

          <div className="comparison-core">
            <GitCompareArrows size={34} />
          </div>

          <span className="comparison-node node-one">BD</span>
          <span className="comparison-node node-two">IGP</span>
          <span className="comparison-node node-three">AMZ</span>
        </div>
      </section>

      <section className="comparison-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">ANALYSIS CONFIGURATION</p>
            <h2>Define the comparison</h2>

            <p className="section-subtitle">
              Select the regions and environmental variable to
              investigate.
            </p>
          </div>

          <span className="comparison-status">
            <CircleAlert size={14} />
            Live backend statistics
          </span>
        </div>

        <div className="comparison-config-grid">
          <div className="comparison-panel">
            <div className="comparison-panel-heading">
              <div>
                <span className="panel-kicker">
                  01 / STUDY REGIONS
                </span>

                <h3>Geographic selection</h3>
              </div>

              <span className="panel-count">
                {selectedRegions.length} selected
              </span>
            </div>

            <div className="region-selection-list">
              {regions.map((region) => {
                const active = selectedRegions.includes(region.id);

                return (
                  <button
                    type="button"
                    key={region.id}
                    className={`region-selection-item ${
                      active ? "active" : ""
                    }`}
                    onClick={() => toggleRegion(region.id)}
                    aria-pressed={active}
                  >
                    <span className="region-selection-check">
                      {active ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <span />
                      )}
                    </span>

                    <span className="region-selection-copy">
                      <strong>{region.name}</strong>
                      <small>{region.subtitle}</small>
                    </span>

                    <span className="region-selection-code">
                      {region.id === "bangladesh"
                        ? "BD"
                        : region.id === "igp"
                          ? "IGP"
                          : "AMZ"}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="comparison-helper">
              At least one region must remain selected. Comparisons
              require equivalent processing rules across selected
              regions.
            </p>
          </div>

          <div className="comparison-panel">
            <div className="comparison-panel-heading">
              <div>
                <span className="panel-kicker">
                  02 / EARTH SYSTEM VARIABLE
                </span>

                <h3>Variable selection</h3>
              </div>

              <SlidersHorizontal size={18} />
            </div>

            <div className="variable-selection-list">
              {variables.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`variable-selection-item ${
                    selectedVariable === item.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedVariable(item.id)}
                  aria-pressed={selectedVariable === item.id}
                >
                  <span
                    className={`variable-symbol symbol-${item.id}`}
                  >
                    {item.id.toUpperCase()}
                  </span>

                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.product}</small>
                  </span>

                  {selectedVariable === item.id && (
                    <CheckCircle2 size={17} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="comparison-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">DATA COMPATIBILITY</p>
            <h2>Can these observations be compared?</h2>

            <p className="section-subtitle">
              The selected product and its measurement
              characteristics.
            </p>
          </div>

          <Database size={21} />
        </div>

        <div className="dataset-compatibility-card">
          <div className="dataset-compatibility-top">
            <div>
              <span className="panel-kicker">
                SELECTED DATA PRODUCT
              </span>

              <h3>{variable.product}</h3>
            </div>

            <span className="compatibility-label">
              <CircleAlert size={14} />
              Harmonization required
            </span>
          </div>

          <div className="dataset-facts-grid">
            <div>
              <small>Native temporal support</small>
              <strong>{variable.nativeSupport}</strong>
            </div>

            <div>
              <small>Measurement unit</small>
              <strong>{variable.unit}</strong>
            </div>

            <div>
              <small>Planned analysis support</small>
              <strong>Common 16-day interval</strong>
            </div>

            <div>
              <small>Spatial processing</small>
              <strong>Documented common grid</strong>
            </div>
          </div>

          <div className="aggregation-note">
            <Layers3 size={18} />

            <div>
              <strong>Processing rule</strong>
              <p>{variable.aggregation}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="comparison-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">SCIENTIFIC INTERPRETATION</p>
            <h2>Interpret the selected variable correctly</h2>

            <p className="section-subtitle">
              A trend is meaningful only when its measurement
              context is clear.
            </p>
          </div>

          <ShieldCheck size={21} />
        </div>

        <div className="interpretation-grid">
          <article className="interpretation-card">
            <span className="interpretation-label">
              WHAT THE TREND MEANS
            </span>

            <h3>{variable.name}</h3>

            <p>{guidance.interpretation}</p>

            <div className="trend-unit">
              <span>Required slope unit</span>
              <strong>{guidance.trendUnit}</strong>
            </div>
          </article>

          <article className="interpretation-card caution-card">
            <span className="interpretation-label">
              SCIENTIFIC CAUTION
            </span>

            <h3>Do not over-interpret</h3>

            <p>{guidance.caution}</p>
          </article>
        </div>
      </section>

      <section className="comparison-section">
        <button
          type="button"
          className="protocol-toggle"
          onClick={() => setShowProtocol((value) => !value)}
          aria-expanded={showProtocol}
        >
          <div>
            <p className="eyebrow">REPRODUCIBLE WORKFLOW</p>

            <h2>Regional comparison protocol</h2>

            <p className="section-subtitle">
              Six processing stages required before interpreting
              regional differences.
            </p>
          </div>

          <span>
            {showProtocol ? "Hide protocol −" : "Show protocol +"}
          </span>
        </button>

        {showProtocol && (
          <div className="protocol-list">
            {protocolSteps.map((step) => (
              <article
                className="protocol-step"
                key={step.number}
              >
                <span className="protocol-number">
                  {step.number}
                </span>

                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>

                <span className="protocol-pending">
                  Validation requirement
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="comparison-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">COMPARISON READINESS</p>
            <h2>Current analysis state</h2>

            <p className="section-subtitle">
              This interface describes the intended analysis, not
              completed scientific results.
            </p>
          </div>

          <Workflow size={21} />
        </div>

        <div className="readiness-card">
          <div className="readiness-icon">
            {loadingData ? <Database size={23} /> : <CheckCircle2 size={23} />}
          </div>
          <div className="readiness-copy">
            <h3>
              {loadingData ? "Loading NASA analysis statistics..." : "Reported backend statistics"}
            </h3>
            <p>
              {loadError || (loadingData
                ? "Retrieving available regional statistics from the analysis backend."
                : `${availableCount} of ${expectedCount} available statistics returned for this selected comparison. These are reported estimates, not proof of cross-region harmonization or completed QA validation.`)}
            </p>
          </div>
          <span className="readiness-badge">
            {loadingData ? "Loading" : loadError ? "Backend unavailable" : "Backend connected"}
          </span>
        </div>

        <div className="regional-results-list">
          {selectedRegions.map((regionId) => {
            const endpoint = endpointMap[selectedVariable][regionId];
            const payload = endpoint ? backendData[endpoint] : undefined;
            const regionName = regions.find((region) => region.id === regionId)?.name ?? regionId;

            if (!endpoint) return null;

            if (loadingData) {
              return (
                <article className="protocol-step" key={regionId}>
                  <div><h3>{regionName}</h3><p>Loading reported statistics...</p></div>
                </article>
              );
            }

            if (!payload) {
              return (
                <article className="protocol-step" key={regionId}>
                  <div><h3>{regionName}</h3><p>Backend statistics unavailable.</p></div>
                </article>
              );
            }

            const stats = getReportedStats(payload, regionId, selectedVariable);
            const unit = guidance.trendUnit;

            return (
              <article className="protocol-step" key={regionId}>
                <div>
                  <h3>{regionName}</h3>
                  <p>
                    Reported slope: {stats.slope === null ? "Not reported" : `${stats.slope.toFixed(6)} ${unit}`}
                    {" · "}Kendall p-value: {stats.pValue === null ? "Not reported" : stats.pValue.toExponential(3)}
                    {" · "}Observations: {stats.count === null ? "Not reported" : stats.count.toLocaleString()}
                  </p>
                  <p>
                    Period: {stats.start && stats.end ? `${stats.start} — ${stats.end}` : "Not reported"}
                    {" · "}Status: {stats.status}
                  </p>
                </div>
              </article>
            );
          })}

          {selectedRegions.every((regionId) => !endpointMap[selectedVariable][regionId]) && (
            <p>No active endpoint is configured for this selection.</p>
          )}
        </div>
        <div className="selected-comparison-summary">
          <div>
            <small>SELECTED REGIONS</small>
            <strong>{selectedRegionNames.join(" · ")}</strong>
          </div>

          <div>
            <small>SELECTED VARIABLE</small>
            <strong>{variable.name}</strong>
          </div>

          <div>
            <small>STATISTICAL FRAMEWORK</small>
            <strong>Sen's slope + Mann–Kendall</strong>
          </div>
        </div>
      </section>

      <footer className="comparison-integrity-note">
        <ShieldCheck size={18} />

        <p>
          <strong>Scientific integrity notice:</strong> No measured
          trend, regional ranking, p-value, confidence interval or
          NASA-derived comparison is displayed on this page. All
          results will remain unavailable until the underlying
          observations pass documented quality-control and
          validation procedures.
        </p>
      </footer>
    </div>
  );
}
