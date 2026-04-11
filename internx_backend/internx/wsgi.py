"""
WSGI config for InternX project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internx.settings')
application = get_wsgi_application()
