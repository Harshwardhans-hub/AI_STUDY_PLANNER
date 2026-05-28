from app.extensions import db
from datetime import datetime, timezone


class Subject(db.Model):
    __tablename__ = "subjects"

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name        = db.Column(db.String(100), nullable=False)
    difficulty  = db.Column(db.String(10), default="Medium")  # Easy | Medium | Hard
    exam_date   = db.Column(db.Date, nullable=True)
    color       = db.Column(db.String(20), default="#10b981")   # hex color for UI
    description = db.Column(db.Text, nullable=True)
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    topics = db.relationship("Topic", backref="subject", lazy=True, cascade="all,delete-orphan")

    @property
    def completion_percentage(self):
        if not self.topics:
            return 0
        done = sum(1 for t in self.topics if t.is_completed)
        return round((done / len(self.topics)) * 100, 1)

    @property
    def days_until_exam(self):
        if not self.exam_date:
            return None
        delta = self.exam_date - datetime.now(timezone.utc).date()
        return delta.days

    def to_dict(self):
        return {
            "id":                    self.id,
            "user_id":               self.user_id,
            "name":                  self.name,
            "difficulty":            self.difficulty,
            "exam_date":             self.exam_date.isoformat() if self.exam_date else None,
            "color":                 self.color,
            "description":           self.description,
            "completion_percentage": self.completion_percentage,
            "days_until_exam":       self.days_until_exam,
            "topic_count":           len(self.topics),
            "created_at":            self.created_at.isoformat() if self.created_at else None,
        }
