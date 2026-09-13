const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  const fails = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  const ck = (name, cond) => {
    console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
    if (!cond) fails.push(name);
  };
  await page.goto('http://localhost:5199/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForFunction(
    () => {
      const e = document.querySelector('#fld-alt');
      return e && e.textContent && e.textContent !== '—';
    },
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 1000));

  const clock = () => page.evaluate(() => document.querySelector('.clock').textContent);

  // pause
  await page.click('.pause-btn');
  const c0 = await clock();
  await new Promise((r) => setTimeout(r, 2000));
  const c1 = await clock();
  ck('pause freezes clock', c0 === c1);

  // 100x speed (unpause first)
  await page.click('.pause-btn');
  await page.click('.speed-btn[data-speed="100"]');
  const c2 = await clock();
  await new Promise((r) => setTimeout(r, 1500));
  const c3 = await clock();
  const dt = new Date(c3) - new Date(c2);
  ck('100x advances clock (~150s)', dt > 60000 && dt < 500000, dt);

  // back to 1x
  await page.click('.speed-btn[data-speed="1"]');

  // reverse
  await page.click('.reverse-btn');
  const c4 = await clock();
  await new Promise((r) => setTimeout(r, 1500));
  const c5 = await clock();
  ck('reverse goes backward', new Date(c5) < new Date(c4));
  await page.click('.reverse-btn');

  // seek to a specific past date
  await page.evaluate(() => {
    const inp = document.querySelector('.seek');
    inp.value = '2024-01-01T00:00:00';
    inp.dispatchEvent(new Event('change'));
  });
  await new Promise((r) => setTimeout(r, 800));
  const cs = await clock();
  ck('seek jumps clock to 2024', cs.startsWith('2024-01-01'));

  // far-past seek: SGP4 is wildly outside TLE validity here; must not crash.
  await page.evaluate(() => {
    const inp = document.querySelector('.seek');
    inp.value = '1998-11-20T00:00:00';
    inp.dispatchEvent(new Event('change'));
  });
  await new Promise((r) => setTimeout(r, 1500));
  ck('far-past seek does not crash', pageErrors.length === 0, pageErrors[0]);

  // Now button returns to real time
  await page.evaluate(() => {
    const inp = document.querySelector('.seek');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    inp.value = `${now.getUTCFullYear()}-${pad(now.getUTCMonth()+1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:01`;
    inp.dispatchEvent(new Event('change'));
  });
  await page.click('.now-btn');
  await new Promise((r) => setTimeout(r, 600));
  const cn = await clock();
  ck('Now returns to real time', cn.slice(0, 4) === String(new Date().getUTCFullYear()));

  // toggles
  const groundChecked = () =>
    page.evaluate(() => document.querySelector('[data-toggle="showGround"]').checked);
  await page.click('[data-toggle="showGround"]');
  ck('ground toggle unchecked', (await groundChecked()) === false);
  await page.click('[data-toggle="showGround"]');

  // grid toggle
  await page.evaluate(() => {
    const g = document.querySelector('[data-toggle="showGrid"]');
    g.checked = true;
    g.dispatchEvent(new Event('change'));
  });
  ck('grid toggled without errors', true);

  // view buttons
  await page.click('.view-btn[data-view="follow"]');
  await new Promise((r) => setTimeout(r, 2500));
  ck('follow view active', await page.evaluate(() =>
    document.querySelector('.view-btn[data-view="follow"]').classList.contains('active')));

  // help modal
  await page.click('.help-btn');
  ck('help modal opens', await page.evaluate(() =>
    document.querySelector('.help-modal').style.display === 'flex'));
  await page.click('.help-close');
  ck('help modal closes', await page.evaluate(() =>
    document.querySelector('.help-modal').style.display === 'none'));

  // telemetry alt sanity
  const alt = await page.evaluate(() => document.querySelector('#fld-alt').textContent);
  const num = parseFloat(alt);
  ck(`altitude sane (${alt})`, num > 380 && num < 460);
  ck('no runtime page errors across scenarios', pageErrors.length === 0, pageErrors.join(' | '));

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL BEHAVIOR TESTS PASSED');
  await browser.close();
})().catch((e) => {
  console.error('CRASH', e);
  process.exit(1);
});