import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'migdal.settings')

# Initialize Django ASGI application early to ensure AppRegistry is populated
django_asgi_app = get_asgi_application()

import apps.automation.routing # We will create this next!

application = ProtocolTypeRouter({
    # Django's ASGI application handles traditional HTTP requests
    "http": django_asgi_app,
    
    # Channels routes WebSocket requests here
    "websocket": AuthMiddlewareStack(
        URLRouter(
            apps.automation.routing.websocket_urlpatterns
        )
    ),
})
