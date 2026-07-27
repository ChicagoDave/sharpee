# Session Plan: ADR-258 — IDE Chord authoring environment (platform side only)

**Created**: 2026-07-27
**Overall scope**: Ship the platform/toolchain half of ADR-258 that this Linux
machine can build and test: `sharpee compose --json` (D5, gates + IR, no
load-proof, wire-typed in `@sharpee/ide-protocol`) and the committed TS-side
golden lexer fixture (D7, the conformance pin the Swift port will consume).
D6 (project tree) rides on D5's same-run IR payload — no separate phase. D9
(Chord language version) is already structurally satisfied by existing
platform surfaces and is verified, not built, in this plan. Everything Swift
— the IDE app itself, its Xcode project, `ChordLexer.swift`, the JSON
decoder, the tree UI, state migration (D1–D4, D6 UI, D7 Swift port, D8) —
happens on the user's Mac and is explicitly **out of scope** (see "Out of
scope" below for the handoff contract).
**Bounded contexts touched**: N/A — this is compiler-frontend/CLI/wire-protocol
tooling work (no `docs/ddd/notation.yaml` in this project; not domain
modeling). Packages involved, in the ADRs' own vocabulary: `@sharpee/chord`
(compiler — lexer conformance pin), `@sharpee/ide-protocol` (the new wire
contract's home), `packages/devkit` (`compose` command — the `--json` flag,
building on `runComposeGates`).
**Key domain language**: gates + IR no load-proof, `schemaVersion`, structured
diagnostic record (compile: full span; hatch: file+line, no end-span),
`ComposeDiagnostic`/`runComposeGates` (ADR-276 D4, already landed — reused,
not re-derived), Story IR, atomic load (`ir` meaningful only when `ok`),
D5 residue, golden token stream, conformance pin, freshness-gated generation
(the ADR-269/276 precedent, not reused mechanically here since D7 has no
generator — the golden file itself is the artifact).

## References consulted
- `docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md` — the
  plan's target. D5 (structured `--json` transport, wire contract owned by
  `@sharpee/ide-protocol`, versioned, Swift decoder rejects unknown versions
  loudly — Swift side out of scope here), D6 (tree is IR-sourced from the
  same `compose` run — no second command), D7 (Swift lexer port pinned by a
  TS-side golden fixture enforced in existing CI, not a Swift XCTest — the
  2.0.0 corpus-coverage list), D9 (IDE tracks `CHORD_LANGUAGE_VERSION`). The
  2026-07-27 amendment: ADR-258 depends on ADR-276 for D5's authority premise;
  the hatch-lint second record type (`{severity, code, message, file, line}`,
  no end-span) joins the payload; Problems' alteration-error coverage requires
  ADR-276's census arc to have landed first. D3's swap table (what leaves when
  the Swift replacement lands) is Mac-side bookkeeping, not this plan's
  concern, but confirms `compose --json` + a Swift decoder is what retires
  `TSCDiagnostic.swift` — this plan ships only the platform half of that swap.
- `docs/architecture/adrs/adr-276-chord-source-authoritative-errors.md` — now
  **IMPLEMENTED** (2026-07-27, Phases 1–8, branch `adr-276-p1`). D4 landed
  `runComposeGates()`/`ComposeDiagnostic` in `packages/devkit/src/commands/
  compose.ts` — the ONE diagnostics collection this plan's `--json` mode
  serializes; this plan must build on it, not re-derive the collection.
  Acceptance item 9 ("ADR-258's D5 amendment lands as a follow-on edit citing
  this ADR") is the explicit trigger for this plan's Phase 1. The
  Implementation addendum's D5-residue list (hatch provision/export-shape,
  language-provider capability, profile/IR-format refusals) is the boundary
  this plan's `--json` payload does **not** need to cover — those stay
  Build-output-only per ADR-258's own amendment.
- `docs/architecture/adrs/adr-210-story-language.md` — the direction rule this
  plan must not violate (line 171, "Direction rule: nothing platform depends
  on the language packages"; table at line 167: `@sharpee/chord` carries
  "nothing platform-runtime"). `@sharpee/ide-protocol` already imports IR
  types FROM chord (`story-ir.ts`) — this plan's new wire types follow that
  same one-way direction, never the reverse.
- `docs/context/project-profile.md` (2026-07-16, within the 7-day freshness
  window) — confirms `@sharpee/chord` (v3.0.0), `packages/ide-protocol`, and
  `packages/devkit` as the relevant packages; TypeScript strict mode and
  Vitest are the test/type conventions this plan's deliverables follow; no
  domain-modeling signal for this work (chord's own "Mutation calls"/"Test
  assertions" entries — diagnostic collection mutating a sink, asserting on
  diagnostic codes/spans not just "no diagnostics" — apply directly to
  Phase 2's and Phase 3's test design).
- `docs/context/session-20260727-0800-adr-276-p1.md` (most recent session) —
  Open Items item 1 names this exact plan as the next step ("ADR-258 D5
  amendment citing ADR-276 ... then ADR-258 implementation (platform `--json`,
  golden lexer fixture; Swift work on the Mac)"), confirming the scope split
  this plan encodes. Item 3's parked items (delete ruling for two
  `scripts/*.cjs` generators, `thealderman` story-local tsc failure, ADR-266
  umbrella closing note) are unrelated to ADR-258 and are not carried into
  this plan.
- `CLAUDE.md` — "Platform changes require discussion first. Any changes to
  `packages/` ... must be discussed with the user before implementation."
  Every phase below touches a platform package (`chord`, `ide-protocol`,
  `devkit`) — flagged per-phase. Build/test commands: `./repokit build`/
  `./repokit verify`, `dist/cli/sharpee.js --test` (bundle, not package
  sources) for corpus/transcript regression.

## Hard constraints carried from the ADRs (not re-litigated by this plan)
1. **Swift/Mac work is out of scope, unconditionally.** No phase below touches
   `tools/ide/` or any `.swift` file. See "Out of scope" for the handoff.
2. **`--json` never performs the load-proof** (D5): no `createStory`/
   `WorldModel` construction, no hatch-module `require`, on the `--json` path.
   A story whose hatch modules cannot resolve must still return gates + IR
   successfully — this is an acceptance-gating test, not an aspiration.
3. **Build on `runComposeGates`, don't re-derive it** (ADR-276 D4 is landed).
   The `--json` serializer consumes `ComposeGatesResult` as-is; if its shape
   needs a field `--json` doesn't have, that is a signal to widen
   `ComposeGatesResult`, not to hand-roll a second collection.
4. **The wire contract lives in `@sharpee/ide-protocol`, not devkit** (D5).
   `packages/devkit` imports the payload/record types from `@sharpee/
   ide-protocol` (rule 8b direct import — the TS side compiles both together);
   no duplicate interface declared in `compose.ts`.
5. **`schemaVersion` is versioned like `ProjectManifest`'s, but is its own
   constant** — `ide-protocol`'s existing `SCHEMA_VERSION = 1` (`types.ts`)
   belongs to `ProjectManifest` (ADR-184); this plan's payload is a distinct
   contract and needs its own versioned constant, not a reuse of that one.
6. **Default text output is unchanged, byte-for-byte** (D5, and ADR-276 D4's
   "text output unchanged in behavior" carried forward). `--json` is a new
   additive mode; it does not alter what `compose` (no flags), `compose
   --check` (no `--json`), or the default load-and-emit-IR mode print or
   return.
7. **The golden fixture is a committed artifact, not a generator output**
   (D7) — unlike ADR-276 D2's freshness-gated *generated* manifest, D7's pin
   is a hand-curated corpus plus a byte-comparison test; there is no
   `repokit`-generated module here. Do not import the ADR-269/276 generator
   pattern wholesale — only the "committed golden, CI-enforced on the TS
   side" shape.
8. **The corpus must cover the shipped Chord 2.0.0 surface named in the
   ADR-258 amendment**: slot spellings, or-alternation, `[optional]` words,
   typed slots, `means`/`directions`, the `grammar` header, `extend action`/
   `remove from action`, and counter comparisons. A golden fixture that omits
   any of these is incomplete, not merely light.
9. **Import direction unchanged**: `@sharpee/chord` imports nothing new;
   `@sharpee/ide-protocol` continues to import IR types FROM chord only, never
   the reverse; no platform package imports chord (`scripts/bundle-entry.js`
   direction check stays green).
10. **Corpus stays green.** `--json` is additive and read-only over the
    existing compile/gate machinery — a phase that changes any existing
    diagnostic's code, span, or text is out of scope here and would be a
    regression, not a finding.

## Out of scope — the Mac/Swift handoff
The IDE app itself (D1–D4 swaps, D6 tree UI, D7's `ChordLexer.swift` port, D8
state migration) is built on the user's Mac and is not part of this plan or
this repo checkout's session budget. What the Mac side consumes from this
plan's output:
- **The `--json` wire contract** — the new payload/record types exported from
  `@sharpee/ide-protocol` (Phase 2), plus the `schemaVersion` constant the
  Swift decoder checks and rejects loudly on mismatch. The Swift decoder
  itself is not written here.
- **The golden token-stream fixture's path and format** (Phase 3) — the
  committed corpus + golden file the Swift `ChordLexer` conformance XCTest
  reads. This plan does not write that XCTest; it ships the artifact the
  XCTest will be pinned against.
- **`sharpee --version`'s existing `Sharpee X · Chord Y` output** (already
  shipped, pre-dates this plan) — D9's IDE-side version check reads this; no
  change needed here (see Phase 2's D9 note).

## Phases

### Phase 1: ADR-258 status amendment — ADR-276 IMPLEMENTED, D5 gate open
- **Tier**: Small
- **Budget**: ~50 tool calls
- **Platform packages touched**: none — documentation only
  (`docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md`).
- **Focus**: close ADR-276 Acceptance item 9 ("ADR-258's D5 amendment lands as
  a follow-on edit citing this ADR") before any code phase starts, so the
  implementation phases below cite an ADR-258 that accurately states its own
  unblocked status.
- **Entry state**: ADR-276 is Status: IMPLEMENTED with its Implementation
  addendum appended (confirmed above). ADR-258's own Status/amendment text
  still reads as of the 2026-07-27 re-assessment — it says implementation is
  "unblocked" pending ADR-276's arc, but does not yet record that the arc
  finished.
- **Deliverable**: a short amendment appended to ADR-258 (Status line and/or
  a new dated marker, matching the file's own convention for the 2026-07-27
  amendment) stating: ADR-276 is IMPLEMENTED (cite the addendum), the D5
  sequencing gate is open, and platform-side implementation (this plan) is
  proceeding. No decision content changes — this is a status/pointer update,
  not a new Decision subsection, so it does not trigger the rule 11a open-
  questions interview (no Open Questions are introduced).
- **Exit state**: ADR-258's Status line reads correctly for a reader who has
  not seen `adr-276`'s addendum or this session's history. No code changed.
- **Test scenarios**: none (doc-only phase). Verification is a direct read of
  the amended section confirming it names ADR-276's IMPLEMENTED status and
  cites the addendum.
- **Status**: DONE

### Phase 2: D5 — `sharpee compose --json` (gates + IR, no load-proof)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Platform packages touched**: `packages/ide-protocol` (new wire types),
  `packages/devkit` (new `--json` flag on `compose`). Flagged per CLAUDE.md's
  "platform changes require discussion first" — this plan is that discussion;
  proceed only after the user has seen this plan.
- **Focus**: the ADR's one platform-CLI-contract change (D5), which also
  satisfies D6 (tree sourced from the same run's IR) and D9 (language version
  already present in the IR — verified, not newly built) without a separate
  phase for either.
- **Entry state**: Phase 1 landed. `runComposeGates()`/`ComposeDiagnostic`
  exist in `packages/devkit/src/commands/compose.ts` (ADR-276 D4) and are the
  ONE diagnostics collection this phase serializes. `@sharpee/ide-protocol`
  already holds `ProjectManifest` (`SCHEMA_VERSION = 1`) and re-exports the
  Story IR types (`story-ir.ts`) from `@sharpee/chord` — this phase's payload
  reuses the latter directly, not a re-declaration.
- **Deliverable**:
  - New wire types in `@sharpee/ide-protocol` (e.g. a new
    `compose-diagnostics.ts`, exported from `index.ts` alongside the existing
    `ProjectManifest`/`story-ir` exports): a `ComposeJsonPayload` shape
    carrying `schemaVersion` (a **new, distinct** versioned constant — do not
    reuse `SCHEMA_VERSION` from `types.ts`, which belongs to `ProjectManifest`
    per hard constraint 5), `diagnostics: ComposeDiagnosticRecord[]` (mirrors
    `compose.ts`'s existing `ComposeDiagnostic` shape: `severity`, `code`,
    `message`, `file`, `line`, and `span?` — present with full `line`/
    `column`/`endLine`/`endColumn` for compile diagnostics, absent for hatch
    records per D4/D5), and `ir?: StoryIR` (present **iff** the compile
    succeeded — `CompileResult.ir` is "meaningful only when `ok`," ADR-210;
    the payload must not hand the IDE a garbage IR under a truthy key). A
    type guard (e.g. `isComposeJsonPayload`) analogous to the existing
    `isProjectManifest`/`isEntityNode` guards in `guards.ts`, for the
    shape-pinning test below.
  - `packages/devkit/src/commands/compose.ts`: new `--json` flag on
    `runCompose`'s arg parsing.
    - `compose <file> --json` (no `--check`): runs `runComposeGates(file)`
      (existing function, unmodified), performs **no** load-proof step (skip
      the `createStory`/`WorldModel` block entirely — this is the whole
      point of the mode), and writes one `ComposeJsonPayload` to stdout:
      `schemaVersion`, `diagnostics` (converted from `gates.diagnostics`),
      and `ir: gates.compile.ok ? gates.compile.ir : undefined`. Exit code
      matches the gates' `ok` (0 clean, 1 gate errors) — same contract as
      today's `--check` exit codes.
    - `compose <file> --json --check`: gates only, `ir` omitted entirely
      (ADR text: "`--json` composes with `--check` (gates only, no IR)") —
      same diagnostics array, no IR field at all (not merely `undefined`;
      the key should not be present, to keep the two modes' payload shapes
      distinguishable without inspecting `ir`'s value).
    - Default text mode (`--json` absent) is byte-for-byte unchanged — the
      existing text formatter (`formatDiagnostic`) and existing tests keep
      passing verbatim.
  - **D9 note (no new code)**: `StoryIR`'s `languageVersion` field already
    rides in the `ir` payload above, and `sharpee --version` already prints
    `Sharpee X · Chord Y` (`packages/devkit/src/cli.ts`, pre-existing). This
    phase adds one assertion (below) that the `--json` payload's `ir.
    languageVersion` is present and matches `CHORD_LANGUAGE_VERSION` — D9's
    platform-side dependency is satisfied by composition, not new surface.
  - **D6 note (no new code)**: the tree the IDE builds is read directly off
    this same payload's `ir` field — no second command, matching ADR-258's
    "one command serves both." This phase's IR-presence test below is D6's
    platform-side acceptance criterion.
- **Exit state**: `sharpee compose <file>.story --json` and `--json --check`
  work end-to-end against real `.story` files via the real `runCompose`
  function (rule 13a: real compose path, not a stub); the wire types live in
  `@sharpee/ide-protocol` and are imported directly by `compose.ts` (rule 8b);
  default text output is regression-pinned unchanged; a story with an
  unresolvable hatch module still returns gates + IR successfully under
  `--json` (proving the editor path never imports author TypeScript); full
  corpus green (additive, read-only change).
- **Test scenarios**:
  - Real-path shape test: scaffold a real story (`runInitCommand` pattern
    from `manifest-browser-parity.test.ts`), run `compose --json` against it,
    parse stdout, assert `isComposeJsonPayload(...)` passes and `ir` is
    present with the expected `languageVersion`.
  - Full-span diagnostic test: a story with one analyzer error, `--json`
    output's diagnostic record carries `line`/`column`/`endLine`/`endColumn`
    (not just the human-readable line) — the underline-range acceptance
    criterion.
  - Hatch-record shape test: a story with a `chord.*`-in-hatch-source
    violation (existing `hatch-lint.test.ts` fixture pattern), `--json`
    output's second record has `file`+`line` and no `span` key.
  - Combined test: one story with **both** an analyzer error and a hatch
    violation in one `--json` run — both record kinds present in one
    `diagnostics` array (mirrors the existing Phase 7 combined test for the
    text path).
  - No-load-proof / unresolvable-hatch test: a story whose hatch module
    `require` would throw (module genuinely absent), `--json` still returns
    successfully with gates + IR — assert no exception, and assert (e.g. via
    a spy or absence of any `node_modules`/`require` touch on that path) that
    the load-proof code path was not entered.
  - `--json --check` test: same story, `--json --check` output has no `ir`
    key at all; gate-only exit codes match plain `--check`'s.
  - Regression test: default text-mode output (no `--json`) byte-identical
    to pre-phase output on the existing hatch-lint and analyzer-error
    fixtures (extends the Phase-7-style byte-identity pin).
  - Full corpus: `dist/cli/sharpee.js --test --chain
    stories/dungeo/walkthroughs/wt-*.transcript`, cloak, fernhill,
    friendly-zoo, nautical, acceptance stories — green (compose is outside
    the bundle's runtime path, but a corpus sweep is the standing regression
    gate per the ADR-276 plan's precedent).
- **Status**: DONE

### Phase 3: D7 — golden lexer fixture (TS-side conformance pin)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Platform packages touched**: `packages/chord` (new test fixtures + a
  conformance vitest; `lexer.ts` itself is not modified — this phase pins its
  current behavior, it does not change it).
- **Focus**: D7's platform-side half — the committed golden token stream and
  the TS-side test that reddens when `lexer.ts` drifts from it. The Swift
  `ChordLexer` port and its XCTest against this same file are Mac-side, out
  of scope (see "Out of scope").
- **Entry state**: `packages/chord/src/lexer.ts` (203 lines, stable per the
  2026-07-27 amendment's note that the entire grammar arc landed without
  touching it) is the token source of truth. No golden fixture exists yet.
- **Deliverable**:
  - A committed corpus directory (e.g.
    `packages/chord/tests/fixtures/lexer-golden/*.story` or `.chord`
    fragments) covering every construct hard constraint 8 names: slot
    spellings (`the <name>`), or-alternation, `[optional]` words, typed
    slots, `means`/`directions`, the `grammar` header, `extend action`/
    `remove from action`, and counter comparisons. Reuse existing real corpus
    sources where they already exercise a construct (e.g. a `fernhill` or
    `standard-en-us.story` excerpt) rather than inventing redundant fixtures;
    add small targeted fragments only for constructs not otherwise present.
  - A committed golden file (one per corpus file, or one combined JSON)
    recording `lex()`'s exact output (`Line[]`, including `tokens`, `indent`,
    `comment`, `afterBlank`) for each corpus file.
  - A regeneration script (e.g. `packages/chord/scripts/generate-lexer-
    golden.ts` or a `pnpm` script) that re-lexes the corpus and overwrites the
    golden file — the "deliberate act that makes a lexer change visible"
    (ADR-258 D7). Running it twice with no source change must be a no-op
    (idempotent — no accidental timestamp/ordering drift in the serialized
    output).
  - A new vitest in `@sharpee/chord` (e.g. `lexer-golden.test.ts`) that
    re-lexes the corpus at test time and deep-equals the committed golden
    file — the CI-enforced pin (ADR-258 D7 is explicit this must live where
    CI already runs, since no Swift test runs in `.github/workflows/` today).
  - A corpus-coverage assertion (part of the same test file or a sibling
    test) that fails if any construct from hard constraint 8's list is no
    longer exercised by the corpus — a drift guard on the fixture set itself,
    not just on the lexer.
- **Exit state**: the golden fixture and conformance test are committed and
  green; a deliberate, temporary edit to `lexer.ts` (e.g. altering how
  `compare` tokens are produced) turns the conformance test red, demonstrating
  the pin fires — then the edit is reverted (ADR Acceptance: "demonstrated by
  a deliberate mismatch during review"); the regeneration script is
  idempotent; the corpus-coverage assertion passes.
- **Test scenarios**:
  - Conformance test green against the current `lexer.ts` (real `lex()` call,
    real corpus — no stub, satisfying the mutation-verification "asserting on
    the shape/contents of the emitted [tokens]" standard from the project
    profile's Chord domain treatment).
  - Deliberate-mismatch demonstration: temporarily mutate `lexer.ts`'s
    `compare`-token handling (or another small, reversible change), run the
    test, assert it fails with a message pointing at "regenerate the golden"
    (per D7's stated failure-message intent), then revert and re-confirm
    green.
  - Regeneration idempotency: run the regeneration script twice consecutively
    with no source change; diff the golden file before/after — must be empty.
  - Corpus-coverage assertion: passes today; a test that removes one
    construct from the corpus (e.g. temporarily drop the `means`/`directions`
    fixture) must fail this assertion — demonstrating the drift guard itself
    is live, not decorative.
  - Full `@sharpee/chord` suite (`pnpm --filter '@sharpee/chord' test`)
    green — this phase adds tests, it does not touch existing lexer/parser/
    analyzer behavior.
- **Status**: CURRENT

## Session state seed

Phase 1 is CURRENT with the budget above. See
`docs/context/.session-state.json`.
