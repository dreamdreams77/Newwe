// What a visitor gets when the host publishes the repository as-is (GitHub Pages "Deploy from a branch"): the unbuilt
// index.html. It must notice its script cannot run and send them to the committed build in play/, not leave a white page.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ts': 'video/mp2t' /* what static hosts say for .ts: not JavaScript */ };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const assert = (c, m) => { if (!c) throw new Error('ASSERT FAILED: ' + m); };
let ok = false;
try {
  const page = await browser.newPage();
  await page.goto(`${base}/index.html?fresh`);
  await page.waitForURL(/\/play\/\?fresh$/, { timeout: 10000 });
  await page.waitForSelector('text=ENTER SITE', { timeout: 10000 });
  assert(await page.$eval('#boot-fallback', (e) => e.hidden), 'no error notice: the visitor landed in the game');
  console.log('[01] The raw, unbuilt index.html redirects to the committed build in play/, and the game starts (query string kept)');
  ok = true;
} finally {
  await browser.close();
  server.close();
}
process.exit(ok ? 0 : 1);
