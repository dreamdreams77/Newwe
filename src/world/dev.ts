import { game } from '../core/runtime';
import { DEV_FILES } from '../data/devFiles';
import { addItem, hasItem } from '../systems/inventory';
import { learn } from '../systems/effects';
import { openVersions } from '../ui/versions';
import { audio } from '../audio/audioManager';
import { h, btn } from '../ui/dom';
import { toast } from '../ui/notifications';
import { navigate, registerZone } from '../ui/router';
import { icon, spriteURL } from '../ui/sprites';
import { alertWindow, openWindow } from '../ui/windows';
import { openTerminal } from '../ui/terminal';

const UNUSED = ['chocobo2', 'portrait_w', 'coin', 'person', 'floppy', 'goggles'];

function viewFile(name: string): void {
  const g = game();
  const f = DEV_FILES.find((x) => x.name === name)!;
  openWindow({
    id: 'devfile',
    title: name,
    icon: 'book',
    className: 'source-win',
    width: 'min(680px, 98vw)',
    render: (b, w) => {
      b.append(h('pre', { class: 'source-pre' }, f.text(g).join('\n')));
      if (name === 'debug.cfg') {
        b.append(h('div', { class: 'win-actions' }, btn(g.state.inspector.level >= 2 ? 'Change debug=1 back to 0' : 'Change debug=0 to debug=1', () => {
          g.state.inspector.level = g.state.inspector.level >= 2 ? 1 : 2;
          audio.sfx('eleven');
          toast(g.state.inspector.level >= 2 ? 'debug=1. The Inspector stops charging you for looking, and sees a little further.' : 'debug=0.', 'magic');
          g.changed();
          w.refresh();
        }, 'warn')));
      }
    },
  });
}

function sprites(): void {
  openWindow({
    id: 'devsprites',
    title: '/dev/sprites/ (unused)',
    icon: 'folder',
    className: 'alert',
    width: 'min(520px, 98vw)',
    render: (b) => b.append(h('div', { class: 'dev-sprites' }, UNUSED.map((k) => h('figure', {}, h('img', { class: 'px', src: spriteURL(k), attrs: { width: 64, height: 64 }, alt: k }), h('figcaption', {}, `${k}.png`, h('br'), 'UNUSED')))), h('p', { class: 'tiny' }, 'Retired art. Several of these are still in the game, which is the kind of thing that happens.')),
  });
}

function prototype(): void {
  const g = game();
  g.state.flags.glitch_seen = true;
  g.changed();
  openWindow({
    id: 'devproto',
    title: '/dev/prototypes/glitch_sprite.png',
    icon: 'ghost',
    className: 'alert',
    render: (b, w) => b.append(h('div', { class: 'dev-proto' }, h('img', { class: 'px glitch-img', src: spriteURL('glitch'), attrs: { width: 96, height: 96 }, alt: 'Glitch Sprite (prototype)' }), h('p', {}, 'PROTOTYPE: Glitch Sprite. (UNFINISHED.) Abilities: ???. Notes: "does not exist yet." It looks at you anyway.')), h('div', { class: 'win-actions' }, btn('Look back', () => (toast('It blinks out of sync with you. You get the feeling it will remember this.', 'magic'), w.close()), 'small'))),
  });
}

function testObject(): void {
  const g = game();
  if (!hasItem(g, 'broken_mouse') && !g.has('mouse_taken')) {
    g.state.flags.mouse_taken = true;
    addItem(g, 'broken_mouse', 1);
    learn(g, 'dev_note');
    g.state.flags.bug_found = true;
    toast("That shouldn't have worked.", 'magic');
  }
  void alertWindow('TEST_OBJECT_01.bin', h('div', {}, h('p', {}, 'A test object. It does nothing. Everything about it says 0.'), h('p', {}, 'It is, however, the only thing in the game that considers itself clickable by anything. It has been used on links that were never meant to be clicked.')));
}

function render(): HTMLElement {
  const g = game();
  const rows: Array<[string, string, () => void]> = [
    ['Parent Directory', '-', () => navigate('home')],
    ...DEV_FILES.map((f): [string, string, () => void] => [f.name, `${f.text(g).join('\n').length} bytes`, () => viewFile(f.name)]),
    ['sprites/', '-', sprites],
    ['prototypes/glitch_sprite.png', '3 KB', prototype],
    ['test_object.bin', '1 byte', testObject],
    ['old_versions/', '-', () => openVersions()],
    ['cmd.exe', '24 KB', () => openTerminal()],
  ];
  return h('div', { class: 'page dev-page' },
    h('h1', {}, 'Index of /dev/'),
    h('table', { class: 'dev-index' }, h('thead', {}, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Size'))),
      h('tbody', {}, rows.map(([n, sz, fn]) => h('tr', {}, h('td', {}, h('a', { href: '#', dataset: { fk: `dev-${n}` }, onclick: (e: Event) => (e.preventDefault(), fn()) }, n)), h('td', {}, sz))))),
    h('p', { class: 'tiny' }, 'Apache/1.3.9 Server at www.cybercities.com Port 80. (Not that Apache. A different one.)'),
    icon('person', 16, ''),
  );
}

registerZone({ id: 'dev', render, guard: (g) => (g.has('dev_open') ? null : 'Forbidden.') });
