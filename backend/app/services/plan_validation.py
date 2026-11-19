"""Validation for user-supplied study plan generation parameters."""

import math


def normalize_plan_parameters(hours_per_day: object, days: object) -> tuple[float, int]:
    """Return validated (hours_per_day, days) values.

    Daily study time must be finite, greater than zero, and no more than
    24 hours. Plan length must be an integer from 1 through 365 days.
    """
    if isinstance(hours_per_day, bool):
        raise TypeError("hours_per_day must be a number")
    try:
        hours = float(hours_per_day)
    except (TypeError, ValueError) as exc:
        raise ValueError("hours_per_day must be a number") from exc
    if not math.isfinite(hours) or not 0 < hours <= 24:
        raise ValueError("hours_per_day must be greater than 0 and at most 24")

    if isinstance(days, bool):
        raise TypeError("days must be an integer")
    try:
        normalized_days = int(days)
    except (TypeError, ValueError) as exc:
        raise ValueError("days must be an integer") from exc
    if isinstance(days, float) and not days.is_integer():
        raise ValueError("days must be an integer")
    if isinstance(days, str) and str(normalized_days) != days.strip():
        raise ValueError("days must be an integer")
    if not 1 <= normalized_days <= 365:
        raise ValueError("days must be between 1 and 365")
    return hours, normalized_days
