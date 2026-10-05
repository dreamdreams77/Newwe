import { game } from '../core/runtime';
import { STAT_BY_ID } from '../data/statDefs';
import { CARDS } from '../data/cards';
import { audio } from '../audio/audioManager';
import { approachStatus, approachesOf, commitRoll, emptyMods, isSuccess, oddsLabel, prepareCheck, roll, wishReroll, type Approach, type CheckDef, type DieRoll, type Prepared, type RollMods, type RollResult } from '../systems/dice';
import { playCard, whyNotPlayable } from '../systems/cardPlay';
import { hasItem } from '../systems/inventory';
import { statValue } from '../systems/stats';
import { coffeeState } from '../core/timeSystem';
import { h, btn, reducedMotion, sleep } from './dom';
import { icon } from './sprites';
import { openWindow } from './windows';

export interface CheckOutcome {
  result: RollResult;
  prep: Prepared;
  approach: Approach;
}

const OUTCOME_TEXT: Record<string, string> = {
  crit: 'CRITICAL SUCCESS!',
  success: 'Success.',
  fail: 'Not quite.',
  critFail: 'CRITICAL FAILURE.',
};

function dieEl(d: DieRoll, rolling = false): HTMLElement {
  const v = rolling ? '?' : String(d.value);
  return h(
    'div',
    { class: `die ${d.kind} ${rolling ? 'rolling' : ''} ${d.rerolled ? 'rerolled' : ''}`, attrs: { role: 'img', 'aria-label': `${d.kind} die: ${d.value}` } },
    h('span', {}, v),
    d.kind === 'golden' ? h('i', { class: 'die-tag' }, 'GOLD') : d.kind === 'wild' ? h('i', { class: 'die-tag' }, 'WILD') : null,
  );
}

/**
 * Open the roll-resolution window. Resolves with the roll (after the player
 * has had every chance to play cards, pick an approach and spend 11:11), or
 * null if they walked away before rolling.
 */
export function openCheck(def: CheckDef, opts: { intro?: string; bonus?: { amount: number; note: string } } = {}): Promise<CheckOutcome | null> {
  const g = game();
  g.reveal('stats');
  return new Promise((resolve) => {
    const approaches = approachesOf(def);
    let approachId = approaches.find((a) => approachStatus(g, def, a).ok)?.id ?? approaches[0].id;
    const mods: RollMods = emptyMods();
    if (opts.bonus) {
      // help from outside the dice window (eg. a companion)
      mods.amount += opts.bonus.amount;
      mods.notes.push(opts.bonus.note);
    }
    let useGolden = false;
    let prep: Prepared | null = null;
    let result: RollResult | null = null;
    let rolling = false;
    let done = false;

    const finish = (r: CheckOutcome | null) => {
      if (done) return;
      done = true;
      handle.close();
      resolve(r);
    };

    const currentApproach = () => approaches.find((a) => a.id === approachId)!;
    const rebuildPrep = () => {
      mods.golden = useGolden && hasItem(g, 'golden_dice');
      prep = prepareCheck(g, def, currentApproach(), mods);
    };

    const handle = openWindow({
      id: 'check',
      title: 'Roll Resolution',
      icon: 'goldendice',
      className: 'check-win',
      modal: true,
      closable: false,
      width: 'min(640px, 96vw)',
      render: (body, win) => {
        rebuildPrep();
        const p = prep!;
        const odds = oddsLabel(g, p);
        const cs = coffeeState(g);

        body.append(h('div', { class: 'check-head' }, h('h2', {}, def.title), def.text || opts.intro ? h('p', { class: 'check-text' }, opts.intro ?? def.text) : null));

        // approaches
        if (approaches.length > 1 || !result) {
          const fs = h('fieldset', { class: 'approaches', attrs: { disabled: result || rolling ? '' : undefined } }, h('legend', {}, 'How do you go about it?'));
          approaches.forEach((a) => {
            const st = approachStatus(g, def, a);
            const dc = def.dc + (a.dcMod ?? 0);
            const lab = h(
              'label',
              { class: `approach ${st.ok ? '' : 'locked'} ${a.id === approachId ? 'sel' : ''}` },
              h('input', { type: 'radio', name: 'approach', checked: a.id === approachId, disabled: !st.ok || !!result || rolling, on: { change: () => ((approachId = a.id), win.refresh()) }, dataset: { fk: `ap-${a.id}` } }),
              h('span', { class: 'ap-main' }, h('b', {}, a.label), h('em', {}, ` [${STAT_BY_ID[a.stat].label} ${statValue(g, a.stat)}]`), a.dcMod ? h('span', { class: 'ap-dc' }, a.dcMod > 0 ? ' (harder)' : ' (easier)') : null),
              a.text ? h('span', { class: 'ap-text' }, a.text) : null,
              !st.ok ? h('span', { class: 'ap-locked' }, `🔒 ${st.reason}`) : null,
            );
            void dc;
            fs.appendChild(lab);
          });
          body.append(fs);
        }

        // odds + coffee status
        if (!result) {
          body.append(
            h(
              'div',
              { class: 'odds' },
              h('span', {}, `Feels like: `),
              h('b', { class: `odds-${odds.pct > 0.7 ? 'good' : odds.pct > 0.4 ? 'mid' : 'bad'}` }, odds.label),
              h('span', { class: 'odds-detail' }, ` — ${STAT_BY_ID[p.stat].label} ${p.statValue} + ${p.poolDice}d6${p.mods.amount ? ` ${p.mods.amount > 0 ? '+' : ''}${p.mods.amount}` : ''}, beat ${p.dc}`),
              cs === 'empty' ? h('span', { class: 'odds-warn' }, ' (jittery: dicey!)') : cs === 'wired' ? h('span', { class: 'odds-warn good' }, ' (wired: sharp!)') : null,
              p.wildP > 0.15 ? h('span', { class: 'odds-warn' }, ' (chaos: wild dice!)') : null,
            ),
          );
        }

        // cards in hand
        if (g.state.ui.revealed.cards && !result) {
          const hand = g.state.cards.hand;
          const sect = h('div', { class: 'check-hand' }, h('div', { class: 'ch-title' }, 'Play a card?'));
          const row = h('div', { class: 'ch-row' });
          hand.forEach((c) => {
            const def2 = CARDS[c.cardId];
            if (!def2.where.includes('check')) return;
            const why = whyNotPlayable(g, c.uid, 'check');
            row.appendChild(
              h(
                'button',
                {
                  type: 'button',
                  class: `mini-card cat-${def2.category}`,
                  disabled: !!why || rolling,
                  title: why ?? def2.text,
                  dataset: { fk: `cc-${c.uid}` },
                  onclick: () => {
                    const r = playCard(g, c.uid, { mode: 'check', stat: p.stat, mods });
                    r.notes.forEach((n) => mods.notes.push(n));
                    win.refresh();
                  },
                },
                icon(def2.glyph, 20),
                h('span', {}, def2.name),
              ),
            );
          });
          if (!row.children.length) row.appendChild(h('span', { class: 'ch-none' }, 'Nothing in your hand helps here.'));
          sect.append(row);
          body.append(sect);
        }
        if (mods.notes.length && !result) body.append(h('ul', { class: 'mod-list' }, mods.notes.map((n) => h('li', {}, n))));

        // golden dice
        if (hasItem(g, 'golden_dice') && !result && def.golden !== false) {
          body.append(
            h(
              'label',
              { class: 'golden-toggle' },
              h('input', { type: 'checkbox', checked: useGolden, on: { change: (e) => ((useGolden = (e.target as HTMLInputElement).checked), win.refresh()) } }),
              icon('goldendice', 18),
              h('span', {}, ' Roll the Golden Dice too (bonus die that explodes… and bites on a 1)'),
            ),
          );
        }

        // dice tray + result
        const tray = h('div', { class: 'dice-tray', attrs: { 'aria-live': 'polite' } });
        if (result) {
          result.dice.forEach((d) => tray.appendChild(dieEl(d)));
          const total = h('div', { class: `roll-total ${result.outcome}` }, h('div', { class: 'rt-line' }, `${result.parts.stat} (${STAT_BY_ID[prep!.stat].label}) + ${result.parts.dice} (dice)${result.parts.mods ? ` ${result.parts.mods > 0 ? '+' : ''}${result.parts.mods}` : ''} = `, h('b', {}, String(result.total)), ` vs ${result.dc}`), h('div', { class: 'rt-outcome' }, OUTCOME_TEXT[result.outcome]));
          body.append(tray, total);
          if (result.snakeEyes) body.append(h('p', { class: 'snake' }, 'Two ones. Snake eyes. Even disasters are wishes — you feel an 11:11 gather.'));
          if (result.goldenFumble) body.append(h('p', { class: 'snake bad' }, 'The Golden Dice rolled a 1. It sulks. -1 Coffee, Chaos up for a while.'));
        } else if (rolling) {
          for (let i = 0; i < p.poolDice + (p.mods.golden ? 1 : 0); i++) tray.appendChild(dieEl({ value: 0, kind: 'normal' }, true));
          body.append(tray);
        }

        // actions
        const actions = h('div', { class: 'win-actions' });
        if (!result) {
          actions.append(
            btn(rolling ? 'Rolling…' : '🎲 ROLL', async () => {
              if (rolling) return;
              rolling = true;
              rebuildPrep();
              win.refresh();
              audio.sfx('roll');
              if (!reducedMotion()) await sleep(650);
              const res = roll(g, prep!);
              commitRoll(g, res, true);
              result = res;
              rolling = false;
              win.refresh();
              (win.body.querySelector('[data-autofocus]') as HTMLElement | null)?.focus();
            }, 'go big', { disabled: rolling, dataset: { fk: 'roll' }, attrs: { 'data-autofocus': '' } }),
            btn('Never mind', () => finish(null), '', { disabled: rolling || mods.notes.length > 0, title: mods.notes.length ? 'You have already played cards. You have to roll!' : undefined }),
          );
        } else {
          const failed = !isSuccess(result.outcome);
          if (failed && g.state.eleven.charges > 0 && !result.wished) {
            actions.append(
              btn('✦ Spend 11:11: try again (+2)', () => {
                const again = wishReroll(g, prep!, result!);
                if (again) {
                  result = again;
                  win.refresh();
                }
              }, 'magic', { dataset: { fk: 'wish' } }),
            );
          }
          actions.append(btn('Continue', () => finish({ result: result!, prep: prep!, approach: currentApproach() }), 'go', { attrs: { 'data-autofocus': '' }, dataset: { fk: 'continue' } }));
        }
        body.append(actions);
      },
    });
  });
}

/** shorthand: roll a check and return the result (or null) */
export async function rollCheck(def: CheckDef, intro?: string): Promise<CheckOutcome | null> {
  return openCheck(def, { intro });
}
