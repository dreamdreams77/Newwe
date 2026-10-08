import type { RecipeDef } from '../core/types';
import { ELEVEN_AM } from '../config/balance';

// Crafting is discovered, never listed. The UI only ever shows recipes the
// player has already made, plus how many remain a mystery.

export const RECIPES: RecipeDef[] = [
  // ---------------------------------------------------------------- logical
  {
    id: 'mend_token',
    name: 'Mended Token',
    category: 'logical',
    inputs: ['token_broken', 'duct_tape'],
    minutes: 4,
    nearMiss: 'A broken thing and a thing that fixes broken things. They are obviously made for each other.',
    outcomes: [
      {
        weight: 1,
        label: 'Mended Token',
        tier: 'good',
        text: 'You press the two halves together and wrap them in tape until they stop arguing. It looks terrible. It will definitely work.',
        effects: [
          { t: 'item', id: 'token_mended' },
          { t: 'stat', stat: 'dadEnergy', by: 1 },
        ],
      },
    ],
  },
  {
    id: 'willow_brew',
    name: 'Willow-Leaf Brew',
    category: 'logical',
    inputs: ['coffee', 'willow_leaf'],
    minutes: 4,
    priority: 1,
    outcomes: [
      {
        weight: 1,
        label: 'Willow-Leaf Brew',
        tier: 'good',
        text: 'The leaf unfurls in the cup as if it had been waiting all year to do exactly this. The coffee smells like rain.',
        effects: [{ t: 'item', id: 'willow_brew' }],
      },
    ],
  },
  // ----------------------------------------------------------------- riddle
  {
    id: 'good_coffee',
    name: 'The Good Coffee',
    category: 'riddle',
    inputs: ['coffee', 'willow_leaf'],
    // brewed in the minute window around 11:11, whatever the day
    window: { centre: ELEVEN_AM, radius: 11 },
    minutes: 4,
    priority: 5,
    nearMiss: 'Coffee and a leaf. It nearly works. It feels like a recipe that cares what time it is.',
    outcomes: [
      {
        weight: 1,
        label: 'The Good Coffee',
        tier: 'rare',
        text: 'The clock says 11:11 and so does the steam. The mug goes very quiet. This is not the brew from before. This is The Good Coffee.',
        effects: [
          { t: 'item', id: 'good_coffee' },
          { t: 'flag', key: 'good_coffee_brewed' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ chaos
  {
    id: 'chaos_snack_token',
    name: 'Snack + Token',
    category: 'chaos',
    inputs: ['snack_711', 'token_broken'],
    minutes: 4,
    nearMiss: 'Food and money. In a vending machine they belong together. In a backpack, who knows.',
    outcomes: [
      { weight: 5, tier: 'joke', label: 'A Receipt for Nothing', text: 'The snack sighs, the token clinks, and a tiny printer you did not know you had spits out a receipt. For nothing. Itemised.', effects: [{ t: 'item', id: 'receipt' }] },
      { weight: 3, tier: 'junk', label: 'Mystery Sludge', text: 'It dissolves into something that is technically a snack and spiritually a mistake.', effects: [{ t: 'item', id: 'sludge' }] },
      { weight: 2, tier: 'secret', label: 'The machine remembers', text: 'The token hums. You hear a distant machine say, very clearly, EXACT CHANGE ONLY. You feel you have learned something about a thing that fights back.', effects: [{ t: 'know', id: 'vm_exact_change' }] },
      { weight: 2, tier: 'rare', label: 'A shortcut', text: 'Nothing happens, then a ticket slides out of the packaging. Platform 0. You did not order this. You are keeping it.', effects: [{ t: 'item', id: 'train_ticket' }] },
      { weight: 1, tier: 'disaster', label: 'Smoke', text: 'A tiny, offended puff of smoke. Your eyebrows are fine. Your dignity is not.', effects: [{ t: 'vital', v: 'hp', by: -2 }, { t: 'stat', stat: 'chaos', by: 1 }] },
    ],
  },
  {
    id: 'foxfire_tea',
    name: 'Foxfire Tea',
    category: 'logical',
    inputs: ['forest_mushroom', 'coffee'],
    minutes: 5,
    nearMiss: 'Something from the woods, and something from the mug. They want to be one thing, a warm one.',
    outcomes: [
      {
        weight: 1,
        label: 'Foxfire Tea',
        tier: 'good',
        text: 'It glows, faintly, green. You drink it before you can think better of it. Warmth, and a very good idea, and a distant sense of being watched fondly by trees.',
        effects: [
          { t: 'vital', v: 'coffee', by: 3 },
          { t: 'ailment', id: 'inspired', minutes: 180 },
          { t: 'stat', stat: 'curiosity', by: 1 },
        ],
      },
    ],
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
