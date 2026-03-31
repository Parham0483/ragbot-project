# WSGI entry point — exposes the application callable for traditional servers

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ragbot_backend.settings')

application = get_wsgi_application()
