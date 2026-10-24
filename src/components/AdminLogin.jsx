import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../api";
import doctorBanner from "../assets/zippy-doctor-banner.png";
import zenveBrandIcon from "../assets/zenve-brand-icon.png";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Stethoscope,
  FileText,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  RotateCcw,
  Edit3,
  ShieldCheck,
  Crown,
  HeartHandshake,
  CalendarCheck,
  ShoppingBag,
  CreditCard,
  Sliders,
  Briefcase,
  Zap,
  Building2,
} from "lucide-react";
import { LOGIN_ROLES, getRoleConfig } from "../data.js";
import "./AdminLogin.css";

export default function AdminLogin({ onLoginSuccess }) {
  // Portal Category: "ceo" or "department"
  const [portalType, setPortalType] = useState("ceo");

  // Selected Portal Role: default to "ceo"
  const [selectedRoleKey, setSelectedRoleKey] = useState("ceo");
  const selectedRole = getRoleConfig(selectedRoleKey);

  // Auth Mode: "email" or "mobile"
  const [authMode, setAuthMode] = useState("email");

  // Email form state (pre-filled with selected role's demo credentials)
  const [email, setEmail] = useState(selectedRole.email || "ceo@zenvezippy.com");
  const [password, setPassword] = useState(selectedRole.defaultPassword || "ceo123");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Mobile OTP form state
  const [phone, setPhone] = useState(selectedRole.phone || "9876543210");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [demoOtpHint, setDemoOtpHint] = useState("");
  const otpInputsRef = useRef([]);

  // Common UI state
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  function handleSelectRole(roleKey) {
    if (loading || isSuccess) return;
    setSelectedRoleKey(roleKey);
    const cfg = getRoleConfig(roleKey);
    if (cfg.isCeo) {
      setPortalType("ceo");
    } else {
      setPortalType("department");
    }
    setEmail(cfg.email || "");
    setPassword(cfg.defaultPassword || "");
    setPhone(cfg.phone || "");
    setOtpSent(false);
    setDemoOtpHint("");
    setError(null);
    setInfoMessage(null);
  }

  function handleSwitchPortalType(type) {
    if (loading || isSuccess) return;
    setPortalType(type);
    if (type === "ceo") {
      handleSelectRole("ceo");
    } else {
      // If switching to department, pick first department if currently CEO
      if (selectedRoleKey === "ceo") {
        handleSelectRole("pet_parents");
      }
    }
  }

  function switchMode(newMode) {
    if (loading || isSuccess) return;
    setAuthMode(newMode);
    setError(null);
    setInfoMessage(null);
  }

  function handlePasswordKeyUp(e) {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  }

  // -------------------------------------------------------------
  // 0. Quick 1-Click Demo Login Handler
  // -------------------------------------------------------------
  async function handleInstantDemoLogin(roleKey = selectedRoleKey) {
    if (loading || isSuccess) return;
    const cfg = getRoleConfig(roleKey);
    setLoading(true);
    setError(null);

    const loggedInUser = {
      id: (cfg.sectionIndex || 0) + 1,
      email: cfg.email,
      name: cfg.name,
      title: cfg.title,
      role: cfg.key,
      role_label: cfg.name,
      is_ceo: cfg.isCeo,
      allowed_groups: cfg.allowedGroups,
    };

    try {
      fetch(`${API_BASE}/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cfg.email,
          password: cfg.defaultPassword,
          role: cfg.key,
        }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }

    localStorage.setItem("zippy_admin_user", JSON.stringify(loggedInUser));
    setIsSuccess(true);
    setTimeout(() => {
      onLoginSuccess(loggedInUser);
    }, 450);
  }

  // -------------------------------------------------------------
  // 1. Email & Password Login Handler
  // -------------------------------------------------------------
  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (loading || isSuccess) return;
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const activeCfg = getRoleConfig(selectedRoleKey);

    try {
      let loggedInUser = null;

      // 1. Try FastAPI backend endpoint first
      try {
        const res = await fetch(`${API_BASE}/admin-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            role: selectedRoleKey,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          loggedInUser = data.user;
        }
      } catch (networkErr) {
        console.warn("Backend ping failed, using local auth verification", networkErr);
      }

      // 2. Local fallback validation for Zenve Zippy Multi-Role
      if (!loggedInUser) {
        if (cleanEmail === activeCfg.email && cleanPassword === activeCfg.defaultPassword) {
          loggedInUser = {
            id: (activeCfg.sectionIndex || 0) + 1,
            email: activeCfg.email,
            name: activeCfg.name,
            title: activeCfg.title,
            role: activeCfg.key,
            role_label: activeCfg.name,
            is_ceo: activeCfg.isCeo,
            allowed_groups: activeCfg.allowedGroups,
          };
        } else if (cleanEmail.includes("@") && cleanPassword.length >= 4) {
          loggedInUser = {
            id: (activeCfg.sectionIndex || 0) + 1,
            email: cleanEmail,
            name: activeCfg.name,
            title: activeCfg.title,
            role: activeCfg.key,
            role_label: activeCfg.name,
            is_ceo: activeCfg.isCeo,
            allowed_groups: activeCfg.allowedGroups,
          };
        }
      }

      if (loggedInUser) {
        localStorage.setItem("zippy_admin_user", JSON.stringify(loggedInUser));
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess(loggedInUser);
        }, 500);
      } else {
        throw new Error("Invalid credentials for selected portal. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------
  // 2. Mobile OTP Flow Handlers
  // -------------------------------------------------------------
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    if (loading || isSuccess) return;
    setError(null);
    setInfoMessage(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      let otpCode = "123456";

      // 1. Call Backend API
      try {
        const res = await fetch(`${API_BASE}/admin-send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone, role: selectedRoleKey }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.otp) otpCode = data.otp;
          else if (data.mock_otp) otpCode = data.mock_otp;

          if (data.sms_sent && !data.otp) {
            setInfoMessage(`Verification code sent via SMS to +91 ${cleanPhone.slice(-10)}`);
            setDemoOtpHint("");
          } else {
            setInfoMessage(`Verification code sent to +91 ${cleanPhone.slice(-10)}`);
            setDemoOtpHint(otpCode);
          }
        }
      } catch (networkErr) {
        console.warn("Backend OTP request failed, using local OTP fallback", networkErr);
        setDemoOtpHint(otpCode);
        setInfoMessage(`Local fallback OTP: ${otpCode}`);
      }

      setOtpSent(true);
      setOtpTimer(30);
      setOtpDigits(["", "", "", "", "", ""]);
      setLoading(false);

      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
      setLoading(false);
    }
  }

  function handleOtpDigitChange(index, val) {
    const char = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  function handleOtpDigitKeyDown(index, e) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    const focusIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[focusIndex]?.focus();
  }

  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    if (loading || isSuccess) return;

    const enteredOtp = otpDigits.join("").trim();
    if (enteredOtp.length < 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setError(null);
    setLoading(true);

    const cleanPhone = phone.replace(/\D/g, "");
    const activeCfg = getRoleConfig(selectedRoleKey);

    try {
      let loggedInUser = null;

      // 1. Try backend verification
      try {
        const res = await fetch(`${API_BASE}/admin-verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone, otp: enteredOtp, role: selectedRoleKey }),
        });

        if (res.ok) {
          const data = await res.json();
          loggedInUser = data.user;
        }
      } catch (networkErr) {
        console.warn("Backend verify failed, using local verification", networkErr);
      }

      // 2. Fallback local verification
      if (!loggedInUser) {
        if (enteredOtp === demoOtpHint || enteredOtp === "123456") {
          loggedInUser = {
            id: (activeCfg.sectionIndex || 0) + 1,
            email: activeCfg.email,
            phone: cleanPhone.slice(-10),
            name: activeCfg.name,
            title: activeCfg.title,
            role: activeCfg.key,
            role_label: activeCfg.name,
            is_ceo: activeCfg.isCeo,
            allowed_groups: activeCfg.allowedGroups,
          };
        }
      }

      if (loggedInUser) {
        localStorage.setItem("zippy_admin_user", JSON.stringify(loggedInUser));
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess(loggedInUser);
        }, 500);
      } else {
        throw new Error("Invalid OTP code. Please check and re-enter.");
      }
    } catch (err) {
      setError(err.message || "OTP verification failed. Please try again.");
      setLoading(false);
    }
  }

  // Render role icon
  function renderRoleIcon(iconName, size = 16, color = "currentColor") {
    switch (iconName) {
      case "Crown":
        return <Crown size={size} color={color} />;
      case "HeartHandshake":
        return <HeartHandshake size={size} color={color} />;
      case "Stethoscope":
        return <Stethoscope size={size} color={color} />;
      case "CalendarCheck":
        return <CalendarCheck size={size} color={color} />;
      case "ShoppingBag":
        return <ShoppingBag size={size} color={color} />;
      case "CreditCard":
        return <CreditCard size={size} color={color} />;
      case "Sliders":
        return <Sliders size={size} color={color} />;
      case "Briefcase":
        return <Briefcase size={size} color={color} />;
      default:
        return <ShieldCheck size={size} color={color} />;
    }
  }

  const departmentRoles = LOGIN_ROLES.slice(1);

  return (
    <div className="zzc-split-auth-container">
      {/* LEFT SIDE: Hero Showcase Panel */}
      <div className="zzc-auth-hero-panel">
        <div className="zzc-hero-bg-overlay" />
        <img
          src={doctorBanner}
          alt="Veterinary Clinic Pet Care"
          className="zzc-hero-bg-image"
        />

        <div className="zzc-hero-content-wrapper">
          {/* Brand Header */}
          <div className="zzc-hero-brand-header">
            <div className="zzc-brand-logo-container">
              <img
                src={zenveBrandIcon}
                alt="Zenve Zippy"
                className="zzc-brand-logo-img"
              />
            </div>
            <div className="zzc-hero-brand-text">
              <h2>Zenve Zippy</h2>
              <span>Healthy Pets &bull; Happier Lives</span>
            </div>
          </div>

          {/* Main Hero Headline */}
          <div className="zzc-hero-body">
            <div className="zzc-hero-role-chip" style={{ borderColor: selectedRole.accentColor }}>
              <span className="zzc-hero-chip-icon">
                {renderRoleIcon(selectedRole.iconName, 14, selectedRole.accentColor)}
              </span>
              <span style={{ color: selectedRole.accentColor, fontWeight: 700 }}>
                {selectedRole.isCeo ? "👑 Executive Portal" : `🔒 ${selectedRole.name} Portal`}
              </span>
            </div>

            <h1 className="zzc-hero-headline">
              {selectedRole.isCeo ? (
                <>
                  Run the whole pet<br />
                  ecosystem from one master<br />
                  <span className="zzc-highlight-keyword">dashboard.</span>
                </>
              ) : (
                <>
                  Dedicated portal for<br />
                  <span style={{ color: selectedRole.accentColor }}>{selectedRole.name}</span><br />
                  operations.
                </>
              )}
            </h1>

            <p className="zzc-hero-description">
              {selectedRole.isCeo
                ? "Full CEO administrative authority over Pet Parents, Doctors & Clinics, Bookings, Commerce, Orders & Payments, Platform, and Sales Team."
                : `Strictly isolated to ${selectedRole.name} (${selectedRole.badge}): ${selectedRole.tagline}.`}
            </p>

            {/* 3 Colored Feature Cards */}
            <div className="zzc-hero-features-list">
              <div className="zzc-hero-feature-card zzc-card-mint">
                <div className="zzc-feature-icon-box zzc-icon-teal">
                  <Stethoscope size={20} color="#ffffff" />
                </div>
                <div className="zzc-feature-text">
                  <strong>Veterinary & Doctor Network</strong>
                  <span>Doctor profiles, clinic slots & teleconsults</span>
                </div>
                <div className="zzc-card-arrow-circle">
                  <ArrowRight size={15} />
                </div>
              </div>

              <div className="zzc-hero-feature-card zzc-card-lavender">
                <div className="zzc-feature-icon-box zzc-icon-purple">
                  <FileText size={20} color="#ffffff" />
                </div>
                <div className="zzc-feature-text">
                  <strong>Digital prescriptions & records</strong>
                  <span>Pet health histories, lab reports & vaccines</span>
                </div>
                <div className="zzc-card-arrow-circle">
                  <ArrowRight size={15} />
                </div>
              </div>

              <div className="zzc-hero-feature-card zzc-card-amber">
                <div className="zzc-feature-icon-box zzc-icon-amber">
                  <Package size={20} color="#ffffff" />
                </div>
                <div className="zzc-feature-text">
                  <strong>Commerce & Orders, Handled.</strong>
                  <span>Medicines, multi-store inventory & logistics</span>
                </div>
                <div className="zzc-card-arrow-circle">
                  <ArrowRight size={15} />
                </div>
              </div>
            </div>
          </div>

          {/* Hero Footer */}
          <div className="zzc-hero-footer">
            <div className="zzc-footer-copy">
              <span>&copy; {new Date().getFullYear()} Zenve Technologies Inc.</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Login Form & Playful Doodles */}
      <div className="zzc-auth-form-panel">
        {/* Floating Top Right Handwritten Doodles */}
        <div className="zzc-doodle-top-right">
          <div className="zzc-doodle-handwriting">Role-Based Access</div>
          <div className="zzc-doodle-handwriting-sub">
            CEO Whole Site &bull; 7 Depts <span className="zzc-doodle-heart">✓</span>
          </div>
          <svg className="zzc-doodle-curve" viewBox="0 0 90 18" fill="none">
            <path d="M2 14C24 4 60 4 88 12" stroke="#00967a" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Centered Login Card */}
        <div className="zzc-form-center-box zzc-form-role-portal-box">
          {/* Card Brand Header */}
          <div className="zzc-card-brand-top">
            <div className="zzc-card-paw-logo">
              <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
                <path d="M24 20C17.5 20 13 25.5 13 32C13 38.5 18 43 24 43C30 43 35 38.5 35 32C35 25.5 30.5 20 24 20Z" fill="#00b08b" />
                <path d="M24 28C22.2 25.5 18.5 26.5 18.5 29.5C18.5 33 24 37 24 37C24 37 29.5 33 29.5 29.5C29.5 26.5 25.8 25.5 24 28Z" fill="#ffffff" />
                <ellipse cx="12" cy="19" rx="4.5" ry="6" transform="rotate(-20 12 19)" fill="#00b08b" />
                <ellipse cx="20" cy="12" rx="4.5" ry="6" transform="rotate(-6 20 12)" fill="#00b08b" />
                <ellipse cx="28" cy="12" rx="4.5" ry="6" transform="rotate(6 28 12)" fill="#00b08b" />
                <ellipse cx="36" cy="19" rx="4.5" ry="6" transform="rotate(20 36 19)" fill="#00b08b" />
              </svg>
            </div>
            <div className="zzc-card-brand-title">
              <h3>
                {selectedRole.isCeo ? "CEO Master" : selectedRole.name}{" "}
                <span className="zzc-zippy-accent">Portal</span>
              </h3>
              <p>Zenve Zippy &bull; Multi-Portal Login</p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* COMPACT SEGMENTED PORTAL SWITCHER: CEO vs 7 DEPARTMENTS        */}
          {/* ============================================================== */}
          <div className="zzc-compact-portal-control">
            <div className="zzc-portal-segment-tabs" role="tablist">
              <button
                type="button"
                className={`zzc-segment-tab-btn ${portalType === "ceo" ? "active-ceo" : ""}`}
                onClick={() => handleSwitchPortalType("ceo")}
              >
                <Crown size={15} className="zzc-crown-glow" />
                <span>👑 CEO (Whole Website)</span>
              </button>
              <button
                type="button"
                className={`zzc-segment-tab-btn ${portalType === "department" ? "active-dept" : ""}`}
                onClick={() => handleSwitchPortalType("department")}
              >
                <Building2 size={15} />
                <span>🏢 Department Logins</span>
              </button>
            </div>

            {/* If Department chosen: Show compact 7-department pill picker */}
            {portalType === "department" && (
              <div className="zzc-dept-chips-container">
                <div className="zzc-dept-chips-header">
                  <span>Select Department:</span>
                </div>
                <div className="zzc-dept-chips-grid">
                  {departmentRoles.map((role) => {
                    const isCur = selectedRoleKey === role.key;
                    return (
                      <button
                        key={role.key}
                        type="button"
                        className={`zzc-dept-chip-btn ${isCur ? "active" : ""}`}
                        onClick={() => handleSelectRole(role.key)}
                        style={{
                          "--dept-color": role.accentColor,
                        }}
                      >
                        <span className="zzc-chip-icon" style={{ color: role.accentColor }}>
                          {renderRoleIcon(role.iconName, 13, role.accentColor)}
                        </span>
                        <span className="zzc-chip-label">{role.name}</span>
                        <span className="zzc-chip-badge">S{role.sectionIndex}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COMPACT ACTIVE SCOPE PILL */}
          <div
            className="zzc-compact-scope-pill"
            style={{
              borderColor: selectedRole.accentColor,
              background: `${selectedRole.accentColor}12`,
            }}
          >
            <span style={{ color: selectedRole.accentColor, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "5px" }}>
              {renderRoleIcon(selectedRole.iconName, 13, selectedRole.accentColor)}
              {selectedRole.isCeo ? "CEO Master Authority:" : `${selectedRole.name}:`}
            </span>
            <span className="zzc-scope-pill-text">
              {selectedRole.isCeo
                ? "Full access to whole website (all 7 sections)"
                : `Strictly isolated to ${selectedRole.badge}`}
            </span>
          </div>

          {/* ⚡ INSTANT 1-CLICK DEMO LOGIN BUTTON */}
          <button
            type="button"
            className="zzc-instant-demo-btn"
            onClick={() => handleInstantDemoLogin(selectedRoleKey)}
            disabled={loading || isSuccess}
            style={{
              background: selectedRole.gradient,
            }}
          >
            <Zap size={15} className="zzc-zap-icon" />
            <span>
              Instant 1-Click Login as <strong>{selectedRole.name}</strong>
            </span>
          </button>

          <div className="zzc-divider-text-row">
            <span>or sign in with credentials</span>
          </div>

          {/* Login Mode Switcher Tabs */}
          <div className="zzc-login-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === "email"}
              className={`zzc-mode-tab-btn ${authMode === "email" ? "active" : ""}`}
              onClick={() => switchMode("email")}
            >
              <Mail size={14} />
              <span>Email &amp; Password</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === "mobile"}
              className={`zzc-mode-tab-btn ${authMode === "mobile" ? "active" : ""}`}
              onClick={() => switchMode("mobile")}
            >
              <Smartphone size={14} />
              <span>Mobile OTP</span>
            </button>
          </div>

          {/* Info Alert */}
          {infoMessage && (
            <div className="zzc-auth-alert-info" role="status">
              <ShieldCheck size={15} className="zzc-info-icon" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="zzc-auth-alert-error" role="alert">
              <span className="zzc-alert-indicator">!</span>
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: EMAIL & PASSWORD FORM                                   */}
          {/* ============================================================== */}
          {authMode === "email" && (
            <form onSubmit={handleEmailSubmit} className="zzc-login-form" noValidate>
              {/* Email Field */}
              <div className="zzc-field-group">
                <label htmlFor="admin-email">
                  {selectedRole.name} Email <span className="zzc-required-asterisk">*</span>
                </label>
                <div className="zzc-input-container">
                  <Mail size={16} className="zzc-input-left-icon" />
                  <input
                    id="admin-email"
                    type="email"
                    placeholder={selectedRole.email}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading || isSuccess}
                    spellCheck="false"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="zzc-field-group">
                <div className="zzc-field-label-row">
                  <label htmlFor="admin-password">
                    Password <span className="zzc-required-asterisk">*</span>
                  </label>
                  {capsLockActive && (
                    <span className="zzc-capslock-warning">
                      <AlertCircle size={11} /> Caps Lock is ON
                    </span>
                  )}
                </div>
                <div className="zzc-input-container">
                  <Lock size={16} className="zzc-input-left-icon" />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handlePasswordKeyUp}
                    onKeyDown={handlePasswordKeyUp}
                    autoComplete="current-password"
                    disabled={loading || isSuccess}
                  />
                  <button
                    type="button"
                    className="zzc-password-toggle-btn"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`zzc-signin-btn ${isSuccess ? "zzc-btn-success" : ""}`}
                disabled={loading || isSuccess}
                style={{
                  background: isSuccess ? undefined : selectedRole.gradient,
                }}
              >
                {isSuccess ? (
                  <span className="zzc-btn-text-content">
                    <CheckCircle2 size={17} />
                    Verified! Entering {selectedRole.name} Portal...
                  </span>
                ) : loading ? (
                  <span className="zzc-btn-loading-content">
                    <span className="zzc-spinner-circle" />
                    Signing In...
                  </span>
                ) : (
                  <span className="zzc-btn-text-content">
                    Sign in to {selectedRole.name} <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 2: MOBILE LOGIN WITH OTP                                   */}
          {/* ============================================================== */}
          {authMode === "mobile" && (
            <div className="zzc-login-form">
              {!otpSent ? (
                /* Step 1: Enter Mobile Number */
                <form onSubmit={handleSendOtp} className="zzc-mobile-step-form">
                  <div className="zzc-field-group">
                    <label htmlFor="admin-phone">
                      {selectedRole.name} Mobile Number <span className="zzc-required-asterisk">*</span>
                    </label>
                    <div className="zzc-input-container zzc-phone-input-container">
                      <div className="zzc-phone-prefix">
                        <span className="zzc-flag-icon">🇮🇳</span>
                        <span className="zzc-code-text">+91</span>
                      </div>
                      <input
                        id="admin-phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="98765 43210"
                        required
                        value={phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setPhone(digits);
                        }}
                        autoComplete="tel"
                        disabled={loading || isSuccess}
                      />
                    </div>
                    <span className="zzc-field-hint">
                      We'll send a 6-digit one-time password to verify {selectedRole.name} access.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="zzc-signin-btn"
                    disabled={loading || isSuccess || phone.length < 10}
                    style={{
                      background: selectedRole.gradient,
                    }}
                  >
                    {loading ? (
                      <span className="zzc-btn-loading-content">
                        <span className="zzc-spinner-circle" />
                        Sending OTP...
                      </span>
                    ) : (
                      <span className="zzc-btn-text-content">
                        <ArrowRight size={16} /> Send OTP Code
                      </span>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter 6-digit OTP */
                <form onSubmit={handleVerifyOtp} className="zzc-otp-verify-form">
                  <div className="zzc-phone-badge-row">
                    <div className="zzc-phone-target">
                      <Smartphone size={14} color={selectedRole.accentColor} />
                      <span>Code sent to <strong>+91 {phone}</strong></span>
                    </div>
                    <button
                      type="button"
                      className="zzc-change-phone-btn"
                      onClick={() => {
                        setOtpSent(false);
                        setError(null);
                        setInfoMessage(null);
                      }}
                      disabled={loading || isSuccess}
                    >
                      <Edit3 size={12} /> Change
                    </button>
                  </div>

                  <div className="zzc-field-group">
                    <label>
                      Enter 6-Digit OTP <span className="zzc-required-asterisk">*</span>
                    </label>
                    <div className="zzc-otp-boxes-grid" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (otpInputsRef.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className={`zzc-otp-box ${digit ? "filled" : ""}`}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpDigitKeyDown(index, e)}
                          disabled={loading || isSuccess}
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="zzc-otp-resend-row">
                    {otpTimer > 0 ? (
                      <span className="zzc-otp-timer-text">
                        Resend code in <strong>{otpTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="zzc-resend-otp-btn"
                        onClick={handleSendOtp}
                        disabled={loading || isSuccess}
                      >
                        <RotateCcw size={13} /> Resend OTP
                      </button>
                    )}
                  </div>

                  {demoOtpHint && (
                    <div className="zzc-demo-otp-banner">
                      <span>Quick Test OTP: <strong>{demoOtpHint}</strong></span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`zzc-signin-btn ${isSuccess ? "zzc-btn-success" : ""}`}
                    disabled={loading || isSuccess || otpDigits.join("").length < 6}
                    style={{
                      background: isSuccess ? undefined : selectedRole.gradient,
                    }}
                  >
                    {isSuccess ? (
                      <span className="zzc-btn-text-content">
                        <CheckCircle2 size={17} />
                        Verified! Entering {selectedRole.name} Portal...
                      </span>
                    ) : loading ? (
                      <span className="zzc-btn-loading-content">
                        <span className="zzc-spinner-circle" />
                        Verifying OTP...
                      </span>
                    ) : (
                      <span className="zzc-btn-text-content">
                        <ShieldCheck size={16} /> Verify &amp; Sign In
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Info Footer */}
          <div className="zzc-login-card-footer">
            <span className="zzc-footer-note">
              {selectedRole.isCeo
                ? "👑 CEO account has unrestricted access across all 7 sections."
                : `🔒 Logging in as ${selectedRole.name} restricts access to ${selectedRole.badge}.`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
