"""
Live Session views with Google Calendar integration scaffold.
Faculty can create sessions; calendar event is created asynchronously.
"""
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import LiveSession
from .serializers import LiveSessionSerializer
from .google_calendar import create_calendar_event


class IsFacultyOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role in ['faculty', 'admin']

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.role == 'admin':
            return True
        return obj.course.faculty == request.user


class LiveSessionViewSet(viewsets.ModelViewSet):
    """
    CRUD for live sessions.
    - Faculty: create sessions for their courses
    - Students: read upcoming/past sessions for enrolled courses
    - Admin: full access
    """

    serializer_class = LiveSessionSerializer
    permission_classes = [IsFacultyOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['course', 'status']
    ordering_fields = ['scheduled_at']
    ordering = ['scheduled_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return LiveSession.objects.select_related('course').all()
        elif user.role == 'faculty':
            return LiveSession.objects.select_related('course').filter(
                course__faculty=user
            )
        # Students: sessions for their enrolled courses
        enrolled_courses = user.enrollments.filter(
            is_active=True
        ).values_list('course_id', flat=True)
        return LiveSession.objects.select_related('course').filter(
            course__in=enrolled_courses, status__in=['scheduled', 'live', 'completed']
        )

    def perform_create(self, serializer):
        """Create session and optionally create Google Calendar event."""
        session = serializer.save()
        try:
            event_id = create_calendar_event(session)
            if event_id:
                session.calendar_event_id = event_id
                session.save(update_fields=['calendar_event_id'])
        except Exception as e:
            # Calendar creation is non-blocking; session still created
            print(f'Google Calendar event creation failed: {e}')

    @action(detail=True, methods=['post'])
    def go_live(self, request, pk=None):
        """Mark session as live."""
        session = self.get_object()
        session.status = 'live'
        session.save()
        return Response({'status': 'live'})

    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        """Mark session as completed."""
        session = self.get_object()
        session.status = 'completed'
        recording_url = request.data.get('recording_url', '')
        if recording_url:
            session.recording_url = recording_url
        session.save()
        return Response({'status': 'completed'})
