import { game } from '../core/runtime';
import { BALANCE } from '../config/balance';
import { CARDS } from '../data/cards';
import { advancePhase, encDef, encState, lowerFury, raiseFury, startEncounter, type FuryResult } from '../systems/combat';
import { playCard, whyNotPlayable } from '../systems/cardPlay';
import { addVisitors } from '../systems/hits';
import { statValue, changeVital, raiseStat } from '../systems/stats';
import { learn } from '../systems/effects';
import { addItem } from '../systems/inventory';
import { blueScreen } from '../systems/travel';
import { passTime } from '../systems/actions';
import { bannerPattern, cipherWord, guestbookForgery, keySequence, KEY_NAMES, shiftWord } from '../systems/brokenHome';
import { audio } from '../audio/audioManager';
import { h, btn, type Child } from './dom';
import { icon } from './sprites';
import { toast } from './notifications';
import { openWindow } from './windows';
import { battleIntro } from './battleFx';
import type { EncounterResult } from './combat';

/** The second boss: five phases, one for each kind of thing the website was made of. */
export function runBrokenHomepage(): Promise<EncounterResult> {
  const g = game();
  const def = encDef('broken_home');
  const e = startEncounter(g, 'broken_home');
  battleIntro();
  const attempt = e.attempts;
  return new Promise((resolve) => {
    const log: string[] = [def.intro];
    let finished = false;
    let locked = false;
    let phaseSeen = -1;
    // phase-local
    let picked = new Set<number>();
    let shown = false;
    let looks = 0;
    let ruledOut = new Set<number>();
    let senses = 0;
    let typedWord = '';
    let senseLetters = 0;
    let lit = -1;
    let entered: number[] = [];
    let replays = 0;
    let finalMsg: string | null = null;

    const pattern = bannerPattern(g, attempt);
    const forgery = guestbookForgery(g, attempt);
    const word = cipherWord(g, attempt);
    const seq = keySequence(g, attempt);
    if ((window as unknown as { __game?: unknown }).__game) (window as unknown as { __bh: unknown }).__bh = { pattern, forgery, word, seq };

    const looksMax = () => 1 + Math.floor(statValue(g, 'observation') / 4);
    const replaysMax = () => 1 + Math.floor(statValue(g, 'memory') / 4);
    const sensesMax = () => Math.floor(statValue(g, 'puzzleSense') / 3);

    const reset = () => {
      picked = new Set(); shown = false; looks = 0; ruledOut = new Set(); senses = 0; typedWord = ''; senseLetters = 0; lit = -1; entered = []; replays = 0; finalMsg = null;
    };
    const end = (r: EncounterResult) => {
      if (finished) return;
      finished = true;
      win.close();
      resolve(r);
    };

    const furyHit = (n: number, why: string): boolean => {
      const res: FuryResult = raiseFury(g, e, def, n);
      log.push(why);
      res.attacks.forEach((a) => log.push(a.negated ? `${a.line} It passes through you. (Negated!)` : `${a.line} -${a.damage} HP.`));
      if (res.tilt) {
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
      reset();
      if (e.phase >= def.phases.length) return won();
      win.refresh();
    };

    const won = () => {
      e.won = true;
      g.state.flags.bh_defeated = true;
      addVisitors(g, 111, 'helped the Broken Homepage remember');
      learn(g, 'bh_beaten');
      audio.sfx('fanfare');
      toast(def.winText, 'magic');
      g.changed();
      end('won');
    };

    const win = openWindow({
      id: 'combat',
      title: def.name,
      icon: 'portrait_vm',
      className: 'combat-win bh-win',
      modal: true,
      closable: false,
      width: 'min(900px, 99vw)',
      render: (body, w) => {
        if (phaseSeen !== e.phase) { phaseSeen = e.phase; reset(); }
        const phase = def.phases[e.phase];
        if (!phase) return;
        const known = phase.reveals.filter((r) => g.state.knowledge.includes(r.know));
        const furyPips: Child[] = [];
        for (let i = 0; i < def.furyMax; i++) furyPips.push(h('i', { class: i < e.fury ? 'on' : '' }));
        const hpPct = (g.state.vitals.hp / g.state.vitals.hpMax) * 100;
        body.append(
          h('div', { class: 'enc-top' },
            h('div', { class: 'enc-art bh-art', attrs: { 'aria-hidden': 'true' } }, h('div', { class: 'bh-glitch' }, 'UNDER CONSTRUCTION'), h('div', { class: 'bh-glitch b' }, '~*~ welcome 2 my world ~*~'), h('div', { class: 'bh-glitch c' }, '404 404 404')),
            h('div', { class: 'enc-status' },
              h('h2', {}, phase.title),
              h('div', { class: 'enc-meters' },
                h('div', { class: 'enc-meter' }, h('span', {}, 'STRAIN'), h('span', { class: 'fury-pips', attrs: { role: 'meter', 'aria-valuenow': e.fury, 'aria-valuemin': 0, 'aria-valuemax': def.furyMax, 'aria-label': 'The page is straining' } }, furyPips)),
                h('div', { class: 'enc-meter' }, h('span', {}, 'YOU'), h('div', { class: 'bar hp' }, h('i', { style: `width:${hpPct}%` }), h('span', { class: 'num' }, `${g.state.vitals.hp}/${g.state.vitals.hpMax}`))),
                h('div', { class: 'enc-meter' }, h('span', {}, 'PHASE'), h('span', {}, `${e.phase + 1} / ${def.phases.length}`)),
              ),
              h('p', { class: 'enc-text' }, phase.text),
              h('div', { class: 'enc-know' }, known.length ? known.map((k) => h('p', { class: 'know' }, `📖 ${k.text}`)) : h('p', { class: 'unknown' }, phase.unknown)),
            ),
          ),
        );
        const widget = h('div', { class: `enc-widget k-${phase.kind}` });
        if (phase.kind === 'pattern') renderPattern(widget, w);
        else if (phase.kind === 'forgery') renderForgery(widget, w);
        else if (phase.kind === 'cipher') renderCipher(widget, w);
        else if (phase.kind === 'sequence') renderSequence(widget, w);
        else renderFinal(widget);
        body.append(widget);

        const hand = g.state.cards.hand.filter((c) => CARDS[c.cardId].where.includes('combat'));
        const handEl = h('div', { class: 'enc-hand' }, h('h3', {}, 'Your hand'));
        const row = h('div', { class: 'hand-row' });
        hand.forEach((c) => {
          const why = whyNotPlayable(g, c.uid, 'combat');
          row.append(h('button', { type: 'button', class: 'mini-card', disabled: !!why || locked, title: why ?? CARDS[c.cardId].text, dataset: { fk: `card-${c.cardId}` }, onclick: () => playCardHere(c.uid, w) }, icon(CARDS[c.cardId].glyph, 24), h('span', {}, CARDS[c.cardId].name)));
        });
        if (!hand.length) row.append(h('span', { class: 'ch-none' }, 'Nothing in your hand helps here.'));
        handEl.append(row);
        body.append(handEl,
          h('div', { class: 'enc-log', attrs: { 'aria-live': 'polite', role: 'log' } }, log.slice(-5).map((l) => h('p', {}, l))),
          h('div', { class: 'win-actions' }, btn('Step back', () => { log.push('You step back. The page keeps flickering, patiently. Progress is kept.'); end('left'); }, 'small')),
        );
      },
    });

    function playCardHere(uid: number, w: { refresh(): void }) {
      const r = playCard(g, uid, { mode: 'combat' });
      if (!r.ok) return toast(r.reason ?? 'Not now.', 'info');
      r.notes.forEach((n) => log.push(n));
      if (r.negate) { e.data.negate = true; log.push('The Page Not Found settles over you. The next hit will pass through.'); }
      if (r.furyDown) {
        const weak = def.weakness && g.state.knowledge.includes(def.weakness.know) ? def.weakness.bonus : 0;
        lowerFury(g, e, r.furyDown + weak);
        log.push(weak ? 'The page lets out a long breath. You said the right thing. Strain down, hard.' : 'The page loosens a little. Strain down.');
      }
      if (r.peek) log.push(`You recall: ${r.peek}`);
      w.refresh();
    }

    // ---- phase 1: the banner
    function renderPattern(el: HTMLElement, w: { refresh(): void }) {
      const grid = h('div', { class: 'bh-grid', role: 'group', ariaLabel: 'Banner squares, 3 by 3' });
      for (let i = 0; i < 9; i++) {
        const on = shown ? pattern.includes(i) : picked.has(i);
        grid.append(h('button', {
          type: 'button', class: `bh-cell ${on ? 'on' : ''} ${shown ? 'shown' : ''}`, disabled: locked || shown,
          ariaLabel: `Square ${i + 1}, ${on ? 'lit' : 'dark'}`, attrs: { 'aria-pressed': on ? 'true' : 'false' }, dataset: { fk: `bh-cell-${i}` },
          onclick: () => { if (picked.has(i)) picked.delete(i); else picked.add(i); audio.sfx('click'); w.refresh(); },
        }));
      }
      el.append(grid, h('div', { class: 'enc-tools' },
        btn(`Look at the banner (${Math.max(0, looksMax() - looks)} left)`, () => {
          if (looks >= looksMax() || shown) return;
          looks++; shown = true; picked = new Set(); audio.sfx('chirp'); w.refresh();
          setTimeout(() => { shown = false; if (!finished) w.refresh(); }, 2200);
        }, 'small', { disabled: locked || shown || looks >= looksMax(), dataset: { fk: 'bh-look' } }),
        btn('Submit', () => {
          const ok = picked.size === pattern.length && pattern.every((c) => picked.has(c));
          if (ok) return phaseDone('The banner locks into place. The UNDER CONSTRUCTION tape goes slack, relieved.');
          picked = new Set();
          furyHit(1, 'The squares do not match. The banner flickers, hurt.');
        }, 'go small', { disabled: locked || shown || !picked.size, dataset: { fk: 'bh-submit' } }),
      ));
    }

    // ---- phase 2: the guestbook
    function renderForgery(el: HTMLElement, w: { refresh(): void }) {
      const list = h('div', { class: 'bh-entries', role: 'group', ariaLabel: 'Guestbook entries' });
      forgery.entries.forEach((en, i) => {
        list.append(h('button', {
          type: 'button', class: `bh-entry ${ruledOut.has(i) ? 'out' : ''}`, disabled: locked || ruledOut.has(i), dataset: { fk: `bh-entry-${i}` },
          onclick: () => {
            if (i === forgery.forged) return phaseDone(`"${en.name}" is not a visitor. It was the page, writing itself into its own guestbook. The entry dissolves, a little embarrassed.`);
            ruledOut.add(i);
            furyHit(1, `"${en.name}" is real. #${en.n} came and went, and the page flinches at being doubted.`);
          },
        }, h('b', {}, `#${en.n} — ${en.name}`), h('span', {}, en.text)));
      });
      el.append(h('p', { class: 'bh-counter', role: 'status' }, `Visitors so far: ${forgery.counter}`), list, h('div', { class: 'enc-tools' },
        sensesMax() > 0 ? btn(`Puzzle Sense: rule one out (${Math.max(0, sensesMax() - senses)})`, () => {
          if (senses >= sensesMax()) return;
          const cand = forgery.entries.map((_, i) => i).filter((i) => i !== forgery.forged && !ruledOut.has(i));
          if (!cand.length) return;
          senses++; ruledOut.add(cand[0]); toast('One of the entries just feels honest.', 'info'); w.refresh();
        }, 'small', { disabled: locked || senses >= sensesMax() }) : '',
      ));
    }

    // ---- phase 3: the cipher
    function renderCipher(el: HTMLElement, w: { refresh(): void }) {
      const enc = shiftWord(word);
      const hintStr = enc.split('').map((c, i) => (c === ' ' ? ' ' : i < senseLetters ? word[i] : '·')).join('');
      const input = h('input', { type: 'text', class: 'bh-input', ariaLabel: 'Your answer', attrs: { maxlength: 20, autocomplete: 'off', 'data-fk': 'bh-answer' } }) as HTMLInputElement;
      input.value = typedWord;
      input.addEventListener('input', () => { typedWord = input.value; });
      const submit = () => {
        const a = input.value.toUpperCase().trim();
        if (a === word) return phaseDone(`"${word}." The scrawl straightens into plain letters and the page, for a moment, looks like itself.`);
        input.value = ''; typedWord = '';
        furyHit(1, `"${a || '…'}" is not it. The letters wriggle away from you.`);
      };
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit(); });
      el.append(
        h('p', { class: 'bh-cipher', role: 'img', ariaLabel: `Shifted word: ${enc}` }, enc),
        senseLetters ? h('p', { class: 'bh-hint' }, `Sense: ${hintStr}`) : '',
        h('div', { class: 'enc-tools' }, input, btn('Submit', submit, 'go small', { dataset: { fk: 'bh-submit' }, disabled: locked }),
          sensesMax() > 0 ? btn(`Puzzle Sense: show a letter (${Math.max(0, sensesMax() - senses)})`, () => { if (senses >= sensesMax()) return; senses++; senseLetters++; w.refresh(); }, 'small', { disabled: locked || senses >= sensesMax() }) : ''),
      );
    }

    // ---- phase 4: the keys
    function renderSequence(el: HTMLElement, w: { refresh(): void }) {
      const keys = h('div', { class: 'bh-keys', role: 'group', ariaLabel: 'Four keys' });
      for (let k = 0; k < 4; k++) {
        keys.append(h('button', {
          type: 'button', class: `bh-key k${k} ${lit === k ? 'lit' : ''}`, disabled: locked || lit >= 0, ariaLabel: KEY_NAMES[k], dataset: { fk: `bh-key-${k}` },
          onclick: () => {
            audio.sfx('chirp');
            entered.push(k);
            if (entered[entered.length - 1] !== seq[entered.length - 1]) { entered = []; furyHit(1, 'Wrong key. The page forgets it was ever going to say anything.'); return; }
            if (entered.length === seq.length) return phaseDone('The last key sings and the whole page rings like a struck glass. It remembers.');
            w.refresh();
          },
        }, KEY_NAMES[k]));
      }
      const play = async () => {
        if (replays >= replaysMax() || lit >= 0) return;
        replays++; entered = [];
        for (const k of seq) {
          lit = k; audio.sfx('chirp'); w.refresh();
          await new Promise((r) => setTimeout(r, 520));
          lit = -1; w.refresh();
          await new Promise((r) => setTimeout(r, 200));
          if (finished) return;
        }
        w.refresh();
      };
      el.append(keys, h('div', { class: 'enc-tools' },
        h('span', {}, `Entered: ${entered.length} / ${seq.length}`),
        btn(`Play the sequence (${Math.max(0, replaysMax() - replays)} left)`, () => void play(), 'small', { disabled: locked || lit >= 0 || replays >= replaysMax(), dataset: { fk: 'bh-play' } })));
    }

    // ---- phase 5: the final choice
    function renderFinal(el: HTMLElement) {
      const choose = (id: 'restore' | 'rebuild' | 'broken') => {
        g.state.flags.bh_choice = id;
        if (id === 'restore') { raiseStat(g, 'memory', 2); changeVital(g, 'hp', 99); addItem(g, 'coffee', 1); phaseDone('You restore it to exactly how it was, down to the broken image. It is, for the first time, a perfect copy of a thing that was never perfect. Memory +2.'); }
        else if (id === 'rebuild') { raiseStat(g, 'creativity', 2); addItem(g, 'duct_tape', 1); phaseDone('You rebuild it, differently. New banner, new colours, same old counter. It looks nothing like it did and feels exactly right. Creativity +2.'); }
        else { raiseStat(g, 'chaos', 2); g.state.eleven.charges += 1; phaseDone('You leave it broken, on purpose, and say so. The page flickers once, in a way that is clearly a laugh. It is the nicest thing anyone has done for it. Chaos +2, and a spare 11:11.'); }
      };
      el.append(
        h('div', { class: 'final-opts' },
          btn('Restore it, exactly as it was', () => choose('restore'), 'go', { dataset: { fk: 'bh-restore' } }),
          btn('Rebuild it, differently', () => choose('rebuild'), '', { dataset: { fk: 'bh-rebuild' } }),
          btn('Leave it broken, and mean it', () => choose('broken'), 'magic', { dataset: { fk: 'bh-broken' } }),
        ),
        finalMsg ? h('p', {}, finalMsg) : '',
      );
    }
    void encState;
  });
}
