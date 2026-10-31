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

@router.post("/pet-parents")
def create_pet_parent(
    data: PetParentCreate,
    db: Session = Depends(get_db)):
    parent = PetParent(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        city=data.city
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)
    return model_response(parent)
@router.get("/pet-parents")
def get_pet_parents(db:Session=Depends(get_db)):
    return [model_response(item) for item in db.query(PetParent).all()]
@router.get("/pet-parents/{parent_id}")
def get_pet_parent(
    parent_id: int,
    db: Session = Depends(get_db)):
    parent = db.query(PetParent).filter(PetParent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404,detail="Pet parent not found")
    return model_response(parent)
@router.put("/pet-parents/{parent_id}")
def update_petparent(parent_id: int,data: PetParentCreate,db: Session = Depends(get_db)):
    record = db.query(PetParent).filter(PetParent.id == parent_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="PetParent not found")
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
@router.delete("/pet-parents/{parent_id}")
def delete_petparent(parent_id: int,db: Session = Depends(get_db)):
    record = db.query(PetParent).filter(PetParent.id == parent_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="PetParent not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "PetParent deleted successfully",
            "id": parent_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/pets")
def create_pet(data: PetCreate,db: Session = Depends(get_db)):
    parent = db.query(PetParent).filter(
        PetParent.id == data.parent_id).first()
    if not parent:
        raise HTTPException(status_code=404,detail="Pet parent not found")
    pet = Pet(
        parent_id=data.parent_id,
        name=data.name,
        species=data.species,
        breed=data.breed,
        gender=data.gender,
        weight_kg=data.weight_kg,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return model_response(pet)
@router.get("/pets")
def get_pets(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Pet).all()]
@router.get("/pets/{pet_id}")
def get_pet(pet_id: int,db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(
        Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(
            status_code=404,
            detail="Pet not found")
    return model_response(pet)
@router.put("/pets/{pet_id}")
def update_pet(pet_id: int,data: PetCreate,db: Session = Depends(get_db)):
    record = db.query(Pet).filter(Pet.id == pet_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Pet not found")
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
@router.delete("/pets/{pet_id}")
def delete_pet(pet_id: int,db: Session = Depends(get_db)):
    record = db.query(Pet).filter(Pet.id == pet_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Pet not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Pet deleted successfully",
            "id": pet_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/medical-records")
def create_medical_record(data: MedicalRecordCreate,db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(
        Pet.id == data.pet_id).first()
    if not pet:
        raise HTTPException(status_code=404,detail="Pet not found")
    record = MedicalRecord(
        pet_id=data.pet_id,
        record_type=data.record_type,
        title=data.title,
        diagnosis=data.diagnosis,
        record_date=data.record_date)
    db.add(record)
    db.commit()
    db.refresh(record)
    return model_response(record)
@router.get("/medical-records")
def get_medical_records(
    db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(MedicalRecord).all()]
@router.get("/medical-records/{medical_record_id}")
def get_medical_record_id(medical_record_id: int, db: Session = Depends(get_db)):
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == medical_record_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Medical record not found")
    return model_response(record)
@router.put("/medical-records/{record_id}")
def update_medicalrecord(record_id: int,data: MedicalRecordCreate,db: Session = Depends(get_db)):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="MedicalRecord not found")
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
@router.delete("/medical-records/{record_id}")
def delete_medicalrecord(
    record_id: int,
    db: Session = Depends(get_db)):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="MedicalRecord not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "MedicalRecord deleted successfully",
            "id": record_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/vaccinations")
def create_vaccination(data:VaccinationCreate,db: Session =Depends(get_db)):
    pet = db.query(Pet).filter(
        Pet.id ==data.pet_id).first()
    if not pet:
        raise HTTPException(
            status_code=404,detail="Pet Not Found")
    vaccination = Vaccination(
        pet_id=data.pet_id,
        vaccine_name=data.vaccine_name,
        administered_on=data.administered_on,
        next_due_on=data.next_due_on,
        batch_number=data.batch_number
    )
    db.add(vaccination)
    db.commit()
    db.refresh(vaccination)
    return model_response(vaccination)
@router.get("/vaccinations")
def get_vaccinations(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Vaccination).all()]
@router.get("/vaccinations/{vaccination_id}")
def get_vaccination_id(vaccination_id: int, db: Session = Depends(get_db)):
    record = db.query(Vaccination).filter(
        Vaccination.id == vaccination_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Vaccination not found")
    return model_response(record)
@router.put("/vaccinations/{vaccination_id}")
def update_vaccination(vaccination_id: int,data: VaccinationCreate,db: Session = Depends(get_db)):
    record = db.query(Vaccination).filter(Vaccination.id == vaccination_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Vaccination not found")
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
@router.delete("/vaccinations/{vaccination_id}")
def delete_vaccination(vaccination_id: int,db: Session = Depends(get_db)):
    record = db.query(Vaccination).filter(Vaccination.id == vaccination_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Vaccination not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Vaccination deleted successfully",
            "id": vaccination_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/addresses")
def create_address(data: AddressCreate,db: Session = Depends(get_db)):
    parent = db.query(PetParent).filter(
        PetParent.id == data.parent_id).first()
    if not parent:
        raise HTTPException(
            status_code=404,detail="Pet parent not found")
    address = Address(
        parent_id=data.parent_id,
        label=data.label,
        contact_name=data.contact_name,
        line1=data.line1,
        city=data.city,
        pincode=data.pincode,
        is_default=data.is_default
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return model_response(address)
@router.get("/addresses")
def get_addresses(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Address).all()]
@router.get("/addresses/{address_id}")
def get_address_id(address_id: int, db: Session = Depends(get_db)):
    record = db.query(Address).filter(Address.id == address_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Address not found")
    return model_response(record)
@router.put("/addresses/{address_id}")
def update_address(address_id: int,data: AddressCreate,db: Session = Depends(get_db)):
    record = db.query(Address).filter(Address.id == address_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Address not found")
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
@router.delete("/addresses/{address_id}")
def delete_address(address_id: int,db: Session = Depends(get_db)):
    record = db.query(Address).filter(Address.id == address_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Address not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Address deleted successfully",
            "id": address_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/user-roles")
def create_user_role(data: UserRoleCreate,db: Session = Depends(get_db)):
    user_role = UserRole(
        user_id=data.user_id,
        role=data.role
        )
    db.add(user_role)
    db.commit()
    db.refresh(user_role)
    return model_response(user_role)
@router.get("/user-roles")
def get_user_roles(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(UserRole).all()]
@router.get("/user-roles/{role_id}")
def get_role_id(role_id: int, db: Session = Depends(get_db)):
    record = db.query(UserRole).filter(
        UserRole.id == role_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="User role not found")
    return model_response(record)
@router.put("/user-roles/{role_id}")
def update_userrole(role_id: int,data: UserRoleCreate,db: Session = Depends(get_db)):
    record = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="UserRole not found")
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
@router.delete("/user-roles/{role_id}")
def delete_userrole(role_id: int,db: Session = Depends(get_db)):
    record = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not record:
        raise HTTPException(
            status_code=404,
            detail="UserRole not found"
        )
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "UserRole deleted successfully",
            "id": role_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
