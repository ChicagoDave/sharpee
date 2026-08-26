# Session Summary: 2026-08-26 - feat/adr-321-world-index

## Goals
- ADR-327 Phase 1: Chord grammar reform in `packages/chord` — actor-explicit heads, `it`/`its` removal, trait-carrier scoping (D1–D4, D6, D8), per the rulings in `phase-1-grammar-shape.md`.

## Phase Context
- **Plan**: `docs/work/adr-327-explicit-references/plan.md` — "Implement ADR-327 — explicit references (actor-explicit heads, `it`/`its` removal, the player role)".
- **Phase executed**: Phase 1 — "Chord grammar reform — actor-explicit heads, `it`/`its` removal, trait-carrier scoping (D1–D4, D6, D8)" (Large).
- **Tool calls used**: 163 / 400.
- **Phase outcome**: Completed under budget.

## Completed

### Chord grammar reform (packages/chord)
- `parser.ts`: `parseOnClause` splits the head syntactically — last word is the gerund, words before it become the actor as a `ref` ValueExpr. `parse.removed-head-it` (fix-it quoting `on the player <gerund>`, no cascade) and `parse.on-head` (empty head; role tail on a bare head) replace the retired `parse.on-target`/`parse.on-action`. New `headActorExpr` helper. `isOnClauseHead` splits placement (`on the table`) from clause head (`on the player taking`) by block structure — a head is followed by a deeper-indented body line or its own `end on`, a placement never is — because the leading article no longer distinguishes them (found mid-session, see Key Decisions).
- `ast.ts`/`ir.ts`: `OnClause.actor: ValueExpr | null`, `IROnClause.actor: IRValue | null`; binding `'it'` renamed to `'object'`; `IR_FORMAT` bumped to `story language 3`.
- `analyzer.ts`: `resolveHeadActor` (`analysis.head-actor`, `analysis.head-actor-is-owner`, `analysis.head-bare-outside-actor`); `checkGoingBinding` and `analysis.going-*` retired in its favor; `isActorSymbol` recognizes the player or `a person`. `Scope.carrierIt` is true in `define trait` bodies and in `define condition` (open-condition subjects — a second carrier scope found mid-session, see Key Decisions). `reportItRemoved` (`analysis.it-removed`, owner-named fix-it, span-deduped) and a new `possessiveBase` helper route every `its <field>` site (resolveValue, raise/lower, timer refs, `counterTargetOf`) through one report that names the owner (e.g. `Jack's lunge`). Stale fix-it texts updated across removed-when, define-behavior, conditional-composition, and match-outside-each diagnostics.
- `chord.ebnf`: head/actor/gerund grammar rows plus a D2/D4 note. `version.ts`: Chord 3.4.0 → **4.0.0**. `language-version.test.ts` pin re-recorded (sha `92a87324…`); 10 golden snapshots re-recorded and diff-reviewed (only `actor`/`binding`/named-owner/format/version lines changed).
- Fixture migration: ~50 chord test files, 8 `.story` fixtures, and 7 snapshot files migrated (`on <g> it` → `on the player <g>`, role heads, carrier-relative rewrites); `movement-clauses.test.ts`'s D3h tests rewritten for the new diagnostic codes. `docs/architecture/chord-grammar-changes.md` row added.
- New `tests/adr-327-phase1.test.ts` — 39 tests (Acceptance item 1): heads (single/two-object/hyphenated/`define action`/role tail/while+once), own-block bare heads and each error case, non-actors, every removed spelling with its fix-it text, D8 trait positions plus the one-block-out contrast and the open-condition case, D4 scene heads pinned as untouched, placement-vs-head disambiguation, wire-format stamps.

### Verification
- `pnpm --filter '@sharpee/chord' run test:ci` — 69 files, 1039 passing. Verified twice, independently: once directly (event log `06:36:48Z`, "69 passed 1039 passed") and once by the `session-checkpoint` agent (event log `06:38:13Z`, "Build passed"), both timestamped after the last source edit (`06:36:43Z`).
- Chord `dist`/`dist-esm` rebuilt.
- Repo `npx tsc --noEmit` clean [reported by session, unverified — no corroborating event-log row].

## Completed — Phase 2 (after commit `e0ebc947`)
- Phase 2 design presented (`phase-2-loader-shape.md`); David ruled Q1 (a) — actor consultation slot in stdlib — and Q2 — story-loader fixtures migrate in Phase 2.
- `packages/stdlib` `lifecycle-engine.ts`: `resolveLifecycle` appends an implicit actor consultation, **opt-in by key** `actorConsultationId(id)` = `actor:<id>` (the action-id-keyed version broke 8 stdlib tests — target-trait bindings the player also carries fired twice); `ACTOR_SLOT_ID`; four pin tests. stdlib 116 files / 1637 passing.
- `packages/story-loader`: `actorMatches` gates the interceptor, trait-interceptor, capability, `fireAfterClauses` (new `actorId` param), and `fireEventClause` paths; bare heads register on the owner under the actor key (`TraitType.ROOM` double-registration and its first-arm-wins defect retired); `playerCarriesClauses` + `createPlayer` marks the player (no world instance at bind in test order); `movedActorId` reads `data.actorId` (region crossings, D5 arrivals); three stale `LoadError` texts respelled. 31 fixture files migrated (pass 1 + fix-it pass). `tests/adr-327-actor-match.test.ts` — 13 REAL-PATH tests (interceptor both actors, occurrence keys as state, role follows `setPlayer`, bare heads under the actor key incl. the deferred player, event path both movers, a real `move` daemon arrival).
- `packages/chord`: `checkDuplicateClauses` keys on the head's actor (the player/guards pair on one owner is Acceptance item 2, not a duplicate); two tests. chord 69 / 1041.
- Gates: engine 63 / 637; story-loader 86 of 87 files, 635 of 637 — `zoo-pure-ir` reads the corpus `zoo.story` (Phase 4). Repo `tsc --noEmit` clean.

## Key Decisions
- Actor consultation is opt-in by registration key (`actor:<actionId>`), never the action's own id — so no existing target-keyed binding changes behavior (2026-08-26, implementation finding).
- story-loader's `zoo-pure-ir` (corpus reader) is the one accepted red at Phase 2 exit; Phase 4 owns it.

### 1. Placement vs. clause-head split by block structure, not the leading article
`chord.ebnf`'s `placement` row previously let the article distinguish `on the table` (placement) from `on the player going` (head). Under the new actor-before-gerund grammar the article no longer separates them, so `Parser.isOnClauseHead` now looks ahead structurally: a head is followed by a deeper-indented body line or its own `end on`; a placement never is. The head branch runs before the placement branch. Found by implementation, not the shape doc; recorded in `phase-1-grammar-shape.md` Landing notes for the Phase 5 paper trail.

### 2. `define condition` is a second carrier scope for `it`
Open conditions (`define condition hungry-neighbor: it is hungry`, the `each` package's `any`/`no`/`each`) have no name for their subject any more than a trait body has for its carrier. ADR-327 D2/D8 never named this scope; read literally, D8's "and nowhere else" would have removed the `each` package's only spelling. Resolved as a second carrier scope alongside `define trait`. Blocks *for* a named entity (`define manner for …`, `define conversation … for`, `define topics for`, a character's `goal … active when`) are explicitly NOT carrier scopes — fixtures there were migrated to the name instead. Owed to ADR-327 D8 as a Phase 5 amendment.

### 3. `analysis.it-removed` message text quotes the owner, not the whole statement
The resolver has no statement context at the point it fires, so the fix-it names the replacement (`the sword`, `Jack's lunge`) rather than trying to reconstruct the full corrected line.

## Next Phase
- **Phase 2**: "story-loader consumes the head's actor — the PLAYER-path match (D1's role rule, wired for the reachable path)" — filters `on`/`after` firing by matching the head's actor against the acting entity, extending D5's already-shipped move-arrival actor-match pattern uniformly to intercept/reaction clauses.
- **Tier**: Medium (250 tool-call budget).
- **Entry state**: Phase 1 shipped (IR carries the actor field). Design (firing-filter approach, reuse of D5's pattern, handling of a compiled-but-unreachable non-player head) must be presented to David before editing `story-loader`, per plan's entry-state requirement.

## Open Items

### Short Term
- Phase 2 design needs presenting to David before any `story-loader` edits — explicit next step per the plan.
- Not committed this session — `commit-local` runs next.

### Long Term
- ADR-327 D8 amendment (define condition as a carrier scope) and the ADR-325 D3h / ADR-264 D2 supersession flips are Phase 5 work.
- Corpus (`branch-stories`, `stories`, story-loader/world-index fixtures, devkit tests pinning `story language 2`) is expectedly broken until Phase 4 migrates it — per the plan's Sequencing note, do not run those baselines before then.
- Phase 6 (D7, non-player actors firing their own heads) is blocked on ADR-328's own execution-entry plan, which does not yet exist.

## Files Modified

**Chord grammar core** (6 files):
- `packages/chord/src/parser.ts` - actor-before-gerund head parsing, `isOnClauseHead` placement/head split
- `packages/chord/src/analyzer.ts` - `resolveHeadActor`, `Scope.carrierIt`, `reportItRemoved`/`possessiveBase`
- `packages/chord/src/ast.ts` - `OnClause.actor`
- `packages/chord/src/ir.ts` - `IROnClause.actor`, `IR_FORMAT` → `story language 3`, binding rename
- `packages/chord/chord.ebnf` - head/actor/gerund grammar rows
- `packages/chord/src/version.ts` - 3.4.0 → 4.0.0

**New test coverage** (1 file):
- `packages/chord/tests/adr-327-phase1.test.ts` - 39 new tests for Acceptance item 1

**Migrated fixtures/tests/docs** (~65 files):
- ~50 `packages/chord/tests/*.test.ts` files, 8 `.story` fixtures, 7 golden snapshots migrated to the new spelling
- `docs/architecture/chord-grammar-changes.md`, `docs/work/adr-327-explicit-references/{plan.md,phase-1-grammar-shape.md}`
- Phase 2: `packages/stdlib/src/actions/lifecycle/{lifecycle-engine,index}.ts` + its test; `packages/story-loader/src/{runtime,loader,event-contract}.ts`; `packages/story-loader/tests/adr-327-actor-match.test.ts` (new) + 32 migrated test files/fixtures; `packages/chord/src/analyzer.ts` (duplicate gate) + test; `docs/work/adr-327-explicit-references/{phase-2-loader-shape.md (new),plan.md}`

## Notes

**Session duration**: ~30 minutes of active tool use (163 tool calls, session started 2026-08-26 01:08 CDT).

**Approach**: Present-then-build per the plan's entry-state requirement — the grammar/diagnostic design was already ruled on in `phase-1-grammar-shape.md` before this session; implementation surfaced two gaps the shape doc missed (placement/head collision, `define condition` carrier scope), both resolved in code and recorded in that doc's Landing notes for the Phase 5 paper trail.

Stray root file `1` (untracked at session start) was deleted with David's confirmation.

---

## Session Metadata

- **Status**: COMPLETE (unverified: repo `tsc --noEmit` clean)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (not yet committed; `feat/adr-321-world-index` not merged to main)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 entry state (design presented and ruled on in `phase-1-grammar-shape.md` before this session's edits); D5 move-arrival actor match already shipped (session `f9e8fe3a`), giving Phase 2 a precedent to extend.
- **Prerequisites discovered**: `define condition` as a second `it`-carrier scope (not anticipated by the shape doc or ADR-327 D8); placement-vs-head collision under the new grammar (not anticipated by the shape doc's EBNF).

## Architectural Decisions

- ADR-327 (D1–D4, D6, D8): Phase 1 of its implementation landed this session — actor-explicit clause heads, own-block bare heads, `it`/`its` removal outside trait/condition carrier scopes, named parse/analysis errors with fix-its, Chord MAJOR version bump per ADR-257.
- Two amendments owed to ADR-327 at Phase 5 (not yet written into the ADR): D8's carrier scope should read "inside `define trait` — and as the subject of an open `define condition`"; and the placement/head split is now structural, not article-based (documented in `phase-1-grammar-shape.md` Landing notes rather than the ADR itself pending that Phase 5 pass).
- Pattern applied: shape-doc-then-build (present mechanism, get a ruling, then build) — reused from `docs/work/backlog-tier1-2-platform/plan.md`'s Phase 3 precedent, per this plan's own "References consulted."

## Mutation Audit

- Files with state-changing logic modified: `packages/chord/src/{parser,analyzer,ast,ir}.ts` (parser/analyzer emit IR with a new `actor` field and new diagnostic codes).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/chord' run test:ci` — 69 files, 1039 passing, event log `06:36:48Z` and `06:38:13Z`, both after the last edit at `06:36:43Z`) — `adr-327-phase1.test.ts` asserts on emitted IR fields (`OnClause.actor`, `IROnClause.actor`, binding value) and specific diagnostic codes (`analysis.head-actor`, `analysis.it-removed`, etc.), not on "parsed without throwing," per the project profile's Chord mutation-signature bar.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — this is the first session of ADR-327's implementation; no comparable prior-session pattern found in `docs/context/`.

## Test Coverage Delta

- Tests added: 39 (`tests/adr-327-phase1.test.ts`).
- Tests passing before: unknown baseline for this exact suite shape (pre-existing tests were migrated in place rather than left as a stable before/after count) → after: 1039 passing across 69 files (evidence: event log `06:36:48Z` and `06:38:13Z`, both post-dating the last edit).
- Known untested areas: story-loader's consumption of the new `actor` field (Phase 2); non-player actor firing (Phase 6, blocked on ADR-328).

---

**Progressive update**: Session completed 2026-08-26 (session e822b1)
