"""URL routes for assignments app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssignmentViewSet

router = DefaultRouter()
router.register('', AssignmentViewSet, basename='assignments')

urlpatterns = [path('', include(router.urls))]
