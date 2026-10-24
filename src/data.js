export const NAV_GROUPS = [
  { label: "Pet parents", items: [
    { key: "pet_parents", label: "Pet parents" },
    { key: "pets", label: "Pets" },
    { key: "medical_records", label: "Medical records" },
    { key: "vaccinations", label: "Vaccinations" },
    { key: "addresses", label: "Addresses" },
    { key: "user_roles", label: "User roles" },
  ]},
  { label: "Doctors & clinics", items: [
    { key: "doctors", label: "Doctors" },
    { key: "clinics", label: "Clinics & hospitals" },
    { key: "availability_slots", label: "Availability slots" },
    { key: "doctor_documents", label: "Doctor documents" },
  ]},
  { label: "Bookings", items: [
    { key: "appointments", label: "Appointments" },
    { key: "consultations", label: "Consultations" },
    { key: "prescriptions", label: "Prescriptions" },
    { key: "service_providers", label: "Service providers" },
    { key: "services", label: "Services" },
    { key: "service_bookings", label: "Service bookings" },
  ]},
  { label: "Commerce", items: [
    { key: "products", label: "Medicines & products" },
    { key: "inventory", label: "Inventory" },
    { key: "categories", label: "Categories" },
    { key: "brands", label: "Brands" },
    { key: "sellers", label: "Sellers & stores" },
    { key: "warehouses", label: "Warehouses" },
    { key: "carts", label: "Carts" },
    { key: "cart_items", label: "Cart items" },
  ]},
  { label: "Orders & payments", items: [
    { key: "orders", label: "Orders" },
    { key: "order_items", label: "Order items" },
    { key: "deliveries", label: "Deliveries" },
    { key: "payments", label: "Payments" },
    { key: "refunds", label: "Refunds" },
    { key: "payouts", label: "Payouts" },
    { key: "commission_rules", label: "Commission rules" },
  ]},
  { label: "Platform", items: [
    { key: "gps_locations", label: "GPS locations" },
    { key: "reviews", label: "Reviews" },
    { key: "notifications", label: "Notifications" },
    { key: "vendor_membership_plans", label: "Vendor membership plans" },
    { key: "plan_benefits", label: "Plan benefits" },
    { key: "vendors", label: "Vendors" },
    { key: "support_tickets", label: "Support tickets" },
    { key: "geocoding_cache", label: "Geocoding cache" },
    { key: "audit_logs", label: "Audit logs" },
  ]},
  { label: "Sales team", items: [
    { key: "regional_managers", label: "Regional manager" },
    { key: "sales_managers", label: "Sales manager" },
    { key: "sales_executives", label: "Sales executives" },
    { key: "pincode_coverage", label: "Pin code coverage" },
    { key: "executive_tasks", label: "Executive tasks" },
    { key: "executive_alerts", label: "Executive alerts" },

  ]},
];

export const STATS = [
  { key: "profiles", label: "profiles", tableKey: "pet_parents" },
  { key: "pets", label: "pets", tableKey: "pets" },
  { key: "doctors", label: "doctors", tableKey: "doctors" },
  { key: "clinics", label: "clinics", tableKey: "clinics" },
  { key: "appointments", label: "appointments", tableKey: "appointments" },
  { key: "products", label: "products", tableKey: "products" },
  { key: "inventory", label: "inventory", tableKey: "inventory" },
  { key: "orders", label: "orders", tableKey: "orders" },
  { key: "sellers", label: "sellers", tableKey: "sellers" },
  { key: "services", label: "services", tableKey: "services" },
  { key: "payments", label: "payments", tableKey: "payments" },
  { key: "support_tickets", label: "support_tickets", tableKey: "support_tickets" },
];

export const SALES_TEAM_STATS = [
  { key: "regional_managers", label: "regional managers", tableKey: "regional_managers" },
  { key: "sales_managers", label: "sales managers", tableKey: "sales_managers" },
  { key: "sales_executives", label: "sales executives", tableKey: "sales_executives" },
];

export function findLabel(key) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.key === key) return item.label;
    }
  }
  return key;
}

export function findGroupLabel(key) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.key === key) return group.label;
    }
  }
  return null;
}

export const LOGIN_ROLES = [
  {
    key: "ceo",
    name: "CEO",
    title: "Chief Executive Officer",
    badge: "Entire Website",
    tagline: "Unrestricted master access to all 7 modules and settings",
    isCeo: true,
    accentColor: "#d97706",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
    iconName: "Crown",
    email: "ceo@zenvezippy.com",
    defaultPassword: "ceo123",
    phone: "9876543210",
    allowedGroups: ["Pet parents", "Doctors & clinics", "Bookings", "Commerce", "Orders & payments", "Platform", "Sales team"],
    defaultTableKey: "pet_parents",
    sectionIndex: 0,
  },
  {
    key: "pet_parents",
    name: "Pet Parents",
    title: "Pet Parents Lead",
    badge: "Section 1 Only",
    tagline: "Parents, pets, medical records, vaccines, addresses & roles",
    isCeo: false,
    accentColor: "#059669",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    iconName: "HeartHandshake",
    email: "petparents@zenvezippy.com",
    defaultPassword: "pets123",
    phone: "9876543211",
    allowedGroups: ["Pet parents"],
    defaultTableKey: "pet_parents",
    sectionIndex: 1,
  },
  {
    key: "doctors_clinics",
    name: "Doctors & Clinics",
    title: "Doctors & Clinics Head",
    badge: "Section 2 Only",
    tagline: "Veterinarians, hospital clinics, availability slots & documents",
    isCeo: false,
    accentColor: "#0284c7",
    gradient: "linear-gradient(135deg, #0284c7, #0369a1)",
    iconName: "Stethoscope",
    email: "doctors@zenvezippy.com",
    defaultPassword: "doctors123",
    phone: "9876543212",
    allowedGroups: ["Doctors & clinics"],
    defaultTableKey: "doctors",
    sectionIndex: 2,
  },
  {
    key: "bookings",
    name: "Bookings",
    title: "Bookings & Services Manager",
    badge: "Section 3 Only",
    tagline: "Appointments, consultations, digital prescriptions & services",
    isCeo: false,
    accentColor: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    iconName: "CalendarCheck",
    email: "bookings@zenvezippy.com",
    defaultPassword: "bookings123",
    phone: "9876543213",
    allowedGroups: ["Bookings"],
    defaultTableKey: "appointments",
    sectionIndex: 3,
  },
  {
    key: "commerce",
    name: "Commerce",
    title: "Commerce & Inventory Manager",
    badge: "Section 4 Only",
    tagline: "Medicines & products, inventory stock, brands, stores & carts",
    isCeo: false,
    accentColor: "#f97316",
    gradient: "linear-gradient(135deg, #f97316, #ea580c)",
    iconName: "ShoppingBag",
    email: "commerce@zenvezippy.com",
    defaultPassword: "commerce123",
    phone: "9876543214",
    allowedGroups: ["Commerce"],
    defaultTableKey: "products",
    sectionIndex: 4,
  },
  {
    key: "orders_payments",
    name: "Orders & Payments",
    title: "Orders & Finance Lead",
    badge: "Section 5 Only",
    tagline: "Orders, line items, deliveries, customer payments, refunds & payouts",
    isCeo: false,
    accentColor: "#0d9488",
    gradient: "linear-gradient(135deg, #0d9488, #0f766e)",
    iconName: "CreditCard",
    email: "orders@zenvezippy.com",
    defaultPassword: "orders123",
    phone: "9876543215",
    allowedGroups: ["Orders & payments"],
    defaultTableKey: "orders",
    sectionIndex: 5,
  },
  {
    key: "platform",
    name: "Platform",
    title: "Platform Operations Head",
    badge: "Section 6 Only",
    tagline: "GPS live tracking, reviews, notices, membership plans, audit logs",
    isCeo: false,
    accentColor: "#4f46e5",
    gradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
    iconName: "Sliders",
    email: "platform@zenvezippy.com",
    defaultPassword: "platform123",
    phone: "9876543216",
    allowedGroups: ["Platform"],
    defaultTableKey: "gps_locations",
    sectionIndex: 6,
  },
  {
    key: "sales_team",
    name: "Sales Team",
    title: "Sales Department Director",
    badge: "Section 7 Only",
    tagline: "Regional managers, sales managers, executives, coverage & tasks",
    isCeo: false,
    accentColor: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899, #db2777)",
    iconName: "Briefcase",
    email: "sales@zenvezippy.com",
    defaultPassword: "sales123",
    phone: "9876543217",
    allowedGroups: ["Sales team"],
    defaultTableKey: "regional_managers",
    sectionIndex: 7,
  },
];

export function getRoleConfig(roleKey) {
  if (!roleKey) return LOGIN_ROLES[0];
  const normalized = String(roleKey).toLowerCase();
  if (normalized === "administrator" || normalized === "admin") return LOGIN_ROLES[0];
  return LOGIN_ROLES.find((r) => r.key === normalized) || LOGIN_ROLES[0];
}

export function getAllowedNavGroups(user) {
  if (!user) return NAV_GROUPS;
  const isCeo = Boolean(
    user.is_ceo ||
    user.isCeo ||
    user.role === "ceo" ||
    user.role === "Administrator" ||
    user.role === "admin"
  );
  if (isCeo) return NAV_GROUPS;

  const roleCfg = getRoleConfig(user.role);
  const allowed = user.allowed_groups || user.allowedGroups || roleCfg.allowedGroups;
  if (!Array.isArray(allowed) || allowed.length === 0) return NAV_GROUPS;

  return NAV_GROUPS.filter((g) => allowed.includes(g.label));
}

export function isTableAllowed(tableKey, user) {
  if (!user) return true;
  const isCeo = Boolean(
    user.is_ceo ||
    user.isCeo ||
    user.role === "ceo" ||
    user.role === "Administrator" ||
    user.role === "admin"
  );
  if (isCeo) return true;

  const allowedGroups = getAllowedNavGroups(user);
  for (const group of allowedGroups) {
    for (const item of group.items) {
      if (item.key === tableKey) return true;
    }
  }
  return false;
}

export function getDefaultTableForUser(user) {
  const allowedGroups = getAllowedNavGroups(user);
  if (allowedGroups.length > 0 && allowedGroups[0].items.length > 0) {
    return allowedGroups[0].items[0].key;
  }
  return "pet_parents";
}
