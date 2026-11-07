"""Visibility and calculation rules for Eyeglasses Pilot Screening.

Mirrored by frontend/src/screening/rules.js — keep semantics identical.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime
from zoneinfo import ZoneInfo

from .screening_config import (
    AUTO_FIELDS,
    NEAR_VA_RANK,
    PERSONAL_FIELDS,
    TIMEZONE,
)


def nairobi_today(as_of: date | None = None) -> date:
    if as_of is not None:
        return as_of
    return datetime.now(ZoneInfo(TIMEZONE)).date()


def age_years(dob: date | str | None, as_of: date | None = None) -> int | None:
    if not dob:
        return None
    if isinstance(dob, str):
        dob = date.fromisoformat(dob[:10])
    today = nairobi_today(as_of)
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


def age_group_from_years(years: int | None) -> str:
    if years is None:
        return ""
    if years < 35:
        return "Under 35"
    if years <= 49:
        return "35–49"
    if years <= 64:
        return "50–64"
    return "65+"


def near_va_worse_than_n6(value: str | None) -> bool:
    rank = NEAR_VA_RANK.get(value or "")
    return rank is not None and rank > 6


def near_va_is_n5_or_n6(value: str | None) -> bool:
    return value in ("N5", "N6")


def compute_q11(dob, as_of: date | None = None) -> str:
    years = age_years(dob, as_of)
    if years is None:
        return ""
    return "Yes" if years >= 35 else "No"


def compute_q12(dob, as_of: date | None = None) -> str:
    return age_group_from_years(age_years(dob, as_of))


def compute_q21(right: str | None, left: str | None) -> str:
    values = [right or "", left or ""]
    if "Cannot read 6/12" in values:
        return "Fail"
    if "Not tested" in values:
        return "Incomplete"
    if all(v == "Reads 6/12 or better" for v in values):
        return "Pass"
    return "Incomplete"


def compute_q25(owned: str | None, own_va: str | None) -> str:
    if owned == "Yes" and near_va_is_n5_or_n6(own_va):
        return "Yes"
    return "No"


def compute_q27(unaided: str | None) -> str:
    return "Yes" if near_va_worse_than_n6(unaided) else "No"


def apply_auto_fields(form: dict, as_of: date | None = None) -> dict:
    """Recompute AUTO fields in place (returns the same dict)."""
    data = form
    dob = data.get("q14_dob") or data.get("_client_dob")
    data["q3_date_of_service"] = nairobi_today(as_of).isoformat()
    data["q11_aged_35_plus"] = compute_q11(dob, as_of)
    data["q12_age_group"] = compute_q12(dob, as_of)
    data["q21_distance_outcome"] = compute_q21(
        data.get("q19_distance_va_right"),
        data.get("q20_distance_va_left"),
    )
    data["q25_own_glasses_adequate"] = compute_q25(
        data.get("q23_owned_reading_glasses"),
        data.get("q24_near_va_own_glasses"),
    )
    data["q27_nvi_confirmed"] = compute_q27(data.get("q26_near_va_unaided"))
    return data


def apply_derived_sets(form: dict, previous: dict | None = None) -> dict:
    """
    Live auto-set fields (Q29/Q29b/Q33/Q34/Q41).
    When a trigger is undone, restore previous non-auto values if provided.
    """
    data = form
    prev = previous or {}

    # Red flags force referral path for glasses.
    if data.get("q28_red_flags") == "Yes":
        data["q29_glasses_provided"] = "No"
        data["q29b_reason_not_provided"] = "Red flag, referred before glasses given"
        data["q33_referred"] = "Yes"
    elif prev.get("q28_red_flags") == "Yes":
        # Trigger undone — restore prior user values if known.
        if "q29_glasses_provided" in prev:
            data["q29_glasses_provided"] = prev.get("_user_q29_glasses_provided", "Yes")
        if prev.get("q29b_reason_not_provided") == "Red flag, referred before glasses given":
            data["q29b_reason_not_provided"] = prev.get("_user_q29b_reason_not_provided", "")

    reasons = list(data.get("q34_referral_reasons") or [])

    def ensure_reason(label: str):
        if label not in reasons:
            reasons.append(label)

    def drop_auto_reason(label: str):
        if label in reasons and label not in (data.get("_manual_referral_reasons") or []):
            reasons.remove(label)

    # Distance fail → refer + tick reason
    if data.get("q21_distance_outcome") == "Fail":
        data["q33_referred"] = "Yes"
        ensure_reason("Failed distance VA")
    else:
        drop_auto_reason("Failed distance VA")

    # Dispensed VA worse than N6 → refer
    if data.get("q29_glasses_provided") == "Yes" and near_va_worse_than_n6(
        data.get("q31_near_va_dispensed")
    ):
        data["q33_referred"] = "Yes"
        ensure_reason("Near vision not corrected to N6")
    else:
        drop_auto_reason("Near vision not corrected to N6")

    if data.get("q28_red_flags") == "Yes":
        data["q33_referred"] = "Yes"

    data["q34_referral_reasons"] = reasons

    # Q41 comments — only when glasses provided AND dispensed VA is N6 or better.
    if data.get("q29_glasses_provided") == "No":
        data["q41_comments"] = ""
    elif data.get("q29_glasses_provided") == "Yes" and near_va_is_n5_or_n6(
        data.get("q31_near_va_dispensed")
    ):
        if not (data.get("q41_comments") or "").strip():
            data["q41_comments"] = "Presbyopia was corrected"
    else:
        if data.get("q41_comments") == "Presbyopia was corrected":
            data["q41_comments"] = ""

    return data


def apply_all_rules(form: dict, as_of: date | None = None, previous: dict | None = None) -> dict:
    data = deepcopy(form)
    apply_auto_fields(data, as_of=as_of)
    apply_derived_sets(data, previous=previous)
    return data


def visibility(form: dict) -> dict:
    """Return which sections/fields are visible given current answers."""
    data = form
    consented = data.get("q2_consent_personal") == "Yes"
    engaged = data.get("q1_part_a_explained") == "Yes"
    under_35 = data.get("q11_aged_35_plus") == "No"
    stop_under_35 = under_35 and engaged
    show_section_d = (
        engaged
        and not stop_under_35
        and data.get("q25_own_glasses_adequate") == "No"
        and data.get("q27_nvi_confirmed") == "Yes"
    )
    owned_yes = data.get("q23_owned_reading_glasses") == "Yes"
    not_tested = (
        data.get("q19_distance_va_right") == "Not tested"
        or data.get("q20_distance_va_left") == "Not tested"
    )
    glasses_no = data.get("q29_glasses_provided") == "No"
    red_yes = data.get("q28_red_flags") == "Yes"
    referred = data.get("q33_referred") == "Yes"
    phone_none = data.get("q37_has_mobile_phone") == "None"
    sms_yes = data.get("q38_sms_consent") == "Yes"

    return {
        "form_active": engaged,
        "end_no_engage": data.get("q1_part_a_explained") == "Client did not engage",
        "stop_under_35": stop_under_35,
        "anonymous_track": not consented,
        "section_a": engaged,
        "section_b": engaged,
        "section_c": engaged and not stop_under_35,
        "section_d": show_section_d,
        "section_e": engaged and not stop_under_35,
        "section_f": engaged and not stop_under_35,
        "q5b": data.get("q5_cadre") == "Other",
        "q7b": data.get("q7_subcounty") == "Other",
        "q8b": data.get("q8_distribution_point") == "Other",
        "q9b": data.get("q9_facility") == "Other",
        "q10b": data.get("q10_implementing_partner") == "Other",
        "q13": consented,
        "q14": consented,
        "q16": consented,
        "q17": consented,
        "q17b": consented and data.get("q17_occupation") == "Other",
        "q22": not_tested,
        "q24": owned_yes,
        "q28b": red_yes,
        "q29": show_section_d,
        "q29b": show_section_d and glasses_no,
        "q29c": show_section_d and glasses_no and data.get("q29b_reason_not_provided") == "Other",
        "q30": show_section_d and not glasses_no,
        "q31": show_section_d and not glasses_no,
        "q32": show_section_d and not glasses_no,
        "q34": referred,
        "q34b": referred and "Other" in (data.get("q34_referral_reasons") or []),
        "q35": referred,
        "q36b": "Other" in (data.get("q36_how_heard") or []),
        "q38": not phone_none,
        "q39": not phone_none and sms_yes and consented,
        "q40": not phone_none and sms_yes,
        "q40b": not phone_none
        and sms_yes
        and data.get("q40_sms_language") == "Other",
    }


def strip_anonymous_personal(form: dict) -> dict:
    data = deepcopy(form)
    if data.get("q2_consent_personal") != "Yes":
        for key in PERSONAL_FIELDS:
            data[key] = "" if not key.endswith("_reasons") else []
        data["contains_personal_data"] = False
    else:
        data["contains_personal_data"] = True
    return data


def prepare_for_save(form: dict, as_of: date | None = None) -> dict | None:
    """
    Server-side finalize.
    Returns None if Q1 = did not engage (save nothing).
    Ignores client AUTO fields by recomputing them.
    """
    if form.get("q1_part_a_explained") == "Client did not engage":
        return None

    # Drop client-submitted AUTO values then recompute.
    cleaned = deepcopy(form)
    for key in AUTO_FIELDS:
        cleaned.pop(key, None)

    cleaned = apply_all_rules(cleaned, as_of=as_of)
    cleaned = strip_anonymous_personal(cleaned)

    # Under 35: force anonymous and stop clinical sections from requiring data.
    if cleaned.get("q11_aged_35_plus") == "No":
        cleaned["q2_consent_personal"] = "No"
        cleaned = strip_anonymous_personal(cleaned)
        cleaned["stopped_under_35"] = True
        cleaned["refer_to_hospital_message"] = "Refer to hospital"
    else:
        cleaned["stopped_under_35"] = False
        cleaned["refer_to_hospital_message"] = ""

    vis = visibility(cleaned)
    # Clear hidden personal-track fields that arrived populated on anonymous track.
    if vis["anonymous_track"]:
        for key in PERSONAL_FIELDS:
            cleaned[key] = ""

    if not vis["q22"]:
        cleaned["q22_reason_not_tested"] = ""
    if not vis["q24"]:
        cleaned["q24_near_va_own_glasses"] = cleaned.get("q24_near_va_own_glasses") or ""
    if not vis["section_d"]:
        cleaned["q29_glasses_provided"] = ""
        cleaned["q29b_reason_not_provided"] = ""
        cleaned["q29c_reason_other"] = ""
        cleaned["q30_dioptre_strength"] = ""
        cleaned["q31_near_va_dispensed"] = ""
        cleaned["q32_first_pair"] = ""
    elif cleaned.get("q29_glasses_provided") == "No":
        cleaned["q30_dioptre_strength"] = ""
        cleaned["q31_near_va_dispensed"] = ""
        cleaned["q32_first_pair"] = ""

    if cleaned.get("q29_glasses_provided") != "Yes" or not near_va_is_n5_or_n6(
        cleaned.get("q31_near_va_dispensed")
    ):
        if cleaned.get("q41_comments") == "Presbyopia was corrected":
            cleaned["q41_comments"] = ""
        if cleaned.get("q29_glasses_provided") == "No":
            cleaned["q41_comments"] = ""

    return cleaned
