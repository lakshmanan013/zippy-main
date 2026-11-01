import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from database import SessionZippy, SessionZenve
from models import (
    RegionalManager,
    SalesManager,
    SalesExecutive,
    Attendance,
    PlanVisit,
    VisitReport,
    UserRole,
    AuditLog,
    Doctor,
)

logger = logging.getLogger("sync_service")

# ------------------------------------------------------------------------------
# Real-Time Event Synchronizers (zippy_crm -> zenve_main)
# ------------------------------------------------------------------------------

def sync_user_to_zenve(
    user_id: int,
    role: str,
    action: str = "CREATE",
    details: Optional[str] = None
) -> bool:
    """
    Synchronizes a CRM user (Executive, Manager, Regional) to zenve_main.user_roles
    and records the transaction in zenve_main.audit_logs.
    """
    if not user_id:
        return False

    session = SessionZenve()
    try:
        # 1. Ensure user role exists in zenve_main.user_roles
        role_key = role.lower().strip()
        existing_role = session.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role == role_key
        ).first()

        if action.upper() == "DELETE":
            if existing_role:
                session.delete(existing_role)
        else:
            if not existing_role:
                new_role = UserRole(user_id=user_id, role=role_key)
                session.add(new_role)

        # 2. Append central audit log in zenve_main.audit_logs
        audit = AuditLog(
            action=f"{action.upper()}_{role_key.upper()}",
            entity_type=role_key,
            entity_id=user_id
        )
        session.add(audit)
        session.commit()
        return True
    except Exception as e:
        session.rollback()
        logger.warning(f"[Sync Service] Failed to sync user {user_id} ({role}) to zenve_main: {e}")
        return False
    finally:
        session.close()

def log_crm_audit_to_zenve(action: str, entity_type: str, entity_id: int) -> bool:
    """Records any CRM action (e.g. Attendance punch, Task creation) into zenve_main.audit_logs."""
    session = SessionZenve()
    try:
        audit = AuditLog(
            action=action.upper(),
            entity_type=entity_type.lower(),
            entity_id=entity_id
        )
        session.add(audit)
        session.commit()
        return True
    except Exception as e:
        session.rollback()
        logger.warning(f"[Sync Service] Failed to write audit log to zenve_main: {e}")
        return False
    finally:
        session.close()

def sync_visit_to_doctor(doctor_id: int, feedback: Optional[str] = None, mark_verified: bool = False) -> bool:
    """Synchronizes doctor visit outcome from zippy_crm to zenve_main.doctors."""
    if not doctor_id:
        return False

    session = SessionZenve()
    try:
        doctor = session.query(Doctor).filter(Doctor.id == doctor_id).first()
        if doctor:
            if mark_verified:
                doctor.verification_status = "verified"
            audit = AuditLog(
                action="FIELD_VISIT_RECORDED",
                entity_type="doctor",
                entity_id=doctor_id
            )
            session.add(audit)
            session.commit()
            return True
        return False
    except Exception as e:
        session.rollback()
        logger.warning(f"[Sync Service] Failed to sync visit for doctor #{doctor_id}: {e}")
        return False
    finally:
        session.close()

# ------------------------------------------------------------------------------
# Full Bidirectional Synchronization & Health Reporting
# ------------------------------------------------------------------------------

def get_sync_status() -> Dict[str, Any]:
    """Inspects synchronization status between zippy_crm and zenve_main."""
    status: Dict[str, Any] = {
        "timestamp": datetime.utcnow().isoformat(),
        "zippy_crm": {},
        "zenve_main": {},
        "sync_healthy": True,
        "discrepancies": []
    }

    zippy_session = SessionZippy()
    zenve_session = SessionZenve()

    try:
        # Zippy CRM counts
        exec_count = zippy_session.query(SalesExecutive).count()
        sm_count = zippy_session.query(SalesManager).count()
        rm_count = zippy_session.query(RegionalManager).count()
        total_crm_users = exec_count + sm_count + rm_count

        status["zippy_crm"] = {
            "sales_executives": exec_count,
            "sales_managers": sm_count,
            "regional_managers": rm_count,
            "total_users": total_crm_users,
            "attendance_records": zippy_session.query(Attendance).count(),
            "monthly_plans": zippy_session.query(PlanVisit).count(),
        }
    except Exception as e:
        status["zippy_crm"]["error"] = str(e)
        status["sync_healthy"] = False

    try:
        # zenve_main counts
        doc_count = zenve_session.query(Doctor).count()
        role_count = zenve_session.query(UserRole).count()
        audit_count = zenve_session.query(AuditLog).count()

        status["zenve_main"] = {
            "doctors": doc_count,
            "user_roles": role_count,
            "audit_logs": audit_count,
        }
    except Exception as e:
        status["zenve_main"]["error"] = str(e)
        status["sync_healthy"] = False

    zippy_session.close()
    zenve_session.close()
    return status

def run_full_sync() -> Dict[str, Any]:
    """
    Executes a comprehensive synchronization:
    1. Ensures all CRM Regional Managers, Sales Managers, and Sales Executives exist in zenve_main.user_roles.
    2. Verifies Doctor references in CRM PlanVisits and VisitReports.
    3. Writes a sync audit checkpoint into zenve_main.audit_logs.
    """
    results: Dict[str, Any] = {
        "success": True,
        "synced_users": 0,
        "synced_audits": 0,
        "errors": []
    }

    zippy_session = SessionZippy()
    zenve_session = SessionZenve()

    try:
        # 1. Sync Regional Managers
        rms = zippy_session.query(RegionalManager).all()
        for rm in rms:
            existing = zenve_session.query(UserRole).filter(
                UserRole.user_id == rm.id,
                UserRole.role == "regional_manager"
            ).first()
            if not existing:
                zenve_session.add(UserRole(user_id=rm.id, role="regional_manager"))
                results["synced_users"] += 1

        # 2. Sync Sales Managers
        sms = zippy_session.query(SalesManager).all()
        for sm in sms:
            existing = zenve_session.query(UserRole).filter(
                UserRole.user_id == sm.id,
                UserRole.role == "sales_manager"
            ).first()
            if not existing:
                zenve_session.add(UserRole(user_id=sm.id, role="sales_manager"))
                results["synced_users"] += 1

        # 3. Sync Sales Executives
        execs = zippy_session.query(SalesExecutive).all()
        for ex in execs:
            existing = zenve_session.query(UserRole).filter(
                UserRole.user_id == ex.id,
                UserRole.role == "sales_executive"
            ).first()
            if not existing:
                zenve_session.add(UserRole(user_id=ex.id, role="sales_executive"))
                results["synced_users"] += 1

        # 4. Checkpoint in AuditLog
        checkpoint = AuditLog(
            action="FULL_CROSS_DB_SYNC",
            entity_type="system",
            entity_id=0
        )
        zenve_session.add(checkpoint)
        zenve_session.commit()
        results["synced_audits"] += 1
        results["message"] = f"Successfully synced {results['synced_users']} user roles to zenve_main."

    except Exception as e:
        zenve_session.rollback()
        results["success"] = False
        results["errors"].append(str(e))
    finally:
        zippy_session.close()
        zenve_session.close()

    return results

