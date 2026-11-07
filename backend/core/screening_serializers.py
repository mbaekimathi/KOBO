from datetime import date

from rest_framework import serializers

from .models import Client, Screening
from .screening_config import PERSONAL_FIELDS
from .screening_defaults import build_screening_defaults
from .screening_rules import prepare_for_save
from .serializers import ClientSerializer, DailyDetailSerializer


def _service_date(prepared):
    service_date = prepared.get("q3_date_of_service") or date.today().isoformat()
    if isinstance(service_date, str):
        return date.fromisoformat(service_date[:10])
    return service_date


def persist_screening_answers(screening, prepared, user=None):
    """Apply prepared answers onto a Screening instance and save."""
    personal = {key: prepared.get(key, "") for key in PERSONAL_FIELDS}
    answers = dict(prepared)
    if not prepared.get("contains_personal_data"):
        for key in PERSONAL_FIELDS:
            answers[key] = ""
        personal = {}

    screening.date_of_service = _service_date(prepared)
    screening.answers = answers
    screening.personal = personal
    screening.contains_personal_data = bool(prepared.get("contains_personal_data"))
    screening.is_anonymous = not screening.contains_personal_data
    screening.stopped_under_35 = bool(prepared.get("stopped_under_35"))
    screening.missing_fields = prepared.get("missing_fields") or []
    screening.flags = prepared.get("flags") or []
    if user is not None and screening.provider_id is None:
        screening.provider = user
    screening.save()
    return screening


def screening_form_payload(screening: Screening) -> dict:
    """Rebuild editable form answers (restore personal fields for consenting records)."""
    data = dict(screening.answers or {})
    if screening.contains_personal_data and screening.personal:
        data.update(screening.personal)
    data["missing_fields"] = screening.missing_fields or data.get("missing_fields") or []
    data["flags"] = screening.flags or data.get("flags") or []
    data["contains_personal_data"] = screening.contains_personal_data
    if data.get("q14_dob"):
        data["_client_dob"] = data["q14_dob"]
    return data


class ScreeningSerializer(serializers.ModelSerializer):
    export_safe = serializers.SerializerMethodField()
    form = serializers.SerializerMethodField()

    class Meta:
        model = Screening
        fields = [
            "id",
            "client",
            "provider",
            "date_of_service",
            "answers",
            "personal",
            "form",
            "contains_personal_data",
            "is_anonymous",
            "stopped_under_35",
            "missing_fields",
            "flags",
            "export_safe",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_export_safe(self, obj):
        return obj.export_safe()

    def get_form(self, obj):
        return screening_form_payload(obj)


class ScreeningCreateSerializer(serializers.Serializer):
    client_id = serializers.IntegerField(required=False, allow_null=True)
    answers = serializers.DictField()

    def create(self, validated_data):
        request = self.context["request"]
        prepared = prepare_for_save(validated_data["answers"])
        if prepared is None:
            raise serializers.ValidationError(
                {"q1_part_a_explained": "Client did not engage — nothing saved."}
            )

        client = None
        client_id = validated_data.get("client_id")
        if client_id:
            client = Client.objects.filter(pk=client_id).first()

        screening = Screening(
            client=client,
            provider=request.user if request.user.is_authenticated else None,
        )
        return persist_screening_answers(screening, prepared, user=request.user)


class ScreeningUpdateSerializer(serializers.Serializer):
    answers = serializers.DictField()

    def update(self, instance, validated_data):
        prepared = prepare_for_save(validated_data["answers"])
        if prepared is None:
            raise serializers.ValidationError(
                {"q1_part_a_explained": "Client did not engage — nothing saved."}
            )
        return persist_screening_answers(instance, prepared)


class ScreeningDefaultsQuerySerializer(serializers.Serializer):
    client_id = serializers.IntegerField()


def session_payload(user, daily_detail=None):
    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "role": user.role,
        },
        "daily_detail": (
            DailyDetailSerializer(daily_detail).data if daily_detail else {}
        ),
    }


def client_payload(client: Client) -> dict:
    return ClientSerializer(client).data


def build_defaults_for_request(user, client, daily_detail=None, system_config=None):
    return build_screening_defaults(
        client=client_payload(client),
        session=session_payload(user, daily_detail),
        system_config=system_config or {},
    )
