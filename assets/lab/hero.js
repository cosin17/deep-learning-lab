(function () {
  'use strict';
  const root = document.documentElement;
  const landing = document.querySelector('.landing');
  const canvas = document.getElementById('landing-canvas');
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !reduced.matches;
  let inView = true, frame = 0, previous = 0, elapsed = 0, width = 0, height = 0;
  const tau = Math.PI * 2;

  function labels() {
    const zh = root.lang !== 'en';
    document.getElementById('scene-caption').textContent = zh ? '让好奇心，流动起来。' : 'Let curiosity flow.';
  }
  function dot(x, y, radius, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, tau); ctx.fill();
  }
  function draw() {
    if (!ctx || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const light = root.dataset.theme === 'light';
    const blue = light ? '#3265bd' : '#6eabff';
    const warm = light ? '#bd653e' : '#ffae7b';
    const teal = light ? '#318877' : '#6bdfd0';
    const compact = width < 900;
    const scale = compact ? .65 : 1;
    const cy = compact ? 215 : 213;
    const left = compact ? width * .04 : width * .12;
    const right = compact ? width * .98 : width * .88;
    const t = elapsed * .001;

    // A decorative layered graph: packets travel from one layer to the next.
    const counts = [3, 5, 6, 5, 3];
    const layers = counts.map((count, layer) => Array.from({ length: count }, (_, row) => ({
      x: left + (layer - 2) * 47 * scale + Math.sin(t * .3 + row) * 3,
      y: cy + (row - (count - 1) / 2) * 38 * scale + Math.cos(t * .25 + layer) * 7
    })));
    ctx.lineWidth = .8;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      layers[layer].forEach((a, i) => layers[layer + 1].forEach((b, j) => {
        ctx.globalAlpha = (light ? .2 : .19) * (compact ? .7 : 1);
        ctx.strokeStyle = blue; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        if ((i * 3 + j + layer) % 4 === 0) {
          const progress = (t * .23 + layer * .25 + i * .17 + j * .08) % 1;
          dot(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress, 1.7, i % 2 ? teal : blue, .75);
        }
      }));
    }
    layers.forEach((points, layer) => points.forEach((p, i) => {
      dot(p.x, p.y, 7 * scale, blue, .08);
      dot(p.x, p.y, 3 * scale, layer === 4 ? teal : blue, .6 + .25 * Math.sin(t * 1.6 - layer + i));
    }));

    // A slowly turning folded surface, echoing the paper-cut experiment.
    const radius = 147 * scale;
    const turn = t * .055;
    function surface(v, u) {
      const angle = u * tau;
      const r = radius * v * (1 + .21 * Math.cos(6 * angle + v * 2));
      const z = Math.sin(3 * angle + v * 2.8) * radius * v * .38;
      return { x: right + Math.cos(angle + turn) * r, y: cy + Math.sin(angle + turn) * r * .62 + z * .7 };
    }
    ctx.lineWidth = .85;
    for (let ring = 1; ring <= 16; ring++) {
      ctx.globalAlpha = light ? .3 : .32;
      ctx.strokeStyle = ring < 7 ? blue : warm;
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const p = surface(ring / 16, i / 96);
        if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 48; i++) {
      ctx.globalAlpha = light ? .17 : .2; ctx.strokeStyle = warm; ctx.beginPath();
      for (let ring = 1; ring <= 16; ring++) {
        const p = surface(ring / 16, i / 48);
        if (ring === 1) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const p = surface(.62 + .3 * Math.sin(t * .3 + i) ** 2, (t * .025 + i / 6) % 1);
      dot(p.x, p.y, 6, warm, .09); dot(p.x, p.y, 1.8, warm, .9);
    }
    ctx.globalAlpha = 1;
  }
  function tick(now) {
    if (!previous) previous = now;
    if (now - previous >= 32) {
      elapsed += Math.min(now - previous, 80); previous = now; draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    const running = enabled && inView && !document.hidden;
    root.dataset.ambientRunning = running ? 'on' : 'off';
    canvas.dataset.sceneState = !enabled ? 'paused' : document.hidden ? 'hidden' : !inView ? 'offscreen' : 'running';
    labels();
    if (running && ctx) frame = requestAnimationFrame(tick);
    else draw();
  }
  function resize() {
    const rect = landing.getBoundingClientRect();
    width = Math.round(rect.width); height = Math.round(rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  reduced.addEventListener('change', () => { enabled = !reduced.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }).observe(landing);
  new ResizeObserver(resize).observe(landing);
  new MutationObserver(() => { labels(); draw(); }).observe(root, { attributes: true, attributeFilter: ['lang', 'data-theme'] });
  resize(); sync();
})();
