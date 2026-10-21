import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, auto_migrate_db
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
)

app = FastAPI(title= "Pet Management API",version= "1.0.0") 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],   
    allow_headers=["*"],  
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

Base.metadata.create_all(bind=engine)

auto_migrate_db()

@app.get("/")
def home():
    return{"message":"Pet Management API is Running"}

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
