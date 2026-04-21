import os
from django.core.wsgi import get_wsgi_application

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internx.settings')

# Create WSGI application
app = get_wsgi_application()