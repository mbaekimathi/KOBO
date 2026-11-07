from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


SESSION_REPLACED_DETAIL = (
    "This account is signed in on another device. Please sign in again."
)


class SingleDeviceJWTAuthentication(JWTAuthentication):
    """Reject tokens whose session id no longer matches the user's active session."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        token_sid = validated_token.get("sid")
        active_sid = getattr(user, "active_session_id", "") or ""

        if not active_sid or not token_sid or token_sid != active_sid:
            raise InvalidToken(SESSION_REPLACED_DETAIL)
        return user
