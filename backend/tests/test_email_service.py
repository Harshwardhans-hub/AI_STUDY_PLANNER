"""Offline tests for SMTP study and exam reminder behavior."""

import os
import unittest
from unittest.mock import MagicMock, patch

from flask import Flask

from app.services import email_service


class EmailServiceTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.context = self.app.app_context()
        self.context.push()

    def tearDown(self):
        self.context.pop()

    def test_study_reminder_skips_when_credentials_are_missing(self):
        with patch.dict(os.environ, {"SMTP_USER": "", "SMTP_PASSWORD": ""}, clear=False), \
             patch.object(email_service.smtplib, "SMTP") as smtp:
            result = email_service.send_study_reminder("student@example.test", "Student", [])

        self.assertFalse(result)
        smtp.assert_not_called()

    def test_study_reminder_sends_when_smtp_is_configured(self):
        smtp_client = MagicMock()
        smtp_context = MagicMock()
        smtp_context.__enter__.return_value = smtp_client
        smtp_context.__exit__.return_value = False

        with patch.dict(os.environ, {
            "SMTP_HOST": "smtp.example.test",
            "SMTP_PORT": "587",
            "SMTP_USER": "sender@example.test",
            "SMTP_PASSWORD": "test-password",
        }, clear=False), patch.object(email_service.smtplib, "SMTP", return_value=smtp_context):
            result = email_service.send_study_reminder(
                "student@example.test",
                "Student",
                [{"subject_name": "DBMS", "duration_hours": 1.5, "focus": "Normalization"}],
            )

        self.assertTrue(result)
        smtp_client.starttls.assert_called_once()
        smtp_client.login.assert_called_once_with("sender@example.test", "test-password")
        smtp_client.sendmail.assert_called_once()
        self.assertEqual(smtp_client.sendmail.call_args.args[1], "student@example.test")

    def test_exam_reminder_skips_when_credentials_are_missing(self):
        with patch.dict(os.environ, {"SMTP_USER": "", "SMTP_PASSWORD": ""}, clear=False), \
             patch.object(email_service.smtplib, "SMTP") as smtp:
            result = email_service.send_exam_reminder(
                "student@example.test", "Student", "Software Engineering", 3
            )

        self.assertFalse(result)
        smtp.assert_not_called()

    def test_exam_reminder_returns_false_when_smtp_fails(self):
        with patch.dict(os.environ, {
            "SMTP_USER": "sender@example.test",
            "SMTP_PASSWORD": "test-password",
        }, clear=False), patch.object(email_service.smtplib, "SMTP", side_effect=OSError("offline")):
            result = email_service.send_exam_reminder(
                "student@example.test", "Student", "Software Engineering", 1
            )

        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
