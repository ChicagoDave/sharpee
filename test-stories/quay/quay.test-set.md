# Test set: quay

**Carries**: OB-46 to OB-53
**Read by**: `packages/platform-browser/tests/opening-real-path.test.ts`; `scripts/__tests__/opening-baseline.test.ts`; `packages/story-loader/tests/opening-block.test.ts` (the story and every copy under `seeded/`, on the engine alone); `./sharpee test test-stories/quay` (the tree `quay.tests`)
**Seed**: 42

## Obligations

- OB-46: a story with no opening block opens with its prologue, its banner, its opening chapter card and its first room, in that order, word for word as recorded in `test-stories/quay/baseline/`.
- OB-47: a story whose opening block reorders the routines prints them in the block's order; `seeded/quay-reordered.story` (prologue, room, banner). Read on the engine; no reader in a browser page or on the command line yet.
- OB-48: a story whose opening block leaves a routine out does not print that part, then or on the first command; `seeded/quay-no-look.story`, `quay-no-banner.story`, `quay-no-prologue.story`, and `quay-empty.story`, whose block is empty and prints nothing. Read on the engine; no reader in a browser page or on the command line yet.
- OB-49: the opening chapter's card is printed once, immediately before the first room, and never a second time on the first command. With no first look in the block, the card comes with the first command instead (`seeded/quay-no-look.story`).
- OB-50: nothing has run when the first command is typed: no timer has stepped, no sequence has counted a turn and no meter has grown; `seeded/quay-clock.story`, where the tide's first line and the hunger's first rung answer the first command and the sequence's step answers the third. Read on the engine.
- OB-51: the turn count is blank before the first command and 1 after it. No reader yet.
- OB-52: the opening is printed on a first load, on a restart and when a restore fails, and not on a session restored from a save. No reader yet.
- OB-53: the story's test tree is one opening card and nothing else, and it is checked: the card claims the prologue, the banner's title, the first room's name and its first-visit paragraph, and the run passes with no command typed; `quay.tests`.

## What the story's parts are for

- The header's `prologue:`: the first of the three parts of an opening, and the one no other test story has.
- `use chapters`, with one chapter on the game's start and one on a first visit: the opening card, and a later card to tell it from.
- The Quay's `first time` paragraph: an opening that reads as a first visit, so a second look can be told from the first.
- The brass key and the locker: one thing to carry and one to open, so a first command can change the world without leaving the room.
- No timer, no sequence, no meter and no every-turn clause: a story whose opening look moves a clock cannot open word for word the same once the opening stops being a turn. The clock copy is `seeded/quay-clock.story`.
- `seeded/`: whole copies of the story. Five differ from it only by an opening block added at the end; `quay-clock.story` has no block and adds a timer started before the game starts, a sequence with a step at turn 3, and a hunger meter whose first rung is its first growth. Regenerate them from `quay.story` whenever it changes.
