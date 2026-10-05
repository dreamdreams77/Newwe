import { game } from '../core/runtime';
import { runCommand } from '../systems/terminal';
import { audio } from '../audio/audioManager';
import { h } from './dom';
import { openVersions } from './versions';
import { openWindow, type WinHandle } from './windows';

const history: string[] = [];

/** An old terminal. Documented commands are few; the rest you find. */
export function openTerminal(): WinHandle {
  const g = game();
  if (!g.has('terminal_on')) {
    g.state.flags.terminal_on = true;
    g.reveal('terminal');
    g.changed();
  }
  return openWindow({
    id: 'terminal',
    title: 'C:\\WEBSITE> cmd.exe',
    icon: 'floppy',
    className: 'term-win',
    width: 'min(760px, 98vw)',
    render: (body, win) => {
      const out = h('pre', { class: 'term-out', attrs: { role: 'log', 'aria-live': 'polite' } }, ['HOMEPAGE TERMINAL  [version ' + (g.has('inspector_on') ? '1.3.7' : '1.0') + ']', 'type HELP.', ''].join('\n'));
      const input = h('input', { type: 'text', class: 'term-in', attrs: { 'aria-label': 'Command', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', 'data-autofocus': '' } });
      let hi = history.length;
      const run = () => {
        const line = input.value;
        input.value = '';
        if (line.trim()) history.push(line);
        hi = history.length;
        out.textContent += `> ${line}\n`;
        const res = runCommand(g, line);
        if (res.clear) out.textContent = '';
        for (const l of res.lines) out.textContent += l + '\n';
        out.scrollTop = out.scrollHeight;
        audio.sfx('tick');
        if (res.open === 'version') openVersions();
        if (res.exit) win.close();
      };
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') run();
        else if (ev.key === 'ArrowUp' && history.length) (ev.preventDefault(), (hi = Math.max(0, hi - 1)), (input.value = history[hi] ?? ''));
        else if (ev.key === 'ArrowDown') (ev.preventDefault(), (hi = Math.min(history.length, hi + 1)), (input.value = history[hi] ?? ''));
      });
      body.append(out, h('label', { class: 'term-line' }, h('span', {}, '>'), input));
      setTimeout(() => input.focus(), 30);
    },
  });
}
