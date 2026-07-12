# The Victory Trigger — Author-Owned, No New Grammar

**Status**: REWRITTEN per David (2026-07-12): the first draft's dedicated
`win … when` declaration was wrong all the way through. The author decides
the criteria; the platform adds NOTHING. Superseded text removed.

## The design (David's)

1. **The author names the winning state as a condition** — the existing
   `define condition` kit is the criteria language, and it already
   expresses any shape the author wants (predicates, story states, and/or,
   the E1/E2 quantifiers):

   ```
   define condition victory-state: no stray-treasure and after-hours
   ```

2. **The author implements a `when victory-state` statement** — `win` and
   `lose` already take the D7 statement `when` suffix, in any host the
   author chooses:

   - Tied to an action: `after putting it → win endgame when victory-state`
     (trophy-case shape).
   - Global, checked every turn: hang it on the player —

     ```
     create the player
       on every turn while victory-state, once
         win victory
       end on
     ```

     D11 presence-gating is trivially satisfied (the player is always
     where the player is), so this is the blessed global-check idiom.

## Verified end-to-end (2026-07-12)

scratchpad/victory.story: `define condition victory-state: no stray-crate`
+ the player-owned every-turn clause. The ending fired through the real
bundle the moment the last crate reached the shed (including via
transitive containment — carried into the shed counts, `is in` walks the
chain), triggerEnding set the flag, the engine stopped. Zero platform
changes, zero new grammar, no ratchet entry needed (no new syntax).

## What remains (story-level, autonomous)

- Wire real endings into stories that want them (the zoo's dormant
  `victory` phrase needs the story to MODEL completeness as observable
  state — that is authoring, not platform).
- A short pattern note in the authoring docs (design.md examples or the
  devkit tutorial line) showing the two shapes above.

## Explicitly rejected

- A dedicated `win <key> when <cond>` top-level declaration (first
  draft's recommendation) — redundant with condition + statement-when.
- Score-threshold triggers — Given 5's counting fence stands untouched.
