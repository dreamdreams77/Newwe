import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import type { StatId } from '../core/types';
import { AILMENTS, type AilmentDef } from '../data/ailments';
import { hasPerk } from './equipment';

/** derived from the world right now (not stored) */
function derived(g: Game): string[] {
  const { coffee, coffeeMax } = g.state.vitals;
  const out: string[] = [];
  if (coffee <= 0) out.push('crashed');
  if (coffee >= coffeeMax) out.push('jittery');
  return out;
}

export function activeAilmentIds(g: Game): string[] {
  const now = g.state.clock.minutes;
  const stored = g.state.ailments.filter((a) => a.until > now).map((a) => a.id);
  return [...new Set([...derived(g), ...stored])];
}
export const hasAilment = (g: Game, id: string) => activeAilmentIds(g).includes(id);
export const activeAilments = (g: Game): AilmentDef[] => activeAilmentIds(g).map((i) => AILMENTS[i]).filter(Boolean);

/** can this land at all? Gear and places make you immune to some. */
export function immune(g: Game, id: string): string | null {
  if (id === 'corrupted' && hasPerk(g, 'corrupt_immune')) return 'The goggles filter it out before it lands.';
  if (id === 'lost' && hasPerk(g, 'no_lost')) return 'The coat knows the way. You are not lost.';
  return null;
}

export function applyAilment(g: Game, id: string, minutes?: number, quiet = false): boolean {
  const def = AILMENTS[id];
  if (!def) return false;
  const why = immune(g, id);
  if (why) {
    if (!quiet) g.toast(`${def.label} bounced off. ${why}`, 'good');
    return false;
  }
  const until = g.state.clock.minutes + (minutes ?? def.minutes);
  const existing = g.state.ailments.find((a) => a.id === id);
  if (existing) existing.until = Math.max(existing.until, until);
  else g.state.ailments.push({ id, until });
  if (!g.state.seenFx.includes(`fx:${id}`)) g.state.seenFx.push(`fx:${id}`);
  if (!quiet) {
    g.toast(`${def.label}: ${def.text}`, def.good ? 'good' : 'bad');
    g.sfx(def.good ? 'success' : 'zap');
  }
  g.log(`Status: ${def.label}.`);
  g.changed();
  return true;
}

export function cureAilment(g: Game, id: string): void {
  g.state.ailments = g.state.ailments.filter((a) => a.id !== id);
  g.changed();
}

export function expireAilments(g: Game): void {
  const now = g.state.clock.minutes;
  const before = g.state.ailments.length;
  g.state.ailments = g.state.ailments.filter((a) => a.until > now);
  if (g.state.ailments.length !== before) g.changed();
}

export function ailmentMod(g: Game, stat: StatId): number {
  return activeAilmentIds(g).reduce((n, id) => n + (AILMENTS[id]?.mods?.[stat] ?? 0), 0);
}

/** how long actions take, from statuses and from coffee */
export function timeMult(g: Game): number {
  let m = 1;
  for (const id of activeAilmentIds(g)) m *= AILMENTS[id]?.time ?? 1;
  const { coffee, coffeeMax } = g.state.vitals;
  const wired = coffee / coffeeMax >= BALANCE.coffee.wiredAbove && coffee < coffeeMax;
  if (wired) m *= BALANCE.coffee.wiredTimeMult;
  return m;
}

/** the first time the mug runs dry, something kind happens (and a little time is lost) */
export function watchCoffee(g: Game, passTime: (g: Game, m: number, o: { raw: boolean }) => number): void {
  const s = g.state;
  const crashed = s.vitals.coffee <= 0;
  if (crashed && !s.flags.crash_active) {
    s.flags.crash_active = true;
    s.flags.crashes = ((s.flags.crashes as number) || 0) + 1;
    if (!s.seenFx.includes('fx:crashed')) s.seenFx.push('fx:crashed');
    g.toast('CRASHED. Your head finds the keyboard. When you come to, twenty minutes have gone and somebody has left a warm mug by your elbow. (+1 Coffee)', 'bad');
    g.sfx('error');
    s.vitals.coffee = 1;
    s.flags.crash_active = false;
    passTime(g, 20, { raw: true });
  } else if (!crashed) s.flags.crash_active = false;
  if (s.vitals.coffee >= s.vitals.coffeeMax && !s.seenFx.includes('fx:jittery')) {
    s.seenFx.push('fx:jittery');
    g.toast('JITTERY: ' + AILMENTS.jittery.text, 'funny');
  }
}
