import requests
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://root:Vasanth%40zenve@127.0.0.1:3306/pet_management"
BASE = "http://127.0.0.1:8000"

results = []

def record_test(module, operation, status, details=""):
    results.append({
        "module": module,
        "operation": operation,
        "status": status,
        "details": details
    })
    mark = "✓" if status == "PASS" else "✗"
    print(f"[{mark}] {module.upper()} | {operation}: {status} {details}")

def truncate_database():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        tables_res = conn.execute(text("SHOW TABLES;"))
        tables = [r[0] for r in tables_res]
        for tbl in tables:
            conn.execute(text(f"TRUNCATE TABLE `{tbl}`;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()

        # Count total rows across all tables
        total_rows = 0
        for tbl in tables:
            cnt = conn.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
            total_rows += cnt
        print(f"[DB] All {len(tables)} tables truncated to 0 rows. Total rows in database: {total_rows}")
    engine.dispose()
    return total_rows

def run_tests():
    print("=" * 80)
    print("STEP 1: TRUNCATING DATABASE TO CLEAN 0-RECORD STATE")
    print("=" * 80)
    truncate_database()

    print("=" * 80)
    print("STEP 2: EXECUTING COMPREHENSIVE END-TO-END CRUD TEST SUITE")
    print("=" * 80)

    # -------------------------------------------------------------
    # 1. REGIONAL MANAGERS CRUD
    # -------------------------------------------------------------
    rm_id = None
    rm_to_del_id = None
    try:
        rm_payload = {
            "name": "Rajesh Verma",
            "code": "RM-001",
            "phone": "9845011111",
            "email": "rajesh.verma@zippy.test",
            "password": "password123",
            "region": "South Region",
            "is_phone_verified": True,
            "is_active": "Yes"
        }
        r = requests.post(f"{BASE}/regional-managers", json=rm_payload)
        if r.status_code in (200, 201):
            rm_id = r.json().get("id")
            record_test("Regional Managers", "CREATE", "PASS", f"Created ID #{rm_id}")
        else:
            record_test("Regional Managers", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/regional-managers")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Regional Managers", "READ_LIST", "PASS", f"Found {len(r.json())} managers")
        else:
            record_test("Regional Managers", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if rm_id:
            r = requests.get(f"{BASE}/regional-managers/{rm_id}")
            if r.status_code == 200 and r.json().get("name") == "Rajesh Verma":
                record_test("Regional Managers", "READ_ONE", "PASS", f"Verified name {r.json().get('name')}")
            else:
                record_test("Regional Managers", "READ_ONE", "FAIL", f"HTTP {r.status_code}")

            update_payload = dict(rm_payload)
            update_payload["region"] = "South India Super Region"
            r = requests.put(f"{BASE}/regional-managers/{rm_id}", json=update_payload)
            if r.status_code == 200:
                record_test("Regional Managers", "UPDATE", "PASS", "Updated region successfully")
            else:
                record_test("Regional Managers", "UPDATE", "FAIL", f"HTTP {r.status_code}")

        # Secondary record for DELETE test
        r_del = requests.post(f"{BASE}/regional-managers", json={
            "name": "Temp RM", "code": "RM-TEMP", "phone": "9845099901",
            "email": "temp.rm@zippy.test", "region": "North Region"
        })
        if r_del.status_code in (200, 201):
            rm_to_del_id = r_del.json().get("id")
            r = requests.delete(f"{BASE}/regional-managers/{rm_to_del_id}")
            if r.status_code in (200, 204):
                record_test("Regional Managers", "DELETE", "PASS", f"Deleted Temp RM #{rm_to_del_id}")
            else:
                record_test("Regional Managers", "DELETE", "FAIL", f"HTTP {r.status_code}")
        else:
            record_test("Regional Managers", "DELETE", "FAIL", f"Could not create temp RM: {r_del.text}")
    except Exception as e:
        record_test("Regional Managers", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 2. SALES MANAGERS CRUD
    # -------------------------------------------------------------
    sm_id = None
    try:
        sm_payload = {
            "name": "Kavitha Raman",
            "code": "SM-001",
            "phone": "9845022222",
            "email": "kavitha.raman@zippy.test",
            "password": "password123",
            "region": "Karnataka",
            "is_phone_verified": True,
            "is_active": "Yes"
        }
        r = requests.post(f"{BASE}/sales-managers", json=sm_payload)
        if r.status_code in (200, 201):
            sm_id = r.json().get("id")
            record_test("Sales Managers", "CREATE", "PASS", f"Created ID #{sm_id}")
        else:
            record_test("Sales Managers", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/sales-managers")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Sales Managers", "READ_LIST", "PASS", f"Found {len(r.json())} managers")
        else:
            record_test("Sales Managers", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if sm_id:
            r = requests.get(f"{BASE}/sales-managers/{sm_id}")
            if r.status_code == 200 and r.json().get("name") == "Kavitha Raman":
                record_test("Sales Managers", "READ_ONE", "PASS", f"Verified ID #{sm_id}")
            else:
                record_test("Sales Managers", "READ_ONE", "FAIL", f"HTTP {r.status_code}")

            update_payload = dict(sm_payload)
            update_payload["phone"] = "9845099999"
            r = requests.put(f"{BASE}/sales-managers/{sm_id}", json=update_payload)
            if r.status_code == 200:
                record_test("Sales Managers", "UPDATE", "PASS", "Updated phone successfully")
            else:
                record_test("Sales Managers", "UPDATE", "FAIL", f"HTTP {r.status_code}")

        # Secondary record for DELETE test
        r_del = requests.post(f"{BASE}/sales-managers", json={
            "name": "Temp SM", "code": "SM-TEMP", "phone": "9845099902",
            "email": "temp.sm@zippy.test", "region": "Goa"
        })
        if r_del.status_code in (200, 201):
            sm_del_id = r_del.json().get("id")
            r = requests.delete(f"{BASE}/sales-managers/{sm_del_id}")
            if r.status_code in (200, 204):
                record_test("Sales Managers", "DELETE", "PASS", f"Deleted Temp SM #{sm_del_id}")
            else:
                record_test("Sales Managers", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Sales Managers", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 3. SALES EXECUTIVES CRUD
    # -------------------------------------------------------------
    se_id = None
    try:
        se_payload = {
            "name": "Dhanushkodi M",
            "code": "SE-001",
            "phone": "9845033333",
            "email": "dhanushkodi@zippy.test",
            "password": "password123",
            "region": "Karnataka",
            "city": "Bangalore",
            "monthly_target": 120,
            "is_phone_verified": True,
            "is_active": "Yes"
        }
        r = requests.post(f"{BASE}/sales-executives", json=se_payload)
        if r.status_code in (200, 201):
            se_id = r.json().get("id")
            record_test("Sales Executives", "CREATE", "PASS", f"Created ID #{se_id}")
        else:
            record_test("Sales Executives", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/sales-executives")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Sales Executives", "READ_LIST", "PASS", f"Found {len(r.json())} executives")
        else:
            record_test("Sales Executives", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if se_id:
            r = requests.get(f"{BASE}/sales-executives/{se_id}")
            if r.status_code == 200 and r.json().get("name") == "Dhanushkodi M":
                record_test("Sales Executives", "READ_ONE", "PASS", f"Verified ID #{se_id}")
            else:
                record_test("Sales Executives", "READ_ONE", "FAIL", f"HTTP {r.status_code}")

            update_payload = dict(se_payload)
            update_payload["monthly_target"] = 150
            r = requests.put(f"{BASE}/sales-executives/{se_id}", json=update_payload)
            if r.status_code == 200:
                record_test("Sales Executives", "UPDATE", "PASS", "Updated monthly_target")
            else:
                record_test("Sales Executives", "UPDATE", "FAIL", f"HTTP {r.status_code}")

        # Secondary record for DELETE test
        r_del = requests.post(f"{BASE}/sales-executives", json={
            "name": "Temp SE", "code": "SE-TEMP", "phone": "9845099903",
            "email": "temp.se@zippy.test", "region": "Karnataka", "city": "Mysore"
        })
        if r_del.status_code in (200, 201):
            se_del_id = r_del.json().get("id")
            r = requests.delete(f"{BASE}/sales-executives/{se_del_id}")
            if r.status_code in (200, 204):
                record_test("Sales Executives", "DELETE", "PASS", f"Deleted Temp SE #{se_del_id}")
            else:
                record_test("Sales Executives", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Sales Executives", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 4. PINCODE COVERAGE CRUD (/pincode-coverages)
    # -------------------------------------------------------------
    cov_id = None
    try:
        cov_payload = {
            "executive_id": se_id or 1,
            "pincode": "560034",
            "city": "Bangalore",
            "state": "Karnataka",
            "is_active": "Yes"
        }
        r = requests.post(f"{BASE}/pincode-coverages", json=cov_payload)
        if r.status_code in (200, 201):
            cov_id = r.json().get("id")
            record_test("Pincode Coverage", "CREATE", "PASS", f"Created coverage ID #{cov_id}")
        else:
            record_test("Pincode Coverage", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/pincode-coverages")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Pincode Coverage", "READ_LIST", "PASS", f"Found {len(r.json())} coverages")
        else:
            record_test("Pincode Coverage", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if cov_id:
            cov_update = dict(cov_payload)
            cov_update["city"] = "Bangalore South"
            r = requests.put(f"{BASE}/pincode-coverages/{cov_id}", json=cov_update)
            if r.status_code == 200:
                record_test("Pincode Coverage", "UPDATE", "PASS", "Updated city")
            else:
                record_test("Pincode Coverage", "UPDATE", "FAIL", f"HTTP {r.status_code}")

            r = requests.delete(f"{BASE}/pincode-coverages/{cov_id}")
            if r.status_code in (200, 204):
                record_test("Pincode Coverage", "DELETE", "PASS", f"Deleted coverage #{cov_id}")
            else:
                record_test("Pincode Coverage", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Pincode Coverage", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 5. DOCTORS CRUD (/doctors)
    # -------------------------------------------------------------
    doc_id = None
    try:
        doc_payload = {
            "name": "Dr. Ananya Sharma",
            "qualification": "BVSc & AH, MVSc Surgery",
            "specializations": "Small Animal Surgery, Oncology",
            "pincode": "560034",
            "city": "Bangalore",
            "phone": "9876543210",
            "email": "dr.ananya@curepets.test",
            "experience_years": 8,
            "consultation_fee": 650.0,
            "clinic_name": "CurePets Veterinary Hospital",
            "verification_status": "approved",
            "is_active": "Yes"
        }
        r = requests.post(f"{BASE}/doctors", json=doc_payload)
        if r.status_code in (200, 201):
            res_json = r.json()
            doc_id = res_json.get("doctor", {}).get("id") or res_json.get("id")
            record_test("Doctors", "CREATE", "PASS", f"Created Doctor ID #{doc_id}")
        else:
            record_test("Doctors", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/doctors")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Doctors", "READ_LIST", "PASS", f"Found {len(r.json())} doctors")
        else:
            record_test("Doctors", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if doc_id:
            r = requests.get(f"{BASE}/doctors/{doc_id}")
            if r.status_code == 200 and r.json().get("name") == "Dr. Ananya Sharma":
                record_test("Doctors", "READ_ONE", "PASS", f"Verified Dr. Ananya Sharma")
            else:
                record_test("Doctors", "READ_ONE", "FAIL", f"HTTP {r.status_code}")

            doc_update = dict(doc_payload)
            doc_update["consultation_fee"] = 700.0
            r = requests.put(f"{BASE}/doctors/{doc_id}", json=doc_update)
            if r.status_code == 200:
                record_test("Doctors", "UPDATE", "PASS", "Updated consultation_fee")
            else:
                record_test("Doctors", "UPDATE", "FAIL", f"HTTP {r.status_code}")

        # Secondary doctor to test DELETE
        r_doc_del = requests.post(f"{BASE}/doctors", json={
            "name": "Dr. Temp Doc", "phone": "9876549999", "email": "temp.doc@example.test",
            "qualification": "BVSc", "city": "Bangalore"
        })
        if r_doc_del.status_code in (200, 201):
            del_id = r_doc_del.json().get("doctor", {}).get("id") or r_doc_del.json().get("id")
            r = requests.delete(f"{BASE}/doctors/{del_id}")
            if r.status_code in (200, 204):
                record_test("Doctors", "DELETE", "PASS", f"Deleted Doctor #{del_id}")
            else:
                record_test("Doctors", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Doctors", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 6. EXECUTIVE TASKS CRUD
    # -------------------------------------------------------------
    task_rm_to_sm_id = None
    task_rm_to_se_id = None
    task_to_delete_id = None
    try:
        # 6a. Regional Manager delegates to Sales Manager
        t1_payload = {
            "title": "Quarterly Territory Sales Review",
            "description": "Align all executives on target doctor onboarding",
            "task_type": "Target Review",
            "priority": "Urgent",
            "status": "Pending",
            "due_date": "2026-11-10",
            "assigned_by_role": "regional",
            "assigned_by_name": "Rajesh Verma",
            "assigned_to_role": "manager",
            "assigned_to_name": "Kavitha Raman",
            "target_entity_name": "Karnataka Territory HQ"
        }
        r1 = requests.post(f"{BASE}/executive-tasks", json=t1_payload)
        if r1.status_code in (200, 201):
            d1 = r1.json()
            task_rm_to_sm_id = d1.get("id")
            by_id = d1.get("assigned_by_id")
            to_id = d1.get("assigned_to_id")
            to_role = d1.get("assigned_to_role")
            if by_id and to_id and to_role == "manager":
                record_test("Executive Tasks", "CREATE_RM_TO_SM", "PASS", f"Task #{task_rm_to_sm_id} By ID:{by_id} To ID:{to_id} Role:{to_role}")
            else:
                record_test("Executive Tasks", "CREATE_RM_TO_SM", "FAIL", f"Missing IDs in response: {d1}")
        else:
            record_test("Executive Tasks", "CREATE_RM_TO_SM", "FAIL", f"HTTP {r1.status_code}: {r1.text}")

        # 6b. Regional Manager delegates to Field Executive
        t2_payload = {
            "title": "Onboard Dr. Ananya Clinic in Koramangala",
            "description": "Deliver welcome pack and schedule detailing session",
            "task_type": "Doctor Visit",
            "priority": "High",
            "status": "Pending",
            "due_date": "2026-10-31",
            "assigned_by_role": "regional",
            "assigned_by_name": "Rajesh Verma",
            "assigned_to_role": "executive",
            "assigned_to_name": "Dhanushkodi M",
            "target_entity_name": "CurePets Veterinary Hospital",
            "pincode": "560034"
        }
        r2 = requests.post(f"{BASE}/executive-tasks", json=t2_payload)
        if r2.status_code in (200, 201):
            d2 = r2.json()
            task_rm_to_se_id = d2.get("id")
            if d2.get("assigned_by_id") and d2.get("assigned_to_id") and d2.get("assigned_to_role") == "executive":
                record_test("Executive Tasks", "CREATE_RM_TO_SE", "PASS", f"Task #{task_rm_to_se_id} By ID:{d2.get('assigned_by_id')} To ID:{d2.get('assigned_to_id')} Pincode:{d2.get('pincode')}")
            else:
                record_test("Executive Tasks", "CREATE_RM_TO_SE", "FAIL", f"Missing fields: {d2}")
        else:
            record_test("Executive Tasks", "CREATE_RM_TO_SE", "FAIL", f"HTTP {r2.status_code}: {r2.text}")

        # 6c. Task to test DELETE
        t3_payload = {
            "title": "Temporary Sample Check",
            "task_type": "General",
            "priority": "Low",
            "assigned_by_role": "manager",
            "assigned_by_name": "Kavitha Raman",
            "assigned_to_role": "executive",
            "assigned_to_name": "Dhanushkodi M"
        }
        r3 = requests.post(f"{BASE}/executive-tasks", json=t3_payload)
        if r3.status_code in (200, 201):
            task_to_delete_id = r3.json().get("id")
            record_test("Executive Tasks", "CREATE_TEMPORARY", "PASS", f"Task #{task_to_delete_id}")
        else:
            record_test("Executive Tasks", "CREATE_TEMPORARY", "FAIL", f"HTTP {r3.status_code}")

        # 6d. Read List
        r = requests.get(f"{BASE}/executive-tasks")
        if r.status_code == 200:
            tasks_list = r.json()
            record_test("Executive Tasks", "READ_LIST", "PASS", f"Found {len(tasks_list)} tasks in CRM")
        else:
            record_test("Executive Tasks", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        # 6e. Update Task
        if task_rm_to_se_id:
            update_payload = {
                "status": "In Progress",
                "progress": 50,
                "remarks": "Met clinic receptionist, scheduled doctor visit for tomorrow morning."
            }
            r = requests.put(f"{BASE}/executive-tasks/{task_rm_to_se_id}", json=update_payload)
            if r.status_code == 200:
                record_test("Executive Tasks", "UPDATE", "PASS", f"Updated task #{task_rm_to_se_id} progress to 50%")
            else:
                record_test("Executive Tasks", "UPDATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        # 6f. Delete Task
        if task_to_delete_id:
            r = requests.delete(f"{BASE}/executive-tasks/{task_to_delete_id}")
            if r.status_code in (200, 204):
                record_test("Executive Tasks", "DELETE", "PASS", f"Deleted task #{task_to_delete_id}")
            else:
                record_test("Executive Tasks", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Executive Tasks", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 7. EXECUTIVE ALERTS CRUD
    # -------------------------------------------------------------
    alert_id = None
    try:
        alert_payload = {
            "title": "Low stock alert for Vaccine Series A in Koramangala",
            "severity": "High",
            "entity_type": "Doctor Clinic",
            "pincode": "560034",
            "is_read": False
        }
        r = requests.post(f"{BASE}/executive-alerts", json=alert_payload)
        if r.status_code in (200, 201):
            alert_id = r.json().get("id")
            record_test("Executive Alerts", "CREATE", "PASS", f"Created Alert ID #{alert_id}")
        else:
            record_test("Executive Alerts", "CREATE", "FAIL", f"HTTP {r.status_code}")

        r = requests.get(f"{BASE}/executive-alerts")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Executive Alerts", "READ_LIST", "PASS", f"Found {len(r.json())} alerts")
        else:
            record_test("Executive Alerts", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if alert_id:
            r = requests.delete(f"{BASE}/executive-alerts/{alert_id}")
            if r.status_code in (200, 204):
                record_test("Executive Alerts", "DELETE", "PASS", f"Deleted Alert #{alert_id}")
            else:
                record_test("Executive Alerts", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Executive Alerts", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 8. PET PARENTS & PETS CRUD
    # -------------------------------------------------------------
    parent_id = None
    pet_id = None
    try:
        parent_payload = {
            "full_name": "Siddharth Rao",
            "email": "siddharth.rao@example.test",
            "phone": "9845044444",
            "city": "Bangalore"
        }
        r = requests.post(f"{BASE}/pet-parents", json=parent_payload)
        if r.status_code in (200, 201):
            parent_id = r.json().get("id")
            record_test("Pet Parents", "CREATE", "PASS", f"Created Parent #{parent_id}")
        else:
            record_test("Pet Parents", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/pet-parents")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Pet Parents", "READ_LIST", "PASS", f"Found {len(r.json())} parents")
        else:
            record_test("Pet Parents", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if parent_id:
            r = requests.get(f"{BASE}/pet-parents/{parent_id}")
            if r.status_code == 200 and r.json().get("full_name") == "Siddharth Rao":
                record_test("Pet Parents", "READ_ONE", "PASS", "Verified name Siddharth Rao")
            else:
                record_test("Pet Parents", "READ_ONE", "FAIL", f"HTTP {r.status_code}")

            update_p = dict(parent_payload)
            update_p["city"] = "Bangalore Urban"
            r = requests.put(f"{BASE}/pet-parents/{parent_id}", json=update_p)
            if r.status_code == 200:
                record_test("Pet Parents", "UPDATE", "PASS", "Updated city")
            else:
                record_test("Pet Parents", "UPDATE", "FAIL", f"HTTP {r.status_code}")

            # Pets
            pet_payload = {
                "parent_id": parent_id,
                "name": "Bruno",
                "species": "Dog",
                "breed": "Golden Retriever",
                "gender": "Male",
                "weight_kg": 28.5,
                "is_active": "Yes"
            }
            r = requests.post(f"{BASE}/pets", json=pet_payload)
            if r.status_code in (200, 201):
                pet_id = r.json().get("id")
                record_test("Pets", "CREATE", "PASS", f"Created Pet ID #{pet_id}")
            else:
                record_test("Pets", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

            r = requests.get(f"{BASE}/pets")
            if r.status_code == 200 and len(r.json()) >= 1:
                record_test("Pets", "READ_LIST", "PASS", f"Found {len(r.json())} pets")
            else:
                record_test("Pets", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

            if pet_id:
                pet_update = dict(pet_payload)
                pet_update["weight_kg"] = 29.2
                r = requests.put(f"{BASE}/pets/{pet_id}", json=pet_update)
                if r.status_code == 200:
                    record_test("Pets", "UPDATE", "PASS", "Updated weight_kg")
                else:
                    record_test("Pets", "UPDATE", "FAIL", f"HTTP {r.status_code}")

                # Delete Pet
                r = requests.delete(f"{BASE}/pets/{pet_id}")
                if r.status_code in (200, 204):
                    record_test("Pets", "DELETE", "PASS", f"Deleted Pet #{pet_id}")
                else:
                    record_test("Pets", "DELETE", "FAIL", f"HTTP {r.status_code}")

            # Delete Parent
            r = requests.delete(f"{BASE}/pet-parents/{parent_id}")
            if r.status_code in (200, 204):
                record_test("Pet Parents", "DELETE", "PASS", f"Deleted Parent #{parent_id}")
            else:
                record_test("Pet Parents", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Pet Parents & Pets", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 9. PRODUCTS CRUD
    # -------------------------------------------------------------
    prod_id = None
    try:
        prod_payload = {
            "name": "Zenve Pet Pro Multivitamin Tonic 250ml",
            "sku": "ZN-VIT-250",
            "category": "Healthcare",
            "price": 450.0,
            "cost_price": 280.0,
            "stock_quantity": 500,
            "is_active": "Yes"
        }
        r = requests.post(f"{BASE}/products", json=prod_payload)
        if r.status_code in (200, 201):
            prod_id = r.json().get("id")
            record_test("Products", "CREATE", "PASS", f"Created Product #{prod_id}")
        else:
            record_test("Products", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/products")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Products", "READ_LIST", "PASS", f"Found {len(r.json())} products")
        else:
            record_test("Products", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if prod_id:
            prod_update = dict(prod_payload)
            prod_update["stock_quantity"] = 490
            r = requests.put(f"{BASE}/products/{prod_id}", json=prod_update)
            if r.status_code == 200:
                record_test("Products", "UPDATE", "PASS", "Updated stock_quantity")
            else:
                record_test("Products", "UPDATE", "FAIL", f"HTTP {r.status_code}")

            r = requests.delete(f"{BASE}/products/{prod_id}")
            if r.status_code in (200, 204):
                record_test("Products", "DELETE", "PASS", f"Deleted Product #{prod_id}")
            else:
                record_test("Products", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Products", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 10. SERVICES CRUD
    # -------------------------------------------------------------
    svc_id = None
    try:
        svc_payload = {
            "title": "Premium Full Pet Grooming & Spa",
            "service_type": "Grooming",
            "price": 1200.0,
            "duration_minutes": 60,
            "home_service": True,
            "is_active": "Yes"
        }
        r = requests.post(f"{BASE}/services", json=svc_payload)
        if r.status_code in (200, 201):
            svc_id = r.json().get("id")
            record_test("Services", "CREATE", "PASS", f"Created Service #{svc_id}")
        else:
            record_test("Services", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/services")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Services", "READ_LIST", "PASS", f"Found {len(r.json())} services")
        else:
            record_test("Services", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        if svc_id:
            svc_update = dict(svc_payload)
            svc_update["price"] = 1250.0
            r = requests.put(f"{BASE}/services/{svc_id}", json=svc_update)
            if r.status_code == 200:
                record_test("Services", "UPDATE", "PASS", "Updated price")
            else:
                record_test("Services", "UPDATE", "FAIL", f"HTTP {r.status_code}")

            r = requests.delete(f"{BASE}/services/{svc_id}")
            if r.status_code in (200, 204):
                record_test("Services", "DELETE", "PASS", f"Deleted Service #{svc_id}")
            else:
                record_test("Services", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Services", "CRUD_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 11. ATTENDANCE WORKFLOW (/attendance/punch-in & /attendance/punch-out)
    # -------------------------------------------------------------
    try:
        punch_in_payload = {
            "sales_executive_id": se_id or 1,
            "latitude": 12.9352,
            "longitude": 77.6245,
            "formatted_address": "80 Feet Rd, Koramangala, Bengaluru, Karnataka 560034",
            "city": "Bengaluru",
            "pincode": "560034",
            "accuracy": 10.0,
            "location_source": "GPS"
        }
        r = requests.post(f"{BASE}/attendance/punch-in", json=punch_in_payload)
        if r.status_code in (200, 201):
            record_test("Executive Attendance", "PUNCH_IN", "PASS", f"Punched in: {r.json().get('status', 'OK')}")
        else:
            record_test("Executive Attendance", "PUNCH_IN", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/api/attendance/today/{se_id or 1}")
        if r.status_code == 200 and r.json():
            record_test("Executive Attendance", "READ_TODAY", "PASS", f"Status: {r.json().get('status')}")
        else:
            record_test("Executive Attendance", "READ_TODAY", "FAIL", f"HTTP {r.status_code}")

        # Punch-out
        punch_out_payload = {
            "sales_executive_id": se_id or 1,
            "latitude": 12.9355,
            "longitude": 77.6248,
            "formatted_address": "80 Feet Rd, Koramangala, Bengaluru, Karnataka 560034",
            "accuracy": 12.0
        }
        r = requests.post(f"{BASE}/attendance/punch-out", json=punch_out_payload)
        if r.status_code in (200, 201):
            record_test("Executive Attendance", "PUNCH_OUT", "PASS", f"Punched out: {r.json().get('status', 'OK')}")
        else:
            record_test("Executive Attendance", "PUNCH_OUT", "FAIL", f"HTTP {r.status_code}: {r.text}")
    except Exception as e:
        record_test("Executive Attendance", "WORKFLOW_ERROR", "FAIL", str(e))

    # -------------------------------------------------------------
    # 12. MONTHLY PLANS & PLAN VISITS CRUD
    # -------------------------------------------------------------
    plan_id = None
    try:
        plan_payload = {
            "executive_id": se_id or 1,
            "month_key": "2026-11",
            "month_label": "November 2026",
            "working_days": 24,
            "daily_target": 5,
            "total_doctors": 30,
            "planning_method": "auto"
        }
        r = requests.post(f"{BASE}/monthly-plans", json=plan_payload)
        if r.status_code in (200, 201):
            plan_id = r.json().get("id")
            record_test("Monthly Plans", "CREATE", "PASS", f"Created Plan ID #{plan_id}")
        else:
            record_test("Monthly Plans", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

        r = requests.get(f"{BASE}/monthly-plans")
        if r.status_code == 200 and len(r.json()) >= 1:
            record_test("Monthly Plans", "READ_LIST", "PASS", f"Found {len(r.json())} plans")
        else:
            record_test("Monthly Plans", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

        # Plan Visits Create
        if plan_id and doc_id:
            visit_payload = {
                "plan_id": plan_id,
                "executive_id": se_id or 1,
                "doctor_id": doc_id,
                "scheduled_date": "2026-11-02",
                "visit_time": "10:30 AM",
                "status": "Planned"
            }
            r = requests.post(f"{BASE}/plan-visits", json=visit_payload)
            if r.status_code in (200, 201):
                vis_id = r.json().get("id")
                record_test("Plan Visits", "CREATE", "PASS", f"Created Visit #{vis_id}")
            else:
                record_test("Plan Visits", "CREATE", "FAIL", f"HTTP {r.status_code}: {r.text}")

            r = requests.get(f"{BASE}/plan-visits?plan_id={plan_id}")
            if r.status_code == 200 and len(r.json()) >= 1:
                record_test("Plan Visits", "READ_LIST", "PASS", f"Found {len(r.json())} visits for plan")
            else:
                record_test("Plan Visits", "READ_LIST", "FAIL", f"HTTP {r.status_code}")

            if vis_id:
                r = requests.delete(f"{BASE}/plan-visits/{vis_id}")
                if r.status_code in (200, 204):
                    record_test("Plan Visits", "DELETE", "PASS", f"Deleted Visit #{vis_id}")
                else:
                    record_test("Plan Visits", "DELETE", "FAIL", f"HTTP {r.status_code}")

        if plan_id:
            r = requests.delete(f"{BASE}/monthly-plans/{plan_id}")
            if r.status_code in (200, 204):
                record_test("Monthly Plans", "DELETE", "PASS", f"Deleted Plan #{plan_id}")
            else:
                record_test("Monthly Plans", "DELETE", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record_test("Monthly Plans", "CRUD_ERROR", "FAIL", str(e))

    print("=" * 80)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)
    print(f"TEST RESULTS SUMMARY: {passed}/{total} PASSED ({failed} FAILED)")
    print("=" * 80)

    # -------------------------------------------------------------
    # STEP 3: FINAL TRUNCATE TO LEAVE DATABASE IN 100% CLEAN EMPTY STATE
    # -------------------------------------------------------------
    print("=" * 80)
    print("STEP 3: FINAL CLEANUP - TRUNCATING ALL 52 TABLES TO ZERO DATA")
    print("=" * 80)
    total_remaining = truncate_database()
    print(f"Final State Verified: Total Rows Remaining in Database = {total_remaining}")
    print("=" * 80)

    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
