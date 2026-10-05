// Puzzle content. Kept as data so levels can be tuned or swapped without touching UI code.

/** The four lily pads and their notes (D, E, G, A: a friendly pentatonic). */
export const PAD_NOTES = ['D5', 'E5', 'G5', 'A5'];
export const PAD_COLOURS = ['#ff8ac8', '#7fe3ff', '#ffd93b', '#9cff7a'];
/** the melody that was hummed under the dock (VOICE_001): indices into PAD_NOTES */
export const LULLABY = [2, 0, 3, 1, 3];
/** round lengths: three, four, then the whole song */
export const LILY_ROUNDS = [3, 4, 5];

// ---- the postcard's hidden message, as a keyword cipher (key: WILLOW) ----------
export const CIPHER_KEYWORD = 'WILLOW';
export const CIPHER_PLAIN = 'THE PAGE IS NOT LOST IT IS WAITING. 404 IS AN ADDRESS. BRING THE USELESS KEY.';

export function cipherAlphabet(keyword = CIPHER_KEYWORD): string {
  const seen = new Set<string>();
  let out = '';
  for (const ch of keyword + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!seen.has(ch)) {
      seen.add(ch);
      out += ch;
    }
  }
  return out;
}
export function encipher(text: string, keyword = CIPHER_KEYWORD): string {
  const alpha = cipherAlphabet(keyword);
  return text
    .toUpperCase()
    .split('')
    .map((c) => {
      const i = c.charCodeAt(0) - 65;
      return i >= 0 && i < 26 ? alpha[i] : c;
    })
    .join('');
}

// ---- the Bullet-Train ticket's fine print (an acrostic: first letters spell TERMINUS)
export const FINE_PRINT = [
  'This ticket is valid for one passenger and one (1) tiny chocobo.',
  'Each ride is non-refundable, except emotionally.',
  'Riders must not feed the conductor, even if he asks nicely.',
  'Missing the train is not a failure of character.',
  'In the event of 11:11, please remain calm and seated.',
  'Not valid on the 404 line. Obviously.',
  'Unaccompanied luggage will be adopted.',
  'Subject to change without notice, or reason.',
];
export const FINE_PRINT_ANSWER = 'TERMINUS';
export const TICKET_RIDES = 3;

// ---- the Vending Machine's keypad
export const VM_CODE = '1111';
