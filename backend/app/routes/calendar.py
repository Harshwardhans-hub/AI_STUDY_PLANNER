from flask import Blueprint, jsonify, request, Response, g
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error
from app.models.study_plan import DailyTask, StudyPlan
from app.services.calendar_service import get_google_calendar_add_url, generate_ics_content
from datetime import datetime, date, timedelta

calendar_bp = Blueprint("calendar", __name__)


@calendar_bp.route("/export/ics", methods=["GET"])
@firebase_required
def export_ics():
    """Export the active study plan as an .ics calendar file."""
    plan = StudyPlan.query.filter_by(
        user_id=g.current_user.id, is_active=True
    ).first()

    if not plan:
        return error("No active study plan found. Generate one first.", 404)

    tasks = DailyTask.query.filter(
        DailyTask.plan_id == plan.id,
        DailyTask.date >= date.today()
    ).order_by(DailyTask.date).all()

    events = []
    # Group tasks by date, assign sequential time slots starting at 9am
    from collections import defaultdict
    by_date = defaultdict(list)
    for t in tasks:
        by_date[t.date].append(t)

    for day, day_tasks in sorted(by_date.items()):
        current_hour = 9  # Start at 9am
        for t in day_tasks:
            start_dt = datetime(day.year, day.month, day.day, current_hour, 0)
            end_dt   = start_dt + timedelta(hours=t.duration_hours)
            subject_name_str = t.subject.name if t.subject else 'Break'
            events.append({
                "id":          t.id,
                "title":       f"📚 {subject_name_str}" + (f" — {t.focus[:40]}" if t.focus else ""),
                "description": t.focus or "",
                "start_dt":    start_dt,
                "end_dt":      end_dt,
            })
            current_hour = end_dt.hour + (1 if end_dt.minute > 0 else 0)

    ics_content = generate_ics_content(events)

    return Response(
        ics_content,
        mimetype="text/calendar",
        headers={"Content-Disposition": "attachment; filename=study_plan.ics"}
    )


@calendar_bp.route("/google-url", methods=["POST"])
@firebase_required
def get_google_url():
    """Get a Google Calendar pre-fill URL for a single event."""
    data = request.get_json() or {}
    title       = data.get("title", "Study Session")
    start_str   = data.get("start")
    end_str     = data.get("end")
    description = data.get("description", "")

    if not start_str or not end_str:
        return error("'start' and 'end' datetime strings are required", 400)

    try:
        start_dt = datetime.fromisoformat(start_str)
        end_dt   = datetime.fromisoformat(end_str)
    except ValueError:
        return error("Invalid datetime format. Use ISO format: 2024-12-25T09:00:00", 400)

    url = get_google_calendar_add_url(title, start_dt, end_dt, description)
    return success(data={"url": url})


@calendar_bp.route("/upcoming", methods=["GET"])
@firebase_required
def upcoming_tasks():
    """Return next 7 days of tasks formatted for calendar display."""
    today = date.today()
    end   = today + timedelta(days=7)

    tasks = DailyTask.query.filter(
        DailyTask.user_id == g.current_user.id,
        DailyTask.date   >= today,
        DailyTask.date   <= end,
    ).order_by(DailyTask.date).all()

    # Group by date
    from collections import defaultdict
    by_date = defaultdict(list)
    for t in tasks:
        by_date[str(t.date)].append({
            "id":             t.id,
            "subject_name":   t.subject.name if t.subject else None,
            "subject_color":  t.subject.color if t.subject else "#10b981",
            "duration_hours": t.duration_hours,
            "task_type":      t.task_type,
            "focus":          t.focus,
            "is_done":        t.is_done,
        })

    return success(data=dict(by_date))
