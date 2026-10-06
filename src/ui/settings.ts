import { game } from '../core/runtime';
import { clearStorage, exportPassword, importPassword } from '../core/saveSystem';
import { audio } from '../audio/audioManager';
import { createInitialState } from '../core/game';
import { h, btn } from './dom';
import { toast } from './notifications';
import { alertWindow, openWindow, closeAllWindows, type WinHandle } from './windows';
import { applySettings } from './appearance';

export function openSettings(): WinHandle {
  const g = game();
  return openWindow({
    id: 'settings',
    title: 'Options',
    icon: 'star',
    className: 'settings-win',
    width: 'min(640px, 98vw)',
    render: (body, win) => {
      const s = g.state.settings;
      const row = (label: string, ctl: HTMLElement, help?: string) => h('div', { class: 'opt' }, h('label', {}, h('span', { class: 'opt-l' }, label), ctl), help ? h('small', {}, help) : null);
      const upd = () => {
        applySettings(g);
        g.changed();
      };
      body.append(
        h('h3', {}, 'Sound'),
        row('Volume', h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: String(s.volume), on: { input: (e) => ((s.volume = Number((e.target as HTMLInputElement).value)), upd()) } })),
        row('Mute everything', h('input', { type: 'checkbox', checked: s.muted, on: { change: (e) => ((s.muted = (e.target as HTMLInputElement).checked), upd(), audio.sfx('click')) } })),
        row('Chiptune music', h('input', { type: 'checkbox', checked: s.music, on: { change: (e) => ((s.music = (e.target as HTMLInputElement).checked), audio.init(), upd()) } }), 'Off by default. Browsers do not like surprise noise either.'),
        h('h3', {}, 'Looks'),
        row('Reduce motion', h('input', { type: 'checkbox', checked: s.reducedMotion || (!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !g.state.flags.motion_override), on: { change: (e) => { const on = (e.target as HTMLInputElement).checked; s.reducedMotion = on; g.state.flags.motion_override = !on; upd(); } } }), 'Stops blinking, marquees, wobble and tumbling dice.'),
        row('Text size', h('input', { type: 'range', min: 0.9, max: 1.5, step: 0.05, value: String(s.textScale), on: { input: (e) => ((s.textScale = Number((e.target as HTMLInputElement).value)), upd()) } })),
        row('Always outline hotspots', h('input', { type: 'checkbox', checked: s.showHotspots, on: { change: (e) => ((s.showHotspots = (e.target as HTMLInputElement).checked), upd()) } }), 'Shows dotted outlines around everything you can click.'),
        row('Sparkle cursor', h('input', { type: 'checkbox', checked: s.sparkleCursor, on: { change: (e) => ((s.sparkleCursor = (e.target as HTMLInputElement).checked), upd()) } }), 'A trail of sparkles. Authentic. Mildly distracting.'),
        h('h3', {}, 'Save'),
        h('div', { class: 'win-actions' }, btn('Save password…', () => (win.close(), openSavePassword()), 'small'), btn('Start over', () => startOver(), 'small warn')),
        h('p', { class: 'seed' }, `World seed: ${g.state.seed}  (the same seed reproduces the same dice)`),
      );
    },
  });
}

function startOver(): void {
  openWindow({
    id: 'confirm-reset',
    title: 'Start over?',
    modal: true,
    className: 'alert',
    render: (b, w) =>
      b.append(
        h('p', {}, 'This erases your progress on this device. Export a save password first if you might want it back.'),
        h('div', { class: 'win-actions' }, btn('Erase everything', () => {
          clearStorage();
          location.reload();
        }, 'warn'), btn('Cancel', () => w.close(), 'go', { attrs: { 'data-autofocus': '' } })),
      ),
  });
}

export function openSavePassword(): WinHandle {
  const g = game();
  return openWindow({
    id: 'savepw',
    title: 'Save Password',
    icon: 'floppy',
    className: 'savepw-win',
    width: 'min(680px, 98vw)',
    render: (body, win) => {
      const out = h('textarea', { class: 'pw-box', attrs: { readonly: '', rows: 5, 'aria-label': 'Your save password' } });
      out.value = 'Generating…';
      exportPassword(g.state).then((code) => (out.value = code));
      const input = h('textarea', { class: 'pw-box', attrs: { rows: 4, placeholder: 'Paste a password here, e.g. 7F9K-11XQ-…', 'aria-label': 'Password to load' } });
      const err = h('p', { class: 'pw-err', attrs: { role: 'alert' } });
      body.append(
        h('div', { class: 'pw-head' }, 'SAVE PASSWORD'),
        h('p', {}, 'Write it down. Copy it. Tattoo it. It is your whole game in a few lines.'),
        out,
        h('div', { class: 'win-actions' }, btn('Copy', async () => {
          try {
            await navigator.clipboard.writeText(out.value);
            toast('Password copied.', 'good');
          } catch {
            out.select();
            toast('Press Ctrl+C to copy.', 'info');
          }
        }, 'go')),
        h('hr', { class: 'hr-rainbow' }),
        h('div', { class: 'pw-head' }, 'ENTER PASSWORD'),
        input,
        err,
        h('div', { class: 'win-actions' }, btn('Load', async () => {
          err.textContent = '';
          try {
            const state = await importPassword(input.value);
            state.settings = { ...g.state.settings }; // device preferences are not part of a save
            g.replace(state);
            toast('Password accepted. Welcome back.', 'good');
            win.close();
            closeAllWindows();
            location.reload();
          } catch (e) {
            err.textContent = (e as Error).message || 'That password did not work.';
            audio.sfx('error');
          }
        }, 'warn')),
      );
    },
  });
}

export async function aboutWindow(): Promise<void> {
  await alertWindow('About this page', h('div', {}, h('p', {}, h('b', {}, '11:11 — The Lost Homepage')), h('p', {}, 'Best viewed in Netscrape Navigator 4.7 at 800×600, or at any size, honestly.'), h('p', {}, 'Mouse or keyboard. Tab to move, Enter to click, Esc to put things away. Everything that glows or has a dotted outline is a thing. Everything else is also, probably, a thing.'), h('p', {}, 'Save is automatic. For a shareable save, use File → Save Password.')));
}

export { createInitialState };
