"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import threading

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()


def _warm_ocr_engine():
    """Load the in-process RapidOCR models ahead of the first upload.

    The model load costs ~20s on the 2-vCPU prod box; doing it in the
    background at boot keeps the first document upload fast. Runs once per
    gunicorn worker (no --preload), and is best-effort.
    """
    def _work():
        try:
            from api import ocr_engine
            ocr_engine._get_engine()
        except Exception:
            pass

    threading.Thread(target=_work, daemon=True).start()


_warm_ocr_engine()
