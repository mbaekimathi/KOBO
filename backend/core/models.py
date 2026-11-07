from datetime import date

from django.conf import settings
from django.db import models


class DailyDetail(models.Model):
    class Cadre(models.TextChoices):
        CHP = "CHP", "CHP"
        CHA = "CHA", "CHA"
        NURSE = "NURSE", "Nurse"
        CLINICAL_OFFICER = "CLINICAL_OFFICER", "Clinical Officer"
        DOCTOR_OPHTHALMOLOGIST = (
            "DOCTOR_OPHTHALMOLOGIST",
            "Doctor or Ophthalmologist",
        )
        PUBLIC_HEALTH_OFFICER = "PUBLIC_HEALTH_OFFICER", "Public Health Officer"
        PHARMACIST = "PHARMACIST", "Pharmacist"
        OTHER = "OTHER", "Other"

    class DistributionPoint(models.TextChoices):
        PRIMARY_HEALTH_FACILITY = (
            "PRIMARY_HEALTH_FACILITY",
            "Primary Health Facility",
        )
        KSB = "KSB", "KSB"
        COMMUNITY_HEALTH_UNIT = (
            "COMMUNITY_HEALTH_UNIT",
            "Community Health Unit (CHP outreach)",
        )
        COMMUNITY_OUTREACH = (
            "COMMUNITY_OUTREACH",
            "Community outreach or baraza",
        )
        PHARMACY = "PHARMACY", "Pharmacy"
        SCHOOL = "SCHOOL", "School"
        OTHER = "OTHER", "Other"

    class ImplementingPartner(models.TextChoices):
        PUBLIC_SECTOR = (
            "PUBLIC_SECTOR",
            "Public Sector (L1/L2/L3 Government Facility)",
        )
        OTHER = "OTHER", "Other"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_details",
    )
    work_date = models.DateField(default=date.today)
    country = models.CharField(max_length=120)
    county = models.CharField(max_length=120)
    subcounty = models.CharField(max_length=120)
    cadre = models.CharField(max_length=40, choices=Cadre.choices)
    cadre_other = models.CharField(max_length=120, blank=True, default="")
    distribution_point = models.CharField(
        max_length=40,
        choices=DistributionPoint.choices,
    )
    distribution_point_other = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )
    facility_name = models.CharField(max_length=255)
    implementing_partner = models.CharField(
        max_length=40,
        choices=ImplementingPartner.choices,
    )
    implementing_partner_other = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-work_date", "-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "work_date"],
                name="uniq_daily_detail_user_work_date",
            )
        ]

    def __str__(self):
        return f"{self.user_id} · {self.work_date} · {self.facility_name}"


class Client(models.Model):
    class Sex(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"

    name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    sex = models.CharField(max_length=10, choices=Sex.choices)
    phone_country_code = models.CharField(max_length=8)
    phone_number = models.CharField(max_length=20)
    occupation = models.CharField(max_length=120)
    village = models.CharField(max_length=120)
    dioptre = models.DecimalField(
        "dioptre strength provided",
        max_digits=6,
        decimal_places=2,
    )
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registered_clients",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def age(self):
        today = date.today()
        years = today.year - self.date_of_birth.year
        if (today.month, today.day) < (
            self.date_of_birth.month,
            self.date_of_birth.day,
        ):
            years -= 1
        return years


class Screening(models.Model):
    """Eyeglasses Pilot Screening (Homa Bay & Meru 2026) submission."""

    client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="screenings",
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="screenings",
    )
    date_of_service = models.DateField()
    answers = models.JSONField(default=dict)
    # Personal demographics kept separately so anonymous exports can omit them.
    personal = models.JSONField(default=dict, blank=True)
    contains_personal_data = models.BooleanField(default=False)
    is_anonymous = models.BooleanField(default=False)
    stopped_under_35 = models.BooleanField(default=False)
    missing_fields = models.JSONField(default=list, blank=True)
    flags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Screening {self.pk} · {self.date_of_service}"

    def export_safe(self):
        """Answers without personal fields for anonymous-safe export."""
        data = dict(self.answers or {})
        if not self.contains_personal_data:
            for key in (
                "q13_name",
                "q14_dob",
                "q16_ward_village",
                "q17_occupation",
                "q17b_occupation_other",
                "q39_phone_number",
            ):
                data.pop(key, None)
        return data
