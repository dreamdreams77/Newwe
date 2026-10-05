import { game } from '../core/runtime';
import { BALANCE } from '../config/balance';
import { VM_CODE } from '../data/puzzles';
import { CARDS } from '../data/cards';
import { ITEMS } from '../data/items';
import { advancePhase, encDef, lowerFury, makeLights, raiseFury, startEncounter, toggleLights, type FuryResult } from '../systems/combat';
import { playCard, whyNotPlayable } from '../systems/cardPlay';
import { activeCreature, canAssist, spendCreatureEnergy } from '../systems/creatures';
import { addItem, hasItem, inventoryList, removeItem } from '../systems/inventory';
import { addVisitors } from '../systems/hits';
import { statValue, changeVital } from '../systems/stats';
import { spendEleven } from '../systems/elevenEleven';
import { passTime } from '../systems/actions';
import { blueScreen } from '../systems/travel';
import { isSuccess, type CheckDef } from '../systems/dice';
import { learn } from '../systems/effects';
import { audio } from '../audio/audioManager';
import { h, btn, type Child } from './dom';
import { openCheck } from './dice';
import { icon } from './sprites';
import { toast } from './notifications';
import { paintVendingMachine } from './scenes';
import { openWindow } from './windows';

export type EncounterResult = 'won' | 'tilt' | 'left';

const PRIZE: CheckDef = {
  id: 'prize',
  title: 'The prize flap is stuck',
  stat: 'dadEnergy',
  dc: 11,
  text: 'The flap is jammed shut over something golden. The machine is watching to see what kind of person you are.',
  approaches: [
    { id: 'dad', label: 'Pry it with patience and a butter knife', stat: 'dadEnergy', careful: true, text: 'Dad Energy: it should not work, it will.' },
    { id: 'bold', label: 'Shoulder it open', stat: 'courage', dcMod: 1, text: 'You are very close to a very large machine.' },
    { id: 'joke', label: 'Tell it a joke so bad it lets go', stat: 'creativity', text: 'Make the machine groan itself open.' },
  ],
};
const SHAKE: CheckDef = {
  id: 'shake',
  title: 'Shake the machine',
  stat: 'courage',
  dc: 13,
  text: 'There is a time for finesse and a time for physics.',
  approaches: [
    { id: 'shake', label: 'Grab it and shake', stat: 'courage' },
    { id: 'dad', label: 'The Dad Shoulder (slightly lower, exactly right)', stat: 'dadEnergy', dcMod: -1 },
  ],
};
const TAPE: CheckDef = {
  id: 'tape-slot',
  title: 'Tape something into the slot',
  stat: 'dadEnergy',
  dc: 10,
  text: 'The slot only checks that something money-shaped is sitting in it. Duct tape is very good at making things stay where they should not be.',
};
const LEAF: CheckDef = {
  id: 'leaf',
  title: 'A leaf, as legal tender',
  stat: 'creativity',
  dc: 11,
  text: 'It is green. It is papery. It has a face if you look at it right. The machine is not very good at faces.',
};

/** The puzzle-combat window. Resolves when the fight is won, the machine tilts, or you walk away. */
export function runEncounter(id: string): Promise<EncounterResult> {
  const g = game();
  const def = encDef(id);
  const e = startEncounter(g, id);
  return new Promise((resolve) => {
    const log: string[] = [def.intro];
    let finished = false;
    // phase-local state
    let lights = makeLights(g, e.attempts).lights;
    let solution = makeLights(g, e.attempts).solution;
    let presses = 0;
    let senseUsed = 0;
    let bendUsed = false;
    let bendArmed = false;
    let hintCell: number | null = null;
    let digits = '';
    let wrong = 0;
    let hintItem: string | null = null;
    let finalResult: string | null = null;
    let locked = false;
    let phaseSeen = -1;

    const resetPhaseLocal = () => {
      senseUsed = 0;
      bendUsed = false;
      bendArmed = false;
      hintCell = null;
      digits = '';
      wrong = 0;
      hintItem = null;
      presses = 0;
      if (e.phase === 0) {
        const p = makeLights(g, e.attempts + e.phase);
        lights = p.lights;
        solution = p.solution;
      }
    };

    const end = (r: EncounterResult) => {
      if (finished) return;
      finished = true;
      win.close();
      resolve(r);
    };

    /** apply a fury event: log attacks and handle being ejected */
    const furyHit = (n: number, why: string) => {
      const res: FuryResult = raiseFury(g, e, def, n);
      log.push(why);
      res.attacks.forEach((a) => log.push(a.negated ? `${a.line} It bounces off the Page Not Found. (Negated!)` : `${a.line} -${a.damage} HP.`));
      if (res.tilt) {
        log.push(def.tiltText);
        let text = def.tiltText;
        if (g.state.vitals.hp <= 0) text += ' ' + blueScreen(g);
        passTime(g, BALANCE.combat.tiltMinutes, { raw: true });
        e.fury = 0;
        g.changed();
        toast(text, 'bad');
        end('tilt');
        return true;
      }
      win.refresh();
      return false;
    };

    const phaseDone = (msg: string) => {
      log.push(msg);
      advancePhase(g, e);
      resetPhaseLocal();
      if (e.phase >= def.phases.length) return win_();
      win.refresh();
    };

    const win_ = () => {
      e.won = true;
      g.state.flags.boss_defeated = true;
      addVisitors(g, 150, 'defeated the Vending Machine of Judgment');
      learn(g, 'vm_beaten');
      audio.sfx('questDone');
      toast(def.winText, 'magic');
      g.changed();
      end('won');
    };

    const win = openWindow({
      id: 'combat',
      title: def.name,
      icon: 'portrait_vm',
      className: 'combat-win',
      modal: true,
      closable: false,
      width: 'min(900px, 99vw)',
      render: (body, w) => {
        if (phaseSeen !== e.phase) {
          phaseSeen = e.phase;
          resetPhaseLocal();
        }
        const phase = def.phases[e.phase];
        if (!phase) return;
        const pet = activeCreature(g);
        const canvas = h('canvas', { class: 'px enc-machine', attrs: { width: 128, height: 112, role: 'img', 'aria-label': 'The Vending Machine of Judgment. Its LED eyes follow you.' } });
        paintVendingMachine(canvas.getContext('2d')!, 128, 112, e.phase, lights, e.fury);

        const furyPips: Child[] = [];
        for (let i = 0; i < def.furyMax; i++) furyPips.push(h('i', { class: i < e.fury ? 'on' : '' }));
        const hpPct = (g.state.vitals.hp / g.state.vitals.hpMax) * 100;

        body.append(
          h('div', { class: 'enc-top' },
            h('div', { class: 'enc-art' }, canvas),
            h('div', { class: 'enc-status' },
              h('h2', {}, phase.title),
              h('div', { class: 'enc-meters' },
                h('div', { class: 'enc-meter' }, h('span', {}, 'FURY'), h('span', { class: 'fury-pips', attrs: { role: 'meter', 'aria-valuenow': e.fury, 'aria-valuemin': 0, 'aria-valuemax': def.furyMax, 'aria-label': 'Machine fury' } }, furyPips)),
                h('div', { class: 'enc-meter' }, h('span', {}, 'YOU'), h('div', { class: 'bar hp' }, h('i', { style: `width:${hpPct}%` }), h('span', { class: 'num' }, `${g.state.vitals.hp}/${g.state.vitals.hpMax}`))),
                h('div', { class: 'enc-meter' }, h('span', {}, 'PHASE'), h('span', {}, `${e.phase + 1} / ${def.phases.length}`)),
              ),
              h('p', { class: 'enc-text' }, phase.text),
              knowledgeLines(phase),
            ),
          ),
        );

        const widget = h('div', { class: `enc-widget k-${phase.kind}` });
        if (phase.kind === 'lights') renderLights(widget, w);
        else if (phase.kind === 'offer') renderOffer(widget, w);
        else if (phase.kind === 'keypad') renderKeypad(widget, w);
        else renderFinal(widget, w);
        body.append(widget);

        // cards usable in an encounter
        const hand = g.state.cards.hand.filter((c) => CARDS[c.cardId].where.includes('combat'));
        const handEl = h('div', { class: 'enc-hand' }, h('div', { class: 'ch-title' }, 'Cards'));
        const row = h('div', { class: 'ch-row' });
        hand.forEach((c) => {
          const cd = CARDS[c.cardId];
          const why = whyNotPlayable(g, c.uid, 'combat');
          row.append(h('button', { type: 'button', class: `mini-card cat-${cd.category}`, disabled: !!why || locked, title: why ?? cd.text, dataset: { fk: `ecc-${c.uid}` }, onclick: () => playEncCard(c.uid, w) }, icon(cd.glyph, 20), h('span', {}, cd.name)));
        });
        if (!hand.length) row.append(h('span', { class: 'ch-none' }, 'Nothing in your hand helps here.'));
        handEl.append(row);
        body.append(handEl);

        body.append(
          h('div', { class: 'enc-log', attrs: { 'aria-live': 'polite', role: 'log' } }, log.slice(-5).map((l) => h('p', {}, l))),
          h('div', { class: 'win-actions' },
            pet && canAssist(pet) ? btn(`${pet.name}, help!`, () => assist(w), 'small', { disabled: locked, title: `Costs ${BALANCE.creature.assistEnergy} energy` }) : '',
            btn('Retreat', () => {
              log.push('You back away. The machine hums, unbothered. Progress is kept.');
              end('left');
            }, 'small'),
          ),
        );
      },
    });

    // ---------------------------------------------------------- widgets
    function knowledgeLines(phase: (typeof def.phases)[number]): HTMLElement {
      const known = phase.reveals.filter((r) => g.state.knowledge.includes(r.know));
      const wrap = h('div', { class: 'enc-know' });
      if (known.length) known.forEach((k) => wrap.append(h('p', { class: 'know' }, `📖 ${k.text}`)));
      else wrap.append(h('p', { class: 'unknown' }, phase.unknown));
      return wrap;
    }

    function renderLights(el: HTMLElement, w: { refresh(): void }) {
      const grid = h('div', { class: 'lights-grid', role: 'group', ariaLabel: 'Panel lights, 3 by 3' });
      lights.forEach((on, i) => {
        grid.append(
          h(
            'button',
            {
              type: 'button',
              class: `light ${on ? 'on' : ''} ${hintCell === i ? 'hint' : ''}`,
              ariaLabel: `Light ${i + 1}, ${on ? 'on' : 'off'}`,
              attrs: { 'aria-pressed': on ? 'true' : 'false' },
              dataset: { fk: `light-${i}` },
              disabled: locked,
              onclick: () => {
                toggleLights(lights, i, bendArmed);
                bendArmed = false;
                presses++;
                hintCell = null;
                audio.sfx('click');
                if (lights.every((x) => !x)) return phaseDone('Click. The last light goes out. The panel sighs, which you did not know panels could do.');
                if (presses % 10 === 0) return void furyHit(1, 'The machine rattles: you have been pressing for a while.');
                w.refresh();
              },
            },
          ),
        );
      });
      const tools = h('div', { class: 'enc-tools' },
        h('span', {}, `Presses: ${presses}`),
        btn('Reset the panel', () => { const p = makeLights(g, e.attempts + e.phase); lights = p.lights; solution = p.solution; presses = 0; hintCell = null; w.refresh(); }, 'small'),
        statValue(g, 'puzzleSense') >= 3 ? btn(`Puzzle Sense: feel for a press (${Math.max(0, Math.floor(statValue(g, 'puzzleSense') / 3) - senseUsed)})`, () => {
          if (senseUsed >= Math.floor(statValue(g, 'puzzleSense') / 3)) return;
          senseUsed++;
          const todo = solution.filter((c) => c !== undefined);
          hintCell = todo[(senseUsed - 1) % todo.length];
          toast('One of the lights feels more "pressable" than the rest.', 'info');
          w.refresh();
        }, 'small') : '',
        !bendUsed && g.state.eleven.charges > 0 ? btn(bendArmed ? '✦ Rule bent: next press flips only itself' : '✦ Spend 11:11: bend the rule once', () => {
          if (!spendEleven(g, 'bent the panel')) return;
          bendUsed = true;
          bendArmed = true;
          toast('The machine blinks 11:11 at you. For one press, the neighbours are not involved.', 'magic');
          w.refresh();
        }, 'magic small', { disabled: bendArmed }) : '',
      );
      el.append(grid, tools);
    }

    async function tryOffer(itemId: string, w: { refresh(): void }) {
      if (locked) return;
      locked = true;
      try {
        if (itemId === 'token_mended') {
          removeItem(g, 'token_mended', 1);
          return phaseDone('Clink. The mended token drops in and the machine reads it for a long time. EXACT CHANGE ACCEPTED. It looks, you swear, a little moved.');
        }
        if (itemId === 'token_broken') {
          furyHit(1, 'The half-token goes in, clinks, and falls straight out again. EXACT CHANGE ONLY.');
          return;
        }
        if (itemId === 'willow_leaf') {
          const out = await openCheck(LEAF);
          if (out && isSuccess(out.result.outcome)) {
            removeItem(g, 'willow_leaf', 1);
            return phaseDone('The machine looks at the leaf. The leaf looks back. EXACT CHANGE ACCEPTED. It has, evidently, never seen money.');
          }
          if (out) furyHit(1, 'The machine reads: THIS IS A LEAF.');
          return;
        }
        if (itemId === 'duct_tape') {
          const out = await openCheck(TAPE);
          if (out && isSuccess(out.result.outcome)) return phaseDone('You tape the slot to accept anything vaguely coin-shaped, which it does. The machine accepts it with a click of defeated dignity.');
          if (out) furyHit(1, 'The tape sticks to everything but the slot. The machine looks smug.');
          return;
        }
        const tags = ITEMS[itemId]?.tags ?? [];
        log.push(tags.includes('food') ? 'The machine is not a mouth. It makes a face anyway.' : tags.includes('paper') ? 'It is not a shredder. It is rather offended.' : tags.includes('drink') ? 'The slot does not take liquids. It would like you to stop.' : 'That is not money, the machine says, in a voice of great weariness.');
        passTime(g, 1);
      } finally {
        locked = false;
        w.refresh();
      }
    }

    function renderOffer(el: HTMLElement, w: { refresh(): void }) {
      const items = inventoryList(g);
      const list = h('div', { class: 'offer-list', role: 'group', ariaLabel: 'Things to put in the slot' });
      items.forEach(({ def: idef }) =>
        list.append(h('button', { type: 'button', class: `offer-item ${hintItem === idef.id ? 'hint' : ''}`, disabled: locked, dataset: { fk: `offer-${idef.id}` }, onclick: () => tryOffer(idef.id, w) }, icon(idef.icon, 28), h('span', {}, idef.name))),
      );
      el.append(
        h('p', { class: 'enc-sub' }, 'What do you put in the slot?'),
        list,
        h('div', { class: 'enc-tools' },
          btn('Shake the machine', async () => {
            locked = true;
            const out = await openCheck(SHAKE);
            locked = false;
            if (out && isSuccess(out.result.outcome)) return phaseDone('You shake it. Something inside gives up. A shower of coins falls into the tray and the machine reads them all at once. PAYMENT RECEIVED (UNDER PROTEST).');
            if (out) {
              changeVital(g, 'hp', -2);
              furyHit(1, 'You shake it. It shakes back, with enthusiasm. -2 HP.');
            } else w.refresh();
          }, 'small', { disabled: locked }),
        ),
      );
    }

    function renderKeypad(el: HTMLElement, w: { refresh(): void }) {
      const display = h('div', { class: 'keypad-display', role: 'status', ariaLabel: `Entered: ${digits || 'nothing'}` }, (digits + '____').slice(0, 4).split('').join(' '));
      const pad = h('div', { class: 'keypad' });
      for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '↵']) {
        pad.append(
          h('button', {
            type: 'button', class: `key ${d === '↵' ? 'enter' : ''}`, disabled: locked, ariaLabel: d === 'C' ? 'Clear' : d === '↵' ? 'Enter' : d, dataset: { fk: `key-${d}` },
            onclick: () => {
              audio.sfx('click');
              if (d === 'C') digits = '';
              else if (d === '↵') {
                if (digits.length < 4) { log.push('Four digits, the display says. It is very patient about this.'); return w.refresh(); }
                if (digits === VM_CODE) return phaseDone('SELECTION ACCEPTED. The machine whirrs. Somewhere inside it, a very small bell rings. It is, of course, 11:11.');
                wrong++;
                digits = '';
                return void furyHit(1, wrong >= 2 ? 'WRONG. The machine adds, grudgingly: "a wish hour is a doubled hour."' : 'WRONG. The machine says so loudly.');
              } else if (digits.length < 4) digits += d;
              w.refresh();
            },
          }, d),
        );
      }
      el.append(display, pad, hintItem === 'keypad' ? h('p', { class: 'hint-line' }, 'Peep pecks at the 1 key. Twice. Aggressively.') : '');
    }

    function renderFinal(el: HTMLElement, w: { refresh(): void }) {
      const opts: Child[] = [];
      opts.push(
        btn('DISPENSE the prize', async () => {
          locked = true;
          const bonus = e.data.assistBonus ? { amount: 2, note: 'Companion help +2' } : undefined;
          const out = await openCheck(PRIZE, { bonus });
          locked = false;
          e.data.assistBonus = false;
          if (out && isSuccess(out.result.outcome)) {
            addItem(g, 'golden_dice', 1);
            g.state.flags.vm_choice = 'prize';
            return phaseDone('The flap pops. Something very heavy and very golden rolls into the tray. The machine says THANK YOU in the voice of a bank. (The Golden Dice. It bites back.)');
          }
          if (out) furyHit(1, 'The flap does not move. The machine hums. It is enjoying this.');
          else w.refresh();
        }, 'go', { disabled: locked, dataset: { fk: 'f-prize' } }),
        btn('Take the REFUND', () => {
          g.state.flags.vm_choice = 'refund';
          addItem(g, 'coffee', 2);
          addItem(g, 'receipt', 1);
          phaseDone('You press REFUND. The machine blinks, deeply surprised, and gives you two coffees and a receipt. The prize flap stays jammed. Some people prefer their wishes small.');
        }, '', { disabled: locked, dataset: { fk: 'f-refund' } }),
      );
      if (g.state.eleven.charges > 0)
        opts.push(
          btn('✦ Press the unlabelled button (11:11)', () => {
            if (!spendEleven(g, 'pressed the unlabelled button')) return;
            g.state.flags.vm_choice = 'wish';
            addItem(g, 'golden_dice', 1);
            addItem(g, 'coffee', 1);
            phaseDone('The unlabelled button was always going to read 11:11. The machine opens every door it has. Everything rolls out at once, gently. It looks relieved. It has been waiting a long time to be asked something real.');
          }, 'magic', { disabled: locked, dataset: { fk: 'f-wish' } }),
        );
      el.append(h('div', { class: 'final-opts' }, opts), finalResult ? h('p', {}, finalResult) : '');
    }

    // ------------------------------------------------------------ cards + help
    function playEncCard(uid: number, w: { refresh(): void }) {
      const r = playCard(g, uid, { mode: 'combat' });
      if (!r.ok) return toast(r.reason ?? 'Not now.', 'info');
      r.notes.forEach((n) => log.push(n));
      if (r.negate) {
        e.data.negate = true;
        log.push('The Page Not Found settles around you like a quiet coat. The next hit will pass straight through.');
      }
      if (r.furyDown) {
        lowerFury(g, e, r.furyDown);
        log.push('The machine groans. It is not a fan of the pun. Fury down.');
      }
      if (r.peek) log.push(`You recall: ${r.peek}`);
      if (r.assist) assist(w);
      w.refresh();
    }

    function assist(w: { refresh(): void }) {
      const pet = activeCreature(g);
      if (!pet || !canAssist(pet)) return toast('It is too tired to help.', 'info');
      spendCreatureEnergy(g, pet.id, BALANCE.creature.assistEnergy);
      const phase = def.phases[e.phase];
      audio.sfx('chirp');
      if (phase.kind === 'lights') {
        hintCell = solution[Math.min(solution.length - 1, presses % solution.length)];
        log.push(`${pet.name} hops onto the panel and pecks a light very specifically.`);
      } else if (phase.kind === 'offer') {
        hintItem = hasItem(g, 'token_mended') ? 'token_mended' : hasItem(g, 'duct_tape') ? 'duct_tape' : hasItem(g, 'willow_leaf') ? 'willow_leaf' : null;
        log.push(hintItem ? `${pet.name} stares at your backpack and makes a small, urgent noise.` : `${pet.name} stares at the slot and makes a small, hopeless noise.`);
      } else if (phase.kind === 'keypad') {
        hintItem = 'keypad';
        log.push(`${pet.name} pecks at one key until it clicks.`);
      } else {
        e.data.assistBonus = true;
        log.push(`${pet.name} perches on the flap. +2 to the next try.`);
      }
      w.refresh();
    }
  });
}
