import type { DTree } from './dialogueTypes';
import { freshness, removeItem } from '../systems/inventory';
import { ecoState } from '../systems/ecosystem';
import { hearRumor, nextRumor, rumorText } from '../systems/rumors';

// NPC conversation trees. Plain data + a few small hooks. Humour first; the
// tender bits are rationed, and they come out of objects, not speeches.

export const BOB: DTree = {
  id: 'bob',
  start: (g) => (g.has('bob_coffee_given') ? 'again' : 'greet'),
  nodes: {
    greet: {
      id: 'greet',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: "Pardon our dust! I've been pardoning it since 2001. You new?",
      choices: [
        { text: 'What are you building?', next: 'what' },
        { text: 'Got any duct tape?', next: 'tape' },
        { text: 'Heard anything lately?', next: 'rumor' },
        { text: '(Give him a coffee)', when: { has: 'coffee' }, next: 'coffee', action: (g) => removeItem(g, 'coffee', 1) },
        { text: 'Bye.', end: true },
      ],
    },
    what: {
      id: 'what',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: "A website! Mostly the bit you can't see yet. The webmaster's got plans. Phase three is a surprise. For someone. Not me. I just hold the tape.",
      next: 'greet',
    },
    tape: {
      id: 'tape',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: "Coffee first. Then tape. That's the Bob Rule. It's the only rule. I made it up this morning. Also in 2001.",
      next: 'greet',
    },
    coffee: {
      id: 'coffee',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: "Oh. Oh, you absolute legend. Here. Hold this. And have a joke for the road: why did the web developer leave the restaurant? ...Because of the table layout.",
      effects: [
        { t: 'flag', key: 'bob_coffee_given' },
        { t: 'item', id: 'duct_tape' },
        { t: 'card', id: 'dad_joke' },
        { t: 'stat', stat: 'dadEnergy', by: 1 },
      ],
      next: 'groan',
    },
    groan: {
      id: 'groan',
      who: 'You',
      text: 'You groan. It is an appreciative groan. Something in your chest unlocks: you are now carrying Dad Energy.',
      end: true,
    },
    rumor: {
      id: 'rumor',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      run: (g) => { const r = nextRumor(g, 'bob'); if (r) { hearRumor(g, r); g.state.flags.rumor_last = r.id; } },
      text: (g) => rumorText(g),
      next: 'greet',
    },
    again: {
      id: 'again',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: "Back again! Careful with that tape. It's load-bearing.",
      choices: [
        { text: 'Tell me another joke.', next: 'joke' },
        { text: 'Heard anything lately?', next: 'rumor' },
        { text: 'What is behind the tape?', next: 'behind' },
        { text: 'Got anything for somebody with real Dad Energy?', when: { all: [{ stat: 'dadEnergy', gte: 4 }, { notFlag: 'got_gloves' }] }, next: 'gloves' },
        { text: 'Bye.', end: true },
      ],
    },
    joke: {
      id: 'joke',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: "What do you call a fake noodle? ...An impasta. I'm here all week. I'm here every week.",
      next: 'again',
    },
    gloves: {
      id: 'gloves',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: "Four Dad Energy. FOUR. I haven't seen a four since the tape ran out in '02. Here: I made these. Don't ask what they were before. They were gloves. Now they are Gloves.",
      effects: [{ t: 'item', id: 'duct_tape_gloves' }, { t: 'flag', key: 'got_gloves' }],
      next: 'again',
    },
    behind: {
      id: 'behind',
      who: 'Bob (not THAT Bob)',
      portrait: 'portrait_bob',
      text: 'The tape? A mini fridge, mostly. It hums. I try not to ask it questions.',
      next: 'again',
    },
  },
};

export const GUS: DTree = {
  id: 'gus',
  start: (g) => (g.has('ride_pending') ? 'ticket' : 'greet'),
  nodes: {
    greet: {
      id: 'greet',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: (g) => {
        const base = "Swanny's Pond Swan-Boat Service. Open nine to five. Closed whenever. Tickets, please.";
        const c = g.flag('vm_choice');
        return c === 'refund' ? base + ' ...Odd. The vending machine under the page apologised to me this morning. It has never done that.' : c === 'prize' ? base + ' The swans are nervous. Somebody rolled something golden down there.' : c === 'wish' ? base + ' There was a chime at 11:11. The whole pond heard it. Not saying who.' : base;
      },
      choices: [
        { text: 'Can I ride a swan?', when: { not: { has: 'swan_ticket' } }, next: 'noticket' },
        { text: 'I have a ticket.', when: { has: 'swan_ticket' }, next: 'ticket' },
        { text: 'Tell me about the pond.', next: 'pond' },
        { text: 'Heard anything lately?', next: 'rumor' },
        { text: '(Show him the yoghurt)', when: { has: 'yoghurt' }, next: 'yoghurt' },
        { text: '(Show him the key)', when: { has: 'key' }, next: 'key' },
        { text: 'Never mind.', end: true },
      ],
    },
    noticket: {
      id: 'noticket',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: 'No ticket, no swan. Rules are rules. Pete used to leave stubs in a guestbook somewhere. Pete leaves stubs everywhere.',
      next: 'greet',
    },
    ticket: {
      id: 'ticket',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: "That's... oh. That's THE ticket. Nobody's used one of those in years. I thought it was decorative. It was not decorative. Hop on. Mind the gap. The gap is a lake.",
      choices: [
        { text: 'Board the swan.', effects: [{ t: 'flag', key: 'ride_requested' }], end: true },
        { text: 'Not yet.', end: true },
      ],
    },
    rumor: {
      id: 'rumor',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      run: (g) => { const r = nextRumor(g, 'gus'); if (r) { hearRumor(g, r); g.state.flags.rumor_last = r.id; } },
      text: (g) => rumorText(g),
      next: 'greet',
    },
    pond: {
      id: 'pond',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: (g) => {
        const eco = ecoState(g, 'lake', 'willow');
        const bully = eco === 'bare' ? ' And stop bullying that willow. It has nothing left.' : eco === 'thinning' ? ' And go easy on the willow. It is thinking about its life choices.' : '';
        return `The pads out in the middle only sing for someone who is actually out on the water. Sit on the shore all you like. They're shy.${bully}`;
      },
      effects: [{ t: 'know', id: 'gus_pads' }],
      next: 'greet',
    },
    yoghurt: {
      id: 'yoghurt',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: (g) =>
        freshness(g, 'yoghurt') === 'sentient'
          ? "...Is that... Tassie Valley? Plain? It's... evolving. Oh no. Don't let it near the swans. I know a man who would still weep at that. Up on the cliff. Marl. Don't tell him I said."
          : "...Is that... Tassie Valley? Plain? Sealed? Oh. OH. I know a man who'd weep at that. Up on the cliff, the lighthouse. Marl. Don't tell him I said anything. Don't tell him anything. He'll know.",
      effects: [{ t: 'flag', key: 'gus_yoghurt_seen' }],
      next: 'greet',
    },
    key: {
      id: 'key',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: 'Useless. Obviously. Found a key just like it in the pond once. Well. That one, actually. Where did you get... never mind.',
      next: 'greet',
    },
  },
};

export const GUS_GIFT: DTree = {
  id: 'gus_gift',
  start: 'gift',
  nodes: {
    gift: {
      id: 'gift',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: "Well, would you look at that. The pads haven't sung for anyone in years. Right. Before you go: found this in the pond ages ago. It's useless. You might as well have it.",
      effects: [
        { t: 'item', id: 'key' },
        { t: 'flag', key: 'key_given' },
      ],
      next: 'gift2',
    },
    gift2: {
      id: 'gift2',
      who: 'Gus, Swan-Boat Clerk',
      portrait: 'portrait_gus',
      text: "It's brass. It's small. It opens nothing. It opened nothing when I got it and it'll open nothing now. Lovely key, though.",
      end: true,
    },
  },
};

export const MARL: DTree = {
  id: 'marl',
  start: (g) => (g.has('yoghurt_delivered') ? 'after' : g.has('lamp_lit') ? 'lit' : 'greet'),
  nodes: {
    greet: {
      id: 'greet',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: (g) =>
        g.has('ate_yoghurt')
          ? "Don't touch anything. Mostly because nothing works. ...Is that yoghurt on your chin? Plain? Hm."
          : "Don't touch anything. Mostly because nothing works.",
      choices: [
        { text: 'What happened to the lamp?', next: 'lamp' },
        { text: 'Who are you?', next: 'who' },
        { text: 'Heard anything lately?', next: 'rumor' },
        { text: '(Show him the yoghurt)', when: { has: 'yoghurt' }, next: 'yoghurt' },
        { text: '(Show him the key)', when: { has: 'key' }, next: 'key' },
        { text: '(Show him the postcard)', when: { has: 'postcard' }, next: 'postcard' },
        { text: 'Bye.', end: true },
      ],
    },
    rumor: {
      id: 'rumor',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      run: (g) => { const r = nextRumor(g, 'marl'); if (r) { hearRumor(g, r); g.state.flags.rumor_last = r.id; } },
      text: (g) => rumorText(g),
      next: 'greet',
    },
    lamp: {
      id: 'lamp',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: "Not dead. Stuck. Been stuck since the November I stopped getting... never mind. She wants something stubborn. A bit of tape and bad manners.",
      effects: [{ t: 'know', id: 'marl_lamp_stuck' }],
      next: 'greet',
    },
    who: {
      id: 'who',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: "Marl. Keeper. Of what, I couldn't say. Of this, I suppose. Somebody has to hold the light up.",
      next: 'greet',
    },
    key: {
      id: 'key',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: 'Useless. Obviously. Why would you carry that?',
      next: 'greet',
    },
    postcard: {
      id: 'postcard',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: "Keep that out of my sight till the lamp's on. Ink like that doesn't like daylight. Doesn't like much, that sort of ink.",
      next: 'greet',
    },
    yoghurt: {
      id: 'yoghurt',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: (g) =>
        freshness(g, 'yoghurt') === 'sentient'
          ? "...Tassie Valley. Plain. Not vanilla. It's... evolved. Well. So have I."
          : '...Tassie Valley. Plain. Not vanilla. Someone used to bring me one every November. Never said why. I never asked.',
      effects: [{ t: 'flag', key: 'marl_asked_yoghurt' }],
      choices: [
        { text: "It's yours.", next: 'give', action: (g) => removeItem(g, 'yoghurt', 1) },
        { text: 'Not yet.', next: 'greet' },
      ],
    },
    give: {
      id: 'give',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: "...Thank you. Right. Let's see whether she remembers how.",
      effects: [
        { t: 'flag', key: 'yoghurt_delivered' },
        { t: 'flag', key: 'lamp_lit' },
        { t: 'flag', key: 'lamp_how', value: 'yoghurt' },
        { t: 'memory', id: 'MEMORY_002' },
      ],
      next: 'give2',
    },
    give2: {
      id: 'give2',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: 'There. Warm. Look at her go. Sit a minute, kid. Mind the glass. Here. Take the coat off the hook, it is cold on the cliff and I have two. I will tell you something about Novembers, and you will pretend it is about yoghurt.',
      effects: [{ t: 'item', id: 'keepers_coat' }, { t: 'flag', key: 'got_coat' }],
      end: true,
    },
    lit: {
      id: 'lit',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: (g) => g.flag('lamp_how') === 'token' ? 'Lamp is on. A vending token for a fuse. Resourceful. Also, you owe a machine somewhere a token.' : g.flag('lamp_how') === 'kick' ? 'Lamp is on. You kicked it. It is a lamp, not a vending machine. ...It worked. Do not do that again.' : 'Lamp is on. Duct tape. I knew a man who would have approved. Do not smudge the glass.',
      choices: [
        { text: '(Give him the yoghurt)', when: { has: 'yoghurt' }, next: 'yoghurt' },
        { text: 'Who was the man?', next: 'man' },
        { text: '(Ask about the coat on the hook)', when: { all: [{ flag: 'lamp_how', is: 'tape' }, { notFlag: 'got_coat' }] }, next: 'coat_tape' },
        { text: 'Bye.', end: true },
      ],
    },
    coat_tape: {
      id: 'coat_tape',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: "That coat? Belonged to a man who also fixed things with tape. Take it. You two deserve each other.",
      effects: [{ t: 'item', id: 'keepers_coat' }, { t: 'flag', key: 'got_coat' }],
      next: 'lit',
    },
    man: {
      id: 'man',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: "Talked to himself while he built things. Wrote 'w' on everything. Never stayed for tea. Anyway.",
      next: 'lit',
    },
    after: {
      id: 'after',
      who: 'Marl, Keeper',
      portrait: 'portrait_marl',
      text: 'Come by in November. Bring nothing. I will make tea.',
      end: true,
    },
  },
};

const SAL = { who: 'The Dead Link Salesman', };

/** A merchant who only deals in things that no longer work. Prices are odd on purpose. */
export const SALESMAN: DTree = {
  id: 'salesman',
  start: (g) => (g.has('sal_met') ? 'back' : 'greet'),
  nodes: {
    greet: { id: 'greet', ...SAL, text: "Ah. A click. A real one. Nobody has clicked me since the page was archived. Welcome to the stall. Everything here is guaranteed to be exactly as broken as advertised.", effects: [{ t: 'flag', key: 'sal_met' }], next: 'menu' },
    back: { id: 'back', ...SAL, text: 'You came back! A repeat visit. I will note it in the log. I do not have a log.', next: 'menu' },
    menu: {
      id: 'menu', ...SAL, text: 'Browse. Nothing refundable, everything haunted.',
      choices: [
        { text: 'A jar with something flickering in it (Floppy + Receipt)', when: { all: [{ not: { has: 'glitch_sprite' } }, { has: 'floppy' }, { has: 'receipt' }] }, next: 'sprite_deal', once: 'sal_sprite_bought' },
        { text: 'A jar with something flickering in it (haggle)', when: { all: [{ not: { has: 'glitch_sprite' } }, { has: 'floppy' }, { not: { has: 'receipt' } }] }, check: { def: { id: 'haggle', title: 'Haggling', stat: 'luck', dc: 11, text: 'You have the floppy. He wants a receipt. You have a face.' }, ok: 'sprite_cheap', fail: 'sprite_no' } },
        { text: 'Sell me what the machine hates (a Suspicious Snack)', when: { all: [{ has: 'snack_711' }, { not: { know: 'vm_dad_jokes' } }] }, next: 'rumour_deal' },
        { text: 'What is the jar, exactly?', when: { not: { has: 'glitch_sprite' } }, next: 'sprite_info' },
        { text: 'Goodbye.', end: true },
      ],
    },
    sprite_info: { id: 'sprite_info', ...SAL, text: "A Glitch Sprite. A bug that got ideas. Hold it in a fight and it will skip one hit for you. It also bleeds corruption onto you, unless you have good goggles. Floppy and a receipt. I like old things that never lead anywhere.", next: 'menu' },
    sprite_deal: { id: 'sprite_deal', ...SAL, text: 'Sold! Do not open the lid. (Open the lid. Wear it, it is happier near people.)', effects: [{ t: 'item', id: 'glitch_sprite' }, { t: 'flag', key: 'sal_sprite_bought' }], run: (g) => { removeItem(g, 'floppy', 1); removeItem(g, 'receipt', 1); }, next: 'menu' },
    sprite_cheap: { id: 'sprite_cheap', ...SAL, text: 'The floppy alone? ...Fine. You haggle like a dead link, relentless and pointless. Take it.', effects: [{ t: 'item', id: 'glitch_sprite' }, { t: 'flag', key: 'sal_sprite_bought' }], run: (g) => removeItem(g, 'floppy', 1), next: 'menu' },
    sprite_no: { id: 'sprite_no', ...SAL, text: 'No. A receipt or nothing. This is a respectable stall, in a way.', next: 'menu' },
    rumour_deal: { id: 'rumour_deal', ...SAL, text: 'A snack! The machine at the end of the dark hates one thing above all: puns. Make it groan and it will wince for you. There. Now you know. Nothing is free except being wrong.', effects: [{ t: 'know', id: 'vm_dad_jokes' }], run: (g) => removeItem(g, 'snack_711', 1), next: 'menu' },
  },
};

export const TREES: Record<string, DTree> = { bob: BOB, gus: GUS, gus_gift: GUS_GIFT, marl: MARL, salesman: SALESMAN };
