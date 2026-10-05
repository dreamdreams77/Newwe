import { game } from '../core/runtime';
import { createInitialState } from '../core/game';
import { formatClock, dayNumber } from '../core/timeSystem';
import { h, btn } from './dom';
import { openHexRepair } from './puzzle/hexRepair';
import { openSavePassword } from './settings';
import { alertWindow, openWindow, closeAllWindows, type WinHandle } from './windows';
import { toast } from './notifications';
import { statusLines } from '../systems/status';

/** The save screen, as an old RPG would show it. Some files are not what they claim. */
export function openSaveFiles(): WinHandle {
  const g = game();
  return openWindow({
    id: 'savefiles',
    title: 'SAVE / LOAD',
    icon: 'floppy',
    className: 'savefiles-win',
    width: 'min(640px, 98vw)',
    live: true,
    render: (body) => {
      const s = g.state;
      const finale = g.has('finale_ready');
      const corrupt = g.has('floppy_blown') || g.has('corrupt_fixed');
      const slot = (n: string, name: string, info: string, actions: Array<HTMLElement | string>, cls = '') =>
        h('div', { class: `slot ${cls}` }, h('span', { class: 'slot-n' }, `[${n}]`), h('span', { class: 'slot-name' }, name), h('span', { class: 'slot-info' }, info), h('span', { class: 'slot-act' }, actions));
      body.append(
        h('p', {}, 'Your game saves itself after everything you do. These are the files on this disk.'),
        slot('01', 'HOMEPAGE.HTML', `Visitor #${s.visitors} · Day ${dayNumber(s.clock.minutes)} ${formatClock(s.clock.minutes)}`, [btn('Password…', () => void openSavePassword(), 'small go', { dataset: { fk: 'slot1' } })]),
        slot('02', 'FINAL.HTML', finale ? 'You have been here before.' : '(not written yet)', finale ? [btn('New Game+', () => newGamePlus(), 'small warn', { dataset: { fk: 'slot2' } })] : [], finale ? '' : 'empty'),
        slot('03', corrupt ? 'CORRUPTED.HTML' : '(empty)', corrupt ? (g.has('corrupt_fixed') ? 'REPAIRED' : '3 BAD SECTORS') : '', corrupt ? [btn(g.has('corrupt_fixed') ? 'Open' : 'Repair…', () => void openHexRepair(), 'small', { dataset: { fk: 'slot3' } })] : [], corrupt ? 'bad' : 'empty'),
        slot('04', g.has('dev_open') ? 'UNKNOWN' : '????????', g.has('dev_open') ? (finale ? 'PARENT PROCESS' : 'ACCESS DENIED') : '', g.has('dev_open') ? [btn('Open', () => (finale ? void alertWindow('UNKNOWN', h('pre', { class: 'term-out' }, statusLines(g).join('\n'))) : toast('ACCESS DENIED. A parent process is required. (You do not have one. Yet.)', 'info')), 'small', { dataset: { fk: 'slot4' } })] : [], g.has('dev_open') ? '' : 'empty'),
      );
    },
  });
}

function newGamePlus(): void {
  const g = game();
  openWindow({
    id: 'ngp',
    title: 'WELCOME BACK.',
    modal: true,
    className: 'alert',
    render: (b, w) =>
      b.append(
        h('p', {}, "YOU'VE BEEN HERE BEFORE."),
        h('p', {}, "HAVEN'T YOU?"),
        h('p', {}, 'Badges, the handbook, and what the Inspector has learned come with you. Everything else is new. Some of it is not the same.'),
        h('div', { class: 'win-actions' }, btn('Begin again', () => {
          const old = g.state;
          const fresh = createInitialState((Date.now() ^ (Math.random() * 1e9)) >>> 0);
          fresh.badges = [...old.badges];
          fresh.handbook = [...old.handbook];
          fresh.inspector = { level: old.inspector.level, tiers: { ...old.inspector.tiers }, probes: 0 };
          fresh.knowledge = old.knowledge.filter((k) => ['dev_xor', 'inspector_url', 'terminus'].includes(k));
          fresh.settings = { ...old.settings };
          fresh.flags.ng = ((old.flags.ng as number) || 0) + 1;
          fresh.flags.inspector_on = true;
          fresh.ui.revealed = { inspector: true, handbook: true };
          g.replace(fresh);
          closeAllWindows();
          location.reload();
        }, 'warn', { attrs: { 'data-autofocus': '' } }), btn('Not yet', () => w.close(), 'small')),
      ),
  });
}
