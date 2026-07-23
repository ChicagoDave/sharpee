# ADR-258: The IDE is a Chord authoring environment (TypeScript author path dropped)

## Status: DRAFT — all Open Questions resolved by interview (session 341218); pending `adr-review` and acceptance.

## Date: 2026-07-23

## Parent: ADR-185 (the IDE is a standalone authoring tool). Supersedes ADR-182 (IDE syntax highlighting via tree-sitter **TypeScript**). Supersedes ADR-184's *mechanism* — the project tree is now IR-sourced, not introspected from the runtime world — while keeping its deliverable. Downstream of ADR-210 (Chord), ADR-252 (`.story` first-class browser build), ADR-253 (channel `return` + layout escape hatch), ADR-257 (Chord language version). **Depends on ADR-259** (the Chord browser build supports hatch modules): D4's build/play surface covers *every* `.story` only once a hatched story can be built, so no hatch carve-out appears in D3's swap table.

## Context — verified, not assumed

The IDE (`tools/ide/`) was last touched **2026-06-27** (`26559677`). Everything after
that commit — the whole Chord arc — landed without it. ADR-185's realignment
(increments 1–6) is complete and green, but it realigned the IDE onto the
**TypeScript author project**: an npm package with `package.json`,
`node_modules/.bin/sharpee`, `src/index.ts`, and `src/browser-entry.ts`.

Chord has since become the author language. `stories/fernhill/` is now **fully
TypeScript-free** (ADR-253 D3: it owns `browser/index.html`; `src/browser-entry.ts`
was deleted). A `.story` builds with **no `package.json` and no `node_modules`**
(ADR-252 D2). The IDE has **zero** Chord awareness — `grep -ri chord tools/ide/**/*.swift`
returns nothing.

This is not "the IDE needs a Chord mode added." Four of its subsystems are
**already broken or dead** against a Chord story. Traced in code:

- **Introspection cannot run.** `packages/devkit/src/commands/introspect.ts:32`
  hard-gates on `dist/index.js` and loads the compiled TS story through
  `@sharpee/bootstrap` (`loadStory` → `buildManifest`). A `.story` never produces
  `dist/index.js`. `IntrospectionRunner.swift:37` invokes that bin, so the project
  tree (ADR-184) is dead for Chord by construction — not degraded, absent.
- **Play points at the wrong path.** `WebBundle.swift:15` resolves
  `<projectRoot>/dist/web/`. ADR-252 D2 emits to `dist/web/<id>/`. The Play pane
  would find nothing even after a successful Chord build.
- **The prereq model is wrong.** `BuildRunner.swift:57/67/76` runs
  `node_modules/.bin/sharpee`, `npm install`, and `init-browser`. A `.story` needs
  none of the three; `init-browser` targets `src/browser-entry.ts`, retired by
  ADR-252 D4. `BrowserEntry.swift` in whole, and ADR-185 decision 3's automatic
  housekeeping, are dead paths.
- **Both language services target the wrong language.** `SyntaxHighlighter.swift`
  and `EntitySourceIndex.swift:14` bind `TreeSitterTypeScript`;
  `TSCDiagnostic.swift` regex-parses `tsc` stderr. Chord is neither TypeScript nor
  compiled by `tsc`.

What Chord offers in exchange is **better than what it replaces**, which is why this
is a supersession rather than a port:

- **Diagnostics are already structured.** `packages/chord/src/diagnostics.ts` —
  `{severity, code, message, span}` with a stable machine code (`analysis.unknown-chain`)
  and 1-based line/column/endLine/endColumn (`packages/chord/src/span.ts`). Strictly
  richer than regex-scraping `tsc` text. One seam: `sharpee compose` currently
  *prints* them as text to stderr (`compose.ts:63`); there is no structured output mode.
- **The IR is a project model.** ADR-184 introspects the **runtime world**, which is
  why the tree is build-gated. `chord.compile()` yields a structured Story IR with
  source spans directly from source — no build, no `node_modules`, no world assembly.
- **Chord owns a lexer.** `packages/chord/src/lexer.ts` (194 lines, browser-safe) is
  the language's real token source. No tree-sitter grammar for Chord exists anywhere
  in the repo.

## Decision

### D1 — The IDE is a Chord authoring environment; the TypeScript author path is dropped

The IDE opens, edits, builds, plays, and diagnoses **Chord `.story` stories only**.
The TypeScript-author-project path is removed, not maintained alongside — the same
move ADR-185 made when it deleted monorepo mode rather than keeping a dual mode.

Platform/TS development continues in a general-purpose editor; the IDE is the
**author's** tool, and the author writes Chord.

### D2 — The unit the IDE opens is a `.story`, not an npm project

The open target is a `.story` file and the folder around it (which may hold
`browser/index.html`, assets, and hatch modules). The IDE must not require —
or create — `package.json`, `node_modules`, or a `sharpee` bin, and must not run
`npm install`. ADR-185 decision 3's automatic housekeeping is withdrawn for Chord.

### D3 — The dead TypeScript subsystems are removed

`BrowserEntry.swift` (+ its tests), the `init-browser` and `npm install` paths in
`BuildRunner`, `StoryScaffold`'s `src/index.ts` template, `TSCDiagnostic.swift`,
`EntitySourceIndex.swift` (superseded by IR spans, D6), and the
`TreeSitterTypeScript` bindings leave the tree.

**Removal is a swap, not a clearing phase.** Each subsystem leaves in the same commit
that lands its Chord replacement — the app builds, runs, and passes its suite at every
commit, and no commit carries both a dead subsystem and the thing that replaces it:

| Lands | Leaves |
|---|---|
| `ChordLexer.swift` + conformance test (D7) | `TreeSitterTypeScript` binding, and the tree-sitter dependency in `project.yml` |
| `compose --json` + Swift decoder (D5) | `TSCDiagnostic.swift` |
| IR-sourced tree + exact spans (D6) | `EntitySourceIndex.swift`, `SourceRef` name-matching |
| `.story` build/play paths (D2, D4) | `BrowserEntry.swift`, `npm install` / `init-browser`, `src/index.ts` scaffold |

This ordering is a **constraint on the implementation plan**, not a plan itself: the
phase decomposition (which swap first, what each phase's gate is) is planning work
downstream of this ADR. Two of the four rows are genuine swaps rather than deletions —
highlighting and navigation would be *absent*, not merely reduced, if the removal ran
ahead of its replacement.

### D4 — Build and Play follow the ADR-252 contract

Build invokes `sharpee build <file>.story` (browser is the default client — no
`--browser`, ADR-252 D1/D6). Play loads `dist/web/<id>/`, where `<id>` comes from
the Story IR header, replacing `WebBundle`'s `dist/web/` assumption. A story
providing `browser/index.html` (ADR-253 D3) is served as-is; the IDE does not
inject into the author's page.

### D5 — The Problems panel is fed by Chord diagnostics

Chord `Diagnostic` records — severity, stable code, message, span — replace scraped
`tsc` text as the Problems source, and the stable `code` is what the panel groups and
filters on. Warnings surface alongside errors (Chord reports both).

**Transport is a structured `--json` mode on `sharpee compose`**, and that mode is
also what yields the IR the tree is built from (D6). Neither existing mode fits:
`--check` runs the gates but emits **no IR**, while the default mode emits IR *and*
performs the story-loader load-proof — which resolves hatch modules and so needs the
very toolchain D2 forbids the IDE from requiring. `--json` therefore means **gates +
IR, no load-proof**: the compile is authoritative for diagnostics and structure, and
proving the IR *loads* stays the build's job, not the editor's.

This is a second additive mode on one command, not a second command — and it is a
change to a documented CLI contract, so it is recorded here as a decision rather than
left to implementation.

Because the transport is structured rather than scraped, the `Diagnostic` crosses the
process boundary intact, including `endLine`/`endColumn`
— which the human-readable line drops, and which the editor needs to underline the
offending range rather than guess it. The IDE never re-parses compiler prose; D3
deletes the last scraper (`TSCDiagnostic`) and this ADR does not create a second one.

The emitted JSON is a **wire contract**, versioned and owned like the ADR-184 project
manifest — its natural home is `@sharpee/ide-protocol`, which already exists to hold
exactly this kind of IDE-facing shape, rather than an ad-hoc object literal in
`compose.ts`. DEVARCH rule 8b's direct-import discipline does not reach across the
TS→Swift language boundary, so nothing compiles the two sides together. The contract
is therefore explicit:

- The payload carries a `schemaVersion` integer, mirroring `ide-protocol`'s existing
  `SCHEMA_VERSION` convention, bumped on any breaking shape change.
- Each diagnostic carries `severity`, `code`, `message`, and the **full** span
  (`line`, `column`, `endLine`, `endColumn`) — the shape of `chord.Diagnostic`, not a
  lossy projection of it.
- **The Swift decoder rejects an unrecognized `schemaVersion` loudly** — a visible
  "IDE is out of date for this toolchain" state — rather than decoding partially and
  silently dropping fields.

`--json` composes with `--check` (gates only, no IR), so CI gains a machine-readable
gate result it does not have today.

### D6 — The project tree is sourced from the Story IR, not the assembled world

The project tree comes from `chord.compile()`'s Story IR. This **inverts ADR-184's
central mechanism** (introspect the runtime world) while keeping its deliverable (a
Sharpee-aware tree of rooms/objects/NPCs/regions).

Three consequences follow directly:

- **No build gate.** The tree is derived from source, so it updates as the author
  writes — no `dist/`, no `node_modules`, no world assembly. This is what makes the
  tree work at all for a `.story` (D2).
- **The tree survives a broken source: the IDE retains the last `ok` IR.** Chord's
  load is atomic — `CompileResult.ir` is *"meaningful only when `ok`"*
  (`packages/chord/src/index.ts:57`, ADR-210) — and source under active editing is
  un-`ok` most of the time. A live tree naively bound to `compile()` would therefore
  blank out on every half-typed line. Instead: the IDE holds the most recent `ok` IR
  and keeps rendering it, **marked stale**, until a new `ok` compile replaces it.
  Problems always reflects the **current** source (D5), never the retained IR, so the
  author sees a stable tree next to live errors rather than a tree that flickers with
  every keystroke. A `.story` that has never compiled cleanly shows an empty tree and
  says why.
- **Navigation becomes exact.** ADR-210 AC-3 carries a `Span` on every AST/IR
  element, so click-to-open jumps to the real site. ADR-184's reverse-mapping —
  `EntitySourceIndex.swift`'s tree-sitter name index and `SourceRef.resolution`'s
  `'exact' | 'scope'` fallback — is **not ported**; it is deleted with D3. The
  heuristic existed only because a runtime entity has no memory of its source.
- **The tree shows what was authored, not what assembly produces.** Entities created
  by hatch code at runtime do not appear. Accepted: the tree is an authoring view of
  the story text, and runtime truth belongs to Play. Trait-derived lints are
  unaffected — authored traits are in the IR.

**One command serves both.** Because the tree and the diagnostics both come from
`compose`, the IDE needs no separate introspection invocation: a single
`sharpee compose` run yields gate diagnostics (D5) and the IR the tree is built from.
`sharpee introspect` is therefore **not given a Chord path** — it stays the
TypeScript/world-model tool it is, and goes dormant with the TS author path.
`IntrospectionRunner.swift` is rewritten against `compose`, not repointed.

**Hatch modules are never resolved by the editor path.** D2 allows a story folder to
hold hatch modules, and D5's `--json` mode deliberately skips the load-proof — so
nothing in the tree-or-diagnostics path imports author TypeScript. Hatch resolution
happens where it always did: in `build`, which may legitimately need whatever those
modules import. This is what keeps D2's "no `node_modules` required" true for a
*hatched* story and not just for a pure one like fernhill.

### D7 — Highlighting is a Swift lexer port, pinned by a conformance test

The editor tokenizes Chord **in-process** with a Swift port of
`packages/chord/src/lexer.ts` (194 lines). Highlighting needs tokens, not a parse
tree, so no tree-sitter grammar is authored and **no tree-sitter dependency remains**
in `project.yml` — the `TreeSitterTypeScript` binding leaves with D3 and nothing
replaces it.

The second implementation is made safe the way this repo already handles duplicated
surfaces (ADR-257 D3's `chord.ebnf` pin; `chain-map.ts`'s conformance pin against
`OPENED_REVEALED_CHAIN_KEY`): both lexers are pinned to **one committed golden token
stream** over a shared `.story` corpus.

**The pin is enforced on the TypeScript side, where CI already runs.** No GitHub
Actions workflow runs `xcodebuild` or any Swift test today — `.github/workflows/`
holds only `beta-release`, `build-platforms`, `pages`, and `zifmia-publish` — so a
pin living only in an XCTest would enforce nothing. Instead:

- A **vitest in `@sharpee/chord`** lexes the corpus and asserts against the committed
  golden file. A change to `lexer.ts` that alters the token stream turns this red in
  the CI that exists today, and the failure message says to regenerate the golden.
- The **Swift conformance XCTest** asserts `ChordLexer` against that *same* committed
  golden file — no Node subprocess, no live cross-language call.

So the golden artifact, not a test runner, is the thing both implementations agree
on: the TS test proves the golden still describes Chord, and the Swift test proves the
port still matches the golden. Regenerating the golden is the deliberate act that
makes a lexer change visible to whoever must update the Swift port.

Both tests are part of the deliverable, not a follow-up.

*Recorded limitation*: this pins the lexer specifically. The IDE's other 27 test files
still run only locally in Xcode — the IDE has never been under CI. Bringing the whole
suite under a macOS runner is worth doing and is **out of scope here**.

### D8 — Persisted IDE state is migrated, not silently broken

`RecentProjectsStore` and `SessionState` hold paths to TypeScript story projects that
will no longer open. On load, an entry that is not a `.story` (or a folder containing
one) is **dropped from recents** rather than offered and failing at open time; a
restored session pointing at such a project opens the empty state with a one-line
explanation. No migration file, no version bump — the persisted data is a cache of
user convenience, and the correct handling of a stale entry is to discard it.

### D9 — The IDE tracks the Chord language version

The IDE reports and checks the language version it supports against
`CHORD_LANGUAGE_VERSION` (ADR-257) surfaced by `sharpee --version`
(`Sharpee X · Chord Y`), replacing ADR-185's platform-version compatibility
assumption. A story written for a newer Chord than the IDE knows gets a clear
warning rather than a mis-highlight.

## Acceptance

**Worked example.** The author opens `stories/fernhill/fernhill.story` — a folder
with no `package.json`, no `node_modules`, no `src/` — and the IDE:

- highlights the Chord source with the in-process Swift lexer (D7),
- shows the story's rooms/objects/NPCs in the project tree **before any build has
  run**, updating as the source changes (D6),
- reports `analysis.*` gate failures in Problems with their stable codes, clicking
  through to `.story:line:column` (D5),
- builds with `sharpee build fernhill.story` and plays `dist/web/fernhill/` in the
  Play pane, honoring fernhill's own `browser/index.html` (D4).

**Done when:**
- Opening a bare `.story` folder never prompts for, or runs, `npm`/`node_modules`/
  `init-browser`; no code path references `src/browser-entry.ts` (D2, D3).
- Build and Play resolve `dist/web/<id>/` from the IR header, verified end-to-end
  against fernhill (D4).
- `sharpee compose --json` emits the versioned diagnostic schema **plus the IR, with
  no load-proof**, composes with `--check` (gates only, no IR), and leaves the default
  text output unchanged (D5).
- `--json` on a story whose hatch modules cannot resolve still returns gates and IR —
  proving the editor path never imports author TypeScript (D6).
- The Swift decoder **fails visibly** on an unrecognized `schemaVersion` instead of
  decoding partially — asserted by feeding it a bumped-version payload (D5).
- Every Chord `Diagnostic` severity — error *and* warning — reaches Problems with its
  stable `code` and its **full** span, underlining `column`→`endColumn` rather than a
  guessed range (D5).
- The project tree populates for fernhill **from a clean checkout with no `dist/`**,
  and clicking a node opens the exact authored span — no name-matching fallback
  anywhere in the path (D6).
- Introducing a syntax error mid-file leaves the tree **populated and marked stale**
  while Problems shows the new error; fixing the error un-stales it. A `.story` that
  has never compiled cleanly shows an empty tree with a stated reason (D6).
- A recents entry pointing at a TypeScript project is dropped on load rather than
  offered and failing at open (D8).
- `TSCDiagnostic`, `BrowserEntry`, and the `TreeSitterTypeScript` bindings are gone
  from `project.yml` and the source tree, with their tests (D3); `project.yml`
  declares **no** tree-sitter dependency (D7).
- The golden token stream is committed, and **both** pins are live: the
  `@sharpee/chord` vitest reddens in existing CI when `lexer.ts` drifts from the
  golden, and the Swift XCTest reddens when `ChordLexer` does. Each is demonstrated
  by a deliberate mismatch during review (D7).
- The IDE suite is green **at every commit**, not only at the end of the arc (D3).
- The IDE's real-path tests (`BuildRunner`, and the runner that replaces
  `IntrospectionRunner`, ADR-185) drive the **real** `sharpee` bin against a **real**
  `.story` — no stubbed toolchain (rule 13a).
- `tools/ide/README.md` no longer claims "Phase 0 — empty 3-pane shell" (stale since
  P1–P5 shipped).

## Consequences

- **The IDE is single-language.** A TypeScript story author has no IDE. Accepted:
  Chord is the author language; TS stories are a platform-developer concern.
- **One platform command changes, additively** (D6 removed the second command this
  ADR was drafted with), and per CLAUDE.md it needs explicit sign-off — this ADR is
  that discussion: `compose` gains a `--json` mode that emits gates + IR without the
  load-proof (D5), with the default text output unchanged. `introspect` is
  deliberately **not** extended to Chord.
- **ADR-184's mechanism is inverted, its deliverable kept.** The tree survives; the
  runtime-world introspection behind it does not. `sharpee introspect`,
  `@sharpee/bootstrap`'s `buildManifest`, and `@sharpee/ide-protocol`'s
  world-shaped `ProjectManifest`/`SourceRef` lose their only consumer when the TS
  author path goes. This ADR does not delete them — they remain valid for the
  TypeScript/world-model path — but it should be recorded that they are now
  **unowned by the IDE**, and a later ADR may retire them.
- **The tree is blind to runtime-created entities** (D6). If that becomes a real
  authoring complaint, the fix is the hybrid this ADR declined — IR spine plus
  post-build world enrichment — not a return to world-sourced introspection.
- **A new IDE-facing wire schema** — the diagnostic JSON (D5) joins `ProjectManifest`
  as a versioned contract in `@sharpee/ide-protocol`. Because the consumer is Swift,
  nothing compiles the two sides together; the schema must be versioned explicitly and
  the Swift decoder must fail loudly on an unknown version rather than silently
  dropping fields.
- **ADR-182 is superseded** outright (its tree-sitter TypeScript highlighting has no
  successor — D7 uses no grammar at all), and **ADR-184's mechanism is superseded**
  while its deliverable survives (D6). ADR-185's project model survives in shape —
  "the open folder is the story" — but loses its npm-project prerequisites (D2).
- **A second Chord tokenizer now exists** (D7) — a real duplication of language
  surface, accepted because highlighting needs only tokens and the editor hot path
  stays in-process. The cost is a standing conformance obligation: the Swift lexer
  and the TS lexer are both pinned to a committed golden token stream, enforced from
  the TypeScript side where CI actually runs, so a Chord lexer change that the port
  misses is a **CI failure**, not a silent mis-highlight. This joins ADR-257 D3
  (`chord.ebnf`) as an enforced language-surface pin.
- **The IDE's own suite remains outside CI.** D7 pins the lexer, but the other 27 test
  files in `SharpeeIDETests/` have never run anywhere but a local Xcode. This ADR
  records that gap rather than closing it; a macOS CI job is a worthwhile follow-up.
- **The IDE sheds tree-sitter entirely** — `TreeSitterTypeScript` leaves with D3 and
  nothing replaces it, so `project.yml` loses the dependency rather than swapping it.
  Consequence for later phases: features that would want a parse tree (outline,
  folding, ADR-184-era trait hints) have tokens only, and must either work from
  tokens or source their structure from the tree path (D6).
- **The IDE gains a Chord version dependency** (D9) — a language bump is now a thing
  the IDE can be behind.
- **The tree can show stale structure** (D6). Retaining the last `ok` IR is what makes
  a live tree possible against an atomic-load language, but it means the tree may
  briefly describe source the author has already changed. Mitigated by marking it
  stale and by Problems always tracking the current source — not by trying to build a
  tree from a failed compile.

## Session

Session 341218 (2026-07-23, branch main). David returned to the IDE after the Chord
arc and ruled **Chord-first, TypeScript path dropped**. The four breakages in Context
were traced in source before drafting — the initial framing was "the IDE needs Chord
support added," which the code did not support: introspection is build-gated on an
artifact Chord never emits, and Play's path predates the `dist/web/<id>` layout. The
IDE was not stale-but-working; it was already broken against the current author
language.

Q-1–Q-4 were resolved by interview in the same session. Two answers changed the
ADR's shape rather than just filling a blank: **Q-3** (IR-sourced tree) removed a
platform change the draft had assumed — `introspect` needs no Chord path, because
`compose` already yields both the diagnostics and the IR — and retired ADR-184's
name-matching source index outright. **Q-1** (Swift lexer port) dropped tree-sitter
from the IDE entirely rather than swapping one grammar for another. Both moved work
*out* of the plan.

`adr-review` then scored the result **9/15 — NEEDS WORK**, with three blockers, all
of which came from checking the draft's claims against source rather than reading it
for coherence:

1. **The live tree contradicted ADR-210's atomic load.** `CompileResult.ir` is
   meaningful only when `ok` (`index.ts:57`), so a tree bound naively to `compile()`
   would blank on every half-typed line. Fixed by specifying last-`ok`-IR retention
   with a stale marker (D6).
2. **"One platform change" undercounted the work.** No existing `compose` mode yields
   gates + IR without the load-proof — `--check` emits no IR, the default resolves
   hatch modules. `--json` is now specified as that mode, and the CLI-contract change
   is recorded as a decision rather than waved off as implementation (D5).
3. **The conformance pin enforced nothing.** D7 claimed a CI failure, but no workflow
   runs `xcodebuild` or any Swift test. David chose the TS-side golden fixture, so the
   pin now lives where CI already runs (D7) — and the fact that the IDE's other 27
   test files have never been under CI is recorded rather than papered over.

Also folded: the hatch-resolution boundary (D6), persisted-state handling (new D8),
an explicit `schemaVersion` contract with loud decoder failure (D5), and five ACs
covering the states the draft left undefined.
