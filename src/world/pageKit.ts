import { game } from '../core/runtime';
import { OWNER } from '../data/personal';
import { WEBRING } from '../data/zones';
import { counterDigits } from '../systems/hits';
import { test } from '../systems/conditions';
import { audio } from '../audio/audioManager';
import { h, btn, type Child } from '../ui/dom';
import { navigate } from '../ui/router';
import { toast } from '../ui/notifications';
import { icon } from '../ui/sprites';
import { hasItem } from '../systems/inventory';
import type { ZoneId } from '../core/types';
import { openTicketRide } from './ticket';

/** the little odometer. At stage 2+ a digit sometimes misbehaves. */
export function odometer(value: number, label = 'Visitor counter'): HTMLElement {
  const g = game();
  const digits = counterDigits(value).split('');
  return h(
    'div',
    { class: 'odometer', role: 'img', ariaLabel: `${label}: ${value}` },
    digits.map((d, i) => h('span', { class: `dig ${g.state.stage >= 2 && i === digits.length - 2 ? 'glitchy' : ''}`, attrs: { 'aria-hidden': 'true' } }, d)),
  );
}

export function marquee(text: string): HTMLElement {
  return h('div', { class: 'marquee', role: 'marquee', attrs: { 'aria-label': text } }, h('span', { attrs: { 'aria-hidden': 'true' } }, text));
}

export function badge88(text: string, cls = ''): HTMLElement {
  return h('span', { class: `badge88 ${cls}`, title: text }, text);
}

export function underConstructionBar(text = 'UNDER CONSTRUCTION'): HTMLElement {
  return h('div', { class: 'uc-bar' }, h('span', { class: 'uc-text' }, `⚠ ${text} ⚠`));
}

export function pageHeader(title: string, sub?: string): HTMLElement {
  return h('header', { class: 'page-header' }, h('h1', { class: 'rainbow-text' }, title), sub ? h('p', { class: 'page-sub' }, sub) : null);
}

export function footer(): HTMLElement {
  return h('footer', { class: 'page-footer' }, h('hr', { class: 'hr-rainbow' }), h('p', {}, `© 2001–2003 ${OWNER.handle}. All rights reserved. Last updated: sometime.`), h('p', { class: 'tiny' }, 'Best viewed in Netscrape Navigator 4.7 at 800×600. Made with Notepad. Powered by coffee.'));
}

/** the ring bar at the bottom of every site: Prev · Next · Random · Bullet Train */
export function ringBar(current: ZoneId): HTMLElement {
  const g = game();
  const open = WEBRING.filter((t) => !t.future && test(g, t.unlock) && g.state.flags[`visited_${t.zone}`]);
  const order: ZoneId[] = ['home', ...(open.map((t) => t.zone) as ZoneId[])];
  const idx = Math.max(0, order.indexOf(current));
  const prev = order[(idx - 1 + order.length) % order.length];
  const next = order[(idx + 1) % order.length];
  const rand = order.filter((z) => z !== current);
  const label = (z: ZoneId) => (z === 'home' ? 'Home' : WEBRING.find((t) => t.zone === z)?.label ?? z);
  const hasTicket = hasItem(g, 'train_ticket');
  return h(
    'nav',
    { class: 'ringbar', ariaLabel: 'Web ring' },
    h('span', { class: 'ring-title' }, '~ the 11:11 web ring ~'),
    btn(`◄ ${label(prev)}`, () => navigate(prev), 'small', { disabled: order.length < 2 }),
    btn('Random', () => rand.length && navigate(rand[g.rng.int(0, rand.length - 1)]), 'small', { disabled: !rand.length }),
    btn(`${label(next)} ►`, () => navigate(next), 'small', { disabled: order.length < 2 }),
    hasTicket ? btn([icon('trainticket', 16), ' Bullet Train'], () => openTicketRide(), 'small hot') : null,
  );
}

export function funnyToast(lines: string[]): void {
  const g = game();
  toast(lines[(g.state.counters.actions + g.state.visitors) % lines.length], 'funny');
  audio.sfx('tick');
}

export type { Child };
