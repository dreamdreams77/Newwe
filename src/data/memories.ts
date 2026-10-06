import type { Effect } from '../core/types';
import { PERSONAL } from './personal';

// Memories are never just cutscenes: each one becomes a card, a clue, an item,
// a location or an audio clip. The text here is a PLACEHOLDER layer. Real
// personal material can replace it via /personal/*.json (see data/personal.ts)
// without touching any game logic.

export type MemoryKind = 'note' | 'photo' | 'voice' | 'text';

export interface MemoryDef {
  id: string;
  kind: MemoryKind;
  title: string;
  /** placeholder copy, replaced by personal content if present */
  text: string;
  caption?: string;
  /** how it shows up in play, shown in the Journal */
  becomes: string;
  onGain: Effect[];
}

const list: MemoryDef[] = [
  {
    id: 'MEMORY_001',
    kind: 'note',
    title: 'The Test Post',
    text: 'test test... is this thing on? ~w',
    caption: 'The first entry anyone ever wrote in this guestbook, March 2001.',
    becomes: 'Card: The Test Post',
    onGain: [
      { t: 'card', id: 'last_entry' },
      { t: 'hits', by: 33, why: 'a memory surfaced' },
      { t: 'know', id: 'w_wrote_first' },
    ],
  },
  {
    id: 'VOICE_001',
    kind: 'voice',
    title: 'Voicemail (the swans)',
    text: '[placeholder voice clip — five notes, hummed]',
    caption: 'A recording found under the dock. Someone hummed this while winding up the swans.',
    becomes: 'Audio clue: the Lily-Pad melody',
    onGain: [{ t: 'flag', key: 'voice_heard' }],
  },
  {
    id: 'PHOTO_001',
    kind: 'photo',
    title: 'Polaroid: The Light',
    text: '[placeholder photo — a lighthouse, slightly crooked]',
    caption: 'Pinned beside the lamp. Somebody was very pleased with this shot.',
    becomes: 'Location card + a picture to compare against',
    onGain: [
      { t: 'card', id: 'loc_light' },
      { t: 'know', id: 'light_was_tended' },
    ],
  },
  {
    id: 'NOTE_001',
    kind: 'note',
    title: 'Sticky Note',
    text: 'DO NOT EAT. It’s for someone. I’ll tell you who when it’s time. — W',
    caption: 'Stuck to a yoghurt. Handwriting: confident, a little rushed.',
    becomes: 'Clue: the yoghurt has a destination',
    onGain: [{ t: 'know', id: 'yoghurt_has_destination' }],
  },
  {
    id: 'MEMORY_002',
    kind: 'text',
    title: 'What Marl Remembers',
    text: 'Marl says someone used to bring him one plain yoghurt every November, and he never once asked why. He thinks it was the nicest thing anyone did for him. He says you will understand later, and not to tell Gus.',
    caption: 'Told over the sound of the lamp warming up.',
    becomes: 'A gift of 11:11',
    onGain: [
      { t: 'eleven', by: 1, why: 'a memory completed' },
      { t: 'know', id: 'november_yoghurt' },
    ],
  },
  {
    id: 'FOREST_001',
    kind: 'note',
    title: 'Carved in the Oak',
    text: 'Cut into the bark, old and healed over: 11. And below it, smaller, in a different hand: come back when it\u2019s time.',
    caption: 'The Old Oak, at the end of the foxfire.',
    becomes: 'Clue: the oak has been counting',
    onGain: [
      { t: 'know', id: 'forest_eleven' },
      { t: 'hits', by: 22, why: 'a memory surfaced' },
    ],
  },
];

export const MEMORIES: Record<string, MemoryDef> = Object.fromEntries(list.map((m) => [m.id, m]));
export const MEMORY_IDS = list.map((m) => m.id);

/** merged view: personal content (if any) wins over the placeholder text */
export function memoryView(def: MemoryDef) {
  const p = PERSONAL[def.id] ?? {};
  return {
    title: p.title ?? def.title,
    text: p.text ?? def.text,
    caption: p.caption ?? def.caption,
    image: p.image,
    audio: p.audio,
    personal: !!PERSONAL[def.id],
  };
}

