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

@router.post("/service-providers")
def create_service_provider(data: ServiceProviderCreate,db: Session = Depends(get_db)):
    provider = ServiceProvider(
        name=data.name,
        provider_type=data.provider_type,
        phone=data.phone,
        verification_status=data.verification_status,
        rating=data.rating,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return model_response(provider)
@router.get("/service-providers")
def get_service_providers(db:Session = Depends(get_db)):
    return [model_response(item) for item in db.query(ServiceProvider).all()]
@router.get("/service-providers/{provider_id}")
def get_service_provider(provider_id:int , db:Session = Depends(get_db)):
    provider = db.query(ServiceProvider).filter(
        ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404 , detail="Provider Not Found")
    return model_response(provider)
@router.put("/service-providers/{provider_id}")
def update_serviceprovider(provider_id: int,data: ServiceProviderCreate,db: Session = Depends(get_db)):
    record = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="ServiceProvider not found")
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
@router.delete("/service-providers/{provider_id}")
def delete_serviceprovider(provider_id: int,db: Session = Depends(get_db)):
    record = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="ServiceProvider not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "ServiceProvider deleted successfully",
            "id": provider_id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/services")
def create_service(data: ServiceCreate, db: Session = Depends(get_db)):
    service = Service(
        title=data.title,
        service_type=data.service_type,
        price=data.price,
        duration_minutes=data.duration_minutes,
        home_service=data.home_service,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return model_response(service)
@router.get("/services")
def get_services(db:Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Service).all()]
@router.get("/services/{service_id}")
def get_service_id(service_id: int, db: Session = Depends(get_db)):
    record = db.query(Service).filter(Service.id == service_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Service not found")
    return model_response(record)
@router.put("/services/{service_id}")
def update_service(service_id: int,data: ServiceCreate,db: Session = Depends(get_db)):
    record = db.query(Service).filter(Service.id == service_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Service not found")
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
@router.delete("/services/{service_id}")
def delete_service(service_id: int,db: Session = Depends(get_db)):
    record = db.query(Service).filter(Service.id == service_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Service not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Service deleted successfully",
            "id": service_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/service-bookings")
def create_service_booking(data: ServiceBookingCreate,db: Session = Depends(get_db)):
    try:
        service = db.query(Service).filter(
            Service.id == data.service_id).first()
        if not service:
            raise HTTPException(status_code=404,detail="Service not found")
        provider = db.query(ServiceProvider).filter(
            ServiceProvider.id == data.provider_id).first()
        if not provider:
            raise HTTPException(status_code=404,detail="Service provider not found")
        pet = db.query(Pet).filter(Pet.id == data.pet_id).first()
        if not pet:
            raise HTTPException(status_code=404,detail="Pet not found")
        booking = ServiceBooking(
            service_id=data.service_id,
            provider_id=data.provider_id,
            pet_id=data.pet_id,
            booking_date=data.booking_date,
            booking_time=data.booking_time,
            price=data.price,
            status=data.status,
            payment_status=data.payment_status
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return model_response(booking)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("ERROR:", str(e))
        raise HTTPException(status_code=500,detail=str(e))
@router.get("/service-bookings")
def get_service_bookings(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(ServiceBooking).all()]
@router.get("/service-bookings/{booking_id}")
def get_service_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(ServiceBooking).filter(
        ServiceBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Service booking not found")
    return model_response(booking)
@router.put("/service-bookings/{booking_id}")
def update_servicebooking(booking_id: int,data: ServiceBookingCreate,db: Session = Depends(get_db)):
    record = db.query(ServiceBooking).filter(ServiceBooking.id == booking_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="ServiceBooking not found")
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
@router.delete("/service-bookings/{booking_id}")
def delete_servicebooking(booking_id: int,db: Session = Depends(get_db)):
    record = db.query(ServiceBooking).filter(ServiceBooking.id == booking_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="ServiceBooking not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "ServiceBooking deleted successfully",
            "id": booking_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
