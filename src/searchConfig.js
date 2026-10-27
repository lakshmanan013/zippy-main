export const SEARCH_CONFIG = {
  // Pet parents
  pet_parents: { placeholder: "full name, email, or phone", columns: ["full_name", "email", "phone", "city"] },
  pets: { placeholder: "pet name, species, or breed", columns: ["name", "species", "breed"] },
  medical_records: { placeholder: "title or diagnosis", columns: ["title", "diagnosis", "record_type"] },
  vaccinations: { placeholder: "vaccine name", column: "vaccine_name" },
  addresses: { placeholder: "city or pincode", columns: ["city", "pincode", "address_line"] },
  user_roles: { placeholder: "role or user ID", columns: ["role", "user_id"] },

  // Doctors & clinics
  doctors: { placeholder: "name, email, or phone", columns: ["name", "email", "phone", "clinic_name", "city"] },
  clinics: { placeholder: "clinic name, city, or phone", columns: ["name", "city", "phone"] },
  availability_slots: { placeholder: "day, slot time, or status", columns: ["day_of_week", "slot_time", "status"] },
  doctor_documents: { placeholder: "document type or status", columns: ["document_type", "status"] },

  // Bookings
  appointments: { placeholder: "status, notes, or date", columns: ["status", "notes", "appointment_date"] },
  consultations: { placeholder: "diagnosis, status, or type", columns: ["diagnosis", "status", "consultation_type"] },
  prescriptions: { placeholder: "doctor, pet, or owner", columns: ["doc_name", "pet_name", "owner_name"] },
  service_providers: { placeholder: "name, city, or phone", columns: ["name", "city", "phone"] },
  services: { placeholder: "service title or type", columns: ["title", "service_type"] },
  service_bookings: { placeholder: "booking status or date", columns: ["booking_status", "status", "booking_date"] },

  // Commerce
  products: { placeholder: "product name, SKU, or category", columns: ["name", "sku", "category"] },
  inventory: { placeholder: "SKU or batch number", columns: ["sku", "batch_number"] },
  categories: { placeholder: "category name", column: "name" },
  brands: { placeholder: "brand name", column: "name" },
  sellers: { placeholder: "business name, email, or phone", columns: ["business_name", "email", "phone"] },
  warehouses: { placeholder: "warehouse name or city", columns: ["name", "city"] },
  carts: { placeholder: "user ID or status", columns: ["user_id", "status"] },
  cart_items: { placeholder: "product ID or cart ID", columns: ["product_id", "cart_id"] },

  // Orders & payments
  orders: { placeholder: "order number or status", columns: ["order_number", "status"] },
  order_items: { placeholder: "product name or SKU", columns: ["product_name", "sku"] },
  deliveries: { placeholder: "tracking number or courier", columns: ["tracking_number", "courier_name", "status"] },
  payments: { placeholder: "transaction ID or payment method", columns: ["transaction_id", "payment_method", "status"] },
  refunds: { placeholder: "reason or status", columns: ["reason", "status"] },
  payouts: { placeholder: "status or account number", columns: ["payout_status", "status", "account_number"] },
  commission_rules: { placeholder: "rule name or type", columns: ["name", "rule_type"] },

  // Platform
  gps_locations: { placeholder: "city or address", columns: ["city", "formatted_address"] },
  reviews: { placeholder: "review text or user name", columns: ["review_text", "user_name", "title"] },
  notifications: { placeholder: "title or message", columns: ["title", "message"] },
  vendor_membership_plans: { placeholder: "plan name", column: "name" },
  plan_benefits: { placeholder: "benefit name or description", columns: ["benefit_name", "description"] },
  vendors: { placeholder: "business name, email, or city", columns: ["business_name", "name", "email", "city", "phone"] },
  support_tickets: { placeholder: "subject or status", columns: ["subject", "status"] },
  geocoding_cache: { placeholder: "query or address", columns: ["query", "formatted_address"] },
  audit_logs: { placeholder: "action or entity", columns: ["action", "entity_type"] },

  // Sales team
  regional_managers: { placeholder: "name, code, or region", columns: ["name", "code", "phone", "region"] },
  sales_managers: { placeholder: "name, code, or region", columns: ["name", "code", "phone", "region"] },
  sales_executives: { placeholder: "name, code, or phone", columns: ["name", "code", "phone", "email", "city", "region"] },
  pincode_coverage: { placeholder: "pincode or city", columns: ["pincode", "city", "state"] },
  executive_tasks: { placeholder: "title, assignee, or priority", columns: ["title", "assigned_to_name", "assigned_by_name", "priority", "task_type"] },
  executive_alerts: { placeholder: "title or severity", columns: ["title", "severity", "pincode"] },
};
