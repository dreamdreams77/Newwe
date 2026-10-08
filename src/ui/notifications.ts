import type { ToastKind } from '../core/types';
import { h } from './dom';

let host: HTMLElement | null = null;

export function mountToasts(parent: HTMLElement): void {
  host = h('div', { class: 'toasts', attrs: { 'aria-live': 'polite', role: 'log', 'aria-relevant': 'additions' } });
  parent.appendChild(host);
}

const ICON: Record<ToastKind, string> = { info: '•', good: '+', bad: '!', item: '★', magic: '✦', funny: '~' };

export function toast(text: string, kind: ToastKind = 'info'): void {
  if (!host) return;
  const el = h('div', { class: `toast ${kind}` }, h('span', { class: 'ti', attrs: { 'aria-hidden': 'true' } }, ICON[kind]), h('span', { class: 'tt' }, text));
  host.appendChild(el);
  while (host.children.length > 3) host.removeChild(host.firstChild!);
  const inFight = !!document.querySelector('.combat-win');
  const ms = Math.min(inFight ? 2600 : 5000, 2400 + text.length * 30);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, ms);
  el.addEventListener('click', () => el.remove());
}
