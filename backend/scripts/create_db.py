"""
Create the MySQL database `KOBO COLLECT` using PyMySQL.
Run: python scripts/create_db.py
"""

import os
import sys
from pathlib import Path

import pymysql
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DB_NAME = os.getenv("DB_NAME", "KOBO COLLECT")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))


def main():
    print(f"Connecting to MySQL at {DB_HOST}:{DB_PORT} as {DB_USER}...")
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            charset="utf8mb4",
        )
    except pymysql.Error as exc:
        print(f"Failed to connect to MySQL: {exc}")
        print("Make sure MySQL is running and credentials in backend/.env are correct.")
        sys.exit(1)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
            connection.commit()
            print(f'Database `{DB_NAME}` is ready.')
    finally:
        connection.close()


if __name__ == "__main__":
    main()