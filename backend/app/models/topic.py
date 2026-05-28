from app.extensions import db
from datetime import datetime, timezone


class Topic(db.Model):
    __tablename__ = "topics"

    id               = db.Column(db.Integer, primary_key=True)
    subject_id       = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    name             = db.Column(db.String(200), nullable=False)
    is_completed     = db.Column(db.Boolean, default=False)
    estimated_hours  = db.Column(db.Float, default=1.0)
    notes            = db.Column(db.Text, nullable=True)
    completed_at     = db.Column(db.DateTime, nullable=True)
    created_at       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def complete(self):
        self.is_completed = True
        self.completed_at = datetime.now(timezone.utc)

    def to_dict(self):
        return {
            "id":              self.id,
            "subject_id":      self.subject_id,
            "name":            self.name,
            "is_completed":    self.is_completed,
            "estimated_hours": self.estimated_hours,
            "notes":           self.notes,
            "completed_at":    self.completed_at.isoformat() if self.completed_at else None,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
        }
