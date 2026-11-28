# Session Summary: 2026-11-25 - description-noun-lens

## Status: COMPLETE (unverified)

> Rebuilt 2026-11-28 by session a1ecea. Session 62310c ran out of context after flipping Phase 3 DONE in the plan (01:09) but before its terminal summary write and commit; this file's last write was 01:03. Everything added below is taken from the plan's Phase 3 **Demonstrated** record and the working tree, not from memory of the session.

## Goals
- Execute Phase 3 of thing-answers-both-numbers: the bare-declaration refusal carries a fix, devkit's compose fills it from the story's language, the fix rides the compose payload, and both Chord Writer heads offer the fix and a fix-all (ADR-409 D7.2, AC-10).

## Completed
- Session start: audit relayed, profile fresh (2026-11-24), core concepts read.
- Phase 2's ADR-409 test file re-run against the current tree: `npx vitest run tests/adr-409-singular-plural-forms.test.ts` in `packages/chord` → "Tests 30 passed (30)" (2026-11-25 00:39 CST).

- chord: `Diagnostic.fix?: DiagnosticFix` (`{ label, edits: { span, text, slot? }[] }`), `FIX_FORM_MARKER` `{form}`, `DiagnosticBag.error(..., fix)` asserts the fix invariant. The unsafe-ending and stopword-name refusals attach `<declared> of <name, head word as {form}>` with slot `{ word, want }`. Tests: 10 new cases in `tests/adr-409-singular-plural-forms.test.ts`; 9 shown failing with the source edits stashed, all 40 passing after.
- devkit: `src/commands/compose-fix.ts` `fillFix` fills the slot from the story language's `numberForms` (resolved through `@sharpee/lang-<code>/nouns`), drops a fix no language can fill; `runComposeGates` puts the filled `fix` on the record. Tests: 4 AC-10 cases in `tests/compose-json.test.ts` (in-process and through `dist/cli.js`; 4 failing with compose.ts stashed, 10/10 after), 3 in `src/commands/compose-fix.test.ts`.
- wire: `ComposeFix`/`ComposeFixEdit` on `ComposeDiagnosticRecord.fix` (`packages/ide-protocol/src/compose-diagnostics.ts`), guard checks it; `protocol-spec.ts` roots; `./repokit protocol` regenerated `SharpeeProtocol.swift` and `SharpeeProtocol.cs`.
- SharpeeIDE: `Compose/DiagnosticFixes.swift` (span → buffer changes, fix-all merge); `EditorViewController` offers a compose run's fixes while the buffer reads the composed content (`ComposeScheduler.Outcome.composedContent`), applies one or all as one undo group, and puts the fix under the click plus Fix All (n) at the top of the context menu; `ProblemsView` rows with a fix carry an inline button (the retired IFID button's shape). XCTest `DiagnosticFixTests` (5, real devkit compose) plus 4 touched classes: 25/25.
- PaneHost: built its diagnostics surface: `Shell/ComposeProblems.cs` (payload read, rows, current fixes, apply to a TextDocument as one undo), `Shell/DiagnosticUnderlines.cs` (IBackgroundRenderer), `ShellWindow` Check now runs `compose --json --check` over the buffer (snapshot sibling when unsaved), fills the Problems tab, underlines, context menu (fix + Fix All), re-checks after a fix. `ComposeProblemsTests` (7, real in-repo compose) and a fix decode case in `ProtocolTypeTests` (mirrored in Swift `ComposeDiagnosticsTests`); full PaneHost.Tests 168/168.
- Found: PaneHost has no compose-diagnostics surface (its shell runs `compose --check` as text into the log; the Problems tab has no feed), so "offer the fix in the editor" there needs that surface first. Taken to David.
- mutation-verification ran; two SharpeeIDE cases added at its request (one fix's undo, a fragment-sited fix).
- **Phase 3 DONE** (plan flipped, Phase 4 advanced to CURRENT). Demonstrated, per the plan:
  - `node packages/devkit/dist/cli.js compose <scratch>/houses.story --json` (bare `plural` on "houses") printed `"code":"analysis.singular-plural-unsafe-ending"` with `"fix":{"label":"Write \`plural of house\`","edits":[{"span":{"line":21,"column":12,"endLine":21,"endColumn":18},"text":"plural of house"}]}`, exit 1.
  - SharpeeIDE full scheme: "Executed 635 tests, with 0 failures"; after the two added cases, `DiagnosticFixTests` + `ComposeDiagnosticsTests`: "Executed 15 tests, with 0 failures". `testFixAllAppliesEveryFixAsOneUndoAndTheStoryComposesClean` applies 4 fixes and recomposes with no errors.
  - PaneHost: `dotnet test PaneHost.Tests` (capability env set): "Passed: 170, Failed: 0", including `fix_all_applies_every_fix_as_one_undo_and_the_story_composes_clean`.
  - `./repokit protocol --check`: "generated protocol types match the TypeScript wire contract". chord 2007/2007, devkit 268 passed + 1 skipped, ide-protocol 69/69, repokit 143 passed + 1 skipped.

## Key Decisions
- David's go for Phase 3: "proceed" (2026-11-25, session 62310c).
- PaneHost gets its diagnostics surface in this phase (compose `--json`, underlines, Problems), then the fix and fix-all on it: David "a" (option A of three; B was fix-all only, C was SharpeeIDE only). Recorded in the plan's Phase 3 deliverable.
- Only the refusals ADR-409 D7.2 names carry a fix (unsafe ending, stopword name); a missing declaration and a proper person's refusal carry none.

## Open Items
- Untested wiring (mutation-verification): PaneHost window's `ApplyFixAsync`/`ApplyAllFixesAsync` re-check; SharpeeIDE MainWindow's forwarding of `composedContent` and the row button through the root controller; compose with a language that has no nouns module (unreachable while chord fixes the locale at en-US).
- Phase 4 needs David's go (plan entry state) and touches `packages/`.

## Files Modified
- chord: `src/diagnostics.ts`, `src/analyzer/entity/singular-plural.ts`, `src/index.ts`, `tests/adr-409-singular-plural-forms.test.ts`
- devkit: `src/commands/compose.ts`, `src/commands/compose-fix.ts` (new), `src/commands/compose-fix.test.ts` (new), `tests/compose-json.test.ts`
- ide-protocol: `src/compose-diagnostics.ts`, `src/index.ts`; repokit: `src/commands/protocol-spec.ts`
- SharpeeIDE: `Compose/DiagnosticFixes.swift` (new), `Compose/ComposeScheduler.swift`, `Compose/ProblemsView.swift`, `Editor/EditorViewController.swift`, `MainWindow.swift`, `Generated/SharpeeProtocol.swift`; tests `DiagnosticFixTests.swift` (new), `ComposeDiagnosticsTests`, `ComposeSchedulerTests`, `EditorFragmentTests`, `IRTreeStateTests`, `ProblemsVisibilityTests`
- PaneHost: `Shell/ComposeCheck.cs`, `Shell/ComposeProblems.cs`, `Shell/DiagnosticUnderlines.cs` (all new), `Shell/ShellWindow.axaml(.cs)`, `Generated/SharpeeProtocol.cs`; tests `ComposeProblemsTests.cs` (new), `ProtocolTypeTests.cs`
- Plan: Phase 3 deliverable amended (PaneHost surface), Demonstrated written, flipped DONE.

## Notes
- Session started: 2026-11-25 00:39 CST (session 62310c)
- Session ended without a terminal write when context ran out; rebuilt 2026-11-28 (session a1ecea). The Phase 3 commit carries this file.
