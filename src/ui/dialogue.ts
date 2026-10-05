import { game } from '../core/runtime';
import { test } from '../systems/conditions';
import { applyEffects } from '../systems/effects';
import { passTime } from '../systems/actions';
import { BALANCE } from '../config/balance';
import type { DChoice, DNode, DTree } from '../data/dialogueTypes';
import { audio } from '../audio/audioManager';
import { h, reducedMotion, replaceChildren } from './dom';
import { icon } from './sprites';
import { openCheck } from './dice';
import { openWindow } from './windows';

/** An RPG text box over the page. Resolves when the conversation ends. */
export function runDialogue(tree: DTree): Promise<void> {
  const g = game();
  return new Promise((resolve) => {
    let nodeId = typeof tree.start === 'function' ? tree.start(g) : tree.start;
    let typer: ReturnType<typeof setInterval> | null = null;
    let finished = false;
    let fullText = '';
    let typed = false;
    let entered = '';

    const finish = () => {
      if (finished) return;
      finished = true;
      if (typer) clearInterval(typer);
      handle.close();
      passTime(g, BALANCE.time.cost.talk);
      resolve();
    };

    const handle = openWindow({
      id: 'dialogue',
      title: tree.nodes[nodeId]?.who ?? 'Talk',
      className: 'dialogue-win',
      width: 'min(720px, 98vw)',
      onClose: () => {
        if (!finished) {
          finished = true;
          if (typer) clearInterval(typer);
          resolve();
        }
      },
      render: (body, win) => {
        const node: DNode = tree.nodes[nodeId];
        if (!node) return finish();
        if (entered !== nodeId) {
          entered = nodeId;
          typed = false;
          applyEffects(g, node.effects);
          node.run?.(g);
        }
        fullText = typeof node.text === 'function' ? node.text(g) : node.text;
        win.el.querySelector('.wt')!.textContent = node.who;

        const textEl = h('div', { class: 'dlg-text', tabindex: 0, attrs: { role: 'group', 'aria-label': `${node.who} says` } });
        const visible = h('span', { attrs: { 'aria-hidden': 'true' } });
        const sr = h('span', { class: 'sr-only' }, fullText);
        textEl.append(visible, sr);
        const choicesEl = h('div', { class: 'dlg-choices' });
        const portrait = node.portrait ? h('div', { class: 'dlg-portrait' }, icon(node.portrait, 72)) : null;
        body.append(h('div', { class: 'dlg-row' }, portrait, h('div', { class: 'dlg-main' }, textEl, choicesEl)));

        const showOptions = () => {
          typed = true;
          visible.textContent = fullText;
          replaceChildren(choicesEl);
          const list: Array<{ label: string; run: () => void; locked?: string | null }> = [];
          if (node.choices) {
            node.choices
              .filter((c) => (!c.when || test(g, c.when)) && !(c.once && g.has(c.once)))
              .forEach((c) => list.push({ label: typeof c.text === 'function' ? c.text(g) : c.text, run: () => pick(c), locked: c.lockedReason?.(g) }));
          } else {
            list.push({ label: node.end ? '[ End ]' : '[ Next ▸ ]', run: () => (node.end || !node.next ? finish() : goto(node.next)) });
          }
          list.forEach((c, i) =>
            choicesEl.append(
              h(
                'button',
                { type: 'button', class: 'dlg-choice', disabled: !!c.locked, dataset: { fk: `ch-${i}` }, onclick: () => (audio.sfx('click'), c.run()), attrs: i === 0 ? { 'data-autofocus': '' } : {} },
                h('span', { class: 'n' }, `${i + 1}.`),
                ' ',
                c.label,
                c.locked ? h('em', {}, ` (${c.locked})`) : null,
              ),
            ),
          );
          (choicesEl.querySelector('button:not([disabled])') as HTMLElement | null)?.focus();
        };

        const pick = async (c: DChoice) => {
          c.action?.(g);
          applyEffects(g, c.effects);
          if (c.check) {
            const out = await openCheck(c.check.def);
            if (!out) return;
            const ok = out.result.outcome === 'success' || out.result.outcome === 'crit';
            return goto(ok ? c.check.ok : c.check.fail);
          }
          if (c.end || !c.next) return finish();
          goto(c.next);
        };
        const goto = (id: string) => {
          nodeId = id;
          win.refresh();
        };

        // typewriter
        if (typed || reducedMotion()) {
          showOptions();
        } else {
          let i = 0;
          const step = Math.max(1, Math.ceil(fullText.length / 160));
          typer = setInterval(() => {
            i += step;
            visible.textContent = fullText.slice(0, i);
            if (i % 6 < step) audio.sfx('step');
            if (i >= fullText.length) {
              if (typer) clearInterval(typer);
              showOptions();
            }
          }, 22);
          const skip = () => {
            if (typed) return;
            if (typer) clearInterval(typer);
            showOptions();
          };
          textEl.addEventListener('click', skip);
          body.addEventListener('keydown', (ev) => {
            if ((ev.key === 'Enter' || ev.key === ' ') && !typed) {
              ev.preventDefault();
              skip();
            }
          });
        }
        body.addEventListener('keydown', (ev) => {
          const n = Number(ev.key);
          if (n >= 1 && n <= 9 && typed) {
            const b = choicesEl.querySelectorAll<HTMLButtonElement>('button')[n - 1];
            if (b && !b.disabled) b.click();
          }
        });
      },
    });
  });
}
