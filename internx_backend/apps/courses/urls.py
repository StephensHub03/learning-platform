"""URL routes for courses app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, EnrollmentViewSet, CategoryViewSet

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='categories')
router.register('enrollments', EnrollmentViewSet, basename='enrollments')
router.register('', CourseViewSet, basename='courses')

urlpatterns = [
    path('', include(router.urls)),
]
