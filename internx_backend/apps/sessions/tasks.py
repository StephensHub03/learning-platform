"""
Background tasks for live session scheduling.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .google_calendar import create_calendar_event
from .models import LiveSession


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def schedule_upcoming_google_meet_sessions(self):
    """
    Create Google Calendar + Meet events for sessions starting within 10 minutes
    or already in progress without a generated meeting link.

    This lets faculty define the timetable in advance while the actual meeting
    invite is created automatically shortly before the class begins.
    """
    now = timezone.now()
    window_end = now + timedelta(minutes=10)

    pending_sessions = LiveSession.objects.select_related(
        'course',
        'course__faculty',
    ).filter(
        status='scheduled',
        calendar_event_id='',
        scheduled_at__lte=window_end,
    )

    created_count = 0
    for session in pending_sessions:
        session_end = session.scheduled_at + timedelta(minutes=session.duration_minutes)
        if session_end < now:
            continue
        try:
            event_id = create_calendar_event(session)
            if event_id:
                created_count += 1
        except Exception as exc:
            logger.exception(
                'Failed to auto-schedule Google Meet for session %s: %s',
                session.id,
                exc,
            )
            raise self.retry(exc=exc)

    logger.info(
        'Auto-scheduled %s upcoming Google Meet session(s) for %s to %s',
        created_count,
        now,
        window_end,
    )
    return created_count


@shared_task
def sync_session_end_states():
    """
    Optional background sync so stored statuses move to completed after a
    session's end time, even though the API also computes state dynamically.
    """
    now = timezone.now()
    ended_sessions = LiveSession.objects.filter(
        status__in=['scheduled', 'live'],
        scheduled_at__lt=now,
    )

    updated_count = 0
    for session in ended_sessions:
        if session.get_time_status(now=now) == 'ended':
            session.status = 'completed'
            session.save(update_fields=['status'])
            updated_count += 1

    logger.info('Synced %s session(s) to completed status', updated_count)
    return updated_count
