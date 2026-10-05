# Personal content

Anything you put here **replaces placeholder content** in the game, with no code changes.

Create `personal/my-memories.json` shaped like:

```json
{
  "MEMORY_001": { "title": "The Real First Post", "text": "…", "caption": "…" },
  "PHOTO_001":  { "title": "The Real Photo", "image": "./personal/lighthouse.jpg", "caption": "…" },
  "VOICE_001":  { "title": "The Real Voicemail", "audio": "./personal/hum.mp3" },
  "NOTE_001":   { "text": "Handwritten words that go on the sticky note" },
  "OWNER":      { "title": "the_webmasters_handle" }
}
```

Known ids: `MEMORY_001`, `MEMORY_002`, `PHOTO_001`, `VOICE_001`, `NOTE_001`, `OWNER`.
Put images/audio under `public/personal/` so they are served as-is.
A stranger should always be able to play without understanding the real-world context — keep the
game-facing text (the `text`/`caption`) readable on its own, and let the private meaning live in
the images, sounds and details only you recognise.

An empty folder is fine: the game falls back to the fictional placeholders.
