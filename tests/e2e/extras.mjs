// The Terminal (strategy guide + crossword) and the Konami code, through the real UI.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?fresh&seed=31&debug';
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

// Konami code
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
await wait(200);
let s = await state();
assert(s.flags.konami, 'konami flag');
log('The Konami code: THIRTY LIVES (Courage +1, Luck +1, a spare 11:11), only once');
const c0 = s.eleven.charges;
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
assert((await state()).eleven.charges === c0, 'no second reward');

// The Terminal
await mut(() => { const g = window.__game.g; g.state.flags.e404_open = true; g.state.knowledge.push('vm_exact_change'); g.changed(); window.__game.navigate('terminal', { free: true }); });
await wait(300);
await page.waitForSelector('.terminal-page');
assert((await page.textContent('.tm-guide')).includes('???'), 'unknown phases show ???');
await page.fill(fk('cw-cw2'), 'ELEVEN');
await page.click(fk('cwb-cw2'));
await wait(200);
assert(!(await state()).flags.cw_solved, 'a right answer you have not learned is not accepted');
await page.fill(fk('cw-cw1'), 'CHANGE');
await page.click(fk('cwb-cw1'));
await wait(300);
s = await state();
assert(s.flags.cw_solved === 'cw1', 'a learned answer is accepted');
log('The Terminal: the guide shows ??? for what you do not know; the crossword rejects answers you have not learned and accepts those you have');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nNo console errors or warnings.');
await browser.close();
if (errors.length) process.exit(1);
