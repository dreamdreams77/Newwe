import type { Game } from '../core/game';
import { ZONES } from '../data/zones';
import { bindEcoState } from './conditions';

/** The world remembers: stocks deplete, regrow slowly, and report a state other systems read. */

export function ecoRule(zone: string, key: string) {
  return ZONES[zone]?.eco?.[key];
}

export function stockOf(g: Game, zone: string, key: string): number {
  const rule = ecoRule(zone, key);
  if (!rule) return 0;
  const z = g.zone(zone);
  if (z.stock[key] === undefined) z.stock[key] = rule.max;
  return z.stock[key];
}

export function ecoState(g: Game, zone: string, key: string): string {
  const rule = ecoRule(zone, key);
  if (!rule) return '';
  const n = stockOf(g, zone, key);
  for (const s of rule.states) if (n <= s.atMost) return s.name;
  return rule.states[rule.states.length - 1].name;
}
bindEcoState(ecoState);

/** take one; returns false if there is nothing left */
export function harvest(g: Game, zone: string, key: string): boolean {
  const n = stockOf(g, zone, key);
  if (n <= 0) return false;
  const z = g.zone(zone);
  const before = ecoState(g, zone, key);
  if (n >= (ecoRule(zone, key)?.max ?? 0)) z.lastRegrowAt = g.state.clock.minutes; // the clock starts when something is first taken
  z.stock[key] = n - 1;
  z.taken[key] = (z.taken[key] ?? 0) + 1;
  const after = ecoState(g, zone, key);
  if (after !== before) g.bus.emit('world');
  g.changed();
  return true;
}

export function replenish(g: Game, zone: string, key: string, by = 1): void {
  const rule = ecoRule(zone, key);
  if (!rule) return;
  const z = g.zone(zone);
  z.stock[key] = Math.min(rule.max, stockOf(g, zone, key) + by);
  g.changed();
}

/** slow regrowth, called as time passes */
export function tickEcology(g: Game): void {
  const now = g.state.clock.minutes;
  for (const [zid, data] of Object.entries(ZONES)) {
    if (!data.eco) continue;
    const z = g.zone(zid);
    for (const [key, rule] of Object.entries(data.eco)) {
      const stock = stockOf(g, zid, key);
      if (stock >= rule.max) {
        z.lastRegrowAt = now;
        continue;
      }
      const elapsed = now - (z.lastRegrowAt || now);
      const grown = Math.floor(elapsed / rule.regrowMinutes);
      if (grown > 0) {
        z.stock[key] = Math.min(rule.max, stock + grown);
        z.lastRegrowAt += grown * rule.regrowMinutes;
      }
    }
  }
}
