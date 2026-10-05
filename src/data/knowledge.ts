// Things the player can learn. The count of these IS Boss Knowledge, and
// encounters reveal extra detail when the matching entry is known.

export const KNOWLEDGE: Record<string, string> = {
  vm_exact_change: 'The machine at the end of the 404 wants EXACT CHANGE. A whole token, not a broken one.',
  vm_pattern: 'The Vending Machine’s panel lights flip their neighbours too. Turn every light off.',
  vm_code_hour: 'The keypad wants "the hour that makes a wish". Four digits.',
  vm_dad_jokes: 'Machines groan at dad jokes. A groan is a kind of damage.',
  vm_slot_taped: 'The coin slot is only a slot. Anything shaped like money, or taped to look like it, might do.',
  w_wrote_first: 'The very first guestbook entry was written by W, the Webmaster. The strange new one is signed the same way.',
  light_was_tended: 'Somebody tended the lighthouse lamp for years. There is a photo pinned next to it.',
  yoghurt_has_destination: 'The yoghurt is for someone. W wrote it on the note and never said who.',
  november_yoghurt: 'Every November, someone brought Marl a plain yoghurt. He never asked why.',
  marl_lamp_stuck: 'Marl says the lamp is not dead, only stuck. It needs something a bit stubborn.',
  terminus: 'The last stop on the Bullet Train is called TERMINUS. It is not on any map.',
  page_is_address: '404 is not an error. It is an address. It has a lock, and the lock is small.',
  dev_xor: 'The back door does not care that two things are true. It cares that exactly ONE of them is. (XOR: one or the other, never both.)',
  inspector_url: 'The page has a debug view. Its address is about:inspector.',
  save_remembers: 'The corrupted file said THE PAGE REMEMBERS YOU. It was not a threat. It sounded relieved.',
  dev_note: 'The developer left a test object. It considers itself clickable by anything.',
  gus_pads: 'Gus says the lily pads only sing for someone who is actually out on the water.',
};
