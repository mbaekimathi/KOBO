"""
Multi-threaded WSGI server for concurrent user sessions.

Usage (from backend/ with venv active):
    python run_concurrent.py
"""

import os

from dotenv import load_dotenv
from waitress import serve

from kobo_collect.wsgi import application


def main():
    load_dotenv()
    host = os.getenv("WSGI_HOST", "127.0.0.1")
    port = int(os.getenv("WSGI_PORT", "8001"))
    threads = int(os.getenv("WSGI_THREADS", "16"))
    channel_timeout = int(os.getenv("WSGI_CHANNEL_TIMEOUT", "120"))

    print(f"KOBO COLLECT API — Waitress on http://{host}:{port}")
    print(f"Threads: {threads} (concurrent request capacity)")
    print("Auth: JWT (stateless) — many users can stay signed in at once.")
    serve(
        application,
        host=host,
        port=port,
        threads=threads,
        channel_timeout=channel_timeout,
        ident="kobo-collect",
    )


if __name__ == "__main__":
    main()
