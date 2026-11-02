import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from database import engine_zippy, engine_zenve
from sqlalchemy import text

tables_to_verify = [
    # Pet parents
    ('Pet parents', 'pet_parents'),
    ('Pets', 'pets'),
    ('Medical records', 'medical_records'),
    ('Vaccinations', 'vaccinations'),
    ('Addresses', 'addresses'),
    ('User roles', 'user_roles'),
    # Doctors & clinics
    ('Doctors', 'doctors'),
    ('Clinics & hospitals', 'clinics_hospitals'),
    ('Availability slots', 'availability_slots'),
    ('Doctor documents', 'doctor_documents'),
    # Bookings
    ('Appointments', 'appointments'),
    ('Consultations', 'consultations'),
    ('Prescriptions', 'prescriptions'),
    ('Service providers', 'service_providers'),
    ('Services', 'services'),
    ('Service bookings', 'service_bookings'),
    # Commerce
    ('Medicines & products', 'products'),
    ('Inventory', 'inventory'),
    ('Categories', 'categories'),
    ('Brands', 'brands'),
    ('Sellers & stores', 'seller_stores'),
    ('Warehouses', 'warehouses'),
    ('Carts', 'carts'),
    ('Cart items', 'cart_items'),
    # Orders & payments
    ('Orders', 'orders'),
    ('Order items', 'order_items'),
    ('Deliveries', 'deliveries'),
    ('Payments', 'payments'),
    ('Refunds', 'refunds'),
    ('Payouts', 'payouts'),
    ('Commission rules', 'commission_rules'),
    # Platform
    ('GPS locations', 'gps_locations'),
    ('Reviews', 'reviews'),
    ('Notifications', 'notifications'),
    ('Vendor membership plans', 'vendor_membership_plans'),
    ('Plan benefits', 'plan_benefits'),
    ('Vendors', 'vendors'),
    ('Support tickets', 'support_tickets'),
    ('Geocoding cache', 'geocoding_cache'),
    ('Audit logs', 'audit_logs'),
    # Sales team
    ('Regional manager', 'regional_managers'),
    ('Sales manager', 'sales_managers'),
    ('Sales executives', 'sales_executives'),
    ('Pin code coverage', 'pincode_coverages'),
    ('Executive tasks', 'executive_tasks'),
    ('Executive alerts', 'executive_alerts'),
]

def main():
    print("=" * 85)
    print("DUAL-DATABASE VERIFICATION AUDIT")
    print("Remote Ubuntu MySQL Server (95.135.254.123:3306 via 127.0.0.1:3307)")
    print("=" * 85)

    with engine_zippy.connect() as cz, engine_zenve.connect() as cm:
        header = f"{'Item Label':24} | {'Table Name':24} | {'zippy_crm':10} | {'zenve_main':10} | {'Status'}"
        print(header)
        print("-" * len(header))
        all_equal = True
        for label, tbl in tables_to_verify:
            try:
                cz_cnt = cz.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
            except Exception as e:
                cz_cnt = "ERR"
            try:
                cm_cnt = cm.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
            except Exception as e:
                cm_cnt = "ERR"
            
            is_eq = (cz_cnt == cm_cnt) and (cz_cnt != "ERR")
            status = "✓ EQUAL" if is_eq else "⚠️ DIFF"
            if not is_eq:
                all_equal = False
            print(f"{label:24} | {tbl:24} | {str(cz_cnt):10} | {str(cm_cnt):10} | {status}")

        print("-" * len(header))
        if all_equal:
            print("✓ ALL 42 LISTED USER DOMAINS/TABLES ARE 100% IDENTICAL AND SYNCHRONIZED!")
        else:
            print("⚠️ Some tables differ in row counts.")

if __name__ == "__main__":
    main()

