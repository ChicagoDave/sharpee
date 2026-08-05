# Session Plan: Channel dissolution, then `@sharpee/branch-tester` (ADR-300 + ADR-302)

**Created**: 2026-08-05 (session 5113ca) · **Re-sequenced** the same session, see Sequencing
**Source ADRs**: [ADR-300](../../architecture/adrs/adr-300-addressable-channels-and-canonical-transcript.md) (remaining decisions) and [ADR-302](../../architecture/adrs/adr-302-transcript-branches.md) (ACCEPTED 2026-08-05, 16 decisions, 9 acceptance criteria)
**Overall scope**: Finish ADR-300's channel model — dissolve `main`, add `preferred-layout`, close the Chord `record` seam — and only then build `@sharpee/branch-tester`, the tree-native harness where a transcript names its parent, every test is a branch, and running the harness runs every root-to-leaf path. `@sharpee/transcript-tester` is frozen on its grammar and runtime semantics afterwards, keeping Dungeo and the Family Zoo tutorial.
**Bounded contexts touched**: N/A — channels are platform infrastructure and the rest is test infrastructure. Touches `stdlib`, `engine`, every client, `packages/chord`, `story-loader`, a new `packages/branch-tester`, an in-repo story directory split, and a rewrite of Fernhill's tests.

## References consulted

- **ADR-300** — the channel model. Shipped: banner channel, record-valued channels, `[CHANNEL:]`, opening assertions, canonical serializer. Remaining, with the harness column added 2026-08-05: D8/D9 (dissolve `main`), D10 (Chord `record`), D13/D14 (**branch-tester only**, since D15 freezes `transcript-tester`'s grammar), D5 (`[EVENTS: N]`, before the copy), D1 (`.skein` retirement).
- **ADR-302** — D1 file-level parents, no interior addressing; D8 whole-header inheritance with override; D10 `--chain` retired, every path runs; D11 tree-native entry with eager whole-tree validation; D13 no unit tests, cascades report unreached; D14 filename identity, rename as a harness operation; D15 full copy, no shared code; D16 in-repo directory separation; D9/D12 Dungeo and the Family Zoo tutorial stay on `transcript-tester`.
- **ADR-293** — `forces:`/`point-seed:`, `CoverageTracker`, `searchOutcome`. ADR-302 D8's open implementation question (does a master `seed:` override re-seed a game restored from its parent's save, given the `{pointName → streamState}` map rides every save — D5/D7) lands in Phase 6 and is the one genuinely unknown mechanism in this plan.
- **ADR-178** — checked 2026-08-05: `STORY_RUNTIME_BASELINE` is 17 story-runtime packages plus `lz-string` and excludes `@sharpee/transcript-tester`, which is published anyway. A test harness needs no baseline entry and no umbrella registration; the umbrella's non-exhaustiveness is deliberate.
- **`feedback_new_package_config`** — applies only in part. Verified by grep 2026-08-05: `transcript-tester` is registered in `ts-forge.config.json` alone, in no `packages/sharpee/` file and not in the root `package.json`; what it needs beyond that is repokit awareness in four files. (The note's `build.sh` no longer exists — ADR-187 replaced it with `./repokit`.)
- **Session 5113ca work** — `transcript-tester`'s corpus sweeps are configured through `vitest.config.ts` rather than discovered (`tests/corpus.ts`), which is what lets a branch-tester story exist in the repo without breaking v1's suite.

## Platform-change checkpoint (read before starting any phase)

Every phase touches `packages/`. Per CLAUDE.md, **platform changes require discussion first** — ADR acceptance authorizes the design, not a blanket go-ahead to write code. Confirm scope with David at the start of each phase, not once at the top.

Three phases carry an additional gate:
- **Phase 1** rewrites 2921 assertions and re-blesses 21 goldens across every story. Mechanically safe behind a byte-identical run, but it touches the regression baseline wholesale — get explicit go-ahead.
- **Phase 10** rewrites Fernhill's 20 committed, passing test files.
- **`.skein` retirement** (side item) deletes working, tested Swift and a committed `play-testing/` directory. Explicit confirmation, never folded into cleanup.

## Deferred (not in this plan)

- **The editor** — ADR-301, TBD, blocked on its own open question (what hosts it).
- **Parallel execution and progress display.** ADR-302 D10 establishes the tree *permits* parallelism and commits to nothing about rendering. Phase 7 runs paths sequentially; parallelism is a follow-on once correctness is pinned.
- **`stories/friendly-zoo`** — out by ruling (ADR-302 D9/D12). Not migrated, not deleted. It still carries 183 `main`-reading assertions that Phase 1 must migrate like any other story.
- **Dungeo's 117 unit transcripts and GDT** — permanently on `transcript-tester`. Phase 1 migrates their assertions (unavoidable — channels are platform-level); nothing after Phase 1 touches them.

## Side items (not phase-ordered)

- **`[EVENTS: N]` removal** (ADR-300 D5, [issue #222](https://github.com/ChicagoDave/sharpee/issues/222)) — zero uses, safe under the freeze. **Do it before Phase 3**, so `branch-tester` inherits a clean grammar instead of the removal happening twice.
- **`.skein` retirement** (ADR-300 D1) — `tools/ide/SharpeeIDE/Skein/` and `stories/fernhill/play-testing/`. Independent of every phase; gated on explicit confirmation.

---

## Phases

### Phase 1: Dissolve `main`, add `preferred-layout` (ADR-300 D8, D9) — requires go-ahead
- **Tier**: Large · **Budget**: 400
- **Entry state**: `main` routes seven block keys through `stdlib/src/channels/standard.ts:132`. 2921 plain `contains` assertions read it implicitly — dungeo 1966, fernhill 584, friendly-zoo 183, cloak-of-darkness 103, others 85 — and 21 goldens store its output as `GoldenTurn.output`.
- **Deliverable**: `ROOM_NAME`, `ROOM_DESCRIPTION`, `ROOM_CONTENTS`, `ACTION_RESULT`, `ACTION_BLOCKED`, `ERROR`, `GAME_MESSAGE` each become their own channel; no channel means "the prose window". A `preferred-layout` channel states the engine's intended reading order, which a client may honour, reorder, or ignore. Every client renders the new set — the bundle CLI, `platform-browser`, the IDE's Play pane, zifmia. The corpus migrates and the 21 goldens are re-blessed.
- **Exit state**: **ADR-300 AC-5** — no client receives a channel whose contract is "append this to the main text area", and reordering `preferred-layout` changes what the player sees with no engine change. Walkthrough chain byte-identical across the migration except for the intended channel split.
- **Why first**: see Sequencing.
- **Status**: **COMPLETE** (2026-08-05, session 86e85a)
- **Outcome**: cheaper than the entry state predicted. The corpus held **zero** `[CHANNEL: main, …]` assertions — all 2921 read `main` implicitly through the composed turn text — so preserving the composition (`composeProse` in `preferred-layout` order, then the existing join rule) left every assertion and every recorded turn byte-identical. **The 21 goldens were NOT re-blessed**: each changed by one line, the provenance `channels:` field (`main` → `(none)`), and the chain then replayed 952 passing against its pre-existing recordings. A bless would have destroyed the evidence the exit state asks for.
- **Verified 2026-08-05**: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` → `952 passed`, `✓ All tests passed!`. Package suites: stdlib 1604, engine 609, channel-service 115, bootstrap 39, platform-browser 117, transcript-tester 252, world-model 1453, story-loader 472, chord 719 — all passing. `tsf build --npm` clean. AC-5 pinned by `packages/platform-browser/tests/channels/prose.test.ts`.
- **Found, not fixed**: [issue #223](https://github.com/ChicagoDave/sharpee/issues/223) — `info-channel-baseline.golden` pins a wall-clock `buildDate` inside its `◦ info` capture, so it breaks on every rebuild. Pre-existing (its body is byte-identical to the committed version); fixing it means growing ADR-294 D6's mask, which D6 says requires an amendment.

### Phase 2: Chord `record` block (ADR-300 D10)
- **Tier**: Large · **Budget**: 400
- **Entry state**: the engine builds record-valued channels (banner) but `define channel` in Chord describes only scalars, so an author cannot declare what the platform already emits.
- **Deliverable**: a `record` block in Chord with `list of` for repeated members — Chord parser, AST, IR wire types, and the loader's channel mapping.
- **Exit state**: **ADR-300 AC-6** — a `.story` file defines a record channel and the running game populates it, with no TypeScript escape hatch.
- **Note**: independent of every other phase. It is the item that closes the platform/Chord seam, and under "Sharpee and Chord must align as elegantly as possible" it is the highest-value standalone work here — it can move earlier if you want it sooner.
- **Status**: **COMPLETE** (2026-08-05, session 86e85a)
- **Shape decided in the building** (the ADR named neither): records do **not** nest — a member is a field, a text template, or a phrase, and nesting is a parse error by name; and absence has two spellings matching what `bannerChannel` already does — a `list of` member the turn did not carry is `[]`, a scalar member it did not carry is *omitted*, so `'x' in value` stays a real answer.
- **Language version — a judgment call worth your eye**: additive grammar, which ADR-257 D2 would ordinarily make a minor (3.0.0 → 3.1.0). Shipped **inside 3.0.0** instead, following the recorded 2026-08-03 freeze ruling (nothing at 3.x is published, so no released surface a minor would distinguish; and 3.1.0 is the exact number that ruling just retired). Only `chord.ebnf` and its recorded hash moved. Say so if you'd rather it were a minor.
- **Verified 2026-08-05**: chord 730 passing (was 719 — +11 grammar/analyzer cases), story-loader 480 (was 472 — +8 including AC-6), EBNF surface pin re-recorded and green, walkthrough chain 952 passed.

### Side item: `[EVENTS: N]` removal (ADR-300 D5, issue #222) — COMPLETE
- Done 2026-08-05, before Phase 3 as the plan required, so `branch-tester` inherits a clean grammar. Joined ADR-294's `REMOVED_FORMS` table (a parse error naming `[EVENT: true, type="..."]` as its replacement) and left the parser, model, serializer, reporter and runner. Zero corpus uses. transcript-tester 253 passing; [issue #222](https://github.com/ChicagoDave/sharpee/issues/222) closed.

### Phase 3: `branch-tester` package scaffold (ADR-302 D15)
- **Tier**: Medium · **Budget**: 250
- **Entry state**: Phase 1 landed, so the parser and assertion tier being copied are already channel-correct. `[EVENTS: N]` removed (side item).
- **Deliverable**: new package containing a **copy** of `parser.ts`, `serializer.ts`, `types.ts`, `golden.ts`, `coverage.ts`, `search.ts`, `story-loader.ts`, `runner.ts`, `reporter.ts`, `aggregate.ts` and their tests — no imports from `@sharpee/transcript-tester`, no shared substrate package. Its own `vitest.config.ts` following the corpus-configuration pattern.

  **Registration — measured against `transcript-tester`, not the generic checklist:**
  - `ts-forge.config.json` — a `tsconfig.json` entry. The only one of the six generic points that applies.
  - **repokit awareness in four files**, which Phase 11's gate depends on: `tools/repokit/src/repo.ts`, `consumer-gen.ts`, `commands/test-npm.ts`, `commands/test.ts`.
  - **Not** in the `sharpee` umbrella or the root `package.json` (ADR-178), and **no** `story-runtime-baseline` entry.
- **Exit state**: `branch-tester` suite green; `transcript-tester` still 252 passing and unmodified; `tsf build --npm` clean for both.
- **Verify**: `grep -r "@sharpee/transcript-tester" packages/branch-tester/src` returns nothing; `grep -rn "branch-tester" packages/sharpee/` returns nothing.
- **Status**: **COMPLETE** (2026-08-05, session 86e85a)
- **Registration was TWO points, not five** — a second measured correction to the same checklist `plan-review` already corrected once. `ts-forge.config.json` and repokit's `BUILD_ORDER` are the whole of it. The other three named here do not apply, measured by reading them: `commands/test.ts` is an unimplemented stub (`repokit test: not yet implemented`); `consumer-gen.ts` and `commands/test-npm.ts` build the **npm consumer closure for the Family Zoo tutorial**, and that tutorial stays on v1 permanently (ADR-302 D9/D12) — vendoring v2 there would ship a package the consumer never loads. Also deliberately NOT in `BUNDLE_ALIASES`: nothing in the CLI graph imports it yet.
- **Verified 2026-08-05**: branch-tester 248 passed + 5 skipped (the corpus sweeps skip — no corpus is configured yet, by design; see below); transcript-tester still **253** passing and unmodified; `tsf build --npm` clean for both; all four verification greps clean (no v1 import from v2 src, absent from the umbrella, the root `package.json`, and `story-runtime-baseline`); walkthrough chain 952 passed.
- **Corpus deliberately unconfigured**: `packages/branch-tester/vitest.config.ts` names no root. v2's stories are the ones that will carry `continues:`, and the D16 directory split is Phase 10 — pointing the sweeps at `stories/` meanwhile would run v1's corpus through v2's parser, the exact cross-harness reading D16 exists to prevent. The 5 sweeps skip until a root is named.

### Phase 4: `continues:` grammar, model, and tree assembly (ADR-302 D1, D2, D4, D11)
- **Tier**: Large · **Budget**: 400
- **Entry state**: Phase 3's package exists with a copied parser.
- **Deliverable**: `continues:` in branch-tester's header grammar — filename stem, no extension, no path, same story. Model gains the parent reference. **Tree assembly becomes the entry point**: read every header in a story, build the tree, validate it whole, report every defect together before executing anything — missing parent, cycle, cross-story pointer. Diamonds are unrepresentable; a file nobody points at is a root.
- **Exit state**: **AC-2** — a `continues:` carrying a turn reference, path, or extension is rejected by name. **AC-6** — a story with a missing parent, a cycle, and a cross-story pointer reports all three and executes nothing.
- **Note**: `transcript-tester`'s grammar does not gain `continues:` (D15 freeze).
- **Status**: PENDING

### Phase 5: Header inheritance, and the seed-on-restore question (ADR-302 D8)
- **Tier**: Medium · **Budget**: 250
- **Entry state**: Phase 4's tree lets a child resolve its ancestors.
- **Deliverable**: effective header = parent's effective header with the child's declared fields replacing them, applied transitively. **Then settle the open implementation question by experiment against the real engine**: whether a master `seed:` override on a non-root re-seeds a game restored from its parent's save, and what that does to the `{pointName → streamState}` map the save carries.
- **Exit state**: **AC-3** — a child with no seed runs at its parent's, one with its own runs at its own, asserted on the resolved header. The finding is written back into ADR-302 D8 as measured behavior, replacing the open note.
- **Risk**: if a master-seed override cannot coherently apply to a restored save, D5's header-only variation becomes `point-seed:`/`forces:`-only. That is an ADR amendment — stop and raise it, do not engineer around it.
- **Status**: **INHERITANCE COMPLETE; SEED QUESTION SETTLED AND BLOCKED ON AN ADR DECISION** (2026-08-05, session 86e85a)
- **Inheritance half — done.** `effectiveHeader` / `effectiveConfig` in `packages/branch-tester/src/tree.ts`; **AC-3 green**. Needed a new `Transcript.declaredConfigKeys`, because `config` always carries defaults and so its *value* cannot say whether the author wrote it — `events: false` means both "declared" and "silent", and inheritance has to tell them apart. `continues:` is the one field never inherited: it is the edge itself, and a child inheriting it would claim its grandparent while the tree disagreed.
- **Seed question — settled by measurement, and the answer is worse than the risk anticipated.** Probed against the real `EngineRandomService`: a master `seed:` override **and** a `point-seed:` override are both **inert** for any point that already drew before the parent's save; only `forces:` varies such a point. Cause: `streamFor` resolves `restoredState ?? pointSeedOverride ?? derive(masterSeed, name)`, so a restored state outranks both seed instruments — correct for ADR-293 D7, and exactly what makes seed-based variation from a shared state impossible. The anticipated risk was "master `seed:` fails, `point-seed:`/`forces:` survive"; the measured result is **`forces:`-only**.
- **Stopped here as the plan instructs.** Nothing engineered around it. Recorded in ADR-302 as a measured table under D8 plus an **AMENDMENT PENDING** note in Consequences listing three shapes for the fix. Deliberately did NOT open an Open Questions section on ADR-302 — that would flip an ACCEPTED ADR to DRAFT (DevArch rule 11a), which is the owner's call.
- **Not blocking the rest**: Phases 6–11 do not depend on the answer. Only D5's variation semantics do.

### Phase 6: Tree runner — every path, prefix once (ADR-302 D10)
- **Tier**: Large · **Budget**: 400
- **Entry state**: Phases 4–5 give a validated tree with resolved headers.
- **Deliverable**: every root-to-leaf path executes; a shared prefix executes **once**, each divergent tail running from a restore of the state it produced, using the prefix-keyed save cache (story build + prefix + seed). No `--chain` flag exists. Sequential only.
- **Exit state**: **AC-1** — two transcripts naming one parent both run from its end state and neither runs the other's commands. **AC-5** — every path runs and a shared prefix's commands execute exactly once, asserted on executed command count rather than wall-clock.
- **Status**: PENDING

### Phase 7: Reporting — unreached is not failed (ADR-302 D13)
- **Tier**: Medium · **Budget**: 250
- **Entry state**: Phase 6 runs trees.
- **Deliverable**: when an interior node fails its descendants report as **unreached** and the run names the originating failure. One broken spine node produces one failure, not one per descendant.
- **Exit state**: **AC-7** — a tree with one broken interior node reports exactly one failure and N unreached, originating node named.
- **Status**: PENDING

### Phase 8: Rename as a harness operation (ADR-302 D14)
- **Tier**: Medium · **Budget**: 250
- **Entry state**: Phases 4–6 give a resolvable tree.
- **Deliverable**: atomic rename updating the transcript, every child's `continues:`, the golden (`goldenPathFor`), and the divergence save. **Validate-then-write** — resolve the whole edit set first; reject before touching anything when the stem is taken, the tree is unreadable, or any file is unwritable.
- **Exit state**: **AC-8** — all four update together; renaming to a taken stem leaves every file byte-identical.
- **Status**: PENDING

### Phase 9: Assertion vocabulary and capture inference (ADR-300 D13, D14 — branch-tester only)
- **Tier**: Medium · **Budget**: 250
- **Entry state**: Phase 1 settled the channel set; Phases 3–4 gave branch-tester its own grammar to extend.
- **Deliverable**: the assertion vocabulary covers every channel content type — text, number, record — including dotted-path addressing into records, list any-element matching, `is absent` for sparse-channel silence, and wrong-type-fails-by-name. The capture set is **inferred from the assertions** rather than declared in a `channels:` header, with provenance recording what was captured.
- **Why here and not in `transcript-tester`**: these extend the assertion grammar, which ADR-302 D15 freezes. They are not back-ported.
- **Exit state**: a transcript asserts `banner.title` structurally rather than substring-matching flattened text; a transcript asserting on a channel it never declared no longer errors.
- **Status**: PENDING

### Phase 10: Directory separation and Fernhill's rewrite (ADR-302 D16, D13) — requires confirmation
- **Tier**: Large · **Budget**: 400
- **Entry state**: Phases 3–9 give a working harness. **Explicit go-ahead required** — rewrites 20 committed, passing files.
- **Deliverable**: in-repo story directories split so each harness sees only its own; the binding property is that `transcript-tester` never parses a `continues:` file, since it would accept the key, ignore it, and run the transcript standalone from a fresh game — a pass that means nothing. **If the split moves v1's stories rather than Fernhill's, `packages/transcript-tester/vitest.config.ts`'s corpus path moves in the same commit.** Then Fernhill's tests are rewritten as one tree: a root, a spine, and focused tests hanging off the node that establishes their state.
- **Exit state**: Fernhill's suite passes as a tree; no `tests/transcripts/` versus `walkthroughs/` split remains for it; coverage (ADR-302 D6) reports an unexercised divergence alternative as a gap.
- **Status**: PENDING

### Phase 11: v1 survives — the regression gate (ADR-302 D12, AC-9)
- **Tier**: Small · **Budget**: 150
- **Entry state**: everything above landed.
- **Deliverable**: confirm the freeze held. `test:npm` against `tutorials/familyzoo/v1.5.0` (16 transcripts) and `v2.0.0` (17) still runs them; Dungeo's GDT suite and its 17-file chain still run; `transcript-tester`'s own suite still passes.
- **Exit state**: **AC-9** green. The check that catches `branch-tester` quietly cannibalizing v1's command surface. Deliberately last.
- **Status**: PENDING

---

## Sequencing

**Why ADR-300's D8 comes before ADR-302's copy.** Channels live in stdlib and the engine, not in a harness, so both harnesses see the same channel model — `main` cannot be dissolved for one and kept for the other. Two consequences fix the order:

1. **Copy-then-dissolve means migrating twice.** `branch-tester` is a full copy of the parser, runner and assertion tier; dissolving `main` afterwards means doing that work in both packages.
2. **Freeze-then-dissolve makes ADR-302 D9 false.** D9 says Dungeo's suite "stays supported and keeps working unchanged." Dungeo owns 1966 of the 2921 `main`-reading assertions, so freezing before D8 lands would freeze them against a channel about to disappear. The channel model settles first, then the harness splits.

**Phase 2 is independent** of everything and can move earlier — it is the Chord seam, and nothing in the harness work blocks or is blocked by it.

**Phases 4 → 5 → 6 → 7 are a hard chain**: grammar before tree, tree before inheritance, inheritance before running, running before reporting on runs. **Phase 8 is independent** of 6 and 7. **Phase 11 can be run early as a baseline** and must be re-run at the end.

**Phase 5 carries the only genuine unknown.** Everything else is construction against a settled design; the seed-on-restore mechanism is the one place an ADR says outright "this must be settled when D1 is built; it is not assumed to work here." Budget for it to cost more than its tier suggests, and treat a negative result as an ADR amendment rather than something to engineer around.
