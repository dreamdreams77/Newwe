import type { Game } from '../core/game';

/** an authentic, mildly distracting sparkle cursor trail (opt-in) */
export function sparkleInit(g: Game): void {
  let last = 0;
  document.addEventListener('pointermove', (ev) => {
    if (!g.state.settings.sparkleCursor || document.documentElement.classList.contains('reduce-motion')) return;
    const now = performance.now();
    if (now - last < 40) return;
    last = now;
    const s = document.createElement('i');
    s.className = 'sparkle-dot';
    s.textContent = ['✦', '✧', '★', '·'][Math.floor(Math.random() * 4)];
    s.style.left = `${ev.clientX}px`;
    s.style.top = `${ev.clientY}px`;
    s.style.color = ['#ff0', '#0ff', '#f0f', '#fff'][Math.floor(Math.random() * 4)];
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });
}
