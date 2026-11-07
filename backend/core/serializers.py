from datetime import date

from rest_framework import serializers

from .models import Client, DailyDetail


class DailyDetailSerializer(serializers.ModelSerializer):
    cadre_display = serializers.CharField(source="get_cadre_display", read_only=True)
    distribution_point_display = serializers.CharField(
        source="get_distribution_point_display",
        read_only=True,
    )
    implementing_partner_display = serializers.CharField(
        source="get_implementing_partner_display",
        read_only=True,
    )

    class Meta:
        model = DailyDetail
        fields = [
            "id",
            "work_date",
            "country",
            "county",
            "subcounty",
            "cadre",
            "cadre_display",
            "cadre_other",
            "distribution_point",
            "distribution_point_display",
            "distribution_point_other",
            "facility_name",
            "implementing_partner",
            "implementing_partner_display",
            "implementing_partner_other",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "work_date", "created_at", "updated_at"]

    def _require_other(self, attrs, choice_key, other_key, label):
        if attrs.get(choice_key) == "OTHER":
            other = (attrs.get(other_key) or "").strip()
            if not other:
                raise serializers.ValidationError(
                    {other_key: f"Please specify {label}."}
                )
            attrs[other_key] = other
        else:
            attrs[other_key] = ""
        return attrs

    def validate_country(self, value):
        country = (value or "").strip()
        if not country:
            raise serializers.ValidationError("Country is required.")
        return country

    def validate_county(self, value):
        county = (value or "").strip()
        if not county:
            raise serializers.ValidationError("County is required.")
        return county

    def validate_subcounty(self, value):
        subcounty = (value or "").strip()
        if not subcounty:
            raise serializers.ValidationError("Subcounty is required.")
        return subcounty

    def validate_facility_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError(
                "Name of facility / outreach site is required."
            )
        return name

    def validate(self, attrs):
        attrs = super().validate(attrs)
        attrs = self._require_other(attrs, "cadre", "cadre_other", "cadre")
        attrs = self._require_other(
            attrs,
            "distribution_point",
            "distribution_point_other",
            "distribution point",
        )
        attrs = self._require_other(
            attrs,
            "implementing_partner",
            "implementing_partner_other",
            "implementing partner",
        )
        return attrs


class ClientSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    sex_display = serializers.CharField(source="get_sex_display", read_only=True)
    phone_display = serializers.SerializerMethodField()
    latest_screening_id = serializers.SerializerMethodField()
    has_screening = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "name",
            "date_of_birth",
            "age",
            "sex",
            "sex_display",
            "phone_country_code",
            "phone_number",
            "phone_display",
            "occupation",
            "village",
            "dioptre",
            "registered_by",
            "latest_screening_id",
            "has_screening",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "registered_by",
            "latest_screening_id",
            "has_screening",
            "created_at",
            "updated_at",
        ]

    def get_phone_display(self, obj):
        return f"{obj.phone_country_code} {obj.phone_number}".strip()

    def get_latest_screening_id(self, obj):
        screening = obj.screenings.order_by("-created_at").first()
        return screening.id if screening else None

    def get_has_screening(self, obj):
        return obj.screenings.exists()

    def validate_name(self, value):
        name = (value or "").strip().upper()
        if not name:
            raise serializers.ValidationError("Name is required.")
        return name

    def validate_date_of_birth(self, value):
        if value > date.today():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_phone_number(self, value):
        digits = "".join(ch for ch in str(value or "") if ch.isdigit())
        if len(digits) < 7:
            raise serializers.ValidationError("Enter a valid phone number.")
        return digits

    def validate_occupation(self, value):
        occupation = (value or "").strip()
        if not occupation:
            raise serializers.ValidationError("Occupation is required.")
        return occupation

    def validate_village(self, value):
        village = (value or "").strip()
        if not village:
            raise serializers.ValidationError("Village is required.")
        return village

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["registered_by"] = request.user
        return super().create(validated_data)
