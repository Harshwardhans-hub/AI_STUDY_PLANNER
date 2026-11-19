"""Regression tests ensuring user-controlled email content is HTML escaped."""

import os
import unittest
from email import message_from_string
from unittest.mock import MagicMock, patch

from flask import Flask

from app.services import email_service


class EmailHtmlEscapingTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.context = self.app.app_context()
        self.context.push()

    def tearDown(self):
        self.context.pop()

    def _send_and_read_html(self, callback):
        smtp = MagicMock()
        smtp.__enter__.return_value = smtp
        smtp.__exit__.return_value = False
        with patch.dict(os.environ, {
            "SMTP_HOST": "smtp.example.test",
            "SMTP_PORT": "587",
            "SMTP_USER": "sender@example.test",
            "SMTP_PASSWORD": "test-password",
        }, clear=False), patch.object(email_service.smtplib, "SMTP", return_value=smtp):
            self.assertTrue(callback())
        raw_message = smtp.sendmail.call_args.args[2]
        parsed = message_from_string(raw_message)
        return parsed.get_payload(0).get_payload(decode=True).decode("utf-8")

    def test_study_reminder_escapes_name_subject_and_focus(self):
        html = self._send_and_read_html(lambda: email_service.send_study_reminder(
            "student@example.test",
            "<img src=x onerror=alert(1)>",
            [{
                "subject_name": "<script>alert(1)</script>",
                "duration_hours": 1,
                "focus": "<svg onload=alert(1)>",
            }],
        ))

        self.assertIn("&lt;img", html)
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("&lt;svg", html)
        self.assertNotIn("<script>alert(1)</script>", html)

    def test_exam_reminder_escapes_user_and_subject_names(self):
        html = self._send_and_read_html(lambda: email_service.send_exam_reminder(
            "student@example.test",
            "<b>Student</b>",
            "<iframe>Subject</iframe>",
            2,
        ))

        self.assertIn("&lt;b&gt;Student&lt;/b&gt;", html)
        self.assertIn("&lt;iframe&gt;Subject&lt;/iframe&gt;", html)
        self.assertNotIn("<iframe>Subject</iframe>", html)


if __name__ == "__main__":
    unittest.main()
