# ASGI entry point — exposes the application callable for async servers

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ragbot_backend.settings')

application = get_asgi_application()
