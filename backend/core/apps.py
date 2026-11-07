from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "core"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        from django.conf import settings
        from django.db.backends.signals import connection_created

        if not getattr(settings, "USE_SQLITE", False):
            return

        def _configure_sqlite(sender, connection, **kwargs):
            if connection.vendor != "sqlite":
                return
            cursor = connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA busy_timeout=30000;")
            cursor.execute("PRAGMA synchronous=NORMAL;")

        connection_created.connect(_configure_sqlite, dispatch_uid="kobo_sqlite_wal")
