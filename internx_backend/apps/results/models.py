"""
Result, Answer, and Progress tracking models.
"""
from django.db import models
from apps.users.models import User
from apps.assignments.models import Assignment, Question, Choice
from apps.courses.models import Course, Enrollment


class Result(models.Model):
    """Student result after submitting an MCQ assignment."""

    STATUS_CHOICES = [
        ('passed', 'Passed'),
        ('failed', 'Failed'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='results')
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name='results'
    )
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_marks = models.PositiveIntegerField()
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='failed')
    time_taken_seconds = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One submission per student per assignment
        unique_together = ('student', 'assignment')
        ordering = ['-submitted_at']

    def __str__(self):
        return (
            f'{self.student.get_full_name()} – {self.assignment.title} '
            f'({self.percentage}% – {self.status})'
        )


class Answer(models.Model):
    """Individual answer for a question in a result."""

    result = models.ForeignKey(Result, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(
        Choice, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('result', 'question')

    def __str__(self):
        return f'Answer for Q{self.question.order} – {"✓" if self.is_correct else "✗"}'


class Progress(models.Model):
    """Tracks overall course completion progress for a student."""

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='progress')
    enrollment = models.OneToOneField(
        Enrollment, on_delete=models.CASCADE, related_name='progress'
    )
    # Number of assignments passed / total assignments
    assignments_passed = models.PositiveIntegerField(default=0)
    total_assignments = models.PositiveIntegerField(default=0)
    completion_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f'{self.student.get_full_name()} – {self.course.title} ({self.completion_percentage}%)'

    def recalculate(self):
        """Recalculate completion percentage based on passed assignments."""
        total = self.course.assignments.filter(is_active=True).count()
        passed = Result.objects.filter(
            student=self.student,
            assignment__course=self.course,
            status='passed'
        ).count()
        self.total_assignments = total
        self.assignments_passed = passed
        self.completion_percentage = (passed / total * 100) if total > 0 else 0
        if self.completion_percentage >= 100:
            import django.utils.timezone as tz
            self.is_completed = True
            self.completed_at = tz.now()
        self.save()
