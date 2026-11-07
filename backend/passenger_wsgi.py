"""
cPanel / Passenger entry point.

In Setup Python App:
  Application root:          KOBO/backend
  Application startup file:  passenger_wsgi.py
  Application Entry point:   application
"""

import os
import sys

# Application root (this file's directory)
APP_DIR = os.path.dirname(__file__)
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kobo_collect.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
