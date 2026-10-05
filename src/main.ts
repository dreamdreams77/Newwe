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

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('app');
  if (el) el.textContent = 'Something went wrong loading the page. Try reloading (and check the console).';
});
