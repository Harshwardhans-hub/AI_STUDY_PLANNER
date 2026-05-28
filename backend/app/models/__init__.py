# models package — import all models so Flask-Migrate can detect them
from .user       import User          # noqa: F401
from .subject    import Subject       # noqa: F401
from .topic      import Topic         # noqa: F401
from .study_plan import StudyPlan, DailyTask  # noqa: F401

