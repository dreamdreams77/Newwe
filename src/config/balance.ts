// Central tuning. Nothing about difficulty or pacing is hard-coded in the UI;
// change a number here and the whole game follows.

export const MIN_PER_DAY = 1440;
export const ELEVEN_AM = 11 * 60 + 11; // 671
export const ELEVEN_PM = 23 * 60 + 11; // 1391

export const BALANCE = {
  dice: {
    baseDice: 2,
    sides: 6,
    /** total >= dc + critMargin  => critical success */
    critMargin: 7,
    /** total <= dc - fumbleMargin => critical failure */
    fumbleMargin: 7,
    /** Luck: one re-roll of the lowest die (if it is <= luckKeepBelow) per this many luck points, rounded up */
    luckPerReroll: 3,
    luckKeepBelow: 3,
    /** Chaos: each die has chaosWildPerPoint * chaos chance to be a wild die (d12 - 3: same mean, bigger swing) */
    chaosWildPerPoint: 0.08,
    chaosWildMax: 0.75,
    wildSides: 12,
    wildOffset: 3,
    /** Golden Dice: extra d6 that explodes on 6; a 1 is a Gilded Fumble */
    goldenExplodeOn: 6,
    goldenFumbleChaos: 2,
    goldenFumbleMinutes: 90,
    /** 11:11 wish reroll gives this bonus on top of a fresh roll */
    wishBonus: 2,
  },
  dc: { trivial: 6, easy: 8, medium: 10, hard: 12, brutal: 15, absurd: 18 },
  coffee: {
    wiredAbove: 0.7, // fraction of max
    lowBelow: 0.25,
    wiredDice: 1,
    wiredTimeMult: 0.75,
    emptyChaos: 3,
    emptyFumbleMargin: 2, // fumbles trigger this much sooner when empty
    passiveDrainMinutes: 95, // lose 1 coffee per this many in-game minutes
    mugRefill: 3,
    mugCooldownMinutes: 180,
  },
  hp: { regenPerHourResting: 3, blueScreenHpFraction: 0.5, blueScreenMinutes: 60 },
  time: {
    startMinutes: 10 * 60 + 12, // day 1, 10:12am — 59 minutes to the first 11:11
    cost: { look: 3, talk: 2, travel: 6, check: 5, puzzle: 5, craft: 4, care: 3, rest: 60, sip: 5, maze: 1, combat: 4 },
  },
  eleven: { maxCharges: 3, coincidenceHits: 11 },
  encumbrance: { base: 12, perDadEnergy: 1 },
  hits: {
    start: 73,
    thresholds: [100, 250, 500, 777, 1111],
    finale: 1111,
    returnHome: 2,
    returnCooldownMinutes: 45,
    firstVisit: { guestbook: 9, construction: 11, lake: 37, lighthouse: 41, e404: 21, dungeon: 111 } as Record<string, number>,
    hiddenVisitor: 11,
    firstEleven: 111,
    puzzle: 90,
    quest: 60,
  },
  creature: {
    hungerPerHour: 6, // fullness drops
    energyPerHourAwake: 3,
    trustForSniff: 20,
    trustToBond: 25,
    sniffEnergy: 25,
    assistEnergy: 30,
    stuffedAbove: 92,
  },
  combat: { startHp: 0, furyMax: 6, attackDamage: [1, 3] as [number, number], tiltMinutes: 30 },
  stats: {
    start: {
      courage: 3,
      dadEnergy: 3,
      nurture: 3,
      curiosity: 4,
      observation: 3,
      memory: 3,
      puzzleSense: 3,
      bossKnowledge: 0,
      luck: 2,
      chaos: 1,
      creativity: 3,
    },
    cap: 12,
  },
  vitals: { hp: 20, coffee: 8, coffeeMax: 10 },
  autosaveDebounceMs: 250,
};

export type Balance = typeof BALANCE;
