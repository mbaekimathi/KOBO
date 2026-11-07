"""
Create a default verified Admin account for KOBO COLLECT.
Run: python scripts/seed_admin.py
"""

import os
import sys
from pathlib import Path

import django

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kobo_collect.settings")
django.setup()

from accounts.models import User  # noqa: E402

EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@kobocollect.org")
PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "123456")
LOGIN_CODE = os.getenv("SEED_ADMIN_LOGIN_CODE", "100001")
USERNAME = os.getenv("SEED_ADMIN_USERNAME", "admin")


def main():
    user, created = User.objects.get_or_create(
        login_code=LOGIN_CODE,
        defaults={
            "email": EMAIL,
            "username": USERNAME,
            "first_name": "System",
            "middle_name": "",
            "last_name": "Administrator",
            "is_staff": True,
            "is_superuser": True,
            "is_verified": True,
            "role": User.Role.ADMIN,
            "account_status": User.AccountStatus.ACTIVE,
        },
    )
    user.email = EMAIL
    user.username = USERNAME
    user.first_name = "System"
    user.last_name = "Administrator"
    user.set_password(PASSWORD)
    user.is_staff = True
    user.is_superuser = True
    user.is_verified = True
    user.role = User.Role.ADMIN
    user.account_status = User.AccountStatus.ACTIVE
    user.save()
    print(
        ("Created" if created else "Updated")
        + f" admin: code {LOGIN_CODE} / {PASSWORD}"
    )


if __name__ == "__main__":
    main()
