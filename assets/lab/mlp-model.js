/* Tiny trainable 2 → 4 → 1 MLP. Full-batch SGD, analytic backprop, no dependencies. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DLMLP = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const sigmoid = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  function dataset(name = 'xor') {
    if (!['xor', 'linear'].includes(name)) throw new RangeError('Unknown dataset');
    return [-0.85, -0.55, 0.55, 0.85].flatMap(x => [-0.85, -0.55, 0.55, 0.85].map(y => ({ x: [x, y], y: name === 'xor' ? Number(x * y < 0) : Number(x > 0) })));
  }
  function create(seed = 42) {
    if (!Number.isInteger(seed)) throw new TypeError('Seed must be an integer');
    let state = seed >>> 0;
    const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
    return { w1: Array.from({length:2}, () => Array.from({length:4}, () => (random() * 2 - 1))), b1: Array.from({length:4}, () => (random() - 0.5) * 0.2), w2: Array.from({length:4}, () => random() * 2 - 1), b2: 0 };
  }
  function forward(parameters, point) {
    const hidden = parameters.b1.map((b,j) => Math.tanh(b + point[0] * parameters.w1[0][j] + point[1] * parameters.w1[1][j]));
    const logit = parameters.b2 + hidden.reduce((s,h,j) => s + h * parameters.w2[j], 0);
    return { hidden, logit, probability: sigmoid(logit) };
  }
  function gradients(parameters, samples) {
    if (!samples.length) throw new RangeError('Training needs samples');
    const gradient = { w1: Array.from({length:2}, () => Array(4).fill(0)), b1: Array(4).fill(0), w2: Array(4).fill(0), b2: 0 };
    let loss = 0;
    for (const sample of samples) {
      const { hidden, logit, probability } = forward(parameters, sample.x);
      // Stable BCE from logits, including very confident incorrect predictions.
      loss += (Math.max(logit, 0) - sample.y * logit + Math.log1p(Math.exp(-Math.abs(logit)))) / samples.length;
      const dz = (probability - sample.y) / samples.length;
      gradient.b2 += dz;
      hidden.forEach((h,j) => {
        gradient.w2[j] += dz * h;
        const dh = dz * parameters.w2[j] * (1 - h * h);
        gradient.b1[j] += dh;
        sample.x.forEach((x,i) => { gradient.w1[i][j] += dh * x; });
      });
    }
    return { loss, gradient };
  }
  function step(parameters, samples, rate = 0.3) {
    if (!Number.isFinite(rate) || rate <= 0 || rate > 2) throw new RangeError('Learning rate must be in (0, 2]');
    const { loss, gradient } = gradients(parameters, samples);
    const next = clone(parameters);
    next.w1.forEach((row,i) => row.forEach((_,j) => { next.w1[i][j] -= rate * gradient.w1[i][j]; }));
    next.b1.forEach((_,j) => { next.b1[j] -= rate * gradient.b1[j]; next.w2[j] -= rate * gradient.w2[j]; });
    next.b2 -= rate * gradient.b2;
    return { parameters: next, beforeLoss: loss, loss: gradients(next, samples).loss, gradient };
  }
  return { create, dataset, forward, gradients, step };
});
