"""Admin dashboard URLs (analytics + user management)."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminUserViewSet
from apps.courses.views import AdminAnalyticsView

router = DefaultRouter()
router.register('users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
]
