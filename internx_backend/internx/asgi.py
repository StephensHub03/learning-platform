"""
ASGI entrypoint for HTTP and WebSocket traffic.
"""
import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

from apps.chat.middleware import QueryStringJWTAuthMiddleware
from apps.chat.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internx.settings')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        'http': django_asgi_app,
        'websocket': AllowedHostsOriginValidator(
            QueryStringJWTAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            )
        ),
    }
)
