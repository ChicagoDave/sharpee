# Session Summary: 2026-08-22 - feat/adr-321-world-index (2026-08-22 18:51 CDT)

## Goals
- Resume the Secret Letter port (`docs/work/secret-letter-port/plan.md`) after `.current-plan` was released by the tier-2-import-seam archive.
- Continue Phase 4's guided change-document conversation for the two open Chapter 1 questions carried from the prior session (the eavesdropped bite, the monkey trigger).
- Address a David-reported recurrence of the GH #290 gutter-overlap symptom in the Chord Writer editor.
- (Second half, after 3505bacd) Resolve the `hunted → chase` trigger and the escape-disguise chain through the same guided conversation, and extend the branch-tester harness to assert on `story.state`.

## Phase Context
- **Plan**: Port *The Secret Letter* (Textfyre, 2009) to Chord — `docs/work/secret-letter-port/plan.md`, Plan Status ACTIVE.
- **Phase executed**: Phase 4 — "Produce the change document through guided conversation" (P-4), Medium (ongoing); Phase 6 — "Chapter 1 vertical slice" (P-5), Large, received the harness extension and story-state scaffolding this session touches on its behalf.
- **Tool calls used**: not available for this second half — the session-state file (`.session-state-dfb7f6.json`) was retired by an earlier finalize within this same session; the first-half figure (44/150) is stale and not re-tallied here.
- **Phase outcome**: Phase 4 advanced further but stays CURRENT — five more Chapter 1/2-boundary decisions recorded (the `hunted`→`chase` trigger, the random sweep, the escape disguise, the boots thread, the woolen-cap restoration), all David-ruled 2026-08-22. Phase 6 stays CURRENT — the `hunted` state now exists in the story and one of its transitions is wired and tested, but the pressure model itself, the six placeholder lines, and the `npc-teisha.chord` TE20 rewrite remain outstanding.

## Completed

### Plan pointer restored
`docs/context/.current-plan` was absent (released when tier-2-import-seam archived in 3370c05c). Restored it to point at `docs/work/secret-letter-port/plan.md` and stamped a `**Resumed**` line recording the handoff. Pre-session audit was clean (tsc clean, no stale artifacts) — not re-verified in this pass.

### Change-document decisions (P-4, Chapter 1)
Seven sections total now recorded in `docs/work/secret-letter-port/change-document.md` this session, spanning both halves:

- **"The monkey — DECIDED"**: `EVENT_monkey` arms at the start of the chase rather than at first entry to the Exotic Gems Stall (`story.ni:2698`), because the cloak chain (banana → monkey → necklace → Teisha → silk cloak) is written for a Jack already being hunted (`story.ni:3050`) — completing that chain during the calm walk would let the player wear the disguise before anyone is looking for her. Seeding (`ST6`, `TE15`) is already placed in the calm-walk column.
- **"The eavesdrop's aftermath — DECIDED"**: David ruled the bite hands off to a **third story state** between `calm` and `chase`, named **`hunted`**. Grounded in the source's own three-beat structure — `Eavesdropping on Soldiers` → `Avoiding Soldiers` → `Final Chase` (`story.ni:1742-1751`), gates lock at `story.ni:1749`, mercenary postures oblivious/approaching/grabbing (`story.ni:2071-2182`).
- **"What moves `hunted` → `chase` — DECIDED (David, 2026-08-22): `TE20`, as in the source"**: the chase begins the moment the necklace-for-cloak trade fires (`story.ni:4005`) — a sighting during the sweep (pursuer reaching `approaching`/`grabbing`) stays `hunted`-state pressure, it does not itself start the chase. Consequence: the transition is authored on the TE20 exchange in `npc-teisha.chord`; the tent/pole timers are `chase` content.
- **"The sweep — DECIDED: the random sweep stays, as original story logic"**: David — *"keep the random sweep, it's original story logic."* The three postures, the per-room waiting timeout, and the 1-in-10 conspicuous-shopper roll (`story.ni:3403`) are carried as mechanism, running on the engine's seeded RNG streams (ADR-293) so tree-document lines stay deterministic at the pinned seed.
- **"The escape disguise — DECIDED: a dress and a fashionable hat, from Teisha, changed into after the slide"**: replaces the source's green silk cloak. David: *"Jack is going to get a dress from Teisha and not a cloak with a fashionable hat. Jack will have these things stuffed in a satchel when she slides down the rope and she will quickly change into the dress and the hat."* Chain: necklace → Teisha → dress+hat into the satchel → cable slide on the gray cloak (still the zipline, still left behind) → land → change → walk out. The woolen cap (`story.ni:1393`) — dropped by the scaffold with no ruling — is restored to the opening outfit, since the "hat and gray cloak" description the parchment uses to recognize her must describe what she's actually wearing.
- **"Where she changes — DECIDED: in the open, with a couple of beats of grace, and the boots give her away"**: David — *"We give her a couple of beats to change clothes before the mercenaries see that she has boots on and not dress shoes."* A short grace window (~2 turns) after landing, then a mercenary notices urchin boots under the dress and the chase resumes toward Commerce Street (`story.ni:4268`).
- **"The boots are a thread — DECIDED, provisionally"**: David — *"Her shoes get replaced with Dame I think."* Dame Sandler (jeweler, Commerce Street, a §3d perceiver) replaces her shoes at the later clothier/ball-dressing scene (`story.ni:5119`); the boots stay the one urchin tell until then. Marked provisional at David's own hedge.

### Chord conversation critique and GH #303
An outside reviewer's critique of Chord's conversation system (`ast.ts` phrase strategies — randomly/cycling/stopping/sticky/first-time — and greeting rows vs. beats) was assessed against the actual code. A reply was drafted for David; genuine gaps (compound phrase strategies, phrase-in-phrase, shared sequences) were filed as **GH #303** (confirmed open: "Chord: compound phrase strategies and composable stateful terms"), not fixed inline.

### Harness extension — `story.state` claims (branch-tester)
David: "do the harness extension first," ahead of authoring the `hunted`-state content. Added a `story.state = <state>` / `story.state != <state>` claim head to `evaluateStateExpression` in `packages/branch-tester/src/runner.ts` (now exported for the test), reading world state via a new optional `getStateValue?(key: string)` on the runner's local minimal `WorldModel` interface (missing until a build failure surfaced it — added). `CHORD_STORY_STATE_KEY` is now re-exported from `@sharpee/story-loader`'s barrel (`packages/story-loader/src/index.ts`), and `branch-tester` gained that package as a dependency (`package.json`, `tsconfig.json` project reference, `pnpm-lock.yaml`).

A first pass mistakenly added the claim head to `transcript-tester` instead — reverted once caught, since `story.state` is a Chord-tree-document concept and belongs to the harness `branch-tester` actually is (ADR-302 D16: "the directory decides the harness").

### Story wiring for the `hunted` state
`branch-stories/secret-letter/secret-letter.story` header: `states: calm, chase` → `states: calm, hunted, chase`. `grubbers-market.chord`'s apple `on eating` clause now does `change the story to hunted` on the Alley bite. The stale OPEN header note in `grubbers-market.chord` was rewritten to reflect the decided trigger (no market gates exist yet to lock — that's still Phase 6 build work).

### Mapping table (source sweep rules → Chord constructs)
Produced in conversation, not yet committed to a file: entity states for mercenary posture, `on every turn` + one-chance-in-n for the roll, per-entity counters with raise/lower for the timeout, `define sequence` for "N turns later kill/catch the player," `after going` for room-entry checks. This is design groundwork for the pressure model, not the model itself — **not yet authored**.

## Key Decisions

### 1. Third story state (`hunted`) between `calm` and `chase`
David's ruling — the eavesdrop's aftermath is its own state rather than folded into `chase`. Sourced to the 2009 material's own three-beat structure; the port isn't inventing new middle-game content here, it's naming a state the source already had.

### 2. Monkey trigger moves from location to chase-start
Keeps the monkey's seeding text intact while preventing the disguise chain from completing before Jack is actually hunted.

### 3. `TE20` stays the `hunted → chase` trigger, not a sighting
David closed the question this plan had explicitly left open in the first half of this session. A sighting during the sweep stays pressure, not a state change — keeps the mercenary postures meaningful as texture rather than as a second trigger competing with TE20.

### 4. Escape disguise redesigned around a dress and hat, not the source's cloak
A deliberate departure from the 2009 material (the cloak is kept, but repurposed as the zipline object rather than the disguise). Reframes the escape as Jack's first visible step toward presenting as Jacqueline (vision.md §1) rather than as a boy-passing trick, and plants a new loose thread (the boots) the mercenaries can pick up on.

### 5. Boots-to-Dame-Sandler thread, held provisional
David flagged his own answer as uncertain ("I think"). Recorded as DECIDED but provisional so a later session doesn't treat it as harder-ruled than it is — normal practice for this change document, not a new convention.

## Next Phase
- **Phase 4 remains CURRENT.** Chapter 1's disguise/trigger/sweep questions are now closed; the next open item is authoring the `hunted`-state pressure model itself (mapping table above is groundwork, not the model).
- **Phase 6** (Chapter 1 vertical slice, CURRENT since 2026-08-22, session 83c2f3) stays blocked on: the six David placeholder lines (3 apple in `grubbers-market.chord`, 3 Teisha in `npc-teisha.chord`), the route-clause ruling for the other fourteen peering phrases, crates' mechanical role, the `hunted`-state mercenary pressure model (design groundwork done, not authored), and the `npc-teisha.chord` TE20 rewrite around the dress/hat/satchel chain.
- **Entry state for resuming**: `secret-letter.story` and `grubbers-market.chord` already carry the `hunted` state and one tested transition into it; the pressure model, the new objects (dress, hat, satchel additions, woolen cap, boots), and TE20 itself are still to write.

## Open Items

### Short Term
- Author the `hunted`-state mercenary pressure model (oblivious/approaching/grabbing postures, per-room timeout, 1-in-10 roll) against the mapping table produced this session.
- Rewrite `npc-teisha.chord`'s `TE20` around the dress-and-hat chain; decide whether the perceiver line ("It brings out your eyes...") carries from the cloak to the dress.
- Author the landing grace-window and boots-notice beats.
- The six David placeholder lines and the fourteen-phrase route-clause ruling, both carried forward from before this session.
- David confirms the gutter-overlap fix in the relaunched Chord Writer app (screenshot prompted the first half of this session; not yet closed).

### Long Term
- Whether a third pre-layout path for the gutter-overlap class exists beyond the two now fixed (stale frame, stale clip origin) — no evidence of one, but the class has recurred once already.
- P-10's re-plan pass (browser build, hosting, landing page, IFID, announcement) remains phase-less per Phase 3's standing note — unaffected by this session.
- GH #303 (compound phrase strategies, phrase-in-phrase, shared sequences) — filed, not scheduled.

## Files Modified

**Secret Letter port — story content** (3 files):
- `branch-stories/secret-letter/grubbers-market.chord` — apple `on eating` → `change the story to hunted`; OPEN header note rewritten as decided
- `branch-stories/secret-letter/secret-letter.story` — `states: calm, chase` → `states: calm, hunted, chase`
- `branch-stories/secret-letter/secret-letter.tests.json` — two new `story.state` claims (calm on refused eat, hunted on the Alley bite)

**Secret Letter port — planning docs** (3 files, both halves):
- `docs/context/.current-plan` — restored, points at `docs/work/secret-letter-port/plan.md`
- `docs/work/secret-letter-port/plan.md` — `**Resumed**` line stamped (first half; no phase-status change this session — both Phase 4 and Phase 6 stay CURRENT)
- `docs/work/secret-letter-port/change-document.md` — seven Chapter 1/boundary decisions total (monkey trigger, eavesdrop aftermath/`hunted` state, TE20 trigger, the sweep, the escape disguise, where she changes, the boots thread)

**Branch-tester harness extension** (4 files + lockfile):
- `packages/branch-tester/src/runner.ts` — `story.state = <state>` / `!=` claim head in `evaluateStateExpression` (now exported); `getStateValue?` added to the local `WorldModel` interface
- `packages/branch-tester/package.json` — new dependency on `@sharpee/story-loader`
- `packages/branch-tester/tsconfig.json` — project reference to `@sharpee/story-loader`
- `packages/branch-tester/tests/story-state-claim.test.ts` — new, 5 tests
- `packages/story-loader/src/index.ts` — `CHORD_STORY_STATE_KEY` added to the barrel export
- `pnpm-lock.yaml` — reflects the new branch-tester → story-loader dependency

**Chord Writer editor** (2 files, first half):
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` — `syncWrapWidth` clamps clip-view horizontal origin to 0 every pass
- `tools/ide/SharpeeIDETests/EditorWrapWidthTests.swift` — added `testASidewaysSlideCannotStickInWrapMode`

## Notes

**Session duration**: ~18:51–19:15 CDT (first half, editor fix + two change-document sections), then ~20:00–21:40 CDT (second half, harness extension + five more change-document decisions + GH #303).

**Approach**: Guided-conversation method for the change document throughout (Claude presents sourced material, David rules); the harness extension was built before any `hunted`-content authoring at David's explicit request ("do the harness extension first"), so the test suite could assert on the new state as soon as it existed rather than after.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — all changes uncommitted at session end, nothing pushed

## Dependency/Prerequisite Check

- **Prerequisites met**: `docs/work/secret-letter-port/INVENTORY.md` (Phase 2) grounds the eavesdrop/monkey/TE20 source citations; the prior tier-1-fixes session's own gap note directed the editor diagnosis; `CHORD_STORY_STATE_KEY` already existed in `@sharpee/story-loader` internals before this session, only its barrel export was missing.
- **Prerequisites discovered**: the runner's local minimal `WorldModel` interface lacked `getStateValue` — added as part of the harness extension, not a separate blocker.

## Architectural Decisions

- None this session. The `hunted` state, TE20 trigger, sweep, and disguise changes are story-content decisions under the existing Phase 4 conversation method; the `story.state` claim head is a harness feature addition following the branch-tester's existing claim-expression pattern, not a new architectural surface.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` (`syncWrapWidth` clip-origin clamp); `packages/branch-tester/src/runner.ts` (`evaluateStateExpression`'s new `story.state` branch reads world state via `getStateValue`); `branch-stories/secret-letter/grubbers-market.chord` (apple's `on eating` now mutates story state via `change the story to hunted`).
- Tests verify actual state mutations (not just events): YES for all three.
  - Editor: `xcodebuild test ... -only-testing:SharpeeIDETests/EditorWrapWidthTests` — "Executed 2 tests, with 0 failures (0 unexpected)," run 2026-08-22 19:11:50 CDT, after both files' last edits (19:00/19:09). Asserts on `clip.bounds.origin.x`, actual scroll state, not an event.
  - Harness: `pnpm --filter '@sharpee/branch-tester' test story-state-claim` — "5 passed (5)," re-run fresh by this agent 2026-08-22 21:33:20 CDT, after `runner.ts`'s last edit (20:32) and a cache-hit confirmation of the platform build. Constructs a real `WorldModel` with a real `getStateValue`/`CHORD_STORY_STATE_KEY` pairing and asserts on `evaluateStateExpression`'s match result against actual state, not a mock.
  - Story mutation: `./sharpee test branch-stories/secret-letter` — "67 cards passing, 74 assertions passing," re-run fresh by this agent 2026-08-22 21:33 CDT, after `secret-letter.tests.json`'s last edit (19:57) and `grubbers-market.chord`'s (19:31). The two new `story.state = calm` / `= hunted` claims assert on the story's actual state value after the eat-apple command runs, not on the event stream.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — for the editor half only. `docs/context/session-20260822-1537-feat-adr-321-world-index.md` (tier-1-fixes plan, Phase 3, GH #290) fixed the stale-frame/container mismatch and explicitly flagged: "if the gutter overlap recurs, a second pre-layout path may exist that the harness didn't cover." This session found that second path (stale clip-view scroll origin, independent of frame staleness). Consider a one-time audit of `syncWrapWidth` and other NSTextView/NSScrollView layout-sync code for a third variant before it recurs again.
- The harness-extension and change-document work (second half) has no known prior recurrence — NO.

## Test Coverage Delta

- Tests added: 6 total — 1 new test file (`story-state-claim.test.ts`, 5 tests) in `branch-tester`; 1 new Swift test (`testASidewaysSlideCannotStickInWrapMode`) in the editor.
- `branch-tester` suite: 87 → 92 passing (evidence: `pnpm --filter '@sharpee/branch-tester' test` — "Test Files 7 passed (7), Tests 92 passed (92)," run 2026-08-22 21:33:26 CDT, after `runner.ts`'s last edit at 20:32).
- `story-loader` suite: unchanged at 562 passing (evidence: `pnpm --filter '@sharpee/story-loader' test` — "Test Files 80 passed (80), Tests 562 passed (562)," run 2026-08-22 21:33:28 CDT; the barrel-export addition needed no new test).
- `branch-stories/secret-letter` tree document: 67 cards / 72 → 74 assertions passing (evidence: `./sharpee test branch-stories/secret-letter` — "67 cards passing, 74 assertions passing," run 2026-08-22 21:33 CDT, after both `.chord`/`.tests.json` last edits).
- `EditorWrapWidthTests`: 1 → 2 passing (evidence in Mutation Audit above, first half).
- Known untested areas: no live-app confirmation of the editor fix; the `hunted`-state pressure model itself (postures, timeout, 1-in-10 roll) has no test yet since it isn't authored; the `story.state != <state>` branch of the new claim head is implemented but not directly exercised by a tree-document claim yet (only `=` is used in `secret-letter.tests.json`) — covered indirectly by the unit test's negative-operator case.

---

**Progressive update**: Session completed 2026-08-22 21:40 CDT
