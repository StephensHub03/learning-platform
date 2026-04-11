"""URL routes for results app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResultViewSet, ProgressViewSet

router = DefaultRouter()
router.register('progress', ProgressViewSet, basename='progress')
router.register('', ResultViewSet, basename='results')

urlpatterns = [path('', include(router.urls))]
