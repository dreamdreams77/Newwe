// Puzzle combat. A boss presents a pattern; you win by understanding it, not by
// out-hitting it. Boss Knowledge (things you learned in the world) reveals extra detail.

export interface Reveal {
  know: string;
  text: string;
}

export type PhaseKind = 'lights' | 'offer' | 'keypad' | 'final' | 'pattern' | 'forgery' | 'cipher' | 'sequence';

export interface PhaseDef {
  id: string;
  kind: PhaseKind;
  title: string;
  /** what the machine says / the situation, always visible */
  text: string;
  reveals: Reveal[];
  /** shown when you know nothing relevant: a nudge that exploring pays off */
  unknown: string;
}

export interface EncounterDef {
  id: string;
  name: string;
  intro: string;
  furyMax: number;
  phases: PhaseDef[];
  attackLines: string[];
  tiltText: string;
  /** a weakness you discover: with this knowledge, calming effects hit harder */
  weakness?: { know: string; text: string; bonus: number };
  winText: string;
}

export const VM_1111: EncounterDef = {
  id: 'vm1111',
  name: 'VM-1111, The Vending Machine of Judgment',
  intro: 'At the end of the dark: a vending machine. It hums at exactly the pitch of a very large decision. The display reads: INSERT FAITH. The little LED eyes track you across the room.',
  furyMax: 6,
  attackLines: [
    'It fires a can of something fizzy straight at your shin.',
    'A shelf of crisps slides out and slaps you.',
    'The machine rattles and a coin-return flap snaps at your fingers.',
    'It dispenses a warm cola directly into your face.',
  ],
  weakness: { know: 'vm_dad_jokes', bonus: 1, text: 'WEAKNESS: it cannot bear a pun. Calming cards bite twice as hard.' },
  tiltText: 'The machine TILTS. Everything slides. You are ejected, tumbling, back onto a plain white page that says 404.',
  winText: 'The machine considers you, in a long, humming silence. Then it lets out a very small, very polite chime.',
  phases: [
    {
      id: 'lights',
      kind: 'lights',
      title: 'Phase 1 — The Panel Lights',
      text: 'A 3×3 panel of lights flickers on the machine’s front. Turn them all off.',
      reveals: [{ know: 'vm_pattern', text: 'Boss Knowledge: each light flips its neighbours too (up, down, left, right), not the diagonals.' }],
      unknown: 'You do not know how the panel works. Pressing one will teach you something. Notes lying around the dark might teach you more.',
    },
    {
      id: 'change',
      kind: 'offer',
      title: 'Phase 2 — Exact Change',
      text: 'INSERT PAYMENT. A coin slot glows. The machine is waiting, with the patience of something that has never been wrong.',
      reveals: [
        { know: 'vm_exact_change', text: 'Boss Knowledge: it wants EXACT CHANGE. A whole token, not a broken one.' },
        { know: 'vm_slot_taped', text: 'Boss Knowledge: the slot only checks that something money-shaped is in it. A taped-in leaf might do. A good shake, even.' },
      ],
      unknown: 'You do not know what it considers payment. Money? Faith? Something shaped like either?',
    },
    {
      id: 'code',
      kind: 'keypad',
      title: 'Phase 3 — The Selection Code',
      text: 'ENTER THE HOUR THAT MAKES A WISH. A keypad with four digits to fill.',
      reveals: [
        { know: 'vm_code_hour', text: 'Boss Knowledge: it wants four digits. A wish hour is a doubled hour.' },
        { know: 'w_wrote_first', text: 'Boss Knowledge: W always signed things the same way. W cared about the number 11.' },
      ],
      unknown: 'Four digits. The display only says: the hour that makes a wish.',
    },
    {
      id: 'final',
      kind: 'final',
      title: 'Phase 4 — The Final Selection',
      text: 'The prize flap glows. Three buttons: DISPENSE, REFUND, and one that is not labelled, glowing very faintly, as if it was not supposed to be there.',
      reveals: [{ know: 'vm_dad_jokes', text: 'Boss Knowledge: machines groan at dad jokes. A groan is a kind of damage.' }],
      unknown: 'You can take the prize, take a refund, or do something stranger.',
    },
  ],
};

export const BROKEN_HOME: EncounterDef = {
  id: 'broken_home',
  name: 'The Broken Homepage',
  intro: 'The 11:11 Room. Every page you have visited is here at once, stacked and flickering, held together by a banner that says UNDER CONSTRUCTION in a font that is giving up. It is not angry. It is, you realise, trying to remember itself, and getting it wrong.',
  furyMax: 6,
  attackLines: [
    'A pop-up the size of a door slams shut on your fingers.',
    'The page reloads you. Something is left behind.',
    'A rainbow divider lashes out, a very straight line of bad news.',
    'The marquee scrolls over you, and it hurts, a little, to be a headline.',
  ],
  tiltText: 'The page CRASHES. A grey dialog reads: THIS PAGE HAS PERFORMED AN ILLEGAL OPERATION. It is gentle about it. You wake on the 404 page.',
  weakness: { know: 'bh_beloved', bonus: 1, text: 'WEAKNESS: it wants to be remembered, not fixed. Kindness hits harder than cleverness.' },
  winText: 'The Broken Homepage settles. The flicker slows to a breath. Somewhere in the stack, one window shows a very small, very clear picture of someone waving.',
  phases: [
    {
      id: 'pattern', kind: 'pattern', title: 'Phase 1 — The Visual Pattern',
      text: 'The UNDER CONSTRUCTION banner flashes a pattern of squares, then hides it. Reproduce it.',
      reveals: [{ know: 'bh_symmetry', text: 'Boss Knowledge: the banner is always symmetrical, left to right. Whatever is on the left is mirrored on the right.' }],
      unknown: 'You do not know the rules of the banner. It will only show it for a moment. Look carefully, and more than once.',
    },
    {
      id: 'forgery', kind: 'forgery', title: 'Phase 2 — The Corrupted Guestbook',
      text: 'The guestbook has been overwritten. One entry was not written by a visitor. Find the forgery.',
      reveals: [{ know: 'bh_counter', text: 'Boss Knowledge: a guestbook can only hold people who have already visited. Check every entry number against the counter.' }],
      unknown: 'Which one does not belong? Read all five. The counter at the bottom is not decoration.',
    },
    {
      id: 'cipher', kind: 'cipher', title: 'Phase 3 — The Cryptogram',
      text: 'A word is scrawled across the page, shifted. Say what it really says.',
      reveals: [
        { know: 'bh_shift', text: 'Boss Knowledge: each letter has been pushed forward along the alphabet by the webmaster\u2019s favourite number.' },
        { know: 'w_loved_eleven', text: 'Boss Knowledge: W\u2019s favourite number is on the homepage. It is a good number.' },
      ],
      unknown: 'A shifted word. By how much? Somebody on this website had a favourite number.',
    },
    {
      id: 'sequence', kind: 'sequence', title: 'Phase 4 — The Memory Sequence',
      text: 'Four glowing keys. Watch the order. Play it back.',
      reveals: [{ know: 'bh_replay', text: 'Boss Knowledge: Memory lets you ask for the sequence again, once for every four points of it.' }],
      unknown: 'The keys light up in an order. It only plays when you ask. A good memory asks for it less.',
    },
    {
      id: 'choice', kind: 'final', title: 'Phase 5 — The Final Choice',
      text: 'The whole page holds still. It is asking something, without words: what should it be?',
      reveals: [{ know: 'bh_beloved', text: 'Boss Knowledge: it does not want to be fixed. It wants to be remembered.' }],
      unknown: 'Three options hang in the air. None of them is labelled "correct".',
    },
  ],
};

export const ENCOUNTERS = { vm1111: VM_1111, broken_home: BROKEN_HOME };
