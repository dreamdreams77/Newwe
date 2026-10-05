import { game } from '../core/runtime';
import { MARL } from '../data/dialogue';
import { timeOfDay } from '../core/timeSystem';
import { isSuccess, type CheckDef } from '../systems/dice';
import { hasItem } from '../systems/inventory';
import { grantMemory } from '../systems/effects';
import { changeVital } from '../systems/stats';
import { removeItem } from '../systems/inventory';
import { activeCreature, canSniff } from '../systems/creatures';
import { runDialogue } from '../ui/dialogue';
import { openCheck } from '../ui/dice';
import { openCryptogram } from '../ui/puzzle/cryptogram';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { scene } from '../ui/scene';
import { paintLighthouse } from '../ui/scenes';
import { audio } from '../audio/audioManager';
import { footer, pageHeader, ringBar } from './pageKit';
import { sniffAround } from './sniff';

const LAMP: CheckDef = {
  id: 'lamp',
  title: 'The lamp is stuck',
  stat: 'dadEnergy',
  dc: 9,
  text: 'The lamp room is cold and smells of old oil. Something inside the mechanism is wedged. Marl said she wants "something stubborn".',
  approaches: [
    { id: 'tape', label: 'Duct-tape the mechanism', stat: 'dadEnergy', careful: true, needs: { cond: { has: 'duct_tape' }, why: 'You need Duct Tape' }, text: 'This should not work. It will, probably.' },
    { id: 'jury', label: 'Jury-rig it with a token', stat: 'creativity', minStat: 4, dcMod: 2, needs: { cond: { any: [{ has: 'token_broken' }, { has: 'token_mended' }] }, why: 'You need a vending-machine token' }, text: 'A small brass disc, wedged in the right place, makes a very decent fuse.' },
    { id: 'kick', label: 'Climb up and kick it', stat: 'courage', dcMod: 3, text: 'Outside. In the wind. With a boot. Bold.' },
  ],
};

async function talkMarl(start?: string): Promise<void> {
  await runDialogue(start ? { ...MARL, start } : MARL);
  refreshView();
}

async function fixLamp(): Promise<void> {
  const g = game();
  if (g.has('lamp_lit')) return void toast('The lamp is on. The glass hums. The beam sweeps the water like a slow, kind idea.', 'info');
  const out = await openCheck(LAMP);
  if (!out) return;
  if (isSuccess(out.result.outcome)) {
    g.state.flags.lamp_lit = true;
    if (out.approach.id === 'tape' && hasItem(g, 'duct_tape')) removeItem(g, 'duct_tape', 1);
    audio.sfx('eleven');
    toast(out.result.outcome === 'crit' ? 'The lamp comes on with a sound like a very large cat being delighted. The beam makes the whole sea look like a postcard.' : 'The lamp shudders, thinks about it, and comes on. Warm white light, sweeping the water.', 'magic');
    g.changed();
  } else {
    if (out.approach.id === 'kick') {
      changeVital(g, 'hp', -3);
      toast('You kick it. It kicks back. -3 HP. The wind laughs.', 'bad');
    } else toast('It does not budge. The mechanism looks smug. Try a different angle, or ask Marl what she misses.', 'info');
  }
  refreshView();
}

async function lampWithItem(item: string): Promise<boolean> {
  const g = game();
  if (item === 'postcard') {
    if (!g.has('lamp_lit')) {
      toast('The lamp is dark. The glossy ink stays glossy, a bit smug.', 'funny');
      return false;
    }
    if (!g.has('postcard_uv')) {
      g.state.flags.postcard_uv = true;
      toast('Under the lamp, the glossy ink on the sea lights up: not a picture, a message.', 'magic');
      audio.sfx('wish');
      g.changed();
    }
    await openCryptogram();
    refreshView();
    return false; // the postcard is kept
  }
  if (item === 'duct_tape' || item === 'token_broken' || item === 'token_mended') {
    await fixLamp();
    return false;
  }
  toast('The lamp does not need that.', 'info');
  return false;
}

async function openBook(withLeaf: boolean): Promise<void> {
  const g = game();
  if (!withLeaf) {
    toast("The keeper's book falls open on a half-finished crossword. 7 across: 'a place to find answers (3)'. Someone has written WEB in pen. It is wrong. It is also right. The book wants a bookmark.", 'funny');
    return;
  }
  if (!g.has('book_key_known')) {
    g.state.flags.book_key_known = true;
    toast('The willow leaf slips between the pages like it grew there. The book opens to page 11: a table of swapped letters, headed with one word: WILLOW.', 'magic');
    g.changed();
  } else toast('The leaf holds the page. Page 11: a table headed WILLOW.', 'info');
  if (g.has('postcard_uv') && !g.has('postcard_decoded')) await openCryptogram();
  refreshView();
}

async function pinnedPhoto(): Promise<void> {
  const g = game();
  if (!g.has('lamp_lit')) return void toast('Something is pinned by the lamp, but the lamp is dark and the photo is just a pale rectangle.', 'info');
  if (g.state.memories.includes('PHOTO_001')) return void toast('A polaroid of this very lighthouse, slightly crooked. You already have it.', 'info');
  grantMemory(g, 'PHOTO_001');
  refreshView();
}

function render(): HTMLElement {
  const g = game();
  const tod = timeOfDay(g.state.clock.minutes);
  const lit = g.has('lamp_lit');
  const pet = activeCreature(g);
  const sc = scene({
    zone: 'lighthouse',
    width: 320,
    height: 180,
    className: lit ? 'lamp-on' : 'lamp-off',
    paint: (ctx, w, hh) => paintLighthouse(ctx, w, hh, tod, lit),
    caption: `A lighthouse on a cliff at ${tod}, a keeper's hut, and a table with a book. The lamp is ${lit ? 'on' : 'dark'}.`,
    hotspots: [
      {
        id: 'marl', label: 'Marl, Keeper', x: 17, y: 56, w: 8, h: 20, kind: 'npc', hint: 'Does not like visitors. Likes yoghurt.',
        onClick: () => talkMarl(),
        onItem: (item) => {
          if (item === 'yoghurt') { void talkMarl('yoghurt'); return true; }
          if (item === 'key') { void talkMarl('key'); return false; }
          if (item === 'postcard') { void talkMarl('postcard'); return false; }
          return false;
        },
      },
      { id: 'lamp', label: lit ? 'The lamp (on)' : 'The lamp (stuck)', x: 26, y: 2, w: 20, h: 22, onClick: fixLamp, hint: 'The lamp at the top of the tower.', onItem: (item) => { void lampWithItem(item); return false; } },
      { id: 'tower', label: 'The tower', x: 25, y: 24, w: 14, h: 40, onClick: () => toast('A tall white tower, with red stripes that were put on very carefully by someone who cared about stripes.', 'funny') },
      { id: 'book', label: "The keeper's puzzle book", x: 48, y: 61, w: 8, h: 6, onClick: () => openBook(false), hint: 'A paperback on the table.', onItem: (item) => { if (item === 'willow_leaf') { void openBook(true); return false; } toast('That does not make a very good bookmark.', 'funny'); return false; } },
      ...(lit ? [{ id: 'photo', label: 'A photo pinned by the lamp', x: 40, y: 10, w: 6, h: 8, onClick: pinnedPhoto, hint: 'Something pinned beside the lamp.' }] : []),
      { id: 'sea', label: 'The sea', x: 62, y: 56, w: 38, h: 44, onClick: () => toast(tod === 'night' ? 'The sea is a black mirror with a lamp in it.' : 'The sea does what the sea does. Mostly it looks at you and then at the horizon.', 'funny') },
      { id: 'gull', label: 'A gull', x: 46, y: 8, w: 8, h: 6, onClick: () => toast('A gull looks at you. It has seen things. It would like to tell you, but it is a gull.', 'funny') },
    ],
  });
  const petRow = pet && canSniff(pet) ? btn(`${pet.name}, go sniff around`, () => (sniffAround(), refreshView()), 'small') : null;
  return h(
    'div',
    { class: 'page lighthouse-page' },
    pageHeader('The Light On The Cliff', 'est. who knows. keeper: marl. please do not touch.'),
    sc,
    h('p', { class: 'scene-text' }, lit ? 'The lamp is on. The beam goes out over the water and, you think, comes back with something.' : 'The tower stands over the cliff like a tall, tired question. Its lamp is dark. A small man in a hat stands near the hut as if guarding it from tourists.'),
    petRow ? h('div', { class: 'back-link' }, petRow) : '',
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ringBar('lighthouse'),
    footer(),
  );
}

registerZone({ id: 'lighthouse', render });
