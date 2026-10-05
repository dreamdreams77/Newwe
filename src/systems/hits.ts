import { BALANCE } from '../config/balance';
import type { Game } from '../core/game';
import { checkCounterCoincidence } from './elevenEleven';

/** The hit counter is a real progression system, not a number on a page. */
export function addVisitors(g: Game, n: number, why?: string): void {
  if (n <= 0) return;
  const s = g.state;
  const before = s.visitors;
  s.visitors += n;
  g.sfx('tick');
  if (why) g.log(`+${n} visitors (${why}).`);
  for (const t of BALANCE.hits.thresholds) {
    if (before < t && s.visitors >= t) {
      s.flags[`hits_${t}`] = true;
      g.bus.emit('threshold', { at: t });
    }
  }
  checkCounterCoincidence(g); // only an exact landing on a ones-row counts
  g.changed();
}

/** a small bump for returning to the homepage, with a cooldown so it can't be farmed */
export function homeReturnBump(g: Game): void {
  const s = g.state;
  if (s.clock.minutes - s.clock.lastReturnHit >= BALANCE.hits.returnCooldownMinutes) {
    s.clock.lastReturnHit = s.clock.minutes;
    addVisitors(g, BALANCE.hits.returnHome, 'came back');
  }
}

export function counterDigits(v: number, width = 6): string {
  return String(v).padStart(width, '0');
}
