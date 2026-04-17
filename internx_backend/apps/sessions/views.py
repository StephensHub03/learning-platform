"""
Live Session views with Google Calendar integration.
Faculty can create sessions, generate a Meet link, and invite enrolled students.
"""
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import LiveSession
from .serializers import LiveSessionSerializer
from .google_calendar import (
    create_calendar_event,
    exchange_google_calendar_code,
    get_google_calendar_authorization_url,
    get_google_calendar_authorization_url_for_next,
    get_google_calendar_connection_status,
)
from rest_framework.views import APIView


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

    def _ensure_meeting_ready(self, session):
        """
        Recover sessions that should already be joinable but missed background scheduling.
        """
        from datetime import timedelta

        effective_status = session.get_time_status()
        if effective_status == 'cancelled' or session.meet_link:
            return session

        now = timezone.now()
        session_end = session.scheduled_at + timedelta(minutes=session.duration_minutes)
        join_window_start = session.scheduled_at - timedelta(minutes=10)

        if join_window_start <= now <= session_end:
            try:
                create_calendar_event(session)
            except Exception as exc:
                print(f'Could not generate late meeting link for session {session.id}: {exc}')
        self._sync_persisted_status(session, now=now)

        return session

    def _sync_persisted_status(self, session, now=None):
        """
        Optional persistence sync so admin/faculty views do not drift too far
        from the dynamic time-based state.
        """
        if session.status == 'cancelled':
            return session

        effective_status = session.get_time_status(now=now)
        target_status = {
            'upcoming': 'scheduled',
            'live': 'live',
            'ended': 'completed',
        }.get(effective_status, session.status)

        if target_status != session.status:
            session.status = target_status
            session.save(update_fields=['status'])
        return session

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
        """
        Create a timetable entry for the session.

        Google Meet scheduling is handled automatically by a background task
        shortly before the session starts. If the session is already within the
        next 10 minutes, create the event immediately.
        """
        from datetime import timedelta

        course = serializer.validated_data['course']
        if self.request.user.role == 'faculty' and course.faculty_id != self.request.user.id:
            raise permissions.PermissionDenied(
                'You can only schedule sessions for courses assigned to you.'
            )

        session = serializer.save()
        if session.scheduled_at <= timezone.now() + timedelta(minutes=10):
            try:
                create_calendar_event(session)
            except Exception as e:
                # Calendar creation is non-blocking; session still exists
                print(f'Google Calendar event creation failed: {e}')

    def perform_update(self, serializer):
        course = serializer.validated_data.get('course', serializer.instance.course)
        if self.request.user.role == 'faculty' and course.faculty_id != self.request.user.id:
            raise permissions.PermissionDenied(
                'You can only manage sessions for courses assigned to you.'
            )
        serializer.save()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        for session in queryset:
            self._ensure_meeting_ready(session)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        session = self.get_object()
        self._ensure_meeting_ready(session)
        serializer = self.get_serializer(session)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def go_live(self, request, pk=None):
        """Mark session as live."""
        session = self.get_object()
        self._ensure_meeting_ready(session)
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


class GoogleCalendarConnectView(APIView):
    """Return Google OAuth status and consent URL for faculty/admin users."""

    permission_classes = [IsFacultyOrAdmin]

    def get(self, request):
        status_data = get_google_calendar_connection_status()
        if status_data['connected']:
            return Response(status_data)

        try:
            next_path = request.query_params.get('next', '')
            if next_path:
                status_data['authorization_url'] = get_google_calendar_authorization_url_for_next(next_path)
            else:
                status_data['authorization_url'] = get_google_calendar_authorization_url()
            return Response(status_data)
        except FileNotFoundError as exc:
            return Response(
                {'error': str(exc), **status_data},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GoogleCalendarCallbackView(APIView):
    """Handle the Google OAuth callback and store the authorized token."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        error = request.query_params.get('error')
        if error:
            return HttpResponse(
                f'Google Calendar connection failed: {error}',
                status=400,
                content_type='text/plain',
            )

        code = request.query_params.get('code')
        state = request.query_params.get('state')
        if not code or not state:
            return HttpResponse(
                'Missing Google Calendar callback parameters.',
                status=400,
                content_type='text/plain',
            )

        try:
            _, state_data = exchange_google_calendar_code(code=code, state=state)
        except Exception as exc:
            return HttpResponse(
                f'Google Calendar connection failed: {exc}',
                status=400,
                content_type='text/plain',
            )

        frontend_url = getattr(settings, 'FRONTEND_URL', '')
        if frontend_url:
            next_path = (state_data or {}).get('next_path') or '/faculty'
            if not str(next_path).startswith('/'):
                next_path = '/faculty'
            return redirect(f'{frontend_url.rstrip("/")}{next_path}?calendar=connected')

        return HttpResponse(
            'Google Calendar connected successfully. You can close this tab.',
            content_type='text/plain',
        )
