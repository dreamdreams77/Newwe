import { describe, expect, it } from 'vitest';
import { WORLD, WORLD_BY_ID } from '../src/data/world';
import { depTier, maskedClause, objectOk, objectState, probe, errorLine, noteLine, knownObjects } from '../src/systems/worldModel';
import { buildHandbook, handbookProgress } from '../src/systems/handbook';
import { runCommand } from '../src/systems/terminal';
import { poke } from '../src/systems/pokes';
import { awardBadges } from '../src/systems/badges';
import { RUMORS, verdict, hearRumor, checkRumors } from '../src/systems/rumors';
import { VERSIONS } from '../src/data/versions';
import { test as cond } from '../src/systems/conditions';
import { exportPassword, importPassword } from '../src/core/saveSystem';
import { statusLines } from '../src/systems/status';
import { addItem } from '../src/systems/inventory';
import { newGame } from './helpers';

describe('world model', () => {
  it('every object has unique dep ids and a real state fallback', () => {
    for (const o of WORLD) {
      expect(new Set(o.deps.map((d) => d.id)).size).toBe(o.deps.length);
      expect(o.deps.length).toBeGreaterThan(0);
    }
    expect(new Set(WORLD.map((o) => o.id)).size).toBe(WORLD.length);
  });

  it('starts blind: unknown clauses are ??? = ?, and probing needs the Observation to see them', () => {
    const g = newGame(1);
    g.state.flags.visited_lighthouse = true;
    const lamp = WORLD_BY_ID['lighthouse.lamp'];
    expect(maskedClause(g, lamp, lamp.deps[1]).text).toBe('??? = ?');
    g.state.stats.observation = 0;
    const blind = probe(g, 'lighthouse.lamp');
    expect(blind.ok).toBe(false);
    expect(blind.text).toMatch(/Observation/);
    g.state.stats.observation = 4;
    g.state.vitals.coffee = 5;
    const seen = probe(g, 'lighthouse.lamp');
    expect(seen.ok).toBe(true);
    expect(g.state.vitals.coffee).toBe(4); // looking costs focus
  });

  it('what you learn or satisfy becomes readable, and the box is not a variable dump', () => {
    const g = newGame(1);
    g.state.flags.visited_lighthouse = true;
    const lamp = WORLD_BY_ID['lighthouse.lamp'];
    expect(depTier(g, lamp, lamp.deps[2])).toBe(0);
    g.state.knowledge.push('marl_lamp_stuck');
    expect(depTier(g, lamp, lamp.deps[2])).toBe(1); // you know it has a name now
    expect(maskedClause(g, lamp, lamp.deps[2]).text).toBe('repair.jury = ?');
    g.state.flags.yoghurt_delivered = true;
    expect(depTier(g, lamp, lamp.deps[0])).toBe(2);
    expect(maskedClause(g, lamp, lamp.deps[0]).met).toBe(true);
    expect(errorLine(g, lamp)).toContain('E_LAMP_JAM'); // revealed by the knowledge
  });

  it('errors stay redacted until you have earned them', () => {
    const g = newGame(1);
    g.state.flags.visited_guestbook = true;
    const o = WORLD_BY_ID['guestbook.E_strange'];
    expect(errorLine(g, o)).toBe('ERROR: █████████');
    g.state.stats.observation = 6;
    expect(errorLine(g, o)).toContain('E_DATE');
  });

  it('logic modes: ANY is satisfied by one route, ALL needs every one, XOR needs exactly one', () => {
    const g = newGame(1);
    const lamp = WORLD_BY_ID['lighthouse.lamp'];
    expect(objectOk(g, lamp)).toBe(true); // courage 3 is enough to kick it. Four exits, one door.
    g.state.stats.courage = 0;
    expect(objectOk(g, lamp)).toBe(false);
    addItem(g, 'duct_tape', 1, { quiet: true });
    expect(objectOk(g, lamp)).toBe(true);
    const gate = WORLD_BY_ID['dev.gate'];
    g.state.visitors = 600;
    g.state.creatures.chocobo = { id: 'chocobo', species: 'chocobo', name: 'P', met: true, fullness: 50, mood: 80, trust: 30, energy: 50, traits: {}, learned: [], fedLog: [], lastCareAt: 0 };
    const set = (lit: boolean, yog: boolean) => { g.state.flags.lamp_lit = lit; g.state.flags.yoghurt_delivered = yog; };
    set(true, true);
    expect(objectOk(g, gate)).toBe(false); // both: not allowed
    set(false, false);
    expect(objectOk(g, gate)).toBe(false); // neither: not allowed
    set(true, false);
    expect(objectOk(g, gate)).toBe(true); // exactly one: the back door opens
    set(false, true);
    expect(objectOk(g, gate)).toBe(true);
    g.state.creatures.chocobo.mood = 10; // a sad chocobo keeps it shut
    expect(objectOk(g, gate)).toBe(false);
  });

  it('objects only appear when you could know about them', () => {
    const g = newGame(1);
    expect(knownObjects(g).map((o) => o.id)).toEqual(['site.counter']);
    g.state.flags.visited_lake = true;
    expect(knownObjects(g).map((o) => o.id)).toContain('lake.pads');
    expect(objectState(g, WORLD_BY_ID['lake.pads'])).toBe('SHY');
    g.state.flags.boat_ridden = true;
    expect(objectState(g, WORLD_BY_ID['lake.pads'])).toBe('LISTENING');
  });

  it('a developer note shows only at full understanding', () => {
    const g = newGame(1);
    g.state.flags.visited_lighthouse = true;
    g.state.flags.lamp_lit = true;
    const lamp = WORLD_BY_ID['lighthouse.lamp'];
    expect(noteLine(g, lamp)).toBeNull();
    for (const d of lamp.deps) g.state.inspector.tiers[`${lamp.id}:${d.id}`] = 2;
    expect(noteLine(g, lamp)).toMatch(/four exits/);
  });
});

describe('handbook, badges, pokes, rumours, versions', () => {
  it('the handbook never fills itself in', () => {
    const g = newGame(1);
    const before = handbookProgress(g);
    const items = buildHandbook(g).find((c) => c.id === 'items')!;
    expect(items.entries.every((e) => e.title === 'UNKNOWN')).toBe(true);
    addItem(g, 'yoghurt', 1, { quiet: true });
    g.state.flags.has_had_yoghurt = true;
    const yog = buildHandbook(g).find((c) => c.id === 'items')!.entries.find((e) => e.id === 'yoghurt')!;
    expect(yog.title).toMatch(/Yoghurt/);
    expect(yog.lines.some((l) => !l.known)).toBe(true); // its later history is still UNKNOWN
    expect(handbookProgress(g).known).toBeGreaterThan(before.known);
    const recipes = buildHandbook(g).find((c) => c.id === 'recipes')!;
    expect(recipes.entries.every((e) => e.title === 'UNKNOWN')).toBe(true); // never lists the unmade
  });

  it('a click pays off only after persistence, once', () => {
    const g = newGame(1);
    let last = '';
    for (let i = 0; i < 6; i++) last = poke(g, 'chair');
    expect(g.state.inventory.floppy).toBeUndefined();
    expect(last).toMatch(/please|self-conscious|chair/i);
    last = poke(g, 'chair');
    expect(g.state.inventory.floppy?.qty).toBe(1);
    expect(last).toMatch(/floppy/);
    poke(g, 'chair');
    expect(g.state.inventory.floppy.qty).toBe(1);
  });

  it('badges are earned by doing, and hidden ones are not listed until then', () => {
    const g = newGame(1);
    awardBadges(g);
    expect(g.state.badges).toEqual([]);
    g.state.flags.source_read = true;
    g.state.flags.ate_yoghurt = true;
    awardBadges(g);
    expect(g.state.badges).toEqual(expect.arrayContaining(['source', 'why']));
    const list = buildHandbook(g).find((c) => c.id === 'badges')!;
    expect(list.entries.some((e) => /more you have not found/.test(e.title))).toBe(true);
    expect(list.entries.filter((e) => e.known).length).toBe(2);
  });

  it('rumours have verdicts the world can check, and the NPCs disagree', () => {
    const g = newGame(1);
    const mid = RUMORS.find((r) => r.id === 'r_midnight')!;
    const nolight = RUMORS.find((r) => r.id === 'r_nolight')!;
    expect(mid.who).not.toBe(nolight.who);
    expect(verdict(g, nolight)).toBe('open');
    hearRumor(g, nolight);
    g.state.flags.visited_lighthouse = true;
    expect(verdict(g, nolight)).toBe('false');
    checkRumors(g);
    expect(g.state.flags.rumor_checked).toBe(true);
    const yog = RUMORS.find((r) => r.id === 'r_yoghurt')!;
    g.state.flags.e404_open = true;
    expect(verdict(g, yog)).toBe('false');
    g.state.flags.yoghurt_delivered = true;
    expect(verdict(g, yog)).toBe('true');
  });

  it('old versions know things before they happen', () => {
    const g = newGame(1);
    const v137 = VERSIONS.find((v) => v.v === '1.3.7')!;
    expect(cond(g, v137.unlock)).toBe(false);
    g.state.flags.inspector_on = true;
    expect(cond(g, v137.unlock)).toBe(true);
    expect(v137.notes.join(' ')).toMatch(/vending machine/); // before you have ever met it
    expect(g.has('maze_goal')).toBe(false);
  });
});

describe('terminal', () => {
  it('answers from the world; hidden commands stay hidden', () => {
    const g = newGame(1);
    expect(runCommand(g, 'whoami').lines).toEqual(['PLAYER: UNKNOWN']);
    expect(runCommand(g, 'whoami --verbose').lines.join(' ')).toMatch(/PENDING/);
    g.state.visitors = 1111;
    expect(runCommand(g, 'whoami --verbose').lines).toEqual(['PLAYER: UNKNOWN', 'VISITOR: 1111', 'STATUS: EXPECTED']);
    expect(runCommand(g, 'inspect lamp.exe').lines[0]).toMatch(/not found/);
    expect(runCommand(g, 'debug').lines[0]).toMatch(/permission denied/);
    g.state.flags.inspector_on = true;
    expect(runCommand(g, 'debug').lines[0]).toMatch(/debug level/);
    expect(runCommand(g, 'sudo make me a sandwich').lines[0]).toMatch(/sudoers/);
    expect(runCommand(g, 'help').lines[0]).toMatch(/HELP/);
    expect(runCommand(g, 'blargh').lines[0]).toMatch(/command not found/);
    expect(runCommand(g, 'cat todo.txt').lines[0]).toMatch(/no such file/); // /dev/ not open yet
  });

  it('inspect output is masked exactly like the Inspector', () => {
    const g = newGame(1);
    g.state.flags.inspector_on = true;
    g.state.flags.visited_lighthouse = true;
    const out = runCommand(g, 'inspect lamp.exe').lines.join('\n');
    expect(out).toContain('??? = ?');
    expect(out).toContain('ERROR: █');
  });
});

describe('status and saves', () => {
  it('system status shows the processes and an unfound parent', () => {
    const g = newGame(1);
    g.state.flags.finale_ready = true;
    g.state.visitors = 1111;
    const lines = statusLines(g).join('\n');
    expect(lines).toMatch(/VISITORS: 1,111/);
    expect(lines).toMatch(/homepage.exe/);
    expect(lines).toMatch(/PARENT PROCESS/);
    expect(lines).toMatch(/ERRORS:   0/);
  });

  it('inspector tiers and badges survive a save password', async () => {
    const g = newGame(3);
    g.state.inspector = { level: 2, tiers: { 'lighthouse.lamp:j': 1, 'dev.gate:x': 2 }, probes: 4 };
    g.state.badges = ['source', 'why'];
    g.state.flags.ng = 1;
    const back = await importPassword(await exportPassword(g.state));
    expect(back.inspector.level).toBe(2);
    expect(back.inspector.tiers['dev.gate:x']).toBe(2);
    expect(back.badges).toEqual(['source', 'why']);
    expect(back.flags.ng).toBe(1);
  });
});
