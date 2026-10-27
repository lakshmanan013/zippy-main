

import { Search, LogOut, ShieldCheck } from "lucide-react";
import "./TopBar.css";

function Navbar({ activeItem = "Data" }) {
  return (
    <header className="zzc-topbar">
      <div className="zzc-topbar-left">
        <h1 className="zzc-topbar-title">{activeItem}</h1>
      </div>

      <div className="zzc-topbar-actions">
        <div className="zzc-search-wrap">
          <Search className="zzc-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search pet name, species, ..."
            className="zzc-search-input"
          />
        </div>

        <button type="button" className="zzc-topbar-btn zzc-topbar-btn-primary">
          <span>+ New record</span>
        </button>

        <button type="button" className={`zzc-topbar-btn ${activeItem === "Dashboard" ? "active" : ""}`}>
          Dashboard
        </button>

        <button type="button" className={`zzc-topbar-btn ${activeItem === "Data" ? "active" : ""}`}>
          Data
        </button>

        <button type="button" className={`zzc-topbar-btn ${activeItem === "Bulk Tools" ? "active" : ""}`}>
          Bulk Tools
        </button>

        <button type="button" className="zzc-topbar-btn">
          <span>Sales CRM</span>
          <span className="zzc-caret">▼</span>
        </button>

        <button type="button" className="zzc-topbar-btn zzc-topbar-btn-admin">
          <ShieldCheck size={15} />
          <span>Admin</span>
        </button>

        <button type="button" className="zzc-topbar-btn zzc-topbar-btn-logout">
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;