import { useState } from "react";
import {
  Calendar,
  Clock,
  Target,
  Users,
  X,
  Sparkles,
  Check,
} from "lucide-react";
import {
  PLAN_MONTH_LABEL,
  RESCHEDULE_REASONS,
  VISIT_TIME_OPTIONS,
  formatDateLong,
  getPlanToday,
  getMonthBounds,
  formatMonthLabel,
  getCurrentMonthKey,
} from "./planData.js";
import { StatusBadge, PriorityBadge, DoctorMiniCard } from "./PlanBits.jsx";
import modalPetHeaderImg from "../assets/modal-pet-header.png";
import "./RecordModal.css";

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

/* ───────────────────────── CREATE MONTHLY PLAN ───────────────────────── */
export function CreatePlanModal({ totalAssigned, workingDaysCount, monthLabel, monthKey, onClose, onCreate }) {
  const [method, setMethod] = useState("auto");
  const dailyTarget = workingDaysCount > 0 ? Math.ceil(totalAssigned / workingDaysCount) : 0;
  const displayMonth = monthLabel || (monthKey ? formatMonthLabel(monthKey) : PLAN_MONTH_LABEL);

  return (
    <div className="zzc-modal-overlay zzc-exec-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-exec-modal" style={{ maxWidth: 580 }}>
        {/* Header with Mint Theme & Pet Illustration */}
        <header className="zzc-exec-header">
          <div className="zzc-exec-header-paws-bg" aria-hidden="true">
            <PawIcon size={26} color="#0d8b7b" className="zzc-paw-bg-1" />
            <PawIcon size={18} color="#0d8b7b" className="zzc-paw-bg-2" />
            <PawIcon size={32} color="#0d8b7b" className="zzc-paw-bg-3" />
          </div>

          <div className="zzc-exec-header-content">
            <span className="zzc-exec-header-badge">
              <PawIcon size={24} color="#ffffff" />
            </span>
            <div className="zzc-exec-header-text">
              <h2 id="zzc-exec-title">Create Monthly Plan</h2>
              <p>Plan territory doctor visits for the month</p>
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
            aria-label="Close"
            title="Close"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        </header>

        {/* Modal Scrollable Body */}
        <div className="zzc-exec-layout">
          <form className="zzc-exec-form" onSubmit={(e) => { e.preventDefault(); onCreate(method); onClose(); }} autoComplete="off">
            <section className="zzc-exec-section">
              <div className="zzc-exec-section-header">
                <div className="zzc-exec-section-title-wrap">
                  <span className="zzc-exec-section-badge">
                    <Calendar size={15} />
                  </span>
                  <h3>Plan Schedule & Targets</h3>
                </div>
                <span className="zzc-exec-section-subtitle">
                  Set up monthly doctor visit targets 🐾
                </span>
              </div>

              <div className="zzc-exec-fields">
                {/* Month Field */}
                <div className="zzc-exec-field theme-teal zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <PawIcon size={14} />
                    </span>
                    <label>Target Month</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Calendar size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input value={displayMonth} disabled style={{ fontWeight: 600, color: "#0f766e" }} />
                    </div>
                  </div>
                </div>

                {/* Total Assigned Doctors */}
                <div className="zzc-exec-field theme-green">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Users size={14} />
                    </span>
                    <label>Assigned Doctors</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Users size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input value={`${totalAssigned} Doctors`} disabled style={{ fontWeight: 600 }} />
                    </div>
                  </div>
                </div>

                {/* Working Days */}
                <div className="zzc-exec-field theme-blue">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Clock size={14} />
                    </span>
                    <label>Working Days</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Clock size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input value={`${workingDaysCount} Days`} disabled style={{ fontWeight: 600 }} />
                    </div>
                  </div>
                </div>

                {/* Daily Target */}
                <div className="zzc-exec-field theme-amber zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <Target size={14} />
                    </span>
                    <label>Daily Target (Auto-calculated)</label>
                  </div>
                  <div className="zzc-exec-input-shell">
                    <Target size={16} className="zzc-shell-left-icon" aria-hidden="true" />
                    <div className="zzc-exec-input-control">
                      <input value={`${dailyTarget} doctors / day`} disabled style={{ fontWeight: 700, color: "#b45309" }} />
                    </div>
                  </div>
                </div>

                {/* Planning Method Card Selector */}
                <div className="zzc-exec-field theme-purple zzc-exec-field-full">
                  <div className="zzc-exec-field-header">
                    <span className="zzc-field-label-icon">
                      <PawIcon size={14} />
                    </span>
                    <label>Planning Method</label>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                    <div
                      onClick={() => setMethod("auto")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: method === "auto" ? "2px solid #9333ea" : "1.5px solid #e9d5ff",
                        background: method === "auto" ? "#faf5ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#6b21a8" }}>
                          Auto Generate Plan
                        </span>
                        {method === "auto" && <Check size={16} color="#9333ea" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.35 }}>
                        Distributes doctors evenly across working days automatically.
                      </span>
                    </div>

                    <div
                      onClick={() => setMethod("manual")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: method === "manual" ? "2px solid #9333ea" : "1.5px solid #e9d5ff",
                        background: method === "manual" ? "#faf5ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#6b21a8" }}>
                          Manual Planning
                        </span>
                        {method === "manual" && <Check size={16} color="#9333ea" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.35 }}>
                        Schedule each doctor's visit date yourself from Assigned tab.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <footer className="zzc-exec-footer">
          <div className="zzc-exec-footer-paws" aria-hidden="true">
            <PawIcon size={24} color="#0d8b7b" />
            <PawIcon size={16} color="#0d8b7b" />
          </div>

          <div className="zzc-exec-footer-actions">
            <button
              type="button"
              className="zzc-btn zzc-btn-cancel"
              onClick={onClose}
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
              onClick={() => { onCreate(method); onClose(); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #0d8b7b 0%, #076d60 100%)",
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "0.88rem",
                boxShadow: "0 4px 14px rgba(13, 139, 123, 0.35)",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <span>{method === "auto" ? "Generate Plan" : "Create Draft Plan"}</span>
              <span className="zzc-btn-sparkle" aria-hidden="true">✨</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ───────────────────────── VISIT REPORT ───────────────────────── */
export function VisitReportModal({ doctor, task, existingReport, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    visitDate: existingReport?.visitDate || task.scheduledDate,
    visitTime: existingReport?.visitTime || task.visitTime || "10:00 AM",
    location: existingReport?.location || `${doctor?.hospital || ""}, ${doctor?.location || ""}`,
    purpose: existingReport?.purpose || "Product Detailing",
    productsDiscussed: existingReport?.productsDiscussed || "",
    notes: existingReport?.notes || "",
    doctorFeedback: existingReport?.doctorFeedback || "",
    workWith: existingReport?.workWith || "",
    nextFollowupDate: existingReport?.nextFollowupDate || "",
    nextAction: existingReport?.nextAction || "",
    remarks: existingReport?.remarks || "",
    followUpRequired: existingReport?.followUpRequired ?? true,
  }));

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })); }

  function handleSubmit(e, asDraft) {
    e.preventDefault();
    onSubmit(form, asDraft);
    onClose();
  }

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal rpt-call-modal">
        <div className="rpt-call-modal-header">
          <div>
            <h2>Visit Report — {doctor?.name}</h2>
            <p className="rpt-call-modal-sub">{doctor?.specialization} · {doctor?.hospital}, {doctor?.location}</p>
          </div>
          <button className="rpt-call-close" onClick={onClose} type="button">✕</button>
        </div>

        <form id="visitReportForm" className="rpt-call-form" onSubmit={(e) => handleSubmit(e, false)}>
          <div className="rpt-call-row">
            <div className="rpt-call-field">
              <label>Visit Date *</label>
              <input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} required />
            </div>
            <div className="rpt-call-field">
              <label>Visit Time</label>
              <select value={form.visitTime} onChange={(e) => set("visitTime", e.target.value)}>
                {VISIT_TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Location</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="rpt-call-row">
            <div className="rpt-call-field">
              <label>Visit Purpose</label>
              <select value={form.purpose} onChange={(e) => set("purpose", e.target.value)} required>
                <option>Product Detailing</option>
                <option>Follow-up Visit</option>
                <option>New Product Launch</option>
                <option>Relationship Building</option>
                <option>Sample Distribution</option>
              </select>
            </div>
            <div className="rpt-call-field">
              <label>Products Discussed</label>
              <input value={form.productsDiscussed} onChange={(e) => set("productsDiscussed", e.target.value)} placeholder="e.g. Nebicard 5mg, Losar-H" />
            </div>
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Discussion Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What was discussed during the visit?" />
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Doctor Feedback</label>
            <textarea rows={2} value={form.doctorFeedback} onChange={(e) => set("doctorFeedback", e.target.value)} placeholder="Doctor's response, objections, requests…" />
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Work With</label>
            <textarea rows={2} value={form.workWith} onChange={(e) => set("workWith", e.target.value)} placeholder="Notes on who you worked with…" />
          </div>
          <div className="rpt-call-row">
            <div className="rpt-call-field">
              <label>Next Follow-up Date</label>
              <input type="date" value={form.nextFollowupDate} onChange={(e) => set("nextFollowupDate", e.target.value)} />
            </div>
            <div className="rpt-call-field">
              <label>Next Action</label>
              <input value={form.nextAction} onChange={(e) => set("nextAction", e.target.value)} placeholder="e.g. Send literature" />
            </div>
          </div>
          <div className="rpt-call-field rpt-call-field-full">
            <label>Remarks</label>
            <input value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Any additional remarks" />
          </div>
          <label className="pln-radio" style={{ marginTop: 2 }}>
            <input type="checkbox" checked={form.followUpRequired} onChange={(e) => set("followUpRequired", e.target.checked)} />
            Follow-up required
          </label>
        </form>

        <div className="rpt-call-modal-footer">
          <button type="button" className="rpt-btn-outline" onClick={(e) => handleSubmit(e, true)}>Save Draft</button>
          <button type="submit" form="visitReportForm" className="rpt-btn-primary rpt-btn-post-submit">✓ Submit Visit Report</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── RESCHEDULE ───────────────────────── */
export function RescheduleModal({ doctor, task, monthKey, onClose, onReschedule }) {
  const [date, setDate] = useState(task.scheduledDate);
  const [reason, setReason] = useState(RESCHEDULE_REASONS[0]);
  const bounds = getMonthBounds(monthKey || task.scheduledDate?.slice(0, 7) || getCurrentMonthKey());

  function handleSave(e) {
    e.preventDefault();
    onReschedule(date, reason);
    onClose();
  }

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal">
        <h2>Reschedule Visit — {doctor?.name}</h2>
        <form id="rescheduleForm" className="zzc-modal-form" onSubmit={handleSave}>
          <div className="zzc-field">
            <label>New Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={bounds.min} max={bounds.max} required />
          </div>
          <div className="zzc-field">
            <label>Reason *</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} required>
              {RESCHEDULE_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </form>
        <div className="zzc-modal-actions">
          <button type="button" className="zzc-btn zzc-btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="rescheduleForm" className="zzc-btn zzc-btn-primary">Reschedule</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── MANUAL SCHEDULE (one doctor) ───────────────────────── */
export function ScheduleDoctorModal({ doctor, monthKey, onClose, onSchedule }) {
  const activeMonthKey = monthKey || getCurrentMonthKey();
  const bounds = getMonthBounds(activeMonthKey);
  const [date, setDate] = useState(() => getPlanToday(activeMonthKey));
  const [time, setTime] = useState(VISIT_TIME_OPTIONS[0]);

  function handleSave(e) {
    e.preventDefault();
    onSchedule(date, time);
    onClose();
  }

  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal">
        <h2>Schedule Visit — {doctor?.name}</h2>
        <form id="scheduleDoctorForm" className="zzc-modal-form" onSubmit={handleSave}>
          <div className="zzc-field">
            <label>Visit Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={bounds.min} max={bounds.max} required />
          </div>
          <div className="zzc-field">
            <label>Visit Time</label>
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {VISIT_TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </form>
        <div className="zzc-modal-actions">
          <button type="button" className="zzc-btn zzc-btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="scheduleDoctorForm" className="zzc-btn zzc-btn-primary">Add to Plan</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── APPROVAL REASON (reject / request changes) ───────────────────────── */
export function ApprovalReasonModal({ title, actionLabel, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal">
        <h2>{title}</h2>
        <form id="approvalReasonForm" className="zzc-modal-form" onSubmit={(e) => { e.preventDefault(); onConfirm(reason); onClose(); }}>
          <div className="zzc-field">
            <label>Comments *</label>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Explain what needs to change…" style={{
              width: "100%", border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
              background: "var(--background)", padding: ".5rem .65rem", outline: "none", fontFamily: "inherit", fontSize: ".82rem",
            }} />
          </div>
        </form>
        <div className="zzc-modal-actions">
          <button type="button" className="zzc-btn zzc-btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="approvalReasonForm" className="zzc-btn zzc-btn-primary">{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── DAY DETAIL ───────────────────────── */
export function DayDetailModal({ date, tasks, doctorMap, onClose, renderActions }) {
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const pending = tasks.length - completed;
  return (
    <div className="zzc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zzc-modal" style={{ maxWidth: 640 }}>
        <h2>{formatDateLong(date)}</h2>
        <p className="pln-hint" style={{ marginTop: -8, marginBottom: 12 }}>
          {tasks.length} doctor{tasks.length !== 1 ? "s" : ""} planned · {completed} completed · {pending} pending
        </p>
        {tasks.length === 0 ? (
          <div className="rpt-empty-state">No visits scheduled on this date.</div>
        ) : (
          <div className="pln-day-list">
            {tasks.map((t) => {
              const doctor = t.doctor || doctorMap?.get(t.doctorId);
              return (
                <div className="pln-day-list-row" key={t.id}>
                  <DoctorMiniCard doctor={doctor} />
                  <div className="pln-day-list-meta">
                    <span className="doc-muted">{t.visitTime}</span>
                    <PriorityBadge priority={doctor?.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                  {renderActions && <div className="pln-day-list-actions">{renderActions(t, doctor)}</div>}
                </div>
              );
            })}
          </div>
        )}
        <div className="zzc-modal-actions">
          <button type="button" className="zzc-btn zzc-btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
