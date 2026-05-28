"""
Google Calendar service — adds study sessions to user's Google Calendar.
Uses the service account approach or the user's OAuth2 tokens.
Since we're using Firebase for auth, we'll guide users to connect Google Calendar
separately via OAuth2. For now, we export .ics files and link to Google Calendar
pre-fill URLs which work without OAuth2.
"""
from datetime import datetime, timedelta
import urllib.parse


def get_google_calendar_add_url(title: str, start_dt: datetime, end_dt: datetime, description: str = "") -> str:
    """
    Generate a Google Calendar 'Add Event' pre-fill URL.
    No OAuth required — opens in the user's browser pre-filled.
    """
    fmt = "%Y%m%dT%H%M%S"
    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_dt.strftime(fmt)}/{end_dt.strftime(fmt)}",
        "details": description,
    }
    base = "https://calendar.google.com/calendar/render"
    return f"{base}?{urllib.parse.urlencode(params)}"


def generate_ics_content(events: list) -> str:
    """
    Generate an .ics file content for a list of study events.
    events: list of { title, start_dt, end_dt, description }
    """
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StudyAI//Study Planner//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    for ev in events:
        start = ev["start_dt"]
        end   = ev["end_dt"]
        if isinstance(start, str):
            start = datetime.fromisoformat(start)
        if isinstance(end, str):
            end = datetime.fromisoformat(end)

        uid = f"studyai-{ev.get('id', hash(ev['title']))}"
        lines += [
            "BEGIN:VEVENT",
            f"UID:{uid}@studyai",
            f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}",
            f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
            f"SUMMARY:{ev['title']}",
            f"DESCRIPTION:{ev.get('description', '')}",
            "STATUS:CONFIRMED",
            "END:VEVENT",
        ]

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
