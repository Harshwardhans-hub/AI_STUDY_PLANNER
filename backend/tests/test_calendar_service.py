"""Tests for Google Calendar URL and iCalendar export helpers."""

import unittest
from datetime import datetime
from urllib.parse import parse_qs, urlparse

from app.services.calendar_service import generate_ics_content, get_google_calendar_add_url


class GoogleCalendarUrlTests(unittest.TestCase):
    def test_url_encodes_title_description_and_datetime_range(self):
        start = datetime(2026, 11, 20, 9, 0)
        end = datetime(2026, 11, 20, 10, 30)
        url = get_google_calendar_add_url("DBMS & SQL", start, end, "Keys and joins")

        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        self.assertEqual(parsed.netloc, "calendar.google.com")
        self.assertEqual(params["action"], ["TEMPLATE"])
        self.assertEqual(params["text"], ["DBMS & SQL"])
        self.assertEqual(params["details"], ["Keys and joins"])
        self.assertEqual(params["dates"], ["20261120T090000/20261120T103000"])


class ICalendarExportTests(unittest.TestCase):
    def test_empty_calendar_has_valid_container_lines(self):
        content = generate_ics_content([])

        self.assertTrue(content.startswith("BEGIN:VCALENDAR\r\n"))
        self.assertIn("VERSION:2.0", content)
        self.assertTrue(content.endswith("END:VCALENDAR"))

    def test_event_accepts_datetime_objects(self):
        content = generate_ics_content([{
            "id": 12,
            "title": "Algorithms",
            "description": "Binary search practice",
            "start_dt": datetime(2026, 11, 20, 9, 0),
            "end_dt": datetime(2026, 11, 20, 10, 0),
        }])

        self.assertIn("UID:studyai-12@studyai", content)
        self.assertIn("DTSTART:20261120T090000", content)
        self.assertIn("DTEND:20261120T100000", content)
        self.assertIn("SUMMARY:Algorithms", content)
        self.assertIn("DESCRIPTION:Binary search practice", content)

    def test_event_accepts_iso_datetime_strings(self):
        content = generate_ics_content([{
            "title": "Revision",
            "start_dt": "2026-11-20T11:00:00",
            "end_dt": "2026-11-20T11:45:00",
        }])

        self.assertIn("DTSTART:20261120T110000", content)
        self.assertIn("DTEND:20261120T114500", content)


if __name__ == "__main__":
    unittest.main()
