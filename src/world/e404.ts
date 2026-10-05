import { game } from '../core/runtime';
import { audio } from '../audio/audioManager';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone } from '../ui/router';
import { icon } from '../ui/sprites';
import { held, setHeld } from '../ui/held';
import { inspectMode, openInspector } from '../ui/inspector';
import { hasItem } from '../systems/inventory';
import { addVisitors } from '../systems/hits';
import { isSuccess, type CheckDef } from '../systems/dice';
import { openCheck } from '../ui/dice';
import { runDialogue } from '../ui/dialogue';
import { SALESMAN } from '../data/dialogue';
import { refreshView } from '../ui/router';

function face(): string {
  const v = game().state.visitors;
  if (v >= 500) return ':)';
  if (v >= 250) return ':|';
  return ':(';
}

const LOCK: CheckDef = {
  id: 'lock',
  title: 'The very small lock',
  stat: 'creativity',
  dc: 11,
  text: 'You do not have the key. You do have hands, and opinions about what a lock is for.',
  approaches: [
    { id: 'jimmy', label: 'Jimmy it with a token', stat: 'creativity', needs: { cond: { any: [{ has: 'token_broken' }, { has: 'token_mended' }] }, why: 'You need a small brass thing' }, text: 'A lock this size cannot tell a token from a key. Probably.' },
    { id: 'tape', label: 'Tape the latch open', stat: 'dadEnergy', dcMod: -1, needs: { cond: { has: 'duct_tape' }, why: 'You need Duct Tape' }, text: 'Not a solution. A resolution.' },
  ],
};

async function openDoor(): Promise<void> {
  const g = game();
  if (g.has('e404_open')) return void navigate('dungeon');
  if (!hasItem(g, 'key')) {
    const out = await openCheck(LOCK);
    if (!out) return;
    if (!isSuccess(out.result.outcome)) return void toast('The lock does not yield. It was made for something small, and probably useless.', 'info');
    g.state.flags.e404_open = true;
    g.state.flags.door_how = out.approach.id;
    g.state.flags.bug_found = true;
    addVisitors(g, 111, 'page found');
    audio.sfx('door');
    toast("That shouldn't have worked. The page opens, a little offended, a little impressed. The useless key, in your pocket, stays useless. For now.", 'magic');
    g.changed();
    return void navigate('dungeon');
  }
  if (!g.has('e404_open')) {
    g.state.flags.e404_open = true;
    g.state.flags.key_opened = true;
    g.state.flags.door_how = 'key';
    addVisitors(g, 111, 'page found');
    audio.sfx('door');
    toast('The World\u2019s Least Useful Key turns, with the smug click of a thing that has been waiting its whole life. It is no longer useless. It would be insufferable about this, but it is a key.', 'magic');
    g.changed();
  }
  navigate('dungeon');
}

function render(): HTMLElement {
  const g = game();
  const found = g.has('clue_404');
  if (!found) {
    return h(
      'div',
      { class: 'e404 lost' },
      h('div', { class: 'e404-box' },
        h('h1', {}, 'ERROR 404'),
        h('h2', {}, 'PAGE NOT FOUND ', face()),
        h('p', {}, 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.'),
        h('hr'),
        h('p', {}, 'Please try the following:'),
        h('ul', {},
          h('li', {}, 'Click the Refresh button, or try again later.'),
          h('li', {}, 'If you typed the page address in the Address bar, make sure that it is spelled correctly.'),
          h('li', {}, 'Open the home page, and then look for links to the information you want.'),
          h('li', {}, 'Stop looking for it. (It knows.)'),
        ),
        h('p', { class: 'e404-small' }, g.state.visitors >= 250 ? 'The server looked everywhere. (It is starting to suspect where.)' : 'The server looked everywhere. Except one place.'),
        h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
      ),
    );
  }
  const open = g.has('e404_open');
  return h(
    'div',
    { class: 'e404 found' },
    h('div', { class: 'e404-box' },
      h('h1', { class: 'blink-slow' }, 'PAGE FOUND.'),
      h('div', { class: 'keyhole-wrap' },
        h('button', { type: 'button', class: 'keyhole', ariaLabel: open ? 'Enter the page' : 'A very small lock', dataset: { fk: 'keyhole' },
          onclick: () => {
            if (inspectMode) return void openInspector('e404.page');
            const item = held();
            if (item === 'key') { setHeld(null); return void openDoor(); }
            if (open) return navigate('dungeon');
            void openDoor();
          } }, icon('key', 72)),
      ),
      h('p', {}, open ? 'It is open. It has always been open. It was waiting for someone to say so.' : 'There is a lock. It is small. It was made for something small, and probably useless.'),
      open ? btn('▶ ENTER', () => navigate('dungeon'), 'go big', { dataset: { fk: 'enter' } }) : btn(hasItem(g, 'key') ? 'Try the key' : 'Try the lock', () => openDoor(), 'small', { dataset: { fk: 'trykey' } }),
      open ? btn('A man is standing in the link. Talk to him.', () => { void runDialogue(SALESMAN).then(refreshView); }, 'small', { dataset: { fk: 'salesman' } }) : '',
      h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ),
  );
}

registerZone({ id: 'e404', render });
