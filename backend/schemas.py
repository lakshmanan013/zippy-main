from typing import Optional, Any
from datetime import datetime, date, time, timedelta, timezone
from pydantic import BaseModel

class PetParentCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
class PetParentResponse(PetParentCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
class PetCreate(BaseModel):
    parent_id: int
    name :str
    species: Optional[str] = None
    breed :Optional[str]=None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    is_active: str = "Yes"
class PetResponse(BaseModel):
    id:int
    class Config:
        from_attributes = True
class MedicalRecordCreate(BaseModel):
    pet_id: int
    record_type: Optional[str] = None
    title: Optional[str] = None
    diagnosis: Optional[str] = None
    record_date: Optional[date] = None
class VaccinationCreate(BaseModel):
    pet_id: int
    vaccine_name: str
    administered_on: Optional[date] = None
    next_due_on: Optional[date] = None
    batch_number: Optional[str] = None
class AddressCreate(BaseModel):
    parent_id: int
    label: Optional[str] = None
    contact_name: Optional[str] = None
    line1: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    is_default: bool = False
class UserRoleCreate(BaseModel):
    user_id: int
    role: str
class DoctorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    password: Optional[str] = None
    qualification: Optional[str] = None
    specializations: Optional[str] = None
    pincode: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None
    verification_status: str = "pending"
    is_active: str = "Yes"
    profile_image: Optional[str] = None
    signature_image: Optional[str] = None
    digital_signature: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_hospital: Optional[str] = None
    facility_type: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_inside_image: Optional[str] = None
    clinic_outside_image: Optional[str] = None
    inside_clinic_image: Optional[str] = None
    outside_clinic_image: Optional[str] = None
    clinic_images: Optional[str] = None
class ClinicHospitalCreate(BaseModel):
    name: str
    facility_type: Optional[str] = None
    phone: Optional[str] = None
    emergency_available: bool = False
    open_24x7: bool = False
    verification_status: str = "pending"
    rating: Optional[float] = None
class AvailabilitySlotCreate(BaseModel):
    doctor_id: int
    day_of_week: str
    start_time: time
    end_time: time
    consultation_type: Optional[str] = None
    is_active: str = "Yes"
class DoctorDocumentCreate(BaseModel):
    doctor_id: int
    document_type: str
    status: str = "pending"
    file_path: Optional[str] = None
class AppointmentCreate(BaseModel):
    pet_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    appointment_type: Optional[str] = None
    status: str = "pending"
    payment_status: str = "pending"
    consultation_fee: Optional[float] = 0
class ConsultationCreate(BaseModel):
    appointment_id: int
    consultation_mode: Optional[str] = None
    diagnosis: Optional[str] = None
    follow_up_date: Optional[date] = None
class PrescriptionCreate(BaseModel):
    doctor_id: int
    pet_id: int
    doc_name: Optional[str] = None
    pet_name: Optional[str] = None
    owner_name: Optional[str] = None
    valid_until: Optional[date] = None
class ServiceProviderCreate(BaseModel):
    name: str
    provider_type: Optional[str] = None
    phone: Optional[str] = None
    verification_status: str = "pending"
    rating: Optional[float] = None
    is_active: str = "Yes"
class ServiceCreate(BaseModel):
    title: str
    service_type: Optional[str] = None
    price: Optional[float] = 0
    duration_minutes: Optional[int] = None
    home_service: bool = False
    is_active: str = "Yes"
class ServiceBookingCreate(BaseModel):
    service_id: int
    provider_id: int
    pet_id: int
    booking_date: date
    booking_time: time
    price: Optional[float] = 0
    status: str = "pending"
    payment_status: str = "pending"
class ProductCreate(BaseModel):
    name: str
    price: Optional[float] = 0
    mrp: Optional[float] = 0
    discount_percent: Optional[float] = 0
    pincode: Optional[str] = None
    stock_quantity: Optional[int] = 0
    is_prescription_required: bool = False
    rating: Optional[float] = None
    is_active: str = "Yes"
class InventoryCreate(BaseModel):
    product_id: int
    seller_id: int
    pincode: Optional[str] = None
    inventory_source: Optional[str] = None
    available_quantity: Optional[int] = 0
    reserved_quantity: Optional[int] = 0
    reorder_level: Optional[int] = 0
class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    sort_order: Optional[int] = 0
    is_active: str = "Yes"
class BrandCreate(BaseModel):
    name: str
    is_active: str = "Yes"
class SellerStoreCreate(BaseModel):
    business_name: str
    seller_type: Optional[str] = None
    phone: Optional[str] = None
    commission_rate: Optional[float] = 0
    verification_status: str = "pending"
    rating: Optional[float] = None
    is_active: str = "Yes"
class WarehouseCreate(BaseModel):
    name: str
    seller_id: int
    is_zenve_owned: bool = False
    contact_phone: Optional[str] = None
    is_active: str = "Yes"
class CartCreate(BaseModel):
    user_id: int
class CartItemCreate(BaseModel):
    cart_id: int
    product_id: int
    quantity: int = 1
    price: Optional[float] = 0
    saved_for_later: bool = False
class OrderCreate(BaseModel):
    order_number: str
    total_amount: Optional[float] = 0
    status: str = "pending"
    payment_status: str = "pending"
class OrderItemCreate(BaseModel):
    order_id: int
    product_name: str
    quantity: int = 1
    unit_price: Optional[float] = 0
    total_price: Optional[float] = 0
    status: str = "CONFIRMED"
class DeliveryCreate(BaseModel):
    order_id: int
    tracking_number: Optional[str] = None
    status: str = "pending"
    estimated_delivery: Optional[date] = None
    delivered_at: Optional[datetime] = None
class PaymentCreate(BaseModel):
    order_id: int
    amount: Optional[float] = 0
    gateway: Optional[str] = None
    status: str = "pending"
    webhook_verified: bool = False
class RefundCreate(BaseModel):
    payment_id: int
    amount: Optional[float] = 0
    reason: Optional[str] = None
    status: str = "pending"
class PayoutCreate(BaseModel):
    payee_type: str
    payee_id: int
    amount: Optional[float] = 0
    commission_amount: Optional[float] = 0
    status: str = "pending"
class CommissionRuleCreate(BaseModel):
    scope: str
    percentage: Optional[float] = 0
    fixed_fee: Optional[float] = 0
    effective_from: Optional[date] = None
    is_active: str = "Yes"
class GPSLocationCreate(BaseModel):
    entity_type: str
    city: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius_km: Optional[float] = 0
    is_primary: bool = False
class ReviewCreate(BaseModel):
    target_type: str
    rating: Optional[float] = None
    review_text: Optional[str] = None
    status: str = "pending"
class NotificationCreate(BaseModel):
    event_type: str
    title: str
    channel: Optional[str] = None
    is_read: bool = False
class VendorMembershipPlanCreate(BaseModel):
    name: str
    credits: Optional[int] = 0
    price: Optional[float] = 0
    sku_range: Optional[str] = None
    duration_days: Optional[int] = None
    is_active: str = "Yes"
class PlanBenefitCreate(BaseModel):
    plan_id: int
    benefit: str
    value: Optional[str] = None
class VendorCreate(BaseModel):
    user_id: int
    plan_id: int
    started_on: Optional[date] = None
    expires_on: Optional[date] = None
    status: str = "active"
class SupportTicketCreate(BaseModel):
    subject: str
    category: Optional[str] = None
    status: str = "open"
class GeocodingCacheCreate(BaseModel):
    query: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
class AuditLogCreate(BaseModel):
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
class RegionalManagerCreate(BaseModel):
    name: str
    code: str
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    region: Optional[str] = None
    is_phone_verified: Optional[bool] = False
    is_active: str = "Yes"
class SalesManagerCreate(BaseModel):
    name: str
    code: str
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    region: Optional[str] = None
    is_phone_verified: Optional[bool] = False
    is_active: str = "Yes"
class SalesExecutiveCreate(BaseModel):
    name: str
    code: str
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    monthly_target: Optional[float] = 0
    is_phone_verified: Optional[bool] = False
    is_active: str = "Yes"

class SalesExecutiveLoginRequest(BaseModel):
    identifier: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: str

class SendOtpRequest(BaseModel):
    phone: str
    purpose: Optional[str] = "login"  # "login" or "verify_phone"
    role: Optional[str] = None       # "executive", "manager", "regional"
    force_mock: Optional[bool] = False

class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    purpose: Optional[str] = "verify_phone"
    role: Optional[str] = None

class MobileLoginRequest(BaseModel):
    phone: str
    otp: str
    role: str  

class ManagerLoginRequest(BaseModel):
    identifier: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: str


class AttendanceBase(BaseModel):
    login_latitude: Optional[float] = None
    login_longitude: Optional[float] = None
    logout_latitude: Optional[float] = None
    logout_longitude: Optional[float] = None

class AttendanceActionRequest(BaseModel):
    sales_executive_id: Optional[int] = None
    executive_id: Optional[int] = None
    employee_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    location_accuracy: Optional[float] = None
    street: Optional[str] = None
    area_street: Optional[str] = None
    area: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    pin: Optional[str] = None
    formatted_address: Optional[str] = None
    full_address: Optional[str] = None
    location_source: Optional[str] = "BROWSER_GPS"
    selfie_data: Optional[str] = None
    selfie_url: Optional[str] = None
    action: Optional[str] = None
    punch_type: Optional[str] = None

class AttendanceLoginRequest(BaseModel):
    sales_executive_id: Optional[int] = None
    executive_id: Optional[int] = None
    employee_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    location_accuracy: Optional[float] = None
    street: Optional[str] = None
    area_street: Optional[str] = None
    area: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    pin: Optional[str] = None
    formatted_address: Optional[str] = None
    full_address: Optional[str] = None
    location_source: Optional[str] = "BROWSER_GPS"
    selfie_data: Optional[str] = None
    selfie_url: Optional[str] = None

class AttendanceLogoutRequest(BaseModel):
    sales_executive_id: Optional[int] = None
    executive_id: Optional[int] = None
    employee_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    location_accuracy: Optional[float] = None
    street: Optional[str] = None
    area_street: Optional[str] = None
    area: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    pin: Optional[str] = None
    formatted_address: Optional[str] = None
    full_address: Optional[str] = None
    location_source: Optional[str] = "BROWSER_GPS"
    selfie_data: Optional[str] = None
    selfie_url: Optional[str] = None

class AttendanceLunchOutRequest(BaseModel):
    sales_executive_id: Optional[int] = None
    executive_id: Optional[int] = None
    employee_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    location_accuracy: Optional[float] = None
    street: Optional[str] = None
    area_street: Optional[str] = None
    area: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    pin: Optional[str] = None
    formatted_address: Optional[str] = None
    full_address: Optional[str] = None
    location_source: Optional[str] = "BROWSER_GPS"
    selfie_data: Optional[str] = None
    selfie_url: Optional[str] = None

class AttendanceLunchInRequest(BaseModel):
    sales_executive_id: Optional[int] = None
    executive_id: Optional[int] = None
    employee_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    location_accuracy: Optional[float] = None
    street: Optional[str] = None
    area_street: Optional[str] = None
    area: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    pin: Optional[str] = None
    formatted_address: Optional[str] = None
    full_address: Optional[str] = None
    location_source: Optional[str] = "BROWSER_GPS"
    selfie_data: Optional[str] = None
    selfie_url: Optional[str] = None

class PincodeCoverageCreate(BaseModel):
    executive_id: int
    pincode: str
    city: Optional[str] = None
    state: Optional[str] = None
class ExecutiveTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: Optional[str] = "General"
    entity_type: Optional[str] = None
    pincode: Optional[str] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "pending"
    due_date: Optional[date] = None
    assigned_by_id: Optional[int] = None
    assigned_by_role: Optional[str] = None
    assigned_by_name: Optional[str] = None
    assigned_to_role: Optional[str] = "executive"
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    region: Optional[str] = None
    target_entity_name: Optional[str] = None
    target_entity_id: Optional[int] = None
    progress: Optional[int] = 0
    remarks: Optional[str] = None

class ExecutiveTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    entity_type: Optional[str] = None
    pincode: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    assigned_to_role: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    region: Optional[str] = None
    target_entity_name: Optional[str] = None
    target_entity_id: Optional[int] = None
    progress: Optional[int] = None
    remarks: Optional[str] = None
    completed_at: Optional[datetime] = None

class ExecutiveAlertCreate(BaseModel):
    title: str
    message: Optional[str] = None
    severity: Optional[str] = "info"
    alert_type: Optional[str] = "task"
    entity_type: Optional[str] = None
    pincode: Optional[str] = None
    executive_id: Optional[int] = None
    task_id: Optional[int] = None
    is_read: bool = False
class MonthlyPlanCreate(BaseModel):
    executive_id: int
    month_key: str
    month_label: Optional[str] = None
    working_days: int = 0
    daily_target: int = 0
    total_doctors: int = 0
    planning_method: str = "auto"
class MonthlyPlanUpdate(BaseModel):
    status: Optional[str] = None
    working_days: Optional[int] = None
    daily_target: Optional[int] = None
    total_doctors: Optional[int] = None
    planning_method: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
class PlanVisitCreate(BaseModel):
    plan_id: int
    executive_id: int
    doctor_id: int
    scheduled_date: date
    visit_time: str = "10:00 AM"
    status: str = "Planned"
    reschedule_reason: Optional[str] = None
    rescheduled_from: Optional[date] = None
    cancel_requested: Optional[bool] = False
    cancel_approved_by: Optional[str] = None
    cancel_reason: Optional[str] = None
class PlanVisitUpdate(BaseModel):
    scheduled_date: Optional[date] = None
    visit_time: Optional[str] = None
    status: Optional[str] = None
    reschedule_reason: Optional[str] = None
    rescheduled_from: Optional[date] = None
    cancel_requested: Optional[bool] = None
    cancel_approved_by: Optional[str] = None
    cancel_reason: Optional[str] = None
class VisitReportCreate(BaseModel):
    plan_visit_id: int
    executive_id: int
    doctor_id: int
    visit_date: date
    visit_time: Optional[str] = None
    location: Optional[str] = None
    purpose: Optional[str] = None
    products_discussed: Optional[str] = None
    notes: Optional[str] = None
    doctor_feedback: Optional[str] = None
    work_with: Optional[str] = None
    next_followup_date: Optional[date] = None
    next_action: Optional[str] = None
    remarks: Optional[str] = None
    follow_up_required: bool = True
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None
class ExecutiveSubmissionReportCreate(BaseModel):
    executive_id: int
    executive_name: Optional[str] = None
    employee_code: Optional[str] = None
    region: Optional[str] = None
    report_date: date
    reporting_type: Optional[str] = "Field"
    recipient_type: Optional[str] = "both"
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    regional_manager_id: Optional[int] = None
    regional_manager_name: Optional[str] = None
    total_visits: Optional[int] = 0
    reported_visits: Optional[int] = 0
    summary_notes: Optional[str] = None
    visits_json: Optional[str] = None
    status: Optional[str] = "Submitted"
class ExecutiveSubmissionReportUpdate(BaseModel):
    status: Optional[str] = None
    manager_remarks: Optional[str] = None
    regional_remarks: Optional[str] = None
    summary_notes: Optional[str] = None
class VisitReportUpdate(BaseModel):
    visit_date: Optional[date] = None
    visit_time: Optional[str] = None
    location: Optional[str] = None
    purpose: Optional[str] = None
    products_discussed: Optional[str] = None
    notes: Optional[str] = None
    doctor_feedback: Optional[str] = None
    work_with: Optional[str] = None
    next_followup_date: Optional[date] = None
    next_action: Optional[str] = None
    remarks: Optional[str] = None
    follow_up_required: Optional[bool] = None
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None
class RejectBody(BaseModel):
    reason: str
    request_changes: bool = False

class StatusUpdate(BaseModel):
    phone: str
    status: str

class SalesLoginRequest(BaseModel):
    email: str
    password: str

class CheckFaceRequest(BaseModel):
    image: Optional[str] = None

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminSendOtpRequest(BaseModel):
    phone: str
    mode: Optional[str] = "apitxt"  

class AdminVerifyOtpRequest(BaseModel):
    phone: str
    otp: str
