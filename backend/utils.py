from datetime import datetime, date, time, timedelta, timezone
from decimal import Decimal
from fastapi import HTTPException

try:
    from zoneinfo import ZoneInfo
    try:
        KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
    except Exception:
        KOLKATA_TZ = timezone(timedelta(hours=5, minutes=30))
except Exception:
    KOLKATA_TZ = timezone(timedelta(hours=5, minutes=30))

def get_kolkata_now():
    return datetime.now(KOLKATA_TZ)

def yes_no_to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        val = value.strip().lower()
        if val in ("yes", "true", "1"):
            return True
        if val in ("no", "false", "0"):
            return False      
    if value is None:
        return False
    raise HTTPException(status_code=422, detail="Value must be Yes or No")

def plan_response(obj):  
    if obj is None:
        return None
    if isinstance(obj, dict):
        data = dict(obj)
    elif hasattr(obj, "__dict__"):
        data = {k: v for k, v in obj.__dict__.items() if k != "_sa_instance_state"}
    else:
        return obj

    for k, v in list(data.items()):
        if isinstance(v, (datetime, date, time)):
            data[k] = v.isoformat()
        elif isinstance(v, Decimal):
            data[k] = float(v)
    return data

def model_response(obj):
    if obj is None:
        return None
    if isinstance(obj, dict):
        data = dict(obj)
    elif hasattr(obj, "__table__"):
        data = {col.name: getattr(obj, col.name) for col in obj.__table__.columns}
    elif hasattr(obj, "__dict__"):
        data = {
            key: value
            for key, value in obj.__dict__.items()
            if key != "_sa_instance_state"   
        }
    else:
        return obj

    if "is_active" in data and data["is_active"] is not None:
        data["is_active"] = "Yes" if data["is_active"] else "No"
    if "password" in data and data["password"]:
        data["password_display"] = data["password"]

    for k, v in list(data.items()):
        if isinstance(v, (datetime, date, time)):
            data[k] = v.isoformat()
        elif isinstance(v, Decimal):
            data[k] = float(v)

    return data
