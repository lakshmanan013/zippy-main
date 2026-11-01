import socket
import sys

def test_socket(host, port, desc):
    print(f"\n--- Checking TCP Port: {desc} ({host}:{port}) ---")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3)
    try:
        s.connect((host, port))
        print(f"✓ TCP Connection to {host}:{port} SUCCEEDED!")
        s.close()
        return True
    except Exception as e:
        print(f"✗ TCP Connection to {host}:{port} FAILED: {e}")
        s.close()
        return False

def test_mysql_login(host, port, user, password, db_name=None):
    import pymysql
    print(f"\nTesting MySQL login: user='{user}' on {host}:{port}" + (f" db='{db_name}'" if db_name else ""))
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=db_name,
            connect_timeout=4
        )
        print(f"✓ MySQL Login SUCCESSFUL for '{user}'!")
        with conn.cursor() as cur:
            cur.execute("SHOW DATABASES;")
            dbs = [row[0] for row in cur.fetchall()]
            print(f"  Available databases on server: {dbs}")
            
            for d in dbs:
                if d in ("information_schema", "performance_schema", "mysql", "sys"):
                    continue
                try:
                    cur.execute(f"SHOW TABLES IN `{d}`;")
                    tables = [r[0] for r in cur.fetchall()]
                    print(f"  -> Database '{d}' has {len(tables)} tables: {tables[:10]}...")
                except Exception as ex:
                    print(f"  -> Database '{d}': could not list tables ({ex})")
        conn.close()
        return True
    except Exception as e:
        print(f"✗ MySQL Login FAILED for '{user}': {e}")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("ZENVE / ZIPPY DATABASE CONNECTION DIAGNOSTIC TOOL")
    print("=" * 70)

    # 1. Test local tunnel port 3307
    tunnel_ok = test_socket("127.0.0.1", 3307, "SSH Tunnel (Local Port 3307)")
    
    # 2. Test direct server IP on 3306
    direct_ok = test_socket("95.135.254.123", 3306, "Direct Remote Server (95.135.254.123:3306)")

    targets = []
    if tunnel_ok:
        targets.append(("127.0.0.1", 3307))
    if direct_ok:
        targets.append(("95.135.254.123", 3306))
    if not targets:
        targets.append(("127.0.0.1", 3307))

    credentials = [
        ("zippy_crm_app", "zippy-123", "zippy_crm"),
        ("zenve_main_user", "zenvemain-123", "zenve_main"),
        ("root", "Vasanth@zenve", None),
    ]

    for host, port in targets:
        print(f"\n=======================================================")
        print(f"Attempting MySQL authentication on {host}:{port}")
        print(f"=======================================================")
        for user, pwd, db in credentials:
            test_mysql_login(host, port, user, pwd, db)
