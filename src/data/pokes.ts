import type { Effect } from '../core/types';

// "What if I click this?" Most things in the website answer, and the answer changes.
// A few of them, eventually, pay off.

export interface PokeDef {
  lines: string[];
  payoff?: { at: number; text: string; effects: Effect[] };
}

export const POKES: Record<string, PokeDef> = {
  chair: {
    lines: ['Chair.', 'Still a chair.', 'You have inspected this chair three times.', 'The chair is beginning to feel self-conscious.', 'The chair adjusts itself, to look more like a chair.', 'The chair says, quietly, "please."'],
    payoff: { at: 7, text: 'The chair swivels on its own. Under the seat, taped there since 2003: a floppy disk labelled TEST.', effects: [{ t: 'item', id: 'floppy' }] },
  },
  cone: {
    lines: ['A traffic cone.', 'A traffic cone, but you looked twice.', 'It is load-bearing. Probably.', 'It has been here since 2001. It has never moved. It has opinions.'],
    payoff: { at: 5, text: 'The cone tips over. Under it, a note in a hurry: "the back door only cares about ONE of the two. never both. XOR!!"', effects: [{ t: 'know', id: 'dev_xor' }] },
  },
  sand: {
    lines: ['There is sand. There are many individual grains of it.', 'Still sand.', 'You dig a little. The sand fills it in. The sand is better at this than you.', 'You are now, technically, excavating.'],
    payoff: { at: 8, text: 'Your hand closes on something small and brass. A broken token, half-buried, like the sand was keeping it for you.', effects: [{ t: 'item', id: 'token_broken' }] },
  },
  gull: {
    lines: ['A gull looks at you. It has seen things.', 'The gull looks at you again. It has seen you seeing things.', 'The gull is not impressed.', 'The gull is composing a complaint.'],
    payoff: { at: 5, text: 'The gull drops something very clean and tiny at your feet: a visitor tag. It does not look sorry. +11 visitors.', effects: [{ t: 'hits', by: 11, why: 'a gull delivered a visitor' }] },
  },
  tower: {
    lines: ['A tall white tower, with stripes put on very carefully by somebody who cared about stripes.', 'The tower is, at this moment, vertical.', 'You tap the tower. The tower is a tower.', 'You find one loose brick, then think better of it.'],
    payoff: { at: 6, text: 'The brick comes out. Behind it, a scrap of paper: "debug view: about:inspector (don’t tell the visitors)".', effects: [{ t: 'know', id: 'inspector_url' }] },
  },
  www: {
    lines: ['A scaffold in the shape of the thing you are inside.', 'It is almost finished. It has been almost finished since 2001.', 'You count the girders. There are 11. There are always 11.'],
  },
  sign: {
    lines: ['"UNDER CONSTRUCTION. Please pardon our dust." (The dust has been pardoned. It is still there.)', 'The sign has been saying this for twenty years. It is very committed.', 'The sign, if it could, would also like to be pardoned.'],
  },
  sea: {
    lines: ['The sea does what the sea does.', 'The sea continues to do what the sea does.', 'You could swear it looked at you, then at the horizon, as if checking something.'],
  },
};
