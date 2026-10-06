import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { Random } from '../core/random';
import { coffeeState, minuteOfDay } from '../core/timeSystem';
import { ELEVEN_AM, ELEVEN_PM } from '../config/balance';
import { applyAilment } from './ailments';
import { passTime } from './actions';
import type { Cond, StatId } from '../core/types';
import { STAT_BY_ID } from '../data/statDefs';
import { test } from './conditions';
import { gainEleven, spendEleven } from './elevenEleven';
import { changeVital, statValue } from './stats';
import { addBuff } from '../core/timeSystem';

const MIND: StatId[] = ['curiosity', 'observation', 'memory', 'puzzleSense', 'bossKnowledge'];

export interface Approach {
  id: string;
  label: string;
  stat: StatId;
  dcMod?: number;
  /** extra requirement beyond the stat, shown in the UI when locked */
  needs?: { cond: Cond; why: string };
  /** careful approaches are disabled when you are jittery (0 coffee) */
  careful?: boolean;
  /** stat minimum to even attempt this (Creativity paths) */
  minStat?: number;
  text?: string;
}

export interface CheckDef {
  id: string;
  title: string;
  stat: StatId;
  dc: number;
  text?: string;
  approaches?: Approach[];
  /** show the Golden Dice toggle */
  golden?: boolean;
}

export interface DieRoll {
  value: number;
  kind: 'normal' | 'wild' | 'golden';
  rerolled?: boolean;
  from?: number;
}

export interface RollMods {
  amount: number;
  dice: number;
  rerollLowest: number;
  golden: boolean;
  notes: string[];
}

export function emptyMods(): RollMods {
  return { amount: 0, dice: 0, rerollLowest: 0, golden: false, notes: [] };
}

export interface Prepared {
  def: CheckDef;
  approach: Approach;
  stat: StatId;
  statValue: number;
  dc: number;
  poolDice: number;
  wildP: number;
  luckRerolls: number;
  fumbleMargin: number;
  mods: RollMods;
}

export type Outcome = 'critFail' | 'fail' | 'success' | 'crit';

export interface RollResult {
  dice: DieRoll[];
  total: number;
  dc: number;
  margin: number;
  outcome: Outcome;
  snakeEyes: boolean;
  goldenFumble: boolean;
  wished: boolean;
  parts: { stat: number; dice: number; mods: number };
}

export const isSuccess = (o: Outcome) => o === 'success' || o === 'crit';

export function defaultApproach(def: CheckDef): Approach {
  return { id: 'direct', label: 'Just do it', stat: def.stat };
}

export function approachStatus(g: Game, a: Approach): { ok: boolean; reason?: string } {
  if (a.careful && coffeeState(g) === 'empty') return { ok: false, reason: 'Too jittery for careful work. Coffee?' };
  if (a.minStat !== undefined && statValue(g, a.stat) < a.minStat)
    return { ok: false, reason: `Needs ${STAT_BY_ID[a.stat].label} ${a.minStat}` };
  if (a.needs && !test(g, a.needs.cond)) return { ok: false, reason: a.needs.why };
  return { ok: true };
}

export function approachesOf(def: CheckDef): Approach[] {
  return def.approaches && def.approaches.length ? def.approaches : [defaultApproach(def)];
}

export function prepareCheck(g: Game, def: CheckDef, approach: Approach, mods: RollMods): Prepared {
  const d = BALANCE.dice;
  const stat = approach.stat;
  const coffee = coffeeState(g);
  const wiredBonus = coffee === 'wired' && MIND.includes(stat) ? BALANCE.coffee.wiredDice : 0;
  const chaos = statValue(g, 'chaos');
  const luck = statValue(g, 'luck');
  return {
    def,
    approach,
    stat,
    statValue: statValue(g, stat),
    dc: def.dc + (approach.dcMod ?? 0),
    poolDice: d.baseDice + wiredBonus + mods.dice,
    wildP: Math.min(d.chaosWildMax, chaos * d.chaosWildPerPoint),
    luckRerolls: luck > 0 ? Math.ceil(luck / d.luckPerReroll) : 0,
    fumbleMargin: d.fumbleMargin - (coffee === 'empty' ? BALANCE.coffee.emptyFumbleMargin : 0),
    mods,
  };
}

function rollExplode(rng: Random, depth: number): number {
  const v = rng.die(6);
  if (v === 6 && depth < 3) return 6 + rollExplode(rng, depth + 1);
  return v;
}

/** The core roll. Deterministic for a given rng state. */
export function roll(g: Game, prep: Prepared, opts: { wish?: boolean } = {}): RollResult {
  const rng = g.rng;
  const d = BALANCE.dice;
  const dice: DieRoll[] = [];
  for (let i = 0; i < prep.poolDice; i++) {
    if (rng.chance(prep.wildP)) {
      const raw = rng.die(d.wildSides);
      dice.push({ value: raw - d.wildOffset, kind: 'wild' });
    } else dice.push({ value: rng.die(d.sides), kind: 'normal' });
  }
  const snakeEyes = dice.length === 2 && dice.every((x) => x.kind === 'normal' && x.value === 1);

  // Luck: raise the floor by re-rolling the lowest normal die, if it is unlucky
  for (let r = 0; r < prep.luckRerolls; r++) {
    const normal = dice.filter((x) => x.kind === 'normal');
    if (!normal.length) break;
    const low = normal.reduce((a, b) => (b.value < a.value ? b : a));
    if (low.value > d.luckKeepBelow) break;
    const nv = rng.die(d.sides);
    if (nv > low.value) {
      low.from = low.value;
      low.value = nv;
      low.rerolled = true;
    }
  }
  // Card: re-roll the lowest die once, unconditionally (you may regret it)
  for (let r = 0; r < prep.mods.rerollLowest; r++) {
    const low = dice.filter((x) => x.kind !== 'golden').reduce((a, b) => (b.value < a.value ? b : a), dice[0]);
    if (low) {
      low.from = low.value;
      low.value = low.kind === 'wild' ? rng.die(d.wildSides) - d.wildOffset : rng.die(d.sides);
      low.rerolled = true;
    }
  }
  let goldenFumble = false;
  if (prep.mods.golden) {
    const raw = rng.die(6);
    if (raw === 1) goldenFumble = true;
    const value = raw === d.goldenExplodeOn ? 6 + rollExplode(rng, 0) : raw;
    dice.push({ value, kind: 'golden' });
  }
  const diceTotal = dice.reduce((n, x) => n + x.value, 0);
  const bonus = prep.mods.amount + (opts.wish ? d.wishBonus : 0);
  const total = prep.statValue + diceTotal + bonus;
  const margin = total - prep.dc;
  const normals = dice.filter((x) => x.kind === 'normal');
  const allSixes = normals.length >= 2 && normals.every((x) => x.value === d.sides);
  let outcome: Outcome;
  if (snakeEyes || margin <= -prep.fumbleMargin) outcome = 'critFail';
  else if (margin >= d.critMargin || allSixes) outcome = 'crit';
  else if (margin >= 0) outcome = 'success';
  else outcome = 'fail';
  if (outcome === 'critFail' && opts.wish && !snakeEyes && margin > -prep.fumbleMargin) outcome = 'fail';
  return { dice, total, dc: prep.dc, margin, outcome, snakeEyes, goldenFumble, wished: !!opts.wish, parts: { stat: prep.statValue, dice: diceTotal, mods: bonus } };
}

/** Pay the cost of attempting a check and apply side effects of the result. */
export function commitRoll(g: Game, res: RollResult, firstRoll = true): void {
  const s = g.state;
  if (firstRoll) {
    s.counters.checks++;
    changeVital(g, 'coffee', -1);
    passTime(g, BALANCE.time.cost.check);
  }
  if (res.outcome === 'crit') s.counters.crits++;
  if (res.outcome === 'critFail') s.counters.fumbles++;
  if (res.dice.some((d) => d.kind === 'golden')) {
    const m = minuteOfDay(s.clock.minutes);
    if ((m >= ELEVEN_AM && m <= ELEVEN_AM + 15) || (m >= ELEVEN_PM && m <= ELEVEN_PM + 15)) {
      g.toast('The Golden Dice warned you: do not roll after 11:11. (v2.0)', 'bad');
      applyAilment(g, 'outofsync');
    }
  }
  if (res.goldenFumble) {
    s.flags.golden_fumbled = true;
    changeVital(g, 'coffee', -1);
    addBuff(g, 'chaos', BALANCE.dice.goldenFumbleChaos, BALANCE.dice.goldenFumbleMinutes, 'Gilded Fumble');
    g.toast('The Golden Dice bites back: -1 Coffee, Chaos up for a while.', 'bad');
  }
  if (res.snakeEyes) g.state.flags.snake_eyes_seen = true;
  if (res.snakeEyes) gainEleven(g, 'snake eyes', undefined, '11:11 — two ones. Even disasters are wishes.');
  g.sfx(res.outcome === 'crit' ? 'crit' : res.outcome === 'critFail' ? 'fumble' : isSuccess(res.outcome) ? 'success' : 'fail');
  g.changed();
}

/** 11:11 turns a failed roll into a fresh one with a wish bonus. Never on success. */
export function wishReroll(g: Game, prep: Prepared, prev: RollResult): RollResult | null {
  if (isSuccess(prev.outcome)) return null;
  if (!spendEleven(g, `rerolled "${prep.def.title}"`)) return null;
  const res = roll(g, prep, { wish: true });
  commitRoll(g, res, false);
  return res;
}

/** Fuzzy odds so the player can learn the system without a calculator. */
export function oddsLabel(prep: Prepared): { label: string; pct: number } {
  const r = new Random(0xc0ffee ^ prep.dc ^ (prep.statValue << 4));
  const d = BALANCE.dice;
  let wins = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    let sum = 0;
    const dice: number[] = [];
    for (let k = 0; k < prep.poolDice; k++) {
      const v = r.chance(prep.wildP) ? r.die(d.wildSides) - d.wildOffset : r.die(d.sides);
      dice.push(v);
    }
    for (let l = 0; l < prep.luckRerolls; l++) {
      const mi = dice.indexOf(Math.min(...dice));
      if (dice[mi] <= d.luckKeepBelow) dice[mi] = Math.max(dice[mi], r.die(d.sides));
    }
    sum = dice.reduce((a, b) => a + b, 0);
    if (prep.mods.golden) sum += r.die(6);
    if (prep.statValue + sum + prep.mods.amount >= prep.dc) wins++;
  }
  const pct = wins / N;
  const label = pct > 0.9 ? 'Almost certain' : pct > 0.7 ? 'Likely' : pct > 0.45 ? 'A coin-flip' : pct > 0.2 ? 'Risky' : 'Long shot';
  return { label, pct };
}
