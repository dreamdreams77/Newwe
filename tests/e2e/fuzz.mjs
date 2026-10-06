// Monkey test: after unlocking the whole game, click random things in the real UI for a few hundred steps per seed.
// Fails on any uncaught exception, console error, or a stuck page (nothing clickable). Seeded, so a failure replays.
// Usage: SEEDS=1,2,3 STEPS=300 node tests/e2e/fuzz.mjs
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const SEEDS = (process.env.SEEDS ?? '1,2,3').split(',').map(Number);
const STEPS = Number(process.env.STEPS ?? 250);
const BASE = process.env.URL ?? 'http://127.0.0.1:4173/';
const SKIP = /new game|delete|erase|clear|reset|wipe|import|load password|paste/i;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let failures = 0;
for (const seed of SEEDS) {
  const r = rng(seed * 7919);
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(`${BASE}?fresh&seed=${seed}&debug`);
  await page.click('text=ENTER SITE');
  await page.waitForTimeout(300);
  // unlock the world so the fuzzer reaches the late content too
  await page.evaluate(() => {
    const g = window.__game.g; const s = g.state;
    s.stage = 4; s.visitors = 700; for (const k of ['inventory', 'cards', 'journal', 'stats', 'creature', 'memories', 'mypage', 'eleven', 'crafting', 'terminal']) s.ui.revealed[k] = true;
    Object.assign(s.flags, { lake_solved: true, postcard_decoded: true, e404_open: true, clue_404: true, boss_defeated: true, finale_seen: true, lamp_lit: true, boat_ridden: true, fern_met: true, devil_met: true, oak_found: true, tas_diffs: true });
    for (const id of ['coffee', 'good_coffee', 'yoghurt', 'willow_leaf', 'duct_tape', 'token_broken', 'token_mended', 'snack_711', 'floppy', 'receipt', 'forest_mushroom', 'crt_goggles', 'keepers_coat', 'glitch_sprite', 'edge_coin', 'stopped_clock', 'chain_letter', 'tree_ring', 'aurora_jar']) s.inventory[id] = { qty: 2, acquiredAt: s.clock.minutes };
    g.changed();
  });
  const zones = ['home', 'construction', 'guestbook', 'lake', 'lighthouse', 'e404', 'dungeon', 'forest', 'tasmania', 'terminal', 'brokenHome', 'mypage'];
  let stuck = 0;
  const log = [];
  for (let step = 0; step < STEPS; step++) {
    if (step % 40 === 0) {
      const z = zones[Math.floor(r() * zones.length)];
      await page.evaluate((z) => window.__game.navigate(z, { free: true }), z);
      log.push(`goto ${z}`);
      await page.waitForTimeout(120);
    }
    // pick something clickable that is visible and enabled
    const handle = await page.evaluateHandle((pick) => {
      const els = [...document.querySelectorAll('button, a[href], [role=button], input[type=checkbox], input[type=radio], canvas')].filter((e) => {
        const b = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return b.width > 2 && b.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.disabled && cs.pointerEvents !== 'none';
      });
      return els.length ? els[Math.floor(pick * els.length)] : null;
    }, r());
    const el = handle.asElement();
    if (!el) { if (++stuck > 3) { errors.push('STUCK: nothing clickable'); break; } await page.keyboard.press('Escape'); continue; }
    stuck = 0;
    const label = await el.evaluate((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40));
    if (SKIP.test(label)) continue;
    log.push(`click ${label}`);
    try { await el.click({ timeout: 350, force: false }); } catch { /* covered or moved: fine */ }
    if (r() < 0.12) await page.keyboard.press('Escape');
    if (r() < 0.05) await page.keyboard.type('ab');
    if (step % 15 === 0) {
      // invariants: state stays sane
      const bad = await page.evaluate(() => {
        const s = window.__game.g.state; const issues = [];
        if (!(s.vitals.hp >= 0 && s.vitals.hp <= s.vitals.hpMax)) issues.push('hp out of range ' + s.vitals.hp);
        if (!(s.vitals.coffee >= 0 && s.vitals.coffee <= s.vitals.coffeeMax)) issues.push('coffee out of range ' + s.vitals.coffee);
        for (const [k, v] of Object.entries(s.stats)) if (!(v >= 0 && v <= 40 && Number.isFinite(v))) issues.push('stat ' + k + '=' + v);
        for (const [k, v] of Object.entries(s.inventory)) if (!(v.qty > 0)) issues.push('item ' + k + ' qty ' + v.qty);
        if (!Number.isFinite(s.clock.minutes) || s.clock.minutes < 0) issues.push('clock ' + s.clock.minutes);
        if (!(s.eleven.charges >= 0 && s.eleven.charges <= 9)) issues.push('eleven ' + s.eleven.charges);
        return issues;
      });
      for (const b of bad) errors.push('INVARIANT: ' + b);
    }
    if (errors.length) break;
  }
  console.log(`seed ${seed}: ${errors.length ? 'FAIL' : 'ok'} (${log.length} actions)`);
  if (errors.length) { failures++; console.log('  ' + errors.slice(0, 5).join('\n  ')); console.log('  last actions: ' + log.slice(-8).join(' | ')); }
  await page.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
