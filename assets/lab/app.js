(function () {
  'use strict';
  const M = window.DLLab;
  const topics = ['fold', 'gradient', 'convolution'];
  const params = new URLSearchParams(location.search);
  const language = params.get('lang') || document.documentElement.dataset.initialLanguage;
  const initialTopic = location.hash.slice(1) || params.get('topic') || document.documentElement.dataset.initialTopic;
  const state = {
    lang: language === 'en' ? 'en' : 'zh',
    topic: topics.includes(initialTopic) ? initialTopic : 'fold',
    fold: { depth: 3, stage: 3, angle: 0, threshold: 0.65, nonlinear: true, point: [0.7, 0.45] },
    gradient: { eta: 0.2, start: 3.5, history: [3.5], timer: null },
    convolution: { stride: 1, padding: 0, kernel: 'edge', selected: 0, input: M.defaultImage() }
  };
  const $ = id => document.getElementById(id);
  const tr = (zh, en) => state.lang === 'zh' ? zh : en;
  const fmt = (v, digits = 2) => {
    if (Math.abs(v) < 1e-10) return '0';
    if (Math.abs(v) >= 100000 || Math.abs(v) < 0.001) return v.toExponential(2);
    return Number(v.toFixed(digits)).toString();
  };
  const pair = p => '(' + p.map(v => fmt(v, 3)).join(', ') + ')';
  const label = (id, text, value) => '<div class="control-head"><label for="' + id + '">' + text +
    '</label><output class="value" id="' + id + '-value" for="' + id + '">' + value + '</output></div>';
  function slider(id, text, value, min, max, step, hint) {
    return '<div class="control">' + label(id, text, value) + '<input id="' + id +
      '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value +
      '">' + (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>';
  }
  function hero(num, eyebrow, title, intro, tag) {
    return '<section class="hero"><div><p class="eyebrow">' + num + ' / ' + eyebrow +
      '</p><h1>' + title + '</h1><p class="intro">' + intro +
      '</p></div><span class="lesson-tag">' + tag + '</span></section>';
  }
  function challenge(question, answer, takeaway, references) {
    return '<div class="learning-row"><section class="learning-card"><h2>' +
      tr('先猜一猜，再试一试', 'Predict, then experiment') + '</h2><p>' + question +
      '</p><details><summary>' + tr('查看解释', 'Reveal explanation') +
      '</summary><p class="answer">' + answer + '</p></details></section><section class="learning-card"><h2>' +
      tr('把观察带回数学', 'Connect it to the math') + '</h2><p>' + takeaway +
      '</p><div class="reading">' + references + '</div></section></div>';
  }
  function reference(url, text) {
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + text + ' ↗</a>';
  }
  function renderChrome() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.title = tr('Deep Learning Lab · 看见算法', 'Deep Learning Lab · Learn by changing things');
    $('brand-caption').textContent = tr('看见算法，理解学习。', 'Learn by changing things.');
    $('offline-label').textContent = tr('离线可用 · 无需 GPU', 'Offline · No GPU required');
    $('nav-heading').textContent = tr('你的实验手册', 'YOUR FIELD NOTES');
    $('language').textContent = state.lang === 'zh' ? 'English' : '中文';
    $('language').setAttribute('aria-label', tr('Switch to English', '切换为中文'));
    $('sidebar-note').innerHTML = tr('先猜一猜，再动手。<br>每一次变化，都有数学依据。',
      'Make a prediction.<br>Change one thing.<br>Follow the math.');
    const names = [
      [tr('空间折叠', 'Space folding'), tr('神经网络的剪窗花', 'A neural paper cut')],
      [tr('梯度下降', 'Gradient descent'), tr('一步步走向最小值', 'Find the way downhill')],
      [tr('卷积探针', 'Convolution explorer'), tr('看清每一次乘加', 'Follow every multiply-add')]
    ];
    $('lessons').innerHTML = topics.map((topic, i) => '<a class="lesson-link" href="#' + topic +
      '"' + (topic === state.topic ? ' aria-current="page"' : '') + '><span class="num">0' + (i + 1) +
      '</span><span><b>' + names[i][0] + '</b><small>' + names[i][1] + '</small></span></a>').join('');
    $('footer').innerHTML = '<span>Deep Learning Lab · ' + tr('为好奇心而造', 'Made for curious minds') +
      '</span><span>' + tr('中英文 · 无追踪 · MIT 开源', '中文 / English · No tracking · MIT license') + '</span>';
  }
  function renderFold() {
    const f = state.fold;
    return hero('01', 'SPACE FOLDING', tr('让神经网络，<em>剪出一朵窗花。</em>',
      'Fold the space.<br><em>Reveal the pattern.</em>'),
    tr('同一条直线，经过空间折叠，能在原始输入中留下怎样的图案？调整参数，追踪一个点的旅程。',
      'What happens to a straight cut when you unfold the space? Change a parameter and follow one point through the network.'),
    tr('非线性 · 表达能力', 'Nonlinearity · Expressivity')) +
    '<div class="experiment"><section class="panel controls-panel" aria-label="' + tr('折叠参数', 'Folding controls') +
    '"><p class="panel-label">' + tr('动手改变 / CONTROLS', 'CHANGE SOMETHING') + '</p>' +
    slider('fold-depth', tr('折叠模块数', 'Folding blocks'), f.depth, 0, 4, 1,
      tr('从一条直线开始，逐次增加折叠。', 'Begin with a straight cut; add folds one by one.')) +
    slider('fold-angle', tr('输入旋转角', 'Input rotation'), f.angle, -45, 45, 1, '') +
    slider('fold-threshold', tr('剪切位置（偏置）', 'Cut position (bias)'), f.threshold, 0.1, 1.15, 0.01, '') +
    '<div class="control full"><label class="check"><input type="checkbox" id="fold-nonlinear"' +
      (f.nonlinear ? ' checked' : '') + '><span>' + tr('启用 ReLU 折叠', 'Enable ReLU folding') +
    '</span></label><p class="hint">' + tr('关闭后，每个模块变成全局线性反射。', 'When disabled, every block becomes a global linear reflection.') +
    '</p></div><hr class="divider"><div class="control full"><div class="control-head">' + tr('逐步查看空间', 'Walk through the space') +
    '</div><div class="step-controls"><button id="fold-prev" class="button" type="button" aria-label="' +
    tr('上一个阶段', 'Previous stage') + '">←</button><output id="fold-stage" class="step-count"></output>' +
    '<button id="fold-next" class="button" type="button" aria-label="' + tr('下一个阶段', 'Next stage') +
    '">→</button></div></div>' +
    slider('point-x', tr('追踪点 x₁', 'Track point x₁'), f.point[0], -1, 1, 0.01, '') +
    slider('point-y', tr('追踪点 x₂', 'Track point x₂'), f.point[1], -1, 1, 0.01, '') +
    '</section><div class="visual-area"><section class="panel plot-card"><div class="plot-pair">' +
    '<div><div class="plot-head"><h2 class="plot-title">' + tr('展开后 · 原始输入', 'Unfolded · Input space') +
    '</h2><span class="plot-subtitle">x₁ / x₂</span></div><div class="canvas-wrap"><canvas id="fold-input" class="clickable-canvas" role="img" aria-label="' +
    tr('原始输入中的分类区域；可点击选择追踪点。', 'Classification regions in input space. Click to choose a point.') +
    '"></canvas></div><p class="plot-caption">' + tr('点一下纸面，选择你想追踪的位置。', 'Click the paper to select a point to follow.') +
    '</p></div><div><div class="plot-head"><h2 class="plot-title" id="fold-stage-title"></h2><span class="plot-subtitle">h₁ / h₂</span>' +
    '</div><div class="canvas-wrap"><canvas id="fold-space" role="img" aria-label="' +
    tr('经过当前阶段变换后的网格与追踪点。', 'The transformed grid and tracked point at this stage.') +
    '"></canvas></div><p class="plot-caption" id="fold-space-caption"></p></div></div>' +
    '<div class="legend"><span><i class="swatch"></i>' + tr('保留 · 分数 ≥ 0', 'Keep · score ≥ 0') +
    '</span><span><i class="swatch green"></i>' + tr('剪去 · 分数 < 0', 'Cut · score < 0') +
    '</span><span><i class="swatch point"></i>' + tr('正在追踪的点', 'Tracked point') +
    '</span></div></section><section class="panel formula-card"><p class="panel-label">' +
    tr('同一套计算 / LIVE MATH', 'THE SAME MATH POWERS EVERY VIEW') +
    '</p><div class="formula" id="fold-formula"></div><div class="formula-values" id="fold-values" aria-live="polite"></div>' +
    '<p class="status-line" id="fold-status"></p></section></div></div>' +
    '<p class="model-note">' + tr('模型说明：每次折叠是一个可由 ReLU 实现的特殊模块，包含线性旁路；参数由你指定，本实验不进行训练。纸张重叠是类比，图案来自实际数值运算。',
      'Model note: each fold is a special ReLU block with a linear skip path. You set the parameters; this experiment does not train a model. The paper metaphor is backed by actual numerical transformations.') +
    '</p>' + challenge(
      tr('把折叠模块增加到 4，再关闭 ReLU。分类边界还能保留“花瓣”吗？',
        'Set the number of folding blocks to 4, then disable ReLU. Will the boundary keep its petals?'),
      tr('不会。关闭 ReLU 后，各模块都是全局线性变换；线性变换复合后仍是线性变换，因此这套模型的分类边界仍是一条直线。',
        'No. Without ReLU, each block is globally linear. Their composition stays linear, so the classifier boundary remains a straight line.'),
      tr('折叠把多个输入位置映射到同一位置。最后一条线性边界，映回输入空间时就可能对应多个线段。这个特定构造展示了深度和非线性如何共同产生复杂图案。',
        'Folding maps different inputs to the same location. A single linear output boundary can then correspond to several segments in input space. This particular construction illustrates how depth and nonlinearity can combine.'),
      reference('https://arxiv.org/abs/1402.1869', 'Montúfar et al. (2014)'));
  }
  function renderGradient() {
    const g = state.gradient;
    return hero('02', 'GRADIENT DESCENT', tr('学习，就是<em>一步步调整。</em>',
      'Learning happens<br><em>one step at a time.</em>'),
    tr('只训练一个参数，也能看见优化的关键。学习率决定步子大小：它会稳稳靠近，还是来回跳动？',
      'One parameter is enough to see optimization at work. The learning rate sets the step size. Will it settle down, bounce, or run away?'),
    tr('梯度 · 学习率', 'Gradients · Learning rates')) +
    '<div class="experiment"><section class="panel controls-panel" aria-label="' + tr('优化参数', 'Optimization controls') +
    '"><p class="panel-label">' + tr('动手改变 / CONTROLS', 'CHANGE SOMETHING') + '</p>' +
    slider('gd-eta', tr('学习率 η', 'Learning rate η'), g.eta, 0.05, 2.5, 0.05,
      tr('修改学习率或起点，会开始新的轨迹。', 'Changing the rate or starting point begins a new trajectory.')) +
    slider('gd-start', tr('初始参数 w₀', 'Starting parameter w₀'), g.start, -3, 4, 0.1, '') +
    '<div class="control full"><div class="control-head">' + tr('试试这些步子', 'Try these step sizes') +
    '</div><div class="preset-row">' +
    [[0.2, tr('稳步靠近', 'Settle')], [1.6, tr('来回靠近', 'Bounce closer')], [2, tr('等幅振荡', 'Oscillate')], [2.2, tr('越走越远', 'Diverge')]].map(p =>
      '<button class="preset" type="button" data-eta="' + p[0] + '" aria-pressed="' + (g.eta === p[0]) + '">' + p[0] + ' · ' + p[1] + '</button>').join('') +
    '</div></div><hr class="divider"><div class="button-row full"><button id="gd-step" class="button primary" type="button">' +
    tr('走一步 →', 'Take a step →') + '</button><button id="gd-play" class="button" type="button">' +
    tr('播放', 'Play') + '</button></div><button id="gd-reset" class="button full" type="button">' + tr('回到起点', 'Reset trajectory') +
    '</button><p class="hint full">' + tr('每次最多演示 40 步。播放时可随时暂停。', 'Up to 40 steps per run. Pause playback at any time.') +
    '</p></section><div class="visual-area"><section class="panel plot-card"><div class="plot-head"><h2 class="plot-title">' +
    tr('一座损失函数的小山谷', 'A small valley of loss') + '</h2><span class="plot-subtitle">L(w) = ½(w − 1)²</span>' +
    '</div><div class="canvas-wrap wide"><canvas id="gd-plot" role="img" aria-label="' +
    tr('二次损失函数和梯度下降轨迹。', 'Quadratic loss curve and gradient descent trajectory.') +
    '"></canvas></div><div class="metric-row" aria-live="polite"><div class="metric"><span>' + tr('当前参数 w', 'Current w') +
    '</span><strong id="gd-w"></strong></div><div class="metric"><span>' + tr('当前损失 L(w)', 'Current loss L(w)') +
    '</span><strong id="gd-loss"></strong></div><div class="metric"><span>' + tr('更新次数', 'Updates') +
    '</span><strong id="gd-count"></strong></div></div><div class="legend"><span><i class="swatch green"></i>' +
    tr('损失曲线', 'Loss curve') + '</span><span><i class="swatch"></i>' + tr('参数更新轨迹', 'Update path') +
    '</span><span><i class="swatch point"></i>' + tr('当前位置', 'Current position') +
    '</span></div></section><section class="panel formula-card"><p class="panel-label">' +
    tr('下一步，怎么算？', 'WHAT IS THE NEXT STEP?') + '</p><div class="formula">∂L/∂w = w − 1<br>w_next = w − η · (w − 1)</div>' +
    '<div class="formula-values" id="gd-values"></div><p class="status-line" id="gd-status" aria-live="polite"></p></section></div></div>' +
    '<p class="model-note">' + tr('模型说明：这是单参数凸二次函数上的精确梯度下降；图中的收敛阈值只适用于当前函数。图轴会随轨迹范围自动缩放。',
      'Model note: exact gradient descent on a one-parameter convex quadratic. The convergence thresholds apply to this function. Axes rescale to include the trajectory.') +
    '</p>' + challenge(
      tr('先选 η = 2，走几步，再试 η = 2.2。损失一定会随着“梯度下降”而下降吗？',
        'Try η = 2 for a few steps, then η = 2.2. Does “gradient descent” always decrease the loss?'),
      tr('不会。对当前函数，误差满足 w_next − 1 = (1 − η)(w − 1)。η = 2 时误差反号但大小不变；η > 2 时，非零误差会放大。',
        'No. Here the error follows w_next − 1 = (1 − η)(w − 1). At η = 2 it changes sign without shrinking. Above 2, any nonzero error grows.'),
      tr('学习率与函数曲率共同决定稳定性。对这条曲线，0 < η < 2 时收敛；η = 1 时一步到达最优点。',
        'Stability depends on both the learning rate and the curvature. For this curve, 0 < η < 2 converges, and η = 1 reaches the minimum in one step.'),
      reference('https://d2l.ai/chapter_optimization/gd.html', tr('动手学深度学习 · 梯度下降', 'Dive into Deep Learning · Gradient descent')));
  }
  function renderConvolution() {
    const c = state.convolution;
    return hero('03', 'CONVOLUTION EXPLORER', tr('移动一扇小窗，<em>看见特征。</em>',
      'Slide a little window.<br><em>Find a feature.</em>'),
    tr('特征图里的一个数字从哪里来？移动卷积核，逐项查看输入与权重的乘积，再把它们加起来。',
      'Where does one number in a feature map come from? Move the kernel, inspect each input-weight product, then add them up.'),
    tr('卷积 · 感受野', 'Convolution · Receptive fields')) +
    '<div class="experiment"><section class="panel controls-panel" aria-label="' + tr('卷积参数', 'Convolution controls') +
    '"><p class="panel-label">' + tr('动手改变 / CONTROLS', 'CHANGE SOMETHING') + '</p>' +
    '<div class="control full"><label class="control-head" for="conv-kernel">' + tr('选择卷积核', 'Choose a kernel') +
    '</label><select id="conv-kernel">' +
    [['edge', tr('垂直边缘', 'Vertical edges')], ['blur', tr('均值模糊', 'Mean blur')], ['sharpen', tr('锐化', 'Sharpen')]].map(p =>
      '<option value="' + p[0] + '"' + (c.kernel === p[0] ? ' selected' : '') + '>' + p[1] + '</option>').join('') +
    '</select></div><div class="control"><label class="control-head" for="conv-stride">' + tr('步幅 s', 'Stride s') +
    '</label><select id="conv-stride"><option value="1"' + (c.stride === 1 ? ' selected' : '') + '>1</option><option value="2"' +
    (c.stride === 2 ? ' selected' : '') + '>2</option></select></div><div class="control"><label class="control-head" for="conv-padding">' +
    tr('零填充 p', 'Zero padding p') + '</label><select id="conv-padding"><option value="0"' + (c.padding === 0 ? ' selected' : '') +
    '>0</option><option value="1"' + (c.padding === 1 ? ' selected' : '') + '>1</option></select></div><hr class="divider">' +
    '<div class="control full"><div class="control-head">' + tr('当前扫描位置', 'Current scan position') +
    '</div><output id="conv-position" class="value"></output></div><button id="conv-next" class="button primary full" type="button">' +
    tr('下一位置 →', 'Next position →') + '</button><button id="conv-reset" class="button full" type="button">' +
    tr('还原输入图案', 'Restore input pattern') + '</button><p class="hint full">' +
    tr('点击输入格子切换 0 / 1；点击输出格子，查看它的感受野。', 'Click an input cell to toggle 0 / 1. Select an output cell to inspect its receptive field.') +
    '</p></section><div class="visual-area"><section class="panel plot-card"><div class="plot-head"><h2 class="plot-title">' +
    tr('一次滑动，一次乘加', 'One window. Nine products. One sum.') + '</h2><span id="conv-size" class="plot-subtitle"></span></div>' +
    '<div class="matrix-layout"><div><p class="matrix-heading" id="input-heading"></p><div class="matrix" id="conv-input"></div></div>' +
    '<div><p class="matrix-heading">' + tr('卷积核', 'Kernel') +
    '</p><div class="matrix kernel" id="conv-weights"></div><p class="kernel-symbol">3 × 3</p></div><div><p class="matrix-heading">' +
    tr('输出特征图', 'Output map') + '</p><div class="matrix" id="conv-output"></div></div></div>' +
    '<div class="legend"><span><i class="swatch"></i>' + tr('描边：当前感受野', 'Outline: current receptive field') +
    '</span><span>' + tr('输出格子的正负号表示响应方向。', 'Output signs indicate response direction.') +
    '</span></div></section><section class="panel formula-card"><p class="panel-label">' + tr('这个数字，从这里来', 'WHERE THIS NUMBER COMES FROM') +
    '</p><div id="conv-terms" class="terms"></div><div id="conv-total" class="conv-total" aria-live="polite"></div>' +
    '<div class="formula-values" id="conv-formula"></div></section></div></div><p class="model-note">' +
    tr('模型说明：单通道、3 × 3 卷积核、不加偏置、不接激活函数。采用 CNN 常用的互相关运算，卷积核不翻转；虚线格子是补入的零。',
      'Model note: one channel, a 3 × 3 kernel, no bias or activation. This uses the CNN cross-correlation convention: the kernel is not flipped. Dashed cells are zero padding.') +
    '</p>' + challenge(
      tr('保持输入为 5 × 5、卷积核为 3 × 3。把步幅改为 2、填充改为 1，输出是几乘几？',
        'Keep the 5 × 5 input and 3 × 3 kernel. Set stride to 2 and padding to 1. What is the output size?'),
      tr('3 × 3。每个方向的大小都是 floor((5 + 2 × 1 − 3) / 2) + 1 = 3。点选右下角的输出，检查补零如何参与计算。',
        '3 × 3. Each dimension is floor((5 + 2 × 1 − 3) / 2) + 1 = 3. Select the bottom-right output to see how padded zeros enter the calculation.'),
      tr('一个输出值只依赖一小片输入，这片区域叫感受野。同一组核权重在不同位置复用；步幅决定每次移动多远。',
        'Each output depends on a small input patch: its receptive field. The same kernel weights are reused at every position. Stride controls how far the window moves.'),
      reference('https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html', tr('卷积运算', 'Convolution')) +
      reference('https://d2l.ai/chapter_convolutional-neural-networks/padding-and-strides.html', tr('填充与步幅', 'Padding & stride')));
  }
  function bindRange(id, handler) {
    $(id).addEventListener('input', e => { handler(Number(e.target.value)); update(); });
  }
  function stopPlayback() {
    if (state.gradient.timer !== null) clearInterval(state.gradient.timer);
    state.gradient.timer = null;
  }
  function resetGradient() {
    stopPlayback();
    state.gradient.history = [state.gradient.start];
  }
  function stepGradient() {
    const g = state.gradient;
    if (g.history.length >= 41) { stopPlayback(); update(); return; }
    g.history.push(M.gdStep(g.history.at(-1), g.eta));
    if (g.history.length >= 41) stopPlayback();
    update();
  }
  function bind() {
    if (state.topic === 'fold') {
      bindRange('fold-depth', v => { state.fold.depth = v; state.fold.stage = v; });
      bindRange('fold-angle', v => { state.fold.angle = v; });
      bindRange('fold-threshold', v => { state.fold.threshold = v; });
      bindRange('point-x', v => { state.fold.point[0] = v; });
      bindRange('point-y', v => { state.fold.point[1] = v; });
      $('fold-nonlinear').addEventListener('change', e => { state.fold.nonlinear = e.target.checked; update(); });
      $('fold-prev').onclick = () => { state.fold.stage = Math.max(0, state.fold.stage - 1); update(); };
      $('fold-next').onclick = () => { state.fold.stage = Math.min(state.fold.depth, state.fold.stage + 1); update(); };
      $('fold-input').addEventListener('click', e => {
        const p = frameFor('fold-input', false), rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left - p.left) / p.pw * 3.1 - 1.55;
        const y = 1.55 - (e.clientY - rect.top - p.top) / p.ph * 3.1;
        state.fold.point = [x, y].map(v => Math.round(Math.max(-1, Math.min(1, v)) * 100) / 100);
        update();
      });
    } else if (state.topic === 'gradient') {
      bindRange('gd-eta', v => { state.gradient.eta = v; resetGradient(); });
      bindRange('gd-start', v => { state.gradient.start = v; resetGradient(); });
      document.querySelectorAll('[data-eta]').forEach(button => button.addEventListener('click', () => {
        state.gradient.eta = Number(button.dataset.eta); resetGradient(); update();
      }));
      $('gd-step').onclick = () => { stopPlayback(); stepGradient(); };
      $('gd-reset').onclick = () => { resetGradient(); update(); };
      $('gd-play').onclick = () => {
        if (state.gradient.timer !== null) stopPlayback();
        else if (state.gradient.history.length < 41) state.gradient.timer = setInterval(stepGradient, 550);
        update();
      };
    } else {
      ['kernel', 'stride', 'padding'].forEach(key => $('conv-' + key).addEventListener('change', e => {
        state.convolution[key] = key === 'kernel' ? e.target.value : Number(e.target.value);
        state.convolution.selected = 0; update();
      }));
      $('conv-next').onclick = () => {
        const c = state.convolution, result = M.correlate(c.input, M.KERNELS[c.kernel], c.stride, c.padding);
        c.selected = (c.selected + 1) % result.patches.length; update();
      };
      $('conv-reset').onclick = () => { state.convolution.input = M.defaultImage(); update(); };
      $('conv-input').addEventListener('click', e => {
        const button = e.target.closest('[data-input]');
        if (!button) return;
        const [r, c] = button.dataset.input.split(',').map(Number);
        state.convolution.input[r][c] = 1 - state.convolution.input[r][c]; update();
        document.querySelector('[data-input="' + r + ',' + c + '"]').focus({ preventScroll: true });
      });
      $('conv-output').addEventListener('click', e => {
        const button = e.target.closest('[data-output]');
        if (!button) return;
        state.convolution.selected = Number(button.dataset.output); update();
        document.querySelector('[data-output="' + state.convolution.selected + '"]').focus({ preventScroll: true });
      });
    }
  }
  function updateFold() {
    const f = state.fold;
    ['depth', 'angle', 'threshold'].forEach(k => {
      $('fold-' + k + '-value').textContent = fmt(f[k]) + (k === 'angle' ? '°' : '');
      $('fold-' + k).value = f[k];
    });
    ['x', 'y'].forEach((k, i) => { $('point-' + k).value = f.point[i]; $('point-' + k + '-value').textContent = fmt(f.point[i]); });
    $('fold-stage').textContent = tr('阶段 ', 'Stage ') + f.stage + ' / ' + f.depth;
    $('fold-prev').disabled = f.stage === 0;
    $('fold-next').disabled = f.stage === f.depth;
    $('fold-stage-title').textContent = f.stage === 0 ? tr('输入旋转后', 'After input rotation') :
      tr('折叠到第 ', 'After block ') + f.stage + tr(' 个模块', '');
    $('fold-space-caption').textContent = f.stage === f.depth ?
      tr('虚线是最终输出层的直线边界。', 'The dashed line is the linear output boundary.') :
      tr('网格随空间移动；颜色始终表示最终分类。', 'The grid moves; colors always show the final classification.');
    const trace = M.foldTrace(f.point, f.depth, f.angle, f.nonlinear), current = trace[f.stage];
    const score = M.cutScore(trace.at(-1).point, f.threshold);
    $('fold-formula').textContent = f.nonlinear ? "p′ = p + 2 · ReLU(−n · p) · n" : "p′ = p + 2 · (−n · p) · n";
    const blockText = f.stage === 0 ? tr('输入旋转 ', 'Input rotation ') + f.angle + '°' :
      'n = ' + pair(current.normal) + ' · z = n · p = ' + fmt(current.z, 3) + ' · ' +
      (f.nonlinear ? 'ReLU(−z)' : '−z') + ' = ' + fmt(current.activation, 3);
    $('fold-values').textContent = blockText + ' ｜ ' + tr('原始点 ', 'Input ') + pair(f.point) + ' → ' +
      tr('当前点 ', 'Current ') + pair(current.point);
    $('fold-status').textContent = tr('最终输出：', 'Final output: ') + 'h₁ − 0.5h₂ − ' + fmt(f.threshold) + ' = ' +
      fmt(score, 3) + ' → ' + (score >= 0 ? tr('保留', 'Keep') : tr('剪去', 'Cut'));
    drawFold();
  }
  function updateGradient() {
    const g = state.gradient, w = g.history.at(-1);
    $('gd-eta').value = g.eta; $('gd-eta-value').textContent = fmt(g.eta);
    $('gd-start').value = g.start; $('gd-start-value').textContent = fmt(g.start);
    document.querySelectorAll('[data-eta]').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.eta) === g.eta));
    $('gd-w').textContent = fmt(w, 5); $('gd-loss').textContent = fmt(M.loss(w), 5);
    $('gd-count').textContent = g.history.length - 1;
    $('gd-values').textContent = tr('在当前位置：梯度 = ', 'At the current position: gradient = ') + fmt(M.gradient(w), 5) +
      ' ｜ ' + tr('下一步 w = ', 'Next w = ') + fmt(w, 5) + ' − ' + fmt(g.eta) + ' × (' + fmt(M.gradient(w), 5) +
      ') = ' + fmt(M.gdStep(w, g.eta), 5);
    let message = '';
    if (g.start === 1) message = tr('起点已在最优点，梯度为 0，参数保持不变。', 'The starting point is already optimal: zero gradient, no movement.');
    else if (g.eta === 1) message = tr('η = 1：这条曲线上，一步就能到达 w = 1。', 'η = 1 reaches w = 1 in a single step on this curve.');
    else if (g.eta < 1) message = tr('0 < η < 1：从同一侧逐步靠近 w = 1。', '0 < η < 1 approaches w = 1 from the same side.');
    else if (g.eta < 2) message = tr('1 < η < 2：在最优点两侧来回靠近。', '1 < η < 2 bounces across the minimum with shrinking error.');
    else if (g.eta === 2) message = tr('η = 2：在两点间等幅振荡，损失保持不变。', 'η = 2 oscillates between two points with unchanged loss.');
    else message = tr('η > 2：步子太大，误差与损失逐步增大。', 'η > 2 takes steps that are too large; error and loss grow.');
    if (g.history.length >= 41) message += tr(' 已完成 40 步，可重置再试。', ' 40 steps completed; reset to try again.');
    $('gd-status').textContent = message;
    $('gd-status').classList.toggle('warn', g.eta >= 2 && g.start !== 1);
    $('gd-play').textContent = g.timer === null ? tr('播放', 'Play') : tr('暂停', 'Pause');
    $('gd-play').setAttribute('aria-pressed', g.timer !== null);
    $('gd-step').disabled = g.history.length >= 41;
    $('gd-play').disabled = g.history.length >= 41;
    drawGradient();
  }
  function updateConvolution() {
    const c = state.convolution, kernel = M.KERNELS[c.kernel];
    const result = M.correlate(c.input, kernel, c.stride, c.padding);
    c.selected = Math.min(c.selected, result.patches.length - 1);
    const patch = result.patches[c.selected];
    const active = new Set(patch.terms.map(term => term.row + ',' + term.col));
    const size = 5 + 2 * c.padding;
    $('conv-input').style.gridTemplateColumns = 'repeat(' + size + ', minmax(0, 1fr))';
    let cells = '';
    for (let r = -c.padding; r < 5 + c.padding; r++) for (let col = -c.padding; col < 5 + c.padding; col++) {
      const padded = r < 0 || col < 0 || r >= 5 || col >= 5, value = padded ? 0 : c.input[r][col];
      const classes = 'matrix-cell' + (value ? ' on' : '') + (active.has(r + ',' + col) ? ' patch' : '') + (padded ? ' padding' : '');
      if (padded) cells += '<span class="' + classes + '" aria-label="' + tr('填充值 0', 'Padded zero') + '">0</span>';
      else cells += '<button class="' + classes + '" type="button" data-input="' + r + ',' + col + '" aria-label="' +
        tr('输入 第 ', 'Input row ') + (r + 1) + tr(' 行，第 ', ', column ') + (col + 1) + tr(' 列，值 ', ', value ') + value +
        '" aria-pressed="' + Boolean(value) + '">' + value + '</button>';
    }
    $('conv-input').innerHTML = cells;
    $('conv-weights').style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    $('conv-weights').innerHTML = kernel.flat().map(v => '<span class="matrix-cell">' + (c.kernel === 'blur' ? '1/9' : v) + '</span>').join('');
    $('conv-output').style.gridTemplateColumns = 'repeat(' + result.width + ', minmax(0, 1fr))';
    $('conv-output').innerHTML = result.patches.map((p, i) => '<button type="button" data-output="' + i +
      '" class="matrix-cell ' + (p.value > 0 ? 'positive' : p.value < 0 ? 'negative' : '') + (i === c.selected ? ' selected' : '') +
      '" aria-pressed="' + (i === c.selected) + '" aria-label="' + tr('输出 第 ', 'Output row ') + (p.row + 1) +
      tr(' 行，第 ', ', column ') + (p.col + 1) + tr(' 列，值 ', ', value ') + fmt(p.value, 3) + '">' + fmt(p.value, 2) + '</button>').join('');
    $('conv-position').textContent = (c.selected + 1) + ' / ' + result.patches.length + ' · ' +
      tr('输出坐标 ', 'Output index ') + '(' + patch.row + ', ' + patch.col + ')';
    $('conv-size').textContent = '5 × 5 → ' + result.height + ' × ' + result.width;
    $('input-heading').textContent = tr('输入图像', 'Input image') + (c.padding ? tr(' + 补零', ' + padding') : '');
    $('conv-terms').innerHTML = patch.terms.map(term => '<div class="term">' + term.pixel + ' × ' +
      (c.kernel === 'blur' ? '(1/9)' : '(' + fmt(term.weight) + ')') + ' = ' + fmt(term.product, 3) + '</div>').join('');
    $('conv-total').textContent = tr('九项相加 = ', 'Sum of nine products = ') + fmt(patch.value, 5);
    $('conv-formula').textContent = tr('输出大小：', 'Output size: ') + 'floor((5 + 2 × ' + c.padding + ' − 3) / ' + c.stride +
      ') + 1 = ' + result.height + tr('（每个方向）', ' in each dimension');
  }
  function theme() {
    const css = getComputedStyle(document.documentElement);
    const get = name => css.getPropertyValue('--' + name).trim();
    return { ink: get('ink'), muted: get('muted'), grid: get('grid'), surface: get('surface'),
      accent: get('accent-fill'), accentSoft: get('accent-soft'), green: get('green'), greenSoft: get('green-soft'), blue: get('blue') };
  }
  function frameFor(id, clear = true, domain) {
    const canvas = $(id), rect = canvas.getBoundingClientRect();
    const w = rect.width || 300, h = rect.height || w, ratio = window.devicePixelRatio || 1;
    if (clear) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
    const ctx = canvas.getContext('2d');
    if (clear) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const left = id === 'gd-plot' ? 57 : 31, right = 17, top = 20, bottom = 31;
    const pw = w - left - right, ph = h - top - bottom;
    const d = domain || [-1.55, 1.55, -1.55, 1.55];
    return { canvas, ctx, w, h, left, top, pw, ph, d,
      x: v => left + (v - d[0]) / (d[1] - d[0]) * pw,
      y: v => top + (d[3] - v) / (d[3] - d[2]) * ph };
  }
  function axes(p, colors, xLabel, yLabel, ticks) {
    const { ctx, left, top, pw, ph, w, h, d } = p;
    ctx.lineWidth = 0.65; ctx.strokeStyle = colors.grid; ctx.fillStyle = colors.muted; ctx.font = '11px "Segoe UI",sans-serif';
    const xt = ticks ? ticks[0] : [-1, 0, 1], yt = ticks ? ticks[1] : [-1, 0, 1];
    xt.forEach(v => { const x = p.x(v); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + ph); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(fmt(v), x, top + ph + 16); });
    yt.forEach(v => { const y = p.y(v); ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + pw, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(fmt(v), left - 7, y + 3); });
    ctx.strokeRect(left, top, pw, ph);
    ctx.fillStyle = colors.ink; ctx.textAlign = 'right'; ctx.fillText(xLabel, w - 3, h - 1);
    ctx.textAlign = 'left'; ctx.fillText(yLabel, 3, 11);
  }
  function dot(p, point, color, radius = 4) {
    const { ctx } = p;
    ctx.beginPath(); ctx.arc(p.x(point[0]), p.y(point[1]), radius, 0, 2 * Math.PI);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = theme().surface; ctx.stroke();
  }
  function drawFold() {
    if (!$('fold-input')) return;
    const f = state.fold, colors = theme(), input = frameFor('fold-input'), space = frameFor('fold-space');
    // Sample the original paper; classification uses the same foldPoint as the point inspector.
    const n = 76, step = 2 / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = -1 + c * step, y = -1 + r * step;
      const output = M.foldPoint([x + step / 2, y + step / 2], f.depth, f.angle, f.nonlinear);
      input.ctx.fillStyle = M.cutScore(output, f.threshold) >= 0 ? colors.accentSoft : colors.greenSoft;
      input.ctx.fillRect(input.x(x), input.y(y + step), step / 3.1 * input.pw + 0.5, step / 3.1 * input.ph + 0.5);
    }
    axes(input, colors, 'x₁', 'x₂'); axes(space, colors, 'h₁', 'h₂');
    // Each polyline is transformed point by point, so creases remain actual model behavior.
    for (let axis = 0; axis < 2; axis++) for (let line = -1; line <= 1.001; line += 0.2) {
      space.ctx.beginPath(); space.ctx.strokeStyle = colors.green; space.ctx.globalAlpha = 0.35; space.ctx.lineWidth = 0.8;
      for (let j = 0; j <= 80; j++) {
        const v = -1 + 2 * j / 80, source = axis === 0 ? [line, v] : [v, line];
        const q = M.foldPoint(source, f.stage, f.angle, f.nonlinear);
        if (j === 0) space.ctx.moveTo(space.x(q[0]), space.y(q[1])); else space.ctx.lineTo(space.x(q[0]), space.y(q[1]));
      }
      space.ctx.stroke(); space.ctx.globalAlpha = 1;
    }
    for (let r = 0; r <= 14; r++) for (let c = 0; c <= 14; c++) {
      const source = [-1 + 2 * c / 14, -1 + 2 * r / 14];
      const q = M.foldPoint(source, f.stage, f.angle, f.nonlinear);
      const final = M.foldPoint(source, f.depth, f.angle, f.nonlinear);
      const color = M.cutScore(final, f.threshold) >= 0 ? colors.accent : colors.green;
      space.ctx.fillStyle = color; space.ctx.beginPath(); space.ctx.arc(space.x(q[0]), space.y(q[1]), 1.6, 0, 2 * Math.PI); space.ctx.fill();
      input.ctx.fillStyle = color; input.ctx.beginPath(); input.ctx.arc(input.x(source[0]), input.y(source[1]), 1.25, 0, 2 * Math.PI); input.ctx.fill();
    }
    if (f.stage === f.depth) {
      space.ctx.save(); space.ctx.beginPath(); space.ctx.rect(space.left, space.top, space.pw, space.ph); space.ctx.clip();
      space.ctx.strokeStyle = colors.ink; space.ctx.lineWidth = 1.4; space.ctx.setLineDash([5, 4]);
      space.ctx.beginPath(); space.ctx.moveTo(space.x(f.threshold - 0.5 * 1.55), space.y(-1.55));
      space.ctx.lineTo(space.x(f.threshold + 0.5 * 1.55), space.y(1.55)); space.ctx.stroke(); space.ctx.restore();
    }
    dot(input, f.point, colors.blue, 5);
    const selected = M.foldPoint(f.point, f.stage, f.angle, f.nonlinear);
    dot(space, selected, colors.blue, 5);
    $('fold-space').setAttribute('aria-label', tr('当前阶段 ', 'Stage ') + f.stage + tr('，追踪点 ', ', tracked point ') + pair(selected));
  }
  function drawGradient() {
    if (!$('gd-plot')) return;
    const g = state.gradient, colors = theme(), values = g.history.concat([1]);
    let lo = Math.min(...values), hi = Math.max(...values), span = Math.max(hi - lo, 2);
    lo -= span * 0.15; hi += span * 0.15;
    if (hi - lo < 2) { lo = 0; hi = 2; }
    const ymax = Math.max(M.loss(lo), M.loss(hi), 0.5) * 1.08;
    const p = frameFor('gd-plot', true, [lo, hi, -ymax * 0.03, ymax]);
    const xt = Array.from({ length: 4 }, (_, i) => lo + (hi - lo) * i / 3);
    const yt = [0, ymax * 0.45, ymax * 0.9];
    axes(p, colors, 'w', 'L(w)', [xt, yt]);
    const ctx = p.ctx;
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = colors.green;
    for (let i = 0; i <= 150; i++) {
      const w = lo + (hi - lo) * i / 150;
      if (i === 0) ctx.moveTo(p.x(w), p.y(M.loss(w))); else ctx.lineTo(p.x(w), p.y(M.loss(w)));
    }
    ctx.stroke();
    ctx.beginPath(); ctx.lineWidth = 1.3; ctx.strokeStyle = colors.accent;
    g.history.forEach((w, i) => { if (i === 0) ctx.moveTo(p.x(w), p.y(M.loss(w))); else ctx.lineTo(p.x(w), p.y(M.loss(w))); });
    ctx.stroke();
    g.history.forEach((w, i) => { if (i < g.history.length - 1) dot(p, [w, M.loss(w)], colors.accent, 2.5); });
    const w = g.history.at(-1); dot(p, [1, 0], colors.green, 4); dot(p, [w, M.loss(w)], colors.blue, 6);
    $('gd-plot').setAttribute('aria-label', tr('更新次数 ', 'Updates ') + (g.history.length - 1) + ', w = ' + fmt(w, 5) + ', L(w) = ' + fmt(M.loss(w), 5));
  }
  function drawAll() {
    if (state.topic === 'fold') drawFold();
    if (state.topic === 'gradient') drawGradient();
  }
  function update() {
    if (state.topic === 'fold') updateFold();
    else if (state.topic === 'gradient') updateGradient();
    else updateConvolution();
  }
  function render() {
    stopPlayback(); renderChrome();
    $('main').innerHTML = state.topic === 'fold' ? renderFold() : state.topic === 'gradient' ? renderGradient() : renderConvolution();
    bind(); update();
  }
  $('language').onclick = () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    try {
      const url = new URL(location.href); url.searchParams.set('lang', state.lang);
      history.replaceState(null, '', url.href);
    } catch (_) { /* some file URL contexts disallow replaceState */ }
    render();
  };
  window.addEventListener('hashchange', () => {
    const topic = location.hash.slice(1);
    state.topic = topics.includes(topic) ? topic : 'fold'; render();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopPlayback(); if (state.topic === 'gradient') updateGradient(); }
  });
  new ResizeObserver(() => requestAnimationFrame(drawAll)).observe($('main'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawAll);
  render();
})();
