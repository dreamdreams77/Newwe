import type { Game } from '../core/game';
import { ZONES } from '../data/zones';
import { test } from './conditions';

/** The next unfinished hint for a zone (used by Memory/Secret cards and Puzzle Sense). */
export function nextHint(g: Game, zone: string): string | null {
  const z = ZONES[zone];
  if (!z) return null;
  for (const h of z.hint) {
    if (h.when && !test(g, h.when)) continue;
    if (h.done && test(g, h.done)) continue;
    return h.text;
  }
  return null;
}
