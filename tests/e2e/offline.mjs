// Offline play: visit once online, go offline, reload, and the game still opens.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const BASE = process.env.URL ?? (process.env.E2E_BASE ?? 'http://127.0.0.1:4173/') + '';
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
const page = await context.newPage();
const errors = [];
const failed = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
let n = 0;
const log = (m) => console.log(`[${String(++n).padStart(2, '0')}] ${m}`);
const assert = (c, m) => { if (!c) throw new Error('ASSERT FAILED: ' + m); };

await page.goto(BASE); // no ?debug or ?fresh, so the service worker registers
await page.waitForSelector('text=ENTER SITE');
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
// wait for the cache to actually hold the app (script, stylesheet and page), rather than guessing a delay
await page.waitForFunction(async () => {
  const keys = (await (await caches.open('eleven-eleven-v1')).keys()).map((r) => r.url);
  return keys.some((u) => u.endsWith('.js')) && keys.some((u) => u.endsWith('.css')) && keys.some((u) => /\/$/.test(u));
}, null, { timeout: 15000 });
const manifest = await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json()));
assert(manifest.name.includes('11:11') && manifest.icons.length >= 2, 'a web app manifest with icons');
log('The service worker is active and the web app manifest is valid (installable)');

await context.setOffline(true);
// opening the app with no signal is a fresh navigation (not a reload), which is what an installed PWA does
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('text=ENTER SITE', { timeout: 10000 });
} catch (e) {
  const info = await page.evaluate(async () => ({
    url: location.href,
    ready: document.readyState,
    body: document.body?.innerText?.slice(0, 120),
    controller: !!navigator.serviceWorker?.controller,
    cache: (await (await caches.open('eleven-eleven-v1')).keys()).map((r) => r.url.replace(location.origin, '')),
  })).catch((err) => ({ evaluateFailed: String(err) }));
  console.log('OFFLINE DIAGNOSTICS', JSON.stringify(info, null, 1), 'FAILED REQUESTS', JSON.stringify(failed.slice(0, 12), null, 1));
  throw e;
}
log('Offline: reload still shows the title screen from cache');
await page.click('text=ENTER SITE');
await page.waitForSelector('.browser .viewport', { timeout: 8000 });
const home = await page.textContent('.viewport');
assert(/WELCOME|Welcome|homepage/i.test(home), 'the homepage renders offline: ' + home.slice(0, 80));
log('Offline: the game itself runs (homepage, hit counter, everything is local)');
await context.setOffline(false);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nNo page errors.');
await browser.close();
process.exit(errors.length ? 1 : 0);
