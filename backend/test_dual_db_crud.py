"""
Test Suite: Dual Database Complete CRUD and Synchronization Verification
Tests CREATE, READ, UPDATE, and DELETE operations independently on:
- Database 1: zippy_crm
- Database 2: zenve_main
Without altering or deleting any existing database records.
"""
import sys
import uuid
from sqlalchemy import text
from database import (
    engine_zippy,
    engine_zenve,
    SessionZippy,
    SessionZenve,
    init_db
)
from models import (
    SalesExecutive,
    RegionalManager,
    Doctor,
    UserRole,
    AuditLog
)
import sync_service

def test_zippy_crm_crud():
    print("----------------------------------------------------------------------")
    print("TEST 1: Database 1 (zippy_crm) - Complete CRUD Operations")
    print("----------------------------------------------------------------------")
    session = SessionZippy()
    test_code = f"T-EXEC-{uuid.uuid4().hex[:6].upper()}"
    test_exec_id = None

    try:
        # 1. CREATE
        test_exec = SalesExecutive(
            name="Automated Test Executive",
            code=test_code,
            phone="9876543210",
            email=f"test_{test_code.lower()}@zippy.test",
            password="testpassword123",
            region="Test Region",
            city="Test City",
            monthly_target=50000.0,
            is_phone_verified=True,
            is_active=True
        )
        session.add(test_exec)
        session.commit()
        session.refresh(test_exec)
        test_exec_id = test_exec.id
        assert test_exec_id is not None, "Failed to retrieve generated ID on CREATE"
        print(f"[PASS] CREATE: Inserted test SalesExecutive #{test_exec_id} (Code: {test_code}) into zippy_crm")

        # 2. READ
        read_obj = session.query(SalesExecutive).filter(SalesExecutive.id == test_exec_id).first()
        assert read_obj is not None, "Record not found during READ"
        assert read_obj.code == test_code, "Data mismatch during READ"
        print(f"[PASS] READ: Successfully fetched record #{read_obj.id} with matching code '{read_obj.code}'")

        # 3. UPDATE
        read_obj.monthly_target = 75000.0
        read_obj.city = "Updated City"
        session.commit()
        session.refresh(read_obj)
        assert read_obj.monthly_target == 75000.0, "UPDATE value was not persisted"
        assert read_obj.city == "Updated City", "UPDATE city was not persisted"
        print(f"[PASS] UPDATE: Successfully edited target to 75000.0 and city to '{read_obj.city}'")

        # 4. DELETE
        session.delete(read_obj)
        session.commit()
        deleted_check = session.query(SalesExecutive).filter(SalesExecutive.id == test_exec_id).first()
        assert deleted_check is None, "Record still exists after DELETE"
        print(f"[PASS] DELETE: Successfully deleted test record #{test_exec_id} from zippy_crm")
        return True

    except Exception as e:
        session.rollback()
        print(f"[FAIL] zippy_crm CRUD error: {e}")
        # Cleanup if needed
        if test_exec_id:
            try:
                session.query(SalesExecutive).filter(SalesExecutive.id == test_exec_id).delete()
                session.commit()
            except Exception:
                pass
        return False
    finally:
        session.close()

def test_zenve_main_crud():
    print("----------------------------------------------------------------------")
    print("TEST 2: Database 2 (zenve_main) - Complete CRUD Operations")
    print("----------------------------------------------------------------------")
    session = SessionZenve()
    test_email = f"test.doctor.{uuid.uuid4().hex[:6]}@zenve.test"
    test_doc_id = None

    try:
        # 1. CREATE
        test_doc = Doctor(
            name="Dr. Automated Test Doctor",
            email=test_email,
            phone="9876500000",
            qualification="BVSc, MVSc",
            specializations="Surgery, Diagnostics",
            pincode="560001",
            city="Bangalore",
            clinic_name="Zenve Test Hospital",
            facility_type="Clinic",
            experience_years=8,
            consultation_fee=600.0,
            verification_status="verified",
            is_active=True
        )
        session.add(test_doc)
        session.commit()
        session.refresh(test_doc)
        test_doc_id = test_doc.id
        assert test_doc_id is not None, "Failed to retrieve generated ID on CREATE"
        print(f"[PASS] CREATE: Inserted test Doctor #{test_doc_id} ('{test_email}') into zenve_main")

        # 2. READ
        read_doc = session.query(Doctor).filter(Doctor.id == test_doc_id).first()
        assert read_doc is not None, "Record not found during READ"
        assert read_doc.email == test_email, "Email mismatch during READ"
        print(f"[PASS] READ: Successfully fetched Doctor #{read_doc.id} with fee Rs.{read_doc.consultation_fee}")

        # 3. UPDATE
        read_doc.consultation_fee = 850.0
        read_doc.qualification = "BVSc, MVSc, PhD"
        session.commit()
        session.refresh(read_doc)
        assert read_doc.consultation_fee == 850.0, "Consultation fee update failed"
        print(f"[PASS] UPDATE: Successfully edited consultation_fee to Rs.850.0 in zenve_main")

        # 4. DELETE
        session.delete(read_doc)
        session.commit()
        deleted_doc_check = session.query(Doctor).filter(Doctor.id == test_doc_id).first()
        assert deleted_doc_check is None, "Doctor record still exists after DELETE"
        print(f"[PASS] DELETE: Successfully deleted test Doctor #{test_doc_id} from zenve_main")
        return True

    except Exception as e:
        session.rollback()
        print(f"[FAIL] zenve_main CRUD error: {e}")
        if test_doc_id:
            try:
                session.query(Doctor).filter(Doctor.id == test_doc_id).delete()
                session.commit()
            except Exception:
                pass
        return False
    finally:
        session.close()

def test_cross_database_sync():
    print("----------------------------------------------------------------------")
    print("TEST 3: Cross-Database Synchronization (zippy_crm <-> zenve_main)")
    print("----------------------------------------------------------------------")
    pseudo_id = 999999
    try:
        # Test 1: Event sync CRM user -> zenve_main.user_roles and audit_logs
        ok_sync = sync_service.sync_user_to_zenve(
            user_id=pseudo_id,
            role="sales_executive",
            action="CREATE"
        )
        assert ok_sync, "sync_user_to_zenve returned False"

        # Verify in zenve_main
        z_session = SessionZenve()
        role_entry = z_session.query(UserRole).filter(
            UserRole.user_id == pseudo_id,
            UserRole.role == "sales_executive"
        ).first()
        assert role_entry is not None, "UserRole not created in zenve_main"
        print("[PASS] User Role Event Sync: Created user_roles in zenve_main for CRM user")

        audit_entry = z_session.query(AuditLog).filter(
            AuditLog.entity_id == pseudo_id,
            AuditLog.entity_type == "sales_executive"
        ).first()
        assert audit_entry is not None, "AuditLog not created in zenve_main"
        print(f"[PASS] Central Audit Sync: Created audit_log entry '{audit_entry.action}' in zenve_main")

        # Test DELETE sync
        sync_service.sync_user_to_zenve(
            user_id=pseudo_id,
            role="sales_executive",
            action="DELETE"
        )
        z_session.expire_all()
        del_role = z_session.query(UserRole).filter(
            UserRole.user_id == pseudo_id,
            UserRole.role == "sales_executive"
        ).first()
        assert del_role is None, "UserRole still exists after DELETE sync"

        # Clean up test audit entry
        z_session.query(AuditLog).filter(AuditLog.entity_id == pseudo_id).delete()
        z_session.commit()
        z_session.close()
        print("[PASS] Cleanup: Successfully cleaned up temporary sync test entries")
        return True

    except Exception as e:
        print(f"[FAIL] Cross-Database Sync test error: {e}")
        return False

def run_all_tests():
    print("======================================================================")
    print("DUAL-DATABASE COMPLETE CRUD & SYNCHRONIZATION VERIFICATION SUITE")
    print("======================================================================")
    
    t1 = test_zippy_crm_crud()
    t2 = test_zenve_main_crud()
    t3 = test_cross_database_sync()

    print("======================================================================")
    print("TEST SUITE EXECUTION SUMMARY")
    print("======================================================================")
    print(f"zippy_crm CRUD:            {'PASSED [✓]' if t1 else 'FAILED [✗]'}")
    print(f"zenve_main CRUD:           {'PASSED [✓]' if t2 else 'FAILED [✗]'}")
    print(f"Cross-Database Sync:       {'PASSED [✓]' if t3 else 'FAILED [✗]'}")
    print("======================================================================")

    if t1 and t2 and t3:
        print("ALL TESTS PASSED: Both databases are fully functional with reliable synchronization!")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED: Please review logs above.")
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()

