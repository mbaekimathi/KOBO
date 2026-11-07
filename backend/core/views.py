from datetime import date

from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

from .models import Client, DailyDetail, Screening
from .screening_rules import prepare_for_save
from .screening_serializers import (
    ScreeningCreateSerializer,
    ScreeningSerializer,
    ScreeningUpdateSerializer,
    build_defaults_for_request,
    persist_screening_answers,
)
from .serializers import ClientSerializer, DailyDetailSerializer


class IsActiveStaffRole(permissions.BasePermission):
    """Allow verified active Admin / IT Support / Data Entry users."""

    allowed_roles = {
        User.Role.ADMIN,
        User.Role.IT_SUPPORT,
        User.Role.DATA_ENTRY,
    }

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_verified
            and user.account_status == User.AccountStatus.ACTIVE
            and user.role in self.allowed_roles
        )


class ClientListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsActiveStaffRole]
    queryset = Client.objects.select_related("registered_by").all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = serializer.save()
        return Response(
            {
                "message": "Client registered successfully.",
                "client": ClientSerializer(client).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ClientDetailView(generics.RetrieveAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsActiveStaffRole]
    queryset = Client.objects.select_related("registered_by").all()


def _daily_for_user(user):
    today = date.today()
    daily = (
        DailyDetail.objects.filter(user=user, work_date=today)
        .order_by("-updated_at")
        .first()
    )
    if daily:
        return daily
    return (
        DailyDetail.objects.filter(user=user)
        .order_by("-work_date", "-updated_at")
        .first()
    )


class ScreeningDefaultsView(APIView):
    """Return pre-filled screening form for a client + session context."""

    permission_classes = [IsActiveStaffRole]

    def get(self, request):
        client_id = request.query_params.get("client_id")
        if not client_id:
            return Response(
                {"client_id": "client_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        client = Client.objects.filter(pk=client_id).first()
        if not client:
            return Response(
                {"detail": "Client not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        defaults = build_defaults_for_request(
            request.user, client, _daily_for_user(request.user)
        )
        return Response({"defaults": defaults})


class ScreeningEnsureView(APIView):
    """
    Get the client's latest screening, or create one auto-filled with defaults.
    Used after registration and when opening Start/Edit screening.
    """

    permission_classes = [IsActiveStaffRole]

    def post(self, request):
        client_id = request.data.get("client_id")
        if not client_id:
            return Response(
                {"client_id": "client_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        client = Client.objects.filter(pk=client_id).first()
        if not client:
            return Response(
                {"detail": "Client not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing = (
            Screening.objects.filter(client=client).order_by("-created_at").first()
        )
        if existing:
            return Response(
                {
                    "message": "Screening loaded.",
                    "created": False,
                    "screening": ScreeningSerializer(existing).data,
                }
            )

        defaults = build_defaults_for_request(
            request.user, client, _daily_for_user(request.user)
        )
        prepared = prepare_for_save(defaults)
        if prepared is None:
            return Response(
                {"detail": "Unable to create screening from defaults."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        screening = Screening(client=client, provider=request.user)
        persist_screening_answers(screening, prepared, user=request.user)
        return Response(
            {
                "message": "Screening created with defaults.",
                "created": True,
                "screening": ScreeningSerializer(screening).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ScreeningCreateView(APIView):
    """Create a screening submission (re-runs rules server-side)."""

    permission_classes = [IsActiveStaffRole]

    def post(self, request):
        serializer = ScreeningCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        screening = serializer.save()
        return Response(
            {
                "message": "Screening saved.",
                "screening": ScreeningSerializer(screening).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ScreeningDetailView(APIView):
    """Retrieve or update a screening record."""

    permission_classes = [IsActiveStaffRole]

    def get_object(self, pk):
        return Screening.objects.filter(pk=pk).select_related("client", "provider").first()

    def get(self, request, pk):
        screening = self.get_object(pk)
        if not screening:
            return Response(
                {"detail": "Screening not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"screening": ScreeningSerializer(screening).data})

    def patch(self, request, pk):
        screening = self.get_object(pk)
        if not screening:
            return Response(
                {"detail": "Screening not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ScreeningUpdateSerializer(
            screening,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        saved = serializer.save()
        return Response(
            {
                "message": "Screening updated.",
                "screening": ScreeningSerializer(saved).data,
            }
        )


class TodayDailyDetailView(APIView):
    """Get or upsert the signed-in user's daily field details for today."""

    permission_classes = [IsActiveStaffRole]

    def get(self, request):
        today = date.today()
        detail = (
            DailyDetail.objects.filter(user=request.user, work_date=today)
            .order_by("-updated_at")
            .first()
        )
        if detail:
            return Response(DailyDetailSerializer(detail).data)

        previous = (
            DailyDetail.objects.filter(user=request.user)
            .order_by("-work_date", "-updated_at")
            .first()
        )
        if previous:
            data = DailyDetailSerializer(previous).data
            data["id"] = None
            data["work_date"] = today.isoformat()
            data["created_at"] = None
            data["updated_at"] = None
            data["is_prefill"] = True
            return Response(data)

        return Response(
            {
                "id": None,
                "work_date": today.isoformat(),
                "country": "Kenya",
                "county": "",
                "subcounty": "",
                "cadre": "",
                "cadre_other": "",
                "distribution_point": "",
                "distribution_point_other": "",
                "facility_name": "",
                "implementing_partner": "",
                "implementing_partner_other": "",
                "is_prefill": False,
            }
        )

    def post(self, request):
        return self._upsert(request)

    def put(self, request):
        return self._upsert(request)

    def patch(self, request):
        return self._upsert(request)

    def _upsert(self, request):
        from django.db import IntegrityError, OperationalError

        today = date.today()
        serializer = DailyDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)

        try:
            saved, _created = DailyDetail.objects.update_or_create(
                user=request.user,
                work_date=today,
                defaults=payload,
            )
        except OperationalError:
            return Response(
                {
                    "detail": (
                        "Could not save right now (database busy). "
                        "Please try again in a moment."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except IntegrityError:
            # Concurrent create — load the row and update it.
            saved = DailyDetail.objects.filter(
                user=request.user,
                work_date=today,
            ).first()
            if not saved:
                return Response(
                    {"detail": "Unable to save daily details. Please try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            for key, value in payload.items():
                setattr(saved, key, value)
            saved.save()

        return Response(
            {
                "message": "Daily details saved.",
                "daily_detail": DailyDetailSerializer(saved).data,
            }
        )


class RootView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return HttpResponse(
            """
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>KOBO COLLECT API</title>
                <style>
                  body { font-family: Segoe UI, sans-serif; margin: 0; min-height: 100vh;
                         display: grid; place-items: center; background: #f3f7f5; color: #14261f; }
                  main { width: min(32rem, calc(100% - 2rem)); background: #fff; border: 1px solid #d5e2db;
                         border-radius: 18px; padding: 1.5rem; box-shadow: 0 18px 50px rgba(15,61,62,.08); }
                  h1 { margin: 0 0 .5rem; font-size: 1.6rem; }
                  p { margin: 0 0 1rem; color: #5d7268; line-height: 1.5; }
                  a { display: inline-block; background: #0f3d3e; color: #fff; text-decoration: none;
                      font-weight: 700; padding: .8rem 1rem; border-radius: 12px; }
                </style>
              </head>
              <body>
                <main>
                  <h1>KOBO COLLECT API</h1>
                  <p>This is the backend API on port 8001. Use the React app on port 8000.</p>
                  <a href="http://127.0.0.1:8000">Open app at http://127.0.0.1:8000</a>
                </main>
              </body>
            </html>
            """,
            content_type="text/html",
        )


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.conf import settings
        from django.db import connection

        engine = settings.DATABASES["default"]["ENGINE"]
        using_sqlite = "sqlite" in engine
        db_alive = True
        try:
            connection.ensure_connection()
        except Exception:
            db_alive = False

        return Response(
            {
                "status": "ok" if db_alive else "degraded",
                "service": "KOBO COLLECT",
                "message": "NGO data collection API is running",
                "concurrency": {
                    "auth": "jwt_stateless",
                    "session_engine": settings.SESSION_ENGINE,
                    "db_engine": engine.split(".")[-1],
                    "db_conn_max_age": settings.DATABASES["default"].get(
                        "CONN_MAX_AGE", 0
                    ),
                    "wsgi_threads": getattr(settings, "WSGI_THREADS", None),
                    "multi_user_ready": not using_sqlite and db_alive,
                    "db_alive": db_alive,
                    "note": (
                        "Switch USE_SQLITE=False (MySQL) for many concurrent users."
                        if using_sqlite
                        else "MySQL + JWT can hold many concurrent signed-in users."
                    ),
                },
            }
        )
