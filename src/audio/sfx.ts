import type { audio } from './audioManager';

type A = typeof audio;

export const SFX_NAMES = [
  'click', 'tick', 'page', 'pickup', 'card', 'craft', 'success', 'fail', 'fumble', 'crit', 'eleven', 'wish', 'memory', 'quest', 'questDone',
  'puzzle', 'error', 'threshold', 'roll', 'open', 'close', 'door', 'step', 'hit', 'chirp', 'zap', 'dial',
] as const;

/** every sound the game makes is a recipe of beeps and noise */
export function playSfx(a: A, name: string): void {
  switch (name) {
    case 'click':
      a.tone(880, 0.04, 'square', 0.1);
      break;
    case 'tick':
      a.tone(1320, 0.03, 'square', 0.08);
      a.tone(1760, 0.03, 'square', 0.06, 0.04);
      break;
    case 'open':
      a.tone(440, 0.06, 'square', 0.08);
      a.tone(660, 0.08, 'square', 0.08, 0.05);
      break;
    case 'close':
      a.tone(660, 0.05, 'square', 0.08);
      a.tone(440, 0.07, 'square', 0.08, 0.05);
      break;
    case 'page':
      a.noise(0.18, 0.12, 0, 1200, 5000);
      break;
    case 'pickup':
      [660, 880, 1320].forEach((f, i) => a.tone(f, 0.09, 'square', 0.1, i * 0.07));
      break;
    case 'card':
      a.noise(0.08, 0.1, 0, 2000, 7000);
      a.tone(988, 0.1, 'triangle', 0.12, 0.04);
      break;
    case 'craft':
      [392, 523, 659, 784].forEach((f, i) => a.tone(f, 0.1, 'triangle', 0.14, i * 0.06));
      break;
    case 'success':
      [523, 659, 784].forEach((f, i) => a.tone(f, 0.12, 'square', 0.1, i * 0.08));
      break;
    case 'fail':
      a.tone(220, 0.2, 'sawtooth', 0.09, 0, 150);
      break;
    case 'fumble':
      a.tone(180, 0.35, 'sawtooth', 0.12, 0, 60);
      a.noise(0.2, 0.1, 0.05, 100, 900);
      break;
    case 'crit':
      [523, 659, 784, 1046, 1318].forEach((f, i) => a.tone(f, 0.14, 'square', 0.1, i * 0.06));
      break;
    case 'eleven':
      [880, 1108, 1318, 1760].forEach((f, i) => a.tone(f, 0.45, 'sine', 0.14, i * 0.11));
      a.tone(110, 1.2, 'sine', 0.1);
      break;
    case 'wish':
      a.tone(300, 0.7, 'sine', 0.14, 0, 1800);
      a.tone(450, 0.7, 'triangle', 0.08, 0.05, 2200);
      break;
    case 'memory':
      [523, 659, 880].forEach((f, i) => a.tone(f, 0.4, 'sine', 0.1, i * 0.18));
      break;
    case 'quest':
      [392, 523, 392, 659].forEach((f, i) => a.tone(f, 0.12, 'square', 0.08, i * 0.1));
      break;
    case 'questDone':
      [523, 523, 523, 659, 784, 1046].forEach((f, i) => a.tone(f, 0.13, 'square', 0.1, i * 0.09));
      break;
    case 'puzzle':
      [659, 784, 988, 1318].forEach((f, i) => a.tone(f, 0.12, 'triangle', 0.14, i * 0.07));
      break;
    case 'error':
      a.tone(150, 0.12, 'square', 0.12);
      a.tone(120, 0.18, 'square', 0.12, 0.12);
      break;
    case 'threshold':
      for (let i = 0; i < 8; i++) a.tone(400 + i * 120, 0.07, 'square', 0.07, i * 0.05);
      break;
    case 'roll':
      for (let i = 0; i < 7; i++) a.noise(0.05, 0.1, i * 0.06, 800, 3500);
      break;
    case 'door':
      a.tone(90, 0.4, 'sawtooth', 0.1, 0, 60);
      a.noise(0.3, 0.06, 0, 100, 800);
      break;
    case 'step':
      a.noise(0.04, 0.05, 0, 300, 1200);
      break;
    case 'hit':
      a.noise(0.15, 0.2, 0, 100, 2000);
      a.tone(140, 0.2, 'square', 0.14, 0, 70);
      break;
    case 'chirp':
      a.tone(1800, 0.06, 'sine', 0.08, 0, 2800);
      a.tone(2200, 0.05, 'sine', 0.06, 0.09, 3000);
      break;
    case 'zap':
      a.tone(1200, 0.2, 'sawtooth', 0.08, 0, 200);
      break;
    case 'dial':
      [1209, 1336, 1477, 697, 770].forEach((f, i) => a.tone(f, 0.08, 'sine', 0.06, i * 0.1));
      a.noise(0.5, 0.05, 0.5, 1000, 3000);
      break;
  }
}
