import { game } from '../core/runtime';
import { FERN } from '../data/dialogue';
import { timeOfDay } from '../core/timeSystem';
import { ecoRule, ecoState, harvest, stockOf } from '../systems/ecosystem';
import { addItem } from '../systems/inventory';
import { activeCreature, canSniff } from '../systems/creatures';
import { passTime } from '../systems/actions';
import { grantMemory } from '../systems/effects';
import { isSuccess, type CheckDef } from '../systems/dice';
import { FORKS, foxfireOut, forkHint, minutesToDusk, trailStep, waitForDusk, walk } from '../systems/forest';
import { runDialogue } from '../ui/dialogue';
import { openCheck } from '../ui/dice';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { scene } from '../ui/scene';
import { paintForest } from '../ui/scenes';
import { openWindow } from '../ui/windows';
import { footer, pageHeader, ringBar } from './pageKit';
import { sniffAround } from './sniff';

const RINGS: CheckDef = {
  id: 'rings',
  title: 'How old is the Old Oak?',
  stat: 'observation',
  dc: 9,
  text: 'There is a cut low on the trunk, old and healed, where a slice once came away. The rings are very close together. You can count them, if you are patient. Or you can ask.',
  approaches: [
    { id: 'count', label: 'Count the rings, one at a time', stat: 'observation', careful: true, text: 'One, two, three... do not lose your place.' },
    { id: 'ask', label: 'Lean your forehead on the bark and ask', stat: 'nurture', dcMod: -1, text: 'Trees do not talk. They do, occasionally, answer.' },
    { id: 'memory', label: 'Remember what the carving said', stat: 'memory', dcMod: 1, minStat: 3, text: 'You know a number that goes with this tree.' },
  ],
};

async function pickMushrooms(): Promise<void> {
  const g = game();
  if (!harvest(g, 'forest', 'mushrooms')) return void toast('The ring is bare. The mushrooms will come back, slowly, if nobody is rude about it.', 'bad');
  addItem(g, 'forest_mushroom', 1);
  passTime(g, 3);
  const left = stockOf(g, 'forest', 'mushrooms');
  toast(left <= 0 ? 'You take the last one. The ring looks like a smile with a gap.' : 'A speckled mushroom. The tag on the stem says PROBABLY FINE.', left <= 0 ? 'bad' : 'item');
  refreshView();
}

function openTrail(): void {
  const g = game();
  if (g.has('oak_found')) return void toast('The path is open now, all the way to the clearing. It looks almost proud.', 'info');
  let msg = 'Three forks, one after another. Pick a way at each. Get one wrong and the woods will take you back to the start.';
  openWindow({
    id: 'trail',
    title: 'The trail',
    icon: 'sprout',
    className: 'alert trail-win',
    render: (b, w) => {
      const step = trailStep(g);
      const hint = forkHint(g, step);
      b.append(
        h('p', { class: 'enc-sub' }, `Fork ${Math.min(step + 1, FORKS)} of ${FORKS}`),
        h('p', {}, msg),
        h('p', { class: hint.reliable ? 'know' : 'unknown', role: 'status' }, hint.text),
        foxfireOut(g) ? '' : h('p', { class: 'tiny' }, 'It is not dark. Whatever is hiding in this wood is hiding better in the light.'),
        foxfireOut(g) ? '' : btn(`Sit on the stump until dusk (${Math.round(minutesToDusk(g) / 60 * 10) / 10} h)`, () => { waitForDusk(g); msg = 'You sit on the stump by the lantern. The light goes gold, then green, then the first pale sparks come up out of the moss.'; w.refresh(); refreshView(); }, 'small', { dataset: { fk: 'trail-wait' } }),
        h('div', { class: 'win-actions' },
          btn('◄ Left', () => go('L', w), 'go', { dataset: { fk: 'trail-L' } }),
          btn('Right ►', () => go('R', w), 'go', { dataset: { fk: 'trail-R' } }),
          btn('Turn back', () => w.close(), 'small'),
        ),
      );
    },
  });
  function go(d: 'L' | 'R', w: { refresh(): void; close(): void }): void {
    const res = walk(g, d);
    msg = res.text;
    if (res.done) {
      toast(res.text, 'magic');
      w.close();
      refreshView();
      return;
    }
    if (!res.ok) toast(res.text, 'bad');
    w.refresh();
    refreshView();
  }
}

async function oak(): Promise<void> {
  const g = game();
  if (!g.has('oak_found')) return void toast('The oak is somewhere past the third fork. The trail will not let you cheat, and neither will the oak.', 'info');
  if (g.has('tree_ring_taken')) return void toast('Eleven rings. You already know the number. The oak seems to have stopped waiting.', 'info');
  const out = await openCheck(RINGS);
  if (!out) return;
  if (!isSuccess(out.result.outcome)) {
    passTime(g, 4);
    return void toast('You lose count. You start again, slowly. The oak waits. It has the time.', 'info');
  }
  g.state.flags.tree_ring_taken = true;
  addItem(g, 'tree_ring', 1);
  grantMemory(g, 'FOREST_001');
  toast('Eleven. And the twelfth is only a feeling. A thin polished slice of the oak is in your hand, warm.', 'magic');
  refreshView();
}

async function talkFern(): Promise<void> {
  await runDialogue(FERN);
  refreshView();
}

function render(): HTMLElement {
  const g = game();
  const tod = timeOfDay(g.state.clock.minutes);
  const stock = stockOf(g, 'forest', 'mushrooms');
  const eco = ecoRule('forest', 'mushrooms')!;
  const state = ecoState(g, 'forest', 'mushrooms');
  const dark = foxfireOut(g);
  const pet = activeCreature(g);
  const sc = scene({
    zone: 'forest',
    width: 320,
    height: 180,
    className: `forest-scene shrooms-${state}`,
    paint: (ctx, w, hh) => paintForest(ctx, w, hh, tod, stock, eco.max, dark, g.has('oak_found')),
    caption: `The woods at ${tod}. Pines, a path that forks, a ring of mushrooms on the left, a signpost, a lantern by a tent on the right, and a large old oak.`,
    hotspots: [
      { id: 'shrooms', label: 'The mushroom ring', x: 8, y: 74, w: 24, h: 24, onClick: pickMushrooms, hint: `Pick a mushroom. The ring is ${state}.`, obj: 'forest.mushrooms' },
      { id: 'sign', label: g.has('oak_found') ? 'The trail (open)' : 'The signpost and the trail', x: 34, y: 52, w: 26, h: 46, onClick: openTrail, hint: dark ? 'The foxfire is out.' : 'Three forks ahead.', obj: 'forest.trail' },
      { id: 'oak', label: g.has('oak_found') ? 'The Old Oak' : 'The Old Oak (far)', x: 66, y: 22, w: 24, h: 52, onClick: oak, hint: 'Old, round, patient.', obj: 'forest.oak' },
      { id: 'fern', label: 'Fern, hermit', x: 83, y: 66, w: 14, h: 28, kind: 'npc', onClick: talkFern, hint: 'Lives by the lantern.' },
    ],
  });
  const sniff = pet && canSniff(pet) ? btn(`${pet.name}, go sniff around`, () => (sniffAround(), refreshView()), 'small') : null;
  return h(
    'div',
    { class: 'page forest-page' },
    pageHeader('~ the whispering woods ~', 'a nature fan page. i hug trees. sorry not sorry. est. 2002.'),
    sc,
    h('p', { class: 'scene-text' }, g.has('oak_found')
      ? 'The path to the clearing is open. The oak, at the end of it, has been counting since before the webring.'
      : dark ? 'It is dark, and the woods are lit from the inside. Pale green sparks drift across the path. They seem to be going somewhere.'
        : 'Pines, moss, a signpost that does not help. A lantern and a tent on the right. Somewhere past the third fork, something old.'),
    !dark ? h('div', { class: 'back-link' }, btn(`Sit on the stump until dusk (${Math.round(minutesToDusk(g) / 60 * 10) / 10} h)`, () => { waitForDusk(g); toast('You wait. The light goes gold, then green, and the foxfire wakes up.', 'magic'); refreshView(); }, 'small', { dataset: { fk: 'forest-wait' } })) : '',
    sniff ? h('div', { class: 'back-link' }, sniff) : '',
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ringBar('forest'),
    footer(),
  );
}

registerZone({ id: 'forest', render, guard: (g) => (g.has('lake_solved') ? null : 'That page does not load. Yet. (Maybe somebody should finish listening to a lake.)') });
