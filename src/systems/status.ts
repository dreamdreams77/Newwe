import type { Game } from '../core/game';
import { WORLD } from '../data/world';
import { objectOk, objectState, knownObjects } from './worldModel';
import { test } from './conditions';

/** SYSTEM STATUS — the shape of what is actually running the website. Built from the same world model. */
export function statusLines(g: Game): string[] {
  const s = g.state;
  const done = g.has('finale_ready');
  const known = knownObjects(g);
  const errs = known.filter((o) => o.error && test(g, o.error.reveal) && !objectOk(g, o)).length;
  const mem = Math.min(97, 38 + known.length * 4 + s.memories.length * 2);
  const proc = (name: string, ok: boolean, state?: string) => `  ${name.padEnd(15)} ${state ?? (ok ? 'RUNNING' : 'STOPPED')}`;
  const lamp = WORLD.find((o) => o.id === 'lighthouse.lamp')!;
  return [
    'SYSTEM STATUS',
    '',
    'UPTIME:   8,394 DAYS',
    `MEMORY:   ${mem}%`,
    `VISITORS: ${s.visitors.toLocaleString('en-US')}`,
    `ERRORS:   ${done ? 0 : errs}`,
    '',
    'PROCESSES:',
    proc('homepage.exe', true),
    proc('guestbook.exe', g.has('visited_guestbook')),
    proc('lighthouse.exe', g.has('lamp_lit'), g.has('visited_lighthouse') ? objectState(g, lamp) : 'NOT LOADED'),
    proc('creature.exe', !!s.creatures.chocobo?.met, s.creatures.chocobo?.met ? 'RUNNING' : 'WAITING'),
    proc('memory.exe', s.memories.length > 0, s.memories.length ? `RUNNING (${s.memories.length})` : 'IDLE'),
    proc('eleven.exe', g.has('eleven_first'), g.has('eleven_first') ? `RUNNING (${s.eleven.charges} held)` : 'SCHEDULED'),
    proc('???', done, done ? 'RUNNING' : '...'),
    '',
    'PARENT PROCESS:',
    done ? '  UNKNOWN (not yet found)' : '  ???',
    '',
    'STATUS: ' + (done ? 'RUNNING' : 'STARTING'),
  ];
}
