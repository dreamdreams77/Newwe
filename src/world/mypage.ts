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
import { BADGES } from '../data/badges';
import { ZONES, WEBRING } from '../data/zones';
import { KNACKS, picked as pickedKnacks } from '../systems/knacks';
import { identity } from '../systems/identity';
import { equippedDefs } from '../systems/equipment';
import { CROSSWORD } from './terminalPage';
import { toast } from '../ui/notifications';
import { badge88, footer, marquee, pageHeader } from './pageKit';

type G = ReturnType<typeof game>;
const WALLPAPERS: Array<{ id: string; label: string; unlock?: (g: G) => boolean; how?: string }> = [
  { id: 'stars', label: 'Starfield' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'checker', label: 'Checkerboard' },
  { id: 'grid', label: 'Grid' },
  { id: 'void', label: 'Void' },
  { id: 'woods', label: 'The Woods', unlock: (g) => g.has('tree_ring_taken'), how: 'count the rings of the Old Oak' },
  { id: 'aurora', label: 'Southern Lights', unlock: (g) => g.has('tas_aurora'), how: 'tell the sky what it wants to hear' },
  { id: 'glitch', label: 'Stacked Pages', unlock: (g) => g.has('bh_defeated'), how: 'help the Broken Homepage remember' },
  { id: 'terminal', label: 'Green on Black', unlock: (g) => ((g.state.flags.cw_solved as string) ?? '').split(',').filter(Boolean).length >= CROSSWORD.length, how: 'finish the Terminal crossword' },
];

/** things you can add to the page; each is earned, and each is a switch */
const DECOR: Array<{ id: string; label: string; unlock: (g: G) => boolean; how: string }> = [
  { id: 'marquee', label: 'Scrolling marquee', unlock: () => true, how: '' },
  { id: 'counter', label: 'Hit counter', unlock: (g) => g.has('hits_100'), how: 'reach 100 visitors' },
  { id: 'tape', label: 'Under-construction tape', unlock: (g) => g.has('visited_construction'), how: 'visit the construction page' },
  { id: 'sparkle', label: 'Sparkles', unlock: (g) => g.has('hits_500'), how: 'reach 500 visitors' },
  { id: 'lamp', label: 'The lamp, lit', unlock: (g) => g.has('lamp_lit'), how: 'light the lighthouse' },
  { id: 'ring', label: 'Web ring banner', unlock: (g) => g.has('visited_lake'), how: 'visit another site on the ring' },
];
const decorOn = (g: G): string[] => (typeof g.state.flags.mp_decor === 'string' ? (g.state.flags.mp_decor as string).split(',').filter(Boolean) : ['marquee']);

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
  for (const z of WEBRING) if (g.has(`visited_${z.zone}`)) out.push({ ref: `place:${z.zone}`, label: z.label, icon: 'postcard', kind: 'Place' });
  for (const id of pickedKnacks(g)) if (KNACKS.find((k) => k.id === id)) out.push({ ref: `knack:${id}`, label: `Knack: ${KNACKS.find((k) => k.id === id)!.label}`, icon: 'bulb', kind: 'Knack' });
  for (const b of BADGES) if (g.state.badges.includes(b.id)) out.push({ ref: `award:${b.id}`, label: b.title, icon: 'star', kind: 'Award' });
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
  if (kind === 'place') return { label: WEBRING.find((z) => z.zone === id)?.label ?? ZONES[id as keyof typeof ZONES]?.title ?? id, icon: 'postcard', sub: 'place' };
  if (kind === 'knack') return { label: KNACKS.find((k) => k.id === id)?.label ?? id, icon: 'bulb', sub: 'knack' };
  if (kind === 'award') return { label: BADGES.find((b) => b.id === id)?.title ?? id, icon: 'star', sub: 'award' };
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

/** the journey so far, in plain words (also what "copy my page" copies) */
function journeyLines(): string[] {
  const g = game();
  const s = g.state;
  const idn = identity(g);
  const places = WEBRING.filter((z) => g.has(`visited_${z.zone}`)).length + 1; // + home
  const gear = equippedDefs(g).map((d) => d.name);
  const bosses = [g.has('boss_defeated') ? 'VM-1111' : '', g.has('bh_defeated') ? `The Broken Homepage (${String(s.flags.bh_choice ?? 'restored')})` : ''].filter(Boolean);
  return [
    `${s.myPage.title}  --  visitor #73's page`,
    `Day ${dayNumber(s.clock.minutes)}, ${formatClock(s.clock.minutes)}. Visitors: ${counterDigits(s.visitors)}.`,
    `Playstyle: ${idn ? idn.label : 'Drifter'}.${pickedKnacks(g).length ? ' Knacks: ' + pickedKnacks(g).map((k) => KNACKS.find((x) => x.id === k)?.label ?? k).join(', ') + '.' : ''}`,
    `Places on the ring: ${places}. Memories: ${s.memories.length}. Things learned: ${s.knowledge.length}. Awards: ${s.badges.length}.`,
    `Wearing: ${gear.length ? gear.join(', ') : 'nothing in particular'}.`,
    `Bosses: ${bosses.length ? bosses.join('; ') : 'none yet'}.`,
    g.has('act3_done') ? 'The parent process: found.' : 'The parent process: not yet found.',
  ];
}

function render(): HTMLElement {
  const g = game();
  const mp = g.state.myPage;
  while (mp.slots.length < 8) mp.slots.push(null);
  const done = QUESTS.filter((q) => questStatus(g, q) === 'done').length;
  const on = decorOn(g);
  const earnedBadges = BADGES.filter((b) => g.state.badges.includes(b.id));
  const wallpaperOk = (w: (typeof WALLPAPERS)[number]) => !w.unlock || w.unlock(g);
  if (!WALLPAPERS.find((w) => w.id === mp.wallpaper && wallpaperOk(w))) mp.wallpaper = 'stars';
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
    { class: `page mypage wall-${mp.wallpaper} ${on.includes('sparkle') ? 'mp-sparkle' : ''} ${on.includes('tape') ? 'mp-tape' : ''}` },
    pageHeader(`~ ${mp.title} ~`, 'visitor #73’s page. under construction, like all pages.'),
    on.includes('marquee') ? marquee(`~*~ welcome to ${mp.title} ~*~ ${journeyLines()[2]} ~*~`) : '',
    h('div', { class: 'mp-grid' },
      h('div', { class: 'mp-main' },
        h('section', { class: 't-box' }, h('h2', {}, '~ Trophy Shelf ~'), slots),
        h('section', { class: 't-box' }, h('h2', {}, '~ Awards ~'),
          earnedBadges.length ? h('div', { class: 'badges', role: 'list', ariaLabel: 'Awards earned' }, earnedBadges.map((b) => h('span', { role: 'listitem', class: 'badge88', title: `${b.title}: ${b.text}`, style: `background:linear-gradient(${b.colour},#112)` }, b.title))) : h('p', { class: 'empty' }, 'Nothing yet. They appear here by themselves, the way they used to.'),
          h('p', { class: 'tiny' }, `${earnedBadges.length} of ${BADGES.length} (some are hidden until you earn them).`)),
        h('section', { class: 't-box' }, h('h2', {}, '~ The Journey So Far ~'),
          h('ul', { class: 'mp-journey' }, journeyLines().slice(1).map((l) => h('li', {}, l))),
          on.includes('ring') ? h('p', { class: 'tiny' }, '~ a proud member of the 11:11 web ring ~') : '',
          btn('Copy my page as text', async () => { try { await navigator.clipboard.writeText(journeyLines().join('\n')); toast('Copied. Paste it anywhere.', 'good'); } catch { toast('Could not copy. (Select the text above instead.)', 'info'); } }, 'small', { dataset: { fk: 'mp-copy' } })),
      ),
      h('aside', { class: 'mp-side' },
        h('section', { class: 't-box' }, h('h2', {}, '~ About This Visitor ~'),
          h('p', {}, `Day ${dayNumber(g.state.clock.minutes)}, ${formatClock(g.state.clock.minutes)}. Visitors: ${counterDigits(g.state.visitors)}.`),
          h('p', {}, `Quests finished: ${done}. Memories: ${g.state.memories.length}. Things learned: ${g.state.knowledge.length}.`),
          h('div', { class: 'badges' }, g.has('hits_100') ? badge88('100 VISITORS', 'b2') : '', g.has('hits_500') ? badge88('500 VISITORS', 'b3') : '', g.has('hits_1111') ? badge88('11:11 !!', 'b4') : '', g.has('boss_defeated') ? badge88('BEAT VM-1111', 'b6') : ''),
          on.includes('counter') ? h('p', { class: 'mp-counter', role: 'status' }, `visitors: ${counterDigits(g.state.visitors)}`) : '',
          on.includes('lamp') ? h('p', { class: 'mp-lamp' }, '🕯 the lamp is lit') : ''),
        h('section', { class: 't-box' }, h('h2', {}, '~ Decorate ~'),
          h('label', { class: 'mp-row' }, 'Title: ', title),
          h('fieldset', { class: 'mp-wall' }, h('legend', {}, 'Wallpaper'), WALLPAPERS.map((w) => { const ok = wallpaperOk(w); return h('label', { title: ok ? '' : `Locked: ${w.how}` }, h('input', { type: 'radio', name: 'wp', checked: mp.wallpaper === w.id, disabled: !ok, on: { change: () => { mp.wallpaper = w.id; g.changed(); refreshView(); } } }), ` ${w.label}${ok ? '' : ` (locked: ${w.how})`}`); })),
          h('fieldset', { class: 'mp-decor' }, h('legend', {}, 'Decorations'), DECOR.map((d) => { const ok = d.unlock(g); return h('label', { title: ok ? '' : `Locked: ${d.how}` }, h('input', { type: 'checkbox', checked: on.includes(d.id), disabled: !ok, dataset: { fk: `decor-${d.id}` }, on: { change: (e) => { const next = new Set(decorOn(g)); if ((e.target as HTMLInputElement).checked) next.add(d.id); else next.delete(d.id); g.state.flags.mp_decor = [...next].join(','); g.changed(); refreshView(); } } }), ` ${d.label}${ok ? '' : ` (locked: ${d.how})`}`); })),
        ),
        h('section', { class: 't-box save-screen' }, h('h2', {}, '~ Save Screen ~'), h('p', {}, 'Your progress saves itself every time anything happens. For a shareable copy:'), btn('💾 Save password', () => void openSavePassword(), 'go')),
      ),
    ),
    h('div', { class: 'back-link' }, btn('◄ Back to the homepage', () => navigate('home'), 'small')),
    footer(),
  );
}

registerZone({ id: 'mypage', render });
