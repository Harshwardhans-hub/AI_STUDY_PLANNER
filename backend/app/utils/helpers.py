from flask import jsonify


def success(data=None, message="Success", status=200):
    resp = {"success": True, "message": message}
    if data is not None:
        resp["data"] = data
    return jsonify(resp), status


def error(message="An error occurred", status=400, details=None):
    resp = {"success": False, "error": message}
    if details:
        resp["details"] = details
    return jsonify(resp), status
