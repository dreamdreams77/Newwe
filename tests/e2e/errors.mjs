// Failure modes a real player hits: an uncaught error, a browser without CompressionStream, a slow connection.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4173/';
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let n = 0;
const log = (m) => console.log(`[${String(++n).padStart(2, '0')}] ${m}`);
const assert = (c, m) => { if (!c) throw new Error('ASSERT FAILED: ' + m); };
const toasts = (page) => page.$$eval('.toast', (e) => e.map((x) => x.textContent));

// 1) an uncaught error becomes a visible, copyable message (not a silent console line)
{
  const page = await browser.newPage();
  await page.goto(BASE + '?fresh&debug');
  await page.click('text=ENTER SITE');
  await page.waitForTimeout(300);
  assert(!(await toasts(page)).some((t) => /glitched/.test(t)), 'no error toast on a healthy page');
  await page.evaluate(() => setTimeout(() => { throw new Error('boom from a test'); }, 0));
  await page.waitForTimeout(300);
  const t = (await toasts(page)).find((x) => /glitched/.test(x));
  assert(t && /boom from a test/.test(t), 'the toast carries the real error text: ' + t);
  log('An uncaught error shows a calm toast with the real message, so it can be reported');
  await page.close();
}

// 2) a browser without CompressionStream: the save-password window explains itself instead of hanging on "Generating..."
{
  const context = await browser.newContext();
  await context.addInitScript(() => { delete window.CompressionStream; delete window.DecompressionStream; });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(BASE + '?fresh&debug');
  await page.click('text=ENTER SITE');
  await page.waitForTimeout(300);
  await page.click('.menu:has-text("File") > button');
  await page.click('button:has-text("Save Password")');
  await page.waitForSelector('.savepw-win');
  await page.waitForFunction(() => /too old/.test(document.querySelector('.savepw-win textarea')?.value ?? ''), null, { timeout: 4000 });
  await page.fill('.savepw-win textarea[placeholder]', '7F9K-11XQ-AAAA');
  await page.click('.savepw-win button:has-text("Load")');
  await page.waitForFunction(() => /too old/.test(document.querySelector('.pw-err')?.textContent ?? ''), null, { timeout: 4000 });
  assert(pageErrors.length === 0, 'no uncaught errors: ' + pageErrors.join('; '));
  log('Without CompressionStream the save-password window says so plainly (making and loading), with no uncaught errors');
  await context.close();
}

// 3) a slow connection: the "game did not start" notice must never sit on top of a game that did start
{
  const context = await browser.newContext({ viewport: { width: 420, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 60 * 1024, uploadThroughput: 60 * 1024 });
  await page.goto(BASE + '?nosw', { waitUntil: 'commit' });
  await page.waitForSelector('text=ENTER SITE', { timeout: 60000 });
  await page.waitForTimeout(1500);
  assert(await page.$eval('#boot-fallback', (e) => e.hidden), 'notice hidden once the game has loaded, however slowly');
  log('On a throttled connection the game loads and the "did not start" notice stays hidden');
  await context.close();
}
await browser.close();
