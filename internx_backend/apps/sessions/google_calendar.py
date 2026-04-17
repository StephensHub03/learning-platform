"""
Google Calendar API integration helper.

This module uses an OAuth client secret JSON plus a stored authorized-user
token so the backend can create Google Calendar events with Google Meet links
when faculty schedule sessions.
"""
import logging
import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.utils import timezone


logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar']
STATE_SALT = 'internx.google_calendar'
STATE_MAX_AGE_SECONDS = 600


def _resolve_path(path_value):
    if not path_value:
        return None
    if os.path.isabs(path_value):
        return path_value
    return os.path.join(settings.BASE_DIR, path_value)


def _get_client_secret_path():
    return _resolve_path(getattr(settings, 'GOOGLE_CALENDAR_CLIENT_SECRET_PATH', None))


def _get_token_path():
    return _resolve_path(getattr(settings, 'GOOGLE_CALENDAR_TOKEN_PATH', None))


def _save_credentials(creds):
    token_path = _get_token_path()
    if not token_path:
        return
    os.makedirs(os.path.dirname(token_path), exist_ok=True)
    with open(token_path, 'w', encoding='utf-8') as token_file:
        token_file.write(creds.to_json())


def get_google_calendar_credentials():
    """
    Load stored OAuth credentials for Calendar access.
    Returns a valid credentials object or None if the account is not connected.
    """
    token_path = _get_token_path()
    if not token_path or not os.path.exists(token_path):
        return None

    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials

        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            _save_credentials(creds)
        if not creds.valid:
            return None
        return creds
    except Exception as exc:
        logger.warning('Could not load Google Calendar token: %s', exc)
        return None


def is_google_calendar_connected():
    return get_google_calendar_credentials() is not None


def get_google_calendar_authorization_url():
    """
    Build the Google OAuth consent URL for connecting the backend calendar.
    """
    client_secret_path = _get_client_secret_path()
    if not client_secret_path or not os.path.exists(client_secret_path):
        raise FileNotFoundError('Google Calendar client secret JSON not found.')

    from google_auth_oauthlib.flow import Flow

    state_payload = {
        'nonce': secrets.token_urlsafe(24),
        'issued_at': timezone.now().timestamp(),
    }
    state = signing.dumps(state_payload, salt=STATE_SALT)

    flow = Flow.from_client_secrets_file(
        client_secret_path,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
    )
    authorization_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=state,
    )
    return authorization_url


def get_google_calendar_authorization_url_for_next(next_path=''):
    """
    Build the Google OAuth consent URL and remember which frontend path should
    receive the user after the Calendar account is connected.
    """
    client_secret_path = _get_client_secret_path()
    if not client_secret_path or not os.path.exists(client_secret_path):
        raise FileNotFoundError('Google Calendar client secret JSON not found.')

    from google_auth_oauthlib.flow import Flow

    state_payload = {
        'nonce': secrets.token_urlsafe(24),
        'issued_at': timezone.now().timestamp(),
        'next_path': next_path or '',
    }
    state = signing.dumps(state_payload, salt=STATE_SALT)

    flow = Flow.from_client_secrets_file(
        client_secret_path,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
    )
    authorization_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=state,
    )
    return authorization_url


def exchange_google_calendar_code(code, state):
    """
    Exchange the Google callback code for a long-lived token and persist it.
    """
    client_secret_path = _get_client_secret_path()
    if not client_secret_path or not os.path.exists(client_secret_path):
        raise FileNotFoundError('Google Calendar client secret JSON not found.')

    state_data = signing.loads(state, max_age=STATE_MAX_AGE_SECONDS, salt=STATE_SALT)

    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_secrets_file(
        client_secret_path,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
        state=state,
    )
    flow.fetch_token(code=code)
    _save_credentials(flow.credentials)
    return flow.credentials, state_data


def _get_google_calendar_service():
    creds = get_google_calendar_credentials()
    if not creds:
        return None

    from googleapiclient.discovery import build

    return build('calendar', 'v3', credentials=creds)


def _build_attendees(session):
    attendees = []
    seen_emails = set()

    faculty_email = getattr(session.course.faculty, 'email', '') or ''
    if faculty_email:
        attendees.append({'email': faculty_email})
        seen_emails.add(faculty_email.lower())

    enrollments = session.course.enrollments.select_related('student').filter(is_active=True)
    for enrollment in enrollments:
        student_email = (enrollment.student.email or '').strip()
        if not student_email:
            continue
        normalized = student_email.lower()
        if normalized in seen_emails:
            continue
        attendees.append({'email': student_email})
        seen_emails.add(normalized)

    return attendees


def create_calendar_event(session):
    """
    Create a Google Calendar event for the given LiveSession.
    Returns the event ID on success, or None if Calendar is not connected.
    """
    service = _get_google_calendar_service()
    if service is None:
        logger.info('Google Calendar is not connected. Skipping event creation.')
        return None

    try:
        start_dt = session.scheduled_at.isoformat()
        end_dt = (
            session.scheduled_at + timedelta(minutes=session.duration_minutes)
        ).isoformat()

        description_lines = [
            session.description.strip() if session.description else '',
            f'Course: {session.course.title}',
            f'Faculty: {session.course.faculty.get_full_name() or session.course.faculty.email}',
        ]

        event = {
            'summary': f'[InternX] {session.course.title} - {session.title}',
            'description': '\n'.join(line for line in description_lines if line),
            'start': {'dateTime': start_dt, 'timeZone': settings.TIME_ZONE},
            'end': {'dateTime': end_dt, 'timeZone': settings.TIME_ZONE},
            'attendees': _build_attendees(session),
            'conferenceData': {
                'createRequest': {
                    'requestId': f'internx-session-{session.id}',
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                }
            },
            'guestsCanInviteOthers': False,
            'guestsCanModify': False,
        }

        created_event = service.events().insert(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            body=event,
            conferenceDataVersion=1,
            sendUpdates='all',
        ).execute()

        meet_link = created_event.get('hangoutLink', '')
        updates = []
        if created_event.get('id') and session.calendar_event_id != created_event['id']:
            session.calendar_event_id = created_event['id']
            updates.append('calendar_event_id')
        if meet_link and session.meet_link != meet_link:
            session.meet_link = meet_link
            updates.append('meet_link')
        if updates:
            session.save(update_fields=updates)

        return created_event.get('id')
    except Exception as exc:
        logger.exception('Google Calendar API error: %s', exc)
        return None


def get_google_calendar_connection_status():
    client_secret_path = _get_client_secret_path()
    token_path = _get_token_path()
    return {
        'client_secret_configured': bool(client_secret_path and os.path.exists(client_secret_path)),
        'token_configured': bool(token_path and os.path.exists(token_path)),
        'connected': is_google_calendar_connected(),
        'redirect_uri': settings.GOOGLE_CALENDAR_REDIRECT_URI,
        'calendar_id': settings.GOOGLE_CALENDAR_ID,
    }
