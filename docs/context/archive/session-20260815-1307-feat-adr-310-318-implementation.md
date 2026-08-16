# Session Summary: 2026-08-15 - feat/adr-310-318-implementation

## Goals
- Formally close Phase 1 of the ADR-310/318 plan (stdlib naming confirm).
- Execute Phase 2: stdlib integration — tick-phase socket, dialogue selector, act detection, author channel, minimal IDE readout.

## Phase Context
- **Plan**: `docs/work/adr-310/plan.md` (7 phases, combined ADR-310 + ADR-318 implementation).
- **Phase executed**: Phase 1 close-out, then Phase 2 (Large).
- **Working branch**: `feat/adr-310-318-implementation` (confirmed at session start).

## Completed

### Phase 1 formally closed
- Stdlib/umbrella D11a confirm pass: grepped all of `packages/stdlib/src` + tests for retired preset names, removed belief API, and removed subsystem objects — zero hits in source. stdlib does not import `@sharpee/character`. Umbrella re-export line's six names all still exported. No edits, so no rebuilds. Plan flipped to DONE with evidence inline.
- One judgment-call finding: `packages/stdlib/tests/unit/npc/character-observer.test.ts` uses `'dissociative'` as an author-defined lucidity state name in fixtures — not frozen vocabulary, but clinical-label echo; folded into Phase 2's naming-parity sweep.

### Phase 2 started (David's go-ahead in-session)
- Survey complete: npc-service.ts / lucidity-decay.ts / character-observer.ts / character-messages.ts read; tick-phases.ts (current sub-step order influence → propagation → goals, no decay, no bookkeeping, no arbiter); dialogue socket absent (asking.ts is a minimal interceptable shell per ADR-230); ADR-207/208 world-instance registration idiom identified as the socket's home; NpcPlugin (packages/plugin-npc) is where NpcService is instantiated.
- Key dependency facts: `@sharpee/character` depends on `@sharpee/stdlib` (so the decay fold can import `processLucidityDecay` from stdlib); stdlib depends on world-model (so `DialogueSelector` types + registration must live in world-model, like interceptors).
- No arbiter exists yet in `@sharpee/character` — building it is Phase 2 scope (author channel needs its verdicts).

## Sub-step breakdown (Phase 2)
1. D11a naming-parity sweep of the three stdlib npc files (+ 'dissociative' fixture rename)
2. Tick-phase fold: decay sub-step folded into `createCharacterModelPhase` (order per contracts §2: decay → influence → propagation → goals → bookkeeping); inline `processLucidityDecay` call removed from `npc-service.ts` tick(); registration path + tests
3. Arbiter (ADR-318 D1–D3) in `@sharpee/character` — pure `arbitrate()`, bookkeeping mutations in tick phase
4. Dialogue-selector socket: world-model registration (ADR-207/208 idiom) + asking/telling/talking consultation + selector-pin hook (§4)
5. Act detection: taking → steal-candidate, combat → harm, reveal → topic delivery
6. Author channel: retire CharacterMessages player-facing opt-in, reroute + new per-NPC-turn stream (ADR-318 D11)
7. Minimal IDE "explain this NPC's turn" readout

### Phase 2 sub-steps 1–6 implemented (all with tests, suites green)
1. **Naming sweep**: `'dissociative'` fixture → `'elsewhere'` (stdlib character-observer test); three D11a-leftover test files still passing the retired `'selective'` tendency fixed to the D10 whitelist idiom (vitest doesn't type-check — that's how they survived).
2. **Decay fold**: `runDecaySubStep` added to `createCharacterModelPhase` (order: decay → influence → propagation → goals); mood decays toward the authored baseline (`CharacterPhaseConfig.baselineMood`, captured by `applyCharacter` — no trait shape change, D6-compliant); inline `processLucidityDecay` call REMOVED from `NpcService.tick()`; `registerCharacterModelPhase` + `CHARACTER_MODEL_PHASE_NAME` exported; real-NpcService once-per-tick regression test.
3. **Arbiter** (`packages/character/src/arbiter/`): pure `arbitrate()` per contracts §3 (D2 intensity default, D3 temperament pairs, D6 paralysis→evade, defeats), force feeds (fear/desire/duty/honor/love per D1 table; principle baseline 0.7), `depositPressure`/`drainPressure` bookkeeping (15/defeat, bands 30/70, remorseful ×2 / untroubled ×¼, drain unpins). 18 tests keyed to B1/B2/D6 scenarios.
4. **Dialogue-selector socket**: world-model `dialogue-selector-binding.ts` + `registerDialogueSelector`/`getDialogueSelector` on concrete `WorldModel` ONLY (IWorldModel high-bar honored); asking/telling/talking consult via `consultDialogueSelector` helper (D7 fall-through); character-side `createCharacterDialogueSelector` adapter; pin filtering + D9 mint rule in `selectAndRecordResponse`/`recordClaim` (`ResponseCandidate.claims` tag added). Selection context is deliberately turn-less (turn is engine state; selector closes over `getTurn`).
5. **Act detection** (`packages/character/src/act-detection/`): `detectActs` (taking→steal via prior-holder — `npc.took` now carries `from`; combat→harm), `revealConfidedTopic` (reveal site; `Fact.confided` marker added through Fact/trait/builder), `witnessActs` (D12a derived-topic minting onto observers), `derivedTopicFor` (closed past-tense maps).
6. **Author channel**: `character` channel (append/json/sparse) registered in `STANDARD_CHANNELS`, projecting `character.author.*` + `npc.character.*` rows; `recordClaim` emits ledger_mint/pin_held/pressure_deposit author events riding `DialogueResult.authorEvents` → `DialogueSelectionResult.authorEvents` → action report events; `CharacterMessages` re-documented as author-channel-only (no player rendering existed in lang-en-us to remove — verified).

### Verification
- character: 352 passing; stdlib: 1616 passing, 27 pre-existing skips; world-model: 1470 passing, 10 pre-existing skips (all 2026-08-15).
- mutation-verification ran twice (decay fold; selector socket) — all GREEN, one wiring note: nothing forwards `applied.baselineMood` into `registry.register()` in production yet (Phase 5 loader scope, tracked below).

## Key Decisions
- Mood-decay baseline lives in `CharacterPhaseConfig` (authored data, rebuilt at load per D17), NOT on the trait — respects the frozen §1 shape; baseline = authored starting mood per D6.
- Dialogue-selector registration on concrete `WorldModel` only, not `IWorldModel` (standing high-bar ruling).
- Arbiter intensity scale: principles/obligations/honor at fixed 0.7; threat maps 0–1 (cornered 0.8 outburns a principle, threatened 0.6 does not — matches B1's counterfactuals); exact ties hold the line (against side wins, documented runtime-owned determinism).
- Paralysis check includes obligation feeds (answers-honestly vs betray-a-confidence is the canonical D6 collision even though D6 says "principles").
- Reveal-site arbitration gating (refuse instead of deliver, driven by `arbitrate()` over authored candidates) deferred to Phases 3–4 where Chord compiles principles + topic/fact linkage together; act detection + pin/mint/deposit economy land now.

### Sub-step 7 — raw "explain this NPC's turn" readout on the testing surface
- The `character` channel rides the existing ADR-294 D15 capture path: a transcript declaring `channels: character` captures per-NPC-turn rows per command (golden recordings included). Proven end-to-end in `packages/bootstrap/src/assemble-channels.test.ts` — real engine, real channel service: ASK → selector authorEvents → turn packet → `character` rows in `lastChannelValues`.
- The Chord Writer (tools/ide) panel is NOT built here — tools/ide is the parallel IDE session's domain; the polished panel is Phase 7 scope. Flagged to David (the session-checkpoint agent raised the same ownership question).

### Verification (final, 2026-08-15)
- bootstrap: 42 passing; `pnpm exec turbo run test:ci`: 65 of 65 tasks successful (run twice this session, green both times).
- session-checkpoint (~60 min): no scope drift, no orphaned artifacts, no new blockers; its one suggestion (resolve sub-step 7 ownership explicitly) actioned via the testing-surface readout + explicit flag to David.

## Deferred / wiring notes
- `registerCharacterModelPhase`, `registerCharacterDialogue`, `observeEvent`, and `baselineMood` forwarding all await Phase 5 loader/engine wiring (observeEvent was already unwired pre-Phase-2).
- Reveal-site arbitration gating (arbitrate() choosing refuse/evade over authored candidates) lands with Phases 3–4's Chord topic/fact linkage.
- Chord Writer "explain this NPC's turn" panel: first raw cut exists on the testing surface (channel capture); the IDE panel itself awaits David's call on session ownership (this branch vs the parallel IDE session) — plan's Phase 7 carries the polish either way.

## Open Items
- Carried: stale plans `adr-280-chord-writer-project-model` + `live-derived-state` undispositioned; 23 stranded event logs.
- Carried: N1–N3 thealderman scene slots await David's pick (Phase 6 blocker only).
- Audit flag: "proxy signal standing in for the real property" systemic audit (6 prior instances) still untracked.
- **Chord Writer readout ownership ruling still open**: the testing-surface raw "explain this NPC's turn" readout (sub-step 7, `character` channel + `assemble-channels.test.ts`) exists and is proven end-to-end, but David has not yet ruled whether the polished IDE panel belongs in Phase 2 (this branch) or rides Phase 7 (this branch's polish pass either way, per the plan) — or whether it's the parallel IDE session's domain instead. Get this ruling at the start of the next session before touching tools/ide.

## Next Phase
- **Phase 2 remains CURRENT** (plan.md, since 2026-08-15) — not flipped to DONE this session. Sub-steps 1–7 of Phase 2 are implemented and verified (see Completed above), but formal phase close is deferred pending the Chord Writer readout ownership ruling above.
- **Next session**: get David's ruling on sub-step 7 ownership, close Phase 2 in plan.md, then proceed to **Phase 3** — Chord grammar, ADR-310 descriptive constructs (plan.md, currently PENDING).

## Files Modified

**Session summary + plan** (2 files):
- `docs/context/session-20260815-1307-feat-adr-310-318-implementation.md` - this file (new)
- `docs/work/adr-310/plan.md` - Phase 1 closed DONE, Phase 2 stamped CURRENT (since 2026-08-15)

**`@sharpee/character` — arbiter, act detection, conversation/selector (new + modified)**:
- `packages/character/src/arbiter/{arbiter,arbiter-types,force-feeds,pressure,index}.ts` - new, pure `arbitrate()` + pressure bookkeeping (ADR-318 D1-D3, D6)
- `packages/character/src/act-detection/{act-detection,index}.ts` - new, taking→steal / combat→harm / reveal detection
- `packages/character/src/conversation/selector.ts` - new, `createCharacterDialogueSelector` adapter
- `packages/character/src/conversation/{dialogue-extension,dialogue-types,index,response-types}.ts` - modified, `ResponseCandidate.claims`, pin/mint plumbing
- `packages/character/src/apply.ts` - `baselineMood` capture from `CharacterPhaseConfig`
- `packages/character/src/character-builder.ts` - D11a naming-parity follow-on
- `packages/character/src/tick-phases.ts` - `runDecaySubStep` folded into `createCharacterModelPhase`
- `packages/character/src/index.ts` - export surface updated

**`@sharpee/character` tests** (new + modified):
- `packages/character/tests/arbiter/{arbiter,pressure}.test.ts` - new, 18 tests
- `packages/character/tests/act-detection/act-detection.test.ts` - new, 8 tests
- `packages/character/tests/conversation/selector.test.ts` - new, 10 tests
- `packages/character/tests/tick-phases/character-model-phase.test.ts` - 7 new decay/registration tests added
- `packages/character/tests/tick-phases/integration-fragment.test.ts` - modified
- `packages/character/tests/influence/round-trip.test.ts`, `tests/propagation/builder.test.ts` - modified for the sweep follow-on

**`@sharpee/stdlib` — dialogue-selector socket, author channel**:
- `packages/stdlib/src/actions/helpers/dialogue-selector.ts` - new, `consultDialogueSelector` helper
- `packages/stdlib/src/actions/standard/{asking/asking,talking/talking,telling/telling}.ts` - modified, socket consultation wired in
- `packages/stdlib/src/channels/character-author.ts` - new, `character` channel (append/json/sparse)
- `packages/stdlib/src/channels/{index,standard.ts}` - modified, channel registered in `STANDARD_CHANNELS`
- `packages/stdlib/src/npc/{character-messages,npc-service}.ts` - modified, decay call removed from `tick()`, author-channel-only re-documentation

**`@sharpee/stdlib` tests**:
- `packages/stdlib/tests/unit/actions/dialogue-selector-socket.test.ts` - new, 8 tests
- `packages/stdlib/tests/channels/character-author.test.ts` - new, 3 tests
- `packages/stdlib/tests/unit/npc/character-observer.test.ts` - modified, `'dissociative'` → `'elsewhere'` fixture rename

**`@sharpee/world-model` — dialogue-selector registration**:
- `packages/world-model/src/capabilities/dialogue-selector-binding.ts` - new, `registerDialogueSelector`/`getDialogueSelector`
- `packages/world-model/src/capabilities/index.ts` - modified, export added
- `packages/world-model/src/traits/character-model/character-vocabulary.ts` - modified
- `packages/world-model/src/world/WorldModel.ts` - modified, registration on concrete `WorldModel` only

**`@sharpee/bootstrap`** (proves sub-step 7 end-to-end):
- `packages/bootstrap/src/assemble-channels.test.ts` - modified, 1 new end-to-end test (ASK → selector authorEvents → turn packet → `character` rows)

**Incidental** (1 file):
- `docs/context/session-20260815-0509-main.md` - prior session file, minor progressive update (not this session's primary work)

## Notes

**Session duration**: continued from the 2026-08-15 12:55 CDT start through Phase 2 sub-steps 1-7.

**Approach**: Contracts-first (Phase 1's `contracts.md` fixed the arbiter API, trait shapes, and socket signatures before any Phase 2 code); Behavior-Statement-before-test discipline (rule 12) held for every new mutator across arbiter, act-detection, and the dialogue-selector socket; `mutation-verification` run twice mid-phase rather than once at the end, catching the wiring gap (`baselineMood` not yet forwarded to `registry.register()` in production — tracked as a Phase 5 loader item, not a defect in this session's scope).

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — Phase 2 sub-steps 1-7 are implemented and verified; only the sub-step 7 ownership ruling (open item above) stands between this work and formal Phase 2 close.
- **Rollback Safety**: safe to revert — `pnpm exec turbo run test:ci` green 65/65 (2026-08-15, run twice this session), no destructive changes; all changes are uncommitted on `feat/adr-310-318-implementation`.

## Mutation Audit

- Files with state-changing logic modified: `packages/character/src/tick-phases.ts` (decay sub-step), `packages/character/src/arbiter/{arbiter,pressure}.ts` (bookkeeping mutations), `packages/character/src/act-detection/act-detection.ts`, `packages/character/src/conversation/selector.ts`, `packages/stdlib/src/npc/npc-service.ts` (inline decay call removed), `packages/world-model/src/world/WorldModel.ts` (dialogue-selector registration).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/character' test run` → 352 passing, 2026-08-15; `pnpm --filter '@sharpee/stdlib' test run` → 1616 passing, 27 pre-existing skips, 2026-08-15; `pnpm --filter '@sharpee/world-model' test run` → 1470 passing, 10 pre-existing skips, 2026-08-15; `pnpm --filter '@sharpee/bootstrap' test run` → 42 passing, 2026-08-15; `pnpm exec turbo run test:ci` → 65/65 tasks successful, run twice, 2026-08-15). `mutation-verification` ran twice this session (decay fold; selector socket), both GREEN.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — no recurring blocker patterns this session. One test failure encountered mid-session was a same-session strict-assertion update needed in a test written earlier in this same session (not a carryover pattern from a prior session).

## Test Coverage Delta

- Tests added: `packages/character/tests/arbiter/{arbiter,pressure}.test.ts` (18 tests); `packages/character/tests/conversation/selector.test.ts` (10 tests); `packages/character/tests/act-detection/act-detection.test.ts` (8 tests); 7 new decay/registration tests in `packages/character/tests/tick-phases/character-model-phase.test.ts`; `packages/stdlib/tests/unit/actions/dialogue-selector-socket.test.ts` (8 tests); `packages/stdlib/tests/channels/character-author.test.ts` (3 tests); 1 new end-to-end test in `packages/bootstrap/src/assemble-channels.test.ts`.
- Tests passing before: character 309 (per prior session summary) → after: 352 passing (evidence: `pnpm --filter '@sharpee/character' test run`, 2026-08-15). stdlib: 1616 passing, 27 pre-existing skips. world-model: 1470 passing, 10 pre-existing skips (unaffected by this session's changes). bootstrap: 42 passing. Repo-wide gate: `pnpm exec turbo run test:ci` → 65/65 tasks successful, run twice, 2026-08-15.
- Known untested areas: `baselineMood` forwarding to `registry.register()` in production (Phase 5 loader scope, not this session's); the Chord Writer IDE panel itself (sub-step 7's polish, ownership undetermined).

---

**Progressive update**: Session completed 2026-08-15
