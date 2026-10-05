import type { Cond } from '../core/types';

// A guestbook entry is not just text. It can start a quest, hand you an item,
// reveal a webring site, carry a "tell" for the deduction puzzle, or change
// after you do something. Entries never say "go to the lighthouse".

export type TellId = 'lower' | 'ellipsis' | 'tilde' | 'caps' | 'bang' | 'slang' | 'formal';

export const TELL_LABEL: Record<TellId, string> = {
  lower: 'starts in lowercase, no capital',
  ellipsis: 'trails off with an ellipsis (...)',
  tilde: 'signs off with a tilde (~)',
  caps: 'SHOUTS in capitals',
  bang: 'stacks exclamation marks!!!',
  slang: 'uses chatspeak (u, lol)',
  formal: 'writes formally, with a sign-off',
};

export type Seg = string | { t: string; tell: TellId };

export interface Attachment {
  item: string;
  label: string;
  /** when the "edited" note and the attachment appear */
  when?: Cond;
}

export interface GuestEntry {
  id: string;
  name: string;
  from: string;
  date: string;
  mood: string;
  order: number; // higher = newer = shown first
  msg: Seg[];
  visible: Cond;
  attachment?: Attachment;
  /** extra text shown once a condition holds ("EDIT: ...") */
  edit?: { when: Cond; text: string };
  strange?: boolean;
  spam?: boolean;
}

export const GUEST_ENTRIES: GuestEntry[] = [
  {
    id: 'E_final',
    name: 'the webmaster',
    from: 'here',
    date: '11/11/2003 11:11 PM',
    mood: 'star',
    order: 90,
    visible: { flag: 'hits_1111' },
    msg: ['thank you for visiting. you were always on the list.', ' ~w'],
    strange: true,
  },
  {
    id: 'E_strange',
    name: '(no name)',
    from: 'localhost',
    date: '11/11/2003 11:11 PM',
    mood: 'ghost',
    order: 80,
    visible: { flag: 'lake_solved' },
    strange: true,
    msg: [{ t: 'you', tell: 'lower' }, ' know where the light waits', { t: '...', tell: 'ellipsis' }, ' ', { t: '~', tell: 'tilde' }],
  },
  {
    id: 'E_1111',
    name: 'Visitor #1111',
    from: 'somewhere later',
    date: '11/11/2111',
    mood: 'ghost',
    order: 70,
    visible: { stage: 2 },
    strange: true,
    msg: ["hi. you're early. the counter is counting something besides you. bring something to the water."],
  },
  {
    id: 'E_spam',
    name: 'CHEAP_WATCHEZ',
    from: 'Hong Kong?',
    date: '2003-06-30',
    mood: 'eyes',
    order: 60,
    visible: { visitors: 80 },
    spam: true,
    msg: ['BUY ROLEX!!! CLICK HERE!!! 90% OFF!!! LIMITED TIME (FOREVER)!!!'],
  },
  {
    id: 'E_tassie',
    name: 'tassie_tourist',
    from: 'Hobart, Tasmania',
    date: '2003-01-09',
    mood: 'smile',
    order: 50,
    visible: { flag: 'game_started' },
    msg: [
      'Greetings from the bottom of the world. The lighthouse down here is lovely and the wind is rude. I have enclosed a postcard. Mum says the ink is a bit much. ',
      { t: 'Regards, T.', tell: 'formal' },
    ],
    attachment: { item: 'postcard', label: 'Take the postcard' },
  },
  {
    id: 'E_sam',
    name: 'shinkansen_sam',
    from: 'Osaka',
    date: '2002-11-23',
    mood: 'wink',
    order: 40,
    visible: { flag: 'game_started' },
    msg: [{ t: 'great', tell: 'lower' }, ' page', { t: '!!', tell: 'bang' }, ' ', { t: 'u', tell: 'slang' }, " should add a train section. i rode the 11:11 shinkansen once. it didn't stop. :D"],
    edit: { when: { visitors: 250 }, text: 'EDIT: found my old ticket in a coat. It’s yours if you want it. Fine print is... a lot.' },
    attachment: { item: 'train_ticket', label: 'Take the ticket', when: { visitors: 250 } },
  },
  {
    id: 'E_pete',
    name: 'pedalo_pete',
    from: 'the pond, obviously',
    date: '2002-07-04',
    mood: 'grin',
    order: 30,
    visible: { flag: 'game_started' },
    msg: [
      { t: 'WOW', tell: 'caps' },
      { t: '!!!', tell: 'bang' },
      ' ',
      { t: 'COOL SITE', tell: 'caps' },
      ' ',
      { t: 'lol', tell: 'slang' },
      '. the swan boats at the pond STILL run if you wind them up. best pedalling of my LIFE. i left my old ticket stub in the box, ur welcome',
    ],
    attachment: { item: 'swan_ticket', label: 'Take the ticket stub' },
  },
  {
    id: 'E_wtest',
    name: 'w',
    from: 'localhost',
    date: '2001-03-14',
    mood: 'neutral',
    order: 20,
    visible: { flag: 'game_started' },
    msg: [{ t: 'test test', tell: 'lower' }, { t: '...', tell: 'ellipsis' }, ' is this thing on? ', { t: '~w', tell: 'tilde' }],
  },
  {
    id: 'E_welcome',
    name: 'the webmaster',
    from: 'here',
    date: '2001-03-12',
    mood: 'star',
    order: 10,
    visible: { flag: 'game_started' },
    msg: [{ t: 'WELCOME TO MY HOMEPAGE', tell: 'caps' }, { t: '!!!', tell: 'bang' }, ' sign the guestbook or i will know :)'],
  },
];

export const ENTRY_BY_ID = Object.fromEntries(GUEST_ENTRIES.map((e) => [e.id, e]));

/** the author of the strange entry, and the decoys */
export const DEDUCTION = {
  subject: 'E_strange',
  author: 'E_wtest',
  candidates: ['E_wtest', 'E_pete', 'E_sam', 'E_tassie'],
  needTells: 2,
  shared: ['lower', 'ellipsis', 'tilde'] as TellId[],
};

export const SIGN_PRESETS: Array<{ text: string; effect: 'curiosity' | 'luck' | 'chaos'; reply: string }> = [
  { text: 'hello?? is anybody here', effect: 'curiosity', reply: 'The page seems to listen a moment longer than it should.' },
  { text: 'cool page!!! love the stars', effect: 'luck', reply: 'A tiny star in the background twinkles at you. You decide it was a coincidence.' },
  { text: 'I read the fine print. I regret it.', effect: 'chaos', reply: 'Something under the page laughs, quietly, in HTML.' },
];
