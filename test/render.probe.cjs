const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 640, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5199/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForFunction(
    () => {
      const e = document.querySelector('#fld-alt');
      return e && e.textContent && e.textContent !== '—';
    },
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 2500));

  // Deterministic default (free orbit) view render, then a follow-view capture.
  const freePng = path.join(OUT, 'render_free.png');
  await page.screenshot({ path: freePng });

  await page.evaluate(() => {
    document.querySelector('.view-btn[data-view="follow"]').click();
  });
  await new Promise((r) => setTimeout(r, 3000));
  const followPng = path.join(OUT, 'render_follow.png');
  await page.screenshot({ path: followPng });

  const clock = await page.evaluate(() => document.querySelector('.clock').textContent);
  console.log('follow clock:', clock);
  await browser.close();

  execSync(`node ${path.join(__dirname, 'analyze-png.cjs')} "${freePng}" "${followPng}"`, {
    stdio: 'inherit',
  });
})();