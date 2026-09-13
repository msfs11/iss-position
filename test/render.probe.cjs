const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5199/', { waitUntil: 'load', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 9000));

  const probe = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'no gl' };
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);

    let nonBlack = 0;
    let bright = 0;
    let blueColor = 0; // earth-like blue
    let warmColor = 0; // sun-lit / star warm colors
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (r + g + b < 30) continue; // near black
      nonBlack++;
      if (r + g + b > 330) bright++;
      if (b > 40 && b > r * 1.4 && g < b) blueColor++;
      if (r > 90 && r > g && r > b) warmColor++;
    }
    return {
      w,
      h,
      nonBlack,
      bright,
      blueColor,
      warmColor,
      total: w * h,
      pctVisible: ((nonBlack / (w * h)) * 100).toFixed(1),
    };
  });
  console.log(JSON.stringify(probe, null, 2));

  // also tweak: go to Follow view, wait, screenshot again
  await page.evaluate(() => {
    document.querySelector('.view-btn[data-view="follow"]').click();
  });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: '/tmp/iss_follow.png' });

  const second = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return { clock: document.querySelector('.clock').textContent };
  });
  console.log('follow clock:', second.clock);
  await browser.close();
})();