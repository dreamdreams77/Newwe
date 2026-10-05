import type { Game } from '../core/game';
import { coffeeState, dayNumber, formatClock } from '../core/timeSystem';
import { h, replaceChildren, btn, type Child } from './dom';
import { icon } from './sprites';
import { counterDigits } from '../systems/hits';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  hidden?: () => boolean;
  sep?: boolean;
}
export interface MenuDef {
  label: string;
  items: () => MenuItem[];
}

export interface ToolDef {
  key: string; // ui.revealed key
  panel: string;
  icon: string;
  early: string; // label in the homepage era
  late: string; // label once it's an RPG
}

export const TOOLS: ToolDef[] = [
  { key: 'inventory', panel: 'inventory', icon: 'folder', early: 'Downloads', late: 'Item' },
  { key: 'cards', panel: 'cards', icon: 'floppy', early: 'Bookmarks', late: 'Cards' },
  { key: 'journal', panel: 'journal', icon: 'book', early: 'History', late: 'Journal' },
  { key: 'stats', panel: 'stats', icon: 'heart', early: 'Profile', late: 'Status' },
  { key: 'creature', panel: 'creature', icon: 'chocobo', early: 'Pet', late: 'Pet' },
  { key: 'memories', panel: 'memories', icon: 'brain', early: 'Photos', late: 'Materia' },
  { key: 'handbook', panel: 'handbook', icon: 'book', early: 'Handbook', late: 'Handbook' },
  { key: 'inspector', panel: 'inspector', icon: 'lens', early: 'Inspector', late: 'Inspector' },
  { key: 'terminal', panel: 'terminal', icon: 'puzzle', early: 'Terminal', late: 'Terminal' },
  { key: 'mypage', panel: 'mypage', icon: 'star', early: 'My Page', late: 'My Page' },
];

export interface FrameRefs {
  root: HTMLElement;
  viewport: HTMLElement;
  setTitle(t: string): void;
  setAddress(url: string): void;
  setStatus(t: string): void;
  loading(): void;
  update(g: Game): void;
  addressInput: HTMLInputElement;
  soundBtn: HTMLButtonElement;
  held: HTMLElement;
  inspectBtn: HTMLButtonElement;
}

export interface FrameHandlers {
  back(): void;
  forward(): void;
  reload(): void;
  home(): void;
  stop(): void;
  go(text: string): void;
  openPanel(panel: string): void;
  toggleSound(): void;
  toggleInspect(): void;
  menus: MenuDef[];
  joke(text: string): void;
}

export function buildFrame(g: Game, hd: FrameHandlers): FrameRefs {
  const title = h('span', { class: 'tb-title' }, 'Netscrape Navigator');
  const addressInput = h('input', { type: 'text', id: 'address', value: '', attrs: { 'aria-label': 'Address', spellcheck: 'false', autocomplete: 'off' } });
  addressInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') hd.go(addressInput.value);
  });
  const loadingBar = h('div', { class: 'loading-bar' });
  const status = h('div', { class: 'cell grow' }, 'Document: Done');
  const zoneCell = h('div', { class: 'cell' }, '');
  const inspectBtn = h('button', { type: 'button', class: 'btn small', hidden: true, onclick: () => hd.toggleInspect() }, '🔍 Inspect: off');
  const soundBtn = h('button', { type: 'button', class: 'btn small', onclick: () => hd.toggleSound(), ariaLabel: 'Toggle sound' }, '♪ Sound: off');

  // menus
  const menubar = h('div', { class: 'menubar', role: 'menubar' });
  const closers: Array<() => void> = [];
  const closeAll = () => closers.forEach((c) => c());
  hd.menus.forEach((m) => {
    const wrap = h('div', { class: 'menu' });
    const trigger = h('button', { type: 'button', attrs: { 'aria-haspopup': 'true', 'aria-expanded': 'false' } }, m.label);
    const list = h('ul', { role: 'menu' });
    const close = () => {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    };
    closers.push(close);
    const build = () => {
      replaceChildren(list);
      m.items()
        .filter((i) => !i.hidden?.())
        .forEach((i) => {
          if (i.sep) return list.appendChild(h('li', { role: 'separator' }, h('hr')));
          list.appendChild(
            h('li', { role: 'none' }, h('button', { type: 'button', role: 'menuitem', onclick: () => (close(), i.onSelect()) }, i.label)),
          );
        });
    };
    trigger.addEventListener('click', () => {
      const was = wrap.classList.contains('open');
      closeAll();
      if (!was) {
        build();
        wrap.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        list.querySelector<HTMLElement>('button')?.focus();
      }
    });
    wrap.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        close();
        trigger.focus();
        ev.stopPropagation();
      }
    });
    wrap.append(trigger, list);
    menubar.appendChild(wrap);
  });
  document.addEventListener('click', (ev) => {
    if (!(ev.target as HTMLElement).closest('.menu')) closeAll();
  });

  // toolbar
  const navBtns = h(
    'div',
    { class: 'nav-btns' },
    btn('◄ Back', hd.back, '', { ariaLabel: 'Back' }),
    btn('Fwd ►', hd.forward, '', { ariaLabel: 'Forward' }),
    btn('⟳', hd.reload, '', { ariaLabel: 'Reload' }),
    btn('⌂ Home', hd.home, '', { ariaLabel: 'Home' }),
    btn('■', hd.stop, '', { ariaLabel: 'Stop and close windows' }),
  );
  const tools = h('div', { class: 'tools', role: 'toolbar', ariaLabel: 'Game panels' });
  const hud = h('div', { class: 'hud', role: 'group', ariaLabel: 'Vital signs' });
  const viewport = h('main', { class: 'viewport', id: 'content', tabindex: -1 });
  const held = h('div', { class: 'held-banner', attrs: { 'aria-live': 'polite' } });

  const root = h(
    'div',
    { class: 'browser' },
    h(
      'div',
      { class: 'titlebar' },
      icon('star', 16),
      title,
      h(
        'div',
        { class: 'tb-btns' },
        btn('_', () => hd.joke('You cannot minimise the internet.'), 'tb-btn', { ariaLabel: 'Minimise (decorative)' }),
        btn('□', () => hd.joke('It is already as maximised as it gets. 800×600 is a state of mind.'), 'tb-btn', { ariaLabel: 'Maximise (decorative)' }),
        btn('×', () => hd.joke('You can close this tab, but the page will still be there. Waiting.'), 'tb-btn', { ariaLabel: 'Close (decorative)' }),
      ),
    ),
    menubar,
    h('div', { class: 'toolbar' }, navBtns, h('div', { class: 'addr' }, h('label', { for: 'address' }, 'Address:'), addressInput, btn('Go', () => hd.go(addressInput.value), 'small')), tools),
    hud,
    h('div', { style: 'position:relative;flex:1;min-height:0;display:flex;flex-direction:column' }, loadingBar, viewport, held),
    h('div', { class: 'statusbar' }, status, zoneCell, inspectBtn, soundBtn),
  );

  const refs: FrameRefs = {
    root,
    viewport,
    addressInput,
    soundBtn,
    inspectBtn,
    held,
    setTitle(t) {
      title.textContent = `${t} - Netscrape Navigator`;
      document.title = t;
    },
    setAddress(url) {
      addressInput.value = url;
    },
    setStatus(t) {
      status.textContent = t;
    },
    loading() {
      loadingBar.classList.remove('go');
      void loadingBar.offsetWidth;
      loadingBar.classList.add('go');
    },
    update(game) {
      const s = game.state;
      // tools: revealed progressively; labels evolve with the website
      const late = s.stage >= 3;
      const visible = TOOLS.filter((t) => s.ui.revealed[t.key] || (t.key === 'mypage' && s.stage >= 3 && s.ui.revealed.mypage));
      replaceChildren(
        tools,
        visible.map((t) => {
          return h('button', { type: 'button', class: 'btn', ariaLabel: late ? t.late : t.early, onclick: () => hd.openPanel(t.panel), dataset: { tool: t.key } }, icon(t.icon, 18), h('span', { class: 't' }, late ? t.late : t.early));
        }),
      );
      // HUD
      const v = s.vitals;
      const cs = coffeeState(game);
      const hpPct = (v.hp / v.hpMax) * 100;
      const cpPct = (v.coffee / v.coffeeMax) * 100;
      const pips: Child[] = [];
      for (let i = 0; i < s.eleven.max; i++) pips.push(h('span', { class: `pip ${i < s.eleven.charges ? 'on' : ''}` }));
      const showEleven = s.ui.revealed.eleven;
      replaceChildren(
        hud,
        h('div', { class: 'bar-wrap' }, h('span', { class: 'lbl' }, 'HP'), h('div', { class: 'bar hp', attrs: { role: 'meter', 'aria-valuenow': v.hp, 'aria-valuemin': 0, 'aria-valuemax': v.hpMax, 'aria-label': 'HP' } }, h('i', { style: `width:${hpPct}%` }), h('span', { class: 'num' }, `${v.hp}/${v.hpMax}`))),
        h('div', { class: 'bar-wrap' }, h('span', { class: 'lbl' }, 'COFFEE'), h('div', { class: `bar coffee ${cs === 'low' || cs === 'empty' ? 'low' : cs === 'wired' ? 'wired' : ''}`, attrs: { role: 'meter', 'aria-valuenow': v.coffee, 'aria-valuemin': 0, 'aria-valuemax': v.coffeeMax, 'aria-label': 'Coffee' } }, h('i', { style: `width:${cpPct}%` }), h('span', { class: 'num' }, `${v.coffee}/${v.coffeeMax}`))),
        showEleven ? h('div', { class: 'bar-wrap limit', title: '11:11 charges: rare wishes' }, h('span', { class: 'lbl' }, '11:11'), h('span', { class: 'limit', attrs: { role: 'img', 'aria-label': `${s.eleven.charges} of ${s.eleven.max} wishes` } }, pips)) : null,
        cs === 'empty' ? h('span', { class: 'state-tag jitter' }, 'JITTERY') : cs === 'wired' ? h('span', { class: 'state-tag wired' }, 'WIRED') : null,
        h('div', { class: 'clock', attrs: { 'aria-label': `Time ${formatClock(s.clock.minutes)}, day ${dayNumber(s.clock.minutes)}` } }, formatClock(s.clock.minutes), h('span', { class: 'day' }, `DAY ${dayNumber(s.clock.minutes)}`)),
      );
      zoneCell.textContent = `Visitors: ${counterDigits(s.visitors)}`;
    },
  };
  refs.update(g);
  return refs;
}
