import { game } from '../core/runtime';
import { VERSIONS, currentVersion } from '../data/versions';
import { test } from '../systems/conditions';
import { h, btn } from './dom';
import { openWindow, type WinHandle } from './windows';

let viewing: string | null = null;

/** about:version — the site's own history. Old versions remember things differently. */
export function openVersions(): WinHandle {
  const g = game();
  return openWindow({
    id: 'versions',
    title: 'about:version',
    icon: 'book',
    className: 'versions-win',
    width: 'min(760px, 98vw)',
    live: true,
    render: (body, win) => {
      const open = VERSIONS.filter((v) => test(g, v.unlock));
      body.append(h('h3', {}, `SITE VERSION ${currentVersion(open)}`));
      for (const v of VERSIONS) {
        const k = test(g, v.unlock);
        const sec = h('section', { class: `ver ${k ? '' : 'locked'}` }, h('h4', {}, k ? `v${v.v}  —  ${v.date}` : 'v???'));
        if (k) {
          sec.append(h('ul', {}, v.notes.map((n) => h('li', {}, n))), btn(viewing === v.v ? 'Hide the old page' : 'View the old page', () => ((viewing = viewing === v.v ? null : v.v), win.refresh()), 'small', { dataset: { fk: `ver-${v.v}` } }));
          if (viewing === v.v) sec.append(h('pre', { class: 'source-pre' }, v.snapshot.join('\n')));
        } else sec.append(h('p', { class: 'hb-unk' }, 'UNKNOWN'));
        body.append(sec);
      }
    },
  });
}
