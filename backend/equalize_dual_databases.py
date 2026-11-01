"""
Dual Database Equalizer (Independent Credential Replication)
Uses zippy_crm_app to read from zippy_crm and zenve_main_user to write to zenve_main.
Does NOT require cross-database MySQL permissions.
"""
import sys
from sqlalchemy import text
from database import engine_zippy, engine_zenve, init_db

def equalize_databases():
    print("=" * 80)
    print("ZENVE ZIPPY - DUAL DATABASE EQUALIZER (Zero Cross-Privilege Required)")
    print("zippy_crm <=====================> zenve_main")
    print("=" * 80)

    try:
        with engine_zippy.connect() as conn_z, engine_zenve.connect() as conn_m:
            # 1. Fetch tables
            res_z = conn_z.execute(text("SHOW TABLES;")).fetchall()
            tables_zippy = set(r[0] for r in res_z)
            print(f"[zippy_crm] Current tables: {len(tables_zippy)}")

            res_m = conn_m.execute(text("SHOW TABLES;")).fetchall()
            tables_zenve = set(r[0] for r in res_m)
            print(f"[zenve_main] Current tables: {len(tables_zenve)}")

            # 2. Clone missing tables from zippy_crm -> zenve_main
            to_zenve = tables_zippy - tables_zenve
            print(f"\n[Step 1] Syncing {len(to_zenve)} tables from zippy_crm into zenve_main...")
            for tbl in sorted(to_zenve):
                try:
                    # Fetch DDL using zippy credentials
                    create_res = conn_z.execute(text(f"SHOW CREATE TABLE `{tbl}`;")).fetchone()
                    create_sql = create_res[1]

                    # Execute DDL in zenve_main using zenve credentials
                    conn_m.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
                    conn_m.execute(text(create_sql))
                    conn_m.commit()

                    # Copy data in batches if records exist
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
                    print(f"  ✓ zenve_main: Created `{tbl}` ({len(rows)} records copied)")
                except Exception as ex:
                    print(f"  ⚠️ Error syncing `{tbl}` to zenve_main: {ex}")

            # 3. Clone missing tables from zenve_main -> zippy_crm
            to_zippy = tables_zenve - tables_zippy
            print(f"\n[Step 2] Syncing {len(to_zippy)} tables from zenve_main into zippy_crm...")
            for tbl in sorted(to_zippy):
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
                    print(f"  ✓ zippy_crm: Created `{tbl}` ({len(rows)} records copied)")
                except Exception as ex:
                    print(f"  ⚠️ Error syncing `{tbl}` to zippy_crm: {ex}")

            # 4. Final summary
            final_z = len(conn_z.execute(text("SHOW TABLES;")).fetchall())
            final_m = len(conn_m.execute(text("SHOW TABLES;")).fetchall())

            print("\n" + "=" * 80)
            print("EQUALIZATION COMPLETE")
            print("=" * 80)
            print(f"zippy_crm Total Tables:  {final_z}")
            print(f"zenve_main Total Tables: {final_m}")
            print("=" * 80)

    except Exception as e:
        print(f"\n[Error] Connection or equalization failed: {e}")
        return False

    print("\n[Step 3] Verifying SQLAlchemy models across both databases...")
    init_db()
    return True

if __name__ == "__main__":
    equalize_databases()
