// Act III: the parent process. Five questions about what the website told you, then the thing the
// whole game has been about. Every answer is something you could only know by going everywhere.

export interface ParentQ {
  id: string;
  q: string;
  options: string[];
  answer: number;
  /** said when you get it wrong; it points back into the world, never at the answer */
  nudge: string;
}

export const PARENT_QS: ParentQ[] = [
  { id: 'first', q: 'Who wrote the very first entry in the guestbook?', options: ['A gull', 'W, the Webmaster', 'Nobody', 'The vending machine'], answer: 1, nudge: 'The Test Post. Somebody tested whether the thing was on.' },
  { id: 'machine', q: 'What does the machine at the end of the dark insist on?', options: ['Faith', 'Exact change', 'Coffee', 'A very good pun'], answer: 1, nudge: 'It is particular about money. Whole, not broken.' },
  { id: 'november', q: 'What was brought to the lighthouse keeper every November?', options: ['A key', 'A postcard', 'A plain yoghurt', 'A suspicious snack'], answer: 2, nudge: 'It was nobody important, in the way that someone important was.' },
  { id: 'number', q: 'Which number did W love?', options: ['7', '11', '42', '1111'], answer: 1, nudge: 'It is on the homepage, in the About Me. It is a good number.' },
  { id: 'who', q: 'Who has been visiting this website, this whole time?', options: ['Nobody', 'W', 'The gulls', 'You'], answer: 3, nudge: 'Look at the counter. Look at who is looking at it.' },
];

export const PARENT_LINES = [
  'PARENT PROCESS FOUND.',
  '',
  '  name:     visitor_73',
  '  pid:      1',
  '  started:  the first time you clicked',
  '  status:   RUNNING (for as long as you keep coming back)',
  '',
  'This website was never running by itself.',
  'It only ever ran while someone was visiting.',
  'It has been waiting, on and off, since March 2001, for a click.',
  '',
  'Everything you found was here the whole time.',
  'You were the part that was missing.',
];
