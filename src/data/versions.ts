import type { Cond } from '../core/types';

// The website has a version history. Old versions occasionally know about things that
// have not happened yet, and things that no longer exist.

export interface SiteVersion {
  v: string;
  date: string;
  unlock: Cond;
  notes: string[];
  /** what the page looked like then, for `about:version/<v>` */
  snapshot: string[];
}

export const VERSIONS: SiteVersion[] = [
  { v: '1.0', date: '2001-03-12', unlock: { flag: 'game_started' }, notes: ['Initial release. Homepage. Guestbook (please sign).'], snapshot: ['<h1>Welcome 2 My World</h1>', '<a>guestbook</a>', '<!-- nothing else yet -->'] },
  { v: '1.1', date: '2001-03-14', unlock: { flag: 'game_started' }, notes: ['Added: test post. Fixed: nothing.', 'Known issue: the counter counts in a funny way.'], snapshot: ['<h1>Welcome 2 My World</h1>', '<a>guestbook</a>', '<counter start="73" step="???">'] },
  { v: '1.2', date: '2002-07-04', unlock: { flag: 'visited_lake' }, notes: ['Added: swan boats (see pond).', 'Tickets are NOT decorative. (Updated the sign. Nobody read it.)'], snapshot: ['<a>swanny\'s pond</a>', '<ticket decorative="false">', '<!-- pads only sing for someone ON the water -->'] },
  { v: '1.3', date: '2003-01-09', unlock: { flag: 'visited_lighthouse' }, notes: ['Added: lighthouse (Tasmania mirror).', 'Lamp needs a keeper. Keeper needs a yoghurt. Do not ask.'], snapshot: ['<a>the light on the cliff</a>', '<lamp state="stuck" cause="november">', '<keeper wants="plain, not vanilla">'] },
  {
    v: '1.3.7',
    date: '2003-06-30',
    unlock: { flag: 'inspector_on' },
    notes: ['Removed: the vending machine. It was judging the visitors.', 'Removed: 404 page. (Not removed. Moved. Do not tell anyone where.)', 'TODO: delete debug view before launch. (not deleted)'],
    snapshot: ['<link href="/404/" hidden>', '<!-- VM-1111: exact change only -->', '<!-- the hour that makes a wish -->'],
  },
  {
    v: '2.0',
    date: '11/11/2003 11:11',
    unlock: { visitors: 777 },
    notes: ['Visitors: 1,111.', 'The page will render itself.', 'Site closed for maintenance. (Site open. Someone is still here.)'],
    snapshot: ['<h1>1 1 : 1 1</h1>', '<visitor id="1111" status="EXPECTED">', '<!-- you are not the first -->'],
  },
  { v: '???', date: 'now', unlock: { flag: 'finale_ready' }, notes: ['RUNNING.', 'Parent process: not yet found.'], snapshot: ['<running/>'] },
];

export function currentVersion(unlocked: SiteVersion[]): string {
  return unlocked.filter((v) => v.v !== '???').slice(-1)[0]?.v ?? '1.0';
}
