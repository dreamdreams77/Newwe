import { game } from '../core/runtime';
import { audio } from '../audio/audioManager';
import { h, btn, sleep, reducedMotion } from '../ui/dom';
import { navigate, registerZone } from '../ui/router';
import { counterDigits } from '../systems/hits';
import { statusLines } from '../systems/status';
import { GIFT } from '../data/personal';

/**
 * The end of the vertical slice: the page renders itself around you, and shows you what the
 * website had been the whole time. (The full 11:11 Room is the next build.)
 */
const typed: string[] = [];
let running = false;
let finished = false;
let livePre: HTMLElement | null = null;
let liveActions: HTMLElement | null = null;

function render(): HTMLElement {
  const g = game();
  g.state.flags.finale_seen = true;
  const lines: string[] = [
    '<html>',
    '  <head><title>11:11</title></head>',
    '  <body class="the-game">',
    '    <hit-counter>        = progression',
    '    <guestbook>          = quest log',
    '    <web-ring>           = world map',
    '    <broken-link 404>    = a door, the whole time',
    '    <under-construction> = the part where you build things',
    '    <marquee>            = a wish, scrolling past, for years',
    `    <visitor id="${counterDigits(g.state.visitors)}">     = you`,
    '  </body>',
    '</html>',
    '',
    '',
    ...statusLines(g),
    '',
    'Something is running this website. It is not finished.',
    'FINAL.HTML has been written. (File → Save Files…)',
    ...(GIFT ? ['', GIFT.note ? `"${GIFT.note}"` : '', GIFT.from ? `   — ${GIFT.from}` : ''].filter(Boolean) : []),
  ];
  const pre = h('pre', { class: 'render-pre', attrs: { 'aria-live': 'polite' } }, typed.join('\n') + (typed.length ? '\n' : ''));
  const actions = h('div', { class: 'win-actions', hidden: !finished }, btn('Return to the homepage', () => navigate('home'), 'go big', { attrs: { 'data-autofocus': '' } }), btn('Keep playing', () => navigate('home'), 'small'));
  const el = h('div', { class: 'finale', role: 'region', ariaLabel: 'The page is rendering itself' }, h('h1', { class: 'rainbow-text' }, '1 1 : 1 1'), pre, actions);
  // the zone can re-render while it types: keep one typing run and always draw into the live element
  livePre = pre;
  liveActions = actions;
  if (!running && !finished) {
    running = true;
    (async () => {
      audio.sfx('threshold');
      for (const l of lines.slice(typed.length)) {
        typed.push(l);
        if (livePre) livePre.textContent = typed.join('\n') + '\n';
        if (!reducedMotion()) await sleep(l ? 260 : 120);
      }
      finished = true;
      running = false;
      if (liveActions) {
        liveActions.hidden = false;
        (liveActions.querySelector('[data-autofocus]') as HTMLElement | null)?.focus();
      }
    })();
  }
  return el;
}

registerZone({ id: 'elevenRoom', render, onLeave: () => { if (!running) { typed.length = 0; finished = false; } }, guard: (g) => (g.has('finale_ready') ? null : 'Not yet. The counter has not reached the number.') });
