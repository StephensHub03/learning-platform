"""
Live Session model — Google Meet integration.
"""
from datetime import timedelta

from django.db import models
from django.utils import timezone
from apps.courses.models import Course


class LiveSession(models.Model):
    """Scheduled live class session for a course."""

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('live', 'Live'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    meet_link = models.URLField(
        blank=True,
        help_text='Google Meet link for the live session'
    )
    # Google Calendar event ID (stored after creating event via API)
    calendar_event_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    recording_url = models.URLField(blank=True, help_text='Recording link after session ends')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f'{self.course.title} – {self.title} @ {self.scheduled_at}'

    @property
    def end_time(self):
        return self.scheduled_at + timedelta(minutes=self.duration_minutes)

    def get_time_status(self, now=None):
        """
        Compute the effective session state from time instead of trusting the
        persisted status field alone.
        """
        if self.status == 'cancelled':
            return 'cancelled'

        current_time = now or timezone.now()
        if current_time < self.scheduled_at:
            return 'upcoming'
        if self.scheduled_at <= current_time <= self.end_time:
            return 'live'
        return 'ended'
