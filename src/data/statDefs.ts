import type { StatId } from '../core/types';

export interface StatDef {
  id: StatId;
  label: string;
  group: 'Body / Heart' | 'Mind' | 'Wild';
  icon: string; // sprite key
  blurb: string;
  use: string;
}

export const STAT_DEFS: StatDef[] = [
  { id: 'courage', label: 'Courage', group: 'Body / Heart', icon: 'heart', blurb: 'Doing the thing anyway.', use: 'Risky actions: climbing, kicking, saying yes.' },
  { id: 'dadEnergy', label: 'Dad Energy', group: 'Body / Heart', icon: 'tape', blurb: 'Duct tape, terrible puns, quiet competence.', use: 'Repairs, improvised fixes, protective instincts. "This should not work but somehow does."' },
  { id: 'nurture', label: 'Nurture', group: 'Body / Heart', icon: 'sprout', blurb: 'Small creatures notice.', use: 'Creatures, plants, gentle conversations, some crafting.' },
  { id: 'curiosity', label: 'Curiosity', group: 'Mind', icon: 'lens', blurb: 'What does this button do?', use: 'Opens exploration options and odd corners.' },
  { id: 'observation', label: 'Observation', group: 'Mind', icon: 'eye', blurb: 'The detail you were not supposed to see.', use: 'Reveals hidden details and visitors. Squint for more.' },
  { id: 'memory', label: 'Memory', group: 'Mind', icon: 'brain', blurb: 'You remember where you left it.', use: 'Memory puzzles: more replays, longer sequences held.' },
  { id: 'puzzleSense', label: 'Puzzle Sense', group: 'Mind', icon: 'puzzle', blurb: 'A feeling in the shape of the problem.', use: 'Contextual nudges. It will never solve a puzzle for you.' },
  { id: 'bossKnowledge', label: 'Boss Knowledge', group: 'Mind', icon: 'book', blurb: 'Everything you have learned about the things that fight back.', use: 'Grows as you read, listen and explore. Reveals weaknesses in encounters.' },
  { id: 'luck', label: 'Luck', group: 'Wild', icon: 'clover', blurb: 'The dice quietly like you.', use: 'Re-rolls your lowest die. Raises the floor, not the ceiling.' },
  { id: 'chaos', label: 'Chaos', group: 'Wild', icon: 'spiral', blurb: 'Variance with a personality.', use: 'Wild dice swing higher and lower. Great for crits. Also for disasters.' },
  { id: 'creativity', label: 'Creativity', group: 'Wild', icon: 'bulb', blurb: 'Why not use the leaf as a banknote?', use: 'Unlocks alternate approaches when the front door is locked.' },
];

export const STAT_BY_ID = Object.fromEntries(STAT_DEFS.map((s) => [s.id, s])) as Record<StatId, StatDef>;
