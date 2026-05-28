from flask import Flask
from .config import Config
from .extensions import db, migrate, cors, limiter
import firebase_admin
from firebase_admin import credentials
import os


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ── Extensions ──────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}},
                  supports_credentials=True)
    limiter.init_app(app)

    # ── Firebase Admin ───────────────────────────────────────────────────────
    if not firebase_admin._apps:
        cred_path = app.config["FIREBASE_CREDENTIALS_PATH"]
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            app.logger.info("Using Project ID for Firebase Admin initialization.")
            firebase_admin.initialize_app(options={'projectId': 'mlh-project-aistudyplanner'})

    # ── Import models so Alembic can detect them ─────────────────────────────
    from .models import user, subject, topic, study_plan  # noqa: F401

    # ── Blueprints ───────────────────────────────────────────────────────────
    from .routes.auth      import auth_bp
    from .routes.subjects  import subjects_bp
    from .routes.planner   import planner_bp
    from .routes.progress  import progress_bp
    from .routes.ai        import ai_bp
    from .routes.calendar  import calendar_bp
    from .routes.reminders import reminders_bp
    from .routes.chat      import chat_bp

    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(subjects_bp,  url_prefix="/api/subjects")
    app.register_blueprint(planner_bp,   url_prefix="/api/planner")
    app.register_blueprint(progress_bp,  url_prefix="/api/progress")
    app.register_blueprint(ai_bp,        url_prefix="/api/ai")
    app.register_blueprint(calendar_bp,  url_prefix="/api/calendar")
    app.register_blueprint(reminders_bp, url_prefix="/api/reminders")
    app.register_blueprint(chat_bp,      url_prefix="/api/chat")

    # ── Health check ─────────────────────────────────────────────────────────
    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "AI Study Planner API is running"}

    return app
