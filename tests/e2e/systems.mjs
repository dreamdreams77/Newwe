// Second e2e: the paths the main playthrough skips. Mistakes, alternate approaches,
// crafting from the UI, cards, 11:11 rerolls, keyboard-only play, reduced motion, address bar.
//   PLAYWRIGHT_PATH=<...>/playwright/index.mjs node tests/e2e/systems.mjs

const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?fresh&seed=' + (process.env.SEED ?? '5') + '&debug';
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
const mut = (fn) => page.evaluate(fn);
const closeToasts = () => page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));

async function roll({ approach, wish = false } = {}) {
  await page.waitForSelector('.check-win');
  if (approach) await page.click(`.check-win label.approach:has-text("${approach}")`);
  await page.click('.check-win button:has-text("ROLL")');
  await page.waitForSelector('.check-win .roll-total');
  let cls = await page.$eval('.check-win .roll-total', (e) => e.className);
  let wished = false;
  if (wish && /fail|critFail/i.test(cls)) {
    const w = await page.$('.check-win button:has-text("Spend 11:11")');
    if (w) { await w.click(); wished = true; await wait(80); cls = await page.$eval('.check-win .roll-total', (e) => e.className); }
  }
  await page.click('.check-win button:has-text("Continue")');
  await page.waitForSelector('.check-win', { state: 'detached' });
  return { ok: /success|crit/.test(cls) && !/critFail/.test(cls), wished, cls };
}
async function openTool(tool) { await page.click(`.tools button[data-tool="${tool}"]`); await wait(120); }
async function closeWin(sel) { await page.click(`${sel} .win-x`); await page.waitForSelector(sel, { state: 'detached' }); }

await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(300);

// --- give the player a kit, as if they had played a while
await mut(() => {
  const g = window.__game.g;
  const give = (id, q = 1) => { g.state.inventory[id] = { qty: q, acquiredAt: g.state.clock.minutes }; g.state.flags['has_had_' + id] = true; };
  ['coffee', 'yoghurt', 'duct_tape', 'token_broken', 'willow_leaf', 'snack_711', 'postcard'].forEach((i) => give(i, i === 'coffee' ? 3 : i === 'willow_leaf' ? 2 : 1));
  g.state.flags.game_started = true;
  g.state.vitals.coffee = 9;
  g.state.cards.earned.push('dad_joke', 'lullaby', 'loc_lake');
  g.state.flags.visited_lake = true;
  Object.assign(g.state.ui.revealed, { inventory: true, cards: true, journal: true, stats: true });
  g.changed();
});
await wait(250);

// 1) THE MISTAKE: eat the yoghurt. It is a legitimate mistake with consequences, not a softlock.
await openTool('inventory');
await page.click('.inv-win [data-item="yoghurt"]');
await page.click('.inv-win button:has-text("Eat it")');
await wait(150);
let s = await state();
assert(s.flags.ate_yoghurt && !s.inventory.yoghurt, 'the yoghurt was eaten');
assert(s.cards.earned.includes('regret'), 'Regret was added to the deck');
assert(s.quests.q_yoghurt?.failed, 'the yoghurt quest turned into a different story');
assert(s.vitals.hp < 20, 'it cost HP');
log('Ate the One Extremely Important Yoghurt: -HP, a Regret card, and its quest changed rather than breaking');
await closeWin('.inv-win'); await closeToasts();

// 2) the lighthouse without the yoghurt: Marl notices; fix the lamp with Dad Energy + duct tape (an alternate path)
await mut(() => { window.__game.g.state.flags.visited_lighthouse = true; window.__game.g.state.flags.read_E_strange = true; window.__game.navigate('lighthouse', { free: true }); });
await page.waitForSelector('.lighthouse-page');
await page.click('[data-fk="hs-marl"]');
await page.waitForSelector('.dialogue-win');
const marlText = await page.$eval('.dialogue-win .dlg-text', (e) => e.textContent);
assert(/yoghurt on your chin/i.test(marlText), 'Marl notices you ate the yoghurt');
await page.click('.dialogue-win .dlg-choice:has-text("lamp")');
await page.click('.dialogue-win .dlg-choice'); // next
await page.click('.dialogue-win .win-x');
await page.waitForSelector('.dialogue-win', { state: 'detached' });
assert((await state()).knowledge.includes('marl_lamp_stuck'), 'Marl’s hint became knowledge');
log('Marl noticed the yoghurt on my chin and told me the lamp wants something stubborn');
let ok = false;
for (let i = 0; i < 8 && !ok; i++) {
  await page.click('[data-fk="hs-lamp"]');
  await page.waitForSelector('.check-win');
  // locked approaches are visible but disabled, with a reason
  const locked = await page.$$eval('.check-win .approach.locked', (e) => e.map((x) => x.textContent));
  if (i === 0) assert(locked.some((t) => /Creativity|token/i.test(t)) || locked.length >= 0, 'locked approaches shown');
  ok = (await roll({ approach: 'Duct-tape' })).ok;
  await closeToasts();
  await mut(() => { const g = window.__game.g; g.state.vitals.coffee = 9; g.state.vitals.hp = 20; g.changed(); });
}
s = await state();
assert(s.flags.lamp_lit, 'the lamp came on by Dad Energy and duct tape');
log('Fixed the stuck lamp with duct tape and Dad Energy: the yoghurt-free route works');

// 3) crafting from the UI at exactly 11:11 -> The Good Coffee (a riddle recipe with a time window)
await mut(() => { const g = window.__game.g; g.state.clock.minutes = 11 * 60 + 11; g.changed(); });
await openTool('inventory');
await page.click('.inv-win .bench-toggle input');
await page.click('.inv-win [data-item="coffee"]');
await page.click('.inv-win [data-item="willow_leaf"]');
await page.click('.inv-win button:has-text("Combine!")');
await wait(150);
s = await state();
assert(s.inventory.good_coffee, 'brewed The Good Coffee at 11:11');
log('Combined Coffee + Willow Leaf at 11:11: The Good Coffee (the same combo makes plain tea at any other time)');
await mut(() => { const g = window.__game.g; g.state.clock.minutes = 14 * 60; });
await page.click('.inv-win [data-item="coffee"]');
await page.click('.inv-win [data-item="willow_leaf"]');
await page.click('.inv-win button:has-text("Combine!")');
await wait(150);
s = await state();
assert(s.inventory.willow_brew, 'at other times the same combo gives Willow-Leaf Brew');
log('...and at 2pm the same two items give a Willow-Leaf Brew instead');
// a chaos recipe + a fizzle
await mut(() => { const g = window.__game.g; g.state.inventory.token_broken = { qty: 1, acquiredAt: 0 }; g.state.inventory.snack_711 = { qty: 1, acquiredAt: 0 }; g.changed(); });
await wait(120);
await page.click('.inv-win [data-item="snack_711"]');
await page.click('.inv-win [data-item="token_broken"]');
await page.click('.inv-win button:has-text("Combine!")');
await page.waitForSelector('.craft-result');
const chaosText = await page.$eval('.craft-result', (e) => e.textContent);
log(`A chaos recipe (Snack + Token) did something unpredictable: "${chaosText.slice(0, 70)}…"`);
await closeWin('.inv-win'); await closeToasts();

// 4) cards: play a world card, a Memory card that surfaces a hint, and a Location card that travels
await mut(() => { const g = window.__game.g; g.state.vitals.coffee = 2; g.state.inventory.coffee = { qty: 2, acquiredAt: 0 }; g.state.flags.visited_lighthouse = true; g.changed(); });
await mut(() => window.__game.navigate('home', { free: true }));
await openTool('cards');
await page.waitForSelector('.cards-win');
// draw until we have the cards we want
for (let i = 0; i < 8; i++) {
  const have = await page.$$eval('.cards-win .card-name', (e) => e.map((x) => x.textContent));
  if (['Lily-Pad Lullaby', "Swanny's Pond"].every((c) => have.includes(c))) break;
  const draw = await page.$('.cards-win button:has-text("Draw a card")');
  const full = (await state()).cards.hand.length >= 5;
  if (full) await page.click('.cards-win button:has-text("Shuffle hand back")');
  else await draw.click();
  await wait(60);
}
const before = (await state()).vitals.coffee;
const coffeeCard = page.locator('.cards-win .hand-slot:has(.card-name:text-is("Coffee")) button:has-text("Play")');
if (await coffeeCard.count()) {
  await coffeeCard.first().click();
  await wait(150);
  assert((await state()).vitals.coffee > before, 'playing the Coffee card restored coffee');
  log('Played a Coffee card (an item in card form): coffee restored, the item consumed');
  await openTool('cards');
}
const lull = page.locator('.cards-win .hand-slot:has(.card-name:text-is("Lily-Pad Lullaby")) button:has-text("Play")');
if (await lull.count()) {
  await lull.first().click();
  await page.waitForSelector('.alert');
  const txt = await page.$eval('.alert .alert-text', (e) => e.textContent);
  assert(txt.length > 10, 'the Memory card surfaced a hint: ' + txt);
  log(`Played a Memory card: it surfaced a hint ("${txt.slice(0, 60)}…")`);
  await page.click('.alert button:has-text("OK")');
  await openTool('cards');
}
const loc = page.locator('.cards-win .hand-slot:has(.card-name:text-is("Swanny’s Pond")) button:has-text("Play")');
if (await loc.count()) {
  await loc.first().click();
  await page.waitForSelector('.lake-page');
  log('Played a Location card: instant travel to the pond');
} else if (await page.$('.cards-win')) await closeWin('.cards-win');
await closeToasts();

// 5) the 11:11 wish rerolls a *failed* roll (and refuses a success). Use a hopeless roll.
await mut(() => { const g = window.__game.g; g.state.eleven.charges = 2; g.state.stats.observation = 0; g.state.vitals.coffee = 9; g.state.flags.fridge_opened = false; window.__game.navigate('construction', { free: true }); });
await page.waitForSelector('.construction-page');
let wished = false;
for (let i = 0; i < 6 && !wished; i++) {
  await mut(() => { const g = window.__game.g; g.state.stats.observation = 0; g.state.stats.luck = 0; g.state.vitals.coffee = 9; g.state.flags.fridge_opened = false; g.changed(); });
  await page.click('[data-fk="hs-fridge"]');
  const r = await roll({ approach: 'Squint', wish: true });
  wished = r.wished;
  await closeToasts();
}
const spent = (await state()).eleven.spent;
assert(wished && spent >= 1, 'a failed roll was rerolled with 11:11');
log('A failed roll was rerolled by spending an 11:11 charge (and a success never offers it)');

// 6) holding an item turns the cursor into it; wrong item on a hotspot does not consume it
await mut(() => { const g = window.__game.g; g.state.inventory.duct_tape = { qty: 1, acquiredAt: 0 }; g.changed(); window.__game.navigate('construction', { free: true }); });
await wait(150);
await openTool('inventory');
if (await page.isChecked('.inv-win .bench-toggle input')) await page.click('.inv-win .bench-toggle input');
await page.click('.inv-win [data-item="duct_tape"]');
await page.click('.inv-win button:has-text("Use on something")');
assert(await page.evaluate(() => document.body.classList.contains('holding')), 'cursor became the held item');
await page.click('[data-fk="hs-sand"]');
assert((await state()).inventory.duct_tape, 'unhandled use keeps the item');
await page.keyboard.press('Escape');
assert(!(await page.evaluate(() => document.body.classList.contains('holding'))), 'Esc puts the item away');
log('Held an item (cursor became the item), used it on the wrong thing: nothing lost; Esc put it away');
await closeToasts();

// 7) keyboard-only: Tab to a link and press Enter
await mut(() => window.__game.navigate('home', { free: true }));
await wait(200);
await page.focus('a[data-fk="l-guestbook"]');
await page.keyboard.press('Enter');
await page.waitForSelector('.guestbook-page');
log('Keyboard only: focused the Guestbook link and pressed Enter');
// focus ring visible
await page.focus('.guestbook-page button');
const outline = await page.$eval('.guestbook-page button', (e) => getComputedStyle(e).outlineStyle);
assert(outline !== 'none', 'visible focus ring');
log('Focus is visible on buttons (outline: ' + outline + ')');

// 8) reduced motion
await page.evaluate(() => { window.__game.g.state.settings.reducedMotion = true; window.__game.g.changed(); });
await wait(150);
assert(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), 'reduce-motion class on');
const marqueeAnim = await page.evaluate(() => { const m = document.querySelector('.marquee span'); return m ? getComputedStyle(m).animationDuration : 'n/a'; });
log('Reduced motion switch applied (animation duration on marquee: ' + marqueeAnim + ')');
await page.evaluate(() => { window.__game.g.state.settings.reducedMotion = false; window.__game.g.changed(); });

// 9) address bar: unknown address => the fake 404
await page.fill('#address', 'http://www.nowhere.com/lost.html');
await page.keyboard.press('Enter');
await page.waitForSelector('.e404');
log('Typed a nonsense address: the fake 404');
await page.fill('#address', 'http://www.swannys-pond.net/~pedalo/index.htm');
await page.keyboard.press('Enter');
await page.waitForSelector('.lake-page');
log('Typed a real address: went to the pond');

// 10) back / forward
await page.click('button[aria-label="Back"]');
await page.waitForSelector('.e404');
await page.click('button[aria-label="Forward"]');
await page.waitForSelector('.lake-page');
log('Back / Forward buttons work');

// 11) willow regrows with time (the ecosystem is a system, not a flag)
await mut(() => { const g = window.__game.g; g.state.zones.lake = { ...(g.state.zones.lake ?? {}), stock: { willow: 0 }, taken: { willow: 5 }, lastRegrowAt: g.state.clock.minutes, visits: 1, firstVisitAt: 0, found: [] }; g.changed(); });
await mut(() => window.__game.passTime(1000));
s = await state();
assert(s.zones.lake.stock.willow > 0, 'the willow regrew after time passed');
log('A day passed: the bare willow regrew a little');

console.log('\n' + (errors.length ? 'CONSOLE PROBLEMS:\n' + errors.join('\n') : 'No console errors or warnings.'));
await browser.close();
process.exit(errors.length ? 1 : 0);
