from flask import Blueprint, request, g
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error
from app.models.subject import Subject
from app.models.topic import Topic
from app.extensions import db
from datetime import datetime
import io
import PyPDF2
from app.services import gemini_service

subjects_bp = Blueprint("subjects", __name__)


# ── Subjects ──────────────────────────────────────────────────────────────────

@subjects_bp.route("/", methods=["GET"])
@firebase_required
def list_subjects():
    subjects = Subject.query.filter_by(user_id=g.current_user.id).order_by(Subject.exam_date.asc()).all()
    return success(data=[s.to_dict() for s in subjects])


@subjects_bp.route("/", methods=["POST"])
@firebase_required
def create_subject():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return error("Subject name is required")

    exam_date = None
    if data.get("exam_date"):
        try:
            exam_date = datetime.strptime(data["exam_date"], "%Y-%m-%d").date()
        except ValueError:
            return error("Invalid exam_date format. Use YYYY-MM-DD")

    subject = Subject(
        user_id     = g.current_user.id,
        name        = name,
        difficulty  = data.get("difficulty", "Medium"),
        exam_date   = exam_date,
        color       = data.get("color", "#10b981"),
        description = data.get("description", ""),
    )
    db.session.add(subject)
    db.session.commit()
    return success(data=subject.to_dict(), message="Subject created", status=201)


@subjects_bp.route("/<int:subject_id>", methods=["GET"])
@firebase_required
def get_subject(subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if not subject:
        return error("Subject not found", 404)
    d = subject.to_dict()
    d["topics"] = [t.to_dict() for t in subject.topics]
    return success(data=d)


@subjects_bp.route("/<int:subject_id>", methods=["PUT"])
@firebase_required
def update_subject(subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if not subject:
        return error("Subject not found", 404)

    data = request.get_json() or {}
    if "name"        in data: subject.name        = data["name"].strip()
    if "difficulty"  in data: subject.difficulty  = data["difficulty"]
    if "color"       in data: subject.color        = data["color"]
    if "description" in data: subject.description  = data["description"]
    if "exam_date"   in data:
        try:
            subject.exam_date = datetime.strptime(data["exam_date"], "%Y-%m-%d").date() if data["exam_date"] else None
        except ValueError:
            return error("Invalid exam_date format. Use YYYY-MM-DD")

    db.session.commit()
    return success(data=subject.to_dict(), message="Subject updated")


@subjects_bp.route("/<int:subject_id>", methods=["DELETE"])
@firebase_required
def delete_subject(subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if not subject:
        return error("Subject not found", 404)
    db.session.delete(subject)
    db.session.commit()
    return success(message="Subject deleted")


# ── Topics ────────────────────────────────────────────────────────────────────

@subjects_bp.route("/<int:subject_id>/topics", methods=["GET"])
@firebase_required
def list_topics(subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if not subject:
        return error("Subject not found", 404)
    return success(data=[t.to_dict() for t in subject.topics])


@subjects_bp.route("/<int:subject_id>/topics", methods=["POST"])
@firebase_required
def add_topic(subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if not subject:
        return error("Subject not found", 404)

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return error("Topic name is required")

    topic = Topic(
        subject_id      = subject_id,
        name            = name,
        estimated_hours = float(data.get("estimated_hours", 1.0)),
        notes           = data.get("notes", ""),
    )
    db.session.add(topic)
    db.session.commit()
    return success(data=topic.to_dict(), message="Topic added", status=201)


@subjects_bp.route("/topics/<int:topic_id>", methods=["PUT"])
@firebase_required
def update_topic(topic_id):
    topic = Topic.query.join(Subject).filter(
        Topic.id == topic_id,
        Subject.user_id == g.current_user.id
    ).first()
    if not topic:
        return error("Topic not found", 404)

    data = request.get_json() or {}
    if "name"            in data: topic.name            = data["name"].strip()
    if "estimated_hours" in data: topic.estimated_hours = float(data["estimated_hours"])
    if "notes"           in data: topic.notes           = data["notes"]

    db.session.commit()
    return success(data=topic.to_dict(), message="Topic updated")


@subjects_bp.route("/topics/<int:topic_id>/complete", methods=["PATCH"])
@firebase_required
def complete_topic(topic_id):
    topic = Topic.query.join(Subject).filter(
        Topic.id == topic_id,
        Subject.user_id == g.current_user.id
    ).first()
    if not topic:
        return error("Topic not found", 404)

    data = request.get_json() or {}
    completed = data.get("is_completed", True)

    if completed:
        topic.complete()
    else:
        topic.is_completed = False
        topic.completed_at = None

    db.session.commit()
    return success(data=topic.to_dict(), message="Topic updated")


@subjects_bp.route("/topics/<int:topic_id>", methods=["DELETE"])
@firebase_required
def delete_topic(topic_id):
    topic = Topic.query.join(Subject).filter(
        Topic.id == topic_id,
        Subject.user_id == g.current_user.id
    ).first()
    if not topic:
        return error("Topic not found", 404)
    db.session.delete(topic)
    db.session.commit()
    return success(message="Topic deleted")


# ── Syllabus PDF Analysis ──────────────────────────────────────────────────────

@subjects_bp.route("/<int:subject_id>/analyze-syllabus", methods=["POST"])
@firebase_required
def analyze_syllabus(subject_id):
    """
    Upload a syllabus PDF → Gemini extracts chapters + topics.
    Returns structured preview WITHOUT saving to DB yet.
    The frontend shows the preview and calls /import-topics to confirm.
    """
    subject = Subject.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if not subject:
        return error("Subject not found", 404)

    if "file" not in request.files:
        return error("No file uploaded. Send a PDF as multipart/form-data with key 'file'", 400)

    file = request.files["file"]
    if not file.filename.lower().endswith(".pdf"):
        return error("Only PDF files are supported", 400)

    # Extract text from PDF
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        if not text.strip():
            return error(
                "Could not extract text from this PDF. "
                "Please use a text-based PDF (not a scanned image).", 400
            )
    except Exception as e:
        return error(f"Failed to read PDF: {str(e)}", 400)

    # Analyze with Gemini
    try:
        result = gemini_service.analyze_syllabus_pdf(text, subject.name)
        return success(data=result, message="Syllabus analyzed successfully")
    except Exception as e:
        return error(f"AI analysis failed: {str(e)}", 500)


@subjects_bp.route("/<int:subject_id>/import-topics", methods=["POST"])
@firebase_required
def import_topics(subject_id):
    """
    Bulk-import topics extracted from syllabus PDF analysis.
    Accepts the chapters array and creates Topic rows in the DB.
    Supports 'mode': 'replace' (clear existing) or 'append' (default).
    """
    subject = Subject.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if not subject:
        return error("Subject not found", 404)

    data = request.get_json() or {}
    chapters = data.get("chapters", [])
    mode = data.get("mode", "append")  # "append" | "replace"

    if not chapters:
        return error("No chapters provided", 400)

    # Optionally clear existing topics
    if mode == "replace":
        Topic.query.filter_by(subject_id=subject_id).delete()
        db.session.flush()

    created = []
    for chapter in chapters:
        chapter_name = chapter.get("chapter_name", "")
        for topic_data in chapter.get("topics", []):
            topic_name = topic_data.get("name", "").strip()
            if not topic_name:
                continue

            # Prefix with chapter name for clarity
            full_name = f"[{chapter_name}] {topic_name}" if chapter_name else topic_name

            topic = Topic(
                subject_id      = subject_id,
                name            = full_name,
                estimated_hours = float(topic_data.get("estimated_hours", 1.0)),
                notes           = topic_data.get("notes", ""),
            )
            db.session.add(topic)
            created.append(topic)

    db.session.commit()

    return success(
        data={"imported_count": len(created), "topics": [t.to_dict() for t in created]},
        message=f"Successfully imported {len(created)} topics from syllabus",
        status=201,
    )

