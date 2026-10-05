import { Game, createInitialState } from '../src/core/game';
import { installProgression, evaluate } from '../src/core/progression';

/** a game with progression wired, flushed synchronously for tests */
export function newGame(seed = 1234): Game {
  const g = new Game(createInitialState(seed));
  installProgression(g);
  evaluate(g);
  return g;
}

export async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
