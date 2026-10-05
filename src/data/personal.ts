// The personal-content layer. Drop JSON files into /personal/ (see
// personal/README.md) to replace the placeholder memories with real ones,
// fictionalised ones, photos or voice clips. Nothing in the game logic needs to
// change, and a stranger can still play the placeholder version.
//
// Bundled at build time via import.meta.glob so a missing folder makes NO
// network request and logs NO console error.

export interface PersonalEntry {
  title?: string;
  text?: string;
  caption?: string;
  /** relative URL to an image (PHOTO_*) */
  image?: string;
  /** relative URL to an audio file (VOICE_*) */
  audio?: string;
}

type PersonalFile = Record<string, PersonalEntry>;

const files = import.meta.glob('../../personal/*.json', { eager: true, import: 'default' }) as Record<string, PersonalFile>;

export const PERSONAL: Record<string, PersonalEntry> = Object.assign({}, ...Object.values(files));

/**
 * An optional dedication. Put {"GIFT": {"title": "for", "text": "a note", "caption": "from"}} in personal/*.json
 * and it appears on the title screen and again at the very end. Empty by default, so strangers see nothing.
 */
export const GIFT = PERSONAL['GIFT'] ? { to: PERSONAL['GIFT'].title ?? '', note: PERSONAL['GIFT'].text ?? '', from: PERSONAL['GIFT'].caption ?? '' } : null;

/** names that appear in the world; replaceable too */
export const OWNER = {
  handle: PERSONAL['OWNER']?.title ?? 'starlight_w',
  initial: 'W',
  siteTitle: '~*~ Welcome 2 My World ~*~',
};
