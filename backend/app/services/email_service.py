"""
Email reminder service using SMTP (Gmail or any SMTP server).
Configure SMTP settings in backend/.env
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
import os


def send_study_reminder(to_email: str, user_name: str, tasks: list) -> bool:
    """
    Send a daily study reminder email.
    tasks: list of { subject_name, duration_hours, focus }
    Returns True if sent successfully.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        current_app.logger.warning("SMTP credentials not configured. Skipping email.")
        return False

    tasks_html = "".join(
        f"<li><strong>{t['subject_name']}</strong> — {t['duration_hours']}h — {t.get('focus', '')}</li>"
        for t in tasks
    )

    total_hours = sum(t["duration_hours"] for t in tasks)

    html = f"""
    <html><body style="font-family: sans-serif; background:#0f0f15; color:#e2e8f0; padding:20px;">
      <div style="max-width:600px; margin:0 auto; background:#1a1a2e; border-radius:16px; padding:32px; border:1px solid rgba(99,102,241,0.2);">
        <h1 style="color:#818cf8; margin-bottom:8px;">📚 Daily Study Plan</h1>
        <p style="color:#94a3b8;">Hi <strong style="color:#e2e8f0;">{user_name}</strong>, here's your study schedule for today!</p>
        <div style="background:#111827; border-radius:12px; padding:20px; margin:20px 0;">
          <p style="color:#10b981; font-weight:600; margin-bottom:12px;">Today's Tasks ({total_hours:.1f}h total):</p>
          <ul style="color:#94a3b8; line-height:2;">
            {tasks_html}
          </ul>
        </div>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
          Sent by StudyAI — Your AI-Powered Study Planner<br>
          <a href="http://localhost:5173" style="color:#10b981;">Open StudyAI</a>
        </p>
      </div>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📚 StudyAI: Your study plan for today — {total_hours:.1f}h"
    msg["From"]    = smtp_user
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_exam_reminder(to_email: str, user_name: str, subject_name: str, days_until: int) -> bool:
    """Send an exam proximity reminder."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        return False

    urgency = "🚨 URGENT" if days_until <= 1 else "⚠️ " if days_until <= 3 else "📅 "
    html = f"""
    <html><body style="font-family: sans-serif; background:#0f0f15; color:#e2e8f0; padding:20px;">
      <div style="max-width:600px; margin:0 auto; background:#1a1a2e; border-radius:16px; padding:32px;">
        <h1 style="color:#f59e0b;">{urgency} Exam Alert!</h1>
        <p>Hi <strong>{user_name}</strong>,</p>
        <p>Your <strong style="color:#818cf8;">{subject_name}</strong> exam is in
           <strong style="color:{'#ef4444' if days_until <= 1 else '#f59e0b'};">{days_until} day{'s' if days_until != 1 else ''}</strong>!</p>
        <p style="color:#94a3b8;">Open StudyAI to review your study plan and make sure you're on track.</p>
        <a href="http://localhost:5173/planner" style="display:inline-block; background:#10b981; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; margin-top:16px;">
          Open Study Planner
        </a>
      </div>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{urgency} {subject_name} exam in {days_until} day{'s' if days_until != 1 else ''}!"
    msg["From"]    = smtp_user
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send exam reminder: {e}")
        return False
