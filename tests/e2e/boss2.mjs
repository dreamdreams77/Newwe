// The second boss, the Broken Homepage, through the real UI: all five phases.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? (process.env.E2E_BASE ?? 'http://127.0.0.1:4173/') + '?fresh&seed=' + (process.env.SEED ?? '21') + '&debug';
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

await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(300);

// the room is guarded until the first boss falls
await mut(() => window.__game.navigate('brokenHome', { free: true }));
await wait(300);
log('Visiting the room before the first boss: ' + ((await state()).zone === 'brokenHome' ? 'allowed (free nav in debug)' : 'blocked'));

await mut(() => { const g = window.__game.g; g.state.flags.boss_defeated = true; g.state.vitals.hp = g.state.vitals.hpMax; g.state.vitals.coffee = 6; g.changed(); window.__game.navigate('brokenHome', { free: true }); });
await wait(300);
for (const c of ['banner', 'counter', 'source', 'keys', 'windows']) await page.click(fk('room-' + c));
await wait(200);
let s = await state();
assert(['bh_symmetry', 'bh_counter', 'bh_shift', 'bh_replay', 'bh_beloved'].every((k) => s.knowledge.includes(k)), 'five clues learned in the room');
log('Looked around the room five ways: five pieces of Boss Knowledge');

await page.click(fk('bh-start'));
await page.waitForSelector('.bh-win');

// 1) the banner: a wrong answer costs strain, then look and reproduce
await page.click(fk('bh-cell-4'));
await page.click(fk('bh-submit'));
await wait(200);
s = await state();
assert(s.encounters.broken_home.fury === 1, 'wrong pattern raised strain');
log('A wrong banner raised the strain (1)');
const bh = await page.evaluate(() => window.__bh);
await page.click(fk('bh-look'));
await wait(2500);
for (const c of bh.pattern) await page.click(fk('bh-cell-' + c));
await page.click(fk('bh-submit'));
await page.waitForSelector('.k-forgery');
log('Phase 1: reproduced the symmetrical banner');

// 2) the forgery
await page.click(fk('bh-entry-' + bh.forgery.forged));
await page.waitForSelector('.k-cipher');
log('Phase 2: found the guestbook entry from the future');

// 3) the cipher
await page.fill(fk('bh-answer'), bh.word);
await page.click(fk('bh-submit'));
await page.waitForSelector('.k-sequence');
log('Phase 3: unshifted the word by 11 (' + bh.word + ')');

// 4) the keys (play once, then enter)
await page.click(fk('bh-play'));
await wait(4200);
for (const k of bh.seq) await page.click(fk('bh-key-' + k));
await page.waitForSelector('.k-final');
log('Phase 4: played back the five-key sequence');

// 5) the final choice
await page.click(fk('bh-broken'));
await wait(500);
s = await state();
assert(s.flags.bh_defeated && s.flags.bh_choice === 'broken', 'won, with the choice recorded');
assert(s.knowledge.includes('bh_beaten'), 'knowledge granted');
assert(!(await page.$('.bh-win')), 'the window closed');
log('Phase 5: left it broken on purpose. The boss is defeated; Chaos and a spare 11:11 gained');
await mut(() => { const g = window.__game.g; g.changed(); });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nNo console errors or warnings.');
await browser.close();
if (errors.length) process.exit(1);
