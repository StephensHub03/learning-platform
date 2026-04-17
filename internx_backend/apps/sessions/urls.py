"""URL routes for sessions app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GoogleCalendarCallbackView,
    GoogleCalendarConnectView,
    LiveSessionViewSet,
)

router = DefaultRouter()
router.register('', LiveSessionViewSet, basename='sessions')

urlpatterns = [
    path('google-calendar/connect/', GoogleCalendarConnectView.as_view(), name='google-calendar-connect'),
    path('google-calendar/callback/', GoogleCalendarCallbackView.as_view(), name='google-calendar-callback'),
    path('', include(router.urls)),
]
