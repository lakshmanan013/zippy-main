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

def reverse_geocode(lat: Optional[float], lon: Optional[float]) -> dict:
    result = {
        "street": "",
        "route": "",
        "area": "",
        "area_street": "",
        "village": "",
        "taluk": "",
        "city": "",
        "district": "",
        "state": "",
        "pincode": "",
        "country": "India"
    }
    if lat is None or lon is None:
        return result

   
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=jsonv2&zoom=18&addressdetails=1&accept-language=en"
        headers = {"User-Agent": "ZenveZippyCRM/1.0"}
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            addr = data.get("address", {})
            village = addr.get("village") or addr.get("hamlet") or addr.get("isolated_dwelling") or ""
            taluk = addr.get("subdistrict") or addr.get("tehsil") or addr.get("taluk") or addr.get("mandal") or addr.get("county") or ""
            route = addr.get("road") or addr.get("street") or addr.get("pedestrian") or ""
            house_number = addr.get("house_number") or ""
            street = f"{house_number} {route}".strip() if house_number and route else route
            quarter = addr.get("quarter") or ""
            suburb = addr.get("suburb") or ""
            neighbourhood = addr.get("neighbourhood") or ""
            residential = addr.get("residential") or ""
            commercial = addr.get("commercial") or ""
            city = addr.get("city") or addr.get("town") or addr.get("municipality") or addr.get("city_district") or ""
            district = addr.get("state_district") or addr.get("district") or addr.get("county") or ""
            state = addr.get("state") or ""
            pincode = addr.get("postcode") or ""
            country = addr.get("country") or "India"

            district = district.replace(" District", "").replace(" district", "").strip()
            if taluk:
                taluk = taluk.replace(" District", "").strip()

            
            area = quarter or neighbourhood or suburb or residential or commercial or village or street or addr.get("locality") or ""
            if area and city and area.lower() == city.lower() and not village:
                area = ""

            area_street = f"{area}, {street}" if area and street and area.lower() != street.lower() else (area or street or village)

            result["street"] = street
            result["route"] = route
            result["village"] = village
            result["taluk"] = taluk
            result["area"] = area
            result["area_street"] = area_street
            result["city"] = city
            result["district"] = district or city
            result["state"] = state
            result["pincode"] = pincode
            result["country"] = country

            if result["area"] or result["village"] or result["taluk"] or result["city"]:
                print(f"[Backend Geocode] OSM resolved: {lat},{lon} -> Area: {result['area']}, Street: {result['street']}, Taluk: {result['taluk']}, City: {result['city']}, District: {result['district']}")
                return result
    except Exception as e:
        print("[Backend Geocode] OSM notice:", e)

   
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        r = requests.get(url, timeout=5)
        if r.status_code == 200:
            data = r.json()
            locality = data.get("locality") or ""
            city = data.get("city") or ""
            state = data.get("principalSubdivision") or ""
            pincode = data.get("postcode") or ""
            country = data.get("countryName") or "India"

            district = ""
            taluk = ""
            village = ""
            area = ""
            route = ""

            for item in data.get("localityInfo", {}).get("administrative", []):
                name = item.get("name", "").strip()
                desc = item.get("description","").lower()
                if not district and ("district" in desc or "county" in desc):
                    district = name.replace(" district", "").replace(" District", "").strip()
                if not taluk and any(w in desc for w in ["taluk", "tehsil", "subdistrict", "mandal"]):
                    taluk = name.strip()
                if not village and any(w in desc for w in ["village", "hamlet"]):
                    village = name.strip()

            for item in data.get("localityInfo", {}).get("informative", []):
                name = item.get("name", "")
                desc = item.get("description", "").lower()
                if not village and any(w in desc for w in ["village", "hamlet"]):
                    village = name.strip()
                if not area and any(w in desc for w in ["neighbourhood", "suburb", "locality", "quarter"]):
                    area = name.strip()
                if not route and any(w in desc for w in ["road", "street", "route", "way", "lane", "avenue"]):
                    route = name.strip()

            village = village or locality or ""
            taluk = taluk or ""
            district = district or ""
            city = city or locality or district or ""
            area = area or village or locality or route or ""
            if area and city and area.lower() == city.lower() and not village:
                area = ""
            street = route or ""
            area_street = f"{area}, {street}" if area and street and area.lower() != street.lower() else (area or street or village)

            result["street"] = street
            result["route"] = route
            result["village"] = village
            result["taluk"] = taluk
            result["area"] = area
            result["area_street"] = area_street
            result["city"] = city
            result["district"] = district
            result["state"] = state
            result["pincode"] = pincode
            result["country"] = country

            if result["area"] or result["city"] or result["village"]:
                print(f"[Backend Geocode] BDC resolved: {lat},{lon} -> Area+Street: {result['area_street']}, City: {result['city']}, District: {result['district']}, State: {result['state']}")
                return result
    except Exception as e:
        print("[Backend Geocode] BDC fallback notice:", e)

    return result

@router.get("/reverse-geocode")
def api_reverse_geocode(lat: float | None = None, lng: float | None = None, q: str | None = None):
  
    if q and (lat is None or lng is None):
        return api_search_location(q)

   
    if lat is None or lng is None:
        raise HTTPException(400, "Latitude and longitude query parameters are required")
    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(400, "Latitude must be between -90 and 90 degrees")
    if not (-180.0 <= lng <= 180.0):
        raise HTTPException(400, "Longitude must be between -180 and 180 degrees")

    geo = reverse_geocode(lat, lng)

    parts = []
    primary = geo.get("village") or geo.get("area")
    if primary:
        parts.append(primary)
    if geo.get("taluk") and geo.get("taluk") not in parts and geo.get("taluk") != geo.get("city"):
        parts.append(geo["taluk"])
    if geo.get("city") and geo.get("city") not in parts:
        parts.append(geo["city"])
    if geo.get("district") and geo.get("district") not in parts:
        parts.append(geo["district"])
    if geo.get("state") and geo.get("state") not in parts:
        parts.append(geo["state"])

    display_addr = ", ".join(parts) if parts else f"{lat:.6f}, {lng:.6f}"
    if geo.get("pincode"):
        display_addr += f" - {geo['pincode']}"

    return {
        **geo,
        "display_address": display_addr,
        "formatted_address": display_addr,
        "full_address": f"{display_addr}, {geo.get('country', 'India')}"
    }

@router.get("/reverse-geocode/search")
def api_search_location(q: str):
    if not q or len(q.strip()) < 2:
        return []
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": q.strip(),
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": 8,
            "countrycodes": "in"
        }
        headers = {"User-Agent": "ZippyCRM-AttendanceApp/1.0 (contact@zippy.in)"}
        r = requests.get(url, params=params, headers=headers, timeout=6)
        if r.status_code == 200:
            items = r.json()
            results = []
            for it in items:
                lat_val = float(it["lat"])
                lng_val = float(it["lon"])
                addr = it.get("address", {})
                village = addr.get("village") or addr.get("hamlet") or addr.get("isolated_dwelling") or ""
                taluk = addr.get("subdistrict") or addr.get("tehsil") or addr.get("taluk") or addr.get("mandal") or addr.get("county") or ""
                route = addr.get("road") or addr.get("street") or addr.get("pedestrian") or ""
                quarter = addr.get("quarter") or ""
                suburb = addr.get("suburb") or ""
                neighbourhood = addr.get("neighbourhood") or ""
                residential = addr.get("residential") or ""
                city = addr.get("city") or addr.get("town") or addr.get("municipality") or addr.get("city_district") or ""
                district = (addr.get("state_district") or addr.get("district") or addr.get("county") or "").replace(" District", "").strip()
                state = addr.get("state") or ""
                pincode = addr.get("postcode") or ""
                
                area = quarter or neighbourhood or suburb or residential or village or it.get("name") or route or addr.get("locality") or ""
                if area and city and area.lower() == city.lower() and not village:
                    area = ""

                parts = [p for p in [area or village, route, taluk, city, district, state] if p]
                disp = ", ".join(parts) if parts else it.get("display_name", "")
                if pincode and pincode not in disp:
                    disp += f" - {pincode}"

                results.append({
                    "display_name": disp,
                    "latitude": lat_val,
                    "longitude": lng_val,
                    "street": route,
                    "route": route,
                    "village": village,
                    "taluk": taluk,
                    "area": area or village,
                    "area_street": f"{area}, {route}" if area and route and area.lower() != route.lower() else (area or route or village),
                    "areaStreet": f"{area}, {route}" if area and route and area.lower() != route.lower() else (area or route or village),
                    "city": city,
                    "district": district,
                    "state": state,
                    "pincode": pincode,
                    "country": addr.get("country", "India")
                })
            return results
    except Exception as e:
        print("[Geocode Search Error]", e)
    return []

def validate_location_payload(req: AttendanceActionRequest):
    """Step 11: Validates that location coordinates and accuracy are within valid physical ranges."""
    if req.latitude is None or req.longitude is None:
        raise HTTPException(400, "Latitude and longitude are required for attendance location")
    try:
        lat = float(req.latitude)
        lng = float(req.longitude)
    except (ValueError, TypeError):
        raise HTTPException(400, "Latitude and longitude must be valid floating point numbers")

    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(400, "Latitude must be between -90 and 90 degrees")
    if not (-180.0 <= lng <= 180.0):
        raise HTTPException(400, "Longitude must be between -180 and 180 degrees")

    acc = req.accuracy if req.accuracy is not None else req.location_accuracy
    if acc is not None:
        try:
            acc_val = float(acc)
            if acc_val < 0:
                raise HTTPException(400, "Accuracy cannot be negative")
        except (ValueError, TypeError):
            raise HTTPException(400, "Accuracy must be a valid numeric value")

def save_base64_image(b64_str: str) -> str:
    if not b64_str: return ""
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",")[1]
        img_data = base64.b64decode(b64_str)
        filename = f"{uuid.uuid4().hex}.jpg"
        filepath = os.path.join("uploads", filename)
        with open(filepath, "wb") as f:
            f.write(img_data)
        return f"/uploads/{filename}"
    except Exception as e:
        print("Image save error:", e)
        return ""

def _execute_punch_in(req: AttendanceActionRequest, db: Session):
    exec_id = req.sales_executive_id or req.executive_id or req.employee_id
    if not exec_id:
        raise HTTPException(400, "sales_executive_id or executive_id is required")

    exec_record = db.query(SalesExecutive).filter(SalesExecutive.id == exec_id).first()
    if not exec_record:
        raise HTTPException(404, "Sales Executive not found")

    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    existing = db.query(Attendance).filter(Attendance.executive_id == exec_id, Attendance.attendance_date == today).first()
    if existing:
        raise HTTPException(400, "Already logged in / punched in for today")

    validate_location_payload(req)

    geo = reverse_geocode(req.latitude, req.longitude)
    village = req.village or geo.get("village") or ""
    taluk = req.taluk or geo.get("taluk") or ""
    street = req.street or geo.get("street") or ""
    area_street = req.area_street or (f"{req.area}, {street}" if req.area and street and req.area.lower() != street.lower() else req.area) or geo.get("area_street") or ""
    area = area_street or req.area or geo.get("area") or village or ""
    city = req.city or geo.get("city") or ""
    district = req.district or geo.get("district") or ""
    state = req.state or geo.get("state") or ""
    country = req.country or geo.get("country") or "India"
    pincode = req.pincode or req.pin or geo.get("pincode") or ""
    accuracy = req.accuracy if req.accuracy is not None else req.location_accuracy
    loc_source = req.location_source or "BROWSER_GPS"

    parts = [p for p in [area or village, taluk, city, district, state] if p]
    formatted_addr = req.formatted_address or req.full_address or (", ".join(parts) if parts else f"{req.latitude:.6f}, {req.longitude:.6f}")
    if pincode and pincode not in formatted_addr:
        formatted_addr += f" - {pincode}"

    selfie_url = req.selfie_url or (save_base64_image(req.selfie_data) if req.selfie_data else "")
    now = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)

    print(f"[Attendance Punch In] Exec {exec_id} ({exec_record.name}) at {now} | Lat: {req.latitude}, Lng: {req.longitude}, Acc: {accuracy}m, Source: {loc_source} | Area+Street: {area}, City: {city}, District: {district}, State: {state}, PIN: {pincode}")

    att = Attendance(
        executive_id=exec_id,
        attendance_date=today,
        login_time=now,
        login_latitude=req.latitude,
        login_longitude=req.longitude,
        login_accuracy=accuracy,
        login_area=area,
        login_village=village,
        login_taluk=taluk,
        login_city=city,
        login_district=district,
        login_state=state,
        login_country=country,
        login_pincode=pincode,
        login_location_source=loc_source,
        login_formatted_address=formatted_addr,
        punch_in_time=now,
        punch_in_latitude=req.latitude,
        punch_in_longitude=req.longitude,
        punch_in_accuracy=accuracy,
        punch_in_area=area,
        punch_in_village=village,
        punch_in_taluk=taluk,
        punch_in_city=city,
        punch_in_district=district,
        punch_in_state=state,
        punch_in_country=country,
        punch_in_pincode=pincode,
        punch_in_location_source=loc_source,
        punch_in_formatted_address=formatted_addr,
        login_selfie_url=selfie_url,
        status="LOGGED_IN"
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return plan_response(att)

def _execute_lunch_out(req: AttendanceActionRequest, db: Session):
    exec_id = req.sales_executive_id or req.executive_id or req.employee_id
    if not exec_id:
        raise HTTPException(400, "sales_executive_id or executive_id is required")

    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    att: Any = db.query(Attendance).filter(Attendance.executive_id == exec_id, Attendance.attendance_date == today).first()
    if not att:
        raise HTTPException(400, "No active login found for today")
    if att.status == "LOGGED_OUT":
        raise HTTPException(400, "Already logged out")
    if att.lunch_out_time:
        raise HTTPException(400, "Already recorded lunch out")

    validate_location_payload(req)

    geo = reverse_geocode(req.latitude, req.longitude)
    village = req.village or geo.get("village") or ""
    taluk = req.taluk or geo.get("taluk") or ""
    street = req.street or geo.get("street") or ""
    area_street = req.area_street or (f"{req.area}, {street}" if req.area and street and req.area.lower() != street.lower() else req.area) or geo.get("area_street") or ""
    area = area_street or req.area or geo.get("area") or village or ""
    city = req.city or geo.get("city") or ""
    district = req.district or geo.get("district") or ""
    state = req.state or geo.get("state") or ""
    country = req.country or geo.get("country") or "India"
    pincode = req.pincode or req.pin or geo.get("pincode") or ""
    accuracy = req.accuracy if req.accuracy is not None else req.location_accuracy
    loc_source = req.location_source or "BROWSER_GPS"

    parts = [p for p in [area or village, taluk, city, district, state] if p]
    formatted_addr = req.formatted_address or req.full_address or (", ".join(parts) if parts else f"{req.latitude:.6f}, {req.longitude:.6f}")
    if pincode and pincode not in formatted_addr:
        formatted_addr += f" - {pincode}"

    selfie_url = req.selfie_url or (save_base64_image(req.selfie_data) if req.selfie_data else "")
    now = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)

    print(f"[Attendance Lunch Out] Exec {exec_id} at {now} | Lat: {req.latitude}, Lng: {req.longitude}, Acc: {accuracy}m, Source: {loc_source} | Area+Street: {area}, City: {city}, District: {district}, PIN: {pincode}")

    att.lunch_out_time = now
    att.lunch_out_latitude = req.latitude
    att.lunch_out_longitude = req.longitude
    att.lunch_out_accuracy = accuracy
    att.lunch_out_area = area
    att.lunch_out_village = village
    att.lunch_out_taluk = taluk
    att.lunch_out_city = city
    att.lunch_out_district = district
    att.lunch_out_state = state
    att.lunch_out_country = country
    att.lunch_out_pincode = pincode
    att.lunch_out_location_source = loc_source
    att.lunch_out_formatted_address = formatted_addr
    if selfie_url:
        att.lunch_out_selfie_url = selfie_url
    att.status = "LUNCH_OUT"

    db.commit()
    db.refresh(att)
    return plan_response(att)

def _execute_lunch_in(req: AttendanceActionRequest, db: Session):
    exec_id = req.sales_executive_id or req.executive_id or req.employee_id
    if not exec_id:
        raise HTTPException(400, "sales_executive_id or executive_id is required")

    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    att: Any = db.query(Attendance).filter(Attendance.executive_id == exec_id, Attendance.attendance_date == today).first()
    if not att:
        raise HTTPException(400, "No active login found for today")
    if att.status == "LOGGED_OUT":
        raise HTTPException(400, "Already logged out")
    if not att.lunch_out_time:
        raise HTTPException(400, "Did not record lunch out yet")
    if att.lunch_in_time:
        raise HTTPException(400, "Already recorded lunch in")

    validate_location_payload(req)

    geo = reverse_geocode(req.latitude, req.longitude)
    village = req.village or geo.get("village") or ""
    taluk = req.taluk or geo.get("taluk") or ""
    street = req.street or geo.get("street") or ""
    area_street = req.area_street or (f"{req.area}, {street}" if req.area and street and req.area.lower() != street.lower() else req.area) or geo.get("area_street") or ""
    area = area_street or req.area or geo.get("area") or village or ""
    city = req.city or geo.get("city") or ""
    district = req.district or geo.get("district") or ""
    state = req.state or geo.get("state") or ""
    country = req.country or geo.get("country") or "India"
    pincode = req.pincode or req.pin or geo.get("pincode") or ""
    accuracy = req.accuracy if req.accuracy is not None else req.location_accuracy
    loc_source = req.location_source or "BROWSER_GPS"

    parts = [p for p in [area or village, taluk, city, district, state] if p]
    formatted_addr = req.formatted_address or req.full_address or (", ".join(parts) if parts else f"{req.latitude:.6f}, {req.longitude:.6f}")
    if pincode and pincode not in formatted_addr:
        formatted_addr += f" - {pincode}"

    selfie_url = req.selfie_url or (save_base64_image(req.selfie_data) if req.selfie_data else "")
    now = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)

    print(f"[Attendance Lunch In] Exec {exec_id} at {now} | Lat: {req.latitude}, Lng: {req.longitude}, Acc: {accuracy}m, Source: {loc_source} | Area+Street: {area}, City: {city}, District: {district}, PIN: {pincode}")

    att.lunch_in_time = now
    att.lunch_in_latitude = req.latitude
    att.lunch_in_longitude = req.longitude
    att.lunch_in_accuracy = accuracy
    att.lunch_in_area = area
    att.lunch_in_village = village
    att.lunch_in_taluk = taluk
    att.lunch_in_city = city
    att.lunch_in_district = district
    att.lunch_in_state = state
    att.lunch_in_country = country
    att.lunch_in_pincode = pincode
    att.lunch_in_location_source = loc_source
    att.lunch_in_formatted_address = formatted_addr
    if selfie_url:
        att.lunch_in_selfie_url = selfie_url
    att.status = "LOGGED_IN"

    db.commit()
    db.refresh(att)
    return plan_response(att)

def _execute_punch_out(req: AttendanceActionRequest, db: Session):
    exec_id = req.sales_executive_id or req.executive_id or req.employee_id
    if not exec_id:
        raise HTTPException(400, "sales_executive_id or executive_id is required")

    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    att: Any = db.query(Attendance).filter(Attendance.executive_id == exec_id, Attendance.attendance_date == today).first()
    if not att:
        raise HTTPException(400, "No active login found for today")
    if att.status == "LOGGED_OUT":
        raise HTTPException(400, "Already logged out")

    validate_location_payload(req)

    geo = reverse_geocode(req.latitude, req.longitude)
    village = req.village or geo.get("village") or ""
    taluk = req.taluk or geo.get("taluk") or ""
    street = req.street or geo.get("street") or ""
    area_street = req.area_street or (f"{req.area}, {street}" if req.area and street and req.area.lower() != street.lower() else req.area) or geo.get("area_street") or ""
    area = area_street or req.area or geo.get("area") or village or ""
    city = req.city or geo.get("city") or ""
    district = req.district or geo.get("district") or ""
    state = req.state or geo.get("state") or ""
    country = req.country or geo.get("country") or "India"
    pincode = req.pincode or req.pin or geo.get("pincode") or ""
    accuracy = req.accuracy if req.accuracy is not None else req.location_accuracy
    loc_source = req.location_source or "BROWSER_GPS"

    parts = [p for p in [area or village, taluk, city, district, state] if p]
    formatted_addr = req.formatted_address or req.full_address or (", ".join(parts) if parts else f"{req.latitude:.6f}, {req.longitude:.6f}")
    if pincode and pincode not in formatted_addr:
        formatted_addr += f" - {pincode}"

    selfie_url = req.selfie_url or (save_base64_image(req.selfie_data) if req.selfie_data else "")
    now = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)

    print(f"[Attendance Punch Out] Exec {exec_id} at {now} | Lat: {req.latitude}, Lng: {req.longitude}, Acc: {accuracy}m, Source: {loc_source} | Area+Street: {area}, City: {city}, District: {district}, PIN: {pincode}")

    att.logout_time = now
    att.logout_latitude = req.latitude
    att.logout_longitude = req.longitude
    att.logout_accuracy = accuracy
    att.logout_area = area
    att.logout_village = village
    att.logout_taluk = taluk
    att.logout_city = city
    att.logout_district = district
    att.logout_state = state
    att.logout_country = country
    att.logout_pincode = pincode
    att.logout_location_source = loc_source
    att.logout_formatted_address = formatted_addr

    att.punch_out_time = now
    att.punch_out_latitude = req.latitude
    att.punch_out_longitude = req.longitude
    att.punch_out_accuracy = accuracy
    att.punch_out_area = area
    att.punch_out_village = village
    att.punch_out_taluk = taluk
    att.punch_out_city = city
    att.punch_out_district = district
    att.punch_out_state = state
    att.punch_out_country = country
    att.punch_out_pincode = pincode
    att.punch_out_location_source = loc_source
    att.punch_out_formatted_address = formatted_addr

    if selfie_url:
        att.logout_selfie_url = selfie_url
    att.status = "LOGGED_OUT"

    if att.login_time:
        diff = now - att.login_time
        att.total_working_minutes = int(diff.total_seconds() / 60)

    db.commit()
    db.refresh(att)
    return plan_response(att)


@router.post("/attendance/punch-in")
@router.post("/api/attendance/punch-in")
@router.post("/api/attendance/login")
def attendance_punch_in(req: AttendanceActionRequest, db: Session = Depends(get_db)):
    return _execute_punch_in(req, db)

@router.post("/attendance/punch-out")
@router.post("/api/attendance/punch-out")
@router.post("/api/attendance/logout")
def attendance_punch_out(req: AttendanceActionRequest, db: Session = Depends(get_db)):
    return _execute_punch_out(req, db)

@router.post("/attendance/lunch-out")
@router.post("/api/attendance/lunch-out")
def attendance_lunch_out(req: AttendanceActionRequest, db: Session = Depends(get_db)):
    return _execute_lunch_out(req, db)

@router.post("/attendance/lunch-in")
@router.post("/api/attendance/lunch-in")
def attendance_lunch_in(req: AttendanceActionRequest, db: Session = Depends(get_db)):
    return _execute_lunch_in(req, db)

@router.post("/attendance/lunch")
def attendance_lunch(req: AttendanceActionRequest, db: Session = Depends(get_db)):
    action = (req.action or req.punch_type or "").lower()
    if "in" in action:
        return _execute_lunch_in(req, db)
    return _execute_lunch_out(req, db)

@router.post("/attendance/check-face")
@router.post("/api/attendance/check-face")
def check_face_route(req: CheckFaceRequest):
    if not req.image:
        return {"face_count": 0, "status": "no_image"}
    try:
        import os
        import cv2
        import numpy as np
        b64 = req.image
        if "," in b64:
            b64 = b64.split(",")[1]
        img_bytes = base64.b64decode(b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return {"face_count": 1, "status": "decode_fallback"}

        h, w = img.shape[:2]
        all_boxes = []

        # 1. Primary High-Accuracy Neural Detector: YuNet (Detects frontal, angled, side-profile faces)
        cascades_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cascades")
        if not os.path.exists(cascades_dir):
            cascades_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cascades")
        yunet_path = os.path.join(cascades_dir, "face_detection_yunet.onnx")

        if hasattr(cv2, "FaceDetectorYN") and os.path.exists(yunet_path):
            try:
                detector = cv2.FaceDetectorYN.create(yunet_path, "", (w, h), 0.35, 0.3, 5000)
                _, yunet_faces = detector.detect(img)
                if yunet_faces is not None:
                    for f in yunet_faces:
                        fx, fy, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
                        conf = float(f[-1])
                        if conf >= 0.35 and fw >= 24 and fh >= 24:
                            all_boxes.append((fx, fy, fw, fh))
            except Exception as e_yn:
                print("[Check Face] YuNet error:", e_yn)

        # 2. Secondary Detector: Haar Cascades (Frontal + Profile in normal & flipped)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        classifier_builder = getattr(cv2, "CascadeClassifier", None)
        if classifier_builder:
            cascade_paths = [
                os.path.join(cascades_dir, "haarcascade_frontalface_default.xml"),
                os.path.join(cascades_dir, "haarcascade_frontalface_alt2.xml"),
                os.path.join(cascades_dir, "haarcascade_profileface.xml"),
            ]
            for c_path in cascade_paths:
                if os.path.exists(c_path):
                    try:
                        cc = classifier_builder(c_path)
                        # Normal orientation
                        f_normal = cc.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(32, 32))
                        for (bx, by, bw, bh) in f_normal:
                            all_boxes.append((int(bx), int(by), int(bw), int(bh)))
                        # Flipped horizontally for profile cascade (to catch both left and right turning faces)
                        if "profile" in c_path:
                            gray_flipped = cv2.flip(gray, 1)
                            f_flipped = cc.detectMultiScale(gray_flipped, scaleFactor=1.1, minNeighbors=3, minSize=(32, 32))
                            for (bx, by, bw, bh) in f_flipped:
                                # unflip coordinates
                                orig_x = w - (bx + bw)
                                all_boxes.append((int(orig_x), int(by), int(bw), int(bh)))
                    except Exception as e_cc:
                        print("[Check Face] Cascade error:", e_cc)

        # 3. Deduplicate overlapping boxes with IoU suppression
        def compute_iou(b1, b2):
            x1 = max(b1[0], b2[0])
            y1 = max(b1[1], b2[1])
            x2 = min(b1[0] + b1[2], b2[0] + b2[2])
            y2 = min(b1[1] + b1[3], b2[1] + b2[3])
            inter = max(0, x2 - x1) * max(0, y2 - y1)
            area1 = b1[2] * b1[3]
            area2 = b2[2] * b2[3]
            union = area1 + area2 - inter
            return inter / union if union > 0 else 0

        unique_faces = []
        for box in sorted(all_boxes, key=lambda b: b[2] * b[3], reverse=True):
            if not any(compute_iou(box, u) > 0.3 for u in unique_faces):
                unique_faces.append(box)

        total_faces = len(unique_faces)
        print(f"[Check Face] Evaluated image ({w}x{h}): {total_faces} faces detected.")

        if total_faces == 0:
            return {
                "face_count": 0,
                "total_detected": 0,
                "status": "no_face",
                "message": "No face detected in photo. Please ensure face is clearly visible.",
                "primary_face": False
            }

        if total_faces == 1:
            return {
                "face_count": 1,
                "total_detected": 1,
                "status": "ok",
                "message": "Exactly 1 face verified.",
                "primary_face": True
            }

        # 2 or more faces detected!
        return {
            "face_count": total_faces,
            "total_detected": total_faces,
            "status": "multiple_faces",
            "message": f"Alert: {total_faces} faces detected in front of camera! Only 1 person allowed.",
            "primary_face": False
        }
    except Exception as e:
        print("[Check Face] Error:", e)
        return {"face_count": 1, "status": "fallback"}

@router.get("/attendance/today/{executive_id}")
@router.get("/api/attendance/today/{executive_id}")
@router.get("/api/attendance/today")
def get_today_attendance_route(
    executive_id: Optional[int] = None,
    attendance_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if not executive_id:
        return None
    if attendance_date:
        try:
            target_date = datetime.strptime(attendance_date, "%Y-%m-%d").date()
        except Exception:
            target_date = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    else:
        target_date = datetime.now(ZoneInfo("Asia/Kolkata")).date()

    att = db.query(Attendance).filter(
        Attendance.executive_id == executive_id,
        Attendance.attendance_date == target_date
    ).first()
    if not att:
        return None
    d = plan_response(att)
    exec_obj = db.query(SalesExecutive).filter(SalesExecutive.id == executive_id).first()
    if exec_obj:
        d["executive_name"] = exec_obj.name
    return d

@router.get("/attendance")
@router.get("/api/attendance")
def get_attendance_list(
    executive_id: Optional[int] = None,
    attendance_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Attendance)
    if executive_id is not None:
        query = query.filter(Attendance.executive_id == executive_id)
    if attendance_date:
        try:
            dt = datetime.strptime(attendance_date, "%Y-%m-%d").date()
            query = query.filter(Attendance.attendance_date == dt)
        except Exception:
            pass
    recs = query.order_by(Attendance.attendance_date.desc(), Attendance.id.desc()).all()
    
    execs = db.query(SalesExecutive).all()
    exec_map = {e.id: e.name for e in execs}
    
    result = []
    for r in recs:
        d = plan_response(r)
        d["executive_name"] = exec_map.get(r.executive_id, f"Executive {r.executive_id}")
        result.append(d)
    return result

@router.delete("/attendance/{attendance_id}")
@router.delete("/api/attendance/{attendance_id}")
def delete_attendance_record(attendance_id: int, db: Session = Depends(get_db)):
    att = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(att)
    db.commit()
    return {"message": "Attendance record deleted successfully"}

@router.get("/api/attendance/executive/{executive_id}")
def get_executive_attendance(executive_id: int, db: Session = Depends(get_db)):
    recs = db.query(Attendance).filter(Attendance.executive_id == executive_id).order_by(Attendance.attendance_date.desc()).all()
    return [plan_response(r) for r in recs]

@router.get("/api/attendance/date/{date_str}")
def get_attendance_by_date(date_str: str, db: Session = Depends(get_db)):
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
    except:
        raise HTTPException(400, "Invalid date format")
    recs = db.query(Attendance).filter(Attendance.attendance_date == dt).all()
    
    execs = db.query(SalesExecutive).all()
    exec_map = {e.id: e.name for e in execs}
    
    result = []
    for r in recs:
        d = plan_response(r)
        d["executive_name"] = exec_map.get(r.executive_id, f"Executive {r.executive_id}")
        result.append(d)
    return result

@router.get("/api/attendance/executive/{executive_id}/history")
def get_executive_history(executive_id: int, days: int = 45, db: Session = Depends(get_db)):
    cutoff = datetime.now(ZoneInfo("Asia/Kolkata")).date() - timedelta(days=days)
    recs = db.query(Attendance).filter(Attendance.executive_id == executive_id, Attendance.attendance_date >= cutoff).order_by(Attendance.attendance_date.desc()).all()
    return [plan_response(r) for r in recs]

@router.get("/api/attendance/search")
def search_executive_attendance(name: str, days: int = 45, db: Session = Depends(get_db)):
    cutoff = datetime.now(ZoneInfo("Asia/Kolkata")).date() - timedelta(days=days)
    execs = db.query(SalesExecutive).filter(SalesExecutive.name.ilike(f"%{name}%")).all()
    if not execs: return []
    exec_ids = [e.id for e in execs]
    
    recs = db.query(Attendance).filter(Attendance.executive_id.in_(exec_ids), Attendance.attendance_date >= cutoff).order_by(Attendance.attendance_date.desc()).all()
    
    exec_map = {e.id: e.name for e in execs}
    result = []
    for r in recs:
        d = plan_response(r)
        d["executive_name"] = exec_map.get(r.executive_id, f"Executive {r.executive_id}")
        result.append(d)
    return result
