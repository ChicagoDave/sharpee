# Session Plan: Make Chord saves robust to story updates between save and restore

**Created**: 2026-10-29
**Plan Status**: ACTIVE
**Overall scope**: Every persisted Chord key is derived from a name or content, not a position, and restore reconciles a save against the current story's identity manifest instead of trusting it. One-shot cutover of the key scheme; no old-save reader, no migration shim (no story has shipped; save-format versioning is dormant, ADR-293 awaits supersession).
**Bounded contexts touched**: Chord compiler (`packages/chord`), story-loader runtime state (`packages/story-loader`), engine save/restore (`packages/engine`), branch-tester assertion core (`packages/branch-tester`). Platform change: discussed and directed by David (his 2026-10-29 assessment); phase 1 records it as an ADR.
**Key domain language**: persisted key, identity manifest, reconciler, occurrence ordinal, landing list, story-version stamp

## References consulted
- `docs/architecture/adrs/adr-289-chord-routing-decided-once.md` - D2: the compiler assigns the stable select id that keys the persisted occurrence counter; the ADR phase 1 amends (id is currently a positional statement path).
- `docs/architecture/adrs/adr-276-chord-source-authoritative-errors.md` - two-layer pattern: compile-time gate plus loader backstop; the manifest check and the restore reconciler follow it.
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` - D5 landings: landing lists copy world ids on first read, so rooms added later are never drawn.
- `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` - D2 occurrence ordinals; two readers compose clause occurrence keys from the prefix themselves and must move in the same phase as any key-scheme change.
- `docs/architecture/adrs/adr-330-chord-chapters.md` - D2 chapters: current chapter persisted as an opener ordinal.
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` - Consequences "Persistence": orders a save-format bump for persisted-key changes; stale since the 2026-09-11 dormant-versioning ruling (plan-review 2026-10-29); ADR-388 amends it by reference.
- Open-issue record (`issues.sh list-open`) - #394 (player identity has two serialized sources of truth) bears on the Phase 5 reconciler.
- `packages/story-loader/src/state-keys.ts` - the key scheme (clause :27-48, timer :148-152, landing :174-178); the file the cutover rewrites.
- Memory constraints: no backward compatibility owed; the Dungeo walkthrough chain and the Chord stories' tree tests are the floor; platform changes need David's discussion (satisfied by his direction; ADR records it).
- Product ADRs not consulted (no Scope intersection): none (docs/architecture/adrs carries no Kind/Scope lines; all read as unclassified where relevant)

## Phases

### Phase 1: ADR-388 - persisted identity for Chord saves (phase 0 of David's numbering)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Persisted key scheme and save/restore contract.
- **Entry state**: main clean; David's recommendations (name-derived keys, identity manifest plus reconciler, storyVersion check) are the input.
- **Deliverable**: `docs/architecture/adrs/adr-388-persisted-identity-for-chord-saves.md` (new). First, an inventory of every persisted key family, one table: clause occurrence, select occurrence, phrase strategy counters, chapter current and fired, timer record, landing list, adjacent record, counters, gone, visited, trait state, with the identity each uses today and the identity it moves to. Verify the select id construction in `packages/chord/src/analyzer.ts:7028` and the phrase-strategy key location in `packages/story-loader/src/runtime/phrases.ts`. Decisions: the name-derived identity per family (clause = owner+head with occurrence index among identical heads; chapter by name; timer position as turn name; select = enclosing clause identity plus sibling index); the manifest content and where the compiler emits it (IR); the story-version stamp (content hash vs declared version); the reconciler rules (add new entities/exits/placements, drop orphaned keys, re-seed landing lists, report unmappable rather than guess); the engine's version check and routing; the ADR-276 compile-gate plus loader-backstop split. Amends ADR-289 D2 and ADR-356 D2 by reference. Supersedes nothing silently. Phase split in Consequences.
- **Files**: `docs/architecture/adrs/adr-388-persisted-identity-for-chord-saves.md` (new), `docs/architecture/adrs/adr-289-chord-routing-decided-once.md`, `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md`, `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` (Consequences "Persistence" bullet amended by reference: timer and landing records re-key with no save-format bump, per the 2026-09-11 dormant-versioning ruling and ADR-289 D2)
- **Exit state**: ADR-388 written with no open questions, or open questions left DRAFT for David's interview; David has read it. No code touched.
- **Demonstration**: `grep -c "^## " docs/architecture/adrs/adr-388-persisted-identity-for-chord-saves.md` shows the four required sections, and the inventory table lists every key family found by `grep -n "_PREFIX" packages/story-loader/src/state-keys.ts`.
- **Demonstrated**: 2026-10-29, session a927f6. `grep -c "^## " docs/architecture/adrs/adr-388-persisted-identity-for-chord-saves.md` → 8 (Date, Parent, Context, Decision, Consequences, Acceptance criteria, Open Questions while they existed, Session). All 13 `CHORD_*` prefixes from `grep -o "CHORD_[A-Z_]*PREFIX\|CHORD_[A-Z_]*KEY" packages/story-loader/src/state-keys.ts` appear in the inventory table (13 of 13 after `chord.trait.` was added). Select id confirmed at `analyzer.ts:7028` (`id: path`, path `${ownerKey}.${clauseKind}-${action}-${clauseIndex}` at `:6202`); phrase-variant counters live in the engine's `textState` capability (`render-context.ts:124`, `english-assembler.ts:598`), not in story-loader. Open questions resolved (Q-1 a, Q-2 a, Q-3 a), adr-review 21/23 with both SMALL items folded, ACCEPTED by David ("yes"). No code touched.
- **Status**: DONE

### Phase 2: Name-derived keys for clauses, selects and phrases
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Occurrence ordinals (ADR-356 D2) and select identity (ADR-289 D2).
- **Entry state**: ADR-388 accepted.
- **Deliverable**: Clause occurrence keys built from owner+head with identical-head occurrence index, replacing the 1-based `onClauses` position in `packages/story-loader/src/state-keys.ts`. Select ids from enclosing clause identity plus sibling index in `packages/chord/src/analyzer.ts` (id assignment at :7028; strategy cases :3204, :4551, :6309). Phrase strategy keys per ADR-388. Every reader that composes the key or carries clause identity moves in the same phase: the assertion core `packages/transcript-tester/src/assertion-core.ts` and its `StoryStateKeys` in `packages/transcript-tester/src/types.ts` (ADR-356 D2, ADR-340 A1), the enumerator `packages/world-index/src/branches.ts` (`collectClauseBranches` carries `ClauseRoot`, `clause`), `packages/story-loader/src/arrange.ts` (derived rule test arrange step), and branch-tester's `claims/claim-predicates.ts`, `derived-runner.ts` and `runner.ts`. Producers under `packages/story-loader/src/runtime/` that use clauseOccurrenceKey (event-clauses, move-clauses, dialogue, dispatch-verbs) updated. One-shot cutover: old scheme deleted, no reader for it. Compile error on an ambiguous identity (ADR-276 gate).
- **Files**: `packages/story-loader/src/state-keys.ts`, `packages/story-loader/src/runtime/`, `packages/story-loader/src/arrange.ts`, `packages/story-loader/src/pin-grammar.ts`, `packages/chord/src/analyzer.ts`, `packages/transcript-tester/src/assertion-core.ts`, `packages/transcript-tester/src/types.ts`, `packages/world-index/src/branches.ts`, `packages/branch-tester/src/claims/claim-predicates.ts`, `packages/branch-tester/src/derived-runner.ts`, `packages/branch-tester/src/runner.ts`
- **Exit state**: No positional clause or select key remains; reordering clauses or inserting one before another no longer shifts another clause's counter. Real-path test (rule 13a): save, edit the story by inserting a clause ahead of a counted one, restore, and the counted clause's occurrence continues.
- **Demonstration**: `./repokit build dungeo` then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure` stays green, the Chord stories' tree tests (fernhill etc.) pass, and the new save-edit-restore test passes.
- **Demonstrated**: 2026-10-29, session a927f6, one run each. `./repokit build dungeo` exit 0; Dungeo chain 952 passing in 17 transcripts; `./sharpee test branch-stories/fernhill/fernhill.story` 86 cards / 107 assertions passing, 9 of 10 claims held, 4 walks (identical to the ca314d baseline); `./sharpee test branch-stories/secret-letter/secret-letter.story` 959 / 1656 exercised, 12 derived failures, 0 `occurrence` SKIPPED (AC-4, identical to the 2026-10-11 baseline), tree 1459 cards passing / 10 failing (content gaps recorded in the port's change document). New tests: `packages/chord/tests/clause-ids.test.ts` 9 passing (AC-3); `packages/story-loader/tests/adr-388-save-edit-restore.test.ts` 2 passing (AC-2 through the real `GameEngine` save and load). Suites after the mutation-verification pass closed four test gaps: chord 1729, story-loader 1499 (+1 skipped), world-index 237 (+1 skipped), transcript-tester 371, branch-tester 382, all passing; root `npx tsc --noEmit` clean. Amendment notes written beside ADR-289 D2 and ADR-356 D2 (D9). Residue recorded in ADR-388 D2: selects under non-clause roots keep their path ids.
- **Status**: DONE

### Phase 3: Name-derived keys for chapters, timers and landing lists
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Chapters (ADR-330 D2), timers, landings (ADR-325 D5).
- **Entry state**: Phase 2 committed; key helpers in `state-keys.ts` already name-derived for clauses.
- **Deliverable**: CHAPTER_CURRENT_KEY stores the chapter name, not the opener ordinal, in `packages/story-loader/src/extensions/chapters.ts`. TimerRecord index becomes the named-turn name in `packages/story-loader/src/state-keys.ts` and `packages/story-loader/src/runtime/timers.ts`. `LandingRecord` carries room identities so a later reconciler can re-seed it (re-seed itself is phase 5). Scheduler daemon ids in `packages/story-loader/src/runtime/scheduler-constructs.ts` (`chord.entity-turn.<id>.<index>` and kin) become the clause id — the scheduler plugin persists per-daemon state by that id (Phase 2 finding, ADR-388 D3 as amended 2026-10-29).
- **Files**: `packages/story-loader/src/state-keys.ts`, `packages/story-loader/src/extensions/chapters.ts`, `packages/story-loader/src/runtime/timers.ts`, `packages/story-loader/src/runtime/scheduler-constructs.ts`
- **Exit state**: Inserting a chapter or timer turn before the saved position no longer misdirects a restored save. Real-path test: save mid-chapter and mid-timer, insert a chapter and a named turn earlier, restore, and both resume at the same named position.
- **Demonstration**: the new save-edit-restore tests pass; Dungeo chain and fernhill tree tests still green after `./repokit build`.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: Identity manifest and story-version stamp
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Compiler output contract (ADR-276 compile side).
- **Entry state**: Phases 2 and 3 committed; every persisted key family is name-derived.
- **Deliverable**: The compiler emits, in the IR, an identity manifest enumerating every persistable key the story can write (and the entity, exit and placement identities), plus the story-version stamp per ADR-388; loader exposes it. `packages/engine/src/session/save-restore-service.ts:257` writes the stamp into save metadata. IR format change is a one-shot cutover (regenerated Swift/C# protocol types via `./repokit protocol` if the IR contract changes).
- **Files**: `packages/chord/src/`, `packages/story-loader/src/loader.ts`, `packages/engine/src/session/save-restore-service.ts`
- **Exit state**: Compiling a story twice yields an identical manifest and stamp; editing the story changes the stamp; a save records the stamp.
- **Demonstration**: a unit test compiles two edits of one story and compares manifest and stamp; a save file inspected shows the stamp.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: Restore-time reconciler and version check
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Restore contract (ADR-276 loader backstop).
- **Entry state**: Phase 4 committed; manifest and stamp exist.
- **Deliverable**: Engine compares the save's stamp with the current story's on restore and, when they differ, routes through the reconciler (no reader exists today). The reconciler, called from `onWorldRestored` in `packages/story-loader/src/loader.ts:1291` beside `sweepRetiredSelectKeys` and `resetAfterRestore`, diffs the save against the manifest: adds entities, exits and placements new in the IR, drops orphaned keys, re-seeds landing lists with rooms added since the save, and reports unmappable state to the player or author rather than guessing (ADR-388 places this report in ADR-276 D5's residue by amendment). Entities it adds settle player identity through one source (open issue #394). Matching stamps skip the reconciler.
- **Files**: `packages/story-loader/src/loader.ts`, `packages/story-loader/src/runtime/`, `packages/engine/src/session/save-restore-service.ts`, `packages/story-loader/src/__tests__/` (new)
- **Exit state**: Real-path integration tests (rule 13a, REAL-PATH TEST against the bundle, not a stub): save, edit the story (add a room, add an exit, add an entity, remove a clause, rename a chapter), restore through the production code path, and the game continues with new content present, orphans dropped, and unmappable cases reported.
- **Demonstration**: `./repokit build dungeo`, then the save-edit-restore suite and the Dungeo chain plus Chord tree tests via `node dist/cli/sharpee.js --test` all pass.
- **Demonstrated**: 
- **Status**: PENDING
