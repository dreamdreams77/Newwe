import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { ailmentMod, hasAilment } from './ailments';
import { equipMod } from './equipment';
import type { StatId } from '../core/types';

/** The effective value of a stat right now: base + buffs + situational. */
export function statValue(g: Game, id: StatId): number {
  const s = g.state;
  let v = s.stats[id] ?? 0;
  if (id === 'bossKnowledge') v += s.knowledge.length;
  if (hasAilment(g, 'overwritten') && id !== 'bossKnowledge' && isStrongest(g, id)) v = BALANCE.stats.start[id];
  for (const b of s.buffs) if (b.stat === id) v += b.by;
  v += ailmentMod(g, id) + equipMod(g, id);
  return Math.max(0, v);
}

/** OVERWRITTEN swaps your single strongest stat back to what it started as */
function isStrongest(g: Game, id: StatId): boolean {
  const entries = (Object.entries(g.state.stats) as Array<[StatId, number]>).filter(([k]) => k !== 'bossKnowledge');
  const top = Math.max(...entries.map(([, v]) => v));
  return entries.find(([, v]) => v === top)?.[0] === id;
}

export function baseStat(g: Game, id: StatId): number {
  return g.state.stats[id] ?? 0;
}

export function raiseStat(g: Game, id: StatId, by: number): number {
  const s = g.state;
  const next = Math.max(0, Math.min(BALANCE.stats.cap, (s.stats[id] ?? 0) + by));
  const real = next - (s.stats[id] ?? 0);
  s.stats[id] = next;
  g.changed();
  return real;
}

export function changeVital(g: Game, v: 'hp' | 'coffee', by: number): number {
  const vit = g.state.vitals;
  const max = v === 'hp' ? vit.hpMax : vit.coffeeMax;
  const before = vit[v];
  vit[v] = Math.max(0, Math.min(max, before + by));
  g.changed();
  return vit[v] - before;
}

/** Crashed (coffee 0): careful actions are disabled. */
export function isCrashed(g: Game): boolean {
  return g.state.vitals.coffee <= 0;
}

export function carryCapacity(g: Game): number {
  return BALANCE.encumbrance.base + Math.floor(statValue(g, 'dadEnergy') * BALANCE.encumbrance.perDadEnergy);
}
