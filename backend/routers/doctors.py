import os
import random
import re
import requests
import shutil
import base64
import uuid
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional, Any
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import *
from models import *
from schemas import *
from utils import *

router = APIRouter()

@router.post("/doctors/{doctor_id}/documents")
async def upload_doctor_document(
    doctor_id: int, 
    document_type: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    file_data = await file.read()
    content_type = file.content_type
    
    doc: Any = DoctorDocument(
        doctor_id=doctor_id,
        document_type=document_type,
        status="Uploaded",
        file_data=file_data,
        content_type=content_type
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    doc.file_path = f"/documents/{doc.id}/file"
    db.commit()
    db.refresh(doc)
    
    res_data = model_response(doc)
    if "file_data" in res_data:
        del res_data["file_data"]
        
    return res_data

@router.get("/documents/{document_id}/file")
def get_document_file(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(DoctorDocument).filter(DoctorDocument.id == document_id).first()
    if not doc or not doc.file_data:
        raise HTTPException(status_code=404, detail="Document file not found")
    return Response(content=doc.file_data, media_type=doc.content_type or "application/octet-stream")
@router.post("/doctors")
def create_doctor(data: DoctorCreate, db: Session = Depends(get_db)):
    import json
    # Resolve clinic and images
    c_name = (data.clinic_name or data.clinic_hospital or "").strip() or None
    inside_img = data.clinic_inside_image or data.inside_clinic_image
    outside_img = data.clinic_outside_image or data.outside_clinic_image
    if not inside_img and not outside_img and data.clinic_images:
        try:
            imgs = json.loads(data.clinic_images) if isinstance(data.clinic_images, str) else data.clinic_images
            if isinstance(imgs, dict):
                inside_img = imgs.get("inside")
                outside_img = imgs.get("outside")
        except Exception:
            pass

    sig_img = data.signature_image or data.digital_signature

    doctor = Doctor(
        name=data.name,
        email=data.email,
        password=data.password,
        qualification=data.qualification,
        specializations=data.specializations,
        pincode=data.pincode,
        city=data.city,
        phone=data.phone,
        experience_years=data.experience_years,
        consultation_fee=data.consultation_fee,
        verification_status="pending",
        is_active=yes_no_to_bool(data.is_active),
        profile_image=data.profile_image,
        signature_image=sig_img,
        clinic_name=c_name,
        clinic_hospital=c_name,
        facility_type=data.facility_type or "Clinic",
        clinic_phone=data.clinic_phone or data.phone or "",
        clinic_inside_image=inside_img,
        clinic_outside_image=outside_img
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    # Auto-link to clinics_hospitals in Zippy CRM if provided
    if c_name:
        try:
            existing_ch = db.query(ClinicHospital).filter(ClinicHospital.name == c_name).first()
            if not existing_ch:
                ch = ClinicHospital(
                    name=c_name,
                    facility_type=data.facility_type or "Clinic",
                    phone=data.clinic_phone or data.phone or "",
                    emergency_available=True,
                    open_24x7=True,
                    verification_status="verified",
                    rating=4.8
                )
                db.add(ch)
                db.commit()
        except Exception as e:
            print(f"Could not auto-sync to clinics_hospitals: {e}")

    # Notify New Doctor Admin Backend (localhost:5000) and Doctor App (localhost:8080)
    import urllib.request
    try:
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Secret": "change-this-shared-secret"
        }
        payload = {
            "fullName": data.name,
            "email": data.email,
            "password": data.password,
            "phone": data.phone,
            "qualification": data.qualification,
            "specializations": data.specializations,
            "experienceYears": data.experience_years,
            "consultationFee": data.consultation_fee,
            "pincode": data.pincode if data.pincode else None,
            "city": data.city,
            "clinicName": c_name,
            "clinicHospital": c_name,
            "facilityType": data.facility_type or "Clinic",
            "clinicPhone": data.clinic_phone or data.phone or "",
            "clinicInsideImage": inside_img,
            "clinicOutsideImage": outside_img,
            "signatureImage": sig_img,
            "profileImage": data.profile_image
        }
        encoded_payload = json.dumps(payload).encode('utf-8')

        # 1. Notify New Doctor Admin Backend (localhost:5000) for Admin Approval
        # Admin backend automatically forwards to doctor website backend (8080)
        admin_ok = False
        try:
            admin_backend_url = "http://localhost:5000/api/doctors/executive-add"
            req_admin = urllib.request.Request(admin_backend_url, data=encoded_payload, headers=headers, method='POST')
            urllib.request.urlopen(req_admin, timeout=5)
            admin_ok = True
            print("Successfully submitted doctor to New Doctor Admin (localhost:5000)")
        except Exception as e:
            print(f"Failed to notify New Doctor Admin backend: {e}")

        # 2. Only if Admin Backend was unreachable, fallback directly to Doctor App Backend (localhost:8080)
        if not admin_ok:
            try:
                doctor_app_url = "http://localhost:8080/api/internal/doctors/executive-add"
                req_doctor = urllib.request.Request(doctor_app_url, data=encoded_payload, headers=headers, method='POST')
                urllib.request.urlopen(req_doctor, timeout=5)
                print("Successfully submitted doctor directly to Doctor Website backend (localhost:8080) as fallback")
            except Exception as e:
                print(f"Failed to notify doctor backend: {e}")

    except Exception as e:
        print(f"Failed to process external notifications: {e}")

    return {
    "message": "Doctor created successfully",
    "doctor": {
        "id": doctor.id,
        "name": doctor.name,
        "email": doctor.email,
        "qualification": doctor.qualification,
        "specializations": doctor.specializations,
        "pincode": doctor.pincode,
        "city": doctor.city,
        "phone": doctor.phone,
        "experience_years": doctor.experience_years,
        "consultation_fee": doctor.consultation_fee,
        "verification_status": doctor.verification_status,
        "is_active": doctor.is_active,
        "profile_image": doctor.profile_image,
        "signature_image": doctor.signature_image,
        "clinic_name": doctor.clinic_name,
        "clinic_hospital": doctor.clinic_hospital,
        "facility_type": doctor.facility_type,
        "clinic_phone": doctor.clinic_phone,
        "clinic_inside_image": doctor.clinic_inside_image,
        "clinic_outside_image": doctor.clinic_outside_image
    }
}

@router.post("/internal/doctors/status")
def update_doctor_status(data: StatusUpdate, db: Session = Depends(get_db)):
    doctor: Any = db.query(Doctor).filter(Doctor.phone == data.phone).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found by phone")
    
    # Update verification status
    doctor.verification_status = data.status
    db.commit()
    return {"message": "Status updated successfully"}

@router.get("/doctors")
def get_doctors(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Doctor)
    if status:
        query = query.filter(Doctor.verification_status.ilike(status))
    return [model_response(item) for item in query.order_by(Doctor.id.desc()).all()]

@router.get("/doctors/{doctor_id}")
def get_doctor(doctor_id: int,db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404,detail="Doctor not found")
    return model_response(doctor)
@router.put("/doctors/{doctor_id}")
def update_doctor(doctor_id: int,data: DoctorCreate,db: Session = Depends(get_db)):
    record = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Doctor not found")
    try:
        old_status = str(record.verification_status or "")
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)

        # Notify doctor app when doctor status is approved
        new_status = str(record.verification_status or "").lower()
        if new_status in ["approved", "verified"] and old_status.lower() not in ["approved", "verified"]:
            try:
                doctor_app_url = "http://localhost:8080/api/internal/doctors/status"
                requests.post(
                    doctor_app_url,
                    json={"phone": record.phone, "email": record.email, "status": "approved"},
                    headers={"X-Internal-Secret": "change-this-shared-secret"},
                    timeout=5
                )
            except Exception as e:
                print(f"Failed to sync doctor approval to doctor app: {e}")

        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: int,db: Session = Depends(get_db)):
    record = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Doctor not found")
    
    doctor_email = record.email
    
    try:
        db.delete(record)
        db.commit()

        # Also delete the doctor account in the doctor app
        if doctor_email:
            try:
                doctor_app_url = "http://localhost:8080"
                requests.delete(
                    f"{doctor_app_url}/api/internal/doctors/delete?email={doctor_email}",
                    headers={"X-Internal-Secret": "change-this-shared-secret"}
                )
            except Exception as e:
                print("Failed to delete doctor account from Doctor App:", e)

        return {
            "message": "Doctor deleted successfully",
            "id": doctor_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/clinics-hospitals")
def create_clinic_hospital(data: ClinicHospitalCreate,db: Session = Depends(get_db)):
    facility = ClinicHospital(
        name=data.name,
        facility_type=data.facility_type,
        phone=data.phone,
        emergency_available=data.emergency_available,
        open_24x7=data.open_24x7,
        verification_status=data.verification_status,
        rating=data.rating
    )
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return model_response(facility)
@router.get("/clinics-hospitals")
def get_clinics_hospitals(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(ClinicHospital).all()]
@router.get("/clinics-hospitals/{facility_id}")
def get_clinic_hospital(facility_id: int,db: Session = Depends(get_db)):
    facility = db.query(ClinicHospital).filter(
        ClinicHospital.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404,detail="Clinic or hospital not found")
    return model_response(facility)
@router.put("/clinics-hospitals/{facility_id}")
def update_clinichospital(facility_id: int,data: ClinicHospitalCreate,db: Session = Depends(get_db)):
    record = db.query(ClinicHospital).filter(ClinicHospital.id == facility_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="ClinicHospital not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/clinics-hospitals/{facility_id}")
def delete_clinichospital(facility_id: int,db: Session = Depends(get_db)):
    record = db.query(ClinicHospital).filter(ClinicHospital.id == facility_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="ClinicHospital not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "ClinicHospital deleted successfully",
            "id": facility_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/availability-slots")
def create_availability_slot(data: AvailabilitySlotCreate,db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(
        Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404,detail="Doctor not found")
    slot = AvailabilitySlot(
        doctor_id=data.doctor_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        consultation_type=data.consultation_type,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return model_response(slot)
@router.get("/availability-slots")
def get_availability_slots(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(AvailabilitySlot).all()]
@router.get("/availability-slots/{slot_id}")
def get_availability_slot(slot_id: int,db: Session = Depends(get_db)):
    slot = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404,detail="Availability slot not found")
    return model_response(slot)
@router.put("/availability-slots/{slot_id}")
def update_availabilityslot(slot_id: int,data: AvailabilitySlotCreate,db: Session = Depends(get_db)):
    record = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="AvailabilitySlot not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/availability-slots/{slot_id}")
def delete_availabilityslot(slot_id: int,db: Session = Depends(get_db)):
    record = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="AvailabilitySlot not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "AvailabilitySlot deleted successfully",
            "id": slot_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/doctor-documents")
def create_doctor_document(data: DoctorDocumentCreate,db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(
        Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404,detail="Doctor not found")
    document = DoctorDocument(
        doctor_id=data.doctor_id,
        document_type=data.document_type,
        status=data.status
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return model_response(document)
@router.get("/doctor-documents")
def get_doctor_documents(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(DoctorDocument).all()]
@router.get("/doctor-documents/{document_id}")
def get_doctor_document(document_id: int,db: Session = Depends(get_db)):
    document = db.query(DoctorDocument).filter(
        DoctorDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404,detail="Doctor document not found")
    return model_response(document)
@router.put("/doctor-documents/{document_id}")
def update_doctordocument(document_id: int,data: DoctorDocumentCreate,db: Session = Depends(get_db)):
    record = db.query(DoctorDocument).filter(DoctorDocument.id == document_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="DoctorDocument not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/doctor-documents/{document_id}")
def delete_doctordocument(document_id: int,db: Session = Depends(get_db)):
    record = db.query(DoctorDocument).filter(DoctorDocument.id == document_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="DoctorDocument not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "DoctorDocument deleted successfully",
            "id": document_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/appointments")
def create_appointment(data:AppointmentCreate,db:Session=Depends(get_db)):
    pet =db.query(Pet).filter(Pet.id==data.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404 , detail= "Pet Not Found")
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404 , detail="Doctor Not Found")
    appointment = Appointment(
        pet_id = data.pet_id,
        doctor_id = data.doctor_id,
        appointment_date = data.appointment_date,
        appointment_time = data.appointment_time,
        appointment_type = data.appointment_type,
        status = data.status,
        payment_status = data.payment_status,
        consultation_fee=data.consultation_fee
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return model_response(appointment)
@router.get("/appointments")
def get_appointments(db:Session=Depends(get_db)):
    return [model_response(item) for item in db.query(Appointment).all()]
@router.get("/appointments/{appointment_id}")
def get_appointment(appointment_id :int,db:Session = Depends(get_db)):
    appointment =db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404 , detail="Appointment Not Found")
    return model_response(appointment)
@router.put("/appointments/{appointment_id}")
def update_appointment(appointment_id: int,data: AppointmentCreate,db: Session = Depends(get_db)):
    record = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Appointment not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int,db: Session = Depends(get_db)):
    record = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Appointment not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Appointment deleted successfully",
            "id": appointment_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/consultations")
def create_consultation(data:ConsultationCreate,db:Session=Depends(get_db)):
    appointment = db.query(Appointment).filter(
        Appointment.id == data.appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404 , detail="Appointment Not Found")
    consultation = Consultation(
        appointment_id = data.appointment_id,
        consultation_mode = data.consultation_mode,
        diagnosis = data.diagnosis,
        follow_up_date = data.follow_up_date
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return model_response(consultation)
@router.get("/consultations")
def get_consultations(db:Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Consultation).all()]
@router.get("/consultations/{consultation_id}")
def get_consultation(consultation_id: int, db: Session = Depends(get_db)):
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return model_response(consultation)
@router.put("/consultations/{consultation_id}")
def update_consultation(consultation_id: int,data: ConsultationCreate,db: Session = Depends(get_db)):
    record = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Consultation not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/consultations/{consultation_id}")
def delete_consultation(consultation_id: int,db: Session = Depends(get_db)):
    record = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Consultation not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Consultation deleted successfully",
            "id": consultation_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/prescriptions")
def create_prescription(data: PrescriptionCreate, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(
        Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    pet = db.query(Pet).filter(Pet.id == data.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    resolved_doc_name = data.doc_name or doctor.name
    resolved_pet_name = data.pet_name or pet.name
    resolved_owner_name = data.owner_name
    if not resolved_owner_name and getattr(pet, "parent_id", None):
        owner = db.query(PetParent).filter(PetParent.id == pet.parent_id).first()
        if owner:
            resolved_owner_name = getattr(owner, "full_name", None) or getattr(owner, "name", None)

    prescription = Prescription(
        doctor_id=data.doctor_id,
        pet_id=data.pet_id,
        doc_name=resolved_doc_name,
        pet_name=resolved_pet_name,
        owner_name=resolved_owner_name,
        valid_until=data.valid_until
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return model_response(prescription)
@router.get("/prescriptions")
def get_prescriptions(db:Session = Depends(get_db)):
    items = db.query(Prescription).all()
    results = []
    for item in items:
        resp = model_response(item)
        if not resp.get("doc_name"):
            doc = db.query(Doctor).filter(Doctor.id == item.doctor_id).first()
            if doc:
                resp["doc_name"] = doc.name
        if not resp.get("pet_name") or not resp.get("owner_name"):
            pet = db.query(Pet).filter(Pet.id == item.pet_id).first()
            if pet:
                if not resp.get("pet_name"):
                    resp["pet_name"] = pet.name
                if not resp.get("owner_name") and getattr(pet, "parent_id", None):
                    owner = db.query(PetParent).filter(PetParent.id == pet.parent_id).first()
                    if owner:
                        resp["owner_name"] = getattr(owner, "full_name", None) or getattr(owner, "name", None)
        results.append(resp)
    return results
@router.get("/prescriptions/{prescription_id}")
def get_prescription(prescription_id: int, db: Session = Depends(get_db)):
    prescription = db.query(Prescription).filter(
        Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    resp = model_response(prescription)
    if not resp.get("doc_name"):
        doc = db.query(Doctor).filter(Doctor.id == prescription.doctor_id).first()
        if doc:
            resp["doc_name"] = doc.name
    if not resp.get("pet_name") or not resp.get("owner_name"):
        pet = db.query(Pet).filter(Pet.id == prescription.pet_id).first()
        if pet:
            if not resp.get("pet_name"):
                resp["pet_name"] = pet.name
            if not resp.get("owner_name") and getattr(pet, "parent_id", None):
                owner = db.query(PetParent).filter(PetParent.id == pet.parent_id).first()
                if owner:
                    resp["owner_name"] = getattr(owner, "full_name", None) or getattr(owner, "name", None)
    return resp
@router.put("/prescriptions/{prescription_id}")
def update_prescription(prescription_id: int,data: PrescriptionCreate,db: Session = Depends(get_db)):
    record = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Prescription not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/prescriptions/{prescription_id}")
def delete_prescription(prescription_id: int,db: Session = Depends(get_db)):
    record = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Prescription not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Prescription deleted successfully",
            "id": prescription_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
