import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '@fontsource/comic-neue/400.css';
import '@fontsource/comic-neue/700.css';
import '@fontsource/caveat/500.css';
import './styles/base.css';
import './styles/browser.css';
import './styles/homepage.css';
import './styles/windows.css';
import './styles/rpg.css';
import './styles/scenes.css';
import './styles/puzzles.css';
import './styles/combat.css';
import './styles/stages.css';
import './styles/inspector.css';
import { boot } from './app';
import { installErrorReporter } from './ui/errorReport';

// the game's script is running: the "it did not start" notice in index.html stays hidden
document.documentElement.setAttribute('data-booted', '1');
document.getElementById('boot-fallback')?.setAttribute('hidden', '');

installErrorReporter();
boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('app');
  if (el) el.textContent = 'Something went wrong loading the page. Try reloading (and check the console).';
});

// Offline play: register the service worker in production builds only (never in tests or with ?debug / ?fresh).
if ('serviceWorker' in navigator && import.meta.env.PROD && !/[?&](debug|fresh|nosw)\b/.test(location.search)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = performance.getEntriesByType('resource').map((e) => e.name);
        reg.active?.postMessage({ type: 'precache', urls: [location.href, ...urls] });
      })
      .catch(() => {});
  });
}
