from django.contrib import admin

from .models import Client, DailyDetail, Screening


@admin.register(DailyDetail)
class DailyDetailAdmin(admin.ModelAdmin):
    list_display = (
        "work_date",
        "user",
        "country",
        "county",
        "subcounty",
        "cadre",
        "distribution_point",
        "facility_name",
        "implementing_partner",
        "updated_at",
    )
    list_filter = (
        "work_date",
        "country",
        "cadre",
        "distribution_point",
        "implementing_partner",
    )
    search_fields = (
        "facility_name",
        "county",
        "subcounty",
        "cadre_other",
        "user__login_code",
        "user__email",
        "user__first_name",
        "user__last_name",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sex",
        "date_of_birth",
        "village",
        "occupation",
        "dioptre",
        "phone_number",
        "registered_by",
        "created_at",
    )
    list_filter = ("sex", "occupation", "village", "created_at")
    search_fields = ("name", "phone_number", "village", "occupation")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Screening)
class ScreeningAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "date_of_service",
        "client",
        "provider",
        "is_anonymous",
        "stopped_under_35",
        "contains_personal_data",
        "created_at",
    )
    list_filter = (
        "date_of_service",
        "is_anonymous",
        "stopped_under_35",
        "contains_personal_data",
    )
    search_fields = ("answers", "personal", "client__name", "provider__login_code")
    readonly_fields = ("created_at", "updated_at")
