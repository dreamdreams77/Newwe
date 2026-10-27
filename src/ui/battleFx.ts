import { audio } from '../audio/audioManager';
import { reducedMotion } from './dom';

/** the classic: the screen flashes and a swirl of black closes in, then the fight is already there */
export function battleIntro(): void {
  audio.sfx('battle');
  if (reducedMotion()) return;
  const el = document.createElement('div');
  el.className = 'battle-wipe';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}
