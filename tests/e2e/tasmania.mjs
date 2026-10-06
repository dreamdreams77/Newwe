// Tasmania, through the real UI: guard, Mr. Gnarl, spot the change (clicking on the picture), wait for dark, tell the sky.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?fresh&seed=' + (process.env.SEED ?? '51') + '&debug';
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
const DIFFS = [[40, 124], [100, 40], [160, 100], [215, 58], [275, 130]];

await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(300);

await mut(() => window.__game.navigate('tasmania', { free: true }));
await wait(300);
assert((await state()).zone !== 'tasmania', 'guarded until the postcard is decoded');
log('Tasmania does not load until the postcard has been decoded');

await mut(() => { const g = window.__game.g; g.state.flags.postcard_decoded = true; g.state.clock.minutes = 12 * 60; g.state.vitals.coffee = 6; g.changed(); window.__game.navigate('tasmania', { free: true }); });
await wait(400);
assert((await state()).zone === 'tasmania', 'open after the postcard');

// Mr. Gnarl
await page.click(fk('hs-devil'));
await page.waitForSelector('.dialogue-win');
for (let i = 0; i < 6; i++) { if (await page.$('.dialogue-win .dlg-choice:has-text("photographs")')) break; const only = await page.$$eval('.dlg-choice', (e) => (e.length === 1 ? e[0].textContent : '')); if (only) await page.click('.dlg-choice').catch(() => {}); else await page.click('.dialogue-win .dlg-text').catch(() => {}); await wait(180); }
await page.click('.dialogue-win .dlg-choice:has-text("photographs")');
for (let i = 0; i < 8; i++) { if (await page.$('.dialogue-win .dlg-choice:has-text("Bye")')) break; const only = await page.$$eval('.dlg-choice', (e) => (e.length === 1 ? e[0].textContent : '')); if (only) await page.click('.dlg-choice').catch(() => {}); else await page.click('.dialogue-win .dlg-text').catch(() => {}); await wait(180); }
await page.click('.dialogue-win .dlg-choice:has-text("Bye")');
await page.waitForSelector('.dialogue-win', { state: 'detached' });
await wait(400);
let s = await state();
assert(s.flags.devil_met && s.knowledge.includes('tas_photos'), 'met the devil, learned about the photographs');
log('Mr. Gnarl screamed hello (that means he likes you) and pointed at the photographs');

// the sky refuses before the photographs are solved
await page.click(fk('hs-sky'));
await wait(150);

// spot the change: a wrong click, then the five
await page.click(fk('hs-board'));
await page.waitForSelector('.spot-win');
await wait(700); // let the window finish sliding in
const at = async (cx, cy) => { const box = await page.$eval('.spot-wrap canvas', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }); await page.mouse.click(box.x + (cx / 320) * box.w, box.y + (cy / 180) * box.h); };
await at(10, 10);
await wait(120);
assert(!(await state()).flags.tas_found, 'a wrong click finds nothing');
// the keyboard route: focus the 2003 photograph, nudge the crosshair, press Enter (and a screen reader hears Hot/Warm/Cold)
await page.focus(fk('spot-b'));
await page.keyboard.press('ArrowDown');
assert(/Hot|Warm/.test(await page.textContent('.spot-wrap .sr-only')), 'hot/cold read-out is exposed');
await page.keyboard.press('Enter');
await wait(150);
assert((await state()).flags.tas_found === 'boat', 'the keyboard found the sailboat');
log('Keyboard: arrow keys move a crosshair, the hot/cold read-out speaks, Enter found the sailboat');
for (const [cx, cy] of [DIFFS[0], DIFFS[1], DIFFS[3]]) { await at(cx, cy); await wait(120); }
assert((await state()).flags.tas_found.split(',').length === 4, 'four found');
await at(...DIFFS[4]);
await page.waitForSelector('.spot-win', { state: 'detached' });
s = await state();
assert(s.flags.tas_diffs && s.knowledge.includes('tas_south'), 'all five found; SOUTH learned');
log('Spot the change: a wrong click costs nothing, five right clicks reveal S-O-U-T-H');

// the sky only answers after dark
await page.click(fk('hs-sky'));
await wait(200);
assert(!(await page.$('.aurora-win')), 'the sky does not answer by day');
const t0 = (await state()).clock.minutes;
await page.click(fk('tas-wait'));
await wait(300);
const t1 = (await state()).clock.minutes;
assert(t1 - t0 >= 8 * 60 && (t1 % 1440) >= 21 * 60, 'waited until dark: ' + (t1 - t0));
log('By day the sky is silent; "Sit on the rocks until dark" passes the time');
await page.click(fk('hs-sky'));
await page.waitForSelector('.aurora-win');
await page.fill(fk('aurora-word'), 'NORTH');
await page.click(fk('aurora-say'));
await wait(200);
assert(!(await state()).flags.tas_aurora, 'the wrong word does nothing');
await page.fill(fk('aurora-word'), 'south');
await page.click(fk('aurora-say'));
await wait(400);
s = await state();
assert(s.flags.tas_aurora && s.inventory.aurora_jar && s.memories.includes('TAS_001'), 'the sky answered');
log('Said NORTH (nothing), then SOUTH: the aurora answered, a jar of it is yours, and the postcard\'s back was read');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nNo console errors or warnings.');
await browser.close();
if (errors.length) process.exit(1);
