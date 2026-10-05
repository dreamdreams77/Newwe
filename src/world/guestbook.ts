import { game } from '../core/runtime';
import { ENTRY_BY_ID, GUEST_ENTRIES, SIGN_PRESETS, type GuestEntry, type Seg } from '../data/guestbook';
import { test } from '../systems/conditions';
import { canTake, readEntry, signGuestbook, takeAttachment, visibleEntries } from '../systems/guestbook';
import { addVisitors } from '../systems/hits';
import { ITEMS } from '../data/items';
import { audio } from '../audio/audioManager';
import { h, btn } from '../ui/dom';
import { openDeduction } from '../ui/puzzle/deduction';
import { toast } from '../ui/notifications';
import { navigate, registerZone, refreshView } from '../ui/router';
import { icon } from '../ui/sprites';
import { openWindow } from '../ui/windows';
import { footer, pageHeader, ringBar } from './pageKit';

const MOOD_ICON: Record<string, string> = { star: 'star', ghost: 'ghost', eyes: 'lens', smile: 'smile', wink: 'smile', grin: 'smile', neutral: 'person' };

function segText(msg: Seg[]): Array<string | HTMLElement> {
  return msg.map((s) => (typeof s === 'string' ? s : h('span', { class: 'gb-tell' }, s.t)));
}

function popupGag(): void {
  const g = game();
  if (g.has('popups_closed')) {
    toast('You already got the prize. The prize was the experience.', 'funny');
    return;
  }
  let closed = 0;
  const lines = ['YOU ARE THE 1,000,000th VISITOR!!!', 'CONGRATULATIONS!!! CLAIM NOW!!!', 'WARNING: YOUR COMPUTER IS VERY HAPPY'];
  lines.forEach((text, i) => {
    const id = `popup-${i}`;
    openWindow({
      id,
      title: 'Special Offer!!!',
      className: `popup popup-${i}`,
      closable: false,
      width: '300px',
      render: (body, w) => {
        const x = btn('Close', () => {
          closed++;
          w.close();
          audio.sfx('close');
          if (closed >= lines.length) {
            g.state.flags.popups_closed = true;
            addVisitors(g, 11, 'closed the popups');
            toast('You close the last pop-up. A tiny visitor, who was hiding behind it, steps out. +11 visitors.', 'funny');
            g.changed();
          }
        }, 'small hot');
        let dodges = 0;
        x.addEventListener('pointerenter', () => {
          if (dodges++ < 2) x.style.transform = `translate(${(i % 2 ? -1 : 1) * 70}px, ${dodges * 8}px)`;
        });
        body.append(h('p', { class: 'popup-text blink' }, text), h('div', { class: 'win-actions' }, x));
      },
    });
  });
}

function entryCard(e: GuestEntry, fresh: boolean): HTMLElement {
  const g = game();
  const showEdit = e.edit && test(g, e.edit.when);
  const take = canTake(g, e);
  const taken = !!e.attachment && g.state.guestbook.taken.includes(e.id);
  const strangeAction = e.id === 'E_strange' && !g.has('deduction_solved');
  const date = e.strange && e.id !== 'E_final' ? h('span', { class: 'gb-date glitchy' }, e.date) : h('span', { class: 'gb-date' }, e.date);
  return h(
    'article',
    { class: `gb-entry ${e.strange ? 'strange' : ''} ${fresh ? 'fresh' : ''}`, dataset: { entry: e.id } },
    h('div', { class: 'gb-meta' }, icon(MOOD_ICON[e.mood] ?? 'person', 28), h('div', {}, h('b', { class: 'gb-name' }, e.name), h('div', { class: 'gb-from' }, `from ${e.from}`), date), fresh ? h('span', { class: 'new-tag blink' }, 'NEW!') : null),
    h('div', { class: 'gb-body' },
      h('p', { class: 'gb-msg' }, segText(e.msg)),
      showEdit ? h('p', { class: 'gb-edit' }, e.edit!.text) : null,
      e.spam ? h('p', {}, h('a', { href: '#', onclick: (ev: Event) => (ev.preventDefault(), popupGag()) }, 'www.totally-real-watches.biz')) : null,
      h('div', { class: 'gb-actions' },
        e.attachment && (take || taken) ? (taken ? h('span', { class: 'gb-taken' }, `📎 ${ITEMS[e.attachment.item].name} (you took it)`) : btn(`📎 ${e.attachment.label}`, () => { takeAttachment(g, e.id); refreshView(); }, 'small go', { dataset: { fk: `take-${e.id}` } })) : null,
        strangeAction ? btn('🔍 Investigate this entry', async () => { await openDeduction(); refreshView(); }, 'small hot', { dataset: { fk: 'investigate' } }) : null,
      ),
    ),
  );
}

function signForm(): HTMLElement {
  const g = game();
  const gb = g.state.guestbook;
  if (gb.signed) {
    const [name, text] = gb.signed.split('|');
    return h('section', { class: 't-box sign signed' }, h('h2', {}, '~ You signed it ~'), h('p', {}, `${name}: "${text}"`));
  }
  const name = h('input', { type: 'text', value: 'Visitor #73', maxLength: 24, attrs: { 'aria-label': 'Your name' } });
  const custom = h('input', { type: 'text', maxLength: 80, placeholder: '…or write your own (optional)', attrs: { 'aria-label': 'Custom message' } });
  let preset = 0;
  return h(
    'section',
    { class: 't-box sign' },
    h('h2', {}, '~ Sign my Guestbook!! ~'),
    h('div', { class: 'sign-row' }, h('label', {}, 'Name: ', name)),
    h('fieldset', { class: 'sign-presets' }, h('legend', {}, 'Say something'), SIGN_PRESETS.map((p, i) => h('label', {}, h('input', { type: 'radio', name: 'preset', checked: i === 0, on: { change: () => (preset = i) } }), ` ${p.text}`))),
    custom,
    btn('Sign!', () => {
      const reply = signGuestbook(g, name.value, preset, custom.value);
      toast(reply, 'funny');
      audio.sfx('page');
      refreshView();
    }, 'go', { dataset: { fk: 'sign' } }),
  );
}

let readTimer: ReturnType<typeof setTimeout> | null = null;

function render(): HTMLElement {
  const g = game();
  const entries = visibleEntries(g);
  const unread = new Set(entries.filter((e) => !g.state.guestbook.read.includes(e.id)).map((e) => e.id));
  if (readTimer) clearTimeout(readTimer);
  if (unread.size) {
    readTimer = setTimeout(() => {
      unread.forEach((id) => readEntry(g, id));
      g.changed();
    }, 1400);
  }
  return h(
    'div',
    { class: 'page guestbook-page' },
    pageHeader('~ Sign My Guestbook!! ~', 'please be nice. i read all of them. (i have not read all of them.)'),
    h('div', { class: 'gb-wrap' }, signForm(), h('section', { class: 'gb-list', ariaLabel: 'Guestbook entries' }, entries.map((e) => entryCard(e, unread.has(e.id))), h('p', { class: 'tiny' }, `${entries.length} entries shown. (Others may exist. Guestbooks are like that.)`))),
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    ringBar('guestbook'),
    footer(),
  );
}

registerZone({ id: 'guestbook', render, onLeave: () => { if (readTimer) clearTimeout(readTimer); } });
void ENTRY_BY_ID;
void GUEST_ENTRIES;
