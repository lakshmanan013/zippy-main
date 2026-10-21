import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session


_backend_dir = Path(__file__).resolve().parent
_root_dir = _backend_dir.parent
if (_backend_dir / ".env").exists():
    load_dotenv(_backend_dir / ".env", override=True)
if (_root_dir / ".env").exists():
    load_dotenv(_root_dir / ".env", override=True)
load_dotenv(override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:Vasanth%40zenve@127.0.0.1:3306/pet_management")
engine = create_engine(DATABASE_URL, echo=True, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_migrate_db():
    """Ensure newly added columns exist in tables without breaking existing tables."""
    try:
        with engine.begin() as conn:
            columns_to_ensure = [
                ("sales_executives", "password", "VARCHAR(100) NULL"),
                ("sales_executives", "is_phone_verified", "BOOLEAN DEFAULT FALSE"),
                ("sales_managers", "password", "VARCHAR(100) NULL"),
                ("sales_managers", "is_phone_verified", "BOOLEAN DEFAULT FALSE"),
                ("regional_managers", "password", "VARCHAR(100) NULL"),
                ("regional_managers", "is_phone_verified", "BOOLEAN DEFAULT FALSE"),
            ]
            for tbl, col, col_def in columns_to_ensure:
                try:
                    chk = conn.execute(text(f"""
                        SELECT COUNT(*) FROM information_schema.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = '{tbl}' 
                        AND COLUMN_NAME = '{col}'
                    """)).scalar()
                    if not chk:
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}"))
                        print(f"[DB Migration] Successfully added column {col} to {tbl}")
                except Exception as ex:
                    print(f"[DB Migration] Note for {tbl}.{col}: {ex}")
    except Exception as e:
        print(f"[DB Migration] Migration check error: {e}")
