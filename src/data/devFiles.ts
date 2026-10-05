import type { Game } from '../core/game';

// The developer's directory. Not linked from anywhere. Things in it are a little useful.
export interface DevFile {
  name: string;
  text: (g: Game) => string[];
}

export const DEV_FILES: DevFile[] = [
  { name: 'README.1st', text: () => ['if you can read this you are not supposed to be here.', 'if you are not supposed to be here, hello.', '', 'tools: about:inspector  about:terminal  about:version', 'bugs: see todo.txt (ignore the word "fixed")'] },
  { name: 'todo.txt', text: (g) => ['- remove debug view before launch (not done)', '- the vending machine judges too hard. make it nicer. (did not)', '- guestbook_017 should not exist yet. it is "fine"', '- lamp: four ways to light it. nobody checks. good.', '- who keeps incrementing the counter? not me.', g.has('finale_ready') ? '- parent process: found. (deleted this line)' : '- parent process: ???'] },
  { name: 'debug.log', text: (g) => [...g.state.log.slice(-6).map((l) => `[DEBUG] ${l.text}`), '[DEBUG] visitor #1111 connected (expected)', '[DEBUG] visitor #1111 connected (expected)', '[DEBUG] ...twice?'] },
  { name: 'alt_dialogue.txt', text: () => ['GUS: "There isn\'t a lighthouse."', 'BOB: "Phase three is not a surprise. It is a person."', 'MARL: "She runs when she wants to. Nobody keeps her."', '(unused. contradicts too much.)'] },
  { name: 'debug.cfg', text: (g) => [`debug=${g.state.inspector.level >= 2 ? 1 : 0}`, '# set to 1 to stop the inspector costing coffee', '# (the inspector does not like being asked for free. it will see further though.)'] },
];
