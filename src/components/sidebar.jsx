import { useRef } from "react";
import { NAV_GROUPS, getAllowedNavGroups, getRoleConfig } from "../data.js";
import logo from "../assets/zenve-zippy-logo.png";

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
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          paddingBottom: "36px",
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
    </aside>
  );
}
