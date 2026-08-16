# ADR-310 / ADR-318 Acceptance Audit (Phase 7)

**Date**: 2026-08-15 (session 0f32bb). Carried from Phase 6: "AC-by-AC coverage audit
(which acceptance criteria the transcripts/tests discharge vs. what closure still owes)."
Evidence is cited to the file that asserts it; "unit" means package tests, "bundle"
means a transcript through `dist/cli/sharpee.js`.

## ADR-310

| AC | Criterion (short) | Status | Evidence / gap |
|----|-------------------|--------|----------------|
| 1 | Round-trip per construct (D2–D10, D14) | **DISCHARGED** | `character/tests/roundtrip/compiled-roundtrip.test.ts` (13 descriptive), `normative-roundtrip.test.ts` (8 normative), `thealderman-port.test.ts` — Phase 3/4 exit states |
| 2 | Behavior end-to-end in a **purpose-built story**, bundle transcript: threat → panicked voice, no model word player-visible | **DISCHARGED** | Closed 2026-08-15 (session 0f32bb): `stories/character-acceptance/` — frozen mechanical fixture (one room, one Witness: confided secret, `never betrays a confidence`, `duty over fear`, panicked/calm phrasebook pair). `b1-witness.transcript` (8 steps via `dist/cli/sharpee.js`): calm voice → refusal-as-default-reply → attack → **panicked voice with 7 not-contains model-word assertions** → cornered → still refuses. Building it exposed and fixed TWO platform defects: (1) D3 `change mood`/`change feeling` compiled and silently dropped — `execCharacterTransition` added to the runtime statement switch (ledger-recorded from→to replayed as `npc.character.*` author rows; loud LoadError on a model-less owner); (2) `DefaultStateTransitions` keyed dead event names (`if.action.attacking/giving/taking`) — rekeyed to the real wire types (`if.event.attacked/given/taken`), making threat/mood/disposition observation live in play for the first time. Tests: `character-transitions.test.ts` (2, real attackingAction, trait-state assertions); suites stdlib 1616 / story-loader 497 / character 405; turbo 65/65; thealderman 53 + Dungeo 952 byte-stable post-change. |
| 3 | Goals live; conversation **suspends pursuit** (D16 lifecycle rule) | **DISCHARGED (unit)** | Activation/step execution: `character/tests/goals/goals.test.ts`, `tick-phases/oracle-goals.test.ts`. Suspension implemented 2026-08-15 (session 0f32bb, David's go-ahead): `trait.activeConversation` marker (D17-serialized; rides the world-model rehydration test) stamped by both dialogue surfaces (`conversation-marker.ts`; chord topic arm in `story-loader/src/runtime.ts` postReport; selector socket in `selector.ts`); `executeNpcGoals` skips step execution while the marker is fresher than the lifecycle's neutral decay threshold, activation still re-evaluating. Tests: `conversation-marker.test.ts` (6), `conversation-suppression.test.ts` (3 — goalState step held while suppressed, resumes after the window), selector +1, `character-dialogue.test.ts` +1 (real ask path, row hits and misses). Suites 2026-08-15: character 405 passing, world-model 1479 passing, story-loader 495 passing. |
| 4 | Influence resolves both ways, Margaret's except included | **DISCHARGED (unit)** | `character/tests/influence/influence.test.ts:93–205` (resisted vs applied, except conditional both directions). Verify the `resisted`/`witnessed` **phrase** firing leg when building the AC2 fixture (status is asserted; phrase selection rides the phrasebook). |
| 5 | Propagation moves the claim **value**; B's dialogue reflects it with B's own confidence/source | **PARTIAL** | Transfer with `receives: 'as belief'` confidence downgrade: `propagation/propagation.test.ts:442+`, `:593`. The composed leg — B's *dialogue selection* reflecting the received value — is not asserted anywhere in one test. |
| 6 | Named diagnostics compile errors | **DISCHARGED** | Phase 3 exit (chord tests: unknown personality word, misspelled fact value, theory-of-mind, phrasebook tie `analysis.phrasebook-tie`) |
| 7 | Save/restore (belief, mood, goal step) on trait state | **DISCHARGED** | `story-loader/tests/character-loading.test.ts` through the real `SaveRestoreService` (Phase 5) |
| 8 | D12 isolation asserted at the channel layer in a **built story** | **DISCHARGED** | Closed 2026-08-15 (session 0f32bb, David's G3 sign-off). The audit's real finding — `character` was registered UNGATED, so every client's wire carried author rows — fixed by extending the existing capability gate: `ClientCapabilities.authorChannels` (if-domain), `gatedBy: 'authorChannels'` on the channel (stdlib), false in every player profile (bootstrap CLI, engine default, platform-browser), auto-flipped by the D15 declared-channels mechanism for testing surfaces; chord's `CLIENT_CAPABILITY_FLAGS` gained `author-channels` (drift gate caught the parity). Both directions asserted on the real wire: `bootstrap/src/assemble-channels.test.ts` — positive (declared → gate flips → mint rows in the packet) and negative (undeclared player profile → mint-producing ask → packets flow, `character` never among them); `engine/tests/integration/channel-bootstrap.test.ts` — manifest filters `character` without the flag; `stdlib/tests/channels/character-author.test.ts` pins the gate. Suites 2026-08-15: engine 628, bootstrap 43, chord 836, turbo test:ci 65/65; bundle rebuilt, thealderman 53 + Dungeo chain 952 passing. |
| 9 | Dungeo chain + Fernhill byte-identical before/after | **OWED** | Phase 7 deliverable. Chain passes on-branch (Phase 6) but "byte-identical to pre-branch output" has not been captured/compared. |

## ADR-318

| AC | Criterion (short) | Status | Evidence / gap |
|----|-------------------|--------|----------------|
| 1 | B1 threatened Witness, 4 variants; **transcript test** | **DISCHARGED** | Unit legs: `arbiter.test.ts:43–107`. Transcript legs closed 2026-08-15 with the AC2 fixture: `b1-witness.transcript` (leg 1 — refuses even cornered), `b1-no-principle.transcript` (leg 2 — complies at once; variant file differs from the base by exactly the deleted principle line + id), `b1-no-temperament.transcript` (legs 3–4 — refuses under no fear, complies at cornered; the climb uses the real observe path, 4 witnessed attacks × 20 threat). 15 transcript steps, all passing via the bundle. |
| 2 | B2 audience discriminator + `honor over duty` vs `duty over honor` orderings | **PARTIAL** | Audience legs: `arbiter.test.ts:128–156` (empty room backs down, regiment refuses). The ordering-flip leg (brazen-out vs public confession) has no test — `grep "honor over\|duty over"` hits no arbiter assertion. |
| 3 | B3 bands climb, strained voice at `burdened`, crack at `breaking`, seek-out goal only outside conversation; **band pinned via forcing** | **PARTIAL** | `conscience-breaking.transcript` (bundle): monotonic climb through 5 maintained lies → breaking crack. Not covered: the strained-phrasebook-at-`burdened` voice assertion, the seek-out-goal-outside-conversation leg (blocked by the AC3/D16 suspension gap), and forcing (`forces:` header) — the transcript uses deterministic deposits instead. |
| 4 | B4 witnessed face-act reaches a **third NPC via propagation**, derived topic + scene alias | **PARTIAL** | Witnessing/minting on co-located observers with alias: `observe-substep.test.ts:127,152`; `act-detection.test.ts:177+` (witnessActs). The propagation hop to a third NPC and its dialogue gating under both names is not composed in any test. |
| 5 | B7+B5 pinned lie survives disposition warmth + save/restore; honest disagreement mints nothing; caught-lying fires face-act | **DISCHARGED** | `conversation/selector.test.ts:74–145` (mint+deposit, honest no-mint, pin holds under drift, re-delivery no duplicate); restore-pinned-liar via real SaveRestoreService (Phase 5); `lie-and-pin.transcript` (bundle); caught-lying face-act vocabulary + reveal-site betrayal: `act-detection.test.ts:58,154`; wt-01 program confrontation (bundle). |
| 6 | Paralysis → evasion + author-channel warning naming both | **DISCHARGED (unit)** | `arbiter.test.ts:158+` (verdict names both feeds); `arbiter/reveal.ts:92–95` emits `character.author.paralysis_warning`; author-channel projection `stdlib/tests/channels/character-author.test.ts`. |
| 7 | Every diagnostic a compile error | **DISCHARGED** | Phase 4 exit (chord tests: unknown force/category/face-act/band, temperament tie, burdened-unheld, unknown claim value). |
| 8 | Cost regression: 3–6-line character blocks; no-layer story compiles byte-identically | **OWED** | Phase 7 deliverable. |

## What closure owes (work list)

1. **AC2 fixture story** (`stories/` — frozen mechanical fixture, never revised): discharges
   310-AC2, the 318-AC1 transcript leg, and hosts the 310-AC4 phrase-firing verification.
   Bundle transcripts included. Variant sources for 318-AC1's deletion legs.
2. **310-AC8 channel isolation** — assertion at the channel layer in a built story.
3. **310-AC9 regression** — capture Dungeo chain + Fernhill output on this branch vs main,
   byte-compare (single run, pinned seed).
4. **318-AC8 cost regression** — no-layer story IR byte-compare vs main; thealderman
   character-block line counts within 3–6.
5. **Unit additions**: 318-AC2 ordering flip; 310-AC5 composed propagation→dialogue test;
   318-AC4 third-NPC composition.
6. **D16 suspension gap (310-AC3, feeds 318-AC3's seek-out leg)** — ~~needs a design call~~
   **CLOSED 2026-08-15 (David: "fix the interrupted conversation gap")**: trait-riding
   `activeConversation` marker + goal sub-step suppression window; see AC3 row above.
   318-AC3's seek-out transcript leg is now unblocked (item 7).
7. **318-AC3 remaining legs** — strained-voice assertion (+ forcing once decided), seek-out
   leg after item 6.
8. **IDE author-channel polish** (Phase 2 raw readout → Chord Writer panel; David's Phase 2
   ownership ruling).
9. **`tsf build --npm`** across chord, character, world-model, stdlib, plugin-npc,
   story-loader, engine (whichever the branch touched).
