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
  { zone: 'terminal', label: 'The Terminal', alt: '[broken image: a blinking cursor, waiting]', future: true, colour: '#4cff7a' },
  { zone: 'forest', label: 'The Forest', alt: '[broken image: something green, thinking]', future: true, colour: '#3ab55a' },
  { zone: 'vending', label: 'Vending Machine Dungeon', alt: '[broken image: a glowing rectangle of cola]', future: true, colour: '#ff4a6a' },
  { zone: 'tasmania', label: 'Tasmania', alt: '[broken image: the bottom of the world]', future: true, colour: '#b08aff' },
];
