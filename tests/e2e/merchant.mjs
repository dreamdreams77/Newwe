// The Dead Link Salesman and the Glitch Sprite, through the real UI.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?fresh&seed=' + (process.env.SEED ?? '11') + '&debug';
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
const give = (id) => mut((i) => { const g = window.__game.g; g.state.inventory[i] = { qty: 1, acquiredAt: g.state.clock.minutes }; g.state.flags['has_had_' + i] = true; g.state.ui.revealed.inventory = true; g.state.ui.revealed.stats = true; g.changed(); }, id);
const choose = async (re) => {
  for (let i = 0; i < 40; i++) {
    const hit = await page.$$eval('.dlg-choice', (els, src) => { const r = new RegExp(src); const e = els.findIndex((x) => r.test(x.textContent)); return e; }, re.source);
    if (hit >= 0) { await page.evaluate(({ idx }) => { const els = [...document.querySelectorAll('.dlg-choice')]; els[idx].click(); }, { src: re.source, idx: hit }); return; }
    const only = await page.$$eval('.dlg-choice', (els) => els.length === 1 ? els[0].textContent : '');
    if (only && !/Goodbye/.test(only)) await page.click('.dlg-choice').catch(() => {});
    else await page.click('.dlg-text').catch(() => {});
    await wait(120);
  }
  console.log('CHOICES', await page.$$eval('.dlg-choice', (e) => e.map((x) => x.textContent)), await page.$eval('.dlg-text', (e) => e.textContent).catch(() => 'no dlg'));
  throw new Error('no dialogue choice matching ' + re);
};

await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(300);

await give('floppy'); await give('receipt'); await give('snack_711');
await mut(() => { const g = window.__game.g; g.state.flags.clue_404 = true; g.state.flags.e404_open = true; g.changed(); window.__game.navigate('e404', { free: true }); });
await wait(300);
await page.click('[data-fk=salesman]');
await wait(500);
await choose(/jar with something flickering in it \(Floppy/);
await wait(300);
let s = await state();
assert(s.inventory.glitch_sprite && !s.inventory.floppy && !s.inventory.receipt, 'sprite bought for a floppy and a receipt');
log('The Salesman sold a Glitch Sprite for a floppy and a receipt');
await choose(/Sell me what the machine hates/);
await wait(300);
s = await state();
assert(s.knowledge.includes('vm_dad_jokes') && !s.inventory.snack_711, 'weakness bought with a snack');
log('He sold the machine\'s weakness for a Suspicious Snack: Boss Knowledge gained');
await give('token_broken');
await choose(/The Coin That Landed On Its Edge/);
await wait(300);
s = await state();
assert(s.inventory.edge_coin && !s.inventory.token_broken, 'relic bought with a broken token');
log('A relic: the Edge Coin, for a Broken Token');
await choose(/Goodbye/);
await wait(300);
await mut(() => { const g = window.__game.g; g.state.equipment.companion = 'glitch_sprite'; g.changed(); });
s = await state();
assert(s.equipment.companion === 'glitch_sprite', 'worn in the Familiar slot');
log('The Sprite sits in the new Familiar slot');
// the glitch: once per fight, the next hit passes through, and it splashes CORRUPTED on you
await mut(() => { const g = window.__game.g; g.state.vitals.hp = g.state.vitals.hpMax; g.state.vitals.coffee = 6; g.changed(); void window.__game.runEncounter('vm1111'); });
await page.waitForSelector('.combat-win');
await page.click('[data-fk="glitch"]');
await wait(200);
s = await state();
assert(s.encounters.vm1111.data.negate === true && s.ailments.some((a) => a.id === 'corrupted'), 'glitch negates the next hit and corrupts you');
assert(await page.$eval('[data-fk="glitch"]', (b) => b.disabled), 'only once per fight');
log('In the boss fight the Sprite glitched the machine (next hit negated), splashed CORRUPTED on me, and cannot be used twice');
await page.click('.combat-win >> text=Retreat');
await page.waitForSelector('.combat-win', { state: 'detached' });
// knacks: grow, then choose one of two in the Status window
await mut(() => { const g = window.__game.g; g.state.stats.courage += 2; g.state.ui.revealed.stats = true; g.changed(); window.__game.navigate('home', { free: true }); });
await wait(300);
await page.click('.tools button[data-tool="stats"]');
await page.waitForSelector('.stats-win .knack-pick');
await page.click('.stats-win [data-fk="knack-quick_study"]');
await wait(200);
s = await state();
assert(s.flags.knacks === 'quick_study', 'knack chosen from the Status window');
assert(!(await page.$('.stats-win .knack-pick')), 'no second pick until you grow more');
log('Grew by 2: the Status window offered two Knacks, I chose Quick Study, and the offer went away');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '\nNo console errors or warnings.');
await browser.close();
if (errors.length) process.exit(1);
