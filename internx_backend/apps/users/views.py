"""
Views for user authentication and profile management.
Provides: Register, Profile, Admin user management.
"""
import logging

from django.db import connection
from rest_framework import generics, status, permissions, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django_filters.rest_framework import DjangoFilterBackend
from .models import User
from .serializers import RegisterSerializer, UserProfileSerializer, UserListSerializer
from apps.notifications.tasks import send_registration_email

logger = logging.getLogger(__name__)


class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — Public registration."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        # Registration should succeed even if the background worker is unavailable.
        try:
            send_registration_email.delay(user.id)
        except Exception as exc:
            logger.warning('Failed to queue registration email for user %s: %s', user.id, exc)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/profile/ — Authenticated user's own profile."""

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class HealthCheckView(APIView):
    """Lightweight deployment health check for database-backed auth flows."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                row = cursor.fetchone()

            users_table_present = 'users_user' in connection.introspection.table_names()
            return Response(
                {
                    'ok': bool(row and row[0] == 1),
                    'database': 'connected',
                    'users_table_present': users_table_present,
                }
            )
        except Exception as exc:
            logger.exception('Health check failed')
            return Response(
                {
                    'ok': False,
                    'database': 'error',
                    'error_type': exc.__class__.__name__,
                    'error': str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class AdminUserViewSet(viewsets.ModelViewSet):
    """Admin-only: full CRUD on users + role assignment."""

    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserListSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle user active status."""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({'is_active': user.is_active})

    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        """Assign a role to a user."""
        user = self.get_object()
        role = request.data.get('role')
        if role not in [User.ROLE_STUDENT, User.ROLE_FACULTY, User.ROLE_ADMIN]:
            return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
        user.role = role
        user.save()
        return Response({'role': user.role})
