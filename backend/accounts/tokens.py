from rest_framework_simplejwt.tokens import RefreshToken


class SessionRefreshToken(RefreshToken):
    """Refresh/access tokens bound to the user's single active session id."""

    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        sid = getattr(user, "active_session_id", "") or ""
        token["sid"] = sid
        return token
