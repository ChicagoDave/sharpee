# @sharpee/ext-chapters

The `use chapters` extension (ADR-330): a Chord story declares its chapters in one
`define chapters` block — a name for code, a title for the reader, an optional
description, and the moment each begins — and this package is the runtime behind it.

- `createChaptersPlugin(rows)` — a `TurnPlugin` that watches each chapter's trigger
  against world state and begins the chapter once; a stale trigger raises the
  non-fatal `runtime.chapter-stale` event. The current chapter and the per-row fired
  flags are ordinary `chord.chapter.*` world state, so save/restore carries them.
- `chapterChannel` / `registerChaptersChannels(registry)` — the `story.chapter`
  channel: a JSON packet (`name`, `title`, `description`, `ordinal`) on the turn a
  chapter begins. The client decides what a title card looks like (ADR-165).

Like `@sharpee/ext-scoring` and `@sharpee/ext-hunger`, the story-dependent part —
the rows themselves — is lowered by `@sharpee/story-loader` from `ir.chapters` at
`onEngineReady`; the registry entry carries only the channel registration.
