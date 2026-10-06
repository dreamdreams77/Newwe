// Automated accessibility audit (axe-core) over the main screens and windows. Fails on serious/critical issues.
import fs from 'node:fs';
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const axeSrc = fs.readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const URL_ = process.env.URL ?? (process.env.E2E_BASE ?? 'http://127.0.0.1:4173/') + '?fresh&seed=61&debug';
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const wait = (ms) => page.waitForTimeout(ms);
const mut = (fn, a) => page.evaluate(fn, a);
const report = [];
async function audit(name) {
  await wait(500);
  await page.evaluate(axeSrc);
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'], runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]) , count: v.nodes.length }));
  });
  for (const v of res) report.push({ screen: name, ...v });
  console.log(`${name}: ${res.length} rule(s) violated${res.length ? ' -> ' + res.map((v) => `${v.id}(${v.impact},${v.count})`).join(', ') : ''}`);
}
const setup = () => mut(() => { const g = window.__game.g; const s = g.state; s.stage = 4; s.visitors = 600; for (const k of ['inventory','cards','journal','stats','creature','memories','mypage','eleven','crafting','terminal']) s.ui.revealed[k] = true; s.flags.lake_solved = true; s.flags.postcard_decoded = true; s.flags.e404_open = true; s.flags.clue_404 = true; s.flags.boss_defeated = true; s.flags.tas_diffs = true; s.flags.oak_found = true; s.flags.finale_seen = true; s.flags.cw_solved = 'cw1,cw2,cw3,cw4,cw5,cw6,cw7'; s.flags.hits_100 = true; s.flags.hits_500 = true; s.badges.push('parent'); g.changed(); });

await page.goto(URL_); await wait(600); await audit('splash');
await page.click('text=ENTER SITE'); await wait(400); await setup();
for (const z of ['home', 'construction', 'guestbook', 'lake', 'lighthouse', 'e404', 'dungeon', 'forest', 'tasmania', 'terminal', 'brokenHome', 'mypage', 'parent']) {
  await mut((z) => window.__game.navigate(z, { free: true }), z); await audit('zone:' + z);
}
for (const t of ['stats', 'inventory', 'cards', 'journal']) {
  await mut(() => window.__game.navigate('home', { free: true }));
  await page.click(`.tools button[data-tool="${t}"]`).catch(() => {}); await audit('window:' + t);
  await page.keyboard.press('Escape');
}
await mut(() => { void window.__game.runEncounter('vm1111'); }); await audit('boss1');
await page.click('.combat-win >> text=Retreat').catch(() => {});
await mut(() => window.__game.navigate('brokenHome', { free: true })); await wait(300);
await page.click('[data-fk="bh-start"]').catch(() => {}); await audit('boss2');
const serious = report.filter((v) => ['serious', 'critical'].includes(v.impact));
fs.writeFileSync('/tmp/a11y-report.json', JSON.stringify(report, null, 1));
console.log(`\n${report.length} violations total, ${serious.length} serious/critical`);
await browser.close();
process.exit(serious.length ? 1 : 0);
