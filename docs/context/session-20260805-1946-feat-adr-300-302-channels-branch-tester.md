# Session Summary: 2026-08-05 19:46 CDT - feat/adr-300-302-channels-branch-tester

## Goals
- Amend ADR-131 with the ADR-303 D6 widening (a short-term open item from session f2a7e6).
- Then: decide the fate of the package CLIs, and build what their retirement requires.

## Phase Context
- **Plan**: `docs/work/branch-tester/plan-20260805-branch-tester.md` — 11 phases, all COMPLETE. No phase advanced; this session paid a documentation debt and then started the CLI retirement, which the plan does not cover.

## Completed

### 1. ADR-131 amended — scope question closed, widening recorded
The "SCOPE QUESTION OPENED" header note is replaced by **SCOPE WIDENED**, with four
changes underneath it: the **two modes** stated in the Decision as a table (baseline
vs reachability, with Phases 1–4 marked as the baseline mode and reachability cited to
ADR-303 D5); a **label collision** called out (ADR-303 D5's *routine*/*deep* modes sit
**inside** reachability, they are not alternatives to baseline); the **static half's
destination named as the IDE**, with *Implementation Location* adding that it must not
sit behind `--explore` because it reads `--world-json` without running the engine; and
the **retraction recorded rather than deleted** — the old "widening would replace its
premise" objection, with D5's answer-key replay as the reason it fails.

Four consequences added (a winning path is now a prerequisite; findings are candidates
not failures; they report via ADR-293 D15 and not the point catalog; the move removes a
shipped VS Code feature, so it is incomplete until the IDE renders the World Index).
*Starting Point* annotated: its single all-puzzles-solved save is a baseline-mode
requirement, not an explorer-wide one.

**Amended ahead of its trigger, and said so in both files.** ADR-303 D6 names whoever
accepts ADR-303 as the owner, with acceptance as the trigger; ADR-303 is still DRAFT.
ADR-131 carries an "Amended ahead of its trigger" paragraph, and ADR-303 D6 gains a
dated **DISCHARGED EARLY** note correcting its now-false "ADR-131 stands unamended"
sentence. Accepting ADR-303 to satisfy the trigger was rejected: it scored 7/17, and
flipping a Status line to unlock a doc edit is the rot pattern, not a fix for it.

### 2. Issue #225 disproved, and a real story defect found underneath it
#225 claims the package CLIs "cannot load any story." **False** — `stories/dungeo` runs
through `packages/transcript-tester/dist/cli.js` (2 passed). The failure was confined to
`cloak-of-darkness`, which imported **two** type-only symbols in value position:
`IScopeRule` (`@sharpee/world-model`) and `Story`/`StoryConfig` (`@sharpee/engine`), all
three confirmed TYPE ONLY by importing the built ESM barrels and checking membership.
Both fixed with `import type`; the story now loads and runs 82 tests.

**A separate finding, unfiled:** the two paths do not run the same artifact. Package CLI
gives 63/82, the bundle gives 81/82 on identical transcripts — the bundle prefers the
lone `cloak.story` (Chord) while the package CLI loads the TS module story at
`src/index.ts`. Cloak-of-darkness has two divergent implementations.

**Not established:** how `src/index.ts` is loaded at all. There is no `dist/`, and the
CLI registers no TS loader hook. An earlier claim in-session that "the bundle hides this
because esbuild strips types" was inference and is withdrawn. What is verified is the
causal chain: three runs, each changing one thing, error moved `IScopeRule` → `Story` →
loads.

### 3. `sharpee test --tree` — devkit gains the tree harness
The retirement's blocking prerequisite: `branch-test` was the only author-facing entry
to ADR-302's harness.

- **`packages/branch-tester/src/game-factory.ts`** — `createRootGameFactory`, the one
  implementation of D17's re-pin rule (a root booted at every fork below it must land on
  the same master seed). Exported from the package index.
- **`packages/branch-tester/src/cli.ts`** rewired to it — one hand-copied
  `freshGameForRoot` gone.
- **`packages/devkit/src/commands/test-tree.ts`** — the `--tree` run model over devkit's
  own `loadAuthorGame`, so Chord `.story` projects work. The `branch-test` bin never
  could: Chord compilation lives in the bundle.
- Flag wiring in `test.ts`, usage text in `cli.ts`, `@sharpee/branch-tester` added to
  devkit's dependencies.

**Two guards made loud rather than silent.** `--tree --chain` exits 2 (ADR-302 D10
retires `--chain`; honouring one silently would hide which model ran). `--tree --json`
exits 2 because the ADR-277 record stream still carries no parentage, no `unreached` and
no replay markers — a tree emitted through it would render as a flat run. **That guard
should be removed the moment the IDE wire lands.**

### 4. The bundle's copy retired too
`scripts/bundle-entry.js` carried the third copy. It now calls
`branchTester.createRootGameFactory`. What stays in the bundle is what is genuinely the
CLI's: `resolveSeed`, carrying ADR-293 D1 precedence (`--seed` | `--vary` → `seed:` →
clock). It runs *inside* `load`, so an override wins on the first boot and on every
re-boot.

### 5. Step 2 — `test:npm` re-pointed at `sharpee test`
`tools/repokit/src/consumer-gen.ts`'s harness constant moved from
`@sharpee/transcript-tester` to `@sharpee/devkit`, and `test-npm.ts` now spawns
`npx sharpee test .` instead of `npx transcript-test .`. The result field
`haveTranscriptTester` became `haveHarness`; the `#201` closure-vendoring logic is
unchanged, it just walks devkit's closure instead.

The proof is now **stronger than what it replaced**: an outside author runs
`sharpee test`, never the package bin, so the consumer test exercises the command
authors actually type.

**Real-path verified (rule 13a), not stubbed**: `./repokit test:npm stories/dungeo
--local --transcripts 'tests/transcripts/again-minimal.transcript'` → real `npm
install` (79 packages), real `npx tsc`, real `npx sharpee test` → `2 passed`,
`RESULTS: 1 passing, 0 failures`.

**Three findings from running it for real:**
- **`test:npm` is broadly red across the repo, for reasons that predate this work.**
  The familyzoo tutorial dies at `npx tsc` (#224) before the harness is reached, so it
  could not serve as the proof corpus. `cloak-of-darkness` dies differently — its
  `src/test-runner.ts` still imports `@sharpee/text-service`, removed by ADR-174.
  Two stories, two distinct stale-source failures. This is the concrete form of "a
  gate that has been red and ignored."
- **`stories/family-zoo-tutorial` has no transcripts at all** — the tutorial corpus
  with tests is `tutorials/familyzoo/v2.0.0/`.
- **`packages/devkit/src/consumer-gen.ts` is dead code.** It has no non-test caller;
  only its own two test files import it. It is a stale copy of the function repokit
  now owns (ADR-180/187 moved `test:npm` to repokit) and it has **drifted badly** — it
  lacks `assertVendoredClosureComplete`, npm-12 pack parsing, memoized packing, and
  the whole #201 dev-closure fix. Not deleted; flagged.

### 6. Steps 3 and 4 — the bins are gone, the docs and issues follow
**Step 3.** `bin` removed from `packages/transcript-tester/package.json`
(`transcript-test`) and `packages/branch-tester/package.json` (`branch-test`).
Neither `cli.ts` is deleted: both are relabelled **dev-only entry points** in their
header docs, help text and index barrels, with the invocation spelled as
`node packages/<pkg>/dist/cli.js`. transcript-tester's survival has a stated reason —
it is the only surface that runs a story through Node's real ESM resolver, which is
how #225's defect was found and what the bundle's esbuild path cannot do.

Fixed in passing: branch-tester's help text advertised **`transcript-test`** and
`stories/dungeo` throughout — a copy-paste artifact of ADR-302 D15's full-copy. It now
names its own entry point and `branch-stories/fernhill`.

**Step 4.** ADR-185's "No `npx`" bullet gained a dated amendment: `npx transcript-test`
is no longer a choice, because the bin does not exist — the transcript step is
`sharpee test`, which is what that bullet already wanted. [#225](https://github.com/ChicagoDave/sharpee/issues/225)
closed with the real cause. Two new issues filed:
[#231](https://github.com/ChicagoDave/sharpee/issues/231) (cloak's two divergent
implementations) and [#232](https://github.com/ChicagoDave/sharpee/issues/232) (devkit's
dead, drifted consumer-gen).

### 7. #232 resolved by PROMOTION, and the filing was wrong
Two of the issue's three claims did not survive checking. It is **not dead** —
`commands/standalone-build.test.ts` uses `generateConsumer` to build the installed
project for devkit's integration gate. And the suggested fix (delete, or re-export
repokit's) is rejected by **ADR-187 R1** by name:

> repokit is the in-repo **proving ground** … then **explicitly ported to devkit when
> hardened**. The duplication is a deliberate staging gate … A shared module would
> couple the shipped author tool to in-progress platform-dev work.

The re-export was impossible regardless: `tools/repokit` is `"private": true` and
absent from `ts-forge.config.json`, so a published devkit could never import it.

The one true claim — four fixes behind — is, under ADR-187, an **overdue promotion**.
repokit's hardened `consumer-gen.ts` and its tests were walked across by hand
(`assertVendoredClosureComplete` / #201, npm-12 `npm pack --json` parsing, memoized
packing, dev-closure vendoring), the harness constant became `@sharpee/devkit`, and
the file header now carries the ADR-187 reasoning plus an explicit "do NOT collapse
these" so the issue is not re-filed. devkit `consumer-gen.test.ts`: **17 passed**.

### 8. The tree's npm-consumer gap, closed
`test:npm` only ever ran the flat path, so `sharpee test --tree` was verified purely
in-repo — on the side of the workspace-symlink line where #225's class of defect is
invisible.

**`branch-stories/tree-npm-fixture/`** is a new dedicated fixture: the smallest module
story that forms a tree. Fernhill could not serve — it is a bare Chord `.story` with no
`package.json` and no `src/`, both of which `test:npm` requires. The shape is one root
with **two** children on purpose: a single child would continue the live engine and
replay nothing, so it would not exercise D17 at all.

`test:npm` gained `--tree`, mutually exclusive with `--chain` (D10), invoking the tree
as ONE call because D11 assembles and validates before executing — a per-file tally
would misreport a cascade as several failures (D13).

**Caught a real defect on its first run**: the fixture had no `createStory()` export,
and the tree run failed with the ADR-248 factory-contract error. Fixed; the gap-closing
test earned its keep before it was even green.

### 9. The type-as-value sweep — a class, not the incident #225 looked like
The cloak fix in §2 was one instance. A detector built against each package's
**built ESM barrel** found **1,191 type-only symbols in value-import position across
456 files** — 589 in stories, 602 in packages/tools.

**The correlation that explains the silence.** It manifests only when a story has
**no built `dist/`**. With one, tsc elides the type import into the CJS emit and
nothing breaks — which is why `stories/dungeo` carries 184 offending files and still
ran clean through the package CLI earlier in this same session. Not harmless: one
`rm -rf dist` or one `verbatimModuleSyntax` and they are 184 compile errors. Live
exposure was the four dist-less stories (armoured, thealderman, concealment-test,
channel-service-test).

**The discriminator that made it safe.** Absent from a runtime barrel has TWO causes
— the symbol is a type, or the symbol was **deleted**. Marking the second `type`
would dress a real error as a valid import. Checking the package `.d.ts` surface
splits them, and it caught **14 stale imports of names that exist nowhere**. Renamed
where a replacement exists (`SemanticEvent`→`ISemanticEvent` ×3, `Trait`→`ITrait`,
`GameEvent`→`IGameEvent`, `ParsedCommand`→`IParsedCommand`,
`ValidatedCommand`→`IValidatedCommand`); left as hard errors where genuinely gone
(`ActionResult` ×3, `ParseResult`, `BasicParser`, `standardVocabulary`,
`createStandardEngine` — all in `examples/` and test fixtures, which is why they
rotted unseen).

The edit is one inline `type` modifier per offender, so the diff never restructures
an import block.

**One sweep edit went wrong, and the suite caught it.** A match landed inside a
STRING LITERAL that *emits* an import — repokit's grammar generator — so the
generator began emitting a line the committed artifact lacked, breaking the ADR-269
D7 freshness gate. `GrammarBuilder` really is type-only, so the generator change was
kept and `packages/parser-en-us/src/grammar.ts` regenerated to match (one line)
rather than the generator reverted. The whole diff was re-checked for other
emitted-string hits; that was the only one.

### 10. Collateral fixes the sweep exposed
- **devkit's real-path gate restored.** `browser-core-build.test.ts` pointed at
  `stories/fernhill`; ADR-302 D16 moved Fernhill to `branch-stories/`. It is a rule
  13a real-path test, so a vanished fixture turns the gate into a no-op.
  **129 passed/2 failed → 131 passed.**
- **`@sharpee/text-service` removed** from `stories/concealment-test` and
  `packages/interpreter` package.json — ADR-174 deleted that package; both still
  declared it.
- **`cloak-of-darkness/src/browser-entry.ts`**: `DOM` added to tsconfig `lib`, the
  three dialogs cast to `HTMLDialogElement`, `modalOverlay` dropped (ADR-170 moved to
  native `<dialog>`, which brings its own backdrop; `DOMElements` has no such field).

### 11. Cloak's demo runners revived
`test-runner.ts` and `debug-runner.ts` had been dead since ADR-174: they imported
`@sharpee/text-service` plus a `@sharpee/text-services` that appears never to have
existed, and built a `GameEngine` with a `textService` field the config no longer
has. Cloak's `play` script points at `test-runner`, so **that script had been broken
the whole time**.

Rewritten rather than deleted — they demonstrate driving the engine with static
dependencies, and the modern shape is a small change: `text:output` carries
`ITextBlock[]`, and a console client renders each block with `extractPlainText` from
`@sharpee/text-blocks` (added as a dependency). **Both actually run**, not merely
compile. `stories/cloak-of-darkness` now type-checks **clean**.

Side effect verified rather than assumed: building them produces a `dist/` where
there was none, which changes what the package CLI loads (19 → 20 failures). The
bundle is unaffected at 81/82 — it still prefers the lone `cloak.story`.

## Key Decisions

### Extract rather than write a third copy
`freshGameForRoot` existed twice and the session-f2a7e6 notes record the second copy
biting twice. A devkit copy would have been the third. Extraction was verified safe
first: the two copies read the root's seed from **different fields**
(`transcript.seed` vs `config.seeds[0]`), which looked like a live bug until
`parseTranscriptFile` on a Fernhill root showed the parser mirrors `seed: 42` into both.
The divergence is **latent** — only a `seeds:` matrix root would split them. The helper
prefers the singular pin and falls back to the matrix, with a test pinning that.

### Sweep the class, but never guess a deleted symbol into a type
The cheap version of the sweep — "not in the runtime barrel, so mark it `type`" —
would have silently converted 14 genuine errors into valid-looking imports. The
`.d.ts` check is what makes a mechanical sweep of 1,191 sites defensible; without it
the sweep would have *hidden* rot while appearing to clean it.

### Keep `test:npm`
Asked whether the npm-consumer regression is still needed. It is: it is the only thing
in the repo that reports #224 (the Family Zoo tutorial no longer type-checks against the
platform). `./repokit verify` is `tsf build --npm` plus a publish **dry-run** — it proves
the tarballs form, not that they work installed. Deleting it makes #224 unobservable, and
the tutorial is what the book ships. The fair critique stands: it has been red and
ignored, which launders confidence. Repair deliberately, do not let the bin question
decide it by side effect.

## Verification — all executed 2026-08-05 in-session

- Fernhill tree via **devkit**: `22 passed`, `552 commands (518 authored + 34 replayed)`.
- Fernhill tree via the **rebuilt bundle**: identical — `22 passed`, `552 commands (518
  authored + 34 replayed)`. Seed announcements: 5 lines, `Seed: 42 (seed:)`, one per
  root and not one per fork.
- `--seed 99` override: `5 Seed: 99 (--seed)` — the CLI precedence survives extraction.
- **Dungeo v1 chain**: `952 passed` in 17 transcripts — matches session f2a7e6 exactly.
- `branch-tester`: **360 passed (28 files)**, up from 352 (+8 for `game-factory`).
- `devkit` `test.test.ts`: **12 passed** (+4), including a real Chord compile and a real
  tree run asserting D17 arithmetic exactly: `4 commands (3 authored + 1 replayed)`.
- `tools/vscode-ext/src/world-explorer.ts` read before its behaviour was written into
  ADR-131: one-way exits at 283–291, dead ends at 356.
- `repokit`: **81 passed, 1 skipped (9 files)** after the harness swap.
- **npm consumer real-path** (rule 13a): `./repokit test:npm stories/dungeo --local
  --transcripts 'tests/transcripts/again-minimal.transcript'` → `added 79 packages`,
  `npx tsc` clean, `npx sharpee test` → `2 passed`, `RESULTS: 1 passing, 0 failures`.

### After the bins were removed (step 3), everything re-verified
- `transcript-tester` **253 passed (21 files)**; `branch-tester` **360 passed (28 files)**.
- Staged tarballs carry no bin: `grep -c bin` on both staged `package.json` files → `0`.
- npm consumer proof re-run against the bin-less tarballs → `RESULTS: 1 passing, 0 failures`.
- Dev-only entry point still runs: `node packages/transcript-tester/dist/cli.js
  stories/dungeo …` → `2 passed`.
- Fernhill, both paths, after a bundle rebuild → `22 passed`, `552 commands (518
  authored + 34 replayed)`.
- Repo-wide grep for live `transcript-test`/`branch-test` invocations: only a stale
  `package-lock.json` entry under `tutorials/familyzoo/v2.0.0/`, which regenerates.

### The tree's npm-consumer proof (§8) and the #232 promotion (§7)
- `./repokit test:npm branch-stories/tree-npm-fixture --local --tree` → `added 75
  packages`, `npx tsc` clean, tree run → **`3 passed`, `4 commands (3 authored + 1
  replayed)`**, `RESULTS: 3 passing, 0 failures`. The replay count is the D17
  arithmetic, now proven through a real install rather than only in-repo.
- Same fixture through the bundle → identical: `3 passed`, `4 commands (3 authored +
  1 replayed)`.
- Guard: `./repokit test:npm … --tree --chain` → `--tree and --chain are mutually
  exclusive`.
- `repokit` **81 passed, 1 skipped**; `branch-tester` **360 passed**; `devkit`
  **129 passed** (2 pre-existing `browser-core-build` failures on the moved Fernhill
  path, later fixed in §10).

### After the repo-wide sweep (§9–§11)
- `tsf build` **clean on both targets** (CJS and ESM).
- core **176**, world-model **1453**, engine **627**, stdlib **1604**,
  event-processor **24**, parser-en-us **311**, lang-en-us **430**,
  branch-tester **360**, transcript-tester **253**, devkit **131**, repokit **81**.
- Dungeo walkthrough chain **952 passed**; Fernhill tree **22 passed**,
  **552 commands (518 authored + 34 replayed)**.
- npm consumer proofs re-run against re-staged tarballs: tree **3 passing, 0
  failures**; flat **1 passing, 0 failures**.
- cloak via the bundle **81 passed, 1 failed** — unchanged by the new `dist/`.
- Both revived runners executed, not merely compiled: `test-runner` renders the
  Foyer and the grue line; `debug-runner` prints its world-state dump.

## Files Modified

**Docs** (3): `adr-131-automated-world-explorer.md`,
`adr-303-convergent-paths-and-unwinnable-states.md`,
`adr-185-ide-standalone-authoring-tool.md`.

**Platform** (10): `packages/branch-tester/src/{game-factory.ts (new),index.ts,cli.ts}`,
`packages/branch-tester/package.json` (bin removed),
`packages/devkit/src/{commands/test-tree.ts (new),commands/test.ts,cli.ts}`,
`packages/devkit/package.json`, `packages/transcript-tester/src/{index.ts,cli.ts}`,
`packages/transcript-tester/package.json` (bin removed), `scripts/bundle-entry.js`.

**Build tooling** (2): `tools/repokit/src/consumer-gen.ts`,
`tools/repokit/src/commands/test-npm.ts`.

**Tests** (3): `packages/branch-tester/tests/game-factory.test.ts` (new),
`packages/devkit/src/commands/test.test.ts`, `tools/repokit/src/consumer-gen.test.ts`.

**Story** (1): `stories/cloak-of-darkness/src/index.ts` — two type-only import fixes.

**The sweep (§9–§11)** — 456 files beyond the above: 197 under `stories/` +
`branch-stories/`, 259 under `packages/` + `tools/`. Plus
`packages/parser-en-us/src/grammar.ts` (regenerated), `tools/repokit/src/commands/grammar.ts`,
`packages/devkit/src/standalone/browser-core-build.test.ts`,
`packages/interpreter/package.json`, `stories/concealment-test/package.json`, and
`stories/cloak-of-darkness/{package.json,tsconfig.json,src/browser-entry.ts,src/test-runner.ts,src/debug-runner.ts}`.

## Open Items

### Short Term
- **The retirement is COMPLETE** — all four steps landed, and so is the sweep.
  [#231](https://github.com/ChicagoDave/sharpee/issues/231) is the only issue this
  session opened and left open.
- **#231 is an authoring decision, not a defect to fix.** Cloak's module story and
  Chord story are different implementations with different prose ("You take off the
  velvet cloak", the Cloakroom description, the darkness handling). Reconciling them
  means writing story content to match one side — David's call. Investigated
  expecting one root cause; it is not that.
- **`test:npm` is still red for familyzoo (#224)** — the tutorial does not type-check
  against the platform, and it dies at `npx tsc` before the harness is reached. Cloak's
  half of this is now **fixed** (§10/§11). #224 matters more than it used to: the gate
  is genuinely useful again, having caught the tree fixture's missing `createStory()`
  within seconds of first running.
- **Neither `cli.ts` is deleted** — removing a `bin` entry unpublishes the command
  without destroying the code. Deletion is a separate, explicit decision.
- **`examples/` and test fixtures are excluded from every build**, which is how five
  references to deleted symbols survived (`ActionResult`, `ParseResult`,
  `BasicParser`, `standardVocabulary`, `createStandardEngine`). They are left as
  honest errors; a decision is owed on whether those example files should be
  repaired, compiled, or removed.
- **The IDE Testing wire is still unstarted** — and now has a second dependant: the
  `--tree --json` guard exists only because the stream carries no tree records.
- **ADR-303 is DRAFT and should stay there** — no ACs, no test requirements, no
  implementation section, three undefined interfaces.

### Long Term
- ADR-302 **D6** (coverage of untaken divergences) still has no implementing phase.
- ADR-131 remains **unbuilt**; the widening enlarges a design that does not exist yet.
- The static-half move is recorded but not performed, and per the new consequence
  `world-explorer.ts` must not be deleted until the IDE renders the World Index.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Rollback Safety**: seven independently revertible commits — `56d76928` (ADR-131
  widening, docs only), `86e664f9` (the retirement), `6f890e56` (the tree npm proof +
  the #232 promotion), `2bb994fa` (summary), `dacee31c` (stories sweep),
  `17ba30df` (platform sweep + collateral), `b3341015` (cloak runners). The bundle
  change is one hunk in `runBranchTree`; the extracted helper is additive; both
  sweeps are one inline `type` modifier per site and revert cleanly.
- **Landed**: PR [#233](https://github.com/ChicagoDave/sharpee/pull/233) → `b8b2c468`
  and PR [#234](https://github.com/ChicagoDave/sharpee/pull/234) → `9faa82af`, both
  merged 2026-08-06. Branch level with `main`; working tree clean apart from the
  untracked `scripts/clodpod.sh`.
- **Issues**: [#225](https://github.com/ChicagoDave/sharpee/issues/225) and
  [#232](https://github.com/ChicagoDave/sharpee/issues/232) closed;
  [#231](https://github.com/ChicagoDave/sharpee/issues/231) (cloak's two divergent
  implementations) left open.

## Architectural Decisions
- No new ADR. Discharges the ADR-303 D6 amendment obligation. **Possibly ADR-worthy and
  not yet raised**: retiring a published bin and relocating the npm-consumer proof to
  devkit is a dependency-direction change a future session would otherwise re-litigate.

## Mutation Audit
Behavior Statement produced before tests (rule 12) for `createRootGameFactory`: DOES —
invokes the caller's `load` with the root's entry/channels/stem and a seed; on a root's
first boot records `masterSeedOf(game) ?? declaredSeed(root)` and calls `onFirstBoot`
once; on every later boot of that stem passes the recorded seed instead of re-reading the
header. REJECTS WHEN — nothing; a throwing `load` propagates unchanged and remembers
nothing, and `masterSeedOf` returning undefined falls back to the declared pin. Each line
has a test (8 cases). The `mutation-verification` agent was not run — subagents are
disabled in this session's configuration.

## Test Coverage Delta
- **+12 tests**: 8 in `branch-tester/tests/game-factory.test.ts`, 4 in devkit's
  `test.test.ts`.
- **+2 restored**: devkit's `browser-core-build` real-path cases, which had been
  failing on a stale fixture path and were therefore proving nothing (§10).
- The sweep (§9) added no tests by design — it is a type-position change with no
  runtime semantics. Its safety comes from `tsf build` on both targets plus every
  package suite, which is what caught the grammar-generator regression.
- Known untested: `test-tree.ts`'s exit-3 path (a boot failure mid-tree) has no unit
  test; it is covered only by inspection. ADR-302 D6 remains unimplemented.
