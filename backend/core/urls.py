from django.urls import path

from .views import (
    ClientDetailView,
    ClientListCreateView,
    HealthCheckView,
    ScreeningCreateView,
    ScreeningDefaultsView,
    ScreeningDetailView,
    ScreeningEnsureView,
    TodayDailyDetailView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path("clients/", ClientListCreateView.as_view(), name="clients"),
    path("clients/<int:pk>/", ClientDetailView.as_view(), name="client-detail"),
    path(
        "daily-details/today/",
        TodayDailyDetailView.as_view(),
        name="daily-details-today",
    ),
    path(
        "screenings/defaults/",
        ScreeningDefaultsView.as_view(),
        name="screening-defaults",
    ),
    path(
        "screenings/ensure/",
        ScreeningEnsureView.as_view(),
        name="screening-ensure",
    ),
    path("screenings/", ScreeningCreateView.as_view(), name="screenings"),
    path(
        "screenings/<int:pk>/",
        ScreeningDetailView.as_view(),
        name="screening-detail",
    ),
]
