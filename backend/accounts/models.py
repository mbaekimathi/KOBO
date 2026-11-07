import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models


login_code_validator = RegexValidator(
    regex=r"^\d{6}$",
    message="Login code must be exactly 6 digits.",
)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, login_code, email, password, **extra_fields):
        if not login_code:
            raise ValueError("Login code is required")
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        login_code = str(login_code).strip()
        if not extra_fields.get("username"):
            extra_fields["username"] = f"user_{login_code}"

        user = self.model(login_code=login_code, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, login_code, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("is_verified", False)
        extra_fields.setdefault("role", User.Role.PENDING)
        extra_fields.setdefault(
            "account_status", User.AccountStatus.PENDING_VERIFICATION
        )
        return self._create_user(login_code, email, password, **extra_fields)

    def create_superuser(self, login_code, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("account_status", User.AccountStatus.ACTIVE)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(login_code, email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        PENDING = "PENDING", "Pending Role Allocation"
        ADMIN = "ADMIN", "Admin"
        IT_SUPPORT = "IT_SUPPORT", "IT Support"
        DATA_ENTRY = "DATA_ENTRY", "Data Entry"

    class AccountStatus(models.TextChoices):
        PENDING_VERIFICATION = "PENDING_VERIFICATION", "Pending Verification"
        PENDING_ROLE = "PENDING_ROLE", "Pending Role Allocation"
        ACTIVE = "ACTIVE", "Active"
        REJECTED = "REJECTED", "Rejected"

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    login_code = models.CharField(
        max_length=6,
        unique=True,
        validators=[login_code_validator],
        help_text="6-digit employee login code",
    )
    first_name = models.CharField(max_length=150)
    middle_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150)
    phone_country_code = models.CharField(max_length=8, blank=True, default="+254")
    phone_number = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True,
    )

    is_verified = models.BooleanField(default=False)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PENDING,
    )
    account_status = models.CharField(
        max_length=30,
        choices=AccountStatus.choices,
        default=AccountStatus.PENDING_VERIFICATION,
    )
    # Rotated on each login so only one device/session can use tokens at a time.
    active_session_id = models.CharField(max_length=64, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "login_code"
    REQUIRED_FIELDS = ["email", "first_name", "last_name", "username"]

    objects = UserManager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.login_code})"

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(part for part in parts if part).strip()

    @property
    def phone_display(self):
        if not self.phone_number:
            return ""
        code = self.phone_country_code or ""
        return f"{code} {self.phone_number}".strip()

    @property
    def role_route(self):
        mapping = {
            self.Role.ADMIN: "/admin",
            self.Role.IT_SUPPORT: "/it-support",
            self.Role.DATA_ENTRY: "/data-entry",
            self.Role.PENDING: "/pending",
        }
        return mapping.get(self.role, "/pending")

    def sync_account_status(self):
        if self.account_status == self.AccountStatus.REJECTED:
            return
        if not self.is_verified:
            self.account_status = self.AccountStatus.PENDING_VERIFICATION
        elif self.role == self.Role.PENDING:
            self.account_status = self.AccountStatus.PENDING_ROLE
        else:
            self.account_status = self.AccountStatus.ACTIVE

    def start_session(self):
        """Issue a new session id — invalidates every previous device immediately."""
        self.active_session_id = uuid.uuid4().hex
        return self.active_session_id

    def clear_session(self):
        self.active_session_id = ""
