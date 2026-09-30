from django.urls import re_path

from .consumers import LiveSignalingConsumer

websocket_urlpatterns = [
    re_path(r'^ws/live/(?P<live_id>\d+)/$', LiveSignalingConsumer.as_asgi()),
]
