// The Whispering Woods, through the real UI: guard, Fern, the foxfire trail at night, the oak, the ring.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?fresh&seed=' + (process.env.SEED ?? '41') + '&debug';
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
let n = 0;
const log = (m) => console.log(`[${String(++n).padStart(2, '0')}] ${m}`);
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.g.state)));
const assert = (c, m) => { if (!c) throw new Error('ASSERT FAILED: ' + m); };
const wait = (ms) => page.waitForTimeout(ms);
const mut = (fn, a) => page.evaluate(fn, a);
const fk = (k) => `[data-fk="${k}"]`;
async function choose(frag) { const sel = `.dialogue-win .dlg-choice:has-text("${frag}")`; await page.waitForSelector(sel, { timeout: 8000 }); await page.click(sel); }
async function rollCheck(approach) {
  await page.waitForSelector('.check-win');
  if (approach) await page.click(`.check-win label.approach:has-text("${approach}")`);
  await page.click('.check-win button:has-text("ROLL")');
  await page.waitForSelector('.check-win .roll-total');
  const cls = await page.$eval('.check-win .roll-total', (e) => e.className);
  await page.click('.check-win button:has-text("Continue")');
  await page.waitForSelector('.check-win', { state: 'detached' });
  return /success|crit/.test(cls) && !/critFail/.test(cls);
}

await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(300);

// guarded until the lake is solved
await mut(() => window.__game.navigate('forest', { free: true }));
await wait(300);
assert((await state()).zone !== 'forest', 'the forest is guarded');
log('The Forest does not load until the lake has been solved');

await mut(() => { const g = window.__game.g; g.state.flags.lake_solved = true; g.state.stats.observation = 2; g.state.clock.minutes = 12 * 60; g.changed(); window.__game.navigate('forest', { free: true }); });
await wait(400);
assert((await state()).zone === 'forest', 'forest open after the lake');

// mushrooms: pick, craft nothing, eat one
await page.click(fk('hs-shrooms'));
await wait(200);
let s = await state();
assert(s.inventory.forest_mushroom?.qty === 1, 'picked a mushroom');
log('Picked a Speckled Mushroom from the ring (the ring is an ecosystem: it shrinks)');

// Fern: meet and learn about the foxfire
await page.click(fk('hs-fern'));
await page.waitForSelector('.dialogue-win');
for (let i = 0; i < 4; i++) { if (await page.$('.dialogue-win .dlg-choice:has-text("How do I get through the trail")')) break; await page.click('.dialogue-win .dlg-text').catch(() => {}); const only = await page.$$eval('.dlg-choice', (e) => (e.length === 1 ? e[0].textContent : '')); if (only) await page.click('.dlg-choice').catch(() => {}); await wait(150); }
await choose('How do I get through the trail');
for (let i = 0; i < 8; i++) { if (await page.$('.dialogue-win .dlg-choice:has-text("Bye")')) break; const only = await page.$$eval('.dlg-choice', (e) => (e.length === 1 ? e[0].textContent : '')); if (only) await page.click('.dlg-choice').catch(() => {}); else await page.click('.dialogue-win .dlg-text').catch(() => {}); await wait(200); }
await choose('Bye');
await page.waitForSelector('.dialogue-win', { state: 'detached' });
s = await state();
assert(s.flags.fern_met && s.knowledge.includes('forest_foxfire'), 'met Fern and learned about the foxfire');
log('Fern: "follow the glow, but only after dark" (Boss Knowledge-style note learned)');

// daytime: the sign is no help
await page.click(fk('hs-sign'));
await page.waitForSelector('.trail-win');
assert(/THIS WAY/.test(await page.textContent('.trail-win .unknown')), 'daytime sign is useless');
// ...but you can sit on the stump until dusk, right there in the trail window
const before = (await state()).clock.minutes;
await page.click(fk('trail-wait'));
await page.waitForSelector('.trail-win .know');
const after = (await state()).clock.minutes;
assert(after - before >= 5 * 60 && after % 1440 >= 18 * 60, 'waited until dusk: ' + (after - before) + ' min');
log('By day the signpost is useless, but "Sit on the stump until dusk" passes the time (costing it) and the foxfire wakes up');
await wait(200);
// one deliberate wrong turn first
let t = await page.textContent('.trail-win .know');
await page.click(fk(/LEFT/.test(t) ? 'trail-R' : 'trail-L'));
await wait(250);
s = await state();
assert(s.flags.trail_step === 0 && s.ailments.some((a) => a.id === 'lost'), 'a wrong turn resets and loses you');
log('A wrong turn: back to the start and LOST');
for (let i = 0; i < 3; i++) {
  await page.waitForSelector('.trail-win .know');
  t = await page.textContent('.trail-win .know');
  await page.click(fk(/LEFT/.test(t) ? 'trail-L' : 'trail-R'));
  await wait(250);
}
s = await state();
assert(s.flags.oak_found, 'three forks followed: the oak is found');
await page.waitForSelector('.trail-win', { state: 'detached' }).catch(() => {});
log('Followed the foxfire through all three forks to the Old Oak');

// the oak: count the rings (boost Observation so the roll is fair)
await mut(() => { const g = window.__game.g; g.state.stats.observation = 15; g.changed(); });
let ok = false;
for (let i = 0; i < 4 && !ok; i++) {
  await page.click(fk('hs-oak'));
  ok = await rollCheck('Count the rings');
  await wait(200);
}
s = await state();
assert(s.flags.tree_ring_taken && s.inventory.tree_ring && s.memories.includes('FOREST_001') && s.knowledge.includes('forest_eleven'), 'ring, memory and knowledge from the oak');
log('Counted the rings: eleven. The Ring of the Old Oak, a memory and a clue are yours');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nNo console errors or warnings.');
await browser.close();
if (errors.length) process.exit(1);
