"""Eyeglasses Pilot Screening (Homa Bay & Meru 2026) — defaults and option lists."""

from decimal import Decimal

FORM_TITLE = "Eyeglasses Pilot Screening"
FORM_SCOPE = "Homa Bay & Meru 2026"
TIMEZONE = "Africa/Nairobi"

YES_NO = ("Yes", "No")

Q1_OPTIONS = ("Yes", "Client did not engage")
Q2_OPTIONS = YES_NO

CADRE_OPTIONS = (
    "CHP",
    "CHA",
    "Nurse",
    "Clinical Officer",
    "Doctor or Ophthalmologist",
    "Public Health Officer",
    "Pharmacist",
    "Other",
)

DISTRIBUTION_POINT_OPTIONS = (
    "Primary Health Facility",
    "KSB",
    "Community Health Unit (CHP outreach)",
    "Community outreach or baraza",
    "Pharmacy",
    "School",
    "Other",
)

IMPLEMENTING_PARTNER_OPTIONS = (
    "Public Sector (L1/L2/L3 Government Facility)",
    "Other",
)

AGE_GROUP_OPTIONS = (
    "Under 35",
    "35–49",
    "50–64",
    "65+",
)

SEX_OPTIONS = ("Male", "Female")

DISTANCE_VA_OPTIONS = (
    "Reads 6/12 or better",
    "Cannot read 6/12",
    "Not tested",
)

NEAR_VA_OPTIONS = (
    "N5",
    "N6",
    "N8",
    "N10",
    "N12",
    "N14",
    "N18",
    "N24 or worse",
    "Not tested",
)

NEAR_VA_RANK = {
    "N5": 5,
    "N6": 6,
    "N8": 8,
    "N10": 10,
    "N12": 12,
    "N14": 14,
    "N18": 18,
    "N24 or worse": 24,
    "Not tested": None,
}

DISTANCE_OUTCOME_OPTIONS = ("Pass", "Fail", "Incomplete")

GLASSES_NOT_PROVIDED_REASONS = (
    "Stock-out",
    "Client declined",
    "Already has appropriate glasses",
    "Red flag, referred before glasses given",
    "Other",
)

DIOPTRE_STRENGTHS = tuple(
    Decimal(f"{value:.2f}")
    for value in (1.00, 1.50, 2.00, 2.50, 3.00, 3.50)
)

REFERRAL_REASON_OPTIONS = (
    "Failed distance VA",
    "Near vision not corrected to N6",
    "Abnormal appearance of eye",
    "Other visual symptom",
    "Other eye symptom",
    "Other",
)

HEARD_ABOUT_OPTIONS = (
    "CHP",
    "Clinic/health facility",
    "Community outreach/baraza",
    "Church/faith-based",
    "Radio",
    "Billboard/poster",
    "Social media",
    "Friend/family",
    "Other",
)

PHONE_TYPE_OPTIONS = ("Smartphone", "Basic phone", "None")

SMS_LANGUAGE_OPTIONS = (
    "Dholuo",
    "Kiswahili",
    "English",
    "Ekegusii",
    "Kuria",
    "Kimeru",
    "Kikuyu",
    "Other",
)

# Editable defaults applied once at form creation.
DEFAULTS = {
    "q1_part_a_explained": "Yes",
    "q2_consent_personal": "Yes",
    "q18_wears_distance_glasses": "No",
    "q19_distance_va_right": "Reads 6/12 or better",
    "q20_distance_va_left": "Reads 6/12 or better",
    "q23_owned_reading_glasses": "No",
    "q24_near_va_own_glasses": "N8",
    "q26_near_va_unaided": "N8",
    "q28_red_flags": "No",
    "q29_glasses_provided": "Yes",
    "q31_near_va_dispensed": "N6",
    "q32_first_pair": "Yes",
    "q33_referred": "No",
    "q36_how_heard": ["CHP", "Community outreach/baraza"],
    "q37_has_mobile_phone": "Basic phone",
    "q38_sms_consent": "Yes",
    "q40_sms_language": "Kiswahili",
    "q41_comments": "Presbyopia was corrected",
}

# Map DailyDetail cadre codes → form labels.
CADRE_FROM_DAILY = {
    "CHP": "CHP",
    "CHA": "CHA",
    "NURSE": "Nurse",
    "CLINICAL_OFFICER": "Clinical Officer",
    "DOCTOR_OPHTHALMOLOGIST": "Doctor or Ophthalmologist",
    "PUBLIC_HEALTH_OFFICER": "Public Health Officer",
    "PHARMACIST": "Pharmacist",
    "OTHER": "Other",
}

DISTRIBUTION_FROM_DAILY = {
    "PRIMARY_HEALTH_FACILITY": "Primary Health Facility",
    "KSB": "KSB",
    "COMMUNITY_HEALTH_UNIT": "Community Health Unit (CHP outreach)",
    "COMMUNITY_OUTREACH": "Community outreach or baraza",
    "PHARMACY": "Pharmacy",
    "SCHOOL": "School",
    "OTHER": "Other",
}

PARTNER_FROM_DAILY = {
    "PUBLIC_SECTOR": "Public Sector (L1/L2/L3 Government Facility)",
    "OTHER": "Other",
}

PERSONAL_FIELDS = (
    "q13_name",
    "q14_dob",
    "q16_ward_village",
    "q17_occupation",
    "q17b_occupation_other",
    "q39_phone_number",
)

AUTO_FIELDS = (
    "q3_date_of_service",
    "q11_aged_35_plus",
    "q12_age_group",
    "q21_distance_outcome",
    "q25_own_glasses_adequate",
    "q27_nvi_confirmed",
)
