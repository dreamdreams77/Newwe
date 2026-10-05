// Shared types for the whole game. Everything data-driven hangs off these.

export type StatId =
  | 'courage'
  | 'dadEnergy'
  | 'nurture'
  | 'curiosity'
  | 'observation'
  | 'memory'
  | 'puzzleSense'
  | 'bossKnowledge'
  | 'luck'
  | 'chaos'
  | 'creativity';

export type Rarity = 'junk' | 'common' | 'uncommon' | 'rare' | 'legendary';
export type CardCategory = 'Snack' | 'Memory' | 'Tool' | 'Creature' | 'Wild' | 'Location' | 'Secret';
export type Stage = 1 | 2 | 3 | 4 | 5;

export type ZoneId =
  | 'home'
  | 'construction'
  | 'guestbook'
  | 'lake'
  | 'lighthouse'
  | 'e404'
  | 'dungeon'
  | 'mypage'
  | 'dev'
  | 'elevenRoom';

export type FlagValue = boolean | number | string;

// ---------------------------------------------------------------- conditions

export type Cond =
  | { has: string; qty?: number }
  | { flag: string; is?: FlagValue }
  | { notFlag: string }
  | { stat: StatId; gte: number }
  | { stage: number }
  | { visitors: number }
  | { know: string }
  | { memory: string }
  | { card: string }
  | { zoneState: { zone: string; key: string; is: string } }
  | { time: { from: number; to: number } } // minutes of day, wraps midnight
  | { creature: { id: string; field: 'trust' | 'mood' | 'energy' | 'fullness'; gte: number } }
  | { not: Cond }
  | { any: Cond[] }
  | { all: Cond[] };

// ------------------------------------------------------------------- effects

export type Effect =
  | { t: 'item'; id: string; qty?: number; quiet?: boolean }
  | { t: 'stat'; stat: StatId; by: number }
  | { t: 'vital'; v: 'hp' | 'coffee'; by: number }
  | { t: 'eleven'; by: number; why?: string }
  | { t: 'hits'; by: number; why?: string }
  | { t: 'flag'; key: string; value?: FlagValue }
  | { t: 'card'; id: string }
  | { t: 'memory'; id: string }
  | { t: 'know'; id: string }
  | { t: 'time'; by: number }
  | { t: 'buff'; stat: StatId; by: number; minutes: number; label: string }
  | { t: 'say'; text: string; kind?: ToastKind }
  | { t: 'creature'; id: string; field: 'trust' | 'mood' | 'energy' | 'fullness'; by: number }
  | { t: 'recipe'; id: string }
  | { t: 'reveal'; key: string }
  | { t: 'ailment'; id: string; minutes?: number };

export type ToastKind = 'info' | 'good' | 'bad' | 'item' | 'magic' | 'funny';

// --------------------------------------------------------------------- state

export interface Buff {
  stat: StatId;
  by: number;
  until: number; // absolute minutes
  label: string;
}

export interface ItemStack {
  qty: number;
  /** minute the (first) copy was acquired — drives perishables. */
  acquiredAt: number;
}

export interface CardInst {
  uid: number;
  cardId: string;
  /** item-backed cards vanish when the item does, and consume it when played. */
  itemId?: string;
}

export interface CreatureState {
  id: string;
  species: string;
  name: string;
  met: boolean;
  fullness: number; // 0..100
  mood: number; // 0..100
  trust: number; // 0..100
  energy: number; // 0..100
  traits: Record<string, number>;
  learned: string[];
  fedLog: string[]; // last few foods, for memory/reactions
  lastCareAt: number;
}

export interface ZoneState {
  visits: number;
  firstVisitAt: number | null;
  /** generic stock counters, eg { willow: 5 } */
  stock: Record<string, number>;
  /** how many times the player has taken from a thing */
  taken: Record<string, number>;
  lastRegrowAt: number;
  found: string[]; // hidden spots/finds claimed
}

export interface SettingsState {
  muted: boolean;
  volume: number; // 0..1
  music: boolean;
  reducedMotion: boolean;
  textScale: number; // 0.9..1.4
  showHotspots: boolean;
  sparkleCursor: boolean;
}

export interface MyPageState {
  wallpaper: string;
  slots: Array<string | null>; // refs like "item:key", "creature:chocobo", "memory:MEMORY_001"
  title: string;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  clock: { minutes: number; lastReturnHit: number };
  vitals: { hp: number; hpMax: number; coffee: number; coffeeMax: number };
  stats: Record<StatId, number>;
  buffs: Buff[];
  eleven: { charges: number; max: number; gained: number; spent: number; seen: string[] };
  visitors: number;
  stage: Stage;
  zone: ZoneId;
  inventory: Record<string, ItemStack>;
  cards: { earned: string[]; draw: CardInst[]; hand: CardInst[]; discard: CardInst[]; nextUid: number };
  recipes: { discovered: string[]; attempts: number; chaosSeen: string[] };
  flags: Record<string, FlagValue>;
  quests: Record<string, { started: number; done: number | null; failed?: boolean }>;
  knowledge: string[];
  memories: string[];
  guestbook: { read: string[]; taken: string[]; pinned: string[]; signed: string | null };
  creatures: Record<string, CreatureState>;
  activeCreature: string | null;
  zones: Record<string, ZoneState>;
  puzzles: Record<string, { solved: boolean; attempts: number; best?: number }>;
  encounters: Record<string, { phase: number; fury: number; won: boolean; attempts: number; data: Record<string, FlagValue> }>;
  myPage: MyPageState;
  ui: { revealed: Record<string, boolean>; seenTutorial: Record<string, boolean> };
  settings: SettingsState;
  log: Array<{ at: number; text: string }>;
  counters: { actions: number; checks: number; crits: number; fumbles: number; crafts: number };
  /** the Inspector: how deeply each dependency of each world object has been understood (0..2) */
  inspector: { level: number; tiers: Record<string, number>; probes: number };
  badges: string[];
  handbook: string[]; // extra unlocked handbook entries (events)
  /** timed status effects. Some statuses are derived from the world (coffee) and are not stored. */
  ailments: Array<{ id: string; until: number }>;
  equipment: Record<string, string | null>;
  /** statuses and gear the player has ever experienced (Handbook) */
  seenFx: string[];
  createdAt: number;
}

// --------------------------------------------------------------------- items

export interface FoodProfile {
  fullness?: number;
  mood?: number;
  energy?: number;
  trust?: number;
  traits?: Record<string, number>;
}

export interface ItemUse {
  id: string;
  label: string;
  /** hidden uses are not listed until `when` is satisfied or discovered */
  hidden?: boolean;
  when?: Cond;
  effects?: Effect[];
  consume?: boolean;
  text?: string;
  /** a named custom handler (see systems/itemUse.ts) */
  handler?: string;
  minutes?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  tags: string[];
  weight: number;
  rarity: Rarity;
  uses: ItemUse[];
  cardId?: string;
  food?: FoodProfile;
  perishable?: { shelfMinutes: number; notes: Record<'fresh' | 'warm' | 'suspect' | 'sentient', string> };
  /** state-aware text shown on examine, appended to description */
  story?: Array<{ when: Cond; text: string }>;
  stackable?: boolean;
  equip?: EquipDef;
}

export type SlotId = 'head' | 'body' | 'hands' | 'accessory' | 'tool' | 'badge' | 'companion' | 'relic';

/** what wearing an item does: not just numbers, but things you can now DO */
export interface EquipDef {
  slot: SlotId;
  text: string;
  mods?: Partial<Record<StatId, number>>;
  /** named effects other systems look for (see systems/equipment.ts) */
  perks?: string[];
}

// --------------------------------------------------------------------- cards

export type CardEffect =
  | Effect
  | { t: 'mod'; amount: number; stat?: StatId }
  | { t: 'dice'; n: number }
  | { t: 'rerollLowest' }
  | { t: 'peek' }
  | { t: 'travel'; zone: ZoneId }
  | { t: 'negate' }
  | { t: 'furyDown'; by: number }
  | { t: 'wild' }
  | { t: 'assist' }
  | { t: 'draw'; n: number };

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  glyph: string;
  text: string;
  flavor?: string;
  where: Array<'world' | 'check' | 'combat'>;
  effects: CardEffect[];
  /** item-backed cards consume their item; earned cards are discarded then reshuffled */
  consumable?: boolean;
  needs?: Cond;
}

// ------------------------------------------------------------------- crafting

export interface RecipeOutcome {
  weight: number;
  label: string;
  text: string;
  effects: Effect[];
  /** bigger = shown with more fanfare */
  tier: 'junk' | 'joke' | 'good' | 'rare' | 'disaster' | 'secret';
}

export interface RecipeDef {
  id: string;
  name: string;
  category: 'logical' | 'riddle' | 'chaos';
  inputs: string[];
  requires?: Cond;
  /** minutes-of-day window (wraps), eg around 11:11 */
  window?: { centre: number; radius: number };
  /** needs this stat >= n */
  needsStat?: { stat: StatId; gte: number };
  consume?: string[]; // defaults to all inputs
  outcomes: RecipeOutcome[];
  minutes?: number;
  /** a hint shown when the player is close but not there yet */
  nearMiss?: string;
  priority?: number;
}
