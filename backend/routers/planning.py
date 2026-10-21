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

@router.post("/monthly-plans")
def create_monthly_plan(data: MonthlyPlanCreate, db: Session = Depends(get_db)):
    plan = MonthlyPlan(**data.model_dump())
    db.add(plan)
    try:
        db.commit()
        db.refresh(plan)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return plan_response(plan)
@router.get("/monthly-plans")
def get_monthly_plans(
    executive_id: Optional[int] = None,
    month_key: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(MonthlyPlan)
    if executive_id is not None:
        q = q.filter(MonthlyPlan.executive_id == executive_id)
    if month_key is not None:
        q = q.filter(MonthlyPlan.month_key == month_key)
    if status is not None:
        q = q.filter(MonthlyPlan.status == status)
    return [plan_response(p) for p in q.all()]
@router.get("/monthly-plans/{plan_id}")
def get_monthly_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    return plan_response(plan)
@router.put("/monthly-plans/{plan_id}")
def update_monthly_plan(plan_id: int, data: MonthlyPlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(plan, field, value)
    try:
        db.commit()
        db.refresh(plan)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return plan_response(plan)
@router.delete("/monthly-plans/{plan_id}")
def delete_monthly_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    db.query(PlanVisit).filter(PlanVisit.plan_id == plan_id).delete()
    db.delete(plan)
    db.commit()
    return {"message": "Monthly plan and visits deleted", "id": plan_id}
@router.post("/monthly-plans/{plan_id}/submit")
def submit_monthly_plan(plan_id: int, db: Session = Depends(get_db)):
    plan: Any = db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    plan.status = "Submitted"
    plan.submitted_at = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
    db.commit()
    db.refresh(plan)
    return plan_response(plan)
def _normalize_approvers(existing_str: Optional[str], new_approver: Optional[str]) -> str:
    if not new_approver:
        return existing_str or "Manager"
    existing_items = [x.strip() for x in (existing_str or "").split(",") if x.strip()]    
    cleaned = []
    has_sales_mgr = any("(Sales Manager)" in x for x in existing_items + [new_approver])
    has_regional_mgr = any("(Regional Manager)" in x for x in existing_items + [new_approver])
    for item in existing_items:
        if (item == "Emily" or item == "Manager") and has_sales_mgr:
            continue
        if (item == "John" or item == "Manager") and has_regional_mgr:
            continue
        if item not in cleaned:
            cleaned.append(item)            
    if new_approver not in cleaned:
        cleaned.append(new_approver)
    return ", ".join(cleaned)
@router.post("/monthly-plans/{plan_id}/approve")
def approve_monthly_plan(plan_id: int,approved_by: Optional[str] = "Manager",db: Session = Depends(get_db),):
    plan: Any = db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    plan.status = "Approved"
    plan.approved_at = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
    plan.approved_by = _normalize_approvers(plan.approved_by, approved_by)
    plan.rejection_reason = None
    db.commit()
    db.refresh(plan)
    return plan_response(plan)
@router.post("/monthly-plans/{plan_id}/reject")
def reject_monthly_plan(plan_id: int, body: RejectBody, db: Session = Depends(get_db)):
    plan: Any = db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    plan.status = "Draft" if body.request_changes else "Rejected"
    plan.rejection_reason = body.reason
    plan.approved_by = None
    plan.approved_at = None
    db.commit()
    db.refresh(plan)
    return plan_response(plan)
@router.post("/plan-visits")
def create_plan_visit(data: PlanVisitCreate, db: Session = Depends(get_db)):
    visit = PlanVisit(**data.model_dump())
    db.add(visit)
    try:
        db.commit()
        db.refresh(visit)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return plan_response(visit)
@router.post("/plan-visits/bulk")
def bulk_create_plan_visits(visits: list[PlanVisitCreate],db: Session = Depends(get_db),):
    objs = [PlanVisit(**v.model_dump()) for v in visits]
    db.bulk_save_objects(objs)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    if visits:
        plan_id = visits[0].plan_id
        exec_id = visits[0].executive_id
        rows = db.query(PlanVisit).filter(PlanVisit.plan_id == plan_id,PlanVisit.executive_id == exec_id,).all()
        return [plan_response(r) for r in rows]
    return []
@router.get("/plan-visits")
def get_plan_visits(
    plan_id: Optional[int] = None,
    executive_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(PlanVisit)
    if plan_id is not None:
        q = q.filter(PlanVisit.plan_id == plan_id)
    if executive_id is not None:
        q = q.filter(PlanVisit.executive_id == executive_id)
    if doctor_id is not None:
        q = q.filter(PlanVisit.doctor_id == doctor_id)
    if status:
        q = q.filter(PlanVisit.status == status)
    return [plan_response(v) for v in q.all()]
@router.get("/plan-visits/{visit_id}")
def get_plan_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(PlanVisit).filter(PlanVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Plan visit not found")
    return plan_response(visit)
@router.put("/plan-visits/{visit_id}")
def update_plan_visit(visit_id: int, data: PlanVisitUpdate, db: Session = Depends(get_db)):
    visit = db.query(PlanVisit).filter(PlanVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Plan visit not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(visit, field, value)
    try:
        db.commit()
        db.refresh(visit)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return plan_response(visit)
@router.delete("/plan-visits/{visit_id}")
def delete_plan_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(PlanVisit).filter(PlanVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Plan visit not found")
    db.delete(visit)
    db.commit()
    return {"message": "Plan visit deleted", "id": visit_id}
@router.post("/visit-reports")
def create_visit_report(data: VisitReportCreate, db: Session = Depends(get_db)):
    report: Any = VisitReport(**data.model_dump())
    if data.status == "Submitted" and not report.submitted_at:
        report.submitted_at = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
    db.add(report)
    try:
        db.commit()
        db.refresh(report)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    if data.status == "Submitted":
        visit = db.query(PlanVisit).filter(PlanVisit.id == data.plan_visit_id).first()
        if visit:
            setattr(visit, "status", "Completed")
            db.commit()
    return plan_response(report)
@router.get("/visit-reports")
def get_visit_reports(
    plan_visit_id: Optional[int] = None,
    executive_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(VisitReport)
    if plan_visit_id is not None:
        q = q.filter(VisitReport.plan_visit_id == plan_visit_id)
    if executive_id is not None:
        q = q.filter(VisitReport.executive_id == executive_id)
    if doctor_id is not None:
        q = q.filter(VisitReport.doctor_id == doctor_id)
    return [plan_response(r) for r in q.all()]
@router.get("/visit-reports/{report_id}")
def get_visit_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(VisitReport).filter(VisitReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Visit report not found")
    return plan_response(report)
@router.put("/visit-reports/{report_id}")
def update_visit_report(report_id: int, data: VisitReportUpdate, db: Session = Depends(get_db)):
    report = db.query(VisitReport).filter(VisitReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Visit report not found")
    updates = data.model_dump(exclude_unset=True)
    if updates.get("status") == "Submitted" and not report.submitted_at:
        updates["submitted_at"] = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
    for field, value in updates.items():
        setattr(report, field, value)
    try:
        db.commit()
        db.refresh(report)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    if updates.get("status") == "Submitted":
        visit = db.query(PlanVisit).filter(PlanVisit.id == report.plan_visit_id).first()
        if visit:
            setattr(visit, "status", "Completed")
            db.commit()
    return plan_response(report)
@router.delete("/visit-reports/{report_id}")
def delete_visit_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(VisitReport).filter(VisitReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Visit report not found")
    db.delete(report)
    db.commit()
    return {"message": "Visit report deleted", "id": report_id}
@router.get("/plan-stats/{executive_id}")
def get_plan_stats(executive_id: int,month_key: Optional[str] = None,db: Session = Depends(get_db),):
    q = db.query(MonthlyPlan).filter(MonthlyPlan.executive_id == executive_id)
    if month_key:
        q = q.filter(MonthlyPlan.month_key == month_key)
    plan = q.order_by(MonthlyPlan.id.desc()).first()
    if not plan:
        return {"has_plan": False, "total_doctors": 0, "completed": 0, "pending": 0, "completion_pct": 0, "plan_status": None}
    visits = db.query(PlanVisit).filter(PlanVisit.plan_id == plan.id).all()
    total = len(visits)
    completed = sum(1 for v in visits if v.status == "Completed")
    pending = total - completed
    pct = round((completed / total * 100)) if total > 0 else 0
    return {
        "has_plan": True,
        "plan_id": plan.id,
        "month_key": plan.month_key,
        "month_label": plan.month_label,
        "total_doctors": plan.total_doctors,
        "working_days": plan.working_days,
        "daily_target": plan.daily_target,
        "planned_visits": total,
        "completed": completed,
        "pending": pending,
        "completion_pct": pct,
        "plan_status": plan.status,
    }
@router.post("/executive-submission-reports")
def create_submission_report(data: ExecutiveSubmissionReportCreate, db: Session = Depends(get_db)):
    report = ExecutiveSubmissionReport(**data.model_dump())
    db.add(report)
    try:
        db.commit()
        db.refresh(report)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return plan_response(report)
@router.get("/executive-submission-reports")
def get_submission_reports(
    executive_id: Optional[int] = None,
    for_role: Optional[str] = None,
    manager_id: Optional[int] = None,
    regional_manager_id: Optional[int] = None,
    report_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    q = db.query(ExecutiveSubmissionReport)
    if executive_id is not None:
        q = q.filter(ExecutiveSubmissionReport.executive_id == executive_id)
    if for_role == "manager":
        q = q.filter(ExecutiveSubmissionReport.recipient_type.in_(["manager", "both"]))
    elif for_role == "regional":
        q = q.filter(ExecutiveSubmissionReport.recipient_type.in_(["regional", "both"]))
    if manager_id is not None:
        q = q.filter(ExecutiveSubmissionReport.manager_id == manager_id)
    if regional_manager_id is not None:
        q = q.filter(ExecutiveSubmissionReport.regional_manager_id == regional_manager_id)
    if report_date is not None:
        q = q.filter(ExecutiveSubmissionReport.report_date == report_date)
    reports = q.order_by(ExecutiveSubmissionReport.id.desc()).all()
    return [plan_response(r) for r in reports]
@router.get("/executive-submission-reports/{report_id}")
def get_submission_report(report_id: int, db: Session = Depends(get_db)):
    r = db.query(ExecutiveSubmissionReport).filter(ExecutiveSubmissionReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Submission report not found")
    return plan_response(r)
@router.put("/executive-submission-reports/{report_id}")
def update_submission_report(report_id: int, data: ExecutiveSubmissionReportUpdate, db: Session = Depends(get_db)):
    r: Any = db.query(ExecutiveSubmissionReport).filter(ExecutiveSubmissionReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Submission report not found")
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(r, k, v)
    r.reviewed_at = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
    db.commit()
    db.refresh(r)
    return plan_response(r)
@router.delete("/executive-submission-reports/{report_id}")
def delete_submission_report(report_id: int, db: Session = Depends(get_db)):
    r = db.query(ExecutiveSubmissionReport).filter(ExecutiveSubmissionReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Submission report not found")
    db.delete(r)
    db.commit()
    return {"message": "Submission report deleted", "id": report_id}
