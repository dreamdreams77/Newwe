import type { Game } from '../core/game';
import { CREATURE_HB } from './handbookData';
import { ITEMS } from '../data/items';
import { MEMORIES, memoryView } from '../data/memories';
import { RECIPES } from '../data/recipes';
import { ZONES } from '../data/zones';
import { ENCOUNTERS } from '../data/encounters';
import { VERSIONS } from '../data/versions';
import { ITEM_HISTORY } from '../data/itemHistory';
import { BADGES } from '../data/badges';
import type { Cond } from '../core/types';
import { test } from './conditions';

export interface HbLine {
  text: string;
  known: boolean;
}
export interface HbEntry {
  id: string;
  title: string; // "UNKNOWN" if the player does not know it exists
  known: boolean;
  lines: HbLine[];
}
export interface HbCategory {
  id: string;
  label: string;
  entries: HbEntry[];
}

const L = (text: string, known = true): HbLine => ({ text, known });
const when = (g: Game, c: Cond | undefined) => !c || test(g, c);

/**
 * The Webmaster's Handbook. It never fills itself in: every line is gated on something you
 * actually discovered, and unknown entries show as UNKNOWN. Counting them is part of the fun.
 */
export function buildHandbook(g: Game): HbCategory[] {
  const cats: HbCategory[] = [];

  // items
  const items = Object.values(ITEMS).map((i): HbEntry => {
    const known = g.has(`has_had_${i.id}`);
    const lines: HbLine[] = [L(i.description, known)];
    lines.push(L(`Tags: ${i.tags.join(', ')}`, known));
    for (const h of ITEM_HISTORY[i.id] ?? []) lines.push(L(`v${h.v}  ${h.text}`, known && when(g, h.when)));
    return { id: i.id, title: known ? i.name : 'UNKNOWN', known, lines };
  });
  cats.push({ id: 'items', label: 'Items', entries: items });

  // creatures
  cats.push({
    id: 'creatures',
    label: 'Creatures',
    entries: CREATURE_HB.map((c) => {
      const known = !!g.state.creatures[c.id]?.met;
      const cr = g.state.creatures[c.id];
      return {
        id: c.id,
        title: known ? c.name : g.has('chocobo_noticed') && c.id === 'chocobo' ? 'SOMETHING THAT PEEPS' : 'UNKNOWN',
        known,
        lines: [L(c.blurb, known), L(`Likes: ${c.likes}`, known && (cr?.fedLog.length ?? 0) > 1), L(`Learned: ${(cr?.learned ?? []).join(', ') || 'nothing yet'}`, known)],
      };
    }),
  });

  // zones
  cats.push({
    id: 'zones',
    label: 'Zones',
    entries: ['home', 'guestbook', 'construction', 'lake', 'lighthouse', 'e404', 'dungeon'].map((z): HbEntry => {
      const known = g.has(`visited_${z}`);
      return { id: z, title: known ? ZONES[z].title : 'UNKNOWN', known, lines: [L(ZONES[z].url, known), L(ZONES[z].hint[0]?.text ?? '', known && g.zone(z).visits > 1)] };
    }),
  });

  // bosses
  cats.push({
    id: 'bosses',
    label: 'Bosses',
    entries: Object.values(ENCOUNTERS).map((e): HbEntry => {
      const known = !!g.state.encounters[e.id];
      return {
        id: e.id,
        title: known ? e.name : 'UNKNOWN',
        known,
        lines: [L(e.intro, known), ...e.phases.flatMap((p) => p.reveals.map((r) => L(`${p.title.replace(/^Phase \d — /, '')}: ${r.text.replace('Boss Knowledge: ', '')}`, g.state.knowledge.includes(r.know)))), L(`Beaten: ${g.has('boss_defeated') ? 'yes' : 'no'}`, known)],
      };
    }),
  });

  // recipes (never the unmade ones)
  const made = RECIPES.filter((r) => g.state.recipes.discovered.includes(r.id));
  cats.push({
    id: 'recipes',
    label: 'Recipes',
    entries: [...made.map((r): HbEntry => ({ id: r.id, title: r.name, known: true, lines: [L(r.inputs.map((i) => ITEMS[i].name).join(' + ')), L(r.category === 'riddle' ? 'It cared what time it was.' : r.category === 'chaos' ? 'Results vary.' : 'Obvious, in hindsight.')] })), ...RECIPES.filter((r) => !made.includes(r)).map((r): HbEntry => ({ id: r.id, title: 'UNKNOWN', known: false, lines: [L('', false)] }))],
  });

  // errors
  const ERRORS: Array<{ code: string; text: string; cond: Cond }> = [
    { code: '404', text: 'PAGE NOT FOUND. Sometimes it is an address.', cond: { flag: 'visited_e404' } },
    { code: 'E_LAMP_JAM', text: 'Lamp mechanism wedged. Needs something stubborn.', cond: { know: 'marl_lamp_stuck' } },
    { code: 'E_JUDGE', text: 'A unit that has not been wrong since installation.', cond: { flag: 'boss_defeated' } },
    { code: 'E_DATE', text: 'Timestamps from the future. Handle with care.', cond: { flag: 'read_E_strange' } },
    { code: '403', text: 'FORBIDDEN. (But not very.)', cond: { flag: 'dev_gate_seen' } },
    { code: 'E_WHO', text: 'Visitor source: unresolved.', cond: { visitors: 500 } },
  ];
  cats.push({ id: 'errors', label: 'Errors', entries: ERRORS.map((e): HbEntry => { const k = test(g, e.cond); return { id: e.code, title: k ? e.code : 'UNKNOWN', known: k, lines: [L(e.text, k)] }; }) });

  // npcs
  const NPCS = [
    { id: 'bob', name: 'Bob (not THAT Bob)', text: 'Construction. Wants coffee, then gives tape.', flag: 'met_bob', more: 'bob_coffee_given', moreText: 'Believes the Bob Rule is the only rule.' },
    { id: 'gus', name: 'Gus, Swan-Boat Clerk', text: 'Tickets. Rules. A tiny secret about yoghurt.', flag: 'met_gus', more: 'gus_yoghurt_seen', moreText: 'Knows Marl. Says not to say.' },
    { id: 'marl', name: 'Marl, Keeper', text: 'Keeps a lamp that has been stuck since a certain November.', flag: 'met_marl', more: 'marl_asked_yoghurt', moreText: 'Wants plain yoghurt, not vanilla.' },
  ];
  cats.push({ id: 'npcs', label: 'NPCs', entries: NPCS.map((n): HbEntry => { const k = g.has(n.flag); return { id: n.id, title: k ? n.name : 'UNKNOWN', known: k, lines: [L(n.text, k), L(n.moreText, g.has(n.more)), L('Is not always right. Check.', k && g.has('rumor_checked'))] }; }) });

  // memories
  cats.push({ id: 'memories', label: 'Memories', entries: Object.values(MEMORIES).map((m): HbEntry => { const k = g.state.memories.includes(m.id); const v = memoryView(m); return { id: m.id, title: k ? v.title : 'UNKNOWN', known: k, lines: [L(v.text, k), L(`Became: ${m.becomes}`, k)] }; }) });

  // versions
  cats.push({ id: 'versions', label: 'Versions', entries: VERSIONS.map((v): HbEntry => { const k = test(g, v.unlock); return { id: v.v, title: k ? `v${v.v}  (${v.date})` : 'UNKNOWN', known: k, lines: v.notes.map((n) => L(n, k)) }; }) });

  // badges
  const earned = g.state.badges;
  cats.push({
    id: 'badges',
    label: 'Badges',
    entries: BADGES.filter((b) => !b.hidden || earned.includes(b.id)).map((b): HbEntry => { const k = earned.includes(b.id); return { id: b.id, title: k ? b.title : 'UNKNOWN', known: k, lines: [L(b.text, k)] }; }).concat(
      BADGES.filter((b) => b.hidden && !earned.includes(b.id)).length ? [{ id: 'hidden', title: `${BADGES.filter((b) => b.hidden && !earned.includes(b.id)).length} more you have not found`, known: false, lines: [L('', false)] }] : [],
    ),
  });

  // ???
  const final = g.has('finale_ready');
  cats.push({ id: 'unknown', label: '???', entries: [{ id: 'what', title: final ? 'WHAT IS RUNNING THIS WEBSITE?' : '???', known: final, lines: [L('See: SYSTEM STATUS (about:status).', final), L('Parent process: not yet found.', final)] }] });
  return cats;
}

export function handbookProgress(g: Game): { known: number; total: number } {
  let known = 0;
  let total = 0;
  for (const c of buildHandbook(g)) {
    if (c.id === 'badges' || c.id === 'unknown') continue;
    for (const e of c.entries) {
      total++;
      if (e.known) known++;
    }
  }
  return { known, total };
}
