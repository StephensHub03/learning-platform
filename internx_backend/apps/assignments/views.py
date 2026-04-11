"""
Assignment views — CRUD for faculty, MCQ submission for students.
Submission auto-grades answers, calculates score, and triggers certificate generation.
"""
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Assignment, Question
from .serializers import (
    AssignmentSerializer, QuestionWriteSerializer, SubmitAnswerSerializer
)


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


class AssignmentViewSet(viewsets.ModelViewSet):
    """Assignments CRUD + MCQ submission endpoint."""

    serializer_class = AssignmentSerializer
    permission_classes = [IsFacultyOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['course', 'is_active']
    search_fields = ['title']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Assignment.objects.select_related('course').all()
        elif user.role == 'faculty':
            return Assignment.objects.select_related('course').filter(
                course__faculty=user
            )
        # Students: assignments for enrolled courses
        enrolled_courses = user.enrollments.filter(
            is_active=True
        ).values_list('course_id', flat=True)
        return Assignment.objects.select_related('course').filter(
            course__in=enrolled_courses, is_active=True
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        """
        POST /api/assignments/{id}/submit/
        Grades MCQ answers and returns result.
        Student can only submit once per assignment.
        """
        assignment = self.get_object()
        user = request.user

        if user.role != 'student':
            return Response(
                {'error': 'Only students can submit assignments.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check for existing submission
        from apps.results.models import Result
        if Result.objects.filter(student=user, assignment=assignment).exists():
            return Response(
                {'error': 'You have already submitted this assignment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers_data = serializer.validated_data['answers']
        time_taken = serializer.validated_data['time_taken_seconds']

        # Grade the answers
        score = 0
        total_marks = assignment.total_marks
        answer_records = []

        from .models import Choice
        from apps.results.models import Answer

        for answer in answers_data:
            question_id = answer.get('question_id')
            choice_id = answer.get('choice_id')
            try:
                question = Question.objects.get(id=question_id, assignment=assignment)
                choice = Choice.objects.get(id=choice_id, question=question)
                is_correct = choice.is_correct
                if is_correct:
                    score += question.marks
                answer_records.append({
                    'question': question,
                    'selected_choice': choice,
                    'is_correct': is_correct
                })
            except (Question.DoesNotExist, Choice.DoesNotExist):
                continue

        percentage = (score / total_marks * 100) if total_marks > 0 else 0
        passed = percentage >= assignment.pass_percentage
        result_status = 'passed' if passed else 'failed'

        # Create Result
        result = Result.objects.create(
            student=user,
            assignment=assignment,
            score=score,
            total_marks=total_marks,
            percentage=percentage,
            status=result_status,
            time_taken_seconds=time_taken
        )

        # Save individual answers
        for rec in answer_records:
            Answer.objects.create(result=result, **rec)

        # Update progress
        from apps.results.models import Progress
        from apps.courses.models import Enrollment
        try:
            enrollment = Enrollment.objects.get(student=user, course=assignment.course)
            progress, _ = Progress.objects.get_or_create(
                student=user, course=assignment.course,
                defaults={'enrollment': enrollment}
            )
            progress.recalculate()
        except Enrollment.DoesNotExist:
            pass

        # Generate certificate if passed and auto_certificate enabled
        if passed and assignment.auto_certificate:
            from apps.notifications.tasks import generate_and_send_certificate
            generate_and_send_certificate.delay(result.id)

        from apps.results.serializers import ResultSerializer
        return Response(
            ResultSerializer(result, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], permission_classes=[IsFacultyOrAdmin])
    def add_question(self, request, pk=None):
        """POST /api/assignments/{id}/add_question/ — Faculty adds an MCQ question."""
        assignment = self.get_object()
        serializer = QuestionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(assignment=assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
