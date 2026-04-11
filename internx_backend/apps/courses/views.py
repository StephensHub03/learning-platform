"""
Course, Enrollment, and Admin Analytics views.
Role-based access control:
  - Students: read published courses, enroll
  - Faculty: CRUD their own courses, view enrollments
  - Admin: full access + analytics
"""
from rest_framework import generics, status, permissions, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg
from .models import Course, Enrollment, Category
from .serializers import CourseSerializer, EnrollmentSerializer, CategorySerializer
from apps.notifications.tasks import send_enrollment_email


class IsFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['faculty', 'admin']

    def has_object_permission(self, request, view, obj):
        # Faculty can only edit their own courses
        if request.user.role == 'admin':
            return True
        return obj.faculty == request.user


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class CourseViewSet(viewsets.ModelViewSet):
    """
    Course CRUD.
    - GET: any authenticated user (students see published only)
    - POST/PUT/DELETE: faculty (own courses) or admin
    """

    serializer_class = CourseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['level', 'status', 'category', 'is_free', 'faculty']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'enrolled_count']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Course.objects.select_related('faculty', 'category').all()
        # Both students and faculty see all published courses when browsing
        return Course.objects.select_related('faculty', 'category').filter(status='published')

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'enroll']:
            return [permissions.IsAuthenticated()]
        return [IsFaculty()]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, pk=None):
        """POST /api/courses/{id}/enroll/ — Student enrolls in a course."""
        course = self.get_object()
        user = request.user

        if user.role != 'student':
            return Response(
                {'error': 'Only students can enroll.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if course.enrolled_count >= course.max_students:
            return Response(
                {'error': 'Course is full.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        enrollment, created = Enrollment.objects.get_or_create(
            student=user, course=course,
            defaults={'status': 'active', 'is_active': True}
        )

        if not created:
            return Response(
                {'error': 'Already enrolled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Async enrollment email — fails gracefully if Redis/Celery is not running
        try:
            send_enrollment_email.delay(enrollment.id)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f'Could not queue enrollment email (is Redis running?): {e}'
            )

        return Response(
            EnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """GET /api/courses/{id}/students/ — List enrolled students (faculty/admin)."""
        course = self.get_object()
        enrollments = course.enrollments.select_related('student').filter(is_active=True)
        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)


class EnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Students can view their enrollments."""

    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'faculty']:
            return Enrollment.objects.select_related('student', 'course').all()
        return Enrollment.objects.select_related('course').filter(
            student=user, is_active=True
        )


class AdminAnalyticsView(APIView):
    """GET /api/admin-panel/analytics/ — Platform-wide stats."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.users.models import User
        from apps.results.models import Result
        from apps.certificates.models import Certificate

        # Recent enrollments with student and course info
        recent_enrollments = list(
            Enrollment.objects.select_related('student', 'course')
            .order_by('-enrolled_at')[:10]
            .values(
                'id',
                'student__first_name', 'student__last_name', 'student__email',
                'course__title',
                'enrolled_at', 'status'
            )
        )

        # All users with enrollment count
        all_users = list(
            User.objects.annotate(
                enrollment_count=Count('enrollments')
            ).values(
                'id', 'first_name', 'last_name', 'email', 'role',
                'is_active', 'created_at', 'enrollment_count'
            ).order_by('-created_at')
        )

        # Enrolments per course (all courses)
        course_enrollments = list(
            Course.objects.annotate(
                enrollment_count=Count('enrollments')
            ).order_by('-enrollment_count').values(
                'id', 'title', 'status', 'enrollment_count', 'level', 'faculty'
            )
        )

        data = {
            'total_users': User.objects.count(),
            'total_students': User.objects.filter(role='student').count(),
            'total_faculty': User.objects.filter(role='faculty').count(),
            'total_courses': Course.objects.count(),
            'published_courses': Course.objects.filter(status='published').count(),
            'total_enrollments': Enrollment.objects.count(),
            'total_results': Result.objects.count(),
            'total_certificates': Certificate.objects.count(),
            # Monthly enrollments (last 6 months)
            'enrollments_by_month': list(
                Enrollment.objects.extra(
                    select={'month': "to_char(enrolled_at, 'YYYY-MM')"}
                ).values('month').annotate(count=Count('id')).order_by('-month')[:6]
            ),
            # Top 5 courses by enrollment
            'top_courses': list(
                Course.objects.annotate(
                    enrollment_count=Count('enrollments')
                ).order_by('-enrollment_count').values(
                    'title', 'enrollment_count'
                )[:5]
            ),
            # Pass rate
            'pass_rate': Result.objects.filter(status='passed').count() /
                         (Result.objects.count() or 1) * 100,
            # New: detailed lists
            'recent_enrollments': recent_enrollments,
            'all_users': all_users,
            'course_enrollments': course_enrollments,
        }
        return Response(data)
