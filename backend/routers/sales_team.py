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

@router.post("/regional-managers")
def create_regional_manager(data: RegionalManagerCreate,db: Session = Depends(get_db)):
    existing = db.query(RegionalManager).filter(RegionalManager.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400,detail="Regional manager code already exists")
    manager = RegionalManager(
        name=data.name,
        code=data.code,
        phone=data.phone,
        email=data.email,
        password=data.password or "123456",
        region=data.region,
        is_phone_verified=bool(data.is_phone_verified),
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)
    return model_response(manager)
@router.get("/regional-managers")
def get_regional_managers(db: Session = Depends(get_db)):
    managers = db.query(RegionalManager).all()
    return [
        model_response(manager)
        for manager in managers
    ]
@router.get("/regional-managers/{manager_id}")
def get_regional_manager(manager_id: int,db: Session = Depends(get_db)):
    manager = db.query(RegionalManager).filter(RegionalManager.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404,detail="Regional manager not found")
    return model_response(manager)
@router.put("/regional-managers/{manager_id}")
def update_regional_manager(manager_id: int,data: RegionalManagerCreate,db: Session = Depends(get_db)):
    manager: Any = db.query(RegionalManager).filter(RegionalManager.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404,detail="Regional manager not found")
    manager.name = data.name
    manager.code = data.code
    manager.phone = data.phone
    manager.email = data.email
    if data.password:
        manager.password = data.password
    manager.region = data.region
    if hasattr(data, "is_phone_verified") and data.is_phone_verified is not None:
        manager.is_phone_verified = data.is_phone_verified
    manager.is_active = yes_no_to_bool(data.is_active)
    db.commit()
    db.refresh(manager)
    return model_response(manager)
@router.delete("/regional-managers/{manager_id}")
def delete_regional_manager(manager_id: int,db: Session = Depends(get_db)):
    manager = db.query(RegionalManager).filter(RegionalManager.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404,detail="Regional manager not found")
    db.delete(manager)
    db.commit()
    return {
        "message": "Regional manager deleted successfully",
        "id": manager_id
    }
@router.post("/sales-managers")
def create_sales_manager(data: SalesManagerCreate,db: Session = Depends(get_db)):
    existing = db.query(SalesManager).filter(SalesManager.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400,detail="Sales manager code already exists")
    manager = SalesManager(
        name=data.name,
        code=data.code,
        phone=data.phone,
        email=data.email,
        password=data.password or "123456",
        region=data.region,
        is_phone_verified=bool(data.is_phone_verified),
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)
    return model_response(manager)
@router.get("/sales-managers")
def get_sales_managers(db: Session = Depends(get_db)):
    managers = db.query(SalesManager).all()
    return [
        model_response(manager)
        for manager in managers
    ]
@router.get("/sales-managers/{manager_id}")
def get_sales_manager(manager_id: int,db: Session = Depends(get_db)):
    manager = db.query(SalesManager).filter(SalesManager.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404,detail="Sales manager not found")
    return model_response(manager)
@router.put("/sales-managers/{manager_id}")
def update_sales_manager(manager_id: int,data: SalesManagerCreate,db: Session = Depends(get_db)):
    manager: Any = db.query(SalesManager).filter(SalesManager.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404,detail="Sales manager not found")
    manager.name = data.name
    manager.code = data.code
    manager.phone = data.phone
    manager.email = data.email
    if data.password:
        manager.password = data.password
    manager.region = data.region
    if hasattr(data, "is_phone_verified") and data.is_phone_verified is not None:
        manager.is_phone_verified = data.is_phone_verified
    manager.is_active = yes_no_to_bool(data.is_active)
    db.commit()
    db.refresh(manager)
    return model_response(manager)
@router.delete("/sales-managers/{manager_id}")
def delete_sales_manager(manager_id: int,db: Session = Depends(get_db)):
    manager = db.query(SalesManager).filter(SalesManager.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404,detail="Sales manager not found")
    db.delete(manager)
    db.commit()
    return {
        "message": "Sales manager deleted successfully",
        "id": manager_id
    }
@router.post("/sales-executives")
def create_sales_executive(data: SalesExecutiveCreate,db: Session = Depends(get_db)):
    executive = SalesExecutive(
        name=data.name,
        code=data.code,
        phone=data.phone,
        email=data.email,
        password=data.password or "123456",
        region=data.region,
        city=data.city,
        monthly_target=data.monthly_target,
        is_phone_verified=bool(data.is_phone_verified),
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(executive)
    db.commit()
    db.refresh(executive)
    return model_response(executive)
@router.get("/sales-executives")
def get_sales_executives(db: Session = Depends(get_db)):
    return [
        model_response(item)
        for item in db.query(SalesExecutive).all()
    ]

@router.post("/sales-executives/login")
def sales_executive_login(data: SalesExecutiveLoginRequest, db: Session = Depends(get_db)):
    ident = (data.identifier or data.email or data.username or "").strip()
    pw = data.password.strip()

    if not ident:
        raise HTTPException(status_code=400, detail="Identifier (Email, Name, Code, or Phone) is required")

    exec: Any = None
    for item in db.query(SalesExecutive).all():
        if (
            (item.email and item.email.strip().lower() == ident.lower())
            or (item.code and item.code.strip().lower() == ident.lower())
            or (item.phone and str(item.phone).strip() == ident)
            or (item.name and item.name.strip().lower() == ident.lower())
            or (item.email and item.email.split("@")[0].strip().lower() == ident.lower())
        ):
            exec = item
            break

    if not exec:
        raise HTTPException(status_code=404, detail="No sales executive found with that email/identifier")

    if not exec.password or exec.password != pw:
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify the password set on your record.")

    return model_response(exec)

@router.post("/sales-managers/login")
def sales_manager_login(data: ManagerLoginRequest, db: Session = Depends(get_db)):
    ident = (data.identifier or data.email or data.username or "").strip()
    pw = data.password.strip()
    if not ident:
        raise HTTPException(status_code=400, detail="Identifier (Email, Name, Code, or Phone) is required")
    mgr = None
    for item in db.query(SalesManager).all():
        if (
            (item.email and item.email.strip().lower() == ident.lower())
            or (item.code and item.code.strip().lower() == ident.lower())
            or (item.phone and str(item.phone).strip() == ident)
            or (item.name and item.name.strip().lower() == ident.lower())
            or (item.email and item.email.split("@")[0].strip().lower() == ident.lower())
        ):
            mgr = item
            break
    if not mgr:
        raise HTTPException(status_code=404, detail="Sales Manager not found with that email/identifier")

    if not mgr.password or mgr.password != pw:
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify the password set on your record.")

    return model_response(mgr)

@router.post("/regional-managers/login")
def regional_manager_login(data: ManagerLoginRequest, db: Session = Depends(get_db)):
    ident = (data.identifier or data.email or data.username or "").strip()
    pw = data.password.strip()
    if not ident:
        raise HTTPException(status_code=400, detail="Identifier (Email, Name, Code, or Phone) is required")
    reg = None
    for item in db.query(RegionalManager).all():
        if (
            (item.email and item.email.strip().lower() == ident.lower())
            or (item.code and item.code.strip().lower() == ident.lower())
            or (item.phone and str(item.phone).strip() == ident)
            or (item.name and item.name.strip().lower() == ident.lower())
            or (item.email and item.email.split("@")[0].strip().lower() == ident.lower())
        ):
            reg = item
            break
    if not reg:
        raise HTTPException(status_code=404, detail="Regional Manager not found with that email/identifier")

    if not reg.password or reg.password != pw:
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify the password set on your record.")

    return model_response(reg)

@router.get("/sales-executives/{executive_id}")
def get_sales_executive(executive_id: int,db: Session = Depends(get_db)):
    executive = db.query(SalesExecutive).filter(SalesExecutive.id == executive_id).first()
    if not executive:
        raise HTTPException(status_code=404,detail="Sales executive not found")
    return model_response(executive)
@router.put("/sales-executives/{executive_id}")
def update_sales_executive(executive_id: int,data: SalesExecutiveCreate,db: Session = Depends(get_db)):
    executive = db.query(SalesExecutive).filter(SalesExecutive.id == executive_id).first()
    if not executive:
        raise HTTPException( status_code=404, detail="Sales executive not found")
    update_data = data.model_dump(exclude_unset=True)
    if "is_active" in update_data:
        update_data["is_active"] = yes_no_to_bool(
            update_data["is_active"]
        )
    for field, value in update_data.items():
        setattr(executive, field, value)
    db.commit()
    db.refresh(executive)
    return model_response(executive)
@router.delete("/sales-executives/{executive_id}")
def delete_sales_executive(executive_id: int,db: Session = Depends(get_db)):
    executive = db.query(SalesExecutive).filter(SalesExecutive.id == executive_id).first()
    if not executive:
        raise HTTPException(status_code=404,detail="Sales executive not found")
    db.delete(executive)
    db.commit()
    return {
        "message": "Sales executive deleted successfully",
        "id": executive_id
    }
@router.post("/pincode-coverages")
def create_pincode_coverage(data: PincodeCoverageCreate,db: Session = Depends(get_db)):
    executive = db.query(SalesExecutive).filter(SalesExecutive.id == data.executive_id).first()
    if not executive:
        raise HTTPException(status_code=404,detail="Sales executive not found")
    coverage = PincodeCoverage(
        executive_id=data.executive_id,
        pincode=data.pincode,
        city=data.city,
        state=data.state
    )
    db.add(coverage)
    db.commit()
    db.refresh(coverage)
    return model_response(coverage)
@router.get("/pincode-coverages")
def get_pincode_coverages(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(PincodeCoverage).all()]
@router.get("/pincode-coverages/{coverage_id}")
def get_pincode_coverage(coverage_id: int,db: Session = Depends(get_db)):
    coverage = db.query(PincodeCoverage).filter(PincodeCoverage.id == coverage_id).first()
    if not coverage:
        raise HTTPException(status_code=404,detail="Pincode coverage not found")
    return model_response(coverage)
@router.put("/pincode-coverages/{coverage_id}")
def update_pincode_coverage(coverage_id: int,data: PincodeCoverageCreate,db: Session = Depends(get_db)):
    coverage: Any = db.query(PincodeCoverage).filter(PincodeCoverage.id == coverage_id).first()
    if not coverage:
        raise HTTPException(
            status_code=404,
            detail="Pincode coverage not found"
        )
    executive = db.query(SalesExecutive).filter(SalesExecutive.id == data.executive_id).first()
    if not executive:
        raise HTTPException(status_code=404,detail="Sales executive not found")
    coverage.executive_id = data.executive_id
    coverage.pincode = data.pincode
    coverage.city = data.city
    coverage.state = data.state
    db.commit()
    db.refresh(coverage)
    return model_response(coverage)
@router.delete("/pincode-coverages/{coverage_id}")
def delete_pincode_coverage(coverage_id: int,db: Session = Depends(get_db)):
    coverage = db.query(PincodeCoverage).filter(PincodeCoverage.id == coverage_id).first()
    if not coverage:
        raise HTTPException(status_code=404,detail="Pincode coverage not found")
    db.delete(coverage)
    db.commit()
    return {
        "message": "Pincode coverage deleted successfully",
        "id": coverage_id
    }
@router.post("/executive-tasks")
def create_executive_task(data: ExecutiveTaskCreate, db: Session = Depends(get_db)):
    # Normalize roles
    raw_by_role = (data.assigned_by_role or "").lower().strip()
    by_role = "regional" if raw_by_role in ["regional", "regional_manager"] else "manager" if raw_by_role in ["manager", "sales_manager"] else raw_by_role or "regional"
    
    raw_to_role = (data.assigned_to_role or "executive").lower().strip()
    to_role = "manager" if raw_to_role in ["manager", "sales_manager"] else "executive"

    # Role-based assignment permission check
    # Regional manager & Admin can assign to both 'manager' and 'executive'
    # Sales Manager can only assign to 'executive'
    if by_role == "manager" and to_role not in ["executive", "sales_executive"]:
        raise HTTPException(
            status_code=403,
            detail="Sales Managers can only assign tasks to their respective Sales Executives."
        )

    # 1. Resolve and auto-fetch Assigner (Assigned By, Assigner Role, Assigner ID)
    assigned_by_id = data.assigned_by_id
    assigned_by_name = data.assigned_by_name

    if assigned_by_id:
        if by_role == "regional":
            reg = db.query(RegionalManager).filter(RegionalManager.id == assigned_by_id).first()
            if reg:
                assigned_by_name = reg.name
                by_role = "regional"
        elif by_role == "manager":
            sm = db.query(SalesManager).filter(SalesManager.id == assigned_by_id).first()
            if sm:
                assigned_by_name = sm.name
                by_role = "manager"
    
    # If name provided but not ID, resolve from DB
    if assigned_by_name and not assigned_by_id:
        reg = db.query(RegionalManager).filter(RegionalManager.name.ilike(f"%{assigned_by_name}%")).first()
        if reg:
            assigned_by_id = reg.id
            assigned_by_name = reg.name
            by_role = "regional"
        else:
            sm = db.query(SalesManager).filter(SalesManager.name.ilike(f"%{assigned_by_name}%")).first()
            if sm:
                assigned_by_id = sm.id
                assigned_by_name = sm.name
                by_role = "manager"

    # Fallback auto-fetch if assigner is still unresolved
    if not assigned_by_id or not assigned_by_name:
        if by_role == "regional":
            first_rm = db.query(RegionalManager).first()
            if first_rm:
                assigned_by_id = first_rm.id
                assigned_by_name = first_rm.name
            else:
                assigned_by_id = 1
                assigned_by_name = "Regional Manager"
        elif by_role == "manager":
            first_sm = db.query(SalesManager).first()
            if first_sm:
                assigned_by_id = first_sm.id
                assigned_by_name = first_sm.name
            else:
                assigned_by_id = 1
                assigned_by_name = "Sales Manager"
        else:
            assigned_by_id = 1
            assigned_by_name = "Admin"
            by_role = "admin"

    # 2. Resolve and auto-fetch Assignee (Assigned To, Assignee Role, Assignee ID, Region, Pincode)
    assigned_to_id = data.assigned_to_id
    assigned_to_name = data.assigned_to_name
    task_region = data.region
    task_pincode = (data.pincode or "").strip()

    if to_role == "manager":
        sm = None
        if assigned_to_id:
            sm = db.query(SalesManager).filter(SalesManager.id == assigned_to_id).first()
        elif assigned_to_name:
            sm = db.query(SalesManager).filter(SalesManager.name.ilike(f"%{assigned_to_name}%")).first()
        if sm:
            assigned_to_id = sm.id
            assigned_to_name = sm.name
            if not task_region:
                task_region = sm.region
    else:
        to_role = "executive"
        se = None
        if assigned_to_id:
            se = db.query(SalesExecutive).filter(SalesExecutive.id == assigned_to_id).first()
        elif assigned_to_name:
            se = db.query(SalesExecutive).filter(SalesExecutive.name.ilike(f"%{assigned_to_name}%")).first()
            if not se:
                # Check if name was actually a manager
                sm = db.query(SalesManager).filter(SalesManager.name.ilike(f"%{assigned_to_name}%")).first()
                if sm:
                    to_role = "manager"
                    assigned_to_id = sm.id
                    assigned_to_name = sm.name
                    if not task_region:
                        task_region = sm.region
        if se:
            assigned_to_id = se.id
            assigned_to_name = se.name
            if not task_region:
                task_region = se.region
            # Auto-fetch territory pincode if none provided
            if not task_pincode:
                cov = db.query(PincodeCoverage).filter(PincodeCoverage.executive_id == se.id).first()
                if cov and cov.pincode:
                    task_pincode = cov.pincode

    kolkata_now = datetime.now(KOLKATA_TZ).replace(tzinfo=None)
    task = ExecutiveTask(
        title=data.title,
        description=data.description,
        task_type=data.task_type or "General",
        entity_type=data.entity_type,
        pincode=task_pincode or None,
        priority=data.priority or "Medium",
        status=data.status or "pending",
        due_date=data.due_date,
        assigned_by_id=assigned_by_id,
        assigned_by_role=by_role,
        assigned_by_name=assigned_by_name,
        assigned_to_role=to_role,
        assigned_to_id=assigned_to_id,
        assigned_to_name=assigned_to_name,
        region=task_region,
        target_entity_name=data.target_entity_name,
        target_entity_id=data.target_entity_id,
        progress=data.progress or 0,
        remarks=data.remarks,
        created_at=kolkata_now,
        updated_at=kolkata_now,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Auto-store assigned pincode into Pin code coverage
    try:
        clean_pincode = (data.pincode or "").strip()
        if clean_pincode and data.assigned_to_id and to_role == "executive":
            existing_cov = db.query(PincodeCoverage).filter(
                PincodeCoverage.executive_id == data.assigned_to_id,
                PincodeCoverage.pincode == clean_pincode
            ).first()
            if not existing_cov:
                se_record = db.query(SalesExecutive).filter(SalesExecutive.id == data.assigned_to_id).first()
                new_cov = PincodeCoverage(
                    executive_id=data.assigned_to_id,
                    pincode=clean_pincode,
                    city=se_record.city if se_record and se_record.city else (task_region or "Bangalore"),
                    state=se_record.region if se_record and se_record.region else "Karnataka",
                    created_at=kolkata_now
                )
                db.add(new_cov)
                db.commit()
    except Exception as ex_cov:
        print(f"[Pincode Coverage] Auto-store notice: {ex_cov}")

    # Auto-generate task alert for the assignee
    try:
        due_str = data.due_date.strftime("%d %b %Y") if data.due_date else "soon"
        alert_severity = "urgent" if (data.priority or "").lower() == "urgent" else "warning" if (data.priority or "").lower() == "high" else "info"
        alert = ExecutiveAlert(
            title=f"New Task Assigned: {data.title}",
            message=f"Assigned by {assigned_by_name} ({by_role.capitalize() or 'Manager'}). Priority: {data.priority or 'Medium'}. Due date: {due_str}.",
            severity=alert_severity,
            alert_type="new_task",
            entity_type=data.entity_type,
            pincode=data.pincode,
            executive_id=data.assigned_to_id if to_role == "executive" else None,
            task_id=task.id,
            is_read=False,
            created_at=kolkata_now,
        )
        db.add(alert)
        db.commit()
    except Exception as ex:
        print(f"[Task Alert] Notice: Could not generate alert: {ex}")

    db.refresh(task)
    resp = model_response(task)
    return resp

@router.get("/executive-tasks")
def get_executive_tasks(
    role: Optional[str] = None,
    user_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    assigned_to_role: Optional[str] = None,
    assigned_by_id: Optional[int] = None,
    assigned_by_role: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ExecutiveTask)

    today = datetime.now(KOLKATA_TZ).date()

    # Dynamic role-based filtering
    user_role = (role or "").lower().strip()
    if user_role in ["executive", "sales_executive"]:
        target_exec_id = user_id or assigned_to_id
        if target_exec_id:
            query = query.filter(
                ExecutiveTask.assigned_to_role == "executive",
                ExecutiveTask.assigned_to_id == target_exec_id
            )
    elif user_role in ["manager", "sales_manager"]:
        target_mgr_id = user_id or assigned_by_id
        # Managers can see: tasks assigned to them OR tasks assigned by them OR tasks for their region
        if target_mgr_id:
            sm = db.query(SalesManager).filter(SalesManager.id == target_mgr_id).first()
            mgr_region = sm.region if sm else region
            query = query.filter(
                (ExecutiveTask.assigned_to_role == "manager") & (ExecutiveTask.assigned_to_id == target_mgr_id) |
                (ExecutiveTask.assigned_by_id == target_mgr_id) |
                (ExecutiveTask.region == mgr_region)
            )
    elif user_role in ["regional", "regional_manager"]:
        target_reg_id = user_id or assigned_by_id
        if target_reg_id:
            rm = db.query(RegionalManager).filter(RegionalManager.id == target_reg_id).first()
            if rm and rm.region and "all" not in rm.region.lower() and "region" not in rm.region.lower():
                query = query.filter(
                    (ExecutiveTask.assigned_by_id == target_reg_id) |
                    (ExecutiveTask.assigned_by_role.in_(["regional", "regional_manager"])) |
                    (ExecutiveTask.region.ilike(f"%{rm.region}%"))
                )
            else:
                query = query.filter(
                    (ExecutiveTask.assigned_by_id == target_reg_id) |
                    (ExecutiveTask.assigned_by_role.in_(["regional", "regional_manager"])) |
                    (ExecutiveTask.assigned_to_role.in_(["manager", "executive"]))
                )
        else:
            # If no target_reg_id passed for regional role, show all regional tasks or team tasks
            query = query.filter(
                (ExecutiveTask.assigned_by_role.in_(["regional", "regional_manager"])) |
                (ExecutiveTask.assigned_to_role.in_(["manager", "executive"]))
            )

    if assigned_to_id and not user_role:
        query = query.filter(ExecutiveTask.assigned_to_id == assigned_to_id)
    if assigned_to_role and not user_role:
        query = query.filter(ExecutiveTask.assigned_to_role == assigned_to_role)
    if assigned_by_id and not user_role:
        query = query.filter(ExecutiveTask.assigned_by_id == assigned_by_id)
    if assigned_by_role:
        query = query.filter(ExecutiveTask.assigned_by_role == assigned_by_role)
    if status:
        if status.lower() == "overdue":
            query = query.filter(
                ExecutiveTask.due_date < today,
                ~ExecutiveTask.status.in_(["completed", "done", "closed", "cancelled"])
            )
        else:
            query = query.filter(ExecutiveTask.status.ilike(status))
    if priority:
        query = query.filter(ExecutiveTask.priority.ilike(priority))
    if region:
        query = query.filter(ExecutiveTask.region.ilike(f"%{region}%"))

    tasks = query.order_by(ExecutiveTask.id.desc()).all()

    result = []
    for item in tasks:
        r = model_response(item)
        # Compute overdue status dynamically
        is_done = str(item.status or "").lower() in ["completed", "done", "closed", "cancelled"]
        is_overdue = False
        overdue_days = 0
        if item.due_date and not is_done:
            if item.due_date < today:
                is_overdue = True
                overdue_days = (today - item.due_date).days
        r["is_overdue"] = is_overdue
        r["overdue_days"] = overdue_days
        result.append(r)

    return result

@router.get("/executive-tasks/{task_id}")
def get_executive_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(ExecutiveTask).filter(ExecutiveTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Executive task not found")
    r = model_response(task)
    today = datetime.now(KOLKATA_TZ).date()
    is_done = str(task.status or "").lower() in ["completed", "done", "closed", "cancelled"]
    r["is_overdue"] = bool(task.due_date and task.due_date < today and not is_done)
    return r

@router.put("/executive-tasks/{task_id}")
def update_executive_task(task_id: int, data: ExecutiveTaskUpdate, db: Session = Depends(get_db)):
    task = db.query(ExecutiveTask).filter(ExecutiveTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Executive task not found")

    update_data = data.model_dump(exclude_unset=True)
    kolkata_now = datetime.now(KOLKATA_TZ).replace(tzinfo=None)

    # Handle completion status updates
    if "status" in update_data and update_data["status"]:
        new_status = str(update_data["status"]).lower()
        if new_status in ["completed", "done", "closed"]:
            update_data["progress"] = 100
            if not task.completed_at:
                update_data["completed_at"] = kolkata_now
        elif str(task.status or "").lower() in ["completed", "done", "closed"]:
            update_data["completed_at"] = None

    if "progress" in update_data and update_data["progress"] is not None:
        if update_data["progress"] >= 100:
            update_data["status"] = "completed"
            if not task.completed_at:
                update_data["completed_at"] = kolkata_now

    update_data["updated_at"] = kolkata_now

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return model_response(task)

@router.delete("/executive-tasks/{task_id}")
def delete_executive_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(ExecutiveTask).filter(ExecutiveTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Executive task not found")
    db.delete(task)
    db.commit()
    return {"message": "Executive task deleted successfully", "id": task_id}

@router.get("/tasks/analytics")
def get_task_analytics(
    role: Optional[str] = None,
    user_id: Optional[int] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns complete task analytics, KPI summary numbers, status/priority breakdowns,
    and individual employee performance metrics dynamically filtered by user role.
    """
    today = datetime.now(KOLKATA_TZ).date()

    tasks_q = db.query(ExecutiveTask)
    execs_q = db.query(SalesExecutive)
    mgrs_q = db.query(SalesManager)

    user_role = (role or "").lower().strip()
    if user_role in ["executive", "sales_executive"] and user_id:
        tasks_q = tasks_q.filter(
            ExecutiveTask.assigned_to_role == "executive",
            ExecutiveTask.assigned_to_id == user_id
        )
        execs_q = execs_q.filter(SalesExecutive.id == user_id)
        mgrs_q = mgrs_q.filter(SalesManager.id == -1) # empty
    elif user_role in ["manager", "sales_manager"] and user_id:
        sm = db.query(SalesManager).filter(SalesManager.id == user_id).first()
        target_region = sm.region if sm else region
        tasks_q = tasks_q.filter(
            (ExecutiveTask.assigned_to_role == "manager") & (ExecutiveTask.assigned_to_id == user_id) |
            (ExecutiveTask.assigned_by_id == user_id) |
            (ExecutiveTask.region == target_region)
        )
        if target_region:
            execs_q = execs_q.filter(SalesExecutive.region == target_region)
        mgrs_q = mgrs_q.filter(SalesManager.id == -1)
    elif user_role in ["regional", "regional_manager"] and user_id:
        rm = db.query(RegionalManager).filter(RegionalManager.id == user_id).first()
        target_reg = region or (rm.region if rm else None)
        if target_reg and "all" not in target_reg.lower() and "region" not in target_reg.lower():
            tasks_q = tasks_q.filter(
                (ExecutiveTask.assigned_by_id == user_id) |
                (ExecutiveTask.region.ilike(f"%{target_reg}%"))
            )
            execs_q = execs_q.filter(SalesExecutive.region.ilike(f"%{target_reg}%"))
            mgrs_q = mgrs_q.filter(SalesManager.region.ilike(f"%{target_reg}%"))

    tasks = tasks_q.all()
    all_execs = execs_q.all()
    all_mgrs = mgrs_q.all()

    total_tasks = len(tasks)
    completed_tasks = 0
    in_progress_tasks = 0
    pending_tasks = 0
    overdue_tasks = 0

    priority_breakdown = {"Urgent": 0, "High": 0, "Medium": 0, "Low": 0}
    status_breakdown = {"Completed": 0, "In Progress": 0, "Pending": 0, "Overdue": 0}
    role_breakdown = {"Sales Managers": 0, "Sales Executives": 0}

    for t in tasks:
        s = str(t.status or "").lower()
        is_done = s in ["completed", "done", "closed"]
        is_prog = s in ["in progress", "in_progress", "active"]
        is_overdue = bool(t.due_date and t.due_date < today and not is_done)

        if is_done:
            completed_tasks += 1
            status_breakdown["Completed"] += 1
        elif is_overdue:
            overdue_tasks += 1
            status_breakdown["Overdue"] += 1
        elif is_prog:
            in_progress_tasks += 1
            status_breakdown["In Progress"] += 1
        else:
            pending_tasks += 1
            status_breakdown["Pending"] += 1

        p = str(t.priority or "Medium").capitalize()
        if p in priority_breakdown:
            priority_breakdown[p] += 1
        else:
            priority_breakdown["Medium"] += 1

        if str(t.assigned_to_role or "").lower() in ["manager", "sales_manager"]:
            role_breakdown["Sales Managers"] += 1
        else:
            role_breakdown["Sales Executives"] += 1

    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    # Compute employee performance table
    employee_performance = []

    # Process Sales Executives
    for se in all_execs:
        se_tasks = [t for t in tasks if t.assigned_to_role == "executive" and t.assigned_to_id == se.id]
        total_assigned = len(se_tasks)
        done_cnt = sum(1 for t in se_tasks if str(t.status or "").lower() in ["completed", "done", "closed"])
        overdue_cnt = sum(1 for t in se_tasks if t.due_date and t.due_date < today and str(t.status or "").lower() not in ["completed", "done", "closed"])
        prog_cnt = sum(1 for t in se_tasks if str(t.status or "").lower() in ["in progress", "in_progress", "active"])
        pend_cnt = max(0, total_assigned - done_cnt - prog_cnt)
        pct = round((done_cnt / total_assigned * 100), 1) if total_assigned > 0 else 0.0

        if total_assigned == 0:
            badge = "No Tasks"
            score = 70
        elif pct >= 80 and overdue_cnt == 0:
            badge = "Top Performer"
            score = 95
        elif pct >= 50 or overdue_cnt <= 1:
            badge = "On Track"
            score = 75
        elif pct < 50 and overdue_cnt > 0:
            badge = "Needs Attention"
            score = 45
        else:
            badge = "At Risk"
            score = 30

        employee_performance.append({
            "id": se.id,
            "name": se.name,
            "code": se.code,
            "role": "Sales Executive",
            "role_key": "executive",
            "region": se.region or "—",
            "total_assigned": total_assigned,
            "assigned_tasks": total_assigned,
            "completed": done_cnt,
            "completed_tasks": done_cnt,
            "in_progress": prog_cnt,
            "in_progress_tasks": prog_cnt,
            "pending": pend_cnt,
            "pending_tasks": pend_cnt,
            "overdue": overdue_cnt,
            "overdue_tasks": overdue_cnt,
            "completion_rate": pct,
            "performance_score": score,
            "performance_badge": badge,
        })

    # Process Sales Managers
    for sm in all_mgrs:
        sm_tasks = [t for t in tasks if t.assigned_to_role == "manager" and t.assigned_to_id == sm.id]
        total_assigned = len(sm_tasks)
        done_cnt = sum(1 for t in sm_tasks if str(t.status or "").lower() in ["completed", "done", "closed"])
        overdue_cnt = sum(1 for t in sm_tasks if t.due_date and t.due_date < today and str(t.status or "").lower() not in ["completed", "done", "closed"])
        prog_cnt = sum(1 for t in sm_tasks if str(t.status or "").lower() in ["in progress", "in_progress", "active"])
        pend_cnt = max(0, total_assigned - done_cnt - prog_cnt)
        pct = round((done_cnt / total_assigned * 100), 1) if total_assigned > 0 else 0.0

        badge = "Top Performer" if pct >= 80 else "On Track" if pct >= 50 else "Needs Attention" if total_assigned > 0 else "Active Manager"

        employee_performance.append({
            "id": sm.id,
            "name": sm.name,
            "code": sm.code,
            "role": "Sales Manager",
            "role_key": "manager",
            "region": sm.region or "—",
            "total_assigned": total_assigned,
            "assigned_tasks": total_assigned,
            "completed": done_cnt,
            "completed_tasks": done_cnt,
            "in_progress": prog_cnt,
            "in_progress_tasks": prog_cnt,
            "pending": pend_cnt,
            "pending_tasks": pend_cnt,
            "overdue": overdue_cnt,
            "overdue_tasks": overdue_cnt,
            "completion_rate": pct,
            "performance_score": 85 if pct >= 50 else 60,
            "performance_badge": badge,
        })

    # Sort performers by completion rate and assigned tasks
    employee_performance.sort(key=lambda x: (x["completion_rate"], x["assigned_tasks"]), reverse=True)

    return {
        "total_assigned": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "overdue_tasks": overdue_tasks,
        "completion_rate": completion_rate,
        "priority_breakdown": priority_breakdown,
        "status_breakdown": status_breakdown,
        "role_breakdown": role_breakdown,
        "employee_performance": employee_performance,
    }

@router.get("/tasks/executive-summary/{executive_id}")
def get_executive_summary(executive_id: int, db: Session = Depends(get_db)):
    """
    Returns specific task summary, upcoming deadlines, alerts, overdue notifications,
    and progress metrics for the Sales Executive Dashboard.
    """
    today = datetime.now(KOLKATA_TZ).date()
    in_7_days = today + timedelta(days=7)

    tasks = db.query(ExecutiveTask).filter(
        ExecutiveTask.assigned_to_role == "executive",
        ExecutiveTask.assigned_to_id == executive_id
    ).order_by(ExecutiveTask.due_date.asc(), ExecutiveTask.id.desc()).all()

    total = len(tasks)
    completed_list = []
    in_progress_list = []
    pending_list = []
    overdue_list = []
    upcoming_deadlines = []

    for t in tasks:
        r = model_response(t)
        s = str(t.status or "").lower()
        is_done = s in ["completed", "done", "closed"]
        is_overdue = bool(t.due_date and t.due_date < today and not is_done)

        r["is_overdue"] = is_overdue
        if is_overdue:
            r["overdue_days"] = (today - t.due_date).days
            overdue_list.append(r)
        elif is_done:
            completed_list.append(r)
        elif s in ["in progress", "in_progress", "active"]:
            in_progress_list.append(r)
        else:
            pending_list.append(r)

        # Upcoming deadlines within next 7 days
        if t.due_date and not is_done:
            if today <= t.due_date <= in_7_days:
                diff = (t.due_date - today).days
                due_label = "Due Today" if diff == 0 else "Due Tomorrow" if diff == 1 else f"In {diff} days"
                upcoming_deadlines.append({
                    "id": t.id,
                    "title": t.title,
                    "due_date": t.due_date.isoformat(),
                    "due_label": due_label,
                    "priority": t.priority or "Medium",
                    "status": t.status,
                    "assigned_by_name": t.assigned_by_name,
                    "target_entity_name": t.target_entity_name,
                })

    # Fetch alerts for this executive
    raw_alerts = db.query(ExecutiveAlert).filter(
        (ExecutiveAlert.executive_id == executive_id) | (ExecutiveAlert.executive_id.is_(None))
    ).order_by(ExecutiveAlert.id.desc()).limit(15).all()

    alerts_list = [model_response(a) for a in raw_alerts]

    # Prepend active overdue alert if overdue tasks exist
    if overdue_list:
        alerts_list.insert(0, {
            "id": -99,
            "title": f"Action Required: {len(overdue_list)} Overdue Task{'s' if len(overdue_list) > 1 else ''}",
            "message": f"You have {len(overdue_list)} task(s) past their deadline. Please complete and submit remarks immediately.",
            "severity": "urgent",
            "alert_type": "overdue",
            "is_read": False,
            "created_at": datetime.now(KOLKATA_TZ).isoformat(),
        })

    completion_percentage = round((len(completed_list) / total * 100)) if total > 0 else 0

    se = db.query(SalesExecutive).filter(SalesExecutive.id == executive_id).first()
    executive_name = se.name if se else f"Executive #{executive_id}"

    progress_summary = {
        "total": total,
        "completed": len(completed_list),
        "in_progress": len(in_progress_list),
        "pending": len(pending_list),
        "overdue": len(overdue_list),
        "completion_percentage": completion_percentage,
    }

    return {
        "executive_name": executive_name,
        "assigned_tasks": [model_response(t) for t in tasks],
        "upcoming_deadlines": upcoming_deadlines,
        "overdue_tasks": overdue_list,
        "overdue_count": len(overdue_list),
        "alerts": alerts_list,
        "progress": progress_summary,
        "summary": progress_summary,
    }

@router.post("/executive-alerts")
def create_executive_alert(data: ExecutiveAlertCreate, db: Session = Depends(get_db)):
    kolkata_now = datetime.now(KOLKATA_TZ).replace(tzinfo=None)
    alert = ExecutiveAlert(
        title=data.title,
        message=data.message,
        severity=data.severity or "info",
        alert_type=data.alert_type or "task",
        entity_type=data.entity_type,
        pincode=data.pincode,
        executive_id=data.executive_id,
        task_id=data.task_id,
        is_read=data.is_read,
        created_at=kolkata_now,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return model_response(alert)

@router.get("/executive-alerts")
def get_executive_alerts(executive_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ExecutiveAlert)
    if executive_id:
        query = query.filter((ExecutiveAlert.executive_id == executive_id) | (ExecutiveAlert.executive_id.is_(None)))
    return [model_response(item) for item in query.order_by(ExecutiveAlert.id.desc()).all()]

@router.get("/executive-alerts/{alert_id}")
def get_executive_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(ExecutiveAlert).filter(ExecutiveAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Executive alert not found")
    return model_response(alert)

@router.put("/executive-alerts/{alert_id}")
def update_executive_alert(
    alert_id: int,
    data: Optional[ExecutiveAlertCreate] = None,
    is_read: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    alert = db.query(ExecutiveAlert).filter(ExecutiveAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Executive alert not found")
    if data:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(alert, field, value)
    if is_read is not None:
        alert.is_read = is_read
    db.commit()
    db.refresh(alert)
    return model_response(alert)

@router.delete("/executive-alerts/{alert_id}")
def delete_executive_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(ExecutiveAlert).filter(ExecutiveAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Executive alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Executive alert deleted successfully", "id": alert_id}

# --- Regional Managers ---
@router.post("/regional-managers")
def create_regional_manager(data: RegionalManagerCreate, db: Session = Depends(get_db)):
    record = RegionalManager(
        name=data.name, code=data.code, phone=data.phone, email=data.email, password=data.password, region=data.region, is_active=yes_no_to_bool(data.is_active)
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return model_response(record)

@router.get("/regional-managers")
def get_regional_managers(db: Session = Depends(get_db)):
    return [model_response(r) for r in db.query(RegionalManager).all()]

@router.get("/regional-managers/{id}")
def get_regional_manager(id: int, db: Session = Depends(get_db)):
    record = db.query(RegionalManager).filter(RegionalManager.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    return model_response(record)

@router.put("/regional-managers/{id}")
def update_regional_manager(id: int, data: RegionalManagerCreate, db: Session = Depends(get_db)):
    record = db.query(RegionalManager).filter(RegionalManager.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    update_data = data.model_dump(exclude_unset=True)
    if "is_active" in update_data: update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
    for k, v in update_data.items(): setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return model_response(record)

@router.delete("/regional-managers/{id}")
def delete_regional_manager(id: int, db: Session = Depends(get_db)):
    record = db.query(RegionalManager).filter(RegionalManager.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted", "id": id}

# --- Sales Managers ---
@router.post("/sales-managers")
def create_sales_manager(data: SalesManagerCreate, db: Session = Depends(get_db)):
    record = SalesManager(
        name=data.name, code=data.code, phone=data.phone, email=data.email, password=data.password, region=data.region, is_active=yes_no_to_bool(data.is_active)
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return model_response(record)

@router.get("/sales-managers")
def get_sales_managers(db: Session = Depends(get_db)):
    return [model_response(r) for r in db.query(SalesManager).all()]

@router.get("/sales-managers/{id}")
def get_sales_manager(id: int, db: Session = Depends(get_db)):
    record = db.query(SalesManager).filter(SalesManager.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    return model_response(record)

@router.put("/sales-managers/{id}")
def update_sales_manager(id: int, data: SalesManagerCreate, db: Session = Depends(get_db)):
    record = db.query(SalesManager).filter(SalesManager.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    update_data = data.model_dump(exclude_unset=True)
    if "is_active" in update_data: update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
    for k, v in update_data.items(): setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return model_response(record)

@router.delete("/sales-managers/{id}")
def delete_sales_manager(id: int, db: Session = Depends(get_db)):
    record = db.query(SalesManager).filter(SalesManager.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted", "id": id}

# --- Sales Executives ---
@router.post("/sales-executives")
def create_sales_exec(data: SalesExecutiveCreate, db: Session = Depends(get_db)):
    record = SalesExecutive(
        name=data.name, code=data.code, phone=data.phone, email=data.email, password=data.password, region=data.region, city=data.city, monthly_target=data.monthly_target, is_active=yes_no_to_bool(data.is_active)
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return model_response(record)

@router.get("/sales-executives")
def get_sales_execs(db: Session = Depends(get_db)):
    return [model_response(r) for r in db.query(SalesExecutive).all()]

@router.get("/sales-executives/{id}")
def get_sales_exec(id: int, db: Session = Depends(get_db)):
    record = db.query(SalesExecutive).filter(SalesExecutive.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    return model_response(record)

@router.put("/sales-executives/{id}")
def update_sales_exec(id: int, data: SalesExecutiveCreate, db: Session = Depends(get_db)):
    record = db.query(SalesExecutive).filter(SalesExecutive.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    update_data = data.model_dump(exclude_unset=True)
    if "is_active" in update_data: update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
    for k, v in update_data.items(): setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return model_response(record)

@router.delete("/sales-executives/{id}")
def delete_sales_exec(id: int, db: Session = Depends(get_db)):
    record = db.query(SalesExecutive).filter(SalesExecutive.id == id).first()
    if not record: raise HTTPException(404, "Not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted", "id": id}

@router.post("/sales-login")
def sales_login(data: SalesLoginRequest, db: Session = Depends(get_db)):
    exec = db.query(SalesExecutive).filter(SalesExecutive.email == data.email, SalesExecutive.password == data.password).first()
    if exec: return {"role": "executive", "user": model_response(exec)}
    
    mgr = db.query(SalesManager).filter(SalesManager.email == data.email, SalesManager.password == data.password).first()
    if mgr: return {"role": "manager", "user": model_response(mgr)}

    reg = db.query(RegionalManager).filter(RegionalManager.email == data.email, RegionalManager.password == data.password).first()
    if reg: return {"role": "regional", "user": model_response(reg)}

    raise HTTPException(status_code=401, detail="Invalid email or password")
