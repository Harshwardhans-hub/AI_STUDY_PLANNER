from flask import Blueprint, request, g
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import func
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error

from app.models.study_plan import DailyTask
from app.models.subject import Subject
from app.extensions import db

progress_bp = Blueprint("progress", __name__)


@progress_bp.route("/stats", methods=["GET"])
@firebase_required
def overall_stats():
    user_id = g.current_user.id

    # Total tasks done
    total_tasks = DailyTask.query.filter_by(user_id=user_id).count()
    done_tasks  = DailyTask.query.filter_by(user_id=user_id, is_done=True).count()

    # Total study hours (done tasks)
    done_task_list = DailyTask.query.filter_by(user_id=user_id, is_done=True).all()
    total_hours = sum(t.duration_hours for t in done_task_list)


    # Subject completion
    subjects = Subject.query.filter_by(user_id=user_id).all()
    subject_stats = [{"name": s.name, "color": s.color, "completion": s.completion_percentage} for s in subjects]

    completion_pct = round((done_tasks / total_tasks * 100), 1) if total_tasks else 0

    return success(data={
        "total_tasks":      total_tasks,
        "done_tasks":       done_tasks,
        "completion_pct":   completion_pct,
        "total_hours":      round(total_hours, 1),

        "subject_stats":    subject_stats,
    })


@progress_bp.route("/weekly", methods=["GET"])
@firebase_required
def weekly_stats():
    user_id = g.current_user.id
    today   = date.today()
    result  = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        tasks = DailyTask.query.filter_by(user_id=user_id, date=day, is_done=True).all()
        hours = sum(t.duration_hours for t in tasks)
        result.append({"date": day.isoformat(), "day": day.strftime("%a"), "hours": round(hours, 1)})

    return success(data=result)


@progress_bp.route("/heatmap", methods=["GET"])
@firebase_required
def heatmap():
    """Return 90-day study activity for GitHub-style heatmap."""
    user_id = g.current_user.id
    today   = date.today()
    start   = today - timedelta(days=89)

    tasks = DailyTask.query.filter(
        DailyTask.user_id == user_id,
        DailyTask.is_done == True,
        DailyTask.date >= start,
    ).all()

    heat = {}
    for t in tasks:
        key = t.date.isoformat()
        heat[key] = round(heat.get(key, 0) + t.duration_hours, 1)

    return success(data=heat)


