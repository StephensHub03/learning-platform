"""URL routes for sessions app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LiveSessionViewSet

router = DefaultRouter()
router.register('', LiveSessionViewSet, basename='sessions')

urlpatterns = [path('', include(router.urls))]
