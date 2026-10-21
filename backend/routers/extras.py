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

@router.post("/gps-locations")
def create_gps_location(data: GPSLocationCreate,db: Session = Depends(get_db)):
    location = GPSLocation(**data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return model_response(location)
@router.get("/gps-locations")
def get_gps_locations(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(GPSLocation).all()]
@router.get("/gps-locations/{location_id}")
def get_gps_location(location_id: int,db: Session = Depends(get_db)):
    location = db.query(GPSLocation).filter(GPSLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404,detail="GPS location not found")
    return model_response(location)
@router.put("/gps-locations/{location_id}")
def update_gpslocation(location_id: int,data: GPSLocationCreate,db: Session = Depends(get_db)):
    record = db.query(GPSLocation).filter(GPSLocation.id == location_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="GPSLocation not found")
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
@router.delete("/gps-locations/{location_id}")
def delete_gpslocation(location_id: int,db: Session = Depends(get_db)):
    record = db.query(GPSLocation).filter(GPSLocation.id == location_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="GPSLocation not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "GPSLocation deleted successfully",
            "id": location_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/reviews")
def create_review(data: ReviewCreate,db: Session = Depends(get_db)):
    review = Review(**data.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return model_response(review)
@router.get("/reviews")
def get_reviews(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Review).all()]
@router.get("/reviews/{review_id}")
def get_review(review_id: int,db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404,detail="Review not found")
    return model_response(review)
@router.put("/reviews/{review_id}")
def update_review(review_id: int,data: ReviewCreate,db: Session = Depends(get_db)):
    record = db.query(Review).filter(Review.id == review_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Review not found")
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
@router.delete("/reviews/{review_id}")
def delete_review(review_id: int,db: Session = Depends(get_db)):
    record = db.query(Review).filter(Review.id == review_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Review not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Review deleted successfully",
            "id": review_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/notifications")
def create_notification(data: NotificationCreate,db: Session = Depends(get_db)):
    notification = Notification(**data.model_dump())
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return model_response(notification)
@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Notification).all()]
@router.get("/notifications/{notification_id}")
def get_notification(notification_id: int,db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404,detail="Notification not found")
    return model_response(notification)
@router.put("/notifications/{notification_id}")
def update_notification(notification_id: int,data: NotificationCreate,db: Session = Depends(get_db)):
    record = db.query(Notification).filter(Notification.id == notification_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Notification not found")
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
@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: int,db: Session = Depends(get_db)):
    record = db.query(Notification).filter(Notification.id == notification_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Notification not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Notification deleted successfully",
            "id": notification_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/vendor-membership-plans")
def create_vendor_membership_plan(data: VendorMembershipPlanCreate,db: Session = Depends(get_db)):
    plan_data = data.model_dump()
    plan_data["is_active"] = yes_no_to_bool(plan_data["is_active"])
    plan = VendorMembershipPlan(**plan_data)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return model_response(plan)
@router.get("/vendor-membership-plans")
def get_vendor_membership_plans(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(VendorMembershipPlan).all()]
@router.get("/vendor-membership-plans/{plan_id}")
def get_vendor_membership_plan(plan_id: int,db: Session = Depends(get_db)):
    plan = db.query(VendorMembershipPlan).filter(VendorMembershipPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404,detail="Vendor plan not found")
    return model_response(plan)
@router.put("/vendor-membership-plans/{plan_id}")
def update_vendor_membership_plan(plan_id: int,data: VendorMembershipPlanCreate,db: Session = Depends(get_db)):
    record = db.query(VendorMembershipPlan).filter(VendorMembershipPlan.id == plan_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="VendorVendorMembershipPlan not found")
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
@router.delete("/vendor-membership-plans/{plan_id}")
def delete_vendor_membership_plan(plan_id: int,db: Session = Depends(get_db)):
    record = db.query(VendorMembershipPlan).filter(VendorMembershipPlan.id == plan_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="VendorVendorMembershipPlan not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "VendorMembershipPlan deleted successfully",
            "id": plan_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/plan-benefits")
def create_plan_benefit(data: PlanBenefitCreate,db: Session = Depends(get_db)):
    plan = db.query(VendorMembershipPlan).filter(VendorMembershipPlan.id == data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404,detail="Vendor plan not found")
    benefit = PlanBenefit(**data.model_dump())
    db.add(benefit)
    db.commit()
    db.refresh(benefit)
    return model_response(benefit)
@router.get("/plan-benefits")
def get_plan_benefits(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(PlanBenefit).all()]
@router.get("/plan-benefits/{benefit_id}")
def get_plan_benefit(benefit_id: int,db: Session = Depends(get_db)):
    benefit = db.query(PlanBenefit).filter(PlanBenefit.id == benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404,detail="Plan benefit not found")
    return model_response(benefit)
@router.put("/plan-benefits/{benefit_id}")
def update_planbenefit(benefit_id: int,data: PlanBenefitCreate,db: Session = Depends(get_db)):
    record = db.query(PlanBenefit).filter(PlanBenefit.id == benefit_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="PlanBenefit not found")
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
@router.delete("/plan-benefits/{benefit_id}")
def delete_planbenefit(benefit_id: int,db: Session = Depends(get_db)):
    record = db.query(PlanBenefit).filter(PlanBenefit.id == benefit_id).first()
    if not record:
        raise HTTPException( status_code=404,detail="PlanBenefit not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "PlanBenefit deleted successfully",
            "id": benefit_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
@router.post("/vendors")
def create_vendor(data: VendorCreate,db: Session = Depends(get_db)):
    plan = db.query(VendorMembershipPlan).filter(
        VendorMembershipPlan.id == data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404,detail="Vendor plan not found")
    vendor = Vendor(**data.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return model_response(vendor)
@router.get("/vendors")
def get_vendors(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Vendor).all()]
@router.get("/vendors/{vendor_id}")
def get_vendor(vendor_id: int,db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404,detail="Vendor not found")
    return model_response(vendor)
@router.put("/vendors/{vendor_id}")
def update_vendor(vendor_id: int,data: VendorCreate,db: Session = Depends(get_db)):
    record = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Vendor not found")
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
        raise HTTPException(status_code=400,detail=str(e) )
@router.delete("/vendors/{vendor_id}")
def delete_vendor(vendor_id: int,db: Session = Depends(get_db)):
    record = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Vendor not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Vendor deleted successfully",
            "id": vendor_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/support-tickets")
def create_support_ticket(data: SupportTicketCreate,db: Session = Depends(get_db)):
    ticket = SupportTicket(**data.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return model_response(ticket)
@router.get("/support-tickets")
def get_support_tickets(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(SupportTicket).all()]
@router.get("/support-tickets/{ticket_id}")
def get_support_ticket(ticket_id: int,db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404,detail="Support ticket not found")
    return model_response(ticket)
@router.put("/support-tickets/{ticket_id}")
def update_supportticket(ticket_id: int,data: SupportTicketCreate,db: Session = Depends(get_db)):
    record = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="SupportTicket not found")
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
@router.delete("/support-tickets/{ticket_id}")
def delete_supportticket(ticket_id: int,db: Session = Depends(get_db)):
    record = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="SupportTicket not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "SupportTicket deleted successfully",
            "id": ticket_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/geocoding-cache")
def create_geocoding_cache(data: GeocodingCacheCreate,db: Session = Depends(get_db)):
    cache = GeocodingCache(**data.model_dump())
    db.add(cache)
    db.commit()
    db.refresh(cache)
    return model_response(cache)
@router.get("/geocoding-cache")
def get_geocoding_cache(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(GeocodingCache).all()]
@router.get("/geocoding-cache/{cache_id}")
def get_geocoding_cache_by_id(cache_id: int,db: Session = Depends(get_db)):
    cache = db.query(GeocodingCache).filter(
        GeocodingCache.id == cache_id).first()
    if not cache:
        raise HTTPException(status_code=404,detail="Geocoding cache not found")
    return model_response(cache)
@router.put("/geocoding-cache/{cache_id}")
def update_geocodingcache(cache_id: int,data: GeocodingCacheCreate,db: Session = Depends(get_db)):
    record = db.query(GeocodingCache).filter(GeocodingCache.id == cache_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="GeocodingCache not found")
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
@router.delete("/geocoding-cache/{cache_id}")
def delete_geocodingcache(cache_id: int,db: Session = Depends(get_db)):
    record = db.query(GeocodingCache).filter(GeocodingCache.id == cache_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="GeocodingCache not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "GeocodingCache deleted successfully",
            "id": cache_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/audit-logs")
def create_audit_log(data: AuditLogCreate,db: Session = Depends(get_db)):
    log = AuditLog(**data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return model_response(log)
@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(AuditLog).all()]
@router.get("/audit-logs/{log_id}")
def get_audit_log(log_id: int,db: Session = Depends(get_db)):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404,detail="Audit log not found")
    return model_response(log)
@router.put("/audit-logs/{log_id}")
def update_auditlog(log_id: int,data: AuditLogCreate,db: Session = Depends(get_db)):
    record = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="AuditLog not found")
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
@router.delete("/audit-logs/{log_id}")
def delete_auditlog(log_id: int,db: Session = Depends(get_db)):
    record = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="AuditLog not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "AuditLog deleted successfully",
            "id": log_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
