/* Inspectable teaching networks. Fixed, untrained weights; no dependencies. MIT licensed. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DLNetworks = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const bilingual = (zh, en) => ({ zh, en });
  const copy = value => JSON.parse(JSON.stringify(value));
  const relu = value => Math.max(0, value);
  const sum = row => row.reduce((total, value) => total + value, 0);
  const zeros = length => Array.from({ length }, () => 0);

  function stage(id, zh, en, values, descriptionZh, descriptionEn, formula) {
    const kind = Array.isArray(values) ? (Array.isArray(values[0]) ? 'matrix' : 'vector') : 'scalar';
    const shape = kind === 'matrix' ? [values.length, values[0].length] : kind === 'vector' ? [values.length] : [];
    return { id, label: bilingual(zh, en), shape, kind, values: copy(values),
      description: bilingual(descriptionZh, descriptionEn), formula };
  }

  // Row-vector convention throughout: xW + b. W has [input, output] shape.
  function linear(row, weights, bias = zeros(weights[0].length)) {
    return weights[0].map((_, j) => row.reduce((total, value, k) => total + value * weights[k][j], bias[j]));
  }

  function matmul(left, right) {
    return left.map(row => linear(row, right));
  }

  function transpose(matrix) {
    return matrix[0].map((_, col) => matrix.map(row => row[col]));
  }

  function add(left, right) {
    return left.map((row, r) => row.map((value, c) => value + right[r][c]));
  }

  // The maximum subtraction prevents overflow. null represents a masked logit.
  function softmax(row) {
    const active = row.filter(value => value !== null);
    if (!active.length) throw new RangeError('A softmax row needs an unmasked entry');
    const maximum = Math.max(...active);
    const exponents = row.map(value => value === null ? 0 : Math.exp(value - maximum));
    const denominator = sum(exponents);
    return exponents.map(value => value / denominator);
  }

  // Population variance over each token's feature dimension, gamma=1, beta=0.
  function layerNorm(matrix, epsilon) {
    return matrix.map(row => {
      const mean = sum(row) / row.length;
      const variance = sum(row.map(value => (value - mean) ** 2)) / row.length;
      return row.map(value => (value - mean) / Math.sqrt(variance + epsilon));
    });
  }

  function optionsBoolean(options, name, fallback) {
    const value = options[name] === undefined ? fallback : options[name];
    if (typeof value !== 'boolean') throw new TypeError(name + ' must be boolean');
    return value;
  }

  function cnnForward(options = {}) {
    const input = options.input === undefined ? [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0]
    ] : copy(options.input);
    if (!Array.isArray(input) || input.length !== 8 || input.some(row => !Array.isArray(row) || row.length !== 8 || row.some(v => !Number.isFinite(v) || v < 0 || v > 1))) throw new RangeError('CNN input must be an 8 × 8 matrix with values from 0 to 1');
    const kernel = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
    const patches = [];
    // CNN convolution uses cross-correlation: no kernel reversal, stride 1, padding 0.
    const convolution = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => {
      const terms = [];
      for (let kr = 0; kr < 3; kr++) for (let kc = 0; kc < 3; kc++) {
        terms.push({ row: r + kr, col: c + kc, input: input[r + kr][c + kc],
          weight: kernel[kr][kc], product: input[r + kr][c + kc] * kernel[kr][kc] });
      }
      const value = sum(terms.map(term => term.product));
      patches.push({ row: r, col: c, terms, value });
      return value;
    }));
    const activated = convolution.map(row => row.map(relu));
    const poolWindows = [];
    const pooling = Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => {
      const entries = [activated[2 * r][2 * c], activated[2 * r][2 * c + 1],
        activated[2 * r + 1][2 * c], activated[2 * r + 1][2 * c + 1]];
      const value = Math.max(...entries);
      poolWindows.push({ row: r, col: c, entries, value });
      return value;
    }));
    const pooled = [sum(pooling.flat()) / 9];
    const head = [[0.8, -0.8]], headBias = [-0.4, 0.4];
    const logits = linear(pooled, head, headBias);
    const probabilities = softmax(logits);
    return {
      id: 'cnn', name: bilingual('CNN · 从像素到特征', 'CNN · Pixels to features'),
      note: bilingual('单通道教学 CNN，使用固定手工权重；两类输出仅演示计算，不代表训练后的识别能力。',
        'A single-channel teaching CNN with fixed hand-set weights. Its two outputs illustrate computation, not learned recognition.'),
      input, output: probabilities, weights: { kernel, head, headBias },
      data: { input, convolution, relu: activated, pooling, pooled, logits, probabilities, patches, poolWindows },
      stages: [
        stage('input', '输入图像', 'Input image', input,
          '把 8 × 8 灰度图看作数字矩阵：0 是暗像素，1 是亮像素。',
          'An 8 × 8 grayscale image is a matrix: 0 is dark and 1 is bright.', 'X ∈ ℝ⁸ˣ⁸'),
        stage('convolution', '卷积提取', 'Convolution', convolution,
          '3 × 3 垂直边缘核逐格做乘加。步幅 1、无填充，得到 6 × 6 响应图；负响应仍保留。',
          'A 3 × 3 vertical-edge kernel slides with stride 1 and no padding, producing a 6 × 6 map with signed responses.',
          'C[r,c] = ΣᵢΣⱼ X[r+i,c+j] K[i,j]'),
        stage('relu', 'ReLU 激活', 'ReLU activation', activated,
          '每个负数变成 0，正数保持不变；这一层为网络引入非线性。',
          'Replace every negative value with 0 and keep positive values; this introduces nonlinearity.',
          'A[r,c] = max(0, C[r,c])'),
        stage('pooling', '最大池化', 'Max pooling', pooling,
          '每个 2 × 2 区域取最大值，步幅 2，将响应图缩小为 3 × 3。',
          'Take the maximum in each 2 × 2 window with stride 2, reducing the feature map to 3 × 3.',
          'P[r,c] = max A[2r:2r+2, 2c:2c+2]'),
        stage('global-pool', '全局平均汇聚', 'Global average', pooled,
          '将 9 个局部特征取平均，得到一个整体特征。',
          'Average the nine local values into one global feature.', 'g = (ΣᵣΣ꜀ P[r,c]) / 9'),
        stage('logits', '线性输出', 'Linear head', logits,
          '手工设定的线性层生成两个分数。分数没有预设的真实类别含义。',
          'A hand-set linear layer produces two scores without real learned class meanings.',
          'z = g [0.8, −0.8] + [−0.4, 0.4]'),
        stage('probabilities', 'Softmax 输出', 'Softmax output', probabilities,
          '把分数归一化为和为 1 的演示概率；这不是经过训练或校准的预测。',
          'Normalize scores into illustrative probabilities summing to 1. These predictions are neither trained nor calibrated.',
          'pᵢ = exp(zᵢ) / Σⱼ exp(zⱼ)')
      ]
    };
  }

  function resnetForward(options = {}) {
    const skip = optionsBoolean(options, 'skip', true);
    const zeroResidual = optionsBoolean(options, 'zeroResidual', false);
    const strength = options.strength === undefined ? 1 : options.strength;
    if (!Number.isFinite(strength) || strength < 0 || strength > 2) throw new RangeError('Residual strength must be between 0 and 2');
    const input = [1, -0.5, 0.75, 0.25];
    const w1 = [[0.5, -0.3, 0.2, 0.1], [0.2, 0.4, -0.5, 0.1],
      [-0.1, 0.2, 0.4, -0.2], [0.3, 0.1, -0.2, 0.6]];
    const b1 = [0.1, 0, -0.1, 0.05];
    const w2 = zeroResidual ? Array.from({ length: 4 }, () => zeros(4)) :
      [[0.3, -0.2, 0.1, 0.2], [-0.1, 0.3, 0.2, 0],
        [0.2, 0.1, -0.3, 0.1], [0.1, 0, 0.2, -0.2]];
    const b2 = zeroResidual ? zeros(4) : [0.02, -0.03, 0, 0.01];
    const preactivation = linear(input, w1, b1);
    const hidden = preactivation.map(relu);
    const residual = linear(hidden, w2, b2);
    const output = residual.map((value, i) => strength * value + (skip ? input[i] : 0));
    const head = [[0.4, -0.3], [-0.2, 0.5], [0.3, 0.2], [0.1, -0.2]];
    const headBias = [0, 0];
    const logits = linear(output, head, headBias);
    const probabilities = softmax(logits);
    return {
      id: 'resnet', name: bilingual('ResNet · 学习一个改变量', 'ResNet · Learn a correction'),
      note: bilingual('四维向量的残差块示意，使用固定权重。为直接观察恒等映射，省略加和后的 ReLU；不是完整 ResNet 图像模型。',
        'A fixed-weight residual-block illustration on four features, not a full ResNet image model. Post-addition ReLU is omitted so identity mapping is directly visible.'),
      options: { skip, zeroResidual, strength }, input, residual, output,
      weights: { w1, b1, w2, b2, head, headBias },
      data: { input, preactivation, hidden, residual, scaledResidual: residual.map(v => strength * v), sum: output, logits, probabilities },
      stages: [
        stage('input', '输入特征 x', 'Input features x', input,
          '将四个特征送进残差分支，同时沿快捷连接保留一份原始输入。',
          'Send four features through the residual branch, while a shortcut can preserve the original input.', 'x ∈ ℝ⁴'),
        stage('hidden', '残差分支 · 激活', 'Residual branch · activation', hidden,
          '第一层线性变换后使用 ReLU。这里只展示残差学习的最小结构，不包含卷积或 BatchNorm。',
          'Apply ReLU after the first linear transform. This minimal block illustrates residual learning without convolution or BatchNorm.',
          'h = ReLU(xW₁ + b₁)'),
        stage('residual', '改变量 F(x)', 'Correction F(x)', residual,
          zeroResidual ? '将第二层权重与偏置置为 0，因此 F(x) 的每个分量都精确为 0。' : '第二层生成一个与输入形状相同的改变量；它可以增加也可以减少原始特征。',
          zeroResidual ? 'Set second-layer weights and biases to zero, so every component of F(x) is exactly zero.' : 'The second layer produces a correction with the input shape; it can increase or decrease each feature.',
          zeroResidual ? 'F(x) = 0' : 'F(x) = hW₂ + b₂'),
        stage('sum', skip ? '快捷连接 · 相加' : '关闭快捷连接', skip ? 'Shortcut · addition' : 'Shortcut disabled', output,
          skip ? '保留 x，再加上 αF(x)，α = ' + strength + '。α = 0 或 F(x) = 0 时，输出精确等于输入。省略最终激活。' : '关闭捷径后，输出为 αF(x)，α = ' + strength + '。输入无法直接到达输出；省略最终激活。',
          skip ? 'Preserve x and add αF(x), with α = ' + strength + '. When α or F(x) is zero, the output equals x. Final activation omitted.' : 'Without the shortcut, output is αF(x), with α = ' + strength + '. No direct input path; final activation omitted.',
          (skip ? 'y = x + ' : 'y = ') + (strength === 1 ? '' : strength + ' × ') + 'F(x)'),
        stage('logits', '线性输出', 'Linear head', logits,
          '用同一组固定输出权重比较有无快捷连接时的分数变化。',
          'Use the same fixed output weights to compare scores with and without the shortcut.', 'z = yWₕ + bₕ'),
        stage('probabilities', 'Softmax 输出', 'Softmax output', probabilities,
          '两个示意类别的概率和为 1；权重未经训练，数值仅用于理解前向计算。',
          'The two illustrative class probabilities sum to 1. Untrained weights serve only to explain the forward calculation.',
          'pᵢ = exp(zᵢ) / Σⱼ exp(zⱼ)')
      ]
    };
  }

  function transformerForward(options = {}) {
    const causal = optionsBoolean(options, 'causal', false);
    const scenario = options.scenario === undefined ? 'default' : options.scenario;
    if (!['default', 'contrast'].includes(scenario)) throw new RangeError('Unknown teaching vector scenario');
    const tokens = [bilingual('我', 'I'), bilingual('爱', 'love'), bilingual('学习', 'learning')];
    const embeddings = scenario === 'default' ? [[1, 0, 0.3, 0], [0, 1, 0.3, 0], [0, 0, 1, 0.3]] : [[2.5, 0, 0.3, 0], [0, 0.4, 0.3, 0], [0, 0, 1, 0.3]];
    const positions = [[0, 0.1, 0, -0.1], [0.1, 0, -0.1, 0], [-0.1, 0, 0.1, 0]];
    const input = add(embeddings, positions);
    const wq = [[0.8, 0], [0, 0.8], [0.3, 0.3], [-0.2, 0.2]];
    const wk = [[0.7, 0.1], [0.1, 0.7], [0.4, -0.2], [0.2, 0.3]];
    const wv = [[0.7, 0.1, 0, 0.2], [0, 0.8, 0.2, 0],
      [0.2, 0, 0.7, 0.1], [0.1, 0.2, 0, 0.6]];
    const wo = [[0.6, 0.1, 0, 0.1], [0, 0.7, 0.1, 0],
      [0.1, 0, 0.6, 0.1], [0, 0.1, 0.1, 0.7]];
    const w1 = [[0.5, -0.2, 0.3, 0, 0.2, -0.1], [0.1, 0.4, -0.2, 0.3, 0, 0.2],
      [-0.3, 0.2, 0.5, 0.1, -0.2, 0.4], [0.2, 0, -0.1, 0.5, 0.3, -0.2]];
    const b1 = [0.1, 0, -0.1, 0.1, 0, 0.05];
    const w2 = [[0.3, 0.1, -0.2, 0], [-0.1, 0.4, 0, 0.2], [0.2, -0.1, 0.3, 0.1],
      [0, 0.2, -0.1, 0.4], [0.1, -0.2, 0.2, 0.1], [-0.2, 0.1, 0.1, 0.3]];
    const b2 = [0.01, -0.02, 0, 0.03];
    const epsilon = 1e-5;
    const queries = matmul(input, wq), keys = matmul(input, wk), values = matmul(input, wv);
    const scores = matmul(queries, transpose(keys)).map(row => row.map(value => value / Math.sqrt(2)));
    const mask = scores.map((row, r) => row.map((_, c) => causal && c > r));
    const maskedScores = scores.map((row, r) => row.map((value, c) => mask[r][c] ? null : value));
    const attention = maskedScores.map(softmax);
    const context = matmul(attention, values);
    const projection = matmul(context, wo);
    const attentionResidual = add(input, projection);
    const normalized = layerNorm(attentionResidual, epsilon);
    const ffnHidden = normalized.map(row => linear(row, w1, b1).map(relu));
    const ffn = ffnHidden.map(row => linear(row, w2, b2));
    const ffnResidual = add(normalized, ffn);
    const output = layerNorm(ffnResidual, epsilon);
    return {
      id: 'transformer', name: bilingual('Transformer · 让 token 交换信息', 'Transformer · Tokens exchange information'),
      note: bilingual('3 个 token、4 维特征的单头 post-norm 教学块，固定手工权重。不是完整语言模型：不含多头、堆叠、dropout 或训练；因果遮罩仅用于对比信息流。',
        'A single-head, post-norm teaching block with three tokens and four features, using fixed hand-set weights. It is not a complete language model: no multi-head stack, dropout, or training. A causal mask compares information flow.'),
      options: { causal, scenario }, tokens, input, output,
      weights: { wq, wk, wv, wo, w1, b1, w2, b2, epsilon, gamma: [1, 1, 1, 1], beta: [0, 0, 0, 0] },
      data: { input, embeddings, positions, queries, keys, values, scores, maskedScores, mask,
        attention, context, projection, attentionResidual, normalized, ffnHidden, ffn, ffnResidual, output },
      stages: [
        stage('input', '带位置的输入', 'Position-aware input', input,
          '每行对应一个 token。手工词向量与位置向量相加后，得到 3 × 4 输入；示意词向量不来自训练。',
          'Each row is a token. Add hand-set embeddings and positions into a 3 × 4 input; these embeddings are not learned.',
          'X = Embedding + Position'),
        stage('queries', '生成查询 Q', 'Build queries Q', queries,
          '将每个 token 的四维输入投影到二维查询空间，表示它如何参与注意力分数计算。',
          'Project each four-dimensional token into a two-dimensional query for attention-score computation.', 'Q = XWQ'),
        stage('keys', '生成键 K', 'Build keys K', keys,
          '同一输入使用另一组权重生成键。接下来，每个查询与每个键做点积。',
          'Another weight matrix generates keys from the same input. Every query will be compared with every key.', 'K = XWK'),
        stage('values', '生成值 V', 'Build values V', values,
          '值向量是要被混合的信息。这里值的维度为 4，与查询和键的二维可以不同。',
          'Value vectors hold the information to mix. Their dimension is 4 here, while query and key dimensions are 2.', 'V = XWV'),
        stage('scores', '缩放点积分数', 'Scaled dot-product scores', maskedScores,
          causal ? 'Q 与 K 点积后除以 √2。因果遮罩把未来位置视为负无穷（−∞），softmax 后这些位置权重为 0。' : '每行对应一个查询 token，每列对应一个键 token。点积除以 √2，避免分数随键维度增大而过大。',
          causal ? 'Divide query-key dot products by √2. The causal mask treats future positions as negative infinity (−∞), so their softmax weights become 0.' : 'Each row is a query token and each column a key token. Dividing dot products by √2 controls the scale as key dimension grows.',
          causal ? 'S = QKᵀ / √2; S[i,j] = −∞ for j > i' : 'S = QKᵀ / √2'),
        stage('attention', '注意力权重', 'Attention weights', attention,
          '逐行做 softmax：每行权重之和为 1。高权重表示该行 token 在本次计算中更多地使用对应列的值向量。',
          'Apply softmax to each row, whose weights sum to 1. A larger weight means this query uses more of that column’s value vector in this calculation.',
          'A[i,:] = softmax(S[i,:])'),
        stage('context', '加权混合信息', 'Weighted value mixing', context,
          '每个 token 按自己的注意力权重，对三个值向量加权求和。',
          'Each token forms a weighted sum of the three value vectors using its own attention row.', 'C = AV'),
        stage('projection', '输出投影', 'Output projection', projection,
          '对混合结果应用输出线性投影，得到与原输入形状相同的注意力分支输出。',
          'Apply an output projection to the mixed values, producing an attention-branch result with the input shape.', 'O = CWO'),
        stage('residual-norm', '残差与归一化', 'Residual and normalization', normalized,
          '先加回原始输入，再对每个 token 的四个特征做 LayerNorm：γ = 1、β = 0、ε = 10⁻⁵。',
          'Add the original input, then apply LayerNorm across each token’s four features: γ = 1, β = 0, ε = 10⁻⁵.',
          'H = LayerNorm(X + O)'),
        stage('ffn', '逐 token 前馈网络', 'Token-wise feed-forward', ffn,
          '对每个 token 独立应用同一套 4 → 6 → 4 前馈网络，中间使用 ReLU；这一步不混合不同 token。',
          'Apply the same 4 → 6 → 4 feed-forward network independently to each token, with ReLU between layers; tokens do not mix here.',
          'F = ReLU(HW₁ + b₁)W₂ + b₂'),
        stage('output', '块输出', 'Block output', output,
          '再做一次残差相加与 LayerNorm，得到三个更新后的 token 表示；这是特征输出，不是文本预测。',
          'A second residual addition and LayerNorm produce three updated token representations. These are features, not text predictions.',
          'Y = LayerNorm(H + F)')
      ]
    };
  }

  return { cnnForward, resnetForward, transformerForward };
});
