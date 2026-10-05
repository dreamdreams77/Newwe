import { game } from '../core/runtime';
import { WORLD_BY_ID } from '../data/world';
import { errorLine, knownObjects, maskedClause, noteLine, objectState, probe } from '../systems/worldModel';
import { audio } from '../audio/audioManager';
import { h, btn } from './dom';
import { toast } from './notifications';
import { openWindow, type WinHandle } from './windows';

let selected: string | null = null;
export let inspectMode = false;
const subs = new Set<() => void>();
export const onInspectMode = (fn: () => void) => (subs.add(fn), () => subs.delete(fn));
export function setInspectMode(on: boolean): void {
  inspectMode = on;
  document.body.classList.toggle('inspecting', on);
  subs.forEach((f) => f());
}

const W = 34;
const pad = (s: string) => (s.length > W ? s.slice(0, W - 1) + '…' : s.padEnd(W));

const LOGIC: Record<string, string> = { ALL: 'ALL (every one)', ANY: 'ANY (one is enough)', XOR: 'XOR (exactly one)' };

/** the box, drawn like an old tool. Nothing here is a live variable dump: every line is masked by what you understand. */
export function inspectorLines(objId: string): string[] {
  const g = game();
  const o = WORLD_BY_ID[objId];
  const lines: string[] = [`OBJECT: ${o.label}`, `TYPE: ${o.kind}`, `STATE: ${objectState(g, o)}`, `LOGIC: ${LOGIC[o.mode]}`, '', 'DEPENDENCIES:'];
  for (const d of o.deps) {
    const c = maskedClause(g, o, d);
    lines.push(` ${c.met === null ? '[ ]' : c.met ? '[x]' : '[!]'} ${c.text}`);
  }
  const e = errorLine(g, o);
  if (e) lines.push('', e);
  const n = noteLine(g, o);
  if (n) lines.push('', `NOTE: ${n}`);
  const top = `╔${'═'.repeat(W + 2)}╗`;
  const mid = `╠${'═'.repeat(W + 2)}╣`;
  const bot = `╚${'═'.repeat(W + 2)}╝`;
  const row = (s: string) => `║ ${pad(s)} ║`;
  return [top, row(g.state.inspector.level >= 2 ? 'HOMEPAGE INSPECTOR  (debug on)' : 'HOMEPAGE INSPECTOR'), mid, ...lines.map(row), bot];
}

export function openInspector(object?: string): WinHandle {
  const g = game();
  if (!g.has('inspector_on')) {
    g.state.flags.inspector_on = true;
    g.state.inspector.level = Math.max(1, g.state.inspector.level);
    g.reveal('inspector');
    g.sfx('eleven');
    toast('THE INSPECTOR is running. It does not show you everything. It shows you what you can read.', 'magic');
    g.changed();
  }
  if (object) selected = object;
  return openWindow({
    id: 'inspector',
    title: 'inspector.exe',
    icon: 'lens',
    className: 'inspector-win',
    width: 'min(880px, 98vw)',
    live: true,
    render: (body, win) => {
      const objs = knownObjects(g);
      if (!selected || !objs.some((o) => o.id === selected)) selected = objs[0]?.id ?? null;
      const list = h('div', { class: 'insp-list', role: 'listbox', ariaLabel: 'Objects' });
      objs.forEach((o) =>
        list.append(h('button', { type: 'button', role: 'option', class: `insp-item ${o.id === selected ? 'sel' : ''}`, attrs: { 'aria-selected': o.id === selected ? 'true' : 'false' }, dataset: { fk: `io-${o.id}` }, onclick: () => ((selected = o.id), audio.sfx('click'), win.refresh()) }, h('span', { class: 'ii-id' }, o.label), h('span', { class: 'ii-state' }, objectState(g, o)))),
      );
      const view = h('pre', { class: 'insp-box', attrs: { role: 'region', 'aria-label': 'Inspector readout' } }, selected ? inspectorLines(selected).join('\n') : 'NO OBJECTS');
      const free = g.state.inspector.level >= 2;
      body.append(
        h('p', { class: 'insp-intro' }, 'Everything on this site is an object with a state and things it depends on. You can see what you understand. Probe to look deeper (it takes focus, and the right Observation).'),
        h('div', { class: 'insp-grid' }, list, h('div', { class: 'insp-main' }, view,
          h('div', { class: 'win-actions' },
            btn(free ? 'Probe (free)' : 'Probe (1 ☕)', () => {
              if (!selected) return;
              const r = probe(g, selected);
              toast(r.text, r.ok ? 'good' : 'info');
              audio.sfx(r.ok ? 'tick' : 'error');
              win.refresh();
            }, 'go', { dataset: { fk: 'probe' } }),
            btn(inspectMode ? 'Inspect mode: ON (click things on the page)' : 'Inspect mode: off', () => { setInspectMode(!inspectMode); if (inspectMode) win.close(); else win.refresh(); }, 'small', { title: 'While on, clicking an object on the page inspects it instead of using it.' }),
          ),
          h('p', { class: 'insp-key' }, '[ ] not understood   [x] true right now   [!] false right now'),
        )),
      );
    },
  });
}
