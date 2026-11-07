from datetime import date
from decimal import Decimal

from django.test import TestCase

from accounts.models import User

from .models import Client, DailyDetail, Screening
from .screening_defaults import build_screening_defaults
from .screening_rules import (
    apply_all_rules,
    compute_q25,
    prepare_for_save,
    visibility,
)


def make_user(**kwargs):
    defaults = {
        "login_code": "111111",
        "email": "screener@example.com",
        "username": "user_111111",
        "first_name": "ALICE",
        "middle_name": "",
        "last_name": "NJERI",
        "password": "222222",
        "is_verified": True,
        "role": User.Role.IT_SUPPORT,
        "account_status": User.AccountStatus.ACTIVE,
    }
    defaults.update(kwargs)
    password = defaults.pop("password")
    user = User(**defaults)
    user.set_password(password)
    user.save()
    return user


def make_client(**kwargs):
    defaults = {
        "name": "TIMOTHY GITUMA",
        "date_of_birth": date(1980, 1, 15),
        "sex": Client.Sex.MALE,
        "phone_country_code": "+254",
        "phone_number": "712345678",
        "occupation": "Farmer",
        "village": "runogone",
        "dioptre": Decimal("1.50"),
    }
    defaults.update(kwargs)
    return Client.objects.create(**defaults)


def client_dict(client):
    return {
        "name": client.name,
        "date_of_birth": client.date_of_birth.isoformat(),
        "sex": client.sex,
        "occupation": client.occupation,
        "phone_country_code": client.phone_country_code,
        "phone_number": client.phone_number,
        "village": client.village,
    }


class ScreeningDefaultsTests(TestCase):
    def test_defaults_for_new_client(self):
        user = make_user()
        client = make_client()
        DailyDetail.objects.create(
            user=user,
            work_date=date.today(),
            country="Kenya",
            county="Meru",
            subcounty="Imenti North",
            cadre=DailyDetail.Cadre.CHP,
            distribution_point=DailyDetail.DistributionPoint.PRIMARY_HEALTH_FACILITY,
            facility_name="Githongo Health Centre",
            implementing_partner=DailyDetail.ImplementingPartner.PUBLIC_SECTOR,
        )
        form = build_screening_defaults(
            client=client_dict(client),
            session={
                "user": {
                    "full_name": user.full_name,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "daily_detail": {
                    "county": "Meru",
                    "subcounty": "Imenti North",
                    "cadre": "CHP",
                    "cadre_other": "",
                    "distribution_point": "PRIMARY_HEALTH_FACILITY",
                    "distribution_point_other": "",
                    "facility_name": "Githongo Health Centre",
                    "implementing_partner": "PUBLIC_SECTOR",
                    "implementing_partner_other": "",
                },
            },
        )
        self.assertEqual(form["q1_part_a_explained"], "Yes")
        self.assertEqual(form["q2_consent_personal"], "Yes")
        self.assertEqual(form["q4_provider_name"], user.full_name)
        self.assertEqual(form["q5_cadre"], "CHP")
        self.assertEqual(form["q6_county"], "Meru")
        self.assertEqual(form["q13_name"], "TIMOTHY GITUMA")
        self.assertEqual(form["q15_sex"], "Male")
        self.assertEqual(form["q17_occupation"], "Farmer")
        self.assertEqual(form["q11_aged_35_plus"], "Yes")
        self.assertIn("q16_ward_village", form["missing_fields"])
        self.assertIn("dioptre_stock_system_missing", form["flags"])


class ScreeningRulesTests(TestCase):
    def _base(self, **overrides):
        data = {
            "q1_part_a_explained": "Yes",
            "q2_consent_personal": "Yes",
            "q13_name": "JANE DOE",
            "q14_dob": "1985-06-01",
            "_client_dob": "1985-06-01",
            "q16_ward_village": "Ward A",
            "q17_occupation": "Farmer",
            "q39_phone_number": "+254 700000000",
            "q18_wears_distance_glasses": "No",
            "q19_distance_va_right": "Reads 6/12 or better",
            "q20_distance_va_left": "Reads 6/12 or better",
            "q23_owned_reading_glasses": "No",
            "q24_near_va_own_glasses": "N8",
            "q26_near_va_unaided": "N8",
            "q28_red_flags": "No",
            "q29_glasses_provided": "Yes",
            "q31_near_va_dispensed": "N6",
            "q33_referred": "No",
            "q34_referral_reasons": [],
            "q41_comments": "Presbyopia was corrected",
        }
        data.update(overrides)
        return data

    def test_q2_no_strips_personal_fields(self):
        prepared = prepare_for_save(
            self._base(q2_consent_personal="No", q14_dob="1980-01-01", _client_dob="1980-01-01")
        )
        self.assertEqual(prepared["q13_name"], "")
        self.assertEqual(prepared["q14_dob"], "")
        self.assertEqual(prepared["q16_ward_village"], "")
        self.assertEqual(prepared["q17_occupation"], "")
        self.assertEqual(prepared["q39_phone_number"], "")
        self.assertFalse(prepared["contains_personal_data"])

    def test_under_35_stops_anonymous(self):
        # Age 34 on fixed as_of
        as_of = date(2026, 11, 7)
        dob = date(1992, 11, 8)  # 33 turning 34 later? use 1991-11-08 → 34 on 2026-11-07
        dob = date(1991, 11, 8)
        prepared = prepare_for_save(
            self._base(
                q14_dob=dob.isoformat(),
                _client_dob=dob.isoformat(),
            ),
            as_of=as_of,
        )
        self.assertEqual(prepared["q11_aged_35_plus"], "No")
        self.assertTrue(prepared["stopped_under_35"])
        self.assertEqual(prepared["refer_to_hospital_message"], "Refer to hospital")
        self.assertFalse(prepared["contains_personal_data"])

        dob35 = date(1991, 11, 7)
        prepared35 = prepare_for_save(
            self._base(q14_dob=dob35.isoformat(), _client_dob=dob35.isoformat()),
            as_of=as_of,
        )
        self.assertEqual(prepared35["q11_aged_35_plus"], "Yes")
        self.assertFalse(prepared35["stopped_under_35"])

    def test_q23_no_gives_q25_no(self):
        self.assertEqual(compute_q25("No", "N5"), "No")
        form = apply_all_rules(
            self._base(q23_owned_reading_glasses="No", q24_near_va_own_glasses="N6")
        )
        self.assertEqual(form["q25_own_glasses_adequate"], "No")

    def test_q24_n6_gives_q25_yes_hides_section_d(self):
        form = apply_all_rules(
            self._base(
                q23_owned_reading_glasses="Yes",
                q24_near_va_own_glasses="N6",
                q26_near_va_unaided="N8",
            )
        )
        self.assertEqual(form["q25_own_glasses_adequate"], "Yes")
        vis = visibility(form)
        self.assertFalse(vis["section_d"])

    def test_red_flags_force_path(self):
        form = apply_all_rules(self._base(q28_red_flags="Yes", q26_near_va_unaided="N8"))
        self.assertEqual(form["q29_glasses_provided"], "No")
        self.assertEqual(
            form["q29b_reason_not_provided"],
            "Red flag, referred before glasses given",
        )
        self.assertEqual(form["q33_referred"], "Yes")

    def test_q31_n10_flips_referral(self):
        form = apply_all_rules(
            self._base(
                q26_near_va_unaided="N8",
                q25_own_glasses_adequate="No",
                q27_nvi_confirmed="Yes",
                q29_glasses_provided="Yes",
                q31_near_va_dispensed="N10",
            )
        )
        self.assertEqual(form["q33_referred"], "Yes")
        self.assertIn("Near vision not corrected to N6", form["q34_referral_reasons"])

    def test_distance_fail_referral(self):
        form = apply_all_rules(
            self._base(
                q19_distance_va_right="Cannot read 6/12",
                q20_distance_va_left="Reads 6/12 or better",
            )
        )
        self.assertEqual(form["q21_distance_outcome"], "Fail")
        self.assertEqual(form["q33_referred"], "Yes")
        self.assertIn("Failed distance VA", form["q34_referral_reasons"])

    def test_q41_cleared_when_q29_no(self):
        form = apply_all_rules(
            self._base(
                q29_glasses_provided="No",
                q41_comments="Presbyopia was corrected",
            )
        )
        self.assertEqual(form["q41_comments"], "")

    def test_q1_did_not_engage_saves_nothing(self):
        self.assertIsNone(
            prepare_for_save(self._base(q1_part_a_explained="Client did not engage"))
        )

    def test_tampered_auto_fields_recomputed(self):
        prepared = prepare_for_save(
            self._base(
                q19_distance_va_right="Cannot read 6/12",
                q20_distance_va_left="Cannot read 6/12",
                q21_distance_outcome="Pass",  # tampered
                q11_aged_35_plus="No",  # tampered
                q14_dob="1980-01-01",
                _client_dob="1980-01-01",
            ),
            as_of=date(2026, 11, 7),
        )
        self.assertEqual(prepared["q21_distance_outcome"], "Fail")
        self.assertEqual(prepared["q11_aged_35_plus"], "Yes")


class ScreeningAPITests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client_obj = make_client(registered_by=self.user)

    def test_ensure_creates_then_reloads(self):
        from rest_framework.test import APIClient

        api = APIClient()
        api.force_authenticate(user=self.user)
        first = api.post(
            "/api/screenings/ensure/",
            {"client_id": self.client_obj.id},
            format="json",
        )
        self.assertEqual(first.status_code, 201, first.data)
        self.assertTrue(first.data["created"])
        screening_id = first.data["screening"]["id"]
        self.assertEqual(first.data["screening"]["form"]["q13_name"], "TIMOTHY GITUMA")

        second = api.post(
            "/api/screenings/ensure/",
            {"client_id": self.client_obj.id},
            format="json",
        )
        self.assertEqual(second.status_code, 200, second.data)
        self.assertFalse(second.data["created"])
        self.assertEqual(second.data["screening"]["id"], screening_id)
        self.assertEqual(Screening.objects.count(), 1)

    def test_update_screening(self):
        from rest_framework.test import APIClient

        api = APIClient()
        api.force_authenticate(user=self.user)
        created = api.post(
            "/api/screenings/ensure/",
            {"client_id": self.client_obj.id},
            format="json",
        )
        screening_id = created.data["screening"]["id"]
        form = created.data["screening"]["form"]
        form["q41_comments"] = "Updated note"
        updated = api.patch(
            f"/api/screenings/{screening_id}/",
            {"answers": form},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(
            updated.data["screening"]["form"]["q41_comments"],
            "Updated note",
        )

    def test_create_rejects_did_not_engage(self):
        from rest_framework.test import APIClient

        api = APIClient()
        api.force_authenticate(user=self.user)
        response = api.post(
            "/api/screenings/",
            {
                "client_id": self.client_obj.id,
                "answers": {
                    "q1_part_a_explained": "Client did not engage",
                    "q2_consent_personal": "Yes",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Screening.objects.count(), 0)

    def test_create_anonymous_omits_personal_in_answers(self):
        from rest_framework.test import APIClient

        api = APIClient()
        api.force_authenticate(user=self.user)
        response = api.post(
            "/api/screenings/",
            {
                "client_id": self.client_obj.id,
                "answers": {
                    "q1_part_a_explained": "Yes",
                    "q2_consent_personal": "No",
                    "q13_name": "SHOULD NOT SAVE",
                    "q14_dob": "1980-01-01",
                    "_client_dob": "1980-01-01",
                    "q16_ward_village": "secret",
                    "q17_occupation": "Farmer",
                    "q39_phone_number": "+254 711",
                    "q15_sex": "Male",
                    "q19_distance_va_right": "Reads 6/12 or better",
                    "q20_distance_va_left": "Reads 6/12 or better",
                    "q23_owned_reading_glasses": "No",
                    "q26_near_va_unaided": "N8",
                    "q28_red_flags": "No",
                    "q29_glasses_provided": "Yes",
                    "q31_near_va_dispensed": "N6",
                    "q36_how_heard": ["CHP"],
                    "q37_has_mobile_phone": "None",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        screening = Screening.objects.get()
        self.assertTrue(screening.is_anonymous)
        self.assertEqual(screening.answers.get("q13_name"), "")
        self.assertEqual(screening.personal, {})
