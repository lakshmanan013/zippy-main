import { useState, useEffect } from "react";
import { Database, RefreshCw, CheckCircle2, AlertTriangle, X, Shield, ArrowRightLeft } from "lucide-react";
import { fetchDatabaseHealth, fetchSyncStatus, triggerDatabaseSync } from "../api.js";

export default function DualDbModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [health, setHealth] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const [hData, sData] = await Promise.all([
        fetchDatabaseHealth().catch((e) => ({
          overall_status: "error",
          zippy_crm: { connected: false, error: e.message },
          zenve_main: { connected: false, error: e.message },
        })),
        fetchSyncStatus().catch(() => null),
      ]);
      setHealth(hData);
      setSyncStatus(sData);
    } catch (err) {
      setError(err.message || "Failed to load database status");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await triggerDatabaseSync();
      setSyncResult(res);
      await loadStatus();
    } catch (err) {
      setSyncResult({ success: false, errors: [err.message] });
    } finally {
      setSyncing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "680px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Database size={22} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                Dual-Database Architecture
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                Zippy CRM &amp; zenve_main Synchronization Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Databases Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            {/* Database 1 */}
            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#0284c7", letterSpacing: "0.5px" }}>
                  Database 1
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: health?.zippy_crm?.connected ? "#dcfce7" : "#fee2e2",
                    color: health?.zippy_crm?.connected ? "#166534" : "#991b1b",
                  }}
                >
                  {health?.zippy_crm?.connected ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {health?.zippy_crm?.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", color: "#0f172a" }}>zippy_crm</h4>
              <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b" }}>
                CRM, Attendance, Planning &amp; Field Ops
              </p>

              <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Tables:</span>
                  <strong>{health?.zippy_crm?.table_count ?? "12"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Field Users:</span>
                  <strong>{syncStatus?.zippy_crm?.total_users ?? "—"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Attendance Logs:</span>
                  <strong>{syncStatus?.zippy_crm?.attendance_records ?? "—"}</strong>
                </div>
              </div>
            </div>

            {/* Database 2 */}
            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#7c3aed", letterSpacing: "0.5px" }}>
                  Database 2
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: health?.zenve_main?.connected ? "#dcfce7" : "#fee2e2",
                    color: health?.zenve_main?.connected ? "#166534" : "#991b1b",
                  }}
                >
                  {health?.zenve_main?.connected ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {health?.zenve_main?.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", color: "#0f172a" }}>zenve_main</h4>
              <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b" }}>
                Centralized System, Doctors, Shop &amp; Auth
              </p>

              <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Tables:</span>
                  <strong>{health?.zenve_main?.table_count ?? "40"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Doctors Registered:</span>
                  <strong>{syncStatus?.zenve_main?.doctors ?? "—"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Central Roles:</span>
                  <strong>{syncStatus?.zenve_main?.user_roles ?? "—"}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Sync result notification */}
          {syncResult && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "16px",
                background: syncResult.success ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${syncResult.success ? "#bbf7d0" : "#fecaca"}`,
                fontSize: "13px",
                color: syncResult.success ? "#15803d" : "#b91c1c",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {syncResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>
                {syncResult.message || (syncResult.success ? "Synchronization completed successfully." : "Synchronization encountered an issue.")}
              </span>
            </div>
          )}

          {/* Info callout */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              fontSize: "12px",
              color: "#1e40af",
              lineHeight: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <Shield size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Reliable Two-Way Synchronization:</strong> CRUD actions automatically route to their designated server. CRM user roles, onboarding actions, and visit logs are safely synced into <code>zenve_main.user_roles</code> and central audit trails.
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={loadStatus}
              disabled={loading || syncing}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Status
            </button>

            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || loading}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: syncing ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)",
              }}
            >
              <ArrowRightLeft size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Synchronizing..." : "Synchronize Databases Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
