# Session Plan: Implement ADR-273 (GrammarScopeResolver calls a WorldModel API that does not exist)

**Created**: 2026-07-25
**Overall scope**: Fix the defect ADR-271 Phase 4 exposed: `GrammarScopeResolver` calls WorldModel
methods that never existed and fails closed to zero candidates on every `.where()`-gated command.
The fix spans three packages — world-model gains a real `ReachabilityBehavior` (D4, closing the
sibling-op asymmetry with `VisibilityBehavior`/`canSee`), stdlib's `ScopeResolver.canReach` delegates
to it (behavior-preserving), and parser-en-us's `GrammarScopeResolver` is rewritten against
WorldModel's real surface (D1–D3). Scope is exactly ADR-273's D1–D5 / acceptance items 1–6.
**Bounded contexts touched**: N/A — platform/compiler engineering (world-model behavior layer →
stdlib scope resolution → parser-en-us grammar scope bases), not domain business logic. No
`docs/ddd/notation.yaml` exists in this project. Phase names use the codebase's own precise
vocabulary (`ReachabilityBehavior`, `canReach`, scope base, requirement word) because that
vocabulary is exact, not because DDD framing applies.
**Key domain language**: N/A (see above) — technical vocabulary only: `ReachabilityBehavior`,
`canReach`/`getReachable`, scope base (`visible`/`touchable`/`carried`/`all`/`nearby`), sight
precondition, one-definition discipline.

**Linkage — pointer flip-back on completion**: This plan supersedes `docs/work/grammar-parity/plan.md`
as the `.current-plan` target. That plan's Phase 4 is **BLOCKED** on exactly this work (fernhill
578/593, 15 failures, one root cause — this defect). When this plan's Phase 4 exit state is reached
(ADR-273 acceptance 1–6 satisfied), flip `docs/context/.current-plan` back to
`docs/work/grammar-parity/plan.md` and mark its Phase 4 unblocked — do not leave the pointer on this
plan after completion.

## References consulted
- `docs/architecture/adrs/adr-273-grammar-scope-resolver-world-api.md` — ACCEPTED (14/14 READY), the source of this plan's D1–D5 decisions and acceptance items 1–6; scope boundary is exactly this ADR.
- `docs/architecture/adrs/adr-271-chord-grammar-compiler-pass-through.md` — parent; its acceptance items 1 and 6 are blocked on this ADR; Phase 4 (fernhill/friendly-zoo regression + refusal-proof transcript) is what this plan's Phase 4 hands back to.
- `docs/work/grammar-parity/plan.md` — Phase 4 BLOCKED entry records the exact failure evidence (fernhill 578/593, one root cause) and names ADR-273 as the unblock condition; this plan's Phase 4 exit state must satisfy that phase's entry state.
- `/Users/david/repos/sharpee_v2/CLAUDE.md` (root) — never auto-retry failed builds/tests (report and wait); platform changes under `packages/` require prior discussion (satisfied — ADR-273 is the discussion record); `./repokit build` for platform builds, `dist/cli/sharpee.js --test --chain` for ALL transcript testing; don't modify working transcripts; never delete files without confirmation; `pnpm --filter '@sharpee/<pkg>' test <name>` (no `2>&1`).
- `packages/world-model/CLAUDE.md` — root barrel discipline: new exports must thread `leaf index.ts` → `traits/index.ts` (or equivalent world subdir barrel) → root `src/index.ts`, or the CLI fails with "X is not a constructor" / silent misses; circular-dep check via `npx madge --circular` if the CLI hangs on startup.
- `packages/stdlib/CLAUDE.md` — four-phase action/behavior pattern context; capability dispatch conventions bound the delegation change to a narrow, behavior-preserving swap rather than a broader refactor of `ScopeResolver`.
- `packages/parser-en-us/CLAUDE.md` — parser owns grammar, language layer owns text; grammar pattern conventions (`.forAction()`, `.where()`) frame what the resolver rewrite must keep compatible with.
- `docs/context/project-profile.md` — domain-modeling/engine test-assertion convention: verify via post-call `WorldModel` entity/trait state inspection, not "didn't throw" or return-value-only checks; this shapes every phase's test gate below.
- `docs/context/session-20260725-62d511-main.md` — newest session file by filename sort; unrelated (npm CI trusted-publishing work), but its Notes explicitly flag uncommitted `packages/chord`/`if-domain`/`story-loader` changes from the prior ADR-271 session as left untouched — confirms no conflicting in-flight change to the packages this plan also touches (parser-en-us, world-model, stdlib are untouched by that session).

## Phase dependency note

Phases 1 → 2 → 3 → 4 are a true dependency chain, not an arbitrary pipeline: Phase 2 needs Phase 1's
`WorldModel.canReach`/`getReachable` to delegate to; Phase 3 needs Phase 1's `getReachable` (D2's
`touchable` mapping) and is independent of Phase 2's stdlib delegation (different package, same
WorldModel surface) — Phases 2 and 3 **could run in parallel** once Phase 1 lands, since neither
reads the other's output. Phase 4 needs both 2 and 3 complete (full delegation chain + resolver
rewrite) before a platform build can prove anything end-to-end.

## Phases

### Phase 1: `ReachabilityBehavior` in world-model (D4)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/world-model/src/world/` — new `ReachabilityBehavior.ts`, `WorldModel.canReach`/`getReachable`, `ScopeEvaluator.getTouchableEntities` one-definition discipline, root barrel
- **Entry state**: ADR-273 ACCEPTED. `packages/world-model` builds clean on main. No prior changes to `VisibilityBehavior.ts`, `WorldModel.ts`, or `scope-evaluator.ts` in this work.
- **Deliverable**:
  - New `packages/world-model/src/world/ReachabilityBehavior.ts`, mirroring `VisibilityBehavior.ts`'s shape (static methods), porting stdlib's `ScopeResolver.canReach` logic (`packages/stdlib/src/scope/scope-resolver.ts:107-164`) **unchanged**: sight precondition first (delegates to `canSee`); carried → reachable; same immediate location → reachable; target container is another actor → blocked unless `OpenInventoryTrait`; supporter → reachable; container → requires `OpenableTrait.isOpen`; default same-room+visible → reachable.
  - `WorldModel.canReach(observerId, targetId)` and `WorldModel.getReachable(observerId)` added, mirroring the existing `canSee`/`getVisible` pair (`WorldModel.ts:1638, 1659, 1681`).
  - `ScopeEvaluator.getTouchableEntities` (`packages/world-model/src/scope/scope-evaluator.ts:226-230`, currently "touchable = visible for now") either delegates to `ReachabilityBehavior` or gains a comment naming it superseded for physical reachability — the one-definition discipline the ADR-273 review folded into D4.
  - New file's exports threaded through the root barrel chain (leaf `index.ts` → `world/index.ts` or equivalent → root `src/index.ts`) per world-model's barrel discipline.
  - Unit tests in world-model, each asserting on real `WorldModel` state per project-profile convention (not "didn't throw"): closed transparent container = visible but NOT reachable; carried item = reachable; another actor's inventory blocked without `OpenInventoryTrait`, allowed with it; open container contents reachable.
- **Exit state**: `ReachabilityBehavior` exists and is barrel-exported; `WorldModel.canReach`/`getReachable` are real, callable methods; `ScopeEvaluator`'s stub either delegates or is clearly marked superseded; `pnpm --filter '@sharpee/world-model' test` green including the new suite; `npx madge --circular packages/world-model/src/index.ts` clean if new imports were added.
- **Acceptance coverage**: Acceptance item 5 (world-model unit tests on real world state for the ported rules) and the world-model half of D4.
- **Test gate**: `pnpm --filter '@sharpee/world-model' test <name>` — assertions on post-call entity/trait state and returned entity sets, per project-profile convention.
- **Status**: DONE (2026-07-25 — ReachabilityBehavior + WorldModel.canReach/getReachable + ScopeEvaluator
  delegation (with non-WorldModel fallback); 10 new tests incl. the defining divergence (glass jar:
  visible NOT reachable); world-model suite 1432/1432. Madge note: 7 cycles pre-existed; the 3 new
  entries are type-level paths through the same pre-existing WorldModel↔world/index↔capabilities
  cluster, mirroring VisibilityBehavior's import pattern — no new value-level runtime cycle; Phase 4's
  CLI run is the final proof. Discovery for Phase 3: four parser-en-us test files mock the fictional
  API (grammar-scope, colored-buttons, adr-231-d2b-specificity, walk-through-pattern) and must move to
  the real surface.)

### Phase 2: stdlib delegation (D4, behavior-preserving)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `packages/stdlib/src/scope/scope-resolver.ts` — `ScopeResolver.canReach`
- **Entry state**: Phase 1 done — `WorldModel.canReach` exists and is tested. No other change to `scope-resolver.ts` in this work.
- **Deliverable**:
  - `ScopeResolver.canReach` body replaced with a delegation to `world.canReach(observerId, targetId)`, mirroring the existing `canSee` delegation shape (`scope-resolver.ts:96-102`) exactly.
  - No other logic in `scope-resolver.ts` changes. No new tests are required to *add* coverage — the existing stdlib suite is itself the regression proof (acceptance 6) and must pass unchanged, asserting the swap introduced no behavior change.
- **Exit state**: `ScopeResolver.canReach` is a one-line (or near one-line) delegation; `pnpm --filter '@sharpee/stdlib' test` passes with the exact same pass/fail set as before this phase (behavior-preserving, not merely "still green").
- **Acceptance coverage**: Acceptance item 6 (delegation is behavior-preserving, stdlib suite passes unchanged).
- **Test gate**: `pnpm --filter '@sharpee/stdlib' test <name>` — diff the pass/fail set against a pre-change baseline run, not just "green."
- **Status**: DONE (2026-07-25 — baseline 111 files / 1576 passed / 27 skipped; post-swap identical.
  One Phase-1 leftover surfaced by tsc and completed: AuthorModel (second IWorldModel implementer)
  gained the two delegating methods.)

### Phase 3: `GrammarScopeResolver` rewrite (D1/D2/D3)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/parser-en-us/src/grammar-scope-resolver.ts` — base mapping, header comment, fail-closed logging
- **Entry state**: Phase 1 done (`WorldModel.getReachable`/`getVisible`/`getCarriedAndWorn`/`getAllEntities` all real and tested). Independent of Phase 2 — different package, same WorldModel surface; may run before, after, or interleaved with Phase 2.
- **Deliverable**:
  - `GrammarScopeResolver`'s base mapping (currently `grammar-scope-resolver.ts:116-162`) rewritten per D2: `visible` → `world.getVisible(actorId)`; `touchable` → `world.getReachable(actorId)`; `carried` → `world.getCarriedAndWorn(actorId)` flattened to a single union of `carried` + `worn` (the current call site expects a flat array, `getCarriedAndWorn` returns `{carried, worn}` — the resolver does the flattening); `all` → `world.getAllEntities()`; `nearby` → falls back to `visible`, as today's code intends.
  - Fail-closed behavior stays (a missing world or uncomputable base still yields zero candidates — a parse-time gate must not guess) but the degradation is now logged (`console.warn` or the file's existing logging convention), per D3 — not silently swallowed.
  - Header comment (lines 1-13) rewritten to name the real WorldModel methods called (acceptance 4) — no more claiming delegation to `getVisibleEntities`/`getTouchableEntities`/etc., which never existed.
  - Unit tests in parser-en-us, each exercising a scope base (`visible`, `touchable`, `carried`, `all`) against a **real** `WorldModel` instance and asserting on the returned entity sets (acceptance 3) — not "no throw."
- **Exit state**: The resolver calls only real WorldModel methods; its header comment is accurate; `pnpm --filter '@sharpee/parser-en-us' test` green including the new per-base tests.
- **Acceptance coverage**: Acceptance items 3 (unit tests per base against real WorldModel) and 4 (header comment accuracy).
- **Test gate**: `pnpm --filter '@sharpee/parser-en-us' test <name>` — assertions on returned entity sets per base, per project-profile convention.
- **Status**: DONE (2026-07-25 — resolver rewritten to the real surface (visible→getVisible,
  touchable→getReachable, carried→getCarriedAndWorn ∪, all→getAllEntities, nearby→visible fallback);
  warnDegraded on every fail-closed path (D3); header accurate (acceptance 4); 7 per-base tests vs a
  REAL WorldModel incl. the glass-jar divergence and name-lookup gating (acceptance 3). FIVE fictional
  mocks migrated, not four — story-grammar.test.ts was the same class but mocked only
  getVisibleEntities, so the getTouchableEntities grep missed it; its 2 failures confirmed the D3
  warning works. parser-en-us suite 23/23 files, 280 passed.)

> **Phase 4 discovery (2026-07-25, owner-approved fix)**: second latent defect on the same path —
> `findEntitiesByName` had no article handling, so `pet goat` gated correctly but `pet the goat`
> (and every articled fernhill command) died at zero matches. Fix: leading `the|a|an` stripped with
> original-text-first matching (an entity named "The Grail" wins its exact match before stripping);
> risk cases analyzed with owner (regression: none constructible; known limit: non-article
> determiners `my/that/some` remain unhandled — fuller fix is determiner-tagged token stripping in
> the slot consumer if it ever bites). 3 new tests; parser-en-us 283 passed.

### Phase 4: End-to-end verification + hand-back to grammar-parity (acceptance 1, 2)
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: Platform build + probe story + `fernhill`/`friendly-zoo` transcript suites; pointer flip-back to `docs/work/grammar-parity/plan.md`
- **Entry state**: Phases 1–3 done — full delegation chain live (world-model `ReachabilityBehavior` → stdlib `ScopeResolver.canReach` → parser-en-us `GrammarScopeResolver`). No platform build has run yet against the new code.
- **Deliverable**:
  - `./repokit build` (full platform rebuild — the new world-model/stdlib/parser-en-us code must be in the bundle; per CLAUDE.md, always use `dist/cli/sharpee.js` for transcript testing).
  - Re-run the ADR-271 probe story (`pet goat`, `the animal must be reachable`, goat in the same room): confirm it now parses and dispatches; confirm the same command with the goat absent/out of scope is refused (acceptance 1).
  - Run the `fernhill` (593) and `friendly-zoo` unit transcript suites via `dist/cli/sharpee.js --test` (and `--chain` for `wt-*` walkthroughs), per CLAUDE.md's transcript-testing conventions. Review every diff individually — never batch-accept (acceptance 2). Per ADR-273's own note: the `cellar-dark` transcript exercises the ported sight precondition (`canReach` requires `canSee` first) — if a diff shows a constrained command refusing in a dark room, that is design-consistent platform stance to surface, not a defect to patch.
  - If build or transcripts fail unexpectedly: **report and wait** — do not loop fix→rebuild→retest without explicit user go-ahead (CLAUDE.md MAJOR DIRECTIONS).
  - On successful completion of acceptance items 1–6: flip `docs/context/.current-plan` back to `docs/work/grammar-parity/plan.md`, and update that plan's Phase 4 entry from BLOCKED to reflect ADR-273 landed (unblocked) — do not leave the pointer on this plan.
- **Exit state**: Probe story demonstrates acceptance 1; fernhill/friendly-zoo suites pass with every diff reviewed (acceptance 2); `.current-plan` points back at `docs/work/grammar-parity/plan.md`; that plan's Phase 4 is unblocked and ready to resume.
- **Acceptance coverage**: Acceptance items 1 (probe passes / refuses correctly) and 2 (ADR-271's blocked items unblock — fernhill/friendly-zoo green, diffs reviewed).
- **Test gate**: `node dist/cli/sharpee.js --test --chain stories/fernhill/walkthroughs/wt-*.transcript` and the `friendly-zoo` equivalent, plus `stories/*/tests/transcripts/*.transcript`, plus the probe story.
- **Status**: DONE (2026-07-25 — acceptance 1: probe `pet goat` AND `pet the goat` dispatch, absent
  target refused. Acceptance 2: fernhill 18/18 unit transcripts + wt chain 76/76; friendly-zoo units
  71/71 + wt chain 56/56. cellar-dark passed as-is (no darkness refusal to surface). Suite test
  counts vary run-to-run (RNG/timer transcripts) — per-transcript pass/fail is the stable metric.
  THIRD discovery, pre-existing and out of scope: the bundled CLI cannot cold-transpile hatched
  stories — devkit hatch-transpile.ts (ADR-259 D6 amendment 2026-07-23) calls esbuild.buildSync,
  whose inlined-in-bundle sync worker never answers (main thread parks in Atomics.wait, 0% CPU);
  masked until the $TMPDIR/sharpee-hatch cache purged (~3-day macOS temp cleanup). Worked around by
  warming the cache with real esbuild (scratchpad/warm-hatch-cache.js, byte-identical key); the
  defect is recorded for its own ADR (ADR-274 candidate: esbuild external to the CLI bundle, owned
  by devkit/repokit). Pointer flipped back to docs/work/grammar-parity/plan.md.)
