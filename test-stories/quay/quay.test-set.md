# Test set: quay

**Carries**: OB-46 to OB-52
**Read by**: `packages/platform-browser/tests/opening-real-path.test.ts`; `scripts/__tests__/opening-baseline.test.ts`
**Seed**: 42

## Obligations

- OB-46: a story with no opening block opens with its prologue, its banner, its opening chapter card and its first room, in that order, word for word as recorded in `docs/work/opening-routine/baseline/`.
- OB-47: a story whose opening block reorders the routines prints them in the block's order. No reader yet: the block does not exist until the language carries it, and the `seeded/` copies arrive with it.
- OB-48: a story whose opening block leaves a routine out does not print that part. No reader yet, for the same reason.
- OB-49: the opening chapter's card is printed once, immediately before the first room, and never a second time on the first command.
- OB-50: nothing has run when the first command is typed: no timer has stepped and no meter has grown. No reader yet: the clock copy under `seeded/` arrives with the block.
- OB-51: the turn count is blank before the first command and 1 after it. No reader yet.
- OB-52: the opening is printed on a first load, on a restart and when a restore fails, and not on a session restored from a save. No reader yet.

## What the story's parts are for

- The header's `prologue:`: the first of the three parts of an opening, and the one no other test story has.
- `use chapters`, with one chapter on the game's start and one on a first visit: the opening card, and a later card to tell it from.
- The Quay's `first time` paragraph: an opening that reads as a first visit, so a second look can be told from the first.
- The brass key and the locker: one thing to carry and one to open, so a first command can change the world without leaving the room.
- No timer, no sequence, no meter and no every-turn clause: a story whose opening look moves a clock cannot open word for word the same once the opening stops being a turn. The clock copy lives under `seeded/` when it arrives.
