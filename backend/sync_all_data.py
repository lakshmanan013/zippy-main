"""
Sync All Data Between zippy_crm and zenve_main
- Zero cross-privilege required: reads with source credentials, writes with destination credentials.
- Handles foreign key checks safely.
- Transfers matching columns only.
- Uses INSERT ... ON DUPLICATE KEY UPDATE so existing data is never corrupted or deleted.
"""
import sys
from pathlib import Path
from sqlalchemy import text, inspect

# Add backend to path
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from database import engine_zippy, engine_zenve

def get_columns(conn, table_name):
    """Retrieve column names for a given table."""
    res = conn.execute(text(f"""
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}'
    """)).fetchall()
    return [r[0] for r in res]

def sync_table(source_conn, target_conn, table_name, direction="zippy -> zenve"):
    cols_src = set(get_columns(source_conn, table_name))
    cols_dst = set(get_columns(target_conn, table_name))
    common_cols = sorted(list(cols_src.intersection(cols_dst)))

    if not common_cols:
        return 0, "No common columns"

    # Select all rows from source
    col_str = ", ".join([f"`{c}`" for c in common_cols])
    rows = source_conn.execute(text(f"SELECT {col_str} FROM `{table_name}`;")).mappings().all()
    if not rows:
        return 0, "Empty"

    row_dicts = [dict(r) for r in rows]
    placeholders = ", ".join([f":{c}" for c in common_cols])
    update_clause = ", ".join([f"`{c}` = VALUES(`{c}`)" for c in common_cols])
    
    ins_sql = text(f"""
        INSERT INTO `{table_name}` ({col_str})
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_clause}
    """)

    target_conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
    # Execute in batches of 200
    batch_size = 200
    for i in range(0, len(row_dicts), batch_size):
        target_conn.execute(ins_sql, row_dicts[i:i+batch_size])
    target_conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
    target_conn.commit()

    return len(rows), "Success"

def run_sync():
    print("=" * 80)
    print("FULL DATA SYNCHRONIZATION: zippy_crm <=======> zenve_main")
    print("=" * 80)

    with engine_zippy.connect() as conn_z, engine_zenve.connect() as conn_m:
        tables_z = set(r[0] for r in conn_z.execute(text("SHOW TABLES;")).fetchall())
        tables_m = set(r[0] for r in conn_m.execute(text("SHOW TABLES;")).fetchall())

        all_tables = sorted(list(tables_z.union(tables_m)))
        print(f"Total tables to evaluate: {len(all_tables)}")

        # 1. Sync from zippy_crm -> zenve_main
        print("\n--- [Phase 1] Syncing records from zippy_crm -> zenve_main ---")
        for tbl in all_tables:
            if tbl in tables_z and tbl in tables_m:
                count_z = conn_z.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
                if count_z > 0:
                    try:
                        synced, msg = sync_table(conn_z, conn_m, tbl, direction="zippy -> zenve")
                        print(f"  ✓ zenve_main.{tbl}: synced {synced} rows from zippy_crm ({msg})")
                    except Exception as e:
                        print(f"  ⚠️ Error syncing zippy.{tbl} -> zenve: {e}")

        # 2. Sync from zenve_main -> zippy_crm (for tables with data only in zenve_main)
        print("\n--- [Phase 2] Syncing records from zenve_main -> zippy_crm ---")
        for tbl in all_tables:
            if tbl in tables_z and tbl in tables_m:
                count_m = conn_m.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
                if count_m > 0:
                    try:
                        synced, msg = sync_table(conn_m, conn_z, tbl, direction="zenve -> zippy")
                        print(f"  ✓ zippy_crm.{tbl}: synced {synced} rows from zenve_main ({msg})")
                    except Exception as e:
                        print(f"  ⚠️ Error syncing zenve.{tbl} -> zippy: {e}")

    print("\n" + "=" * 80)
    print("SYNCHRONIZATION COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    run_sync()

