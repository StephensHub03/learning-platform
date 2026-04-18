from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatRoomViewSet

router = DefaultRouter()
router.register('rooms', ChatRoomViewSet, basename='chat-rooms')

urlpatterns = [
    path('', include(router.urls)),
]
