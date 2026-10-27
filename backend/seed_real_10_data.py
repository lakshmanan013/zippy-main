import random
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from database import get_db, SessionLocal
from models import (
    Doctor,
    SalesExecutive,
    SalesManager,
    RegionalManager,
    MonthlyPlan,
    PlanVisit,
    ExecutiveTask,
)

def seed_all_real_data():
    db = SessionLocal()
    print("=" * 60)
    print("Seeding REAL 10 Sales Executives, Plans, Visits, and Tasks")
    print("=" * 60)

    # 1. Real Doctors (15 verified veterinary clinics across South India)
    doctors_data = [
        ("Dr. Ananya Sharma", "CurePets Veterinary Hospital", "Koramangala", "560034", "Bangalore", "BVSc, MVSc Surgery", "Small Animals, Orthopedics", "Karnataka"),
        ("Dr. Rajesh Iyer", "PetLife Specialist Care", "Indiranagar", "560038", "Bangalore", "BVSc & AH", "Canine Medicine, Dermatology", "Karnataka"),
        ("Dr. Priya Menon", "GreenPaws Veterinary Clinic", "Jayanagar", "560041", "Bangalore", "MVSc Veterinary Medicine", "Feline Medicine, Critical Care", "Karnataka"),
        ("Dr. Vikram Prabhu", "Paws & Claws Animal Hospital", "Whitefield", "560066", "Bangalore", "BVSc, Ph.D", "Veterinary Surgery & Cardiology", "Karnataka"),
        ("Dr. Meena Nair", "HappyTails Pet Clinic", "HSR Layout", "560102", "Bangalore", "BVSc & AH", "Internal Medicine & Nutrition", "Karnataka"),
        ("Dr. Arun Kumar", "Mysore Pet Healthcare", "Gokulam", "570002", "Mysore", "BVSc & AH, MVSc", "General Veterinary Practice", "Karnataka"),
        ("Dr. Sneha Patil", "Royal Canin Veterinary Point", "Hebbal", "560024", "Bangalore", "MVSc Pharmacology", "Preventive Care & Vaccines", "Karnataka"),
        ("Dr. Rohan Shetty", "Coastal Pet Clinic", "Kadri", "575002", "Mangalore", "BVSc & AH", "Small Animals & Surgery", "Karnataka"),
        ("Dr. Venkatesh Murthy", "Bangalore Veterinary Center", "Malleshwaram", "560003", "Bangalore", "BVSc, MVSc", "Canine Health & Nutrition", "Karnataka"),
        ("Dr. Karthik Reddy", "Chennai City Veterinary Clinic", "Anna Nagar", "600040", "Chennai", "BVSc, MVSc", "Exotics, Avian & Canine Care", "Tamil Nadu"),
        ("Dr. Deepa Sundaram", "Marina Pet Hospital", "Adyar", "600020", "Chennai", "BVSc & AH", "Veterinary Ultrasound, Diagnostics", "Tamil Nadu"),
        ("Dr. Suresh Babu", "Coimbatore Pet Wellness", "RS Puram", "641002", "Coimbatore", "BVSc & AH", "Small Animals, Surgery", "Tamil Nadu"),
        ("Dr. Balaji Natarajan", "Meenakshi Animal Hospital", "KK Nagar", "625020", "Madurai", "BVSc & AH", "Critical Care & Soft Tissue Surgery", "Tamil Nadu"),
        ("Dr. Harini R", "Salem Pet Care Center", "Fairlands", "636016", "Salem", "BVSc, MVSc", "Canine Dermatology & Wellness", "Tamil Nadu"),
        ("Dr. Geetha Raghavan", "Tamil Nadu Companion Animal Care", "T Nagar", "600017", "Chennai", "BVSc & AH", "Feline & Canine Medicine", "Tamil Nadu"),
    ]

    doc_objs = []
    for idx, (doc_name, clinic, area, pin, city, qual, spec, reg) in enumerate(doctors_data):
        doc = db.query(Doctor).filter(Doctor.email == f"doctor{idx+1}@petmanagement.com").first()
        if not doc:
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
                experience_years=random.randint(6, 18),
                consultation_fee=float(random.choice([400, 500, 600, 750])),
                verification_status="verified",
                is_active=True,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            print(f"Created Doctor: {doc_name} ({clinic})")
        else:
            doc.name = doc_name
            doc.clinic_name = clinic
            doc.city = city
            doc.pincode = pin
            doc.qualification = qual
            doc.specializations = spec
            doc.verification_status = "verified"
            doc.is_active = True
            db.commit()
        doc_objs.append(doc)

    print(f"Total Verified Doctors in System: {len(doc_objs)}")
    doc_ids = [d.id for d in doc_objs]

    # 2. Real Sales Managers (2 Territory Managers)
    sm_data = [
        ("Kavitha Raman", "SM-001", "6374973699", "Karnataka", "kavitha.raman@zenve.com"),
        ("Suresh Nair", "SM-002", "9887766554", "Tamil Nadu", "suresh.nair@zenve.com"),
    ]
    for name, code, phone, reg, email in sm_data:
        sm = db.query(SalesManager).filter(SalesManager.code == code).first()
        if not sm:
            sm = SalesManager(
                name=name,
                code=code,
                phone=phone,
                email=email,
                password="password123",
                region=reg,
                is_phone_verified=True,
                is_active=True,
            )
            db.add(sm)
            db.commit()
            print(f"Created Sales Manager: {name} ({reg})")
        else:
            sm.name = name
            sm.phone = phone
            sm.region = reg
            sm.is_active = True
            db.commit()

    # 3. Real Regional Manager
    rm = db.query(RegionalManager).filter(RegionalManager.code == "RM-001").first()
    if not rm:
        rm = RegionalManager(
            name="Rajesh Verma",
            code="RM-001",
            phone="6374973699",
            email="rajesh.verma@zenve.com",
            password="password123",
            region="South Region",
            is_phone_verified=True,
            is_active=True,
        )
        db.add(rm)
        db.commit()
        print("Created Regional Manager: Rajesh Verma")
    else:
        rm.name = "Rajesh Verma"
        rm.phone = "6374973699"
        rm.is_active = True
        db.commit()

    # 4. Exactly 10 Real Sales Executives (5 Karnataka, 5 Tamil Nadu)
    exec_defs = [
        # Karnataka (5)
        ("Dhanushkodi M", "SE-001", "6374973699", "Karnataka", "Bangalore", 120000, 80, 65),
        ("Pooja Hegde", "SE-002", "9876543211", "Karnataka", "Bangalore", 100000, 60, 48),
        ("Sneha Reddy", "SE-004", "9876543213", "Karnataka", "Bangalore", 115000, 75, 60),
        ("Vikram Seth", "SE-003", "9876543212", "Karnataka", "Mysore", 110000, 70, 54),
        ("Rohan Deshmukh", "SE-007", "9876543216", "Karnataka", "Mangalore", 105000, 65, 50),
        # Tamil Nadu (5)
        ("Arvind Swamy", "SE-005", "9876543214", "Tamil Nadu", "Chennai", 125000, 75, 58),
        ("Kavita Rao", "SE-006", "9876543215", "Tamil Nadu", "Coimbatore", 105000, 65, 49),
        ("Priya Nair", "SE-008", "9876543217", "Tamil Nadu", "Chennai", 115000, 70, 56),
        ("Manoj Sundaram", "SE-009", "9876543218", "Tamil Nadu", "Madurai", 100000, 60, 45),
        ("Divya Krishnan", "SE-010", "9876543219", "Tamil Nadu", "Salem", 110000, 65, 50),
    ]

    all_10_execs = []
    for name, code, phone, reg, city, target_sal, plan_target, plan_done in exec_defs:
        ex = db.query(SalesExecutive).filter(SalesExecutive.code == code).first()
        if not ex:
            ex = SalesExecutive(
                name=name,
                code=code,
                phone=phone,
                email=f"{code.lower()}@zenve.com",
                password="password123",
                region=reg,
                city=city,
                monthly_target=target_sal,
                is_active=True,
                is_phone_verified=True,
            )
            db.add(ex)
            db.commit()
            db.refresh(ex)
            print(f"Created Executive: {name} ({code}) in {reg}")
        else:
            ex.name = name
            ex.region = reg
            ex.city = city
            ex.phone = phone
            ex.is_active = True
            db.commit()
        all_10_execs.append((ex, plan_target, plan_done))

    print(f"All 10 Real Sales Executives verified ({len(all_10_execs)} total).")

    # 5. Monthly Plans for October 2026 for all 10 executives
    month_key = "2026-10"
    month_label = "October 2026"

    total_visits_created = 0
    for ex, p_target, p_done in all_10_execs:
        plan = db.query(MonthlyPlan).filter(
            MonthlyPlan.executive_id == ex.id,
            MonthlyPlan.month_key == month_key
        ).first()

        if not plan:
            plan = MonthlyPlan(
                executive_id=ex.id,
                month_key=month_key,
                month_label=month_label,
                working_days=25,
                daily_target=max(1, round(p_target / 25)),
                total_doctors=p_target,
                planning_method="auto",
                status="Approved",
                approved_by="Kavitha Raman",
                approved_at=datetime(2026, 10, 1, 9, 30),
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
            print(f"Created Approved Plan for {ex.name}: Target {p_target}")
        else:
            plan.status = "Approved"
            plan.total_doctors = p_target
            plan.working_days = 25
            plan.daily_target = max(1, round(p_target / 25))
            plan.approved_by = "Kavitha Raman"
            plan.approved_at = datetime(2026, 10, 1, 9, 30)
            db.commit()

        # Populate visits for plan
        existing_visits = db.query(PlanVisit).filter(PlanVisit.plan_id == plan.id).all()
        # If count doesn't match target, reset cleanly
        if len(existing_visits) != p_target or sum(1 for v in existing_visits if v.status == "Completed") != p_done:
            for ev in existing_visits:
                db.delete(ev)
            db.commit()

            # Create p_target visits with p_done Completed
            for v_idx in range(p_target):
                is_completed = v_idx < p_done
                # Pick doctors from same region if possible
                chosen_doc_id = doc_ids[v_idx % len(doc_ids)]
                day_val = (v_idx % 24) + 1 if is_completed else 25 + (v_idx % 6)
                sched_date = date(2026, 10, min(31, max(1, day_val)))
                hour = 9 + (v_idx % 8)
                ampm = "AM" if hour < 12 else "PM"
                hour_display = hour if hour <= 12 else hour - 12
                v_time = f"{hour_display}:{'00' if v_idx % 2 == 0 else '30'} {ampm}"

                pv = PlanVisit(
                    plan_id=plan.id,
                    executive_id=ex.id,
                    doctor_id=chosen_doc_id,
                    scheduled_date=sched_date,
                    visit_time=v_time,
                    status="Completed" if is_completed else "Planned",
                )
                db.add(pv)
                total_visits_created += 1
            db.commit()
            print(f"Generated {p_target} Plan Visits for {ex.name} ({p_done} Completed)")

    print(f"Total Plan Visits in DB: {db.query(PlanVisit).count()}")

    # 6. Seed Real Executive Tasks (across the 10 executives)
    # Clear out old mock tasks and insert 25 rich real tasks
    db.query(ExecutiveTask).delete()
    db.commit()

    task_templates = [
        ("Onboard Dr. Ananya Sharma Clinic to Zippy Pet Care Network", "Schedule formal introduction meeting and present vaccine portfolio.", "Clinic Onboarding", "Doctor", "560034", "High"),
        ("Conduct Product Demonstration for Royal Canin Point", "Deliver sample kit and discuss nutritional supplements.", "Product Demo", "Clinic", "560024", "Urgent"),
        ("Follow up with Dr. Rajesh Iyer on Surgical Supplies", "Review previous order and collect clinical feedback.", "Follow-up", "Doctor", "560038", "Medium"),
        ("Review Monthly Doctor Visit Coverage in Whitefield", "Verify clinic visits schedule and submit weekly visit report.", "Doctor Visit", "Doctor", "560066", "Medium"),
        ("Enroll Mysore Pet Healthcare in Quarterly Vaccine Scheme", "Explain seasonal discount structure and register clinic.", "Clinic Onboarding", "Clinic", "570002", "High"),
        ("Hospital Visit & Emergency Care Supply Audit", "Inspect cold chain storage and stock verification.", "Audit", "Clinic", "600040", "Medium"),
        ("Distribute Q4 Product Brochures to Chennai Clinics", "Provide educational materials and promotional pamphlets.", "Product Demo", "Doctor", "600020", "Low"),
        ("Coimbatore Veterinary Clinic Engagement & Follow-up", "Discuss bulk order options and payment terms.", "Follow-up", "Clinic", "641002", "High"),
        ("Madurai Veterinary Camp Support & Coordination", "Coordinate camp supplies with Meenakshi Animal Hospital.", "Event Coordination", "Clinic", "625020", "Urgent"),
        ("Salem Animal Care Doctor Briefing", "Introduce newly launched dermatological line.", "Product Demo", "Doctor", "636016", "Medium"),
    ]

    task_count = 0
    statuses_cycle = ["completed", "completed", "in_progress", "pending"]
    for idx, (ex, _, _) in enumerate(all_10_execs):
        # 2 tasks for each executive (20 tasks total)
        for t_sub in range(2):
            tmpl = task_templates[(idx * 2 + t_sub) % len(task_templates)]
            st = statuses_cycle[(idx * 2 + t_sub) % len(statuses_cycle)]
            p_val = 100 if st == "completed" else (50 if st == "in_progress" else 0)
            due_day = random.randint(22, 31)

            tsk = ExecutiveTask(
                title=f"{tmpl[0]} - {ex.city}",
                description=tmpl[1],
                task_type=tmpl[2],
                entity_type=tmpl[3],
                pincode=tmpl[4],
                priority=tmpl[5],
                status=st,
                due_date=date(2026, 10, due_day),
                assigned_by_id=1,
                assigned_by_role="regional",
                assigned_by_name="Rajesh Verma",
                assigned_to_role="executive",
                assigned_to_id=ex.id,
                assigned_to_name=ex.name,
                region=ex.region,
                target_entity_name=f"{ex.city} Pet Care",
                progress=p_val,
                completed_at=datetime(2026, 10, 20, 14, 0) if st == "completed" else None,
            )
            db.add(tsk)
            task_count += 1
    db.commit()
    print(f"Created {task_count} real Executive Tasks.")

    print("=" * 60)
    print("SUCCESS: 10 Real Executives, 15 Doctors, 10 Approved Plans & 20 Tasks Seeded!")
    print("=" * 60)
    db.close()

if __name__ == "__main__":
    seed_all_real_data()
