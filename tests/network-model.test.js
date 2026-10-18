const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const N = require('../assets/lab/network-model.js');

const near = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' ≉ ' + expected);
const rowNear = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, i) => near(value, expected[i]));
};
const stage = (network, id) => {
  const found = network.stages.find(item => item.id === id);
  assert.ok(found, id + ' stage is inspectable');
  return found;
};

test('CNN tensor shapes follow the valid-convolution and pooling equations', () => {
  const network = N.cnnForward();
  const expected = { input: [8, 8], convolution: [6, 6], relu: [6, 6],
    pooling: [3, 3], 'global-pool': [1], logits: [2], probabilities: [2] };
  for (const [id, shape] of Object.entries(expected)) assert.deepEqual(stage(network, id).shape, shape);
  assert.equal((8 - 3) / 1 + 1, network.data.convolution.length);
  assert.equal((6 - 2) / 2 + 1, network.data.pooling.length);
});

test('CNN edge response agrees with a hand-calculated input patch', () => {
  const network = N.cnnForward();
  // Rows 0..2, cols 1..3 are [0,0,1], [0,0,1], [0,1,1].
  // The kernel's right column sums to 3 and left column sums to 0.
  assert.equal(network.data.convolution[0][1], 3);
  // Rows 0..2, cols 3..5 all have left=1 and right=0.
  assert.equal(network.data.convolution[0][3], -3);
  assert.equal(network.data.relu[0][3], 0);
  assert.equal(network.data.relu[0][1], 3);
  for (const patch of network.data.patches) {
    assert.equal(patch.terms.length, 9);
    near(patch.value, patch.terms.reduce((total, term) => total + term.input * term.weight, 0));
  }
});

test('CNN max pooling, average and output probabilities agree with hand calculations', () => {
  const network = N.cnnForward();
  // First pooled column reaches 3. The top/bottom middle windows retain response 2.
  assert.deepEqual(network.data.pooling, [[3, 2, 0], [3, 0, 0], [3, 2, 0]]);
  near(network.data.pooled[0], 13 / 9);
  rowNear(network.data.logits, [34 / 45, -34 / 45]);
  near(network.data.probabilities[0], 1 / (1 + Math.exp(-68 / 45)));
  near(network.data.probabilities.reduce((a, b) => a + b, 0), 1);
  network.data.poolWindows.forEach(window => assert.equal(window.value, Math.max(...window.entries)));
});

test('residual branch hidden features and correction agree with hand calculations', () => {
  const network = N.resnetForward();
  // x=[1,-0.5,0.75,0.25]; independently calculated xW1+b1.
  rowNear(network.data.preactivation, [0.5, -0.325, 0.6, 0.1]);
  rowNear(network.data.hidden, [0.5, 0, 0.6, 0.1]);
  rowNear(network.residual, [0.3, -0.07, -0.11, 0.15]);
  rowNear(network.output, [1.3, -0.57, 0.64, 0.4]);
});

test('shortcut changes only the addition, preserving the computed correction', () => {
  const on = N.resnetForward({ skip: true }), off = N.resnetForward({ skip: false });
  assert.deepEqual(on.residual, off.residual);
  rowNear(off.output, off.residual);
  rowNear(on.output.map((value, i) => value - off.output[i]), on.input);
  assert.deepEqual(stage(on, 'sum').values, on.output);
  assert.deepEqual(stage(off, 'sum').values, off.output);
  assert.notDeepEqual(on.data.probabilities, off.data.probabilities);
});

test('zero residual is exactly the identity with a shortcut and exactly zero without', () => {
  const on = N.resnetForward({ zeroResidual: true });
  const off = N.resnetForward({ zeroResidual: true, skip: false });
  assert.deepEqual(on.residual, [0, 0, 0, 0]);
  assert.deepEqual(on.output, on.input);
  assert.deepEqual(off.output, [0, 0, 0, 0]);
  assert.ok(on.weights.w2.flat().every(value => value === 0));
  assert.deepEqual(on.weights.b2, [0, 0, 0, 0]);
  rowNear(off.data.probabilities, [0.5, 0.5]);
});

test('Transformer projections and scaled score agree with hand calculations', () => {
  const network = N.transformerForward();
  assert.deepEqual(stage(network, 'input').shape, [3, 4]);
  assert.deepEqual(stage(network, 'queries').shape, [3, 2]);
  assert.deepEqual(stage(network, 'attention').shape, [3, 3]);
  rowNear(network.data.input[0], [1, 0.1, 0.3, -0.1]);
  rowNear(network.data.queries[0], [0.91, 0.15]);
  rowNear(network.data.keys[0], [0.81, 0.08]);
  rowNear(network.data.values[0], [0.75, 0.16, 0.23, 0.17]);
  near(network.data.scores[0][0], (0.91 * 0.81 + 0.15 * 0.08) / Math.sqrt(2));
});

test('attention softmax rows normalize and each context is their weighted value sum', () => {
  const network = N.transformerForward();
  network.data.attention.forEach((row, r) => {
    near(row.reduce((total, value) => total + value, 0), 1);
    assert.ok(row.every(value => value > 0 && value < 1));
    const denominator = network.data.scores[r].reduce((total, score) => total + Math.exp(score), 0);
    row.forEach((value, c) => near(value, Math.exp(network.data.scores[r][c]) / denominator));
    for (let feature = 0; feature < 4; feature++) {
      near(network.data.context[r][feature], row.reduce((total, weight, c) => total + weight * network.data.values[c][feature], 0));
    }
  });
});

test('causal attention masks only future positions, including an exact first-token self-attention', () => {
  const masked = N.transformerForward({ causal: true }), full = N.transformerForward({ causal: false });
  assert.deepEqual(masked.data.queries, full.data.queries);
  assert.deepEqual(masked.data.scores, full.data.scores);
  masked.data.attention.forEach((row, r) => {
    near(row.reduce((a, b) => a + b, 0), 1);
    row.forEach((value, c) => {
      assert.equal(masked.data.mask[r][c], c > r);
      if (c > r) {
        assert.equal(value, 0);
        assert.equal(stage(masked, 'scores').values[r][c], null);
      } else assert.ok(value > 0);
    });
  });
  assert.deepEqual(masked.data.attention[0], [1, 0, 0]);
  rowNear(masked.data.context[0], masked.data.values[0]);
  rowNear(masked.data.attention[2], full.data.attention[2]);
  assert.notDeepEqual(masked.output[0], full.output[0]);
});

test('Transformer LayerNorm uses feature-wise population variance and preserves near-unit scale', () => {
  for (const causal of [true, false]) {
    const network = N.transformerForward({ causal });
    for (const [sourceName, normalizedName] of [['attentionResidual', 'normalized'], ['ffnResidual', 'output']]) {
      network.data[sourceName].forEach((row, r) => {
        const mean = row.reduce((a, b) => a + b, 0) / 4;
        const variance = row.reduce((a, b) => a + (b - mean) ** 2, 0) / 4;
        const actual = network.data[normalizedName][r];
        near(actual.reduce((a, b) => a + b, 0) / 4, 0);
        actual.forEach((value, c) => near(value, (row[c] - mean) / Math.sqrt(variance + 1e-5)));
        near(actual.reduce((a, b) => a + b * b, 0) / 4, variance / (variance + 1e-5));
        assert.ok(actual.reduce((a, b) => a + b * b, 0) / 4 > 0.99);
      });
    }
  }
});

test('feed-forward computation uses shared per-token weights and both residual sums are inspectable', () => {
  const network = N.transformerForward(), { data, weights } = network;
  data.normalized.forEach((row, r) => {
    const expectedHidden = weights.b1.map((bias, c) =>
      Math.max(0, bias + row.reduce((total, value, k) => total + value * weights.w1[k][c], 0)));
    rowNear(data.ffnHidden[r], expectedHidden);
    const expectedOutput = weights.b2.map((bias, c) =>
      bias + expectedHidden.reduce((total, value, k) => total + value * weights.w2[k][c], 0));
    rowNear(data.ffn[r], expectedOutput);
    rowNear(data.attentionResidual[r], data.input[r].map((value, c) => value + data.projection[r][c]));
    rowNear(data.ffnResidual[r], row.map((value, c) => value + data.ffn[r][c]));
  });
});

test('all stage arrays match their declared shape and contain finite numbers except explicit mask nulls', () => {
  const networks = [N.cnnForward(), ...[true, false].flatMap(skip => [true, false].map(zeroResidual =>
    N.resnetForward({ skip, zeroResidual }))), N.transformerForward(), N.transformerForward({ causal: true })];
  for (const network of networks) {
    assert.ok(network.note.zh && network.note.en);
    assert.equal(new Set(network.stages.map(item => item.id)).size, network.stages.length);
    for (const item of network.stages) {
      assert.ok(item.label.zh && item.label.en && item.description.zh && item.description.en && item.formula);
      assert.equal(item.values.length, item.shape[0]);
      if (item.kind === 'matrix') item.values.forEach(row => assert.equal(row.length, item.shape[1]));
      for (const value of item.values.flat()) {
        assert.ok(Number.isFinite(value) || value === null && item.id === 'scores' && network.options.causal);
      }
    }
  }
});

test('each call returns fresh numerical state and invalid options fail explicitly', () => {
  const cnn = N.cnnForward();
  cnn.input[0][0] = 999;
  cnn.weights.kernel[0][0] = 999;
  assert.equal(N.cnnForward().input[0][0], 0);
  assert.equal(N.cnnForward().weights.kernel[0][0], -1);
  const transformer = N.transformerForward();
  transformer.weights.wq[0][0] = 999;
  near(N.transformerForward().weights.wq[0][0], 0.8);
  assert.throws(() => N.resnetForward({ skip: 'false' }), /skip must be boolean/);
  assert.throws(() => N.resnetForward({ zeroResidual: 1 }), /zeroResidual must be boolean/);
  assert.throws(() => N.transformerForward({ causal: 'yes' }), /causal must be boolean/);
});

test('UMD browser export produces the same numbers as the CommonJS model', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/lab/network-model.js'), 'utf8'), sandbox);
  assert.equal(typeof sandbox.DLNetworks.cnnForward, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.DLNetworks.cnnForward().output)), N.cnnForward().output);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.DLNetworks.transformerForward({ causal: true }).output)),
    N.transformerForward({ causal: true }).output);
});
