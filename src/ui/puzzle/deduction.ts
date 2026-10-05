import { game } from '../../core/runtime';
import { DEDUCTION, ENTRY_BY_ID, TELL_LABEL, type GuestEntry, type Seg, type TellId } from '../../data/guestbook';
import { deductionState, solveDeduction } from '../../systems/guestbook';
import { changeVital, statValue } from '../../systems/stats';
import { audio } from '../../audio/audioManager';
import { h, btn } from '../dom';
import { toast } from '../notifications';
import { openWindow } from '../windows';

/** Render an entry; tells become buttons the player can mark as evidence. */
function entryText(e: GuestEntry, marked: Set<string>, onToggle: (entry: string, tell: TellId) => void): HTMLElement {
  const wrap = h('p', { class: 'ded-text' });
  e.msg.forEach((seg: Seg) => {
    if (typeof seg === 'string') return wrap.append(seg);
    const key = `${e.id}:${seg.tell}`;
    wrap.append(
      h(
        'button',
        {
          type: 'button',
          class: `tell ${marked.has(key) ? 'marked' : ''}`,
          attrs: { 'aria-pressed': marked.has(key) ? 'true' : 'false', title: 'Mark this habit as evidence' },
          dataset: { fk: `tell-${e.id}-${seg.tell}-${seg.t}` },
          onclick: () => onToggle(e.id, seg.tell),
        },
        seg.t,
      ),
    );
  });
  return wrap;
}

/**
 * "Who wrote this?" — a deduction puzzle. People write the way they walk. Mark the
 * habits (tells) you notice in the strange entry and in each candidate, then accuse.
 * Puzzle Sense nudges after repeated mistakes; it never names the author.
 */
export function openDeduction(): Promise<boolean> {
  const g = game();
  return new Promise((resolve) => {
    const marked = new Set<string>();
    let candidate = DEDUCTION.candidates[1];
    let msg = '';
    let wrong = 0;
    const subject = ENTRY_BY_ID[DEDUCTION.subject];
    const win = openWindow({
      id: 'deduction',
      title: 'Case file: who wrote this?',
      icon: 'quill',
      className: 'ded-win',
      width: 'min(860px, 98vw)',
      onClose: () => resolve(g.has('deduction_solved')),
      render: (body, w) => {
        const toggle = (entry: string, tell: TellId) => {
          const key = `${entry}:${tell}`;
          if (marked.has(key)) marked.delete(key);
          else marked.add(key);
          audio.sfx('click');
          w.refresh();
        };
        const cand = ENTRY_BY_ID[candidate];
        const notes: string[] = [];
        (Object.keys(TELL_LABEL) as TellId[]).forEach((t) => {
          const inSubj = marked.has(`${subject.id}:${t}`);
          const inCand = marked.has(`${cand.id}:${t}`);
          if (inSubj || inCand) notes.push(`${TELL_LABEL[t]} — ${inSubj ? 'strange entry' : ''}${inSubj && inCand ? ' & ' : ''}${inCand ? cand.name : ''}`);
        });
        const solved = deductionState(g).solved;

        body.append(
          h('p', { class: 'ded-intro' }, 'The strange entry is dated 2003 and was typed on a machine that does not exist. People have habits. Click the habits you notice, in the strange entry and in each older entry, then decide.'),
          h('div', { class: 'ded-grid' },
            h('section', { class: 'ded-col' }, h('h3', {}, 'The strange entry'), h('div', { class: 'ded-entry subject' }, h('div', { class: 'ded-meta' }, `${subject.name} · ${subject.date}`), entryText(subject, marked, toggle))),
            h('section', { class: 'ded-col' },
              h('h3', {}, 'Who else writes like that?'),
              h('div', { class: 'ded-tabs', role: 'tablist' }, DEDUCTION.candidates.map((id) => {
                const e = ENTRY_BY_ID[id];
                const glow = wrong >= 2 && statValue(g, 'puzzleSense') >= 4 && id === DEDUCTION.author;
                return h('button', { type: 'button', role: 'tab', class: `ded-tab ${id === candidate ? 'sel' : ''} ${glow ? 'glow' : ''}`, attrs: { 'aria-selected': id === candidate ? 'true' : 'false' }, dataset: { fk: `cand-${id}` }, onclick: () => ((candidate = id), (msg = ''), w.refresh()) }, e.name);
              })),
              h('div', { class: 'ded-entry' }, h('div', { class: 'ded-meta' }, `${cand.name} · ${cand.from} · ${cand.date}`), entryText(cand, marked, toggle)),
            ),
          ),
          h('div', { class: 'ded-notes' }, h('h4', {}, 'Your notes'), notes.length ? h('ul', {}, notes.map((n) => h('li', {}, n))) : h('p', { class: 'empty' }, 'Nothing marked. Look at how things are written, not what is written.')),
          wrong >= 2 && statValue(g, 'puzzleSense') >= 4 ? h('p', { class: 'ded-sense' }, 'Puzzle Sense: one of the tabs seems to be glowing, very faintly. (It still isn’t proof.)') : '',
          h('p', { class: 'ded-msg', attrs: { role: 'status' } }, msg),
          h('div', { class: 'win-actions' },
            btn(`Accuse: ${cand.name}`, () => {
              if (solved) return;
              const matches = DEDUCTION.shared.filter((t) => marked.has(`${subject.id}:${t}`) && marked.has(`${cand.id}:${t}`)).length;
              if (cand.id === DEDUCTION.author) {
                if (matches >= DEDUCTION.needTells) {
                  solveDeduction(g);
                  audio.sfx('puzzle');
                  toast('It was w. The test post. The same habits, years apart. How does a guest write in 2003 like someone from 2001?', 'magic');
                  w.close();
                } else {
                  msg = 'Your gut says yes. A gut is not evidence. Mark the habits the two entries share.';
                  audio.sfx('error');
                  w.refresh();
                }
              } else {
                wrong++;
                deductionState(g).attempts++;
                changeVital(g, 'coffee', -1);
                msg = `${cand.name} does not write like that. They do not share enough habits. (-1 Coffee: thinking is tiring.)`;
                audio.sfx('error');
                w.refresh();
              }
            }, 'go', { disabled: solved }),
            btn('Close', () => w.close()),
          ),
        );
      },
    });
    void win;
  });
}
