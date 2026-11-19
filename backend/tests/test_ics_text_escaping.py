"""Regression tests for text escaping in generated iCalendar content."""

import unittest

from app.services.calendar_service import _escape_ics_text


class ICalendarTextEscapingTests(unittest.TestCase):
    def test_escapes_backslashes_commas_semicolons_and_newlines(self):
        source = "Line 1, topic; path\\name\nLine 2"
        self.assertEqual(
            _escape_ics_text(source),
            "Line 1\\, topic\\; path\\\\name\\nLine 2",
        )

    def test_converts_non_string_values_to_text(self):
        self.assertEqual(_escape_ics_text(42), "42")


if __name__ == "__main__":
    unittest.main()
