from django.urls import path

from .consumers import ChatConsumer

websocket_urlpatterns = [
    path("ws/<str:sender>/<str:recipient>/", ChatConsumer.as_asgi()),
]
