

import { Search, Plus } from "lucide-react";

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

function Navbar({ activeItem }) {
  return (
    <header className="navbar">

      <div className="navbar-title">
        <h1>{activeItem}</h1>
      </div>

      <div className="navbar-actions">

        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", color: "var(--muted-foreground, #64748b)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search full_name"
            className="search-input"
            style={{ paddingLeft: "32px" }}
          />
        </div>

        <button
          className="primary-button"
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

        <button className="nav-button active">
          Dashboard
        </button>

        <button className="nav-button active">
          Data
        </button>

        <button className="nav-button active">
          Bulk tools
        </button>

        <button className="nav-button">
          Sales CRM
        </button>

        <button className="nav-button">
          Console
        </button>

      </div>

    </header>
  );
}

export default Navbar;