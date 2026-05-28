from flask import Blueprint, request, g
from app.utils.decorators import firebase_required
from app.utils.helpers import success, error
from app.models.user import User
from app.extensions import db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/verify", methods=["POST"])
@firebase_required
def verify():
    """
    Called by the frontend immediately after Firebase sign-in.
    The decorator already creates/syncs the user in MySQL.
    Returns the current user profile.
    """
    return success(data=g.current_user.to_dict(), message="User verified successfully")


@auth_bp.route("/me", methods=["GET"])
@firebase_required
def me():
    """Return the currently authenticated user's profile."""
    return success(data=g.current_user.to_dict())


@auth_bp.route("/me", methods=["PATCH"])
@firebase_required
def update_profile():
    """Update display name or avatar."""
    data = request.get_json() or {}
    user = g.current_user

    if "name" in data:
        user.name = data["name"].strip()
    if "avatar_url" in data:
        user.avatar_url = data["avatar_url"]

    db.session.commit()
    return success(data=user.to_dict(), message="Profile updated")
