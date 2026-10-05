import { game } from '../core/runtime';
import { audio } from '../audio/audioManager';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone } from '../ui/router';
import { icon } from '../ui/sprites';
import { held, setHeld } from '../ui/held';
import { hasItem } from '../systems/inventory';
import { addVisitors } from '../systems/hits';

function face(): string {
  const v = game().state.visitors;
  if (v >= 500) return ':)';
  if (v >= 250) return ':|';
  return ':(';
}

function openDoor(): void {
  const g = game();
  if (!hasItem(g, 'key')) {
    toast('It is locked. The lock is very small. You are almost sure that what it needs is also very small, and probably useless.', 'info');
    return;
  }
  if (!g.has('e404_open')) {
    g.state.flags.e404_open = true;
    g.state.flags.key_opened = true;
    addVisitors(g, 111, 'page found');
    audio.sfx('door');
    toast('The World’s Least Useful Key turns, with the smug click of a thing that has been waiting its whole life. It is no longer useless. It would be insufferable about this, but it is a key.', 'magic');
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
            const item = held();
            if (item === 'key') { setHeld(null); return openDoor(); }
            if (open) return navigate('dungeon');
            openDoor();
          } }, icon('key', 72)),
      ),
      h('p', {}, open ? 'It is open. It has always been open. It was waiting for someone to say so.' : 'There is a lock. It is small. It was made for something small, and probably useless.'),
      open ? btn('▶ ENTER', () => navigate('dungeon'), 'go big', { dataset: { fk: 'enter' } }) : btn('Try the key', () => openDoor(), 'small', { disabled: !hasItem(g, 'key'), dataset: { fk: 'trykey' } }),
      h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ),
  );
}

registerZone({ id: 'e404', render });
