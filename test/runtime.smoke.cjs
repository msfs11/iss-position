const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  const logs = [];
  const errors = [];
  page.on('console', (m) => {
    logs.push(m.type() + ': ' + m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));

  await page.goto('http://localhost:5199/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForFunction(
    () => {
      const e = document.querySelector('#fld-alt');
      return e && e.textContent && e.textContent !== '—';
    },
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 1000));

  const state = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const splash = document.getElementById('splash');
    const fields = {};
    document.querySelectorAll('.field dd').forEach((d) => {
      fields[d.id] = d.textContent;
    });
    const clock = document.querySelector('.clock')?.textContent;
    const bodyPanel = document.querySelector('.panel__body dl') ? true : false;
    return {
      hasCanvas: !!canvas,
      canvasSize: canvas ? [canvas.width, canvas.height] : null,
      splashInDom: !!splash,
      fields,
      clock,
      showGround: document.querySelector('[data-toggle="showGround"]')?.checked,
      viewBtns: Array.from(document.querySelectorAll('.view-btn')).map((b) => b.textContent.trim()),
      bodyPanel,
    };
  });

  console.log('=== STATE ===');
  console.log(JSON.stringify(state, null, 2));

  // Take screenshot
  await page.screenshot({ path: '/tmp/iss_screenshot.png' });
  console.log('=== LOGS ===');
  logs.slice(0, 30).forEach((l) => console.log(l));
  console.log('=== ERRORS ===');
  errors.slice(0, 20).forEach((e) => console.log(e));

  if (!state.hasCanvas) {
    console.error('NO CANVAS — FAIL');
  }
  if (state.fields['fld-alt'] === '—' || state.fields['fld-alt'] === undefined) {
    console.error('TELEMETRY EMPTY — FAIL');
  }
  await browser.close();
})();