// Status effects and equipment, through the real UI.
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
const toasts = () => page.$$eval('.toast', (e) => e.map((x) => x.textContent));
const closeToasts = () => page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
const chips = () => page.$$eval('.hud .state-tag', (e) => e.map((x) => x.textContent));
const closeWin = async (sel) => { await page.click(`${sel} .win-x`); await page.waitForSelector(sel, { state: 'detached' }); };
const give = (id) => mut((i) => { const g = window.__game.g; g.state.inventory[i] = { qty: 1, acquiredAt: g.state.clock.minutes }; g.state.flags['has_had_' + i] = true; g.state.ui.revealed.inventory = true; g.state.ui.revealed.stats = true; g.changed(); }, id);

await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(300);

// 1) JITTERY: too much coffee. It is a status, shows on the HUD, and changes the page
await mut(() => { const g = window.__game.g; g.state.vitals.coffee = g.state.vitals.coffeeMax; g.changed(); });
await wait(250);
assert((await chips()).includes('JITTERY'), 'JITTERY chip on the HUD');
assert(await page.evaluate(() => document.documentElement.classList.contains('st-jittery')), 'the page itself jitters');
log('Coffee at the maximum: JITTERY appears on the HUD and the page starts to vibrate');
await mut(() => { const g = window.__game.g; g.state.vitals.coffee = 6; g.changed(); });

// 2) CRASHED: the mug runs dry. A forced recovery event, not a death
const t0 = (await state()).clock.minutes;
await mut(() => { const g = window.__game.g; g.state.vitals.coffee = 0; g.changed(); });
await wait(300);
const s2 = await state();
assert(s2.vitals.coffee === 1 && s2.clock.minutes >= t0 + 20, 'crash cost time and gave one coffee back');
assert((await toasts()).some((t) => /CRASHED/.test(t) && /warm mug/.test(t)), 'the crash event');
log('Coffee at zero: CRASHED. Twenty minutes pass and somebody leaves a warm mug by your elbow (+1 Coffee). Not a game over');
await closeToasts();

// 3) Bob makes Duct-Tape Gloves for someone with real Dad Energy
await mut(() => { const g = window.__game.g; g.state.stats.dadEnergy = 4; g.state.vitals.coffee = 6; g.state.flags.bob_coffee_given = true; g.changed(); window.__game.navigate('construction', { free: true }); });
await page.waitForSelector('.construction-page');
await page.click('[data-fk="hs-bob"]');
await page.waitForSelector('.dialogue-win');
await page.click('.dialogue-win .dlg-choice:has-text("real Dad Energy")');
await page.click('.dialogue-win .dlg-choice'); // next
await page.click('.dialogue-win .win-x');
assert((await state()).inventory.duct_tape_gloves, 'Bob gave the gloves');
log('With Dad Energy 4, Bob hands over Duct-Tape Gloves (a stat opened a conversation)');
await closeToasts();

// 4) wear them from the inventory; the Status window shows the slot and the number
await page.click('.tools button[data-tool="inventory"]');
await page.click('.inv-win [data-item="duct_tape_gloves"]');
await page.click('.inv-win button:has-text("Wear")');
await closeWin('.inv-win');
assert((await state()).equipment.hands === 'duct_tape_gloves', 'worn');
await mut(() => { window.__game.g.state.ui.revealed.stats = true; window.__game.g.changed(); });
await wait(150);
await page.click('.tools button[data-tool="stats"]');
await page.waitForSelector('.stats-win .gear-slot.on');
const gearTxt = await page.$eval('.stats-win .gear-group', (e) => e.textContent);
assert(/Duct-Tape Gloves/.test(gearTxt), 'gear shows in the Status window');
const dadRow = await page.$$eval('.stats-win .stat-row', (rows) => rows.map((r) => r.textContent).find((t) => /Dad Energy/.test(t)));
assert(/6/.test(dadRow), 'Dad Energy shows 4 + 2: ' + dadRow);
await page.click('[data-fk="unequip-hands"]');
assert(!(await state()).equipment.hands, 'taken off again');
await closeWin('.stats-win');
log('Wore the gloves from the inventory: Dad Energy 4 became 6 in the Status window; took them off again');

// 5) the 404 dungeon is CORRUPTED data unless you can see through it
await give('crt_goggles');
await mut(() => { const g = window.__game.g; g.state.flags.e404_open = true; g.state.flags.dungeon_corrupt_seen = false; g.state.ailments = []; g.changed(); window.__game.navigate('dungeon', { free: true }); });
await wait(300);
assert((await chips()).includes('CORRUPTED'), 'entering the dungeon bare-eyed corrupts you');
log('Entered the 404 dungeon without goggles: CORRUPTED');
await mut(() => { const g = window.__game.g; g.state.flags.inspector_on = true; g.state.ui.revealed.inspector = true; g.state.inspector.level = 1; g.state.flags.visited_lighthouse = true; g.changed(); });
await page.click('.tools button[data-tool="inspector"]');
await page.click('[data-fk="io-lighthouse.lamp"]');
const insp = await page.$eval('.insp-box', (e) => e.textContent);
assert(/CORRUPTED: one line is lying/.test(insp), 'the Inspector misreads a line while you are corrupted');
log('While CORRUPTED the Inspector garbles one dependency and says so: "CORRUPTED: one line is lying"');
await closeWin('.inspector-win');
await mut(() => { const g = window.__game.g; g.state.ailments = []; g.state.flags.dungeon_corrupt_seen = false; g.changed(); });
await page.click('.tools button[data-tool="inventory"]');
await page.click('.inv-win [data-item="crt_goggles"]');
await page.click('.inv-win button:has-text("Wear")');
await closeWin('.inv-win');
await mut(() => { window.__game.navigate('e404', { free: true }); });
await mut(() => { window.__game.navigate('dungeon', { free: true }); });
await wait(300);
assert(!(await chips()).includes('CORRUPTED'), 'goggles block the corruption');
assert((await toasts()).some((t) => /bounced off/i.test(t)), 'the game says it bounced off');
log('With the CRT Monitor Goggles on, the same corruption bounces off');
await closeToasts();

// 6) LOST in the maze: the map forgets you; going home cures it
await mut(() => { const g = window.__game.g; g.state.flags.maze_steps = 15; g.changed(); });
const dir = await page.evaluate(() => { const { maze, pos } = window.__maze(); const c = maze.cells[pos[1] * maze.n + pos[0]]; return c.open & 2 ? 'ArrowRight' : c.open & 4 ? 'ArrowDown' : c.open & 1 ? 'ArrowUp' : 'ArrowLeft'; });
await mut(() => { const g = window.__game.g; g.state.ailments = []; g.state.equipment.head = null; g.changed(); }); // take the goggles off
await page.keyboard.press(dir);
await wait(250);
assert((await chips()).includes('LOST'), 'wandering gets you LOST');
assert(/LOST/.test(await page.$eval('.maze-where', (e) => e.textContent)), 'the compass text says you are lost');
log('Sixteen steps without finding a landmark: LOST. The map redraws with no memory of where you have been');
await mut(() => window.__game.navigate('home', { free: true }));
await mut(() => window.__game.navigate('guestbook', { free: true }));
await mut(() => window.__game.navigate('home', { free: true }));
await wait(200);
assert(!(await chips()).includes('LOST'), 'home cured it');
log('Went home: LOST is cured (the Keeper’s Coat would have prevented it entirely)');

// 7) the Webmaster Badge: NPCs drop their voice about their own rumours
await give('webmaster_badge');
await mut(() => { const g = window.__game.g; g.state.equipment.badge = 'webmaster_badge'; g.state.flags.visited_lighthouse = true; g.changed(); window.__game.navigate('construction', { free: true }); });
await page.waitForSelector('.construction-page');
await page.click('[data-fk="hs-bob"]');
await page.waitForSelector('.dialogue-win');
await page.click('.dialogue-win .dlg-choice:has-text("Heard anything")');
await page.waitForSelector('.dialogue-win .dlg-choice');
const rumour = await page.$eval('.dialogue-win .dlg-text', (e) => e.textContent);
assert(/lowers voice/.test(rumour), 'the badge made Bob candid: ' + rumour.slice(0, 120));
log('Wearing the Webmaster Badge, Bob lowered his voice and said whether his own rumour was true: "' + rumour.slice(-48) + '"');
await page.click('.dialogue-win .win-x');

// 8) terminal gear + status
await page.fill('#address', 'about:terminal');
await page.keyboard.press('Enter');
await page.waitForSelector('.term-win');
const run = async (c) => { await page.fill('.term-in', c); await page.keyboard.press('Enter'); await wait(60); return page.$eval('.term-out', (e) => e.textContent); };
let out = await run('gear');
assert(/Webmaster Badge/.test(out), 'GEAR lists the badge');
out = await run('status');
assert(/STATUS EFFECTS/.test(out), 'STATUS reports effects');
log('Terminal: GEAR lists the badge, STATUS lists effects');

console.log('\n' + (errors.length ? 'CONSOLE PROBLEMS:\n' + errors.join('\n') : 'No console errors or warnings.'));
await browser.close();
process.exit(errors.length ? 1 : 0);
