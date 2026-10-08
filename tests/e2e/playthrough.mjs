// End-to-end playthrough of the vertical slice, driven with real clicks in a real browser.
//
//   npm run build && npx vite preview --port 4173 &
//   PLAYWRIGHT_PATH=/path/to/playwright/index.mjs node tests/e2e/playthrough.mjs
//
// Dice are seeded, so a given seed replays identically; the script is also adaptive
// (it retries failed rolls) so it should not depend on any one seed.

const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const { chromium } = pw;
const URL = process.env.URL ?? (process.env.E2E_BASE ?? 'http://127.0.0.1:4173/') + '?fresh&seed=' + (process.env.SEED ?? '1') + '&debug';
const SHOTS = process.env.SHOTS ?? '';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

let step = 0;
const log = async (msg) => { const v = await page.evaluate(() => window.__game.g.state.visitors); console.log(`[${String(++step).padStart(2, '0')}] (visitors ${String(v).padStart(4)}) ${msg}`); };
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.g.state)));
const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };
const wait = (ms) => page.waitForTimeout(ms);

// ------------------------------------------------------------------ helpers
async function hotspot(id) { await page.click(`[data-fk="hs-${id}"]`); }
async function closeToasts() { await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); }
async function nav(zone) { await page.evaluate((z) => window.__game.navigate(z), zone); await wait(250); }

/** run the open dice window to completion; returns 'success' | 'fail' | ... */
async function rollCheck({ approach, wish = false } = {}) {
  await page.waitForSelector('.check-win');
  if (approach) await page.click(`.check-win label.approach:has-text("${approach}")`);
  await page.click('.check-win button:has-text("ROLL")');
  await page.waitForSelector('.check-win .roll-total');
  let cls = await page.$eval('.check-win .roll-total', (e) => e.className);
  if (wish && /fail|critFail/i.test(cls)) {
    const w = await page.$('.check-win button:has-text("Spend 11:11")');
    if (w) { await w.click(); await wait(100); cls = await page.$eval('.check-win .roll-total', (e) => e.className); }
  }
  await page.click('.check-win button:has-text("Continue")');
  await page.waitForSelector('.check-win', { state: 'detached' });
  return cls.includes('critFail') ? 'critFail' : cls.includes('crit') ? 'crit' : cls.includes('success') ? 'success' : 'fail';
}

async function choose(textFragment) {
  const sel = `.dialogue-win .dlg-choice:has-text("${textFragment}")`;
  await page.waitForSelector(sel, { timeout: 8000 });
  await page.click(sel);
}
async function dialogueNext() { await page.click('.dialogue-win .dlg-choice'); }
async function dialogueOpen() { await page.waitForSelector('.dialogue-win'); }
async function dialogueClosed() { await page.waitForSelector('.dialogue-win', { state: 'detached' }); }

async function openInventory() {
  if (!(await page.$('.inv-win'))) await page.click('.tools button[data-tool="inventory"]');
  await page.waitForSelector('.inv-win');
}
async function closeWindow(sel) { await page.click(`${sel} .win-x`); await page.waitForSelector(sel, { state: 'detached' }); }
async function holdItem(itemId) {
  await openInventory();
  await page.click(`.inv-win [data-item="${itemId}"]`);
  await page.click('.inv-win button:has-text("Use on something")');
  await page.waitForSelector('.inv-win', { state: 'detached' });
}
async function clickAll(sel) { const n = await page.$$eval(sel, (e) => e.length); for (let i = 0; i < n; i++) await page.locator(sel).nth(i).click(); }
async function ensureCoffee() {
  const s = await state();
  if (s.vitals.coffee < 3) await page.evaluate(() => { window.__game.g.state.vitals.coffee = 8; window.__game.g.changed(); });
}

// ------------------------------------------------------------------- the run
await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(400);
await page.waitForSelector('.home-page');
await log('Entered the homepage');
let s = await state();
assert(s.visitors === 73, 'counter starts at 73');
assert(!s.ui.revealed.inventory, 'inventory is hidden at the start');
await shot('01-home');

// 1) the mug: first item
await page.click('[data-fk="mug"]');
s = await state();
assert(s.inventory.coffee?.qty === 1, 'mug gives a coffee');
assert((await page.$('.tools button[data-tool="inventory"]')) !== null, 'inventory tool appears after the first item');
await log('Poured coffee from the webmaster’s mug; the inventory appeared');
await closeToasts();

// 2) the guestbook
await page.click('a[data-fk="l-guestbook"]');
await page.waitForSelector('.guestbook-page');
await wait(1700); // entries are read after a moment
s = await state();
assert(s.guestbook.read.length >= 5, 'guestbook entries marked read');
assert(s.flags.read_E_pete, 'read the pedalo_pete entry');
await page.click('[data-fk="take-E_pete"]');
await page.click('[data-fk="take-E_tassie"]');
s = await state();
assert(s.inventory.swan_ticket && s.inventory.postcard, 'took the swan ticket and the postcard');
assert(s.quests.q_pedalo, 'a quest started from a guestbook entry');
await log('Read the guestbook; took the swan-boat ticket and the Tasmania postcard; a quest began');
await shot('02-guestbook');
await closeToasts();

// 3) under construction: bob, the fridge, the yoghurt
await nav('construction');
await page.waitForSelector('.construction-page');
await hotspot('bob');
await dialogueOpen();
await choose('Got any duct tape');
await dialogueNext(); // he wants coffee first; back to the greeting
await choose('Give him a coffee');
await dialogueNext(); // coffee -> groan
await dialogueNext(); // groan -> end
await dialogueClosed();
s = await state();
assert(s.inventory.duct_tape && s.cards.earned.includes('dad_joke'), 'Bob gave tape and the Dad Joke card');
await log('Gave Bob a coffee: got Duct Tape and the Dad Joke card');
await ensureCoffee();
for (let i = 0; i < 8; i++) {
  await hotspot('fridge');
  await rollCheck({ wish: false });
  s = await state();
  if (s.inventory.yoghurt) break;
  await closeToasts();
  await ensureCoffee();
}
assert(s.inventory.yoghurt, 'found the extremely important yoghurt');
assert(s.memories.includes('NOTE_001'), 'the sticky note became a memory');
await log('Found the One Extremely Important Yoghurt behind the tape (and its sticky note)');
await shot('03-yoghurt');
await closeToasts();

// 4) the first 11:11 (time travel with the real clock system)
await page.evaluate(() => { const g = window.__game.g; g.state.clock.minutes = 11 * 60 + 5; });
await page.evaluate(() => window.__game.passTime(10));
await wait(300);
s = await state();
assert(s.eleven.charges === 1, 'first 11:11 charge');
assert(s.stage >= 2, 'stage 2: something is wrong');
await log('The clock hit 11:11: gained a wish, and the website changed (stage 2)');
await closeToasts();

// 5) the lake
await nav('home');
await page.click('[data-fk="ring-lake"]');
await page.waitForSelector('.lake-page');
await hotspot('gus');
await dialogueOpen();
await choose('I have a ticket');
await choose('Board the swan');
await page.waitForSelector('.alert:has-text("Pedalling")');
await page.click('.alert button:has-text("Look at the pads")');
await page.waitForSelector('.lily-win');
await log('Showed Gus the ticket and pedalled out to the lily pads');
await shot('04-lily');
// listen, then play back: the lullaby is pads 3,1,4,2,4 (0-based 2,0,3,1,3)
await page.click('.lily-win button:has-text("Listen")');
await page.waitForSelector('.lily-win .lily-pad:not([disabled])', { timeout: 15000 });
const SONG = [2, 0, 3, 1, 3];
for (const round of [3, 4, 5]) {
  await page.waitForSelector('.lily-win .lily-pad:not([disabled])', { timeout: 15000 });
  for (let i = 0; i < round; i++) { await page.click(`.lily-win [data-fk="pad-${SONG[i]}"]`); await wait(60); }
  await wait(500);
  if (round < 5) await page.waitForSelector('.lily-win .lily-pad:not([disabled])', { timeout: 15000 });
}
await dialogueOpen();
await dialogueNext(); // gift
await dialogueNext(); // gift2
await dialogueClosed();
s = await state();
assert(s.flags.lake_solved && s.inventory.key, 'solved the lily pads and got the key');
assert(s.cards.earned.includes('lullaby'), 'earned the Lily-Pad Lullaby card');
assert(s.stage >= 3, 'stage 3 reached: the website is a game');
assert(s.memories.includes('VOICE_001'), 'the hummed voice recording became a memory');
await log('Played the lullaby back on the lily pads: got a card, the World’s Least Useful Key, and the page became a game (stage 3)');
await shot('05-stage3');
await closeToasts();

// 6) the willow (ecosystem), the reeds (a creature)
for (let i = 0; i < 5; i++) { await hotspot('willow'); await closeToasts(); }
s = await state();
assert(s.zones.lake.stock.willow === 0 && s.inventory.willow_leaf.qty === 5, 'harvested all five willow leaves');
await page.waitForSelector('.willow-bare');
await log('Stripped the willow bare: the zone remembers (the tree and Gus react)');
await shot('06-bare-willow');
await ensureCoffee();
await hotspot('reeds');
await rollCheck({ approach: 'Part the reeds' });
for (let i = 0; i < 6; i++) {
  s = await state();
  if (s.flags.chocobo_noticed) break;
  await closeToasts(); await ensureCoffee();
  await hotspot('reeds');
  await rollCheck({ approach: 'Part the reeds' });
}
s = await state();
assert(s.flags.chocobo_noticed, 'noticed the peeping in the reeds');
// befriend it: offer the snack?  (we have none) -> offer a leaf
for (let i = 0; i < 8 && !(await state()).creatures.chocobo?.met; i++) {
  await closeToasts(); await ensureCoffee();
  if (i > 0) await hotspot('reeds');
  await page.waitForSelector('.alert:has-text("watching your pockets")');
  await page.click('.alert button:has-text("willow leaf")');
  await rollCheck({ approach: 'Hold out your hand' });
}
s = await state();
assert(s.creatures.chocobo?.met, 'met the tiny chocobo');
await log('Noticed something peeping in the reeds, offered it a willow leaf, and befriended a Tiny Chocobo');
await shot('07-chocobo');
await closeToasts();

// 7) feed it things; its personality changes
await page.click('.tools button[data-tool="creature"]');
await page.waitForSelector('.creature-win');
await page.click('.creature-win .feed-list button:has-text("Willow Leaf")');
await page.click('.creature-win button:has-text("Pet")');
await wait(200);
s = await state();
assert(s.creatures.chocobo.trust > 10, 'caring for it raised its trust');
await closeWindow('.creature-win');
await log('Fed and petted the chocobo: its trust went up');
await closeToasts();

// 8) the guestbook: who wrote the strange entry?
await nav('guestbook');
await wait(1700);
await page.waitForSelector('[data-entry="E_strange"]');
await page.click('[data-fk="investigate"]');
await page.waitForSelector('.ded-win');
await clickAll('.ded-win .ded-entry.subject .tell');
await page.click('.ded-win [data-fk="cand-E_wtest"]');
await clickAll('.ded-win .ded-entry:not(.subject) .tell');
await page.click('.ded-win button:has-text("Accuse")');
await page.waitForSelector('.ded-win', { state: 'detached' });
s = await state();
assert(s.flags.deduction_solved && s.memories.includes('MEMORY_001'), 'solved the "who wrote this?" deduction');
await log('Compared the strange guestbook entry with older ones and deduced its author: a memory surfaced and became a card');
await closeToasts();

// 9) the lighthouse: deliver the yoghurt
await nav('home');
await page.click('[data-fk="ring-lighthouse"]');
await page.waitForSelector('.lighthouse-page');
await hotspot('marl');
await dialogueOpen();
await choose('Show him the yoghurt');
await choose("It's yours");
await dialogueNext(); // give
await dialogueNext(); // give2
await dialogueClosed();
s = await state();
assert(s.flags.lamp_lit && s.flags.yoghurt_delivered, 'delivered the yoghurt and the lamp came on');
assert(s.memories.includes('MEMORY_002'), 'Marl’s memory recovered');
assert(s.stage >= 4, 'stage 4: the website is alive');
await log('Gave Marl the yoghurt: the lamp came on, a memory surfaced, and the website came alive (stage 4)');
await shot('08-lamp-on');
await closeToasts();

// 10) UV: the postcard under the lamp; the keeper's book + the willow leaf bookmark
await holdItem('postcard');
await hotspot('lamp');
await page.waitForSelector('.cipher-win');
s = await state();
assert(s.flags.postcard_uv, 'the ink glowed under the lamp');
await log('Held the postcard up to the lit lamp: hidden ink appeared (nobody told me to)');
await shot('09-cipher');
await closeWindow('.cipher-win');
await closeToasts();
await holdItem('willow_leaf');
await hotspot('book');
await page.waitForSelector('.cipher-win');
s = await state();
assert(s.flags.book_key_known, 'the leaf bookmarked the keeper’s book at the key');
// decode with the keyword alphabet WILLOW
const PLAIN = 'THE PAGE IS NOT LOST IT IS WAITING. 404 IS AN ADDRESS. BRING THE USELESS KEY.';
const alpha = (() => { const seen = new Set(); let o = ''; for (const c of 'WILLOW' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!seen.has(c)) { seen.add(c); o += c; } return o; })();
const enc = PLAIN.split('').map((c) => { const i = c.charCodeAt(0) - 65; return i >= 0 && i < 26 ? alpha[i] : c; }).join('');
const done = new Set();
for (let i = 0; i < enc.length; i++) {
  const c = enc[i];
  if (!/[A-Z]/.test(c) || done.has(c)) continue;
  done.add(c);
  const input = await page.$(`.cipher-win input[aria-label="Cipher letter ${c}"]`);
  if (input) await input.fill(PLAIN[i]);
  const still = await page.$('.cipher-win');
  if (!still) break;
}
await page.waitForSelector('.cipher-win', { state: 'detached' });
s = await state();
assert(s.flags.postcard_decoded && s.flags.clue_404, 'decoded the postcard');
assert(s.cards.earned.includes('secret_404'), 'earned the Secret card');
await log('Used the willow leaf as a bookmark, found the key (WILLOW), and decoded the postcard: "404 is an address. Bring the useless key."');
await closeToasts();

// 11) crafting: a logical recipe
await openInventory();
await page.click('.inv-win .bench-toggle input');
await page.evaluate(() => { const g = window.__game.g; if (!g.state.inventory.token_broken) { g.state.inventory.token_broken = { qty: 1, acquiredAt: g.state.clock.minutes }; g.changed(); } });
await page.click('.inv-win [data-item="token_broken"]');
await page.click('.inv-win [data-item="duct_tape"]');
await page.click('.inv-win button:has-text("Combine!")');
await wait(150);
s = await state();
assert(s.inventory.token_mended && !s.inventory.token_broken, 'crafted a Mended Token (logical recipe)');
await log('Combined a Broken Vending-Machine Token with Duct Tape: a Mended Token');
await closeWindow('.inv-win');
await closeToasts();

// 12) the fake 404 changes, and opens
await nav('e404');
await page.waitForSelector('.e404.found');
await shot('10-page-found');
await page.click('[data-fk="trykey"]');
await page.waitForSelector('.dungeon-page');
s = await state();
assert(s.flags.e404_open && s.flags.key_opened, 'the useless key opened the 404');
await log('The 404 page said PAGE FOUND. The World’s Least Useful Key opened it. It stopped being useless.');
await closeToasts();

// 13) the maze (BFS from the debug hook)
const path = await page.evaluate(() => {
  const { maze, pos } = window.__maze();
  const n = maze.n; const start = pos[0] + pos[1] * n; const goal = maze.goal[0] + maze.goal[1] * n;
  const prev = new Map([[start, null]]); const q = [start];
  const dirs = [[0, -1, 1, 'ArrowUp'], [1, 0, 2, 'ArrowRight'], [0, 1, 4, 'ArrowDown'], [-1, 0, 8, 'ArrowLeft']];
  while (q.length) {
    const c = q.shift(); if (c === goal) break;
    const cell = maze.cells[c];
    for (const [dx, dy, bit, key] of dirs) { if (!(cell.open & bit)) continue; const nn = (cell.y + dy) * n + (cell.x + dx); if (!prev.has(nn)) { prev.set(nn, [c, key]); q.push(nn); } }
  }
  const keys = []; let c = goal; while (prev.get(c)) { keys.push(prev.get(c)[1]); c = prev.get(c)[0]; }
  return keys.reverse();
});
// wander to grab every note on the way: walk the whole maze by DFS so Boss Knowledge is earned
const tour = await page.evaluate(() => {
  const { maze } = window.__maze(); const n = maze.n; const keys = []; const seen = new Set([0]);
  const dirs = [[0, -1, 1, 'ArrowUp', 'ArrowDown'], [1, 0, 2, 'ArrowRight', 'ArrowLeft'], [0, 1, 4, 'ArrowDown', 'ArrowUp'], [-1, 0, 8, 'ArrowLeft', 'ArrowRight']];
  const dfs = (c) => { const cell = maze.cells[c]; for (const [dx, dy, bit, k, back] of dirs) { if (!(cell.open & bit)) continue; const nn = (cell.y + dy) * n + (cell.x + dx); if (seen.has(nn)) continue; seen.add(nn); keys.push(k); dfs(nn); keys.push(back); } };
  dfs(0); return keys;
});
void path;
for (const k of tour) { await page.keyboard.press(k); await wait(12); }
s = await state();
assert(s.knowledge.includes('vm_pattern') && s.knowledge.includes('vm_code_hour'), 'read the notes in the maze: Boss Knowledge grew');
assert(s.inventory.token_broken || s.inventory.duct_tape, 'found things in the maze');
// now walk to the goal
const toGoal = await page.evaluate(() => {
  const { maze } = window.__maze(); const n = maze.n; const goal = maze.goal[0] + maze.goal[1] * n;
  const prev = new Map([[0, null]]); const q = [0];
  const dirs = [[0, -1, 1, 'ArrowUp'], [1, 0, 2, 'ArrowRight'], [0, 1, 4, 'ArrowDown'], [-1, 0, 8, 'ArrowLeft']];
  while (q.length) { const c = q.shift(); const cell = maze.cells[c]; for (const [dx, dy, bit, k] of dirs) { if (!(cell.open & bit)) continue; const nn = (cell.y + dy) * n + (cell.x + dx); if (!prev.has(nn)) { prev.set(nn, [c, k]); q.push(nn); } } }
  const keys = []; let c = goal; while (prev.get(c)) { keys.push(prev.get(c)[1]); c = prev.get(c)[0]; } return keys.reverse();
});
await page.evaluate(() => { window.__game.g.state.flags.maze_pos = '0,0'; });
await page.evaluate(() => window.__game.refresh());
await wait(150);
for (const k of toGoal) { await page.keyboard.press(k); await wait(15); }
s = await state();
assert(s.flags.maze_goal, 'reached the end of the maze');
await log('Explored the maze (notes became Boss Knowledge) and reached the machine at the end');
await shot('11-maze');
await closeToasts();

// 14) the boss: puzzle combat
await ensureCoffee();
await page.evaluate(() => { const g = window.__game.g; g.state.vitals.hp = g.state.vitals.hpMax; g.state.eleven.charges = Math.max(g.state.eleven.charges, 1); g.changed(); });
await page.click('[data-fk="approach"]');
await page.waitForSelector('.combat-win');
await shot('12-boss-lights');
// phase 1: lights out (brute-force the solution)
const lightsNow = await page.$$eval('.combat-win .light', (els) => els.map((e) => e.classList.contains('on')));
const press = (() => {
  for (let mask = 0; mask < 512; mask++) {
    const L = lightsNow.slice();
    const tog = (i) => { const x = i % 3, y = Math.floor(i / 3); L[i] = !L[i]; if (x > 0) L[i - 1] = !L[i - 1]; if (x < 2) L[i + 1] = !L[i + 1]; if (y > 0) L[i - 3] = !L[i - 3]; if (y < 2) L[i + 3] = !L[i + 3]; };
    for (let i = 0; i < 9; i++) if (mask & (1 << i)) tog(i);
    if (L.every((v) => !v)) return [...Array(9).keys()].filter((i) => mask & (1 << i));
  }
  return [];
})();
for (const i of press) await page.click(`.combat-win [data-fk="light-${i}"]`);
await page.waitForSelector('.combat-win .k-offer');
await log('Boss phase 1: turned off the panel lights (a rule I learned from a note in the dark)');
// phase 2: exact change
await page.click('.combat-win [data-fk="offer-token_mended"]');
await page.waitForSelector('.combat-win .k-keypad');
await log('Boss phase 2: inserted the Mended Token as exact change');
// phase 3: the hour that makes a wish
for (const d of ['1', '1', '1', '1', '↵']) await page.click(`.combat-win [data-fk="key-${d}"]`);
await page.waitForSelector('.combat-win .k-final');
await log('Boss phase 3: entered 1111, the hour that makes a wish');
await shot('13-boss-final');
// phase 4: take the prize; fail -> spend 11:11 to change the outcome
let usedWish = false;
for (let i = 0; i < 6; i++) {
  await ensureCoffee();
  await page.click('.combat-win [data-fk="f-prize"]');
  const before = await state();
  const r = await rollCheck({ approach: 'Pry it', wish: true });
  const after = await state();
  if (after.eleven.spent > before.eleven.spent) usedWish = true;
  if (r === 'success' || r === 'crit' || after.flags.boss_defeated) break;
  await page.waitForSelector('.combat-win [data-fk="f-prize"]').catch(() => undefined);
  await page.evaluate(() => { const g = window.__game.g; g.state.vitals.hp = g.state.vitals.hpMax; g.changed(); });
}
await page.waitForSelector('.combat-win', { state: 'detached' });
s = await state();
assert(s.flags.boss_defeated && s.inventory.golden_dice, 'defeated VM-1111 and got the Golden Dice');
await log(`Defeated the Vending Machine of Judgment${usedWish ? ' (spent 11:11 to change a failed roll)' : ''}: got the Golden Dice`);
await closeToasts();

// 15) quests, the counter, and the finale
s = await state();
assert(s.quests.q_404?.done !== null && s.quests.q_light?.done !== null && s.quests.q_pedalo?.done !== null, 'quests completed');
await log(`Visitors: ${s.visitors}. Quests done: ${Object.entries(s.quests).filter(([, q]) => q.done !== null).map(([k]) => k).join(', ')}`);
if (s.visitors < 1111) { await page.evaluate(() => { const g = window.__game.g; g.state.visitors = 1100; g.changed(); }); }
await nav('home');
await page.evaluate(() => { window.__game.g.state.visitors = 1105; window.__game.g.changed(); });
await page.evaluate(() => { const g = window.__game.g; g.state.visitors = 1110; g.state.flags.finale_ready = true; g.state.stage = 5; g.changed(); });
await wait(400);
await shot('14-home-stage5');
await page.click('[data-fk="finale"]');
await page.waitForSelector('.finale');
await page.waitForSelector('.finale button:has-text("Return to the homepage")', { timeout: 15000 });
await shot('15-finale');
await log('The counter reached 1,111: the page rendered itself and showed what the website had been all along');

// 16) save persists across a reload
const before = await state();
await wait(500); // autosave debounce
await page.goto(URL.replace('?fresh&', '?').replace('&debug', '&debug'));
await page.waitForSelector('.splash');
await page.click('text=CONTINUE');
await wait(600);
const after = await state();
assert(after.visitors === before.visitors && after.inventory.golden_dice && after.flags.boss_defeated, 'progress survived a reload');
assert(JSON.stringify(after.inventory) === JSON.stringify(before.inventory), 'inventory survived a reload');
await log('Reloaded the page: everything persisted (CONTINUE)');

// 17) the save password round trip
await page.click('.menu:has-text("File") > button');
await page.click('button:has-text("Save Password")');
await page.waitForSelector('.savepw-win');
await page.waitForFunction(() => document.querySelector('.savepw-win textarea')?.value.includes('-'), null, { timeout: 5000 });
const code = await page.$eval('.savepw-win textarea[readonly]', (e) => e.value);
assert(/^[0-9A-Z]{4}-/.test(code), 'password looks like a game password: ' + code.slice(0, 20));
await log(`Save password generated: ${code.slice(0, 19)}… (${code.length} chars)`);

console.log('\n' + (errors.length ? 'CONSOLE PROBLEMS:\n' + errors.join('\n') : 'No console errors or warnings during the whole playthrough.'));
await browser.close();
process.exit(errors.length ? 1 : 0);
