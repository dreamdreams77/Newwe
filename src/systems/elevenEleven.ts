import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { realElevenKey } from '../core/timeSystem';

export function charges(g: Game): number {
  return g.state.eleven.charges;
}

/** Gain a charge. `key` makes each source one-shot (coincidences don't farm). */
export function gainEleven(g: Game, why: string, key?: string, text?: string): boolean {
  const e = g.state.eleven;
  if (key) {
    if (e.seen.includes(key)) return false;
    e.seen.push(key);
  }
  if (e.charges >= e.max) {
    g.toast('11:11 is overflowing. Spend some before it spills.', 'magic');
    g.changed();
    return false;
  }
  e.charges += 1;
  e.gained += 1;
  if (key?.startsWith('real:')) g.state.flags.real_eleven_seen = true;
  g.reveal('eleven');
  g.toast(text ?? `11:11 — ${why}`, 'magic');
  g.sfx('eleven');
  g.bus.emit('eleven', { why });
  g.log(`11:11 gained (${why}).`);
  g.changed();
  return true;
}

export function spendEleven(g: Game, why: string): boolean {
  const e = g.state.eleven;
  if (e.charges <= 0) return false;
  e.charges -= 1;
  e.spent += 1;
  g.sfx('wish');
  g.log(`Spent 11:11: ${why}.`);
  g.changed();
  return true;
}

/** Called on load and on a timer: the real clock hitting 11:11 is a gift. */
export function checkRealEleven(g: Game, now = new Date()): boolean {
  const key = realElevenKey(now);
  if (!key) return false;
  return gainEleven(g, 'the real clock agrees', key, '11:11 — the real clock just agreed with the game. That never happens.');
}

/** Coincidences: counter values and dice that line up. */
export function checkCounterCoincidence(g: Game): void {
  const v = g.state.visitors;
  if (v === 111 || v === 1111) {
    gainEleven(g, `the counter read ${v}`, `counter:${v}`, `11:11 — the counter reads ${String(v).padStart(6, '0')}. A row of ones. Somebody noticed.`);
  }
}

export const ELEVEN_MAX = BALANCE.eleven.maxCharges;
