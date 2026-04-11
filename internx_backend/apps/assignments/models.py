"""
MCQ Assignment, Question, and Choice models.
"""
from django.db import models
from apps.courses.models import Course


class Assignment(models.Model):
    """MCQ-based assignment linked to a course."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    total_marks = models.PositiveIntegerField(default=100)
    pass_percentage = models.PositiveIntegerField(
        default=60, help_text='Minimum pass percentage (0-100)'
    )
    time_limit_minutes = models.PositiveIntegerField(
        default=30, help_text='Time limit in minutes; 0 = no limit'
    )
    is_active = models.BooleanField(default=True)
    # Whether to auto-generate certificate on pass
    auto_certificate = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.course.title} – {self.title}'

    @property
    def total_questions(self):
        return self.questions.count()


class Question(models.Model):
    """MCQ question belonging to an assignment."""

    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name='questions'
    )
    text = models.TextField()
    explanation = models.TextField(
        blank=True, help_text='Shown to student after submission'
    )
    marks = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'Q{self.order}: {self.text[:60]}'


class Choice(models.Model):
    """Answer choice for an MCQ question."""

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        marker = '✓' if self.is_correct else '✗'
        return f'{marker} {self.text[:50]}'
