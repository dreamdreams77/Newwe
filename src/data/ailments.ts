import type { StatId } from '../core/types';

// Classic RPG status effects, reinterpreted for a website. Each one changes what you can
// DO or SEE, not just a number. Several are derived from the world (coffee), the rest are applied
// by things that happen to you and expire on the in-game clock.

export interface AilmentDef {
  id: string;
  label: string;
  icon: string;
  text: string;
  /** how it feels, shown in the Handbook once you have had it */
  detail: string;
  minutes: number;
  mods?: Partial<Record<StatId, number>>;
  /** multiplies the minutes every action takes (<1 faster, >1 slower) */
  time?: number;
  css?: string;
  good?: boolean;
  /** the Handbook line about how to get rid of it */
  cure: string;
}

export const AILMENTS: Record<string, AilmentDef> = {
  jittery: {
    id: 'jittery', label: 'JITTERY', icon: 'spiral', minutes: 90,
    text: 'Too much coffee. Faster, chaotic, and your hand has opinions.',
    detail: 'Chaos up. Everything takes less time. Now and then your hand jerks and you click the wrong thing.',
    mods: { chaos: 2 }, time: 0.75, css: 'st-jittery', cure: 'Time, or drinking less. (You cannot out-coffee it.)',
  },
  crashed: {
    id: 'crashed', label: 'CRASHED', icon: 'frown', minutes: 0,
    text: 'The mug is empty and so are you.',
    detail: 'Puzzle Sense drops. Everything takes longer. Careful options are unavailable. The first time it hits you lose a little time, and something kind happens.',
    mods: { puzzleSense: -2 }, time: 1.25, css: 'st-crashed', cure: 'Coffee. Of any kind. The Good Coffee, very much.',
  },
  corrupted: {
    id: 'corrupted', label: 'CORRUPTED', icon: 'ghost', minutes: 90,
    text: 'Some of the page is not where it should be, and neither are some of your thoughts.',
    detail: 'The Inspector misreads a line. Some labels glitch. A pair of CRT goggles sees through it, and makes you immune.',
    css: 'st-corrupted', cure: 'Time. Or CRT Monitor Goggles, which stop it landing at all.',
  },
  inspired: {
    id: 'inspired', label: 'INSPIRED', icon: 'bulb', minutes: 180, good: true,
    text: 'A good idea is hovering near you. Do not look straight at it.',
    detail: 'Creativity up. Alternate approaches open that were closed.',
    mods: { creativity: 2 }, css: 'st-inspired', cure: 'It fades on its own. Use it.',
  },
  lost: {
    id: 'lost', label: 'LOST', icon: 'lens', minutes: 60,
    text: 'You are not sure where you are, and neither is the map.',
    detail: 'Maps lie: the maze forgets where you have been, and the web ring will not say which way anything is.',
    css: 'st-lost', cure: 'Go home. Or put on the Keeper’s Coat, which knows the way.',
  },
  lucky: {
    id: 'lucky', label: 'LUCKY', icon: 'clover', minutes: 180, good: true,
    text: 'The dice quietly like you.',
    detail: 'Luck up. Favourable rolls come easier.',
    mods: { luck: 2 }, css: 'st-lucky', cure: 'It leaves when it likes.',
  },
  outofsync: {
    id: 'outofsync', label: 'OUT OF SYNC', icon: 'note', minutes: 120,
    text: 'Your clock and the website’s clock disagree by about seven minutes.',
    detail: 'Everything that cares about the time is seven minutes late: the clock reads wrong, and 11:11 recipes need a different moment. (The Golden Dice warned you.)',
    css: 'st-sync', cure: 'Wait it out, or look at something that is not a clock.',
  },
  overwritten: {
    id: 'overwritten', label: 'OVERWRITTEN', icon: 'puzzle', minutes: 240,
    text: 'A previous version of you is running instead.',
    detail: 'Your strongest stat is replaced by its starting value until the old state is restored.',
    css: 'st-overwritten', cure: 'Time. It restores itself, politely.',
  },
};

export const AILMENT_IDS = Object.keys(AILMENTS);
/** minutes OUT OF SYNC shifts every time-sensitive thing by */
export const SYNC_OFFSET = 7;
