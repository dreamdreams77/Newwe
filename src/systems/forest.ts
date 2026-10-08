import type { Game } from '../core/game';
import { seeded } from '../core/random';
import { timeOfDay } from '../core/timeSystem';
import { applyAilment } from './ailments';
import { passTime } from './actions';
import { statValue } from './stats';

// The Whispering Woods trail: three forks, each a fair coin from the world seed. The foxfire shows the
// right way, but only after dark. Sharp eyes (Observation) can read the moss in daylight, one fork
// at a time. Guess wrong and you are LOST, back at the start, with a timer.

export type Dir = 'L' | 'R';
export const FORKS = 3;

export function forkDirs(g: Game): Dir[] {
  const rng = seeded((g.state.seed ^ 0xf04e57) >>> 0);
  return Array.from({ length: FORKS }, () => (rng.chance(0.5) ? 'L' : 'R'));
}

export const trailStep = (g: Game): number => (typeof g.state.flags.trail_step === 'number' ? g.state.flags.trail_step : 0);

export const foxfireOut = (g: Game): boolean => {
  const t = timeOfDay(g.state.clock.minutes);
  return t === 'dusk' || t === 'night';
};

const word = (d: Dir) => (d === 'L' ? 'LEFT' : 'RIGHT');

/** what you can tell about the fork you are standing at right now */
export function forkHint(g: Game, step = trailStep(g)): { text: string; reliable: boolean } {
  const right = forkDirs(g)[step];
  if (foxfireOut(g)) return { text: `The foxfire drifts ${word(right)}, slow and sure.`, reliable: true };
  if (statValue(g, 'observation') >= 5 + step * 2) return { text: `The moss is rubbed thin on the ${word(right)} path. Something has been walking that way.`, reliable: true };
  return { text: 'In daylight the sign says only: THIS WAY (with an arrow, drawn in a shaky hand, pointing at the sign).', reliable: false };
}

export interface WalkResult {
  ok: boolean;
  done: boolean;
  text: string;
}

export function walk(g: Game, dir: Dir): WalkResult {
  const step = trailStep(g);
  const right = forkDirs(g)[step];
  if (dir === right) {
    g.state.flags.trail_step = step + 1;
    passTime(g, 6);
    if (step + 1 >= FORKS) {
      g.state.flags.oak_found = true;
      g.sfx('puzzle');
      g.changed();
      return { ok: true, done: true, text: 'The trees step back. A clearing, and in it, enormous and patient, the Old Oak. Somewhere behind you, the path closes up politely.' };
    }
    g.sfx('step');
    g.changed();
    return { ok: true, done: false, text: `${word(dir)}. The path narrows, then opens. A second fork waits, looking pleased with itself.`.replace('a second', step === 0 ? 'a second' : 'a third') };
  }
  g.state.flags.trail_step = 0;
  passTime(g, 15);
  const lost = applyAilment(g, 'lost', 60);
  g.changed();
  return { ok: false, done: false, text: `${word(dir)}. The path goes round and round and delivers you, gently, back at the first fork. ${lost ? 'You are LOST.' : 'The woods know you too well to let you get lost, but it still cost you a quarter hour.'}` };
}

/** the stump by the lantern: sit until the foxfire wakes. Costs the time it takes (and the coffee that goes with it). */
export function minutesToDusk(g: Game): number {
  const m = g.state.clock.minutes % 1440;
  if (foxfireOut(g)) return 0;
  return Math.max(0, 18 * 60 - m);
}

export function waitForDusk(g: Game): number {
  const n = minutesToDusk(g);
  if (n > 0) passTime(g, n, { raw: true });
  return n;
}
