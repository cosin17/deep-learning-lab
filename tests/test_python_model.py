"""Hand-calculated examples and mathematical properties, with no dependencies."""

import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "python" / "deep_learning_lab.py"
SPEC = importlib.util.spec_from_file_location("deep_learning_lab", MODEL_PATH)
model = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(model)


class FoldingTests(unittest.TestCase):
    def assertPointAlmostEqual(self, actual, expected):
        for a, e in zip(actual, expected):
            self.assertAlmostEqual(a, e, places=12)

    def test_hand_calculated_folds_and_rotation(self):
        self.assertPointAlmostEqual(model.fold_point([-2, -3], 1), [-2, 3])
        self.assertPointAlmostEqual(model.fold_point([-2, -3], 2), [2, 3])
        self.assertPointAlmostEqual(model.fold_point([-2, -3], 3), [3, 2])
        self.assertPointAlmostEqual(model.fold_point([1, 0], 0, rotation=90), [0, 1])

    def test_trace_records_relu_and_does_not_mutate_input(self):
        point = [2, -3]
        trace = model.fold_trace(point, 1)
        self.assertEqual(trace[1]["z"], -3)
        self.assertEqual(trace[1]["activation"], 3)
        self.assertEqual(trace[1]["normal"], [0, 1])
        trace[0]["point"][0] = 99
        self.assertEqual(point, [2, -3])
        self.assertEqual(trace[1]["point"], [2, 3])

    def test_each_fold_preserves_distance_from_origin(self):
        for nonlinear in (True, False):
            for point in ([2, -3], [-0.5, 0.8], [0, 0]):
                for state in model.fold_trace(point, 4, rotation=37, nonlinear=nonlinear):
                    self.assertAlmostEqual(math.hypot(*state["point"]), math.hypot(*point), places=12)

    def test_linear_mode_is_additive_and_relu_mode_is_not(self):
        a, b = [1, 1], [1, -1]
        for depth in range(5):
            fa = model.fold_point(a, depth, 21, False)
            fb = model.fold_point(b, depth, 21, False)
            total = model.fold_point([2, 0], depth, 21, False)
            self.assertPointAlmostEqual(total, [fa[0] + fb[0], fa[1] + fb[1]])
        fa, fb = model.fold_point(a, 1), model.fold_point(b, 1)
        self.assertNotEqual(model.fold_point([2, 0], 1), [fa[0] + fb[0], fa[1] + fb[1]])

    def test_cut_score_signs(self):
        self.assertEqual(model.cut_score([3, 2], 1), 1)
        self.assertEqual(model.cut_score([1, 2], 0), 0)
        self.assertEqual(model.cut_score([0, 2], 0), -1)


class GradientTests(unittest.TestCase):
    def test_hand_calculated_step(self):
        self.assertEqual(model.loss(-3), 8)
        self.assertEqual(model.gradient(-3), -4)
        self.assertEqual(model.gd_step(-3, 0.5), -1)
        self.assertEqual(model.gd_step(-3, 1), 1)

    def test_gradient_matches_finite_difference(self):
        epsilon = 1e-5
        for w in (-4, -0.5, 1, 3):
            derivative = (model.loss(w + epsilon) - model.loss(w - epsilon)) / (2 * epsilon)
            self.assertAlmostEqual(model.gradient(w), derivative, places=8)

    def test_trajectory_matches_closed_form(self):
        for rate in (0.1, 0.9, 1.8, 2.1):
            for state in model.gd_trace(-3, rate, 12):
                expected = 1 + (-3 - 1) * (1 - rate) ** state["step"]
                self.assertAlmostEqual(state["w"], expected, places=10)

    def test_convergence_boundary_for_this_quadratic(self):
        for rate in (0.1, 1, 1.9):
            trace = model.gd_trace(-3, rate, 12)
            self.assertTrue(all(b["loss"] <= a["loss"] for a, b in zip(trace, trace[1:])))
        self.assertEqual(model.loss(model.gd_step(-3, 2)), model.loss(-3))
        self.assertGreater(model.loss(model.gd_step(-3, 2.1)), model.loss(-3))


class CorrelationTests(unittest.TestCase):
    def test_asymmetric_kernel_is_not_reversed(self):
        result = model.correlate([[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[1, 2], [3, 4]])
        self.assertEqual(result["output"], [[37, 47], [67, 77]])
        self.assertEqual([term["product"] for term in result["patches"][0]["terms"]], [1, 4, 12, 20])

    def test_stride_and_zero_padding(self):
        image = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]
        self.assertEqual(model.correlate(image, [[1, 0], [0, 1]], stride=2)["output"], [[7, 11], [23, 27]])
        padded = model.correlate([[1, 2], [3, 4]], [[1] * 3 for _ in range(3)], padding=1)
        self.assertEqual(padded["output"], [[10, 10], [10, 10]])
        first = padded["patches"][0]["terms"][0]
        self.assertEqual((first["row"], first["col"], first["pixel"]), (-1, -1, 0))

    def test_identity_blur_and_output_shape(self):
        image = [[2, -3, 4], [0.5, 0, 1]]
        self.assertEqual(model.correlate(image, [[1]])["output"], image)
        constant = model.correlate([[9] * 3 for _ in range(3)], model.KERNELS["blur"])
        self.assertAlmostEqual(constant["output"][0][0], 9)
        result = model.correlate([[0] * 7 for _ in range(5)], [[1] * 2 for _ in range(3)], stride=2, padding=1)
        self.assertEqual((result["height"], result["width"]), (3, 4))

    def test_linearity_for_fixed_kernel(self):
        a = [[1, -2], [3, 0]]
        b = [[4, 1], [-1, 2]]
        kernel = [[2, -1], [0, 3]]
        summed = [[a[r][c] + b[r][c] for c in range(2)] for r in range(2)]
        combined = model.correlate(summed, kernel, padding=1)["output"]
        out_a = model.correlate(a, kernel, padding=1)["output"]
        out_b = model.correlate(b, kernel, padding=1)["output"]
        self.assertEqual(combined, [[out_a[r][c] + out_b[r][c] for c in range(3)] for r in range(3)])


class ValidationTests(unittest.TestCase):
    def test_invalid_points_and_depth(self):
        for point in ([1], [1, 2, 3], [True, 1], [float("nan"), 0]):
            with self.subTest(point=point), self.assertRaises((TypeError, ValueError)):
                model.fold_point(point, 1)
        for depth in (-1, 5, 1.5, True):
            with self.subTest(depth=depth), self.assertRaises((TypeError, ValueError)):
                model.fold_point([1, 2], depth)
        with self.assertRaises(TypeError):
            model.fold_point([1, 2], 1, nonlinear="false")

    def test_invalid_gradient_parameters(self):
        for rate in (0, -1, float("inf"), True):
            with self.subTest(rate=rate), self.assertRaises((TypeError, ValueError)):
                model.gd_step(2, rate)
        with self.assertRaises(ValueError):
            model.loss(float("nan"))
        with self.assertRaises(ValueError):
            model.gd_trace(2, 0.1, -1)

    def test_invalid_matrices_and_window_parameters(self):
        for image in ([], [[]], [[1], [2, 3]], [[float("inf")]], [[True]]):
            with self.subTest(image=image), self.assertRaises((TypeError, ValueError)):
                model.correlate(image, [[1]])
        for parameters in ({"stride": 0}, {"stride": 1.5}, {"padding": -1}, {"padding": True}):
            with self.subTest(parameters=parameters), self.assertRaises((TypeError, ValueError)):
                model.correlate([[1]], [[1]], **parameters)
        with self.assertRaises(ValueError):
            model.correlate([[1]], [[1, 2]])


class CommandLineTests(unittest.TestCase):
    def run_demo(self, *args):
        return subprocess.run([sys.executable, str(MODEL_PATH), *args], capture_output=True, text=True, timeout=10)

    def test_all_topics_have_readable_and_json_output(self):
        for topic in ("fold", "gradient", "convolution"):
            with self.subTest(topic=topic):
                readable = self.run_demo("--topic", topic)
                self.assertEqual(readable.returncode, 0, readable.stderr)
                self.assertGreater(len(readable.stdout.splitlines()), 3)
                structured = self.run_demo("--topic", topic, "--json")
                self.assertEqual(structured.returncode, 0, structured.stderr)
                self.assertEqual(json.loads(structured.stdout)["topic"], topic)

    def test_invalid_arguments_produce_actionable_error(self):
        result = self.run_demo("--topic", "gradient", "--learning-rate", "0")
        self.assertEqual(result.returncode, 2)
        self.assertIn("learning_rate must be positive", result.stderr)


if __name__ == "__main__":
    unittest.main()
