import { game } from '../core/runtime';
import { ENCOUNTERS } from '../data/encounters';
import { KNOWLEDGE } from '../data/knowledge';
import { raiseStat } from '../systems/stats';
import { earnCard } from '../systems/cards';
import { addVisitors } from '../systems/hits';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { footer, ringBar } from './pageKit';
import { parentReady } from './parent';
import { audio } from '../audio/audioManager';

/**
 * The Terminal: a retro RPG menu. A strategy guide that only fills in what you have actually learned,
 * and a small crossword whose answers are all things the world told you.
 */
export const CROSSWORD: Array<{ id: string; clue: string; answer: string; need: string }> = [
  { id: 'cw1', clue: '1 ACROSS (6): What the vending machine at the end of the dark insists on. EXACT ______.', answer: 'CHANGE', need: 'vm_exact_change' },
  { id: 'cw2', clue: '2 DOWN (6): The number W loved, spelled out, in six letters.', answer: 'ELEVEN', need: 'w_loved_eleven' },
  { id: 'cw3', clue: '3 ACROSS (4): The keeper of the lighthouse. Gruff, tender, never says why.', answer: 'MARL', need: 'light_was_tended' },
  { id: 'cw4', clue: '4 DOWN (8): The last stop on the Bullet Train. Not on any map.', answer: 'TERMINUS', need: 'terminus' },
  { id: 'cw5', clue: '5 ACROSS (7): A guestbook can only hold one of these who has already arrived. They are counted, and the counter never lies.', answer: 'VISITOR', need: 'bh_counter' },
  { id: 'cw6', clue: '6 DOWN (3): The old tree at the end of the foxfire. It has been counting eleven rings, and then some.', answer: 'OAK', need: 'forest_eleven' },
  { id: 'cw7', clue: '7 ACROSS (5): The direction at the very bottom of the world. The sky wants to hear it after dark.', answer: 'SOUTH', need: 'tas_south' },
];

function render(): HTMLElement {
  const g = game();
  const solved = (g.state.flags.cw_solved as string | undefined)?.split(',') ?? [];
  const guide = h('div', { class: 'tm-guide' });
  for (const enc of Object.values(ENCOUNTERS)) {
    guide.append(h('h3', {}, `> ${enc.name}`));
    for (const ph of enc.phases) {
      const got = ph.reveals.filter((r) => g.state.knowledge.includes(r.know));
      guide.append(h('p', { class: 'tm-phase' }, `${ph.title.replace(/^Phase \d+ — /, '')}:`, ...(got.length ? got.map((r) => h('span', { class: 'tm-know' }, ` ${r.text.replace(/^Boss Knowledge: /, '')}`)) : [h('span', { class: 'tm-unk' }, ' ???')])));
    }
    if (enc.weakness) guide.append(h('p', { class: 'tm-phase' }, 'Weakness:', g.state.knowledge.includes(enc.weakness.know) ? h('span', { class: 'tm-know' }, ` ${enc.weakness.text.replace(/^WEAKNESS: /, '')}`) : h('span', { class: 'tm-unk' }, ' ???')));
  }
  const all = solved.length >= CROSSWORD.length;
  const cw = h('div', { class: 'tm-cross' }, h('h3', {}, '> CROSSWORD (only answers you have learned will be accepted)'),
    ...CROSSWORD.map((c) => {
      const done = solved.includes(c.id);
      const known = g.state.knowledge.includes(c.need);
      const input = h('input', { type: 'text', class: 'tm-input', ariaLabel: c.clue, attrs: { maxlength: 12, autocomplete: 'off', 'data-fk': `cw-${c.id}` }, disabled: done }) as HTMLInputElement;
      if (done) input.value = c.answer;
      const check = () => {
        if (done) return;
        if (input.value.trim().toUpperCase() !== c.answer) { audio.sfx('click'); return void toast('The cursor blinks. It disagrees.', 'info'); }
        if (!known) return void toast('That is right. But you do not know that yet. (The guide will not take it on faith.)', 'info');
        g.state.flags.cw_solved = [...solved, c.id].join(',');
        audio.sfx('puzzle');
        toast('Correct. The terminal beeps, once, in approval.', 'good');
        if (g.state.flags.cw_solved.split(',').length >= CROSSWORD.length) {
          raiseStat(g, 'puzzleSense', 2); earnCard(g, 'secret_404'); addVisitors(g, 111, 'solved the crossword');
          toast('CROSSWORD COMPLETE. Puzzle Sense +2. The guide prints a small receipt that says: YOU READ THE WHOLE THING.', 'magic');
        }
        g.changed();
        refreshView();
      };
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') check(); });
      return h('p', { class: `tm-clue ${done ? 'done' : ''}` }, c.clue, h('br'), input, done ? ' ✓' : btn('ENTER', check, 'small', { dataset: { fk: `cwb-${c.id}` } }));
    }),
    all ? h('p', { class: 'tm-know' }, 'CROSSWORD COMPLETE.') : '',
    all ? h('p', { class: 'tm-menu' }, parentReady(g).ok ? [ 'A new process has appeared in the table: PID 1. ', btn('> ATTACH', () => navigate('parent'), 'go small', { dataset: { fk: 'attach-parent' } }) ] : 'PID 1: not ready. (The page is still rendering something at the bottom of the counter.)') : '',
  );
  return h('div', { class: 'terminal-page' },
    h('pre', { class: 'tm-banner' }, '*** STRATEGY GUIDE v1.1 ***\n(c) W. 2001. NOT FOR RESALE. NOT FOR ANYONE, REALLY.\n\nType nothing. Press nothing. Read.'),
    h('p', { class: 'tm-menu' }, '[ MENU ]  > BOSS PREP   > CROSSWORD   > EXIT'),
    h('h2', {}, '> BOSS PREP'), guide, cw,
    ringBar('terminal'), footer(),
    h('div', { class: 'back-link' }, btn('◄ EXIT', () => navigate('home'), 'small')),
  );
}

void KNOWLEDGE;
registerZone({ id: 'terminal', render, guard: (g) => (g.has('e404_open') ? null : 'CONNECTION REFUSED.') });
