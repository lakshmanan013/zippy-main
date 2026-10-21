from datetime import datetime, date, time, timedelta, timezone
from fastapi import HTTPException

def yes_no_to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value = value.strip().lower()
        if value == "yes":
            return True
        if value == "no":
            return False      
    raise HTTPException(status_code=422,detail="Value must be Yes or No")
def plan_response(obj):  
    data = {k: v for k, v in obj.__dict__.items() if k != "_sa_instance_state"}
    for k, v in data.items():
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif isinstance(v, date):
            data[k] = v.isoformat()
    return data
def model_response(obj):
    data = {
        key: value
        for key, value in obj.__dict__.items()
        if key != "_sa_instance_state"   
    }
    if "is_active" in data:
        data["is_active"] = "Yes" if data["is_active"] else "No"
    if "password" in data and data["password"]:
        data["password_display"] = data["password"]
    return data
