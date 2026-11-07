from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User
from .serializers import (
    AdminUserUpdateSerializer,
    LoginSerializer,
    RegisterSerializer,
    SessionTokenRefreshSerializer,
    UserSerializer,
)
from .tokens import SessionRefreshToken


def tokens_for_user(user):
    refresh = SessionRefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": (
                    "Account created successfully. "
                    "Your account is pending verification and role allocation."
                ),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        previous_status = user.account_status
        user.sync_account_status()
        # New session id kicks every other device off immediately.
        user.start_session()
        update_fields = ["active_session_id"]
        if user.account_status != previous_status:
            update_fields.append("account_status")
        user.save(update_fields=update_fields)

        return Response(
            {
                "message": "Login successful.",
                "tokens": tokens_for_user(user),
                "user": UserSerializer(user).data,
                "redirect_to": user.role_route
                if user.account_status == User.AccountStatus.ACTIVE
                else "/pending",
            }
        )


class LogoutView(APIView):
    def post(self, request):
        user = request.user
        user.clear_session()
        user.save(update_fields=["active_session_id"])
        return Response({"message": "Signed out successfully."})


class MeView(APIView):
    def get(self, request):
        user = request.user
        previous_status = user.account_status
        user.sync_account_status()
        # Avoid a write on every /me/ poll — critical under many concurrent sessions.
        if (
            user.account_status != previous_status
            and user.account_status != User.AccountStatus.REJECTED
        ):
            user.save(update_fields=["account_status"])
        return Response(
            {
                "user": UserSerializer(user).data,
                "redirect_to": user.role_route
                if user.account_status == User.AccountStatus.ACTIVE
                else "/pending",
            }
        )


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
            and request.user.is_verified
        )


class PendingUsersView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return User.objects.exclude(role=User.Role.ADMIN).order_by("-created_at")


class ManageUserView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [IsAdminRole]

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        user = self.get_object()
        return Response(
            {
                "message": "User updated successfully.",
                "user": UserSerializer(user).data,
            }
        )


class SessionTokenRefreshView(TokenRefreshView):
    serializer_class = SessionTokenRefreshSerializer
