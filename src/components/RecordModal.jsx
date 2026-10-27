import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Target,
  User,
  X,
} from "lucide-react";
import { findLabel } from "../data.js";
import { sendMobileOtp, verifyMobileOtp, fetchList } from "../api.js";
import modalPetHeaderImg from "../assets/modal-pet-header.png";
import "./RecordModal.css";

function PawIcon({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 11c-2.2 0-4.3 1.6-4.3 4.1 0 2.1 1.7 3.5 4.3 3.5s4.3-1.4 4.3-3.5c0-2.5-2.1-4.1-4.3-4.1z" />
      <circle cx="5.6" cy="10.2" r="1.9" />
      <circle cx="9.3" cy="6.2" r="1.9" />
      <circle cx="14.7" cy="6.2" r="1.9" />
      <circle cx="18.4" cy="10.2" r="1.9" />
    </svg>
  );
}

function getRecordTitle(key) {
  const titles = {
    sales_executives: "Sales Executive",
    sales_managers: "Sales Manager",
    regional_managers: "Regional Manager",
    pet_parents: "Pet Parent",
    pets: "Pet",
    medical_records: "Medical Record",
    vaccinations: "Vaccination",
    addresses: "Address",
    user_roles: "User Role",
    doctors: "Doctor",
    clinics: "Clinic / Hospital",
    availability_slots: "Availability Slot",
    doctor_documents: "Doctor Document",
    appointments: "Appointment",
    consultations: "Consultation",
    prescriptions: "Prescription",
    service_providers: "Service Provider",
    services: "Service",
    service_bookings: "Service Booking",
    products: "Medicine / Product",
    inventory: "Inventory Item",
    categories: "Category",
    brands: "Brand",
    sellers: "Seller / Store",
    warehouses: "Warehouse",
    carts: "Cart",
    cart_items: "Cart Item",
    orders: "Order",
    order_items: "Order Item",
    deliveries: "Delivery",
    payments: "Payment",
    refunds: "Refund",
    payouts: "Payout",
    commission_rules: "Commission Rule",
    gps_locations: "GPS Location",
    reviews: "Review",
    notifications: "Notification",
    vendor_membership_plans: "Membership Plan",
    plan_benefits: "Plan Benefit",
    vendors: "Vendor",
    support_tickets: "Support Ticket",
    geocoding_cache: "Geocoding Cache",
    audit_logs: "Audit Log",
    pincode_coverage: "Pin Code Coverage",
    executive_tasks: "Executive Task",
    executive_alerts: "Executive Alert",
  };
  if (titles[key]) return titles[key];
  const label = findLabel(key);
  if (label && typeof label === "string") {
    return label.replace(/s$/i, "");
  }
  return "Record";
}

/* 6 distinct color themes matching the reference Add Pet UI mockup */
function getFieldTheme(key, type, index) {
  const k = (key || "").toLowerCase();
  if (
    k === "parent_id" ||
    k === "id" ||
    k === "code" ||
    k === "user_id" ||
    k === "pet_id" ||
    k === "doctor_id" ||
    k.endsWith("_id")
  ) {
    return "theme-green";
  }
  if (k === "name" || k.includes("name") || k === "title") {
    return "theme-teal";
  }
  if (
    k === "species" ||
    k === "category" ||
    k === "type" ||
    k === "role" ||
    k === "department" ||
    k === "specialization" ||
    k === "qualification"
  ) {
    return "theme-purple";
  }
  if (
    k === "breed" ||
    k === "city" ||
    k === "region" ||
    k === "state" ||
    k === "address" ||
    k === "pincode" ||
    k === "location" ||
    k === "line1"
  ) {
    return "theme-blue";
  }
  if (
    k === "gender" ||
    k === "sex" ||
    k.includes("phone") ||
    k.includes("mobile") ||
    k === "email" ||
    k === "contact"
  ) {
    return "theme-pink";
  }
  if (
    k.includes("weight") ||
    k.includes("target") ||
    k.includes("fee") ||
    k.includes("price") ||
    k.includes("cost") ||
    k.includes("amount") ||
    type === "number"
  ) {
    return "theme-amber";
  }

  // Fallback: alternate nicely across all 6 themes
  const colorThemes = [
    "theme-green",
    "theme-teal",
    "theme-purple",
    "theme-blue",
    "theme-pink",
    "theme-amber",
  ];
  return colorThemes[index % colorThemes.length];
}

/* Field label icons matching the reference Add Pet mockup */
function getFieldLabelIcon(key) {
  const k = (key || "").toLowerCase();
  if (k === "name" || k === "species" || k === "breed" || k.includes("pet")) {
    return PawIcon;
  }
  if (k === "gender" || k === "sex") {
    return Tag;
  }
  if (
    k.includes("weight") ||
    k.includes("target") ||
    k.includes("fee") ||
    k.includes("amount")
  ) {
    return Target;
  }
  if (
    k.includes("id") ||
    k.includes("code") ||
    k.includes("user") ||
    k.includes("doctor") ||
    k.includes("parent")
  ) {
    return User;
  }
  if (k.includes("phone") || k.includes("mobile")) return Phone;
  if (k.includes("email")) return Mail;
  if (k.includes("password")) return LockKeyhole;
  if (k.includes("region") || k.includes("city") || k.includes("address")) return MapPin;
  if (k.includes("active") || k.includes("status")) return ShieldCheck;
  return Tag;
}

/* Left shell icons inside the input */
function getFieldShellIcon(key, type) {
  const k = (key || "").toLowerCase();
  if (
    k === "parent_id" ||
    k === "user_id" ||
    k === "doctor_id" ||
    k === "id" ||
    k === "name" ||
    k.includes("name")
  ) {
    return User;
  }
  if (k === "species" || k === "breed" || k === "gender" || k === "category") {
    return Tag;
  }
  if (
    k.includes("weight") ||
    k.includes("target") ||
    k.includes("fee") ||
    k.includes("price") ||
    k.includes("cost") ||
    k.includes("amount") ||
    type === "number"
  ) {
    return Target;
  }
  if (k.includes("phone") || k.includes("mobile") || k.includes("contact")) return Phone;
  if (k.includes("email") || type === "email") return Mail;
  if (k.includes("password") || type === "password") return LockKeyhole;
  if (
    k.includes("region") ||
    k.includes("city") ||
    k.includes("address") ||
    k.includes("pincode") ||
    k.includes("state")
  ) {
    return MapPin;
  }
  if (k.includes("clinic") || k.includes("hospital") || k.includes("store")) return Building2;
  if (k.includes("date") || type === "date") return Calendar;
  if (k.includes("time") || type === "time") return Clock;
  if (k.includes("active") || k.includes("status") || type === "bool" || type === "yesno") {
    return ShieldCheck;
  }
  return Tag;
}

function getFieldPlaceholder(field) {
  const k = (field.key || "").toLowerCase();
  const label = field.label || field.key;
  if (k === "password") return "Minimum 6 characters";
  if (k === "region") return "Enter region";
  if (k === "city") return "Enter city";
  if (k === "email") return "name@example.com";
  if (k.includes("phone")) return "Enter phone number";
  if (k === "code") return "e.g. " + (field.default || "CODE-001");
  if (k === "monthly_target") return "Enter monthly target";
  return `Enter ${label.toLowerCase()}`;
}

function groupColumnsIntoSections(columns, tableKey) {
  const cleanColumns = (columns || []).filter((c) => c.key !== "is_phone_verified");

  if (
    tableKey === "sales_executives" ||
    tableKey === "sales_managers" ||
    tableKey === "regional_managers"
  ) {
    const basicKeys = ["name", "code", "phone", "email"];
    const accountKeys = ["password", "region", "city", "monthly_target"];
    const statusKeys = ["is_active", "status"];

    const basicCols = cleanColumns.filter((c) => basicKeys.includes(c.key));
    const accountCols = cleanColumns.filter((c) => accountKeys.includes(c.key));
    const statusCols = cleanColumns.filter((c) => statusKeys.includes(c.key));
    const otherCols = cleanColumns.filter(
      (c) =>
        !basicKeys.includes(c.key) &&
        !accountKeys.includes(c.key) &&
        !statusKeys.includes(c.key)
    );

    const sections = [];
    if (basicCols.length > 0) {
      sections.push({
        id: "basic",
        title: "Basic Information",
        Icon: User,
        columns: basicCols,
      });
    }
    if (accountCols.length > 0) {
      sections.push({
        id: "account",
        title: "Account & Location",
        Icon: LockKeyhole,
        columns: accountCols,
      });
    }
    if (statusCols.length > 0) {
      sections.push({
        id: "status",
        title: "Status",
        Icon: ShieldCheck,
        columns: statusCols,
        isSingle: statusCols.length === 1,
      });
    }
    if (otherCols.length > 0) {
      sections.push({
        id: "other",
        title: "Additional Details",
        Icon: FileText,
        columns: otherCols,
      });
    }
    return sections;
  }

  if (tableKey === "executive_tasks") {
    const taskDetailsKeys = ["title", "task_type", "priority", "status", "due_date", "description"];
    const assignKeys = ["assigned_by_role", "assigned_by_name", "assigned_to_role", "assigned_to_name"];
    const targetKeys = ["region", "target_entity_name", "pincode", "progress", "remarks"];

    const taskCols = cleanColumns.filter((c) => taskDetailsKeys.includes(c.key));
    const assignCols = cleanColumns.filter((c) => assignKeys.includes(c.key));
    const targetCols = cleanColumns.filter((c) => targetKeys.includes(c.key));
    const otherCols = cleanColumns.filter(
      (c) =>
        !taskDetailsKeys.includes(c.key) &&
        !assignKeys.includes(c.key) &&
        !targetKeys.includes(c.key)
    );

    const sections = [];
    if (taskCols.length > 0) {
      sections.push({
        id: "task_details",
        title: "Task Details & Schedule",
        Icon: Check,
        columns: taskCols,
      });
    }
    if (assignCols.length > 0) {
      sections.push({
        id: "hierarchy",
        title: "Assignment & Delegation (Auto-Fetched)",
        Icon: User,
        columns: assignCols,
      });
    }
    if (targetCols.length > 0) {
      sections.push({
        id: "target_location",
        title: "Territory & Deliverables",
        Icon: MapPin,
        columns: targetCols,
      });
    }
    if (otherCols.length > 0) {
      sections.push({
        id: "other",
        title: "Additional Details",
        Icon: FileText,
        columns: otherCols,
      });
    }
    return sections;
  }

  // Generic tables partition into Status and Basic Information
  const statusKeys = ["is_active", "status", "is_verified", "verified"];
  const locationKeys = [
    "password",
    "email",
    "phone",
    "mobile",
    "region",
    "city",
    "state",
    "address",
    "pincode",
    "postal_code",
    "latitude",
    "longitude",
  ];

  const statusCols = cleanColumns.filter(
    (c) =>
      statusKeys.includes(c.key.toLowerCase()) ||
      c.type === "yesno" ||
      c.type === "bool"
  );
  const statusKeySet = new Set(statusCols.map((c) => c.key));

  const locationCols = cleanColumns.filter(
    (c) =>
      !statusKeySet.has(c.key) &&
      locationKeys.some((lk) => c.key.toLowerCase().includes(lk))
  );
  const locationKeySet = new Set(locationCols.map((c) => c.key));

  const basicCols = cleanColumns.filter(
    (c) => !statusKeySet.has(c.key) && !locationKeySet.has(c.key)
  );

  const sections = [];
  if (basicCols.length > 0) {
    sections.push({
      id: "basic",
      title: "Basic Information",
      Icon: User,
      columns: basicCols,
    });
  }
  if (locationCols.length > 0) {
    sections.push({
      id: "location",
      title: locationCols.some((c) => c.key === "password")
        ? "Account & Location"
        : "Contact & Location",
      Icon: locationCols.some((c) => c.key === "password")
        ? LockKeyhole
        : MapPin,
      columns: locationCols,
    });
  }
  if (statusCols.length > 0) {
    sections.push({
      id: "status",
      title: "Status",
      Icon: ShieldCheck,
      columns: statusCols,
      isSingle: statusCols.length === 1,
    });
  }

  return sections.length > 0
    ? sections
    : [{ id: "details", title: "Basic Information", Icon: User, columns: cleanColumns }];
}

export default function RecordModal({
  mode,
  tableKey,
  columns,
  values,
  onChange,
  onSave,
  onCancel,
  saving,
  saveError,
}) {
  useEffect(() => {
    if (!mode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("crm-modal-open");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("crm-modal-open");
    };
  }, [mode]);

  const [showPassword, setShowPassword] = useState(false);
  const [inputError, setInputError] = useState("");

  // Phone OTP verification states
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpVerifying, setPhoneOtpVerifying] = useState(false);
  const [phoneOtpCountdown, setPhoneOtpCountdown] = useState(0);
  const [phoneOtpMsg, setPhoneOtpMsg] = useState("");

  useEffect(() => {
    let timer;
    if (phoneOtpCountdown > 0) {
      timer = setInterval(() => {
        setPhoneOtpCountdown((p) => p - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phoneOtpCountdown]);

  // Reset modal state on mode change
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    setShowPassword(false);
    setInputError("");
    setPhoneOtp("");
    setPhoneOtpSent(false);
    setPhoneOtpCountdown(0);
    setPhoneOtpMsg("");
  }

  // Team members for Executive Task auto-fetch & delegation dropdowns
  const [taskTeam, setTaskTeam] = useState({
    executives: [],
    managers: [],
    regionalManagers: [],
    coverage: [],
  });

  useEffect(() => {
    if (tableKey === "executive_tasks" && mode) {
      Promise.all([
        fetchList("sales_executives").catch(() => []),
        fetchList("sales_managers").catch(() => []),
        fetchList("regional_managers").catch(() => []),
        fetchList("pincode_coverage").catch(() => []),
      ]).then(([execs, mgrs, regs, cov]) => {
        setTaskTeam({
          executives: Array.isArray(execs) ? execs : [],
          managers: Array.isArray(mgrs) ? mgrs : [],
          regionalManagers: Array.isArray(regs) ? regs : [],
          coverage: Array.isArray(cov) ? cov : [],
        });
      });
    }
  }, [tableKey, mode]);

  // Auto-fill initial values for new executive tasks
  useEffect(() => {
    if (tableKey === "executive_tasks" && mode === "new") {
      if (!values.assigned_by_role) {
        onChange("assigned_by_role", "regional");
      }
      if (!values.assigned_by_name && taskTeam.regionalManagers.length > 0) {
        onChange("assigned_by_name", taskTeam.regionalManagers[0].name);
        onChange("assigned_by_id", taskTeam.regionalManagers[0].id);
      }
      if (!values.assigned_to_role) {
        onChange("assigned_to_role", "executive");
      }
      if (!values.assigned_to_name && taskTeam.executives.length > 0) {
        const firstExec = taskTeam.executives[0];
        onChange("assigned_to_name", firstExec.name);
        onChange("assigned_to_id", firstExec.id);
        if (firstExec.region && !values.region) {
          onChange("region", firstExec.region);
        }
      }
      if (!values.status) {
        onChange("status", "Pending");
      }
      if (!values.priority) {
        onChange("priority", "Medium");
      }
      if (!values.task_type) {
        onChange("task_type", "Doctor Visit");
      }
    }
  }, [tableKey, mode, taskTeam.regionalManagers, taskTeam.executives]);

  async function handleSendPhoneOtp() {
    setInputError("");
    const cleanPhone = String(values.phone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setInputError("Please enter a valid 10-digit phone number before requesting OTP.");
      return;
    }
    setPhoneOtpLoading(true);
    try {
      const res = await sendMobileOtp({
        phone: cleanPhone,
        purpose: "verify_phone",
        role: tableKey,
      });
      setPhoneOtpSent(true);
      setPhoneOtpCountdown(60);
      setPhoneOtpMsg(res.message || "OTP sent successfully!");
    } catch (err) {
      setInputError(err.message || "Failed to send verification OTP.");
    } finally {
      setPhoneOtpLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    setInputError("");
    const cleanPhone = String(values.phone || "").replace(/\D/g, "");
    if (!phoneOtp.trim()) {
      setInputError("Please enter the 6-digit OTP code.");
      return;
    }
    setPhoneOtpVerifying(true);
    try {
      await verifyMobileOtp({
        phone: cleanPhone,
        otp: phoneOtp.trim(),
        purpose: "verify_phone",
        role: tableKey,
      });
      onChange("is_phone_verified", true);
      setPhoneOtpSent(false);
      setPhoneOtp("");
      setPhoneOtpMsg("Mobile number verified successfully!");
    } catch (err) {
      setInputError(err.message || "Invalid or expired OTP code. Please try again.");
    } finally {
      setPhoneOtpVerifying(false);
    }
  }

  // Normalize region "Bengaluru" to "Karnataka"
  useEffect(() => {
    if (values.region === "Bengaluru") {
      onChange("region", "Karnataka");
      const hasCity = columns?.some((c) => c.key === "city");
      if (hasCity && (!values.city || values.city === "Karnataka")) {
        onChange("city", "Bengaluru");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.region]);

  function renderRegionQuickPills(currentVal) {
    return (
      <div className="zzc-region-quick-row">
        <span className="zzc-region-quick-label">Quick select:</span>
        <button
          type="button"
          className={`zzc-region-chip ${currentVal === "Karnataka" ? "active" : ""}`}
          onClick={() => {
            onChange("region", "Karnataka");
            if (columns?.some((c) => c.key === "city") && !values.city) {
              onChange("city", "Bengaluru");
            }
          }}
        >
          Karnataka
        </button>
        <button
          type="button"
          className={`zzc-region-chip ${currentVal === "Tamil Nadu" ? "active" : ""}`}
          onClick={() => {
            onChange("region", "Tamil Nadu");
            if (columns?.some((c) => c.key === "city") && !values.city) {
              onChange("city", "Chennai");
            }
          }}
        >
          Tamil Nadu
        </button>
      </div>
    );
  }

  function handleModalSubmit(event) {
    if (inputError) {
      event.preventDefault();
      return;
    }
    const isExecOrManager =
      tableKey === "sales_executives" ||
      tableKey === "sales_managers" ||
      tableKey === "regional_managers";

    if (mode === "new" && isExecOrManager && !values.is_phone_verified) {
      event.preventDefault();
      setInputError(
        "Mobile number verification is required. Please verify the mobile number via OTP before creating this profile."
      );
      return;
    }
    onSave(event);
  }

  function renderExecutiveField(key, index) {
    const field = (columns || []).find((item) => item.key === key);
    if (!field) return null;

    const labelMap = {
      name: "Name",
      code: "Code",
      phone: "Phone",
      email: "Email",
      password: "Password",
      region: "Region",
      city: "City",
      monthly_target: "Monthly Target",
      is_active: "Status",
      weight_kg: "weight_kg",
      parent_id: "parent_id",
      species: "species",
      breed: "breed",
      gender: "gender",
    };
    const label = labelMap[key] || field.label || key;
    const value = values[key];
    const themeClass = getFieldTheme(key, field.type, index);
    const LabelIcon = getFieldLabelIcon(key);
    const ShellIcon = getFieldShellIcon(key, field.type);
    const placeholder = getFieldPlaceholder(field);
    const id = `field_${key}`;

    // Handle Assigner Role in executive_tasks
    if (key === "assigned_by_role" && tableKey === "executive_tasks") {
      return (
        <div className={`zzc-exec-field theme-purple`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <ShieldCheck size={14} />
            </span>
            <label htmlFor={id}>
              Assigner Role <span className="zzc-exec-required"> *</span>
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <ShieldCheck size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value || "regional"}
                onChange={(e) => {
                  const newRole = e.target.value;
                  onChange("assigned_by_role", newRole);
                  if (newRole === "regional") {
                    const firstRm = taskTeam.regionalManagers[0];
                    if (firstRm) {
                      onChange("assigned_by_name", firstRm.name);
                      onChange("assigned_by_id", firstRm.id);
                    } else {
                      onChange("assigned_by_name", "Regional Manager");
                      onChange("assigned_by_id", 1);
                    }
                  } else if (newRole === "manager") {
                    const firstSm = taskTeam.managers[0];
                    if (firstSm) {
                      onChange("assigned_by_name", firstSm.name);
                      onChange("assigned_by_id", firstSm.id);
                    } else {
                      onChange("assigned_by_name", "Sales Manager");
                      onChange("assigned_by_id", 1);
                    }
                  } else {
                    onChange("assigned_by_name", "Admin");
                    onChange("assigned_by_id", 1);
                  }
                }}
              >
                <option value="regional">Regional Manager</option>
                <option value="manager">Sales Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle Assigned By in executive_tasks
    if (key === "assigned_by_name" && tableKey === "executive_tasks") {
      const byRole = values.assigned_by_role || "regional";
      const assignerOptions =
        byRole === "regional"
          ? taskTeam.regionalManagers
          : byRole === "manager"
          ? taskTeam.managers
          : [{ id: 1, name: "Admin" }];

      return (
        <div className={`zzc-exec-field theme-purple`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <User size={14} />
            </span>
            <label htmlFor={id}>
              Assigned By (Auto-Fetched) <span className="zzc-exec-required"> *</span>
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <User size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value || ""}
                onChange={(e) => {
                  const selName = e.target.value;
                  onChange("assigned_by_name", selName);
                  const matched = assignerOptions.find((p) => p.name === selName);
                  if (matched) {
                    onChange("assigned_by_id", matched.id);
                  }
                }}
              >
                <option value="" disabled>Select assigner</option>
                {assignerOptions.map((opt) => (
                  <option key={opt.id} value={opt.name}>
                    {opt.name} {opt.code ? `(${opt.code})` : ""} {opt.region ? `• ${opt.region}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle Assignee Role in executive_tasks
    if (key === "assigned_to_role" && tableKey === "executive_tasks") {
      return (
        <div className={`zzc-exec-field theme-teal`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <Target size={14} />
            </span>
            <label htmlFor={id}>
              Assignee Target Role <span className="zzc-exec-required"> *</span>
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <Target size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value || "executive"}
                onChange={(e) => {
                  const toRole = e.target.value;
                  onChange("assigned_to_role", toRole);
                  if (toRole === "manager" && taskTeam.managers.length > 0) {
                    const firstMgr = taskTeam.managers[0];
                    onChange("assigned_to_name", firstMgr.name);
                    onChange("assigned_to_id", firstMgr.id);
                    if (firstMgr.region) onChange("region", firstMgr.region);
                  } else if (toRole === "executive" && taskTeam.executives.length > 0) {
                    const firstExec = taskTeam.executives[0];
                    onChange("assigned_to_name", firstExec.name);
                    onChange("assigned_to_id", firstExec.id);
                    if (firstExec.region) onChange("region", firstExec.region);
                    const cov = taskTeam.coverage.find((c) => c.executive_id === firstExec.id);
                    if (cov?.pincode) onChange("pincode", cov.pincode);
                  }
                }}
              >
                <option value="executive">Field Sales Executive ({taskTeam.executives.length})</option>
                <option value="manager">Territory Sales Manager ({taskTeam.managers.length})</option>
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle Assigned To in executive_tasks
    if (key === "assigned_to_name" && tableKey === "executive_tasks") {
      const isManager = values.assigned_to_role === "manager";
      const candidateList = isManager ? taskTeam.managers : taskTeam.executives;

      return (
        <div className={`zzc-exec-field theme-teal`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <User size={14} />
            </span>
            <label htmlFor={id}>
              Assigned To ({isManager ? "Sales Manager" : "Sales Executive"}) <span className="zzc-exec-required"> *</span>
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <User size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value || ""}
                onChange={(e) => {
                  const selName = e.target.value;
                  onChange("assigned_to_name", selName);
                  const matched = candidateList.find((p) => p.name === selName);
                  if (matched) {
                    onChange("assigned_to_id", matched.id);
                    if (matched.region) onChange("region", matched.region);
                    if (!isManager) {
                      const cov = taskTeam.coverage.find((c) => c.executive_id === matched.id);
                      if (cov?.pincode) onChange("pincode", cov.pincode);
                    }
                  }
                }}
              >
                <option value="" disabled>— Select {isManager ? "Sales Manager" : "Sales Executive"} —</option>
                {candidateList.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} {emp.code ? `(${emp.code})` : ""} {emp.region ? `• ${emp.region}` : ""} {emp.city ? `• ${emp.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle Region Field
    if (key === "region") {
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <input
                id={id}
                type="text"
                value={value ?? ""}
                required={field.required}
                placeholder={placeholder || "Enter region"}
                autoComplete="off"
                onChange={(e) => onChange(key, e.target.value)}
              />
            </div>
          </div>
          {renderRegionQuickPills(value)}
        </div>
      );
    }

    // Handle Phone Field with OTP
    if (key === "phone") {
      const isVerified = Boolean(values.is_phone_verified);
      const cleanPhone = String(values.phone || "").replace(/\D/g, "");
      const isExecOrManager =
        tableKey === "sales_executives" ||
        tableKey === "sales_managers" ||
        tableKey === "regional_managers";

      return (
        <div className={`zzc-exec-field zzc-exec-field-full ${themeClass}`} key={key}>
          <div
            className="zzc-exec-field-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span className="zzc-field-label-icon">
                <LabelIcon size={14} />
              </span>
              <label htmlFor={id}>
                {label}
                {field.required ? <span className="zzc-exec-required"> *</span> : ""}
              </label>
            </div>
            {isExecOrManager &&
              (isVerified ? (
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: "#16a34a",
                    background: "#dcfce7",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Check size={12} strokeWidth={3} /> Mobile Verified
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    color: "#d97706",
                    background: "#fef3c7",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldAlert size={12} /> Verification Required
                </span>
              ))}
          </div>

          <div className="zzc-exec-input-shell">
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <input
                id={id}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={value ?? ""}
                required={field.required}
                placeholder="10-digit mobile number"
                autoComplete="off"
                onChange={(e) => {
                  const raw = e.target.value;
                  const digits = raw.replace(/\D/g, "");
                  if (digits.length > 10) return;
                  onChange(key, digits);
                  if (isVerified) {
                    onChange("is_phone_verified", false);
                  }
                  setInputError("");
                }}
              />
            </div>
          </div>

          {isExecOrManager && !isVerified && (
            <div
              style={{
                marginTop: "8px",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#334155" }}>
                  Mobile Number Verification
                </span>
                {phoneOtpMsg && (
                  <span style={{ fontSize: "0.72rem", color: "#0d8b7b", fontWeight: 600 }}>
                    {phoneOtpMsg}
                  </span>
                )}
              </div>

              {!phoneOtpSent ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #0d8b7b 0%, #076d60 100%)",
                      color: "#ffffff",
                      cursor: "pointer",
                      opacity: cleanPhone.length === 10 ? 1 : 0.6,
                    }}
                    disabled={cleanPhone.length !== 10 || phoneOtpLoading}
                    onClick={handleSendPhoneOtp}
                  >
                    {phoneOtpLoading ? "Sending OTP..." : "Send Verification OTP"}
                  </button>
                  <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                    {cleanPhone.length === 10
                      ? "Click to send verification code"
                      : "Enter 10-digit number first"}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={phoneOtp}
                    autoComplete="off"
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: "140px",
                      padding: "6px 10px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textAlign: "center",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      background: "#ffffff",
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "8px",
                      border: "none",
                      background: "#16a34a",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                    disabled={phoneOtp.length < 4 || phoneOtpVerifying}
                    onClick={handleVerifyPhoneOtp}
                  >
                    {phoneOtpVerifying ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0d8b7b",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: phoneOtpCountdown > 0 ? "not-allowed" : "pointer",
                      textDecoration: "underline",
                    }}
                    disabled={phoneOtpCountdown > 0 || phoneOtpLoading}
                    onClick={handleSendPhoneOtp}
                  >
                    {phoneOtpCountdown > 0 ? `Resend (${phoneOtpCountdown}s)` : "Resend OTP"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Handle Password Field
    if (field.type === "password") {
      const isEdit = mode === "edit";
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required && !isEdit ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell" style={{ position: "relative" }}>
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <input
                id={id}
                type={showPassword ? "text" : "password"}
                value={value ?? ""}
                required={field.required && !isEdit}
                minLength={value ? 6 : undefined}
                autoComplete="off"
                placeholder={
                  placeholder ||
                  (isEdit ? "Leave blank to keep password" : "Min 6 characters")
                }
                onChange={(e) => {
                  if (e.target.value.length > 10) {
                    setInputError("Password cannot exceed 10 characters.");
                    return;
                  }
                  setInputError("");
                  onChange(field.key, e.target.value);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                marginLeft: 4,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      );
    }

    // Handle Status / is_active Field
    if (key === "is_active" || (key === "status" && !field.options && tableKey !== "executive_tasks")) {
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value === "No" || value === false ? "No" : "Yes"}
                onChange={(event) => onChange(key, event.target.value)}
              >
                <option value="Yes">Active</option>
                <option value="No">Inactive</option>
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle species dropdown (matching reference image)
    if (key === "species") {
      const speciesOptions = ["Dog", "Cat", "Bird", "Rabbit", "Fish", "Other"];
      const hasValue = value && !speciesOptions.includes(value);
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value ?? ""}
                onChange={(e) => onChange(key, e.target.value)}
              >
                <option value="" disabled>
                  Enter species
                </option>
                {hasValue && <option value={value}>{value}</option>}
                {speciesOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle gender dropdown (matching reference image)
    if (key === "gender" || key === "sex") {
      const genderOptions = ["Male", "Female", "Unknown"];
      const hasValue = value && !genderOptions.includes(value);
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value ?? ""}
                onChange={(e) => onChange(key, e.target.value)}
              >
                <option value="" disabled>
                  Enter gender
                </option>
                {hasValue && <option value={value}>{value}</option>}
                {genderOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle breed dropdown (matching reference image)
    if (key === "breed") {
      const breedOptions = [
        "Golden Retriever",
        "German Shepherd",
        "Labrador Retriever",
        "French Bulldog",
        "Beagle",
        "Persian Cat",
        "Siamese Cat",
        "Indie / Mixed Breed",
        "Other",
      ];
      const hasValue = value && !breedOptions.includes(value);
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value ?? ""}
                onChange={(e) => onChange(key, e.target.value)}
              >
                <option value="" disabled>
                  Enter breed
                </option>
                {hasValue && <option value={value}>{value}</option>}
                {breedOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle Generic Select
    if (field.type === "select" || (field.options && field.options.length > 0)) {
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <select
                id={id}
                value={value ?? ""}
                required={field.required}
                onChange={(e) => onChange(key, e.target.value)}
              >
                <option value="" disabled>
                  Enter {label.toLowerCase()}
                </option>
                {(field.options || []).map((opt) => (
                  <option key={opt.value ?? opt} value={opt.value ?? opt}>
                    {opt.label ?? opt}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown size={15} className="zzc-shell-right-chevron" aria-hidden="true" />
          </div>
        </div>
      );
    }

    // Handle Checkbox
    if (field.type === "bool") {
      return (
        <div className={`zzc-exec-field ${themeClass}`} key={key}>
          <div className="zzc-exec-field-header">
            <span className="zzc-field-label-icon">
              <LabelIcon size={14} />
            </span>
            <label htmlFor={id}>
              {label}
              {field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell">
            <div className="zzc-exec-input-control" style={{ gap: "10px" }}>
              <input
                id={id}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(key, e.target.checked)}
              />
              <span style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
                {Boolean(value) ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Full width for address, descriptions, textareas
    const isFullWidth =
      field.type === "textarea" ||
      key.toLowerCase().includes("address") ||
      key.toLowerCase().includes("description");

    const inputType =
      field.type === "number" || key === "weight_kg" || key === "monthly_target"
        ? "number"
        : field.type === "email"
        ? "email"
        : field.type === "date"
        ? "date"
        : field.type === "time"
        ? "time"
        : field.type === "datetime"
        ? "datetime-local"
        : "text";

    return (
      <div
        className={`zzc-exec-field ${themeClass} ${isFullWidth ? "zzc-exec-field-full" : ""}`}
        key={key}
      >
        <div className="zzc-exec-field-header">
          <span className="zzc-field-label-icon">
            <LabelIcon size={14} />
          </span>
          <label htmlFor={id}>
            {label}
            {field.required ? <span className="zzc-exec-required"> *</span> : ""}
          </label>
        </div>
        <div className="zzc-exec-input-shell">
          <ShellIcon size={16} className="zzc-shell-left-icon" aria-hidden="true" />
          <div className="zzc-exec-input-control">
            <input
              id={id}
              type={inputType}
              step={inputType === "number" ? "any" : undefined}
              value={value ?? ""}
              required={field.required}
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              onChange={(e) => onChange(key, e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  const recordTitle = getRecordTitle(tableKey);
  const sections = groupColumnsIntoSections(columns, tableKey);
  const isEdit = mode === "edit";

  if (!mode) return null;

  return createPortal(
    <div
      className="zzc-modal-overlay zzc-exec-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="zzc-exec-modal" aria-labelledby="zzc-exec-title">
        {/* Header with Mint Theme & Pet Illustration */}
        <header className="zzc-exec-header">
          <div className="zzc-exec-header-paws-bg" aria-hidden="true">
            <PawIcon size={26} color="#0d8b7b" className="zzc-paw-bg-1" />
            <PawIcon size={18} color="#0d8b7b" className="zzc-paw-bg-2" />
            <PawIcon size={32} color="#0d8b7b" className="zzc-paw-bg-3" />
          </div>

          <div className="zzc-exec-header-content">
            <span className="zzc-exec-header-badge">
              <PawIcon size={24} color="#ffffff" />
            </span>
            <div className="zzc-exec-header-text">
              <h2 id="zzc-exec-title">
                {isEdit ? `Edit ${recordTitle}` : `Add ${recordTitle}`}
              </h2>
              <p>
                {isEdit
                  ? `Update existing ${recordTitle.toLowerCase()} record`
                  : `Create a new ${recordTitle.toLowerCase()} profile`}
              </p>
            </div>
          </div>

          {/* Dog + Cat pet illustration */}
          <img
            src={modalPetHeaderImg}
            alt="Cute pets banner"
            className="zzc-modal-header-art"
            aria-hidden="true"
          />

          {/* Circular Close Button */}
          <button
            type="button"
            className="zzc-exec-close"
            onClick={onCancel}
            aria-label="Close"
            title="Close"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        </header>

        {/* Modal Scrollable Body */}
        <div className="zzc-exec-layout">
          <form
            id="zzcModalForm"
            className="zzc-exec-form"
            onSubmit={handleModalSubmit}
            autoComplete="off"
          >
            {saveError && (
              <div className="zzc-modal-error" role="alert">
                <ShieldAlert size={16} />
                <span>{saveError}</span>
              </div>
            )}
            {inputError && (
              <div className="zzc-modal-error" role="alert">
                <ShieldAlert size={16} />
                <span>{inputError}</span>
              </div>
            )}

            {sections.map((section) => {
              const SectionIcon = section.Icon;
              return (
                <section
                  className={`zzc-exec-section ${
                    section.id === "status" ? "zzc-exec-section-status" : ""
                  }`}
                  key={section.id}
                >
                  <div className="zzc-exec-section-header">
                    <div className="zzc-exec-section-title-wrap">
                      <span className="zzc-exec-section-badge">
                        <SectionIcon size={15} />
                      </span>
                      <h3>{section.title}</h3>
                    </div>
                    <span className="zzc-exec-section-subtitle">
                      {section.id === "basic" ? (
                        tableKey === "pets" ? (
                          "Tell us about your pet 🐾"
                        ) : (
                          `Tell us about this ${recordTitle.toLowerCase()} 🐾`
                        )
                      ) : section.id === "status" ? (
                        <span className="zzc-status-badge-pill">Profile Status</span>
                      ) : null}
                    </span>
                  </div>

                  <div
                    className={`zzc-exec-fields ${
                      section.isSingle ? "zzc-exec-fields-single" : ""
                    }`}
                  >
                    {section.columns.map((field, idx) =>
                      renderExecutiveField(field.key, idx)
                    )}
                  </div>
                </section>
              );
            })}
          </form>
        </div>

        {/* Footer with Paw watermark & Create button */}
        <footer className="zzc-exec-footer">
          <div className="zzc-exec-footer-paws" aria-hidden="true">
            <PawIcon size={24} color="#0d8b7b" />
            <PawIcon size={16} color="#0d8b7b" />
          </div>

          <div className="zzc-exec-footer-actions">
            <button
              type="button"
              className="zzc-btn zzc-btn-cancel"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="zzcModalForm"
              className="zzc-btn zzc-btn-create"
              disabled={saving}
            >
              <span>
                {saving
                  ? isEdit
                    ? "Saving…"
                    : "Creating…"
                  : isEdit
                  ? "Save Changes"
                  : `Create ${recordTitle}`}
              </span>
              <span className="zzc-btn-sparkle" aria-hidden="true">
                ✨
              </span>
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}
