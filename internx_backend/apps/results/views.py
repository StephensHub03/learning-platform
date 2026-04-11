"""Views for results and progress tracking."""
from rest_framework import viewsets, permissions, generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Result, Progress
from .serializers import ResultSerializer, ProgressSerializer


class ResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Students view their results; faculty/admin view all.
    GET /api/results/ and GET /api/results/{id}/
    """

    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'assignment__course']
    ordering_fields = ['submitted_at', 'percentage']
    ordering = ['-submitted_at']

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'faculty']:
            return Result.objects.select_related(
                'student', 'assignment', 'assignment__course'
            ).prefetch_related('answers__question', 'answers__selected_choice').all()
        return Result.objects.select_related(
            'assignment', 'assignment__course'
        ).prefetch_related('answers__question', 'answers__selected_choice').filter(
            student=user
        )


class ProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Progress per course for a student.
    GET /api/results/progress/
    """

    serializer_class = ProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'faculty']:
            return Progress.objects.select_related('student', 'course').all()
        return Progress.objects.select_related('course').filter(student=user)
