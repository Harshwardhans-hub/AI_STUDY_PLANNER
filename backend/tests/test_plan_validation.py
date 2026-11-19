"""Tests for study plan generation parameter validation."""

import unittest

from app.services.plan_validation import normalize_plan_parameters


class PlanValidationTests(unittest.TestCase):
    def test_normalizes_valid_numeric_and_string_inputs(self):
        self.assertEqual(normalize_plan_parameters(4, 14), (4.0, 14))
        self.assertEqual(normalize_plan_parameters("2.5", "7"), (2.5, 7))

    def test_rejects_zero_negative_and_non_finite_hours(self):
        for value in (0, -1, float("inf"), float("nan")):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    normalize_plan_parameters(value, 7)

    def test_rejects_hours_above_one_day(self):
        with self.assertRaises(ValueError):
            normalize_plan_parameters(25, 7)

    def test_rejects_invalid_plan_lengths(self):
        for value in (0, -2, 366, "2.5"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    normalize_plan_parameters(4, value)

    def test_rejects_boolean_values(self):
        with self.assertRaises(TypeError):
            normalize_plan_parameters(True, 7)
        with self.assertRaises(TypeError):
            normalize_plan_parameters(4, False)


if __name__ == "__main__":
    unittest.main()
