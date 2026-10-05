import type { FoodProfile } from '../core/types';

// Creatures are data. Add a species here and the same system (feeding,
// personality, learning, assisting) works for it.

export interface FoodReaction extends FoodProfile {
  text: string;
  learn?: string;
}

export interface SpeciesDef {
  id: string;
  name: string;
  defaultName: string;
  sprite: string;
  blurb: string;
  /** keyed by item id first, then by tag */
  foods: Record<string, FoodReaction>;
  tagFoods: Record<string, FoodReaction>;
  confused: FoodReaction;
  /** traits shape the label and behaviour */
  traits: Record<string, string>;
  abilities: Record<string, { label: string; needs: string; text: string }>;
  petLines: string[];
  moodLines: { low: string[]; mid: string[]; high: string[] };
  locationLines: Record<string, string>;
}

export const SPECIES: Record<string, SpeciesDef> = {
  chocobo: {
    id: 'chocobo',
    name: 'Tiny Chocobo',
    defaultName: 'Peep',
    sprite: 'chocobo',
    blurb: 'Approximately fist-sized. Absolutely certain it is a hero.',
    foods: {
      snack_711: {
        fullness: 28, mood: 12, energy: 6, trust: 4,
        traits: { glutton: 2 },
        text: 'It eats the whole thing, wrapper and all, and looks at you like you have changed its life. It has also become a little rounder.',
      },
      good_coffee: {
        fullness: 5, mood: 15, energy: 45, trust: 8,
        traits: { hyper: 3 },
        learn: 'zoomies',
        text: 'It takes one sip and vibrates. Then it runs the length of your arm eleven times. It has learned ZOOMIES.',
      },
      coffee: {
        fullness: 2, mood: -6, energy: 20, trust: -2,
        traits: { hyper: 1 },
        text: 'It sips, shudders, and gives you a look of profound betrayal. It is awake now, though.',
      },
      yoghurt: {
        fullness: 30, mood: 30, energy: 10, trust: 20,
        traits: { gentle: 2, glutton: 1 },
        text: 'It buries its entire face in the yoghurt. When it comes out it is, briefly, the happiest living thing in the world. Somewhere, a sticky note weeps.',
      },
      willow_leaf: {
        fullness: 8, mood: 6, energy: 4, trust: 8,
        traits: { gentle: 2 },
        text: 'It nibbles the leaf politely and tucks the stem behind its ear-hole. Trust, quietly, goes up.',
      },
      willow_brew: {
        fullness: 10, mood: 14, energy: 10, trust: 10,
        traits: { gentle: 3 },
        text: 'It laps up the brew and falls into a calm, wobbling doze for a second. Good tea.',
      },
      sludge: {
        fullness: 10, mood: -20, energy: -10, trust: -10,
        traits: { bold: 1 },
        text: 'It eats the sludge. The sludge was a mistake. The chocobo is dignified about it, which is worse.',
      },
    },
    tagFoods: {
      food: { fullness: 15, mood: 5, energy: 3, trust: 3, text: 'It eats it. It seems fine with that.' },
      nature: { fullness: 6, mood: 4, energy: 3, trust: 4, traits: { gentle: 1 }, text: 'It likes green things. It pecks at it thoughtfully.' },
    },
    confused: { text: 'It tilts its head at it. It is not food. It is not even a good toy.', fullness: 0, mood: -1 },
    traits: {
      glutton: 'Round and optimistic',
      hyper: 'Zoomy',
      gentle: 'Soft and watchful',
      bold: 'Unreasonably brave',
    },
    abilities: {
      sniff: { label: 'Sniff around', needs: 'trust', text: 'Finds hidden things when it trusts you enough.' },
      zoomies: { label: 'Zoomies', needs: 'learned', text: 'Travel costs no time while it is wired.' },
      peck: { label: 'Peck', needs: 'trust', text: 'Helps in encounters.' },
    },
    petLines: [
      'It leans into your hand until it tips over.',
      'It makes a noise like a very small kettle.',
      'It lets you scratch the exact right spot. Neither of you speaks of it.',
      'It closes both eyes and trusts the world a little more.',
    ],
    moodLines: {
      low: ['Peep… (a tiny sigh).', 'It faces the wall.'],
      mid: ['Peep.', 'It watches the horizon like it owes it money.'],
      high: ['PEEP!', 'It does a tiny victory lap around your shoe.'],
    },
    locationLines: {
      home: 'It stares at the visitor counter, hypnotised by the numbers.',
      lake: 'It stares at the swans. The swans stare back. Nobody blinks.',
      lighthouse: 'It puffs itself up in the wind and refuses to be moved.',
      dungeon: 'It hides in your jacket and peeks out at the flickering lights.',
    },
  },
};

export const SPECIES_IDS = Object.keys(SPECIES);
