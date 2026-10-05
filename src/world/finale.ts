import { game } from '../core/runtime';
import { audio } from '../audio/audioManager';
import { h, btn, sleep, reducedMotion } from '../ui/dom';
import { navigate, registerZone } from '../ui/router';
import { QUESTS } from '../data/quests';
import { questStatus } from '../systems/quests';
import { counterDigits } from '../systems/hits';

/**
 * The end of the vertical slice: the page renders itself around you, and shows you what the
 * website had been the whole time. (The full 11:11 Room is the next build.)
 */
function render(): HTMLElement {
  const g = game();
  const done = QUESTS.filter((q) => questStatus(g, q) === 'done').length;
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
    `Quests finished: ${done}.  Memories: ${g.state.memories.length}.  Things learned: ${g.state.knowledge.length}.`,
    `Wishes in your pocket: ${g.state.eleven.charges}.`,
    '',
    'The 11:11 Room is not built yet.',
    'It will ask one thing: what did you save your wishes for?',
  ];
  const pre = h('pre', { class: 'render-pre', attrs: { 'aria-live': 'polite' } });
  const actions = h('div', { class: 'win-actions', hidden: true }, btn('Return to the homepage', () => navigate('home'), 'go big', { attrs: { 'data-autofocus': '' } }), btn('Keep playing', () => navigate('home'), 'small'));
  const el = h('div', { class: 'finale', role: 'region', ariaLabel: 'The page is rendering itself' }, h('h1', { class: 'rainbow-text' }, '1 1 : 1 1'), pre, actions);
  (async () => {
    audio.sfx('threshold');
    for (const l of lines) {
      pre.textContent += l + '\n';
      if (!reducedMotion()) await sleep(l ? 260 : 120);
    }
    actions.hidden = false;
    (actions.querySelector('[data-autofocus]') as HTMLElement | null)?.focus();
  })();
  return el;
}

registerZone({ id: 'elevenRoom', render, guard: (g) => (g.has('finale_ready') ? null : 'Not yet. The counter has not reached the number.') });
