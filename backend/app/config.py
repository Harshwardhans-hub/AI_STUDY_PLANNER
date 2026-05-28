import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-prod")
    DEBUG = os.getenv("FLASK_DEBUG", "True") == "True"

    # SQLite — file stored inside backend/ folder, zero setup needed
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(BASE_DIR, '..', 'study_planner.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Firebase
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
    FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyBV82BpABaT5ceaMKDH2wgZaw5iJ4m4WIw")

    # Gemini
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # CORS — allow both localhost and 127.0.0.1 variants
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    ).split(",")

    # Rate limiting
    RATELIMIT_DEFAULT = "200 per day;50 per hour"
    RATELIMIT_STORAGE_URL = "memory://"
