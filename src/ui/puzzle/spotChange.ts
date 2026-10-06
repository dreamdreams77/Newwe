import { game } from '../../core/runtime';
import { timeOfDay } from '../../core/timeSystem';
import { DIFFS } from '../../data/tasmania';
import { passTime } from '../../systems/actions';
import { learn } from '../../systems/effects';
import { raiseStat, statValue, changeVital } from '../../systems/stats';
import { audio } from '../../audio/audioManager';
import { h, btn } from '../dom';
import { paintTasmania } from '../scenes';
import { toast } from '../notifications';
import { openWindow } from '../windows';

/**
 * Spot the change: the 2001 photograph and the 2003 one. Click on the right-hand picture where something is new.
 * Observation lets you squint at one; a coffee buys a plain-words description of one (for everyone who cannot
 * see the pictures well). The five letters you find, left to right, are the word the sky wants after dark.
 */
export function openSpotChange(): Promise<boolean> {
  const g = game();
  return new Promise((resolve) => {
    const found = new Set<string>(((g.state.flags.tas_found as string) ?? '').split(',').filter(Boolean));
    let misses = 0;
    let squints = 0;
    let glow: string | null = null;
    let note = 'Click on the right-hand photograph, wherever something is new.';
    const squintsMax = () => Math.floor(statValue(g, 'observation') / 3);
    const tod = timeOfDay(g.state.clock.minutes) === 'night' ? 'dusk' : timeOfDay(g.state.clock.minutes);
    const save = () => { g.state.flags.tas_found = [...found].join(','); g.changed(); };

    const finish = (w: { close(): void }) => {
      g.state.flags.tas_diffs = true;
      learn(g, 'tas_south');
      raiseStat(g, 'observation', 1);
      audio.sfx('puzzle');
      toast('Five changes. Left to right the letters spell S-O-U-T-H. The sky, somewhere, perks up.', 'magic');
      w.close();
    };

    openWindow({
      id: 'spotchange',
      title: 'Two photographs',
      icon: 'postcard',
      className: 'spot-win',
      width: 'min(980px, 99vw)',
      onClose: () => resolve(g.has('tas_diffs')),
      render: (body, w) => {
        const mk = (variant: 'A' | 'B') => {
          const cv = h('canvas', { class: 'px spot-canvas', attrs: { width: 320, height: 180, role: 'img', 'aria-label': variant === 'A' ? 'The coast, 2001' : 'The coast, 2003. Five things have changed.' } }) as HTMLCanvasElement;
          paintTasmania(cv.getContext('2d')!, 320, 180, tod, variant);
          return cv;
        };
        const a = mk('A');
        const b = mk('B');
        const wrapB = h('div', { class: 'spot-wrap' }, b);
        for (const d of DIFFS) {
          if (found.has(d.id) || glow === d.id) {
            wrapB.append(h('i', { class: `spot-ring ${found.has(d.id) ? 'ok' : 'glow'}`, style: `left:${(d.x / 320) * 100}%;top:${(d.y / 180) * 100}%;width:${((d.r * 2) / 320) * 100}%;height:${((d.r * 2) / 180) * 100}%` }));
          }
        }
        b.addEventListener('click', (ev) => {
          const rect = b.getBoundingClientRect();
          const x = ((ev.clientX - rect.left) / rect.width) * 320;
          const y = ((ev.clientY - rect.top) / rect.height) * 180;
          const hit = DIFFS.find((d) => !found.has(d.id) && Math.hypot(d.x - x, d.y - y) <= d.r);
          if (!hit) {
            misses++;
            audio.sfx('click');
            note = misses % 4 === 0 ? 'Nothing there. (Take your time. The photographs are not going anywhere.)' : 'Nothing new there.';
            if (misses % 4 === 0) passTime(g, 1);
            return w.refresh();
          }
          found.add(hit.id);
          glow = null;
          audio.sfx('chirp');
          note = `Found it: ${hit.label}. (${found.size} of ${DIFFS.length})`;
          save();
          if (found.size >= DIFFS.length) return finish(w);
          w.refresh();
        });
        const letters = DIFFS.map((d) => (found.has(d.id) ? d.letter : '_')).join(' ');
        body.append(
          h('div', { class: 'spot-pair' },
            h('figure', {}, a, h('figcaption', {}, '2001')),
            h('figure', {}, wrapB, h('figcaption', {}, '2003'))),
          h('p', { class: 'spot-letters', role: 'status', ariaLabel: `Letters found: ${letters}` }, letters),
          h('p', { class: 'enc-sub', role: 'status' }, note),
          h('div', { class: 'enc-tools' },
            statValue(g, 'observation') >= 3 ? btn(`Squint (${Math.max(0, squintsMax() - squints)})`, () => {
              if (squints >= squintsMax()) return;
              const left = DIFFS.filter((d) => !found.has(d.id));
              if (!left.length) return;
              squints++; glow = left[0].id; note = 'Something on the right-hand picture shimmers, just slightly.'; w.refresh();
            }, 'small', { disabled: squints >= squintsMax(), dataset: { fk: 'spot-squint' } }) : '',
            btn('Describe one in words (1 Coffee)', () => {
              if (g.state.vitals.coffee < 1) return void toast('You are too tired to describe anything. (Needs 1 Coffee.)', 'info');
              const left = DIFFS.filter((d) => !found.has(d.id));
              if (!left.length) return;
              changeVital(g, 'coffee', -1);
              note = `In 2003 there is ${left[0].label}.`;
              w.refresh();
            }, 'small', { dataset: { fk: 'spot-describe' } }),
            btn('Step away', () => w.close(), 'small'),
          ),
        );
      },
    });
  });
}
