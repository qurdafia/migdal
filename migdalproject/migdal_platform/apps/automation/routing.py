from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # React will connect to ws://domain.com/ws/logs/<run_id>/
    re_path(r'ws/logs/(?P<run_id>[\w-]+)/$', consumers.JobLogConsumer.as_asgi()),
]