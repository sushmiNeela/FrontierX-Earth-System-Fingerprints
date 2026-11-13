
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";

import {
  Activity,
  Globe2,
  FlaskConical,
  Database,
  ChartLine,
  Map,
  Layers3,
  GitCompareArrows,
} from "lucide-react";

import Overview from "./pages/Overview";
import EarthExplorer from "./pages/EarthExplorer";
import Investigations from "./pages/Investigations";
import DatasetCatalog from "./pages/DatasetCatalog";
import TimeSeriesStudio from "./pages/TimeSeriesStudio";
import SpatialAnalysis from "./pages/SpatialAnalysis";
import FingerprintStudio from "./pages/FingerprintStudio";
import RegionalComparison from "./pages/RegionalComparison";

import EarthDetectiveChatbot from "./components/common/EarthDetectiveChatbot";

import "./App.css";

const navigation = [
  { name: "Overview", path: "/", icon: Activity },
  { name: "Earth Explorer", path: "/earth-explorer", icon: Globe2 },
  { name: "Investigations", path: "/investigations", icon: FlaskConical },
  { name: "Dataset Catalog", path: "/datasets", icon: Database },
  { name: "Time Series Studio", path: "/time-series", icon: ChartLine },
  { name: "Spatial Analysis", path: "/spatial-analysis", icon: Map },
  { name: "Fingerprint Studio", path: "/fingerprint-studio", icon: Layers3 },
  {
    name: "Regional Comparison",
    path: "/regional-comparison",
    icon: GitCompareArrows,
  },
];

function DashboardLayout() {
  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        {/* BRAND */}
        <div className="brand">
          <div className="brand-icon">
            <Globe2 size={39} strokeWidth={1.5} />
            <span className="brand-glow" />
          </div>

          <div className="brand-content">
            <h2>
              Earth System
              <span>Fingerprints</span>
            </h2>

            <p>EXPLORE · ANALYZE · UNDERSTAND</p>
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="sidebar-section">
          <p className="nav-label">WORKSPACE</p>

          <nav className="navigation">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={21} strokeWidth={1.8} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="sidebar-footer">
          <div className="status-dot" />
          <span>Research workspace</span>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-bottom-line" />
          <p>EARTH OBSERVATION</p>
          <span>Understanding our changing planet</span>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-brand">
            <span className="topbar-label">
              EARTH SYSTEM FINGERPRINTS
            </span>
          </div>

          <div className="topbar-status">
            <span className="status-dot" />
            <span>RESEARCH ENVIRONMENT</span>
          </div>
        </header>

        {/* PAGE ROUTES */}
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Overview />} />

            <Route
              path="/earth-explorer"
              element={<EarthExplorer />}
            />

            <Route
              path="/investigations"
              element={<Investigations />}
            />

            <Route
              path="/datasets"
              element={<DatasetCatalog />}
            />

            <Route
              path="/time-series"
              element={<TimeSeriesStudio />}
            />

            <Route
              path="/spatial-analysis"
              element={<SpatialAnalysis />}
            />

            <Route
              path="/fingerprint-studio"
              element={<FingerprintStudio />}
            />

            <Route
              path="/regional-comparison"
              element={<RegionalComparison />}
            />
          </Routes>
        </div>
      </main>

      {/* FLOATING EARTH DETECTIVE CHATBOT */}
      <EarthDetectiveChatbot />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DashboardLayout />
    </BrowserRouter>
  );
}
