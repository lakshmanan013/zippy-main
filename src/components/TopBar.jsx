import { useState, useEffect, useRef } from "react";
import { Search, LogOut, ShieldCheck } from "lucide-react";
import { getRoleConfig } from "../data.js";

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
}) {
  const [salesMenuOpen, setSalesMenuOpen] = useState(false);
  const salesDropdownRef = useRef(null);

  const isCeo = Boolean(
    adminUser?.is_ceo ||
    adminUser?.isCeo ||
    adminUser?.role === "ceo" ||
    adminUser?.role === "Administrator" ||
    adminUser?.role === "admin"
  );
  const roleCfg = getRoleConfig(adminUser?.role);

  // Closes menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(event.target)) {
        setSalesMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleRoleClick(view) {
    setSalesMenuOpen(false);
    onOpenSalesCRM?.(view);
  }

  // Only CEO and Sales Team can see/access the Sales CRM dropdown
  const canAccessSalesCrm = isCeo || adminUser?.role === "sales_team";

  return (
    <header className="zzc-topbar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h1 style={{ margin: 0 }}>{title}</h1>
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

        {/* Right side of Sales CRM: Admin */}
        <button
          type="button"
          className="zzc-btn zzc-btn-outline"
          onClick={() => onTabChange?.("data")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 700,
            color: "#0d8b7b",
            borderColor: "#99f6e4",
            background: "#f0fdfa",
            cursor: "pointer",
            padding: "0.45rem 0.85rem",
            borderRadius: "8px",
          }}
          title="Admin Control"
        >
          <ShieldCheck size={14} color="#0d8b7b" />
          <span>Admin</span>
        </button>

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
