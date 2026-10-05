import { game } from '../core/runtime';
import { buildHandbook, handbookProgress } from '../systems/handbook';
import { RUMORS, verdict } from '../systems/rumors';
import { h } from './dom';
import { openWindow, type WinHandle } from './windows';

let tab = 'items';

export function openHandbook(): WinHandle {
  const g = game();
  g.reveal('handbook');
  return openWindow({
    id: 'handbook',
    title: "The Webmaster's Handbook",
    icon: 'book',
    className: 'handbook-win',
    width: 'min(860px, 98vw)',
    live: true,
    render: (body, win) => {
      const cats = buildHandbook(g);
      const prog = handbookProgress(g);
      const tabs = h('div', { class: 'hb-tabs', role: 'tablist' }, cats.map((c) => h('button', { type: 'button', role: 'tab', class: `hb-tab ${c.id === tab ? 'sel' : ''}`, attrs: { 'aria-selected': c.id === tab ? 'true' : 'false' }, dataset: { fk: `hb-${c.id}` }, onclick: () => ((tab = c.id), win.refresh()) }, c.label)));
      const cat = cats.find((c) => c.id === tab) ?? cats[0];
      const list = h('div', { class: 'hb-list' });
      for (const e of cat.entries) {
        const entry = h('article', { class: `hb-entry ${e.known ? 'known' : 'unknown'}` }, h('h4', {}, e.title));
        for (const l of e.lines) if (l.text || !e.known) entry.append(h('p', { class: l.known ? '' : 'hb-unk' }, l.known ? l.text : 'UNKNOWN'));
        list.append(entry);
      }
      if (cat.id === 'npcs' || cat.id === 'bosses') {
        const rs = RUMORS.filter((r) => g.has(`rumor_heard_${r.id}`));
        if (cat.id === 'npcs' && rs.length)
          list.append(h('section', { class: 'hb-rumors' }, h('h4', {}, 'Rumours you have heard'), h('ul', {}, rs.map((r) => { const v = verdict(g, r); return h('li', {}, `"${r.text}" — ${r.who}: `, h('b', { class: `v-${v}` }, v === 'true' ? 'checked: TRUE' : v === 'false' ? 'checked: FALSE' : 'unchecked'), v !== 'open' && r.verdictText[v] ? ` (${r.verdictText[v]})` : ''); }))));
      }
      body.append(h('p', { class: 'hb-prog' }, `Entries understood: ${prog.known} of ${prog.total}. The rest say UNKNOWN. That is on purpose.`), tabs, list);
    },
  });
}
