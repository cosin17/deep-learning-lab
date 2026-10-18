"""Small, inspectable versions of the three browser experiments.

Run ``python python/deep_learning_lab.py --topic fold`` from the project root.
Only Python's standard library is needed. The equations and returned traces
match ``assets/lab/core.js``; the tests compare both implementations.
"""

import argparse
import json
import math


# Each unit normal names the side of a line that the fold keeps.
NORMALS = [
    [0, 1],
    [1, 0],
    [math.sqrt(0.5), -math.sqrt(0.5)],
    [math.sin(math.pi / 8), -math.cos(math.pi / 8)],
]

KERNELS = {
    "edge": [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
    "blur": [[1 / 9 for _ in range(3)] for _ in range(3)],
    "sharpen": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
}


def _finite(value, name):
    """Reject booleans, nonnumbers, NaN and infinity before calculation."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"{name} must be a finite number")
    try:
        valid = math.isfinite(value)
    except OverflowError:
        valid = False
    if not valid:
        raise ValueError(f"{name} must be finite")


def _integer(value, name, minimum, maximum=None):
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"{name} must be an integer")
    if value < minimum or (maximum is not None and value > maximum):
        end = f"..{maximum}" if maximum is not None else " or greater"
        raise ValueError(f"{name} must be {minimum}{end}")


def _point(point):
    if not isinstance(point, (list, tuple)) or len(point) != 2:
        raise TypeError("point must have two coordinates")
    for coordinate in point:
        _finite(coordinate, "coordinate")


def fold_trace(point, depth, rotation=0, nonlinear=True):
    """Rotate a 2D point, then record every spatial fold.

    For a unit normal n: z = dot(p, n), a = ReLU(-z), p' = p + 2*a*n.
    This reflects only the negative side of the line. With nonlinear=False,
    a = -z reflects both sides; the entire transformation is then linear.
    The construction illustrates expressivity, not a trained classifier.
    """
    _point(point)
    _integer(depth, "depth", 0, 4)
    _finite(rotation, "rotation")
    if not isinstance(nonlinear, bool):
        raise TypeError("nonlinear must be a boolean")

    angle = rotation * math.pi / 180
    x, y = point
    p = [math.cos(angle) * x - math.sin(angle) * y,
         math.sin(angle) * x + math.cos(angle) * y]
    trace = [{"point": p[:], "z": None, "activation": None, "normal": None}]
    for normal in NORMALS[:depth]:
        z = p[0] * normal[0] + p[1] * normal[1]
        activation = max(0, -z) if nonlinear else -z
        p = [p[0] + 2 * activation * normal[0],
             p[1] + 2 * activation * normal[1]]
        trace.append({"point": p[:], "z": z, "activation": activation,
                      "normal": normal[:]})
    return trace


def fold_point(point, depth, rotation=0, nonlinear=True):
    """Return just the final point of ``fold_trace``."""
    return fold_trace(point, depth, rotation, nonlinear)[-1]["point"]


def cut_score(point, threshold):
    """Score the browser's straight cut: x - 0.5*y - threshold."""
    _point(point)
    _finite(threshold, "threshold")
    return point[0] - 0.5 * point[1] - threshold


def loss(w):
    """The toy loss L(w) = (w - 1)^2 / 2; its minimum is at w = 1."""
    _finite(w, "w")
    return 0.5 * (w - 1) ** 2


def gradient(w):
    """The exact derivative dL/dw = w - 1."""
    _finite(w, "w")
    return w - 1


def gd_step(w, learning_rate):
    """Take one step: w_next = w - learning_rate * gradient(w)."""
    _finite(w, "w")
    _finite(learning_rate, "learning_rate")
    if learning_rate <= 0:
        raise ValueError("learning_rate must be positive")
    return w - learning_rate * gradient(w)


def gd_trace(w, learning_rate, steps):
    """Include the initial state and each parameter update in a table."""
    _integer(steps, "steps", 0)
    _finite(w, "w")
    _finite(learning_rate, "learning_rate")
    if learning_rate <= 0:
        raise ValueError("learning_rate must be positive")
    trace = []
    for step in range(steps + 1):
        trace.append({"step": step, "w": w, "loss": loss(w), "gradient": gradient(w)})
        if step < steps:
            w = gd_step(w, learning_rate)
    return trace


def _matrix_shape(matrix, name):
    if (not isinstance(matrix, (list, tuple)) or not matrix
            or not isinstance(matrix[0], (list, tuple)) or not matrix[0]):
        raise TypeError(f"{name} must be a nonempty matrix")
    width = len(matrix[0])
    for row in matrix:
        if not isinstance(row, (list, tuple)) or len(row) != width:
            raise TypeError(f"{name} must be rectangular")
        for value in row:
            _finite(value, name)
    return len(matrix), width


def correlate(input_image, kernel, stride=1, padding=0):
    """Compute 2D cross-correlation, recording every multiply and add.

    This is the convention often called convolution in CNNs: the kernel is
    NOT reversed. Padding uses zeros. The output drops incomplete windows.
    Height = floor((input_height + 2*padding - kernel_height)/stride) + 1.
    """
    height, width = _matrix_shape(input_image, "input_image")
    kh, kw = _matrix_shape(kernel, "kernel")
    _integer(stride, "stride", 1)
    _integer(padding, "padding", 0)
    oh = (height + 2 * padding - kh) // stride + 1
    ow = (width + 2 * padding - kw) // stride + 1
    if oh < 1 or ow < 1:
        raise ValueError("kernel does not fit the padded input")

    output, patches = [], []
    for r in range(oh):
        output_row = []
        for c in range(ow):
            terms, value = [], 0
            for kr in range(kh):
                for kc in range(kw):
                    ir = r * stride + kr - padding
                    ic = c * stride + kc - padding
                    pixel = input_image[ir][ic] if 0 <= ir < height and 0 <= ic < width else 0
                    weight = kernel[kr][kc]
                    product = pixel * weight
                    value += product
                    terms.append({"row": ir, "col": ic, "pixel": pixel,
                                  "weight": weight, "product": product})
            output_row.append(value)
            patches.append({"row": r, "col": c, "value": value, "terms": terms})
        output.append(output_row)
    return {"output": output, "patches": patches, "height": oh, "width": ow}


def default_image():
    """Return a fresh copy of the browser's editable 5 by 5 input."""
    return [[0, 0, 1, 0, 0], [0, 1, 1, 0, 0], [1, 1, 1, 0, 0],
            [0, 1, 1, 0, 0], [0, 0, 1, 0, 0]]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--topic", choices=("fold", "gradient", "convolution"), default="fold")
    parser.add_argument("--json", action="store_true", help="print machine-readable results")
    parser.add_argument("--point", nargs=2, type=float, default=[0.6, -0.8], metavar=("X", "Y"))
    parser.add_argument("--depth", type=int, default=3, help="number of folds: 0..4")
    parser.add_argument("--rotation", type=float, default=0, help="input rotation in degrees")
    parser.add_argument("--linear", action="store_true", help="replace ReLU(-z) with -z")
    parser.add_argument("--w", type=float, default=-3, help="initial gradient-descent parameter")
    parser.add_argument("--learning-rate", type=float, default=0.4)
    parser.add_argument("--steps", type=int, default=8)
    parser.add_argument("--kernel", choices=tuple(KERNELS), default="edge")
    parser.add_argument("--stride", type=int, default=1)
    parser.add_argument("--padding", type=int, default=0)
    args = parser.parse_args(argv)

    try:
        if args.topic == "fold":
            result = {"topic": "fold", "input": args.point, "depth": args.depth,
                      "rotation": args.rotation, "nonlinear": not args.linear,
                      "trace": fold_trace(args.point, args.depth, args.rotation, not args.linear)}
        elif args.topic == "gradient":
            result = {"topic": "gradient", "learning_rate": args.learning_rate,
                      "trace": gd_trace(args.w, args.learning_rate, args.steps)}
        else:
            result = {"topic": "convolution", "input": default_image(),
                      "kernel": KERNELS[args.kernel], "stride": args.stride, "padding": args.padding,
                      **correlate(default_image(), KERNELS[args.kernel], args.stride, args.padding)}
        if args.json:
            print(json.dumps(result, indent=2, allow_nan=False))
        elif args.topic == "fold":
            print("Spatial folding: p_next = p + 2 * ReLU(-dot(p, n)) * n")
            if args.linear:
                print("Linear mode: ReLU(-z) is replaced by -z (a reflection at every layer).")
            for layer, state in enumerate(result["trace"]):
                x, y = state["point"]
                detail = " (after input rotation)" if layer == 0 else (
                    f"  z={state['z']:.6f}  activation={state['activation']:.6f}")
                print(f"Layer {layer}: ({x:.6f}, {y:.6f}){detail}")
            print("Try --depth 4, --linear, or --rotation 30; compare the coordinates.")
        elif args.topic == "gradient":
            print("Gradient descent: L(w) = (w-1)^2/2; w_next = w - rate*(w-1)")
            print("step          w          loss      gradient")
            for state in result["trace"]:
                print(f"{state['step']:4d} {state['w']:11.6f} {state['loss']:13.6f} {state['gradient']:13.6f}")
            print("Try --learning-rate 1, 1.8, or 2.1; compare consecutive losses.")
        else:
            print(f"CNN cross-correlation: kernel={args.kernel}; stride={args.stride}; padding={args.padding}")
            print("The kernel is used as written, without reversing its rows or columns.")
            print(f"Output shape: {result['height']} x {result['width']}")
            for row in result["output"]:
                print(" ".join(f"{value:8.3f}" for value in row))
            first = result["patches"][0]
            products = " + ".join(f"({term['pixel']:g}*{term['weight']:g})" for term in first["terms"])
            print(f"First cell: {products} = {first['value']:g}")
            print("Try --kernel blur, --stride 2, or --padding 1; use --json to inspect all terms.")
    except (TypeError, ValueError, OverflowError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
