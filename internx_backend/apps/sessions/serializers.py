"""Serializers for live sessions."""
from rest_framework import serializers
from .models import LiveSession


class LiveSessionSerializer(serializers.ModelSerializer):
    """Live session with course title and scheduling info."""

    course_title = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = [
            'id', 'course', 'course_title', 'title', 'description',
            'scheduled_at', 'duration_minutes', 'meet_link',
            'calendar_event_id', 'status', 'recording_url',
            'is_upcoming', 'created_at'
        ]
        read_only_fields = ['calendar_event_id', 'created_at']

    def get_course_title(self, obj):
        return obj.course.title

    def get_is_upcoming(self, obj):
        from django.utils import timezone
        return obj.scheduled_at > timezone.now() and obj.status == 'scheduled'
