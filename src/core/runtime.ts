import type { Game } from './game';

// The one live Game instance. UI and world modules read it from here so they do
// not need it threaded through every call. Systems still take `g` explicitly.
let current: Game | null = null;

export function setGame(g: Game): void {
  current = g;
}
export function game(): Game {
  if (!current) throw new Error('Game not initialised');
  return current;
}
