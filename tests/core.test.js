const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/lab/core.js');
const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, a + ' ≉ ' + b);
const pointNear = (a, b) => a.forEach((v, i) => near(v, b[i]));

test('folds match hand-calculated half-plane reflections', () => {
  pointNear(M.foldPoint([-0.4, -0.7], 0), [-0.4, -0.7]);
  pointNear(M.foldPoint([-0.4, -0.7], 1), [-0.4, 0.7]);
  pointNear(M.foldPoint([-0.4, -0.7], 2), [0.4, 0.7]);
  pointNear(M.foldPoint([-0.4, -0.7], 3), [0.7, 0.4]);
});
test('rotation and reflection preserve distance from the origin', () => {
  for (let i = 0; i < 35; i++) {
    const p = [Math.sin(i) * 1.2, Math.cos(i * 3) * 1.1];
    for (let depth = 0; depth <= 4; depth++) {
      const q = M.foldPoint(p, depth, 17);
      near(Math.hypot(...q), Math.hypot(...p));
    }
  }
  pointNear(M.foldPoint([1, 0], 0, 90), [0, 1]);
});
test('four folds place points within a 22.5 degree wedge', () => {
  for (let i = 0; i < 100; i++) {
    const q = M.foldPoint([Math.cos(i), Math.sin(i)], 4);
    assert.ok(q[0] >= -1e-10 && q[1] >= -1e-10);
    assert.ok(Math.atan2(q[1], q[0]) <= Math.PI / 8 + 1e-10);
  }
});
test('disabling ReLU produces a globally linear composition', () => {
  for (let depth = 0; depth <= 4; depth++) {
    const a = [0.3, -0.8], b = [-0.5, 0.2];
    const fa = M.foldPoint(a, depth, 23, false), fb = M.foldPoint(b, depth, 23, false);
    const fab = M.foldPoint([a[0] + b[0], a[1] + b[1]], depth, 23, false);
    pointNear(fab, [fa[0] + fb[0], fa[1] + fb[1]]);
  }
});
test('folding can keep two points while cutting their midpoint', () => {
  assert.ok(M.cutScore(M.foldPoint([1, 0], 3), 0.65) > 0);
  assert.ok(M.cutScore(M.foldPoint([0, 1], 3), 0.65) > 0);
  assert.ok(M.cutScore(M.foldPoint([0.5, 0.5], 3), 0.65) < 0);
});
test('inspector trace and final output agree', () => {
  const trace = M.foldTrace([0.7, 0.45], 4, -19);
  assert.equal(trace.length, 5);
  pointNear(trace.at(-1).point, M.foldPoint([0.7, 0.45], 4, -19));
  trace.slice(1).forEach(step => assert.ok(step.activation >= 0));
});
test('quadratic gradient matches a finite-difference derivative', () => {
  for (const w of [-3, 0, 0.5, 1, 4]) {
    const h = 1e-5;
    near((M.loss(w + h) - M.loss(w - h)) / (2 * h), M.gradient(w), 1e-8);
  }
});
test('learning rate 0.2 monotonically decreases loss', () => {
  let w = 3.5;
  for (let i = 0; i < 35; i++) {
    const next = M.gdStep(w, 0.2);
    assert.ok(M.loss(next) < M.loss(w)); w = next;
  }
  assert.ok(Math.abs(w - 1) < 0.002);
});
test('rates 1, 2 and 2.2 exhibit their stated behavior', () => {
  near(M.gdStep(3.5, 1), 1);
  near(M.gdStep(3.5, 2), -1.5);
  near(M.loss(M.gdStep(3.5, 2)), M.loss(3.5));
  assert.ok(M.loss(M.gdStep(3.5, 2.2)) > M.loss(3.5));
  near(M.gdStep(1, 2.5), 1);
});
test('cross-correlation agrees with asymmetric hand calculation', () => {
  const result = M.correlate([[1, 2], [3, 4]], [[1, 2], [3, 4]]);
  assert.deepEqual(result.output, [[30]]); // Flipping this kernel would give 20.
  assert.equal(result.patches[0].terms.reduce((s, t) => s + t.product, 0), 30);
});
test('stride and zero-padding agree with hand-calculated sums', () => {
  const result = M.correlate([[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], 2, 1);
  assert.deepEqual(result.output, [[12, 16], [24, 28]]);
  assert.equal(result.patches[0].terms.filter(t => t.row < 0 || t.col < 0).length, 5);
});
test('mean kernel preserves constant input away from padding', () => {
  const result = M.correlate(Array.from({ length: 5 }, () => [1, 1, 1, 1, 1]), M.KERNELS.blur);
  result.output.flat().forEach(v => near(v, 1));
});
test('all supported convolution settings have correct output shapes and inspectable sums', () => {
  for (const kernel of Object.values(M.KERNELS)) for (const stride of [1, 2]) for (const padding of [0, 1]) {
    const result = M.correlate(M.defaultImage(), kernel, stride, padding);
    const expected = Math.floor((5 + 2 * padding - 3) / stride) + 1;
    assert.equal(result.height, expected); assert.equal(result.width, expected);
    result.patches.forEach(p => near(p.value, p.terms.reduce((s, t) => s + t.pixel * t.weight, 0)));
  }
});
test('model rejects invalid inputs with useful errors', () => {
  assert.throws(() => M.foldPoint([0, 0], 5), RangeError);
  assert.throws(() => M.foldPoint([NaN, 0], 1), TypeError);
  assert.throws(() => M.correlate([[1], [2, 3]], [[1]]), /rectangular/);
  assert.throws(() => M.correlate([[1]], [[1]], 0), RangeError);
  assert.throws(() => M.correlate([[1]], [[1]], 1, -1), RangeError);
  assert.throws(() => M.correlate([[1]], [[1, 2]]), /does not fit/);
  assert.throws(() => M.gdStep(Infinity, 1), TypeError);
});
