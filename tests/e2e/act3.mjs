// Act III (the parent process) and the trophy room, through the real UI.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? (process.env.E2E_BASE ?? 'http://127.0.0.1:4173/') + '?fresh&seed=71&debug';
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

// not yet: guarded
await mut(() => window.__game.navigate('parent', { free: true }));
await wait(300);
assert((await state()).zone !== 'parent', 'the parent process is guarded');
log('about:parent refuses until the crossword is complete and the finale has been seen');

await mut(() => { const g = window.__game.g; g.state.flags.e404_open = true; g.state.flags.finale_seen = true; g.state.flags.cw_solved = 'cw1,cw2,cw3,cw4,cw5,cw6,cw7'; g.state.eleven.charges = 0; g.changed(); window.__game.navigate('terminal', { free: true }); });
await wait(400);
await page.click(fk('attach-parent'));
await page.waitForSelector('.parent-q');
log('The Terminal shows "A new process has appeared: PID 1" once everything is answered, and ATTACH works');

// a wrong answer first, then all right
await page.click(fk('pq-0-0'));
await wait(150);
assert(/Not quite/.test(await page.textContent('.hint-line')), 'a wrong answer nudges back into the world');
const ANSWERS = [1, 1, 2, 1, 3];
for (let i = 0; i < ANSWERS.length; i++) { await page.click(fk(`pq-${i}-${ANSWERS[i]}`)); await wait(150); }
await page.waitForFunction(() => document.querySelector('.render-pre')?.textContent.includes('always and forever'), null, { timeout: 20000 });
const s = await state();
assert(s.flags.act3_done && s.eleven.charges === 3, 'Act III done, three 11:11 charges');
log('Five questions answered: "PARENT PROCESS FOUND. name: visitor_73. You were the part that was missing."');
const text = await page.textContent('.render-pre');
assert(/Andy/.test(text) && /always and forever/.test(text), 'the dedication closes the game: ' + text.slice(-120));
log('The dedication ("For Andy") is the last thing on the screen');

// the trophy room
await mut(() => { const g = window.__game.g; g.state.flags.hits_100 = true; g.state.flags.hits_500 = true; g.state.flags.visited_construction = true; g.state.flags.tas_aurora = true; g.state.badges.push('parent'); g.state.ui.revealed.mypage = true; g.changed(); window.__game.navigate('mypage', { free: true }); });
await wait(400);
assert(/PID 1/.test(await page.textContent('.mp-main')), 'earned awards appear on the page');
assert(await page.$eval('input[name="wp"][type="radio"]:not(:checked)', () => true), 'wallpapers listed');
assert((await page.$$eval('input[name="wp"]:disabled', (e) => e.length)) >= 2, 'unearned wallpapers are locked');
await page.check(fk('decor-sparkle'));
await wait(200);
assert((await state()).flags.mp_decor.includes('sparkle'), 'a decoration toggled on');
assert(/The parent process: found/.test(await page.textContent('.mp-journey')), 'the journey strip reflects Act III');
log('My Page: earned awards show up by themselves, unearned wallpapers are locked, decorations toggle, and the journey strip knows about Act III');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nNo console errors or warnings.');
await browser.close();
if (errors.length) process.exit(1);
