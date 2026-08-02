# Session Plan: ADR-293 Phase C — coverage, forcing, search

**Created**: 2026-08-02
**Overall scope**: Implement ADR-293 Phase C only — `[FORCE:]`/point-seed override transcript directives (D8, D9, D11), occurrence indexing (D9, ruled to ship here), the trace surface on `ISystemEvent` (D16), the coverage report (D15), and the search-budget tool (D12). Phase A (substrate, `resolve()`, D10 melee taxonomy) and Phase B (story cleanup) are already merged. Phase D (retire workarounds) is explicitly **not** planned here.
**Bounded contexts touched**: N/A — platform infrastructure (a determinism/testing substrate), not domain behavior modeling. No `docs/ddd/notation.yaml` exists and this work introduces no domain concepts, so the plan is framed in plain technical terms per the "DDD does not apply" rule.
**Key domain language**: N/A (see above). Relevant *technical* vocabulary — choice point, plain draw, force, occurrence index, point-seed override, trace, coverage — comes from ADR-293 D8–D16 and ADR-294 D13/D16, used as-is below.

## References consulted
- `docs/architecture/adrs/adr-293-choice-points-per-point-streams.md` — ACCEPTED, Amendment A1 folded. Constrains this plan's scope to D8, D9 (occurrence indexing ruled into Phase C), D11, D12, D15, D16, and ACs 8–14 — with A1 ruling 5 already having moved classes/`resolve()`/D10's taxonomy into Phase A, which this plan must not redo.
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — ACCEPTED and IMPLEMENTED (Phases 1–5, commit 118cd95a). Constrains directive-shape choice (D3 killed the body-positional `[SEED:]` form in favor of a header field — Open Decision 1 below), sets Phase C's internal priority ("materialize before trace-surface reporting refinements," D13), and names AC-10/AC-11 as gated on this plan's work.
- `docs/work/adr-293-phase-a/plan.md` — the Phase A plan this one follows in structure and verification style (phased arc, per-phase budgets, ordering hazards, commit-per-phase, rule-13a real-path verification). Its Phase 7 status note is load-bearing here: **AC-12 was already fully closed in Phase A**, and AC-13 was closed except for its three FORCE-specific rejection clauses (duplicate force keys, undeclared forced class, unknown point name) — this plan must not re-scope those as new Phase C work (see AC Mapping below).
- `docs/context/project-profile.md` — stack/convention constraints: pnpm workspace + tsf build, Vitest 3.x, TypeScript strict mode with composite project references, `./repokit`/`./sharpee` split (ADR-187). Every verification command below uses `./repokit build dungeo` / `dist/cli/sharpee.js`, never `./sharpee build`.
- `docs/context/session-20260802-1504-main.md` — this session's own in-progress file: goal is "plan first, discuss with David before platform implementation," oriented on Phase A merged (PR #205), Phase B landed (1bc77944), ADR-294 shipped (118cd95a). Confirms no other open item from that session bears on Phase C scope.
- `docs/proposals/tracker-low-hanging-fruit.md` — Status COMPLETE, all eight items DONE. No ACCEPTED-but-not-PLANNED items; nothing to plan from it here.

## Scope assessment — is Phase C too large for one session, and where does it cut

**Yes, but smaller than Phase A.** ADR-293 itself says Phase C is "almost entirely engine- and tooling-side now that call sites already carry their labels" — the ~45 call-site conversions and the D10 taxonomy are done. What remains is real, novel machinery: a force table with occurrence indexing and two failure modes (D9), a per-point-seed override path (D11), a trace channel that nothing currently emits on (D16), a coverage aggregator that nothing currently consumes the trace for (D15), and a search harness that doesn't exist in any form (D12). Verified against the current tree (`packages/core/src/random/index.ts` exports no trace/coverage types yet; `EngineRandomService.resolve()` at `packages/engine/src/engine-random-service.ts:100-116` explicitly no-ops `materialize` — `void materialize;`; the transcript-tester's `forces:` header field parses and round-trips through `GoldenProvenance` but is declared "Parsed but not yet acted on" in `packages/transcript-tester/src/types.ts`). This decomposes into **5 phases plus one conditional phase**.

**The real cut points, dependency-respecting:**
- Phase 1 (engine/core force table + trace) must land before Phase 2 (transcript directives) — Phase 2 has nothing to call.
- Phase 2 must land before Phase 4 (search) — D12's "force-prefix then search-last" composition needs occurrence-indexed forcing to exist.
- Phase 3 (coverage report) depends on Phase 1's trace surface, **not** on Phase 2 or Phase 4 — it can be built and verified in parallel with either, using only natural (unforced) draws until Phase 2 lands. Phases 3 and 4 have no dependency on each other and may run in either order, or as two independent sessions off the same Phase 2 baseline.
- Phase 5 (integration/acceptance) depends on all of 1–4.
- Phase 6 (coverage-manifest verify gate) was conditional on Open Decision 3 — **ruled DEFERRED (David, 2026-08-02): this plan ends at Phase 5.** Phase 6 stays written below for the follow-on session that picks it up.

## Open decision points — ALL RULED (David, 2026-08-02, session 72111f)

All five decisions were ruled in the platform discussion on 2026-08-02, each on the plan's recommendation: **1(a)** header fields, **2(a)** `chance()`+`resolve()` only, **3(b)** defer the verify gate (this plan ends at Phase 5), **4(a)** typed `IRandomTraceData` + `Subsystems.RANDOM` in core, **5(a)** in-process fork. Decision 2 was ruled after a worked scenario showing that any future forceable `int()`/`pick()` outcome is properly expressed by rewriting the call site to `resolve()` — the rewrite being the visible act of declaring the outcomes consequential (D4 tier line). Per Decision 1's ruling, AC-9/AC-11's bracket-syntax wording is restated to header-field syntax — a wording fix, not a substance change, recorded here so it isn't silently reinterpreted later. The sections below are retained as the decision record.

### 1. Directive shape: header field vs. body-bracket directive for `[FORCE:]` / `[POINT-SEED:]`

ADR-293's Implementation section and Acceptance wording (AC-9, AC-11) use bracket syntax inherited from the pre-ADR-294 `[SEED: N]` convention — e.g. `[FORCE: dungeo.melee.blow.villain#1 = SERIOUS_WOUND]`. But ADR-294 D3 explicitly retired exactly that shape for seeds — replacing body-positional `[SEED:]` with a `seed:`/`seeds:` header field — because the body-positional placement trap was **observed live** (a `[SEED:]` before the `---` separator was silently ignored). The transcript-tester already carries scaffolding built for the header-field convention: `CONFIG_KEYS = ['seed', 'seeds', 'channels', 'events', 'locale', 'forces']` (`packages/transcript-tester/src/parser.ts:33`), `TranscriptRunConfig.forces: string[]` and `GoldenProvenance.forces` round-tripping through `.golden` files (`packages/transcript-tester/src/golden.ts:43,88,217,228`) — currently a plain comma-list, parsed but inert.

- **(a) Header field.** Extend `forces:` to carry `point[#occurrence]=CLASS` pairs (`forces: dungeo.melee.blow.villain#1=SERIOUS_WOUND, dungeo.melee.blow.villain#2=SERIOUS_WOUND`) and add a parallel `point-seed:` header field for D11. Reuses the parser/provenance machinery already in place.
- **(b) Body-bracket directive.** New `[FORCE: ...]` / `[POINT-SEED: ...]` grammar, matching the ADR's literal Acceptance-section prose. Note this is **new** grammar, not a revival of the removed `[SEED:]` form — ADR-294 AC-4 makes body-positional `[SEED:]` a parse error naming its header-field replacement, so a new bracket form for FORCE would sit oddly beside that removal.

**Recommendation: (a).** It matches the precedent ADR-294 just set for the identical failure mode, and the scaffolding already exists. If (a) is chosen, AC-9/AC-11's bracket-syntax wording needs restating to header-field syntax — a wording fix, not a substance change — flag this explicitly in the ruling so it isn't silently reinterpreted later.

### 2. Does forcing extend to `chance()`/`int()`/`pick()`, or only `resolve()`?

Verified across every `definePoint(...,{classes:...})` call site in the tree (18 classed points total): every classed point drawn via `chance()` is a `'yes'|'no'` point (11 sites — `stdlib.probabilistic-death.lethal`, `stdlib.throwing.hit-actor/catch/hit-stationary/breaks` ×4, `stdlib.deadly-room.lethal`, `stdlib.npc.move`, `dungeo.forest.ambience`, `dungeo.grue.survival`, `dungeo.cyclops.growl`, `basic-story.patrol-bot.speaks`, `family-zoo.parrot.squawk`, `dungeo.troll.axe-recovery`, `dungeo.thief.notice-valuables/move/steal/gloat`) — a fixed boolean ⟷ class bijection needing no `materialize`. The remaining classed points (`stdlib.attacking.outcome`, `dungeo.thief.combat-decision`, the D10 melee/basic-combat blow points) are all drawn via `resolve()`, which already has `materialize`. **No classed point anywhere is drawn via `int()` or `pick()`** — every `int()`/`pick()` call site in the tree (`inventory.ts:131`, `npc/behaviors.ts:110`, thief exit picks, `bat-handler.ts:78`, `forest-daemon.ts:51`, `troll-daemon.ts:101`, `carousel-exit-resolver.ts:89`, `melee.ts:213,449,450`, etc.) draws a plain, class-less point. `RandomService.chance`/`.int`/`.pick` (`packages/core/src/random/random-service.ts:25-36`) have no `materialize` parameter — only `resolve()` does.

- **(a) Forcing covers `chance()`** (via the fixed boolean bijection, no interface change) **and `resolve()`** (via existing `materialize`) **only.** `int()`/`pick()` stay unforceable until a real call site needs it.
- **(b) Extend `int`/`pick` with an optional `materialize` parameter now**, symmetric with `resolve()`, on spec.

**Recommendation: (a).** No real call site exercises the gap, and speculative API surface is exactly what D12 rejects for "cheaply searchable" flags for the same reason: untested surface rots and fails silently. Revisit if a future classed `int`/`pick` point appears.

### 3. Coverage-manifest `verify` gate (ADR-294 D16) — in scope for this plan, or deferred?

D16 frames the gate as following "once the coverage substrate exists (D13/Phase C)" but doesn't mandate it ship in the same phase. It's allowlist-shaped like the D6 entropy gate, which is already shipped and a direct model: `tools/repokit/src/commands/random-gate.ts` + checked-in `tools/repokit/entropy-allowlist.txt` (confirmed live, Phase A Phase 6). No coverage-manifest file or verify-gate command exists yet.

- **(a) Include it as Phase 6**, built immediately after coverage reporting (Phase 3) lands, modeled directly on `random-gate.ts`'s shape.
- **(b) Defer** to Phase D or a follow-on session, keeping this plan strictly to ADR-293 ACs 8–14.

**Recommendation: (b), defer** — Phase A's own history (its Phase 3 was re-cut mid-arc specifically to stop scope from cascading) shows this project prefers cutting rather than folding "while we're at it" gates into an already-large arc. The coverage-manifest gate is not named in any of ACs 8–14 — it's a pure ADR-294 D16 add-on — and gating on a coverage report that has zero real-world runs yet risks blocking `verify` on a manifest with no track record. Phase 6 is written out below, ready to run if David rules otherwise.

### 4. Trace `ISystemEvent` payload shape and `subsystem` value

D16 specifies the *logical* record `(point, class, value, provenance, draws-consumed)` riding the existing `ISystemEvent`/`IGenericEventSource<ISystemEvent>` channel (`packages/engine/src/command-executor.ts:98`, `packages/engine/src/game-engine.ts:165,296,299`). But `ISystemEvent.subsystem` is a free string backed by a closed `Subsystems` const with no RNG member (`packages/core/src/events/system-event.ts:49-57`: `PARSER, VALIDATOR, EXECUTOR, WORLD_MODEL, TEXT_SERVICE, EVENT_PROCESSOR, RULE_ENGINE`), and `data: unknown` gives no typed shape.

- **(a) Add `Subsystems.RANDOM` and a named `IRandomTraceData { point, cls, value, provenance, drawsConsumed }` type in core**, alongside the trace/coverage report types D5 already assigns to core.
- **(b) Reuse the untyped `data: unknown` shape**, let consumers (coverage aggregator, GDT verb, future IDE panel) parse structurally.

**Recommendation: (a).** D5 already assigns "the trace/coverage report types" to core, so this is squarely inside that assignment. An untyped `data: unknown` payload here repeats the exact smell ADR-293's own Context section calls out (`character/tick-phases.ts:57`'s `random: unknown`) one layer up, in a payload this plan is actively designing.

### 5. Search-budget tooling: in-process world-fork loop vs. spawned-subprocess loop

D12's measured cost data (1.60ms round-trip via `toJSON()`/`loadJSON()`, ≈623 nodes/sec) is an **in-process, same-engine-instance** figure. Spawning a new OS process per candidate seed (`node dist/cli/sharpee.js`) costs ~170ms of Node/bundle-load overhead per try (per this project's own CLAUDE.md bundle-load note) — roughly two orders of magnitude more than the in-process figure, which would make the ADR's own "~10× inverse probability" budget arithmetic meaningless.

- **(a) In-process**: load the story once inside `transcript-tester` (or a new small module), re-fork the *world* per candidate via `toJSON()`/`loadJSON()`, never spawn a subprocess.
- **(b) Spawned subprocess** per candidate seed, reusing existing CLI plumbing at the cost of violating D12's stated performance model.

**Recommendation: (a).** This isn't really optional — (b) silently produces the same class of defect D12 itself warns against ("a wrong flag fails as a silent long search"). Flagging it because it decides which package the search harness lives in and whether it can call `EngineRandomService` directly or needs a narrower embedding API surface.

---

## AC Mapping

| AC | Text (abbrev.) | Status entering this plan | Closes in |
|---|---|---|---|
| ADR-293 AC-8 | coverage report enumerates points, fired/never-fired, unobserved classes | not started | Phase 3 |
| ADR-293 AC-9 | `[FORCE:]` exercises unreached class; unfired `once` force fails; occurrence indexing fills `villain→KILLED` | not started | Phase 1 (engine) + Phase 2 (directive) |
| ADR-293 AC-10 | forced firing consumes zero draws | not started | Phase 1 (unit) + Phase 2 (transcript-level trace assertion) |
| ADR-293 AC-11 | `[POINT-SEED:]` reproduces a natural outcome, trace reads `drawn` | not started | Phase 1 (engine) + Phase 2 (directive) |
| ADR-293 AC-12 | every run reports its seed; a failure's seed reproduces via `--seed` | **already CLOSED in Phase A** (Phase A Phase 7 status) | regression-check only, Phase 5 — do not re-scope as new work |
| ADR-293 AC-13 | named rejections (seed, `[SEED:]` placement, duplicate force keys, undeclared class, unknown point, `--seed`/`--vary`) | **mostly closed in Phase A** (non-integer/out-of-range seed, `[SEED:]`/`seed:` non-first-chain-member, `--seed`/`--vary` exclusivity); **three FORCE-specific clauses remain**: duplicate force keys in one transcript, a forced class not declared on the point, `[FORCE:]`/`forces:` naming an unknown point | Phase 2 |
| ADR-293 AC-14 | trace/coverage silent in a published game | not started | Phase 1 (gate design) + Phase 5 (verification) |
| ADR-294 AC-10 | `--coverage` names a never-materialized class | gated on ADR-293 Phase C trace | Phase 3 (side effect of ADR-293 AC-8 work) |
| ADR-294 AC-11 | `[FORCE:]` golden records forced class, deterministic, provenance carries force | gated on Phase C `materialize` | Phase 2 (side effect of ADR-293 AC-9 work) |
| ADR-294 AC-12 (fuzz) | seeded fuzz reports `seed + command index` | **not gated on ADR-293 Phase C at all** — buildable today on `--vary` (Phase A) | **out of scope for this plan** |
| ADR-294 AC-13 (explorer) | explorer finds planted softlock, full mode gated on Phase C | this plan unblocks the *dependency* (materialize exists) but does not build the explorer (D20) | **out of scope for this plan** — explorer is separate, large ADR-294 scope |
| ADR-294 AC-14 (locale) | dormant until a second locale exists | unaffected by this plan | N/A |

---

## Phases

### Phase 1: Force table, occurrence indexing, point-seed override, trace surface (core + engine)
- **Tier**: Large
- **Budget**: 400
- **Entry state**: ADR-293 Phase A and Phase B merged (PR #205, commit 1bc77944). `EngineRandomService.resolve()` no-ops `materialize` (`packages/engine/src/engine-random-service.ts:97-116`); no force table, no trace emission, no point-seed override exists anywhere.
- **Deliverable**:
  - **Force table (D8, D9)**: `EngineRandomService` gains a force table keyed by point name plus optional occurrence index (`dungeo.thief.steal`, `dungeo.melee.blow.villain#1`). `resolve()`'s `materialize` callback is wired for real when a force matches; `chance()` is forced via the fixed boolean bijection per Open Decision 2(a) — no interface change. A forced firing consumes zero draws (does not call `streamFor(name)`). Duplicate keys within one load are a **load error** (not last-wins, per D9) — surfaced as a typed error the transcript-tester layer (Phase 2) can catch and report. Occurrence counters increment per point per session, independent of force/natural status.
  - **Modes (D9)**: `once` (must fire exactly once; zero or duplicate is an error) and `sticky` (zero-to-many, count reported) — the mode is a property of how the force table is loaded, not the engine's default; Phase 2 decides which default applies in which runner mode (transcript vs. play), per D9's "once (transcript default) / sticky (play default)."
  - **Unfired-force reporting**: at end-of-session, the engine can report which `once` forces never fired — surfaced as data (not yet formatted) for Phase 2/5 to consume.
  - **Point-seed override (D11)**: `deriveStreamSeed`'s call site in `streamFor()` (`engine-random-service.ts:149-160`) accepts an override map `{ pointName → seed }` that wins over the master-seed derivation for that name only; every other point's derivation is untouched (verifies the "leaves every draw real" property directly).
  - **Trace surface (D16)**: `EngineRandomService` accepts an optional trace sink (`(record: IRandomTraceData) => void`) at construction, called on every `chance`/`int`/`pick`/`resolve` firing — drawn or forced — with `{ point, cls, value, provenance: 'drawn'|'forced', drawsConsumed }`. `game-engine.ts` wires it to `this.systemEventSource` at `severity: 'debug'`, `subsystem: Subsystems.RANDOM` (new member, Open Decision 4) — **off by default**, enabled only when the transcript runner / `--play` / IDE opts in (mirrors D16's default-off ruling). Core gains `IRandomTraceData` and `Subsystems.RANDOM` (`packages/core/src/events/system-event.ts`), exported from `packages/core/src/random/index.ts` alongside the existing exports.
  - Unit tests: force-table hit/miss for `chance`/`resolve`, zero-draw assertion (compare forced vs. unforced trace), occurrence-index matching (`#1` vs `#2` vs unindexed), duplicate-key load error, point-seed override leaving other points' sequences unchanged (direct AC-11 "leaves every draw real" assertion), trace record shape and `provenance` field for both drawn and forced firings, trace silence when no sink is provided (AC-14 groundwork).
- **Exit state**: `@sharpee/core` and `@sharpee/engine` build and test green with a working force table, point-seed override, and trace surface — all unused by any consumer (transcript-tester, CLI) yet. Full platform build unaffected.
- **Verification**: `pnpm --filter '@sharpee/core' test`; `pnpm --filter '@sharpee/engine' test`; `./repokit build dungeo` (regression check — must stay green, nothing wired into a consumer yet).
- **ACs advanced**: 9 (engine half), 10 (unit-verified), 11 (engine half), 14 (gate exists, not yet exercised end-to-end).
- **Status**: COMPLETE (2026-08-02, session 72111f, commit 03dbd077 — core 176 / engine 600 / build / chain 952 all green; two mutation-verification findings closed inline: engine trace-wiring tests, fireCount-split assertion)

### Phase 2: Transcript-tester directives — `[FORCE:]`/`point-seed:`, forced golden recordings
- **Tier**: Large
- **Budget**: 400
- **Entry state**: Phase 1 merged; force table, point-seed override, and trace surface exist and are engine-tested in isolation.
- **Note**: Open Decision 1 is RULED (a) — header fields. The deliverable below stands as written; the bracket-form contingency is moot.
- **Status note**: COMPLETE (2026-08-02, session 72111f, commit 5dc5ecf8 — tester 184 / dungeo corpus 1729 / chain 952 / build all green; four mutation-verification gaps closed inline; real-path fixture force-forest-ambience blessed + replayed twice)
- **Deliverable**: `forces:` header field (`packages/transcript-tester/src/parser.ts:33,559-563`) parses `point[#occurrence]=CLASS` pairs instead of opaque strings; validation errors for malformed entries, duplicate force keys (point+occurrence declared twice in one transcript, per D9 "not last-wins"), unknown point names, and undeclared classes (closing AC-13's three remaining clauses) surface as named parse/load errors, not silent no-ops. New `point-seed:` header field, same list-parsing shape, feeding Phase 1's override map. `TranscriptRunConfig.forces`/new `pointSeeds` threaded from `runner.ts` into `EngineRandomService`'s construction (currently `runner.ts:156,310,418` only round-trips `forces` through provenance — this phase makes it functional). Runner honors the `once`/transcript-default force mode: an unfired `once` force at end-of-run is a hard transcript failure (AC-9's "unfired `once` force fails the run"), reported the same severity as a failed `[ENSURES:]` used to be (ADR-294 D4 removed `[ENSURES:]` itself — this is a **new**, structurally-enforced failure, not a revival). Trace sink enabled for the runner (Phase 1's opt-in), consumed to assert forced-vs-drawn provenance in golden diffs and to power AC-10's "every *other* point's sequence identical" comparison. `.golden` recordings made under active forces record the forces in `GoldenProvenance.forces` (already round-tripped) and replay deterministically. Occurrence-index duplicate-key load errors (Phase 1) surface with transcript file/line context.
- **Exit state**: A transcript declaring `forces: dungeo.melee.blow.villain#1=SERIOUS_WOUND, dungeo.melee.blow.villain#2=SERIOUS_WOUND` records a golden in which firing #3 draws naturally and fills `KILLED` — AC-9's motivating case, end to end. A transcript declaring `point-seed: dungeo.thief.steal=1234` reproduces a specific natural `steal` outcome with trace provenance `drawn`. Both close their respective ADR-293 ACs and ADR-294 AC-11.
- **Verification**: `pnpm --filter '@sharpee/transcript-tester' test`; a new fixture transcript exercising the AC-9 occurrence-index scenario against `stories/dungeo`, run through the real bundle (rule 13a — no stubbed engine); `node dist/cli/sharpee.js --test --bless <fixture>` then a clean re-run to confirm determinism; `./repokit build dungeo`; full `wt-*` walkthrough chain unaffected (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`) since no existing golden declares forces.
- **ACs advanced**: 9 (fully), 10 (transcript-level), 11 (fully), 13 (all three remaining clauses), ADR-294 AC-11 (fully).
- **Status**: NOT STARTED (discussion complete, all decisions ruled 2026-08-02)

### Phase 3: Coverage report — aggregation, CLI `--coverage`, NDJSON wire
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phase 1 merged (trace surface exists). Independent of Phase 2/4 — may be built and verified using only natural draws.
- **Status note**: COMPLETE (2026-08-02, session 72111f, commit 0debaa7a — AC-8 + ADR-294 AC-10 closed; real 33-point dungeo report over the chain; three mutation-verification gaps closed inline, one inherited cli.ts main() gap documented; two stale devkit tests modernized; pre-existing chord format-pin failures flagged, untouched)
- **Deliverable**: A coverage aggregator (new module in `packages/transcript-tester/src`, or `aggregate.ts` extended) consuming the trace stream (Phase 1) across a run/chain: `catalog − fired` via `getRegisteredPoints()` (`packages/core/src/random/choice-point.ts:80`) crossed against fired point names from trace; per-point declared-vs-observed class sets. Per-transcript attribution folds into one chain-level report (D15's "coverage aggregates across a chain, not per transcript" ruling) — the aggregator takes the same chain-scoped trace stream `runner.ts` already produces for one `--chain` session. CLI `--coverage` flag (`cli.ts`) emits the report over the ADR-277 NDJSON wire (extending `aggregate.ts`'s existing record-builder pattern — `aggregateTestRun`, `runStartRecord` et al. — with a new coverage record type). Summary always prints at end of run (points fired, never-fired, unobserved classes) per D15; full per-point breakdown writes to `--output-dir` when given, alongside existing timestamped results.
- **Exit state**: `--coverage` over the full `wt-*` walkthrough chain enumerates every declared dungeo point (~30+ per ADR-293's own count), distinguishes never-fired, lists unobserved classes per point — this is ADR-293 AC-8 and, as a side effect, ADR-294 AC-10 (a deliberately unreached class in a fixture story names itself in the report).
- **Verification**: `pnpm --filter '@sharpee/transcript-tester' test`; `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --coverage` against the real bundle (rule 13a), inspecting the printed summary and (with `--output-dir`) the full breakdown file; a deliberately-planted never-materialized class in a fixture story (per ADR-294's "deliberately-planted defects live in dedicated fixture stories, never in real stories" convention) to assert AC-10/AC-8 name it correctly.
- **ACs advanced**: 8 (fully), ADR-294 AC-10 (fully).
- **Status**: NOT STARTED (discussion complete, all decisions ruled 2026-08-02)

### Phase 4: Search-budget tool — first-firing search, force-prefix composition
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phase 1 and Phase 2 merged (occurrence-indexed forcing exists — D12's "force-prefix then search-last" composes from it). Independent of Phase 3.
- **Note**: Open Decision 5 is RULED (a) — in-process. The deliverable below stands as written.
- **Phase-start rulings (David, 2026-08-02)**: CLI shape is `--search <point>=<CLASS> <transcript>` (the transcript is the command driver; success prints tries-spent plus the exact `point-seed:` header line to paste). Default budget is **10 × declared class count** (uniform prior over classes — D12's ~10× inverse probability with p≈1/classCount), overridable per use with `--search-budget N`; a rarer true p reports budget-exhausted honestly. Design fact pinned at phase start: the tool varies the **target point's stream** (D11 override), never the master seed — master-seed variation changes every stream and breaks D12's schedule-invariance, so the reproducible artifact is `(master seed, point-seed)`. Force-prefix composition falls out of zero-draw forcing (a forced prefix never materializes the target stream, so the candidate override governs the first *drawn* firing); the one documented limitation is a force prefix that completes in the same turn as the searched firing (occurrence counters are session state and are not rolled back by restore).
- **Status note**: COMPLETE (2026-08-02, session 72111f, commit d5717bce — search finds and reproduces through the shipped bundle; all four mutation-verification findings closed inline; tester 207 / chain 952 / corpus / build green)
- **Deliverable**: A search harness (new small module, likely `packages/transcript-tester/src/search.ts` or a sibling package if the embedding API argues for isolation — decide at implementation time based on how cleanly it can reuse `EngineRandomService`/story-loader without a CLI round-trip) that: loads the story once; for a target `(point, class)`, tries successive master seeds (or, composing with Phase 2, force-prefixes occurrences `#1..#n-1` and searches only the nth firing) by forking the *world* via `toJSON()`/`loadJSON()` rather than spawning a process; reports tries-spent on success or budget-exhausted on failure, budget = 10× the class's measured/declared inverse probability (D12 — "measured per use, never declared" as a flag, so the budget is computed from the point's actual class count/probabilities where knowable, not author-asserted). CLI surface: a `--search <point>=<class>` mode (naming TBD with David) reporting the found seed (feeds back through `--seed` per D12's replay guarantee).
- **Exit state**: Searching a first-firing point for an underrepresented class (e.g. a low-probability `throwing.breaks` outcome) succeeds within budget and reports a reproducible seed; searching an over-budget target reports budget-exhausted rather than hanging.
- **Verification**: `pnpm --filter '@sharpee/transcript-tester' test`; a real search run against `stories/dungeo` for a known low-probability class, verifying the reported seed reproduces the outcome via `--seed` (rule 13a — the real bundle, no modeled/stubbed engine, per D12's "search executes the real engine and never models it"); a deliberately-impossible target (undeclared class or zero-probability) to confirm budget-exhausted reporting rather than an infinite loop.
- **ACs advanced**: groundwork for D12 (no ADR-293 AC numbers directly name search — see AC Mapping; this closes the "search budget" deliverable named in ADR-293's Phase C description).
- **Status**: NOT STARTED (discussion complete, all decisions ruled 2026-08-02)

### Phase 5: Integration and full Phase-C acceptance pass
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phases 1–4 merged; full platform build green throughout (none of Phases 1–4 touch the `ActionContext`/`RandomService` type surface Phase A already stabilized, so no ordering-hazard arc like Phase A's Phases 4–6 is expected here — flag immediately if any phase's implementation surprises this assumption).
- **Deliverable**: No new source changes expected beyond acceptance-pass fixups. Runs every Phase-C-gated AC end to end:
  - **AC-9**: the occurrence-index motivating case (`villain.blow#1..#2 → SERIOUS_WOUND`, firing #3 draws naturally to `KILLED`) against the real bundle; an unfired `once` force fails a transcript run with a named error.
  - **AC-10**: a forced run's trace vs. the same seed unforced — every *other* point's sequence identical.
  - **AC-11**: `point-seed:` reproduces a specific natural outcome, trace reads `drawn`.
  - **AC-12** (regression only — already closed in Phase A): reconfirm every run still reports its seed and a failure's seed still reproduces via `--seed`; do not treat this as new Phase C work.
  - **AC-13**: the three FORCE-specific rejections (duplicate force keys, undeclared forced class, unknown point name) as named failures, plus a regression check that Phase A's already-closed clauses (non-integer/out-of-range seed, `[SEED:]`/`seed:` non-first-chain-member, `--seed`/`--vary` mutual exclusion) still hold.
  - **AC-14**: run a published build (trace/coverage gate off) and confirm zero `severity: 'debug'` system events from the randomness subsystem — by observation of the event stream, not by inspecting the enabling flag (mirrors Phase A's AC-14-equivalent methodology).
  - **ADR-294 AC-10 / AC-11**: reconfirm end-to-end as a side effect of the above (already closed individually in Phases 2/3; this is the cross-check).
  - Full `wt-*` walkthrough chain, run repeatedly at a pinned seed, confirms zero regression from Phase C's changes (byte-identical where already established in Phase A's AC-2 closure, modulo the four Phase-B-converted handlers' known state).
  - `tsf build --npm` regression check across the touched publishable packages (core, engine, transcript-tester) per standing project practice.
- **Exit state**: All Phase-C-gated ACs (8, 9, 10, 11, 13's remaining clauses, 14) pass with evidence recorded; AC-12 reconfirmed as a regression check. `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md`'s AC-10 and AC-11 close as a documented side effect.
- **Verification**: all commands above, run for real with output recorded inline per the project's evidence-inline convention.
- **ACs advanced**: 8, 9, 10, 11, 13 (remaining clauses), 14 — all confirmed end to end; 12 reconfirmed (no new work). ADR-294 AC-10, AC-11 confirmed.
- **Status**: COMPLETE (2026-08-02, session 72111f, commit 803afec5 — **plan complete**; all Phase-C ACs green through the shipped bundle. Acceptance-pass fixups: story/extension materialize throw-stubs replaced with real representatives (drawn≡forced contract pinned by test); stdlib.attacking's throw kept deliberately — AttackBehavior.attack mutates during sample, so forcing it needs a draw/apply split (flagged follow-up alongside the deferred Phase 6 gate). AC-9 delta noted: at hero base strength 2 the wound prefix is one LIGHT_WOUND, not the ADR's illustrative two SERIOUS_WOUNDs.)

### Phase 6 (DEFERRED — ruled out of this plan, David 2026-08-02): coverage-manifest `verify` gate
- **Tier**: Small
- **Budget**: 100
- **Entry state**: Phase 3 merged (coverage report / `getRegisteredPoints()`-crossed-with-trace exists) and Phase 5's acceptance pass green. **Open Decision 3 was ruled DEFER (David, 2026-08-02) — this phase is NOT part of the current plan.** It stays written for the follow-on session that picks it up, once the coverage report has real runs behind it.
- **Deliverable**: A checked-in coverage manifest (mapping every registered choice point to the tests that exercise it, or a deliberate uncovered-exemption entry) plus a `repokit verify` gate comparing newly-declared points against it — modeled directly on `tools/repokit/src/commands/random-gate.ts`'s allowlist shape (D16: "the gate compares against the manifest, not against a live corpus run, so verify stays fast; refreshing the manifest is part of blessing").
- **Exit state**: `./repokit verify` fails when a newly-declared point has zero manifest coverage and is not deliberately exempted; passes on the resolved tree with the manifest generated from Phase 3/5's coverage run.
- **Verification**: `./repokit verify`; deliberately declare one new zero-coverage point and confirm the gate fails, then revert.
- **ACs advanced**: none of ADR-293's 8–14 directly (this is ADR-294 D16 exclusively) — informational closure of a named-but-undated ADR-294 deliverable.
- **Status**: DEFERRED (ruled out of this plan — see entry state)
