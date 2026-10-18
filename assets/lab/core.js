/* Pure numerical model shared by the browser and the test suite. MIT licensed. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DLLab = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const NORMALS = [[0, 1], [1, 0], [Math.SQRT1_2, -Math.SQRT1_2],
    [Math.sin(Math.PI / 8), -Math.cos(Math.PI / 8)]];

  function finite(value, name) {
    if (!Number.isFinite(value)) throw new TypeError(name + ' must be finite');
  }
  function foldTrace(point, depth, rotation = 0, nonlinear = true) {
    if (!Array.isArray(point) || point.length !== 2) throw new TypeError('point must have two coordinates');
    point.forEach(v => finite(v, 'coordinate'));
    if (!Number.isInteger(depth) || depth < 0 || depth > 4) throw new RangeError('depth must be 0..4');
    finite(rotation, 'rotation');
    const a = rotation * Math.PI / 180;
    let p = [Math.cos(a) * point[0] - Math.sin(a) * point[1],
      Math.sin(a) * point[0] + Math.cos(a) * point[1]];
    const trace = [{ point: p.slice(), z: null, activation: null, normal: null }];
    for (let i = 0; i < depth; i++) {
      const n = NORMALS[i];
      const z = p[0] * n[0] + p[1] * n[1];
      const activation = nonlinear ? Math.max(0, -z) : -z;
      p = [p[0] + 2 * activation * n[0], p[1] + 2 * activation * n[1]];
      trace.push({ point: p.slice(), z, activation, normal: n.slice() });
    }
    return trace;
  }
  function foldPoint(point, depth, rotation = 0, nonlinear = true) {
    return foldTrace(point, depth, rotation, nonlinear).at(-1).point;
  }
  function cutScore(point, threshold) {
    return point[0] - 0.5 * point[1] - threshold;
  }
  const loss = w => 0.5 * (w - 1) ** 2;
  const gradient = w => w - 1;
  function gdStep(w, learningRate) {
    finite(w, 'w'); finite(learningRate, 'learningRate');
    if (learningRate <= 0) throw new RangeError('learningRate must be positive');
    return w - learningRate * gradient(w);
  }

  const KERNELS = {
    edge: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
    blur: Array.from({ length: 3 }, () => [1 / 9, 1 / 9, 1 / 9]),
    sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]
  };
  function matrixShape(m, name) {
    if (!Array.isArray(m) || !m.length || !Array.isArray(m[0]) || !m[0].length)
      throw new TypeError(name + ' must be a nonempty matrix');
    const width = m[0].length;
    for (const row of m) {
      if (!Array.isArray(row) || row.length !== width) throw new TypeError(name + ' must be rectangular');
      row.forEach(v => finite(v, name));
    }
    return [m.length, width];
  }
  // CNN convention: cross-correlation, without reversing the kernel.
  function correlate(input, kernel, stride = 1, padding = 0) {
    const [height, width] = matrixShape(input, 'input');
    const [kh, kw] = matrixShape(kernel, 'kernel');
    if (!Number.isInteger(stride) || stride < 1) throw new RangeError('stride must be a positive integer');
    if (!Number.isInteger(padding) || padding < 0) throw new RangeError('padding must be a nonnegative integer');
    const oh = Math.floor((height + 2 * padding - kh) / stride) + 1;
    const ow = Math.floor((width + 2 * padding - kw) / stride) + 1;
    if (oh < 1 || ow < 1) throw new RangeError('kernel does not fit the padded input');
    const output = [], patches = [];
    for (let r = 0; r < oh; r++) {
      const row = [];
      for (let c = 0; c < ow; c++) {
        const terms = [];
        let value = 0;
        for (let kr = 0; kr < kh; kr++) for (let kc = 0; kc < kw; kc++) {
          const ir = r * stride + kr - padding, ic = c * stride + kc - padding;
          const pixel = ir >= 0 && ir < height && ic >= 0 && ic < width ? input[ir][ic] : 0;
          const product = pixel * kernel[kr][kc];
          value += product;
          terms.push({ row: ir, col: ic, pixel, weight: kernel[kr][kc], product });
        }
        row.push(value);
        patches.push({ row: r, col: c, value, terms });
      }
      output.push(row);
    }
    return { output, patches, height: oh, width: ow };
  }
  function defaultImage() {
    return [[0, 0, 1, 0, 0], [0, 1, 1, 0, 0], [1, 1, 1, 0, 0],
      [0, 1, 1, 0, 0], [0, 0, 1, 0, 0]];
  }
  return { NORMALS, foldTrace, foldPoint, cutScore, loss, gradient, gdStep, KERNELS, correlate, defaultImage };
});
