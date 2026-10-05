import { game } from '../../core/runtime';
import { addItem } from '../../systems/inventory';
import { addVisitors } from '../../systems/hits';
import { learn } from '../../systems/effects';
import { audio } from '../../audio/audioManager';
import { h, btn } from '../dom';
import { toast } from '../notifications';
import { openWindow } from '../windows';

const TEXT = 'THE PAGE REMEMBERS YOU. 11:11';
/** which bytes are damaged, and what they were changed to. (Three bad sectors.) */
const DAMAGE: Record<number, number> = { 5: 0x47, 14: 0x46, 23: 0x31 };

const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');

/**
 * CORRUPTED.HTML — a save file with three bad sectors. Not cosmetic: the contents are a clue,
 * and the repaired file gives you something. You fix it by reading the ASCII, and the row
 * checksums turn green when a row is right.
 */
export function openHexRepair(): Promise<boolean> {
  const g = game();
  return new Promise((resolve) => {
    const good = TEXT.split('').map((c) => c.charCodeAt(0));
    const bytes = good.map((b, i) => (g.has('corrupt_fixed') ? b : DAMAGE[i] ?? b));
    let sel = -1;
    const ROW = 10;
    const rowSum = (r: number) => bytes.slice(r * ROW, r * ROW + ROW).reduce((a, b) => a + b, 0) & 0xf;
    const goodSum = (r: number) => good.slice(r * ROW, r * ROW + ROW).reduce((a, b) => a + b, 0) & 0xf;
    const win = openWindow({
      id: 'hexrepair',
      title: 'CORRUPTED.HTML — 3 bad sectors',
      icon: 'floppy',
      className: 'hex-win',
      width: 'min(760px, 98vw)',
      onClose: () => resolve(g.has('corrupt_fixed')),
      render: (body, w) => {
        const rows = Math.ceil(bytes.length / ROW);
        const grid = h('div', { class: 'hex-grid', role: 'group', ariaLabel: 'File bytes' });
        for (let r = 0; r < rows; r++) {
          const rowEl = h('div', { class: 'hex-row' }, h('span', { class: 'hex-off' }, hex(r * ROW)));
          for (let i = r * ROW; i < Math.min(bytes.length, r * ROW + ROW); i++)
            rowEl.append(h('button', { type: 'button', class: `hex-b ${sel === i ? 'sel' : ''}`, ariaLabel: `Byte ${i}: ${hex(bytes[i])}`, dataset: { fk: `hb-${i}` }, onclick: () => ((sel = i), w.refresh()) }, hex(bytes[i])));
          const ok = rowSum(r) === goodSum(r);
          rowEl.append(h('span', { class: `hex-chk ${ok ? 'ok' : 'bad'}`, title: 'row checksum' }, `Σ${rowSum(r).toString(16).toUpperCase()} ${ok ? '✔' : '✘'}`));
          grid.append(rowEl);
        }
        const preview = h('pre', { class: 'hex-ascii', attrs: { 'aria-label': 'Decoded text' } }, String.fromCharCode(...bytes.map((b) => (b >= 32 && b < 127 ? b : 46))));
        const fixed = bytes.every((b, i) => b === good[i]);
        const input = h('input', { type: 'text', maxLength: 1, class: 'hex-in', attrs: { 'aria-label': 'Replace the selected byte with this character', autocomplete: 'off' }, disabled: sel < 0 });
        input.addEventListener('input', () => {
          const c = input.value.toUpperCase();
          if (sel >= 0 && c) {
            bytes[sel] = c.charCodeAt(0);
            audio.sfx('click');
            input.value = '';
            if (bytes.every((b, i) => b === good[i])) return solved(w);
            w.refresh();
          }
        });
        body.append(
          h('p', {}, 'The file will not open. Three sectors are damaged. Select a byte, type the character it should be. The row checksums show which rows are right.'),
          grid,
          h('div', { class: 'hex-side' }, h('b', {}, 'Reads as: '), preview),
          h('label', { class: 'hex-edit' }, sel >= 0 ? `Byte ${sel} (${hex(bytes[sel])}) should be: ` : 'Select a byte first. ', input),
          fixed ? h('p', {}, 'The file is whole.') : '',
          h('div', { class: 'win-actions' }, btn('Close', () => w.close(), 'small')),
        );
      },
    });
    const solved = (w: { close(): void }) => {
      g.state.flags.corrupt_fixed = true;
      g.state.flags.bug_found = true;
      learn(g, 'save_remembers');
      addItem(g, 'crt_goggles', 1);
      addVisitors(g, 60, 'repaired a corrupted file');
      audio.sfx('puzzle');
      toast('The file opens. It says: THE PAGE REMEMBERS YOU. 11:11. Inside the sector table, a pair of green-tinted goggles.', 'magic');
      g.changed();
      w.close();
    };
    void win;
  });
}
