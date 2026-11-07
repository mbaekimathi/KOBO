import socket
import sys

import pymysql

HOST = "127.0.0.1"
PORT = 3306

print("Checking TCP port...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(3)
try:
    sock.connect((HOST, PORT))
    print(f"Port {PORT} is open")
except OSError as exc:
    print(f"Port {PORT} is closed/unreachable: {exc}")
    sys.exit(2)
finally:
    sock.close()

print("Connecting with PyMySQL...")
try:
    conn = pymysql.connect(
        host=HOST,
        user="root",
        password="",
        port=PORT,
        connect_timeout=5,
        charset="utf8mb4",
    )
    with conn.cursor() as cur:
        cur.execute(
            "CREATE DATABASE IF NOT EXISTS `KOBO COLLECT` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        conn.commit()
    print("Database `KOBO COLLECT` is ready")
    conn.close()
except pymysql.Error as exc:
    print(f"MySQL error: {exc}")
    sys.exit(1)