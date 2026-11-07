from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "login_code",
        "email",
        "first_name",
        "middle_name",
        "last_name",
        "role",
        "is_verified",
        "account_status",
        "is_active",
        "created_at",
    )
    list_filter = ("role", "is_verified", "account_status", "is_staff")
    search_fields = (
        "email",
        "login_code",
        "first_name",
        "middle_name",
        "last_name",
        "username",
    )
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("login_code", "password")}),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "middle_name",
                    "last_name",
                    "email",
                    "phone_country_code",
                    "phone_number",
                    "username",
                    "profile_image",
                )
            },
        ),
        (
            "KOBO COLLECT access",
            {
                "fields": (
                    "role",
                    "is_verified",
                    "account_status",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "login_code",
                    "email",
                    "username",
                    "first_name",
                    "middle_name",
                    "last_name",
                    "password1",
                    "password2",
                    "role",
                    "is_verified",
                    "account_status",
                ),
            },
        ),
    )
