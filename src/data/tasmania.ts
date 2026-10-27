// The Tasmania noticeboard: two photographs of the same coast, 2001 and 2003. Five things changed.
// The letters, read left to right, are the word the sky wants to hear after dark.

export interface Diff {
  id: string;
  /** canvas coordinates on the 320x180 photograph */
  x: number;
  y: number;
  r: number;
  letter: string;
  label: string;
}

export const DIFFS: Diff[] = [
  { id: 'buoy', x: 40, y: 124, r: 15, letter: 'S', label: 'a red buoy bobbing offshore' },
  { id: 'gull', x: 100, y: 40, r: 15, letter: 'O', label: 'a gull in the sky' },
  { id: 'boat', x: 160, y: 100, r: 17, letter: 'U', label: 'a small sailboat on the water' },
  { id: 'kite', x: 215, y: 58, r: 15, letter: 'T', label: 'a kite over the cliff' },
  { id: 'penguin', x: 275, y: 130, r: 15, letter: 'H', label: 'a penguin on the beach' },
];

export const AURORA_WORD = DIFFS.map((d) => d.letter).join('');
