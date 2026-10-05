import type { Game } from '../core/game';
import { minuteOfDay } from '../core/timeSystem';
import type { Cond } from '../core/types';
import { qty } from './inventory';
import { statValue } from './stats';

/** Evaluate a declarative condition against the game. */
export function test(g: Game, c: Cond | undefined): boolean {
  if (!c) return true;
  const s = g.state;
  if ('has' in c) return qty(g, c.has) >= (c.qty ?? 1);
  if ('flag' in c) {
    const v = s.flags[c.flag];
    if (c.is === undefined) return v !== undefined && v !== false && v !== 0 && v !== '';
    return v === c.is;
  }
  if ('notFlag' in c) return !g.has(c.notFlag);
  if ('stat' in c) return statValue(g, c.stat) >= c.gte;
  if ('stage' in c) return s.stage >= c.stage;
  if ('visitors' in c) return s.visitors >= c.visitors;
  if ('know' in c) return s.knowledge.includes(c.know);
  if ('memory' in c) return s.memories.includes(c.memory);
  if ('card' in c) return s.cards.earned.includes(c.card);
  if ('zoneState' in c) return (s.zones[c.zoneState.zone]?.stock && ecoState(g, c.zoneState.zone, c.zoneState.key)) === c.zoneState.is;
  if ('time' in c) {
    const m = minuteOfDay(s.clock.minutes);
    const { from, to } = c.time;
    return from <= to ? m >= from && m < to : m >= from || m < to;
  }
  if ('creature' in c) return (s.creatures[c.creature.id]?.[c.creature.field] ?? 0) >= c.creature.gte;
  if ('not' in c) return !test(g, c.not);
  if ('any' in c) return c.any.some((x) => test(g, x));
  if ('all' in c) return c.all.every((x) => test(g, x));
  return false;
}

// Late-bound to avoid a cycle with ecosystem.ts (which reads data only).
let ecoFn: (g: Game, zone: string, key: string) => string = () => '';
export function bindEcoState(fn: (g: Game, zone: string, key: string) => string): void {
  ecoFn = fn;
}
function ecoState(g: Game, zone: string, key: string): string {
  return ecoFn(g, zone, key);
}
