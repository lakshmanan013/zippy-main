import { useState } from "react";
import { API_BASE } from "../api";
import logo from "../assets/zenve-zippy-logo.jpeg";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import "./AdminLogin.css";

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      let loggedInUser = null;

      // Try FastAPI backend endpoint first
      try {
        const res = await fetch(`${API_BASE}/admin-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });

        if (res.ok) {
          const data = await res.json();
          loggedInUser = data.user || {
            email: cleanEmail,
            name: "Admin User",
            role: "Administrator",
          };
        }
      } catch (networkErr) {
        console.warn("Backend ping failed, using local auth verification", networkErr);
      }

      // If backend accepted or local admin validation matches
      if (!loggedInUser) {
        const ADMIN_EMAIL = "admin@zenvezippy.com";
        const ADMIN_PASSWORD = "admin123";

        if (cleanEmail === ADMIN_EMAIL && cleanPassword === ADMIN_PASSWORD) {
          loggedInUser = {
            id: 1,
            email: ADMIN_EMAIL,
            name: "Admin",
            role: "Administrator",
          };
        }
      }

      if (loggedInUser) {
        if (rememberMe) {
          localStorage.setItem("zippy_admin_user", JSON.stringify(loggedInUser));
        } else {
          sessionStorage.setItem("zippy_admin_user", JSON.stringify(loggedInUser));
        }
        onLoginSuccess(loggedInUser);
      } else {
        throw new Error("Invalid admin email or password. Access denied.");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="zzc-admin-auth-wrapper">
      {/* Ambient background lighting */}
      <div className="zzc-auth-bg-glow zzc-glow-top-left" />
      <div className="zzc-auth-bg-glow zzc-glow-bottom-right" />

      <div className="zzc-admin-login-card">
        {/* Brand Header */}
        <div className="zzc-admin-login-header">
          <div className="zzc-admin-logo-wrapper">
            <img src={logo} alt="Zenve Zippy Logo" className="zzc-admin-logo-img" />
          </div>
          <div className="zzc-admin-brand-info">
            <h1 className="zzc-admin-title">Zenve Zippy Admin</h1>
            <p className="zzc-admin-subtitle">
              <ShieldCheck size={16} className="zzc-shield-icon" />
              Admin Portal
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="zzc-auth-alert-error" role="alert">
            <span className="zzc-alert-indicator">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit} className="zzc-admin-form">
          <div className="zzc-form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <div className="zzc-input-wrapper">
              <Mail size={18} className="zzc-input-icon" />
              <input
                id="admin-email"
                type="text"
                placeholder="admin@zenvezippy.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="zzc-form-group">
            <div className="zzc-label-row">
              <label htmlFor="admin-password">Password</label>
            </div>
            <div className="zzc-input-wrapper">
              <Lock size={18} className="zzc-input-icon" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="zzc-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="zzc-form-options">
            <label className="zzc-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember this session</span>
            </label>
          </div>

          <button
            type="submit"
            className="zzc-admin-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="zzc-btn-loading-state">
                <span className="zzc-spinner" />
                Signing in...
              </span>
            ) : (
              <span className="zzc-btn-content">
                Login to Admin CRM
                <ArrowRight size={18} className="zzc-btn-arrow" />
              </span>
            )}
          </button>
        </form>
      </div>

      <div className="zzc-auth-footer-tag">
        &copy; {new Date().getFullYear()} Zenve Zippy Platform &bull; Admin Portal
      </div>
    </div>
  );
}
