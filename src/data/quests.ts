import type { Cond, Effect } from '../core/types';

export interface QuestStep {
  text: string;
  done: Cond;
  /** a nudge, shown only for the active step */
  hint?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  blurb: string;
  /** hidden quests do not show their title until started */
  hidden?: boolean;
  start: Cond;
  steps: QuestStep[];
  reward: Effect[];
  doneText: string;
  failIf?: Cond;
  failText?: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q_visitor',
    title: 'Visitor #73',
    blurb: 'You found an abandoned homepage. It is not quite abandoned.',
    start: { flag: 'game_started' },
    steps: [
      { text: 'Look around the homepage.', done: { flag: 'visited_home' } },
      { text: 'Read the guestbook.', done: { flag: 'visited_guestbook' }, hint: 'There is a link for it on the homepage. Of course there is.' },
      { text: 'Find something that is not under construction.', done: { any: [{ has: 'yoghurt' }, { has: 'swan_ticket' }, { flag: 'ate_yoghurt' }] }, hint: 'Hidden things usually sit in guestbook attachments or behind police tape.' },
    ],
    reward: [{ t: 'hits', by: 20, why: 'got into it' }],
    doneText: 'You are playing a game. You are not sure when that started.',
  },
  {
    id: 'q_pedalo',
    title: 'Wind Up the Swans',
    blurb: 'pedalo_pete says the swan boats still run, if you wind them up.',
    start: { flag: 'read_E_pete' },
    steps: [
      { text: 'Somebody left a ticket for the swan boats.', done: { any: [{ has: 'swan_ticket' }, { flag: 'boat_ridden' }] }, hint: 'Guestbook entries sometimes come with attachments.' },
      { text: 'Find the pond.', done: { flag: 'visited_lake' }, hint: 'A broken image in the webring has a swan-shaped alt text.' },
      { text: 'Go for a pedal.', done: { flag: 'boat_ridden' }, hint: 'The dock clerk is very serious about tickets.' },
      { text: 'Remember the song.', done: { flag: 'lake_solved' }, hint: 'You only have to listen. Then do what the water did.' },
    ],
    reward: [{ t: 'hits', by: 60, why: 'swan-boat quest' }],
    doneText: 'The swans are wound up. The lake is a little less lonely.',
  },
  {
    id: 'q_forest',
    title: 'The Foxfire Trail',
    blurb: 'A nature fan page, three forks, and something that has been counting.',
    start: { flag: 'visited_forest' },
    steps: [
      { text: 'Say hello to whoever lives in the woods.', done: { flag: 'fern_met' }, hint: 'Look for the lantern near the stump.' },
      { text: 'Follow the trail to the clearing.', done: { flag: 'oak_found' }, hint: 'The foxfire only shows the way after dark.' },
      { text: 'Count the rings of the Old Oak.', done: { flag: 'tree_ring_taken' }, hint: 'Observation, patience, or just ask the tree.' },
    ],
    reward: [{ t: 'card', id: 'old_oak' }, { t: 'hits', by: 70, why: 'forest quest' }],
    doneText: 'The woods know your name now. They are not going to say it.',
  },
  {
    id: 'q_tas',
    title: 'Greetings from the Bottom of the World',
    blurb: 'Two photographs, five changes, and a sky that only answers after dark.',
    start: { flag: 'visited_tasmania' },
    steps: [
      { text: 'Meet whoever lives on the rocks.', done: { flag: 'devil_met' }, hint: 'Small, furious, near the noticeboard.' },
      { text: 'Find the five changes between the photographs.', done: { flag: 'tas_diffs' }, hint: 'Click on the right-hand photograph where something is new.' },
      { text: 'Tell the sky what it wants to hear.', done: { flag: 'tas_aurora' }, hint: 'The five letters, left to right. After dark.' },
    ],
    reward: [{ t: 'card', id: 'aurora' }, { t: 'hits', by: 80, why: 'bottom of the world' }],
    doneText: 'The sky answered, in capitals. It is a good sky.',
  },
  {
    id: 'q_peep',
    title: 'Something in the Reeds',
    blurb: 'It is peeping. It is tiny. It is absolutely a hero.',
    start: { flag: 'chocobo_noticed' },
    steps: [
      { text: 'Befriend whatever is in the reeds.', done: { flag: 'creature_met' }, hint: 'Food, patience, a gentle hand. Not necessarily in that order.' },
      { text: 'Earn its trust.', done: { creature: { id: 'chocobo', field: 'trust', gte: 25 } }, hint: 'Feed it. Pet it. Do not feed it sludge.' },
    ],
    reward: [
      { t: 'card', id: 'peep' },
      { t: 'stat', stat: 'nurture', by: 1 },
      { t: 'hits', by: 50, why: 'someone loves you' },
    ],
    doneText: 'It rides on your shoulder now. It thinks it is carrying you.',
  },
  {
    id: 'q_light',
    title: 'Where the Light Waits',
    blurb: 'A guestbook entry that should not exist says you know where the light waits.',
    start: { flag: 'read_E_strange' },
    steps: [
      { text: 'Work out who wrote the strange entry.', done: { flag: 'deduction_solved' }, hint: 'People have tells. Look at how things are written, not what is written.' },
      { text: 'Find the light.', done: { flag: 'visited_lighthouse' }, hint: 'One webring site looks like a cliff and a lamp.' },
      { text: 'Wake the lamp.', done: { flag: 'lamp_lit' }, hint: 'Marl says it is only stuck. Or you could just bring him something he has missed.' },
      { text: 'Read the postcard properly.', done: { flag: 'postcard_decoded' }, hint: 'Some inks only talk under the right kind of light.' },
    ],
    reward: [{ t: 'hits', by: 60, why: 'the light is on' }],
    doneText: 'The light is on. The postcard said what it needed to say.',
  },
  {
    id: 'q_yoghurt',
    title: 'One Extremely Important Yoghurt',
    blurb: 'It says DO NOT EAT. Nobody has told you why.',
    hidden: true,
    start: { flag: 'has_had_yoghurt' },
    failIf: { flag: 'ate_yoghurt' },
    failText: 'You ate it. It was delicious. This is a different kind of story now.',
    steps: [
      { text: 'It is for someone.', done: { know: 'yoghurt_has_destination' } },
      { text: 'Find who has been waiting.', done: { flag: 'marl_asked_yoghurt' }, hint: 'Both Gus and Marl have strong feelings about it.' },
      { text: 'Deliver it.', done: { flag: 'yoghurt_delivered' } },
    ],
    reward: [{ t: 'hits', by: 40, why: 'a delivery was made' }],
    doneText: 'Some errands are the whole point.',
  },
  {
    id: 'q_404',
    title: 'Page Found',
    blurb: '404 is not an error. It is an address.',
    start: { flag: 'clue_404' },
    steps: [
      { text: 'Open the page. Bring the useless key.', done: { flag: 'e404_open' }, hint: 'The broken link on the homepage knows you are looking.' },
      { text: 'Find your way through the dark.', done: { flag: 'maze_goal' }, hint: 'Notes lying around are worth reading. Boss Knowledge is just paying attention.' },
      { text: 'Face VM-1111.', done: { flag: 'boss_defeated' }, hint: 'Bring exact change. Bring a sense of humour.' },
    ],
    reward: [{ t: 'hits', by: 100, why: 'page found' }],
    doneText: 'The Vending Machine of Judgment has made its judgment. It was not what it expected.',
  },
  {
    id: 'q_counter',
    title: 'Who Is Visiting?',
    blurb: 'The counter is going up, and you are not doing all of it.',
    hidden: true,
    start: { visitors: 100 },
    steps: [
      { text: 'Reach 250 visitors.', done: { visitors: 250 } },
      { text: 'Reach 500 visitors.', done: { visitors: 500 } },
      { text: 'Reach 777 visitors.', done: { visitors: 777 } },
      { text: 'Reach 1,111 visitors.', done: { visitors: 1111 } },
    ],
    reward: [],
    doneText: '1,111. Somebody opened the door.',
  },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
