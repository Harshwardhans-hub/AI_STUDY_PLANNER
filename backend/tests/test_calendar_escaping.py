"""Tests for safe iCalendar TEXT field escaping."""

import unittest
from datetime import datetime

from app.services.calendar_service import generate_ics_content


class ICalendarEscapingTests(unittest.TestCase):
    def test_summary_and_description_escape_special_text(self):
        content = generate_ics_content([{
            "id": 1,
            "title": "DBMS, joins; review",
            "description": "Line one\nLine two; path\\notes",
            "start_dt": datetime(2026, 11, 20, 9, 0),
            "end_dt": datetime(2026, 11, 20, 10, 0),
        }])

        self.assertIn(r"SUMMARY:DBMS\, joins\; review", content)
        self.assertIn(r"DESCRIPTION:Line one\nLine two\; path\\notes", content)

    def test_text_fields_do_not_create_extra_calendar_lines(self):
        content = generate_ics_content([{
            "id": 2,
            "title": "Study\nBEGIN:VEVENT",
            "description": "First line\r\nSecond line",
            "start_dt": "2026-11-20T11:00:00",
            "end_dt": "2026-11-20T11:30:00",
        }])

        self.assertEqual(content.count("BEGIN:VEVENT"), 1)
        self.assertEqual(content.count("END:VEVENT"), 1)
        self.assertIn(r"SUMMARY:Study\nBEGIN:VEVENT", content)
        self.assertIn(r"DESCRIPTION:First line\nSecond line", content)


if __name__ == "__main__":
    unittest.main()
