import { game } from '../core/runtime';
import { PARENT_LINES, PARENT_QS } from '../data/parent';
import { GIFT } from '../data/personal';
import { addVisitors } from '../systems/hits';
import { sleep, reducedMotion, h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { audio } from '../audio/audioManager';
import { CROSSWORD } from './terminalPage';
import { footer } from './pageKit';

/** Act III. Reachable once the Terminal crossword is complete and the finale has been seen. */
export function parentReady(g: ReturnType<typeof game>): { ok: boolean; why: string } {
  const solved = ((g.state.flags.cw_solved as string) ?? '').split(',').filter(Boolean).length >= CROSSWORD.length;
  if (!solved) return { ok: false, why: 'ATTACH: no such process. (Something in the strategy guide is still unanswered.)' };
  if (!g.has('finale_seen')) return { ok: false, why: 'ATTACH: the page is not finished rendering. (Something at the bottom of the counter is waiting for you to see it.)' };
  return { ok: true, why: '' };
}

let step = 0;
let note = '';
let revealing = false;
const shown: string[] = [];

function render(): HTMLElement {
  const g = game();
  const done = g.has('act3_done');
  const q = PARENT_QS[step];
  const body = h('div', { class: 'parent-page' },
    h('pre', { class: 'tm-banner' }, '*** PARENT PROCESS ***\nattaching to PID 1 ...\nit would like to ask you a few things.'));
  if (!done && step < PARENT_QS.length) {
    body.append(
      h('h2', {}, `> QUESTION ${step + 1} OF ${PARENT_QS.length}`),
      h('p', { class: 'parent-q', role: 'status' }, q.q),
      h('div', { class: 'final-opts', role: 'group', ariaLabel: 'Answers' }, q.options.map((o, i) => btn(o, () => {
        if (i === q.answer) { audio.sfx('puzzle'); note = ''; step++; if (step >= PARENT_QS.length) return void finish(); return refreshView(); }
        audio.sfx('error'); note = `Not quite. ${q.nudge}`; refreshView();
      }, '', { dataset: { fk: `pq-${step}-${i}` } }))),
      note ? h('p', { class: 'hint-line', role: 'status' }, note) : '',
    );
  } else {
    body.append(h('pre', { class: 'render-pre', attrs: { 'aria-live': 'polite' } }, (done && !revealing ? [...PARENT_LINES, ...giftLines()] : shown).join('\n')));
    if (done && !revealing) body.append(h('div', { class: 'win-actions' }, btn('Return to the homepage', () => navigate('home'), 'go big', { dataset: { fk: 'parent-home' } })));
  }
  return h('div', { class: 'terminal-page' }, body, footer(), h('div', { class: 'back-link' }, btn('◄ EXIT', () => navigate('home'), 'small')));
}

function giftLines(): string[] {
  return GIFT ? ['', GIFT.to ? `For ${GIFT.to}.` : '', GIFT.note ? `"${GIFT.note}"` : '', GIFT.from ? `   — ${GIFT.from}` : ''].filter((l, i, a) => l || (i > 0 && a[i - 1])) : [];
}

async function finish(): Promise<void> {
  const g = game();
  revealing = true;
  shown.length = 0;
  g.state.flags.act3_done = true;
  addVisitors(g, 111, 'found the parent process');
  g.state.eleven.charges = Math.min(3, g.state.eleven.charges + 3);
  audio.sfx('threshold');
  g.changed();
  refreshView();
  for (const l of [...PARENT_LINES, ...giftLines()]) {
    shown.push(l);
    refreshView();
    if (!reducedMotion()) await sleep(l ? 320 : 140);
  }
  revealing = false;
  toast('The parent process has a name. It was yours all along.', 'magic');
  refreshView();
}

registerZone({
  id: 'parent',
  render,
  onLeave: () => { step = 0; note = ''; },
  guard: (g) => { const r = parentReady(g); return r.ok ? null : r.why; },
});
