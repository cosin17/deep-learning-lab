/* Local process illustrations driven by the same forward-pass values as the tables. */
(function () {
  'use strict';
  window.DLNetworkMotion = { mount };
  function mount(panel, lang) {
    const canvas = panel.querySelector('canvas'), ctx = canvas.getContext('2d');
    const caption = panel.querySelector('.net-process-caption');
    const status = panel.querySelector('.net-process-status');
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const t = (zh, en) => lang === 'en' ? en : zh;
    const fmt = value => Number(value.toFixed(3)).toString();
    let state, frame = 0, previous = 0, elapsed = 0, duration = 1, progress = null;
    let playing = false, inView = true, destroyed = false, w = 900, h = 300, colors;
    const ease = p => p * p * (3 - 2 * p);
    function text(value, x, y, color = colors.ink, size = 18, align = 'center') {
      ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.textAlign = align;
      ctx.font = size + 'px "Segoe UI", "Microsoft YaHei UI", sans-serif'; ctx.fillText(value, x, y);
    }
    function box(x, y, width, height, color = colors.line, fill = colors.bg) {
      ctx.globalAlpha = 1; ctx.fillStyle = fill; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x, y, width, height, 12); ctx.fill(); ctx.stroke();
    }
    function dot(x, y, radius, color, alpha = 1) {
      ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    function link(a, b, color, p = -1, width = 2, bend = 0) {
      const x1 = a.x + (b.x - a.x) * .35, x2 = b.x - (b.x - a.x) * .35;
      ctx.globalAlpha = .5; ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(x1, a.y + bend, x2, b.y + bend, b.x, b.y); ctx.stroke();
      for (let tail = 6; tail >= 0; tail--) {
        const v = p - tail * .025;
        if (v < 0 || v > 1) continue;
        const u = 1 - v;
        const x = u ** 3 * a.x + 3 * u * u * v * x1 + 3 * u * v * v * x2 + v ** 3 * b.x;
        const y = u ** 3 * a.y + 3 * u * u * v * (a.y + bend) + 3 * u * v * v * (b.y + bend) + v ** 3 * b.y;
        if (!tail) dot(x, y, 10, color, .12);
        dot(x, y, tail ? 2.2 : 4, color, tail ? .3 * (1 - tail / 7) : 1);
      }
      ctx.globalAlpha = 1;
    }
    function node(x, y, width, title, value, color = colors.blue) {
      box(x, y, width, 70, color); text(title, x + width / 2, y + 26, colors.muted, 16);
      text(value, x + width / 2, y + 53, color, 21);
    }
    function matrix(values, x, y, size, active = [], reveal) {
      const rows = !Array.isArray(values[0]) ? [values] : values;
      const max = Math.max(1, ...rows.flat().filter(Number.isFinite).map(Math.abs));
      rows.forEach((row, r) => row.forEach((value, c) => {
        const visible = !reveal || reveal(r, c);
        ctx.fillStyle = colors.bg; ctx.fillRect(x + c * size + 2, y + r * size + 2, size - 4, size - 4);
        ctx.globalAlpha = visible ? .12 + Math.abs(value || 0) / max * .55 : .06;
        ctx.fillStyle = value < 0 ? colors.warm : colors.blue;
        ctx.fillRect(x + c * size + 2, y + r * size + 2, size - 4, size - 4); ctx.globalAlpha = 1;
        if (visible && size >= 27) text(value === null ? '×' : fmt(value), x + (c + .5) * size, y + (r + .65) * size, colors.ink, 14);
        if (active.some(p => p[0] === r && p[1] === c)) {
          ctx.strokeStyle = colors.teal; ctx.lineWidth = 2;
          ctx.strokeRect(x + c * size + 1, y + r * size + 1, size - 2, size - 2);
        }
      }));
    }
    function say(value) { if (caption.textContent !== value) caption.textContent = value; }
    function cnn() {
      const { result, stageIndex, selected } = state, id = result.stages[stageIndex].id;
      if (!['convolution', 'relu', 'pooling'].includes(id)) { generic(); return; }
      const pool = id === 'pooling', relu = id === 'relu';
      const source = pool ? result.data.relu : relu ? result.data.convolution : result.input;
      const output = result.stages[stageIndex].values;
      const count = output.length, windowSize = pool ? 2 : relu ? 1 : 3, stride = pool ? 2 : 1;
      const rankOf = (r, c) => r * count + (r % 2 ? count - c - 1 : c);
      const cellAt = rank => { const r = Math.floor(rank / count); return [r, r % 2 ? count - rank % count - 1 : rank % count]; };
      const rank = progress === null ? rankOf(Math.min(selected[0], count - 1), Math.min(selected[1], count - 1)) : progress * (count * count - 1);
      const index = Math.floor(rank), current = cellAt(index), next = cellAt(Math.min(index + 1, count * count - 1));
      const blend = ease(rank - index), row = current[0], col = current[1];
      const left = 30, top = 62, inputSize = w < 650 ? 22 : 26, outputSize = w < 650 ? 31 : 35;
      const right = w - output.length * outputSize - 30;
      matrix(source, left, top, inputSize);
      matrix(output, right, top, outputSize, [current], progress === null ? null : (r, c) => rankOf(r, c) <= index);
      const wx = left + (col + (next[1] - col) * blend) * stride * inputSize;
      const wy = top + (row + (next[0] - row) * blend) * stride * inputSize;
      ctx.lineWidth = 2.5; ctx.strokeStyle = colors.teal; ctx.shadowColor = colors.teal; ctx.shadowBlur = 12;
      ctx.strokeRect(wx, wy, windowSize * inputSize, windowSize * inputSize); ctx.shadowBlur = 0;
      const a = { x: wx + windowSize * inputSize, y: wy + windowSize * inputSize / 2 };
      const b = { x: right + (col + .5) * outputSize, y: top + (row + .5) * outputSize };
      link(a, b, colors.teal, progress === null ? -1 : rank - index, 2);
      const center = (left + source.length * inputSize + right) / 2;
      if (!pool && !relu) {
        const cell = w < 650 ? 21 : 28;
        box(center - cell * 1.5 - 7, 100, cell * 3 + 14, cell * 3 + 14, colors.line);
        matrix(result.weights.kernel, center - cell * 1.5, 107, cell);
        text('K', center, 90, colors.muted, 18);
      } else node(center - 53, 113, 106, pool ? '2 × 2' : 'ReLU', pool ? 'max' : 'max(0, x)', colors.teal);
      text(t('输入', 'Input') + ' · ' + source.length + ' × ' + source.length, left, 30, colors.muted, 18, 'left');
      text(t('输出', 'Output') + ' · ' + count + ' × ' + count, right, 30, colors.muted, 18, 'left');
      const operation = pool ? 'MAX 2 × 2' : relu ? 'ReLU' : 'Σ 3 × 3';
      text(operation, (left + source.length * inputSize + right) / 2, h - 22, colors.teal, 18);
      const value = output[row][col];
      canvas.dataset.cell = row + ',' + col; canvas.dataset.value = String(value);
      const formula = pool ? 'max(' + result.data.poolWindows[row * count + col].entries.map(fmt).join(', ') + ') = ' + fmt(value)
        : relu ? 'max(0, ' + fmt(source[row][col]) + ') = ' + fmt(value) : 'Σ = ' + fmt(value);
      say(t('窗口位置 ', 'Window ') + '(' + row + ', ' + col + ') · ' + formula + t('。沿蛇形顺序扫描，每个输出都来自同一次真实计算。', '. The serpentine scan uses the actual computed outputs.'));
    }
    function residual() {
      const { result, stageIndex } = state;
      if (!['input', 'sum'].includes(result.stages[stageIndex].id)) { generic(); return; }
      const ready = stageIndex >= 3, skip = result.options.skip;
      const p = progress === null ? .55 : progress;
      const index = Math.min(3, Math.floor(p * 4)), phase = p === 1 ? 1 : p * 4 % 1;
      const x = result.input[index], correction = result.data.scaledResidual[index], y = result.output[index];
      const source = { x: 130, y: 170 }, join = { x: w - 160, y: 170 };
      const middle = w / 2 - 55;
      if (skip) link(source, join, colors.teal, ready && progress !== null ? ease(phase) : -1, 2.5, -170);
      else { ctx.setLineDash([5, 6]); link(source, join, colors.line, -1, 1.5, -170); ctx.setLineDash([]); }
      link(source, { x: middle, y: 222 }, colors.blue, ready && progress !== null && phase <= .5 ? ease(phase * 2) : -1);
      link({ x: middle + 110, y: 222 }, join, colors.blue, ready && progress !== null && phase >= .5 ? ease(phase * 2 - 1) : -1);
      link(join, { x: w - 80, y: 170 }, colors.teal, ready && progress !== null ? ease(phase) : -1, 3);
      node(20, 135, 110, 'x[' + index + ']', fmt(x), colors.teal);
      node(middle, 190, 110, 'αF(x)[' + index + ']', ready ? fmt(correction) : 'F(x)', colors.blue);
      text(skip ? t('捷径：保留 x', 'Shortcut: keep x') : t('捷径已关闭', 'Shortcut off'), w / 2, 49, skip ? colors.teal : colors.muted, 18);
      dot(join.x, join.y, 23, colors.blue, .12); text('+', join.x, join.y + 8, colors.blue, 30);
      node(w - 110, 135, 100, 'y[' + index + ']', ready ? fmt(y) : '…', colors.teal);
      canvas.dataset.component = String(index); canvas.dataset.value = String(ready ? y : x);
      say(ready ? 'y[' + index + '] = ' + (skip ? fmt(x) + ' + ' : '') + fmt(correction) + ' = ' + fmt(y)
        + t('。两条路径在加法节点汇合，逐分量观察变化。', '. Follow both paths into the addition, one component at a time.')
        : t('同一份输入可沿捷径保留，也可进入残差分支；点击播放，观察它们怎样汇合。', 'One copy can follow the shortcut while another enters the residual branch. Play to follow their addition.'));
    }
    function attention() {
      const { result, stageIndex, queryIndex, featureIndex } = state;
      if (stageIndex < 4 || stageIndex > 6) { generic(); return; }
      const context = stageIndex === 6, weighted = stageIndex >= 5;
      const weights = result.data.attention[queryIndex];
      const scores = result.data.maskedScores[queryIndex];
      const p = progress === null ? -1 : progress;
      const nodeWidth = w < 650 ? 110 : 150, lx = 20, rx = w - nodeWidth - 20;
      const ys = [25, 115, 205], middleY = 150;
      for (let i = 0; i < 3; i++) {
        const blocked = scores[i] === null, weight = weighted ? weights[i] : 1;
        const color = blocked ? colors.line : i === queryIndex ? colors.teal : colors.blue;
        const a = context ? { x: lx + nodeWidth, y: ys[i] + 35 } : { x: lx + nodeWidth, y: middleY };
        const b = context ? { x: rx, y: middleY } : { x: rx, y: ys[i] + 35 };
        const phase = p < 0 || blocked || weight === 0 ? -1 : Math.max(-.01, Math.min(1.01, p * 1.3 - i * .12));
        link(a, b, color, phase, blocked ? 1 : weighted ? 1.5 + weight * 7 : 2);
        const token = result.tokens[i][lang === 'en' ? 'en' : 'zh'];
        const title = (context ? 'V · ' : 'K · ') + token;
        const value = context ? fmt(result.data.values[i][featureIndex]) : blocked ? '×' : weighted ? (weights[i] * 100).toFixed(1) + '%' : fmt(scores[i]);
        node(context ? lx : rx, ys[i], nodeWidth, title, value, color);
        const label = blocked ? t('遮罩', 'Masked') : context ? fmt(weights[i]) + ' × V' : weighted ? (weights[i] * 100).toFixed(1) + '%' : t('点积 / √2', 'Dot / √2');
        text(label, w / 2, ys[i] + 29, blocked ? colors.muted : color, w < 650 ? 15 : 18);
      }
      const token = result.tokens[queryIndex][lang === 'en' ? 'en' : 'zh'];
      node(context ? rx : lx, 115, nodeWidth, context ? 'Σ wV' : 'Query · ' + token,
        context ? fmt(result.data.context[queryIndex][featureIndex]) : 'Q[' + queryIndex + ']', colors.teal);
      canvas.dataset.query = String(queryIndex); canvas.dataset.feature = String(featureIndex);
      canvas.dataset.value = String(context ? result.data.context[queryIndex][featureIndex] : weighted ? weights[queryIndex] : scores[queryIndex]);
      say(context ? 'C[' + queryIndex + ',' + featureIndex + '] = ' + weights.map((v,i) => fmt(v) + ' × ' + fmt(result.data.values[i][featureIndex])).join(' + ') + ' = ' + fmt(result.data.context[queryIndex][featureIndex])
        : weighted ? t('线的粗细对应真实注意力权重；被遮住的连接权重为 0，不传递光点。', 'Line width follows the actual attention weight. Masked links have zero weight and carry no packets.')
        : t('当前只计算 Q 与各个 K 的缩放点积；下一层才进行 softmax。', 'This stage computes scaled Q–K dot products. Softmax happens at the next stage.'));
    }
    function generic() {
      const { current, sources } = state;
      const rows = values => Array.isArray(values[0]) ? values : [values];
      const output = rows(current.values), input = sources[0] && rows(sources[0].values);
      const sizeFor = values => Math.min(w < 650 ? 30 : 37, 190 / Math.max(values[0].length, values.length));
      if (sources.length > 1) {
        const size = w < 650 ? 23 : 30, rx = w - output[0].length * size - 26;
        sources.forEach((source, i) => {
          const values = rows(source.values), top = 40 + i * 135;
          matrix(values, 26, top, size);
          text(source.label[lang === 'en' ? 'en' : 'zh'], 26, top - 11, colors.muted, 15, 'left');
          link({ x: 32 + values[0].length * size, y: top + values.length * size / 2 }, { x: rx - 12, y: 135 }, colors.teal, progress === null ? -1 : ease(progress));
        });
        matrix(output, rx, 80, size);
        text(current.label[lang === 'en' ? 'en' : 'zh'], w / 2, h - 10, colors.teal, 17);
        say(current.formula + t('。两路真实输入共同产生右侧输出。', '. Both actual input tensors contribute to the output.')); return;
      }
      if (!input) {
        const size = sizeFor(output); matrix(output, (w - output[0].length * size) / 2, 50, size);
        say(current.label[lang === 'en' ? 'en' : 'zh'] + ' · ' + current.formula); return;
      }
      const is = sizeFor(input), os = sizeFor(output), lx = 26, rx = w - output[0].length * os - 26;
      matrix(input, lx, 70, is); matrix(output, rx, 70, os);
      link({ x: lx + input[0].length * is + 6, y: 135 }, { x: rx - 6, y: 135 }, colors.teal, progress === null ? -1 : ease(progress), 3);
      text(t('输入', 'Input'), lx, 37, colors.muted, 18, 'left');
      text(t('输出', 'Output'), rx, 37, colors.muted, 18, 'left');
      text(current.label[lang === 'en' ? 'en' : 'zh'], w / 2, h - 23, colors.teal, 19);
      say(current.formula + t('。图中显示真实输入与输出；流动光点表示数据依赖。', '. Actual input and output values; moving packets indicate the data dependency.'));
    }
    function draw() {
      if (!state || !ctx || destroyed) return;
      ctx.clearRect(0, 0, w, h);
      if (state.result.id === 'cnn') cnn(); else if (state.result.id === 'resnet') residual(); else attention();
    }
    function tick(now) {
      elapsed += previous ? Math.min(now - previous, 64) : 0; previous = now;
      progress = Math.min(1, elapsed / duration); draw();
      if (progress === 1) playing = false;
      sync(false);
    }
    function sync(reset = true) {
      cancelAnimationFrame(frame); frame = 0;
      if (reset) previous = 0;
      const running = playing && !media.matches && inView && !document.hidden && !destroyed;
      canvas.dataset.motionState = media.matches ? 'reduced' : !playing ? 'paused' : document.hidden ? 'hidden' : !inView ? 'offscreen' : 'running';
      status.textContent = running ? t('● 正在演示', '● In motion') : t('逐层观察 · 真实数值', 'Layer by layer · Actual values');
      const replay = panel.querySelector('#net-process-replay');
      const label = playing ? t('Ⅱ 暂停本层', 'Ⅱ Pause layer') : t('↺ 重播本层', '↺ Replay layer');
      if (replay.textContent !== label) replay.textContent = label;
      replay.setAttribute('aria-pressed', String(playing)); replay.disabled = media.matches;
      if (running) frame = requestAnimationFrame(tick);
    }
    function resize() {
      if (destroyed) return;
      const width = canvas.getBoundingClientRect().width;
      w = width < 650 ? 540 : 900; h = 300;
      canvas.style.aspectRatio = w + '/' + h;
      const dpr = Math.min(devicePixelRatio || 1, 2), scale = width / w;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(h * scale * dpr);
      if (ctx) ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      const css = getComputedStyle(panel);
      colors = { ink: css.getPropertyValue('--ink').trim(), muted: css.getPropertyValue('--muted').trim(), bg: css.getPropertyValue('--code-bg').trim(), line: css.getPropertyValue('--line').trim(), blue: css.getPropertyValue('--accent').trim(), teal: css.getPropertyValue('--green').trim(), warm: css.getPropertyValue('--blue').trim() };
      draw();
    }
    function visibility() { sync(); }
    function motionChange() { if (media.matches) { playing = false; progress = null; draw(); } sync(); }
    const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }); observer.observe(canvas);
    const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(panel);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', motionChange);
    resize();
    return {
      update(value) {
        state = value; playing = false; progress = null;
        canvas.setAttribute('aria-label', value.current.label[lang === 'en' ? 'en' : 'zh']);
        panel.querySelector('#net-process-title').textContent = value.current.label[lang === 'en' ? 'en' : 'zh'];
        resize(); sync();
      },
      play(ms) { duration = ms; elapsed = 0; progress = media.matches ? null : 0; playing = !media.matches; draw(); sync(); },
      pause() { playing = false; sync(); },
      isPlaying: () => playing,
      redraw: resize,
      destroy() { destroyed = true; playing = false; cancelAnimationFrame(frame); observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', motionChange); }
    };
  }
})();
