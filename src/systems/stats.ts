import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { coffeeState } from '../core/timeSystem';
import type { StatId } from '../core/types';

/** The effective value of a stat right now: base + buffs + situational. */
export function statValue(g: Game, id: StatId): number {
  const s = g.state;
  let v = s.stats[id] ?? 0;
  if (id === 'bossKnowledge') v += s.knowledge.length;
  for (const b of s.buffs) if (b.stat === id) v += b.by;
  if (id === 'chaos' && coffeeState(g) === 'empty') v += BALANCE.coffee.emptyChaos;
  return Math.max(0, v);
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

/** Is the player jittery (coffee 0)? Careful actions get disabled. */
export function isJittery(g: Game): boolean {
  return coffeeState(g) === 'empty';
}

export function carryCapacity(g: Game): number {
  return BALANCE.encumbrance.base + Math.floor(statValue(g, 'dadEnergy') * BALANCE.encumbrance.perDadEnergy);
}
