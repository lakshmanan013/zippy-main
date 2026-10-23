import { useState, useEffect, useRef } from "react";
import { Search, Plus, LogOut, User } from "lucide-react";

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
  // State to handle opening and closing the dropdown list panel
  const [salesMenuOpen, setSalesMenuOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Closes menus automatically if you click anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSalesMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleRoleClick(view) {
    setSalesMenuOpen(false); // Closes the dropdown panel smoothly
    onOpenSalesCRM?.(view);  // Executes your page transition
  }

  return (
    <header className="zzc-topbar">
      <div>
        <h1>{title}</h1>
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
            <PawIcon size={15} color="#ffffff" />
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


        {/* Sales CRM Dropdown Container Layout */}
        <div className="zzc-sales-menu-wrap" ref={dropdownRef}>
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


        {/* Admin User Chip & Logout */}
        {adminUser && (
          <span
            className="zzc-btn zzc-btn-outline"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "default",
            }}
          >
            <User size={14} />
            <span>{adminUser.name || "Admin"}</span>
          </span>
        )}

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
            title="Log out of Admin CRM"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
