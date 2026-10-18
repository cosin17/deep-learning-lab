// Optional browser checks. Runtime files themselves have no dependencies.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const screenshots = process.env.DLLAB_SCREENSHOT_DIR;
if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
const errors = [], externalRequests = [], checks = [];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-4, a + ' ≉ ' + b);

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.DLLAB_BROWSER_CHANNEL ? { channel: process.env.DLLAB_BROWSER_CHANNEL } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, colorScheme: 'light', reducedMotion: 'reduce' });
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
    await page.goto(pathToFileURL(path.join(root, 'assets/lab/index.html')).href + '?lang=zh#fold');
    await page.locator('#fold-depth').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('#landing-title').innerText(), 'Deep Learning Lab');
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'landing-dark.png') });
    const darkCanvas = await page.locator('#fold-input').evaluate(c => c.toDataURL());
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.notEqual(darkCanvas, await page.locator('#fold-input').evaluate(c => c.toDataURL()), 'theme changes must redraw charts');
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'landing-light.png') });
    await page.locator('#theme-toggle').click();
    await page.locator('#start-experiment').click();
    assert.ok(await page.locator('#lab').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 80), 'start button scrolls to the lab');
    checks.push('reference-style landing, functional explore button, and light/dark chart redraw');
    const range = async (id, value) => page.locator('#' + id).evaluate((element, value) => {
      element.value = value; element.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
    const firstPattern = await page.locator('#fold-input').evaluate(c => c.toDataURL());
    await range('fold-depth', 4);
    assert.match(await page.locator('#fold-stage').innerText(), /4 \/ 4/);
    const fourthPattern = await page.locator('#fold-input').evaluate(c => c.toDataURL());
    assert.notEqual(firstPattern, fourthPattern, 'adding a fold must change the actual rendered pattern');
    await page.locator('#fold-nonlinear').uncheck();
    assert.notEqual(fourthPattern, await page.locator('#fold-input').evaluate(c => c.toDataURL()));
    await page.locator('#fold-nonlinear').check();
    await page.locator('#fold-prev').click();
    assert.match(await page.locator('#fold-stage').innerText(), /3 \/ 4/);
    await page.locator('#fold-next').click();
    await range('point-x', -0.4); await range('point-y', -0.7);
    assert.match(await page.locator('#fold-values').innerText(), /-0.4, -0.7/);
    await range('point-x', 0.7); await range('point-y', 0.45);
    checks.push('folding: numerical trace, stage controls, ReLU comparison, and canvas updates');
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'fold-zh.png'), fullPage: true });
    await page.locator('#language').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.match(await page.locator('.lesson-heading').innerText(), /Fold the space/);
    assert.equal(await page.locator('#fold-depth').inputValue(), '4', 'language changes preserve experiment parameters');
    checks.push('language switch preserves parameters and changes labels');

    await page.locator('a[href="#gradient"]').click();
    await page.locator('#gd-step').click();
    near(Number(await page.locator('#gd-w').innerText()), 3);
    near(Number(await page.locator('#gd-loss').innerText()), 2);
    await page.locator('[data-eta="2"]').click();
    assert.equal(await page.locator('#gd-count').innerText(), '0');
    await page.locator('#gd-step').click();
    near(Number(await page.locator('#gd-w').innerText()), -1.5);
    near(Number(await page.locator('#gd-loss').innerText()), 3.125);
    await page.locator('#gd-play').click();
    await page.waitForFunction(() => Number(document.getElementById('gd-count').textContent) >= 2);
    await page.locator('#gd-play').click();
    assert.equal(await page.locator('#gd-play').getAttribute('aria-pressed'), 'false');
    await page.locator('[data-eta="1.6"]').click();
    for (let i = 0; i < 5; i++) await page.locator('#gd-step').click();
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'gradient-en.png'), fullPage: true });
    checks.push('gradient descent: hand-calculated step, equal-loss oscillation, playback and reset');

    await page.locator('a[href="#convolution"]').click();
    assert.equal(await page.locator('[data-output]').count(), 9);
    assert.match(await page.locator('#conv-total').innerText(), /2$/);
    await page.locator('[data-input="0,0"]').click();
    assert.match(await page.locator('#conv-total').innerText(), /1$/);
    assert.equal(await page.locator('[data-input="0,0"]').evaluate(e => e === document.activeElement), true);
    await page.locator('#conv-reset').click();
    await page.locator('[data-conv-stride="2"]').click();
    await page.locator('[data-conv-padding="1"]').click();
    assert.equal(await page.locator('[data-output]').count(), 9);
    assert.equal(await page.locator('#conv-input .padding').count(), 24);
    await page.locator('[data-output="8"]').click();
    assert.match(await page.locator('#conv-position').innerText(), /9 \/ 9/);
    assert.equal(await page.locator('#conv-input .patch').count(), 9);
    await page.locator('[data-kernel="blur"]').focus();
    await page.locator('[data-kernel="blur"]').press('Space');
    assert.equal(await page.locator('[data-kernel="blur"]').getAttribute('aria-pressed'), 'true');
    await page.locator('#conv-next').click();
    assert.equal(await page.locator('#conv-terms .term').count(), 9);
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'convolution-en.png'), fullPage: true });
    checks.push('convolution: independent hand calculation, editing, focus, padding, receptive field, kernel and stride');

    await page.locator('a[href="#cnn"]').click();
    assert.equal(await page.locator('#net-play').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('[data-net-stage]').count(), 7);
    assert.equal(await page.locator('#net-after .net-cell').count(), 64);
    await page.locator('#net-next').click();
    assert.equal(await page.locator('#net-after .net-cell').count(), 36);
    assert.equal(await page.locator('[data-net-stage="1"]').getAttribute('aria-current'), 'step');
    await page.locator('#net-prev').click();
    assert.equal(await page.locator('#net-after .net-cell').count(), 64);
    await page.locator('[data-net-stage="2"]').click();
    const relu = await page.locator('#net-after .net-cell').allTextContents();
    assert.ok(relu.every(value => Number(value) >= 0));
    await page.locator('#net-play').click();
    assert.equal(await page.locator('#net-play').getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => document.querySelector('[data-net-stage="3"]').getAttribute('aria-current') === 'step');
    await page.locator('#net-play').click();
    assert.equal(await page.locator('#net-play').getAttribute('aria-pressed'), 'false');
    await page.locator('[data-net-stage="5"]').click();
    await page.locator('#net-play').click();
    await page.waitForFunction(() => document.getElementById('net-play').disabled);
    assert.equal(await page.locator('#net-next').isDisabled(), true);
    assert.equal(await page.locator('#net-play').getAttribute('aria-pressed'), 'false');
    const cnnProbabilities = await page.locator('#net-after .net-cell').allTextContents();
    near(cnnProbabilities.map(Number).reduce((a, b) => a + b, 0), 1);
    await page.locator('#net-reset').click();
    assert.equal(await page.locator('#net-prev').isDisabled(), true);
    assert.match(await page.locator('#python-snippet').innerText(), /def cnn/);
    checks.push('CNN: real layer shapes, ReLU values, step/previous/select/play/pause, automatic stop, probabilities and reset');

    await page.locator('a[href="#resnet"]').click();
    await page.locator('#net-zero').check();
    assert.deepEqual((await page.locator('#net-after .net-cell').allTextContents()).map(Number), [1, -0.5, 0.75, 0.25]);
    const residualWeights = page.locator('.net-weight-matrix').filter({ has: page.locator('.net-mini-label', { hasText: /^w2$/ }) });
    assert.ok((await residualWeights.locator('.net-cell').allTextContents()).every(value => Number(value) === 0), 'parameter inspector follows the zero residual option');
    await page.locator('#net-skip').uncheck();
    assert.deepEqual((await page.locator('#net-after .net-cell').allTextContents()).map(Number), [0, 0, 0, 0]);
    await page.locator('#language').click();
    assert.equal(await page.locator('#net-zero').isChecked(), true, 'language preserves residual options');
    assert.equal(await page.locator('#net-skip').isChecked(), false);
    assert.equal(await page.locator('[data-net-stage="3"]').getAttribute('aria-current'), 'step');
    await page.locator('#net-reset').click();
    assert.equal(await page.locator('#net-skip').isChecked(), true);
    assert.equal(await page.locator('#net-zero').isChecked(), false);
    assert.ok((await residualWeights.locator('.net-cell').allTextContents()).some(value => Number(value) !== 0), 'reset restores parameter inspector');
    checks.push('ResNet: zero residual is identity with shortcut, zero without it; language preserves settings and stage');

    await page.locator('a[href="#transformer"]').click();
    assert.equal(await page.locator('[data-net-stage]').count(), 11);
    await page.locator('#net-causal').check();
    assert.deepEqual(await page.locator('.net-weight strong').allTextContents(), ['100.0%', '0.0%', '0.0%']);
    const attentionRows = page.locator('#net-attention .net-matrix-row');
    assert.equal(await attentionRows.count(), 3);
    for (let row = 0; row < 3; row++) {
      const values = (await attentionRows.nth(row).locator('.net-cell').allTextContents()).map(Number);
      assert.ok(Math.abs(values.reduce((a, b) => a + b, 0) - 1) <= 0.0011);
      assert.ok(values.slice(row + 1).every(value => value === 0));
    }
    await page.locator('[data-query-index="2"]').click();
    assert.equal(await page.locator('[data-query-index="2"]').getAttribute('aria-pressed'), 'true');
    assert.notDeepEqual(await page.locator('.net-weight strong').allTextContents(), ['100.0%', '0.0%', '0.0%']);
    await page.locator('[data-net-stage="2"]').click();
    assert.match(await page.locator('#net-before .net-tensor-name').innerText(), /输入/);
    assert.equal(await page.locator('#net-before .net-cell').count(), 12, 'keys are projected from input, not queries');
    await page.locator('[data-net-stage="3"]').click();
    assert.equal(await page.locator('#net-before .net-cell').count(), 12, 'values are projected from input, not keys');
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await page.locator('#net-causal').isChecked(), true);
    await page.locator('#theme-toggle').click();
    await page.locator('#net-play').click();
    await page.locator('a[href="#cnn"]').click();
    await page.locator('a[href="#transformer"]').click();
    assert.equal(await page.locator('#net-play').getAttribute('aria-pressed'), 'false', 'leaving a lesson stops playback');
    assert.match(await page.locator('#python-snippet').innerText(), /def attention/);
    await page.locator('#language').click();
    checks.push('Transformer: causal weights and normalization, query selection, Q/K/V input dependency, theme and route cleanup');

    for (const width of [1440, 1024, 1020, 768, 740, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const topic of ['fold', 'gradient', 'convolution', 'cnn', 'resnet', 'transformer']) {
        await page.locator('.lesson-link[href="#' + topic + '"]').click();
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth, document: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('body *')].filter(el => {
            const r = el.getBoundingClientRect(); return r.width && (r.right > innerWidth + 2 || r.left < -2);
          }).map(el => el.id || el.tagName).slice(0, 8)
        }));
        assert.ok(overflow.document <= overflow.viewport + 2 && overflow.elements.length === 0,
          width + 'px ' + topic + ' overflow: ' + JSON.stringify(overflow));
      }
    }
    checks.push('all six lessons fit at 1440 / 1024 / 1020 / 768 / 740 / 390 / 360 / 320px');
    await page.emulateMedia({ colorScheme: 'dark' });
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'mobile-dark.png'), fullPage: true });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.notEqual(bg, 'rgb(247, 246, 242)');
    checks.push('dark theme renders across all lesson layouts without runtime errors');
    await page.locator('a[href="#convolution"]').click();
    await page.locator('#explore-python').click();
    assert.ok(await page.locator('#python-guide').evaluate(el => {
      const rect = el.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0;
    }), 'Python button reaches examples');
    assert.match(await page.locator('#python-snippet').innerText(), /def patch_response/);
    assert.match(await page.locator('#python-display-note').innerText(), /For reading only/);
    checks.push('read-only Python display follows the selected experiment');

    // Exercise the public entry point, including file:// redirect handling.
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '?lang=en#gradient');
    await page.locator('#gd-step').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    checks.push('repository entry point preserves lesson and language');
    if (process.env.DLLAB_EXPORTED_INDEX) {
      await page.goto(pathToFileURL(path.resolve(process.env.DLLAB_EXPORTED_INDEX)).href);
      await page.locator('#gd-step').waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      await page.locator('#gd-step').click();
      near(Number(await page.locator('#gd-w').innerText()), 3);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.locator('a[href="#transformer"]').click();
      await page.locator('#net-causal').check();
      assert.deepEqual(await page.locator('.net-weight strong').allTextContents(), ['100.0%', '0.0%', '0.0%']);
      checks.push('CLI-exported copy opens offline with requested topic and language');
    }
    assert.deepEqual(errors, [], 'browser errors');
    assert.deepEqual(externalRequests, [], 'offline lab must not request external resources');
    console.log(JSON.stringify({ status: 'passed', checks, browserErrors: errors, externalRequests }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
