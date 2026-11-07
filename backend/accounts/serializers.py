from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings

from .authentication import SESSION_REPLACED_DETAIL
from .models import User
from .tokens import SessionRefreshToken


def to_upper(value):
    return str(value or "").strip().upper()


def validate_pin_password(value):
    pin = str(value or "").strip()
    if not pin.isdigit() or len(pin) != 6:
        raise serializers.ValidationError("Password must be exactly 6 digits.")
    return pin


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    account_status_display = serializers.CharField(
        source="get_account_status_display", read_only=True
    )
    role_route = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone_display = serializers.CharField(read_only=True)
    profile_image = serializers.ImageField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "login_code",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "phone_country_code",
            "phone_number",
            "phone_display",
            "profile_image",
            "role",
            "role_display",
            "role_route",
            "is_verified",
            "account_status",
            "account_status_display",
            "created_at",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, max_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6, max_length=6)
    profile_image = serializers.ImageField(required=False, allow_null=True)
    phone_country_code = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "login_code",
            "phone_country_code",
            "phone_number",
            "password",
            "password_confirm",
            "profile_image",
        ]

    def validate_email(self, value):
        return value.lower().strip()

    def validate_first_name(self, value):
        value = to_upper(value)
        if not value:
            raise serializers.ValidationError("First name is required.")
        return value

    def validate_middle_name(self, value):
        return to_upper(value)

    def validate_last_name(self, value):
        value = to_upper(value)
        if not value:
            raise serializers.ValidationError("Last name is required.")
        return value

    def validate_phone_country_code(self, value):
        code = str(value or "").strip().upper().replace(" ", "")
        if not code:
            return "+254"
        if not code.startswith("+"):
            code = f"+{code}"
        return code

    def validate_phone_number(self, value):
        digits = "".join(ch for ch in str(value or "") if ch.isdigit())
        return digits

    def validate_login_code(self, value):
        code = str(value).strip()
        if not code.isdigit() or len(code) != 6:
            raise serializers.ValidationError("Login code must be exactly 6 digits.")
        return code

    def validate_password(self, value):
        return validate_pin_password(value)

    def validate_password_confirm(self, value):
        return validate_pin_password(value)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        phone_number = attrs.get("phone_number", "")
        if phone_number and len(phone_number) < 7:
            raise serializers.ValidationError(
                {"phone_number": "Enter a valid phone number."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        login_code = validated_data.pop("login_code")
        email = validated_data.pop("email")
        user = User.objects.create_user(
            login_code=login_code,
            email=email,
            password=password,
            is_verified=False,
            role=User.Role.PENDING,
            account_status=User.AccountStatus.PENDING_VERIFICATION,
            **validated_data,
        )
        return user


class LoginSerializer(serializers.Serializer):
    login_code = serializers.CharField(max_length=6)
    password = serializers.CharField(write_only=True)

    def validate_login_code(self, value):
        code = str(value).strip()
        if not code.isdigit() or len(code) != 6:
            raise serializers.ValidationError("Login code must be exactly 6 digits.")
        return code

    def validate(self, attrs):
        login_code = attrs["login_code"]
        password = attrs["password"]
        user = authenticate(
            request=self.context.get("request"),
            username=login_code,
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Invalid login code or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")
        if user.account_status == User.AccountStatus.REJECTED:
            raise serializers.ValidationError(
                "This account was rejected. Contact an administrator."
            )
        attrs["user"] = user
        return attrs


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["is_verified", "role", "account_status"]

    def validate(self, attrs):
        if attrs.get("account_status") == User.AccountStatus.REJECTED:
            attrs["is_verified"] = False
            attrs["role"] = User.Role.PENDING
            return attrs

        role = attrs.get("role", getattr(self.instance, "role", User.Role.PENDING))
        is_verified = attrs.get(
            "is_verified", getattr(self.instance, "is_verified", False)
        )

        if role != User.Role.PENDING and not is_verified and "is_verified" not in attrs:
            attrs["is_verified"] = True
            is_verified = True

        if not is_verified:
            attrs["account_status"] = User.AccountStatus.PENDING_VERIFICATION
            attrs.setdefault("role", User.Role.PENDING)
        elif role == User.Role.PENDING:
            attrs["account_status"] = User.AccountStatus.PENDING_ROLE
        else:
            attrs["account_status"] = User.AccountStatus.ACTIVE
            attrs["is_verified"] = True

        return attrs

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.is_staff = instance.role == User.Role.ADMIN or instance.is_superuser
        # Rejected accounts must lose any active device session.
        if instance.account_status == User.AccountStatus.REJECTED:
            instance.clear_session()
        instance.save()
        return instance


class SessionTokenRefreshSerializer(TokenRefreshSerializer):
    """Refuse refresh tokens from a device that is no longer the active session."""

    token_class = SessionRefreshToken

    def validate(self, attrs):
        try:
            refresh = self.token_class(attrs["refresh"])
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        user_id = refresh.get(api_settings.USER_ID_CLAIM)
        token_sid = refresh.get("sid")
        try:
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except User.DoesNotExist as exc:
            raise InvalidToken(SESSION_REPLACED_DETAIL) from exc

        active_sid = user.active_session_id or ""
        if not active_sid or not token_sid or token_sid != active_sid:
            raise InvalidToken(SESSION_REPLACED_DETAIL)

        data = {"access": str(refresh.access_token)}
        if api_settings.ROTATE_REFRESH_TOKENS:
            refresh.set_jti()
            refresh.set_exp()
            refresh["sid"] = active_sid
            data["refresh"] = str(refresh)
        return data
