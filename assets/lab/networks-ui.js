(function () {
  'use strict';

  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const tr = (lang, zh, en) => lang === 'en' ? en : zh;
  const localized = (value, lang) => typeof value === 'string' ? value : value && (value[lang] || value.zh || value.en) || '';
  const fmt = value => value === null || !Number.isFinite(value) ? '−∞' : Math.abs(value) < 0.00005 ? '0' : String(Number(value.toFixed(3)));
  const shape = value => Array.isArray(value) ? value.join(' × ') : String(value);
  const saved = Object.create(null);
  const copy = {
    cnn: {
      number: '04', eyebrow: 'CNN / FEATURE PIPELINE', title: ['从像素出发，<em>一层层提取特征。</em>', 'From pixels to <em>useful features.</em>'],
      intro: ['跟着一幅 8 × 8 小图像经过卷积、ReLU 和池化。每一格都是真实前向计算的结果，点击任意一层，就能查看数值如何改变。', 'Follow an 8 × 8 image through convolution, ReLU and pooling. Every cell is computed by a real forward pass. Select a layer to inspect its output.'],
      question: ['卷积响应图里有负数。经过 ReLU 后，这些格子会变成什么？', 'The convolution map contains negative values. What happens to those cells after ReLU?'],
      answer: ['ReLU 逐格计算 max(0, x)：负数变成 0，正数保持不变。比较「卷积提取」和「ReLU 激活」两层即可验证。后续最大池化再从每个 2 × 2 窗口取最大值，会舍弃部分位置与细节。', 'ReLU applies max(0, x) cell by cell: negative values become zero and positive values stay unchanged. Compare the Convolution and ReLU stages. Max pooling then keeps the largest value in each 2 × 2 window, discarding some location and detail.'],
      citation: ['https://docs.pytorch.org/tutorials/beginner/blitz/neural_networks_tutorial.html', 'PyTorch · Neural Networks'],
      scope: ['单个固定卷积核的微型 CNN；权重未训练，输出概率只用于展示计算流程，不代表图像识别能力。', 'A tiny CNN with one fixed convolution kernel. Its weights are untrained; the output probabilities illustrate computation, not recognition accuracy.']
    },
    resnet: {
      number: '05', eyebrow: 'RESNET / THE SHORTCUT', title: ['让输入走一条<em>捷径。</em>', 'Give the input <em>a shortcut.</em>'],
      intro: ['观察残差分支 F(x) 与原始输入 x 在加法节点汇合。关闭捷径或把残差归零，对照真实数值，理解 y = x + F(x)。', 'Watch the residual branch F(x) meet the original input x at an addition. Toggle the shortcut or set the residual to zero to inspect y = x + F(x).'],
      question: ['把 F(x) 设为 0 后，打开和关闭捷径会有什么不同？', 'If F(x) is zero, what changes when the shortcut is on?'],
      answer: ['打开捷径时，加法节点输出 y = x；关闭时，输出变成 0。捷径为信号和梯度提供直接路径，但不能单凭这幅前向动画证明训练一定更容易。', 'With the shortcut on, the addition produces y = x. Without it, the output is zero. Shortcuts provide a direct path for signals and gradients; this forward demo alone does not demonstrate training performance.'],
      citation: ['https://arxiv.org/abs/1512.03385', 'He et al. · Deep Residual Learning (2015)'],
      scope: ['一个固定权重的微型残差块与分类头，省略完整 ResNet 的卷积堆叠和训练过程。', 'One tiny residual block and a classification head with fixed weights; full ResNet convolution stacks and training are omitted.']
    },
    transformer: {
      number: '06', eyebrow: 'TRANSFORMER / SELF-ATTENTION', title: ['一个词，怎样<em>看见上下文？</em>', 'How does a token <em>read its context?</em>'],
      intro: ['跟着 3 个词元走过 Q、K、V、自注意力与前馈层。选中一个 Query，查看它分配给各个词元的权重，再比较因果遮罩的影响。', 'Follow 3 tokens through Q, K, V, self-attention and a feed-forward layer. Select a query to inspect its attention weights, then compare causal masking.'],
      question: ['启用因果遮罩后，第一个词元可以关注谁？', 'With causal masking, which tokens can the first token attend to?'],
      answer: ['它只能关注自己，因为后续位置被遮住，softmax 后权重为 0。注意力权重是本次计算中的混合系数，不能直接等同于词语的重要性或因果解释。', 'Only itself: later positions are masked and receive zero weight after softmax. Attention weights are mixing coefficients in this computation, not a direct measure of token importance or causality.'],
      citation: ['https://arxiv.org/abs/1706.03762', 'Vaswani et al. · Attention Is All You Need (2017)'],
      scope: ['3 个词元、4 维表示、单头自注意力的微型编码块；固定未训练权重，未实现完整语言模型。因果遮罩是用于比较的可选实验。', 'A tiny encoder block with 3 tokens, 4 features and one attention head. Fixed untrained weights; not a complete language model. Causal masking is an optional comparison.']
    }
  };
  function topicCopy(topic, key, lang) { return copy[topic][key][lang === 'en' ? 1 : 0]; }
  function render(topic, lang) {
    if (!copy[topic]) throw new Error('Unknown network topic: ' + topic);
    const t = (zh, en) => tr(lang, zh, en);
    const options = topic === 'resnet' ? '<div class="net-options"><label class="net-toggle"><input id="net-skip" type="checkbox" checked><span class="net-switch" aria-hidden="true"></span><span>' + t('保留捷径 x', 'Keep shortcut x') + '</span></label><label class="net-toggle"><input id="net-zero" type="checkbox"><span class="net-switch" aria-hidden="true"></span><span>' + t('令 F(x) = 0', 'Set F(x) = 0') + '</span></label></div>' : topic === 'transformer' ? '<div class="net-options"><label class="net-toggle"><input id="net-causal" type="checkbox"><span class="net-switch" aria-hidden="true"></span><span>' + t('因果遮罩', 'Causal mask') + '</span></label><p class="net-option-note">' + t('遮住后续位置，比较注意力如何变化。', 'Hide future positions and compare attention.') + '</p></div>' : '';
    const tools = topic === 'cnn' ? '<div class="net-options net-input-tools"><span>' + t('输入图案', 'Input pattern') + '</span><button class="button" data-net-pattern="default">' + t('默认', 'Default') + '</button><button class="button" data-net-pattern="horizontal">' + t('横线', 'Horizontal') + '</button><button class="button" data-net-pattern="empty">' + t('清空', 'Clear') + '</button><button class="button" id="net-edit-input">' + t('编辑像素', 'Edit pixels') + '</button></div>' : topic === 'resnet' ? '<label class="net-strength-label" for="net-strength">' + t('残差强度 α', 'Residual strength α') + ' <output id="net-strength-value">1</output><input id="net-strength" type="range" min="0" max="2" step="0.1" value="1"></label>' : '<div class="net-options net-input-tools"><span>' + t('手工向量', 'Hand-set vectors') + '</span><button class="button" data-net-scenario="default">' + t('默认', 'Default') + '</button><button class="button" data-net-scenario="contrast">' + t('加强词元 1', 'Strengthen token 1') + '</button><small>' + t('仅改变教学向量，不表示理解句意。', 'Teaching vectors, not learned language understanding.') + '</small></div>';
    return '<section class="hero"><div><p class="eyebrow">' + copy[topic].number + ' / ' + copy[topic].eyebrow + '</p><h2 class="lesson-heading">' + topicCopy(topic, 'title', lang) + '</h2><p class="intro">' + topicCopy(topic, 'intro', lang) + '</p></div><span class="lesson-tag">' + t('逐层动画', 'Layer by layer') + '</span></section>' +
      '<div id="network-lab" class="net-lab" data-network="' + topic + '"><section class="panel net-toolbar" aria-label="' + t('动画控制', 'Animation controls') + '"><div class="net-playback"><button class="button primary" id="net-play" type="button" aria-pressed="false">▶ ' + t('播放', 'Play') + '</button><button class="button" id="net-prev" type="button">← ' + t('上一步', 'Previous') + '</button><button class="button" id="net-next" type="button">' + t('下一步', 'Next') + ' →</button><button class="button" id="net-reset" type="button">↺ ' + t('重置', 'Reset') + '</button></div><p id="net-stage-current" class="net-progress" aria-live="polite"></p>' + options + '</section>' +
      tools + '<details id="net-overview" class="panel net-flow-card"><summary id="net-flow-title">' + t('查看网络总览 / 跳到任意一层', 'Network overview / jump to a layer') + '</summary><div class="net-flow"><svg id="net-flow-lines" aria-hidden="true"></svg><div id="net-flow-nodes" class="net-flow-nodes"></div></div><p class="net-flow-note">' + (topic === 'transformer' ? t('Q、K、V 来自同一输入的并行分支；序号仅用于逐步查看。', 'Q, K and V are parallel projections of one input; numbering is for inspection.') : t('亮色节点是当前层；箭头表示真实的数据依赖。', 'The highlighted node is the current layer; arrows show actual data dependencies.')) + '</p></details>' +
      '<section id="net-residual" class="panel net-extra" hidden></section><section id="net-attention" class="panel net-extra" hidden></section>' +
      '<section class="net-comparison" aria-label="' + t('当前层的输入与输出', 'Current layer input and output') + '"><div class="panel net-tensor-card" id="net-before"></div><div class="panel net-tensor-card net-output" id="net-after"></div></section>' +
      '<section class="panel net-explanation"><div class="net-card-head"><h3 id="net-detail-title"></h3><span id="net-detail-shape" class="net-shape"></span></div><p id="net-detail-description"></p><div id="net-detail-formula" class="net-formula"></div><details class="net-weights"><summary>' + t('查看固定权重与参数（未经训练）', 'Inspect fixed weights and parameters (untrained)') + '</summary><div id="net-weights-grid" class="net-weights-grid"></div></details><p id="net-scope" class="net-scope">' + topicCopy(topic, 'scope', lang) + '</p></section>' +
      '<div class="learning-row"><section class="learning-card"><h3>' + t('先猜一猜，再试一试', 'Predict, then experiment') + '</h3><p>' + topicCopy(topic, 'question', lang) + '</p><details><summary>' + t('查看解释', 'Reveal explanation') + '</summary><p class="answer">' + topicCopy(topic, 'answer', lang) + '</p></details></section><section class="learning-card"><h3>' + t('继续阅读', 'Continue reading') + '</h3><p>' + t('这里演示网络中的核心运算，完整架构请参考原始资料。', 'This demo isolates core operations. Consult the original reference for the complete architecture.') + '</p><div class="reading"><a href="' + copy[topic].citation[0] + '" target="_blank" rel="noopener noreferrer">' + copy[topic].citation[1] + ' ↗</a></div></section></div></div>';
  }
  function matrixHTML(values, lang, queryIndex, options = {}) {
    const rows = !Array.isArray(values) ? [[values]] : !Array.isArray(values[0]) ? [values] : values;
    const max = options.max || Math.max(0.000001, ...rows.flat().filter(Number.isFinite).map(Math.abs));
    const columns = Math.max(...rows.map(row => row.length), 1);
    return '<div class="net-matrix" role="table" aria-label="' + tr(lang, '计算结果，逐行排列', 'Computed values in row order') + '" style="--net-cols:' + columns + '">' + rows.map((row, r) => '<div class="net-matrix-row' + (queryIndex === r ? ' net-query-row' : '') + '" role="row">' + row.map((value, c) => {
      const key = r + ',' + c;
      const classes = 'net-cell' + (value === null ? ' net-masked' : '') + ((options.highlight || []).includes(key) ? ' net-source-cell' : '') + ((options.winners || []).includes(key) ? ' net-winner' : '') + (options.selected === key ? ' net-cell-selected' : '');
      const attributes = ' class="' + classes + '" title="' + tr(lang, '行 ', 'Row ') + (r + 1) + ', ' + tr(lang, '列 ', 'column ') + (c + 1) + ': ' + fmt(value) + '" style="--net-strength:' + (value === null || value === 0 ? 0 : Math.max(0.05, Math.abs(value) / max) * 0.42) + ';--net-cell-color:var(' + (value < 0 ? '--blue' : '--accent-fill') + ')"';
      return options.interactive ? '<span role="cell" class="net-cell-wrap"><button type="button" data-net-cell="' + key + '" aria-label="' + tr(lang, '检查行 ', 'Inspect row ') + (r + 1) + ', ' + tr(lang, '列 ', 'column ') + (c + 1) + ', ' + fmt(value) + '"' + attributes + '>' + fmt(value) + '</button></span>' : '<span role="cell"' + attributes + '>' + fmt(value) + '</span>';
    }).join('') + '</div>').join('') + '</div>';
  }
  function tensorHTML(stage, caption, lang, emptyText, options = {}) {
    if (!stage) return '<div class="net-card-head"><h3>' + caption + '</h3></div><div class="net-empty">' + emptyText + '</div>';
    return '<div class="net-card-head"><h3>' + caption + '</h3><span class="net-shape">' + esc(shape(stage.shape)) + '</span></div><p class="net-tensor-name">' + esc(localized(stage.label, lang)) + '</p>' + matrixHTML(stage.values, lang, undefined, options) + '<p class="net-number-note">' + tr(lang, '显示到 3 位小数；本步输入/输出共用色标。', 'Rounded to 3 decimals; this step uses a shared input/output color scale.') + '</p>';
  }
  function mount(container, topic, lang) {
    const root = container.matches && container.matches('#network-lab') ? container : container.querySelector('#network-lab');
    if (!root) throw new Error('Network lab container is missing');
    const $ = id => root.querySelector('#' + id);
    const t = (zh, en) => tr(lang, zh, en);
    const workbench = document.createElement('div'); workbench.id = 'net-workbench';
    root.insertBefore(workbench, $('net-residual'));
    workbench.append(root.querySelector('.net-explanation'), root.querySelector('.net-comparison'));
    const trace = document.createElement('section'); trace.id = 'net-trace'; trace.className = 'panel net-trace'; trace.hidden = true; workbench.append(trace, $('net-residual'), $('net-attention'));
    const more = document.createElement('details'); more.className = 'panel net-more'; more.innerHTML = '<summary>' + t('模型范围与固定参数', 'Model scope and fixed parameters') + '</summary>'; more.append(root.querySelector('.net-weights'), $('net-scope')); workbench.append(more);
    const initial = saved[topic] || {};
    let stageIndex = initial.stageIndex || 0, queryIndex = initial.queryIndex || 0, timer = null, destroyed = false, lastIndex = -1;
    let result, skip = initial.skip !== false, zeroResidual = initial.zeroResidual === true, causal = initial.causal === true;
    let input = initial.input, strength = initial.strength === undefined ? 1 : initial.strength, scenario = initial.scenario || 'default', selected = initial.selected || [0, 0], featureIndex = initial.featureIndex || 0;
    function remember() { saved[topic] = { stageIndex, queryIndex, skip, zeroResidual, causal, input, strength, scenario, selected, featureIndex }; }
    let reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function compute() {
      const model = window.DLNetworks;
      if (!model) throw new Error('DLNetworks is not loaded');
      result = topic === 'cnn' ? model.cnnForward({ input }) : topic === 'resnet' ? model.resnetForward({ skip, zeroResidual, strength }) : model.transformerForward({ causal, scenario });
      $('net-weights-grid').innerHTML = Object.entries(result.weights).map(([key, value]) => '<div class="net-weight-matrix"><p class="net-mini-label">' + esc(key) + '</p>' + matrixHTML(value, lang) + '</div>').join('');
    }
    function pause() {
      if (timer !== null) clearInterval(timer);
      timer = null;
      if (!destroyed) { $('net-play').textContent = '▶ ' + t('播放', 'Play'); $('net-play').setAttribute('aria-pressed', 'false'); }
    }
    function move(index, manual) {
      if (manual) pause();
      lastIndex = stageIndex;
      stageIndex = Math.max(0, Math.min(result.stages.length - 1, index));
      update();
      if (stageIndex === result.stages.length - 1) pause();
    }
    function parentIds(id) {
      if (topic === 'transformer') return ({ input: [], queries: ['input'], keys: ['input'], values: ['input'], scores: ['queries', 'keys'], attention: ['scores'], context: ['attention', 'values'], projection: ['context'], 'residual-norm': ['projection', 'input'], ffn: ['residual-norm'], output: ['ffn', 'residual-norm'] })[id] || [];
      if (topic === 'resnet' && id === 'sum') return skip ? ['residual', 'input'] : ['residual'];
      const index = result.stages.findIndex(item => item.id === id);
      return index > 0 ? [result.stages[index - 1].id] : [];
    }
    function drawConnectors(animate) {
      const holder = $('net-flow-nodes');
      const svg = $('net-flow-lines');
      const rect = holder.getBoundingClientRect();
      if (!rect.width) return;
      svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
      const buttons = Array.from(holder.querySelectorAll('[data-net-stage]'));
      let lines = '<defs><marker id="net-arrow-' + topic + '" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M 0 0 L 7 3.5 L 0 7" fill="var(--muted)"/></marker></defs>';
      buttons.forEach((button, i) => {
        parentIds(result.stages[i].id).forEach(parentId => {
          const parentIndex = result.stages.findIndex(item => item.id === parentId);
          const a = buttons[parentIndex].getBoundingClientRect(), b = button.getBoundingClientRect();
          const sameRow = Math.abs(a.top - b.top) < 5;
          const ax = a.left + a.width / 2 - rect.left, bx = b.left + b.width / 2 - rect.left;
          const ay = a.top + a.height / 2 - rect.top, by = b.top + b.height / 2 - rect.top;
          const shortcut = (topic === 'resnet' && parentId === 'input' && result.stages[i].id === 'sum') || (topic === 'transformer' && parentId === 'input' && result.stages[i].id === 'residual-norm');
          let d;
          if (shortcut) {
            const rail = rect.width - 2;
            const approach = b.top - rect.top - 13;
            d = 'M ' + ax + ' ' + (a.top - rect.top) + ' L ' + ax + ' -11 L ' + rail + ' -11 L ' + rail + ' ' + approach + ' L ' + bx + ' ' + approach + ' L ' + bx + ' ' + (b.top - rect.top - 5);
          } else if (sameRow) {
            const right = b.left > a.left;
            d = 'M ' + ((right ? a.right : a.left) - rect.left) + ' ' + ay + ' L ' + ((right ? b.left - 5 : b.right + 5) - rect.left) + ' ' + by;
          } else if (b.top - a.bottom > 100) {
            // Long branches follow the outside rail rather than crossing intermediate nodes.
            const rail = rect.width - 3;
            d = 'M ' + (a.right - rect.left) + ' ' + ay + ' L ' + rail + ' ' + ay + ' L ' + rail + ' ' + by + ' L ' + (b.right - rect.left + 5) + ' ' + by;
          } else {
            const y1 = a.bottom - rect.top, y2 = b.top - rect.top - 5, middle = (y1 + y2) / 2;
            d = 'M ' + ax + ' ' + y1 + ' C ' + ax + ' ' + middle + ' ' + bx + ' ' + middle + ' ' + bx + ' ' + y2;
          }
          lines += '<path class="net-connector' + (shortcut ? ' net-shortcut-line' : '') + (i <= stageIndex ? ' net-connector-done' : '') + '" d="' + d + '" marker-end="url(#net-arrow-' + topic + ')"/>';
          if (animate && !reducedMotion && lastIndex !== stageIndex && i === stageIndex) lines += '<circle class="net-flow-dot" r="4"><animateMotion dur=".8s" repeatCount="1" fill="freeze" path="' + d + '"/></circle>';
        });
      });
      svg.innerHTML = lines;
    }
    function layoutFlow(animate) {
      const holder = $('net-flow-nodes');
      const width = holder.getBoundingClientRect().width;
      const columns = width >= 700 ? 4 : width >= 420 ? 3 : 2;
      holder.style.setProperty('--net-flow-cols', columns);
      const transformerGrid = columns >= 3 ? [[1, 2], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3], [4, 3], [4, 2], [4, 1], [5, 1]] : [[1, 1], [2, 1], [2, 2], [3, 2], [3, 1], [4, 1], [4, 2], [5, 2], [5, 1], [6, 1], [6, 2]];
      if (topic === 'transformer' && columns > 3) holder.style.setProperty('--net-flow-cols', 3);
      holder.querySelectorAll('[data-net-stage]').forEach((button, i) => {
        if (topic === 'transformer') { button.style.gridRow = transformerGrid[i][0]; button.style.gridColumn = transformerGrid[i][1]; return; }
        const row = Math.floor(i / columns), col = i % columns;
        button.style.gridColumn = (row % 2 === 0 ? col + 1 : columns - col);
        button.style.gridRow = row + 1;
      });
      drawConnectors(animate);
    }
    function drawResidual() {
      if (topic !== 'resnet') return;
      const stage = id => result.stages.find(item => item.id === id);
      const input = stage('input'), residual = stage('residual'), sum = stage('sum');
      const node = $('net-residual');
      node.hidden = false;
      node.innerHTML = '<div class="net-card-head"><h3>' + t('两条路径，在这里汇合', 'Two paths meet here') + '</h3><span class="net-shape">' + (skip ? 'y = x + F(x)' : 'y = F(x)') + '</span></div><div class="net-residual-layout"><div class="net-branch' + (!skip ? ' net-branch-off' : '') + '"><span>' + t('捷径：原始输入 x', 'Shortcut: original input x') + (!skip ? ' · ' + t('已关闭', 'off') : '') + '</span><strong>' + esc(input ? input.values.map(fmt).join(', ') : '') + '</strong></div><div class="net-branch"><span>' + t('残差分支 F(x)', 'Residual branch F(x)') + (zeroResidual ? ' = 0' : '') + '</span><strong>' + esc(residual ? residual.values.map(fmt).join(', ') : '') + '</strong></div><span class="net-add" aria-hidden="true">+</span><div class="net-sum"><span>' + t('相加后的 y', 'Added output y') + '</span><strong>' + esc(sum ? sum.values.map(fmt).join(', ') : '') + '</strong></div></div><p class="net-flow-note">' + t('这里的加法直接相加；后续分类头继续处理 y。切换开关可立即对照结果。', 'This node adds the two paths directly; the classification head then processes y. Toggle the switches to compare.') + '</p>';
      node.querySelector('.net-shape').textContent = (skip ? 'y = x + ' : 'y = ') + fmt(strength) + ' × F(x)';
      node.querySelectorAll('.net-branch')[1].querySelector('span').textContent = t('缩放后的残差 αF(x)', 'Scaled correction αF(x)');
      node.querySelectorAll('.net-branch')[1].querySelector('strong').textContent = result.data.scaledResidual.map(fmt).join(', ');
      node.insertAdjacentHTML('beforeend', '<div class="net-side-compare"><div><span>' + t('同一残差 · 无捷径', 'Same correction · no shortcut') + '</span><strong data-net-compare="without">' + result.data.scaledResidual.map(fmt).join(', ') + '</strong></div><div><span>' + t('同一残差 · 有捷径', 'Same correction · with shortcut') + '</span><strong data-net-compare="with">' + result.data.scaledResidual.map((v,i) => fmt(v + result.input[i])).join(', ') + '</strong></div></div>');
    }
    function cnnInspection(current) {
      if (topic !== 'cnn') return { highlight: [], winners: [] };
      const r = Math.min(selected[0], (current.shape[0] || 1) - 1), c = Math.min(selected[1], (current.shape[1] || current.shape[0] || 1) - 1);
      selected = [Math.max(0,r), Math.max(0,c)];
      const highlight = [], winners = []; let body = '';
      const heading = '<h3>' + t('这个数，从哪里来？', 'Where did this number come from?') + '</h3>';
      if (current.id === 'convolution') {
        const patch = result.data.patches.find(p => p.row === r && p.col === c);
        patch.terms.forEach(term => highlight.push(term.row + ',' + term.col));
        body = '<p>' + t('蓝框输出', 'Selected output') + ' (' + (r+1) + ', ' + (c+1) + ')</p><div class="net-products">' + patch.terms.map(term => '<span>' + fmt(term.input) + ' × (' + fmt(term.weight) + ') = ' + fmt(term.product) + '</span>').join('') + '</div><p class="net-trace-result">Σ = ' + fmt(patch.value) + '</p>';
      } else if (current.id === 'relu') {
        highlight.push(r + ',' + c);
        body = '<p class="net-trace-result">max(0, ' + fmt(result.data.convolution[r][c]) + ') = ' + fmt(current.values[r][c]) + '</p>';
      } else if (current.id === 'pooling') {
        const window = result.data.poolWindows.find(p => p.row === r && p.col === c);
        window.entries.forEach((v,i) => { const key = (2*r+Math.floor(i/2)) + ',' + (2*c+i%2); highlight.push(key); if(v === window.value) winners.push(key); });
        body = '<p class="net-trace-result">max(' + window.entries.map(fmt).join(', ') + ') = ' + fmt(window.value) + '</p><p>' + t('输入的 2 × 2 窗口已描边，橙框标出所有并列最大值。', 'The 2 × 2 input window is outlined; orange outlines mark all tied maxima.') + '</p>';
      } else if (current.id === 'global-pool') {
        result.data.pooling.forEach((row,r) => row.forEach((_,c) => highlight.push(r + ',' + c)));
        body = '<p class="net-trace-result">(' + result.data.pooling.flat().map(fmt).join(' + ') + ') / 9 = ' + fmt(result.data.pooled[0]) + '</p>';
      }
      trace.hidden = !body; trace.innerHTML = heading + body;
      return { highlight, winners };
    }
    function drawAttention() {
      if (topic !== 'transformer') return;
      const node = $('net-attention');
      if (stageIndex < 4) { node.hidden = true; node.innerHTML = ''; return; }
      const attention = result.stages.find(item => item.id === 'attention');
      if (!attention) return;
      const tokens = result.tokens || attention.values.map((_, i) => 'Token ' + (i + 1));
      queryIndex = Math.min(queryIndex, tokens.length - 1);
      const token = i => localized(tokens[i], lang);
      const row = attention.values[queryIndex];
      node.hidden = false;
      node.innerHTML = '<div class="net-card-head"><h3>' + t('沿着一个 Query，检查计算', 'Trace one query through the calculation') + '</h3><span class="net-shape">' + (stageIndex >= 5 ? t('每行权重之和 = 1', 'Each row sums to 1') : 'QKᵀ / √2') + '</span></div><div class="net-query-picker" aria-label="' + t('选择 Query 词元', 'Select query token') + '"><span>Query</span>' + tokens.map((_, i) => '<button class="net-token" type="button" data-query-index="' + i + '" aria-pressed="' + (i === queryIndex) + '">' + esc(token(i)) + '</button>').join('') + '</div>';
      node.insertAdjacentHTML('beforeend', '<div class="net-score-trace">' + result.data.keys.map((key,i) => '<p>Q' + (queryIndex+1) + ' · K' + (i+1) + ' / √2 = (' + key.map((k,j) => fmt(result.data.queries[queryIndex][j]) + ' × ' + fmt(k)).join(' + ') + ') / √2 = ' + fmt(result.data.scores[queryIndex][i]) + (result.data.mask[queryIndex][i] ? ' → ' + t('遮罩：−∞', 'masked: −∞') : '') + '</p>').join('') + '</div>');
      if (stageIndex >= 5) {
        node.insertAdjacentHTML('beforeend', '<div class="net-attention-layout"><div><p class="net-mini-label">' + t('行是 Query，列是 Key', 'Query rows, Key columns') + '</p><div class="net-token-order">' + tokens.map((_,i) => esc(token(i))).join(' · ') + '</div>' + matrixHTML(attention.values, lang, queryIndex) + '</div><div class="net-weight-list">' + row.map((weight,i) => '<div class="net-weight"><span>' + esc(token(i)) + '</span><div class="net-weight-track"><i style="width:' + weight*100 + '%"></i></div><strong>' + (weight*100).toFixed(1) + '%</strong></div>').join('') + '</div></div>');
        const scores = result.data.maskedScores[queryIndex], max = Math.max(...scores.filter(v => v !== null));
        node.insertAdjacentHTML('beforeend', '<details class="net-softmax"><summary>' + t('查看这一行的 softmax', 'Inspect this row’s softmax') + '</summary><p>' + t('先减去本行最大分数，保持数值稳定：', 'Subtract the row maximum for stability: ') + fmt(max) + '</p><div class="net-formula">' + scores.map((s,i) => s === null ? 'A['+(i+1)+'] = 0 (' + t('已遮罩', 'masked') + ')' : 'A['+(i+1)+'] = exp('+fmt(s)+' − '+fmt(max)+') / Σ exp(s − max) = '+fmt(row[i])).join('\n') + '</div></details>');
        node.insertAdjacentHTML('beforeend', '<p class="net-number-note">' + t('显示值已舍入；权重归一化使用完整精度。', 'Displayed values are rounded; normalization uses full precision.') + '</p>');
      } else node.insertAdjacentHTML('beforeend', '<p class="net-flow-note">' + t('此时只有分数。下一步才对每行做 softmax，生成注意力权重。', 'These are scores only. The next step applies row-wise softmax to produce attention weights.') + '</p>');
      if (stageIndex >= 6) {
        const products = row.map((w,i) => w * result.data.values[i][featureIndex]);
        node.insertAdjacentHTML('beforeend', '<div class="net-context-trace"><div class="net-query-picker"><span>' + t('混合哪一维？', 'Which value feature?') + '</span>' + [0,1,2,3].map(i => '<button class="net-token" data-net-feature="'+i+'" aria-pressed="'+(i === featureIndex)+'">'+(i+1)+'</button>').join('') + '</div><div class="net-formula">' + row.map((w,i) => fmt(w) + ' × ' + fmt(result.data.values[i][featureIndex]) + ' = ' + fmt(products[i])).join('\n') + '\nΣ = ' + fmt(result.data.context[queryIndex][featureIndex]) + '</div><p>' + t('权重乘以对应的 V 分量，再相加，得到更新后的这一维。计算使用未舍入数值。', 'Multiply each weight by its V component, then sum. Computation uses unrounded values.') + '</p></div>');
      }
    }
    function update() {
      if (destroyed) return;
      remember();
      const focusIndex = document.activeElement && document.activeElement.dataset.netStage;
      const focusCell = document.activeElement && document.activeElement.dataset.netCell;
      const current = result.stages[stageIndex];
      $('net-stage-current').textContent = (stageIndex + 1) + ' / ' + result.stages.length + ' · ' + localized(current.label, lang) + (stageIndex === result.stages.length - 1 ? ' · ' + t('前向计算完成', 'Forward pass complete') : '');
      $('net-prev').disabled = stageIndex === 0;
      $('net-next').disabled = stageIndex === result.stages.length - 1;
      $('net-play').disabled = stageIndex === result.stages.length - 1;
      const holder = $('net-flow-nodes');
      holder.innerHTML = result.stages.map((stage, i) => '<button type="button" class="net-stage' + (i === stageIndex ? ' net-stage-active' : i < stageIndex ? ' net-stage-done' : '') + '" data-net-stage="' + i + '" aria-current="' + (i === stageIndex ? 'step' : 'false') + '"><span class="net-stage-number">' + String(i + 1).padStart(2, '0') + '</span><strong>' + esc(localized(stage.label, lang)) + '</strong><small>' + esc(shape(stage.shape)) + '</small></button>').join('');
      const parents = parentIds(current.id);
      const source = result.stages.find(item => item.id === parents[0]);
      const sources = parents.map(id => result.stages.find(item => item.id === id));
      const max = Math.max(0.000001, ...[current, ...sources].flatMap(s => [s.values].flat(3)).filter(Number.isFinite).map(Math.abs));
      const inspection = cnnInspection(current);
      $('net-before').innerHTML = sources.length ? sources.map((s,i) => tensorHTML(s, i === 0 ? t('本层的输入', 'Input to this layer') : t('另一个输入', 'Another input'), lang, '', {max, ...(i === 0 ? inspection : {})})).join('<hr>') : tensorHTML(source, t('本层的输入', 'Input to this layer'), lang, t('这是起点。右侧是网络的输入；CNN 的格子可直接点击编辑。', 'Start here. The right card holds the input; click CNN pixels to edit them.'));
      $('net-after').innerHTML = tensorHTML(current, t('当前阶段输出', 'Current stage output'), lang, '', {max, interactive: topic === 'cnn' && ['input','convolution','relu','pooling','global-pool'].includes(current.id), selected: selected.join(',')});
      $('net-detail-title').textContent = localized(current.label, lang);
      $('net-detail-shape').textContent = t('形状 ', 'Shape ') + shape(current.shape);
      $('net-detail-description').textContent = localized(current.description, lang);
      $('net-detail-formula').textContent = current.formula;
      if (topic === 'cnn') $('net-detail-description').textContent += current.id === 'input' ? t(' 点击 0/1 格子修改输入。', ' Click a 0/1 cell to edit the input.') : t(' 点击输出格子，检查它的来源。', ' Select an output cell to inspect its source.');
      if ($('net-strength')) { $('net-strength').value = strength; $('net-strength-value').textContent = strength; }
      root.querySelectorAll('[data-net-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.netScenario === scenario)));
      drawResidual(); drawAttention(); layoutFlow(true);
      if (focusIndex !== undefined) holder.querySelector('[data-net-stage="' + focusIndex + '"]').focus({ preventScroll: true });
      if (focusCell !== undefined) { const cell = $('net-after').querySelector('[data-net-cell="'+focusCell+'"]'); if(cell) cell.focus({preventScroll:true}); }
    }
    function click(event) {
      const target = event.target.closest('button');
      if (!target || !root.contains(target)) return;
      if (target.hasAttribute('data-net-stage')) { move(Number(target.dataset.netStage), true); return; }
      if (target.hasAttribute('data-query-index')) { queryIndex = Number(target.dataset.queryIndex); remember(); drawAttention(); root.querySelector('[data-query-index="' + queryIndex + '"]').focus({ preventScroll: true }); return; }
      if (target.hasAttribute('data-net-feature')) { featureIndex = Number(target.dataset.netFeature); remember(); drawAttention(); root.querySelector('[data-net-feature="'+featureIndex+'"]').focus({preventScroll:true}); return; }
      if (target.hasAttribute('data-net-cell')) { pause(); selected = target.dataset.netCell.split(',').map(Number); if(stageIndex === 0 && topic === 'cnn') { input = result.input.map(row => row.slice()); input[selected[0]][selected[1]] = 1 - input[selected[0]][selected[1]]; compute(); } update(); return; }
      if (target.id === 'net-edit-input') { move(0, true); return; }
      if (target.hasAttribute('data-net-pattern')) { pause(); const name = target.dataset.netPattern; input = name === 'default' ? undefined : Array.from({length:8}, (_,r) => Array.from({length:8}, () => name === 'horizontal' && (r === 3 || r === 4) ? 1 : 0)); compute(); selected = [0,0]; update(); return; }
      if (target.hasAttribute('data-net-scenario')) { pause(); scenario = target.dataset.netScenario; compute(); update(); return; }
      if (target.id === 'net-prev') move(stageIndex - 1, true);
      if (target.id === 'net-next') move(stageIndex + 1, true);
      if (target.id === 'net-reset') { pause(); stageIndex = 0; queryIndex = 0; skip = true; zeroResidual = false; causal = false; input = undefined; strength = 1; scenario = 'default'; selected = [0,0]; featureIndex = 0; ['net-skip', 'net-zero', 'net-causal'].forEach(id => { if ($(id)) $(id).checked = id === 'net-skip'; }); compute(); lastIndex = -1; update(); }
      if (target.id === 'net-play') {
        if (timer !== null) { pause(); return; }
        if (stageIndex === result.stages.length - 1) return;
        target.textContent = 'Ⅱ ' + t('暂停', 'Pause'); target.setAttribute('aria-pressed', 'true');
        timer = setInterval(() => move(stageIndex + 1, false), 1550);
      }
    }
    function change(event) {
      if (!['net-skip', 'net-zero', 'net-causal'].includes(event.target.id)) return;
      pause();
      if (event.target.id === 'net-skip') skip = event.target.checked;
      if (event.target.id === 'net-zero') zeroResidual = event.target.checked;
      if (event.target.id === 'net-causal') causal = event.target.checked;
      compute(); lastIndex = -1;
      stageIndex = Math.max(0, result.stages.findIndex(item => item.id === (topic === 'resnet' ? 'sum' : 'attention')));
      update();
    }
    compute();
    lastIndex = stageIndex;
    if ($('net-skip')) $('net-skip').checked = skip;
    if ($('net-zero')) $('net-zero').checked = zeroResidual;
    if ($('net-causal')) $('net-causal').checked = causal;
    root.addEventListener('click', click);
    root.addEventListener('change', change);
    function adjust(event) { if(event.target.id !== 'net-strength') return; pause(); strength = Number(event.target.value); compute(); stageIndex = 3; update(); }
    function toggle() { layoutFlow(false); }
    root.addEventListener('input', adjust);
    $('net-overview').addEventListener('toggle', toggle);
    update();
    return {
      redraw: () => { if (!destroyed) layoutFlow(false); },
      pause,
      destroy: () => { pause(); destroyed = true; root.removeEventListener('click', click); root.removeEventListener('change', change); root.removeEventListener('input', adjust); $('net-overview').removeEventListener('toggle', toggle); }
    };
  }
  function getPython(topic) {
    const snippets = {
      cnn: 'def cnn(image, kernel, classifier):\n    feature = conv2d(image, kernel)\n    feature = relu(feature)\n    pooled = max_pool2d(feature, size=2)\n    summary = mean(pooled)\n    logits = linear([summary], classifier)\n    return softmax(logits)',
      resnet: 'def residual_block(x, w1, w2, skip=True, alpha=1):\n    hidden = relu(linear(x, w1))\n    residual = alpha * linear(hidden, w2)\n    if skip:\n        return x + residual\n    return residual',
      transformer: 'def attention(x, wq, wk, wv, causal=False):\n    q, k, v = x @ wq, x @ wk, x @ wv\n    scores = q @ k.T / sqrt(q.shape[-1])\n    if causal:\n        scores = mask_future(scores, -inf)\n    weights = softmax(scores, axis=-1)\n    return weights @ v, weights'
    };
    return snippets[topic] || '';
  }
  function getCaption(topic, lang) {
    const captions = {
      cnn: ['对应卷积 → ReLU → 池化 → 全局均值 → 分类头；函数名用于展示步骤，省略辅助函数与固定权重。', 'Convolution → ReLU → pooling → global mean → classification head. Illustrative function names; helpers and fixed weights omitted.'],
      resnet: ['展示一个残差块中的两条路径相加；linear 与 relu 是示意辅助函数，分类头与固定权重省略。', 'The two paths within one residual block. linear and relu are illustrative helpers; the classification head and fixed weights are omitted.'],
      transformer: ['展示单头缩放点积注意力；这是完整动画中的注意力部分，省略输出投影、残差、归一化与前馈层。', 'Single-head scaled dot-product attention. This excerpt omits output projection, residuals, normalization and feed-forward layers shown in the animation.']
    };
    return captions[topic] ? captions[topic][lang === 'en' ? 1 : 0] : '';
  }
  window.DLNetworkUI = { render, mount, getPython, getCaption };
})();
