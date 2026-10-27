import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { VscSearch } from "react-icons/vsc";
import {
  Clock,
  LayoutGrid,
  Stethoscope,
  ClipboardCheck,
  FileText,
  LogOut,
  Calendar,
  UserCheck,
  Check,
  MapPin,
  Camera,
  PenTool,
  Trash2,
  Eye,
  Upload,
  RotateCcw,
  Sparkles,
  Building,
  Building2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  X,
  ChevronDown,
  User,
  Tag,
  Phone,
  Mail,
  LockKeyhole,
  Target,
  ShieldCheck,
  CheckSquare,
  Bell,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Award,
  ShieldAlert,
  Download,
  Plus,
  Globe,
  Compass,
  Users,
  Package,
} from "lucide-react";
import {
  fetchList,
  TABLE_CONFIG,
  coerceFieldValue,
  displayFieldValue,
  buildRecordPayload,
  updateRecord,
  createRecord,
  API_BASE,
  fetchTaskAnalytics,
  fetchExecutiveTaskSummary,
  updateExecutiveTask,
  markAlertRead,
} from "../api.js";
import logo from "../assets/zenve-zippy-logo.png";
import modalPetHeaderImg from "../assets/modal-pet-header.png";
import "./SalesCRM.css";
import "./RecordModal.css";
import SalesCrmLoginModal from "./SalesCrmLoginModal.jsx";
import PlanView from "./planView.jsx";
import AttendanceView from "./AttendanceView.jsx";
import AttendanceReportView from "./AttendanceReportView.jsx";
import TaskManagementView from "./TaskManagementView.jsx";
import AssignTaskModal from "./AssignTaskModal.jsx";
import DoctorAvatar from "./DoctorAvatar.jsx";
import StylizedEyeIcon from "./StylizedEyeIcon.jsx";

function PawIcon({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 11c-2.2 0-4.3 1.6-4.3 4.1 0 2.1 1.7 3.5 4.3 3.5s4.3-1.4 4.3-3.5c0-2.5-2.1-4.1-4.3-4.1z" />
      <circle cx="5.6" cy="10.2" r="1.9" />
      <circle cx="9.3" cy="6.2" r="1.9" />
      <circle cx="14.7" cy="6.2" r="1.9" />
      <circle cx="18.4" cy="10.2" r="1.9" />
    </svg>
  );
}

import {
  usePlanStats,
  PLAN_MONTH_KEY,
  PLAN_MONTH_LABEL,
  getCurrentMonthKey,
  formatMonthLabel,
  getAvailableMonthOptions,
} from "./planData.js";
import { fetchSubmissionReports, createSubmissionReport, updateSubmissionReport, deleteSubmissionReport } from "./reportData.js";

/* ─────────────────────────────────────────────────────────
   ROLE → TABLE KEY MAP
───────────────────────────────────────────────────────── */
const ROLE_TABLE_KEY = {
  executive: "sales_executives",
  manager: "sales_managers",
  regional: "regional_managers",
};

/* ─────────────────────────────────────────────────────────
   PINCODE TO CITY AUTO-GENERATION DICTIONARY
───────────────────────────────────────────────────────── */
const PINCODE_CITY_MAP = {
  "560068": "Silk Board, Bangalore",
  "560034": "Koramangala, Bangalore",
  "560076": "BTM Layout, Bangalore",
  "560100": "Electronic City, Bangalore",
  "560038": "Indiranagar, Bangalore",
  "560001": "Bangalore GPO",
  "560002": "City Market, Bangalore",
  "560003": "Malleswaram, Bangalore",
  "560004": "Basavanagudi, Bangalore",
  "560011": "Jayanagar, Bangalore",
  "560025": "Richmond Town, Bangalore",
  "560041": "Jayanagar 4th Block, Bangalore",
  "560078": "JP Nagar, Bangalore",
  "560085": "Banashankari, Bangalore",
  "560095": "Koramangala 8th Block, Bangalore",
  "560102": "HSR Layout, Bangalore",
  "560066": "Whitefield, Bangalore",
  "560037": "Marathahalli, Bangalore",
  "560043": "Kalyan Nagar, Bangalore",
  "560092": "Hebbal, Bangalore",
  "560064": "Yelahanka, Bangalore",
  "635653": "Natrampalli, Tamil Nadu",
  "635851": "Vaniyambadi, Tamil Nadu",
  "635601": "Tirupattur, Tamil Nadu",
  "570001": "Mysore",
  "575001": "Mangalore",
  "580001": "Hubli",
  "600001": "Chennai",
  "400001": "Mumbai",
  "110001": "New Delhi",
  "500001": "Hyderabad",
};

/**
 * Checks if a doctor belongs to the executive's territory.
 * Supports direct pincode coverage match, Bangalore/Bengaluru city equivalence,
 * 560xxx pincode prefix, and postal localities.
 */
function matchesExecutiveTerritory(doc, exec, myPincodes) {
  if (!doc) return false;
  // 1. Direct match on assigned coverage pincodes
  if (myPincodes && myPincodes.size > 0 && myPincodes.has(doc.pincode)) {
    return true;
  }
  if (!exec) return true;

  const docCity = (doc.city || "").toLowerCase().trim();
  const execCity = (exec.city || "").toLowerCase().trim();
  const execRegion = (exec.region || "").toLowerCase().trim();
  const docPin = String(doc.pincode || "").trim();

  // Direct city equality or containment
  if (execCity && docCity && (docCity === execCity || docCity.includes(execCity) || execCity.includes(docCity))) {
    return true;
  }

  // Bangalore / Bengaluru equivalence
  const isExecBangalore = /bang|beng/i.test(execCity) || /bang|beng/i.test(execRegion);
  const isDocBangalore =
    /bang|beng/i.test(docCity) ||
    docPin.startsWith("560") ||
    /bang|beng/i.test(PINCODE_CITY_MAP[docPin] || "");
  if (isExecBangalore && isDocBangalore) {
    return true;
  }

  // Check known pincode dictionary
  const mappedCity = (PINCODE_CITY_MAP[docPin] || "").toLowerCase();
  if (execCity && mappedCity && (mappedCity.includes(execCity) || execCity.includes(mappedCity))) {
    return true;
  }

  // State / Region matching
  if (execRegion && (docCity.includes(execRegion) || (doc.state || "").toLowerCase().includes(execRegion))) {
    return true;
  }

  return false;
}

/* ─────────────────────────────────────────────────────────
   SMALL SHARED UI COMPONENTS
───────────────────────────────────────────────────────── */
function Stat({ icon, title, value, text, type }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{text}</small>
      </div>
    </div>
  );
}

function Chart({
  title,
  categories = [],
  targets = [],
  achieved = [],
  execResults = null,
  totalTarget = 0,
  totalAchieved = 0,
  role = null,
  isRegional = false,
}) {
  const isReg = role === "regional" || isRegional;
  const isExec = role === "executive";
  const primaryColor = isReg ? "#7c3aed" : isExec ? "#0077e6" : "#059669";
  const secondaryColor = isReg ? "#c4b5fd" : isExec ? "#93c5fd" : "#6ee7b7";
  const badgeShadow = isReg ? "0 2px 6px rgba(124, 58, 237, 0.25)" : isExec ? "0 2px 6px rgba(0, 119, 230, 0.25)" : "0 2px 6px rgba(5, 150, 105, 0.25)";

  const [viewMode, setViewMode] = useState("bars"); // "bars" | "list"
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const items = useMemo(() => {
    if (execResults && execResults.length > 0) {
      return execResults.map((r) => {
        const t = r.stats?.total_doctors || r.stats?.planned_visits || 0;
        const a = r.stats?.completed || 0;
        const p = parseInt(r.stats?.completion_pct) || (t > 0 ? Math.round((a / t) * 100) : 0);
        return {
          name: r.exec?.name || "Executive",
          region: r.exec?.region || r.exec?.city || "Territory",
          target: t,
          achieved: a,
          pct: p,
        };
      });
    }
    return categories.map((cat, i) => {
      const t = targets[i] || 0;
      const a = achieved[i] || 0;
      return {
        name: cat,
        region: "Field",
        target: t,
        achieved: a,
        pct: t > 0 ? Math.round((a / t) * 100) : 0,
      };
    });
  }, [execResults, categories, targets, achieved]);

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const validPage = Math.min(page, totalPages);

  const displayedItems = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, validPage, pageSize]);

  const calcTarget = totalTarget || items.reduce((s, it) => s + it.target, 0);
  const calcAchieved = totalAchieved || items.reduce((s, it) => s + it.achieved, 0);
  const calcPct = calcTarget > 0 ? Math.round((calcAchieved / calcTarget) * 100) : 0;

  const maxVal = useMemo(() => {
    const m = Math.max(10, ...displayedItems.map((it) => Math.max(it.target, it.achieved)));
    return Math.ceil(m / 10) * 10 || 100;
  }, [displayedItems]);

  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  return (
    <div className="panel chart-panel-modern">
      {/* ── Top Header ── */}
      <div className="chart-header-row">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0, boxShadow: badgeShadow }}>
            <Check size={16} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>{title}</h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
              Monthly target comparison vs completed doctor visits
            </p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="chart-view-toggle">
          <button
            type="button"
            className={`chart-view-btn ${viewMode === "bars" ? "active" : ""}`}
            style={viewMode === "bars" ? { color: primaryColor } : {}}
            onClick={() => setViewMode("bars")}
            title="Dual Bar Chart View"
          >
            <TrendingUp size={13} />
            <span>Dual Bars</span>
          </button>
          <button
            type="button"
            className={`chart-view-btn ${viewMode === "list" ? "active" : ""}`}
            style={viewMode === "list" ? { color: primaryColor } : {}}
            onClick={() => setViewMode("list")}
            title="Executive Progress List View"
          >
            <CheckSquare size={13} />
            <span>Progress Rows</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Strip ── */}
      <div className="chart-summary-strip">
        <div className="chart-summary-pill mint">
          <div>
            <span className="chart-pill-label">TOTAL TARGET</span>
            <strong className="chart-pill-val">{calcTarget}</strong>
          </div>
          <span className="chart-pill-sub">Planned</span>
        </div>
        <div className="chart-summary-pill green">
          <div>
            <span className="chart-pill-label">ACHIEVED</span>
            <strong className="chart-pill-val">{calcAchieved}</strong>
          </div>
          <span className="chart-pill-sub">Visits Done</span>
        </div>
        <div className="chart-summary-pill teal">
          <div>
            <span className="chart-pill-label">COMPLETION RATE</span>
            <strong className="chart-pill-val">{calcPct}%</strong>
          </div>
          <span className="chart-pill-sub">{calcAchieved >= calcTarget ? "Target Met" : "In Progress"}</span>
        </div>
      </div>

      {/* ── Main Visual Body ── */}
      {viewMode === "bars" ? (
        <div className="chart-modern-canvas">
          {/* Y-Axis Horizontal Full-Width Dotted Gridlines */}
          <div className="chart-y-axis-full">
            {yTicks.map((tick, idx) => (
              <div key={`${tick}-${idx}`} className="chart-grid-row">
                <span className="chart-grid-val">{tick}</span>
                <div className="chart-grid-line-full" />
              </div>
            ))}
          </div>

          {/* Symmetrical Dual Bars for up to 5 executives */}
          <div className="chart-exec-columns-wrap">
            {displayedItems.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem", width: "100%" }}>
                No performance data available.
              </div>
            ) : (
              displayedItems.map((item) => {
                const tHeight = (item.target / maxVal) * 160;
                const aHeight = (item.achieved / maxVal) * 160;

                return (
                  <div key={item.name} className="chart-exec-col">
                    <div className="chart-pair-bars">
                      {/* Target Bar */}
                      <div className="chart-single-bar-wrap">
                        <span className="chart-bar-num target">{item.target}</span>
                        <div
                          className="chart-bar-rect target"
                          style={{ height: `${Math.max(6, tHeight)}px`, background: secondaryColor }}
                          title={`Target: ${item.target} visits`}
                        />
                      </div>
                      {/* Achieved Bar */}
                      <div className="chart-single-bar-wrap">
                        <span className="chart-bar-num achieved" style={{ color: primaryColor }}>{item.achieved}</span>
                        <div
                          className="chart-bar-rect achieved"
                          style={{ height: `${Math.max(6, aHeight)}px`, background: primaryColor }}
                          title={`Achieved: ${item.achieved} visits`}
                        />
                      </div>
                    </div>

                    {/* Executive Identity & Badge */}
                    <div className="chart-exec-meta">
                      <span className="chart-exec-name" title={item.name}>
                        {item.name}
                      </span>
                      <span className="chart-exec-pct-badge">
                        {item.pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Progress Rows View */
        <div className="chart-list-view">
          {displayedItems.map((item) => {
            const barCol = item.pct >= 80 ? primaryColor : item.pct >= 50 ? "#d97706" : secondaryColor;
            return (
              <div key={item.name} className="chart-list-row">
                <div className="chart-list-avatar" style={{ background: primaryColor }}>{item.name.charAt(0)}</div>
                <div className="chart-list-info">
                  <strong title={item.name}>{item.name}</strong>
                  <small>{item.region}</small>
                </div>
                <div className="chart-list-progress-wrap">
                  <div className="chart-list-numbers">
                    <span>Target: <strong>{item.target}</strong></span>
                    <span>Done: <strong style={{ color: primaryColor }}>{item.achieved}</strong></span>
                  </div>
                  <div className="chart-list-track">
                    <div
                      className="chart-list-fill"
                      style={{ width: `${Math.min(100, item.pct)}%`, background: barCol }}
                    />
                  </div>
                </div>
                <div
                  className="chart-list-pct-pill"
                  style={{
                    background: item.pct >= 80 ? (isReg ? "#f3e8ff" : isExec ? "#e0f2fe" : "#dcfce7") : item.pct >= 50 ? "#fef3e7" : (isReg ? "#faf5ff" : isExec ? "#eff6ff" : "#ecfdf5"),
                    color: item.pct >= 80 ? primaryColor : item.pct >= 50 ? "#d97706" : primaryColor,
                  }}
                >
                  {item.pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer: Legend & Pagination ── */}
      <div className="chart-footer-row">
        <div className="chart-legend-wrap">
          <span className="chart-legend-item">
            <span className="chart-legend-dot target" style={{ background: secondaryColor }} />
            Target Visits
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot achieved" style={{ background: primaryColor }} />
            Achieved Visits
          </span>
        </div>

        {totalPages > 1 && (
          <div className="chart-page-nav">
            <span className="chart-page-info">
              Showing <strong>{(validPage - 1) * pageSize + 1}–{Math.min(validPage * pageSize, items.length)}</strong> of <strong>{items.length}</strong>
            </span>
            <button
              type="button"
              className="chart-page-btn"
              disabled={validPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="chart-page-indicator">{validPage}/{totalPages}</span>
            <button
              type="button"
              className="chart-page-btn"
              disabled={validPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Achievement({ percentage, achieved, progress, pending, role = null, isRegional = false }) {
  const isReg = role === "regional" || isRegional;
  const isExec = role === "executive";
  const primaryColor = isReg ? "#7c3aed" : isExec ? "#0077e6" : "#059669";
  const badgeShadow = isReg ? "0 2px 6px rgba(124, 58, 237, 0.25)" : isExec ? "0 2px 6px rgba(0, 119, 230, 0.25)" : "0 2px 6px rgba(5, 150, 105, 0.25)";
  const trackBg = isReg ? "#f3e8ff" : isExec ? "#e0f2fe" : "#dcfce7";

  const pctNum = parseInt(percentage) || 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pctNum / 100) * circumference;

  return (
    <div className="panel achievement-modern-panel">
      <div className="panel-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: badgeShadow }}>
          <UserCheck size={16} color="#ffffff" />
        </div>
        <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Achievement Overview</h2>
      </div>

      <div className="achievement-modern-body">
        {/* SVG Donut Ring */}
        <div className="achievement-donut-wrap">
          <svg className="achievement-donut-svg" width="130" height="130" viewBox="0 0 100 100">
            {/* Background track */}
            <circle cx="50" cy="50" r={radius} stroke={trackBg} strokeWidth="12" fill="none" />
            {/* Progress track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={primaryColor}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="achievement-donut-center">
            <strong style={{ color: primaryColor }}>{percentage}</strong>
            <span>Achieved</span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="achievement-breakdown-list">
          <div className="achievement-breakdown-row">
            <span className="achievement-breakdown-label">
              <i style={{ width: 9, height: 9, borderRadius: "50%", background: primaryColor, display: "inline-block", marginRight: 8 }} />
              Achieved
            </span>
            <strong className="achievement-breakdown-val" style={{ color: primaryColor }}>{achieved}</strong>
          </div>
          <div className="achievement-breakdown-row">
            <span className="achievement-breakdown-label">
              <i style={{ width: 9, height: 9, borderRadius: "50%", background: "#f59e0b", display: "inline-block", marginRight: 8 }} />
              In Progress
            </span>
            <strong className="achievement-breakdown-val">{progress}</strong>
          </div>
          <div className="achievement-breakdown-row">
            <span className="achievement-breakdown-label">
              <i style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", display: "inline-block", marginRight: 8 }} />
              Pending
            </span>
            <strong className="achievement-breakdown-val">{pending}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Performers({ title, people }) {
  return (
    <div className="panel">
      <div className="panel-title"><h2>{title}</h2></div>
      {people.length === 0 ? (
        <p style={{ color: "#7f8b98", fontSize: 13 }}>No data yet.</p>
      ) : (
        people.map((person, index) => (
          <div className="performer" key={person[0]}>
            <div className="rank">{index + 1}</div>
            <div className="person-avatar">{person[0].charAt(0)}</div>
            <div className="person">
              <strong>{person[0]}</strong>
              <small>{person[1]}</small>
            </div>
            <div className="performance">
              <div className="progress"><div style={{ width: person[2] }} /></div>
              <strong>{person[2]}</strong>
            </div>
          </div>
        ))
      )}
    </div>
  );
}


function StatusList({ title, rows }) {
  return (
    <div className="panel">
      <div className="panel-title"><h2>{title}</h2></div>
      {rows.map((r) => (
        <div className="lead-row" key={r[0]}>
          <strong>{r[0]}</strong>
          <div className="lead-progress"><div style={{ width: r[2] }} /></div>
          <span>{r[1]}</span>
        </div>
      ))}
    </div>
  );
}

function UpcomingList({ title, rows }) {
  return (
    <div className="panel">
      <div className="panel-title"><h2>{title}</h2></div>
      {rows.length === 0 ? (
        <p style={{ color: "#7f8b98", fontSize: 13 }}>Nothing coming up.</p>
      ) : (
        rows.map((r, i) => (
          <div className="followup" key={i}>
            <div className="person-avatar">{r[0].charAt(0)}</div>
            <div className="followup-info">
              <strong>{r[0]}</strong>
              <small>{r[1]}</small>
            </div>
            <span>{r[2]}</span>
          </div>
        ))
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DATA HOOK
───────────────────────────────────────────────────────── */
function useSalesData() {
  const [state, setState] = useState({ loading: true, error: null });
  const [executives, setExecutives] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [regionalManagers, setRegionalManagers] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [products, setProducts] = useState([]);

  const load = useCallback(() => {
    setState({ loading: true, error: null });
    return Promise.all([
      fetchList("sales_executives"),
      fetchList("sales_managers").catch(() => []),
      fetchList("regional_managers").catch(() => []),
      fetchList("pincode_coverage"),
      fetchList("executive_tasks"),
      fetchList("executive_alerts").catch(() => []),
      fetchList("doctors"),
      fetchList("products"),
    ])
      .then(([execs, mgrs, regs, cov, tsk, alr, docs, prods]) => {
        setExecutives(execs);
        setSalesManagers(mgrs);
        setRegionalManagers(regs);
        setCoverage(cov);
        setTasks(tsk);
        setAlerts(alr);
        setDoctors(docs);
        setProducts(prods);
        setState({ loading: false, error: null });
        return { executives: execs, doctors: docs, coverage: cov };
      })
      .catch((err) => {
        setState({ loading: false, error: err.message || "Failed to load data" });
        return null;
      });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return { ...state, executives, salesManagers, regionalManagers, coverage, tasks, alerts, doctors, products, reload: load };
}

/* ─────────────────────────────────────────────────────────
   PROFILE MODAL
───────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────
   MODERN EXECUTIVE PROFILE MODAL
───────────────────────────────────────────────────────── */
function ProfileModal({ tableKey, record, onClose, onSaved }) {
  const config = TABLE_CONFIG[tableKey];
  const fields = config.fields.filter((f) => !f.formOnly); // password is set by admin only
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach((f) => { init[f.key] = displayFieldValue(f, record); });
    return init;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const roleName = useMemo(() => {
    if (tableKey === "regional_managers") return "Regional Manager";
    if (tableKey === "sales_managers") return "Sales Manager";
    return "Sales Executive";
  }, [tableKey]);

  const roleTheme = useMemo(() => {
    if (tableKey === "regional_managers") return { color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", title: "Regional Director" };
    if (tableKey === "sales_managers") return { color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", title: "Territory Sales Manager" };
    return { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", title: "Field Sales Executive" };
  }, [tableKey]);

  function handleChange(key, value) {
    setValues((p) => ({ ...p, [key]: value }));
  }

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const changes = {};
      fields.forEach((f) => {
        if (f.readOnly) return;
        changes[f.key] = coerceFieldValue(f, values[f.key]);
      });
      const payload = buildRecordPayload(tableKey, record, changes);
      await updateRecord(tableKey, record.id, payload);
      setSavedSuccess(true);
      if (onSaved) await onSaved();
      setTimeout(() => {
        setIsEditing(false);
        setSavedSuccess(false);
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function renderInput(field) {
    const value = values[field.key];
    const id = "pf_" + field.key;
    if (field.readOnly) return <input id={id} value={value ?? ""} disabled className="mod-prof-input disabled" />;
    if (field.type === "bool") return <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => handleChange(field.key, e.target.checked)} />;
    if (field.type === "yesno") return (
      <select id={id} value={value === true || value === "Yes" ? "Yes" : "No"} onChange={(e) => handleChange(field.key, e.target.value)} className="mod-prof-input">
        <option value="Yes">Yes</option><option value="No">No</option>
      </select>
    );
    if (field.type === "number") return <input id={id} type="number" step="any" value={value ?? ""} required={field.required} onChange={(e) => handleChange(field.key, e.target.value)} className="mod-prof-input" />;
    if (field.type === "date") return <input id={id} type="date" value={value ?? ""} required={field.required} onChange={(e) => handleChange(field.key, e.target.value)} className="mod-prof-input" />;
    return <input id={id} value={value ?? ""} required={field.required} onChange={(e) => handleChange(field.key, e.target.value)} className="mod-prof-input" />;
  }

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modern-profile-modal-frame" onClick={(e) => e.stopPropagation()}>
        {/* Banner with gradient decoration */}
        <div className="mod-prof-banner">
          <div className="mod-prof-banner-deco" />
          <button type="button" className="mod-prof-close-btn" onClick={onClose} title="Close Profile">
            <X size={18} />
          </button>
        </div>

        {/* User Hero Section */}
        <div className="mod-prof-hero">
          <div className="mod-prof-avatar-wrap">
            <DoctorAvatar name={record.name || "User"} size={68} />
            <span className="mod-prof-status-dot online" title="Status: Online & Active" />
          </div>

          <div className="mod-prof-hero-info">
            <div className="mod-prof-name-row">
              <h2>{record.name || "Executive Profile"}</h2>
              <span
                className="mod-prof-role-badge"
                style={{
                  color: roleTheme.color,
                  backgroundColor: roleTheme.bg,
                  borderColor: roleTheme.border,
                }}
              >
                <ShieldCheck size={13} />
                {roleName}
              </span>
            </div>
            <p className="mod-prof-subtitle">
              <span>Code: <strong>{record.code || `ID-#${record.id}`}</strong></span>
              <span>•</span>
              <span>Region: <strong>{record.region || "South India"}</strong></span>
              <span>•</span>
              <span className="mod-prof-active-pill">● Verified Account</span>
            </p>
          </div>

          <button
            type="button"
            className={`mod-prof-toggle-edit-btn ${isEditing ? "active" : ""}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "View Profile" : "Edit Profile"}
          </button>
        </div>

        {error && <div className="mod-prof-alert error">{error}</div>}
        {savedSuccess && <div className="mod-prof-alert success">✓ Profile updated successfully!</div>}

        {/* Content Body */}
        <div className="mod-prof-body">
          {!isEditing ? (
            /* ── VIEW MODE (Rich Cards & KPI Badges) ── */
            <div className="mod-prof-view-grid">
              {/* Card 1: Official Identity & Role */}
              <div className="mod-prof-card">
                <div className="mod-prof-card-title">
                  <User size={15} color="#0d9488" />
                  <span>Official Identity &amp; Role</span>
                </div>
                <div className="mod-prof-card-rows">
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Full Name</span>
                    <strong className="mod-prof-val">{record.name || "—"}</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Employee Code</span>
                    <strong className="mod-prof-val mono">{record.code || `EMP-${record.id}`}</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Role Position</span>
                    <strong className="mod-prof-val">{roleTheme.title}</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Account Status</span>
                    <span className="mod-prof-status-badge active">Active Employee</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Contact & Authentication */}
              <div className="mod-prof-card">
                <div className="mod-prof-card-title">
                  <Phone size={15} color="#0d9488" />
                  <span>Contact &amp; Verification</span>
                </div>
                <div className="mod-prof-card-rows">
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Phone Number</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong className="mod-prof-val">{record.phone || "—"}</strong>
                      {record.is_phone_verified && (
                        <span className="mod-prof-verified-pill" title="Mobile verified via OTP">
                          <CheckCircle2 size={11} /> OTP Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Official Email</span>
                    <strong className="mod-prof-val">{record.email || `${(record.name || "user").toLowerCase().replace(/\s+/g, ".")}@zenve.in`}</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Security Access</span>
                    <strong className="mod-prof-val">CRM Enterprise Authorized</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Login Protocol</span>
                    <span className="mod-prof-val">Password &amp; Mobile OTP</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Territory & Field Assignment */}
              <div className="mod-prof-card">
                <div className="mod-prof-card-title">
                  <MapPin size={15} color="#0d9488" />
                  <span>Territory &amp; Operations</span>
                </div>
                <div className="mod-prof-card-rows">
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Assigned Territory</span>
                    <strong className="mod-prof-val">{record.region || "Karnataka"}</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Operating City / HQ</span>
                    <strong className="mod-prof-val">{record.city || "Bangalore"}</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Monthly Target</span>
                    <strong className="mod-prof-val highlight">{record.monthly_target ? `${record.monthly_target} Doctor Visits` : "80 Doctor Visits / Month"}</strong>
                  </div>
                  <div className="mod-prof-row">
                    <span className="mod-prof-key">Jurisdiction</span>
                    <strong className="mod-prof-val">{tableKey === "regional_managers" ? "Multi-State Regional Operations" : "State Division"}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── EDIT MODE (Modern Form Inputs) ── */
            <form id="profileEditForm" className="mod-prof-form" onSubmit={handleSave}>
              <div className="mod-prof-form-grid">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className={`mod-prof-form-field ${field.key === "name" || field.key === "email" ? "full" : ""}`}
                  >
                    <label htmlFor={"pf_" + field.key}>
                      {field.label || field.key}
                      {field.required && <span className="req">*</span>}
                    </label>
                    <div className="mod-prof-input-wrap">
                      {renderInput(field)}
                    </div>
                  </div>
                ))}
              </div>
            </form>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="mod-prof-footer">
          {isEditing ? (
            <>
              <button
                type="button"
                className="mod-prof-btn outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="profileEditForm"
                className="mod-prof-btn primary"
                disabled={saving}
              >
                {saving ? "Saving Changes…" : "Save Profile"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="mod-prof-btn primary"
              onClick={onClose}
            >
              Done &amp; Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PRE-VISIT MODAL
───────────────────────────────────────────────────────── */
function PreCallModal({ visit, onClose, onSave }) {
  const [brands, setBrands] = useState(visit.brands === "—" ? "" : visit.brands);
  const [campaign, setCampaign] = useState(visit.campaign === "—" ? "" : visit.campaign);
  const [objective, setObjective] = useState(visit.preCallObjective || "");
  const [notes, setNotes] = useState(visit.preCallNotes || "");

  function handleSave(e) {
    e.preventDefault();
    onSave({ ...visit, brands: brands || "—", campaign: campaign || "—", preCallObjective: objective, preCallNotes: notes });
    onClose();
  }

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal rpt-call-modal">
        <div className="rpt-call-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DoctorAvatar name={visit.doctorName} size={44} />
            <div>
              <h2>Pre Visit — {visit.doctorName}</h2>
              <p className="rpt-call-modal-sub">Sno: {visit.advaitNo} · <span className="rpt-doc-tag">{visit.tag}</span></p>
              <p className="rpt-call-modal-sub">
                Phone: {visit.phone || "—"} · City: {visit.city || "—"} · Pin: {visit.pincode || "—"} · Specialization: {visit.tag || "—"}
              </p>
            </div>
          </div>
          <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
        </div>

        <form id="preCallForm" className="rpt-call-form" onSubmit={handleSave}>
          <div className="rpt-call-row">
            <div className="rpt-call-field">
              <label>Product</label>
              <input
                value={brands}
                onChange={(e) => setBrands(e.target.value)}
                placeholder="e.g. Nebicard, Losar"
                required
              />
            </div>
            <div className="rpt-call-field">
              <label>Campaign / Sales Activity</label>
              <input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. HeartBeat 2026"
              />
            </div>
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Visit Objective</label>
            <input
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What do you plan to discuss during the doctor visit?"
            />
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Pre-Visit Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Doctor background, previous prescriptions, talking points…"
            />
          </div>
        </form>

        <div className="rpt-call-modal-footer">
          <button type="button" className="rpt-btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="preCallForm" className="rpt-btn-primary">Save Pre Visit</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   POST-VISIT MODAL
───────────────────────────────────────────────────────── */
function PostCallModal({ visit, onClose, onSave, isEdit = false }) {
  const [brands, setBrands] = useState(visit.brands === "—" ? "" : visit.brands);
  const [campaign, setCampaign] = useState(visit.campaign === "—" ? "" : visit.campaign);
  const [outcome, setOutcome] = useState(visit.callOutcome || "Interested");
  const [prescriptions, setPrescriptions] = useState(visit.prescriptions || "");
  const [feedback, setFeedback] = useState(visit.feedback || "");
  const [workWith, setWorkWith] = useState(visit.workWith || "");
  const [nextVisit, setNextVisit] = useState(visit.nextVisitDate || "");

  function handleSave(e) {
    e.preventDefault();
    onSave({
      ...visit,
      brands: brands || "—",
      campaign: campaign || "—",
      callOutcome: outcome,
      prescriptions,
      feedback,
      workWith,
      nextVisitDate: nextVisit,
      status: "Reported",
    });
    onClose();
  }

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal rpt-call-modal">
        <div className="rpt-call-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DoctorAvatar name={visit.doctorName} size={44} />
            <div>
              <h2>{isEdit ? "Edit Visit" : "Post Visit"} — {visit.doctorName}</h2>
              <p className="rpt-call-modal-sub">Sno: {visit.advaitNo} · <span className="rpt-doc-tag">{visit.tag}</span></p>
              <p className="rpt-call-modal-sub">
                Phone: {visit.phone || "—"} · City: {visit.city || "—"} · Pin: {visit.pincode || "—"} · Specialization: {visit.tag || "—"}
              </p>
            </div>
          </div>
          <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
        </div>

        <form id="postCallForm" className="rpt-call-form" onSubmit={handleSave}>
          <div className="rpt-call-row">
            <div className="rpt-call-field">
              <label>Product</label>
              <input
                value={brands}
                onChange={(e) => setBrands(e.target.value)}
                placeholder="e.g. Nebicard, Losar"
                required
              />
            </div>
            <div className="rpt-call-field">
              <label>Campaign / Sales Activity</label>
              <input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. HeartBeat 2026"
              />
            </div>
          </div>
          <div className="rpt-call-row">
            <div className="rpt-call-field">
              <label>Visit Outcome *</label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} required>
                <option>Interested</option>
                <option>Prescribed</option>
                <option>Needs Follow-up</option>
                <option>Not Available</option>
                <option>Rejected</option>
              </select>
            </div>
            <div className="rpt-call-field">
              <label>Next Visit Date</label>
              <input type="date" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} />
            </div>
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Prescriptions / Products Discussed</label>
            <input
              value={prescriptions}
              onChange={(e) => setPrescriptions(e.target.value)}
              placeholder="e.g. Nebicard 5mg — 10 strips/month"
            />
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Doctor Feedback / Observations</label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What did the doctor say? Any objections or requests?"
            />
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Work With</label>
            <textarea
              rows={2}
              value={workWith}
              onChange={(e) => setWorkWith(e.target.value)}
              placeholder="Notes on who you worked with..."
            />
          </div>
        </form>

        <div className="rpt-call-modal-footer">
          <button type="button" className="rpt-btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="postCallForm" className="rpt-btn-primary rpt-btn-post-submit">
            {isEdit ? "✓ Update Visit" : "✓ Mark as Reported"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   EDIT VISIT MODAL (same shape as post visit but pre-filled)
───────────────────────────────────────────────────────── */
function EditCallModal({ visit, onClose, onSave }) {
  return <PostCallModal visit={visit} onClose={onClose} onSave={onSave} isEdit={true} />;
}

/* ─────────────────────────────────────────────────────────
   VIEW REPORTED CALLS MODAL
───────────────────────────────────────────────────────── */
function ReportedCallsModal({ visits, onClose }) {
  const reported = visits.filter((v) => v.status === "Reported");
  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal rpt-reported-modal">
        <div className="rpt-call-modal-header">
          <h2>Reported Calls ({reported.length})</h2>
          <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="rpt-reported-body">
          {reported.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)", textAlign: "center", padding: "1.5rem 0" }}>No reported calls yet.</p>
          ) : (
            <div className="table-panel" style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".75rem" }}>
                <thead>
                  <tr>
                    <th>Sno</th>
                    <th>Doctor</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Product</th>
                    <th>Discussed</th>
                    <th>Outcome</th>
                    <th>Next Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {reported.map((v) => (
                    <tr key={v.id}>
                      <td>{v.advaitNo}</td>
                      <td>
                        <div className="rpt-doc-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DoctorAvatar name={v.doctorName} size={30} />
                          <div>
                            <strong>{v.doctorName}</strong>
                            <span className="rpt-doc-tag" style={{ marginLeft: 6 }}>{v.tag}</span>
                          </div>
                        </div>
                      </td>
                      <td>{v.phone || "—"}</td>
                      <td>{v.city || "—"}</td>
                      <td style={{ color: "var(--primary)" }}>{v.brands}</td>
                      <td style={{ color: "oklch(52% .14 165)" }}>{v.campaign}</td>
                      <td>
                        {v.callOutcome ? (
                          <span className="rpt-outcome-badge">{v.callOutcome}</span>
                        ) : "—"}
                      </td>
                      <td>{v.nextVisitDate || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rpt-call-modal-footer">
          <button className="rpt-btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SUBMIT TOAST
───────────────────────────────────────────────────────── */
function SubmitToast({ reportDate, reportingType, reported, total, recipientLabel, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="rpt-submit-toast">
      <div className="rpt-submit-toast-icon">✓</div>
      <div>
        <strong>Report Submitted Successfully!</strong>
        <p>{reportingType} · {reportDate} · {reported}/{total} visits reported</p>
        {recipientLabel && (
          <p style={{ marginTop: 3, fontSize: "0.76rem", opacity: 0.95 }}>
            Sent to: <strong>{recipientLabel}</strong>
          </p>
        )}
      </div>
      <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SUBMIT REPORT CONFIRMATION MODAL
───────────────────────────────────────────────────────── */
function SubmitReportModal({
  reportDate,
  reportingType,
  reportedCount,
  totalVisits,
  managerName,
  regionalManagerName,
  initialRecipient = "both",
  onClose,
  onSubmit,
}) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [notes, setNotes] = useState("");
  const [includeAll, setIncludeAll] = useState(reportedCount === 0 || reportedCount < totalVisits);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    await onSubmit({ recipient, notes, includeAll });
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal rpt-call-modal" style={{ maxWidth: 540 }}>
        <div className="rpt-call-modal-header">
          <div>
            <h2>Submit Daily Visit Report</h2>
            <p className="rpt-call-modal-sub">{reportingType} · {reportDate} · {reportedCount} of {totalVisits} doctors logged</p>
          </div>
          <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="rpt-call-form" style={{ padding: "1rem 1.25rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 8, display: "block" }}>
            Send Report To *
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                border: recipient === "both" ? "2px solid #0d9488" : "1px solid var(--border)",
                borderRadius: "8px",
                background: recipient === "both" ? "rgba(13, 148, 136, 0.06)" : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="submitRecipient"
                checked={recipient === "both"}
                onChange={() => setRecipient("both")}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ fontSize: "0.88rem", display: "block" }}>
                  Both (Sales Manager & Regional Manager) <span style={{ fontSize: "0.75rem", background: "rgba(13,148,136,0.15)", color: "#0d9488", padding: "2px 6px", borderRadius: 4, marginLeft: 6 }}>Recommended</span>
                </strong>
                <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                  Sends report to {managerName} (Sales Manager) and {regionalManagerName} (Regional Manager)
                </span>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                border: recipient === "manager" ? "2px solid #0d9488" : "1px solid var(--border)",
                borderRadius: "8px",
                background: recipient === "manager" ? "rgba(13, 148, 136, 0.06)" : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="submitRecipient"
                checked={recipient === "manager"}
                onChange={() => setRecipient("manager")}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ fontSize: "0.88rem", display: "block" }}>
                  Sales Manager Only ({managerName})
                </strong>
                <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                  Sends report only to direct Sales Manager
                </span>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                border: recipient === "regional" ? "2px solid #0d9488" : "1px solid var(--border)",
                borderRadius: "8px",
                background: recipient === "regional" ? "rgba(13, 148, 136, 0.06)" : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="submitRecipient"
                checked={recipient === "regional"}
                onChange={() => setRecipient("regional")}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong style={{ fontSize: "0.88rem", display: "block" }}>
                  Regional Manager Only ({regionalManagerName})
                </strong>
                <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                  Sends report directly to Regional Manager
                </span>
              </div>
            </label>
          </div>

          {reportedCount === 0 ? (
            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "10px 12px", borderRadius: "8px", marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                <input
                  type="checkbox"
                  checked={includeAll}
                  onChange={(e) => setIncludeAll(e.target.checked)}
                />
                Include all {totalVisits} scheduled doctors in today's submission
              </label>
              <p style={{ margin: "4px 0 0 24px", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                Doctors in your list will be submitted as completed visits for {reportDate}.
              </p>
            </div>
          ) : reportedCount < totalVisits ? (
            <div style={{ background: "rgba(13, 148, 136, 0.06)", border: "1px solid rgba(13, 148, 136, 0.2)", padding: "10px 12px", borderRadius: "8px", marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                <input
                  type="checkbox"
                  checked={includeAll}
                  onChange={(e) => setIncludeAll(e.target.checked)}
                />
                Also include remaining {totalVisits - reportedCount} pending doctors as completed visits
              </label>
              <p style={{ margin: "4px 0 0 24px", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                Currently {reportedCount} of {totalVisits} doctors have detailed post-call records.
              </p>
            </div>
          ) : (
            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "8px 12px", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.82rem", color: "#059669", fontWeight: 600 }}>
              ✓ All {totalVisits} doctors have been logged and reported.
            </div>
          )}

          <div className="rpt-call-field rpt-call-field-full">
            <label>Executive Remarks / Notes for Management (Optional)</label>
            <textarea
              rows={3}
              placeholder="e.g. Completed scheduled clinic visits in Koramangala. Product detailing done for key doctors..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="rpt-call-modal-footer">
          <button type="button" className="rpt-btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="rpt-btn-primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Submitting…" : "Confirm & Send Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   REPORT DETAILS MODAL (FULL VIEW FOR MANAGERS & EXECUTIVES)
───────────────────────────────────────────────────────── */
function ReportDetailsModal({ report, role, onClose, onFeedbackSaved, onDelete }) {
  const isManager = role === "manager";
  const isRegional = role === "regional";
  const [managerRemarks, setManagerRemarks] = useState(report.manager_remarks || "");
  const [regionalRemarks, setRegionalRemarks] = useState(report.regional_remarks || "");
  const [saving, setSaving] = useState(false);

  const visits = useMemo(() => {
    try {
      return JSON.parse(report.visits_json || "[]");
    } catch {
      return [];
    }
  }, [report.visits_json]);

  async function handleSaveReview() {
    setSaving(true);
    const updates = {
      status: "Reviewed",
      ...(isManager ? { manager_remarks: managerRemarks } : {}),
      ...(isRegional ? { regional_remarks: regionalRemarks } : {}),
    };
    await updateSubmissionReport(report.id, updates);
    setSaving(false);
    if (onFeedbackSaved) onFeedbackSaved(report.id, updates);
    onClose();
  }

  const recipientLabel =
    report.recipient_type === "both"
      ? `Sales Manager (${report.manager_name || "Manager"}) & Regional Manager (${report.regional_manager_name || "RM"})`
      : report.recipient_type === "manager"
        ? `Sales Manager (${report.manager_name || "Manager"})`
        : `Regional Manager (${report.regional_manager_name || "RM"})`;

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal rpt-call-modal" style={{ maxWidth: 800, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="rpt-call-modal-header">
          <div>
            <h2>Daily Visit Report — {report.executive_name}</h2>
            <p className="rpt-call-modal-sub">
              {report.employee_code || "SE"} · {report.region || "Territory"} · {report.report_date} · {report.reporting_type}
            </p>
          </div>
          <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
        </div>

        <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", background: "var(--accent)", padding: "10px 14px", borderRadius: "8px" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>Sent To:</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)" }}>{recipientLabel}</span>
            <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
              Submitted: {new Date(report.submitted_at).toLocaleString()}
            </span>
          </div>

          {report.summary_notes && (
            <div style={{ background: "rgba(13, 148, 136, 0.05)", borderLeft: "3px solid #0d9488", padding: "8px 12px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: 0.5 }}>Executive Summary Notes</span>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--foreground)" }}>{report.summary_notes}</p>
            </div>
          )}

          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>Reported Doctor Visits ({visits.length})</h4>
            {visits.length === 0 ? (
              <p className="doc-muted">No individual doctor visit records.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {visits.map((v, idx) => (
                  <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", background: "var(--card)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <strong>{v.doctorName || `Doctor #${v.advaitNo}`}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: 2 }}>
                          {v.tag} · {v.city} · {v.pincode} · {v.phone}
                        </div>
                      </div>
                      <span className="rpt-status-badge reported">Reported</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.82rem", background: "var(--accent)", padding: "8px", borderRadius: "6px" }}>
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Product / Brands: </span>
                        <strong>{v.brands || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Campaign: </span>
                        <strong>{v.campaign || "—"}</strong>
                      </div>
                      {v.preCallObjective && (
                        <div style={{ gridColumn: "span 2" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>Pre-Call Objective: </span>
                          <span>{v.preCallObjective}</span>
                        </div>
                      )}
                      {v.callOutcome && (
                        <div style={{ gridColumn: "span 2" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>Call Outcome: </span>
                          <span>{v.callOutcome}</span>
                        </div>
                      )}
                      {v.feedback && (
                        <div style={{ gridColumn: "span 2" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>Doctor Feedback: </span>
                          <span>{v.feedback}</span>
                        </div>
                      )}
                      {v.workWith && (
                        <div style={{ gridColumn: "span 2" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>Work With: </span>
                          <span>{v.workWith}</span>
                        </div>
                      )}
                      {v.nextVisitDate && (
                        <div>
                          <span style={{ color: "var(--muted-foreground)" }}>Next Visit: </span>
                          <strong>{v.nextVisitDate}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback & Review section */}
          <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>Management Review & Remarks</h4>

            {report.manager_remarks && !isManager && (
              <div style={{ background: "var(--accent)", padding: "8px 12px", borderRadius: "6px", fontSize: "0.82rem" }}>
                <strong style={{ color: "#0d9488" }}>Sales Manager Remarks ({report.manager_name || "Manager"}):</strong>
                <p style={{ margin: "4px 0 0" }}>{report.manager_remarks}</p>
              </div>
            )}

            {report.regional_remarks && !isRegional && (
              <div style={{ background: "var(--accent)", padding: "8px 12px", borderRadius: "6px", fontSize: "0.82rem" }}>
                <strong style={{ color: "#2563eb" }}>Regional Manager Remarks ({report.regional_manager_name || "RM"}):</strong>
                <p style={{ margin: "4px 0 0" }}>{report.regional_remarks}</p>
              </div>
            )}

            {isManager && (
              <div className="rpt-call-field rpt-call-field-full">
                <label>Sales Manager Feedback / Coaching Notes</label>
                <textarea
                  rows={2}
                  placeholder="Enter feedback or acknowledgement for this executive…"
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                />
              </div>
            )}

            {isRegional && (
              <div className="rpt-call-field rpt-call-field-full">
                <label>Regional Manager Directives / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter regional directives or acknowledgement for this executive…"
                  value={regionalRemarks}
                  onChange={(e) => setRegionalRemarks(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="rpt-call-modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {(isManager || isRegional) && onDelete && (
              <button
                type="button"
                className="rpt-btn-danger"
                onClick={() => onDelete(report.id)}
                disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Trash2 size={14} color="#ef4444" />
                Delete Report
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="rpt-btn-outline" onClick={onClose} disabled={saving}>
              Close
            </button>
            {(isManager || isRegional) && (
              <button type="button" className="rpt-btn-primary" onClick={handleSaveReview} disabled={saving}>
                {saving ? "Saving…" : "Save Remarks & Mark Reviewed"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   EXECUTIVE SUBMISSION HISTORY MODAL
───────────────────────────────────────────────────────── */
function ExecutiveSubmissionHistoryModal({ execId, onClose }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailReport, setDetailReport] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const list = await fetchSubmissionReports({ executiveId: execId });
      setReports(list);
      setLoading(false);
    }
    load();
  }, [execId]);

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal rpt-call-modal" style={{ maxWidth: 740 }}>
        <div className="rpt-call-modal-header">
          <div>
            <h2>My Submitted Daily Reports</h2>
            <p className="rpt-call-modal-sub">History of submitted visit reports to Management</p>
          </div>
          <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
        </div>

        <div style={{ padding: "1rem 1.25rem", maxHeight: "65vh", overflowY: "auto" }}>
          {loading ? (
            <p className="rpt-empty-state">Loading history…</p>
          ) : reports.length === 0 ? (
            <p className="rpt-empty-state">No reports submitted yet.</p>
          ) : (
            <table style={{ width: "100%", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Sent To</th>
                  <th>Reported</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const recipientLabel =
                    r.recipient_type === "both"
                      ? "Manager & RM"
                      : r.recipient_type === "manager"
                        ? "Sales Manager"
                        : "Regional Manager";
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.report_date}</td>
                      <td>{r.reporting_type}</td>
                      <td>
                        <span className="rpt-doc-tag">{recipientLabel}</span>
                      </td>
                      <td>
                        {r.reported_visits} / {r.total_visits}
                      </td>
                      <td>
                        <span className={"rpt-status-badge " + (r.status === "Reviewed" ? "reported" : "not-reported")}>
                          {r.status || "Submitted"}
                        </span>
                      </td>
                      <td>
                        <button className="rpt-btn-sm rpt-btn-outline" onClick={() => setDetailReport(r)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="rpt-call-modal-footer">
          <button type="button" className="rpt-btn-outline" onClick={onClose}>
            Close
          </button>
        </div>

        {detailReport && (
          <ReportDetailsModal
            report={detailReport}
            role="executive"
            onClose={() => setDetailReport(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   RECEIVED REPORTS SECTION (FOR SALES MANAGERS & REGIONAL MANAGERS)
───────────────────────────────────────────────────────── */
function ReceivedReportsSection({ data, role, currentRecord }) {
  const isManager = role === "manager";
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecId, setSelectedExecId] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [activeReport, setActiveReport] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const list = await fetchSubmissionReports({ forRole: role });
    setReports(list);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    const t = setTimeout(() => loadReports(), 0);
    return () => clearTimeout(t);
  }, [loadReports]);

  function handleFeedbackSaved(reportId, updates) {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, ...updates } : r)));
  }

  async function handleDeleteReport(reportId, e) {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      "Are you sure you want to delete this executive report? This action cannot be undone."
    );
    if (!confirmed) return;

    setDeletingId(reportId);
    try {
      await deleteSubmissionReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (activeReport?.id === reportId) {
        setActiveReport(null);
      }
    } catch (err) {
      console.error("Failed to delete submission report:", err);
      alert("Failed to delete report. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedExecId !== "all" && String(r.executive_id) !== String(selectedExecId)) return false;
      if (dateFilter && r.report_date !== dateFilter) return false;
      return true;
    });
  }, [reports, selectedExecId, dateFilter]);

  return (
    <div className="rpt-wrap">
      {/* ── TOP BANNER & CONTROLS ── */}
      <div className="panel rpt-controls">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem" }}>
              {isManager ? "Received Executive Visit Reports" : "Regional Executive Visit Reports"}
            </h2>
            <p className="doc-muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
              {isManager
                ? `Reports submitted by team executives to Sales Manager: ${currentRecord?.name || "Emily"}`
                : `Reports submitted across the region to Regional Manager: ${currentRecord?.name || "John"}`}
            </p>
          </div>
        </div>

        <div className="rpt-control-row">
          <div className="rpt-field">
            <label>Filter by Executive</label>
            <select value={selectedExecId} onChange={(e) => setSelectedExecId(e.target.value)}>
              <option value="all">All Executives ({data.executives?.length || 0})</option>
              {data.executives?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employee_code || `SE-00${e.id}`}) · {e.region || "Territory"}
                </option>
              ))}
            </select>
          </div>
          <div className="rpt-field">
            <label>Filter by Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          {dateFilter && (
            <button className="rpt-btn-outline" onClick={() => setDateFilter("")} style={{ height: 36 }}>
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* ── REPORTS TABLE ── */}
      <div className="panel table-panel rpt-table-panel">
        {loading ? (
          <p className="rpt-empty-state">Loading submitted reports…</p>
        ) : filteredReports.length === 0 ? (
          <p className="rpt-empty-state">No executive reports found matching the selected filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sales Executive</th>
                <th>Type</th>
                <th>Sent To</th>
                <th>Doctors Reported</th>
                <th>Summary Notes</th>
                <th>Status</th>
                <th>Option</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((r) => {
                const recipientLabel =
                  r.recipient_type === "both"
                    ? "Manager & RM"
                    : r.recipient_type === "manager"
                      ? "Sales Manager"
                      : "Regional Manager";
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.report_date}</td>
                    <td>
                      <div className="rpt-doc-cell">
                        <div className="rpt-doc-avatar">{r.executive_name?.charAt(0) || "E"}</div>
                        <div>
                          <strong>{r.executive_name}</strong>
                          <div className="rpt-doc-pin" style={{ marginTop: 2 }}>
                            {r.employee_code || "SE"} · {r.region || "Territory"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="rpt-brands">{r.reporting_type || "Field"}</span>
                    </td>
                    <td>
                      <span
                        className="rpt-doc-tag"
                        style={{
                          background: r.recipient_type === "both" ? "rgba(13,148,136,0.12)" : "rgba(37,99,235,0.12)",
                          color: r.recipient_type === "both" ? "#0d9488" : "#2563eb",
                          fontWeight: 600,
                        }}
                      >
                        {recipientLabel}
                      </span>
                    </td>
                    <td>
                      <strong>{r.reported_visits}</strong> / {r.total_visits} doctors
                    </td>
                    <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.summary_notes || <span style={{ color: "var(--muted-foreground)" }}>—</span>}
                    </td>
                    <td>
                      <span className={"rpt-status-badge " + (r.status === "Reviewed" ? "reported" : "not-reported")}>
                        {r.status || "Submitted"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button className="rpt-btn-sm rpt-btn-post" onClick={() => setActiveReport(r)}>
                          View Full Report
                        </button>
                        <button
                          type="button"
                          className="rpt-btn-sm rpt-btn-danger"
                          onClick={(e) => handleDeleteReport(r.id, e)}
                          disabled={deletingId === r.id}
                          title="Delete report"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Trash2 size={12} color="#ef4444" />
                          {deletingId === r.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {activeReport && (
        <ReportDetailsModal
          report={activeReport}
          role={role}
          currentRecord={currentRecord}
          onClose={() => setActiveReport(null)}
          onFeedbackSaved={handleFeedbackSaved}
          onDelete={handleDeleteReport}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   REPORTS VIEW
   - Seeded from real API doctors in the exec's territory
   - Executive: submit reports to Manager, Regional Manager, or Both
   - Manager & Regional Manager: review received reports & give coaching feedback
───────────────────────────────────────────────────────── */
export function ViewDoctorModal({ doctor, onClose }) {
  if (!doctor) return null;

  const docName = doctor.doctorName || doctor.name || "—";
  const spec = doctor.specializations || doctor.specialization || doctor.tag || "—";

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal" style={{ maxWidth: 450, borderRadius: 12, overflow: "hidden", padding: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>

          <DoctorAvatar name={docName} size={48} />

          <div style={{ flex: 1, textAlign: 'left', marginLeft: '14px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--foreground, #1e293b)' }}>{docName}</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{spec}</span>
          </div>

          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: '#94a3b8',
            padding: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '0.5rem 1.5rem 1.5rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { label: 'Specialization', value: spec },
              { label: 'Qualification', value: doctor.qualification || "—" },
              { label: 'Phone Number', value: doctor.phone || "—" },
              { label: 'City', value: doctor.city || "—" },
              { label: 'Pin Code', value: doctor.pincode || doctor.location || "—" },
              { label: 'Experience', value: doctor.experience_years != null ? `${doctor.experience_years} yrs` : "—" },
            ].map((item, idx, arr) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', padding: '0.9rem 0',
                borderBottom: idx === arr.length - 1 ? 'none' : '1px dashed #cbd5e1',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: '#64748b' }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function ReportsView({ data, execId, role, managerId, regionalId, currentRecord }) {
  const isManager = role === ROLES.MANAGER || role === ROLES.REGIONAL;
  const [managerViewMode, setManagerViewMode] = useState("received"); // "received" | "create"
  const today = new Date().toISOString().slice(0, 10);
  const [reportingType, setReportingType] = useState("Field");
  const [reportDate, setReportDate] = useState(today);
  const [recipientType, setRecipientType] = useState("both"); // "both" | "manager" | "regional"
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal states
  const [preCallVisit, setPreCallVisit] = useState(null);
  const [postCallVisit, setPostCallVisit] = useState(null);
  const [editCallVisit, setEditCallVisit] = useState(null);
  const [showReported, setShowReported] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmissionReceipt, setLastSubmissionReceipt] = useState(null);
  const [viewingDoctor, setViewingDoctor] = useState(null);

  // The visits list — seeded from real API doctors in the exec's territory
  const exec = data.executives.find((e) => e.id === execId) || data.executives[0];

  const salesManager = data.salesManagers?.find((m) => m.id === managerId) || data.salesManagers?.[0];
  const regionalManager = data.regionalManagers?.find((r) => r.id === regionalId) || data.regionalManagers?.[0];
  const managerName = salesManager?.name || "Emily";
  const regionalManagerName = regionalManager?.name || "John";

  const myPincodes = useMemo(
    () => new Set(data.coverage.filter((c) => c.executive_id === exec?.id).map((c) => c.pincode)),
    [data.coverage, exec]
  );

  const territoryDoctors = useMemo(() => {
    if (!data.doctors || data.doctors.length === 0) return [];
    // 1. Doctors matching assigned pincodes
    let list = myPincodes.size > 0 ? data.doctors.filter((d) => myPincodes.has(d.pincode)) : [];
    // 2. If no coverage pincodes assigned or no match, match by executive's territory
    if (list.length === 0 && exec) {
      list = data.doctors.filter((d) => matchesExecutiveTerritory(d, exec, myPincodes));
    }
    // 3. Fallback to all available doctors so executive is never blocked
    if (list.length === 0) {
      list = data.doctors;
    }
    return list;
  }, [data.doctors, myPincodes, exec]);

  // Visits in today's report
  const [visits, setVisits] = useState([]);

  // Check if a report was already submitted for today / selected reportDate
  useEffect(() => {
    let mounted = true;
    async function checkExisting() {
      if (!exec?.id || isManager) return;
      const list = await fetchSubmissionReports({ executiveId: exec.id, reportDate });
      if (!mounted) return;
      if (list && list.length > 0) {
        const latest = list[0];
        setSubmitted(true);
        setLastSubmissionReceipt({
          recipientLabel:
            latest.recipient_type === "both"
              ? `${managerName} (Sales Manager) & ${regionalManagerName} (Regional Manager)`
              : latest.recipient_type === "manager"
                ? `${managerName} (Sales Manager)`
                : `${regionalManagerName} (Regional Manager)`,
          count: latest.reported_visits || latest.total_visits || 0,
          report: latest,
        });
        if (latest.visits_json) {
          try {
            const savedVisits = JSON.parse(latest.visits_json);
            if (Array.isArray(savedVisits) && savedVisits.length > 0) {
              setVisits(savedVisits);
              setSelectedIds(new Set());
              return;
            }
          } catch { /* ignore */ }
        }
      } else {
        setSubmitted(false);
        setLastSubmissionReceipt(null);
      }
    }
    checkExisting();
    return () => { mounted = false; };
  }, [exec?.id, reportDate, isManager, managerName, regionalManagerName]);

  // Dropdown search — doctors from region not yet in the visit list
  const addableDoctors = useMemo(() => {
    const inList = new Set(visits.map((v) => v.id));
    const term = doctorSearch.trim().toLowerCase();
    return territoryDoctors.filter((d) => {
      if (inList.has(d.id)) return false;
      if (!term) return true;
      return (
        d.name?.toLowerCase().includes(term) ||
        d.qualification?.toLowerCase().includes(term) ||
        d.specializations?.toLowerCase().includes(term) ||
        String(d.id).includes(term) ||
        String(d.pincode ?? "").includes(term) ||
        (d.city && d.city.toLowerCase().includes(term))
      );
    });
  }, [territoryDoctors, visits, doctorSearch]);

  function handleAddDoctor() {
    if (!selectedDoctor) return;
    const doc = data.doctors.find((d) => String(d.id) === String(selectedDoctor))
      || territoryDoctors.find((d) => String(d.id) === String(selectedDoctor));
    if (!doc) return;
    if (visits.some((v) => v.id === doc.id)) {
      setSelectedDoctor("");
      return;
    }
    setVisits((prev) => [
      ...prev,
      {
        id: doc.id,
        advaitNo: String(doc.id),
        doctorName: doc.name?.toUpperCase() ?? "UNKNOWN",
        tag: doc.specializations
          ? doc.specializations.split(",")[0].trim().toUpperCase().slice(0, 6)
          : "GEN",
        qualification: doc.qualification || "",
        pincode: doc.pincode,
        phone: doc.phone || "—",
        city: doc.city || "—",
        brands: "—",
        campaign: "—",
        status: "Not Reported",
        preCallObjective: "",
        preCallNotes: "",
        callOutcome: "",
        prescriptions: "",
        feedback: "",
        nextVisitDate: "",
      },
    ]);
    setSelectedDoctor("");
  }

  function handleAddAllDoctors() {
    const inList = new Set(visits.map((v) => v.id));
    const toAdd = territoryDoctors.filter((d) => !inList.has(d.id));
    if (toAdd.length === 0) return;
    setVisits((prev) => [
      ...prev,
      ...toAdd.map((doc) => ({
        id: doc.id,
        advaitNo: String(doc.id),
        doctorName: doc.name?.toUpperCase() ?? "UNKNOWN",
        tag: doc.specializations
          ? doc.specializations.split(",")[0].trim().toUpperCase().slice(0, 6)
          : "GEN",
        qualification: doc.qualification || "",
        pincode: doc.pincode,
        phone: doc.phone || "—",
        city: doc.city || "—",
        brands: "—",
        campaign: "—",
        status: "Not Reported",
        preCallObjective: "",
        preCallNotes: "",
        callOutcome: "",
        prescriptions: "",
        feedback: "",
        nextVisitDate: "",
      })),
    ]);
  }

  function handleRemoveVisits() {
    if (selectedIds.size > 0) {
      setVisits((prev) => prev.filter((v) => !selectedIds.has(v.id)));
      setSelectedIds(new Set());
    } else {
      setVisits((prev) => prev.filter((v) => v.status !== "Not Reported"));
    }
  }

  function handleMarkSelectedReported() {
    if (selectedIds.size === 0) return;
    setVisits((prev) =>
      prev.map((v) =>
        selectedIds.has(v.id)
          ? {
            ...v,
            status: "Reported",
            callOutcome: v.callOutcome || "Interested",
            brands: v.brands === "—" ? "Standard Detailing" : v.brands,
          }
          : v
      )
    );
    setSelectedIds(new Set());
  }

  function handleUpdateVisit(updated) {
    setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }

  function handleFinalSubmit() {
    if (visits.length === 0) {
      alert("No visits in your list to submit. Please add doctors from your region first.");
      return;
    }
    setShowSubmitModal(true);
  }

  async function handleConfirmSubmit({ recipient, notes, includeAll }) {
    let visitsToSubmit;
    if (includeAll) {
      visitsToSubmit = visits.map((v) => ({
        ...v,
        status: "Reported",
        callOutcome: v.callOutcome || "Interested",
        brands: v.brands === "—" ? "Standard Detailing" : v.brands,
      }));
      setVisits(visitsToSubmit);
    } else {
      const reportedOnly = visits.filter((v) => v.status === "Reported");
      if (reportedOnly.length === 0) {
        visitsToSubmit = visits.map((v) => ({
          ...v,
          status: "Reported",
          callOutcome: v.callOutcome || "Interested",
          brands: v.brands === "—" ? "Standard Detailing" : v.brands,
        }));
        setVisits(visitsToSubmit);
      } else {
        visitsToSubmit = reportedOnly;
      }
    }

    const recipientLabel =
      recipient === "both"
        ? `${managerName} (Sales Manager) & ${regionalManagerName} (Regional Manager)`
        : recipient === "manager"
          ? `${managerName} (Sales Manager)`
          : `${regionalManagerName} (Regional Manager)`;

    const payload = {
      executive_id: exec.id,
      executive_name: exec.name,
      employee_code: exec.employee_code || `SE-00${exec.id}`,
      region: exec.region || "Bengaluru",
      report_date: reportDate,
      reporting_type: reportingType,
      recipient_type: recipient,
      manager_id: salesManager?.id,
      manager_name: managerName,
      regional_manager_id: regionalManager?.id,
      regional_manager_name: regionalManagerName,
      total_visits: visits.length,
      reported_visits: visitsToSubmit.length,
      summary_notes: notes,
      visits_json: JSON.stringify(visitsToSubmit),
      status: "Submitted",
    };

    const saved = await createSubmissionReport(payload);
    setSubmitted(true);
    setLastSubmissionReceipt({
      recipientLabel,
      count: visitsToSubmit.length,
      report: saved,
    });
    setShowToast(true);
    setSelectedIds(new Set());
  }

  // Filtered display
  const filteredVisits = useMemo(() => {
    const term = doctorSearch.trim().toLowerCase();
    return visits.filter((v) => {
      const matchSearch =
        !term ||
        v.doctorName.toLowerCase().includes(term) ||
        v.advaitNo.includes(term) ||
        v.tag.toLowerCase().includes(term);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "reported" && v.status === "Reported") ||
        (statusFilter === "not_reported" && v.status === "Not Reported");
      return matchSearch && matchStatus;
    });
  }, [visits, doctorSearch, statusFilter]);

  const allFilteredSelected =
    filteredVisits.length > 0 && filteredVisits.every((v) => selectedIds.has(v.id));
  const someFilteredSelected =
    filteredVisits.some((v) => selectedIds.has(v.id)) && !allFilteredSelected;

  function handleToggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVisits.map((v) => v.id)));
    }
  }

  function handleToggleSelectRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const reportedCount = visits.filter((v) => v.status === "Reported").length;
  const pendingCount = visits.length - reportedCount;

  const isLoading = data.loading;
  const noDoctors = !isLoading && territoryDoctors.length === 0;

  // If role is Manager or Regional Manager, provide view switch
  if (isManager && managerViewMode === "received") {
    return <ReceivedReportsSection data={data} role={role} currentRecord={currentRecord} />;
  }

  return (
    <div className="rpt-wrap">
      {isManager && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <button
            className="rpt-btn-primary"
            style={{ fontSize: "0.8rem", height: 32 }}
            onClick={() => setManagerViewMode("received")}
          >
            ← Back to Received Reports
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            Creating report as {role === "regional" ? "Regional Manager" : "Sales Manager"}
          </span>
        </div>
      )}

      {/* ── TOAST ── */}
      {showToast && (
        <SubmitToast
          reportDate={reportDate}
          reportingType={reportingType}
          reported={reportedCount}
          total={visits.length}
          recipientLabel={lastSubmissionReceipt?.recipientLabel}
          onClose={() => setShowToast(false)}
        />
      )}

      {submitted && lastSubmissionReceipt && (
        <div style={{ padding: "10px 14px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem", color: "#059669" }}>✓</span>
            <div>
              <strong style={{ color: "#059669" }}>Daily Report Submitted for {reportDate}</strong>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                Successfully sent to: <strong>{lastSubmissionReceipt.recipientLabel}</strong> ({lastSubmissionReceipt.count} visits)
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {lastSubmissionReceipt.report && (
              <button
                className="rpt-btn-outline"
                style={{ height: 30, fontSize: "0.78rem" }}
                onClick={() => setViewingReport(lastSubmissionReceipt.report)}
              >
                View Submitted Report
              </button>
            )}
            <button
              className="rpt-btn-outline"
              style={{ height: 30, fontSize: "0.78rem" }}
              onClick={() => setSubmitted(false)}
            >
              Edit / Resubmit
            </button>
          </div>
        </div>
      )}

      {/* ── TOP CONTROLS ── */}
      <div className="panel rpt-controls">
        <div className="rpt-control-row">
          <div className="rpt-field">
            <label>Reporting Type *</label>
            <select value={reportingType} onChange={(e) => setReportingType(e.target.value)}>
              <option>Field</option>
              <option>Office</option>
              <option>Virtual</option>
            </select>
          </div>
          <div className="rpt-field">
            <label>Report Date *</label>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
          <div className="rpt-field">
            <label>Send Report To *</label>
            <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
              <option value="both">Both (Sales Manager & Regional Manager)</option>
              <option value="manager">Sales Manager ({managerName})</option>
              <option value="regional">Regional Manager ({regionalManagerName})</option>
            </select>
          </div>
          <div className="rpt-control-actions">
            <button
              className="rpt-btn-outline"
              onClick={() => setShowReported(true)}
            >
              View Reported Calls ({reportedCount})
            </button>
            <button
              className="rpt-btn-outline"
              onClick={() => setShowHistoryModal(true)}
            >
              Submission History
            </button>
            <button
              className={"rpt-btn-primary" + (submitted ? " rpt-btn-success" : "")}
              style={{
                fontWeight: 600,
                background: submitted ? "oklch(48% .12 165)" : undefined,
              }}
              onClick={handleFinalSubmit}
              title={submitted ? "Report already sent — click to resubmit" : "Send daily report to management"}
            >
              {submitted ? "✓ Report Sent" : "Send Report"}
            </button>
          </div>
        </div>
      </div>

      {/* ── ADD DOCTOR ROW ── */}
      <div className="panel rpt-add-row">
        <div className="rpt-search-wrap">
          <label>Search Doctor</label>
          <div className="rpt-search-input-wrap">
            <input
              type="text"
              placeholder="Type name, S No., or speciality…"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
            />
            <span className="rpt-search-icon"><VscSearch /></span>
          </div>
        </div>

        <div className="rpt-select-wrap">
          <label>Select Doctor</label>
          <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
            <option value="">
              {addableDoctors.length === 0 && territoryDoctors.length > 0
                ? `— All region doctors added (${territoryDoctors.length}) —`
                : addableDoctors.length === 0
                  ? "— No doctors found in region —"
                  : `— Choose Doctor from Region (${addableDoctors.length}) —`}
            </option>
            {addableDoctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.specializations ? ` · ${d.specializations.split(",")[0].trim()}` : ""}{d.city ? ` (${d.city})` : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          className="rpt-btn-primary"
          onClick={handleAddDoctor}
          disabled={!selectedDoctor}
          title={selectedDoctor ? "Add selected doctor to today's visit list" : "Please choose a doctor first"}
        >
          + Add
        </button>

        {addableDoctors.length > 0 && (
          <button
            className="rpt-btn-outline"
            style={{ fontWeight: 600 }}
            onClick={handleAddAllDoctors}
            title="Add all available doctors from your region to today's report"
          >
            + Add All ({addableDoctors.length})
          </button>
        )}

        {selectedIds.size > 0 ? (
          <>
            <button
              className="rpt-btn-outline"
              style={{ color: "#0d9488", borderColor: "#0d9488", fontWeight: 600 }}
              onClick={handleMarkSelectedReported}
            >
              ✓ Mark Selected as Reported ({selectedIds.size})
            </button>
            <button
              className="rpt-btn-danger"
              onClick={handleRemoveVisits}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Trash2 size={13} color="#ef4444" />
              Remove Selected ({selectedIds.size})
            </button>
          </>
        ) : (
          <button
            className="rpt-btn-danger"
            onClick={handleRemoveVisits}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Trash2 size={13} color="#ef4444" />
            Remove Visit Details
          </button>
        )}
      </div>

      {/* ── INDICATION / STATUS FILTER ROW ── */}
      <div className="panel rpt-filter-row">
        <div className="rpt-status-filter">
          <span>Reporting Status:</span>
          <label>
            <input type="radio" name="rptStatus" checked={statusFilter === "all"} onChange={() => setStatusFilter("all")} />
            All
          </label>
          <label>
            <input type="radio" name="rptStatus" checked={statusFilter === "reported"} onChange={() => setStatusFilter("reported")} />
            Reported
          </label>
          <label>
            <input type="radio" name="rptStatus" checked={statusFilter === "not_reported"} onChange={() => setStatusFilter("not_reported")} />
            Not Reported
          </label>
        </div>
      </div>

      {/* ── VISITS TABLE ── */}
      <div className="panel table-panel rpt-table-panel">
        {isLoading ? (
          <p className="rpt-empty-state">Loading doctors from your territory…</p>
        ) : noDoctors ? (
          <p className="rpt-empty-state">No doctors found in your assigned region.</p>
        ) : visits.length === 0 ? (
          <div className="rpt-empty-state" style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", fontWeight: 600 }}>No visits added for today's report yet.</p>
            <p style={{ margin: "0 0 1.25rem", color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
              Select a doctor from your region above and click <strong>+ Add</strong>, or add all doctors at once to begin reporting.
            </p>
            {territoryDoctors.length > 0 && (
              <button
                className="rpt-btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={handleAddAllDoctors}
              >
                + Add All Region Doctors ({territoryDoctors.length})
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => { if (el) el.indeterminate = someFilteredSelected; }}
                    onChange={handleToggleSelectAll}
                    title="Select all"
                  />
                </th>
                <th>Sno</th>
                <th>Doctor Name</th>
                <th>Product</th>
                <th>Discussed</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>View</th>
                <th>Option</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rpt-empty-td">No visits match your filter.</td>
                </tr>
              ) : (
                filteredVisits.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => handleToggleSelectRow(v.id)}
                      />
                    </td>
                    <td className="rpt-advait-no">{v.advaitNo}</td>
                    <td>
                      <div className="rpt-doc-cell" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <DoctorAvatar name={v.doctorName} size={36} />
                        <div style={{ fontWeight: 600, color: 'var(--foreground, #0f172a)' }}>
                          {v.doctorName}
                        </div>
                      </div>
                    </td>
                    <td>
                      {v.brands === "—"
                        ? <span style={{ color: "var(--muted-foreground)" }}>—</span>
                        : <span className="rpt-brands">{v.brands}</span>
                      }
                    </td>
                    <td>
                      {v.campaign === "—"
                        ? <span style={{ color: "var(--muted-foreground)" }}>—</span>
                        : <span className="rpt-campaign">{v.campaign}</span>
                      }
                    </td>
                    <td>
                      <span className={"rpt-status-badge" + (v.status === "Reported" ? " reported" : " not-reported")}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="rpt-btn-view-eye"
                        title="View Doctor Details"
                        onClick={() => {
                          const fullDoc = territoryDoctors.find(d => d.id === v.id) || data.doctors?.find(d => d.id === v.id) || {};
                          setViewingDoctor({ ...fullDoc, ...v });
                        }}
                      >
                        <StylizedEyeIcon width={24} height={15} live={true} />
                      </button>
                    </td>
                    <td>
                      <div className="rpt-options">
                        <button
                          type="button"
                          className="rpt-btn-sm rpt-btn-pre"
                          onClick={() => setPreCallVisit(v)}
                          title="Fill pre-visit details"
                        >
                          Pre Visit
                        </button>
                        {v.status === "Reported" ? (
                          <button
                            type="button"
                            className="rpt-btn-sm rpt-btn-edit"
                            onClick={() => setEditCallVisit(v)}
                            title="Edit reported visit"
                          >
                            Edit Visit
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rpt-btn-sm rpt-btn-post"
                            onClick={() => setPostCallVisit(v)}
                            title="Mark as reported"
                          >
                            Post Visit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="rpt-footer">
        <span className="rpt-summary">
          Total Visits in List: <strong>{visits.length}</strong>&nbsp;|&nbsp;
          Reported: <strong>{reportedCount}</strong>&nbsp;|&nbsp;
          Pending: <strong>{pendingCount}</strong>
          {selectedIds.size > 0 && (
            <span style={{ marginLeft: 12, color: "var(--primary)", fontWeight: 600 }}>
              ({selectedIds.size} selected)
            </span>
          )}
        </span>
      </div>

      {/* ── MODALS ── */}
      {showSubmitModal && (
        <SubmitReportModal
          reportDate={reportDate}
          reportingType={reportingType}
          reportedCount={reportedCount}
          totalVisits={visits.length}
          managerName={managerName}
          regionalManagerName={regionalManagerName}
          initialRecipient={recipientType}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={handleConfirmSubmit}
        />
      )}

      {showHistoryModal && (
        <ExecutiveSubmissionHistoryModal
          execId={exec.id}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {viewingReport && (
        <ReportDetailsModal
          report={viewingReport}
          role={role}
          currentRecord={currentRecord}
          onClose={() => setViewingReport(null)}
        />
      )}

      {viewingDoctor && (
        <ViewDoctorModal
          doctor={viewingDoctor}
          onClose={() => setViewingDoctor(null)}
        />
      )}

      {preCallVisit && (
        <PreCallModal
          visit={preCallVisit}
          onClose={() => setPreCallVisit(null)}
          onSave={(updated) => { handleUpdateVisit(updated); setPreCallVisit(null); }}
        />
      )}
      {postCallVisit && (
        <PostCallModal
          visit={postCallVisit}
          onClose={() => setPostCallVisit(null)}
          onSave={(updated) => { handleUpdateVisit(updated); setPostCallVisit(null); }}
        />
      )}
      {editCallVisit && (
        <EditCallModal
          visit={editCallVisit}
          onClose={() => setEditCallVisit(null)}
          onSave={(updated) => { handleUpdateVisit(updated); setEditCallVisit(null); }}
        />
      )}
      {showReported && (
        <ReportedCallsModal visits={visits} onClose={() => setShowReported(false)} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DOCTORS VIEW
   - Real-time doctors from API filtered by exec's pincodes
   - Proper heading matching Reports page style
   - Consistent CSS classes
───────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
   DIGITAL SIGNATURE PAD MODAL (PNG MODEL)
───────────────────────────────────────────────────────── */
function SignaturePadModal({ isOpen, onClose, onSave, existingSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = existingSignature;
    } else {
      const t = setTimeout(() => setHasDrawn(false), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen, existingSignature]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getCoordinates(e);
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.touches) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getCoordinates(e);
    const ctx = canvas.getContext("2d");

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert("Please draw your signature before saving.");
      return;
    }
    const pngDataUrl = canvas.toDataURL("image/png");
    onSave(pngDataUrl);
    onClose();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      const canvas = canvasRef.current;
      if (canvas && dataUrl) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasDrawn(true);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("crm-modal-open");
    return () => {
      const remainingModals = document.querySelectorAll(".zzc-modal-overlay");
      if (remainingModals.length <= 1) {
        document.body.classList.remove("crm-modal-open");
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="zzc-modal-overlay"
      style={{ zIndex: 11000 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="zzc-modal"
        style={{ maxWidth: 520, padding: "1.25rem 1.5rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(13, 148, 136, 0.12)", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PenTool size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--foreground)" }}>
                Digital Signature (PNG Model)
              </h3>
              <span style={{ fontSize: "0.74rem", color: "var(--muted-foreground)" }}>
                Sign below using mouse, stylus, or touch to export transparent PNG
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted-foreground)" }}
          >
            ✕
          </button>
        </div>

        <div className="sig-canvas-container">
          <canvas
            ref={canvasRef}
            width={480}
            height={180}
            className="sig-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="sig-baseline-guide">
            <span>✕ Sign on line above</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="zzc-btn zzc-btn-outline"
              onClick={handleClear}
              style={{ height: "32px", fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
            <button
              type="button"
              className="zzc-btn zzc-btn-outline"
              onClick={() => fileInputRef.current?.click()}
              style={{ height: "32px", fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Upload size={13} />
              <span>Upload PNG</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/*"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="zzc-btn zzc-btn-outline"
              onClick={onClose}
              style={{ height: "32px", fontSize: "0.78rem" }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="zzc-btn zzc-btn-primary"
              onClick={handleSave}
              style={{
                height: "32px",
                fontSize: "0.82rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #0d9488 0%, #007c71 100%)",
                color: "#fff",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "0 16px",
                borderRadius: "8px",
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Save Signature (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────────
   ADD DOCTOR MODAL
   Allows creating a new doctor record with:
   - Auto-generated City and Pincode (GPS & Directory)
   - Inside & Outside Clinic Images with Upload Buttons
   - Digital Signature Model with PNG export
───────────────────────────────────────────────────────── */
function AddDoctorModal({ defaultCity = "", availablePincodes = [], role = "manager", onClose, onDoctorAdded }) {
  const isRegional = role === "regional";
  const isExecutive = role === "executive";
  const primaryColor = isRegional ? "#7c3aed" : isExecutive ? "#0077e6" : "#059669";
  const primaryGradient = isRegional
    ? "linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%)"
    : isExecutive
      ? "linear-gradient(135deg, #0077e6 0%, #0056b3 100%)"
      : "linear-gradient(135deg, #059669 0%, #047857 100%)";
  const primaryGlow = isRegional
    ? "0 0 16px rgba(124, 58, 237, 0.55), 0 4px 14px rgba(124, 58, 237, 0.35)"
    : isExecutive
      ? "0 0 16px rgba(0, 119, 230, 0.55), 0 4px 14px rgba(0, 119, 230, 0.35)"
      : "0 0 16px rgba(5, 150, 105, 0.55), 0 4px 14px rgba(5, 150, 105, 0.35)";

  const initialPin = availablePincodes[0] || "560068";
  const initialCity = defaultCity || (PINCODE_CITY_MAP[initialPin] || "Silk Board, Bangalore");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    qualification: "",
    specializations: "",
    clinic_name: "",
    facility_type: "Clinic",
    phone: "",
    experience_years: "",
    city: initialCity,
    pincode: initialPin,
    consultation_fee: "",
    verification_status: "pending",
    is_active: "Yes",
    inside_clinic_image: null,
    outside_clinic_image: null,
    digital_signature: null,
  });

  const [existingClinics, setExistingClinics] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/clinics-hospitals`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setExistingClinics(data);
      })
      .catch(() => { });
  }, []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [autoDetected, setAutoDetected] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [previewClinicImage, setPreviewClinicImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const insideInputRef = useRef(null);
  const outsideInputRef = useRef(null);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Lock background body scroll and blur all other background pages while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("crm-modal-open");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("crm-modal-open");
    };
  }, []);

  // Auto-detect GPS Location
  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const detectedCity =
              addr.suburb ||
              addr.neighbourhood ||
              addr.city ||
              addr.town ||
              addr.county ||
              initialCity;
            const detectedPin = addr.postcode || initialPin;
            setForm((prev) => ({
              ...prev,
              city: detectedCity,
              pincode: detectedPin,
            }));
            setAutoDetected(true);
          }
        } catch {
          setForm((prev) => ({
            ...prev,
            city: initialCity,
            pincode: initialPin,
          }));
          setAutoDetected(true);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn("GPS Location error:", err);
        setForm((prev) => ({
          ...prev,
          city: initialCity,
          pincode: initialPin,
        }));
        setAutoDetected(true);
        setDetectingLocation(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Pincode change handler with auto-fill
  const handlePincodeChange = (val) => {
    const cleanPin = val.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      if (PINCODE_CITY_MAP[cleanPin]) {
        setForm((prev) => ({ ...prev, city: PINCODE_CITY_MAP[cleanPin] }));
        setAutoDetected(true);
      } else {
        // Fallback live Indian Postal Pincode lookup
        fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.[0]?.Status === "Success" && data[0].PostOffice?.[0]) {
              const po = data[0].PostOffice[0];
              const detectedCity = `${po.Name}, ${po.District || po.State}`;
              setForm((prev) => ({ ...prev, city: detectedCity }));
              setAutoDetected(true);
            }
          })
          .catch(() => { });
      }
    }
  };

  // City change handler with auto-suggested pincode
  const handleCityChange = (val) => {
    setForm((prev) => ({ ...prev, city: val }));
    const lower = val.toLowerCase();
    for (const [pin, name] of Object.entries(PINCODE_CITY_MAP)) {
      if (name.toLowerCase().includes(lower) && lower.length > 3) {
        if (!form.pincode || form.pincode === initialPin) {
          setForm((prev) => ({ ...prev, pincode: pin }));
          setAutoDetected(true);
        }
        break;
      }
    }
  };

  // Image Upload Handler
  const handleImageUpload = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (dataUrl) {
        setForm((prev) => ({ ...prev, [key]: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Doctor Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const clinicImagesObj = {
        inside: form.inside_clinic_image || null,
        outside: form.outside_clinic_image || null,
      };

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        password: form.password ? form.password.trim() : null,
        qualification: form.qualification.trim() || null,
        specializations: form.specializations.trim() || null,
        clinic_name: form.clinic_name.trim() || null,
        clinic_hospital: form.clinic_name.trim() || null,
        facility_type: form.facility_type || "Clinic",
        inside_clinic_image: form.inside_clinic_image || null,
        outside_clinic_image: form.outside_clinic_image || null,
        phone: form.phone.trim() || null,
        experience_years: form.experience_years !== "" ? Number(form.experience_years) : null,
        city: form.city.trim() || null,
        pincode: form.pincode.trim() || null,
        consultation_fee: form.consultation_fee !== "" ? Number(form.consultation_fee) : null,
        verification_status: form.verification_status || "pending",
        is_active: form.is_active || "Yes",
        digital_signature: form.digital_signature || null,
        clinic_images:
          form.inside_clinic_image || form.outside_clinic_image
            ? JSON.stringify(clinicImagesObj)
            : null,
      };
      const created = await createRecord("doctors", payload);
      await onDoctorAdded(created || payload);
    } catch (err) {
      console.error("Failed to add doctor:", err);
      setError(err.message || "Failed to add doctor. Please try again.");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="zzc-modal-overlay zzc-exec-overlay" onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={`zzc-exec-modal role-${role} theme-${isRegional ? "purple" : isExecutive ? "blue" : "green"}`} style={{ maxWidth: 680, maxHeight: "90vh" }}>
        {/* Header with Role Theme & Pet Illustration */}
        <header className="zzc-exec-header">
          <div className="zzc-exec-header-paws-bg" aria-hidden="true">
            <PawIcon size={26} color={primaryColor} className="zzc-paw-bg-1" />
            <PawIcon size={18} color={primaryColor} className="zzc-paw-bg-2" />
            <PawIcon size={32} color={primaryColor} className="zzc-paw-bg-3" />
          </div>

          <div className="zzc-exec-header-content">
            <span className="zzc-exec-header-badge" style={{ background: primaryColor }}>
              <PawIcon size={24} color="#ffffff" />
            </span>
            <div className="zzc-exec-header-text">
              <h2 id="zzc-exec-title">Add New Doctor</h2>
              <p>Enter doctor details to add to territory database</p>
            </div>
          </div>

          <img
            src={modalPetHeaderImg}
            alt="Pets header"
            className="zzc-modal-header-art"
            aria-hidden="true"
          />

          <button
            type="button"
            className="zzc-exec-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            title="Close"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        </header>

        <div className="zzc-exec-layout">

          {error && (
            <div className="rpt-call-error" style={{ marginBottom: "1rem", padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          <form id="addDoctorForm" className="zzc-exec-form" onSubmit={handleSubmit} autoComplete="off">
            {/* ── SECTION 1: BASIC INFORMATION ── */}
            <section className="zzc-exec-section">
              <div className="zzc-exec-section-header">
                <div className="zzc-exec-section-title-wrap">
                  <span className="zzc-exec-section-badge">
                    <User size={15} />
                  </span>
                  <h3>Basic Information</h3>
                </div>
                <span className="zzc-exec-section-subtitle">
                  Doctor profile and qualifications 🐾
                </span>
              </div>

              <div className="zzc-exec-fields">
                {/* Full Name */}
                <div className="zzc-exec-field theme-teal zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <PawIcon size={14} />
                    </span>
                    <label htmlFor="doc_name">Doctor Name <span className="zzc-exec-required">*</span></label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <User size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_name"
                        type="text"
                        placeholder="e.g. Dr. Rajesh Kumar"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                {/* Qualification */}
                <div className="zzc-exec-field theme-purple">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Tag size={14} />
                    </span>
                    <label htmlFor="doc_qualification">Qualification</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Tag size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_qualification"
                        type="text"
                        placeholder="e.g. BVSc & AH, MVSc"
                        value={form.qualification}
                        onChange={(e) => handleChange("qualification", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Specialization */}
                <div className="zzc-exec-field theme-purple">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Tag size={14} />
                    </span>
                    <label htmlFor="doc_specialization">Specialization</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Tag size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_specialization"
                        type="text"
                        placeholder="e.g. Surgery, Dermatology"
                        value={form.specializations}
                        onChange={(e) => handleChange("specializations", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Experience */}
                <div className="zzc-exec-field theme-amber zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Target size={14} />
                    </span>
                    <label htmlFor="doc_exp">Experience (Years)</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Target size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_exp"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 5"
                        value={form.experience_years}
                        onChange={(e) => handleChange("experience_years", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── SECTION 2: CLINIC & TERRITORY DETAILS ── */}
            <section className="zzc-exec-section">
              <div className="zzc-exec-section-header">
                <div className="zzc-exec-section-title-wrap">
                  <span className="zzc-exec-section-badge">
                    <Building2 size={15} />
                  </span>
                  <h3>Clinic & Territory Details</h3>
                </div>
                <span className="zzc-exec-section-subtitle">
                  Facility and territory location 🐾
                </span>
              </div>

              <div className="zzc-exec-fields">
                {/* Clinic / Hospital Name */}
                <div className="zzc-exec-field theme-blue">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Building2 size={14} />
                    </span>
                    <label htmlFor="doc_clinic_name">Clinic / Hospital</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Building2 size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_clinic_name"
                        type="text"
                        list="crm-clinic-options"
                        placeholder="e.g. City Vet Clinic & Hospital"
                        value={form.clinic_name}
                        onChange={(e) => handleChange("clinic_name", e.target.value)}
                      />
                      {existingClinics.length > 0 && (
                        <datalist id="crm-clinic-options">
                          {existingClinics.map((c, i) => (
                            <option key={c.id || i} value={c.name} />
                          ))}
                        </datalist>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facility Type */}
                <div className="zzc-exec-field theme-blue">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Building size={14} />
                    </span>
                    <label htmlFor="doc_facility_type">Facility Type</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Building size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <select
                        id="doc_facility_type"
                        value={form.facility_type}
                        onChange={(e) => handleChange("facility_type", e.target.value)}
                      >
                        <option value="Clinic">Clinic</option>
                        <option value="Hospital">Hospital</option>
                        <option value="Specialty Referral Center">Specialty Referral Center</option>
                        <option value="Diagnostic Center">Diagnostic Center</option>
                        <option value="Animal Shelter / NGO">Animal Shelter / NGO</option>
                      </select>
                    </div>
                    <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
                  </div>
                </div>

                {/* City (with Auto-generate) */}
                <div className="zzc-exec-field theme-blue">
                  <div className="zzc-exec-field-header" style={{ justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span className="zzc-field-label-icon">
                        <MapPin size={14} />
                      </span>
                      <label htmlFor="doc_city">City</label>
                    </div>
                    <button
                      type="button"
                      className="doc-detect-btn"
                      onClick={handleAutoDetectGPS}
                      disabled={detectingLocation}
                      title="Auto-detect City & Pincode using GPS"
                      style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", background: "#dbeafe", color: "#1d4ed8", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <MapPin size={11} />
                      <span>{detectingLocation ? "Detecting…" : "Auto Detect"}</span>
                    </button>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <MapPin size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_city"
                        type="text"
                        placeholder="e.g. Silk Board, Bangalore"
                        value={form.city}
                        onChange={(e) => handleCityChange(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Pin Code */}
                <div className="zzc-exec-field theme-blue">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <MapPin size={14} />
                    </span>
                    <label htmlFor="doc_pincode">Pin Code (6 Digits)</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <MapPin size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_pincode"
                        type="text"
                        placeholder="e.g. 560068"
                        maxLength={6}
                        value={form.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Consultation Fee */}
                <div className="zzc-exec-field theme-amber zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Target size={14} />
                    </span>
                    <label htmlFor="doc_fee">Consultation Fee (₹)</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Target size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_fee"
                        type="number"
                        min="0"
                        step="10"
                        placeholder="e.g. 500"
                        value={form.consultation_fee}
                        onChange={(e) => handleChange("consultation_fee", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── SECTION 3: CREDENTIALS & STATUS ── */}
            <section className="zzc-exec-section">
              <div className="zzc-exec-section-header">
                <div className="zzc-exec-section-title-wrap">
                  <span className="zzc-exec-section-badge">
                    <LockKeyhole size={15} />
                  </span>
                  <h3>Account Credentials & Status</h3>
                </div>
                <span className="zzc-exec-section-subtitle">
                  Doctor website access & verification 🐾
                </span>
              </div>

              <div className="zzc-exec-fields">
                {/* Phone */}
                <div className="zzc-exec-field theme-pink">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Phone size={14} />
                    </span>
                    <label htmlFor="doc_phone">Phone Number <span className="zzc-exec-required">*</span></label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Phone size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_phone"
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="zzc-exec-field theme-pink">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Mail size={14} />
                    </span>
                    <label htmlFor="doc_email">Doctor Email (Login ID) <span className="zzc-exec-required">*</span></label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Mail size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_email"
                        type="email"
                        placeholder="e.g. doctor@clinic.com"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="zzc-exec-field theme-pink zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <LockKeyhole size={14} />
                    </span>
                    <label htmlFor="doc_password">Doctor Password <span className="zzc-exec-required">*</span></label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <LockKeyhole size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="doc_password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 6 characters"
                        value={form.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? "Hide password" : "Show password"}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0 }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Status (Active / Inactive) */}
                <div className="zzc-exec-field theme-green">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <ShieldCheck size={14} />
                    </span>
                    <label htmlFor="doc_active">Active Status</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <ShieldCheck size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <select
                        id="doc_active"
                        value={form.is_active}
                        onChange={(e) => handleChange("is_active", e.target.value)}
                      >
                        <option value="Yes">Active</option>
                        <option value="No">Inactive</option>
                      </select>
                    </div>
                    <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
                  </div>
                </div>

                {/* Verification Status */}
                <div className="zzc-exec-field theme-green">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Check size={14} />
                    </span>
                    <label htmlFor="doc_verification">Verification Status</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Check size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <select
                        id="doc_verification"
                        value={form.verification_status}
                        onChange={(e) => handleChange("verification_status", e.target.value)}
                      >
                        <option value="pending">Pending (Admin Approval)</option>
                        <option value="verified">Verified (Approved)</option>
                      </select>
                    </div>
                    <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── CLINIC PHOTOS SECTION (INSIDE & OUTSIDE CLINIC IMAGES) ── */}
            <div className="clinic-photos-section">
              <div className="clinic-photos-title-row">
                <div>
                  <h4>
                    <Building2 size={16} color={primaryColor} />
                    <span>Clinic Verification Photos</span>
                  </h4>
                  <p>Add inside and outside clinic images for field verification</p>
                </div>
              </div>

              <div className="clinic-photos-grid">
                {/* Inside Clinic Image Card */}
                <div className={`clinic-photo-card ${form.inside_clinic_image ? "has-photo" : ""}`}>
                  <input
                    type="file"
                    ref={insideInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageUpload("inside_clinic_image", e.target.files?.[0])}
                  />

                  {form.inside_clinic_image ? (
                    <>
                      <img
                        src={form.inside_clinic_image}
                        alt="Inside Clinic"
                        className="clinic-photo-thumb"
                      />
                      <span className="clinic-photo-tag">Inside Clinic</span>
                      <div className="clinic-photo-overlay">
                        <button
                          type="button"
                          onClick={() => setPreviewClinicImage({ url: form.inside_clinic_image, title: "Inside Clinic Photo" })}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => insideInputRef.current?.click()}
                        >
                          <Camera size={12} /> Change
                        </button>
                        <button
                          type="button"
                          className="btn-del"
                          onClick={() => setForm((prev) => ({ ...prev, inside_clinic_image: null }))}
                          title="Delete image"
                        >
                          <Trash2 size={12} color="#ef4444" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Building size={24} color="#0d9488" style={{ opacity: 0.8, marginBottom: "4px" }} />
                      <span className="clinic-photo-card-label">Inside Clinic Image</span>
                      <span className="clinic-photo-card-sub">Consultation area, exam table, interior</span>
                      <button
                        type="button"
                        className="clinic-photo-action-btn"
                        onClick={() => insideInputRef.current?.click()}
                      >
                        <Camera size={14} />
                        <span>Inside Clinic Image</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Outside Clinic Image Card */}
                <div className={`clinic-photo-card ${form.outside_clinic_image ? "has-photo" : ""}`}>
                  <input
                    type="file"
                    ref={outsideInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageUpload("outside_clinic_image", e.target.files?.[0])}
                  />

                  {form.outside_clinic_image ? (
                    <>
                      <img
                        src={form.outside_clinic_image}
                        alt="Outside Clinic"
                        className="clinic-photo-thumb"
                      />
                      <span className="clinic-photo-tag">Outside Clinic</span>
                      <div className="clinic-photo-overlay">
                        <button
                          type="button"
                          onClick={() => setPreviewClinicImage({ url: form.outside_clinic_image, title: "Outside Clinic Photo" })}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => outsideInputRef.current?.click()}
                        >
                          <Camera size={12} /> Change
                        </button>
                        <button
                          type="button"
                          className="btn-del"
                          onClick={() => setForm((prev) => ({ ...prev, outside_clinic_image: null }))}
                          title="Delete image"
                        >
                          <Trash2 size={12} color="#ef4444" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Building2 size={24} color={primaryColor} style={{ opacity: 0.8, marginBottom: "4px" }} />
                      <span className="clinic-photo-card-label">Outside Clinic Image</span>
                      <span className="clinic-photo-card-sub">Signboard, entrance, building exterior</span>
                      <button
                        type="button"
                        className="clinic-photo-action-btn"
                        onClick={() => outsideInputRef.current?.click()}
                      >
                        <Camera size={14} />
                        <span>Outside Clinic Image</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── DIGITAL SIGNATURE SECTION (PNG MODEL) ── */}
            <div className="doc-signature-section">
              <div className="clinic-photos-title-row">
                <div>
                  <h4>
                    <PenTool size={16} color={primaryColor} />
                    <span>Doctor / Executive Signature</span>
                  </h4>
                  <p>Official verified signature captured in transparent PNG format</p>
                </div>
              </div>

              <div className={`doc-signature-card ${form.digital_signature ? "has-sig" : ""}`}>
                {form.digital_signature ? (
                  <>
                    <div className="doc-signature-left">
                      <img
                        src={form.digital_signature}
                        alt="Doctor Signature"
                        className="doc-signature-preview-img"
                      />
                      <div>
                        <div className="doc-signature-badge">
                          <Check size={14} strokeWidth={2.5} />
                          <span>PNG Signature Confirmed</span>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", display: "block", marginTop: "2px" }}>
                          Transparent PNG model format
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="doc-sig-action-btn"
                        onClick={() => setShowSignatureModal(true)}
                      >
                        <PenTool size={13} />
                        <span>Re-sign</span>
                      </button>
                      <button
                        type="button"
                        className="doc-sig-action-btn btn-del"
                        onClick={() => setForm((prev) => ({ ...prev, digital_signature: null }))}
                        title="Remove signature"
                      >
                        <Trash2 size={13} color="#ef4444" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--foreground)" }}>
                        No Signature Attached
                      </span>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                        Click to draw or upload official doctor onboarding signature (PNG)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="doc-signature-trigger-btn"
                      onClick={() => setShowSignatureModal(true)}
                    >
                      <PenTool size={15} />
                      <span>Signature</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>

        </div>

        {/* Modal Actions Footer */}
        <footer className="zzc-exec-footer">
          <div className="zzc-exec-footer-paws" aria-hidden="true">
            <PawIcon size={24} color={primaryColor} />
            <PawIcon size={16} color={primaryColor} />
          </div>

          <div className="zzc-exec-footer-actions">
            <button
              type="button"
              className="zzc-btn zzc-btn-cancel"
              onClick={onClose}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                color: "#334155",
                padding: "9px 24px",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="addDoctorForm"
              className="zzc-btn zzc-btn-create"
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: primaryGradient,
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "0.88rem",
                boxShadow: primaryGlow,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "all 0.18s ease",
              }}
            >
              <span>{saving ? "Submitting…" : "Add Doctor Profile"}</span>
              <span className="zzc-btn-sparkle" aria-hidden="true">✨</span>
            </button>
          </div>
        </footer>
      </div>

      {/* ── SIGNATURE PAD MODAL (PNG MODEL) ── */}
      <SignaturePadModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={(pngDataUrl) => setForm((prev) => ({ ...prev, digital_signature: pngDataUrl }))}
        existingSignature={form.digital_signature}
      />

      {/* ── CLINIC PHOTO LIGHTBOX PREVIEW ── */}
      {previewClinicImage && (
        <div
          className="attend-preview-lightbox"
          onClick={() => setPreviewClinicImage(null)}
          style={{ zIndex: 1000005 }}
        >
          <div
            className="attend-lightbox-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attend-lightbox-header">
              <div className="attend-lightbox-title">
                <Camera size={18} className="camera-icon-teal" />
                <span>{previewClinicImage.title}</span>
              </div>
              <button
                type="button"
                className="attend-lightbox-close"
                onClick={() => setPreviewClinicImage(null)}
              >
                ✕
              </button>
            </div>
            <div className="attend-lightbox-body">
              <img
                src={previewClinicImage.url}
                alt="Clinic Preview"
                style={{ width: "100%", maxHeight: "360px", objectFit: "contain", borderRadius: "10px", background: "#0f172a" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="zzc-btn zzc-btn-outline"
                  onClick={() => setPreviewClinicImage(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────────
   DOCTOR DETAILS MODAL
   - Opens when clicking doctor row or "Details" button
   - Shows focused details only, all background pages blurred
   - Displays full doctor credentials, clinic verification
     photos, and official transparent PNG signature
───────────────────────────────────────────────────────── */
function DoctorDetailsModal({ doctor, onClose }) {
  const [previewClinicImage, setPreviewClinicImage] = useState(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("crm-modal-open");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("crm-modal-open");
    };
  }, []);

  if (!doctor) return null;

  let clinicImages = null;
  if (doctor.clinic_images) {
    try {
      clinicImages =
        typeof doctor.clinic_images === "string"
          ? JSON.parse(doctor.clinic_images)
          : doctor.clinic_images;
    } catch {
      clinicImages = null;
    }
  }

  const isActive = doctor.is_active === "Yes" || doctor.is_active === true;

  return createPortal(
    <div
      className="zzc-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="zzc-modal doc-details-modal" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <DoctorAvatar name={doctor.name || doctor.doctorName} size={42} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)" }}>
                  {doctor.name || "Doctor Details"}
                </h3>
                <span className={"doc-status-badge" + (isActive ? " active" : " inactive")}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                ID #{doctor.id} • {doctor.verification_status || "Verified"} Territory Doctor Profile
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.3rem",
              cursor: "pointer",
              color: "var(--muted-foreground)",
              padding: "4px 8px",
              borderRadius: "6px"
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="doc-details-body">
          {/* Quick Metrics Bar */}
          <div className="doc-details-stats-bar">
            <div className="doc-details-stat-box">
              <span className="doc-details-stat-label">Experience</span>
              <strong className="doc-details-stat-val">
                {doctor.experience_years != null ? `${doctor.experience_years} Years` : "—"}
              </strong>
            </div>
            <div className="doc-details-stat-box">
              <span className="doc-details-stat-label">Consultation Fee</span>
              <strong className="doc-details-stat-val" style={{ color: "#0d9488" }}>
                {doctor.consultation_fee != null ? `₹${doctor.consultation_fee}` : "—"}
              </strong>
            </div>
            <div className="doc-details-stat-box">
              <span className="doc-details-stat-label">Assigned City</span>
              <strong className="doc-details-stat-val">
                {doctor.city || "—"}
              </strong>
            </div>
            <div className="doc-details-stat-box">
              <span className="doc-details-stat-label">Pin Code</span>
              <strong className="doc-details-stat-val">
                {doctor.pincode || "—"}
              </strong>
            </div>
          </div>

          {/* Details Grid */}
          <div className="doc-details-info-grid">
            <div className="doc-details-item">
              <span className="doc-details-label">Qualification</span>
              <span className="doc-details-value">{doctor.qualification || "—"}</span>
            </div>
            <div className="doc-details-item">
              <span className="doc-details-label">Phone Number</span>
              <span className="doc-details-value" style={{ fontWeight: 600, color: "var(--primary)" }}>
                {doctor.phone || "—"}
              </span>
            </div>
            <div className="doc-details-item">
              <span className="doc-details-label">Clinic / Hospital</span>
              <span className="doc-details-value" style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {doctor.clinic_name || doctor.clinic_hospital || "—"}
              </span>
            </div>
            <div className="doc-details-item">
              <span className="doc-details-label">Facility Type</span>
              <span className="doc-details-value">
                {doctor.facility_type || "Clinic"}
              </span>
            </div>
            <div className="doc-details-item" style={{ gridColumn: "1 / -1" }}>
              <span className="doc-details-label">Specializations</span>
              <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {doctor.specializations ? (
                  doctor.specializations.split(",").map((s, idx) => (
                    <span key={idx} className="rpt-doc-tag" style={{ fontSize: "0.82rem", padding: "3px 10px" }}>
                      {s.trim()}
                    </span>
                  ))
                ) : (
                  <span className="doc-muted">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Clinic Verification Photos */}
          <div className="clinic-photos-section" style={{ marginTop: "1.25rem" }}>
            <div className="clinic-photos-title-row">
              <div>
                <h4>
                  <Building size={16} color="#0d9488" />
                  <span>Clinic Verification Photos</span>
                </h4>
                <p>Verified physical clinic premises</p>
              </div>
            </div>

            <div className="clinic-photos-grid">
              {/* Inside Clinic Image */}
              <div className={`clinic-photo-card ${clinicImages?.inside ? "has-photo" : ""}`}>
                {clinicImages?.inside ? (
                  <>
                    <img
                      src={clinicImages.inside}
                      alt="Inside Clinic"
                      className="clinic-photo-thumb"
                    />
                    <span className="clinic-photo-tag">Inside Clinic</span>
                    <div className="clinic-photo-overlay">
                      <button
                        type="button"
                        onClick={() => setPreviewClinicImage({ url: clinicImages.inside, title: "Inside Clinic Photo" })}
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--muted-foreground)" }}>
                    <Building size={28} style={{ opacity: 0.35, marginBottom: "6px" }} />
                    <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>No Inside Photo</div>
                  </div>
                )}
              </div>

              {/* Outside Clinic Image */}
              <div className={`clinic-photo-card ${clinicImages?.outside ? "has-photo" : ""}`}>
                {clinicImages?.outside ? (
                  <>
                    <img
                      src={clinicImages.outside}
                      alt="Outside Clinic"
                      className="clinic-photo-thumb"
                    />
                    <span className="clinic-photo-tag">Outside Clinic</span>
                    <div className="clinic-photo-overlay">
                      <button
                        type="button"
                        onClick={() => setPreviewClinicImage({ url: clinicImages.outside, title: "Outside Clinic Photo" })}
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--muted-foreground)" }}>
                    <Building2 size={28} style={{ opacity: 0.35, marginBottom: "6px" }} />
                    <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>No Outside Photo</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Digital Signature Model Section */}
          <div className="doc-signature-section" style={{ marginTop: "1.25rem" }}>
            <div className="clinic-photos-title-row">
              <div>
                <h4>
                  <PenTool size={16} color="#0d9488" />
                  <span>Doctor Official Signature</span>
                </h4>
                <p>Digital signature verified on territory database (PNG Model)</p>
              </div>
            </div>

            <div className={`doc-signature-card ${doctor.digital_signature ? "has-sig" : ""}`}>
              {doctor.digital_signature ? (
                <div className="doc-signature-left" style={{ width: "100%", justifyContent: "space-between" }}>
                  <img
                    src={doctor.digital_signature}
                    alt="Doctor Signature"
                    className="doc-signature-preview-img"
                  />
                  <div>
                    <div className="doc-signature-badge">
                      <Check size={14} strokeWidth={2.5} />
                      <span>Verified PNG Signature</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", display: "block", marginTop: "3px" }}>
                      Authenticated digital model
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "0.5rem 0", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                  No digital signature captured for this doctor yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="zzc-modal-actions" style={{ marginTop: "1.5rem" }}>
          <button
            type="button"
            className="zzc-btn zzc-btn-primary"
            onClick={onClose}
            style={{
              padding: "0 24px",
              background: "linear-gradient(135deg, #0d9488 0%, #007c71 100%)",
              border: "none",
              color: "#fff",
              fontWeight: 700
            }}
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Clinic Photo Lightbox Preview */}
      {previewClinicImage && (
        <div
          className="attend-preview-lightbox"
          onClick={() => setPreviewClinicImage(null)}
          style={{ zIndex: 1000005 }}
        >
          <div
            className="attend-lightbox-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attend-lightbox-header">
              <div className="attend-lightbox-title">
                <Camera size={18} className="camera-icon-teal" />
                <span>{previewClinicImage.title}</span>
              </div>
              <button
                type="button"
                className="attend-lightbox-close"
                onClick={() => setPreviewClinicImage(null)}
              >
                ✕
              </button>
            </div>
            <div className="attend-lightbox-body">
              <img
                src={previewClinicImage.url}
                alt="Clinic Preview"
                style={{ width: "100%", maxHeight: "360px", objectFit: "contain", borderRadius: "10px", background: "#0f172a" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="zzc-btn zzc-btn-outline"
                  onClick={() => setPreviewClinicImage(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function DoctorsView({ data, execId, role = "manager" }) {
  const isRegional = role === "regional";
  const isExecutive = role === "executive";
  const newDocGradient = isRegional
    ? "#7c3aed"
    : isExecutive
      ? "linear-gradient(135deg, #0077e6 0%, #0056b3 100%)"
      : "linear-gradient(135deg, #059669 0%, #047857 100%)";
  const newDocGlow = isRegional
    ? "0 0 16px rgba(124, 58, 237, 0.55), 0 4px 12px rgba(124, 58, 237, 0.35)"
    : isExecutive
      ? "0 0 16px rgba(0, 119, 230, 0.55), 0 4px 12px rgba(0, 119, 230, 0.35)"
      : "0 0 16px rgba(5, 150, 105, 0.55), 0 4px 12px rgba(5, 150, 105, 0.35)";

  const [search, setSearch] = useState("");
  const [filterPincode, setFilterPincode] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState(null);
  const [successToast, setSuccessToast] = useState("");

  const exec = data.executives.find((e) => e.id === execId) || data.executives[0];

  const myPincodes = useMemo(
    () => new Set(data.coverage.filter((c) => c.executive_id === exec?.id).map((c) => c.pincode)),
    [data.coverage, exec]
  );

  const myDoctors = useMemo(() => {
    if (!data.doctors || data.doctors.length === 0) return [];
    // 1. Doctors matching assigned pincodes
    let list = myPincodes.size > 0 ? data.doctors.filter((d) => myPincodes.has(d.pincode)) : [];
    // 2. If no coverage pincodes assigned or no match, match by executive's territory
    if (list.length === 0 && exec) {
      list = data.doctors.filter((d) => matchesExecutiveTerritory(d, exec, myPincodes));
    }
    // 3. Fallback to all available doctors so executive is never blocked
    if (list.length === 0) {
      list = data.doctors;
    }
    return list;
  }, [data.doctors, myPincodes, exec]);

  const pincodeList = useMemo(
    () => [...new Set(myDoctors.map((d) => d.pincode).filter(Boolean))].sort(),
    [myDoctors]
  );

  const activeCount = myDoctors.filter(
    (d) => d.is_active === "Yes" || d.is_active === true
  ).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return myDoctors.filter((d) => {
      const matchSearch =
        !term ||
        d.name?.toLowerCase().includes(term) ||
        d.qualification?.toLowerCase().includes(term) ||
        d.specializations?.toLowerCase().includes(term) ||
        String(d.experience_years ?? "").includes(term) ||
        d.phone?.toLowerCase().includes(term) ||
        d.city?.toLowerCase().includes(term) ||
        String(d.pincode ?? "").includes(term);
      const matchPin = filterPincode === "all" || String(d.pincode) === filterPincode;
      const isActive = d.is_active === "Yes" || d.is_active === true;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && isActive) ||
        (filterStatus === "inactive" && !isActive);
      return matchSearch && matchPin && matchStatus;
    });
  }, [myDoctors, search, filterPincode, filterStatus]);

  return (
    <div className="doc-view-wrap">

      {/* ── SUCCESS TOAST ── */}
      {successToast && (
        <div className="rpt-submit-toast" style={{ marginBottom: "0.5rem" }}>
          <div className="rpt-submit-toast-icon">✓</div>
          <div>
            <strong>Doctor Added</strong>
            <p>{successToast}</p>
          </div>
          <button className="rpt-call-close" onClick={() => setSuccessToast("")} type="button">✕</button>
        </div>
      )}

      {/* ── PAGE TITLE & + ADD DOCTOR BUTTON ── */}
      <div className="crm-page-title doc-header-row">
        <h2 style={{ margin: 0 }}>Doctors in My Region</h2>
        <button
          type="button"
          className="doc-add-btn"
          onClick={() => setShowAddDoctorModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: newDocGradient,
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            padding: "0.6rem 1.15rem",
            fontWeight: "700",
            fontSize: "0.9rem",
            boxShadow: newDocGlow,
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <span>+ New Doctor</span>
        </button>
      </div>

      {/* ── STAT PILLS ── */}
      <div className="doc-stat-row">
        <div className="doc-stat-card">
          <div className="stat-icon orange">⊞</div>
          <div>
            <span>Pin Codes</span>
            <strong>{myPincodes.size || pincodeList.length}</strong>
            <small>{myPincodes.size > 0 ? "Assigned coverage" : "In my Region"}</small>
          </div>
        </div>
        <div className="doc-stat-card">
          <div className="stat-icon blue">₹</div>
          <div>
            <span>Total Doctors</span>
            <strong>{myDoctors.length}</strong>
            <small>In my Region</small>
          </div>
        </div>
        <div className="doc-stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
            <small>Available for visits</small>
          </div>
        </div>
        <div className="doc-stat-card">
          <div className="stat-icon red">○</div>
          <div>
            <span>Inactive</span>
            <strong>{myDoctors.length - activeCount}</strong>
            <small>Not currently active</small>
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="panel doc-view-filters">
        <div className="rpt-search-wrap" style={{ flex: 1, minWidth: 220 }}>
          <label>Search</label>
          <div className="rpt-search-input-wrap">
            <input
              type="text"
              placeholder="Name, qualification, specialization, experience, phone, city, pin code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="rpt-search-icon"><VscSearch /></span>
          </div>
        </div>
        <div className="rpt-field">
          <label>Pin Code</label>
          <select value={filterPincode} onChange={(e) => setFilterPincode(e.target.value)}>
            <option value="all">All Pin Codes</option>
            {pincodeList.map((pc) => (
              <option key={pc} value={pc}>{pc}</option>
            ))}
          </select>
        </div>
        <div className="rpt-field">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── TABLE ── */}
      {data.loading ? (
        <div className="panel rpt-empty-state">Loading doctors…</div>
      ) : myDoctors.length === 0 ? (
        <div className="panel rpt-empty-state">No doctors found for this executive's region.</div>
      ) : filtered.length === 0 ? (
        <div className="panel rpt-empty-state">No doctors match your search.</div>
      ) : (
        <div className="panel table-panel doc-table-panel">
          <table>
            <thead>
              <tr>
                <th>Sno</th>
                <th>Doctor Name</th>
                <th>Qualification</th>
                <th>Specialization</th>
                <th>Experience</th>
                <th>Phone</th>
                <th>City</th>
                <th>Pin Code</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => {
                const isActive = doc.is_active === "Yes" || doc.is_active === true;
                return (
                  <tr
                    key={doc.id}
                    className="doc-table-row"
                    onClick={() => setSelectedDoctorDetails(doc)}
                    title="Click row to view full doctor details"
                  >
                    <td className="doc-row-num">{i + 1}</td>
                    <td>
                      <div>
                        <span className="doc-name-text">{doc.name || "—"}</span>
                      </div>
                    </td>
                    <td className="doc-muted">{doc.qualification || "—"}</td>
                    <td>
                      {doc.specializations
                        ? doc.specializations.split(",").map((s, si) => (
                          <span key={si} className="rpt-doc-tag" style={{ marginRight: 3, marginBottom: 2, display: "inline-block" }}>
                            {s.trim()}
                          </span>
                        ))
                        : <span className="doc-muted">—</span>
                      }
                    </td>
                    <td className="doc-muted">
                      {doc.experience_years != null ? `${doc.experience_years} yrs` : "—"}
                    </td>
                    <td className="doc-muted">{doc.phone || "—"}</td>
                    <td className="doc-muted">{doc.city || "—"}</td>
                    <td><span className="doc-pincode-badge">{doc.pincode || "—"}</span></td>
                    <td>
                      <span className={"doc-status-badge" + (isActive ? " active" : " inactive")}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="doc-details-view-btn"
                        onClick={() => setSelectedDoctorDetails(doc)}
                        title="View Doctor Details"
                      >
                        <StylizedEyeIcon width={18} height={11} live={true} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* ── ADD DOCTOR MODAL ── */}
      {showAddDoctorModal && (
        <AddDoctorModal
          role={role}
          defaultCity={exec?.city || ""}
          availablePincodes={Array.from(myPincodes)}
          onClose={() => setShowAddDoctorModal(false)}
          onDoctorAdded={async (newDoc) => {
            if (data?.reload) {
              await data.reload();
            }
            setShowAddDoctorModal(false);
            setSuccessToast(`Doctor "${newDoc?.name || "New Doctor"}" submitted for Admin approval! Login credentials created for Doctor Website.`);
            setTimeout(() => setSuccessToast(""), 5000);
          }}
        />
      )}

      {/* ── DOCTOR DETAILS MODAL (Focused details, all background pages blurred) ── */}
      {selectedDoctorDetails && (
        <DoctorDetailsModal
          doctor={selectedDoctorDetails}
          onClose={() => setSelectedDoctorDetails(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PLAN TARGET PANEL
   Shown on both Executive and Team dashboards whenever a
   monthly plan exists for the current period.
───────────────────────────────────────────────────────── */
function PlanTargetPanel({ planStats, monthLabel, onGoToPlan }) {
  const label = monthLabel || PLAN_MONTH_LABEL;
  if (!planStats || !planStats.has_plan) {
    return (
      <div className="panel pln-target-panel pln-target-empty-card">
        <div className="pln-target-header">
          <div>
            <h2 className="pln-target-title">
              Monthly Visit Target — {label}
            </h2>
            <p className="pln-hint">Individual visit target</p>
          </div>
          {onGoToPlan && (
            <button className="rpt-btn-primary pln-target-btn" onClick={onGoToPlan}>
              Create Plan →
            </button>
          )}
        </div>
        <div className="pln-empty-state" style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
          <p className="pln-hint" style={{ margin: "0 0 .75rem" }}>No monthly plan created yet for this month.</p>
          {onGoToPlan && (
            <button className="rpt-btn-outline" onClick={onGoToPlan}>
              Go to Plan Section
            </button>
          )}
        </div>
      </div>
    );
  }

  const {
    total_doctors = 0,
    completed = 0,
    pending = 0,
    planned_visits = 0,
    daily_target = 0,
    working_days = 0,
    completion_pct = 0,
    plan_status = "—",
  } = planStats;

  const statusCls = {
    Approved: "pln-planstatus-approved",
    Submitted: "pln-planstatus-submitted",
    Draft: "pln-planstatus-draft",
    Rejected: "pln-planstatus-rejected",
    "In Progress": "pln-planstatus-in-progress",
    Completed: "pln-planstatus-completed",
  }[plan_status] ?? "pln-planstatus-draft";

  const barColor = completion_pct >= 80
    ? "var(--chart-1)"
    : completion_pct >= 50
      ? "oklch(70% .16 75)"
      : "var(--destructive)";

  return (
    <div className="panel pln-target-panel">
      {/* ── header row ── */}
      <div className="pln-target-header">
        <div>
          <h2 className="pln-target-title">
            Monthly Visit Target — {label}
          </h2>
          <p className="pln-hint">
            {daily_target} doctors/day · {working_days} working days
          </p>
        </div>
        <div className="pln-target-header-right">
          <span className={"pln-planstatus " + statusCls}>{plan_status}</span>
          {onGoToPlan && (
            <button className="rpt-btn-outline pln-target-btn" onClick={onGoToPlan}>
              View Plan
            </button>
          )}
        </div>
      </div>

      {/* ── stat pills ── */}
      <div className="pln-target-pills">
        <div className="pln-target-pill">
          <strong>{total_doctors}</strong>
          <span>Target</span>
        </div>
        <div className="pln-target-pill pln-target-pill-green">
          <strong>{completed}</strong>
          <span>Completed</span>
        </div>
        <div className="pln-target-pill pln-target-pill-orange">
          <strong>{pending}</strong>
          <span>Pending</span>
        </div>
        <div className="pln-target-pill">
          <strong>{planned_visits}</strong>
          <span>Scheduled</span>
        </div>
      </div>

      {/* ── progress bar ── */}
      <div className="pln-target-progress-row">
        <div className="pln-target-progress-track">
          <div
            className="pln-target-progress-fill"
            style={{ width: `${Math.min(100, completion_pct)}%`, background: barColor }}
          />
        </div>
        <span className="pln-target-pct">{completion_pct}%</span>
      </div>
      <p className="pln-hint" style={{ marginTop: 5 }}>
        <strong>{completed}</strong> of <strong>{total_doctors}</strong> doctors
        visited this month
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TEAM PLAN TARGET PANEL (Managers & Regional Managers)
   Shows aggregate visit target + per-employee breakdown
───────────────────────────────────────────────────────── */
function TeamPlanTargetPanel({ execsInScope, monthKey, monthLabel, onGoToPlan, onTeamStatsLoaded, role = null, isRegional = false }) {
  const isReg = role === "regional" || isRegional;
  const isExec = role === "executive";
  const primaryColor = isReg ? "#7c3aed" : isExec ? "#0077e6" : "#059669";
  const badgeShadow = isReg ? "0 2px 6px rgba(124, 58, 237, 0.25)" : isExec ? "0 2px 6px rgba(0, 119, 230, 0.25)" : "0 2px 6px rgba(5, 150, 105, 0.25)";

  const [teamPlans, setTeamPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const activeMonth = monthKey || PLAN_MONTH_KEY;
  const activeMonthLabel = monthLabel || formatMonthLabel(activeMonth);

  useEffect(() => {
    const t = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(t);
  }, [execsInScope, activeMonth]);

  useEffect(() => {
    let cancelled = false;
    if (!execsInScope || execsInScope.length === 0) {
      setTimeout(() => {
        if (!cancelled) {
          setTeamPlans([]);
          setLoading(false);
        }
      }, 0);
      return;
    }
    setTimeout(() => { if (!cancelled) setLoading(true); }, 0);
    Promise.all(
      execsInScope.map(async (exec) => {
        try {
          const res = await fetch(`${API_BASE}/plan-stats/${exec.id}?month_key=${activeMonth}`);
          const stats = await res.json();
          return { exec, stats };
        } catch {
          return {
            exec,
            stats: {
              has_plan: false,
              total_doctors: 0,
              completed: 0,
              pending: 0,
              planned_visits: 0,
              completion_pct: 0,
              plan_status: null,
            },
          };
        }
      })
    ).then((results) => {
      if (!cancelled) {
        setTeamPlans(results);
        setLoading(false);
        if (onTeamStatsLoaded) {
          const tTarget = results.reduce((s, r) => s + (r.stats?.total_doctors || r.stats?.planned_visits || 0), 0);
          const tDone = results.reduce((s, r) => s + (r.stats?.completed || 0), 0);
          const hasAny = results.some((r) => r.stats?.has_plan);
          const pct = tTarget > 0 ? Math.round((tDone / tTarget) * 100) : 0;
          onTeamStatsLoaded({ totalTarget: tTarget, totalDone: tDone, hasAnyPlan: hasAny, pct, results });
        }
      }
    });
    return () => { cancelled = true; };
  }, [execsInScope, activeMonth]); // eslint-disable-line

  const totalTarget = teamPlans.reduce((sum, r) => sum + (r.stats?.total_doctors || r.stats?.planned_visits || 0), 0);
  const totalCompleted = teamPlans.reduce((sum, r) => sum + (r.stats?.completed || 0), 0);
  const totalPending = Math.max(0, totalTarget - totalCompleted);
  const totalScheduled = teamPlans.reduce((sum, r) => sum + (r.stats?.planned_visits || 0), 0);
  const overallPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  const barColor = overallPct >= 80
    ? "var(--chart-1)"
    : overallPct >= 50
      ? "oklch(70% .16 75)"
      : "var(--destructive)";

  const totalExecs = teamPlans.length;
  const effectivePageSize = pageSize === "all" ? Math.max(1, totalExecs) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalExecs / effectivePageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const displayedPlans = useMemo(() => {
    if (pageSize === "all") return teamPlans;
    const start = (validCurrentPage - 1) * effectivePageSize;
    return teamPlans.slice(start, start + effectivePageSize);
  }, [teamPlans, validCurrentPage, effectivePageSize, pageSize]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validCurrentPage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (validCurrentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", validCurrentPage, "...", totalPages];
  }, [validCurrentPage, totalPages]);

  return (
    <div className="panel pln-target-panel">
      {/* ── header row ── */}
      <div className="pln-target-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0, boxShadow: badgeShadow }}>
            <Calendar size={16} color="#ffffff" />
          </div>
          <div>
            <h2 className="pln-target-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              Team Visit Target — {activeMonthLabel}
            </h2>
            <p className="pln-hint" style={{ margin: "3px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
              Overall team target across {execsInScope.length} executive{execsInScope.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="pln-target-header-right">
          {onGoToPlan && (
            <button className="rpt-btn-outline pln-target-btn" onClick={onGoToPlan} style={{ background: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: 8, padding: "5px 14px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", color: "#374151" }}>
              View Plans
            </button>
          )}
        </div>
      </div>

      {/* ── 4 Colored Metric Summary Boxes ── */}
      <div className="pln-target-pills-modern">
        <div className={`pln-target-pill-modern ${isReg ? "purple" : isExec ? "blue" : "mint"}`}>
          <strong>{totalTarget}</strong>
          <span>TARGET</span>
        </div>
        <div className="pln-target-pill-modern green">
          <strong>{totalCompleted}</strong>
          <span>COMPLETED</span>
        </div>
        <div className="pln-target-pill-modern orange">
          <strong>{totalPending}</strong>
          <span>PENDING</span>
        </div>
        <div className="pln-target-pill-modern blue">
          <strong>{totalScheduled}</strong>
          <span>SCHEDULED</span>
        </div>
      </div>

      {/* ── overall progress bar ── */}
      <div className="pln-target-progress-row" style={{ marginTop: "1rem" }}>
        <div className="pln-target-progress-track" style={{ height: 10, borderRadius: 9999, background: "#e2e8f0", overflow: "hidden", flex: 1 }}>
          <div
            className="pln-target-progress-fill"
            style={{ width: `${Math.min(100, overallPct)}%`, height: "100%", background: primaryColor, borderRadius: 9999, transition: "width 0.4s ease" }}
          />
        </div>
        <span className="pln-target-pct" style={{ fontWeight: 700, fontSize: "0.85rem", color: primaryColor }}>{overallPct}%</span>
      </div>
      <p className="pln-hint" style={{ marginTop: 6, fontSize: "0.76rem", color: "#64748b" }}>
        <strong>{totalCompleted}</strong> of <strong>{totalTarget}</strong> team visits completed
      </p>

      {/* ── Employee Breakdown list ── */}
      <div className="pln-team-exec-list">
        <div className="pln-team-list-header">
          <span>Employee / Territory</span>
          <span>Visits (% Done)</span>
          <span>Plan Status</span>
        </div>
        {loading ? (
          <p className="pln-hint" style={{ padding: ".5rem 0" }}>Loading team plan data…</p>
        ) : teamPlans.length === 0 ? (
          <p className="pln-hint" style={{ padding: ".5rem 0" }}>No executives in scope.</p>
        ) : (
          <>
            {displayedPlans.map(({ exec, stats }) => {
              const statusCls = {
                Approved: "pln-planstatus-approved",
                Submitted: "pln-planstatus-submitted",
                Draft: "pln-planstatus-draft",
                Rejected: "pln-planstatus-rejected",
                "In Progress": "pln-planstatus-in-progress",
                Completed: "pln-planstatus-completed",
              }[stats.plan_status] ?? "pln-planstatus-draft";

              return (
                <div key={exec.id} className="pln-team-exec-row">
                  <div className="pln-team-exec-info">
                    <div className="person-avatar">{exec.name?.charAt(0) || "?"}</div>
                    <div>
                      <strong>{exec.name}</strong>
                      <small>{exec.region || exec.city || "—"}</small>
                    </div>
                  </div>
                  <div className="pln-team-exec-stats">
                    <span>
                      <strong>{stats.completed}</strong> / {stats.total_doctors || 0} ({stats.completion_pct}%)
                    </span>
                    <div className="pln-team-exec-bar">
                      <div
                        className="pln-team-exec-fill"
                        style={{
                          width: `${Math.min(100, stats.completion_pct)}%`,
                          background: stats.completion_pct >= 80 ? "var(--chart-1)" : stats.completion_pct >= 50 ? "oklch(70% .16 75)" : "var(--primary)"
                        }}
                      />
                    </div>
                  </div>
                  <div className="pln-team-exec-badge-wrap">
                    {stats.has_plan ? (
                      <span className={"pln-planstatus " + statusCls}>
                        {stats.plan_status}
                      </span>
                    ) : (
                      <span className="doc-status-badge inactive">No Plan</span>
                    )}
                  </div>
                </div>
              );
            })}

            {totalExecs > 0 && (
              <div className="pln-team-pagination-bar">
                <div className="pln-team-page-info">
                  <span>
                    Showing <strong>{(validCurrentPage - 1) * effectivePageSize + 1}</strong>–<strong>{Math.min(validCurrentPage * effectivePageSize, totalExecs)}</strong> of <strong>{totalExecs}</strong>
                  </span>
                  {totalPages > 1 && (
                    <span className="pln-team-page-pill">Page {validCurrentPage} of {totalPages}</span>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="pln-team-page-controls">
                    <button
                      type="button"
                      className="pln-page-nav-btn"
                      disabled={validCurrentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      title="Previous Page"
                    >
                      <ChevronLeft size={13} />
                      <span>Prev</span>
                    </button>

                    <div className="pln-page-numbers">
                      {pageNumbers.map((p, idx) =>
                        p === "..." ? (
                          <span key={`dots-${idx}`} className="pln-page-dots">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`pln-page-num-btn ${validCurrentPage === p ? "active" : ""}`}
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className="pln-page-nav-btn"
                      disabled={validCurrentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      title="Next Page"
                    >
                      <span>Next</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                <div className="pln-team-page-size">
                  <label htmlFor="pln_exec_size">Per page:</label>
                  <select
                    id="pln_exec_size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value === "all" ? "all" : Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value="all">All ({totalExecs})</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   EXECUTIVE DASHBOARD
───────────────────────────────────────────────────────── */
function ExecutiveDashboard({ data, execId, planStats, monthLabel, onGoToPlan, onGoToTasks }) {
  const { executives, coverage, tasks, alerts, doctors, products, reload } = data;
  const exec = executives.find((e) => String(e.id) === String(execId)) || executives[0];
  const myPincodes = useMemo(() => new Set(coverage.filter((c) => c.executive_id === exec?.id).map((c) => c.pincode)), [coverage, exec?.id]);

  const [taskSummary, setTaskSummary] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadSummary = useCallback(async () => {
    if (!exec?.id) return;
    try {
      const res = await fetchExecutiveTaskSummary(exec.id);
      if (res) setTaskSummary(res);
    } catch (err) {
      console.warn("Could not load executive task summary:", err);
    }
  }, [exec?.id]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleQuickStatusUpdate = async (taskId, newStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const payload = {
        status: newStatus,
        progress: newStatus === "completed" ? 100 : newStatus === "in progress" ? 50 : 0,
      };
      await updateExecutiveTask(taskId, payload);
      if (reload) await reload();
      await loadSummary();
    } catch (err) {
      alert("Failed to update task: " + err.message);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleMarkAlert = async (alertId) => {
    try {
      await markAlertRead(alertId);
      if (reload) await reload();
      await loadSummary();
    } catch (err) {
      console.warn("Could not mark alert read:", err);
    }
  };

  // Filter tasks belonging to this executive
  const myTasks = useMemo(() => {
    if (taskSummary?.assigned_tasks && taskSummary.assigned_tasks.length > 0) {
      return taskSummary.assigned_tasks;
    }
    return tasks.filter((t) => {
      if (t.assigned_to_id && String(t.assigned_to_id) === String(exec?.id)) return true;
      if (t.assigned_to_name && exec?.name && String(t.assigned_to_name).toLowerCase() === String(exec.name).toLowerCase()) return true;
      if (!t.assigned_to_id && !t.assigned_to_name && t.pincode && myPincodes.has(t.pincode)) return true;
      return false;
    });
  }, [taskSummary, tasks, exec, myPincodes]);

  const done = myTasks.filter((t) => ["completed", "done"].includes(String(t.status || "").toLowerCase())).length;
  const inProgress = myTasks.filter((t) => String(t.status || "").toLowerCase() === "in progress").length;
  const pending = myTasks.filter((t) => ["pending", "todo"].includes(String(t.status || "").toLowerCase()) || (!["completed", "done", "in progress"].includes(String(t.status || "").toLowerCase()))).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = useMemo(() => {
    if (taskSummary?.overdue_tasks) return taskSummary.overdue_tasks;
    return myTasks.filter((t) => {
      const isDone = ["completed", "done"].includes(String(t.status || "").toLowerCase());
      return !isDone && t.due_date && String(t.due_date).slice(0, 10) < todayStr;
    });
  }, [taskSummary, myTasks, todayStr]);

  const overdueCount = overdueTasks.length;
  const totalAssigned = myTasks.length;
  const completionPct = totalAssigned > 0 ? Math.round((done / totalAssigned) * 100) : 0;

  const upcomingDeadlines = useMemo(() => {
    if (taskSummary?.upcoming_deadlines && taskSummary.upcoming_deadlines.length > 0) {
      return taskSummary.upcoming_deadlines;
    }
    return myTasks
      .filter((t) => !["completed", "done"].includes(String(t.status || "").toLowerCase()) && t.due_date)
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .slice(0, 5);
  }, [taskSummary, myTasks]);

  const myAlerts = useMemo(() => {
    if (taskSummary?.alerts) return taskSummary.alerts;
    return (alerts || []).filter((a) => !a.executive_id || String(a.executive_id) === String(exec?.id));
  }, [taskSummary, alerts, exec?.id]);

  const unreadAlerts = myAlerts.filter((a) => !a.is_read);

  const PRIORITIES = ["low", "medium", "high"];
  const totals = PRIORITIES.map((p) => myTasks.filter((t) => String(t.priority || "").toLowerCase() === p).length);
  const doneByPriority = PRIORITIES.map((p) => myTasks.filter((t) => String(t.priority || "").toLowerCase() === p && ["completed", "done"].includes(String(t.status || "").toLowerCase())).length);

  const pincodeRows = [...myPincodes].map((pc) => ({
    pc,
    doctorCount: doctors.filter((d) => d.pincode === pc).length,
    productCount: products.filter((p) => p.pincode === pc).length,
  }));
  const maxScore = Math.max(1, ...pincodeRows.map((r) => r.doctorCount + r.productCount));
  const topPincodes = [...pincodeRows]
    .sort((a, b) => b.doctorCount + b.productCount - (a.doctorCount + a.productCount))
    .slice(0, 3)
    .map((r) => [r.pc, `${r.doctorCount} doctors · ${r.productCount} products`, `${Math.round(((r.doctorCount + r.productCount) / maxScore) * 100)}%`]);

  const statusRows = [
    ["Open / Pending", pending, totalAssigned ? `${Math.round((pending / totalAssigned) * 100)}%` : "0%"],
    ["In Progress", inProgress, totalAssigned ? `${Math.round((inProgress / totalAssigned) * 100)}%` : "0%"],
    ["Done / Completed", done, totalAssigned ? `${Math.round((done / totalAssigned) * 100)}%` : "0%"],
  ];

  return (
    <>
      {/* ── 1. Overdue Notifications & Alerts Banner ── */}
      {overdueCount > 0 ? (
        <div className="exec-dash-alert-banner overdue">
          <div className="exec-dash-alert-left">
            <div className="exec-dash-alert-icon overdue">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="exec-dash-alert-title">
                Attention: {overdueCount} Overdue Task{overdueCount !== 1 ? "s" : ""} Requiring Action
              </div>
              <div className="exec-dash-alert-desc">
                {overdueTasks.map((t) => `"${t.title}" (Due: ${String(t.due_date).slice(0, 10)})`).slice(0, 2).join("; ")}
                {overdueCount > 2 ? ` and ${overdueCount - 2} more` : ""}
              </div>
            </div>
          </div>
          <button className="exec-dash-alert-btn overdue" onClick={onGoToTasks}>
            Manage Tasks <ArrowRight size={14} />
          </button>
        </div>
      ) : unreadAlerts.length > 0 ? (
        <div className="exec-dash-alert-banner info">
          <div className="exec-dash-alert-left">
            <div className="exec-dash-alert-icon info">
              <Bell size={20} />
            </div>
            <div>
              <div className="exec-dash-alert-title">
                {unreadAlerts.length} New Task Notification{unreadAlerts.length !== 1 ? "s" : ""}
              </div>
              <div className="exec-dash-alert-desc">{unreadAlerts[0]?.message}</div>
            </div>
          </div>
          <button className="exec-dash-alert-btn info" onClick={onGoToTasks} style={{ background: "#0077e6", color: "#fff" }}>
            View Tasks <ArrowRight size={14} />
          </button>
        </div>
      ) : null}

      {/* ── 2. Stat Cards ── */}
      <div className="stats">
        <Stat
          icon="◎"
          title="My Assigned Tasks"
          value={totalAssigned}
          text={`${pending} pending · ${inProgress} in progress`}
          type="blue"
        />
        <Stat
          icon="✓"
          title="Task Completion"
          value={`${completionPct}%`}
          text={`${done} of ${totalAssigned} completed`}
          type="green"
        />
        <Stat
          icon="⏰"
          title="Overdue Tasks"
          value={overdueCount}
          text={overdueCount > 0 ? "Needs immediate action" : "All tasks on schedule"}
          type={overdueCount > 0 ? "red" : "orange"}
        />
        {planStats?.has_plan ? (
          <Stat
            icon="🗓"
            title="Monthly Plan Target"
            value={`${planStats.completion_pct ?? 0}%`}
            text={`${planStats.completed ?? 0} / ${planStats.total_doctors ?? 0} visits`}
            type="orange"
          />
        ) : (
          <Stat
            icon="♙"
            title="Coverage Pin Codes"
            value={myPincodes.size}
            text="Assigned territory"
            type="orange"
          />
        )}
      </div>

      {/* ── 3. Active Assigned Tasks & Upcoming Deadlines Grid ── */}
      <div className="two-columns">
        {/* Panel 1: Assigned Tasks */}
        <div className="panel">
          <div className="exec-task-panel-header">
            <div>
              <h2>Assigned Tasks</h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                Tasks assigned to you by Regional and Sales Managers
              </p>
            </div>
            {onGoToTasks && (
              <button
                type="button"
                className="rpt-btn-outline"
                style={{ fontSize: "11px", padding: "4px 10px" }}
                onClick={onGoToTasks}
              >
                Open Task Manager
              </button>
            )}
          </div>

          {myTasks.length === 0 ? (
            <p style={{ color: "#7f8b98", fontSize: "13px", padding: "16px 0", textAlign: "center" }}>
              No tasks currently assigned to you.
            </p>
          ) : (
            <div className="exec-task-grid">
              {myTasks.slice(0, 4).map((task) => {
                const isOverdue = !["completed", "done"].includes(String(task.status || "").toLowerCase()) && task.due_date && String(task.due_date).slice(0, 10) < todayStr;
                const isCompleted = ["completed", "done"].includes(String(task.status || "").toLowerCase());
                const priorityClass = String(task.priority || "medium").toLowerCase();

                return (
                  <div
                    key={task.id}
                    className={`exec-task-card ${isOverdue ? "is-overdue" : ""} ${isCompleted ? "is-completed" : ""}`}
                  >
                    <div className="exec-task-card-header">
                      <div>
                        <div className="exec-task-card-title">{task.title}</div>
                        <div className="exec-task-card-assigner">
                          Assigned by: <strong>{task.assigned_by_name || "Manager"}</strong> ({task.assigned_by_role || "Sales Manager"})
                        </div>
                      </div>
                      <span className={`exec-task-pill ${priorityClass}`}>
                        {task.priority || "Medium"}
                      </span>
                    </div>

                    {task.description && (
                      <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.35 }}>
                        {task.description}
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div style={{ marginTop: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b", marginBottom: "3px" }}>
                        <span>Progress</span>
                        <strong style={{ color: isCompleted ? "#059669" : "#0f172a" }}>{task.progress || (isCompleted ? 100 : 0)}%</strong>
                      </div>
                      <div style={{ height: "5px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${task.progress || (isCompleted ? 100 : 0)}%`,
                            height: "100%",
                            background: isCompleted ? "#10b981" : "#0d9488",
                            borderRadius: "99px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>

                    <div className="exec-task-card-footer">
                      <div className="exec-task-pills">
                        {task.category && (
                          <span style={{ fontSize: "11px", color: "#64748b", background: "#f8fafc", padding: "1px 6px", borderRadius: "4px" }}>
                            {task.category}
                          </span>
                        )}
                        <span style={{ fontSize: "11px", color: isOverdue ? "#dc2626" : "#64748b", fontWeight: isOverdue ? 700 : 400 }}>
                          Due: {task.due_date ? String(task.due_date).slice(0, 10) : "No deadline"}
                          {isOverdue && " (OVERDUE)"}
                        </span>
                      </div>

                      <div className="exec-task-actions">
                        {!isCompleted ? (
                          <>
                            {task.status !== "in progress" && (
                              <button
                                type="button"
                                className="exec-task-btn-done"
                                style={{ background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }}
                                disabled={updatingTaskId === task.id}
                                onClick={() => handleQuickStatusUpdate(task.id, "in progress")}
                              >
                                Start
                              </button>
                            )}
                            <button
                              type="button"
                              className="exec-task-btn-done"
                              disabled={updatingTaskId === task.id}
                              onClick={() => handleQuickStatusUpdate(task.id, "completed")}
                            >
                              <Check size={12} /> Complete
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2: Upcoming Deadlines & Task Alerts */}
        <div className="panel">
          <div className="exec-task-panel-header">
            <div>
              <h2>Upcoming Deadlines &amp; Alerts</h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                Approaching deadlines and manager notifications
              </p>
            </div>
          </div>

          <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", marginBottom: "8px" }}>
            Deadlines Timeline
          </h3>
          {upcomingDeadlines.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "16px" }}>No upcoming deadlines.</p>
          ) : (
            <div style={{ marginBottom: "16px" }}>
              {upcomingDeadlines.map((t) => {
                const dStr = t.due_date ? String(t.due_date).slice(0, 10) : "";
                const isOverdue = dStr && dStr < todayStr;
                const isToday = dStr === todayStr;
                const badgeClass = isOverdue ? "overdue" : isToday ? "today" : "upcoming";
                const badgeLabel = isOverdue ? "Overdue" : isToday ? "Due Today" : dStr;

                return (
                  <div key={t.id} className="exec-deadline-item">
                    <div className="exec-deadline-info">
                      <div className="exec-deadline-title">{t.title}</div>
                      <div className="exec-deadline-meta">
                        {t.category ? `${t.category} · ` : ""}
                        Assigned by {t.assigned_by_name || "Manager"}
                      </div>
                    </div>
                    <span className={`exec-deadline-badge ${badgeClass}`}>{badgeLabel}</span>
                  </div>
                );
              })}
            </div>
          )}

          <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Task-Related Alerts</span>
            {unreadAlerts.length > 0 && (
              <span style={{ fontSize: "10px", background: "#fef2f2", color: "#dc2626", padding: "1px 6px", borderRadius: "999px", fontWeight: 700 }}>
                {unreadAlerts.length} Unread
              </span>
            )}
          </h3>
          {myAlerts.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "12px" }}>No recent task alerts.</p>
          ) : (
            <div className="exec-alert-feed">
              {myAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`exec-alert-card ${!alert.is_read ? "unread" : ""}`}
                  onClick={() => !alert.is_read && handleMarkAlert(alert.id)}
                  title={!alert.is_read ? "Click to mark as read" : ""}
                  style={{ cursor: !alert.is_read ? "pointer" : "default" }}
                >
                  {!alert.is_read && <div className="exec-alert-dot" />}
                  <div style={{ flex: 1 }}>
                    <div className="exec-alert-msg">{alert.message}</div>
                    <div className="exec-alert-time">
                      {alert.created_at ? new Date(alert.created_at).toLocaleString() : "Recently"}
                      {!alert.is_read && " · Click to mark read"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Charts & Target Panels ── */}
      <div className="two-columns">
        <Chart
          title="My Tasks by Priority"
          categories={["Low", "Medium", "High"]}
          targets={totals}
          achieved={doneByPriority}
          role="executive"
        />
        <PlanTargetPanel planStats={planStats} monthLabel={monthLabel} onGoToPlan={onGoToPlan} />
      </div>

      {/* ── 5. Status Overview & Top Pin Codes ── */}
      <div className="two-columns">
        <Achievement percentage={`${completionPct}%`} achieved={done} progress={inProgress} pending={pending} role="executive" />
        <StatusList title="Task Completion Status" rows={statusRows} />
      </div>

      <div className="two-columns">
        <Performers title="Top Pin Codes in My Territory" people={topPincodes} />
        <UpcomingList
          title="Field Follow-ups & Next Actions"
          rows={myTasks.slice(0, 4).map((t) => [t.title, `pin ${t.pincode || "—"} · ${String(t.priority || "").toUpperCase()}`, t.due_date ? String(t.due_date).slice(0, 10) : "—"])}
        />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   EXECUTIVE PERFORMANCE TABLE (With Pagination Controls)
───────────────────────────────────────────────────────── */
function ExecutivePerformanceTable({ rows, role = null, isRegional = false }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const isReg = role === "regional" || isRegional;
  const isExec = role === "executive";
  const primaryColor = isReg ? "#7c3aed" : isExec ? "#0077e6" : "#059669";
  const badgeShadow = isReg ? "0 2px 6px rgba(124, 58, 237, 0.25)" : isExec ? "0 2px 6px rgba(0, 119, 230, 0.25)" : "0 2px 6px rgba(5, 150, 105, 0.25)";

  // Auto-reset to page 1 whenever row count or region filter changes
  useEffect(() => {
    const t = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(t);
  }, [rows.length]);

  const displayedRows = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, validPage, pageSize]);

  return (
    <div className="panel table-panel">
      <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: badgeShadow }}>
            <Users size={16} color="#ffffff" />
          </div>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Executive Performance</h2>
        </div>
        {totalRecords > 0 && (
          <span className="pln-team-page-pill" style={{ fontSize: "0.7rem" }}>
            {totalRecords} Executive{totalRecords !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th>Executive</th>
            <th>Target Visits</th>
            <th>Done</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {displayedRows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ color: "#7f8b98", textAlign: "center", padding: "1.5rem" }}>
                No executives found in this region
              </td>
            </tr>
          ) : (
            displayedRows.map((row, i) => {
              const pctVal = parseInt(row[3]) || 0;
              const barColor = pctVal >= 70 ? primaryColor : pctVal >= 40 ? "#f59e0b" : "#94a3b8";
              return (
                <tr key={i}>
                  <td><strong>{row[0]}</strong></td>
                  <td>{row[1]}</td>
                  <td><span style={{ color: primaryColor, fontWeight: 700 }}>{row[2]}</span></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ flex: 1, height: "6px", background: "var(--secondary, #f1f5f9)", borderRadius: "99px", overflow: "hidden", minWidth: "40px" }}>
                        <div style={{ width: `${Math.min(100, pctVal)}%`, height: "100%", background: barColor, borderRadius: "inherit" }} />
                      </div>
                      <span style={{ fontWeight: 700, minWidth: "34px", fontSize: "0.75rem" }}>{row[3]}</span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pln-team-pagination-bar" style={{ marginTop: "0.5rem" }}>
          <div className="pln-team-page-info">
            <span>
              Showing <strong>{(validPage - 1) * pageSize + 1}</strong>–<strong>{Math.min(validPage * pageSize, totalRecords)}</strong> of <strong>{totalRecords}</strong>
            </span>
            <span className="pln-team-page-pill">Page {validPage} of {totalPages}</span>
          </div>

          <div className="pln-team-page-controls">
            <button
              type="button"
              className="pln-page-nav-btn"
              disabled={validPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={13} />
              <span>Prev</span>
            </button>

            <div className="pln-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`pln-page-num-btn ${validPage === p ? "active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pln-page-nav-btn"
              disabled={validPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TEAM DASHBOARD (Managers & Regional Managers)
───────────────────────────────────────────────────────── */
function TeamDashboard({
  data,
  role,
  managerId,
  regionalId,
  currentRecord,
  region,
  scopeLabel,
  monthKey,
  monthLabel,
  onGoToPlan,
  onGoToTasks,
  onGoToAttendanceReport,
}) {
  const { executives, doctors } = data;

  const normalizeReg = (r) => (r || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

  const isRegional = role === "regional";
  const [selectedTerritory, setSelectedTerritory] = useState("");

  // Available unique regions across executives and managers
  const availableRegions = useMemo(() => {
    const set = new Set();
    (data.executives || []).forEach((e) => {
      if (e.region && e.region.trim()) set.add(e.region.trim());
    });
    (data.salesManagers || []).forEach((m) => {
      if (m.region && m.region.trim()) set.add(m.region.trim());
    });
    return Array.from(set).sort();
  }, [data.executives, data.salesManagers]);

  const effectiveRegion = selectedTerritory || region || "";

  const execsInScope = useMemo(() => {
    if (!effectiveRegion) return executives;
    const rNorm = normalizeReg(effectiveRegion);
    return executives.filter((e) => normalizeReg(e.region) === rNorm);
  }, [executives, effectiveRegion]);

  const salesManagersInScope = useMemo(() => {
    const mgrs = data.salesManagers || [];
    if (!effectiveRegion) return mgrs;
    const rNorm = normalizeReg(effectiveRegion);
    return mgrs.filter((m) => normalizeReg(m.region) === rNorm);
  }, [data.salesManagers, effectiveRegion]);

  const [teamStatsSummary, setTeamStatsSummary] = useState(null);

  // Derived metrics from actual team plans loaded in TeamPlanTargetPanel
  const totalPlannedVisits = teamStatsSummary?.totalTarget || 0;
  const totalDoneVisits = teamStatsSummary?.totalDone || 0;
  const totalPendingVisits = Math.max(0, totalPlannedVisits - totalDoneVisits);
  const totalInProgress = useMemo(() => {
    if (!teamStatsSummary?.results) return 0;
    return teamStatsSummary.results.filter(
      (r) => (parseInt(r.stats?.completion_pct) || 0) > 0 && (parseInt(r.stats?.completion_pct) || 0) < 100
    ).length;
  }, [teamStatsSummary]);
  const overallPct = teamStatsSummary?.pct || 0;

  // Real rows for Executive Performance Table
  const performanceRows = useMemo(() => {
    if (teamStatsSummary?.results && teamStatsSummary.results.length > 0) {
      return teamStatsSummary.results.map((r) => [
        r.exec.name,
        r.stats?.total_doctors || r.stats?.planned_visits || 0,
        r.stats?.completed || 0,
        `${r.stats?.completion_pct ?? 0}%`,
      ]);
    }
    return execsInScope.map((exec) => [exec.name, 0, 0, "0%"]);
  }, [teamStatsSummary, execsInScope]);

  // Chart data from actual loaded executive stats
  const chartData = useMemo(() => {
    const list = teamStatsSummary?.results || [];
    const slice = list.slice(0, 6);
    return {
      categories: slice.length ? slice.map((r) => r.exec.name) : (execsInScope.slice(0, 6).map((e) => e.name) || ["—"]),
      targets: slice.length ? slice.map((r) => r.stats?.total_doctors || r.stats?.planned_visits || 0) : [0],
      achieved: slice.length ? slice.map((r) => r.stats?.completed || 0) : [0],
    };
  }, [teamStatsSummary, execsInScope]);

  // ---------------------------------------------------------
  // TASK MANAGEMENT & EMPLOYEE PERFORMANCE ANALYTICS
  // ---------------------------------------------------------
  const [taskAnalytics, setTaskAnalytics] = useState(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskPerfSearch, setTaskPerfSearch] = useState("");

  // Assign Task Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetEmployee, setAssignTargetEmployee] = useState(null);
  const [assignSuccessToast, setAssignSuccessToast] = useState("");

  const handleOpenAssignModal = (emp = null) => {
    if (emp) {
      const isMgr = String(emp.role || "").toLowerCase().includes("manager");
      setAssignTargetEmployee({
        id: emp.id || emp.employee_id,
        role: isMgr ? "manager" : "executive",
        name: emp.name,
      });
    } else {
      setAssignTargetEmployee(null);
    }
    setIsAssignModalOpen(true);
  };

  const handleTaskCreated = (newTask) => {
    loadTaskData();
    data.reload?.();
    const name = newTask?.assigned_to_name || "Employee";
    setAssignSuccessToast(`Task "${newTask?.title || "New Task"}" successfully assigned to ${name}! Pincode auto-linked to Pin Code Coverage.`);
    setTimeout(() => setAssignSuccessToast(""), 6000);
  };

  const effectiveUserId = useMemo(() => {
    if (role === "regional") return regionalId || currentRecord?.id || null;
    return managerId || currentRecord?.id || null;
  }, [role, regionalId, managerId, currentRecord]);

  const loadTaskData = useCallback(() => {
    setTaskLoading(true);
    fetchTaskAnalytics({
      role: role || (regionalId ? "regional" : "manager"),
      user_id: effectiveUserId,
      region: effectiveRegion || currentRecord?.region || null,
    })
      .then((res) => {
        setTaskAnalytics(res);
        setTaskLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load task analytics:", err);
        setTaskLoading(false);
      });
  }, [role, effectiveUserId, effectiveRegion, currentRecord, regionalId]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  // Filtered employee performance records
  const filteredEmployeePerf = useMemo(() => {
    const list = taskAnalytics?.employee_performance || [];
    if (!taskPerfSearch.trim()) return list;
    const q = taskPerfSearch.toLowerCase();
    return list.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.code && emp.code.toLowerCase().includes(q)) ||
        (emp.role && emp.role.toLowerCase().includes(q)) ||
        (emp.region && emp.region.toLowerCase().includes(q))
    );
  }, [taskAnalytics, taskPerfSearch]);

  // Strict 5 data per page pagination
  const [perfCurrentPage, setPerfCurrentPage] = useState(1);
  const PERF_PAGE_SIZE = 5;

  useEffect(() => {
    setPerfCurrentPage(1);
  }, [taskPerfSearch, filteredEmployeePerf.length]);

  const totalPerfPages = Math.max(1, Math.ceil(filteredEmployeePerf.length / PERF_PAGE_SIZE));
  const validPerfPage = Math.min(perfCurrentPage, totalPerfPages);

  const displayedEmployeePerf = useMemo(() => {
    const start = (validPerfPage - 1) * PERF_PAGE_SIZE;
    return filteredEmployeePerf.slice(start, start + PERF_PAGE_SIZE);
  }, [filteredEmployeePerf, validPerfPage, PERF_PAGE_SIZE]);

  function handleExportPerfCSV() {
    const list = taskAnalytics?.employee_performance || [];
    const headers = [
      "Employee Name",
      "Code",
      "Role",
      "Region",
      "Total Assigned",
      "Completed",
      "Pending",
      "Overdue",
      "Completion Rate",
      "Performance Badge",
    ];
    const rows = list.map((emp) => [
      `"${emp.name || ""}"`,
      `"${emp.code || ""}"`,
      `"${emp.role || ""}"`,
      `"${emp.region || ""}"`,
      emp.total_assigned || 0,
      emp.completed || 0,
      emp.pending || 0,
      emp.overdue || 0,
      `"${emp.completion_rate || 0}%"`,
      `"${emp.performance_badge || "N/A"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${role === "regional" ? "regional-manager" : "sales-manager"}-employee-task-performance.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Pre-computed graph data
  const totalTasks = taskAnalytics?.total_assigned || 0;
  const statusItems = [
    { label: "Completed", count: taskAnalytics?.completed_tasks || 0, color: "#10b981" },
    { label: "In Progress", count: taskAnalytics?.in_progress_tasks || 0, color: "#3b82f6" },
    { label: "Pending", count: taskAnalytics?.pending_tasks || 0, color: "#f59e0b" },
    { label: "Overdue", count: taskAnalytics?.overdue_tasks || 0, color: "#ef4444" },
  ];

  const priorityItems = [
    { label: "Urgent", count: taskAnalytics?.priority_breakdown?.Urgent || 0, color: "#dc2626" },
    { label: "High", count: taskAnalytics?.priority_breakdown?.High || 0, color: "#f97316" },
    { label: "Medium", count: taskAnalytics?.priority_breakdown?.Medium || 0, color: "#2563eb" },
    { label: "Low", count: taskAnalytics?.priority_breakdown?.Low || 0, color: "#64748b" },
  ];

  const roleItems = Object.entries(taskAnalytics?.role_breakdown || {}).map(([rLabel, rCount], idx) => ({
    label: rLabel,
    count: rCount,
    color: idx === 0 ? (isRegional ? "#7c3aed" : "#059669") : (isRegional ? "#a855f7" : "#34d399"),
  }));

  const overdueCount = taskAnalytics?.overdue_tasks || 0;

  return (
    <>
      {/* ── SUCCESS NOTIFICATION TOAST ── */}
      {assignSuccessToast && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", padding: "0.85rem 1.25rem", borderRadius: "10px", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600, boxShadow: "0 4px 12px rgba(22, 101, 52, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>{assignSuccessToast}</span>
          </div>
          <button type="button" onClick={() => setAssignSuccessToast("")} style={{ border: "none", background: "transparent", color: "#166534", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ── UNIQUE COMMAND CENTER HERO BANNER ── */}
      <div className={`team-cmd-hero ${isRegional ? "regional" : "manager"}`}>
        <div className="team-cmd-hero-inner">
          <div className="team-cmd-header-row">
            <div className="team-cmd-title-group">
              <div className="team-cmd-badge-icon">
                <Target size={24} color="#ffffff" strokeWidth={2.5} />
              </div>
              <div>
                <h2>
                  {isRegional ? "Regional Command Center" : "Territory Operations Command"}
                </h2>
                <p>
                  {isRegional
                    ? `Strategic Command & Territory Performance • Overseeing ${availableRegions.length || 2} Active Territories across South India`
                    : `Territory Management & Field Operations • Assigned Region: ${currentRecord?.region || region || "Karnataka"}`}
                </p>
              </div>
            </div>

            {/* Quick Command Actions */}
            <div className="team-cmd-actions">
              <button
                type="button"
                className="team-cmd-btn primary emerald"
                onClick={() => handleOpenAssignModal(null)}
                title="Open modern Task Assignment dialog"
              >
                <Plus size={16} />
                Assign New Task
              </button>
              {onGoToAttendanceReport && (
                <button
                  type="button"
                  className="team-cmd-btn glass"
                  onClick={onGoToAttendanceReport}
                  title="View live team punch-in and attendance history"
                >
                  <UserCheck size={15} />
                  Attendance Report
                </button>
              )}
              {onGoToPlan && (
                <button
                  type="button"
                  className="team-cmd-btn glass"
                  onClick={onGoToPlan}
                  title="Review monthly doctor visit plans and approvals"
                >
                  <ClipboardCheck size={15} />
                  Plan Approvals
                </button>
              )}
              {onGoToTasks && (
                <button
                  type="button"
                  className="team-cmd-btn glass"
                  onClick={onGoToTasks}
                  title="Open interactive Kanban task board"
                >
                  <CheckSquare size={15} />
                  Task Board
                </button>
              )}
            </div>

          </div>

          {/* 4 Quick Stat Metric Boxes inside Hero */}
          <div className="team-cmd-stats-row">
            <div className="team-cmd-stat-box">
              <div className="team-cmd-stat-top">
                <div className="team-cmd-stat-icon-wrap mint">
                  <Users size={16} color="#016b5a" />
                </div>
                <span>Sales Managers</span>
              </div>
              <div className="team-cmd-stat-val">{salesManagersInScope.length || 2}</div>
              <div className="team-cmd-stat-sub">
                {effectiveRegion ? `In ${effectiveRegion}` : "Territory Managers"}
              </div>
              <div className="team-cmd-stat-trend up">
                <span>↑ 1 vs last month</span>
              </div>
            </div>

            <div className="team-cmd-stat-box">
              <div className="team-cmd-stat-top">
                <div className="team-cmd-stat-icon-wrap mint">
                  <User size={16} color="#016b5a" />
                </div>
                <span>Field Executives</span>
              </div>
              <div className="team-cmd-stat-val">{execsInScope.length}</div>
              <div className="team-cmd-stat-sub">Active field workforce</div>
              <div className="team-cmd-stat-trend up">
                <span>↑ 1 vs last month</span>
              </div>
            </div>

            <div className="team-cmd-stat-box">
              <div className="team-cmd-stat-top">
                <div className="team-cmd-stat-icon-wrap mint">
                  <Stethoscope size={16} color="#016b5a" />
                </div>
                <span>Doctor Network</span>
              </div>
              <div className="team-cmd-stat-val">{doctors.length}</div>
              <div className="team-cmd-stat-sub">Clinics &amp; hospitals enrolled</div>
              <div className="team-cmd-stat-trend neutral">
                <span>→ 0 vs last month</span>
              </div>
            </div>

            <div className="team-cmd-stat-box">
              <div className="team-cmd-stat-top">
                <div className="team-cmd-stat-icon-wrap amber">
                  <Package size={16} color="#d97706" />
                </div>
                <span>Plan Delivery</span>
              </div>
              <div className="team-cmd-stat-val" style={{ color: "#059669" }}>{overallPct}%</div>
              <div className="team-cmd-stat-sub">{totalDoneVisits} / {totalPlannedVisits} visits done</div>
              <div className="team-cmd-stat-trend up">
                <span>↑ 5% vs last month</span>
              </div>
            </div>
          </div>

          {/* Territory Filter Pills for Regional Manager */}
          {isRegional && availableRegions.length > 0 && (
            <div className="team-cmd-territory-bar">
              <span className="team-cmd-territory-label">
                <MapPin size={13} />
                Filter Territory:
              </span>
              <button
                type="button"
                className={`team-cmd-territory-pill ${!selectedTerritory ? "active" : ""}`}
                onClick={() => setSelectedTerritory("")}
              >
                All Territories ({executives.length} execs)
              </button>
              {availableRegions.map((reg) => {
                const count = executives.filter((e) => normalizeReg(e.region) === normalizeReg(reg)).length;
                return (
                  <button
                    key={reg}
                    type="button"
                    className={`team-cmd-territory-pill ${selectedTerritory === reg ? "active" : ""}`}
                    onClick={() => setSelectedTerritory(reg === selectedTerritory ? "" : reg)}
                  >
                    {reg} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 1. Territory & Visit Stats ── */}
      <div className="stats stats-modern-row">
        <div className="stat-card modern">
          <div className="stat-icon-modern teal">
            <Users size={18} />
          </div>
          <div>
            <span className="stat-label-modern">FIELD WORKFORCE</span>
            <strong className="stat-val-modern">{execsInScope.length}</strong>
            <small className="stat-sub-modern">{scopeLabel}</small>
          </div>
        </div>

        <div className="stat-card modern">
          <div className="stat-icon-modern mint">
            <Calendar size={18} />
          </div>
          <div>
            <span className="stat-label-modern">TOTAL PLAN VISITS</span>
            <strong className="stat-val-modern">{totalPlannedVisits}</strong>
            <small className="stat-sub-modern">{monthLabel || "October 2026"}</small>
          </div>
        </div>

        <div className="stat-card modern">
          <div className="stat-icon-modern orange">
            <Target size={18} />
          </div>
          <div>
            <span className="stat-label-modern">TEAM PLAN COMPLETION</span>
            <strong className="stat-val-modern">{overallPct}%</strong>
            <small className="stat-sub-modern">{totalDoneVisits} / {totalPlannedVisits} visits</small>
          </div>
        </div>

        <div className="stat-card modern">
          <div className="stat-icon-modern green">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="stat-label-modern">VISIT COMPLETION</span>
            <strong className="stat-val-modern">{overallPct}%</strong>
            <small className="stat-sub-modern">{totalDoneVisits} completed</small>
          </div>
        </div>
      </div>

      {/* ── 2. Team Target vs Achievement side-by-side with Team Plan Target Panel ── */}
      <div className="two-columns">
        <Chart
          title="Team Target vs Achievement"
          categories={chartData.categories}
          targets={chartData.targets}
          achieved={chartData.achieved}
          execResults={teamStatsSummary?.results}
          totalTarget={totalPlannedVisits}
          totalAchieved={totalDoneVisits}
          role={isRegional ? "regional" : "manager"}
          isRegional={isRegional}
        />
        <TeamPlanTargetPanel
          execsInScope={execsInScope}
          monthKey={monthKey}
          monthLabel={monthLabel}
          onGoToPlan={onGoToPlan}
          onTeamStatsLoaded={setTeamStatsSummary}
          role={isRegional ? "regional" : "manager"}
          isRegional={isRegional}
        />
      </div>

      <div className="two-columns">
        <Achievement
          percentage={`${overallPct}%`}
          achieved={totalDoneVisits}
          progress={totalInProgress}
          pending={totalPendingVisits}
          role={isRegional ? "regional" : "manager"}
          isRegional={isRegional}
        />
        <ExecutivePerformanceTable rows={performanceRows} role={isRegional ? "regional" : "manager"} isRegional={isRegional} />
      </div>

      {/* ── 3. TASK MANAGEMENT & EMPLOYEE PERFORMANCE SECTION ── */}
      <section className="team-task-section">
        <div className="team-task-header">
          <div className="team-task-header-left" style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: isRegional ? "#7c3aed" : "#059669", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0, boxShadow: isRegional ? "0 2px 8px rgba(124, 58, 237, 0.25)" : "0 2px 8px rgba(5, 150, 105, 0.25)" }}>
              <CheckSquare size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                Task Management &amp; Employee Performance
              </h2>
              <p style={{ margin: "4px 0 0 0" }}>
                {isRegional
                  ? "Live overview of tasks assigned across Sales Managers & Executives, overdue tasks, and employee performance"
                  : "Live overview of tasks assigned to your Sales Executives, completion status, and performance metrics"}
              </p>
            </div>
          </div>
          <div className="team-task-header-actions">
            <button
              type="button"
              className="team-task-btn outline"
              onClick={onGoToTasks}
              title="Open full interactive task board"
            >
              <CheckSquare size={14} />
              Open Task Board
            </button>
            <button
              type="button"
              className="team-task-btn primary"
              onClick={() => handleOpenAssignModal(null)}
              title="Assign task to an employee"
              style={{
                background: isRegional ? "#7c3aed" : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                boxShadow: isRegional
                  ? "0 0 14px rgba(124, 58, 237, 0.55), 0 4px 10px rgba(124, 58, 237, 0.35)"
                  : "0 0 14px rgba(5, 150, 105, 0.55), 0 4px 10px rgba(5, 150, 105, 0.35)",
              }}
            >
              <Plus size={14} />
              Assign New Task
            </button>
          </div>
        </div>

        {/* 5 KPI Summary Cards */}
        <div className="team-task-stats">
          {/* Card 1: Total Assigned */}
          <div className="team-task-stat-card blue">
            <div className="team-task-stat-top">
              <span className="team-task-stat-label">Total Assigned</span>
              <div className="team-task-stat-icon">
                <CheckSquare size={16} />
              </div>
            </div>
            <div className="team-task-stat-value">
              {taskLoading ? "..." : taskAnalytics?.total_assigned ?? 0}
            </div>
            <div className="team-task-stat-sub">
              {isRegional ? "Across all managers & executives" : "Assigned to your executives"}
            </div>
          </div>

          {/* Card 2: Completed % */}
          <div className="team-task-stat-card green">
            <div className="team-task-stat-top">
              <span className="team-task-stat-label">Completion Status</span>
              <div className="team-task-stat-icon">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="team-task-stat-value" style={{ color: "#059669" }}>
              {taskLoading ? "..." : `${taskAnalytics?.completion_rate ?? 0}%`}
            </div>
            <div className="team-task-stat-sub">
              <strong>{taskAnalytics?.completed_tasks ?? 0}</strong> tasks completed
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div className="team-task-stat-card in-progress">
            <div className="team-task-stat-top">
              <span className="team-task-stat-label">In Progress</span>
              <div className="team-task-stat-icon">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="team-task-stat-value" style={{ color: "#0d9488" }}>
              {taskLoading ? "..." : taskAnalytics?.in_progress_tasks ?? 0}
            </div>
            <div className="team-task-stat-sub">Actively being worked on</div>
          </div>

          {/* Card 4: Pending Tasks */}
          <div className="team-task-stat-card orange">
            <div className="team-task-stat-top">
              <span className="team-task-stat-label">Pending Tasks</span>
              <div className="team-task-stat-icon">
                <Clock size={16} />
              </div>
            </div>
            <div className="team-task-stat-value" style={{ color: "#d97706" }}>
              {taskLoading ? "..." : taskAnalytics?.pending_tasks ?? 0}
            </div>
            <div className="team-task-stat-sub">Awaiting executive start</div>
          </div>

          {/* Card 5: Overdue Tasks */}
          <div className={`team-task-stat-card red ${overdueCount > 0 ? "overdue-active" : ""}`}>
            <div className="team-task-stat-top">
              <span className="team-task-stat-label">Overdue Tasks</span>
              <div className="team-task-stat-icon">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="team-task-stat-value" style={{ color: overdueCount > 0 ? "#dc2626" : "var(--foreground)" }}>
              {taskLoading ? "..." : overdueCount}
            </div>
            <div className="team-task-stat-sub" style={{ color: overdueCount > 0 ? "#dc2626" : "var(--muted-foreground)" }}>
              {overdueCount > 0 ? "⚠️ Action required immediately" : "Zero overdue tasks"}
            </div>
          </div>
        </div>

        {/* Analytical Graphs Grid */}
        <div className="team-task-graphs">
          {/* Graph 1: Task Completion & Status Breakdown */}
          <div className="team-task-graph-panel">
            <div className="panel-header">
              <div>
                <h3>Task Status Breakdown</h3>
                <span className="graph-sub">Distribution of tasks by current progress state</span>
              </div>
            </div>
            <div className="team-task-bar-list">
              {statusItems.map((item) => {
                const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                return (
                  <div key={item.label} className="team-task-bar-item">
                    <div className="team-task-bar-meta">
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                        {item.label}
                      </span>
                      <span>
                        <strong>{item.count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="team-task-bar-track">
                      <div className="team-task-bar-fill" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graph 2: Task Priority Distribution */}
          <div className="team-task-graph-panel">
            <div className="panel-header">
              <div>
                <h3>Priority Distribution</h3>
                <span className="graph-sub">Allocation by urgency and delivery priority</span>
              </div>
            </div>
            <div className="team-task-bar-list">
              {priorityItems.map((item) => {
                const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                return (
                  <div key={item.label} className="team-task-bar-item">
                    <div className="team-task-bar-meta">
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                        {item.label} Priority
                      </span>
                      <span>
                        <strong>{item.count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="team-task-bar-track">
                      <div className="team-task-bar-fill" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graph 3: Role / Team Task Distribution */}
          <div className="team-task-graph-panel">
            <div className="panel-header">
              <div>
                <h3>{isRegional ? "Task Role Allocation" : "Team Performance Summary"}</h3>
                <span className="graph-sub">
                  {isRegional ? "Tasks assigned to Sales Managers vs Executives" : "Overall completion health"}
                </span>
              </div>
            </div>
            <div className="team-task-bar-list">
              {roleItems.length === 0 ? (
                <p style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>No role data available.</p>
              ) : (
                roleItems.map((item) => {
                  const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                  return (
                    <div key={item.label} className="team-task-bar-item">
                      <div className="team-task-bar-meta">
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                          {item.label}
                        </span>
                        <span>
                          <strong>{item.count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="team-task-bar-track">
                        <div className="team-task-bar-fill" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Employee Performance Data Leaderboard Table ── */}
        <div className="team-task-perf-panel">
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3>Employee Performance &amp; Task Completion</h3>
              <span className="graph-sub">
                {isRegional
                  ? "Live task performance data for Sales Managers and Sales Executives"
                  : "Live task performance data for your Sales Executives"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="text"
                placeholder="Search employee..."
                value={taskPerfSearch}
                onChange={(e) => setTaskPerfSearch(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                className="team-task-btn outline"
                onClick={handleExportPerfCSV}
                title="Export employee performance data to CSV"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>
          </div>

          <div className="team-task-perf-table-wrap">
            <table className="team-task-perf-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Region</th>
                  <th style={{ textAlign: "center" }}>Assigned</th>
                  <th style={{ textAlign: "center" }}>Completed</th>
                  <th style={{ textAlign: "center" }}>Pending</th>
                  <th style={{ textAlign: "center" }}>Overdue</th>
                  <th>Completion Rate</th>
                  <th>Status Badge</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedEmployeePerf.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", color: "var(--muted-foreground)", padding: "24px" }}>
                      {taskLoading ? "Loading employee task performance..." : "No employee task performance records found."}
                    </td>
                  </tr>
                ) : (
                  displayedEmployeePerf.map((emp) => {
                    const badgeClass =
                      emp.performance_badge === "Top Performer"
                        ? "top"
                        : emp.performance_badge === "On Track"
                          ? "ontrack"
                          : "attention";

                    const roleClass = String(emp.role).toLowerCase().includes("manager") ? "manager" : "executive";
                    const progColor =
                      emp.completion_rate >= 75 ? "#10b981" : emp.completion_rate >= 40 ? "#3b82f6" : "#f59e0b";

                    return (
                      <tr key={emp.id || emp.code}>
                        <td>
                          <div className="team-perf-emp-cell">
                            <div className="team-perf-avatar">
                              {emp.name ? emp.name.charAt(0).toUpperCase() : "E"}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{emp.name}</div>
                              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{emp.code}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`team-perf-role-badge ${roleClass}`}>{emp.role}</span>
                        </td>
                        <td>{emp.region || "All Territories"}</td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{emp.total_assigned}</td>
                        <td style={{ textAlign: "center", color: "#059669", fontWeight: 700 }}>{emp.completed}</td>
                        <td style={{ textAlign: "center", color: "#d97706" }}>{emp.pending}</td>
                        <td
                          style={{
                            textAlign: "center",
                            color: emp.overdue > 0 ? "#dc2626" : "var(--muted-foreground)",
                            fontWeight: emp.overdue > 0 ? 800 : 400,
                          }}
                        >
                          {emp.overdue > 0 ? `⚠️ ${emp.overdue}` : 0}
                        </td>
                        <td>
                          <div className="team-perf-prog">
                            <div className="team-perf-prog-track">
                              <div
                                className="team-perf-prog-fill"
                                style={{ width: `${emp.completion_rate}%`, background: progColor }}
                              />
                            </div>
                            <span style={{ fontSize: "11px", fontWeight: 700, minWidth: "32px" }}>
                              {emp.completion_rate}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`team-perf-badge ${badgeClass}`}>
                            {emp.performance_badge === "Top Performer" && <Award size={12} />}
                            {emp.performance_badge === "On Track" && <CheckCircle2 size={12} />}
                            {emp.performance_badge === "Needs Attention" && <ShieldAlert size={12} />}
                            {emp.performance_badge}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="team-task-btn primary team-perf-assign-btn"
                            style={{
                              padding: "6px 14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              borderRadius: "8px",
                              background: isRegional
                                ? "#7c3aed"
                                : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                              color: "#ffffff",
                              border: "none",
                              boxShadow: isRegional
                                ? "0 0 14px rgba(124, 58, 237, 0.55), 0 2px 8px rgba(124, 58, 237, 0.35)"
                                : "0 0 14px rgba(5, 150, 105, 0.55), 0 2px 8px rgba(5, 150, 105, 0.35)",
                              cursor: "pointer",
                            }}
                            onClick={() => handleOpenAssignModal(emp)}
                            title={`Assign or manage tasks for ${emp.name}`}
                          >
                            Assign Task
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Strict 5 data per page pagination controls ── */}
          <div className="team-task-perf-pagination">
            <div className="perf-pagination-info">
              Showing <strong>{filteredEmployeePerf.length === 0 ? 0 : (validPerfPage - 1) * PERF_PAGE_SIZE + 1}</strong> to{" "}
              <strong>{Math.min(validPerfPage * PERF_PAGE_SIZE, filteredEmployeePerf.length)}</strong> of{" "}
              <strong>{filteredEmployeePerf.length}</strong> employees
            </div>
            {totalPerfPages > 1 && (
              <div className="perf-pagination-actions">
                <button
                  type="button"
                  className="perf-page-btn nav-btn"
                  onClick={() => setPerfCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPerfPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>
                {Array.from({ length: totalPerfPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`perf-page-btn num-btn ${pageNum === validPerfPage ? "active" : ""}`}
                    onClick={() => setPerfCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="perf-page-btn nav-btn"
                  onClick={() => setPerfCurrentPage((p) => Math.min(totalPerfPages, p + 1))}
                  disabled={validPerfPage === totalPerfPages}
                  title="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── MODULAR MODERN ASSIGN TASK MODAL ── */}
      <AssignTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignTargetEmployee(null);
        }}
        onTaskCreated={handleTaskCreated}
        role={role}
        currentRecord={currentRecord}
        teamMembers={{
          executives: data.executives || [],
          managers: data.salesManagers || [],
          doctors: data.doctors || [],
          coverage: data.coverage || [],
        }}
        initialAssigneeId={assignTargetEmployee?.id || null}
        initialAssigneeRole={assignTargetEmployee?.role || "executive"}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   SHELL
───────────────────────────────────────────────────────── */
const ROLES = {
  EXECUTIVE: "executive",
  MANAGER: "manager",
  REGIONAL: "regional",
};

const ROLE_TITLES = {
  executive: "Sales Executive",
  manager: "Sales Manager",
  regional: "Regional Manager",
};

const SECTION_TITLES = {
  attendance: "Attendance & Shift Punch",
  attendance_report: "Attendance Report",
  dashboard: "Dashboard",
  doctors: "Doctors",
  plan: "Plan",
  approvals: "Plan Approvals",
  reports: "Reports",
  tasks: "Task Management",
};

export default function SalesCrm({ role, initialUser, onSwitchRole, onExit }) {
  const data = useSalesData();
  const [execId, setExecId] = useState(() => {
    if (initialUser?.id) return initialUser.id;
    try {
      const prefId = localStorage.getItem("zippy_crm_preferred_exec_id");
      if (prefId) return Number(prefId);
      const authStr = localStorage.getItem("zippy_crm_active_auth");
      if (authStr) {
        const auth = JSON.parse(authStr);
        if (auth?.role === "executive" && auth?.user?.id) {
          return auth.user.id;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  });
  const [managerId, setManagerId] = useState(() => {
    if (role === "manager" && initialUser?.id) return initialUser.id;
    return null;
  });
  const [regionalId, setRegionalId] = useState(() => {
    if (role === "regional" && initialUser?.id) return initialUser.id;
    return null;
  });
  const [region, setRegion] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginModal, setLoginModal] = useState({ isOpen: false, role: "executive" });
  const [planInitialTab, setPlanInitialTab] = useState(null);
  const [activeSection, setActiveSection] = useState(() => {
    try {
      const hash = window.location.hash.replace("#", "");
      if (["attendance", "attendance_report", "dashboard", "doctors", "plan", "approvals", "reports", "tasks"].includes(hash)) {
        if (role === ROLES.EXECUTIVE && hash === "tasks") {
          return "plan";
        }
        // Managers and regional managers should not land on attendance
        if ((role === ROLES.MANAGER || role === ROLES.REGIONAL) && hash === "attendance") {
          return "dashboard";
        }
        return hash;
      }
    } catch {
      /* ignore */
    }
    // Default: Dashboard comes first for all roles (including Executive)
    return "dashboard";
  });


  const handleSelectSection = (sec) => {
    if (role === ROLES.EXECUTIVE && sec === "tasks") {
      setPlanInitialTab("tasks");
      setActiveSection("plan");
      try {
        window.location.hash = "plan";
      } catch {
        /* ignore */
      }
      return;
    }
    setActiveSection(sec);
    try {
      window.location.hash = sec;
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let t;
    if (initialUser?.id) {
      t = setTimeout(() => {
        if (role === ROLES.EXECUTIVE) setExecId(initialUser.id);
        if (role === ROLES.MANAGER) setManagerId(initialUser.id);
        if (role === ROLES.REGIONAL) setRegionalId(initialUser.id);
      }, 0);
    }
    return () => clearTimeout(t);
  }, [initialUser, role]);

  useEffect(() => {
    let t;
    if (role === ROLES.EXECUTIVE && data.executives.length) {
      let targetId = null;
      try {
        const prefId = localStorage.getItem("zippy_crm_preferred_exec_id");
        if (prefId) {
          const match = data.executives.find((e) => String(e.id) === String(prefId));
          if (match) {
            targetId = match.id;
          }
        }
        if (!targetId) {
          const authStr = localStorage.getItem("zippy_crm_active_auth");
          if (authStr) {
            const auth = JSON.parse(authStr);
            if (auth?.role === ROLES.EXECUTIVE && auth?.user?.id) {
              const match = data.executives.find((e) => e.id === auth.user.id);
              if (match) {
                targetId = match.id;
              }
            }
          }
        }
      } catch {
        /* ignore */
      }
      if (!targetId && !execId) {
        // Default to latest added executive (newest record in database)
        const latest = data.executives[data.executives.length - 1];
        if (latest?.id) {
          targetId = latest.id;
        }
      }
      if (targetId && targetId !== execId) {
        t = setTimeout(() => setExecId(targetId), 0);
      }
    }
    return () => clearTimeout(t);
  }, [data.executives, role, execId]);

  useEffect(() => {
    if (!managerId && data.salesManagers.length) {
      const t = setTimeout(() => setManagerId(data.salesManagers[0].id), 0);
      return () => clearTimeout(t);
    }
  }, [data.salesManagers, managerId]);

  useEffect(() => {
    if (!regionalId && data.regionalManagers.length) {
      const t = setTimeout(() => setRegionalId(data.regionalManagers[0].id), 0);
      return () => clearTimeout(t);
    }
  }, [data.regionalManagers, regionalId]);

  useEffect(() => {
    let t;
    if (role !== ROLES.EXECUTIVE && activeSection === "plan") {
      t = setTimeout(() => setActiveSection("approvals"), 0);
    } else if (role === ROLES.EXECUTIVE && activeSection === "approvals") {
      t = setTimeout(() => setActiveSection("plan"), 0);
    } else if (role === ROLES.EXECUTIVE && activeSection === "attendance_report") {
      t = setTimeout(() => setActiveSection("attendance"), 0);
    } else if (role === ROLES.EXECUTIVE && activeSection === "tasks") {
      t = setTimeout(() => {
        setPlanInitialTab("tasks");
        setActiveSection("plan");
      }, 0);
    }
    return () => clearTimeout(t);
  }, [role, activeSection]);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const selectedMonthLabel = formatMonthLabel(selectedMonth);
  const monthOptions = useMemo(() => getAvailableMonthOptions(selectedMonth), [selectedMonth]);

  // ── Plan stats for the active executive (shown on the dashboard)
  // usePlanStats is a lightweight hook: just one GET /plan-stats/{id} call
  const { stats: planStats } = usePlanStats(execId, selectedMonth);

  const normalizeRegionStr = (r) => (r || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

  const regions = useMemo(() => {
    const raw = data.executives.map((e) => e.region).filter(Boolean);
    const seen = new Set();
    const list = [];
    raw.forEach((r) => {
      const norm = normalizeRegionStr(r);
      if (!seen.has(norm)) {
        seen.add(norm);
        if (norm.includes("tamil")) list.push("Tamil Nadu");
        else if (norm.includes("karnat")) list.push("Karnataka");
        else if (norm.includes("assam")) list.push("Assam");
        else list.push(r.trim());
      }
    });
    return list.sort();
  }, [data.executives]);

  const currentTableKey = ROLE_TABLE_KEY[role];
  const currentRecord = useMemo(() => {
    if (role === ROLES.EXECUTIVE) {
      const match = data.executives.find((e) => String(e.id) === String(execId));
      if (match) return match;
      if (initialUser && (String(initialUser.id) === String(execId) || !execId)) return initialUser;
      try {
        const authStr = localStorage.getItem("zippy_crm_active_auth");
        if (authStr) {
          const auth = JSON.parse(authStr);
          if (auth?.role === ROLES.EXECUTIVE && auth?.user) {
            if (String(auth.user.id) === String(execId) || !execId) return auth.user;
          }
        }
      } catch {
        /* ignore */
      }
      return initialUser || data.executives[data.executives.length - 1] || null;
    }
    if (role === ROLES.MANAGER) {
      const match = data.salesManagers.find((m) => String(m.id) === String(managerId));
      if (match) return match;
      if (initialUser && (String(initialUser.id) === String(managerId) || !managerId)) return initialUser;
      return initialUser || data.salesManagers[0] || null;
    }
    if (role === ROLES.REGIONAL) {
      const match = data.regionalManagers.find((r) => String(r.id) === String(regionalId));
      if (match) return match;
      if (initialUser && (String(initialUser.id) === String(regionalId) || !regionalId)) return initialUser;
      return initialUser || data.regionalManagers[0] || null;
    }
    return null;
  }, [role, data.executives, data.salesManagers, data.regionalManagers, execId, managerId, regionalId, initialUser]);

  function handleLoginModalSuccess({ role: targetRole, user }) {
    setLoginModal({ isOpen: false, role: targetRole });
    handleSelectSection(targetRole === ROLES.EXECUTIVE ? "attendance" : "dashboard");
    onSwitchRole(targetRole);
    if (targetRole === ROLES.EXECUTIVE && user?.id) {
      setExecId(user.id);
    } else if (targetRole === ROLES.MANAGER && user?.id) {
      setManagerId(user.id);
    } else if (targetRole === ROLES.REGIONAL && user?.id) {
      setRegionalId(user.id);
    }
  }

  const pageTitle = `${ROLE_TITLES[role]} — ${SECTION_TITLES[activeSection] ?? "Dashboard"}`;

  return (
    <div className={`app role-${role} theme-${role} ${role === "executive" ? "theme-blue" : role === "manager" ? "theme-green" : "theme-purple"}`}>
      <aside className={`sidebar sidebar-${role} ${role === "executive" ? "sidebar-blue" : role === "manager" ? "sidebar-green" : "sidebar-purple"}`}>
        <div className="brand">
          <div className="brand-logo"><img src={logo} alt="Zenve Zippy" /></div>
          <div>
            <div className="brand-name">Zenve Zippy CRM</div>
            <div className="brand-sub">
              <span style={{ color: "#10b981", marginRight: "4px" }}>●</span> SALES CRM
            </div>
          </div>
        </div>

        <nav>
          {/* DASHBOARD FIRST FOR ALL ROLES */}
          <button
            className={"nav-item" + (activeSection === "dashboard" ? " active" : "")}
            onClick={() => handleSelectSection("dashboard")}
          >
            <LayoutGrid size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
            Dashboard
          </button>

          {role === ROLES.EXECUTIVE && (
            <button
              className={"nav-item" + (activeSection === "attendance" ? " active" : "")}
              onClick={() => handleSelectSection("attendance")}
            >
              <Clock size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
              Attendance
            </button>
          )}

          {/* ATTENDANCE REPORT DIRECTLY UNDER DASHBOARD */}
          {role !== ROLES.EXECUTIVE && (
            <button
              className={"nav-item" + (activeSection === "attendance_report" ? " active" : "")}
              onClick={() => handleSelectSection("attendance_report")}
            >
              <UserCheck size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
              Attendance Report
            </button>
          )}
          <button
            className={"nav-item" + (activeSection === "doctors" ? " active" : "")}
            onClick={() => handleSelectSection("doctors")}
          >
            <Stethoscope size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
            Doctors
          </button>
          {role === ROLES.EXECUTIVE ? (
            <button
              className={"nav-item" + (activeSection === "plan" ? " active" : "")}
              onClick={() => handleSelectSection("plan")}
            >
              <Calendar size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
              Plan
            </button>
          ) : (
            <button
              className={"nav-item" + (activeSection === "approvals" ? " active" : "")}
              onClick={() => handleSelectSection("approvals")}
            >
              <ClipboardCheck size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
              Approvals
            </button>
          )}
          {role !== ROLES.EXECUTIVE && (
            <button
              className={"nav-item" + (activeSection === "tasks" ? " active" : "")}
              onClick={() => handleSelectSection("tasks")}
            >
              <CheckSquare size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
              Task Management
            </button>
          )}
          <button
            className={"nav-item" + (activeSection === "reports" ? " active" : "")}
            onClick={() => handleSelectSection("reports")}
          >
            <FileText size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
            Reports
          </button>

          <button className="nav-item" onClick={() => onExit?.(role)} style={{ marginTop: "0.5rem" }}>
            <LogOut size={16} style={{ marginRight: "10px", flexShrink: 0 }} />
            Log Out
          </button>
        </nav>

      </aside>

      <main className="main">
        <header className="header">
          <div className="title-section">
            <div>
              <h1>{pageTitle}</h1>
              <p>Track Performance • Manage Leads • Achieve Targets</p>
            </div>
          </div>

          <div className="header-right">


            <div className="role-switch">
              <label>MONTH</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>



            <div
              className="header-user-status-pill"
              title={currentRecord ? `${currentRecord.name} — view profile` : "No profile selected"}
              onClick={() => currentRecord && setProfileOpen(true)}
            >
              <DoctorAvatar name={currentRecord?.name || "dhanushkodi"} size={26} isOnline={true} />
              <div className="header-user-meta">
                <span className="header-user-name">{currentRecord?.name || "dhanushkodi"}</span>
                <span className="header-user-status-tag">
                  <span className="online-dot" /> Online
                </span>
              </div>
            </div>

            <button
              type="button"
              className="header-logout-btn"
              onClick={() => onExit?.(role)}
              title="Log Out of Sales CRM"
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </button>

          </div>
        </header>


        <section className="content">
          {activeSection === "attendance" && (
            <AttendanceView
              data={data}
              execId={execId}
              role={role}
              currentRecord={currentRecord}
              onSwitchExecutive={(newId) => setExecId(newId)}
            />
          )}

          {activeSection === "attendance_report" && (
            <AttendanceReportView
              data={data}
              execId={execId}
              role={role}
              currentRecord={currentRecord}
            />
          )}
          {activeSection === "dashboard" && (
            <>
              {data.loading && <p style={{ color: "#7f8b98" }}>Loading dashboard…</p>}
              {data.error && <div className="dash-error">{data.error}</div>}
              {!data.loading && !data.error && role === ROLES.EXECUTIVE && (
                <ExecutiveDashboard
                  data={data}
                  execId={execId}
                  planStats={planStats}
                  monthLabel={selectedMonthLabel}
                  onGoToPlan={() => setActiveSection("plan")}
                  onGoToTasks={() => {
                    setPlanInitialTab("tasks");
                    setActiveSection("plan");
                  }}
                />
              )}
              {!data.loading && !data.error && role === ROLES.MANAGER && (
                <TeamDashboard
                  data={data}
                  role={role}
                  managerId={managerId}
                  currentRecord={currentRecord}
                  region={region || null}
                  scopeLabel="Active team members"
                  monthKey={selectedMonth}
                  monthLabel={selectedMonthLabel}
                  onGoToPlan={() => setActiveSection("approvals")}
                  onGoToTasks={() => handleSelectSection("tasks")}
                  onGoToAttendanceReport={() => handleSelectSection("attendance_report")}
                />
              )}
              {!data.loading && !data.error && role === ROLES.REGIONAL && (
                <TeamDashboard
                  data={data}
                  role={role}
                  regionalId={regionalId}
                  currentRecord={currentRecord}
                  region={region || null}
                  scopeLabel="Across all regions"
                  monthKey={selectedMonth}
                  monthLabel={selectedMonthLabel}
                  onGoToPlan={() => setActiveSection("approvals")}
                  onGoToTasks={() => handleSelectSection("tasks")}
                  onGoToAttendanceReport={() => handleSelectSection("attendance_report")}
                />
              )}
            </>
          )}

          {activeSection === "tasks" && (
            <TaskManagementView
              role={role}
              currentRecord={currentRecord}
              execId={execId}
              managerId={managerId}
              regionalId={regionalId}
            />
          )}

          {activeSection === "reports" && (
            <ReportsView
              data={data}
              execId={execId}
              role={role}
              managerId={managerId}
              regionalId={regionalId}
              currentRecord={currentRecord}
            />
          )}

          {activeSection === "doctors" && (
            <DoctorsView data={data} execId={execId} role={role} />
          )}

          {(activeSection === "plan" || activeSection === "approvals") && (
            <PlanView
              data={data}
              execId={execId}
              role={role}
              monthKey={selectedMonth}
              onMonthChange={setSelectedMonth}
              initialTab={activeSection === "approvals" ? "approvals" : (planInitialTab || "overview")}
              regionFilter={region}
              onTabChange={(newTab) => {
                if (planInitialTab) setPlanInitialTab(null);
                if (newTab === "approvals" && activeSection !== "approvals") {
                  setActiveSection("approvals");
                } else if (newTab !== "approvals" && activeSection === "approvals") {
                  if (role === ROLES.EXECUTIVE) {
                    setActiveSection("plan");
                  }
                }
              }}
              managerName={
                role === ROLES.REGIONAL
                  ? `${currentRecord?.name || data.regionalManagers?.find((r) => r.id === regionalId)?.name || "Regional Manager"} (Regional Manager)`
                  : role === ROLES.MANAGER
                    ? `${currentRecord?.name || data.salesManagers?.find((m) => m.id === managerId)?.name || "Sales Manager"} (Sales Manager)`
                    : "Manager"
              }
            />
          )}
        </section>
      </main>

      {profileOpen && currentRecord && (
        <ProfileModal
          tableKey={currentTableKey}
          record={currentRecord}
          onClose={() => setProfileOpen(false)}
        />
      )}

      <SalesCrmLoginModal
        isOpen={loginModal.isOpen}
        initialRole={loginModal.role}
        onClose={() => setLoginModal((prev) => ({ ...prev, isOpen: false }))}
        onLoginSuccess={handleLoginModalSuccess}
      />
    </div>
  );
}
