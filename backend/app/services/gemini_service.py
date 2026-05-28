import json
import re
import google.generativeai as genai
from flask import current_app
import random

def _get_model(model_name="gemini-2.5-flash-lite"):
    api_key = current_app.config.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)

# Fallback quotes when Gemini is unavailable
_FALLBACK_QUOTES = [
    {"quote": "The secret of getting ahead is getting started.", "author": "Mark Twain"},
    {"quote": "Genius is 1% inspiration and 99% perspiration.", "author": "Thomas Edison"},
    {"quote": "The expert in anything was once a beginner.", "author": "Helen Hayes"},
    {"quote": "Push yourself, because no one else is going to do it for you.", "author": "AI Study Planner"},
    {"quote": "Success is the sum of small efforts repeated day in and day out.", "author": "Robert Collier"},
]

def generate_study_plan(subjects_data: list, hours_per_day: float, start_date: str, days: int) -> dict:
    """
    Ask Gemini to generate a study timetable.
    subjects_data: list of { name, difficulty, exam_date, days_until_exam, pending_topics, completion_percentage }
    Returns parsed JSON dict.
    """
    model = _get_model()

    subjects_text = json.dumps(subjects_data, indent=2)

    prompt = f"""
You are an expert AI study planner. Generate a detailed, personalized study timetable.

## Student Information
- Study hours available per day: {hours_per_day}
- Start date: {start_date}
- Plan duration: {days} days

## Subjects
{subjects_text}

## Rules
1. Prioritize subjects with the closest exam dates (urgent first).
2. Hard subjects get 20% more time than Easy ones.
3. Subjects with low completion percentage need more coverage.
4. Include at least 1 revision session every 3 study sessions per subject.
5. Never exceed {hours_per_day} hours in a single day.
6. Include short breaks (0.5h) if a day exceeds 3 hours of study.
7. Spread topics evenly — do not dump everything in one day.
8. If a subject has an exam within 3 days, prioritize it heavily.

## Output Format
Return ONLY valid JSON, no markdown, no explanation.

{{
  "summary": "Brief summary of the plan strategy",
  "days": [
    {{
      "date": "YYYY-MM-DD",
      "total_hours": 0.0,
      "tasks": [
        {{
          "subject": "Subject Name",
          "duration_hours": 1.5,
          "type": "study",
          "focus": "Specific topic or concept to focus on"
        }}
      ]
    }}
  ]
}}

Types allowed: "study", "revision", "break"
"""

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )

    raw = response.text.strip()
    # Strip markdown fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    return json.loads(raw)


def get_ai_suggestions(subjects_data: list, stats: dict) -> str:
    """Generate personalized study suggestions based on progress."""
    model = _get_model()

    subjects_text = json.dumps(subjects_data, indent=2)
    stats_text = json.dumps(stats, indent=2)

    prompt = f"""
Analyze the student's progress and provide exactly 3 short, actionable study tips.

## Progress Stats
{stats_text}

## Subjects
{subjects_text}

Provide the tips in plain text format, separated by double newlines. Keep it encouraging but highly specific to their actual data. Do not use markdown.
"""
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(temperature=0.4),
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error getting suggestions: {e}")
        # Return a curated fallback so the dashboard never shows an error
        return random.choice(_FALLBACK_QUOTES)["quote"]


def get_motivational_quote() -> dict:
    """Get a short, dynamic motivational quote."""
    model = _get_model()
    prompt = "Provide a short, highly motivating quote for a student who is studying hard. Return ONLY JSON format: {\"quote\": \"...\", \"author\": \"...\"}"

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"Error getting quote: {e}")
        # Return a curated fallback so the dashboard never shows an error
        return random.choice(_FALLBACK_QUOTES)


def summarize_pdf_text(text: str) -> dict:
    """Summarize extracted PDF text using Gemini."""
    model = _get_model()
    # Limit to ~30k chars to stay within token limits
    text = text[:30000]

    prompt = f"""
You are an expert academic summarizer. Summarize the following study material.

## Text
{text}

Return ONLY JSON in this format:
{{
  "title": "Inferred title of the material",
  "summary": "2-3 paragraph summary",
  "key_points": ["point 1", "point 2", "point 3", ...],
  "important_terms": ["term1", "term2", ...]
}}
"""
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )
    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def chat_with_ai(message: str, history: list, subjects_context: list, user_name: str) -> str:
    """Context-aware AI study assistant chat."""
    model = _get_model()

    subjects_str = ", ".join(s["name"] for s in subjects_context) if subjects_context else "not specified"

    history_text = ""
    for h in history[-6:]:  # last 6 messages for context
        role = "Student" if h.get("role") == "user" else "AI Tutor"
        history_text += f"{role}: {h.get('content', '')}\n"

    prompt = f"""You are an expert AI study tutor helping a student named {user_name}.
The student is studying: {subjects_str}.

Previous conversation:
{history_text}

Student: {message}

Respond as a helpful, encouraging, and knowledgeable tutor. Be concise but thorough.
If asked about a concept, explain clearly with examples. If asked for study tips, be practical.
Reply in plain text (no markdown formatting).
AI Tutor:"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(temperature=0.7, max_output_tokens=1024),
        )
        return response.text.strip()
    except Exception as e:
        print(f"Exception in chat_with_ai: {type(e).__name__} - {str(e)}")
        if "429" in str(e) or "quota" in str(e).lower():
            return "I apologize, but the AI service is currently overwhelmed or has exceeded its daily usage limit. Please try again later tomorrow, or use your own API key if you have one configured."
        # If it's some other error, we can still fall back gracefully
        return "I'm having trouble connecting to my brain right now! Please try again in a moment."


def generate_flashcards(topic: str, subject: str, num_cards: int = 10) -> dict:
    """Generate flashcard Q&A pairs for a topic."""
    model = _get_model()

    prompt = f"""Generate {num_cards} flashcards for studying "{topic}" in "{subject}".
Each flashcard has a question on the front and the answer on the back.

Return ONLY JSON:
{{
  "topic": "{topic}",
  "subject": "{subject}",
  "cards": [
    {{
      "front": "Question or term",
      "back": "Answer or definition",
      "hint": "Optional memory hint (1 sentence)"
    }}
  ]
}}

Make questions progressively harder. Be concise and factually accurate.
"""
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.5,
        ),
    )
    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)

def analyze_syllabus_pdf(text: str, subject_name: str) -> dict:
    """Analyze a syllabus PDF and extract chapters and topics."""
    model = _get_model()
    # Limit to ~30k chars to stay within token limits
    text = text[:30000]

    prompt = f"""
You are an expert academic assistant. Analyze the following syllabus text for the subject "{subject_name}".
Extract the chapters and topics to study.

## Syllabus Text
{text}

Return ONLY JSON in this exact format:
{{
  "chapters": [
    {{
      "chapter_name": "Chapter 1 Name",
      "topics": [
        {{
          "name": "Topic 1",
          "estimated_hours": 1.5,
          "notes": "Brief context about what this entails."
        }}
      ]
    }}
  ]
}}
"""
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"Error analyzing syllabus: {e}")
        raise e
