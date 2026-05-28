from app.extensions import db
from datetime import datetime, timezone


class User(db.Model):
    __tablename__ = "users"

    id          = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False, index=True)
    name        = db.Column(db.String(100), nullable=False)
    email       = db.Column(db.String(150), unique=True, nullable=False)
    avatar_url  = db.Column(db.Text, nullable=True)
    provider    = db.Column(db.String(30), default="email")   # "email" | "google"
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                            onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    subjects     = db.relationship("Subject",    backref="user", lazy=True, cascade="all,delete-orphan")
    study_plans  = db.relationship("StudyPlan",  backref="user", lazy=True, cascade="all,delete-orphan")
    daily_tasks  = db.relationship("DailyTask",  backref="user", lazy=True, cascade="all,delete-orphan")


    def to_dict(self):
        return {
            "id":          self.id,
            "firebase_uid": self.firebase_uid,
            "name":        self.name,
            "email":       self.email,
            "avatar_url":  self.avatar_url,
            "provider":    self.provider,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }
