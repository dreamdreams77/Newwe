import { audio } from '../audio/audioManager';
import { GIFT } from '../data/personal';
import { h, btn, sleep, reducedMotion } from './dom';

export interface SplashChoice {
  continueInfo?: string; // e.g. "Visitor #312 · Day 1"
}

/** The "ENTER" page. It doubles as the user gesture that unlocks Web Audio. */
export function showSplash(host: HTMLElement, info: SplashChoice): Promise<'continue' | 'new'> {
  document.body.classList.add('splash-open');
  return new Promise((resolve) => {
    const bar = h('div', { class: 'sp-fill' });
    const status = h('div', { class: 'sp-status', attrs: { 'aria-live': 'polite' } }, 'Connecting to cybercities.com at 28.8 kbps…');
    const buttons = h('div', { class: 'sp-buttons', hidden: true });
    const done = (choice: 'continue' | 'new') => {
      audio.init();
      audio.sfx('open');
      document.body.classList.remove('splash-open');
      el.remove();
      resolve(choice);
    };
    if (info.continueInfo) {
      buttons.append(btn(`▶ CONTINUE (${info.continueInfo})`, () => done('continue'), 'big go', { attrs: { 'data-autofocus': '' } }), btn('New game', () => done('new'), 'small'));
    } else {
      buttons.append(btn('▶ ENTER SITE', () => done('new'), 'big go', { attrs: { 'data-autofocus': '' } }));
    }
    const el = h(
      'div',
      { class: 'splash', role: 'dialog', ariaLabel: 'Welcome' },
      h('div', { class: 'sp-stars' }),
      h('div', { class: 'sp-card' }, h('div', { class: 'sp-pre' }, '~*~ ~*~ ~*~'), h('h1', { class: 'rainbow-text' }, '11:11'), h('div', { class: 'sp-title' }, 'The Lost Homepage'), h('p', { class: 'sp-tag' }, 'a website nobody has updated since 2003'),
      GIFT ? h('div', { class: 'sp-gift' }, GIFT.to ? h('b', {}, `For ${GIFT.to}`) : '', GIFT.note ? h('p', {}, GIFT.note) : '', GIFT.from ? h('i', {}, `— ${GIFT.from}`) : '') : '', h('div', { class: 'sp-bar' }, bar), status, buttons, h('p', { class: 'sp-tiny' }, 'Best viewed at 800×600 in Netscrape Navigator 4.7. Sound optional. Headphones recommended. A coffee, even more so.')),
    );
    host.appendChild(el);
    (async () => {
      const steps = ['Connecting to cybercities.com at 28.8 kbps…', 'Negotiating with the modem…', 'Downloading stars (3 of 3,000)…', 'Loading the guestbook…', 'Counting visitors…'];
      for (let i = 0; i < steps.length; i++) {
        status.textContent = steps[i];
        bar.style.width = `${((i + 1) / steps.length) * 100}%`;
        if (!reducedMotion()) await sleep(i === 0 ? 350 : 260);
      }
      status.textContent = 'Done. (It is never done.)';
      buttons.hidden = false;
      (buttons.querySelector('[data-autofocus]') as HTMLElement | null)?.focus();
    })();
  });
}
