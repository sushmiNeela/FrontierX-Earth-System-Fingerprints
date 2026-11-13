
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Database,
  Thermometer,
  Leaf,
  Droplets,
  ChevronRight,
  Satellite,
  CalendarDays,
  MapPin,
  Layers3,
  ShieldCheck,
  ExternalLink,
  X,
} from "lucide-react";

type Dataset = {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  variable: "LST" | "NDVI" | "Soil Moisture";
  product: string;
  collection: string;
  resolution: string;
  temporal: string;
  unit: string;
  scaleFactor: string;
  coverage: string;
  layer: string;
  description: string;
  use: string;
  color: string;
  icon: typeof Thermometer;
  source: string;
};

type NASAProduct = {
  Product: string;
  Platform: string;
  Description: string;
  Resolution: string;
  TemporalGranularity: string;
  Version: string;
  Available: boolean;
  DocLink: string;
  Source: string;
  TemporalExtentStart: string;
  TemporalExtentEnd: string;
  ProductAndVersion: string;
  project_variable: string;
};

type NASAResponse = {
  source: string;
  supported_product_count: number;
  products: NASAProduct[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const datasets: Dataset[] = [
  {
    id: "mod11",
    name: "MODIS Land Surface Temperature",
    shortName: "MOD11A1",
    provider: "NASA Terra / MODIS",
    variable: "LST",
    product: "MOD11A1",
    collection: "Version 061",
    resolution: "1 km",
    temporal: "Daily",
    unit: "Kelvin (K)",
    scaleFactor: "0.02",
    coverage: "Global",
    layer: "LST_Day_1km",
    description:
      "Daily daytime land surface temperature observations derived from the MODIS instrument aboard the Terra satellite.",
    use: "Monitoring land surface thermal conditions and examining long-term temperature trends.",
    color: "orange",
    icon: Thermometer,
    source: "https://doi.org/10.5067/MODIS/MOD11A1.061",
  },
  {
    id: "mod13",
    name: "MODIS Vegetation Indices",
    shortName: "MOD13Q1",
    provider: "NASA Terra / MODIS",
    variable: "NDVI",
    product: "MOD13Q1",
    collection: "Version 061",
    resolution: "250 m",
    temporal: "16-day composite",
    unit: "Dimensionless",
    scaleFactor: "0.0001",
    coverage: "Global",
    layer: "250m 16 days NDVI",
    description:
      "A 16-day composite vegetation-index product that provides NDVI observations at 250-metre spatial resolution.",
    use: "Assessing vegetation greenness, seasonal dynamics and potential vegetation stress.",
    color: "green",
    icon: Leaf,
    source: "https://doi.org/10.5067/MODIS/MOD13Q1.061",
  },
  {
    id: "smap",
    name: "SMAP Enhanced Soil Moisture",
    shortName: "SPL3SMP_E",
    provider: "NASA Soil Moisture Active Passive",
    variable: "Soil Moisture",
    product: "SPL3SMP_E",
    collection: "Version 006",
    resolution: "Approximately 9 km",
    temporal: "Daily",
    unit: "m³/m³",
    scaleFactor: "Product-specific; check variable metadata",
    coverage: "Global",
    layer: "Soil_Moisture_Retrieval_Data_AM_soil_moisture_dca",
    description:
      "Daily enhanced passive soil-moisture retrievals from the SMAP mission, providing information about near-surface soil moisture.",
    use: "Examining soil-moisture variability and its relationship with vegetation and land-surface temperature.",
    color: "blue",
    icon: Droplets,
    source: "https://doi.org/10.5067/M20OXIZHY3RJ",
  },
];

const filters = ["All", "LST", "NDVI", "Soil Moisture"] as const;

function formatResolution(value: string) {
  if (value === "1000m") return "1 km";
  if (value === "250m") return "250 m";
  if (value === "9000m") return "Approximately 9 km";
  return value;
}

function formatTemporal(value: string) {
  if (value === "16 day") return "16-day composite";
  return value;
}

export default function DatasetCatalog() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]>("All");
  const [selectedId, setSelectedId] = useState("mod11");

  const [liveProducts, setLiveProducts] = useState<NASAProduct[]>([]);
  const [apiSource, setApiSource] = useState("NASA AppEEARS");
  const [apiStatus, setApiStatus] = useState<
    "loading" | "connected" | "error"
  >("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadNASAProducts() {
      try {
        const response = await fetch(`${API_BASE}/api/nasa/products`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`NASA API request failed: ${response.status}`);
        }

        const data: NASAResponse = await response.json();

        if (!Array.isArray(data.products)) {
          throw new Error("Invalid NASA product response");
        }

        setLiveProducts(data.products);
        setApiSource(data.source || "NASA AppEEARS");
        setApiStatus("connected");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        console.error("NASA catalogue error:", error);
        setApiStatus("error");
      }
    }

    loadNASAProducts();

    return () => controller.abort();
  }, []);

  const filteredDatasets = useMemo(() => {
    const query = search.toLowerCase().trim();

    return datasets.filter((dataset) => {
      const matchesFilter =
        activeFilter === "All" || dataset.variable === activeFilter;

      const matchesSearch =
        !query ||
        dataset.name.toLowerCase().includes(query) ||
        dataset.shortName.toLowerCase().includes(query) ||
        dataset.product.toLowerCase().includes(query) ||
        dataset.variable.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [search, activeFilter]);

  const selectedDataset =
    datasets.find((dataset) => dataset.id === selectedId) ?? datasets[0];

  const SelectedIcon = selectedDataset.icon;

  const getLiveProduct = (productId: string) =>
    liveProducts.find((product) => product.Product === productId);

  const selectedLiveProduct = getLiveProduct(selectedDataset.product);

  const getResolution = (dataset: Dataset) => {
    const live = getLiveProduct(dataset.product);
    return live ? formatResolution(live.Resolution) : dataset.resolution;
  };

  const getTemporal = (dataset: Dataset) => {
    const live = getLiveProduct(dataset.product);
    return live
      ? formatTemporal(live.TemporalGranularity)
      : dataset.temporal;
  };

  return (
    <div className="page-content dataset-page">
      <div className="dataset-heading">
        <div>
          <p className="eyebrow">DATA MANAGEMENT / NASA OBSERVATIONS</p>
          <h1>Dataset Catalog</h1>
          <p className="page-description">
            Explore the satellite products used to investigate environmental
            changes across the selected study regions.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background:
                  apiStatus === "connected"
                    ? "#35c98b"
                    : apiStatus === "error"
                      ? "#ef6464"
                      : "#e5ad42",
              }}
            />
            <span>
              {apiStatus === "connected"
                ? `Live connection: ${apiSource}`
                : apiStatus === "error"
                  ? "NASA API connection unavailable — showing reference metadata"
                  : "Connecting to NASA AppEEARS..."}
            </span>
          </div>
        </div>

        <div className="dataset-heading-icon">
          <Database size={25} />
        </div>
      </div>

      <div className="dataset-summary-grid">
        <div className="dataset-summary-card">
          <div className="dataset-summary-icon">
            <Database size={19} />
          </div>
          <div>
            <span>Registered datasets</span>
            <strong>03</strong>
          </div>
        </div>

        <div className="dataset-summary-card">
          <div className="dataset-summary-icon orange">
            <Thermometer size={19} />
          </div>
          <div>
            <span>Thermal observation</span>
            <strong>LST</strong>
          </div>
        </div>

        <div className="dataset-summary-card">
          <div className="dataset-summary-icon green">
            <Leaf size={19} />
          </div>
          <div>
            <span>Vegetation observation</span>
            <strong>NDVI</strong>
          </div>
        </div>

        <div className="dataset-summary-card">
          <div className="dataset-summary-icon blue">
            <Droplets size={19} />
          </div>
          <div>
            <span>Water observation</span>
            <strong>SM</strong>
          </div>
        </div>
      </div>

      <section className="dataset-catalog-section">
        <div className="dataset-section-heading">
          <div>
            <p className="eyebrow">DATA INVENTORY</p>
            <h2>Available satellite products</h2>
          </div>
          <span className="dataset-count">
            {filteredDatasets.length} DATASETS
          </span>
        </div>

        <div className="dataset-toolbar">
          <div className="dataset-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by dataset, product or variable..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                className="dataset-clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="dataset-filters">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`dataset-filter ${
                  activeFilter === filter ? "active" : ""
                }`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="dataset-content-grid">
          <div className="dataset-list">
            {filteredDatasets.length > 0 ? (
              filteredDatasets.map((dataset) => {
                const Icon = dataset.icon;
                const live = getLiveProduct(dataset.product);

                return (
                  <button
                    key={dataset.id}
                    className={`dataset-card ${
                      selectedId === dataset.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedId(dataset.id)}
                  >
                    <div className={`dataset-card-icon ${dataset.color}`}>
                      <Icon size={22} />
                    </div>

                    <div className="dataset-card-content">
                      <div className="dataset-card-topline">
                        <span className="dataset-variable">
                          {dataset.variable}
                        </span>
                        <span className="dataset-product">
                          {live?.ProductAndVersion || dataset.shortName}
                        </span>
                      </div>

                      <h3>{dataset.name}</h3>
                      <p>{live?.Platform || dataset.provider}</p>

                      <div className="dataset-card-meta">
                        <span>
                          <MapPin size={13} />
                          {getResolution(dataset)}
                        </span>
                        <span>
                          <CalendarDays size={13} />
                          {getTemporal(dataset)}
                        </span>
                      </div>

                      {apiStatus === "connected" && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "8px",
                            fontSize: "11px",
                            color: live?.Available ? "#35c98b" : "#ef6464",
                          }}
                        >
                          {live
                            ? live.Available
                              ? "NASA catalogue: Available"
                              : "NASA catalogue: Unavailable"
                            : "Not returned by NASA API"}
                        </span>
                      )}
                    </div>

                    <ChevronRight
                      className="dataset-card-arrow"
                      size={19}
                    />
                  </button>
                );
              })
            ) : (
              <div className="dataset-empty">
                <Search size={25} />
                <h3>No matching datasets</h3>
                <p>Try another search term or select a different filter.</p>
                <button
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("All");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <div className="dataset-detail-panel">
            <div className="dataset-detail-header">
              <div className={`dataset-detail-icon ${selectedDataset.color}`}>
                <SelectedIcon size={24} />
              </div>
              <div>
                <span className="dataset-detail-label">
                  SELECTED DATASET
                </span>
                <h2>
                  {selectedLiveProduct?.ProductAndVersion ||
                    selectedDataset.shortName}
                </h2>
              </div>
            </div>

            <h3>{selectedDataset.name}</h3>
            <p className="dataset-detail-description">
              {selectedDataset.description}
            </p>

            {apiStatus === "connected" && selectedLiveProduct && (
              <div
                style={{
                  padding: "10px 12px",
                  marginTop: "12px",
                  borderRadius: "8px",
                  background: "rgba(53, 201, 139, 0.08)",
                  fontSize: "12px",
                }}
              >
                <strong style={{ color: "#35c98b" }}>
                  NASA AppEEARS metadata received
                </strong>
                <p style={{ margin: "5px 0 0" }}>
                  Catalogue availability:{" "}
                  {selectedLiveProduct.Available ? "Available" : "Unavailable"}
                </p>
                <p style={{ margin: "4px 0 0" }}>
                  Data period: {selectedLiveProduct.TemporalExtentStart} —{" "}
                  {selectedLiveProduct.TemporalExtentEnd}
                </p>
              </div>
            )}

            <div className="dataset-detail-divider" />

            <div className="dataset-metadata-heading">
              <Layers3 size={16} />
              <h4>Product metadata</h4>
            </div>

            <div className="dataset-metadata-grid">
              <div>
                <span>Product ID</span>
                <strong>
                  {selectedLiveProduct?.ProductAndVersion ||
                    selectedDataset.product}
                </strong>
              </div>
              <div>
                <span>Collection</span>
                <strong>
                  {selectedLiveProduct
                    ? `Version ${selectedLiveProduct.Version}`
                    : selectedDataset.collection}
                </strong>
              </div>
              <div>
                <span>Spatial resolution</span>
                <strong>{getResolution(selectedDataset)}</strong>
              </div>
              <div>
                <span>Temporal resolution</span>
                <strong>{getTemporal(selectedDataset)}</strong>
              </div>
              <div>
                <span>Measurement unit</span>
                <strong>{selectedDataset.unit}</strong>
              </div>
              <div>
                <span>Scale factor</span>
                <strong>{selectedDataset.scaleFactor}</strong>
              </div>
              <div>
                <span>Geographic coverage</span>
                <strong>{selectedDataset.coverage}</strong>
              </div>
              <div>
                <span>Selected layer</span>
                <strong className="dataset-layer-name">
                  {selectedDataset.layer}
                </strong>
              </div>
              {selectedLiveProduct && (
                <>
                  <div>
                    <span>NASA data provider</span>
                    <strong>{selectedLiveProduct.Source}</strong>
                  </div>
                  <div>
                    <span>NASA catalogue status</span>
                    <strong>
                      {selectedLiveProduct.Available
                        ? "Available"
                        : "Unavailable"}
                    </strong>
                  </div>
                </>
              )}
            </div>

            <div className="dataset-use-box">
              <div className="dataset-use-title">
                <Satellite size={16} />
                <strong>Research application</strong>
              </div>
              <p>{selectedDataset.use}</p>
            </div>

            <a
              className="dataset-source-link"
              href={
                selectedLiveProduct?.DocLink || selectedDataset.source
              }
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} />
              View official product documentation
            </a>
          </div>
        </div>
      </section>

      <div className="dataset-integrity-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Data integrity notice</strong>
          <p>
            NASA AppEEARS provides live product catalogue metadata. Catalogue
            availability does not mean that all observations have been
            downloaded, quality-filtered, processed or integrated into this
            application. Product-specific scale factors, quality flags and
            valid-data rules must be applied during data processing.
          </p>
        </div>
      </div>
    </div>
  );
}
