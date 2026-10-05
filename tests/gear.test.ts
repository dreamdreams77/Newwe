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
      expect(['head', 'body', 'hands', 'accessory', 'tool', 'badge']).toContain(i.equip.slot);
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
