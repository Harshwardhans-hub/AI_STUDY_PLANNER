import io
from flask import Blueprint, request, g
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error
from app.models.subject import Subject
from app.services import gemini_service
import PyPDF2

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/suggestions", methods=["GET"])
@firebase_required
def suggestions():
    from app.models.study_plan import DailyTask
    from datetime import date, timedelta

    subjects = Subject.query.filter_by(user_id=g.current_user.id).all()
    if not subjects:
        return error("Add subjects first to get AI suggestions", 400)

    subjects_data = [{
        "name":            s.name,
        "difficulty":      s.difficulty,
        "days_until_exam": s.days_until_exam,
        "completion":      s.completion_percentage,
    } for s in subjects]

    # Quick stats
    today  = date.today()
    week_ago = today - timedelta(days=7)
    recent_tasks = DailyTask.query.filter(
        DailyTask.user_id == g.current_user.id,
        DailyTask.date   >= week_ago,
        DailyTask.is_done == True,
    ).all()
    hours_this_week = sum(t.duration_hours for t in recent_tasks)

    stats = {"hours_studied_this_week": round(hours_this_week, 1)}

    try:
        result = gemini_service.get_ai_suggestions(subjects_data, stats)
        return success(data=result)
    except Exception as e:
        return error(f"Gemini error: {str(e)}", 500)


@ai_bp.route("/motivate", methods=["GET"])
@firebase_required
def motivate():
    try:
        result = gemini_service.get_motivational_quote()
        return success(data=result)
    except Exception as e:
        return error(f"Gemini error: {str(e)}", 500)


@ai_bp.route("/summarize", methods=["POST"])
@firebase_required
def summarize_pdf():
    if "file" not in request.files:
        return error("No file uploaded. Send a PDF as multipart/form-data with key 'file'", 400)

    file = request.files["file"]
    if not file.filename.lower().endswith(".pdf"):
        return error("Only PDF files are supported", 400)

    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
        text   = "\n".join(page.extract_text() or "" for page in reader.pages)
        if not text.strip():
            return error("Could not extract text from this PDF. Try a text-based PDF (not scanned image).", 400)
    except Exception as e:
        return error(f"Failed to read PDF: {str(e)}", 400)

    try:
        result = gemini_service.summarize_pdf_text(text)
        return success(data=result)
    except Exception as e:
        return error(f"Gemini summarization failed: {str(e)}", 500)


@ai_bp.route("/quiz", methods=["POST"])
@firebase_required
def generate_quiz():
    data    = request.get_json() or {}
    topic   = data.get("topic", "").strip()
    subject = data.get("subject", "").strip()
    num_q   = int(data.get("num_questions", 5))

    if not topic or not subject:
        return error("'topic' and 'subject' are required", 400)
    if num_q < 1 or num_q > 15:
        return error("num_questions must be between 1 and 15", 400)

    try:
        result = gemini_service.generate_quiz(topic, subject, num_q)
        return success(data=result)
    except Exception as e:
        return error(f"Quiz generation failed: {str(e)}", 500)


@ai_bp.route("/priority", methods=["GET"])
@firebase_required
def priority_ranking():
    """Return AI-ranked subject priority based on exam proximity, difficulty, and completion."""
    subjects = Subject.query.filter_by(user_id=g.current_user.id).all()
    if not subjects:
        # Return empty list instead of 404 so dashboard doesn't error
        return success(data=[])

    subjects_data = [{
        "name":            s.name,
        "difficulty":      s.difficulty,
        "days_until_exam": s.days_until_exam,
        "completion_pct":  s.completion_percentage,
        "pending_topics":  sum(1 for t in s.topics if not t.is_completed),
    } for s in subjects]

    try:
        result = gemini_service.get_priority_ranking(subjects_data)
        return success(data=result)
    except Exception as e:
        # Fallback: return subjects in basic order without AI
        fallback = sorted(subjects_data, key=lambda s: (
            s["days_until_exam"] if s["days_until_exam"] is not None else 9999,
            -s["completion_pct"]
        ))
        for i, item in enumerate(fallback):
            item["priority_score"] = max(10, 100 - i * 15)
            item["reason"] = "Sorted by exam date and completion"
        return success(data=fallback)

