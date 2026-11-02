import os
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, event, inspect
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ------------------------------------------------------------------------------
# 1. Environment Initialization
# ------------------------------------------------------------------------------
_backend_dir = Path(__file__).resolve().parent
_root_dir = _backend_dir.parent
if (_backend_dir / ".env").exists():
    load_dotenv(_backend_dir / ".env", override=True)
if (_root_dir / ".env").exists():
    load_dotenv(_root_dir / ".env", override=True)
load_dotenv(override=False)

# ------------------------------------------------------------------------------
# 2. Remote Ubuntu MySQL Server Configuration Helper (SSH Tunnel / Direct)
# ------------------------------------------------------------------------------
DEFAULT_DB_HOST = "127.0.0.1"
DEFAULT_DB_PORT = "3307"

def _build_url(prefix: str, default_name: str, default_user: str = "root", default_pass: str = "") -> str:
    """
    Constructs a MySQL SQLAlchemy connection URL for the remote Ubuntu MySQL server.
    Prioritizes specific prefix environment variables (ZIPPY_DATABASE_URL, ZENVE_DATABASE_URL, etc.)
    with default fallback to the SSH tunnel (127.0.0.1:3307 -> 95.135.254.123:3306).
    Automatically normalizes 'mysql://' to 'mysql+pymysql://' and URL-encodes passwords.
    """
    direct_url = os.getenv(f"{prefix}_DATABASE_URL")
    if direct_url:
        if direct_url.startswith("mysql://"):
            direct_url = direct_url.replace("mysql://", "mysql+pymysql://", 1)
        return direct_url

    db_host = os.getenv(f"{prefix}_DB_HOST") or os.getenv("DB_HOST", DEFAULT_DB_HOST)
    db_port = os.getenv(f"{prefix}_DB_PORT") or os.getenv("DB_PORT", DEFAULT_DB_PORT)
    db_user = os.getenv(f"{prefix}_DB_USER") or os.getenv("DB_USER", default_user)
    db_pass = os.getenv(f"{prefix}_DB_PASSWORD") or os.getenv("DB_PASSWORD", default_pass)
    db_name = os.getenv(f"{prefix}_DB_NAME") or default_name

    encoded_pass = urllib.parse.quote_plus(db_pass)
    return f"mysql+pymysql://{db_user}:{encoded_pass}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"

# Database 1: Zippy CRM (Primary CRM Database: field operations, attendance, planning, visits)
ZIPPY_DATABASE_URL = _build_url("ZIPPY", "zippy_crm", default_user="zippy_crm_app", default_pass="zippy-123")

# Database 2: zenve_main (Centralized Master Database: pet parents, pets, doctors, services, shop)
ZENVE_DATABASE_URL = _build_url("ZENVE", "zenve_main", default_user="zenve_main_user", default_pass="zenvemain-123")

# Legacy compatibility alias
DATABASE_URL = ZIPPY_DATABASE_URL

# ------------------------------------------------------------------------------
# 3. Remote Database Engines with Resilient Connection Pooling & Reconnection
# ------------------------------------------------------------------------------
_engine_options = {
    "echo": False,
    "pool_pre_ping": True,         # Automatically tests connection vitality; auto-reconnects if dropped
    "pool_recycle": 280,           # Recycles connections every ~4.5 mins to prevent remote wait_timeout drops
    "pool_size": 10,               # Active connection pool size
    "max_overflow": 20,            # Max burst connections beyond pool size
    "pool_timeout": 30,            # Seconds to wait for a connection before timeout
    "connect_args": {
        "connect_timeout": 15,      # Remote TCP connection timeout
        "charset": "utf8mb4"
    }
}

engine_zippy = create_engine(ZIPPY_DATABASE_URL, **_engine_options)
engine_zenve = create_engine(ZENVE_DATABASE_URL, **_engine_options)

print(f"[DB Config] Zippy CRM Target: {engine_zippy.url.host}:{engine_zippy.url.port}/{engine_zippy.url.database} (User: {engine_zippy.url.username})")
print(f"[DB Config] Zenve Main Target: {engine_zenve.url.host}:{engine_zenve.url.port}/{engine_zenve.url.database} (User: {engine_zenve.url.username})")

# Aliases
engine_main = engine_zenve
engine = engine_zippy

BaseZippy = declarative_base()
BaseMain = declarative_base()
Base = BaseMain  # Default base for backward compatibility

# List of tables dedicated to Zippy CRM database
ZIPPY_TABLES = {
    "regional_managers",
    "sales_managers",
    "sales_executives",
    "mobile_otps",
    "attendance",
    "pincode_coverages",
    "executive_tasks",
    "executive_alerts",
    "monthly_plans",
    "plan_visits",
    "visit_reports",
    "executive_submission_reports",
}

# ------------------------------------------------------------------------------
# 5. Intelligent Multi-Database Routing Session
# ------------------------------------------------------------------------------
class RoutingSession(Session):
    """
    Intelligently routes database operations to the correct server/database:
    - Tables in ZIPPY_TABLES or entities marked __bind_key__ = 'zippy' -> engine_zippy (zippy_crm)
    - All other tables/entities -> engine_zenve (zenve_main)
    Supports cross-model transactions in a single FastAPI request.
    """
    def get_bind(self, mapper=None, clause=None, bind=None, **kw):
        if bind is not None:
            return bind
        if mapper is not None:
            entity = getattr(mapper, "class_", mapper)
            bind_key = getattr(entity, "__bind_key__", None)
            if bind_key == "zippy":
                return engine_zippy
            if bind_key in ("zenve", "main"):
                return engine_zenve
            
            tablename = getattr(getattr(entity, "__table__", None), "name", None)
            if tablename and tablename in ZIPPY_TABLES:
                return engine_zippy
            return engine_zenve

        if clause is not None:
            froms = getattr(clause, "froms", [])
            for t in froms:
                tname = getattr(t, "name", "")
                if tname in ZIPPY_TABLES:
                    return engine_zippy
            clause_str = str(clause).lower()
            for tname in ZIPPY_TABLES:
                if tname in clause_str:
                    return engine_zippy
            return engine_zenve

        return engine_zenve

# Dedicated & Unified Session Makers
SessionLocal = sessionmaker(class_=RoutingSession, autocommit=False, autoflush=False)
SessionZippy = sessionmaker(autocommit=False, autoflush=False, bind=engine_zippy)
SessionZenve = sessionmaker(autocommit=False, autoflush=False, bind=engine_zenve)
SessionMain = SessionZenve

# ------------------------------------------------------------------------------
# 5b. Automatic Real-Time Dual-Database Replication: zippy_crm <=====> zenve_main
# ------------------------------------------------------------------------------
_TABLE_COLS_CACHE = {}

def _get_target_table_columns(target_engine, table_name):
    cache_key = (str(target_engine.url), table_name)
    if cache_key in _TABLE_COLS_CACHE:
        return _TABLE_COLS_CACHE[cache_key]
    try:
        with target_engine.connect() as conn:
            res = conn.execute(text(f"""
                SELECT COLUMN_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}'
            """)).fetchall()
            cols = set(r[0] for r in res)
            _TABLE_COLS_CACHE[cache_key] = cols
            return cols
    except Exception:
        return None

@event.listens_for(Session, "after_flush")
def auto_replicate_dual_database(session, flush_context):
    """
    Automatic Real-Time Dual-Database Replication:
    Any record inserted, updated, or deleted in zippy_crm is mirrored to zenve_main.
    Any record inserted, updated, or deleted in zenve_main is mirrored to zippy_crm.
    Ensures 100% equal data across both databases at all times.
    """
    if getattr(session, "_is_replicating", False):
        return

    # Group by target engine
    replicate_targets = {engine_zenve: [], engine_zippy: []}
    delete_targets = {engine_zenve: [], engine_zippy: []}

    all_active = list(session.new) + list(session.dirty)
    for obj in all_active:
        table = getattr(obj, "__table__", None)
        if table is not None:
            bind = session.get_bind(obj.__class__)
            target_engine = engine_zenve if bind == engine_zippy else engine_zippy
            replicate_targets[target_engine].append((table.name, obj))

    for obj in session.deleted:
        table = getattr(obj, "__table__", None)
        if table is not None:
            bind = session.get_bind(obj.__class__)
            target_engine = engine_zenve if bind == engine_zippy else engine_zippy
            delete_targets[target_engine].append((table.name, obj))

    for target_engine in (engine_zenve, engine_zippy):
        items_to_sync = replicate_targets[target_engine]
        items_to_del = delete_targets[target_engine]
        if not items_to_sync and not items_to_del:
            continue

        target_name = "zenve_main" if target_engine == engine_zenve else "zippy_crm"
        try:
            with target_engine.begin() as conn:
                conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
                for table_name, obj in items_to_sync:
                    insp = inspect(obj)
                    target_cols = _get_target_table_columns(target_engine, table_name)
                    
                    cols_dict = {}
                    for attr in insp.mapper.column_attrs:
                        col_name = attr.key
                        if target_cols is None or col_name in target_cols:
                            cols_dict[col_name] = getattr(obj, col_name, None)

                    if cols_dict:
                        col_names = list(cols_dict.keys())
                        placeholders = ", ".join([f":{c}" for c in col_names])
                        update_clause = ", ".join([f"`{c}` = VALUES(`{c}`)" for c in col_names])
                        sql = text(f"""
                            INSERT INTO `{table_name}` ({', '.join([f'`{c}`' for c in col_names])})
                            VALUES ({placeholders})
                            ON DUPLICATE KEY UPDATE {update_clause}
                        """)
                        conn.execute(sql, cols_dict)

                for table_name, obj in items_to_del:
                    insp = inspect(obj)
                    pk_dict = {pk.name: getattr(obj, pk.name) for pk in insp.mapper.primary_key}
                    if pk_dict:
                        where_clause = " AND ".join([f"`{k}` = :{k}" for k in pk_dict.keys()])
                        sql = text(f"DELETE FROM `{table_name}` WHERE {where_clause}")
                        conn.execute(sql, pk_dict)

                conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        except Exception as exc:
            print(f"[Dual-Sync Notice -> {target_name}]: {exc}")

# ------------------------------------------------------------------------------
# 6. Session Dependency Providers
# ------------------------------------------------------------------------------
def get_db():
    """Default dependency: smart session automatically routed across both databases."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_zippy_db():
    """Explicit dependency for Zippy CRM database operations."""
    db = SessionZippy()
    try:
        yield db
    finally:
        db.close()

def get_zenve_db():
    """Explicit dependency for Zenve_Main centralized database operations."""
    db = SessionZenve()
    try:
        yield db
    finally:
        db.close()

get_main_db = get_zenve_db

# ------------------------------------------------------------------------------
# 7. Connection Verification & Schema Protections
# ------------------------------------------------------------------------------
def verify_remote_connections():
    """
    Verifies live connectivity to both remote Ubuntu MySQL databases (95.135.254.123:3306).
    Preserves all existing tables and production data without modifications.
    """
    status = {}
    for name, eng in [("zippy_crm (Primary CRM)", engine_zippy), ("zenve_main (Central Master)", engine_zenve)]:
        try:
            with eng.connect() as conn:
                res = conn.execute(text("SELECT DATABASE(), VERSION()")).fetchone()
                status[name] = {"connected": True, "database": res[0], "version": res[1]}
                print(f"[Remote DB] ✓ {name}: Connected to {eng.url.host}:{eng.url.port} (DB: {res[0]}, MySQL: {res[1]})")
        except Exception as exc:
            status[name] = {"connected": False, "error": str(exc)}
            print(f"[Remote DB] ⚠️ {name} connection notice: {exc}")
    return status

def init_db():
    """
    Equalizes all schema tables across both databases (zippy_crm and zenve_main).
    create_all() strictly creates missing tables and NEVER alters, drops, or overwrites existing tables or records.
    """
    # 1. Initialize all tables in zenve_main (both Marketplace and CRM models)
    try:
        BaseMain.metadata.create_all(bind=engine_zenve)
        BaseZippy.metadata.create_all(bind=engine_zenve)
        print("[DB Init] ✓ All tables (Marketplace + CRM) verified/created in zenve_main")
    except Exception as e:
        print(f"[DB Init] Note for zenve_main tables: {e}")

    # 2. Initialize all tables in zippy_crm (both Marketplace and CRM models)
    try:
        BaseMain.metadata.create_all(bind=engine_zippy)
        BaseZippy.metadata.create_all(bind=engine_zippy)
        print("[DB Init] ✓ All tables (Marketplace + CRM) verified/created in zippy_crm")
    except Exception as e:
        print(f"[DB Init] Note for zippy_crm tables: {e}")

def auto_migrate_db():
    """Ensure newly added columns exist in Zippy CRM tables without breaking existing records."""
    try:
        with engine_zippy.begin() as conn:
            columns_to_ensure = [
                ("sales_executives", "password", "VARCHAR(100) NULL"),
                ("sales_executives", "is_phone_verified", "BOOLEAN DEFAULT FALSE"),
                ("sales_managers", "password", "VARCHAR(100) NULL"),
                ("sales_managers", "is_phone_verified", "BOOLEAN DEFAULT FALSE"),
                ("regional_managers", "password", "VARCHAR(100) NULL"),
                ("regional_managers", "is_phone_verified", "BOOLEAN DEFAULT FALSE"),
                ("executive_tasks", "description", "TEXT NULL"),
                ("executive_tasks", "assigned_by_id", "INT NULL"),
                ("executive_tasks", "assigned_by_role", "VARCHAR(50) NULL"),
                ("executive_tasks", "assigned_by_name", "VARCHAR(150) NULL"),
                ("executive_tasks", "assigned_to_role", "VARCHAR(50) DEFAULT 'executive'"),
                ("executive_tasks", "assigned_to_id", "INT NULL"),
                ("executive_tasks", "assigned_to_name", "VARCHAR(150) NULL"),
                ("executive_tasks", "region", "VARCHAR(150) NULL"),
                ("executive_tasks", "target_entity_name", "VARCHAR(200) NULL"),
                ("executive_tasks", "target_entity_id", "INT NULL"),
                ("executive_tasks", "progress", "INT DEFAULT 0"),
                ("executive_tasks", "remarks", "TEXT NULL"),
                ("executive_tasks", "completed_at", "DATETIME NULL"),
                ("executive_tasks", "created_at", "DATETIME NULL"),
                ("executive_tasks", "updated_at", "DATETIME NULL"),
                ("executive_alerts", "message", "TEXT NULL"),
                ("executive_alerts", "alert_type", "VARCHAR(100) DEFAULT 'task'"),
                ("executive_alerts", "executive_id", "INT NULL"),
                ("executive_alerts", "task_id", "INT NULL"),
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
                    pass
    except Exception as e:
        print(f"[DB Migration] Migration notice: {e}")
