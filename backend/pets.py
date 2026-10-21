"""
Backward-compatibility shim.
The backend has been modularized into `main.py`, `models.py`, `database.py`, and `routers/`.
This file ensures running `uvicorn pets:app --reload` continues to work seamlessly.
"""
from main import app, engine, Base, auto_migrate_db
from database import get_db, SessionLocal

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("pets:app", host="0.0.0.0", port=8000, reload=True)
