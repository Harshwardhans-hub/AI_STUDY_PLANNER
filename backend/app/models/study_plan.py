from app.extensions import db
from datetime import datetime, timezone


class StudyPlan(db.Model):
    __tablename__ = "study_plans"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_json    = db.Column(db.JSON, nullable=False)          # Full AI-generated schedule
    hours_per_day = db.Column(db.Float, default=4.0)
    is_active    = db.Column(db.Boolean, default=True)
    generated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    daily_tasks  = db.relationship("DailyTask", backref="plan", lazy=True, cascade="all,delete-orphan")

    def to_dict(self, include_tasks=False):
        d = {
            "id":            self.id,
            "user_id":       self.user_id,
            "plan_json":     self.plan_json,
            "hours_per_day": self.hours_per_day,
            "is_active":     self.is_active,
            "generated_at":  self.generated_at.isoformat() if self.generated_at else None,
        }
        if include_tasks:
            d["tasks"] = [t.to_dict() for t in self.daily_tasks]
        return d


class DailyTask(db.Model):
    __tablename__ = "daily_tasks"

    id             = db.Column(db.Integer, primary_key=True)
    plan_id        = db.Column(db.Integer, db.ForeignKey("study_plans.id", ondelete="CASCADE"), nullable=False)
    user_id        = db.Column(db.Integer, db.ForeignKey("users.id",       ondelete="CASCADE"), nullable=False)
    subject_id     = db.Column(db.Integer, db.ForeignKey("subjects.id",    ondelete="SET NULL"), nullable=True)
    date           = db.Column(db.Date, nullable=False)
    duration_hours = db.Column(db.Float, nullable=False)
    task_type      = db.Column(db.String(10), default="study")   # study | revision | break
    focus          = db.Column(db.String(300), nullable=True)    # AI description of what to study
    is_done        = db.Column(db.Boolean, default=False)
    completed_at   = db.Column(db.DateTime, nullable=True)
    created_at     = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    subject = db.relationship("Subject", lazy=True)

    def to_dict(self):
        return {
            "id":             self.id,
            "plan_id":        self.plan_id,
            "user_id":        self.user_id,
            "subject_id":     self.subject_id,
            "subject_name":   self.subject.name if self.subject else None,
            "subject_color":  self.subject.color if self.subject else "#10b981",
            "date":           self.date.isoformat() if self.date else None,
            "duration_hours": self.duration_hours,
            "task_type":      self.task_type,
            "focus":          self.focus,
            "is_done":        self.is_done,
            "completed_at":   self.completed_at.isoformat() if self.completed_at else None,
        }
