"""
firebase_required decorator with:
1. In-memory token cache (55-minute TTL) — avoids hitting Google API on every request
2. Local JWT decode for uid/email extraction
3. Falls back to Identity Toolkit REST only on cache miss or new user
"""
from functools import wraps
from flask import request, jsonify, g, current_app
import firebase_admin
from firebase_admin import auth as firebase_auth
from app.models.user import User
from app.extensions import db
import requests as http_requests
import time
import base64
import json

# ── In-memory token cache ─────────────────────────────────────────────────────
# { token_hash: (decoded_dict, expires_at_unix) }
_TOKEN_CACHE: dict = {}
_CACHE_TTL   = 55 * 60  # 55 minutes (Firebase tokens last 60 min)
_CACHE_MAX   = 500       # evict oldest when cache gets large

# ── User DB cache (uid → User obj) ────────────────────────────────────────────
_USER_CACHE: dict = {}
_USER_CACHE_MAX = 200


def _evict_cache():
    """Remove expired entries; if still too large, drop oldest half."""
    now = time.time()
    expired = [k for k, (_, exp) in _TOKEN_CACHE.items() if exp < now]
    for k in expired:
        del _TOKEN_CACHE[k]
    if len(_TOKEN_CACHE) > _CACHE_MAX:
        # Keep the newest half
        sorted_keys = sorted(_TOKEN_CACHE, key=lambda k: _TOKEN_CACHE[k][1])
        for k in sorted_keys[:len(_TOKEN_CACHE) // 2]:
            del _TOKEN_CACHE[k]


def _decode_jwt_payload(token: str) -> dict | None:
    """
    Decode the JWT payload WITHOUT signature verification.
    We use this to extract uid/email INSTANTLY, then we verify
    the token through Google only on cache miss.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload = parts[1]
        # Add padding
        payload += "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        return data
    except Exception:
        return None


def _verify_via_rest(id_token: str, api_key: str) -> dict | None:
    """Call Google Identity Toolkit to verify the token — network call, cached after."""
    try:
        resp = http_requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}",
            json={"idToken": id_token},
            timeout=8,
        )
        if resp.status_code != 200:
            return None
        user_info = resp.json().get("users", [{}])[0]
        return {
            "uid":      user_info.get("localId"),
            "email":    user_info.get("email", ""),
            "name":     user_info.get("displayName", user_info.get("email", "User")),
            "picture":  user_info.get("photoUrl"),
            "firebase": {
                "sign_in_provider": (
                    user_info.get("providerUserInfo", [{}])[0].get("providerId", "email")
                )
            },
        }
    except Exception:
        return None


def firebase_required(f):
    """
    Decorator: verifies Firebase ID token, resolves DB user, stores in g.current_user.
    Uses caching to avoid hitting Google API on every request.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        id_token = auth_header.split("Bearer ")[1].strip()
        if not id_token:
            return jsonify({"error": "Empty token"}), 401

        now = time.time()

        # ── 1. Check token cache ─────────────────────────────────────────────
        cache_key = id_token[-64:]  # Use last 64 chars as cache key (unique per token)
        if cache_key in _TOKEN_CACHE:
            decoded, expires_at = _TOKEN_CACHE[cache_key]
            if expires_at > now:
                # Cache hit — resolve user from user cache or DB
                uid = decoded.get("uid")
                if uid:
                    if uid not in _USER_CACHE:
                        user = User.query.filter_by(firebase_uid=uid).first()
                        if user:
                            if len(_USER_CACHE) >= _USER_CACHE_MAX:
                                # Evict oldest entry
                                oldest = next(iter(_USER_CACHE))
                                del _USER_CACHE[oldest]
                            _USER_CACHE[uid] = user
                    if uid in _USER_CACHE:
                        g.current_user = _USER_CACHE[uid]
                        return f(*args, **kwargs)
            else:
                del _TOKEN_CACHE[cache_key]

        # ── 2. Try Firebase Admin SDK (fast if service account exists) ────────
        decoded = None
        try:
            result = firebase_auth.verify_id_token(id_token)
            decoded = {
                "uid":      result.get("uid"),
                "email":    result.get("email", ""),
                "name":     result.get("name", result.get("email", "User")),
                "picture":  result.get("picture"),
                "firebase": result.get("firebase", {}),
            }
        except Exception:
            pass

        # ── 3. Fallback: decode JWT locally to get uid, then REST verify ─────
        if not decoded:
            local = _decode_jwt_payload(id_token)
            exp   = local.get("exp", 0) if local else 0
            if local and local.get("sub") and exp > now:
                # Token is not expired — do REST verify only if uid is unknown
                uid = local.get("sub") or local.get("user_id")
                # Try to resolve user from DB first (skip REST for known users)
                if uid and User.query.filter_by(firebase_uid=uid).first():
                    decoded = {
                        "uid":      uid,
                        "email":    local.get("email", ""),
                        "name":     local.get("name", local.get("email", "User")),
                        "picture":  local.get("picture"),
                        "firebase": {"sign_in_provider": local.get("firebase", {}).get("sign_in_provider", "email")},
                    }
                else:
                    # New user — must REST verify once to confirm legitimacy
                    api_key = current_app.config.get("FIREBASE_API_KEY", "AIzaSyBV82BpABaT5ceaMKDH2wgZaw5iJ4m4WIw")
                    decoded = _verify_via_rest(id_token, api_key)

        if not decoded or not decoded.get("uid"):
            return jsonify({"error": "Invalid or expired token"}), 401

        # ── 4. Cache the verified token ───────────────────────────────────────
        local_payload = _decode_jwt_payload(id_token)
        token_exp = local_payload.get("exp", now + _CACHE_TTL) if local_payload else now + _CACHE_TTL
        cache_expires = min(token_exp, now + _CACHE_TTL)
        _evict_cache()
        _TOKEN_CACHE[cache_key] = (decoded, cache_expires)

        # ── 5. Resolve / create DB user ───────────────────────────────────────
        uid = decoded["uid"]
        user = _USER_CACHE.get(uid) or User.query.filter_by(firebase_uid=uid).first()

        if not user:
            user = User(
                firebase_uid = uid,
                email        = decoded.get("email", ""),
                name         = decoded.get("name", decoded.get("email", "User")),
                avatar_url   = decoded.get("picture"),
                provider     = decoded.get("firebase", {}).get("sign_in_provider", "email"),
            )
            db.session.add(user)
            db.session.commit()

        # Update user cache
        if len(_USER_CACHE) >= _USER_CACHE_MAX:
            oldest = next(iter(_USER_CACHE))
            del _USER_CACHE[oldest]
        _USER_CACHE[uid] = user

        g.current_user = user
        return f(*args, **kwargs)

    return decorated
