// The hidden layers, played through the real UI: page source, the Inspector, the Handbook,
// pokes, the corrupted save, the pseudo-code gate (XOR), the /dev/ room, the terminal,
// controlled bugs, version history and New Game+.
const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const URL = process.env.URL ?? (process.env.E2E_BASE ?? 'http://127.0.0.1:4173/') + '?fresh&seed=' + (process.env.SEED ?? '7') + '&debug';
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
const mut = (fn, arg) => page.evaluate(fn, arg);
const toasts = () => page.$$eval('.toast', (e) => e.map((x) => x.textContent));
const closeToasts = () => page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
const menu = async (top, item) => { await page.click(`.menu:has-text("${top}") > button`); await page.click(`.menu.open button:has-text("${item}")`); };
const address = async (a) => { await page.fill('#address', a); await page.keyboard.press('Enter'); await wait(200); };
const closeWin = async (sel) => { await page.click(`${sel} .win-x`); await page.waitForSelector(sel, { state: 'detached' }); };

await page.goto(URL);
await page.click('text=ENTER SITE');
await wait(300);

// 1) View source: the first thing a curious person tries
await menu('View', 'Page Source');
await page.waitForSelector('.source-win');
let src = await page.$eval('.source-pre', (e) => e.textContent);
assert(/TODO: take out the debugging junk/.test(src), 'source has the dev comment');
assert(!/about:inspector/.test(src), 'the debug view is NOT leaked at stage 1');
let s = await state();
assert(s.flags.source_read && s.badges.includes('source'), 'I READ THE SOURCE badge');
log('Viewed the page source: found a "TODO: take out the debugging junk" and earned the badge I READ THE SOURCE');
await closeWin('.source-win'); await closeToasts();

// 2) at stage 2 the source leaks the debug address
await mut(() => { const g = window.__game.g; g.state.flags.eleven_first = true; g.state.flags.visited_guestbook = true; g.changed(); });
await wait(250);
await menu('View', 'Page Source');
await page.waitForSelector('.source-win');
src = await page.$eval('.source-pre', (e) => e.textContent);
assert(/about:inspector/.test(src) && /about:version/.test(src), 'source leaks the debug view at stage 2');
log('At stage 2 the same page source now leaks: <!-- debug view: about:inspector -->');
await closeWin('.source-win');

// 3) the Inspector
await address('about:inspector');
await page.waitForSelector('.inspector-win');
s = await state();
assert(s.flags.inspector_on && s.badges.includes('inspector'), 'inspector on + badge');
let box = await page.$eval('.insp-box', (e) => e.textContent);
assert(/HOMEPAGE INSPECTOR/.test(box) && /hit_counter/.test(box), 'the box is drawn and starts with the counter');
assert(/\?\?\? = \?/.test(box) || /visitors = \?/.test(box), 'unknown clauses are masked');
log('Typed about:inspector: the Inspector opened, showing only what it can read (`??? = ?`)');
await mut(() => { const g = window.__game.g; g.state.flags.visited_lighthouse = true; g.state.vitals.coffee = 9; g.state.stats.observation = 4; g.changed(); });
await wait(200);
await page.click('[data-fk="io-lighthouse.lamp"]');
box = await page.$eval('.insp-box', (e) => e.textContent);
assert(/OBJECT: lamp.exe/.test(box) && /STATE: STUCK/.test(box) && /ERROR: █/.test(box), 'lamp readout is masked');
const before = (box.match(/\?\?\? = \?/g) ?? []).length;
await page.click('[data-fk="probe"]');
await wait(150);
box = await page.$eval('.insp-box', (e) => e.textContent);
const after = (box.match(/\?\?\? = \?/g) ?? []).length;
assert(after < before, 'probing revealed a name');
log('Probed the lamp: one more dependency came into focus (it cost a coffee and needed Observation)');
await mut(() => { const g = window.__game.g; g.state.stats.observation = 0; g.state.vitals.coffee = 9; g.state.inspector.tiers = {}; g.changed(); });
await page.click('[data-fk="probe"]');
await wait(120);
assert((await toasts()).some((t) => /Observation/.test(t)), 'low Observation cannot see further');
log('With Observation 0 the probe refuses: stats change what you can SEE');
await closeToasts();

// 4) inspect mode: click a thing on the page to inspect it instead of using it
await page.click('.inspector-win button:has-text("Inspect mode")'); // turns it on (and closes the window)
await page.waitForSelector('.inspector-win', { state: 'detached' });
await mut(() => window.__game.navigate('lighthouse', { free: true }));
await page.waitForSelector('.lighthouse-page');
await page.click('[data-fk="hs-lamp"]');
await page.waitForSelector('.inspector-win');
assert(!(await page.$('.check-win')), 'inspect mode did not trigger the repair');
assert(/OBJECT: lamp.exe/.test(await page.$eval('.insp-box', (e) => e.textContent)), 'clicking the lamp inspected it');
log('Inspect mode on: clicking the lamp on the page inspected it instead of repairing it');
await page.click('.inspector-win button:has-text("Inspect mode")'); // turn it off again
await closeWin('.inspector-win');
assert(!(await page.evaluate(() => document.body.classList.contains('inspecting'))), 'inspect mode is off');

// 5) pokes: a chair pays off after persistence
await mut(() => window.__game.navigate('home', { free: true }));
await wait(250);
for (let i = 0; i < 7; i++) { await page.click('[data-fk="chair"]'); await closeToasts(); }
s = await state();
assert(s.inventory.floppy && s.badges.includes('clicked'), 'the chair paid off with a floppy disk and a badge');
log('Clicked the chair seven times ("Still a chair." ... "please."): a floppy disk fell out, and YOU WEREN\'T SUPPOSED TO CLICK THAT');
await closeToasts();
await page.click('.tools button[data-tool="inventory"]');
await page.click('.inv-win [data-item="floppy"]');
await page.click('.inv-win button:has-text("Blow on it")');
await closeWin('.inv-win'); await closeToasts();

// 6) corrupted save file: a playable mystery
await menu('File', 'Save Files');
await page.waitForSelector('.savefiles-win');
assert(await page.$('[data-fk="slot3"]'), 'CORRUPTED.HTML appeared after the floppy');
assert(!(await page.$('[data-fk="slot2"]')), 'FINAL.HTML is not there yet');
await page.click('[data-fk="slot3"]');
await page.waitForSelector('.hex-win');
const GOOD = 'THE PAGE REMEMBERS YOU. 11:11';
for (let i = 0; i < 6; i++) {
  const el = await page.$('.hex-ascii');
  if (!el) break; // the file opened
  const ascii = await el.textContent();
  const bad = [...GOOD].findIndex((c, k) => ascii[k] !== c);
  if (bad < 0) break;
  await page.click(`[data-fk="hb-${bad}"]`);
  await page.fill('.hex-in', GOOD[bad]);
  await wait(80);
}
await page.waitForSelector('.hex-win', { state: 'detached' });
s = await state();
assert(s.flags.corrupt_fixed && s.inventory.crt_goggles, 'repairing the file gave the CRT Monitor Goggles');
log('Repaired CORRUPTED.HTML (three bad sectors, fixed by reading the ASCII): "THE PAGE REMEMBERS YOU." It contained goggles');
await closeToasts(); await page.click('.savefiles-win .win-x');

// 7) the traffic cone's note: a clue to the XOR gate
await mut(() => window.__game.navigate('construction', { free: true }));
await page.waitForSelector('.construction-page');
for (let i = 0; i < 5; i++) { await page.click('[data-fk="hs-cone"]'); await closeToasts(); }
s = await state();
assert(s.knowledge.includes('dev_xor'), 'the cone note taught XOR');
log('Poked a traffic cone five times: a note under it explains XOR ("exactly ONE of the two. never both.")');

// 8) the pseudo-code gate at /dev/
await mut(() => { const g = window.__game.g; g.state.visitors = 640; g.state.creatures.chocobo = { id: 'chocobo', species: 'chocobo', name: 'Peep', met: true, fullness: 60, mood: 80, trust: 30, energy: 60, traits: {}, learned: [], fedLog: [], lastCareAt: 0 }; g.state.activeCreature = 'chocobo'; g.state.flags.lamp_lit = true; g.state.flags.yoghurt_delivered = true; g.changed(); });
await address('http://www.cybercities.com/AreaFiftyOne/Vault/1111/dev/');
await page.waitForSelector('.gate-win');
const code = await page.$eval('.gate-win .code', (e) => e.textContent);
assert(/IF /.test(code) && /OPEN\("\/dev\/"\)/.test(code), 'the gate is pseudo-code');
assert(/lamp_lit XOR yoghurt_delivered/.test(code), 'the cone gave away the name of the XOR clause');
await page.click('[data-fk="trygate"]');
await wait(150);
assert(!(await state()).flags.dev_open, 'both true: XOR says no');
log('The /dev/ gate is pseudo-code with an XOR. With the lamp lit AND the yoghurt delivered (both true) it stays shut');
await mut(() => { const g = window.__game.g; g.state.flags.yoghurt_delivered = false; g.changed(); });
await page.click('[data-fk="trygate"]');
await page.waitForSelector('.dev-page');
s = await state();
assert(s.flags.dev_open && s.badges.includes('dev'), 'exactly one: the door opens');
log('With exactly one true (lamp lit by other means), the door opened: WORKS ON MY MACHINE');
await closeToasts();

// 9) the developer room: some of it becomes useful
await page.click('[data-fk="dev-todo.txt"]');
assert(/parent process/.test(await page.$eval('.source-pre', (e) => e.textContent)), 'todo.txt mentions the parent process');
await closeWin('.source-win');
await page.click('[data-fk="dev-debug.cfg"]');
await page.click('.source-win button:has-text("debug=1")');
await closeWin('.source-win');
assert((await state()).inspector.level === 2, 'debug=1 raised the inspector level');
await page.click('[data-fk="dev-test_object.bin"]');
await page.waitForSelector('.alert');
await page.click('.alert button:has-text("OK")');
s = await state();
assert(s.inventory.broken_mouse && s.flags.bug_found, 'the test object gave the Broken Mouse');
await page.click('[data-fk="dev-prototypes/glitch_sprite.png"]');
assert((await state()).flags.glitch_seen, 'saw the prototype creature');
await page.click('.alert button:has-text("Look back")');
log('The developer room: todo.txt, debug.cfg (debug=1: the Inspector sees further, for free), a Broken Mouse from TEST_OBJECT_01, and an unfinished creature called Glitch Sprite');
await closeToasts();

// 10) the terminal
await address('about:terminal');
await page.waitForSelector('.term-win');
const run = async (cmd) => { await page.fill('.term-in', cmd); await page.keyboard.press('Enter'); await wait(60); return page.$eval('.term-out', (e) => e.textContent); };
let out = await run('whoami --verbose');
assert(/VISITOR: 640/.test(out) && /PENDING/.test(out), 'whoami --verbose is pending below 1111');
out = await run('inspect lamp.exe');
assert(/OBJECT: lamp.exe/.test(out), 'inspect works in the terminal');
out = await run('cat todo.txt');
assert(/debugging|debug view/.test(out), 'cat reads the dev file once /dev/ is open');
out = await run('sudo rm -rf /');
assert(/sudoers/.test(out), 'sudo is refused');
out = await run('xyzzy');
assert(/wrong game/.test(out), 'xyzzy');
log('Terminal: WHOAMI --verbose, INSPECT lamp.exe, CAT todo.txt, SUDO and XYZZY all answer from the world (some only once /dev/ is open)');
await closeWin('.term-win');

// 11) controlled bugs: three ways past a block that was supposed to need a key and a postcard
await mut(() => { const g = window.__game.g; g.state.flags.clue_404 = false; g.state.flags.e404_open = false; g.state.knowledge = g.state.knowledge.filter((k) => k !== 'page_is_address'); g.state.flags.bug_found = false; g.changed(); });
await mut(() => window.__game.navigate('home', { free: true }));
await page.click('.tools button[data-tool="inventory"]');
await page.click('.inv-win [data-item="broken_mouse"]');
await page.click('.inv-win button:has-text("Use on something")');
await page.click('a[data-fk="l-404"]');
await page.waitForSelector('.e404.found');
s = await state();
assert(s.flags.clue_404 && s.flags.bug_found, 'the Broken Mouse revived the dead link without the postcard');
assert((await toasts()).some((t) => /shouldn't have worked/.test(t)), 'the game acknowledged the unintended thing');
log('Used the Broken Mouse on the dead "Secret Page!!" link: "That shouldn\'t have worked." (the postcard puzzle was skipped, with consequences)');
await closeToasts();
await mut(() => { const g = window.__game.g; g.state.flags.e404_open = false; g.state.flags.e404_exploit = false; g.state.knowledge.push('page_is_address'); g.changed(); });
await address('http://www.cybercities.com/AreaFiftyOne/Vault/1111/404/');
if (process.env.DEBUG_FIN) console.log(await page.$eval('.viewport', (e) => e.firstElementChild.className), JSON.stringify(await toasts()), JSON.stringify(await page.evaluate(() => ({ z: window.__game.g.state.zone, o: window.__game.g.state.flags.e404_open, c: window.__game.g.state.flags.clue_404 }))));
await page.waitForSelector('.dungeon-page', { timeout: 5000 }).catch(async () => { console.log('DIAG', await page.$eval('.viewport', (e) => e.firstElementChild?.className), JSON.stringify(await toasts()), JSON.stringify(await page.evaluate(() => ({ z: window.__game.g.state.zone, o: window.__game.g.state.flags.e404_open, a: document.getElementById('address').value, w: [...document.querySelectorAll('.window')].map((x) => x.className) })))); throw new Error('no dungeon'); });
s = await state();
assert(s.flags.e404_open && s.flags.e404_exploit, 'typing the address bypassed the lock');
log('Typed the dungeon’s address straight into the address bar: it opened. (The lock is for people who use the link.)');
await closeToasts();

// 12) version history: old versions know things
await address('about:version');
await page.waitForSelector('.versions-win');
const vtxt = await page.$eval('.versions-win', (e) => e.textContent);
assert(/v1\.3\.7/.test(vtxt) && /Removed: the vending machine/.test(vtxt), 'v1.3.7 mentions a machine you may not have met');
await page.click('[data-fk="ver-1.3.7"]');
assert(/VM-1111: exact change only/.test(await page.$eval('.versions-win', (e) => e.textContent)), 'the old page gives away a boss clue');
log('about:version: v1.3.7 "removed the vending machine" and its old page still has VM-1111’s exact-change clue');
await closeWin('.versions-win');

// 13) the handbook: unknown stays unknown
await menu('Help', 'Handbook');
await page.waitForSelector('.handbook-win');
const hb = await page.$eval('.handbook-win', (e) => e.textContent);
assert(/UNKNOWN/.test(hb) && /Entries understood: \d+ of \d+/.test(hb), 'handbook shows UNKNOWN entries and a progress count');
await page.click('[data-fk="hb-recipes"]');
assert(!(/Mended Token/.test(await page.$eval('.handbook-win', (e) => e.textContent))), 'unmade recipes are never listed');
log('The Webmaster’s Handbook: entries stay UNKNOWN until discovered, recipes are never spoiled');
await closeWin('.handbook-win');

// 14) final state: system status, FINAL.HTML and New Game+
await mut(() => { const g = window.__game.g; g.state.visitors = 1200; g.state.flags.boss_defeated = true; g.changed(); });
await wait(300);
await mut(() => window.__game.navigate('elevenRoom', { free: true }));
await page.waitForSelector('.finale button:has-text("Return")', { timeout: 20000 });
const fin = await page.$eval('.render-pre', (e) => e.textContent);
assert(/PARENT PROCESS/.test(fin) && /homepage\.exe/.test(fin) && /ERRORS: {3}0/.test(fin), 'the finale shows SYSTEM STATUS');
log('The finale: SYSTEM STATUS (processes, uptime, memory, errors: 0, parent process: not yet found)');
await menu('File', 'Save Files');
await page.click('[data-fk="slot2"]');
await page.click('.alert button:has-text("Begin again")');
await page.waitForSelector('.splash', { timeout: 10000 });
await page.goto(URL.replace('?fresh&', '?')); // (the test URL carries ?fresh, which ignores saves)
await page.click('text=CONTINUE');
await wait(500);
s = await state();
if (process.env.DEBUG_FIN) console.log(JSON.stringify({ ng: s.flags.ng, lvl: s.inspector, badges: s.badges, v: s.visitors }));
assert(s.flags.ng === 1 && s.inspector.level === 2 && s.badges.includes('dev'), 'New Game+ kept the badges and the Inspector');
assert(s.visitors === 73 && !s.flags.lake_solved, 'but the world is new');
assert(/WELCOME BACK/.test(await page.$eval('.page-sub', (e) => e.textContent)), 'the homepage recognises you');
log('New Game+: WELCOME BACK. The homepage recognised me; badges and the Inspector came along, the world is new');

console.log('\n' + (errors.length ? 'CONSOLE PROBLEMS:\n' + errors.join('\n') : 'No console errors or warnings.'));
await browser.close();
process.exit(errors.length ? 1 : 0);
