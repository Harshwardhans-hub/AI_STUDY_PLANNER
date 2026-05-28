from flask import Blueprint, request, g
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error
from app.services.gemini_service import chat_with_ai, generate_flashcards
from app.models.subject import Subject

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/message", methods=["POST"])
@firebase_required
def chat():
    """Chat with Gemini AI about study topics."""
    data    = request.get_json() or {}
    message = data.get("message", "").strip()
    history = data.get("history", [])  # [{role, content}]

    if not message:
        return error("Message is required", 400)

    # Get subject context
    subjects = Subject.query.filter_by(user_id=g.current_user.id).all()
    subjects_context = [{"name": s.name, "difficulty": s.difficulty} for s in subjects]

    try:
        reply = chat_with_ai(message, history, subjects_context, g.current_user.name)
        return success(data={"reply": reply})
    except Exception as e:
        return error(f"AI error: {str(e)}", 500)


@chat_bp.route("/flashcards", methods=["POST"])
@firebase_required
def flashcards():
    """Generate flashcards for a topic."""
    data    = request.get_json() or {}
    topic   = data.get("topic", "").strip()
    subject = data.get("subject", "").strip()
    num     = int(data.get("num_cards", 10))

    if not topic or not subject:
        return error("'topic' and 'subject' are required", 400)

    try:
        result = generate_flashcards(topic, subject, num)
        return success(data=result)
    except Exception as e:
        return error(f"Flashcard generation failed: {str(e)}", 500)
