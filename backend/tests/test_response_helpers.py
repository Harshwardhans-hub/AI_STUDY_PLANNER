"""Tests for the shared Flask JSON response helpers."""

import unittest

from flask import Flask

from app.utils.helpers import error, success


class ResponseHelperTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.context = self.app.app_context()
        self.context.push()

    def tearDown(self):
        self.context.pop()

    def test_success_includes_data_and_message(self):
        response, status = success({"subject_id": 7}, message="Created", status=201)

        self.assertEqual(status, 201)
        self.assertEqual(response.get_json(), {
            "success": True,
            "message": "Created",
            "data": {"subject_id": 7},
        })

    def test_success_without_data_omits_data_key(self):
        response, status = success()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json(), {"success": True, "message": "Success"})

    def test_error_includes_details_when_provided(self):
        response, status = error("Invalid input", status=422, details={"field": "title"})

        self.assertEqual(status, 422)
        self.assertEqual(response.get_json(), {
            "success": False,
            "error": "Invalid input",
            "details": {"field": "title"},
        })

    def test_error_omits_empty_details(self):
        response, status = error("Not found", status=404, details={})

        self.assertEqual(status, 404)
        self.assertEqual(response.get_json(), {"success": False, "error": "Not found"})


if __name__ == "__main__":
    unittest.main()
