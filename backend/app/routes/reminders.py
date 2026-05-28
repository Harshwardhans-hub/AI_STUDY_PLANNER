from flask import Blueprint, request, g
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error
from app.services.email_service import send_study_reminder
from app.models.study_plan import DailyTask
from datetime import date

reminders_bp = Blueprint("reminders", __name__)


@reminders_bp.route("/test", methods=["POST"])
@firebase_required
def send_test_reminder():
    """Send a test study reminder email to the authenticated user."""
    user = g.current_user
    if not user.email:
        return error("No email address found on your account.", 400)

    # Get today's tasks
    today = date.today()
    tasks = DailyTask.query.filter(
        DailyTask.user_id == user.id,
        DailyTask.date    == today,
    ).all()

    tasks_data = [{
        "subject_name":   t.subject_name or "Break",
        "duration_hours": t.duration_hours,
        "focus":          t.focus or "",
    } for t in tasks]

    if not tasks_data:
        tasks_data = [{"subject_name": "No tasks scheduled yet", "duration_hours": 0, "focus": "Generate a study plan!"}]

    sent = send_study_reminder(user.email, user.name, tasks_data)
    if sent:
        return success(message=f"Test reminder sent to {user.email}")
    else:
        return error("SMTP not configured. Add SMTP_USER and SMTP_PASSWORD to backend/.env to enable emails.", 503)


@reminders_bp.route("/preferences", methods=["GET", "POST"])
@firebase_required
def reminder_preferences():
    """Get or update reminder preferences (stored in user record)."""
    user = g.current_user
    if request.method == "GET":
        return success(data={
            "email_reminders_enabled": getattr(user, "email_reminders_enabled", False),
            "reminder_time":           getattr(user, "reminder_time", "08:00"),
            "email":                   user.email,
        })

    data = request.get_json() or {}
    if hasattr(user, "email_reminders_enabled"):
        user.email_reminders_enabled = data.get("email_reminders_enabled", False)
    if hasattr(user, "reminder_time"):
        user.reminder_time = data.get("reminder_time", "08:00")

    from app.extensions import db
    db.session.commit()
    return success(message="Reminder preferences saved")
