import { BALANCE, ELEVEN_AM, ELEVEN_PM, MIN_PER_DAY } from '../config/balance';
import type { Game } from './game';
import type { StatId } from './types';

export type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk';

export function dayNumber(minutes: number): number {
  return Math.floor(minutes / MIN_PER_DAY) + 1;
}
export function minuteOfDay(minutes: number): number {
  return ((minutes % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
}
export function formatClock(minutes: number): string {
  const m = minuteOfDay(minutes);
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}
export function timeOfDay(minutes: number): TimeOfDay {
  const h = minuteOfDay(minutes) / 60;
  if (h < 5 || h >= 21) return 'night';
  if (h < 8) return 'dawn';
  if (h < 18) return 'day';
  return 'dusk';
}
/** distance in minutes from the nearest 11:11 (am or pm) */
export function distanceToEleven(minutes: number): number {
  const m = minuteOfDay(minutes);
  return Math.min(Math.abs(m - ELEVEN_AM), Math.abs(m - ELEVEN_PM));
}
export function inWindow(minutes: number, centre: number, radius: number): boolean {
  const m = minuteOfDay(minutes);
  const d = Math.abs(m - centre);
  return Math.min(d, MIN_PER_DAY - d) <= radius;
}
/** inside any of the day's two 11:11s, within radius minutes */
export function nearEleven(minutes: number, radius = 10): boolean {
  return inWindow(minutes, ELEVEN_AM, radius) || inWindow(minutes, ELEVEN_PM, radius);
}

export type CoffeeState = 'wired' | 'ok' | 'low' | 'empty';
export function coffeeState(g: Game): CoffeeState {
  const { coffee, coffeeMax } = g.state.vitals;
  if (coffee <= 0) return 'empty';
  if (coffee / coffeeMax >= BALANCE.coffee.wiredAbove) return 'wired';
  if (coffee / coffeeMax < BALANCE.coffee.lowBelow) return 'low';
  return 'ok';
}

/**
 * Advance the in-game clock. Handles passive coffee drain, buff expiry,
 * 11:11 crossings and HP regen. Returns the number of minutes actually spent.
 */
export function advance(g: Game, minutes: number, _opts: { raw?: boolean } = {}): number {
  let spend = Math.max(0, Math.round(minutes));
  if (spend === 0) return 0;
  const s = g.state;
  const before = s.clock.minutes;
  const after = before + spend;
  s.clock.minutes = after;

  // passive coffee drain
  const drainEvery = BALANCE.coffee.passiveDrainMinutes * (g.state.equipment.body === 'keepers_coat' && g.state.inventory.keepers_coat ? 1.5 : 1);
  const drained = Math.floor(after / drainEvery) - Math.floor(before / drainEvery);
  if (drained > 0 && s.vitals.coffee > 0) {
    s.vitals.coffee = Math.max(0, s.vitals.coffee - drained);
    if (s.vitals.coffee === 0) g.toast('Your mug is empty. Things are about to get weird.', 'funny');
    else if (s.vitals.coffee <= 2) g.toast('Coffee is running low…', 'info');
  }
  s.buffs = s.buffs.filter((b) => b.until > after);

  // 11:11 crossings (either the morning or the evening one)
  for (const target of [ELEVEN_AM, ELEVEN_PM]) {
    const firstDay = Math.floor(before / MIN_PER_DAY);
    const lastDay = Math.floor(after / MIN_PER_DAY);
    for (let d = firstDay; d <= lastDay; d++) {
      const t = d * MIN_PER_DAY + target;
      if (before < t && after >= t) g.bus.emit('elevenTime', { key: `clock:${d}:${target}` });
    }
  }
  g.changed();
  return spend;
}

export function addBuff(g: Game, stat: StatId, by: number, minutes: number, label: string): void {
  g.state.buffs.push({ stat, by, until: g.state.clock.minutes + minutes, label });
  g.changed();
}

/** "real world" 11:11 — the universe noticing you */
export function realElevenKey(d = new Date()): string | null {
  const h = d.getHours();
  const m = d.getMinutes();
  if (m !== 11 || (h !== 11 && h !== 23)) return null;
  return `real:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:${h}`;
}
