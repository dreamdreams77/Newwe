import { clear, focusables, h, trapFocus, type Child } from './dom';
import { icon } from './sprites';

export interface WinOpts {
  id: string;
  title: string;
  icon?: string;
  className?: string;
  /** called to (re)build the body. Re-called by refresh(). */
  render: (body: HTMLElement, win: WinHandle) => void;
  onClose?: () => void;
  modal?: boolean; // blocks the page behind it and cannot be dismissed by clicking outside
  closable?: boolean;
  width?: string;
  role?: 'dialog' | 'alertdialog';
  /** re-render automatically whenever game state changes */
  live?: boolean;
}

export interface WinHandle {
  el: HTMLElement;
  body: HTMLElement;
  close(): void;
  refresh(): void;
}

let layer: HTMLElement | null = null;
const open = new Map<string, { handle: WinHandle; restore: HTMLElement | null; release: () => void; opts: WinOpts }>();

export function mountWindows(parent: HTMLElement): void {
  layer = h('div', { class: 'windows' });
  parent.appendChild(layer);
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const top = topWindow();
    if (top && top.opts.closable !== false && !(ev.target as HTMLElement)?.closest?.('.menu')) {
      ev.stopPropagation();
      top.handle.close();
    }
  });
}

function topWindow() {
  const all = [...open.values()];
  return all[all.length - 1];
}

export function isOpen(id: string): boolean {
  return open.has(id);
}
export function anyModalOpen(): boolean {
  return [...open.values()].some((w) => w.opts.modal);
}
export function refreshWindow(id: string): void {
  open.get(id)?.handle.refresh();
}
export function refreshLive(): void {
  for (const w of open.values()) if (w.opts.live) w.handle.refresh();
}
export function refreshAll(): void {
  for (const w of open.values()) w.handle.refresh();
}
export function closeAllWindows(): void {
  for (const w of [...open.values()]) w.handle.close();
}

export function openWindow(opts: WinOpts): WinHandle {
  if (!layer) throw new Error('windows not mounted');
  const existing = open.get(opts.id);
  if (existing) {
    existing.handle.refresh();
    focusIn(existing.handle.el);
    return existing.handle;
  }
  const restore = document.activeElement as HTMLElement | null;
  const body = h('div', { class: 'win-body' });
  const closeBtn = opts.closable === false ? null : h('button', { type: 'button', class: 'btn tb-btn win-x', ariaLabel: `Close ${opts.title}`, onclick: () => handle.close() }, '×');
  const titleId = `win-title-${opts.id}`;
  const el = h(
    'div',
    { class: `window ${opts.className ?? ''}`, role: opts.role ?? 'dialog', attrs: { 'aria-modal': 'true', 'aria-labelledby': titleId }, style: opts.width ? `width:${opts.width}` : undefined },
    h('div', { class: 'win-title' }, opts.icon ? icon(opts.icon, 16) : null, h('span', { class: 'wt', id: titleId }, opts.title), closeBtn),
    body,
  );
  const backdrop = h('div', { class: `win-backdrop ${opts.modal ? 'modal' : ''}` }, el);
  if (!opts.modal && opts.closable !== false) {
    backdrop.addEventListener('mousedown', (ev) => {
      if (ev.target === backdrop) handle.close();
    });
  }
  const release = trapFocus(el);
  const handle: WinHandle = {
    el,
    body,
    refresh() {
      const st = body.scrollTop;
      const active = document.activeElement as HTMLElement | null;
      const fk = active && body.contains(active) ? active.dataset.fk : undefined;
      clear(body);
      opts.render(body, handle);
      body.scrollTop = st;
      if (fk) body.querySelector<HTMLElement>(`[data-fk="${fk}"]`)?.focus();
    },
    close() {
      if (!open.has(opts.id)) return;
      open.delete(opts.id);
      release();
      backdrop.remove();
      opts.onClose?.();
      if (restore && document.contains(restore)) restore.focus();
    },
  };
  open.set(opts.id, { handle, restore, release, opts });
  layer.appendChild(backdrop);
  opts.render(body, handle);
  focusIn(el);
  return handle;
}

function focusIn(el: HTMLElement): void {
  const f = focusables(el);
  const pref = el.querySelector<HTMLElement>('[data-autofocus]');
  (pref ?? f.find((x) => !x.classList.contains('win-x')) ?? f[0] ?? el).focus();
}

/** convenience: a simple message window */
export function alertWindow(title: string, content: Child, okLabel = 'OK'): Promise<void> {
  return new Promise((resolve) => {
    openWindow({
      id: `alert-${Date.now()}`,
      title,
      modal: true,
      closable: false,
      className: 'alert',
      render: (body, w) => {
        body.append(h('div', { class: 'alert-text' }, content), h('div', { class: 'win-actions' }, h('button', { type: 'button', class: 'btn', onclick: () => (w.close(), resolve()), attrs: { 'data-autofocus': '' } }, okLabel)));
      },
    });
  });
}
