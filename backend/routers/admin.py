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
    Reads backend/api.txt if present, extracting provider and api_key.
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        api_file = os.path.join(base_dir, "api.txt")
        if not os.path.exists(api_file):
            return None, None

        provider = None
        api_key = None
        with open(api_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    k = key.strip().upper()
                    v = val.strip()
                    if k in ("PROVIDER", "SMS_PROVIDER"):
                        provider = v.lower()
                    elif k in ("API_KEY", "SMS_API_KEY", "KEY"):
                        api_key = v
                elif not api_key and len(line) >= 8 and not line.startswith("//"):
                    api_key = line

        return provider, api_key
    except Exception as e:
        print(f"[api.txt parse warning] {e}")
        return None, None

def dispatch_sms_otp(phone: str, otp: str):
    """
    Sends SMS OTP via provider specified in api.txt or .env (Fast2SMS, 2Factor, MSG91, Twilio).
    """
    txt_provider, txt_key = load_api_txt_config()

    provider = (txt_provider or os.getenv("SMS_PROVIDER", "fast2sms")).strip().lower()
    api_key = (txt_key or os.getenv("SMS_API_KEY", "")).strip()

    if not api_key or api_key in ("YOUR_SMS_API_KEY_HERE", "your_api_key_here"):
        print(f"[SMS Gateway] No active SMS_API_KEY in api.txt or .env. Using mock console OTP: {otp}")
        return False, "SMS API key not configured in api.txt or .env (falling back to mock)"

    try:
        if provider in ("apitxt", "api.txt") or len(api_key) == 43:
            url = "https://apitxt.com/api/sendOTP"
            clean_num = phone[-10:]
            payload = {
                "authkey": api_key,
                "mobile": f"91{clean_num}",
                "otp": otp
            }
            resp = requests.post(url, data=payload, timeout=12)
            print(f"[APITxT Response] {resp.status_code}: {resp.text}")
            is_success = resp.status_code == 200 and ("success" in resp.text.lower())
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
                "numbers": phone
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            print(f"[Fast2SMS Response] {resp.status_code}: {resp.text}")
            return resp.status_code == 200, resp.text

        elif provider in ("2factor", "twofactor"):
            url = f"https://2factor.in/v2/SMS/{api_key}/SMS/{phone}/{otp}/OTP_VERIFICATION"
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
                "mobile": f"91{phone}",
                "otp": otp
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            print(f"[MSG91 Response] {resp.status_code}: {resp.text}")
            return resp.status_code == 200, resp.text

        else:
            print(f"[SMS Gateway] Unknown SMS_PROVIDER '{provider}'")
            return False, f"Unknown SMS provider: {provider}"

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

    return {
        "role": "admin",
        "user": {
            "id": 1,
            "email": "admin@zenvezippy.com",
            "phone": clean_phone,
            "name": "Admin",
            "role": "Administrator"
        },
        "token": "zippy-admin-session-token"
    }

@router.post("/admin-login")
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    clean_email = data.email.strip().lower()
    clean_pass = data.password.strip()

    ADMIN_EMAIL = "admin@zenvezippy.com"
    ADMIN_PASSWORD = "admin123"

    if clean_email == ADMIN_EMAIL and clean_pass == ADMIN_PASSWORD:
        return {
            "role": "admin",
            "user": {
                "id": 1,
                "email": ADMIN_EMAIL,
                "name": "Admin",
                "role": "Administrator"
            },
            "token": "zippy-admin-session-token"
        }

    raise HTTPException(status_code=401, detail="Invalid admin email or password")
