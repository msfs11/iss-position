const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless:'shell', args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto('http://localhost:5200/', {waitUntil:'load', timeout:45000});
  await page.waitForFunction(()=>{
    const e=document.querySelector('#fld-alt'); return e && e.textContent && e.textContent!=='—';
  },{timeout:30000});
  const alt = await page.evaluate(()=>document.querySelector('#fld-alt').textContent);
  console.log('PROD PREVIEW alt:', alt, '| pageErrors:', pageErrors.length);
  console.log('PROD PREVIEW ' + (pageErrors.length===0 && alt && alt!=='—' ? 'PASS' : 'FAIL'));
  await browser.close();
})();
