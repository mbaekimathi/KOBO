from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from core.views import RootView, SpaView

urlpatterns = [
    path("", RootView.as_view(), name="root"),
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# React SPA catch-all (must stay last). Keeps /api/ and /django-admin/ on Django.
urlpatterns += [
    re_path(r"^(?P<path>.*)$", SpaView.as_view(), name="spa"),
]
