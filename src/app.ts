import { Game, createInitialState } from './core/game';
import { runEncounter } from './ui/combat';
import { installProgression, evaluate } from './core/progression';
import { installAutosave, loadFromStorage, saveToStorage } from './core/saveSystem';
import { setGame, game } from './core/runtime';
import { ZONES } from './data/zones';
import { checkRealEleven } from './systems/elevenEleven';
import { passTime } from './systems/actions';
import { ensureHand } from './systems/cards';
import { syncDeck } from './systems/cards';
import { formatClock } from './core/timeSystem';
import { audio } from './audio/audioManager';
import { buildFrame, TOOLS, type FrameRefs, type MenuDef } from './ui/browserFrame';
import { announce, h } from './ui/dom';
import { applySettings } from './ui/appearance';
import { held, onHeldChange, setHeld } from './ui/held';
import { mountToasts, toast } from './ui/notifications';
import { raiseStat } from './systems/stats';
import { goBack, goForward, initRouter, navigate, refreshView, showCurrent } from './ui/router';
import { showSplash } from './ui/splash';
import { closeAllWindows, mountWindows, refreshLive } from './ui/windows';
import { openInventory } from './ui/inventory';
import { openCards } from './ui/cards';
import { openCreature, openJournal, openStats } from './ui/panels';
import { openMemories } from './ui/memories';
import { aboutWindow, openSavePassword, openSettings } from './ui/settings';
import { ITEMS } from './data/items';
import type { ZoneId } from './core/types';
import { sparkleInit } from './ui/sparkle';
import { openInspector, setInspectMode, onInspectMode, inspectMode } from './ui/inspector';
import { openHandbook } from './ui/handbook';
import { openSource } from './ui/source';
import { openTerminal } from './ui/terminal';
import { openVersions } from './ui/versions';
import { openDevGate } from './ui/gate';
import { statusLines } from './systems/status';
import { openSaveFiles } from './ui/saves';
import { alertWindow } from './ui/windows';

// zones register themselves on import
import './world/homepage';
import './world/guestbook';
import './world/construction';
import './world/lake';
import './world/lighthouse';
import './world/e404';
import './world/dungeon';
import './world/mypage';
import './world/finale';
import './world/room';
import './world/forest';
import './world/tasmania';
import './world/parent';
import './world/terminalPage';
import './world/dev';
import './world/ticket';

const STAGE_TEXT: Record<number, string> = {
  2: 'Something is wrong with the page. (The counter flickered. Nobody else saw.)',
  3: 'Wait. This website is a game. The page has stats. You have stats.',
  4: 'The website is alive. It is reacting to what you do.',
  5: '11:11. The page is rendering itself around you.',
};

export async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  if (params.has('reset')) {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  }
  const saved = params.has('fresh') ? null : loadFromStorage();
  const seedParam = params.get('seed');
  const g = new Game(saved ?? createInitialState(seedParam ? Number(seedParam) >>> 0 : (Date.now() ^ (Math.random() * 1e9)) >>> 0));
  setGame(g);
  installProgression(g);
  evaluate(g);
  if (params.has('debug')) (window as unknown as { __game: unknown }).__game = { runEncounter, g, navigate, audio, setHeld, saveToStorage, passTime: (m: number) => passTime(g, m, { raw: true }), refresh: refreshView };

  const app = document.getElementById('app')!;
  document.body.append(h('div', { class: 'desktop-bg' }));

  applySettings(g);

  // ---- splash (also unlocks audio)
  const choice = await showSplash(document.body, { continueInfo: saved && saved.flags.game_started ? `Visitor #${saved.visitors} · ${formatClock(saved.clock.minutes)}` : undefined });
  if (choice === 'new' && saved) {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    g.replace(createInitialState((Date.now() ^ (Math.random() * 1e9)) >>> 0));
  }

  installAutosave(g, 250); // only once the player has chosen: a stray load must never overwrite a save

  document.querySelector('.skip-link')?.removeAttribute('hidden'); // there is a #content to skip to now
  // ---- frame
  const menus: MenuDef[] = buildMenus(g);
  let frame!: FrameRefs; // the handlers below close over it before buildFrame returns
  // eslint-disable-next-line prefer-const
  frame = buildFrame(g, {
    back: goBack,
    forward: goForward,
    reload: () => (frame.loading(), refreshView(), toast('Reloaded. Nothing changed. Everything changed a little.', 'info')),
    home: () => navigate('home'),
    stop: () => (closeAllWindows(), setHeld(null)),
    go: (text) => goAddress(text),
    openPanel,
    toggleInspect: () => setInspectMode(!inspectMode),
    toggleSound: () => {
      audio.init();
      g.state.settings.muted = !g.state.settings.muted;
      applySettings(g);
      g.changed();
    },
    menus,
    joke: (t) => toast(t, 'funny'),
  });
  app.appendChild(frame.root);
  mountToasts(document.body);
  mountWindows(document.body);
  initRouter(frame, g);
  sparkleInit(g);

  // ---- wiring
  g.bus.on('toast', ({ text, kind }) => toast(text, kind));
  g.bus.on('sfx', ({ name }) => audio.sfx(name));
  const syncFrame = () => {
    frame.update(g);
    applySettings(g);
    frame.soundBtn.textContent = g.state.settings.muted ? '♪ Sound: muted' : audio.ready ? '♪ Sound: on' : '♪ Sound: off';
    frame.held.classList.toggle('on', !!held());
    frame.inspectBtn.hidden = !g.has('inspector_on');
    frame.inspectBtn.textContent = inspectMode ? '🔍 Inspect: ON' : '🔍 Inspect: off';
    refreshLive();
  };
  g.bus.on('change', syncFrame);
  g.bus.on('world', refreshView);
  g.bus.on('stage', ({ to }) => {
    audio.sfx('threshold');
    toast(STAGE_TEXT[to] ?? 'The page changed.', 'magic');
    announce(STAGE_TEXT[to] ?? '');
    document.documentElement.classList.add('stage-flash');
    setTimeout(() => document.documentElement.classList.remove('stage-flash'), 900);
  });
  g.bus.on('zone', ({ zone }) => {
    const z = ZONES[zone];
    if (z) {
      audio.setAmbience(z.ambience);
      audio.setTrack(z.music);
    }
    frame.setStatus(`Done — ${z?.title ?? zone}`);
  });
  onInspectMode(() => syncFrame());
  onHeldChange(() => {
    const id = held();
    frame.held.classList.toggle('on', !!id);
    frame.held.replaceChildren(
      ...(id ? [h('span', {}, `Holding: ${ITEMS[id].name}. Click something on the page. Esc to put it away.`), h('button', { type: 'button', class: 'btn small', onclick: () => setHeld(null) }, 'Put away')] : []),
    );
  });
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiAt = 0;
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && held()) setHeld(null);
    const t = ev.target as HTMLElement | null;
    if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
    konamiAt = ev.key.toLowerCase() === KONAMI[konamiAt].toLowerCase() ? konamiAt + 1 : ev.key === 'ArrowUp' ? 1 : 0;
    if (konamiAt === KONAMI.length) {
      konamiAt = 0;
      if (g.has('konami')) return void toast('You already have the thirty lives. They are all still there.', 'funny');
      g.state.flags.konami = true;
      raiseStat(g, 'courage', 1);
      raiseStat(g, 'luck', 1);
      g.state.eleven.charges += 1;
      g.sfx('eleven');
      toast('↑ ↑ ↓ ↓ ← → ← → B A. THIRTY LIVES. (There is no lives system. You feel braver anyway: Courage +1, Luck +1, and one spare 11:11.)', 'magic');
      g.changed();
    }
  });

  // real-world 11:11 is a gift
  checkRealEleven(g);
  setInterval(() => checkRealEleven(g), 20000);

  syncDeck(g);
  ensureHand(g, 3);
  showCurrent();
  syncFrame();
  const z = ZONES[g.state.zone];
  if (z) {
    audio.setAmbience(z.ambience);
    audio.setTrack(z.music);
  }
  if (!g.state.flags.intro_seen) {
    g.state.flags.intro_seen = true;
    toast('You found an abandoned homepage. Click around. (Tab + Enter works too.)', 'info');
    g.changed();
  }
  document.getElementById('content')?.focus();
}

function openPanel(panel: string): void {
  switch (panel) {
    case 'inventory':
      return void openInventory();
    case 'cards':
      return void openCards();
    case 'journal':
      return void openJournal();
    case 'stats':
      return void openStats();
    case 'creature':
      return void openCreature();
    case 'memories':
      return void openMemories();
    case 'handbook':
      return void openHandbook();
    case 'inspector':
      return void openInspector();
    case 'terminal':
      return void openTerminal();
    case 'mypage':
      closeAllWindows();
      navigate('mypage');
  }
}

function goAddress(text: string): void {
  const g = game();
  const t = text.trim().toLowerCase();
  if (t.startsWith('about:')) {
    const [page, arg] = t.slice(6).split('/');
    if (page === 'inspector') return void openInspector();
    if (page === 'version') return void openVersions();
    if (page === 'terminal') return void openTerminal();
    if (page === 'handbook') return void openHandbook();
    if (page === 'parent') return void navigate('parent');
    if (page === 'status') {
      if (g.has('finale_ready')) return void alertWindow('about:status', h('pre', { class: 'term-out' }, statusLines(g).join('\n')));
      return void toast('about:status — 403. Not yet. Nothing is finished running.', 'info');
    }
    if (page === 'blank') return void toast('A blank page. It has never been blank. It is thinking.', 'funny');
    void arg;
    return void navigate('e404');
  }
  const strip = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const hit = (Object.keys(ZONES) as ZoneId[]).find((z) => strip(ZONES[z].url.toLowerCase()) === strip(t));
  if (hit === 'dev') return void openDevGate();
  if (hit === 'dungeon') {
    // a controlled bug: if you know the page is an address you can just... type it. That should not have worked.
    if (g.has('e404_open')) return void navigate('dungeon');
    if (g.has('clue_404') || g.state.knowledge.includes('page_is_address')) {
      g.state.flags.e404_open = true;
      g.state.flags.e404_exploit = true;
      g.state.flags.bug_found = true;
      g.sfx('eleven');
      toast("That shouldn't have worked. (The lock is for visitors who use the link. You typed the address.)", 'magic');
      g.changed();
      return void navigate('dungeon');
    }
    return void navigate('e404');
  }
  if (hit && hit !== 'elevenRoom') return void navigate(hit);
  navigate('e404');
}

function buildMenus(g: Game): MenuDef[] {
  const ring = (): Array<{ label: string; z: ZoneId }> => {
    const out: Array<{ label: string; z: ZoneId }> = [{ label: 'Home', z: 'home' }, { label: 'Guestbook', z: 'guestbook' }];
    for (const z of ['construction', 'lake', 'lighthouse'] as ZoneId[]) if (g.state.flags[`visited_${z}`]) out.push({ label: ZONES[z].title, z });
    return out;
  };
  return [
    {
      label: 'File',
      items: () => [
        { label: 'Save Files…', onSelect: () => void openSaveFiles() },
        { label: 'Save Password…', onSelect: () => void openSavePassword() },
        { label: 'Load Password…', onSelect: () => void openSavePassword() },
        { sep: true, label: '', onSelect: () => undefined },
        { label: 'Options…', onSelect: () => void openSettings() },
      ],
    },
    {
      label: 'View',
      items: () => [
        { label: 'Text bigger', onSelect: () => ((g.state.settings.textScale = Math.min(1.5, g.state.settings.textScale + 0.1)), applySettings(g), g.changed()) },
        { label: 'Text smaller', onSelect: () => ((g.state.settings.textScale = Math.max(0.9, g.state.settings.textScale - 0.1)), applySettings(g), g.changed()) },
        { label: g.state.settings.reducedMotion ? '✓ Reduce motion' : 'Reduce motion', onSelect: () => ((g.state.settings.reducedMotion = !g.state.settings.reducedMotion), applySettings(g), g.changed()) },
        { label: 'Page Source', onSelect: () => openSource(g.state.zone) },
        { label: g.state.settings.showHotspots ? '✓ Outline clickable things' : 'Outline clickable things', onSelect: () => ((g.state.settings.showHotspots = !g.state.settings.showHotspots), applySettings(g), g.changed()) },
      ],
    },
    { label: 'Go', items: () => ring().map((r) => ({ label: r.label, onSelect: () => navigate(r.z) })) },
    {
      label: 'Bookmarks',
      items: () => TOOLS.filter((t) => g.state.ui.revealed[t.key]).map((t) => ({ label: g.state.stage >= 3 ? t.late : t.early, onSelect: () => openPanel(t.panel) })).concat(g.state.ui.revealed.inventory ? [] : [{ label: '(nothing bookmarked yet)', onSelect: () => undefined }]),
    },
    { label: 'Help', items: () => [{ label: "The Webmaster's Handbook", onSelect: () => void openHandbook(), hidden: () => !g.state.ui.revealed.handbook }, { label: 'About this page…', onSelect: () => void aboutWindow() }] },
  ];
}
