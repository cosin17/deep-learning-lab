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
    assert.match(await page.locator('h1').innerText(), /Fold the space/);
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
    await page.locator('#conv-stride').selectOption('2');
    await page.locator('#conv-padding').selectOption('1');
    assert.equal(await page.locator('[data-output]').count(), 9);
    assert.equal(await page.locator('#conv-input .padding').count(), 24);
    await page.locator('[data-output="8"]').click();
    assert.match(await page.locator('#conv-position').innerText(), /9 \/ 9/);
    assert.equal(await page.locator('#conv-input .patch').count(), 9);
    await page.locator('#conv-kernel').selectOption('blur');
    await page.locator('#conv-next').click();
    assert.equal(await page.locator('#conv-terms .term').count(), 9);
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'convolution-en.png'), fullPage: true });
    checks.push('convolution: independent hand calculation, editing, focus, padding, receptive field, kernel and stride');

    for (const width of [1440, 1024, 768, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const topic of ['fold', 'gradient', 'convolution']) {
        await page.locator('.lesson-link[href="#' + topic + '"]').click();
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth, document: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('main *')].filter(el => {
            const r = el.getBoundingClientRect(); return r.width && (r.right > innerWidth + 2 || r.left < -2);
          }).map(el => el.id || el.tagName).slice(0, 8)
        }));
        assert.ok(overflow.document <= overflow.viewport + 2 && overflow.elements.length === 0,
          width + 'px ' + topic + ' overflow: ' + JSON.stringify(overflow));
      }
    }
    checks.push('all three lessons fit at 1440 / 1024 / 768 / 390 / 360 / 320px');
    await page.emulateMedia({ colorScheme: 'dark' });
    if (screenshots) await page.screenshot({ path: path.join(screenshots, 'mobile-dark.png'), fullPage: true });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.notEqual(bg, 'rgb(247, 246, 242)');
    checks.push('system dark theme renders without runtime errors');

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
      checks.push('CLI-exported copy opens offline with requested topic and language');
    }
    assert.deepEqual(errors, [], 'browser errors');
    assert.deepEqual(externalRequests, [], 'offline lab must not request external resources');
    console.log(JSON.stringify({ status: 'passed', checks, browserErrors: errors, externalRequests }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
