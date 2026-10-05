import { game } from '../core/runtime';
import { ITEMS } from '../data/items';
import { MEMORIES, memoryView } from '../data/memories';
import { QUESTS } from '../data/quests';
import { ENTRY_BY_ID } from '../data/guestbook';
import { BALANCE } from '../config/balance';
import { activeCreature } from '../systems/creatures';
import { questStatus } from '../systems/quests';
import { h, btn } from '../ui/dom';
import { icon } from '../ui/sprites';
import { navigate, registerZone, refreshView } from '../ui/router';
import { openSavePassword } from '../ui/settings';
import { openWindow } from '../ui/windows';
import { counterDigits } from '../systems/hits';
import { formatClock, dayNumber } from '../core/timeSystem';
import { badge88, footer, pageHeader } from './pageKit';

const WALLPAPERS: Array<{ id: string; label: string }> = [
  { id: 'stars', label: 'Starfield' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'checker', label: 'Checkerboard' },
  { id: 'grid', label: 'Grid' },
  { id: 'void', label: 'Void' },
];

interface Option {
  ref: string;
  label: string;
  icon: string;
  kind: string;
}

/** everything the player has discovered that can go on the page */
function options(): Option[] {
  const g = game();
  const out: Option[] = [];
  for (const [id, def] of Object.entries(ITEMS)) if (g.has(`has_had_${id}`)) out.push({ ref: `item:${id}`, label: def.name, icon: def.icon, kind: 'Item' });
  const pet = activeCreature(g);
  if (pet) out.push({ ref: `creature:${pet.id}`, label: pet.name, icon: 'chocobo', kind: 'Creature' });
  for (const m of g.state.memories) out.push({ ref: `memory:${m}`, label: memoryView(MEMORIES[m]).title, icon: MEMORIES[m].kind === 'photo' ? 'postcard' : MEMORIES[m].kind === 'voice' ? 'note' : 'quill', kind: 'Memory' });
  for (const t of BALANCE.hits.thresholds) if (g.has(`hits_${t}`)) out.push({ ref: `badge:${t}`, label: `${t} visitors`, icon: 'star', kind: 'Badge' });
  for (const q of QUESTS) if (questStatus(g, q) === 'done') out.push({ ref: `trophy:${q.id}`, label: q.title, icon: 'star', kind: 'Trophy' });
  for (const id of g.state.guestbook.read) if (ENTRY_BY_ID[id]) out.push({ ref: `entry:${id}`, label: `Entry: ${ENTRY_BY_ID[id].name}`, icon: 'quill', kind: 'Guestbook' });
  return out;
}

function describe(ref: string): { label: string; icon: string; sub?: string } | null {
  const [kind, id] = ref.split(':');
  if (kind === 'item' && ITEMS[id]) return { label: ITEMS[id].name, icon: ITEMS[id].icon, sub: ITEMS[id].rarity };
  if (kind === 'creature') {
    const c = activeCreature(game());
    return c ? { label: c.name, icon: 'chocobo', sub: 'companion' } : null;
  }
  if (kind === 'memory' && MEMORIES[id]) return { label: memoryView(MEMORIES[id]).title, icon: MEMORIES[id].kind === 'photo' ? 'postcard' : MEMORIES[id].kind === 'voice' ? 'note' : 'quill', sub: 'memory' };
  if (kind === 'badge') return { label: `${id} visitors`, icon: 'star', sub: 'badge' };
  if (kind === 'trophy') return { label: QUESTS.find((q) => q.id === id)?.title ?? id, icon: 'star', sub: 'trophy' };
  if (kind === 'entry' && ENTRY_BY_ID[id]) return { label: ENTRY_BY_ID[id].name, icon: 'quill', sub: 'pinned entry' };
  return null;
}

function pick(slot: number): void {
  const g = game();
  const opts = options();
  openWindow({
    id: 'mp-pick',
    title: 'Put something on your page',
    modal: true,
    width: 'min(560px, 98vw)',
    render: (body, w) => {
      body.append(
        opts.length ? h('div', { class: 'mp-options' }, opts.map((o) => btn([icon(o.icon, 24), ` ${o.label} `, h('small', {}, `(${o.kind})`)], () => { g.state.myPage.slots[slot] = o.ref; g.changed(); w.close(); refreshView(); }, 'small', { dataset: { fk: `mp-${o.ref}` } }))) : h('p', { class: 'empty' }, 'You have not found anything to show off yet.'),
        h('div', { class: 'win-actions' }, btn('Leave it empty', () => { g.state.myPage.slots[slot] = null; g.changed(); w.close(); refreshView(); }, 'small'), btn('Cancel', () => w.close(), 'small')),
      );
    },
  });
}

function render(): HTMLElement {
  const g = game();
  const mp = g.state.myPage;
  const done = QUESTS.filter((q) => questStatus(g, q) === 'done').length;
  const slots = h('div', { class: 'mp-slots', role: 'list', ariaLabel: 'Things on your page' });
  mp.slots.forEach((ref, i) => {
    const d = ref ? describe(ref) : null;
    slots.append(
      h('div', { class: `mp-slot ${d ? 'filled' : ''}`, role: 'listitem' },
        h('button', { type: 'button', class: 'mp-slot-btn', dataset: { fk: `slot-${i}` }, ariaLabel: d ? `${d.label}. Change.` : `Empty slot ${i + 1}. Put something here.`, onclick: () => pick(i) },
          d ? [icon(d.icon, 40), h('b', {}, d.label), h('small', {}, d.sub ?? '')] : [h('span', { class: 'plus' }, '+'), h('small', {}, 'put something here')]),
      ),
    );
  });
  const title = h('input', { type: 'text', value: mp.title, maxLength: 28, attrs: { 'aria-label': 'Your page title' }, on: { change: (e) => { mp.title = (e.target as HTMLInputElement).value || 'My Page!!'; g.changed(); } } });
  return h(
    'div',
    { class: `page mypage wall-${mp.wallpaper}` },
    pageHeader(`~ ${mp.title} ~`, 'visitor #73’s page. under construction, like all pages.'),
    h('div', { class: 'mp-grid' },
      h('section', { class: 't-box' }, h('h2', {}, '~ Trophy Shelf ~'), slots),
      h('aside', { class: 'mp-side' },
        h('section', { class: 't-box' }, h('h2', {}, '~ About This Visitor ~'),
          h('p', {}, `Day ${dayNumber(g.state.clock.minutes)}, ${formatClock(g.state.clock.minutes)}. Visitors: ${counterDigits(g.state.visitors)}.`),
          h('p', {}, `Quests finished: ${done}. Memories: ${g.state.memories.length}. Things learned: ${g.state.knowledge.length}.`),
          h('div', { class: 'badges' }, g.has('hits_100') ? badge88('100 VISITORS', 'b2') : '', g.has('hits_500') ? badge88('500 VISITORS', 'b3') : '', g.has('hits_1111') ? badge88('11:11 !!', 'b4') : '', g.has('boss_defeated') ? badge88('BEAT VM-1111', 'b6') : '')),
        h('section', { class: 't-box' }, h('h2', {}, '~ Decorate ~'),
          h('label', { class: 'mp-row' }, 'Title: ', title),
          h('fieldset', { class: 'mp-wall' }, h('legend', {}, 'Wallpaper'), WALLPAPERS.map((w) => h('label', {}, h('input', { type: 'radio', name: 'wp', checked: mp.wallpaper === w.id, on: { change: () => { mp.wallpaper = w.id; g.changed(); refreshView(); } } }), ` ${w.label}`))),
        ),
        h('section', { class: 't-box save-screen' }, h('h2', {}, '~ Save Screen ~'), h('p', {}, 'Your progress saves itself every time anything happens. For a shareable copy:'), btn('💾 Save password', () => void openSavePassword(), 'go')),
      ),
    ),
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    footer(),
  );
}

registerZone({ id: 'mypage', render });
