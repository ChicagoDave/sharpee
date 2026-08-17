# thealderman — TypeScript story (ARCHIVED)

Archived 2026-08-15 (David) — ADR-310 D18, Phase 6 of the ADR-310/318
implementation plan.

This was the `ConversationBuilder`/`CharacterBuilder` reference
implementation of The Alderman, and the last story consumer of the TS
conversation-authoring surface. The story now lives as a pure Chord
story at `stories/thealderman/chord/thealderman.story` (the ADR-259 D8
friendly-zoo shape: a `.story`, docs, and transcripts, no package.json),
with one fixed authored solution — the Clue-style randomization this
source implemented was removed by the same ruling.

Never a pnpm workspace member (the workspace is an explicit allow-list),
so nothing builds or installs from here. Kept for reference: the
response-chain and randomization idioms it demonstrates are the
translation source documented in the Chord story's header comments.
