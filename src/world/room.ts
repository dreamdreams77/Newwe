import { game } from '../core/runtime';
import { learn } from '../systems/effects';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { runBrokenHomepage } from '../ui/combat2';
import { footer, pageHeader, ringBar } from './pageKit';

/** The 11:11 Room: everything on the site, stacked and flickering. Home of the second boss. */
const CLUES: Array<{ id: string; label: string; text: string; know: string[] }> = [
  { id: 'banner', label: 'Study the banner', text: 'The UNDER CONSTRUCTION banner flickers the same way on both sides. Whatever is on the left is mirrored on the right. It has always been that way, it is just a thing that was never noticed.', know: ['bh_symmetry'] },
  { id: 'counter', label: 'Read the hit counter', text: 'The counter is honest, at least. Anyone who is in the guestbook has been counted. Anyone who is not counted is not a visitor.', know: ['bh_counter'] },
  { id: 'source', label: 'Look at the page source', text: 'Hidden at the top of the source: a comment. <!-- favourite number: 11 -->. And below it, scrawled by a hand that loved ciphers: "push each letter forward by it".', know: ['bh_shift', 'w_loved_eleven'] },
  { id: 'keys', label: 'Listen to the music', text: 'There is a tune under all of it. Four notes. You find you can hum it again, if you concentrate, as often as you can remember.', know: ['bh_replay'] },
  { id: 'windows', label: 'Press your hand to the windows', text: 'Every page you have visited is here, stacked. None of them is angry. They are trying to remember, and they are tired. You find you are not trying to fix it. You are trying to be there.', know: ['bh_beloved'] },
];

function render(): HTMLElement {
  const g = game();
  const done = g.has('bh_defeated');
  const tried = CLUES.filter((c) => c.know.every((k) => g.state.knowledge.includes(k))).length;
  return h(
    'div',
    { class: 'room-page' },
    pageHeader('~*~ The 11:11 Room ~*~', 'every page you have visited, at once'),
    h('div', { class: 'room-box' },
      h('p', {}, done
        ? 'The page is still, now. It flickers like a held breath. In one window, someone is waving.'
        : 'The room is every page you have ever visited, stacked and flickering. It is not hostile. It is trying very hard to remember what it was, and getting it wrong in new ways each time.'),
      h('h2', {}, 'Look around'),
      h('ul', { class: 'room-clues' }, CLUES.map((c) => {
        const have = c.know.every((k) => g.state.knowledge.includes(k));
        return h('li', {}, btn(c.label + (have ? ' ✓' : ''), () => { c.know.forEach((k) => learn(g, k)); toast(c.text, 'magic'); refreshView(); }, 'small', { dataset: { fk: `room-${c.id}` } }));
      })),
      h('p', { class: 'tiny' }, `You have noticed ${tried} of ${CLUES.length} things.`),
      done ? h('p', { class: 'good' }, `You helped it remember. ${g.state.flags.bh_choice === 'rebuild' ? 'You rebuilt it, differently.' : g.state.flags.bh_choice === 'broken' ? 'You left it broken, on purpose.' : 'You restored it exactly.'}`)
        : btn('Help the page remember', () => { void runBrokenHomepage().then(refreshView); }, 'go big', { dataset: { fk: 'bh-start' } }),
      done ? btn('Go again (for the sake of it)', () => { void runBrokenHomepage().then(refreshView); }, 'small', { dataset: { fk: 'bh-again' } }) : '',
    ),
    ringBar('brokenHome'),
    footer(),
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
  );
}

registerZone({ id: 'brokenHome', render, guard: (g) => (g.has('boss_defeated') ? null : 'That page is not there. Yet.') });
