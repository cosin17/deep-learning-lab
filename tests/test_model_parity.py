"""Compare the actual browser model with Python; skip only if Node is absent."""

import importlib.util
import json
import math
from pathlib import Path
import random
import shutil
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("deep_learning_lab", ROOT / "python" / "deep_learning_lab.py")
model = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(model)
NODE = shutil.which("node")

NODE_RUNNER = """
const fs = require('node:fs');
const model = require(process.argv[1]);
const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(cases.map(item => model[item.name](...item.args))));
"""


@unittest.skipUnless(NODE, "Node.js unavailable: cross-language comparison requires Node.js")
class ModelParityTests(unittest.TestCase):
    def assertNestedClose(self, actual, expected, path="result"):
        if isinstance(expected, dict):
            self.assertIsInstance(actual, dict, path)
            self.assertEqual(set(actual), set(expected), path)
            for key in expected:
                self.assertNestedClose(actual[key], expected[key], f"{path}.{key}")
        elif isinstance(expected, list):
            self.assertIsInstance(actual, list, path)
            self.assertEqual(len(actual), len(expected), path)
            for index, (a, e) in enumerate(zip(actual, expected)):
                self.assertNestedClose(a, e, f"{path}[{index}]")
        elif isinstance(expected, (int, float)) and not isinstance(expected, bool):
            self.assertTrue(math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-12),
                            f"{path}: JS={actual!r}, Python={expected!r}")
        else:
            self.assertEqual(actual, expected, path)

    def compare(self, cases):
        requests = [{"name": js_name, "args": args} for js_name, _, args in cases]
        completed = subprocess.run(
            [NODE, "-e", NODE_RUNNER, str(ROOT / "assets" / "lab" / "core.js")],
            input=json.dumps(requests), capture_output=True, text=True, timeout=15)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        results = json.loads(completed.stdout)
        self.assertEqual(len(results), len(cases))
        for result, (js_name, python_function, args) in zip(results, cases):
            with self.subTest(function=js_name, args=args):
                self.assertNestedClose(result, python_function(*args))

    def test_folding_traces_and_cut_scores(self):
        rng = random.Random(20261018)
        cases = []
        for depth in range(5):
            for nonlinear in (True, False):
                for rotation in (-45, 0, 37, 180):
                    point = [rng.uniform(-2, 2), rng.uniform(-2, 2)]
                    args = [point, depth, rotation, nonlinear]
                    cases.extend([("foldTrace", model.fold_trace, args), ("foldPoint", model.fold_point, args)])
        cases.extend(("cutScore", model.cut_score, [[x, y], threshold])
                     for x, y, threshold in [(1, 2, 0), (-0.5, 0.3, 0.2), (4, -2, -1)])
        self.compare(cases)

    def test_losses_gradients_and_repeated_updates(self):
        cases = []
        for rate in (0.1, 0.4, 1, 1.8, 2, 2.1):
            for state in model.gd_trace(-3, rate, 10):
                w = state["w"]
                cases.extend([("loss", model.loss, [w]), ("gradient", model.gradient, [w]),
                              ("gdStep", model.gd_step, [w, rate])])
        self.compare(cases)

    def test_correlation_outputs_and_every_multiply_add_term(self):
        rng = random.Random(37)
        cases = [("defaultImage", model.default_image, [])]
        images = [model.default_image(), [[rng.uniform(-2, 2) for _ in range(6)] for _ in range(4)]]
        kernels = [*model.KERNELS.values(), [[1, 2], [3, 4]], [[0.5]], [[1, -1, 2]]]
        for image in images:
            for kernel in kernels:
                for stride in (1, 2):
                    for padding in (0, 1):
                        cases.append(("correlate", model.correlate, [image, kernel, stride, padding]))
        self.compare(cases)


if __name__ == "__main__":
    unittest.main()
