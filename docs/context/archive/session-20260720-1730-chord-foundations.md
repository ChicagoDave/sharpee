# Session Summary: 2026-07-20 ~17:30 - chord-foundations (session 17e36e)

## Goals
- Walk David through the 7 held items from the overnight sweep (session 18953c)
  and execute his rulings.

## Rulings captured (all David, 2026-07-20)
1. **Ratified**: Phase 1/3 PhraseList scope widenings; Phase 6 verbs.ts +
   sync-test framing; `ActionMetadata.preferredScope`.
2. **EXAMINE ME wording**: "As good-looking as ever." (classic default).
3. **ADR-247 interview**: all 3 questions resolved → **ACCEPTED** —
   (Q1) no filter option at all; new `world.getCarriedAndWorn(actorId)` →
   `{ carried, worn }`; `ContentsOptions.includeWorn` deleted; (Q2) full
   64-site audit mandatory before the flip (also covers `getAllContents`);
   (Q3) **ClothingTrait deleted** in the same change. adr-review ran; its 3
   gaps (getAllContents scope, partition signature, acceptance criteria)
   folded in with David's OK. **Broad flip now unblocked, not yet started.**
4. **rework/ + BRIEF.md**: deleted (docs/work/stdlib-reference/rework/).
5. **Batch-transcript lifecycle**: fix now. 6. **verify-traceability drift**:
   investigate + fix. 7. **Restart on Chord path**: investigate + propose only.

## Completed
- **EXAMINE ME fallback**: `default_description_self` ("As good-looking as
  ever.") in lang-en-us + stdlib examining-data self branch + requiredMessages;
  tests in both packages (stdlib 1559, lang-en-us 430 green). Matches Cloak of
  Darkness canon text.
- **Batch-transcript lifecycle FIXED** (David's "fix now"):
  - Diagnosis: `bootstrap.loadStory` re-`require`d the story → Node module
    cache handed every batch engine the SAME story instance + module-level
    daemon state (troll-daemon `let trollId/recoveryAcc`, sword-glow, balloon…).
    Stale ids no-opped daemons in engines 2..N — combat transcripts "passed"
    because the troll never fought back; daemon-dependent ones failed.
  - Fixes: `purgeStoryModuleCache` (new bootstrap `purge.ts`, 5 tests, real
    require-cache); `GameEngine.resume()` post-mortem revival seam (3 tests);
    `LoadedGame.reviveEngine()`; runner RETRY restore now revives + fast-fails
    the exact "Error: Engine is not running" output.
  - Residual class: transcripts lingering near a live troll die at MDL-canon
    rates (~20%/turn vs score-0 player) — **proven pre-existing** via pristine
    395eb3e9 worktree (solo 4/5 failures there too; worktree removed after).
  - Story-level repairs: GDT `ND` immortality now covers combat death
    (melee-npc-attack `emitHeroDeath` guard + deterministic unit test pair,
    mutation-verification warning addressed); RETRY wraps + `ND` added to 9
    death-exposed transcripts; grue-mechanics reordered (kill troll first).
  - **Verification: 6+ consecutive fully-green batch runs of all 112 dungeo
    transcripts; walkthrough chain green; engine 516, bootstrap 32, dungeo 31
    green; cloak + friendly-zoo transcript suites green.**
- **verify-traceability drift FIXED**: both doc blocks (doors.story,
  use-extensions.story) were non-contiguous excerpts since authoring — made
  verbatim in docs/reference/chord-language.md + 3 website pages
  (/chord/guide/world/doors, /chord/guide/vocabulary/use,
  /chord/language/doors-and-regions). Verifiers: 70/70 verbatim, 50/50 match.
- **Restart investigation** (proposal only, per ruling):
  `docs/work/platform-issue-sweep/restart-chord-path-proposal.md` —
  ChordStory.initializeWorld not re-entrant (`worldIds` skips rebuild after
  world.clear → stale ids → `assignRoom: room 'r01' not found`); engine masks
  the throw as "I don't understand that." (no try/catch at restartGame call
  sites). Proposed: self-healing worldIds filter + honest error surfacing.

## Key Decisions
- ADR-247 ACCEPTED (getContents worn default; partition API; ClothingTrait
  deletion) — see ADR for full contracts.
- Fresh-story contract: "load a fresh story" = fresh module state; batch mode
  now equals solo semantics (purge), matching TS stories' re-init discipline.
- `GameEngine.resume()` is the sanctioned post-mortem revival seam for
  harness/story death-recovery (no world teardown).

## Open Items / Next
- **ADR-247 implementation** (64-site audit + flip + getCarriedAndWorn +
  ClothingTrait deletion) — unblocked, awaiting scheduling.
- **Restart fix** — proposal awaiting David's go-ahead.
- Piped-REPL probe showed dungeo `restart` printing nothing — verify during
  restart-fix work (may be a pipe artifact).
- Possible ADR: resume()/fresh-story lifecycle decisions (ask David).

## Session Metadata
- **Status**: COMPLETE (all 5 tracked tasks done); all work uncommitted on
  chord-foundations atop 9aa08b7f.
- **Test state**: all touched suites green (see above); full batch
  deterministically green ×6; type-clean via full repokit build.
