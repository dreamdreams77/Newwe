import { game } from '../../core/runtime';
import { CIPHER_KEYWORD, CIPHER_PLAIN, cipherAlphabet, encipher } from '../../data/puzzles';
import { audio } from '../../audio/audioManager';
import { addVisitors } from '../../systems/hits';
import { addItem } from '../../systems/inventory';
import { earnCard } from '../../systems/cards';
import { learn } from '../../systems/effects';
import { statValue } from '../../systems/stats';
import { BALANCE } from '../../config/balance';
import { h, btn } from '../dom';
import { toast } from '../notifications';
import { openWindow } from '../windows';

/**
 * A cryptogram. The cipher is a keyword alphabet, and the keyword is in the keeper's book,
 * which opens at the right page only if something bookmarks it. Puzzle Sense can show a
 * letter, a couple of times. It will not do the rest.
 */
export function openCryptogram(): Promise<boolean> {
  const g = game();
  return new Promise((resolve) => {
    const cipher = encipher(CIPHER_PLAIN);
    const alpha = cipherAlphabet(CIPHER_KEYWORD);
    const letters = [...new Set(cipher.split('').filter((c) => /[A-Z]/.test(c)))];
    const map: Record<string, string> = {};
    const inputs: Record<string, HTMLInputElement[]> = {};
    const keyKnown = g.has('book_key_known');
    let sensesUsed = 0;
    const sensesMax = Math.floor(statValue(g, 'puzzleSense') / 3);

    const solvedNow = () => letters.every((c) => map[c] === CIPHER_PLAIN[cipher.indexOf(c)]);
    const sync = () => {
      for (const c of letters) for (const el of inputs[c] ?? []) el.value = map[c] ?? '';
      for (const c of letters) for (const el of inputs[c] ?? []) el.classList.toggle('ok', !!map[c] && map[c] === CIPHER_PLAIN[cipher.indexOf(c)] && solvedNow());
    };

    const finish = (w: { close(): void }) => {
      g.state.flags.postcard_decoded = true;
      g.state.flags.clue_404 = true;
      learn(g, 'page_is_address');
      earnCard(g, 'secret_404');
      if (!g.has('has_had_lighthouse_lens')) addItem(g, 'lighthouse_lens', 1);
      addVisitors(g, BALANCE.hits.puzzle, 'decoded the postcard');
      audio.sfx('puzzle');
      toast('"THE PAGE IS NOT LOST. IT IS WAITING. 404 IS AN ADDRESS. BRING THE USELESS KEY." Somewhere a link on the homepage just stopped lying.', 'magic');
      g.changed();
      w.close();
    };

    openWindow({
      id: 'cipher',
      title: 'Postcard under the lamp',
      icon: 'postcard',
      className: 'cipher-win',
      width: 'min(760px, 98vw)',
      onClose: () => resolve(g.has('postcard_decoded')),
      render: (body, w) => {
        const words = cipher.split(' ');
        const grid = h('div', { class: 'cipher-grid', role: 'group', ariaLabel: 'Cryptogram' });
        words.forEach((word) => {
          const wEl = h('div', { class: 'cipher-word' });
          word.split('').forEach((ch) => {
            if (!/[A-Z]/.test(ch)) return wEl.append(h('div', { class: 'cipher-cell punct' }, h('span', { class: 'cc-top' }, ch), h('span', { class: 'cc-in' }, ' ')));
            const input = h('input', { type: 'text', maxLength: 1, class: 'cc-in', attrs: { 'aria-label': `Cipher letter ${ch}`, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', inputmode: 'text' } });
            (inputs[ch] ??= []).push(input);
            input.value = map[ch] ?? '';
            input.addEventListener('input', () => {
              const v = input.value.toUpperCase().replace(/[^A-Z]/g, '');
              if (v) map[ch] = v;
              else delete map[ch];
              sync();
              audio.sfx('click');
              if (v) {
                const all = Object.values(inputs).flat();
                const next = all[all.indexOf(input) + 1];
                next?.focus();
              }
              if (solvedNow()) finish(w);
            });
            wEl.append(h('div', { class: 'cipher-cell' }, h('span', { class: 'cc-top' }, ch), input));
          });
          grid.append(wEl);
        });
        body.append(
          h('p', {}, 'Under the lamp the glossy ink on the postcard glows. Not words. Letters, swapped for other letters, as if somebody wanted to be found only by someone who really tried.'),
          grid,
          keyKnown
            ? h('div', { class: 'cipher-key' }, h('b', {}, 'From the keeper’s book, page 11: '), h('div', { class: 'ck-rows' }, h('div', {}, 'PLAIN  ', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => h('i', {}, c))), h('div', {}, 'CIPHER ', ...alpha.split('').map((c) => h('i', {}, c)))))
            : h('p', { class: 'cipher-nokey' }, 'You do not know the key. Somewhere there is a book that does.'),
          h('div', { class: 'win-actions' },
            btn(`Puzzle Sense: show me one letter (${Math.max(0, sensesMax - sensesUsed)} left)`, () => {
              if (sensesUsed >= sensesMax) return;
              const unsolved = letters.filter((c) => map[c] !== CIPHER_PLAIN[cipher.indexOf(c)]);
              if (!unsolved.length) return;
              const count = (c: string) => cipher.split(c).length - 1;
              unsolved.sort((a, b) => count(b) - count(a));
              const pick = unsolved[Math.min(2, unsolved.length - 1)];
              map[pick] = CIPHER_PLAIN[cipher.indexOf(pick)];
              sensesUsed++;
              sync();
              audio.sfx('tick');
              if (solvedNow()) finish(w);
              else w.refresh();
            }, 'small', { disabled: sensesUsed >= sensesMax || sensesMax <= 0, title: 'It nudges. It does not solve.' }),
            btn('Put it away', () => w.close(), 'small'),
          ),
        );
        sync();
      },
    });
  });
}
