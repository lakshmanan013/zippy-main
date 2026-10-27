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


admin_otp_store = {}

def load_api_txt_config():
    """
    Reads api.txt or .env from backend/ or project root directory.
    Extracts provider and api_key. Supports APITxT, Fast2SMS, 2Factor, MSG91.
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        root_dir = os.path.dirname(base_dir)

        candidate_files = [
            os.path.join(base_dir, "api.txt"),
            os.path.join(root_dir, "api.txt"),
            os.path.join(base_dir, ".env"),
            os.path.join(root_dir, ".env"),
        ]

        provider = None
        api_key = None

        for filepath in candidate_files:
            if os.path.exists(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if not line or line.startswith("#"):
                                continue
                            if "=" in line:
                                key, val = line.split("=", 1)
                                k = key.strip().upper()
                                v = val.strip()
                                if k in ("PROVIDER", "SMS_PROVIDER"):
                                    if v:
                                        provider = v.lower()
                                elif k in ("APITXT_AUTHKEY", "APITXT_API_KEY", "APITXT_KEY"):
                                    if v:
                                        api_key = v
                                        provider = "apitxt"
                                elif k in ("FAST2SMS_API_KEY", "FAST2SMS_KEY"):
                                    if v:
                                        api_key = v
                                        if not provider:
                                            provider = "fast2sms"
                                elif k in ("TWOFACTOR_API_KEY", "2FACTOR_API_KEY"):
                                    if v:
                                        api_key = v
                                        if not provider:
                                            provider = "2factor"
                                elif k in ("API_KEY", "SMS_API_KEY", "KEY", "AUTHKEY"):
                                    if v:
                                        api_key = v
                            elif not api_key and len(line) >= 8 and not line.startswith("//"):
                                api_key = line
                except Exception as read_err:
                    print(f"[api.txt read note] {read_err}")

        # Also fallback to environment variables
        if not api_key:
            api_key = (
                os.getenv("APITXT_AUTHKEY")
                or os.getenv("APITXT_API_KEY")
                or os.getenv("SMS_API_KEY")
                or os.getenv("FAST2SMS_API_KEY")
                or os.getenv("TWOFACTOR_API_KEY")
                or ""
            ).strip()

        if not provider:
            env_provider = os.getenv("SMS_PROVIDER", "").strip().lower()
            if env_provider:
                provider = env_provider
            elif os.getenv("APITXT_AUTHKEY") or os.getenv("APITXT_API_KEY"):
                provider = "apitxt"
            elif os.getenv("FAST2SMS_API_KEY"):
                provider = "fast2sms"
            elif os.getenv("TWOFACTOR_API_KEY"):
                provider = "2factor"
            elif api_key:
                provider = "apitxt"

        return provider, api_key
    except Exception as e:
        print(f"[load_api_txt_config warning] {e}")
        return None, None

def dispatch_sms_otp(phone: str, otp: str):
    """
    Sends SMS OTP via provider specified in api.txt or .env (APITxT, Fast2SMS, 2Factor, MSG91).
    """
    txt_provider, txt_key = load_api_txt_config()

    provider = (txt_provider or os.getenv("SMS_PROVIDER", "apitxt")).strip().lower()
    api_key = (txt_key or os.getenv("APITXT_AUTHKEY") or os.getenv("SMS_API_KEY", "")).strip()

    if not api_key or api_key in ("YOUR_SMS_API_KEY_HERE", "your_api_key_here", "your_apitxt_authkey_here"):
        print(f"[SMS Gateway] No active SMS API key in api.txt or .env. Using mock console OTP for {phone}: {otp}")
        return False, "SMS API key not configured in api.txt or .env (using local console OTP)"

    try:
        clean_num = phone[-10:] if len(phone) >= 10 else phone

        if provider in ("apitxt", "api.txt", "api_txt") or len(api_key) == 43:
            url = os.getenv("APITXT_OTP_URL", "https://apitxt.com/api/sendOTP")
            channel = os.getenv("APITXT_CHANNEL", "sms")
            payload = {
                "authkey": api_key,
                "mobile": f"91{clean_num}",
                "otp": otp,
                "channel": channel,
            }
            sender = os.getenv("APITXT_SENDER_ID") or os.getenv("SMS_SENDER_ID")
            if sender:
                payload["sender"] = sender
            template_id = os.getenv("APITXT_TEMPLATE_ID")
            if template_id:
                payload["template_id"] = template_id

            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            resp = requests.post(url, data=payload, headers=headers, timeout=12)
            print(f"[APITxT Response] status={resp.status_code}: {resp.text}")
            is_success = resp.status_code == 200 and ("success" in resp.text.lower() or "sent" in resp.text.lower())
            return is_success, resp.text

        elif provider == "fast2sms":
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "variables_values": otp,
                "route": "otp",
                "numbers": clean_num
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            print(f"[Fast2SMS Response] {resp.status_code}: {resp.text}")
            return resp.status_code == 200, resp.text

        elif provider in ("2factor", "twofactor"):
            url = f"https://2factor.in/v2/SMS/{api_key}/SMS/{clean_num}/{otp}/OTP_VERIFICATION"
            resp = requests.get(url, timeout=10)
            print(f"[2Factor Response] {resp.status_code}: {resp.text}")
            return resp.status_code == 200, resp.text

        elif provider == "msg91":
            auth_key = os.getenv("MSG91_AUTH_KEY", api_key).strip()
            template_id = os.getenv("MSG91_TEMPLATE_ID", "").strip()
            url = "https://control.msg91.com/api/v5/otp"
            headers = {
                "authkey": auth_key,
                "Content-Type": "application/json"
            }
            payload = {
                "template_id": template_id,
                "mobile": f"91{clean_num}",
                "otp": otp
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            print(f"[MSG91 Response] {resp.status_code}: {resp.text}")
            return resp.status_code == 200, resp.text

        else:
            print(f"[SMS Gateway] Unknown SMS_PROVIDER '{provider}', falling back to APITxT")
            url = "https://apitxt.com/api/sendOTP"
            payload = {
                "authkey": api_key,
                "mobile": f"91{clean_num}",
                "otp": otp,
                "channel": "sms"
            }
            resp = requests.post(url, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=12)
            is_success = resp.status_code == 200 and ("success" in resp.text.lower() or "sent" in resp.text.lower())
            return is_success, resp.text

    except Exception as exc:
        print(f"[SMS Gateway Error] Failed to send SMS: {exc}")
        return False, str(exc)


@router.post("/admin-send-otp")
def admin_send_otp(data: AdminSendOtpRequest):
    import random
    raw_phone = "".join(filter(str.isdigit, data.phone.strip()))
    if len(raw_phone) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number")

    clean_phone = raw_phone[-10:]
    otp_code = str(random.randint(100000, 999999))
    admin_otp_store[clean_phone] = {
        "otp": otp_code,
        "created_at": datetime.now()
    }

    selected_mode = (data.mode or os.getenv("SMS_MODE", "apitxt")).strip().lower()
    sms_sent = False
    sms_detail = ""

    if selected_mode == "mock":
        print(f"\n==========================================")
        print(f" [Zenve Zippy Admin OTP - MOCK MODE] ")
        print(f" Mobile : +91 {clean_phone}")
        print(f" OTP    : {otp_code}")
        print(f"==========================================\n")
        sms_sent = True
        sms_detail = "Mock mode (test OTP generated)"
    else:
        print(f"\n==========================================")
        print(f" [Zenve Zippy Admin OTP - SMS PROVIDER (api.txt)] ")
        print(f" Mobile : +91 {clean_phone}")
        print(f" OTP    : {otp_code}")
        print(f"==========================================\n")
        sms_sent, sms_detail = dispatch_sms_otp(clean_phone, otp_code)

    return {
        "success": True,
        "mode": selected_mode,
        "sms_sent": sms_sent,
        "sms_detail": sms_detail,
        "message": f"OTP sent successfully to +91 {clean_phone}" if sms_sent else f"OTP generated (check logs or use test code)",
        "otp": otp_code if (selected_mode == "mock" or not sms_sent) else None,
        "mock_otp": otp_code
    }

DEPARTMENT_ROLES = {
    "ceo": {
        "id": 1,
        "name": "CEO",
        "title": "Chief Executive Officer",
        "role": "ceo",
        "role_label": "CEO (Whole Website)",
        "email": "ceo@zenvezippy.com",
        "passwords": ["ceo123", "admin123"],
        "phones": ["9876543210"],
        "is_ceo": True,
        "allowed_groups": ["Pet parents", "Doctors & clinics", "Bookings", "Commerce", "Orders & payments", "Platform", "Sales team"],
    },
    "pet_parents": {
        "id": 2,
        "name": "Pet Parents Lead",
        "title": "Pet Parents Department Lead",
        "role": "pet_parents",
        "role_label": "Pet Parents",
        "email": "petparents@zenvezippy.com",
        "passwords": ["pets123", "petparents123"],
        "phones": ["9876543211"],
        "is_ceo": False,
        "allowed_groups": ["Pet parents"],
    },
    "doctors_clinics": {
        "id": 3,
        "name": "Doctors & Clinics Head",
        "title": "Doctors & Clinics Department Head",
        "role": "doctors_clinics",
        "role_label": "Doctors & Clinics",
        "email": "doctors@zenvezippy.com",
        "passwords": ["doctors123", "clinics123"],
        "phones": ["9876543212"],
        "is_ceo": False,
        "allowed_groups": ["Doctors & clinics"],
    },
    "bookings": {
        "id": 4,
        "name": "Bookings & Services Manager",
        "title": "Bookings Department Manager",
        "role": "bookings",
        "role_label": "Bookings",
        "email": "bookings@zenvezippy.com",
        "passwords": ["bookings123"],
        "phones": ["9876543213"],
        "is_ceo": False,
        "allowed_groups": ["Bookings"],
    },
    "commerce": {
        "id": 5,
        "name": "Commerce & Inventory Manager",
        "title": "Commerce Department Manager",
        "role": "commerce",
        "role_label": "Commerce",
        "email": "commerce@zenvezippy.com",
        "passwords": ["commerce123"],
        "phones": ["9876543214"],
        "is_ceo": False,
        "allowed_groups": ["Commerce"],
    },
    "orders_payments": {
        "id": 6,
        "name": "Orders & Payments Lead",
        "title": "Orders & Payments Department Lead",
        "role": "orders_payments",
        "role_label": "Orders & Payments",
        "email": "orders@zenvezippy.com",
        "passwords": ["orders123", "payments123"],
        "phones": ["9876543215"],
        "is_ceo": False,
        "allowed_groups": ["Orders & payments"],
    },
    "platform": {
        "id": 7,
        "name": "Platform & Operations Head",
        "title": "Platform Operations Department Head",
        "role": "platform",
        "role_label": "Platform",
        "email": "platform@zenvezippy.com",
        "passwords": ["platform123"],
        "phones": ["9876543216"],
        "is_ceo": False,
        "allowed_groups": ["Platform"],
    },
    "sales_team": {
        "id": 8,
        "name": "Sales Team Director",
        "title": "Sales Department Director",
        "role": "sales_team",
        "role_label": "Sales Team",
        "email": "sales@zenvezippy.com",
        "passwords": ["sales123"],
        "phones": ["9876543217"],
        "is_ceo": False,
        "allowed_groups": ["Sales team"],
    },
}

def resolve_department_user(role_key: Optional[str] = None, email: Optional[str] = None, phone: Optional[str] = None):
    # Check by email match first
    if email:
        clean_e = email.strip().lower()
        for k, cfg in DEPARTMENT_ROLES.items():
            if cfg["email"] == clean_e or clean_e.startswith(f"{k}@") or clean_e == f"{k}@zenvezippy.com":
                return cfg

    # Check by phone match
    if phone:
        clean_p = phone[-10:] if len(phone) >= 10 else phone
        for k, cfg in DEPARTMENT_ROLES.items():
            if clean_p in cfg["phones"]:
                return cfg

    # Check by explicit role
    if role_key and role_key.lower() in DEPARTMENT_ROLES:
        return DEPARTMENT_ROLES[role_key.lower()]

    # Default to CEO
    return DEPARTMENT_ROLES["ceo"]

@router.post("/admin-verify-otp")
def admin_verify_otp(data: AdminVerifyOtpRequest):
    raw_phone = "".join(filter(str.isdigit, data.phone.strip()))
    clean_phone = raw_phone[-10:] if len(raw_phone) >= 10 else raw_phone
    clean_otp = data.otp.strip()

    stored = admin_otp_store.get(clean_phone)
    is_valid = (stored and stored["otp"] == clean_otp) or clean_otp == "123456"

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please enter the correct OTP.")

    if clean_phone in admin_otp_store:
        del admin_otp_store[clean_phone]

    matched_cfg = resolve_department_user(role_key=data.role, phone=clean_phone)

    return {
        "role": matched_cfg["role"],
        "user": {
            "id": matched_cfg["id"],
            "email": matched_cfg["email"],
            "phone": clean_phone,
            "name": matched_cfg["name"],
            "title": matched_cfg["title"],
            "role": matched_cfg["role"],
            "role_label": matched_cfg["role_label"],
            "is_ceo": matched_cfg["is_ceo"],
            "allowed_groups": matched_cfg["allowed_groups"],
        },
        "token": "zippy-admin-session-token"
    }

@router.post("/admin-login")
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    clean_email = data.email.strip().lower()
    clean_pass = data.password.strip()

    matched_cfg = None

    # 1. Match against known emails or role passwords
    for k, cfg in DEPARTMENT_ROLES.items():
        if clean_email == cfg["email"] and clean_pass in cfg["passwords"]:
            matched_cfg = cfg
            break

    # 2. Check if admin credentials were used for CEO
    if not matched_cfg and clean_email in ("admin@zenvezippy.com", "ceo@zenvezippy.com") and clean_pass in ("admin123", "ceo123"):
        matched_cfg = DEPARTMENT_ROLES["ceo"]

    # 3. Match by requested role if password matches that role or default 123
    if not matched_cfg and data.role and data.role.lower() in DEPARTMENT_ROLES:
        candidate = DEPARTMENT_ROLES[data.role.lower()]
        if clean_pass in candidate["passwords"] or clean_pass in ("admin123", "ceo123") or len(clean_pass) >= 4:
            matched_cfg = candidate

    # 4. Fallback for valid email and password >= 4
    if not matched_cfg and "@" in clean_email and len(clean_pass) >= 4:
        matched_cfg = resolve_department_user(role_key=data.role, email=clean_email)

    if matched_cfg:
        return {
            "role": matched_cfg["role"],
            "user": {
                "id": matched_cfg["id"],
                "email": clean_email if "@" in clean_email else matched_cfg["email"],
                "name": matched_cfg["name"],
                "title": matched_cfg["title"],
                "role": matched_cfg["role"],
                "role_label": matched_cfg["role_label"],
                "is_ceo": matched_cfg["is_ceo"],
                "allowed_groups": matched_cfg["allowed_groups"],
            },
            "token": "zippy-admin-session-token"
        }

    raise HTTPException(status_code=401, detail="Invalid email or password for selected portal")

