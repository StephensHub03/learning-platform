"""Serializers for live sessions."""
from rest_framework import serializers
from django.utils import timezone
from .models import LiveSession
from .google_calendar import is_google_calendar_connected


class LiveSessionSerializer(serializers.ModelSerializer):
    """Live session with course title and scheduling info."""

    course_title = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    google_calendar_connected = serializers.SerializerMethodField()
    session_state = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    can_join = serializers.SerializerMethodField()
    display_status = serializers.SerializerMethodField()
    meet_link = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = [
            'id', 'course', 'course_title', 'title', 'description',
            'scheduled_at', 'duration_minutes', 'meet_link',
            'calendar_event_id', 'status', 'recording_url',
            'is_upcoming', 'google_calendar_connected', 'session_state',
            'display_status', 'end_time', 'can_join', 'created_at'
        ]
        read_only_fields = [
            'calendar_event_id', 'created_at', 'meet_link',
            'session_state', 'display_status', 'end_time', 'can_join',
        ]

    def get_course_title(self, obj):
        return obj.course.title

    def get_is_upcoming(self, obj):
        return obj.get_time_status() == 'upcoming'

    def get_google_calendar_connected(self, obj):
        return is_google_calendar_connected()

    def get_session_state(self, obj):
        return obj.get_time_status()

    def get_display_status(self, obj):
        return {
            'upcoming': 'Starts Soon',
            'live': 'Join Now',
            'ended': 'Session Ended',
            'cancelled': 'Cancelled',
        }.get(obj.get_time_status(), 'Starts Soon')

    def get_end_time(self, obj):
        return obj.end_time

    def get_can_join(self, obj):
        return obj.get_time_status() == 'live' and bool(obj.meet_link)

    def get_meet_link(self, obj):
        return obj.meet_link if obj.get_time_status() != 'ended' else None

    def validate_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('Schedule time must be in the future.')
        return value

    def validate(self, attrs):
        status_value = attrs.get('status')
        if status_value in {'live', 'completed'} and not self.instance:
            raise serializers.ValidationError({
                'status': 'New sessions must be created as scheduled.'
            })
        return attrs
