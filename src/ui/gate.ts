import { game } from '../core/runtime';
import { WORLD_BY_ID } from '../data/world';
import { maskedClause, objectOk } from '../systems/worldModel';
import { audio } from '../audio/audioManager';
import { h, btn } from './dom';
import { toast } from './notifications';
import { navigate } from './router';
import { openWindow } from './windows';

/**
 * A pseudo-code lock. It looks like code; it is a logic puzzle. You never have to write any:
 * you have to work out what the lines mean and make the world satisfy them. XOR means exactly one.
 */
export function openDevGate(): void {
  const g = game();
  if (!g.has('dev_gate_seen')) {
    g.state.flags.dev_gate_seen = true;
    g.changed();
  }
  if (g.has('dev_open')) return void navigate('dev');
  const o = WORLD_BY_ID['dev.gate'];
  openWindow({
    id: 'devgate',
    title: '/dev/ — 403',
    icon: 'ghost',
    className: 'gate-win',
    width: 'min(700px, 98vw)',
    live: true,
    render: (body, win) => {
      const c = (i: number) => {
        const m = maskedClause(g, o, o.deps[i]);
        return h('span', { class: `gc ${m.met === null ? 'unk' : m.met ? 'ok' : 'bad'}` }, m.met === null ? m.text : `${m.text}  ${m.met ? '✔' : '✘'}`);
      };
      body.append(
        h('p', {}, 'FORBIDDEN. (But not very.) The server wants a reason:'),
        h('pre', { class: 'code' },
          'IF  ', c(0), '\n',
          'AND ', c(1), '\n',
          'AND ', c(2), '\n\n',
          'THEN\n    OPEN("/dev/")\nELSE\n    RETURN "403 FORBIDDEN (but not very.)"',
        ),
        h('p', { class: 'insp-key' }, 'Lines you cannot read yet show "?". The Inspector can look deeper. People leave notes under traffic cones.'),
        h('div', { class: 'win-actions' },
          btn('Try the door', () => {
            if (objectOk(g, o)) {
              g.state.flags.dev_open = true;
              audio.sfx('door');
              toast('The door was never locked. It was waiting for the right combination of true and false.', 'magic');
              g.changed();
              win.close();
              navigate('dev');
            } else {
              audio.sfx('error');
              toast('403. FORBIDDEN. (It was not very convincing.)', 'info');
              win.refresh();
            }
          }, 'go', { dataset: { fk: 'trygate' } }),
        ),
      );
    },
  });
}
