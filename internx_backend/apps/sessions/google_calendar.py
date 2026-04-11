"""
Google Calendar API integration helper.
Creates a Google Meet-eligible Calendar event for a live session.

Prerequisites:
  1. Enable Google Calendar API in Google Cloud Console
  2. Download credentials.json (OAuth2 Desktop App or Service Account)
  3. Set GOOGLE_CALENDAR_CREDENTIALS_PATH in .env
"""
import os
from django.conf import settings


def create_calendar_event(session):
    """
    Create a Google Calendar event for the given LiveSession.
    Returns the event ID on success, or None if credentials are not configured.
    """
    creds_path = getattr(settings, 'GOOGLE_CALENDAR_CREDENTIALS_PATH', None)
    if not creds_path or not os.path.exists(creds_path):
        print('Google Calendar credentials not found — skipping event creation.')
        return None

    try:
        from googleapiclient.discovery import build
        from google.oauth2 import service_account

        SCOPES = ['https://www.googleapis.com/auth/calendar']
        credentials = service_account.Credentials.from_service_account_file(
            creds_path, scopes=SCOPES
        )
        service = build('calendar', 'v3', credentials=credentials)

        start_dt = session.scheduled_at.isoformat()
        from datetime import timedelta
        end_dt = (session.scheduled_at + timedelta(minutes=session.duration_minutes)).isoformat()

        event = {
            'summary': f'[InternX] {session.course.title} – {session.title}',
            'description': session.description,
            'start': {'dateTime': start_dt, 'timeZone': 'Asia/Kolkata'},
            'end': {'dateTime': end_dt, 'timeZone': 'Asia/Kolkata'},
            'conferenceData': {
                'createRequest': {
                    'requestId': str(session.id),
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                }
            },
        }

        created_event = service.events().insert(
            calendarId='primary',
            body=event,
            conferenceDataVersion=1
        ).execute()

        # Store meet link if generated
        meet_link = created_event.get('hangoutLink', '')
        if meet_link and not session.meet_link:
            session.meet_link = meet_link
            session.save(update_fields=['meet_link'])

        return created_event.get('id')

    except Exception as e:
        print(f'Google Calendar API error: {e}')
        return None
