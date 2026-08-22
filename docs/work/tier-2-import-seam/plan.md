# Session Plan: Tier 2 import seam — #301 → #302 → #287 → #288

**Created**: 2026-08-22
**Plan Status**: ACTIVE
**Overall scope**: Close the Chord import seam identified in the 2026-08-22 issue triage as one feature filed across four tickets. #301 fixes fragment-diagnostic file attribution (amends ADR-251 D6). #302 decides whether imports should nest (amends ADR-251 D5) — a decision phase that may rule "decline nesting," not a guaranteed implementation. #287 and #288 are the IDE-side consequences: fragment classification/highlighting/recompose, then authoring affordances (File → New Import, extract-to-import). Order is fixed by dependency, not preference: #301 is the keystone (nothing downstream can name its file until it lands), #302 cannot be debugged without #301, #288 assumes #302's flat-model ruling and must be re-derived if that ruling flips.
**Bounded contexts touched**: Chord Story Language (compiler frontend — `packages/chord`) for Phases 1–4; macOS IDE (`tools/ide/SharpeeIDE`) for Phases 5–6.
**Key domain language**: fragment, splice-at-site, arbitration position, `Span`, import manifest, typed-lens sidebar group, extract-to-import.

## References consulted
- `docs/architecture/adrs/adr-251-chord-generalized-import.md` — D6 says fragment diagnostics carry the fragment's own span with a `[<name>.chord]` file prefix; that contract holds at parse stage and is broken at analysis stage (#301). D5 makes imports flat/one-level with cycles "impossible by construction"; #302 proposes amending this and must address cycle detection and traversal order if it does. D4 fixes splice-in-place-before-analysis as the semantic model — any nesting design (Phase 3/4) must stay compatible with "paste at import site."
- `docs/architecture/adrs/adr-280-chord-writer-project-model.md` — D1: sidebar groups are typed lenses, not folder mirrors, and show artifacts "wherever they sit on disk." #287's fix (classify `.chord` as Story regardless of subfolder) is exactly this rule applied to a type the sidebar doesn't yet recognize.
- `docs/work/issue-triage/triage-20260822.md` — Tier 2 entry states the order (`#301 → #302 → #287, #288`) and the keystone rationale: until #301 lands, #296's Diagnosis tab, #287's Story-group placement, and #302's nesting all build on or need a diagnostic that cannot name its file.
- `docs/work/secret-letter-port/watch-list.md` — W-1 (diagnostic file attribution) and W-9 (imports do not nest) are the exact measured findings behind #301 and #302, filed from the same session. Both entries say explicitly: platform change, needs discussion, do not fix inline as part of the port.
- `docs/context/project-profile.md` — Chord Story Language domain: lexer → parser → analyzer → IR staging convention for `packages/chord`; macOS IDE domain: feature-folder Swift structure, XCTest via `xcodebuild`; TypeScript strict mode and Vitest as the platform test command; mutation signatures for `packages/chord` require asserting on diagnostic codes/spans, not just "didn't throw."
- `docs/context/session-20260822-1537-feat-adr-321-world-index.md` — confirms `docs/work/secret-letter-port/plan.md` is the live interrupted plan (Phases 4 and 6 CURRENT) this plan's Phase-0-equivalent stamp must not disturb, and that #301/#302 were filed from that session's own authoring work — not hypothetical.

## Phases

### Phase 1: ADR-251 D6 amendment — decide the `Span.file` contract (#301, decision)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Chord compiler frontend — diagnostic span contract
- **Entry state**: #301's evidence available (`packages/chord/src/span.ts:12` has no file field; `packages/chord/src/index.ts:112`'s `resolveImports` prefixes only parse-stage diagnostics; twenty `analysis.phrase-overlap` errors from `secret-letter.story`'s market fragment were reported as innocent main-file lines). CLAUDE.md's platform-change discussion requirement is unmet.
- **Deliverable**: Discussion with David, then an ADR-251 amendment (or a new ADR superseding D6) ruling: whether `file` is optional or required on `Span`, what a main-file span's `file` value is, and when it is populated (at splice time, per D4's "paste at import site" model). No code in this phase.
- **Exit state**: Span contract ruled and recorded. Implements the decision half of #301.
- **Status**: DONE (2026-08-22, session 2fa584) — ruled by David: optional `Span.file`, holding `<import-path>.chord` as written, absent = main file, stamped at splice in `resolveImports`; written as the D6 amendment in ADR-251 with a Consequences entry for host site resolution.

### Phase 2: Implement `Span.file` and thread it through splice + analysis (#301, implementation)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Chord compiler frontend — lexer/parser span construction, splice, analyzer diagnostics
- **Entry state**: Phase 1's ruling recorded.
- **Deliverable**: `Span` carries `file` per the ruling; `compose.ts` resolves the diagnostic site as `span.file ?? mainFile` (ADR-251 Consequences); `resolveImports`/splice populates it for spliced declarations; analyzer diagnostics on spliced declarations report the fragment's file, not the main file's. Real-path tests: `pnpm --filter '@sharpee/chord' test` (existing + new suite), plus a **dedicated fixture story** (not `branch-stories/secret-letter/` — never modify a real story as a test fixture) with an imported fragment carrying a deliberate analyzer error (e.g. duplicate id or undefined reference), asserting the diagnostic names the fragment file and a fragment-relative line.
- **Exit state**: Fragment analyzer diagnostics correctly attribute file + line. #301 closeable on evidence.
- **Status**: DONE (2026-08-22, session 2fa584) — `Span.file?` added; `resolveImports` stamps every fragment AST span and fragment parse diagnostic at splice; `compose.ts` resolves the site as `dirname(story)/span.file`. Evidence: `pnpm --filter '@sharpee/chord' test` 917 passing (4 new in `import.test.ts`); `pnpm --filter '@sharpee/devkit' test` 172 passing, 1 skipped (new real-path fs-resolver test in `compose.test.ts` prints `<dir>/regions/market.chord:7:5`, and reproduced the bug verbatim — `t.story:7:5` — against the stale dist-esm before the chord rebuild); both `tsc --noEmit` clean; 17:14 CDT. #301 closeable on commit.

### Phase 3: ADR-251 D5 amendment — decide whether imports nest (#302, decision)
- **Tier**: Small
- **Budget**: 80
- **Domain focus**: Chord compiler frontend — import graph model
- **Entry state**: Phase 2 done (spans name their file — #302's own filing states nesting "cannot be debugged at all" until then). #302 is explicitly filed as "not a work item yet" — a record ahead of triage, not an implementation request.
- **Deliverable**: Discussion with David covering the three costs #302 names (hand-maintained arbitration order, no component boundary, fifty-import-line scale) against the two costs of nesting (cycle detection, depth-first traversal replacing a linear splice order). Outcome is a ruling, explicitly including "decline nesting" as a valid outcome — this phase does not presuppose implementation.
- **Exit state**: D5 either reaffirmed as-is, or amended with a stated nesting model (cycle detection diagnostic id, traversal order). A ruling *for* nesting must also retire D3's "no `import` line" exclusion and D6's `analysis.import-fragment-nested`, and record that both host resolvers (devkit fs, browser bundle map) now need recursion — ADR-251's Consequences currently say neither does. No code in this phase regardless of outcome.
- **Status**: CURRENT (since 2026-08-22)

### Phase 4: Implement nested imports (#302, implementation — conditional)
- **Tier**: Medium
- **Budget**: 150
- **Domain focus**: Chord compiler frontend — import resolution, cycle detection
- **Entry state**: Phase 3 ruled *for* nesting. **If Phase 3 declines nesting, this phase is marked N/A and skipped — it does not run.**
- **Deliverable**: Fragment-level `import` permitted; `analysis.import-cycle` diagnostic; depth-first splice traversal replacing the current flat model. Real-path tests: `pnpm --filter '@sharpee/chord' test` covering a nested-import success case and a cycle-rejection case, using a dedicated fixture (never a real story).
- **Exit state**: Nesting either implemented and tested, or phase closed N/A with Phase 3's decline recorded as the reason.
- **Status**: PENDING

### Phase 5: IDE — classify `.chord` as Story, syntax-highlight, recompose on fragment edit (#287)
- **Tier**: Small
- **Budget**: 90
- **Domain focus**: macOS IDE — project artifact classification, editor highlighting, recompose wiring
- **Entry state**: No dependency on Phases 1–4 — #287 is a sidebar/editor classification fix independent of the span or nesting decisions. Can start any time; sequenced here because it is filed together with #288 and #288 depends on it per #288's own text ("worth doing that one first, or the new commands produce a file the IDE visibly does not recognize").
- **Deliverable**: `ProjectArtifacts.classify` (`tools/ide/SharpeeIDE/Project/ProjectArtifacts.swift:183`) treats `.chord` as `.story` regardless of subfolder (ADR-280 D1, typed lens not folder mirror); `SyntaxHighlighter.canHighlight` (`SyntaxHighlighter.swift:105-107`) recognizes `.chord`; `onStoryEdited`/`onStoryActivated`/`onStoryReconciled` (`EditorViewController.swift:570,606,741`) fire for fragment edits so diagnostics surface. `Document.save()`'s story-identity reconcile stays `.story`-only (correct as filed — a fragment carries no `story` header by construction, ADR-251 D3).
- **Exit state**: A `.chord` fragment appears in the Story group, highlights as Chord source, and editing it triggers recompose/diagnostics. Real-path test: XCTest via `xcodebuild -derivedDataPath ./DerivedData`, using a dedicated fixture project (not `branch-stories/secret-letter/`, cited in #287 only as an in-repo repro pointer).
- **Status**: PENDING

### Phase 6: IDE — File → New Import and extract-selection-to-import (#288)
- **Tier**: Medium
- **Budget**: 150
- **Domain focus**: macOS IDE — File/Edit menu commands, project file creation, editor selection refactor
- **Entry state**: Phase 5 done (fragments must be recognized before New Import produces a file the IDE can show correctly). **Depends on Phase 3's ruling**: #288 as filed encodes "imports do not nest" (D5) directly into its gating — New Import is offered only against the `.story` file, never from inside a fragment, and Extract-to-import refuses a selection containing an `import` line when extracting from a fragment. If Phase 3 rules for nesting, both gates must be re-derived from the new import model before this phase is built, not built against the flat-model text as filed.
- **Deliverable**: File → New Import… command (writes `<name>.chord`, inserts `import "<name>"`, opens the fragment; subfolder paths legal per the resolver). Extract-selection-to-import (writes selection to a new `.chord`, replaces it in place with the import line, snaps to declaration boundaries or refuses with a clear reason, refuses a selection containing the `story` header). Position preservation: the import line lands exactly where the selection was.
- **Exit state**: Both commands available and tested. Real-path test: XCTest via `xcodebuild -derivedDataPath ./DerivedData` against a dedicated fixture project, covering the whole-declaration-only refusal case and the story-header refusal case.
- **Status**: PENDING

## Notes

- No ADR references appear in user-facing error text or in test story files (CLAUDE.md / memory constraint) — Phase 1–4's diagnostic ids and Phase 5–6's refusal messages state the rule in plain language only.
- Phases 1 and 3 are platform changes (`packages/chord`) and are gated on discussion with David per CLAUDE.md's "Platform changes require discussion first" — they are decision phases, not implementation authorized by this plan alone. Phases 5–6 (`tools/ide`) are story/IDE-level and can proceed once their entry states are met, per CLAUDE.md's "Story-level changes can proceed autonomously" (the IDE is judged by David's IDE-primacy directive, not gated the same way platform packages are).
