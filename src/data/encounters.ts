// Puzzle combat. A boss presents a pattern; you win by understanding it, not by
// out-hitting it. Boss Knowledge (things you learned in the world) reveals extra detail.

export interface Reveal {
  know: string;
  text: string;
}

export type PhaseKind = 'lights' | 'offer' | 'keypad' | 'final';

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

export const ENCOUNTERS = { vm1111: VM_1111 };
