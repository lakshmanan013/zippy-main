import { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckSquare,
  Flame,
  AlertTriangle,
  Clock,
  Sparkles,
  User,
  Users,
  MapPin,
  Calendar,
  Building2,
  CheckCircle2,
  ChevronDown,
  Tag,
  FileText,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import modalPetHeaderImg from "../assets/modal-pet-header.png";
import { createExecutiveTask, createRecord } from "../api.js";
import "./RecordModal.css";
import "./AssignTaskModal.css";

function PawIcon({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <circle cx="7.5" cy="5.5" r="2.2" fill={color} />
      <circle cx="16.5" cy="5.5" r="2.2" fill={color} />
      <circle cx="4" cy="11.5" r="2.2" fill={color} />
      <circle cx="20" cy="11.5" r="2.2" fill={color} />
      <path
        d="M12 9.5c-3.2 0-5.5 2.2-5.5 5 0 2.4 1.8 4.5 5.5 4.5s5.5-2.1 5.5-4.5c0-2.8-2.3-5-5-5z"
        fill={color}
      />
    </svg>
  );
}

const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

const TASK_CATEGORIES = [
  "Doctor Visit",
  "Clinic Onboarding",
  "Product Detailing",
  "Target Achievement",
  "Payment Collection",
  "Clinic Verification",
  "Sample Distribution",
  "General Task",
];

export default function AssignTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  role = "manager",
  currentRecord,
  teamMembers = { executives: [], managers: [] },
  initialAssigneeId = null,
  initialAssigneeRole = "executive",
}) {
  const isRegional = role === "regional";
  const canAssignBoth = role === "regional" || role === "admin";
  const primaryColor = isRegional ? "#7c3aed" : "#059669";
  const primaryGradient = isRegional
    ? "linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%)"
    : "linear-gradient(135deg, #059669 0%, #047857 100%)";
  const primaryGlow = isRegional
    ? "0 0 16px rgba(124, 58, 237, 0.55), 0 4px 14px rgba(124, 58, 237, 0.35)"
    : "0 0 16px rgba(5, 150, 105, 0.55), 0 4px 12px rgba(5, 150, 105, 0.35)";

  // Auto-fetch Assigner information (Assigned By, Assigner Role, ID, Region)
  const autoFetchedAssigner = useMemo(() => {
    const normRole = role === "regional" ? "regional" : role === "admin" ? "admin" : "manager";
    const roleLabel = role === "regional" ? "Regional Manager" : role === "admin" ? "Administrator" : "Sales Manager";

    if (currentRecord?.name) {
      return {
        id: currentRecord.id || 1,
        name: currentRecord.name,
        role: normRole,
        roleLabel,
        region: currentRecord.region || (role === "regional" ? "South Region" : ""),
        employeeCode: currentRecord.employee_code || (role === "regional" ? "RM-001" : "SM-001"),
      };
    }
    if (role === "regional") {
      const rm = teamMembers.regionalManagers?.[0];
      return {
        id: rm?.id || 1,
        name: rm?.name || "Rajesh Verma",
        role: "regional",
        roleLabel: "Regional Manager",
        region: rm?.region || "South Region",
        employeeCode: rm?.employee_code || "RM-001",
      };
    }
    if (role === "manager") {
      const sm = teamMembers.managers?.[0];
      return {
        id: sm?.id || 1,
        name: sm?.name || "Kavitha Raman",
        role: "manager",
        roleLabel: "Sales Manager",
        region: sm?.region || "Karnataka",
        employeeCode: sm?.employee_code || "SM-001",
      };
    }
    return {
      id: 1,
      name: "Administrator",
      role: "admin",
      roleLabel: "Administrator",
      region: "All Territories",
      employeeCode: "ADM-001",
    };
  }, [currentRecord, role, teamMembers]);

  const [assignedToRole, setAssignedToRole] = useState(initialAssigneeRole || "executive");
  const [assignedToId, setAssignedToId] = useState(initialAssigneeId ? String(initialAssigneeId) : "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("Doctor Visit");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 86400000 * 3);
    return d.toISOString().split("T")[0];
  });
  const [targetEntityName, setTargetEntityName] = useState("");
  const [pincode, setPincode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync initialAssigneeId if passed
  useEffect(() => {
    if (initialAssigneeId) {
      setAssignedToId(String(initialAssigneeId));
    }
    if (initialAssigneeRole) {
      setAssignedToRole(initialAssigneeRole);
    }
  }, [initialAssigneeId, initialAssigneeRole]);

  // Handle escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // List of candidate assignees based on selected role
  const candidateList = useMemo(() => {
    if (assignedToRole === "manager") {
      return teamMembers.managers || [];
    }
    return teamMembers.executives || [];
  }, [assignedToRole, teamMembers]);

  // Auto-select first candidate if none selected or invalid
  useEffect(() => {
    if (!assignedToId && candidateList.length > 0) {
      setAssignedToId(String(candidateList[0].id));
    }
  }, [candidateList, assignedToId]);

  // Auto-fetch selected candidate object
  const selectedCandidate = useMemo(() => {
    if (!assignedToId) return null;
    return candidateList.find((c) => String(c.id) === String(assignedToId)) || null;
  }, [assignedToId, candidateList]);

  // Territory pincodes mapping for active sales executives
  const EXEC_PINCODES = useMemo(() => ({
    1: "560034", // Dhanushkodi M - Bangalore Koramangala
    2: "560038", // Pooja Hegde - Bangalore Indiranagar
    4: "560066", // Sneha Reddy - Bangalore Whitefield
    5: "570002", // Vikram Seth - Mysore
    6: "600040", // Arvind Swamy - Chennai Anna Nagar
    7: "641002", // Kavita Rao - Coimbatore
    8: "575002", // Rohan Deshmukh - Mangalore
    9: "600020", // Priya Nair - Chennai Adyar
    10: "625020", // Manoj Sundaram - Madurai
    11: "636016", // Divya Krishnan - Salem
  }), []);

  const CITY_PINCODES = useMemo(() => ({
    bangalore: "560034",
    bengaluru: "560034",
    mysore: "570002",
    mysuru: "570002",
    chennai: "600040",
    coimbatore: "641002",
    mangalore: "575002",
    mangaluru: "575002",
    madurai: "625020",
    salem: "636016",
  }), []);

  // Auto-fetch executive pincode whenever assigned employee changes
  useEffect(() => {
    if (assignedToRole === "executive" && assignedToId) {
      let fetchedPin = "";

      // 1. Check if executive has existing coverage record
      if (teamMembers.coverage && teamMembers.coverage.length > 0) {
        const cov = teamMembers.coverage.find((c) => String(c.executive_id) === String(assignedToId));
        if (cov?.pincode) fetchedPin = cov.pincode;
      }

      // 2. Check known territory pincodes by ID
      if (!fetchedPin && EXEC_PINCODES[Number(assignedToId)]) {
        fetchedPin = EXEC_PINCODES[Number(assignedToId)];
      }

      // 3. Check executive city
      if (!fetchedPin) {
        const exec = (teamMembers.executives || []).find((x) => String(x.id) === String(assignedToId));
        if (exec?.city) {
          fetchedPin = CITY_PINCODES[exec.city.toLowerCase()] || "";
        }
      }

      if (fetchedPin) {
        setPincode(fetchedPin);
      }
    }
  }, [assignedToId, assignedToRole, teamMembers, EXEC_PINCODES, CITY_PINCODES]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please provide a Task Title.");
      return;
    }
    if (!assignedToId) {
      setError("Please select an employee to assign this task to.");
      return;
    }

    setSubmitting(true);
    try {
      let assigneeName = selectedCandidate?.name || (assignedToRole === "manager" ? "Sales Manager" : "Sales Executive");
      let taskRegion = selectedCandidate?.region || currentRecord?.region || autoFetchedAssigner.region || "";
      let assigneeCity = selectedCandidate?.city || "";

      if (assignedToRole === "manager") {
        const mgr = selectedCandidate || (teamMembers.managers || []).find((m) => String(m.id) === String(assignedToId));
        if (mgr?.name) assigneeName = mgr.name;
        if (mgr?.region) taskRegion = mgr.region;
        if (mgr?.city) assigneeCity = mgr.city;
      } else {
        const exec = selectedCandidate || (teamMembers.executives || []).find((x) => String(x.id) === String(assignedToId));
        if (exec?.name) assigneeName = exec.name;
        if (exec?.region) taskRegion = exec.region;
        if (exec?.city) assigneeCity = exec.city;
      }

      const cleanPin = pincode?.trim() || null;

      const payload = {
        title: title.trim(),
        description: description?.trim() || null,
        task_type: taskType || "General Task",
        priority: priority || "Medium",
        status: "Pending",
        due_date: dueDate || null,
        assigned_by_id: autoFetchedAssigner.id,
        assigned_by_role: autoFetchedAssigner.role,
        assigned_by_name: autoFetchedAssigner.name,
        assigned_to_role: assignedToRole,
        assigned_to_id: Number(assignedToId),
        assigned_to_name: assigneeName,
        region: taskRegion,
        target_entity_name: targetEntityName?.trim() || null,
        pincode: cleanPin,
        progress: 0,
      };

      const result = await createExecutiveTask(payload);

      // Auto-store in Pin code coverage in frontend API as well
      if (cleanPin && assignedToRole === "executive") {
        try {
          await createRecord("pincode_coverage", {
            executive_id: Number(assignedToId),
            pincode: cleanPin,
            city: assigneeCity || taskRegion || "Bangalore",
            state: taskRegion || "Karnataka",
          }).catch(() => null);
        } catch (_) {}
      }

      // Dispatch global update event so the CRM views update immediately!
      window.dispatchEvent(new CustomEvent("executive_tasks_updated", { detail: result }));

      if (onTaskCreated) {
        onTaskCreated(result);
      }
      onClose();
    } catch (err) {
      console.error("Task assignment error:", err);
      setError(err?.message || "Failed to assign task. Please verify backend connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`zzc-exec-overlay role-${role} theme-${isRegional ? "purple" : "green"}`} onClick={onClose}>
      <div
        className={`zzc-exec-modal atm-modal-frame role-${role} theme-${isRegional ? "purple" : "green"}`}
        style={{ maxWidth: 620, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Pet Mascot Header ── */}
        <header className="zzc-exec-header">
          <div className="zzc-exec-header-paws-bg" aria-hidden="true">
            <PawIcon size={26} color={primaryColor} className="zzc-paw-bg-1" />
            <PawIcon size={18} color={primaryColor} className="zzc-paw-bg-2" />
            <PawIcon size={32} color={primaryColor} className="zzc-paw-bg-3" />
          </div>

          <div className="zzc-exec-header-content">
            <span className="zzc-exec-header-badge" style={{ background: primaryColor, boxShadow: `0 4px 14px ${isRegional ? "rgba(124, 58, 237, 0.4)" : "rgba(5, 150, 105, 0.4)"}` }}>
              <PawIcon size={24} color="#ffffff" />
            </span>
            <div className="zzc-exec-header-text">
              <h2 id="zzc-exec-title">Assign New Task</h2>
              <p>
                {isRegional
                  ? "Strategic task delegation for regional team"
                  : "Assign field & clinic tasks to your executives"}
              </p>
            </div>
          </div>

          <img
            src={modalPetHeaderImg}
            alt="Pets header mascot"
            className="zzc-modal-header-art"
            aria-hidden="true"
          />

          <button
            type="button"
            className="zzc-exec-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            title="Close"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        </header>

        {/* ── Modal Body Content ── */}
        <div className="zzc-exec-layout atm-scrollable-body">
          {error && (
            <div
              style={{
                background: "#fef2f2",
                color: "#dc2626",
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "0.85rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: "1px solid #fecaca",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={15} color="#dc2626" />
              <span>{error}</span>
            </div>
          )}

          <form
            className="zzc-exec-form"
            onSubmit={handleSubmit}
            autoComplete="off"
          >
            {/* ── Auto-Fetched Assigner Delegation Banner ── */}
            <div className="atm-delegation-card">
              <div className="atm-delegation-left">
                <div className="atm-delegation-avatar">
                  <ShieldCheck size={20} color={primaryColor} />
                </div>
                <div className="atm-delegation-info">
                  <span className="atm-delegation-role-tag">
                    <Sparkles size={11} color={primaryColor} /> Assigner &amp; Delegation Authority
                  </span>
                  <span className="atm-delegation-name">
                    {autoFetchedAssigner.name} ({autoFetchedAssigner.roleLabel})
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    {autoFetchedAssigner.region ? `Region: ${autoFetchedAssigner.region} • ` : ""}ID #{autoFetchedAssigner.id}
                  </span>
                </div>
              </div>
              <div className="atm-delegation-badge">
                <span>⚡ Auto-Fetched</span>
              </div>
            </div>

            {/* ── SECTION 1: TASK & CATEGORY ── */}
            <section className="zzc-exec-section">
              <div
                className="zzc-exec-section-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.85rem",
                  paddingBottom: "0.25rem",
                }}
              >
                <div
                  className="zzc-exec-section-title-wrap"
                  style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
                >
                  <span className="zzc-exec-section-badge">
                    <CheckSquare size={15} />
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "0.86rem",
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Task &amp; Category
                  </h3>
                </div>
                <span
                  className="zzc-exec-section-subtitle"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  Task Details 🐾
                </span>
              </div>

              <div className="zzc-exec-fields">
                {/* Task Title: theme-green (Full width) */}
                <div className="zzc-exec-field theme-green zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <CheckSquare size={14} />
                    </span>
                    <label htmlFor="atm_task_title">
                      Task Title <span className="zzc-exec-required">*</span>
                    </label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <CheckSquare size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="atm_task_title"
                        type="text"
                        placeholder="e.g. Onboard 5 Veterinary Clinics in Koramangala"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Task Category: theme-teal */}
                <div className="zzc-exec-field theme-teal">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Tag size={14} />
                    </span>
                    <label htmlFor="atm_task_category">
                      Category <span className="zzc-exec-required">*</span>
                    </label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Tag size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <select
                        id="atm_task_category"
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value)}
                        required
                      >
                        {TASK_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ChevronDown size={14} className="zzc-shell-right-chevron" aria-hidden="true" />
                  </div>
                </div>

                {/* Priority: theme-purple */}
                <div className="zzc-exec-field theme-purple">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Flame size={14} />
                    </span>
                    <label htmlFor="atm_task_priority">
                      Priority <span className="zzc-exec-required">*</span>
                    </label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Flame size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <select
                        id="atm_task_priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        required
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p} Priority
                          </option>
                        ))}
                      </select>
                    </div>
                    <ChevronDown size={14} className="zzc-shell-right-chevron" aria-hidden="true" />
                  </div>
                </div>

                {/* Task Description: theme-blue (Full width) */}
                <div className="zzc-exec-field theme-blue zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <FileText size={14} />
                    </span>
                    <label htmlFor="atm_task_desc">Instructions &amp; Deliverables</label>
                  </div>
                  <div className="zzc-exec-input-shell atm-textarea-shell">
                    <FileText size={16} className="zzc-shell-left-icon" style={{ top: "14px" }} aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <textarea
                        id="atm_task_desc"
                        rows={2}
                        placeholder="Provide details, deliverables, doctor contacts, or target milestones..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── SECTION 2: ASSIGNEE & TIMINGS ── */}
            <section className="zzc-exec-section">
              <div
                className="zzc-exec-section-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.85rem",
                  paddingBottom: "0.25rem",
                }}
              >
                <div
                  className="zzc-exec-section-title-wrap"
                  style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
                >
                  <span className="zzc-exec-section-badge">
                    <User size={15} />
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "0.86rem",
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Assignee &amp; Timings
                  </h3>
                </div>
                <span
                  className="zzc-exec-section-subtitle"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  Select team member &amp; deadline 🐾
                </span>
              </div>

              {/* Role Selector for Regional Manager & Admin */}
              {canAssignBoth && (
                <div className="atm-role-toggle-bar">
                  <span className="atm-role-toggle-label">Assign Target Role:</span>
                  <div className="atm-role-toggle-group">
                    <button
                      type="button"
                      className={`atm-role-pill ${assignedToRole === "executive" ? "active" : ""}`}
                      onClick={() => {
                        setAssignedToRole("executive");
                        setAssignedToId("");
                      }}
                    >
                      <User size={13} />
                      Field Executive ({teamMembers.executives?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`atm-role-pill ${assignedToRole === "manager" ? "active" : ""}`}
                      onClick={() => {
                        setAssignedToRole("manager");
                        setAssignedToId("");
                      }}
                    >
                      <Users size={13} />
                      Sales Manager ({teamMembers.managers?.length || 0})
                    </button>
                  </div>
                </div>
              )}

              <div className="zzc-exec-fields">
                {/* Assignee: theme-green (Full width or half) */}
                <div className="zzc-exec-field theme-green zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <User size={14} />
                    </span>
                    <label htmlFor="atm_assignee">
                      Assigned Employee <span className="zzc-exec-required">*</span>
                    </label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <User size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <select
                        id="atm_assignee"
                        value={assignedToId}
                        onChange={(e) => setAssignedToId(e.target.value)}
                        required
                      >
                        <option value="">— Select Employee —</option>
                        {candidateList.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.employee_code ? `(${emp.employee_code})` : ""} {emp.region ? `• ${emp.region}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ChevronDown size={14} className="zzc-shell-right-chevron" aria-hidden="true" />
                  </div>

                  {selectedCandidate && (
                    <div className="atm-assignee-card">
                      <div className="atm-assignee-card-left">
                        <CheckCircle2 size={15} color="#059669" />
                        <span>
                          Target: <strong>{selectedCandidate.name}</strong> ({assignedToRole === "manager" ? "Sales Manager" : "Field Executive"})
                          {selectedCandidate.region ? ` • ${selectedCandidate.region}` : ""}
                        </span>
                      </div>
                      <span className="atm-assignee-card-badge">
                        Auto-Linked
                      </span>
                    </div>
                  )}
                </div>

                {/* Due Date: theme-teal */}
                <div className="zzc-exec-field theme-teal zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Calendar size={14} />
                    </span>
                    <label htmlFor="atm_due_date">
                      Due Date <span className="zzc-exec-required">*</span>
                    </label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Calendar size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="atm_due_date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Target Clinic / Hospital: theme-amber */}
                <div className="zzc-exec-field theme-amber">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Building2 size={14} />
                    </span>
                    <label htmlFor="atm_clinic">Target Clinic / Doctor</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Building2 size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="atm_clinic"
                        type="text"
                        list="atm_doctor_list"
                        placeholder="e.g. CurePets Veterinary Hospital"
                        value={targetEntityName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTargetEntityName(val);
                          const doc = (teamMembers.doctors || []).find(
                            (d) =>
                              (d.clinic_name && d.clinic_name.toLowerCase() === val.toLowerCase()) ||
                              (d.name && d.name.toLowerCase() === val.toLowerCase())
                          );
                          if (doc && doc.pincode) {
                            setPincode(doc.pincode);
                          }
                        }}
                      />
                      <datalist id="atm_doctor_list">
                        {(teamMembers.doctors || []).map((doc) => (
                          <option
                            key={doc.id}
                            value={doc.clinic_name || doc.name}
                          >
                            {`${doc.name} • ${doc.city || ""} (${doc.pincode || ""})`}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Area / Pincode: theme-pink */}
                <div className="zzc-exec-field theme-pink">
                  <div className="zzc-exec-field-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="zzc-field-label-icon">
                        <MapPin size={14} />
                      </span>
                      <label htmlFor="atm_pincode">Target Area / Pincode</label>
                    </div>
                    {pincode && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "#059669",
                          fontWeight: 700,
                          background: "#ecfdf5",
                          padding: "1px 6px",
                          borderRadius: "9999px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        ⚡ Stored in Pin Code Coverage
                      </span>
                    )}
                  </div>
                  <div className="zzc-exec-input-shell">
                    <MapPin size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input
                        id="atm_pincode"
                        type="text"
                        placeholder="e.g. 560034 or Koramangala"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* ── Pet Mascot Footer ── */}
        <footer className="zzc-exec-footer">
          <div className="zzc-exec-footer-paws" aria-hidden="true">
            <PawIcon size={24} color={primaryColor} />
            <PawIcon size={16} color={primaryColor} />
          </div>

          <div
            className="zzc-exec-footer-actions"
            style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}
          >
            <button
              type="button"
              className="zzc-btn zzc-btn-cancel"
              onClick={onClose}
              disabled={submitting}
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
              type="button"
              className="zzc-btn zzc-btn-create"
              onClick={handleSubmit}
              disabled={submitting}
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
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                transition: "all 0.18s ease",
              }}
            >
              <span>{submitting ? "Assigning…" : "Assign Task"}</span>
              <span className="zzc-btn-sparkle" aria-hidden="true" style={{ fontSize: "0.95rem" }}>
                ✨
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
