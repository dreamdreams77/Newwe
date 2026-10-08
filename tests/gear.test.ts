import { describe, expect, it } from 'vitest';
import { ELEVEN_AM } from '../src/config/balance';
import { activeAilmentIds, applyAilment, hasAilment, timeMult, watchCoffee } from '../src/systems/ailments';
import { equip, hasPerk, unequip, equippedIn } from '../src/systems/equipment';
import { addItem } from '../src/systems/inventory';
import { statValue } from '../src/systems/stats';
import { passTime } from '../src/systems/actions';
import { runUse } from '../src/systems/itemUse';
import { enterZone } from '../src/systems/travel';
import { approachesOf, commitRoll, emptyMods, prepareCheck, roll, type CheckDef } from '../src/systems/dice';
import { rumorText, RUMORS } from '../src/systems/rumors';
import { probe } from '../src/systems/worldModel';
import { exportPassword, importPassword } from '../src/core/saveSystem';
import { runCommand } from '../src/systems/terminal';
import { buildHandbook } from '../src/systems/handbook';
import { ITEMS } from '../src/data/items';
import { newGame, flush } from './helpers';

const give = (g: ReturnType<typeof newGame>, id: string) => addItem(g, id, 1, { quiet: true });

describe('status effects', () => {
  it('coffee drives two statuses: too little is CRASHED, too much is JITTERY', () => {
    const g = newGame();
    expect(activeAilmentIds(g)).toEqual([]);
    g.state.vitals.coffee = g.state.vitals.coffeeMax;
    expect(hasAilment(g, 'jittery')).toBe(true);
    const chaos = statValue(g, 'chaos');
    g.state.vitals.coffee = 5;
    expect(statValue(g, 'chaos')).toBe(chaos - 2);
    g.state.vitals.coffee = 0;
    expect(hasAilment(g, 'crashed')).toBe(true);
  });

  it('they change how long things take', () => {
    const g = newGame();
    g.state.vitals.coffee = 5;
    const normal = timeMult(g);
    g.state.vitals.coffee = g.state.vitals.coffeeMax; // jittery: faster
    expect(timeMult(g)).toBeLessThan(normal);
    g.state.vitals.coffee = 0; // crashed: slower
    expect(timeMult(g)).toBeGreaterThan(normal);
  });

  it('the first crash costs time and is followed by something kind', async () => {
    const g = newGame();
    g.state.vitals.coffee = 0;
    const t0 = g.state.clock.minutes;
    watchCoffee(g, passTime);
    expect(g.state.vitals.coffee).toBe(1);
    expect(g.state.clock.minutes).toBeGreaterThanOrEqual(t0 + 20);
    expect(g.state.seenFx).toContain('fx:crashed');
  });

  it('timed statuses expire on the game clock', () => {
    const g = newGame();
    applyAilment(g, 'inspired', 60, true);
    expect(hasAilment(g, 'inspired')).toBe(true);
    const c = statValue(g, 'creativity');
    expect(c).toBe(5);
    passTime(g, 90, { raw: true });
    expect(hasAilment(g, 'inspired')).toBe(false);
    expect(statValue(g, 'creativity')).toBe(3);
  });

  it('OVERWRITTEN replaces your strongest stat with its starting value', () => {
    const g = newGame();
    g.state.stats.courage = 9;
    expect(statValue(g, 'courage')).toBe(9);
    applyAilment(g, 'overwritten', 60, true);
    expect(statValue(g, 'courage')).toBe(3);
    expect(statValue(g, 'curiosity')).toBe(4); // everything else untouched
  });

  it('things that happen to you apply them: the yoghurt, the sludge, the Golden Dice after 11:11', async () => {
    const g = newGame(5);
    give(g, 'yoghurt');
    await runUse(g, 'yoghurt', 'eat');
    expect(hasAilment(g, 'overwritten')).toBe(true);
    give(g, 'sludge');
    await runUse(g, 'sludge', 'taste');
    expect(hasAilment(g, 'corrupted')).toBe(true);

    const h = newGame(9);
    give(h, 'golden_dice');
    h.state.clock.minutes = ELEVEN_AM + 6; // just after 11:11
    const def: CheckDef = { id: 't', title: 't', stat: 'courage', dc: 1 };
    const mods = emptyMods();
    mods.golden = true;
    commitRoll(h, roll(h, prepareCheck(h, def, approachesOf(def)[0], mods)));
    expect(hasAilment(h, 'outofsync')).toBe(true);
    const k = newGame(9);
    give(k, 'golden_dice');
    k.state.clock.minutes = 14 * 60;
    const m2 = emptyMods();
    m2.golden = true;
    commitRoll(k, roll(k, prepareCheck(k, def, approachesOf(def)[0], m2)));
    expect(hasAilment(k, 'outofsync')).toBe(false); // only right after 11:11
  });

  it('gear can make you immune, and home cures LOST', () => {
    const g = newGame();
    give(g, 'crt_goggles');
    equip(g, 'crt_goggles');
    expect(applyAilment(g, 'corrupted', 60, true)).toBe(false);
    expect(applyAilment(g, 'lost', 60, true)).toBe(true);
    enterZone(g, 'guestbook', { free: true });
    enterZone(g, 'home', { free: true });
    expect(hasAilment(g, 'lost')).toBe(false);
    give(g, 'keepers_coat');
    equip(g, 'keepers_coat');
    expect(applyAilment(g, 'lost', 60, true)).toBe(false);
  });
});

describe('equipment', () => {
  it('needs the item, fills one slot per kind, and swaps', () => {
    const g = newGame();
    expect(equip(g, 'crt_goggles').ok).toBe(false);
    give(g, 'crt_goggles');
    give(g, 'lighthouse_lens');
    expect(equip(g, 'crt_goggles').ok).toBe(true);
    expect(equippedIn(g, 'head')?.id).toBe('crt_goggles');
    expect(equip(g, 'yoghurt').ok).toBe(false);
    unequip(g, 'head');
    expect(equippedIn(g, 'head')).toBeNull();
  });

  it('changes what you can DO, not only a number', () => {
    const g = newGame();
    give(g, 'duct_tape_gloves');
    const dad = statValue(g, 'dadEnergy');
    equip(g, 'duct_tape_gloves');
    expect(statValue(g, 'dadEnergy')).toBe(dad + 2);
    // goggles let the Inspector see further
    const lamp = newGame();
    lamp.state.flags.visited_lighthouse = true;
    lamp.state.stats.observation = 1;
    lamp.state.vitals.coffee = 5;
    expect(probe(lamp, 'lighthouse.lamp').ok).toBe(false);
    give(lamp, 'crt_goggles');
    equip(lamp, 'crt_goggles');
    expect(hasPerk(lamp, 'probe_plus2')).toBe(true);
    lamp.state.stats.observation = 1; // 1 + goggles(+1 stat, +2 probe) clears the obs-3 clause
    expect(probe(lamp, 'lighthouse.lamp').ok).toBe(true);
  });

  it('the Webmaster Badge makes NPCs tell you what they actually think of their own rumours', () => {
    const g = newGame();
    const r = RUMORS.find((x) => x.id === 'r_nolight')!;
    g.state.flags.rumor_last = r.id;
    expect(rumorText(g)).toBe(r.text);
    give(g, 'webmaster_badge');
    equip(g, 'webmaster_badge');
    g.state.flags.visited_lighthouse = true; // the rumour is false once you have seen a lighthouse
    expect(rumorText(g)).toMatch(/rubbish/);
  });

  it('a junk receipt is the lucky accessory', () => {
    const g = newGame();
    give(g, 'receipt');
    const luck = statValue(g, 'luck');
    equip(g, 'receipt');
    expect(statValue(g, 'luck')).toBe(luck + 1);
    expect(hasPerk(g, 'lucky_receipt')).toBe(true);
  });

  it('every equippable item has a slot, a sprite and a purpose', () => {
    for (const i of Object.values(ITEMS)) {
      if (!i.equip) continue;
      expect(['head', 'body', 'hands', 'accessory', 'tool', 'badge', 'companion', 'relic']).toContain(i.equip.slot);
      expect(i.equip.text.length).toBeGreaterThan(10);
      expect((i.equip.perks?.length ?? 0) + Object.keys(i.equip.mods ?? {}).length).toBeGreaterThan(0);
    }
  });
});

describe('how they show up elsewhere', () => {
  it('the terminal and the Handbook know about them, and the Handbook stays blank until you have had one', async () => {
    const g = newGame();
    expect(runCommand(g, 'status').lines[0]).toMatch(/none/);
    applyAilment(g, 'jittery', 60, true);
    expect(runCommand(g, 'status').lines[0]).toMatch(/JITTERY/);
    give(g, 'duct_tape_gloves');
    expect(runCommand(g, 'equip duct').lines[0]).toMatch(/put on/i);
    expect(runCommand(g, 'gear').lines.join('\n')).toMatch(/Duct-Tape Gloves/);
    const hb = buildHandbook(g);
    const st = hb.find((c) => c.id === 'status')!;
    expect(st.entries.find((e) => e.id === 'jittery')!.known).toBe(true);
    expect(st.entries.find((e) => e.id === 'lost')!.title).toBe('UNKNOWN');
    await flush();
  });

  it('statuses and gear survive a save password', async () => {
    const g = newGame(4);
    give(g, 'keepers_coat');
    equip(g, 'keepers_coat');
    applyAilment(g, 'inspired', 90, true);
    const back = await importPassword(await exportPassword(g.state));
    expect(back.equipment.body).toBe('keepers_coat');
    expect(back.ailments.find((a) => a.id === 'inspired')).toBeTruthy();
    expect(back.seenFx).toContain('fx:inspired');
  });
});

describe('playstyle identity', () => {
  it('is derived from base stats, with a perk, and Drifter until you lean', async () => {
    const { identity } = await import('../src/systems/identity');
    const g = newGame();
    expect(identity(g)).toBeNull();
    g.state.stats.luck += 3; g.state.stats.chaos += 3;
    expect(identity(g)?.id).toBe('gambler');
    g.state.stats.courage = 20; g.state.stats.dadEnergy = 20;
    expect(identity(g)?.id).toBe('daredevil');
  });
});

describe('Salesman and Glitch Sprite', () => {
  it('the Sprite is a familiar-slot item whose glitch is blocked by goggles', () => {
    const g = newGame();
    give(g, 'glitch_sprite');
    expect(equip(g, 'glitch_sprite').ok).toBe(true);
    expect(hasPerk(g, 'glitch_sprite')).toBe(true);
    expect(applyAilment(g, 'corrupted', 60, true)).toBe(true);
    give(g, 'crt_goggles');
    equip(g, 'crt_goggles');
    expect(applyAilment(g, 'corrupted', 60, true)).toBe(false);
  });
  it('the Salesman has a reachable, well-formed tree', async () => {
    const { SALESMAN } = await import('../src/data/dialogue');
    const ids = Object.keys(SALESMAN.nodes);
    for (const n of Object.values(SALESMAN.nodes)) {
      if (n.next) expect(ids).toContain(n.next);
      for (const c of n.choices ?? []) { if (c.next) expect(ids).toContain(c.next); if (c.check) { expect(ids).toContain(c.check.ok); expect(ids).toContain(c.check.fail); } }
    }
  });
});

describe('relics', () => {
  it('each has a real upside and a real drawback, and only one is worn at a time', () => {
    const g = newGame();
    const luck = statValue(g, 'luck'), courage = statValue(g, 'courage');
    give(g, 'edge_coin'); equip(g, 'edge_coin');
    expect(statValue(g, 'luck')).toBe(luck + 3);
    expect(statValue(g, 'courage')).toBe(Math.max(0, courage - 2));
    give(g, 'stopped_clock'); equip(g, 'stopped_clock');
    expect(equippedIn(g, 'relic')?.id).toBe('stopped_clock');
    expect(statValue(g, 'luck')).toBe(luck);
    g.state.vitals.coffee = 5;
    expect(timeMult(g)).toBeCloseTo(0.8);
    unequip(g, 'relic');
    expect(timeMult(g)).toBe(1);
  });
});

describe('knacks', () => {
  it('unlock by growth, one pick per tier, and the effects are real', async () => {
    const k = await import('../src/systems/knacks');
    const { startEncounter, raiseFury, encDef, advancePhase } = await import('../src/systems/combat');
    const g = newGame();
    expect(k.pendingTier(g)).toBeNull();
    expect(k.pickKnack(g, 'steady_hands')).toBe(false);
    g.state.stats.courage += 2;
    expect(k.pendingTier(g)).toBe(0);
    expect(k.pickKnack(g, 'second_wind')).toBe(false); // wrong tier
    expect(k.pickKnack(g, 'steady_hands')).toBe(true);
    expect(k.pendingTier(g)).toBeNull();
    const e = startEncounter(g, 'vm1111');
    raiseFury(g, e, encDef('vm1111'));
    expect(e.fury).toBe(0); // first mistake forgiven
    raiseFury(g, e, encDef('vm1111'));
    expect(e.fury).toBe(1);
    g.state.stats.courage += 6;
    expect(k.pendingTier(g)).toBe(1);
    k.pickKnack(g, 'second_wind');
    g.state.vitals.hp = 3;
    advancePhase(g, e);
    expect(g.state.vitals.hp).toBe(5);
    // survives a save round trip as a plain flag
    const back = await importPassword(await exportPassword(g.state));
    expect(back.flags.knacks).toBe('steady_hands,second_wind');
  });
});

describe('the Broken Homepage', () => {
  it('its puzzles are fair: symmetrical banner, exactly one future forgery, a reversible shift, a 5-key sequence', async () => {
    const b = await import('../src/systems/brokenHome');
    const g = newGame();
    for (let attempt = 1; attempt <= 12; attempt++) {
      const p = b.bannerPattern(g, attempt);
      expect(p.length).toBeGreaterThanOrEqual(3);
      for (const c of p) { const mirror = (c % 3 === 0 ? c + 2 : c % 3 === 2 ? c - 2 : c); expect(p).toContain(mirror); }
      const f = b.guestbookForgery(g, attempt);
      expect(f.entries.filter((e) => e.n > f.counter)).toHaveLength(1);
      expect(f.entries[f.forged].n).toBeGreaterThan(f.counter);
      const w = b.cipherWord(g, attempt);
      expect(b.shiftWord(b.shiftWord(w), 26 - b.CIPHER_SHIFT)).toBe(w);
      expect(b.keySequence(g, attempt)).toHaveLength(5);
    }
  });
  it('every piece of knowledge its phases reveal exists, and the zone is guarded until the first boss falls', async () => {
    const { BROKEN_HOME } = await import('../src/data/encounters');
    const { KNOWLEDGE } = await import('../src/data/knowledge');
    for (const ph of BROKEN_HOME.phases) for (const r of ph.reveals) expect(KNOWLEDGE[r.know]).toBeTruthy();
    expect(KNOWLEDGE[BROKEN_HOME.weakness!.know]).toBeTruthy();
  });
});

describe('the Whispering Woods', () => {
  it('the trail: foxfire only after dark, sharp eyes by day, a wrong turn is LOST (unless you wear the ring), three rights find the oak', async () => {
    const f = await import('../src/systems/forest');
    const g = newGame();
    const dirs = f.forkDirs(g);
    expect(dirs).toHaveLength(3);
    expect(f.forkDirs(g)).toEqual(dirs); // fair and repeatable per world
    // daytime, low Observation: the sign tells you nothing
    g.state.clock.minutes = 12 * 60;
    g.state.stats.observation = 2;
    expect(f.foxfireOut(g)).toBe(false);
    expect(f.forkHint(g, 0).reliable).toBe(false);
    // keen eyes read the moss
    g.state.stats.observation = 9;
    expect(f.forkHint(g, 0).reliable).toBe(true);
    // after dark the foxfire is reliable at every fork
    g.state.stats.observation = 2;
    g.state.clock.minutes = 22 * 60;
    expect(f.foxfireOut(g)).toBe(true);
    for (let i = 0; i < 3; i++) expect(f.forkHint(g, i).text).toContain(dirs[i] === 'L' ? 'LEFT' : 'RIGHT');
    // a wrong turn resets and loses you
    const wrong = dirs[0] === 'L' ? 'R' : 'L';
    expect(f.walk(g, wrong).ok).toBe(false);
    expect(f.trailStep(g)).toBe(0);
    expect(hasAilment(g, 'lost')).toBe(true);
    // the ring makes you unlosable
    g.state.ailments = [];
    give(g, 'tree_ring'); equip(g, 'tree_ring');
    f.walk(g, wrong);
    expect(hasAilment(g, 'lost')).toBe(false);
    // three rights
    for (const d of dirs) f.walk(g, d);
    expect(g.state.flags.oak_found).toBe(true);
  });
  it('the content is wired: zone, quest, memory, card, items, recipe, knowledge, hotspot objects', async () => {
    const { ZONES, WEBRING } = await import('../src/data/zones');
    const { QUESTS } = await import('../src/data/quests');
    const { MEMORIES } = await import('../src/data/memories');
    const { CARDS } = await import('../src/data/cards');
    const { RECIPES } = await import('../src/data/recipes');
    const { KNOWLEDGE } = await import('../src/data/knowledge');
    const { WORLD_BY_ID } = await import('../src/data/world');
    expect(ZONES.forest.eco?.mushrooms.max).toBeGreaterThan(0);
    expect(WEBRING.find((t) => t.zone === 'forest')?.future).toBeFalsy();
    expect(QUESTS.find((q) => q.id === 'q_forest')).toBeTruthy();
    expect(MEMORIES.FOREST_001).toBeTruthy();
    expect(CARDS.old_oak).toBeTruthy();
    expect(ITEMS.forest_mushroom && ITEMS.tree_ring).toBeTruthy();
    expect(RECIPES.find((r) => r.id === 'foxfire_tea')).toBeTruthy();
    expect(KNOWLEDGE.forest_foxfire && KNOWLEDGE.forest_eleven).toBeTruthy();
    for (const id of ['forest.mushrooms', 'forest.trail', 'forest.oak']) expect(WORLD_BY_ID[id]).toBeTruthy();
  });
});

describe('Tasmania', () => {
  it('the five changes, left to right, spell the word the sky wants, and the aurora jar sharpens you only at night', async () => {
    const { DIFFS, AURORA_WORD } = await import('../src/data/tasmania');
    const sorted = [...DIFFS].sort((a, b) => a.x - b.x).map((d) => d.letter).join('');
    expect(sorted).toBe(AURORA_WORD);
    expect(AURORA_WORD).toBe('SOUTH');
    // no two changes overlap
    for (const a of DIFFS) for (const b of DIFFS) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
    const { ZONES, WEBRING } = await import('../src/data/zones');
    expect(ZONES.tasmania).toBeTruthy();
    expect(WEBRING.find((t) => t.zone === 'tasmania')?.future).toBeFalsy();
    const g = newGame();
    const base = statValue(g, 'observation');
    give(g, 'aurora_jar'); equip(g, 'aurora_jar');
    g.state.clock.minutes = 12 * 60;
    expect(statValue(g, 'observation')).toBe(base);
    g.state.clock.minutes = 23 * 60;
    expect(statValue(g, 'observation')).toBe(base + 2);
  });
});

describe('Act III and the trophy room', () => {
  it('the parent process is gated behind the whole crossword and the finale, and rewrites SYSTEM STATUS', async () => {
    const { PARENT_QS } = await import('../src/data/parent');
    const { parentReady } = await import('../src/world/parent');
    const { CROSSWORD } = await import('../src/world/terminalPage');
    const { statusLines } = await import('../src/systems/status');
    for (const q of PARENT_QS) { expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(q.options.length); expect(q.nudge.length).toBeGreaterThan(10); }
    const g = newGame();
    expect(parentReady(g).ok).toBe(false);
    g.state.flags.cw_solved = CROSSWORD.map((c) => c.id).join(',');
    expect(parentReady(g).ok).toBe(false); // finale not seen yet
    g.state.flags.finale_seen = true;
    expect(parentReady(g).ok).toBe(true);
    g.state.flags.finale_ready = true;
    expect(statusLines(g).join('\n')).toContain('UNKNOWN (not yet found)');
    g.state.flags.act3_done = true;
    expect(statusLines(g).join('\n')).toContain('visitor_73 (you)');
  });
  it('every crossword answer is learnable from the world', async () => {
    const { CROSSWORD } = await import('../src/world/terminalPage');
    const { KNOWLEDGE } = await import('../src/data/knowledge');
    for (const c of CROSSWORD) expect(KNOWLEDGE[c.need]).toBeTruthy();
  });
});
