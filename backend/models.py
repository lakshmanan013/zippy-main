from typing import Any
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import Integer, Column
from sqlalchemy import String, Boolean, Float, Date, DateTime, Time, ForeignKey, text, Text, UniqueConstraint, LargeBinary
from database import Base

class PetParent(Base):
    __tablename__ = "pet_parents"
    id = Column(Integer , primary_key= True , index = True)
    full_name = Column(String(150), nullable = False)
    email = Column(String(100) , unique = True, nullable =False)
    phone = Column(String(30))
    city = Column(String(150))
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class Pet(Base):
    __tablename__ = "pets"
    id = Column(Integer,primary_key= True , index=True)
    parent_id = Column(Integer,ForeignKey("pet_parents.id"),nullable=False)
    name = Column(String(100),nullable = False)
    species = Column(String(100))
    breed = Column(String(100))
    gender = Column(String(20))
    weight_kg = Column(Float)
    is_active = Column(Boolean,default = True)
class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer , primary_key = True , index=True)
    pet_id = Column(Integer,ForeignKey("pets.id"),nullable=False)
    record_type = Column(String(100))
    title = Column(String(200))
    diagnosis = Column(String(500))
    record_date = Column(Date)
class Vaccination(Base):
    __tablename__ = "vaccinations"
    id=Column(Integer,primary_key=True , index=True)
    pet_id = Column(Integer,ForeignKey("pets.id"),nullable=False)
    vaccine_name = Column(String(200))
    administered_on = Column(Date)
    next_due_on = Column(Date)
    batch_number =Column(String(100))
class Address(Base):
    __tablename__ = "addresses"
    id = Column(Integer,primary_key=True , index=True)
    parent_id = Column(Integer,ForeignKey("pet_parents.id"),nullable=False)
    label = Column(String(100))
    contact_name = Column(String(150))
    line1 = Column(String(300))
    city = Column(String(100))
    pincode = Column(String(20))
    is_default =Column(Boolean,default=True)
class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    role = Column(String(100), nullable=False)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(100))
    password = Column(String(100))
    qualification = Column(String(300))
    specializations = Column(String(500))
    pincode = Column(String(20))
    city = Column(String(150))
    phone = Column(String(30))
    experience_years = Column(Integer)
    consultation_fee = Column(Float)
    verification_status: Any = Column(String(50), default="pending")
    is_active: Any = Column(Boolean, default=True)
    profile_image = Column(Text)
    signature_image = Column(Text)
    clinic_name = Column(String(255), nullable=True)
    clinic_hospital = Column(String(255), nullable=True)
    facility_type = Column(String(100), nullable=True)
    clinic_phone = Column(String(50), nullable=True)
    clinic_inside_image = Column(Text, nullable=True)
    clinic_outside_image = Column(Text, nullable=True)
class ClinicHospital(Base):
    __tablename__ = "clinics_hospitals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    facility_type = Column(String(100))
    phone = Column(String(30))
    emergency_available = Column(Boolean, default=False)
    open_24x7 = Column(Boolean, default=False)
    verification_status: Any = Column(String(50), default="pending")
    rating = Column(Float)
class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer,ForeignKey("doctors.id"),nullable=False)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    consultation_type = Column(String(100))
    is_active = Column(Boolean, default=True)
class DoctorDocument(Base):
    __tablename__ = "doctor_documents"
    id: Any = Column(Integer, primary_key=True, index=True)
    doctor_id: Any = Column(Integer,ForeignKey("doctors.id"),nullable=False)
    document_type: Any = Column(String(100), nullable=False)
    status: Any = Column(String(50), default="pending")
    file_path: Any = Column(String(500), nullable=True)
    file_data: Any = Column(LargeBinary(length=(2**32)-1), nullable=True)
    content_type: Any = Column(String(100), nullable=True)
    created_at: Any = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    appointment_type = Column(String(100))
    status = Column(String(50), default="pending")
    payment_status = Column(String(50), default="pending")
    consultation_fee = Column(Float, default=0)
class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    consultation_mode = Column(String(100))
    diagnosis = Column(String(500))
    follow_up_date = Column(Date)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    valid_until = Column(Date)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class ServiceProvider(Base):
    __tablename__ = "service_providers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    provider_type = Column(String(100))
    phone = Column(String(30))
    verification_status = Column(String(50), default="pending")
    rating = Column(Float)
    is_active = Column(Boolean, default=True)
class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    service_type = Column(String(100))
    price = Column(Float, default=0)
    duration_minutes = Column(Integer)
    home_service = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
class ServiceBooking(Base):
    __tablename__ = "service_bookings"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("service_providers.id"), nullable=False)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    booking_date = Column(Date, nullable=False)
    booking_time = Column(Time, nullable=False)
    price = Column(Float, default=0)
    status = Column(String(50), default="pending")
    payment_status = Column(String(50), default="pending")
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    price = Column(Float, default=0)
    mrp = Column(Float, default=0)
    discount_percent = Column(Float, default=0)
    pincode = Column(String(20))
    stock_quantity = Column(Integer, default=0)
    is_prescription_required = Column(Boolean, default=False)
    rating = Column(Float)
    is_active = Column(Boolean, default=True)
class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("seller_stores.id"), nullable=False)
    pincode = Column(String(20))
    inventory_source = Column(String(100))
    available_quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=0)
class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(200), unique=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
class Brand(Base):
    __tablename__ = "brands"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class SellerStore(Base):
    __tablename__ = "seller_stores"
    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String(200), nullable=False)
    seller_type = Column(String(100))
    phone = Column(String(30))
    commission_rate = Column(Float, default=0)
    verification_status = Column(String(50), default="pending")
    rating = Column(Float)
    is_active = Column(Boolean, default=True)
class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    seller_id = Column(Integer, ForeignKey("seller_stores.id"), nullable=False)
    is_zenve_owned = Column(Boolean, default=False)
    contact_phone = Column(String(30))
    is_active = Column(Boolean, default=True)
class Cart(Base):
    __tablename__ = "carts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
    updated_at = Column(DateTime,
    default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None),
    onupdate=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
)
class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Float, default=0)
    saved_for_later = Column(Boolean, default=False)
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(100), unique=True, nullable=False)
    total_amount = Column(Float, default=0)
    status = Column(String(50), default="pending")
    payment_status = Column(String(50), default="pending")
    placed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_name = Column(String(200), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0)
    total_price = Column(Float, default=0)
    status = Column(String(50), default="CONFIRMED")
class Delivery(Base):
    __tablename__ = "deliveries"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    tracking_number = Column(String(150))
    status = Column(String(50), default="pending")
    estimated_delivery = Column(Date)
    delivered_at = Column(DateTime)
class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, default=0)
    gateway = Column(String(100))
    status = Column(String(50), default="pending")
    webhook_verified = Column(Boolean, default=False)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class Refund(Base):
    __tablename__ = "refunds"
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    amount = Column(Float, default=0)
    reason = Column(String(500))
    status = Column(String(50), default="pending")
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class Payout(Base):
    __tablename__ = "payouts"
    id = Column(Integer, primary_key=True, index=True)
    payee_type = Column(String(100), nullable=False)
    payee_id = Column(Integer, nullable=False)
    amount = Column(Float, default=0)
    commission_amount = Column(Float, default=0)
    status = Column(String(50), default="pending")
class CommissionRule(Base):
    __tablename__ = "commission_rules"
    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String(100), nullable=False)
    percentage = Column(Float, default=0)
    fixed_fee = Column(Float, default=0)
    effective_from = Column(Date)
    is_active = Column(Boolean, default=True)
class GPSLocation(Base):
    __tablename__ = "gps_locations"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(100), nullable=False)
    city = Column(String(150))
    address = Column(String(300))
    latitude = Column(Float)
    longitude = Column(Float)
    service_radius_km = Column(Float, default=0)
    is_primary = Column(Boolean, default=False)
class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    target_type = Column(String(100), nullable=False)
    rating = Column(Float)
    review_text = Column(String(1000))
    status = Column(String(50), default="pending")
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    channel = Column(String(100))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class VendorMembershipPlan(Base):
    __tablename__ = "vendor_membership_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    credits = Column(Integer, default=0)
    price = Column(Float, default=0)
    sku_range = Column(String(100))
    duration_days = Column(Integer)
    is_active = Column(Boolean, default=True)
class PlanBenefit(Base):
    __tablename__ = "plan_benefits"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer,ForeignKey("vendor_membership_plans.id"),nullable=False)
    benefit = Column(String(300), nullable=False)
    value = Column(String(300))
class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    plan_id = Column(Integer,ForeignKey("vendor_membership_plans.id"),nullable=False)
    started_on = Column(Date)
    expires_on = Column(Date)
    status = Column(String(50), default="active")
class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(300), nullable=False)
    category = Column(String(100))
    status = Column(String(50), default="open")
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class GeocodingCache(Base):
    __tablename__ = "geocoding_cache"
    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(500), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    formatted_address = Column(String(500))
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(Integer)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class RegionalManager(Base):
    __tablename__ = "regional_managers"
    id: Any = Column(Integer, primary_key=True, index=True)
    name: Any = Column(String(150), nullable=False)
    code: Any = Column(String(100), unique=True, nullable=False)
    phone: Any = Column(String(30))
    email: Any = Column(String(100))
    password: Any = Column(String(100))
    region: Any = Column(String(150))
    is_phone_verified: Any = Column(Boolean, default=False)
    is_active: Any = Column(Boolean, default=True)
class SalesManager(Base):
    __tablename__ = "sales_managers"
    id: Any = Column(Integer, primary_key=True, index=True)
    name: Any = Column(String(150), nullable=False)
    code: Any = Column(String(100), unique=True, nullable=False)
    phone: Any = Column(String(30))
    email: Any = Column(String(100))
    password: Any = Column(String(100))
    region: Any = Column(String(150))
    is_phone_verified: Any = Column(Boolean, default=False)
    is_active: Any = Column(Boolean, default=True)
class SalesExecutive(Base):
    __tablename__ = "sales_executives"
    id: Any = Column(Integer, primary_key=True, index=True)
    name: Any = Column(String(150), nullable=False)
    code: Any = Column(String(100), unique=True, nullable=False)
    phone: Any = Column(String(30))
    email: Any = Column(String(100))
    password: Any = Column(String(100))
    region: Any = Column(String(150))
    city: Any = Column(String(150))
    monthly_target: Any = Column(Float, default=0)
    is_phone_verified: Any = Column(Boolean, default=False)
    is_active: Any = Column(Boolean, default=True)

class MobileOTP(Base):
    __tablename__ = "mobile_otps"
    id: Any = Column(Integer, primary_key=True, index=True)
    phone: Any = Column(String(30), index=True, nullable=False)
    otp: Any = Column(String(10), nullable=False)
    purpose: Any = Column(String(50), default="login")  # "login" or "verify_phone"
    role: Any = Column(String(50), nullable=True)       # "executive", "manager", "regional"
    is_verified: Any = Column(Boolean, default=False)
    expires_at: Any = Column(DateTime, nullable=False)
    created_at: Any = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    executive_id = Column(Integer, ForeignKey("sales_executives.id"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    login_time = Column(DateTime)
    logout_time = Column(DateTime)
    login_latitude = Column(Float)
    login_longitude = Column(Float)
    login_area = Column(String(255))
    logout_latitude = Column(Float)
    logout_longitude = Column(Float)
    logout_area = Column(String(255))
    login_selfie_url = Column(Text)
    logout_selfie_url = Column(Text)
    lunch_out_time = Column(DateTime)
    lunch_in_time = Column(DateTime)
    lunch_out_latitude = Column(Float)
    lunch_out_longitude = Column(Float)
    lunch_out_area = Column(String(255))
    lunch_in_latitude = Column(Float)
    lunch_in_longitude = Column(Float)
    lunch_in_area = Column(String(255))
    lunch_out_selfie_url = Column(Text)
    lunch_in_selfie_url = Column(Text)
    login_accuracy: Any = Column(Float, nullable=True)
    login_city: Any = Column(String(150), nullable=True)
    login_district: Any = Column(String(150), nullable=True)
    login_state: Any = Column(String(150), nullable=True)
    login_pincode: Any = Column(String(20), nullable=True)
    login_village: Any = Column(String(150), nullable=True)
    login_taluk: Any = Column(String(150), nullable=True)
    login_country: Any = Column(String(100), default="India", nullable=True)
    login_location_source: Any = Column(String(50), default="BROWSER_GPS", nullable=True)
    login_formatted_address: Any = Column(Text, nullable=True)

    punch_in_time: Any = Column(DateTime, nullable=True)
    punch_in_latitude: Any = Column(Float, nullable=True)
    punch_in_longitude: Any = Column(Float, nullable=True)
    punch_in_accuracy: Any = Column(Float, nullable=True)
    punch_in_area: Any = Column(String(255), nullable=True)
    punch_in_city: Any = Column(String(150), nullable=True)
    punch_in_district: Any = Column(String(150), nullable=True)
    punch_in_state: Any = Column(String(150), nullable=True)
    punch_in_pincode: Any = Column(String(20), nullable=True)
    punch_in_village: Any = Column(String(150), nullable=True)
    punch_in_taluk: Any = Column(String(150), nullable=True)
    punch_in_country: Any = Column(String(100), default="India", nullable=True)
    punch_in_location_source: Any = Column(String(50), default="BROWSER_GPS", nullable=True)
    punch_in_formatted_address: Any = Column(Text, nullable=True)

    logout_accuracy: Any = Column(Float, nullable=True)
    logout_city: Any = Column(String(150), nullable=True)
    logout_district: Any = Column(String(150), nullable=True)
    logout_state: Any = Column(String(150), nullable=True)
    logout_pincode: Any = Column(String(20), nullable=True)
    logout_village: Any = Column(String(150), nullable=True)
    logout_taluk: Any = Column(String(150), nullable=True)
    logout_country: Any = Column(String(100), default="India", nullable=True)
    logout_location_source: Any = Column(String(50), default="BROWSER_GPS", nullable=True)
    logout_formatted_address: Any = Column(Text, nullable=True)

    punch_out_time: Any = Column(DateTime, nullable=True)
    punch_out_latitude: Any = Column(Float, nullable=True)
    punch_out_longitude: Any = Column(Float, nullable=True)
    punch_out_accuracy: Any = Column(Float, nullable=True)
    punch_out_area: Any = Column(String(255), nullable=True)
    punch_out_city: Any = Column(String(150), nullable=True)
    punch_out_district: Any = Column(String(150), nullable=True)
    punch_out_state: Any = Column(String(150), nullable=True)
    punch_out_pincode: Any = Column(String(20), nullable=True)
    punch_out_village: Any = Column(String(150), nullable=True)
    punch_out_taluk: Any = Column(String(150), nullable=True)
    punch_out_country: Any = Column(String(100), default="India", nullable=True)
    punch_out_location_source: Any = Column(String(50), default="BROWSER_GPS", nullable=True)
    punch_out_formatted_address: Any = Column(Text, nullable=True)

    lunch_out_accuracy: Any = Column(Float, nullable=True)
    lunch_out_city: Any = Column(String(150), nullable=True)
    lunch_out_district: Any = Column(String(150), nullable=True)
    lunch_out_state: Any = Column(String(150), nullable=True)
    lunch_out_pincode: Any = Column(String(20), nullable=True)
    lunch_out_village: Any = Column(String(150), nullable=True)
    lunch_out_taluk: Any = Column(String(150), nullable=True)
    lunch_out_country: Any = Column(String(100), default="India", nullable=True)
    lunch_out_location_source: Any = Column(String(50), default="BROWSER_GPS", nullable=True)
    lunch_out_formatted_address: Any = Column(Text, nullable=True)

    lunch_in_accuracy: Any = Column(Float, nullable=True)
    lunch_in_city: Any = Column(String(150), nullable=True)
    lunch_in_district: Any = Column(String(150), nullable=True)
    lunch_in_state: Any = Column(String(150), nullable=True)
    lunch_in_pincode: Any = Column(String(20), nullable=True)
    lunch_in_village: Any = Column(String(150), nullable=True)
    lunch_in_taluk: Any = Column(String(150), nullable=True)
    lunch_in_country: Any = Column(String(100), default="India", nullable=True)
    lunch_in_location_source: Any = Column(String(50), default="BROWSER_GPS", nullable=True)
    lunch_in_formatted_address: Any = Column(Text, nullable=True)

    total_working_minutes = Column(Integer)
    status: Any = Column(String(50), default="LOGGED_IN")
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None), onupdate=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))

class PincodeCoverage(Base):
    __tablename__ = "pincode_coverages"
    id: Any = Column(Integer, primary_key=True, index=True)
    executive_id: Any = Column(Integer,ForeignKey("sales_executives.id"),nullable=False)
    pincode: Any = Column(String(20), nullable=False)
    city: Any = Column(String(150))
    state: Any = Column(String(150))
    created_at: Any = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class ExecutiveTask(Base):
    __tablename__ = "executive_tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    task_type = Column(String(100))
    entity_type = Column(String(100))
    pincode = Column(String(20))
    priority = Column(String(50))
    status = Column(String(50), default="pending")
    due_date = Column(Date)
class ExecutiveAlert(Base):
    __tablename__ = "executive_alerts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    severity = Column(String(50))
    entity_type = Column(String(100))
    pincode = Column(String(20))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime,default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class MonthlyPlan(Base):
    __tablename__ = "monthly_plans"
    id = Column(Integer, primary_key=True, index=True)
    executive_id = Column(Integer, ForeignKey("sales_executives.id"), nullable=False)
    month_key = Column(String(10), nullable=False)  
    month_label = Column(String(50))
    working_days = Column(Integer, default=0)
    daily_target = Column(Integer, default=0)
    total_doctors = Column(Integer, default=0)
    planning_method = Column(String(20), default="auto") 
    status: Any = Column(String(30), default="Draft")
    submitted_at: Any = Column(DateTime, nullable=True)
    approved_at: Any = Column(DateTime, nullable=True)
    approved_by: Any = Column(String(150), nullable=True)
    rejection_reason: Any = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
    __table_args__ = (UniqueConstraint("executive_id", "month_key", name="uq_exec_month"),)
class PlanVisit(Base):
    __tablename__ = "plan_visits"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("monthly_plans.id"), nullable=False)
    executive_id = Column(Integer, ForeignKey("sales_executives.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    visit_time = Column(String(20), default="10:00 AM")
    status: Any = Column(String(30), default="Planned")
    reschedule_reason = Column(String(200), nullable=True)
    rescheduled_from = Column(Date, nullable=True)
    cancel_requested = Column(Boolean, default=False)
    cancel_approved_by = Column(String(150), nullable=True)
    cancel_reason = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class VisitReport(Base):
    __tablename__ = "visit_reports"
    id = Column(Integer, primary_key=True, index=True)
    plan_visit_id = Column(Integer, ForeignKey("plan_visits.id"), nullable=False)
    executive_id = Column(Integer, ForeignKey("sales_executives.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    visit_date = Column(Date, nullable=False)
    visit_time = Column(String(20))
    location = Column(String(300))
    purpose = Column(String(150))
    products_discussed = Column(Text)
    notes = Column(Text)
    doctor_feedback = Column(Text)
    work_with = Column(String(500), nullable=True)
    next_followup_date = Column(Date, nullable=True)
    next_action = Column(String(300))
    remarks = Column(Text)
    follow_up_required = Column(Boolean, default=True)
    status: Any = Column(String(30), default="Draft")
    submitted_at: Any = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
class ExecutiveSubmissionReport(Base):
    __tablename__ = "executive_submission_reports"
    id = Column(Integer, primary_key=True, index=True)
    executive_id = Column(Integer, ForeignKey("sales_executives.id"), nullable=False)
    executive_name = Column(String(100), nullable=True)
    employee_code = Column(String(50), nullable=True)
    region = Column(String(100), nullable=True)
    report_date = Column(Date, nullable=False)
    reporting_type = Column(String(50), default="Field")
    recipient_type = Column(String(50), default="both") 
    manager_id = Column(Integer, nullable=True)
    manager_name = Column(String(100), nullable=True)
    regional_manager_id = Column(Integer, nullable=True)
    regional_manager_name = Column(String(100), nullable=True)
    total_visits = Column(Integer, default=0)
    reported_visits = Column(Integer, default=0)
    summary_notes = Column(Text, nullable=True)
    visits_json = Column(Text, nullable=True)
    status = Column(String(50), default="Submitted")
    manager_remarks = Column(Text, nullable=True)
    regional_remarks = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None))
