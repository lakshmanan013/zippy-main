import { useState, useEffect, useRef } from "react";
import { Search, Plus, LogOut, User, Crown, ShieldCheck, ChevronDown, Check } from "lucide-react";
import { LOGIN_ROLES, getRoleConfig } from "../data.js";


export default function TopBar({
  title,
  subtitle,
  searchPlaceholder,
  showSearch,
  showNewRecord,
  searchTerm,
  onSearchChange,
  onNewRecord,
  activeTab,
  onTabChange,
  onOpenSalesCRM,
  adminUser,
  onLogout,
  ceoPreviewRole,
  onSetCeoPreviewRole,
}) {
  const [salesMenuOpen, setSalesMenuOpen] = useState(false);
  const [ceoFilterMenuOpen, setCeoFilterMenuOpen] = useState(false);

  const salesDropdownRef = useRef(null);
  const ceoFilterDropdownRef = useRef(null);

  const isCeo = Boolean(
    adminUser?.is_ceo ||
    adminUser?.isCeo ||
    adminUser?.role === "ceo" ||
    adminUser?.role === "Administrator" ||
    adminUser?.role === "admin"
  );
  const roleCfg = getRoleConfig(adminUser?.role);
  const previewCfg = ceoPreviewRole ? getRoleConfig(ceoPreviewRole) : null;

  // Closes menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(event.target)) {
        setSalesMenuOpen(false);
      }
      if (ceoFilterDropdownRef.current && !ceoFilterDropdownRef.current.contains(event.target)) {
        setCeoFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleRoleClick(view) {
    setSalesMenuOpen(false);
    onOpenSalesCRM?.(view);
  }

  function handleSelectCeoFilter(roleKey) {
    setCeoFilterMenuOpen(false);
    onSetCeoPreviewRole?.(roleKey);
  }

  // Only CEO and Sales Team can see/access the Sales CRM dropdown
  const canAccessSalesCrm = isCeo || adminUser?.role === "sales_team";

  return (
    <header className="zzc-topbar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h1 style={{ margin: 0 }}>{title}</h1>
          {isCeo ? (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#92400e",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                padding: "2px 8px",
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Crown size={12} color="#d97706" />
              <span>CEO Whole Website</span>
            </span>
          ) : (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: roleCfg.accentColor || "#0f766e",
                background: `${roleCfg.accentColor || "#0f766e"}15`,
                border: `1px solid ${roleCfg.accentColor || "#0f766e"}40`,
                padding: "2px 8px",
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ShieldCheck size={12} />
              <span>{roleCfg.badge} Isolated</span>
            </span>
          )}
        </div>
        <p className="zzc-muted zzc-small">{subtitle}</p>
      </div>

      <div className="zzc-topbar-actions">
        {showSearch && (
          <div className="zzc-search-wrap" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Search className="zzc-search-icon" size={15} style={{ color: "var(--muted-foreground, #64748b)", flexShrink: 0 }} />
            <input
              className="zzc-search-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {showNewRecord && (
          <button
            className="zzc-btn zzc-btn-primary"
            onClick={onNewRecord}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "linear-gradient(135deg, #0d8b7b 0%, #076d60 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "0.48rem 0.95rem",
              fontWeight: "700",
              fontSize: "0.86rem",
              boxShadow: "0 3px 10px rgba(13, 139, 123, 0.25)",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <span>+ New record</span>
          </button>
        )}

        {["dashboard", "data", "bulk"].map((tab) => (
          <button
            key={tab}
            className={"zzc-btn zzc-btn-outline" + (activeTab === tab ? " active" : "")}
            onClick={() => onTabChange(tab)}
          >
            {tab === "bulk" ? "Bulk tools" : tab}
          </button>
        ))}

        {/* CEO Department Filter / Preview Dropdown (CEO ONLY) */}
        {isCeo && onSetCeoPreviewRole && (
          <div className="zzc-sales-menu-wrap" ref={ceoFilterDropdownRef}>
            <button
              className={"zzc-btn zzc-btn-outline" + (ceoFilterMenuOpen || ceoPreviewRole ? " active" : "")}
              style={{
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderColor: ceoPreviewRole ? "#d97706" : undefined,
                color: ceoPreviewRole ? "#92400e" : undefined,
                background: ceoPreviewRole ? "#fffbeb" : undefined,
              }}
              onClick={(e) => {
                e.preventDefault();
                setCeoFilterMenuOpen((prev) => !prev);
              }}
              title="CEO view filter: inspect whole website or a specific department"
            >
              <Crown size={13} color="#d97706" />
              <span>{previewCfg ? `Viewing: ${previewCfg.name}` : "Whole Website (CEO)"}</span>
              <ChevronDown size={12} />
            </button>

            {ceoFilterMenuOpen && (
              <div
                className="zzc-sales-menu"
                style={{
                  minWidth: "220px",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                <div style={{ padding: "6px 12px", fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  CEO View Scope
                </div>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontWeight: !ceoPreviewRole ? 800 : 500,
                    background: !ceoPreviewRole ? "#fef3c7" : undefined,
                    color: !ceoPreviewRole ? "#92400e" : undefined,
                  }}
                  onClick={() => handleSelectCeoFilter(null)}
                >
                  <span>👑 Whole Website (All 7 Sections)</span>
                  {!ceoPreviewRole && <Check size={14} />}
                </button>
                <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }} />
                <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: 700, color: "#94a3b8" }}>
                  Or filter as Department:
                </div>
                {LOGIN_ROLES.slice(1).map((dept) => {
                  const isCur = ceoPreviewRole === dept.key;
                  return (
                    <button
                      key={dept.key}
                      type="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontWeight: isCur ? 800 : 500,
                        background: isCur ? "#f1f5f9" : undefined,
                      }}
                      onClick={() => handleSelectCeoFilter(dept.key)}
                    >
                      <span>{dept.name} ({dept.badge})</span>
                      {isCur && <Check size={14} color={dept.accentColor} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sales CRM Dropdown Container (Visible to CEO & Sales Team) */}
        {canAccessSalesCrm && (
          <div className="zzc-sales-menu-wrap" ref={salesDropdownRef}>
            <button
              className={"zzc-btn zzc-btn-outline" + (salesMenuOpen ? " active" : "")}
              style={{ fontWeight: "normal", display: "inline-flex", alignItems: "center" }}
              onClick={(e) => {
                e.preventDefault();
                setSalesMenuOpen((prev) => !prev);
              }}
            >
              Sales CRM <span className="zzc-caret" style={{ marginLeft: "6px", fontSize: "10px" }}>▼</span>
            </button>

            {salesMenuOpen && (
              <div className="zzc-sales-menu">
                <button onClick={() => handleRoleClick("executive")}>
                  Sales executive
                </button>
                <button onClick={() => handleRoleClick("manager")}>
                  Sales manager
                </button>
                <button onClick={() => handleRoleClick("regional")}>
                  Regional manager
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Role Pill */}
        {adminUser && (
          <span
            className="zzc-btn zzc-btn-outline"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "default",
              fontWeight: 600,
            }}
          >
            {isCeo ? <Crown size={14} color="#d97706" /> : <User size={14} />}
            <span>{adminUser.name || (isCeo ? "CEO" : "Department Lead")}</span>
          </span>
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            className="zzc-btn zzc-btn-outline"
            onClick={onLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Log out of Portal"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
