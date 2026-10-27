import { useState, useEffect, useRef } from "react";
import { Search, LogOut, ShieldCheck } from "lucide-react";
import { getRoleConfig } from "../data.js";
import "./TopBar.css";

export default function TopBar({
  title,
  subtitle,
  searchPlaceholder,
  showSearch = true,
  showNewRecord = true,
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

  // CEO and Sales Team or any logged-in portal user can access Sales CRM dropdown
  const canAccessSalesCrm = isCeo || adminUser?.role === "sales_team" || Boolean(adminUser);
  const isSalesCrmActive = activeTab === "sales" || activeTab === "sales_crm";

  return (
    <header className="zzc-topbar">
      <div className="zzc-topbar-left">
        <h1 className="zzc-topbar-title">{title}</h1>
        {subtitle && <p className="zzc-topbar-subtitle">{subtitle}</p>}
      </div>

      <div className="zzc-topbar-actions">
        {showSearch && (
          <div className="zzc-search-wrap">
            <Search className="zzc-search-icon" size={16} />
            <input
              type="text"
              className="zzc-search-input"
              placeholder={searchPlaceholder || "Search pet name, species, ..."}
              value={searchTerm || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        )}

        {showNewRecord && (
          <button
            type="button"
            className="zzc-topbar-btn zzc-topbar-btn-primary"
            onClick={onNewRecord}
            title="Create New Record"
          >
            <span>+ New record</span>
          </button>
        )}

        <button
          type="button"
          className={`zzc-topbar-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => onTabChange?.("dashboard")}
        >
          Dashboard
        </button>

        <button
          type="button"
          className={`zzc-topbar-btn ${activeTab === "data" ? "active" : ""}`}
          onClick={() => onTabChange?.("data")}
        >
          Data
        </button>

        <button
          type="button"
          className={`zzc-topbar-btn ${activeTab === "bulk" ? "active" : ""}`}
          onClick={() => onTabChange?.("bulk")}
        >
          Bulk Tools
        </button>

        {/* Sales CRM Dropdown Container (Visible to CEO & Sales Team) */}
        {canAccessSalesCrm && (
          <div className="zzc-sales-menu-wrap" ref={salesDropdownRef}>
            <button
              type="button"
              className={`zzc-topbar-btn ${isSalesCrmActive || salesMenuOpen ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                setSalesMenuOpen((prev) => !prev);
              }}
            >
              <span>Sales CRM</span>
              <span className="zzc-caret">▼</span>
            </button>

            {salesMenuOpen && (
              <div className="zzc-sales-menu">
                <button type="button" onClick={() => handleRoleClick("executive")}>
                  <span>Sales executive</span>
                </button>
                <button type="button" onClick={() => handleRoleClick("manager")}>
                  <span>Sales manager</span>
                </button>
                <button type="button" onClick={() => handleRoleClick("regional")}>
                  <span>Regional manager</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right side of Sales CRM: Admin */}
        <button
          type="button"
          className="zzc-topbar-btn zzc-topbar-btn-admin"
          onClick={() => onTabChange?.("data")}
          title="Admin Control"
        >
          <ShieldCheck size={15} />
          <span>Admin</span>
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            className="zzc-topbar-btn zzc-topbar-btn-logout"
            onClick={onLogout}
            title="Log out of Portal"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}

