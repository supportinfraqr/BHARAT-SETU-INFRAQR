from django.test import TestCase

from payroll_engine.services.jsmath import js_round, num, parse_float, round2, to_fixed


class JsMathTests(TestCase):
    def test_math_round_half_up(self):
        self.assertEqual(js_round(2.5), 3)
        self.assertEqual(js_round(-2.5), -2)
        self.assertEqual(round2(1.005), 1.0)  # JS: Math.round(100.49999999999999) = 100
        self.assertEqual(to_fixed(1.005, 2), 1.0)  # JS: (1.005).toFixed(2) === "1.00"
        self.assertEqual(to_fixed(2.345, 2), 2.35)

    def test_number_coercion(self):
        self.assertEqual(num(None), 0)
        self.assertEqual(num("abc", 5), 5)
        self.assertEqual(parse_float("12.5px"), 12.5)
