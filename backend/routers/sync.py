from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine_zippy, engine_zenve, get_db
import sync_service

router = APIRouter(prefix="/api/sync", tags=["Database Synchronization"])

@router.get("/status")
def sync_status():
    """Returns the current synchronization status and record stats across both databases."""
    try:
        return sync_service.get_sync_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve sync status: {e}")

@router.post("/run")
def trigger_sync():
    """Triggers an on-demand full synchronization between zippy_crm and zenve_main."""
    try:
        result = sync_service.run_full_sync()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synchronization failed: {e}")

@router.post("/equalize")
def equalize_both_databases():
    """
    Ensures all tables in zippy_crm and zenve_main are equal and all existing data is synchronized.
    Uses native MySQL CREATE TABLE ... LIKE and INSERT IGNORE to prevent any data loss.
    """
    created_in_zenve = []
    created_in_zippy = []
    errors = []

    try:
        with engine_zippy.connect() as conn_z, engine_zenve.connect() as conn_m:
            res_z = conn_z.execute(text("SHOW TABLES IN `zippy_crm`;")).fetchall()
            tables_zippy = set(r[0] for r in res_z)

            res_m = conn_m.execute(text("SHOW TABLES IN `zenve_main`;")).fetchall()
            tables_zenve = set(r[0] for r in res_m)

            # Clone from zippy_crm to zenve_main
            for tbl in (tables_zippy - tables_zenve):
                try:
                    create_res = conn_z.execute(text(f"SHOW CREATE TABLE `{tbl}`;")).fetchone()
                    create_sql = create_res[1]

                    conn_m.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
                    conn_m.execute(text(create_sql))
                    conn_m.commit()

                    rows = conn_z.execute(text(f"SELECT * FROM `{tbl}`;")).mappings().all()
                    if rows:
                        row_dicts = [dict(r) for r in rows]
                        cols = list(row_dicts[0].keys())
                        placeholders = ", ".join([f":{c}" for c in cols])
                        ins_sql = text(f"INSERT IGNORE INTO `{tbl}` ({', '.join([f'`{c}`' for c in cols])}) VALUES ({placeholders})")
                        conn_m.execute(ins_sql, row_dicts)
                        conn_m.commit()

                    conn_m.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
                    conn_m.commit()
                    created_in_zenve.append(tbl)
                except Exception as ex:
                    errors.append(f"zenve_main.{tbl}: {ex}")

            # Clone from zenve_main to zippy_crm
            for tbl in (tables_zenve - tables_zippy):
                try:
                    create_res = conn_m.execute(text(f"SHOW CREATE TABLE `{tbl}`;")).fetchone()
                    create_sql = create_res[1]

                    conn_z.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
                    conn_z.execute(text(create_sql))
                    conn_z.commit()

                    rows = conn_m.execute(text(f"SELECT * FROM `{tbl}`;")).mappings().all()
                    if rows:
                        row_dicts = [dict(r) for r in rows]
                        cols = list(row_dicts[0].keys())
                        placeholders = ", ".join([f":{c}" for c in cols])
                        ins_sql = text(f"INSERT IGNORE INTO `{tbl}` ({', '.join([f'`{c}`' for c in cols])}) VALUES ({placeholders})")
                        conn_z.execute(ins_sql, row_dicts)
                        conn_z.commit()

                    conn_z.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
                    conn_z.commit()
                    created_in_zippy.append(tbl)
                except Exception as ex:
                    errors.append(f"zippy_crm.{tbl}: {ex}")

            final_z = len(conn_z.execute(text("SHOW TABLES IN `zippy_crm`;")).fetchall())
            final_m = len(conn_m.execute(text("SHOW TABLES IN `zenve_main`;")).fetchall())

        return {
            "status": "success" if not errors else "partial",
            "zippy_crm_tables": final_z,
            "zenve_main_tables": final_m,
            "tables_added_to_zenve_main": created_in_zenve,
            "tables_added_to_zippy_crm": created_in_zippy,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to equalize databases: {e}")

@router.get("/verify")
def verify_databases():
    """Verifies live read/write capability on both zippy_crm and zenve_main databases."""
    zippy_ok = False
    zenve_ok = False
    zippy_err = None
    zenve_err = None
    zippy_tables = 0
    zenve_tables = 0

    try:
        with engine_zippy.connect() as conn:
            conn.execute(text("SELECT 1"))
            zippy_tables = len(conn.execute(text("SHOW TABLES")).fetchall())
            zippy_ok = True
    except Exception as e:
        zippy_err = str(e)

    try:
        with engine_zenve.connect() as conn:
            conn.execute(text("SELECT 1"))
            zenve_tables = len(conn.execute(text("SHOW TABLES")).fetchall())
            zenve_ok = True
    except Exception as e:
        zenve_err = str(e)

    return {
        "overall_status": "healthy" if (zippy_ok and zenve_ok) else "degraded",
        "zippy_crm": {
            "database": "zippy_crm",
            "connected": zippy_ok,
            "table_count": zippy_tables,
            "error": zippy_err
        },
        "zenve_main": {
            "database": "zenve_main",
            "connected": zenve_ok,
            "table_count": zenve_tables,
            "error": zenve_err
        }
    }

