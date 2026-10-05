import { BALANCE } from '../config/balance';
import { CARD_IDS } from '../data/cards';
import { GUEST_ENTRIES } from '../data/guestbook';
import { ITEM_IDS } from '../data/items';
import { KNOWLEDGE } from '../data/knowledge';
import { MEMORY_IDS } from '../data/memories';
import { QUESTS } from '../data/quests';
import { RECIPES } from '../data/recipes';
import { ZONES } from '../data/zones';
import { MAZE_THING_IDS } from '../systems/maze';
import { createInitialState } from './game';
import type { FlagValue, GameState, StatId } from './types';

// A compact positional encoding for the SAVE PASSWORD. Known ids become indexes,
// boolean flags become a bitset, and anything volatile (log, hand order, device
// settings) is left out. The result deflates to a few hundred bytes.

const STATS: StatId[] = ['courage', 'dadEnergy', 'nurture', 'curiosity', 'observation', 'memory', 'puzzleSense', 'bossKnowledge', 'luck', 'chaos', 'creativity'];
const KNOWLEDGE_IDS = Object.keys(KNOWLEDGE);
const QUEST_IDS = QUESTS.map((q) => q.id);
const RECIPE_IDS = RECIPES.map((r) => r.id);
const ZONE_IDS = Object.keys(ZONES);
const CREATURE_IDS = ['chocobo'];

const STATIC_FLAGS = 'ate_yoghurt blue_screened boat_ridden bob_coffee_given book_key_known boss_defeated chocobo_noticed clue_404 creature_met deduction_solved e404_open eleven_first finale_ready fridge_opened game_started gb_all_read gd_claimed golden_fumbled good_coffee_brewed guestbook_signed gus_yoghurt_seen intro_seen key_given key_opened lake_solved lamp_lit marl_asked_yoghurt maze_goal motion_override mug_first popups_closed postcard_decoded postcard_uv ride_pending ride_requested tape_played ticket_terminus voice_heard yoghurt_delivered yoghurt_wasted'.split(' ');

export const FLAG_DICT: string[] = [
  ...STATIC_FLAGS,
  ...ITEM_IDS.map((i) => `has_had_${i}`),
  ...GUEST_ENTRIES.flatMap((e) => [`read_${e.id}`, `taken_${e.id}`]),
  ...ZONE_IDS.map((z) => `visited_${z}`),
  ...BALANCE.hits.thresholds.map((t) => `hits_${t}`),
  ...MAZE_THING_IDS.map((t) => `maze_loot_${t}`),
];

const idx = (list: string[], id: string) => list.indexOf(id);
const pick = (list: string[], ids: number[]) => ids.map((i) => list[i]).filter(Boolean);

export function encodeState(s: GameState): unknown[] {
  // boolean flags -> bitset (hex); everything else -> a small object
  const bits = new Uint8Array(Math.ceil(FLAG_DICT.length / 8));
  const other: Record<string, FlagValue> = {};
  for (const [k, v] of Object.entries(s.flags)) {
    if (k === 'maze_seen' && typeof v === 'string') {
      // a 7x7 map of explored cells as a bitmask
      let mask = 0n;
      for (const cell of v.split(';').filter(Boolean)) {
        const [x, y] = cell.split(',').map(Number);
        if (x >= 0 && y >= 0 && x < 7 && y < 7) mask |= 1n << BigInt(y * 7 + x);
      }
      other.maze_seen_mask = mask.toString(16);
      continue;
    }
    const i = idx(FLAG_DICT, k);
    if (i >= 0 && v === true) bits[i >> 3] |= 1 << (i & 7);
    else if (v !== false) other[k] = v;
  }
  const hex = [...bits].map((b) => b.toString(16).padStart(2, '0')).join('');
  const inv = Object.entries(s.inventory)
    .filter(([id]) => idx(ITEM_IDS, id) >= 0)
    .map(([id, st]) => [idx(ITEM_IDS, id), st.qty, st.acquiredAt]);
  const quests = Object.entries(s.quests).map(([id, q]) => [idx(QUEST_IDS, id), q.started, q.done ?? -1, q.failed ? 1 : 0]);
  const zones = Object.entries(s.zones).map(([id, z]) => [idx(ZONE_IDS, id), z.visits, z.firstVisitAt ?? -1, z.stock, z.taken, z.lastRegrowAt, z.found]);
  const creatures = Object.values(s.creatures).map((c) => [idx(CREATURE_IDS, c.species), c.name, c.met ? 1 : 0, c.fullness, c.mood, c.trust, c.energy, c.traits, c.learned, c.fedLog, c.lastCareAt]);
  const puzzles = Object.entries(s.puzzles).map(([k, p]) => [k, p.solved ? 1 : 0, p.attempts]);
  const enc = Object.entries(s.encounters).map(([k, e]) => [k, e.phase, e.fury, e.won ? 1 : 0, e.attempts, e.data]);
  return [
    2, // codec version
    s.seed, s.rng, s.clock.minutes, s.clock.lastReturnHit,
    [s.vitals.hp, s.vitals.hpMax, s.vitals.coffee, s.vitals.coffeeMax],
    STATS.map((k) => s.stats[k]),
    s.buffs.map((b) => [STATS.indexOf(b.stat), b.by, b.until, b.label]),
    [s.eleven.charges, s.eleven.max, s.eleven.gained, s.eleven.spent, s.eleven.seen],
    s.visitors, s.stage, ZONE_IDS.indexOf(s.zone),
    inv,
    s.cards.earned.map((c) => idx(CARD_IDS, c)).filter((i) => i >= 0),
    [s.recipes.discovered.map((r) => idx(RECIPE_IDS, r)).filter((i) => i >= 0), s.recipes.attempts, s.recipes.chaosSeen],
    hex, other,
    quests,
    s.knowledge.map((k) => idx(KNOWLEDGE_IDS, k)).filter((i) => i >= 0),
    s.memories.map((m) => idx(MEMORY_IDS, m)).filter((i) => i >= 0),
    [s.guestbook.pinned, s.guestbook.signed],
    creatures, s.activeCreature ? idx(CREATURE_IDS, s.activeCreature) : -1,
    zones, puzzles, enc,
    [s.myPage.wallpaper, s.myPage.title, s.myPage.slots],
    Object.keys(s.ui.revealed).filter((k) => s.ui.revealed[k]),
    [s.counters.actions, s.counters.checks, s.counters.crits, s.counters.fumbles, s.counters.crafts],
  ];
}

export function decodeState(a: unknown[]): GameState {
  const base = createInitialState(a[1] as number);
  const [, seed, rng, minutes, lastReturn, vit, stats, buffs, eleven, visitors, stage, zoneIdx, inv, earned, rec, hex, other, quests, know, mem, gb, creatures, active, zones, puzzles, enc, mp, revealed, counters] = a as [
    number, number, number, number, number, number[], number[], unknown[][], unknown[], number, number, number, number[][], number[], unknown[], string, Record<string, FlagValue>, number[][], number[], number[], unknown[], unknown[][], number, unknown[][], unknown[][], unknown[][], unknown[], string[], number[],
  ];
  const s = base;
  s.seed = seed;
  s.rng = rng;
  s.clock = { minutes, lastReturnHit: lastReturn };
  s.vitals = { hp: vit[0], hpMax: vit[1], coffee: vit[2], coffeeMax: vit[3] };
  STATS.forEach((k, i) => (s.stats[k] = stats[i] ?? base.stats[k]));
  s.buffs = (buffs ?? []).map((b) => ({ stat: STATS[b[0] as number], by: b[1] as number, until: b[2] as number, label: b[3] as string }));
  s.eleven = { charges: eleven[0] as number, max: eleven[1] as number, gained: eleven[2] as number, spent: eleven[3] as number, seen: eleven[4] as string[] };
  s.visitors = visitors;
  s.stage = stage as GameState['stage'];
  s.zone = (ZONE_IDS[zoneIdx] ?? 'home') as GameState['zone'];
  s.inventory = {};
  for (const [i, qty, at] of inv) if (ITEM_IDS[i]) s.inventory[ITEM_IDS[i]] = { qty, acquiredAt: at };
  s.cards.earned = pick(CARD_IDS, earned);
  s.recipes = { discovered: pick(RECIPE_IDS, rec[0] as number[]), attempts: rec[1] as number, chaosSeen: rec[2] as string[] };
  const flags: Record<string, FlagValue> = {};
  for (let i = 0; i < FLAG_DICT.length; i++) {
    const byte = parseInt(hex.slice((i >> 3) * 2, (i >> 3) * 2 + 2) || '0', 16);
    if (byte & (1 << (i & 7))) flags[FLAG_DICT[i]] = true;
  }
  s.flags = { ...flags, ...other };
  if (typeof other.maze_seen_mask === 'string') {
    const mask = BigInt('0x' + other.maze_seen_mask);
    const cells: string[] = [];
    for (let i = 0; i < 49; i++) if (mask & (1n << BigInt(i))) cells.push(`${i % 7},${Math.floor(i / 7)}`);
    s.flags.maze_seen = cells.join(';');
    delete s.flags.maze_seen_mask;
  }
  s.quests = {};
  for (const [qi, started, done, failed] of quests) if (QUEST_IDS[qi]) s.quests[QUEST_IDS[qi]] = { started, done: done < 0 ? null : done, ...(failed ? { failed: true } : {}) };
  s.knowledge = pick(KNOWLEDGE_IDS, know);
  s.memories = pick(MEMORY_IDS, mem);
  s.guestbook = { read: GUEST_ENTRIES.filter((e) => flags[`read_${e.id}`]).map((e) => e.id), taken: GUEST_ENTRIES.filter((e) => flags[`taken_${e.id}`]).map((e) => e.id), pinned: gb[0] as string[], signed: (gb[1] as string | null) ?? null };
  s.creatures = {};
  for (const c of creatures ?? []) {
    const id = CREATURE_IDS[c[0] as number];
    if (!id) continue;
    s.creatures[id] = { id, species: id, name: c[1] as string, met: !!c[2], fullness: c[3] as number, mood: c[4] as number, trust: c[5] as number, energy: c[6] as number, traits: c[7] as Record<string, number>, learned: c[8] as string[], fedLog: c[9] as string[], lastCareAt: c[10] as number };
  }
  s.activeCreature = active >= 0 ? CREATURE_IDS[active] ?? null : null;
  s.zones = {};
  for (const z of zones ?? []) {
    const id = ZONE_IDS[z[0] as number];
    if (id) s.zones[id] = { visits: z[1] as number, firstVisitAt: (z[2] as number) < 0 ? null : (z[2] as number), stock: z[3] as Record<string, number>, taken: z[4] as Record<string, number>, lastRegrowAt: z[5] as number, found: z[6] as string[] };
  }
  s.puzzles = {};
  for (const p of puzzles ?? []) s.puzzles[p[0] as string] = { solved: !!p[1], attempts: p[2] as number };
  s.encounters = {};
  for (const e of enc ?? []) s.encounters[e[0] as string] = { phase: e[1] as number, fury: e[2] as number, won: !!e[3], attempts: e[4] as number, data: e[5] as Record<string, FlagValue> };
  s.myPage = { wallpaper: mp[0] as string, title: mp[1] as string, slots: (mp[2] as Array<string | null>) ?? base.myPage.slots };
  s.ui.revealed = Object.fromEntries((revealed ?? []).map((k) => [k, true]));
  s.counters = { actions: counters[0], checks: counters[1], crits: counters[2], fumbles: counters[3], crafts: counters[4] };
  return s;
}
