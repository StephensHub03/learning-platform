"""Serializers for MCQ assignments, questions, choices."""
from rest_framework import serializers
from .models import Assignment, Question, Choice


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'order']
        # Never expose is_correct to students in list view


class ChoiceWithAnswerSerializer(serializers.ModelSerializer):
    """Used in result view to reveal correct answers."""
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    """Question with choices — hides correct answer."""
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'marks', 'order', 'choices']


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Question with correct answer revealed (post-submission)."""
    choices = ChoiceWithAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'explanation', 'marks', 'order', 'choices']


class QuestionWriteSerializer(serializers.ModelSerializer):
    """For faculty to create questions with choices."""
    choices = ChoiceWithAnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'explanation', 'marks', 'order', 'choices']

    def create(self, validated_data):
        choices_data = validated_data.pop('choices')
        question = Question.objects.create(**validated_data)
        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)
        return question


class AssignmentSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    total_questions = serializers.ReadOnlyField()
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'course', 'course_title', 'title', 'description',
            'total_marks', 'pass_percentage', 'time_limit_minutes',
            'is_active', 'auto_certificate', 'total_questions',
            'questions', 'created_at'
        ]

    def get_course_title(self, obj):
        return obj.course.title


class SubmitAnswerSerializer(serializers.Serializer):
    """Student MCQ submission — list of {question_id, choice_id} pairs."""
    answers = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField()),
        help_text='[{"question_id": 1, "choice_id": 3}, ...]'
    )
    time_taken_seconds = serializers.IntegerField(default=0, min_value=0)
