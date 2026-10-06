// Offline play: visit once online, go offline, reload, and the game still opens.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const BASE = process.env.URL ?? 'http://127.0.0.1:4173/';
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
let n = 0;
const log = (m) => console.log(`[${String(++n).padStart(2, '0')}] ${m}`);
const assert = (c, m) => { if (!c) throw new Error('ASSERT FAILED: ' + m); };

await page.goto(BASE); // no ?debug or ?fresh, so the service worker registers
await page.waitForSelector('text=ENTER SITE');
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await page.waitForTimeout(1500); // let the precache message land
const manifest = await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json()));
assert(manifest.name.includes('11:11') && manifest.icons.length >= 2, 'a web app manifest with icons');
log('The service worker is active and the web app manifest is valid (installable)');

await context.setOffline(true);
await page.reload();
await page.waitForSelector('text=ENTER SITE', { timeout: 8000 });
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
