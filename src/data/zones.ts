import type { Cond, ZoneId } from '../core/types';

export interface EcoRule {
  max: number;
  regrowMinutes: number;
  /** stock thresholds, checked top-down */
  states: Array<{ atMost: number; name: string }>;
}

export interface HiddenSpot {
  id: string;
  /** percent of the scene box */
  x: number;
  y: number;
  /** observation needed for it to glimmer on its own */
  obs: number;
  text: string;
}

export interface ZoneData {
  id: ZoneId;
  title: string;
  url: string;
  pageTitle: string;
  ambience: string;
  music: string;
  eco?: Record<string, EcoRule>;
  spots?: HiddenSpot[];
  hint: Array<{ when?: Cond; done?: Cond; text: string }>;
}

export const ZONES: Record<string, ZoneData> = {
  home: {
    id: 'home',
    title: 'Home',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/index.html',
    pageTitle: '~*~ Welcome 2 My World ~*~',
    ambience: 'hum',
    music: 'home',
    spots: [{ id: 'home_visitor', x: 91, y: 90, obs: 5, text: 'A visitor. Waving. Fourteen pixels tall and extremely proud.' }],
    hint: [
      { done: { flag: 'visited_guestbook' }, text: 'Every old homepage has a guestbook link. This one wants to be read.' },
      { done: { flag: 'visited_construction' }, text: 'The "Under Construction" sign is doing a lot of heavy lifting for a sign.' },
      { when: { flag: 'clue_404' }, done: { flag: 'e404_open' }, text: 'The "Secret Page" link has been looking at you funny.' },
    ],
  },
  construction: {
    id: 'construction',
    title: 'Under Construction',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/construction.html',
    pageTitle: 'UNDER CONSTRUCTION!!',
    ambience: 'hammer',
    music: 'home',
    spots: [{ id: 'cons_visitor', x: 8, y: 82, obs: 4, text: 'A tiny visitor, half-buried in the sand pit, holding a flag. +1 visitor, spiritually.' }],
    hint: [
      { done: { has: 'yoghurt' }, text: 'Barrier tape that isn’t really keeping anything out. Something behind it is humming.' },
      { text: 'Bob has been on this job since 2001. He appreciates coffee.' },
    ],
  },
  guestbook: {
    id: 'guestbook',
    title: 'Guestbook',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/guestbook.cgi',
    pageTitle: 'Sign My Guestbook!!',
    ambience: 'hum',
    music: 'home',
    hint: [
      { done: { flag: 'read_E_pete' }, text: 'Some entries come with things stuck to them. Read the ones that sound happy.' },
      { when: { flag: 'read_E_strange' }, done: { flag: 'deduction_solved' }, text: 'People write the way they walk. Compare the strange entry to someone older.' },
    ],
  },
  lake: {
    id: 'lake',
    title: "Swanny's Pond",
    url: 'http://www.swannys-pond.net/~pedalo/index.htm',
    pageTitle: "~ Swanny's Pond Fan Page ~",
    ambience: 'lake',
    music: 'lake',
    eco: {
      willow: {
        max: 5,
        regrowMinutes: 420,
        states: [
          { atMost: 0, name: 'bare' },
          { atMost: 2, name: 'thinning' },
          { atMost: 99, name: 'lush' },
        ],
      },
    },
    spots: [
      { id: 'lake_visitor_a', x: 92, y: 36, obs: 5, text: 'A visitor on the far bank, waving a tiny flag. It waves back until you leave.' },
      { id: 'lake_visitor_b', x: 28, y: 74, obs: 7, text: 'A visitor floating in the shallows on an inflatable swan. Content. Counted.' },
    ],
    hint: [
      { done: { flag: 'boat_ridden' }, text: 'The dock clerk is waiting for a ticket. Does anyone still have one?' },
      { when: { flag: 'boat_ridden' }, done: { flag: 'lake_solved' }, text: 'Listen once, then do what the water did. Only the pads out on the lake will sing.' },
      { done: { flag: 'chocobo_noticed' }, text: 'Something tiny is peeping from the reeds. Maybe look again, with feeling.' },
    ],
  },
  lighthouse: {
    id: 'lighthouse',
    title: 'The Light on the Cliff',
    url: 'http://www.tasmanian-lights.com.au/keeper/lamp.html',
    pageTitle: 'The Light On The Cliff',
    ambience: 'wind',
    music: 'lighthouse',
    spots: [
      { id: 'light_visitor', x: 6, y: 20, obs: 6, text: 'A visitor between two rocks, holding a very small telescope. Counted.' },
      { id: 'light_gull', x: 55, y: 8, obs: 8, text: 'A gull that has clearly seen things. It drops a single, very clean visitor tag.' },
    ],
    hint: [
      { done: { flag: 'lamp_lit' }, text: 'Marl says the lamp is stuck, not dead. Something stubborn would shift it. Or something he misses.' },
      { when: { flag: 'lamp_lit' }, done: { flag: 'postcard_uv' }, text: 'The lamp is on. Everything the postcard knows has been hiding from ordinary light.' },
      { when: { flag: 'postcard_uv' }, done: { flag: 'postcard_decoded' }, text: 'A cryptogram needs a key. The keeper’s book has a page marked by something that grows.' },
    ],
  },
  e404: {
    id: 'e404',
    title: 'ERROR 404',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/secret.html',
    pageTitle: '404 Not Found',
    ambience: 'static',
    music: 'none',
    hint: [{ text: 'The server looked everywhere. Except the one place.' }],
  },
  dungeon: {
    id: 'dungeon',
    title: 'PAGE FOUND.',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/404/',
    pageTitle: 'PAGE FOUND.',
    ambience: 'static',
    music: 'dungeon',
    hint: [
      { done: { know: 'vm_exact_change' }, text: 'Machines are particular about money. Whole is better than broken.' },
      { done: { know: 'vm_code_hour' }, text: 'Somewhere in the dark a note says what the keypad wants.' },
    ],
  },
  mypage: {
    id: 'mypage',
    title: 'My Page',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/~visitor73/index.html',
    pageTitle: 'My Page!!',
    ambience: 'hum',
    music: 'home',
    hint: [{ text: 'Your page. Put things on it. It remembers what you put.' }],
  },
  elevenRoom: {
    id: 'elevenRoom',
    title: '11:11',
    url: 'http://11-11.web/',
    pageTitle: '1 1 : 1 1',
    ambience: 'hum',
    music: 'finale',
    hint: [{ text: '...' }],
  },
  brokenHome: {
    id: 'brokenHome',
    title: 'The 11:11 Room',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/room.html',
    pageTitle: '11:11',
    ambience: 'static',
    music: 'dungeon',
    hint: [
      { done: { flag: 'bh_defeated' }, text: 'Every page you have visited is here at once. It is trying to remember itself. Look at it carefully, five different ways.' },
    ],
  },
  terminal: {
    id: 'terminal',
    title: 'The Terminal',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/strategy.txt',
    pageTitle: 'STRATEGY GUIDE v1.1',
    ambience: 'hum',
    music: 'dungeon',
    hint: [{ text: 'Green text on black. A menu, and a crossword. It is a strategy guide for something it has not been told about.' }],
  },
  forest: {
    id: 'forest',
    title: 'The Whispering Woods',
    url: 'http://www.geocities.com/Yosemite/Trails/3011/woods.html',
    pageTitle: '~ the whispering woods ~ (a nature fan page)',
    ambience: 'wind',
    music: 'lake',
    eco: {
      mushrooms: {
        max: 4,
        regrowMinutes: 360,
        states: [
          { atMost: 0, name: 'bare' },
          { atMost: 2, name: 'sparse' },
          { atMost: 99, name: 'lush' },
        ],
      },
    },
    spots: [
      { id: 'forest_visitor_a', x: 12, y: 44, obs: 5, text: 'A visitor sitting very still on a branch, pretending to be a squirrel. Counted.' },
      { id: 'forest_visitor_b', x: 84, y: 24, obs: 8, text: 'A visitor tucked into a hollow, reading a very small book. They look up and wave a leaf at you.' },
    ],
    hint: [
      { done: { flag: 'fern_met' }, text: 'Somebody lives in the woods, near the stump with the lantern.' },
      { when: { flag: 'fern_met' }, done: { flag: 'oak_found' }, text: 'The path forks three times. The foxfire only shows the way after dark.' },
      { when: { flag: 'oak_found' }, done: { flag: 'tree_ring_taken' }, text: 'The oak has been counting for a long time. So can you.' },
    ],
  },
  tasmania: {
    id: 'tasmania',
    title: 'Greetings from the Bottom of the World',
    url: 'http://www.tasmanian-lights.com.au/postcards/south.html',
    pageTitle: 'Greetings from the Bottom of the World!',
    ambience: 'wind',
    music: 'lighthouse',
    spots: [
      { id: 'tas_visitor_a', x: 8, y: 66, obs: 5, text: 'A visitor on the rocks, wrapped in a towel, waving at a ship that is not there. Counted.' },
      { id: 'tas_visitor_b', x: 90, y: 30, obs: 8, text: 'A visitor in a very small hot-air balloon, at a great distance, waving. You wave back. It counts.' },
    ],
    hint: [
      { done: { flag: 'devil_met' }, text: 'Someone small and furious lives on the rocks near the noticeboard.' },
      { when: { flag: 'devil_met' }, done: { flag: 'tas_diffs' }, text: 'Two photographs are pinned to the board. Something changed between them. Five things.' },
      { when: { flag: 'tas_diffs' }, done: { flag: 'tas_aurora' }, text: 'Five letters, left to right. The sky only answers after dark.' },
    ],
  },
  parent: {
    id: 'parent',
    title: 'PARENT PROCESS',
    url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/pid1.txt',
    pageTitle: 'PID 1',
    ambience: 'hum',
    music: 'finale',
    hint: [{ text: '...' }],
  },
};

/** Webring tiles: unlocked by clues, not by a menu. */
export interface RingTile {
  zone: string;
  label: string;
  alt: string;
  unlock?: Cond;
  future?: boolean;
  colour: string;
}

export const WEBRING: RingTile[] = [
  { zone: 'lake', label: "Swanny's Pond", alt: '[broken image: a boat shaped like a bird]', unlock: { flag: 'read_E_pete' }, colour: '#4aa3ff' },
  { zone: 'lighthouse', label: 'The Light on the Cliff', alt: '[broken image: a tall thing with a hat of light]', unlock: { flag: 'read_E_strange' }, colour: '#ffcf3a' },
  { zone: 'brokenHome', label: 'The 11:11 Room', alt: '[broken image: a clock with both hands on 11]', unlock: { flag: 'boss_defeated' }, colour: '#ff8cff' },
  { zone: 'terminal', label: 'The Terminal', alt: '[broken image: a blinking cursor, waiting]', unlock: { flag: 'e404_open' }, colour: '#4cff7a' },
  { zone: 'forest', label: 'The Forest', alt: '[broken image: something green, thinking]', unlock: { flag: 'lake_solved' }, colour: '#3ab55a' },
  { zone: 'dungeon', label: 'Vending Machine Dungeon', alt: '[broken image: a glowing rectangle of cola]', unlock: { flag: 'e404_open' }, colour: '#ff4a6a' },
  { zone: 'tasmania', label: 'Tasmania', alt: '[broken image: the bottom of the world]', unlock: { flag: 'postcard_decoded' }, colour: '#b08aff' },
];

export interface SniffFind {
  id: string;
  when?: Cond;
  text: string;
  item?: string;
  hits?: number;
}

/** what a trusting creature digs up, per zone (each once) */
export const SNIFFS: Record<string, SniffFind[]> = {
  lake: [
    { id: 'sniff_lake_token', text: 'It dives into the reeds and comes back with a Broken Vending-Machine Token and a look of immense pride.', item: 'token_broken' },
    { id: 'sniff_lake_visitor', text: 'It pecks at the mud. A tiny waving visitor was buried there. +11 visitors.', hits: 11 },
  ],
  lighthouse: [
    { id: 'sniff_light_receipt', text: 'It drags a crumpled receipt out from under the keeper’s chair. It is for Nothing. It is itemised.', item: 'receipt' },
    { id: 'sniff_light_visitor', text: 'It stares at one particular rock until you look too. A visitor is hiding behind it. +11 visitors.', hits: 11 },
  ],
  home: [{ id: 'sniff_home_visitor', text: 'It stares at the hit counter until a visitor falls out of the digits. +11 visitors.', hits: 11 }],
  construction: [{ id: 'sniff_cons_tape', text: 'It digs in the sand pit and pulls out a half-used roll of Duct Tape. Bob pretends not to notice.', item: 'duct_tape' }],
  tasmania: [
    { id: 'sniff_tas_snack', text: 'It trots along the tideline and returns with a Suspicious 7-Eleven Snack, salt-washed, still sealed. Its pride is total.', item: 'snack_711' },
    { id: 'sniff_tas_visitor', text: 'It stares at a rock pool until a visitor, up to the knees, looks up. +11 visitors.', hits: 11 },
  ],
  forest: [
    { id: 'sniff_forest_mushroom', text: 'It noses through the leaf litter and comes up with a speckled mushroom, held very proudly in its beak.', item: 'forest_mushroom' },
    { id: 'sniff_forest_visitor', text: 'It stares up a tree until a visitor, caught, climbs down. +11 visitors.', hits: 11 },
  ],
  dungeon: [{ id: 'sniff_dungeon_snack', text: 'It sniffs out a Suspicious 7-Eleven Snack, wedged behind a server rack. It looks very pleased with itself.', item: 'snack_711' }],
};

ZONES.dev = {
  id: 'dev',
  title: '/dev/',
  url: 'http://www.cybercities.com/AreaFiftyOne/Vault/1111/dev/',
  pageTitle: 'Index of /dev/',
  ambience: 'static',
  music: 'none',
  hint: [{ text: 'Somebody left their workspace open.' }],
};
