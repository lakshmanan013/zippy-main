import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from database import (
    engine,
    engine_zippy,
    engine_zenve,
    Base,
    BaseZippy,
    BaseMain,
    init_db,
    auto_migrate_db,
)
import models 
from routers import (
    pets,
    doctors,
    services,
    shop,
    extras,
    sales_team,
    auth,
    planning,
    attendance,
    admin,
    sync,
)

app = FastAPI(title="Zenve Zippy Multi-Database API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    origin = request.headers.get("origin") or "http://localhost:5173"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        }
    )

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

# Initialize dual database schemas & auto-migrate columns
init_db()
auto_migrate_db()

@app.get("/")
def home():
    return {
        "message": "Zenve Zippy Dual-Database API is Running",
        "databases": {
            "database_1": "zippy_crm (Zippy CRM Operations & Field Data)",
            "database_2": "zenve_main (zenve_main Centralized Database)"
        }
    }

@app.get("/db-health")
def db_health():
    zippy_status = "ok"
    zenve_status = "ok"
    zippy_err = None
    zenve_err = None
    zippy_info = {}
    zenve_info = {}

    try:
        with engine_zippy.connect() as conn:
            row = conn.execute(text("SELECT DATABASE(), VERSION()")).fetchone()
            zippy_info = {"database": row[0], "version": row[1], "host": engine_zippy.url.host}
    except Exception as e:
        zippy_status = "error"
        zippy_err = str(e)

    try:
        with engine_zenve.connect() as conn:
            row = conn.execute(text("SELECT DATABASE(), VERSION()")).fetchone()
            zenve_info = {"database": row[0], "version": row[1], "host": engine_zenve.url.host}
    except Exception as e:
        zenve_status = "error"
        zenve_err = str(e)

    return {
        "status": "healthy" if (zippy_status == "ok" and zenve_status == "ok") else "degraded",
        "zippy_crm": {"status": zippy_status, "host": engine_zippy.url.host, "info": zippy_info, "error": zippy_err},
        "zenve_main": {"status": zenve_status, "host": engine_zenve.url.host, "info": zenve_info, "error": zenve_err},
    }

app.include_router(pets.router)
app.include_router(doctors.router)
app.include_router(services.router)
app.include_router(shop.router)
app.include_router(extras.router)
app.include_router(sales_team.router)
app.include_router(auth.router)
app.include_router(planning.router)
app.include_router(attendance.router)
app.include_router(admin.router)
app.include_router(sync.router)
