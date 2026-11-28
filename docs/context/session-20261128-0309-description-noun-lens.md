# Session Summary: 2026-11-28 - description-noun-lens (started 2026-11-28 03:09 CST)

## Goals
- Commit session a1ecea's Phase 4 runtime half of thing-answers-both-numbers, and re-record the examinable-lens pins it moved.
- Build AC-11, the World Index naming in SharpeeIDE and PaneHost. Then run Phase 4's Demonstration and flip the phase.

## Phase Context
- **Plan**: `docs/work/thing-answers-both-numbers/plan-20261124-thing-answers-both-numbers.md`, "a thing answers to both numbers" (ADR-409).
- **Phase executed**: Phase 4, "The runtime reads the forms, and the World Index shows them" (Large).
- **Tool calls used**: 181 for the session, from the state file, against a 350 budget.
- **Phase outcome**: Completed under budget. Phase 4 is DONE, and `advance` made Phase 5 CURRENT (since 2026-11-28). Its Demonstrated line is marked `[reported by session, unverified]`.
- **Out-of-scope changes**: the flip printed these lines.
  - out of scope: packages/branch-tester/tests/examinable-lens-real-path.test.ts
  - out of scope: packages/chord/src/catalog.ts
  - out of scope: packages/devkit/src/commands/lens.test.ts
  - out of scope: packages/devkit/tests/lens-phrase-place.test.ts
  - out of scope: packages/devkit/tests/test-lens.test.ts
  - out of scope: packages/helpers/src/builders/object.ts
  - out of scope: packages/helpers/tests/object-builder-plural.test.ts
  - out of scope: scripts/__tests__/forms-real-path.test.ts
  - out of scope: stories/dungeo/src/version.ts
  - out of scope: tools/ide/SharpeeIDE/Compose/StoryIndex.swift
  - out of scope: tools/ide/SharpeeIDE/Generated/SharpeeProtocol.swift
  - out of scope: tools/ide/web/testing-surface/tests/lens-real-path.test.ts
  - out of scope: tools/repokit/src/commands/protocol-projection.ts
  - out of scope: tools/repokit/src/commands/protocol-spec.ts

## Completed

### Runtime half committed (d4587b940)
- The commit holds a1ecea's 52 files. It went in with the branch-tester and devkit lens pins known red: hook row `Tests failed` "1 failed 43 passed 10 failed 522 passed", 2026-11-28T09:12:27Z.
- Correction to a1ecea's record: `session-20261128-0211-description-noun-lens.md` says the work was "staged by finalize's commit", but that commit never landed. HEAD was `c8faf66d6` when this session started. a1ecea's file was left as written.

### Scullery test set and lens pins (d0d9bb7b6)
- Scullery's test set changed first. OB-56 and OB-58 were rewritten, because `jar`, `crock`, `cheeses` and `whetstones` now resolve through worked-out forms. The whetstone's role was added, along with a 2026-11-28 Language migrations entry. The story is unchanged.
- devkit `lens.test.ts` and `test-lens.test.ts`: orchard's header drops "Number form 6", and scullery's findings go 20 → 16. Hook row `Tests passed` "2 passed 10 passed", 09:17:30Z, after the 09:17:23Z edits.
- `tools/ide/web/testing-surface/tests/lens-real-path.test.ts`: 20 → 16. It is the same census-predicted move. Hook row `Tests passed` "1 passed 1 passed", 09:17:44Z.
- branch-tester `examinable-lens-real-path.test.ts`: orchard's 6, scullery's 4 and the lens fixture's 2 number-form rows were removed, and the forms typed stay 92/42/12. "Tests 532 passed (532)" [reported by session, unverified]: no pass row follows the 09:17:02Z edit.
- devkit `lens-phrase-place.test.ts`: widened to place all 38 orchard findings (David "a"). Hook row `Tests passed` "1 passed 5 passed", 09:19:26Z.
- Issue 839 was closed in the 03:24 write.

### AC-11: naming on the Index tab's Things rows
- `tools/repokit/src/commands/protocol-projection.ts`: `IdeIREntity` gains `aka` and `forms` (`IdeIREntityForms`, `IdeIRAkaForm`), and `protocol-spec.ts` emits them. `./repokit protocol` regenerated `SharpeeIDE/Generated/SharpeeProtocol.swift` and `PaneHost/Generated/SharpeeProtocol.cs`.
- `./repokit protocol --check` was re-run by this write: "generated protocol types match the TypeScript wire contract", exit 0, 2026-11-28T09:56:54Z. That is after the last protocol edits, at 09:30:20Z.
- `SharpeeIDE/Compose/StoryIndex.swift` `namingSummary(of:)` and `PaneHost/Shell/StoryIndex.cs` `NamingSummary` share one wording, for example "thing · aka crocks · also answers to jar (worked out), crock (worked out)" and "thing · also answers to mice (written)". Each reads the IR and works nothing out.
- New real-path tests: `SharpeeIDETests/IndexNamingRealPathTests.swift` and `PaneHost.Tests/IndexNamingRealPathTests.cs`. Each has 3 cases and runs a real compose of scullery and refectory.
- Fixture updates: `"aka":[]` in `ComposeDiagnosticsTests.swift` and `ProtocolTypeTests.cs`, and `aka: [], forms: nil` in `SplitDividerTests.swift` and `StoryIndexTests.swift`.
- The new cases were not shown failing first.

### Phase 4 Demonstration and flip
- `./repokit build dungeo` regenerated `packages/sharpee/docs/genai-api/world-model.md` (the IdentityTrait constructor type) and `stories/dungeo/src/version.ts`.
- Refectory probe: `examine candle`, `examine pricket` and `examine candles` print "Tallow candles, each one pressed onto an iron pricket.", and `examine mice` prints the mouse's description [reported by session, unverified].
- AC-8: chord's `verbLemmas` (`parser.ts:218`, `analyzer.ts:773`, ADR-329, 728db25f2) is an English verb rule that predates the plan. David ruled it out of scope ("a"), and it is filed as #848.

## Key Decisions

### 1. AC-11 lives on the Index tab's Things rows (David "a")
The World tab has no per-thing list, and its `world-index` document carries no aka or forms, so the forms go on the Index tab and nothing in `packages/` changes.

### 2. AC-8 covers ADR-409's number-form rules only (David "a")
Chord's verb-lemma rule is outside AC-8 and is tracked as #848.

### 3. lens-phrase-place widened (David "a")
The orchard case had no number-form rows left, so it now places all 38 orchard findings. The resolved-form fall-through keeps its unit case until Phase 5.

## Next Phase
- **Phase 5**: "The lens names what to write and offers the edit, and the records close". It covers:
  - the Singular/plural lens finding and the `singular-plural` kind id;
  - the card edit (AC-12);
  - ADR-409 set to IMPLEMENTED, with the dated notes on the records it names;
  - the full floor;
  - closing #836 and archiving the plan by hand (#539).
- **Tier**: Medium. The plan gives ~300 tool calls; the state file says 350.
- **Entry state**: Phase 4 is DONE, but David's go for Phase 5 is not recorded yet. Ask for it before starting.

## Open Items

### Short Term
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle). Phase 5 closes it.
- 849: scullery test set's 2026-11-24 migration entry cites ADR-409.

### Long Term
- 842: lang-en-us: pluralize turns every final f into ves (staff → stafves, roof → rooves), and singularize mirrors it.
- 848: chord: verbLemmas is an English verb-inflection rule in chord source.
- 539: plan-archive.sh hardcodes plan.md, but this repo names plans plan-YYYYMMDD-{name}.md.

## Files Modified

**Committed in d4587b940 / d0d9bb7b6**: a1ecea's runtime half (52 files), `test-stories/scullery/scullery.test-set.md`, the four lens test files above, and the plan.

**AC-11, the protocol** (4 files):
- `tools/repokit/src/commands/protocol-projection.ts` and `protocol-spec.ts`: add `aka` and `forms` to `IdeIREntity`.
- `tools/ide/SharpeeIDE/Generated/SharpeeProtocol.swift` and `tools/ide/PaneHost/Generated/SharpeeProtocol.cs`: regenerated.

**AC-11, the heads** (2 files):
- `tools/ide/SharpeeIDE/Compose/StoryIndex.swift` and `tools/ide/PaneHost/Shell/StoryIndex.cs`: the naming summary.

**AC-11, the tests** (6 files):
- `tools/ide/SharpeeIDETests/IndexNamingRealPathTests.swift` and `tools/ide/PaneHost.Tests/IndexNamingRealPathTests.cs`: new.
- `ComposeDiagnosticsTests.swift`, `SplitDividerTests.swift`, `StoryIndexTests.swift` and `ProtocolTypeTests.cs`: fixture updates.

**Generated / records** (3 files):
- `packages/sharpee/docs/genai-api/world-model.md` and `stories/dungeo/src/version.ts`: regenerated by the build.
- The plan: AC-11 progress, the Demonstration run and the Demonstrated line.

## Notes

**Session duration**: ~50 minutes (03:09 to 03:57 CST).

**Approach**: commit the inherited runtime half, re-record only the census-predicted pins, take David's rulings on the placement and scope questions, then build AC-11 through the generated protocol so both heads read the same IR fields.

- `namingSummary` / `NamingSummary` are pure functions, so no mutation-verification was due. The other changes since d4587b940 are tests, fixtures and generated files.
- An Integration Reality Statement was produced for AC-11:
  - Owned: the devkit compose CLI, chord and the generated protocol.
  - Real path: the two IndexNamingRealPathTests and `protocol --check`.
- The hook logged the PaneHost runs as "Tests ran (status unverified)", at 09:33:33Z and 09:34:00Z. The SharpeeIDE scheme run, the Dungeo chain, the unit transcripts and turbo have no event-log row.

---

## Session Metadata

- **Session**: 1facc0
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: d4587b940, d0d9bb7b6. This write is staged by the next commit (rule 18), and its hash is in `git log -- docs/context/session-20261128-0309-description-noun-lens.md`.

## Dependency/Prerequisite Check

- **Prerequisites met**:
  - a1ecea's runtime half was present in the tree.
  - The three PaneHost capability env vars were available.
  - `./repokit build dungeo` produced the bundle.
- **Prerequisites discovered**: Phase 5 needs David's go. Without the three env vars, PaneHost's 8 capability tests fail by design.

## Architectural Decisions

- ADR-409 D7.3 (AC-11): the forms reach both heads through the generated protocol (`./repokit protocol`). The wire types are shared by generation, and neither head works anything out.
- ADR-395 D4 applied: scullery's test set changed before its pins.
- ADR-329's `verbLemmas` is left in place. It is out of AC-8 and tracked as #848.

## Mutation Audit

- Files with state-changing logic modified: none since d4587b940. The naming summary is pure, and the protocol fields are type declarations.
- Tests verify actual state mutations: N/A.

## Test Coverage Delta

- Tests added: 6 (3 in `IndexNamingRealPathTests.swift`, 3 in `IndexNamingRealPathTests.cs`).
- After: SharpeeIDE scheme "Executed 640 tests, with 0 failures"; PaneHost.Tests "Passed: 173, Total: 173" with the env vars set; repokit "Tests 143 passed | 1 skipped (144)" with a clean typecheck. All three are [reported by session, unverified]: the repokit hook row ("14 passed 143 passed", 09:26:21Z) predates the 09:30 protocol edits.
- Floor: Dungeo chain "949 passed"; units at `--seed 42` "1715 passed, 10 failed, 10 expected failures, 2 skipped, 2 transcript error(s)", the baseline's failures and seed refusals; turbo test:ci "Tasks: 73 successful, 73 total". All [reported by session, unverified].
- Known untested areas: the 6 new IDE cases were never shown failing first.

---

**Progressive update**: checkpoint 2026-11-28 03:11 — first write: recap and audit, commit of a1ecea's Phase 4 runtime half requested, and a1ecea's "staged by finalize's commit" claim corrected.
**Progressive update**: checkpoint 2026-11-28 03:24 — d4587b940 recorded; scullery test set rewritten; lens pins re-recorded (David "a" on phrase-place); turbo 73/73 reported; 839 closed.
**Progressive update**: checkpoint 2026-11-28 03:57 — moved to full form: AC-11 built in both heads; Phase 4 demonstrated, flipped DONE and its line marked; Phase 5 CURRENT; #848 recorded and #849 filed; protocol --check re-run.
