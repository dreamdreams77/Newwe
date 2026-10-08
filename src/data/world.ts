import type { Cond, ZoneId } from '../core/types';

/**
 * THE WORLD MODEL.
 *
 * Every interesting thing in the website is registered here as an object with a
 * readable state and a list of dependencies. The Inspector, the Handbook, the page
 * source, the terminal and the pseudo-code gate are all *views over this table*; none of
 * them has its own copy of the truth. A dependency is a named condition the world checks.
 * The Inspector starts blind and reveals them gradually.
 */

export type ObjKind = 'page' | 'object' | 'npc' | 'creature' | 'system' | 'link' | 'item';
export type Mode = 'ALL' | 'ANY' | 'XOR';

export interface Dep {
  id: string;
  /** shown as `name op value` */
  name: string;
  op: string;
  value: string;
  cond: Cond;
  /** what you have to know/have for the name to stop being "???" at tier 1 */
  nameKnown?: Cond;
  /** Observation needed to probe this dependency one tier deeper */
  obs?: number;
  /** an extra way to understand it fully, besides probing or having satisfied it */
  reveal?: Cond;
}

export interface WorldObj {
  id: string;
  label: string;
  kind: ObjKind;
  zone?: ZoneId | 'meta';
  /** when this object can appear in the Inspector at all */
  known: Cond;
  /** first matching rule names the state; otherwise UNKNOWN */
  stateRules: Array<{ when: Cond; is: string }>;
  mode: Mode;
  deps: Dep[];
  error?: { code: string; text: string; reveal: Cond };
  /** a line from the "developer", shown only at full understanding */
  note?: { text: string; reveal: Cond };
}

const T = (flag: string): Cond => ({ flag });

export const WORLD: WorldObj[] = [
  {
    id: 'site.counter',
    label: 'hit_counter',
    kind: 'system',
    zone: 'home',
    known: { flag: 'game_started' },
    stateRules: [{ when: { flag: 'finale_ready' }, is: 'HOLDING STILL' }, { when: { visitors: 1111 }, is: 'AT THRESHOLD' }, { when: { visitors: 100 }, is: 'COUNTING (not only you)' }],
    mode: 'ALL',
    deps: [
      { id: 'v', name: 'visitors', op: '>=', value: '1111', cond: { visitors: 1111 }, nameKnown: { visitors: 100 }, obs: 3 },
      { id: 'b', name: 'machine.judged', op: '==', value: 'TRUE', cond: T('boss_defeated'), nameKnown: T('maze_goal'), obs: 6 },
    ],
    error: { code: 'E_WHO', text: 'visitor source: UNRESOLVED', reveal: { visitors: 500 } },
    note: { text: 'counter increments that did not come from you: see processes', reveal: { visitors: 777 } },
  },
  {
    id: 'guestbook.E_strange',
    label: 'guestbook_entry_017',
    kind: 'object',
    zone: 'guestbook',
    known: T('visited_guestbook'),
    stateRules: [{ when: T('read_E_strange'), is: 'VISIBLE' }, { when: T('lake_solved'), is: 'POSTED' }],
    mode: 'ALL',
    deps: [{ id: 'l', name: 'lake.pads', op: '==', value: 'SOLVED', cond: T('lake_solved'), nameKnown: T('boat_ridden'), obs: 3 }],
    error: { code: 'E_DATE', text: 'timestamp is in the future (2003) and the past (2111)', reveal: { stat: 'observation', gte: 5 } },
  },
  {
    id: 'lake.boat',
    label: 'swan_boat',
    kind: 'object',
    zone: 'lake',
    known: T('visited_lake'),
    stateRules: [{ when: T('boat_ridden'), is: 'PUNCHED' }],
    mode: 'ALL',
    deps: [{ id: 't', name: 'ticket', op: '==', value: 'SWAN', cond: { any: [{ has: 'swan_ticket' }, T('boat_ridden')] }, nameKnown: T('visited_lake'), obs: 2 }],
    note: { text: 'ticket described as "decorative" in 3 places. grep says otherwise', reveal: T('boat_ridden') },
  },
  {
    id: 'lake.pads',
    label: 'lily_pads',
    kind: 'object',
    zone: 'lake',
    known: T('visited_lake'),
    stateRules: [{ when: T('lake_solved'), is: 'SOLVED' }, { when: T('boat_ridden'), is: 'LISTENING' }, { when: { flag: 'visited_lake' }, is: 'SHY' }],
    mode: 'ALL',
    deps: [
      { id: 'b', name: 'player.location', op: '==', value: 'ON_WATER', cond: T('boat_ridden'), nameKnown: { know: 'gus_pads' }, obs: 2, reveal: { know: 'gus_pads' } },
      { id: 'm', name: 'melody', op: 'matches', value: 'voicemail_001', cond: T('lake_solved'), nameKnown: T('voice_heard'), obs: 4 },
    ],
  },
  {
    id: 'lake.willow',
    label: 'willow_tree',
    kind: 'object',
    zone: 'lake',
    known: T('visited_lake'),
    stateRules: [
      { when: { zoneState: { zone: 'lake', key: 'willow', is: 'bare' } }, is: 'BARE' },
      { when: { zoneState: { zone: 'lake', key: 'willow', is: 'thinning' } }, is: 'THINNING' },
      { when: { flag: 'visited_lake' }, is: 'LUSH' },
    ],
    mode: 'ALL',
    deps: [{ id: 's', name: 'leaves.stock', op: '>', value: '0', cond: { not: { zoneState: { zone: 'lake', key: 'willow', is: 'bare' } } }, nameKnown: T('visited_lake'), obs: 1 }],
    note: { text: 'regrow_rate = 1 per 420 min. nobody told the tree', reveal: { stat: 'observation', gte: 6 } },
  },
  {
    id: 'creature.chocobo',
    label: 'tiny_chocobo',
    kind: 'creature',
    zone: 'lake',
    known: T('chocobo_noticed'),
    stateRules: [{ when: { creature: { id: 'chocobo', field: 'trust', gte: 25 } }, is: 'BONDED' }, { when: T('creature_met'), is: 'COMPANION' }, { when: T('chocobo_noticed'), is: 'HIDING' }],
    mode: 'ALL',
    deps: [
      { id: 't', name: 'trust', op: '>=', value: '25', cond: { creature: { id: 'chocobo', field: 'trust', gte: 25 } }, nameKnown: T('creature_met'), obs: 3 },
      { id: 'e', name: 'energy', op: '>=', value: '30', cond: { creature: { id: 'chocobo', field: 'energy', gte: 30 } }, nameKnown: T('creature_met'), obs: 4 },
    ],
  },
  {
    id: 'construction.fridge',
    label: 'mini_fridge',
    kind: 'object',
    zone: 'construction',
    known: T('visited_construction'),
    stateRules: [{ when: T('fridge_opened'), is: 'EMPTY' }, { when: { flag: 'visited_construction' }, is: 'HUMMING' }],
    mode: 'ANY',
    deps: [
      { id: 'o', name: 'observation', op: '>=', value: '3', cond: { stat: 'observation', gte: 3 }, nameKnown: T('visited_construction'), obs: 1 },
      { id: 'c', name: 'curiosity', op: '>=', value: '4', cond: { stat: 'curiosity', gte: 4 }, nameKnown: T('visited_construction'), obs: 2 },
      { id: 'k', name: 'courage', op: '>=', value: '3', cond: { stat: 'courage', gte: 3 }, nameKnown: T('visited_construction'), obs: 3 },
    ],
    note: { text: 'all three are "just walk up to it" with different excuses', reveal: T('fridge_opened') },
  },
  {
    id: 'lighthouse.lamp',
    label: 'lamp.exe',
    kind: 'object',
    zone: 'lighthouse',
    known: T('visited_lighthouse'),
    stateRules: [{ when: T('lamp_lit'), is: 'RUNNING' }, { when: { flag: 'visited_lighthouse' }, is: 'STUCK' }],
    mode: 'ANY',
    deps: [
      { id: 'y', name: 'keeper.misses', op: '==', value: 'DELIVERED', cond: T('yoghurt_delivered'), nameKnown: T('gus_yoghurt_seen'), obs: 3, reveal: T('marl_asked_yoghurt') },
      { id: 't', name: 'repair.tape', op: '&&', value: 'dad_energy >= 3', cond: { all: [{ has: 'duct_tape' }, { stat: 'dadEnergy', gte: 3 }] }, nameKnown: { know: 'marl_lamp_stuck' }, obs: 3 },
      { id: 'j', name: 'repair.jury', op: '&&', value: 'creativity >= 4', cond: { all: [{ any: [{ has: 'token_broken' }, { has: 'token_mended' }] }, { stat: 'creativity', gte: 4 }] }, nameKnown: { know: 'marl_lamp_stuck' }, obs: 4 },
      { id: 'c', name: 'repair.kick', op: '&&', value: 'courage >= 3', cond: { stat: 'courage', gte: 3 }, nameKnown: { know: 'marl_lamp_stuck' }, obs: 2 },
    ],
    error: { code: 'E_LAMP_JAM', text: 'mechanism wedged. needs: something stubborn', reveal: { know: 'marl_lamp_stuck' } },
    note: { text: 'four exits, one door. nobody checks which one you used', reveal: T('lamp_lit') },
  },
  {
    id: 'lighthouse.book',
    label: 'keepers_book',
    kind: 'object',
    zone: 'lighthouse',
    known: T('visited_lighthouse'),
    stateRules: [{ when: T('book_key_known'), is: 'BOOKMARKED' }, { when: { flag: 'visited_lighthouse' }, is: 'CLOSED' }],
    mode: 'ALL',
    deps: [{ id: 'b', name: 'bookmark', op: '==', value: 'NATURE', cond: T('book_key_known'), nameKnown: T('has_had_willow_leaf'), obs: 2 }],
  },
  {
    id: 'postcard.ink',
    label: 'postcard_ink',
    kind: 'item',
    zone: 'lighthouse',
    known: T('has_had_postcard'),
    stateRules: [{ when: T('postcard_decoded'), is: 'DECODED' }, { when: T('postcard_uv'), is: 'GLOWING' }, { when: T('has_had_postcard'), is: 'GLOSSY' }],
    mode: 'ALL',
    deps: [
      { id: 'l', name: 'lamp.exe', op: '==', value: 'RUNNING', cond: T('lamp_lit'), nameKnown: T('has_had_postcard'), obs: 3 },
      { id: 'k', name: 'cipher.key', op: '==', value: 'KNOWN', cond: T('book_key_known'), nameKnown: T('postcard_uv'), obs: 3 },
    ],
  },
  {
    id: 'e404.page',
    label: 'page_404',
    kind: 'page',
    zone: 'e404',
    known: { any: [T('visited_e404'), T('clue_404')] },
    stateRules: [{ when: T('e404_open'), is: 'OPEN' }, { when: T('clue_404'), is: 'FOUND (locked)' }, { when: { flag: 'visited_e404' }, is: 'NOT FOUND' }],
    mode: 'ALL',
    deps: [
      { id: 'c', name: 'page.is_address', op: '==', value: 'TRUE', cond: T('clue_404'), nameKnown: T('postcard_uv'), obs: 3 },
      { id: 'k', name: 'lock', op: '==', value: 'SMALL_AND_USELESS', cond: { has: 'key' }, nameKnown: T('clue_404'), obs: 3, reveal: { know: 'page_is_address' } },
    ],
    error: { code: '404', text: 'the server looked everywhere. except one place', reveal: T('visited_e404') },
    note: { text: 'there is a second way in. it is not a door', reveal: { flag: 'e404_open' } },
  },
  {
    id: 'dungeon.vm1111',
    label: 'VM-1111',
    kind: 'object',
    zone: 'dungeon',
    known: T('e404_open'),
    stateRules: [{ when: T('boss_defeated'), is: 'JUDGED' }, { when: T('maze_goal'), is: 'AWAKE' }, { when: T('e404_open'), is: 'DORMANT' }],
    mode: 'ALL',
    deps: [
      { id: 'p', name: 'panel', op: '==', value: 'ALL_OFF', cond: { know: 'vm_pattern' }, nameKnown: T('maze_goal'), obs: 3 },
      { id: 'c', name: 'payment', op: '==', value: 'EXACT', cond: { know: 'vm_exact_change' }, nameKnown: T('maze_goal'), obs: 3 },
      { id: 'k', name: 'code', op: '==', value: 'WISH_HOUR', cond: { know: 'vm_code_hour' }, nameKnown: T('maze_goal'), obs: 4 },
    ],
    error: { code: 'E_JUDGE', text: 'unit has not been wrong since installation', reveal: T('boss_defeated') },
  },
  {
    id: 'clock.eleven',
    label: 'clock_11_11',
    kind: 'system',
    zone: 'meta',
    known: T('eleven_first'),
    stateRules: [{ when: T('finale_ready'), is: 'ALIGNED' }, { when: T('eleven_first'), is: 'TICKING' }],
    mode: 'ANY',
    deps: [
      { id: 'a', name: 'in_game_clock', op: '==', value: '11:11', cond: { time: { from: 671, to: 672 } }, nameKnown: T('eleven_first'), obs: 2 },
      { id: 'b', name: 'real_clock', op: '==', value: '11:11', cond: { flag: 'real_eleven_seen' }, nameKnown: { visitors: 777 }, obs: 5 },
      { id: 'c', name: 'dice', op: '==', value: '[1,1]', cond: { flag: 'snake_eyes_seen' }, nameKnown: { visitors: 777 }, obs: 5 },
    ],
    note: { text: 'three sources, one resource. the same engine, asked three different ways', reveal: { visitors: 1111 } },
  },
  {
    id: 'dev.gate',
    label: '/dev/',
    kind: 'page',
    zone: 'meta',
    known: { flag: 'dev_gate_seen' },
    stateRules: [{ when: T('dev_open'), is: 'OPEN' }, { when: T('dev_gate_seen'), is: 'FORBIDDEN' }],
    mode: 'ALL',
    deps: [
      { id: 'v', name: 'visitors', op: '>=', value: '500', cond: { visitors: 500 }, nameKnown: T('dev_gate_seen'), obs: 2 },
      { id: 'x', name: 'lamp_lit XOR yoghurt_delivered', op: '', value: '', cond: { any: [{ all: [T('lamp_lit'), { not: T('yoghurt_delivered') }] }, { all: [{ not: T('lamp_lit') }, T('yoghurt_delivered')] }] }, nameKnown: { know: 'dev_xor' }, obs: 5 },
      { id: 'm', name: 'chocobo.mood', op: '!=', value: 'SAD', cond: { creature: { id: 'chocobo', field: 'mood', gte: 30 } }, nameKnown: T('dev_gate_seen'), obs: 3 },
    ],
    error: { code: '403', text: 'FORBIDDEN. (but not very.)', reveal: T('dev_gate_seen') },
  },
  {
    id: 'forest.mushrooms',
    label: 'mushroom_ring',
    kind: 'object',
    zone: 'forest',
    known: T('visited_forest'),
    stateRules: [
      { when: { zoneState: { zone: 'forest', key: 'mushrooms', is: 'bare' } }, is: 'BARE' },
      { when: { zoneState: { zone: 'forest', key: 'mushrooms', is: 'sparse' } }, is: 'SPARSE' },
      { when: T('visited_forest'), is: 'LUSH' },
    ],
    mode: 'ALL',
    deps: [{ id: 's', name: 'caps.stock', op: '>', value: '0', cond: { not: { zoneState: { zone: 'forest', key: 'mushrooms', is: 'bare' } } }, nameKnown: T('visited_forest'), obs: 1 }],
    note: { text: 'regrow_rate = 1 per 360 min. the labels are not reliable', reveal: { stat: 'observation', gte: 6 } },
  },
  {
    id: 'forest.trail',
    label: 'trail.fork[3]',
    kind: 'object',
    zone: 'forest',
    known: T('visited_forest'),
    stateRules: [{ when: T('oak_found'), is: 'RESOLVED' }, { when: T('fern_met'), is: 'TANGLED' }, { when: T('visited_forest'), is: 'UNMARKED' }],
    mode: 'ALL',
    deps: [
      { id: 'n', name: 'time.is_dark', op: '==', value: 'TRUE', cond: { time: { from: 18 * 60, to: 5 * 60 } }, nameKnown: T('visited_forest'), obs: 2 },
      { id: 'o', name: 'observation', op: '>=', value: '5', cond: { stat: 'observation', gte: 5 }, nameKnown: T('fern_met'), obs: 3 },
    ],
  },
  {
    id: 'forest.oak',
    label: 'old_oak.rings',
    kind: 'object',
    zone: 'forest',
    known: T('oak_found'),
    stateRules: [{ when: T('tree_ring_taken'), is: 'COUNTED' }, { when: T('oak_found'), is: 'WAITING' }],
    mode: 'ANY',
    deps: [
      { id: 'o', name: 'observation', op: '>=', value: '7', cond: { stat: 'observation', gte: 7 }, nameKnown: T('oak_found'), obs: 2 },
      { id: 'n', name: 'nurture', op: '>=', value: '6', cond: { stat: 'nurture', gte: 6 }, nameKnown: T('oak_found'), obs: 3 },
    ],
    note: { text: 'rings = 11. there is a twelfth, but it is not a ring', reveal: { stat: 'observation', gte: 8 } },
  },
  {
    id: 'tasmania.board',
    label: 'noticeboard.photos[2]',
    kind: 'object',
    zone: 'tasmania',
    known: T('visited_tasmania'),
    stateRules: [{ when: T('tas_diffs'), is: 'RECONCILED' }, { when: T('visited_tasmania'), is: 'DIFFERS' }],
    mode: 'ANY',
    deps: [
      { id: 'o', name: 'observation', op: '>=', value: '6', cond: { stat: 'observation', gte: 6 }, nameKnown: T('visited_tasmania'), obs: 2 },
      { id: 'c', name: 'diffs.found', op: '==', value: '5', cond: T('tas_diffs'), nameKnown: T('devil_met'), obs: 3 },
    ],
    note: { text: 'diff_count = 5. the letters are not random', reveal: { stat: 'observation', gte: 7 } },
  },
  {
    id: 'tasmania.sky',
    label: 'sky.aurora',
    kind: 'object',
    zone: 'tasmania',
    known: T('tas_diffs'),
    stateRules: [{ when: T('tas_aurora'), is: 'ALIGHT' }, { when: T('tas_diffs'), is: 'LISTENING' }],
    mode: 'ALL',
    deps: [
      { id: 'n', name: 'time.is_night', op: '==', value: 'TRUE', cond: { time: { from: 21 * 60, to: 5 * 60 } }, nameKnown: T('tas_diffs'), obs: 2 },
      { id: 'w', name: 'word.spoken', op: '==', value: 'TRUE', cond: T('tas_aurora'), nameKnown: T('tas_diffs'), obs: 3 },
    ],
  },
];

export const WORLD_BY_ID: Record<string, WorldObj> = Object.fromEntries(WORLD.map((o) => [o.id, o]));
