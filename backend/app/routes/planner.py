from flask import Blueprint, request, g
from datetime import datetime, date, timezone
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error
from app.models.subject import Subject
from app.models.study_plan import StudyPlan, DailyTask
from app.extensions import db
from app.services import gemini_service

planner_bp = Blueprint("planner", __name__)


@planner_bp.route("/generate", methods=["POST"])
@firebase_required
def generate_plan():
    data = request.get_json() or {}
    hours_per_day = float(data.get("hours_per_day") or 4.0)
    days          = int(data.get("days") or 14)

    subjects = Subject.query.filter_by(user_id=g.current_user.id).all()
    if not subjects:
        return error("Add at least one subject before generating a plan", 400)

    # Build subjects payload for Gemini
    subjects_data = []
    for s in subjects:
        pending = [t.name for t in s.topics if not t.is_completed]
        subjects_data.append({
            "name":                  s.name,
            "difficulty":            s.difficulty,
            "exam_date":             s.exam_date.isoformat() if s.exam_date else None,
            "days_until_exam":       s.days_until_exam,
            "completion_percentage": s.completion_percentage,
            "pending_topics":        pending,
        })

    today = date.today().isoformat()

    try:
        plan_json = gemini_service.generate_study_plan(subjects_data, hours_per_day, today, days)
    except Exception as e:
        return error(f"Gemini plan generation failed: {str(e)}", 500)

    # Deactivate previous plans
    StudyPlan.query.filter_by(user_id=g.current_user.id, is_active=True).update({"is_active": False})
    db.session.commit()

    # Save new plan
    plan = StudyPlan(
        user_id       = g.current_user.id,
        plan_json     = plan_json,
        hours_per_day = hours_per_day,
        is_active     = True,
    )
    db.session.add(plan)
    db.session.flush()  # get plan.id before committing

    # Persist daily tasks
    subject_map = {s.name.lower(): s.id for s in subjects}
    for day_data in plan_json.get("days", []):
        try:
            task_date = datetime.strptime(day_data["date"], "%Y-%m-%d").date()
        except (ValueError, KeyError):
            continue
        for task in day_data.get("tasks", []):
            subj_name = task.get("subject", "").lower()
            subj_id   = subject_map.get(subj_name)
            dt = DailyTask(
                plan_id        = plan.id,
                user_id        = g.current_user.id,
                subject_id     = subj_id,
                date           = task_date,
                duration_hours = float(task.get("duration_hours", 1.0)),
                task_type      = task.get("type", "study"),
                focus          = task.get("focus", ""),
                is_done        = False,
            )
            db.session.add(dt)

    db.session.commit()
    return success(data=plan.to_dict(), message="Study plan generated!", status=201)


@planner_bp.route("/active", methods=["GET"])
@firebase_required
def get_active_plan():
    plan = StudyPlan.query.filter_by(user_id=g.current_user.id, is_active=True)\
                          .order_by(StudyPlan.generated_at.desc()).first()
    if not plan:
        return error("No active study plan found", 404)
    return success(data=plan.to_dict(include_tasks=True))


@planner_bp.route("/tasks/today", methods=["GET"])
@firebase_required
def today_tasks():
    today = date.today()
    tasks = DailyTask.query.filter_by(user_id=g.current_user.id, date=today)\
                           .order_by(DailyTask.task_type).all()
    return success(data=[t.to_dict() for t in tasks])


@planner_bp.route("/tasks/<int:task_id>/done", methods=["PATCH"])
@firebase_required
def mark_task_done(task_id):
    task = DailyTask.query.filter_by(id=task_id, user_id=g.current_user.id).first()
    if not task:
        return error("Task not found", 404)
    data = request.get_json() or {}
    task.is_done = data.get("is_done", True)
    task.completed_at = datetime.now(timezone.utc) if task.is_done else None
    db.session.commit()
    return success(data=task.to_dict(), message="Task updated")


@planner_bp.route("/tasks", methods=["GET"])
@firebase_required
def get_tasks_by_date():
    date_str = request.args.get("date")
    if not date_str:
        return error("date query param required (YYYY-MM-DD)", 400)
    try:
        task_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return error("Invalid date format. Use YYYY-MM-DD")

    tasks = DailyTask.query.filter_by(user_id=g.current_user.id, date=task_date)\
                           .order_by(DailyTask.task_type).all()
    return success(data=[t.to_dict() for t in tasks])
