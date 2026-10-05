import { game } from '../core/runtime';
import { BOB } from '../data/dialogue';
import { grantMemory } from '../systems/effects';
import { addItem, removeItem } from '../systems/inventory';
import { addVisitors } from '../systems/hits';
import type { CheckDef } from '../systems/dice';
import { isSuccess } from '../systems/dice';
import { runDialogue } from '../ui/dialogue';
import { openCheck } from '../ui/dice';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { scene } from '../ui/scene';
import { paintConstruction } from '../ui/scenes';
import { footer, pageHeader, ringBar, underConstructionBar } from './pageKit';

const FRIDGE_CHECK: CheckDef = {
  id: 'fridge',
  title: 'Something is humming behind the tape',
  stat: 'observation',
  dc: 8,
  text: 'The barrier tape is not keeping anything out. There is a white rectangle behind it, and it is humming a very small tune.',
  approaches: [
    { id: 'look', label: 'Squint at it properly', stat: 'observation', text: 'Notice the detail you were not supposed to notice.' },
    { id: 'duck', label: 'Duck under the tape', stat: 'curiosity', text: 'What does this tape do, exactly?' },
    { id: 'bold', label: 'Just walk up like you own it', stat: 'courage', dcMod: 1, text: 'Nobody questions a person who walks like they have somewhere to be.' },
  ],
};

async function investigateFridge(): Promise<void> {
  const g = game();
  if (g.has('fridge_opened')) {
    toast('The mini fridge is empty now. It hums, smugly.', 'funny');
    return;
  }
  const out = await openCheck(FRIDGE_CHECK);
  if (!out) return;
  if (isSuccess(out.result.outcome)) {
    g.state.flags.fridge_opened = true;
    toast('A mini fridge. Inside: one yoghurt, plain, and a sticky note on the lid.', 'item');
    addItem(g, 'yoghurt', 1);
    grantMemory(g, 'NOTE_001');
    if (out.result.outcome === 'crit') {
      addVisitors(g, 11, 'a hidden visitor was in the fridge');
      toast('And a tiny visitor, hiding in the butter compartment. +11 visitors.', 'funny');
    }
  } else if (out.result.outcome === 'critFail') {
    g.state.vitals.hp = Math.max(1, g.state.vitals.hp - 1);
    toast('You walk into the tape. The tape wins. -1 HP.', 'bad');
  } else {
    toast('Just tape. And a hum. Maybe look harder, or differently.', 'info');
  }
  refreshView();
}

async function talkBob(): Promise<void> {
  await runDialogue(BOB);
  refreshView();
}

function render(): HTMLElement {
  const g = game();
  const fridgeFound = g.has('fridge_opened');
  const sc = scene({
    zone: 'construction',
    width: 320,
    height: 180,
    paint: (ctx, w, hh) => paintConstruction(ctx, w, hh),
    caption: 'A sandy building site. A worker leans on a shovel. Barrier tape surrounds something that hums.',
    hotspots: [
      {
        id: 'bob', label: 'Bob (not THAT Bob)', x: 42, y: 56, w: 12, h: 38, kind: 'npc', hint: 'A construction worker. He appreciates coffee.',
        onClick: talkBob,
        onItem: (item) => {
          if (item === 'coffee' && !g.has('bob_coffee_given')) {
            removeItem(g, 'coffee', 1);
            void runDialogue({ ...BOB, start: 'coffee' }).then(refreshView);
            return true;
          }
          toast('Bob looks at it politely. "Not coffee," he says. "Coffee is the thing."', 'funny');
          return false;
        },
      },
      { id: 'fridge', label: fridgeFound ? 'Mini fridge (empty)' : 'Something humming behind the tape', x: 69, y: 62, w: 12, h: 24, kind: 'object', onClick: investigateFridge, hint: 'Behind the barrier tape.' },
      { id: 'sign', label: 'The sign', x: 0, y: 44, w: 22, h: 20, onClick: () => toast('"UNDER CONSTRUCTION. Please pardon our dust." (The dust has been pardoned. It is still there.)', 'funny') },
      { id: 'sand', label: 'The sand pit', x: 6, y: 66, w: 26, h: 20, onClick: () => toast('There is sand. There are many individual grains of it.', 'funny') },
      { id: 'www', label: 'The half-built WWW', x: 59, y: 22, w: 32, h: 28, onClick: () => toast('A scaffold in the shape of the thing you are inside. It has been "almost finished" since 2001.', 'funny') },
    ],
  });
  return h(
    'div',
    { class: 'page construction-page' },
    pageHeader('UNDER CONSTRUCTION!!', "we're building something. we promise. it's a surprise."),
    underConstructionBar(),
    sc,
    h('p', { class: 'scene-text' }, 'Behind the barrier tape something is humming. The worker is not worried about it. The worker is never worried about anything.'),
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ringBar('construction'),
    footer(),
  );
}

registerZone({ id: 'construction', render });
