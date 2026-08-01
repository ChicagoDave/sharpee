# ADR-294: Golden transcripts — the transcript tester rebuilt on determinism

## Status: ACCEPTED (2026-08-01, session 06425d) — drafted, feature-swept, interviewed (six questions resolved), and `adr-review`ed the same day (10/15 → 15/15 after three folds: Acceptance section, `.golden` format block, status wording). Accepted by David on the folded result. **Implementation is sequenced behind the D12 arc** (handler-access platform discussion → ADR-293 Phase B → this rebuild) and remains a platform change requiring its own discussion before implementation starts

**Platform change; requires its own discussion before implementation starts.** Packages: `packages/transcript-tester` (rebuilt), `scripts/bundle-entry.js` (CLI flags), `tools/repokit` (test command surface). **Story change**: every story's transcript corpus migrates (`stories/dungeo` 17 walkthroughs + ~100 unit transcripts, plus `cloak-of-darkness`, `friendly-zoo`, `family-zoo-tutorial`, `fernhill`).

## Date: 2026-08-01

## Parent

ADR-293 (choice points and per-point streams — the determinism substrate this ADR is built on; its Phase B is a hard dependency for walkthrough goldens, see D12), ADR-277 (IDE integrated testing — the NDJSON wire contract, walkthrough chain layout, and `.transcript` document type survive), ADR-287 (literal text blocks — the exact-match grammar survives as the assertion tier's strongest form; goldens generalize it from one command to a whole session), ADR-282 / ADR-290 (play-to-test and test-creation-as-a-mode — "bless" becomes the shared verb; those flows produce what this ADR consumes), ADR-187 (`./repokit`, where the runner is invoked).

## Context — verified, not assumed

Every claim below was observed directly during the ADR-293 Phase A/7 acceptance pass on 2026-08-01 (evidence: `docs/context/session-20260801-1122-adr-293-phase-a-arc.md`) or read out of the working tree the same day.

### The tester is a nondeterminism-coping machine, and the problem it copes with is gone

Almost every piece of the current tester's complexity exists because output used to be unpredictable:

- **The navigator with routing retries.** All count variance across three identical walkthrough chain runs at `--seed 42` (880/876/884 totals, 0 failures each) came from direction-command retries in `wt-07`/`wt-10` — every diff line between runs is a compass command.
- **`[WHILE:]` loops and `[ENSURES:]` postconditions** exist to keep asserting through outcomes that could not be pinned.
- **"Six attack commands is usually enough"** and the standing "run flakey walkthroughs twice" practice (its root cause — the combat singletons — died in Phase A/5; `wt-13-thief-fight` is now a stable 80/80/80 across runs).
- **A fuzzy assertion DSL** (`contains`, `contains_any`, `matches`) that exists because exact output could not be trusted.

Post-293, at a pinned seed, output is byte-for-byte reproducible across separate processes (AC-1), across save/restore (AC-4), and under new point declarations (AC-3). The coping machinery is now dead weight that actively obscures failures.

### The machinery does not just cost complexity — it hides bugs

Observed during the acceptance pass, in the shipped tester:

- **`[OK: any]` masks failure.** An 18-command transcript "passed" while the player was stuck in the Kitchen from command 5 onward — every subsequent command failed (`ENTITY_NOT_FOUND`), every `[OK: any]` passed.
- **Directive errors are swallowed** unless `--stop-on-failure` is set (`runner.ts:303`). A failed `$restore` silently continues on a fresh world; every subsequent assertion runs against the wrong state and nothing reports it.
- **`[SEED:]` is position-sensitive and silent about it.** Placed before the `---` separator it is ignored without warning — the pin simply doesn't apply.
- **`$save`/`$restore` bypassed the engine's save format entirely** until the Phase A/7 fixup (hand-rolled world snapshots dropping RNG stream state and the turn counter, so restores replayed with wrong randomness). The fixup routes both through `engine.save()`/`engine.restore()`; the rebuild inherits that contract.

### A guard was deleted with no replacement

`parse-baseline.test.ts` (ADR-287 D2 corpus digest) was deleted 2026-08-01 by David's ruling after going stale. Its unique value — catching *silent parse drift* — currently has no home. A golden corpus restores it for free: any parser change surfaces as recording diffs.

### The exact-match form already exists at the wrong granularity

ADR-287's `[OK]` + text block is already a byte-exact assertion — for one command. The determinism substrate makes the same guarantee available for a whole session. The conceptual step is small; the machinery deletion is large.

## Decisions

### D1. Golden transcripts are the regression baseline

A golden test is a command script plus a pinned seed plus a **recording** of the full rendered output. The runner replays the script and diffs actual against recorded output under the normalization contract (D6). Any difference is a failure that shows the diff. There are no per-command assertions in the golden tier; the recording *is* the assertion.

Re-recording is an explicit, named act: `--bless` overwrites the recording. Blessing is reviewed the way code is reviewed — recordings are committed, so every bless is a visible diff in git (no CI gate, per project practice; the review surface is the diff itself).

### D2. Two tiers, one source grammar

- **Golden tier** — regression. Whole-session exact match per D1. Walkthrough chains live here.
- **Assertion tier** — unit intent. A small retained DSL (`[OK: contains "…"]`, `[OK: not contains]`, `[OK]` + text block per ADR-287, `[FAIL:]`) for tests whose point is a specific behavior that should survive prose churn.

Both tiers share the `.transcript` source format and parser. A transcript is golden if a recording exists for it (D7); it is assertion-tier otherwise. **`[OK: any]` is removed** — presence-only assertion has no remaining justification once goldens exist, and it demonstrably masks failure. `[SKIP]` survives for commands whose output is deliberately not asserted in assertion-tier tests.

### D3. Seeds are header metadata, and recordings are versioned

`seed:` moves into the transcript header (with `title:`/`story:`), replacing the body-positional `[SEED:]` directive whose placement trap was observed live. A golden transcript **must** declare a seed; an assertion transcript may. The chain rule survives unchanged (one session, first member's seed, ADR-293 D14).

A recording embeds provenance: the seed, `SEED_DERIVATION_VERSION`, the save-format version, and the story name. A provenance mismatch (e.g., derivation version bumped) fails with "stale recording — re-bless", never with a raw diff.

### D4. The coping machinery is deleted

`[WHILE:]`, `[ENSURES:]`, `[NAVIGATE TO:]`, navigator routing retries, and `[OK: any]` do not exist in the rebuilt runner. Deterministic output at a pinned seed makes a fixed command list sufficient for every currently-covered scenario. A transcript is literal commands, nothing else — the runner never pathfinds. The authoring convenience `[NAVIGATE TO:]` provided moves to the IDE as an *editor* affordance ("insert path to room" drops literal compass commands at the cursor); bare-CLI authors write the commands the recording would contain anyway. (Resolved Q1, 2026-08-01: delete outright — bless-time macro expansion was rejected because tooling that rewrites test *sources* on bless is surprise-generating magic, and it would add a map-staleness class to provenance.)

### D5. Any failure fails, unconditionally

A failed directive (`$restore` of a missing save, a rejected legacy snapshot, a navigation that cannot complete) fails the transcript whether or not `--stop-on-failure` is set. `--stop-on-failure` controls whether the *run* continues to other transcripts, never whether a failure is recorded. The observed silent-continue-on-wrong-world hole closes structurally.

### D6. The normalization contract is small and explicit

The diff covers the story's rendered output — by default, exactly the text a player would see. A transcript may opt into recording the event stream too (`events: true` in the header, provenance-tracked per D3) — for the tests that *exist* to pin event behavior (interceptor firing, daemon scheduling, event payload shapes). Walkthrough goldens stay prose-pure so that event-shape refactors never trigger corpus-wide blessing; state drift that never reaches prose is caught by the opted-in tests and by D18's divergence save when it eventually surfaces. (Resolved Q2, 2026-08-01: text-only default with per-transcript `events: true` opt-in — always-on events would make every plumbing refactor a hundred-bless event, the normalization-creep rot this decision exists to prevent.)

Excluded from the diff, exhaustively: harness chrome (PASS/FAIL columns, durations, file paths) and the story banner's build-date line. Nothing else is normalized; the seed echo is *inside* the diff (a golden that reports a different seed than it pinned is a real failure). Growing this exclusion list requires amending this ADR — normalization creep is how golden suites rot.

### D7. Recordings are sibling files, committed

`foo.transcript` records to `foo.golden` beside it. Recordings are committed to the repository — they are the regression baseline and the review surface. Corpus scale (17 walkthroughs + ~100 unit transcripts today) is text-file scale; repository weight is not a concern at this size.

**The `.golden` format** is a text file: a provenance header (D3's fields as `key: value` lines), a `---` separator, then the recorded turns — each turn is the command line (`> verb …`) followed by its recorded output verbatim, turns separated by blank lines. When `events: true`, each turn's events follow its output as `• type {json}` lines. Illustrative:

```
# sharpee golden v1
transcript: wt-01-get-torch-early.transcript
story: dungeo
seed: 42
derivation: 1
save-format: 3.0.0
channels: main
events: false
locale: en-US
forces: (none)
---
> north
North of House
You are facing the north side of a white house. …
```

Chain members record one `.golden` per member, written during a chain run; a chain member's recording is only meaningful in chain context (replay reaches it through the members before it), and the runner refuses to replay one standalone.

### D8. Seed matrices are first-class

A golden transcript may declare multiple seeds (`seeds: 42, 777, 4242`); each seed gets its own recording and each replay diffs against its own. This is how combat variance gets covered *deliberately* — N seeds chosen to exercise N outcome shapes — instead of defensively with retry loops.

### D9. The rebuild is in place, with no compatibility layer

`@sharpee/transcript-tester` is rebuilt under its own name. No dual-mode runner, no legacy-directive shims (project policy: no backward compatibility). ADR-277's NDJSON wire contract, walkthrough directory layout, and `.transcript` document type are kept; ADR-287's text-block grammar is kept in the assertion tier. The old parser/runner internals (navigator retries, WHILE/ENSURES handling, condition evaluator's retry hooks) are deleted, not deprecated.

### D10. Migration is mechanical where the suite is green

The existing corpus generates its own goldens: run each transcript (or chain) at its pinned seed through the rebuilt runner in record mode, review the output once, bless. Nothing is hand-rewritten wholesale.

**The policy line** (resolved Q3, 2026-08-01): the 17 `wt-*` walkthrough chains go golden — regression is their job; the unit-transcript suites stay assertion-tier wholesale — intent is theirs. Promotion of a unit transcript to golden happens later, case-by-case, when someone touches it. The unit suite's known-failures subset is therefore never in blessing's path (auto-blessing a failing transcript would enshrine broken output as the expected recording — the one catastrophic migration mistake available); its triage is a separate small cleanup task, not a migration gate. D11's parse-drift guard is already strong with 17 chained goldens covering most of the game.

### D11. Golden diffs subsume the parse-drift guard

With walkthrough and unit goldens committed, any parser change that alters any rendered output anywhere in the corpus fails visibly. The deleted `parse-baseline.test.ts`'s unique value returns with strictly better coverage, closing the open item from 2026-08-01 ("decide whether a frozen-fixture parser baseline should replace it" — it is replaced by this ADR).

### D12. One sequenced arc: handler access → ADR-293 Phase B → this rebuild

Four `Math.random()` event handlers (round-room, trivia, bat, carousel) still make full-chain output vary at a pinned seed; until ADR-293 Phase B converts them, walkthrough chains cannot record goldens — and D10 makes walkthrough goldens the migration. **The sequencing is one planned arc** (resolved Q5, 2026-08-01): first the handler-access platform discussion (event handlers currently have no route to the `RandomService`), then Phase B (small in code once access is settled), then this rebuild, which migrates the corpus in one motion on day one. Rebuild-first was rejected on an internal contradiction: D4 deletes the coping machinery (`WHILE` in `wt-10`, navigator retries) that the walkthroughs still *need* until Phase B lands, so a clean-cut rebuild before Phase B is not actually possible.

### D13. The suite can answer "what should I test?"

The story declares enumerable surfaces; the tester diffs the corpus against them and reports the gaps as suggestions. Coverage families, in priority order:

1. **Outcome-class coverage** (the one only ADR-293 makes possible): for every registered choice point, which declared classes have actually materialized in some test, and which never have. Ground truth from the catalog (`getRegisteredPoints()`) crossed with per-run draw traces (ADR-293 Phase C's trace surface).
2. **World coverage**: rooms never visited, objects never referenced, actions never exercised by any transcript — computed from the world model / `--introspect` manifest (ADR-184).
3. **Prose and plumbing coverage**: message IDs never rendered (lang-en-us mappings no test has caused to print), daemons/fuses never fired, state-machine states never entered, interceptor hooks never triggered, grammar patterns never matched.

A gap report is only useful if the suggested test is *writable*, and rare outcome classes are exactly what is hard to reach by play. The answering mechanism is outcome forcing: a transcript declares a force (e.g. `[FORCE: dungeo.melee.blow.hero = DISARM]`) and the draw resolves to that class deterministically — this is ADR-293 Phase C's `materialize`, surfaced as a test directive. Forcing composes with goldens: the recording is made *under the declared forces*, and provenance (D3) includes them. Seed search (find a seed exhibiting the class naturally — ADR-292's bounded outcome search, returning as a servant of coverage rather than the primary author instrument) is the secondary mechanism.

**Delivery** (resolved Q6, 2026-08-01): **forcing ships first, CLI first.** Forcing is what makes a suggested test writable the day the suggestion appears; seed search follows as the naturalness check (the two are complementary — forcing for writability, search for natural reproductions). The suggestion surface is a CLI `--coverage` report emitted over the ADR-277 NDJSON wire, which hands the IDE's Test tab everything it needs to build the "scaffold this test" panel later without a second design round. This ordering also sets ADR-293 Phase C's internal priority: `materialize` before the trace surface's reporting refinements.

### D14. Watch mode: edit, see what broke, bless from the diff

`--watch` re-runs the transcripts affected by a change (story source → that story's suites; a single `.transcript`/`.golden` → that test) and presents failures as diffs with an inline bless affordance — per-file at the CLI ("bless? [y/n/all]"), per-diff in the IDE's Test tab later. This is the workflow that makes D1's deliberate prose-churn cost cheap in practice: a prose edit's blast radius is reviewed and blessed in the same sitting as the edit, not discovered in a stale suite weeks later. Watch mode never blesses anything unprompted; an unattended watch run only reports.

### D15. Recordings can scope to channels

A recording captures the story's channel stream (ADR-163: channels carry ALL story→UI signals), and a transcript may scope its golden to named channels — `channels: main` (the default: the player-visible text), `channels: main, status` (pin the status line too), or a single non-text channel (`channels: audio` — a golden of *what sounds play when*). Scoping is provenance (D3): the recording names its channels, and replay diffs only those. This keeps text goldens from churning on status-line or media changes and makes channel-heavy stories testable surface-by-surface — including surfaces that have no other assertion story today (audio cues, media triggers, layout signals).

### D16. Coverage joins `repokit verify`, allowlist-shaped

Once the coverage substrate exists (D13 / Phase C), `verify` gains a gate with the same shape as the ADR-293 D6 entropy gate: a checked-in coverage manifest maps every registered choice point to the tests that exercise it; a *newly declared* point with zero coverage fails verify until a test exists or the point is deliberately manifest-listed as uncovered (a visible, reviewable exemption — the allowlist pattern the entropy gate already established). The gate compares against the manifest, not against a live corpus run, so `verify` stays fast; refreshing the manifest is part of blessing.

### D17. Seeded fuzzing — random walks that are replayable by seed

`fuzz` runs N sessions of randomly generated but grammar-valid commands, each session at a minted, *reported* seed (the `--vary` machinery, ADR-293 D14). Command generation draws from the parser's own grammar and the world's referable vocabulary, so fuzz input is shaped like player input, not noise. Any crash, unhandled error event, stuck state, or invariant violation is reported as `seed + command index` — fully replayable, because the session's randomness and the generator's randomness both derive from the one seed. Determinism is what makes fuzzing *actionable* for the first time: a fuzz failure is a bug report with reproduction steps, not an anecdote. Fuzz runs also feed D13's coverage report — surfaces a fuzz walk reaches that no authored test covers are suggestion candidates.

### D18. Failure debugging — a failing golden drops you at the divergence

When a golden replay diverges, the runner writes a real save (3.0.0 format — world, turn counter, stream states) at the last matching turn, named for the failure (`<transcript>.divergence.json`), and reports the restore command. The author lands in the exact world state one command before the divergence, with the RNG streams positioned faithfully, and can replay the divergent command interactively (`--exec --restore … --debug`) or step forward. This is the save-format work from Phase A/7 paying off as a debugging surface: the restore is faithful *because* stream states ride the save. Divergence saves are working artifacts, never committed.

### D19. Localization coverage — the suite runs per locale

D13's message-ID coverage crossed with language packs: the assertion suite (not goldens — goldens are prose-bound to one locale by nature) can run against a different `lang-{locale}`, and the coverage report gains a per-locale axis: message IDs missing from the pack, mapped-but-never-rendered, or rendered only under one locale's grammar paths. Goldens are recorded per locale when a story ships more than one (`locale:` joins the provenance header, defaulting to the story's primary). The hook is designed in now; the feature becomes load-bearing the day a second locale exists.

### D20. The explorer — bounded exhaustive play

The explorer searches the story's state space: from a start state (fresh world, or any save), it enumerates the commands worth trying, forks the world per command, and repeats — breadth-first under explicit budgets. "Every possible combination within reason" is made tractable by three platform facts, each already shipped or scheduled:

1. **Validate-only pruning.** The four-phase action pattern lets the explorer ask "which commands are valid here?" without mutating anything — the candidate set at each node collapses from grammar × vocabulary to commands that would actually execute.
2. **Faithful forking and deduplication.** Save format 3.0.0 (world + turn + stream states) is the fork/restore mechanism, and a hash of the canonical snapshot deduplicates states — converging command paths explore a state once. This is what keeps the tree sub-exponential in practice.
3. **Enumerated randomness.** At a choice point the explorer does not sample — it branches once per declared class via forcing (`materialize`, ADR-293 Phase C). A combat encounter is a fixed, finite subtree, not a lottery.

What it reports, each finding replayable as a command path plus declared forces: crashes and unhandled error events; softlock candidates (states from which a goal predicate — "trophy case complete", "endgame reachable" — is unreachable within the remaining budget); unreachable content (cross-checked against D13's coverage families); invariant violations (story- or platform-declared, e.g. darkness without a light source producing non-grue output).

**The soundness contract is explicit and honest**: findings are real (a reported crash reproduces by construction); absence is not proof (exhaustion within budget ≠ exhaustion of the space). The explorer never claims "no softlocks exist" — it claims "none found within N states / depth D / T minutes", and the budget is part of the report. Lineage: this is ADR-292's bounded outcome search and `@sharpee/skein` reborn at the right altitude — a batch tool over the substrate (CLI first, long-running; IDE surfaces findings), not an interface baked into the seed authority. Dependencies: forcing (Phase C) for the randomness branching; without it the explorer still runs with sampled draws at pinned seeds, weaker but useful.

## Acceptance

Core (the rebuild itself; every one must pass before the rebuild is called done):

- **AC-1**: A `wt-*` chain records at its pinned seed and replays clean; two consecutive replays in separate processes both pass with zero diffs.
- **AC-2**: Editing one room description breaks exactly the goldens whose recorded output contains that prose; `--bless` repairs them; `git diff` of the recordings shows exactly the prose change and nothing else.
- **AC-3**: A recording whose provenance mismatches the runtime (bumped `SEED_DERIVATION_VERSION`, save-format version, or channel/locale/forces set) fails with the named "stale recording — re-bless" error, never a raw content diff.
- **AC-4**: A transcript using a removed form (`[WHILE:]`, `[ENSURES:]`, `[NAVIGATE TO:]`, `[OK: any]`, body-positional `[SEED:]`) is a parse error naming the removed form and its replacement; nothing executes.
- **AC-5**: A failed directive (`$restore` of a missing or legacy save) fails the transcript with a named error and a nonzero exit code, without `--stop-on-failure`.
- **AC-6**: A deliberately induced divergence writes the divergence save; `--restore` of it lands one command before the divergence, and replaying the divergent command reproduces the divergent output byte-for-byte.
- **AC-7**: `seeds: A, B` produces two recordings; each replay diffs only against its own.
- **AC-8**: A status-line-only change breaks a `channels: main, status` golden and does not break a default `channels: main` golden.
- **AC-9**: With `--watch` running, editing a story source re-runs only that story's affected suites and reports diffs; nothing is blessed without explicit confirmation.

Gated (each names its dependency; deliberately-planted defects live in dedicated fixture stories, never in real stories):

- **AC-10** *(gated on ADR-293 Phase C trace)*: `--coverage` on a story with a never-materialized outcome class names that point and class.
- **AC-11** *(gated on Phase C `materialize`)*: a transcript declaring `[FORCE: <point> = <CLASS>]` records a golden in which the forced class occurs at that draw; replay is deterministic and provenance carries the force.
- **AC-12**: A fuzz run over a fixture story with a planted crash reports `seed + command index`, and replaying that seed reproduces the crash.
- **AC-13** *(full mode gated on Phase C)*: the explorer finds a planted softlock in a fixture story within budget and reports it as a replayable command path; the report names its budget.
- **AC-14** *(dormant until a second locale exists)*: a per-locale run against a deliberately incomplete test language pack reports the missing message IDs.

## Consequences

- **Testing intelligence is product surface, not internal tooling** (David, 2026-08-01): the coverage/suggestion/forcing/watch stack is a differentiator for Sharpee and Chord adoption — no comparable IF system can tell an author what their story leaves untested, because no comparable system has an enumerable randomness contract to compute it from. Author-facing polish on these features is justified accordingly. The intelligence operates on *declared surfaces* (points, rooms, messages, channels), not on TypeScript, so it serves Chord authors identically through the same runner.
- The walkthrough chain becomes a byte-stable regression baseline; "run it twice" is retired as a practice, not just as a root cause.
- Prose editing gets a new workflow cost: story text changes break goldens until blessed. This is deliberate — the bless diff *is* the review of the prose change's blast radius. The assertion tier exists precisely so unit tests don't pay this cost.
- The tester shrinks substantially (parser loses WHILE/ENSURES/navigate-retry grammar; runner loses the navigator and retry state machinery).
- ADR-290's IDE test-creation mode, when it lands, records goldens rather than per-turn `[OK]` fragments — blessing in the IDE and blessing at the CLI become the same act on the same artifact. (Resolved Q4, 2026-08-01: **290 stays separate and gets amended to target goldens** — its subject is IDE flow (atomic mode, clean-world entry, explicit exit), which 294 does not contradict; only its output artifact changes: Save Test writes a `.transcript` + blessed `.golden`, and per-turn blessing becomes selection of assertion-tier annotations. The amendment is follow-on work outside this ADR and must also record 290's dependency on ADR-293 — the note it has been missing since Phase A started. Folding 290 in was rejected (IDE-flow detail has a different owner and review cadence); parking it was rejected (a live DRAFT pointing at an obsoleted artifact model is a drift trap across parallel sessions).)
- Every future story ships with a recordable regression suite for the cost of playing it once at a pinned seed.

## Session

Drafted 2026-08-01, session 06425d, immediately after the ADR-293 Phase A/7 acceptance pass whose evidence motivates it (PR #205, merged). Conception: David's mid-pass question — "given the complete resetting of how randomization is done… we could completely rebuild transcript tester from scratch" — and the assessment that followed. All six Open Questions resolved by interview the same day (Q1 `[NAVIGATE TO:]` deleted; Q2 text-only recordings with `events:` opt-in; Q3 walkthroughs golden / unit suite assertion-tier; Q4 ADR-290 amended separately to target goldens; Q5 one arc: handler access → Phase B → rebuild; Q6 forcing first, CLI first).
