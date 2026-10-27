import type { Game } from '../core/game';
import { seeded } from '../core/random';

// The Broken Homepage's puzzles. All derived from the world seed so they are fair, repeatable per
// attempt and testable, with no puzzle text living in the UI.

export const CIPHER_SHIFT = 11;
export const CIPHER_WORDS = ['HOMEPAGE', 'GUESTBOOK', 'WEBMASTER', 'HIT COUNTER'];

const rngFor = (g: Game, salt: number, attempts: number) => seeded((g.state.seed ^ salt ^ (attempts * 0x9e37)) >>> 0);

/** a left-right symmetrical set of cells on a 3x3 grid (the middle column is free) */
export function bannerPattern(g: Game, attempts: number): number[] {
  const rng = rngFor(g, 0xba44, attempts);
  const cells = new Set<number>();
  for (let row = 0; row < 3; row++) {
    if (rng.int(0, 2) === 0) { cells.add(row * 3); cells.add(row * 3 + 2); }
    if (rng.int(0, 3) === 0) cells.add(row * 3 + 1);
  }
  if (cells.size < 3) { cells.add(0); cells.add(2); cells.add(4); }
  return [...cells].sort((a, b) => a - b);
}

export interface Forgery {
  counter: number;
  entries: Array<{ n: number; name: string; text: string }>;
  forged: number;
}

const HONEST = [
  ['SurfinSteve', 'cool site!! the dancing hamster one is better lol'],
  ['xX_Jess_Xx', 'ur page made my dial-up cry. 5 stars'],
  ['guest', 'who is W?? ur link page has a dead end'],
  ['Mr. Biscuit', 'i came for the midi. stayed for the midi.'],
  ['~*~luna~*~', 'sign mine back!!! (i dont have one yet)'],
  ['DadJokes4Life', 'why did the web dev leave? table layout. ur welcome.'],
];

export function guestbookForgery(g: Game, attempts: number): Forgery {
  const rng = rngFor(g, 0x6b00, attempts);
  const counter = 100 + rng.int(0, 60);
  const order = rng.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 5);
  const forged = rng.int(0, 4);
  const entries = order.map((i, idx) => {
    const [name, text] = HONEST[i];
    return idx === forged
      ? { n: counter + rng.int(40, 900), name: 'the_page', text: 'hello. i am the visitor you have not met yet. do not look behind the counter.' }
      : { n: Math.max(1, counter - (idx + 1) * rng.int(4, 18)), name, text };
  });
  return { counter, entries, forged };
}

export function shiftWord(word: string, by = CIPHER_SHIFT): string {
  return word.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + by) % 26) + 65));
}

export function cipherWord(g: Game, attempts: number): string {
  return CIPHER_WORDS[rngFor(g, 0xc1f0, attempts).int(0, CIPHER_WORDS.length - 1)];
}

export function keySequence(g: Game, attempts: number, len = 5): number[] {
  const rng = rngFor(g, 0x5e90, attempts);
  const seq: number[] = [];
  for (let i = 0; i < len; i++) seq.push(rng.int(0, 3));
  return seq;
}

export const KEY_NAMES = ['Red', 'Green', 'Blue', 'Yellow'];
