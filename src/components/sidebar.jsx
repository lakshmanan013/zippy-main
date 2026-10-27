import { useRef } from "react";
import { NAV_GROUPS, getAllowedNavGroups, getRoleConfig } from "../data.js";
import logo from "../assets/zenve-zippy-logo.png";
import { LogOut } from "lucide-react";

export default function Sidebar({
  currentKey,
  onSelect,
  adminUser,
  onLogout,
  navGroups,
}) {
  const navRef = useRef(null);
  const activeNavGroups = navGroups || getAllowedNavGroups(adminUser);
  const isCeo = Boolean(
    adminUser?.is_ceo ||
    adminUser?.isCeo ||
    adminUser?.role === "ceo" ||
    adminUser?.role === "Administrator" ||
    adminUser?.role === "admin"
  );
  const roleCfg = getRoleConfig(adminUser?.role);

  return (
    <aside className="zzc-sidebar">
      {/* Header Area */}
      <div className="zzc-sidebar-header">
        <div className="zzc-logo">
          <img src={logo} alt="Zenve Zippy" />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="zzc-brand-title" style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Zenve Zippy CRM
          </p>
          <p className="zzc-brand-sub" style={{ margin: 0 }}>
            {isCeo ? "CEO Master Control" : `${roleCfg.name} Portal`}
          </p>
        </div>
      </div>

      <nav
        className="zzc-nav"
        ref={navRef}
        style={{
          height: "calc(100vh - 80px)",
        }}
      >
        {activeNavGroups.map((group) => (
          <div className="zzc-nav-group" key={group.label}>
            <p className="zzc-nav-group-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{group.label}</span>
              {!isCeo && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: "4px",
                    background: "#e2e8f0",
                    color: "#475569",
                  }}
                >
                  Authorized
                </span>
              )}
            </p>

            {group.items.map((item) => (
              <button
                type="button"
                key={item.key}
                className={
                  "zzc-nav-btn" +
                  (item.key === currentKey ? " active" : "")
                }
                onClick={() => onSelect(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}

        {!isCeo && (
          <div
            style={{
              margin: "16px 6px 8px 6px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              fontSize: "11px",
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155", fontWeight: 700, marginBottom: "2px" }}>
              <ShieldCheck size={14} color="#059669" />
              <span>Strict Department Isolation</span>
            </div>
            Other sections are hidden. Only the CEO has permissions to access the whole website.
          </div>
        )}
      </nav>

      {/* Footer Profile & Logout */}
      {adminUser && onLogout && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--sidebar-border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.95)",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: isCeo
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : roleCfg.gradient || "linear-gradient(135deg, #0284c7, #0d9488)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "bold",
                flexShrink: 0,
                boxShadow: isCeo ? "0 2px 6px rgba(217, 119, 6, 0.35)" : "none",
              }}
            >
              {isCeo ? "👑" : (adminUser.name || adminUser.email || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--foreground, #0f172a)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {adminUser.name || (isCeo ? "CEO" : "Department Lead")}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {adminUser.email || (isCeo ? "ceo@zenvezippy.com" : roleCfg.email)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Log out of Portal"
            style={{
              padding: "6px",
              borderRadius: "6px",
              color: "#94a3b8",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#e11d48";
              e.currentTarget.style.background = "#fee2e2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
