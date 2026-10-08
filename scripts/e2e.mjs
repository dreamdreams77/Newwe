// Runs every browser suite against a fresh production build served by `vite preview`, then prints a summary.
//   npm run e2e                 all suites
//   npm run e2e -- forest a11y  just these
// Env: PLAYWRIGHT_PATH / CHROME_PATH override where Playwright and Chromium come from.
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = process.env.E2E_PORT ?? '4173';
const URL_ = `http://127.0.0.1:${PORT}/`;
const all = readdirSync(new URL('../tests/e2e/', import.meta.url)).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => f.replace(/\.mjs$/, ''));
const wanted = process.argv.slice(2);
const suites = wanted.length ? wanted : all;
const unknown = suites.filter((s) => !all.includes(s));
if (unknown.length) { console.error(`unknown suite(s): ${unknown.join(', ')}. have: ${all.join(', ')}`); process.exit(2); }

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));
const stop = () => { try { process.kill(-server.pid); } catch { /* already gone */ } };
process.on('exit', stop);
/** plain node:http (not fetch): fetch can be redirected through an environment proxy, which is wrong for a local server */
const ping = (url) => new Promise((resolve) => { const r = http.get(url, (res) => { res.resume(); resolve(res.statusCode === 200); }); r.on('error', () => resolve(false)); r.setTimeout(1500, () => { r.destroy(); resolve(false); }); });
let up = false;
for (let i = 0; i < 150 && !up; i++) {
  up = await ping(URL_);
  if (!up) await sleep(200);
}
if (!up) {
  console.error(`the preview server did not come up at ${URL_} (is dist/ built? try: npm run build)\n${serverLog}`);
  stop();
  process.exit(3);
}

const rows = [];
for (const name of suites) {
  const started = Date.now();
  const env = { ...process.env, E2E_BASE: URL_ };
  // most suites build their own ?fresh&seed=N URL; the fuzzer wants the bare base
  if (name === 'fuzz') env.URL = URL_;
  else delete env.URL;
  const r = spawnSync('node', [`tests/e2e/${name}.mjs`], { env, encoding: 'utf8', timeout: 15 * 60 * 1000 });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const ok = r.status === 0;
  rows.push({ suite: name, result: ok ? 'pass' : 'FAIL', secs });
  if (!ok) console.log(`\n--- ${name} output (tail) ---\n${(r.stdout + r.stderr).split('\n').slice(-25).join('\n')}\n`);
}
console.log('\n' + 'suite'.padEnd(14) + 'result'.padEnd(8) + 'seconds');
for (const r of rows) console.log(r.suite.padEnd(14) + r.result.padEnd(8) + r.secs);
stop();
process.exit(rows.some((r) => r.result === 'FAIL') ? 1 : 0);
