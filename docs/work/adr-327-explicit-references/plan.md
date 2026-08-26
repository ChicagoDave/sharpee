# Session Plan: Implement ADR-327 — explicit references (actor-explicit heads, `it`/`its` removal, the player role)

**Created**: 2026-08-25
**Plan Status**: ACTIVE
**Overall scope**: Land ADR-327 D1–D4, D6, D8–D10 (Chord grammar reform, corpus migration, the player-as-role mechanism) as a one-shot MAJOR cutover. D5 (move-arrival fires the entering clause for any actor) is **already implemented** — Phase 3 of `docs/work/backlog-tier1-2-platform/plan.md` (#311, committed `f9e8fe3a`, cap 8, `runtime.move-arrival-reentry`) — and is not re-planned here. D7 (non-player actors fire their own heads) cannot go green until ADR-328's own plan lands its `(action, actorId)` execution entry; this plan makes that split explicit rather than absorbing it (see Phase 6).
**Bounded contexts touched**: Chord Story Language (`packages/chord`, `packages/story-loader`) and, for D9 only, the Engine's existing PC-switch mechanism (`packages/engine`, ADR-132). No new bounded context — this is a grammar/runtime reform expressed in Sharpee's own ubiquitous language (actor, role, carrier, clause head), not new domain modeling.
**Key domain language**: actor (a clause head's subject, matched against the acting entity), the player role (`the player` resolves to `world.getPlayer()` at fire time, never a compile-time entity binding), own-block bare head (the D1 exception: a block's owner needs no pronoun), carrier (D8's `it`/`its` meaning inside `define trait` only), clause head (the `on`/`after <actor> <gerund>` pattern this ADR generalizes).

## References consulted
- `docs/architecture/adrs/adr-327-explicit-references.md` — the subject of this plan; its own Non-goals bar this plan from building any NPC action pipeline, from adding a second deictic, and from touching `here`/bare-timer resolution.
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` — D2's `(action, actorId)` execution entry does not exist yet (`context.player` reads across 49 stdlib action files are still live); this is the hard constraint behind Phase 6's gate.
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` — D3h's `create the player`/`it` examples are this plan's amendment obligation at landing; its place-expression shape is the loader-evaluated-construct precedent D9/D10 follow.
- `docs/architecture/adrs/adr-264-chord-numeric-counters.md` — D2's `raise its suspicion by 5` form is struck by this plan's D2 sweep; the possessive-by-name form is the survivor.
- `docs/architecture/adrs/adr-132-pc-switching.md` — `engine.switchPlayer` (`game-engine.ts:1681`) is the existing mechanism D9 must call unchanged, not reimplement.
- `docs/architecture/adrs/adr-319-flashbacks.md` — rotating PC is the live requirement behind D1's role rule and D9; its vocabulary/pronoun/status-line parts stay ADR-319's, out of this plan's scope.
- `docs/architecture/adrs/adr-228-interceptor-lifecycle-engine.md` — lifecycle slot semantics (which entity's clause is consulted) are unchanged by this reform; only the head's actor match is new.
- `docs/architecture/adrs/adr-270-author-alteration-model.md` — the MAJOR-cutover precedent (`define verb` deletion, Chord 3.0.0) this plan's D6 sweep follows: one landing change, no deprecation window.
- `docs/architecture/adrs/adr-257-chord-language-version.md` — Chord's independent semantic version; this reform is the next MAJOR bump, hand-maintained in `packages/chord/src/version.ts`.
- `docs/context/project-profile.md` — Chord Story Language mutation-signature bar (assert on emitted IR fields and specific diagnostic codes, never "parsed without throwing"); platform-change discussion-first discipline (CLAUDE.md, restated here).
- `docs/context/session-20260825-0127-feat-adr-321-world-index.md` — Open Items: D5 already lands with Phase 3; "ADR-327's full reform and ADR-328's program need their own plans — explicitly out of scope for Phase 3"; ADR-325 D3h and ADR-264 D2 amend "at ADR-327's D6 cutover."
- `docs/work/backlog-tier1-2-platform/plan.md` — Phase 3's shape-doc-then-build pattern (present mechanism, get a ruling, then build) reused for Phases 1/3 below; confirms this plan's scope is deliberately separate from that plan's own.

## Sequencing and commit discipline (self-review finding)

D6 mandates a **one-shot** MAJOR cutover — old spellings become named errors and every
in-repo story/fixture migrates "in the landing change." Read literally against CLAUDE.md
rule 14 ("do not commit code without running the existing test suite") and this repo's own
established convention (every phase in `docs/work/backlog-tier1-2-platform/plan.md` commits
with full corpus/Dungeo-chain regression green), Phases 1–3 below are **not** independently
committable in that sense: once Phase 1 lands, any package that loads real story text through
the new analyzer (story-loader's own fixtures, the corpus) fails to parse until Phase 4
migrates it — that is D6 working as designed, not a bug, but it means Phases 1–4 form one
landing unit for commit purposes even though they are separate session-sized phases for
planning purposes. **Resolution**: local `git commit`s after each phase are fine (this is
`feat/adr-321-world-index`, not yet merged to `main`), but each phase's Exit state below is
scoped to the packages that phase actually changed — a story-loader/corpus/Dungeo-chain run
between Phase 1 and Phase 4 is *expected* to show old-spelling failures and is not a
regression to chase. Do not run the full-corpus regression baselines (`./sharpee test
branch-stories/secret-letter`, the Dungeo chain, fernhill/ides/zoo/cloak) until Phase 4 —
running them earlier and treating their failures as blocking would misread D6's own design.

## Tradeoff surfaced by the ADR (D7 vs. ADR-328's own plan)

ADR-327 D7 says named actors fire "on ADR-328's execution path," and that path (the `(action, actorId)` entry, `CommandExecutor`'s dormant `actorId` going live, the 126 `context.player` reads across 49 stdlib files) does not exist today and is explicitly ADR-328's own future plan. Two ways to close this:

- **(a) Gate and defer** — this plan's Phase 6 stays PENDING behind a named external dependency: ADR-328's own plan (not yet written) must land its execution entry first. Acceptance item 2's non-player half stays red until then; everything else in this plan (D1–D4, D6, D8–D10) ships and is real.
- **(b) Absorb the minimal D2 entry** — fold ADR-328 D2's execution entry into this plan so Phase 6 can close for real here.

**Recommendation: (a).** ADR-328 D2 is a 49-file stdlib rewrite in its own right (every standard action's actor-identity read), it is a platform change requiring its own discussion-first pass per CLAUDE.md, and ADR-328 itself frames it as a separate program, not a dependency to inline. Bundling it here would mix two ADRs' concerns in one plan and blow every phase budget below. Both options stay visible in Phase 6; David rules which one runs.

## Off-stage firing lands whole in ADR-328's plan (2026-08-26)

ADR-328 D3 was amended 2026-08-26: perception **tags** actor-sourced narration (`location` + `presence: present | absent | concealed`) and never drops it; the client decides what to show; the Phase C decision-10 firing gate on entity every-turn daemons (`runtime.ts:3270`, `:3327`, `:3486`) is retired. David: **no interim work — the change lands in full**: the daemon gate is removed in the same landing that carries the tag through `core` → `engine` → `text-blocks` → `channel-service` → clients (default renderer hides `absent`; IDE Play may show all). That is ADR-328's plan, not this one — it is what makes D9 Scenario B's dormant daemons act while the PC is elsewhere, but Phase 3's role gate is testable without it (PC in the room). When ADR-328's plan is written, this is its first witnessing phase and Phase 6 here depends on it alongside D2.

## Phases

### Phase 1: Chord grammar reform — actor-explicit heads, `it`/`its` removal, trait-carrier scoping (D1–D4, D6, D8)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `packages/chord` only (parser, analyzer, ast, ir, ebnf) — browser-safe, no runtime dependency added. D1 (actor-before-gerund heads, own-block bare-head exception, longest-first gerund match against the known set per D3), D2 (`it`/`its` removed from statement/condition/possessive positions), D4 (scene heads `resuming`/`refusing`/`parting`/conversation `leaving` untouched — assert by exclusion), D6 (each removed spelling is a named parse error with a fix-it quoting the explicit form; name/gerund-collision is its own named error), D8 (`it`/`its` scoped to `define trait` bodies as the carrier, in all three positions D2 removes elsewhere). Chord MAJOR version bump (3.4.0 → 4.0.0) lands here with the grammar change, per ADR-257.
- **Entry state**: Present the grammar/diagnostic design to David (per CLAUDE.md platform-change discipline) before editing `packages/chord`: the gerund-set matching algorithm, the own-block-exception detection (which block is "the actor's own"), the trait-scope boundary for D8, and the full list of named diagnostics with their fix-it text. `packages/chord` stays free of any runtime import.
- **Deliverable**: `parser.ts`/`analyzer.ts`/`ast.ts`/`ir.ts` support actor-explicit heads for single-object, two-object, multi-word-gerund, and custom-`define action` cases; own-block bare heads compile only inside an actor's own block and are the named error elsewhere; `it`/`its` compile only inside `define trait` (carrier semantics) and are the D2 named error everywhere else; name/gerund-boundary collision is a named analyzer error with a quote-the-line fix-it. `chord.ebnf` and `docs/architecture/chord-grammar-changes.md` rows added. `packages/chord/src/version.ts` bumped MAJOR; `tests/language-version.test.ts` and its 4 golden snapshots updated to match. Behavior Statements (rule 12) for each new/changed diagnostic-emitting function before its tests; each Acceptance-item-1 case gets a corresponding unit test in `packages/chord/tests/`.
- **Exit state**: `pnpm --filter '@sharpee/chord' run test:ci` green, including new coverage for every case in Acceptance item 1. Corpus (real stories) is **not** expected to parse yet — this is intentional mid-cutover state per ADR-270's precedent; migration is Phase 4.
- **Status**: CURRENT (since 2026-08-25)

### Phase 2: story-loader consumes the head's actor — the PLAYER-path match (D1's role rule, wired for the reachable path)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `packages/story-loader` (`event-contract.ts`, `runtime.ts`) consumes the IR's new clause-actor field and filters `on`/`after` firing by matching the head's actor against the acting entity — `the player` resolved via `world.getPlayer()` at fire time, exactly as `when the player moves` already does (`runtime.ts:755-756`) and exactly as D5's already-shipped move-arrival actor match does (the direct precedent to extend uniformly to intercept/reaction clauses, not a new pattern).
- **Entry state**: Phase 1 shipped (IR carries the actor field). Present the firing-filter design to David before editing `story-loader` — reuse of D5's pattern, and how a compiled-but-unreachable non-player head is handled today (parses, never fires, per D7's known gap — not an error).
- **Deliverable**: Player-headed clauses (`on the player taking`, `after the player entering`) fire when and only when the player is the acting entity; own-block bare heads keep firing exactly as before (unchanged — they're owner-scoped, not actor-matched). REAL-PATH loader test (rule 13a): a fixture story with a player-headed clause and a differently-named-actor-headed clause on the same gerund, asserting only the player one fires on a player action.
- **Exit state**: `pnpm --filter '@sharpee/story-loader' run test:ci` green with new actor-match coverage. Acceptance item 2's player-path half ("the player's action fires `on the player <gerund>` and not `on the mercenaries <gerund>`") is green; the non-player half stays explicitly open, tracked in Phase 6.
- **Status**: PENDING

### Phase 3: D9 + D10 — the player role: assignment, reassignment, and the start block
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `packages/chord` (the `playable` create-block line; the `before the game starts … end before` top-level block, at most one; `create the player` → `parse.removed-create-player` with fix-it), `packages/story-loader` (`playable` → `ActorTrait.isPlayable`; runs the start block once, after world build and before turn one; `change the player to <entity>` emits `if.event.player.switch_requested {entityId}`), `packages/engine` (`game-engine.ts` consumes the event at turn end and calls the existing `switchPlayer` — its first caller; a second `switch_requested` in one turn is a named runtime diagnostic; `game.pc_switched` follows unchanged from ADR-132).
- **Entry state**: Phase 1 shipped (grammar for `playable`/start-block/`change the player to` needs the same parser pass). Phase 2 shipped (the new PC's `after the player entering` needs the actor-match to follow the role, not a stale binding). Present the design to David before editing `chord`/`story-loader`/`engine`: the start block's placement in the loader's turn-zero sequencing (ahead of the first room description), the `playable` compile-time gate (non-`playable` target is an analyzer error, so `switchPlayer`'s own throw never reaches a player), and the loader's event-only boundary to the engine (no engine handle held by the loader, matching the existing `triggerEnding` seam).
- **Deliverable**: `playable`, `before the game starts … end before`, `change the player to <entity>`, and the `create-the-player` removal diagnostic all parse and analyze per D9/D10. A missing role assignment or a second start block is a named compile error. Through a real engine (rule 13a): the switch takes effect at the fired turn's end, the next turn's `after the player entering` fires for the new PC and not the old one, the old PC's own-block clause still fires when the old PC acts, two switches in one turn raise the named diagnostic, and `world.getPlayer()` is the assigned character at turn one.
- **Role gate on autonomous behaviour (D9 note, 2026-08-26)**: every entity-owned `on every turn` daemon (`runtime.ts:3254-3277`) checks at fire time that its owner is not `world.getPlayer()`; the NPC tick skips the role-holder; the loader's `!irEntity.isPlayer` guard on `NpcTrait` (`loader.ts:871`) goes with `create the player`. Real-path tests for both D9 scenarios: (A) switching to an NPC with every-turn clauses silences them from the next turn and wakes the old PC's; (B) clauses authored on the starting PC stay silent until it stops being the PC, then fire. The NPC-tick skip touches `packages/stdlib` (`npc-service`) — discuss before editing. Tests here keep the current PC in the room, so they pass under the existing presence gate and again after it is retired.
- **Exit state**: Acceptance items 5 and 6 fully green, real-path, through a real engine. `pnpm --filter '@sharpee/chord' run test:ci`, `pnpm --filter '@sharpee/story-loader' run test:ci`, `pnpm --filter '@sharpee/engine' test` all green.
- **Status**: PENDING

### Phase 4: Corpus migration sweep — stories, fixtures, and the D8 trait specimen (D6, mechanical)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: Every in-repo story and fixture migrates in this landing change per D6 — no deprecation window. Production stories: `branch-stories/{fernhill,ides-of-march,secret-letter}`, `stories/{friendly-zoo,cloak}` (Dungeo is TypeScript, untouched). Package test fixtures: 83 files across `packages/chord/tests`, `packages/story-loader/tests`, `packages/world-index/tests` (inline story strings and `.chord`/`.story` fixtures). The D8 specimen: `mercenaries.chord`'s `kick-escape` trait rewritten to carrier-relative `it`/`its` (the corpus's own worked example in the ADR). `create the player` in all 61 matching files migrates to D10's shape (name the character, mark `playable`, assign the role in a `before the game starts` block); `starts in` stays on the character.
- **Entry state**: Phases 1–3 shipped (grammar and runtime are final — migrating against a moving grammar target is wasted work). Present the sweep's mechanism to David before mass-editing story content files: each `it`/`its` resolves statically to its enclosing block's owner (mechanical per the ADR's own corpus-scale note), each bare head is checked individually (own-block survives, else migrates), each `create the player` becomes a start-block assignment — confirm before editing rather than scripting silently over authored story prose.
- **Deliverable**: All 45 files / 172 `it`-head occurrences and 218 syntactic `it`/`its` occurrences (minus the D8 survivors) migrated; all 18 bare heads checked and resolved (own-block kept, else migrated); all 61 `create the player` occurrences (17 stories/fixtures counted by the ADR, the rest package test fixtures) migrated to D10's shape; IDE test references (`tools/ide/web/testing-surface/tests/{tree-session-real-path,ac-signoff-cli}.test.ts`, `tools/ide/SharpeeIDETests/{TestingSurfaceRealPathTests,TestToolchain,TestRunnerTests}.swift`) updated to the new spelling.
- **Exit state**: `pnpm --filter '@sharpee/chord' run test:ci`, `pnpm --filter '@sharpee/story-loader' run test:ci`, `pnpm --filter '@sharpee/world-index' run test:ci`, `pnpm --filter '@sharpee/engine' test` all green. `./sharpee test branch-stories/secret-letter` (160 cards / 209 assertions, zero behavioral diffs attributable to the reform), plus fernhill/ides-of-march/friendly-zoo/cloak suites, all green. `./repokit build dungeo` then the Dungeo walkthrough chain (952 passing, 17 transcripts) unchanged — a single run is sufficient at the pinned seed. IDE TS tests (`testing-surface`) run via existing test command; `SharpeeIDETests` (Swift/XCTest) spot-checked via `xcodebuild test` if David wants that gate in this phase rather than deferred. Acceptance items 1 and 3 fully satisfied.
- **Status**: PENDING

### Phase 5: Paper trail — ADR supersession flips, docs, and the final regression gate (D6, Acceptance item 4)
- **Tier**: Medium
- **Budget**: 150
- **Domain focus**: The three named supersession flips owed by this landing (ADR-327's own "Supersedes — and who flips what" section): amend ADR-325's D3h examples to the explicit spelling (`when the player moves, while it is approaching` → `while the mercenaries is approaching`, its `create the player` block → the D10 shape); strike ADR-264 D2's `raise its suspicion by 5` clause, leaving the possessive-by-name form. Reference-surface updates (ADR-272): the book and `docs/reference`/sharpee.net's Chord reference wherever they carry the old spellings (10 doc files measured).
- **Entry state**: Phase 4 shipped (docs should describe the landed spelling, not an in-flight one). No further code changes in this phase.
- **Deliverable**: ADR-325 and ADR-264 amended in place (amend-after-code, both ADRs already ACCEPTED — this is a hand-edit, not a re-interview). `chord-grammar-changes.md` finalized. Book chapters and `docs/reference` doc files carrying old-spelling examples updated. `packages/chord/src/version.ts`'s MAJOR bump and its EBNF paper trail double-checked complete (carried from Phase 1, verified here as the closing item).
- **Exit state**: Acceptance item 4 satisfied — paper trail complete, both flips recorded. Full final regression re-run: every command from Phase 4's exit state green one more time after the doc-only changes (doc edits shouldn't move code, but this is the plan's closing gate — confirm nothing drifted). Session-end candidate: this is a reasonable point to write the work summary if the plan stops here for the session.
- **Status**: PENDING

### Phase 6: D7 — non-player actors fire their own heads (BLOCKED on ADR-328's own plan)
- **Tier**: Medium (scope depends entirely on what ADR-328's plan leaves for this side to consume)
- **Budget**: 250
- **Domain focus**: Extend Phase 2's actor-match from "the player" to any named actor, once ADR-328 D1/D2's `(action, actorId)` execution entry is live. This phase's own work is small — matching a clause head's actor against whatever `(action, actorId)` the pipeline now carries, for a non-player `actorId` — because Phase 2 already built the matching mechanism; what's missing is the upstream pipeline actually carrying a non-player `actorId` at all.
- **Entry state**: **External dependency, not just sequential**: ADR-328's own plan (not yet written — run `session-planner` for it separately when David is ready) must have landed its D2 execution entry (the 49-file `context.player` → command-actor rewrite) before this phase can start, regardless of whether Phases 1–5 here are done. See the Tradeoff section above — (a) is this plan's recommendation; if David instead wants (b), this phase's scope absorbs ADR-328 D2 itself and its budget/tier grow accordingly (re-plan at that point).
- **Deliverable**: `on the mercenaries taking` fires when the mercenaries take and not when the player does (Acceptance item 2's remaining half), via ADR-328's execution path. Real-path loader test extending Phase 2's fixture with an actual non-player action firing.
- **Exit state**: Acceptance item 2 fully green — ADR-327 is now complete per its own Acceptance criteria (all six items green).
- **Status**: PENDING (blocked on an ADR-328 plan that does not yet exist)

## Note on plan-pointer discipline
Per DEVARCH rule 18b, `docs/context/.current-plan` currently names `docs/work/backlog-tier1-2-platform/plan.md`, which still has live PENDING phases (4–8, the parser-scope-and-story-grammar seam). This plan does **not** repoint `.current-plan` — that requires David to first dispose of the backlog plan (done-but-unmarked / still-live / abandoned), which has not been asked. `docs/work/adr-327-explicit-references/plan.md` exists as a durable plan file but is not yet the active pointer target.
