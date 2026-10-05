import type { Game } from '../core/game';
import { audio } from '../audio/audioManager';

/** apply settings + stage to <html>. Safe to call as often as you like. */
export function applySettings(g: Game): void {
  const s = g.state.settings;
  const root = document.documentElement;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  root.classList.toggle('reduce-motion', s.reducedMotion || (prefersReduced && !g.state.flags.motion_override));
  root.style.setProperty('--text-scale', String(s.textScale));
  root.classList.toggle('show-hotspots', s.showHotspots);
  root.classList.toggle('sparkle', s.sparkleCursor);
  audio.setVolume(s.volume);
  audio.setMuted(s.muted);
  audio.setMusic(s.music);
  for (let i = 1; i <= 5; i++) root.classList.toggle(`stage-${i}`, g.state.stage === i);
  root.classList.toggle('stage-ge2', g.state.stage >= 2);
  root.classList.toggle('stage-ge3', g.state.stage >= 3);
  root.classList.toggle('stage-ge4', g.state.stage >= 4);
}
