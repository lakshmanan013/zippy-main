import random
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from database import get_db
from models import (
    Doctor,
    SalesExecutive,
    SalesManager,
    RegionalManager,
    MonthlyPlan,
    PlanVisit,
    ExecutiveTask,
)

def seed_data():
    db = next(get_db())
    print("Seeding rich dashboard data for October 2026...")

    # 1. Seed Veterinary Doctors if none or few exist
    existing_docs = db.query(Doctor).all()
    sample_doctors_info = [
        ("Dr. Ananya Sharma", "CurePets Veterinary Hospital", "Koramangala", "560034", "Bangalore", "BVSc, MVSc Surgery", "Small Animals, Orthopedics"),
        ("Dr. Rajesh Iyer", "PetLife Specialist Care", "Indiranagar", "560038", "Bangalore", "BVSc & AH", "Canine Medicine, Dermatology"),
        ("Dr. Priya Menon", "GreenPaws Veterinary Clinic", "Jayanagar", "560041", "Bangalore", "MVSc Veterinary Medicine", "Feline Medicine, Critical Care"),
        ("Dr. Vikram Prabhu", "Paws & Claws Animal Hospital", "Whitefield", "560066", "Bangalore", "BVSc, Ph.D", "Veterinary Surgery & Cardiology"),
        ("Dr. Meena Nair", "HappyTails Pet Clinic", "HSR Layout", "560102", "Bangalore", "BVSc & AH", "Internal Medicine & Nutrition"),
        ("Dr. Arun Kumar", "Mysore Pet Healthcare", "Gokulam", "570002", "Mysore", "BVSc & AH, MVSc", "General Veterinary Practice"),
        ("Dr. Sneha Patil", "Royal Canin Veterinary Point", "Hebbal", "560024", "Bangalore", "MVSc Pharmacology", "Preventive Care & Vaccines"),
        ("Dr. Karthik Reddy", "Chennai City Veterinary Clinic", "Anna Nagar", "600040", "Chennai", "BVSc, MVSc", "Exotics, Avian & Canine Care"),
        ("Dr. Deepa Sundaram", "Marina Pet Hospital", "Adyar", "600020", "Chennai", "BVSc & AH", "Veterinary Ultrasound, Diagnostics"),
        ("Dr. Suresh Babu", "Coimbatore Pet Wellness", "RS Puram", "641002", "Coimbatore", "BVSc & AH", "Small Animals, Surgery"),
    ]

    doctor_objs = []
    if len(existing_docs) < 8:
        for idx, (doc_name, clinic, area, pin, city, qual, spec) in enumerate(sample_doctors_info):
            doc = Doctor(
                name=doc_name,
                email=f"doctor{idx+1}@petmanagement.com",
                phone=f"98840{idx+10000}",
                qualification=qual,
                specializations=spec,
                pincode=pin,
                city=city,
                clinic_name=clinic,
                facility_type="Clinic",
                experience_years=random.randint(5, 18),
                consultation_fee=float(random.choice([400, 500, 600, 750])),
                verification_status="verified",
                is_active=True,
            )
            db.add(doc)
            doctor_objs.append(doc)
        db.commit()
        print(f"Added {len(doctor_objs)} veterinary doctors.")
    else:
        doctor_objs = existing_docs
        print(f"Existing {len(doctor_objs)} doctors found.")

    # Refresh doctors list from DB
    doctor_objs = db.query(Doctor).all()
    doc_ids = [d.id for d in doctor_objs]

    # 2. Ensure We Have 6 Sales Executives (for testing 5-item pagination)
    exec_defs = [
        ("Dhanushkodi M", "SE-001", "6374973699", "Karnataka", "Bangalore", 120000),
        ("Pooja Hegde", "SE-002", "9876543211", "Karnataka", "Bangalore", 100000),
        ("Vikram Seth", "SE-003", "9876543212", "Karnataka", "Mysore", 110000),
        ("Sneha Reddy", "SE-004", "9876543213", "Karnataka", "Bangalore", 115000),
        ("Arvind Swamy", "SE-005", "9876543214", "Tamil Nadu", "Chennai", 125000),
        ("Kavita Rao", "SE-006", "9876543215", "Tamil Nadu", "Coimbatore", 105000),
    ]

    exec_map = {}
    for name, code, phone, reg, city, target in exec_defs:
        ex = db.query(SalesExecutive).filter(SalesExecutive.code == code).first()
        if not ex:
            ex = SalesExecutive(
                name=name,
                code=code,
                phone=phone,
                email=f"{code.lower()}@petmanagement.com",
                password="123456",
                region=reg,
                city=city,
                monthly_target=target,
                is_active=True,
                is_phone_verified=True,
            )
            db.add(ex)
            db.commit()
            db.refresh(ex)
            print(f"Added executive {code}: {name} ({reg})")
        else:
            exec_map[code] = ex
    
    all_execs = db.query(SalesExecutive).filter(SalesExecutive.is_active == True).all()
    print(f"Total active sales executives: {len(all_execs)}")

    # 3. Seed Monthly Plans for October 2026 (month_key = '2026-10')
    month_key = "2026-10"
    month_label = "October 2026"

    # Plan parameters per executive (total target visits, completed visits target)
    exec_plan_configs = {
        "SE-001": {"target": 30, "completed": 24, "status": "Approved"},  # 80%
        "SE-002": {"target": 28, "completed": 21, "status": "Approved"},  # 75%
        "SE-003": {"target": 25, "completed": 19, "status": "Approved"},  # 76%
        "SE-004": {"target": 32, "completed": 26, "status": "Approved"},  # 81%
        "SE-005": {"target": 26, "completed": 18, "status": "Approved"},  # 69%
        "SE-006": {"target": 24, "completed": 17, "status": "Approved"},  # 71%
    }

    total_created_visits = 0
    for ex in all_execs:
        cfg = exec_plan_configs.get(ex.code, {"target": 25, "completed": 18, "status": "Approved"})
        target_count = cfg["target"]
        completed_count = cfg["completed"]

        # Check existing plan
        plan = db.query(MonthlyPlan).filter(
            MonthlyPlan.executive_id == ex.id,
            MonthlyPlan.month_key == month_key
        ).first()

        if not plan:
            plan = MonthlyPlan(
                executive_id=ex.id,
                month_key=month_key,
                month_label=month_label,
                working_days=24,
                daily_target=int(round(target_count / 24)) or 2,
                total_doctors=target_count,
                planning_method="auto",
                status=cfg["status"],
                approved_by="Kavitha Raman",
                approved_at=datetime(2026, 10, 1, 9, 30),
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
            print(f"Created Monthly Plan {plan.id} for {ex.name} ({ex.code}): Target {target_count} visits")
        else:
            plan.status = cfg["status"]
            plan.total_doctors = target_count
            plan.approved_by = "Kavitha Raman"
            db.commit()

        # Check visits for this plan
        existing_visits = db.query(PlanVisit).filter(PlanVisit.plan_id == plan.id).all()
        if len(existing_visits) < target_count:
            # Delete any existing incomplete ones to repopulate cleanly
            for ev in existing_visits:
                db.delete(ev)
            db.commit()

            # Create target_count visits
            for i in range(target_count):
                # Pick doctor
                chosen_doc_id = doc_ids[i % len(doc_ids)]
                # Day in October (between 1 and 26 for completed, up to 31 for planned)
                is_done = i < completed_count
                day_num = random.randint(1, 24) if is_done else random.randint(25, 31)
                sched_date = date(2026, 10, day_num)
                
                pv = PlanVisit(
                    plan_id=plan.id,
                    executive_id=ex.id,
                    doctor_id=chosen_doc_id,
                    scheduled_date=sched_date,
                    visit_time=f"{random.randint(9, 16)}:{random.choice(['00', '30'])} {'AM' if random.randint(9, 16) < 12 else 'PM'}",
                    status="Completed" if is_done else "Planned",
                )
                db.add(pv)
                total_created_visits += 1

            db.commit()
            print(f"Generated {target_count} visits ({completed_count} completed) for {ex.name}")

    print(f"Successfully seeded monthly plans and {total_created_visits} plan visits for October 2026!")

if __name__ == "__main__":
    seed_data()
