"""Serializers for results and progress."""
from rest_framework import serializers
from .models import Result, Answer, Progress
from apps.assignments.serializers import QuestionWithAnswerSerializer


class AnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.SerializerMethodField()
    selected_choice_text = serializers.SerializerMethodField()
    correct_choice_text = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = [
            'id', 'question_text', 'selected_choice_text',
            'correct_choice_text', 'is_correct'
        ]

    def get_question_text(self, obj):
        return obj.question.text

    def get_selected_choice_text(self, obj):
        return obj.selected_choice.text if obj.selected_choice else None

    def get_correct_choice_text(self, obj):
        correct = obj.question.choices.filter(is_correct=True).first()
        return correct.text if correct else None


class ResultSerializer(serializers.ModelSerializer):
    """Full result with answers for student review."""

    answers = AnswerSerializer(many=True, read_only=True)
    assignment_title = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    has_certificate = serializers.SerializerMethodField()

    class Meta:
        model = Result
        fields = [
            'id', 'student', 'student_name',
            'assignment', 'assignment_title', 'course_title',
            'score', 'total_marks', 'percentage', 'status',
            'time_taken_seconds', 'submitted_at',
            'answers', 'has_certificate'
        ]

    def get_assignment_title(self, obj):
        return obj.assignment.title

    def get_course_title(self, obj):
        return obj.assignment.course.title

    def get_student_name(self, obj):
        return obj.student.get_full_name()

    def get_has_certificate(self, obj):
        return hasattr(obj, 'certificate') and obj.certificate is not None


class ProgressSerializer(serializers.ModelSerializer):
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = Progress
        fields = [
            'id', 'course', 'course_title',
            'assignments_passed', 'total_assignments',
            'completion_percentage', 'is_completed', 'completed_at', 'updated_at'
        ]

    def get_course_title(self, obj):
        return obj.course.title
