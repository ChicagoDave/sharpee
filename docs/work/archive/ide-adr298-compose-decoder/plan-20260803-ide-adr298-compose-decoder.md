# Session Plan: Fix Sharpee IDE Play tab / empty Index after ADR-298 wire change

**Created**: 2026-08-03
**Overall scope**: The ADR-298 fielded-story-block change altered the Story IR
`meta` shape on the `compose --json` wire contract. The Swift decoder in
`tools/ide/` still expects the pre-ADR-298 shape, so every decode throws,
`ComposeJsonPayload` never resolves, and the IDE shows an empty project tree
and Index and an unusable Play tab against every current story. Restore the
decoder, its two Swift consumers, and the schema-version gate that should
have caught this at decode time instead of failing silently; verify against
the real `fernhill` `.story` in Xcode.
**Bounded contexts touched**: N/A — this is a wire-contract/decoder bugfix
across a TS↔Swift language boundary (`@sharpee/ide-protocol` and
`tools/ide/`), not domain-model work. Framed in plain technical terms per
DevArch's DDD-applicability check.
**Key domain language**: N/A

## References consulted
- `docs/architecture/adrs/adr-298-story-block-metadata.md` — D1 renames
  `author` → `authors: string[]` and `version` → `story-version`, D4 closes
  the `fields` schema to a typed `IRStoryFields` object (no more
  `Record<string, string>`), and the Consequences section names this exact
  class of break ("consumers assuming strings break... every co-located
  consumer updates in the same commit per the shared wire-type discipline")
  — the constraint this plan repairs a missed instance of.
- `docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md` — D5
  mandates the wire contract be versioned via `schemaVersion` with the Swift
  decoder rejecting an unrecognized version loudly; that gate is the
  mechanism that should have caught this and didn't because
  `COMPOSE_JSON_SCHEMA_VERSION` was never bumped for the D4-A1/ADR-298 shape
  change. D9 is the IDE's Chord-version-tracking obligation, relevant to the
  `ChordVersionCheck` staleness this plan also fixes.
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md` — D5 keeps
  Chord Writer in-repo specifically because "the contract seam is still
  hot" and a schema change should land with its Swift decoder change in one
  commit; Amendment A1 confirms the window-title consumer reads
  `ir.meta.title` only and is unaffected by this fix.
- `packages/ide-protocol/src/compose-diagnostics.ts` — current
  `COMPOSE_JSON_SCHEMA_VERSION = 1`; the payload's `ir` field is typed as
  `StoryIR` imported from `@sharpee/chord`, which already reflects the
  ADR-298 `IRMeta`/`IRStoryFields` shape — so the TS side needs no shape
  change, only the version bump the D5 gate depends on.
- `tools/ide/README.md` (Conformance obligations) — records the wire-schema
  pin as a standing obligation ("the Swift decoder rejects an unknown
  `schemaVersion` loudly") and that the IDE's suite runs only in local Xcode,
  never CI — this plan's gate is therefore a manual `xcodebuild test` run,
  not a CI check.
- `docs/work/adr-298-story-block/plan-20260802-adr-298.md` (pre-session-audit
  finding) — Phase 7's deliverable text explicitly scoped this exact gap
  *out* of the ADR-298 implementation plan ("the IDE... coordinate the IDE's
  own `authors` consumption separately once this ships"). This is a known,
  acknowledged follow-up, not a surprise regression — confirms this plan is
  the deferred work, not new scope creep.

## Phases

### Phase 1: Bump `COMPOSE_JSON_SCHEMA_VERSION` and back it with a TS-side regression test
- **Tier**: Small
- **Budget**: ~40 tool calls
- **Domain focus**: N/A (platform touch — `packages/ide-protocol` only,
  per CLAUDE.md's "platform changes require discussion first"; scope is
  deliberately minimal, a version bump plus test/doc updates)
- **Entry state**: `packages/ide-protocol/src/compose-diagnostics.ts` has
  `COMPOSE_JSON_SCHEMA_VERSION = 1` even though the `ir.meta` shape it
  guards changed under ADR-298 (D1: `author`→`authors`, `version`→
  `story-version`; D4: `fields` closed and typed). The Swift gate this
  constant exists to drive (ADR-258 D5) never fired because the number
  never moved.
- **Deliverable**:
  1. Bump `COMPOSE_JSON_SCHEMA_VERSION` from `1` to `2` in
     `packages/ide-protocol/src/compose-diagnostics.ts`, and extend its
     header comment with a one-line changelog entry recording *why* (the
     ADR-298 `meta` shape change went out without a version bump; this is
     the backfill).
  2. Confirm (do not need to change) that `ComposeJsonPayload.ir: StoryIR`
     already carries the new `IRMeta { title, fields: IRStoryFields }`
     shape transitively from `@sharpee/chord` — no other TS-side type edit
     is needed.
  3. Add a regression case to
     `packages/ide-protocol/tests/compose-diagnostics.test.ts` asserting
     `isComposeJsonPayload` rejects a payload carrying the *old*
     `schemaVersion: 1` (proves the bump is load-bearing, not cosmetic).
  4. Re-run `packages/devkit/tests/compose-json.test.ts` (rule 13a real-path
     suite — drives the actual `runCompose`) and confirm it is unaffected by
     the bump (it asserts against the `COMPOSE_JSON_SCHEMA_VERSION` symbol,
     not a hardcoded literal).
- **Exit state**: `pnpm --filter '@sharpee/ide-protocol' test` and
  `pnpm --filter '@sharpee/devkit' test compose-json` both green; inline
  command + result recorded per project convention. The wire now advertises
  version 2, so any Swift decoder still pinned to version 1 will reject the
  payload loudly instead of throwing an opaque decode error — this is the
  gate Phase 3 verifies from the other side.
- **Status**: COMPLETE (2026-08-03 — ide-protocol 25 passing, 0 failures;
  devkit compose-json 7 passing, 0 failures)

### Phase 2: Update the Swift decoder, its two consumers, and the stale Chord-version-check constant
- **Tier**: Small
- **Budget**: ~60 tool calls
- **Domain focus**: N/A — `tools/ide/` Swift sources only
- **Entry state**: Phase 1 done; `COMPOSE_JSON_SCHEMA_VERSION` is 2 on the
  TS side. `tools/ide/SharpeeIDE/Compose/ComposeDiagnostics.swift`
  (`Meta` struct, lines 74–80) still decodes `{title: String, author:
  String, fields: [String: String]}` and `currentSchemaVersion` (line 173)
  is still `1`. Two consumers read the old shape directly:
  `tools/ide/SharpeeIDE/MainWindow.swift:645`
  (`ir.meta.fields["id"]`) and
  `tools/ide/SharpeeIDE/Compose/StoryIndex.swift:96-98,116`
  (`ir.meta.fields["version"]`, `ir.meta.fields["id"]`, `ir.meta.author`).
  Separately, `tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift:30`
  hardcodes `supportedLanguageVersion = "2.2.0"`, confirmed stale against
  the frozen `CHORD_LANGUAGE_VERSION = '3.0.0'`
  (`packages/chord/src/version.ts:167`) — this will make the IDE show a
  spurious "toolchain is newer" warning against fernhill (`languageVersion:
  3.0.0`) even after this fix.
- **Deliverable**:
  1. Bump `ComposeDiagnostics.swift`'s `currentSchemaVersion` from `1` to
     `2`.
  2. Replace `Meta` (lines 74–80) with the typed shape mirroring
     `IRStoryFields` (`packages/chord/src/ir.ts:145-159`): drop the
     top-level `author: String`; add a nested `Fields` struct with `id:
     String?`, `storyVersion: String?`, `authors: [String]` — the three
     keys the IDE's two consumers actually read. (`testers`, `ifid`,
     `prologue`, `description`, and the client-config keys are not
     consumed by the IDE today; Codable's default ignore-unknown-fields
     behavior means omitting them from the Swift struct is safe and
     matches the file's own documented pattern — "the wire IR may carry
     more; fields the tree needs land here as later phases consume them.")
  3. Update `StoryIndex.swift:96-98`: `ir.meta.fields["version"]` →
     `ir.meta.fields.storyVersion`; `ir.meta.fields["id"]` →
     `ir.meta.fields.id`. Update line 116: `ir.meta.author` →
     `ir.meta.fields.authors.joined(separator: ", ")` (client formats the
     list for display — ADR-298 Consequences: "the wire stays data-only;
     consumers... join/format the names for display in their own locale
     and layout").
  4. Update `MainWindow.swift:645`: `ir.meta.fields["id"]` →
     `ir.meta.fields.id`.
  5. Update `ChordVersionCheck.swift:30`: `supportedLanguageVersion` from
     `"2.2.0"` to `"3.0.0"`, extending the file's own changelog-comment
     pattern (the `2.2.0 (ADR-289, 2026-07-29)` paragraph above the
     constant) with a `3.0.0` entry citing ADR-298 and the confirmation
     (Phase 3) that the lexer golden corpus already covers the fielded
     story block surface — the file's own documented honesty condition for
     bumping this constant ("only honest once `ChordLexerGoldenTests` is
     green against a corpus that actually exercises the new version's
     surface").
  6. Grep `tools/ide/SharpeeIDE/**/*.swift` (excluding tests, handled in
     Phase 3) for any remaining `.fields[` or `.meta.author` reference to
     confirm the four sites above are the complete production-code set.
- **Exit state**: `tools/ide` production Swift sources decode the current
  wire shape; `xcodegen generate && xcodebuild ... build` (Debug) succeeds.
  Do not run the test suite yet — its fixtures still pin the old shape
  (Phase 3).
- **Status**: COMPLETE (2026-08-03 — Debug build exit 0; no stale `.fields[`
  or `.meta.author` in production sources; ChordVersionCheck → "3.0.0")

### Phase 3: Conformance — fix pinned Xcode fixtures, run the real suite, verify live against fernhill
- **Tier**: Small
- **Budget**: ~70 tool calls
- **Domain focus**: N/A — `tools/ide/SharpeeIDETests/` fixtures plus one
  live IDE run
- **Entry state**: Phases 1–2 done; the app builds but its own test suite
  is now the thing pinned to the *old* shape and *old* schema version.
  Confirmed sites: `ComposeDiagnosticsTests.swift:40,86` (raw JSON with
  `"schemaVersion":1` and `{"title":"Probe","author":"Tests","fields":
  {"id":"probe","version":"1.0.0"}}`); `IRTreeStateTests.swift:19,26,33`
  and `ComposeSchedulerTests.swift:44,96` (`ComposeJsonPayload(schemaVersion:
  1, ...)` literals); `StoryIndexTests.swift:32`, `WindowTitleTests.swift:17`,
  `SplitDividerTests.swift:48` (`meta: .init(title:author:fields:)` calls
  using the retired three-argument initializer). Per
  `tools/ide/README.md`, this suite ("drives the real devkit CLI against
  real `.story` fixtures") has almost certainly not run since ADR-298
  landed — it runs locally only, no CI (ADR-258 Consequences).
- **Deliverable**:
  1. Update every literal above to the new shape/version: raw-JSON fixtures
     in `ComposeDiagnosticsTests.swift` get `"schemaVersion":2` and
     `"meta":{"title":"...","fields":{"id":"...","storyVersion":"...",
     "authors":["..."]}}`; the `ComposeJsonPayload(schemaVersion: 1, ...)`
     call sites move to `2`; the `meta: .init(title:author:fields:)` call
     sites move to the new `Meta`/`Fields` initializer shape from Phase 2.
  2. Run `cd tools/ide && xcodegen generate` (regenerate from `project.yml`
     — already noted as done today per the diagnosis, but cheap to confirm
     idempotent) then
     `xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE
     -destination 'platform=macOS' test` (per `README.md`'s documented
     command) as the acceptance gate. Record the pass/fail count inline —
     do not summarize as "tests pass" without the actual number (project
     convention: clear test result formatting).
  3. Live verification in the IDE (the actual regression, not just unit
     fixtures): open `stories/fernhill/fernhill.story`, confirm the project
     tree and Index populate (not empty), confirm Play resolves and serves
     `dist/web/fernhill/`, and confirm no spurious "toolchain is newer"
     ChordVersionCheck warning appears (the Phase 2 step 5 fix). This is
     the rule-13a real-path check for this integration — the Xcode suite
     alone is the scaffolding check, this is the acceptance gate.
  4. If the live check surfaces anything the unit fixtures didn't
     (e.g. a Meta-decode edge case in fernhill's actual `authors`/`id`
     values not covered by the hand-written test fixtures), fix it here
     rather than deferring — this phase is the integration boundary for
     the whole fix.
- **Exit state**: `xcodebuild ... test` reports its pass/fail count inline
  (evidence, not a claim); fernhill's Play tab and Index work end-to-end in
  a live IDE run; `ChordVersionCheck` shows no spurious warning against
  fernhill's `languageVersion: 3.0.0`. GH-issue-worthy follow-ups (if any
  surface — e.g. whether `testers`/`ifid` should join the Swift `Fields`
  struct for a later Index enhancement) are noted but not implemented here
  — out of this fix's scope per the diagnosis.
- **Status**: COMPLETE (2026-08-03 — fixtures migrated; suite 432 → 435
  passing, 0 failures after Play-surface additions. Step 3's live-IDE check
  is David-side carryover per session-20260803-1506-main.md)
