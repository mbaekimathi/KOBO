from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    ManageUserView,
    MeView,
    PendingUsersView,
    RegisterView,
    SessionTokenRefreshView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("token/refresh/", SessionTokenRefreshView.as_view(), name="token_refresh"),
    path("admin/users/", PendingUsersView.as_view(), name="admin_users"),
    path("admin/users/<int:pk>/", ManageUserView.as_view(), name="admin_manage_user"),
]
