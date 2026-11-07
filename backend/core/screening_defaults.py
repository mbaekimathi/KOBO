"""Pure defaults builder for Eyeglasses Pilot Screening."""

from __future__ import annotations

from copy import deepcopy
from datetime import date

from .screening_config import (
    CADRE_FROM_DAILY,
    DEFAULTS,
    DISTRIBUTION_FROM_DAILY,
    DIOPTRE_STRENGTHS,
    PARTNER_FROM_DAILY,
)
from .screening_rules import apply_all_rules, nairobi_today


def _blank_form() -> dict:
    return {
        "q1_part_a_explained": "",
        "q2_consent_personal": "",
        "q3_date_of_service": "",
        "q4_provider_name": "",
        "q5_cadre": "",
        "q5b_cadre_other": "",
        "q6_county": "",
        "q7_subcounty": "",
        "q7b_subcounty_other": "",
        "q8_distribution_point": "",
        "q8b_distribution_point_other": "",
        "q9_facility": "",
        "q9b_facility_other": "",
        "q10_implementing_partner": "",
        "q10b_implementing_partner_other": "",
        "q11_aged_35_plus": "",
        "q12_age_group": "",
        "q13_name": "",
        "q14_dob": "",
        "q15_sex": "",
        "q16_ward_village": "",
        "q17_occupation": "",
        "q17b_occupation_other": "",
        "q18_wears_distance_glasses": "",
        "q19_distance_va_right": "",
        "q20_distance_va_left": "",
        "q21_distance_outcome": "",
        "q22_reason_not_tested": "",
        "q23_owned_reading_glasses": "",
        "q24_near_va_own_glasses": "",
        "q25_own_glasses_adequate": "",
        "q26_near_va_unaided": "",
        "q27_nvi_confirmed": "",
        "q28_red_flags": "",
        "q28b_red_flags_detail": "",
        "q29_glasses_provided": "",
        "q29b_reason_not_provided": "",
        "q29c_reason_other": "",
        "q30_dioptre_strength": "",
        "q31_near_va_dispensed": "",
        "q32_first_pair": "",
        "q33_referred": "",
        "q34_referral_reasons": [],
        "q34b_referral_other": "",
        "q35_facility_referred_to": "",
        "q36_how_heard": [],
        "q36b_how_heard_other": "",
        "q37_has_mobile_phone": "",
        "q38_sms_consent": "",
        "q39_phone_number": "",
        "q40_sms_language": "",
        "q40b_sms_language_other": "",
        "q41_comments": "",
        "missing_fields": [],
        "flags": [],
        "contains_personal_data": True,
        "_client_dob": "",
    }


def build_screening_defaults(client, session, system_config=None, as_of: date | None = None):
    """
    Pure function: return pre-filled form object.

    client: object/dict with name, date_of_birth, sex, occupation, phone_*, village
    session: dict with user (full_name) and optional daily_detail
    system_config: optional { implementing_partner, dioptre_stock }
    """
    system_config = system_config or {}
    form = _blank_form()
    form.update(deepcopy(DEFAULTS))
    missing = []
    flags = []

    # SESSION — provider
    user = (session or {}).get("user") or {}
    provider = (
        user.get("full_name")
        or " ".join(
            p
            for p in [
                user.get("first_name"),
                user.get("middle_name"),
                user.get("last_name"),
            ]
            if p
        ).strip()
    )
    if provider:
        form["q4_provider_name"] = provider
    else:
        missing.append("q4_provider_name")

    daily = (session or {}).get("daily_detail") or {}

    cadre_code = daily.get("cadre") or ""
    form["q5_cadre"] = CADRE_FROM_DAILY.get(cadre_code, "")
    form["q5b_cadre_other"] = daily.get("cadre_other") or ""
    if not form["q5_cadre"]:
        missing.append("q5_cadre")

    form["q6_county"] = daily.get("county") or ""
    if not form["q6_county"]:
        missing.append("q6_county")

    form["q7_subcounty"] = daily.get("subcounty") or ""
    if not form["q7_subcounty"]:
        missing.append("q7_subcounty")

    dist_code = daily.get("distribution_point") or ""
    form["q8_distribution_point"] = DISTRIBUTION_FROM_DAILY.get(dist_code, "")
    form["q8b_distribution_point_other"] = daily.get("distribution_point_other") or ""
    if not form["q8_distribution_point"]:
        missing.append("q8_distribution_point")

    facility = daily.get("facility_name") or ""
    form["q9_facility"] = facility
    if not facility:
        missing.append("q9_facility")

    # SYSTEM implementing partner — use system_config, else today's daily detail, else blank+flag
    partner = system_config.get("implementing_partner")
    partner_other = system_config.get("implementing_partner_other") or ""
    if not partner:
        partner_code = daily.get("implementing_partner") or ""
        partner = PARTNER_FROM_DAILY.get(partner_code, "")
        partner_other = daily.get("implementing_partner_other") or ""
        if partner:
            flags.append("q10_from_daily_detail_not_system_config")
    form["q10_implementing_partner"] = partner or ""
    form["q10b_implementing_partner_other"] = partner_other
    if not form["q10_implementing_partner"]:
        missing.append("q10_implementing_partner")

    # Q16 ward/village — SESSION location missing in system
    form["q16_ward_village"] = ""
    missing.append("q16_ward_village")
    flags.append("q16_session_location_missing")

    # CLIENT
    client = client or {}
    dob = client.get("date_of_birth") or ""
    if hasattr(dob, "isoformat"):
        dob = dob.isoformat()
    form["_client_dob"] = dob
    form["q14_dob"] = dob
    form["q13_name"] = (client.get("name") or "").strip()
    sex = client.get("sex") or client.get("sex_display") or ""
    if sex in ("MALE", "Male"):
        form["q15_sex"] = "Male"
    elif sex in ("FEMALE", "Female"):
        form["q15_sex"] = "Female"
    else:
        form["q15_sex"] = ""
        missing.append("q15_sex")

    occupation = (client.get("occupation") or "").strip()
    known = {"Farmer", "Retired", "Formal employment"}
    if occupation in known:
        form["q17_occupation"] = occupation
    elif occupation:
        form["q17_occupation"] = "Other"
        form["q17b_occupation_other"] = occupation
    else:
        missing.append("q17_occupation")

    phone = client.get("phone_display") or ""
    if not phone:
        code = client.get("phone_country_code") or ""
        number = client.get("phone_number") or ""
        phone = f"{code} {number}".strip()
    form["q39_phone_number"] = phone
    if not phone:
        missing.append("q39_phone_number")

    if not form["q13_name"]:
        missing.append("q13_name")
    if not dob:
        missing.append("q14_dob")

    # Dioptre stock — no inventory system; expose all strengths as available + flag
    stock = system_config.get("dioptre_stock")
    if not stock:
        stock = {f"+{s}": True for s in DIOPTRE_STRENGTHS}
        flags.append("dioptre_stock_system_missing")
    form["dioptre_stock"] = stock

    form["missing_fields"] = missing
    form["flags"] = flags
    form["q3_date_of_service"] = nairobi_today(as_of).isoformat()

    return apply_all_rules(form, as_of=as_of)
