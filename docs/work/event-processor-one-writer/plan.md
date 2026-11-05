# Session Plan: Event-processor one writer — delete the dead handlers, drop the second `isOpen` writer, eaten items leave the world, narrow the barrel

**Created**: 2026-11-04
**Plan Status**: ACTIVE
**Authorization**: David's direction this session on all four parts. The eaten-item rule is a NEW RULING, verbatim, 2026-11-04: "yes, eaten items should disappear". This is a `packages/` plan: it is discuss-first authorization for the plan only. Nothing proceeds to implementation without David's go on each phase, and the deletion phase (Phase 2) is HELD for his confirmation of the exact list.
**Overall scope**: `packages/event-processor` stops registering standard handlers nothing emits for, `OpenableBehavior` becomes the only writer of `isOpen`, a fully eaten item leaves the world through a behavior-owned removal, and the event-processor barrel exports only what has consumers.
**Bounded contexts touched**: event-processor (handlers, barrel); stdlib actions (opening, closing, eating, and drinking if David extends the ruling); world-model (`EdibleBehavior`); Dungeo story text (cakes). Not DDD-framed: the work is single-writer cleanup plus one behavior ruling.
**Key domain language**: one writer; behavior owns the mutation, action coordinates; `EdibleBehavior`; `removeEntity` (the ADR-213 seam); the pushed precedent (`pushed-one-writer.test.ts`).
**Out of scope (David, unless he says otherwise)**: making PULL a switchable lever (`handlePulled` sketched it; `pulling.ts:162` never did it, and it dies with the handlers); renaming or pruning the `IFEvents` table in if-domain (unused entries are REPORTED in Phase 1, not planned for removal). Versions do not move. No backward compatibility.

## References consulted
- `docs/work/archive/bootstrap-story-seam/plan.md` — the model: baseline phase, gate protocol, HELD deletion phase, one commit per phase; its `run-gates.sh` and `compare-gates.sh` are copied here with paths swapped.
- `docs/work/refactoring-survey/assessment-20261102-remaining-packages.md:97-103` — claims 60 of 70 event-processor exports have no external consumer; Phase 4 re-measures rather than trusting it.
- `docs/work/book/api-audit/findings/event-processor.md` — names `EffectProcessor`, `registerStandardHandlers`, `EventEmitCallback` as should-be-internal, duplicate `WorldChange` re-exports, a likely stale `EventHandler` export. Re-measure.
- `docs/architecture/adrs/adr-178-story-runtime-baseline.md` — the umbrella `@sharpee/sharpee` re-exports `EffectProcessor` from event-processor (`packages/sharpee/src/runtime-surface.ts:126-128`); narrowing the barrel must keep that import resolving or amend the baseline deliberately, not by accident.
- `docs/architecture/adrs/adr-213-removed-from-play-signal.md` — `world.removeEntity` runs pre-removal observers; story-loader's `removal-observer.ts` enqueues an authored `disappeared` phrase when the removal is witnessed. An eaten item that authors `disappeared` will now speak. Phase 1 censuses it.
- `docs/architecture/adrs/adr-086-event-handler-unification.md`, `adr-075-event-handler-consolidation.md` — the handler wiring the engine keeps (`game-engine.ts:456-469` wires `world.registerEventHandler` handlers; only `registerStandardHandlers` goes).
- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` — `CakeTrait` registers an eating interceptor; Phase 5 must not reorder interceptor hooks relative to the removal.
- `docs/core-concepts/README.md` "Behaviors vs Actions" — behaviors own mutations, actions coordinate; the removal is placed accordingly (Phase 5).
- `/Users/david/repos/sharpee/CLAUDE.md` — platform changes discussed first; never delete without confirmation; never auto-retry builds/tests; Dungeo is a regression floor only up to its own requirements (a line the ruling moves is re-recorded after census review; a move that looks like a defect, or any move on an untouched input, stops for a ruling).
- `packages/event-processor/tests/unit/pushed-one-writer.test.ts` and the header of `packages/event-processor/src/handlers/device/index.ts` — the precedent for Phase 2's test shape.
- `docs/context/project-profile.md`, `.devarch/descriptor.json` — stack; `documentationStandard: always` means headers on every touched file (logic first, References block after).
- Product ADRs not consulted (no Scope intersection): none consulted by Scope; no product ADR names `packages/event-processor`, `packages/stdlib/src/actions`, `packages/world-model/src/traits/edible`, or `stories/dungeo`.

## Facts established before planning (each phase re-verifies the ones it relies on)
- `IFEvents` values are bare strings (`packages/if-domain/src/events.ts:8-137`); standard actions emit `if.event.*` literals. `EventProcessor` dispatches on exact `event.type` (`packages/event-processor/src/processor.ts:249`); its constructor calls `registerStandardHandlers(world)` (`processor.ts:58`). A built-dist probe listed 41 registered keys; a string-literal search found an emitter for only two (bare `opened` at `packages/stdlib/src/actions/standard/opening/opening.ts:227`, bare `closed` at `closing/closing.ts:192`). A literal search misses a dynamically built type, so Phase 1 re-verifies by observing the event types actually dispatched across the gates.
- Handler files, 1,060 lines in 9 files under `packages/event-processor/src/handlers/`, all `world: any`.
- The two live second writers are `handleOpened` / `handleClosed` (`packages/event-processor/src/handlers/state-change.ts:14-44`), writing `isOpen` after `OpenableBehavior.open/close` already did.
- Eating never removes the entity: `eating.execute` calls `EdibleBehavior.consume` (decrements `servings`, discards the returned events including `item_destroyed` with `remainsType`). The dead `handleItemDestroyed` (`complex-manipulation.ts:70-80`) was the intended event-driven removal and never ran. `EdibleBehavior.consume` has two callers: eating (`eating.ts:174`) and drinking (`drinking.ts:305`).
- Dungeo's cakes are in `stories/dungeo/src/regions/well-room.ts` (`servings: 1`), reacting through `CakeTrait` interceptors in `stories/dungeo/src/handlers/cake-handler.ts` (which read the entity passed to the interceptor, not the world). Transcripts `cake-mechanics`, `eat-cake-quick`, `cake-red-pool-dissolve`, `cake-orange-explosion` and the walkthrough `wt-10-tea-room` eat cakes.

## Gate protocol (every phase)
- `docs/work/event-processor-one-writer/run-gates.sh <dir>` and `compare-gates.sh <baseline> <dir>` (new; copied from the archived bootstrap-story-seam pair, paths swapped). They cover the Dungeo chain, the Dungeo unit transcripts (per transcript, excluding exactly the three GH #646 clock-seeded transcripts `brick-explosion`, `wave-rainbow`, `royal-puzzle-basic`), the three trees, and every package suite including `event-processor`, `stdlib`, `world-model`, `engine`, `story-loader`. The umbrella `@sharpee/sharpee` defines no test script, so it has no suite gate. Three `typecheck-tests-*` legs capture `typecheck:tests` for the packages whose tests this plan edits: `event-processor`, `stdlib`, `world-model`.
- Prerequisite: `./repokit build dungeo` first; `./sharpee` reads `dist/`, so tsf-build any touched package before the tree gates.
- Every exit state also requires: workspace root `npx tsc --noEmit` clean, and each `typecheck-tests-*` leg IDENTICAL to its baseline capture. Open issue #401 reports test-file type errors across the repo, so these legs are held to the capture, not to zero; a phase adds no new test-file type error.
- The build rewrites `stories/dungeo/src/version.ts` (stamp) and regenerates `packages/sharpee/docs/genai-api/` when a package's declarations change. Both are committed with the phase that produced them and are named in that phase's Files.
- Phases 0-4 compare byte-for-byte to baseline: this work changes no rendered text there. From Phase 5 the Dungeo moves the ruling is expected to make (and only those) are listed in that phase's census; everything else stays identical.
- Any mismatch: STOP and report. No fix-and-rebuild, no retry. No `2>&1` with pnpm. No shell expansion in any command; absolute paths.

## Questions for David (carried by the phases that need them)
- **Q1 (Phase 1, blocks Phase 6)**: does "eaten items should disappear" extend to drunk items? Phase 1 traces the drinking path first; the vessel must survive in any case. Posed, not assumed. For David's weighing: ADR-090's fixed-semantics verb table lists EAT/DRINK as one standard mutation, "Consume item" (`adr-090-entity-centric-action-dispatch.md:850`).
- **Q2 (Phase 1, blocks Phase 5)**: what happens to `EdibleTrait.remainsType` (`edibleTrait.ts:23,67,84`; carried today only in the discarded `item_destroyed` event)? Candidates the phase lays out with evidence, for David to choose: leave the field inert and documented; create a leftover entity of that type at the item's last location; or remove the field. Not decided by the plan.

## Phases

### Phase 0: Baseline capture
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — the net every later phase compares against.
- **Entry state**: `main` at `f450479d9` or later; no build running.
- **Deliverable**: Copy `docs/work/archive/bootstrap-story-seam/run-gates.sh` and `docs/work/archive/bootstrap-story-seam/compare-gates.sh` to `docs/work/event-processor-one-writer/` swapping the path in the usage comments; replace the bootstrap-only `typecheck-tests-bootstrap` leg with three legs, `typecheck-tests-event-processor`, `typecheck-tests-stdlib`, `typecheck-tests-world-model`, each running that package's `typecheck:tests` (all three define it). Run `./repokit build dungeo`, then run-gates.sh into `docs/work/event-processor-one-writer/baseline/` (new). Self-compare. Record in this plan a table of gate, result, exit, and `git rev-parse HEAD`.
- **Files**: `docs/work/event-processor-one-writer/run-gates.sh` (new), `docs/work/event-processor-one-writer/compare-gates.sh` (new), `docs/work/event-processor-one-writer/baseline/` (new), `docs/work/event-processor-one-writer/plan.md`, `stories/dungeo/src/version.ts` (build stamp)
- **Exit state**: Baseline table recorded in this plan; capture on disk. A baseline command failing outright (not a known failure) means STOP and report. Known failures (Dungeo unit transcripts, secret-letter tree) are compared to this capture, never to a remembered number.
- **Demonstration**: bash docs/work/event-processor-one-writer/compare-gates.sh on the baseline directory against itself prints IDENTICAL for every gate.
- **Demonstrated**: 2026-11-04, session 7a2cde — `bash docs/work/event-processor-one-writer/compare-gates.sh docs/work/event-processor-one-writer/baseline docs/work/event-processor-one-writer/baseline` printed IDENTICAL for all 29 gates, exit 0; root `npx tsc --noEmit` exit 0, no output. [reported by session, unverified: no hook-logged row was checked for either]
- **Outcome** (2026-11-04, session 7a2cde, `git rev-parse HEAD` = `f450479d969ed03d18a401d6cf6e21a0487e9206`; `./repokit build dungeo` exit 0, its only tracked change the stamp in `stories/dungeo/src/version.ts`; `bash docs/work/event-processor-one-writer/run-gates.sh docs/work/event-processor-one-writer/baseline`, capture committed as `baseline/`). The scripts are the archived bootstrap-story-seam pair with paths swapped and the `typecheck-tests-bootstrap` leg replaced by three legs (event-processor, stdlib, world-model); the umbrella package defines no test script and has no suite gate. Cross-check against the previous plan's last capture (`compare-gates.sh docs/work/archive/bootstrap-story-seam/phase-3 docs/work/event-processor-one-writer/baseline`): every shared gate IDENTICAL; dungeo-unit totals read 1720 passed, 13 failed there and 1713 passed, 20 failed here, and the per-transcript compare with the three GH #646 transcripts excluded is IDENTICAL, so the swing sits inside that clock-seeded trio. Known failures are the Dungeo unit transcripts, the secret-letter tree, and the stdlib and world-model test-file typechecks (open issue #401); every later phase compares to these captures, never to the numbers:

  | gate | result | exit |
  |---|---|---|
  | dungeo-chain | 952 passed, all tests passed | 0 |
  | dungeo-unit | 1713 passed, 20 failed, 10 expected failures, 2 skipped (known; #646 trio clock-seeded) | 1 |
  | tree-secret-letter | 1458 cards passing, 2639 assertions passing, 11 cards failing, 13 assertions failing (known) | 1 |
  | tree-fernhill | 86 cards passing, 107 assertions passing | 0 |
  | tree-ides-of-march | 39 cards passing, 51 assertions passing; rooms 5 of 5 | 0 |
  | suite-core | 13 files, 153 passed | 0 |
  | suite-engine | 99 files, 884 passed, 7 skipped | 0 |
  | suite-stdlib | 150 files, 1905 passed | 0 |
  | suite-world-model | 105 files, 1689 passed | 0 |
  | suite-story-loader | 193 files, 1543 passed, 1 skipped | 0 |
  | suite-chord | 111 files, 1779 passed | 0 |
  | suite-character | 54 files, 641 passed | 0 |
  | suite-parser-en-us | 50 files, 553 passed | 0 |
  | suite-lang-en-us | 34 files, 484 passed | 0 |
  | suite-transcript-tester | 28 files, 371 passed | 0 |
  | suite-devkit | 30 files passed, 1 skipped; 204 passed, 1 skipped | 0 |
  | suite-branch-tester | 28 files, 378 passed; plus 1 file, 5 passed | 0 |
  | suite-event-processor | 7 files, 28 passed | 0 |
  | suite-channel-service | 9 files, 121 passed | 0 |
  | suite-if-domain | 7 files, 110 passed | 0 |
  | suite-media | 3 files, 50 passed | 0 |
  | suite-helpers | 5 files, 17 passed | 0 |
  | suite-queries | 2 files, 102 passed | 0 |
  | suite-plugins | 2 files, 17 passed | 0 |
  | suite-bootstrap | 6 files, 57 passed | 0 |
  | suite-world-index | 19 files, 237 passed, 1 skipped | 0 |
  | typecheck-tests-event-processor | clean, no output | 0 |
  | typecheck-tests-stdlib | 866 `error TS` lines (known, #401) | 2 |
  | typecheck-tests-world-model | 215 `error TS` lines (known, #401) | 2 |
- **Status**: DONE

### Phase 1: Census and trace (read-only; posts the deletion list and two questions)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: event-processor handlers; the `EdibleBehavior` consumers; the turn-stream readers of bare `opened` / `closed`.
- **Entry state**: Phase 0 done. No source edits in this phase; any temporary instrument is reverted and `git status` shows no source change.
- **Deliverable**: Written into this plan's Phase 1 Outcome, each as a command and its result:
  1. **Dynamic dispatch census.** Observe the event types `EventProcessor` dispatches to a registered standard handler across the chain, the Dungeo unit transcripts, the trees, and the package suites (a throwaway log at the dispatch site `processor.ts:249`, reverted afterward, or an equivalent harness). Reconcile with the 41 registered keys and with the literal search. Any handler that fires beyond `opened` / `closed` moves into the live list and Phase 2 stops to ask.
  2. **Bare `opened` / `closed` readers.** Whether anything but the two handlers reads those types in the turn stream: prose pipeline and channel-service, branch-tester claims (`packages/branch-tester/src/claims/claim-vocabulary.ts`, `derived-runner.ts`), story-loader event rules and `evaluator.ts`, transcript `[EVENT:]` assertions, the IDE (Swift and C# sources, the generated protocol), `packages/stdlib` golden tests asserting event counts. Initial literal searches found none; this step confirms with the dynamic census and an event-count check on opening/closing.
  3. **The exact deletion list** for Phase 2: files (the nine under `packages/event-processor/src/handlers/` and any test fixtures left unused), symbols (`registerStandardHandlers`, every `handle*` and `register*Handlers`), the `packages/event-processor/src/processor.ts:58` call, the handlers re-export in `packages/event-processor/src/index.ts`, and the tests that change (`tests/unit/processor.test.ts:49-50`, `packages/event-processor/tests/unit/pushed-one-writer.test.ts` which imports `registerStandardHandlers`, and any of `adr-296-d4-partition`, `entity-handlers`, `handler-double-dispatch`, `handler-failure`, `processor-reactions` that name a standard handler; `tests/fixtures/*` referencing `IFEvents`).
  4. **Unused `IFEvents` entries** (report only; no removal planned).
  5. **Drinking trace (Q1).** `drinking.ts:289-308`: what a vessel with an `EdibleTrait` versus a vessel with only a `ContainerTrait` does; what survives. Which stories (Dungeo, thealderman, hunger-demo, family-zoo-tutorial, any Chord tree) drink, so the cost of extending the ruling is known. Post the finding and ask Q1.
  6. **`remainsType` evidence (Q2).** Every reader and writer of the field across packages, stories, the Chord catalog, and the IDE; ask Q2.
  7. **Eating-path trace for Phase 5.** Order of `validate / execute / report` and of the `CakeTrait` interceptor hooks (`preValidate`, `postExecute`, `postReport`) around `eating.execute`; every place the report phase or the turn renderer looks an item up by id in the world after `execute` (a removed entity must not break text rendering of "You eat the ration."); `hunger` (`packages/extensions/hunger/src/hunger.ts:31-53`) reads only the event payload; what `removeEntity` does to the player's inventory view and the `disappeared` observer (ADR-213) for an item that authors the channel.
- **Files**: `docs/work/event-processor-one-writer/plan.md`
- **Exit state**: Items 1-7 recorded. Q1 and Q2 posed to David. Phase 2's list posted. Nothing edited outside this plan.
- **Demonstration**: `git status --short` lists no path under `packages/` or `stories/`; the Outcome carries the dispatch census output and the deletion list.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 2: The standard handlers are deleted; `OpenableBehavior` is the one writer of `isOpen` (HELD)
- **Tier**: Medium
- **Budget**: ~200 tool calls
- **Domain focus**: event-processor handlers; one writer of `isOpen`.
- **Entry state**: Phase 1 done. **HELD**: this phase re-greps and posts the exact file and symbol list from Phase 1 and STOPS for David's confirmation before any file is deleted.
- **Deliverable**: Test first, per rule 12 (Behavior Statement: DOES leave `isOpen` as `OpenableBehavior` and any reaction left it; REJECTS WHEN n/a, nothing registered): a new `packages/event-processor/tests/unit/opened-closed-one-writer.test.ts`, in the shape of `packages/event-processor/tests/unit/pushed-one-writer.test.ts`, asserting on the openable's `isOpen` after (a) an opening whose if.event.opened reaction closes the box and (b) a closing whose if.event.closed reaction re-opens it, each fed the events in the order the action's report emits them (`packages/stdlib/src/actions/standard/opening/opening.ts` lines 216 and 227: primary then bare; `packages/stdlib/src/actions/standard/closing/closing.ts` line 192: bare then primary). Case (a) must be run RED against current `main` (it fails: the bare handler overwrites the reaction's close) before the deletion, and the red result is recorded — an instrument shown to fail on the defect it detects. Case (b) is GREEN on current `main` (probe 2026-11-04: closing emits the bare event first, so the reaction already wins) and is a regression pin, not a red instrument; the Outcome records it as such. After David confirms the list: delete `packages/event-processor/src/handlers/` (nine files), remove the `registerStandardHandlers(world)` call at `packages/event-processor/src/processor.ts:58` and the handlers export in `packages/event-processor/src/index.ts`, update `processor.test.ts:49-50` to assert the processor registers no standard handlers (its `registeredHandlers` stays empty), rewrite `packages/event-processor/tests/unit/pushed-one-writer.test.ts` without the `registerStandardHandlers` import (keeping its assertion), and fix fixtures. Bring the two descriptions of the package into line with the code: `packages/event-processor/README.md` lines 17-18 (which names `registerStandardHandlers` as an export) and the event-processor entry in `docs/core-concepts/README.md` (which says the package applies events to the world model through registered handlers). Headers on every touched file. No `any` or `unknown` in touched code.
- **Files**: `packages/event-processor/src/handlers/` (deleted), `packages/event-processor/src/processor.ts`, `packages/event-processor/src/index.ts`, `packages/event-processor/tests/unit/opened-closed-one-writer.test.ts` (new), `packages/event-processor/tests/unit/processor.test.ts`, `packages/event-processor/tests/unit/pushed-one-writer.test.ts`, `packages/event-processor/tests/fixtures/`, `packages/event-processor/README.md`, `docs/core-concepts/README.md`, `packages/sharpee/docs/genai-api/` (regenerated by the build), `stories/dungeo/src/version.ts` (build stamp)
- **Exit state**: `grep -rn "registerStandardHandlers\|handleOpened\|handleClosed" packages stories tools` finds nothing outside archived docs; the new test is GREEN and was RED before; event-processor suite passes at its new count; root `npx tsc --noEmit` clean; `./repokit build dungeo` exit 0; gates byte-identical to baseline (chain, three trees, all other suites), `suite-event-processor` count may change only by the tests this phase adds or rewrites, each named in the Outcome.
- **Demonstration**: compare-gates.sh of the baseline directory against the phase-2 capture reports every gate IDENTICAL (event-processor suite excepted, with its named delta), and the event-processor test opened-closed-one-writer is green under the package's test:ci script (pnpm filter on the event-processor package; the bare test script is watch-mode vitest, open issue #403, and is not used).
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: The bare `opened` / `closed` backward-compatibility emissions go
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: stdlib opening and closing actions' event streams.
- **Entry state**: Phase 2 done AND Phase 1 item 2 found no reader of bare `opened` / `closed`. If a reader exists, STOP and ask David: the emission stays until that reader is migrated.
- **Deliverable**: Remove the `context.event('opened', ...)` push at `packages/stdlib/src/actions/standard/opening/opening.ts:227` and the closed push at `packages/stdlib/src/actions/standard/closing/closing.ts:192` with their backward-compatibility comments; update the event-count assertions in `packages/stdlib/tests/unit/actions/opening-golden.test.ts` and `packages/stdlib/tests/unit/actions/closing-golden.test.ts` and any opening-events and closing-events typings that list the bare types. Assertions on the primary if.event.opened and if.event.closed events and on `isOpen` stay.
- **Files**: `packages/stdlib/src/actions/standard/opening/opening.ts`, `packages/stdlib/src/actions/standard/closing/closing.ts`, `packages/stdlib/tests/unit/actions/opening-golden.test.ts`, `packages/stdlib/tests/unit/actions/closing-golden.test.ts`, `packages/sharpee/docs/genai-api/` (regenerated by the build, if the event typings change), `stories/dungeo/src/version.ts` (build stamp)
- **Exit state**: no emitter of a bare `opened` or `closed` event type remains; stdlib suite passes with only the named count changes; tsc clean; gates byte-identical to baseline (opening and closing text renders from the primary events' messageId, which is untouched).
- **Demonstration**: compare-gates.sh of the baseline directory against the phase-3 capture reports every gate IDENTICAL (stdlib count delta named), and a grep of packages/stdlib/src for the two bare context.event calls prints nothing.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: The event-processor barrel exports what has consumers
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `packages/event-processor/src/index.ts` public surface. Independent of Phases 5-6; depends only on Phase 2 (the handler exports are already gone).
- **Entry state**: Phase 2 done (Phase 3 not required).
- **Deliverable**: Re-measure every exported symbol's external consumers (packages, stories, tools, the umbrella `packages/sharpee/src/runtime-surface.ts`, the IDE and book docs) and record the table, not the survey's count. Narrow `packages/event-processor/src/index.ts` to the measured set. Expected: `EventProcessor`, `Effect`, `WorldQuery`, `StoryEventHandler`, `IGameEvent`, and `EffectProcessor` if the umbrella still re-exports it (ADR-178's baseline is the contract: keep it, or move the umbrella's import to a deep path only with David's say). Remove the duplicate `WorldChange` re-exports and the stale `EventHandler` re-export if the measurement confirms them. Header with the narrowed public-interface line.
- **Files**: `packages/event-processor/src/index.ts`, `packages/event-processor/src/types.ts`, `packages/event-processor/src/handler-types.ts`, `packages/sharpee/src/runtime-surface.ts` (only if the measurement forces it), `packages/sharpee/docs/genai-api/` (regenerated by the build, committed with the phase), `stories/dungeo/src/version.ts` (build stamp)
- **Exit state**: every importer of the event-processor package still compiles (root tsc, `./repokit build dungeo`, devkit and branch-tester suites); the umbrella API-surface baseline test, if one exists, passes unchanged; gates byte-identical to baseline.
- **Demonstration**: the consumer table in the Outcome with a result for each export; compare-gates.sh of the baseline directory against the phase-4 capture reports every gate IDENTICAL.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: A fully eaten item leaves the world; Dungeo's moved lines are re-recorded after census review (HELD mid-phase)
- **Tier**: Medium
- **Budget**: ~300 tool calls
- **Domain focus**: `EdibleBehavior`, the eating action, and the first real-path test of the ruling. Independent of Phases 2-4 (depends on Phase 0 and Phase 1's answers to Q2 and the item 7 trace).
- **Entry state**: Phase 1 done with David's answer to Q2 recorded. David's go.
- **Deliverable**: Behavior Statement first (rule 12). Placement per "behaviors own mutations, actions coordinate": the removal is a `world-model` `EdibleBehavior` method that decides and performs it (for example an `EdibleBehavior` operation that takes the world and the item and calls `removeEntity` only when `isEmpty(item)`), and the eating action's execute calls it right after the consume call. The action does not call `removeEntity` itself. Exact signature and the position relative to the `CakeTrait` interceptor hooks and the report phase come from Phase 1 item 7. What `remainsType` does is exactly David's Q2 answer. Tests derived from the Behavior Statement, each asserting on world state: (a) a one-serving item is gone from the world and from the actor's inventory after `eat` (`world.hasEntity(id)` false, `getContents(actor)` without it); (b) a multi-serving item stays, one serving lower, and leaves only when the last serving is eaten; (c) a refusal path (not edible, `servings` already 0) removes nothing; (d) the eaten event payload the hunger extension reads is unchanged and the hunger meter still recovers; (e) the report text is unchanged ("You eat the ration."). Update the golden test at `packages/stdlib/tests/unit/actions/eating-golden.test.ts:475`, which pins `servings` reaching 0 and asserts nothing about location, to assert the removal. Real-path test: a NEW dedicated test story (never `hunger-demo` or any real story; modelled on the Chord test stories such as `stories/presence-test/`, no ADR references in it) with a transcript run through the built bundle: `node dist/cli/sharpee.js --test` on its transcript, asserting that after `eat ration`, `inventory` and `look` no longer list the item and `eat ration` again is refused as an unknown object. The probe that prompted the ruling (`--exec "take ration/eat ration/inventory"` on `stories/hunger-demo/hunger-demo.story`) is recorded before and after as the evidence. Headers on touched files; no `any` or `unknown`. **The `disappeared` channel (ADR-213 §2-§3)**: the removal goes through `removeEntity`, so ADR-213 applies unchanged: an eaten item that authors a `disappeared` phrase speaks it when the removal is witnessed, after the eat message. The plan adds no guard and no suppression (ADR-213 §3 documents double narration as author-visible, not guarded). The dedicated story carries one edible that authors `disappeared`, and its transcript pins both lines and their order; Phase 1 item 7 lists any shipped edible that authors the channel. **Step 2, HELD (Dungeo)**: once the tests above are green, capture the gates and write the census of every moved Dungeo line (file, line, before, after, one-line cause), then STOP for David's review. Per "Dungeo is a regression floor only up to its own requirements", the lines the ruling moves are re-recorded after that review, not taken one at a time; any move whose cause is not "the eaten cake left the world", or that touches an input the ruling does not, stops for a ruling. After review: re-record the moved lines in the four cake transcripts under `stories/dungeo/tests/transcripts/` (cake-mechanics, eat-cake-quick, cake-red-pool-dissolve, cake-orange-explosion) and in the wt-10-tea-room walkthrough and its golden (`inventory` at transcript lines 146 and 209 follows the eaten cakes), plus any later walkthrough the census shows, without changing any command (no control-flow directives, no surplus commands) and keeping combat counts exact. The pinned-seed chain is run once with `--chain`. The phase is not complete, and is not committed, while any suite is red: the re-record is part of this phase so that its one commit is green.
- **Files**: `packages/world-model/src/traits/edible/edibleBehavior.ts`, `packages/world-model/tests/unit/traits/edible.test.ts`, `packages/stdlib/src/actions/standard/eating/eating.ts`, `packages/stdlib/tests/unit/actions/eating-golden.test.ts`, `packages/world-model/src/traits/edible/edibleTrait.ts` (only if Q2 says so), `stories/eating-removal-test/` (new), `stories/dungeo/tests/transcripts/cake-mechanics.transcript`, `stories/dungeo/tests/transcripts/eat-cake-quick.transcript`, `stories/dungeo/tests/transcripts/cake-red-pool-dissolve.transcript`, `stories/dungeo/tests/transcripts/cake-orange-explosion.transcript`, `stories/dungeo/walkthroughs/wt-10-tea-room.transcript`, `stories/dungeo/walkthroughs/wt-10-tea-room.golden`, `packages/sharpee/docs/genai-api/` (regenerated by the build), `stories/dungeo/src/version.ts` (build stamp)
- **Exit state**: tests above green and each asserts on world state; `./repokit build dungeo` exit 0; root tsc clean; the census table is in the Outcome and David has reviewed it; the chain and the Dungeo unit transcripts are green at the pinned seed with only the reviewed moves re-recorded; a fresh capture after the re-record compares IDENTICAL to the pre-re-record capture on every gate the re-record did not touch, and differs from baseline only in the census lines. The extension suites (`hunger`) and the three trees stay identical to baseline.
- **Demonstration**: the dedicated story's transcripts pass under node dist/cli/sharpee.js --test, including the disappeared-phrase case; the pre/post --exec probe on the hunger-demo story shows the ration absent from the inventory output after the fix; the Dungeo chain run once with --chain is green after the re-record; compare-gates.sh against baseline lists differences only in the reviewed census.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 6: Drunk items (CONDITIONAL on Q1)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `drinking.execute` and the vessel versus contents distinction.
- **Entry state**: David's answer to Q1. If NO: mark this phase ABANDONED with the reason "ruling does not extend to drinking" and write nothing. If YES: David's go and the Phase 1 item 5 trace in hand.
- **Deliverable**: Apply the same `EdibleBehavior` removal to the drinking path for an item whose own `EdibleTrait` hits zero servings, with the vessel (a container with `liquidAmount`) surviving; Behavior Statement and world-state tests as in Phase 5, including a vessel-survives test; extend the dedicated test story with a drinkable; Dungeo census, David's review, and re-record inside this phase per Phase 5's Step 2 rule if any drink line moves, so the phase's one commit is green.
- **Files**: `packages/stdlib/src/actions/standard/drinking/drinking.ts`, `packages/stdlib/tests/unit/actions/drinking-golden.test.ts`, `stories/eating-removal-test/`, `packages/sharpee/docs/genai-api/` (regenerated by the build, if declarations change), `stories/dungeo/src/version.ts` (build stamp)
- **Exit state**: tests green on world state; gates identical to the Phase 5 capture except census lines David has reviewed and this phase re-recorded.
- **Demonstration**: the dedicated story's transcript passes through the bundle including the vessel-survives case; compare-gates.sh against the Phase 5 capture is IDENTICAL or lists only reviewed lines.
- **Demonstrated**: 
- **Status**: PENDING
