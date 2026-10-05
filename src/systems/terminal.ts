import type { Game } from '../core/game';
import { ITEMS } from '../data/items';
import { ITEM_HISTORY } from '../data/itemHistory';
import { VERSIONS, currentVersion } from '../data/versions';
import { WORLD } from '../data/world';
import { WEBRING, ZONES } from '../data/zones';
import { test } from './conditions';
import { describeObject, knownObjects, objectState } from './worldModel';
import { formatClock } from '../core/timeSystem';
import { nextHint } from './hints';
import { statusLines } from './status';
import { DEV_FILES } from '../data/devFiles';
import { inventoryList } from './inventory';

export interface TermResult {
  lines: string[];
  clear?: boolean;
  exit?: boolean;
  /** side-effect hooks the UI can honour */
  open?: 'inspector' | 'version';
}

const ALIASES: Record<string, string> = { '?': 'help', ls: 'links', dir: 'links', who: 'whoami', ver: 'version', inv: 'inventory', i: 'inventory', l: 'look', cls: 'clear', quit: 'exit', logout: 'exit' };

/** The terminal. Documented commands are few; the rest you discover. Every answer is read from the world. */
export function runCommand(g: Game, raw: string): TermResult {
  const line = raw.trim();
  if (!line) return { lines: [] };
  const [c0, ...rest] = line.split(/\s+/);
  const cmd = (ALIASES[c0.toLowerCase()] ?? c0.toLowerCase());
  const args = rest.map((a) => a.toLowerCase());
  const s = g.state;
  switch (cmd) {
    case 'help':
      return { lines: ['HELP  LOOK  STATUS  INVENTORY  MAP  LINKS  WHOAMI  DEBUG  VERSION', '(some commands are not listed. that is not a bug. probably.)'] };
    case 'look': {
      const z = ZONES[s.zone];
      const objs = knownObjects(g).filter((o) => o.zone === s.zone);
      const out = [`${z.title}  <${z.url}>`];
      if (objs.length) out.push(...objs.map((o) => `  you see: ${o.label}  [${objectState(g, o)}]`));
      const hint = nextHint(g, s.zone);
      out.push(hint ? `  a feeling: ${hint}` : '  you have seen everything here that there is to see. for now.');
      return { lines: out };
    }
    case 'status':
      return { lines: [`HP ${s.vitals.hp}/${s.vitals.hpMax}  COFFEE ${s.vitals.coffee}/${s.vitals.coffeeMax}  11:11 x${s.eleven.charges}`, `CLOCK ${formatClock(s.clock.minutes)}  VISITORS ${s.visitors}  STAGE ${s.stage}`, ...(g.has('finale_ready') ? ['', ...statusLines(g)] : [])] };
    case 'inventory': {
      const inv = inventoryList(g);
      return { lines: inv.length ? inv.map((i) => `  ${i.def.name}${i.stack.qty > 1 ? ' x' + i.stack.qty : ''}`) : ['  (empty. the page is mostly air.)'] };
    }
    case 'map': {
      const has = (z: string) => g.has(`visited_${z}`);
      const node = (z: string, name: string) => (has(z) ? `[${name}]` : '[ ? ]');
      const lines = [`            ${node('home', 'HOME')}`, '             |', `   ${node('guestbook', 'GUESTBOOK')}--+--${node('construction', 'CONSTRUCTION')}`, '             |', `      ${node('lake', 'POND')}----${node('lighthouse', 'LIGHT')}`];
      if (g.has('clue_404')) lines.push('             |', `          ${node('e404', '404')}${g.has('e404_open') ? '--' + node('dungeon', 'DUNGEON') : ''}`);
      if (g.has('ticket_terminus')) lines.push('  (the bullet train links everything you have seen)');
      return { lines };
    }
    case 'links':
      return { lines: WEBRING.map((t) => `  ${(!t.future && test(g, t.unlock) ? t.label : t.alt).padEnd(34)} ${t.future ? '[under construction]' : test(g, t.unlock) ? '[up]' : '[broken image]'}`) };
    case 'whoami':
      if (args.includes('--verbose') || args.includes('-v')) return { lines: s.visitors >= 1111 ? ['PLAYER: UNKNOWN', 'VISITOR: 1111', 'STATUS: EXPECTED'] : ['PLAYER: UNKNOWN', `VISITOR: ${s.visitors}`, 'STATUS: PENDING'] };
      return { lines: ['PLAYER: UNKNOWN'] };
    case 'debug':
      if (!g.has('inspector_on')) return { lines: ['debug: permission denied. (nothing is watching you yet.)'] };
      return { lines: [`debug level: ${s.inspector.level}`, g.has('dev_open') ? 'change it in /dev/debug.cfg' : 'a config file somewhere changes this. it is not linked from anywhere.'] };
    case 'inspect': {
      if (!g.has('inspector_on')) return { lines: ['inspect: command not found'] };
      const q = args[0];
      if (!q) return { lines: ['usage: inspect <object>', ...knownObjects(g).map((o) => '  ' + o.label)] };
      const o = knownObjects(g).find((x) => x.label.toLowerCase() === q || x.id === q);
      return o ? { lines: describeObject(g, o) } : { lines: [`inspect: ${q}: no such object (that you know of)`] };
    }
    case 'version':
      return { lines: [`site version ${currentVersion(VERSIONS.filter((v) => test(g, v.unlock)))}`, ...VERSIONS.filter((v) => test(g, v.unlock)).map((v) => `  v${v.v}  ${v.date}`)], open: 'version' };
    case 'history': {
      const q = args.join('_');
      const id = Object.keys(ITEMS).find((i) => i === q || ITEMS[i].name.toLowerCase().replace(/[^a-z]+/g, '_').startsWith(q));
      if (!q || !id || !g.has(`has_had_${id}`)) return { lines: ['usage: history <item you have seen>'] };
      return { lines: [ITEMS[id].name, ...(ITEM_HISTORY[id] ?? []).filter((h) => !h.when || test(g, h.when)).map((h) => `  v${h.v}  ${h.text}`)] };
    }
    case 'cat': {
      if (!g.has('dev_open')) return { lines: [`cat: ${args[0] ?? ''}: no such file`] };
      const f = DEV_FILES.find((d) => d.name === args[0]);
      return f ? { lines: f.text(g) } : { lines: ['cat: no such file. try: ' + DEV_FILES.map((d) => d.name).join(' ')] };
    }
    case 'ping':
      return { lines: args[0] === '1111' ? ['reply from visitor 1111: expected.'] : [`ping: ${args[0] ?? ''}: nobody by that name. (yet.)`] };
    case 'sudo':
      return { lines: ['player is not in the sudoers file. this incident will be reported to the webmaster.', g.has('dev_open') ? '(he knows. he left the door open on purpose. mostly.)' : ''].filter(Boolean) };
    case 'xyzzy':
      return { lines: ['nothing happens.', '(a hollow voice says: wrong game.)'] };
    case 'unlock': {
      if (args[0] === '404') return { lines: ['unlock: 404 is not locked. it is not found. different thing.'] };
      return { lines: ['unlock: what?'] };
    }
    case 'objects':
      return g.has('inspector_on') ? { lines: WORLD.filter((o) => test(g, o.known)).map((o) => `  ${o.id.padEnd(22)} ${objectState(g, o)}`) } : { lines: ['objects: command not found'] };
    case 'clear':
      return { lines: [], clear: true };
    case 'exit':
      return { lines: ['connection closed by foreign host. (not that foreign.)'], exit: true };
    default:
      return { lines: [`${c0}: command not found. try HELP. or don't.`] };
  }
}
