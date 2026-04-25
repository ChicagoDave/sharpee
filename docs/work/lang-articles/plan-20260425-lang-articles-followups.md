# Plan: ADR-158 Follow-Ups — Complete the Article Migration

**Branch**: `lang-articles-migration` (follow-up; may be merged to `main` first and continued in a new branch)
**Started**: 2026-04-25
**Predecessor**: `plan-20260424-the-cap-migration.md` (Phases 1–4 — 26 stdlib actions migrated, ADR-158 ACCEPTED, advisory scanner shipped)
**Related**: ADR-158 (entity-info in message params), ADR-095 (formatters), ADR-107 (`nameId`), CombatService (separate follow-up)

---

## Problem Statement

Phase 3 of `plan-20260424-the-cap-migration.md` migrated 26 stdlib actions to ADR-158. The advisory scanner `pnpm audit:templates` reports **106 remaining findings** spanning:

- **10 unmigrated stdlib actions** with bare-name params and bare placeholders in their lang templates: `asking`, `hinting`, `looking`, `using`, `waiting`, `telling`, `turning`, `lowering`, `raising`, `inventory`.
- **3 questions raised by the scanner inside already-migrated actions** that need decisions before they can be classified as real misses or intentional patterns:
  - `looking-data.ts` — bare `location.name` in container/supporter/location params (looking-side helper, not yet migrated alongside its action).
  - `switching_on.ts:329` — bare `room.name` in the auto-look room-description event params.
  - `inserting-semantic.ts` — bare `attributes.name` in 8 callsites that build alias data (may be parser/disambiguation data, not user-facing).
- **One template-side correctness gap inside a migrated action**: `throwing.ts:52` `'fragile_breaks': "The fragile {item} breaks into pieces."` — manual `"The fragile"` prefix renders correctly for common nouns but produces "The fragile Excalibur" for proper names.
- **One out-of-band channel still bypassing ADR-158**: `attacking`'s `combat.*` templates pass `{targetName}` (bare string) because `CombatService` builds the events itself with a string field. The `attacking` action was migrated; the events emitted from inside `CombatService` were not.

The Phase 3 audit estimated `~26` actions; the scanner shows there are more — they were missed by the manual audit because they don't follow the standard validate/execute/report/blocked shape (e.g., `inventory` and `waiting` have no entity at all in the validate signature; `turning`/`lowering`/`raising` are capability-dispatched and the entity flows in via the trait dispatch system; `using` is a generic dispatcher; `asking`/`hinting`/`telling` are NPC actions).

## Goal

The advisory scanner `pnpm audit:templates` reports **fewer than 10 findings**, all of which are either intentional list-label patterns (`{item}: Taken.`, `{item}: Dropped.`) or documented-and-acknowledged exceptions (such as `throwing.ts` `fragile_breaks` if a wording rewrite is rejected). No action emits bare-string entity names through `params:` for player-facing rendering. Every lang template at sentence-start uses a formatter chain.

## Non-Goals

- **Localized name resolution (`IdentityTrait.nameId`, ADR-107).** `entityInfoFrom` returns the literal `name` for entities using localized naming. Out of scope; tracked in a separate ADR.
- **Story-side templates in `stories/dungeo/src/messages/`.** Stories are responsible for their own templates. The new pattern is documented (CLAUDE.md, ADR-158) and stories may adopt it when convenient.
- **Promoting the scanner to a blocking CI check.** Per ADR-158 and the user decision in Session 1, the scanner stays advisory.
- **Engine-level `setEntityLookup` wiring.** ADR-158 made it structurally unnecessary; revisiting it is out of scope.

## Architectural Principle

Same as the predecessor plan: the language layer's formatter chain (`{the:cap:…}`, `{a:…}`, `{some:…}`) is the canonical site for article selection. Stdlib's responsibility is to feed the chain the metadata it needs (`EntityInfo`, not bare strings). Stories author their own templates and may opt in. Out-of-band channels (CombatService events, semantic-alias events) must adapt to the same protocol or document why they don't.

## Phased Rollout

The rollout is grouped by decision-or-investigation phase first (small, fast, unblocks the rest), then per-action migration phases (one commit per action, mirroring the predecessor plan's discipline), then the cross-cutting CombatService phase.

### Phase A — Decisions and Investigations (single commit each, mostly read-only)

These three findings need a decision/investigation before migration is even the right answer.

- **A1. `switching_on.ts:329` room-description params.** Decide whether room descriptions should pass `EntityInfo` for the room name. Rooms are entities and have `IdentityTrait`, so the formatter chain *could* apply — but room descriptions traditionally render proper-named ("Living Room"), not articled ("the Living Room"). Inspect the `if.action.looking.room_description` template, decide, and document. If migration is the call, also fix the corresponding callsite in the `looking` action (since the same event flows from there).
- **A2. `inserting-semantic.ts` — domain data or message params?** Inspect the 8 callsites. If the `attributes.name` field is user-facing rendering data, migrate. If it is parser/disambiguation/alias data (event listeners and parser routing read it as a domain string), document it as out-of-scope and add a comment so the scanner's signal is not misread by future maintainers.
- **A3. `throwing.ts:52` `fragile_breaks` wording.** Two viable migrations:
  - (a) Reword the template to put the entity at sentence-start: `"{the:cap:item} breaks into pieces — fragile."` Loses the original cadence.
  - (b) Use `{a:item}` and a different phrasing: `"You hear something fragile break."` Loses the named entity.
  - (c) Accept as a documented exception in the audit output (templates that hand-write articles around adjective phrases). Annotate with a comment.
  Decide and apply.

**Phase A acceptance:** All three discoveries are either migrated or documented as exceptions. Scanner output for these specific lines either disappears or is annotated and acknowledged.

### Phase B — Per-action migrations (one commit per action, in dependency order)

Same per-action discipline as the predecessor plan: stdlib callsite migration + lang template migration + test assertion updates, all in one commit per action.

Recommended order based on blast radius (smallest to largest), so an early regression is caught before the larger actions ship:

- **B1. `inventory`** — no direct-object entity; check whether any params reference items in inventory. Likely a small change; sets the pattern for actions whose primary state is "list of entities."
- **B2. `waiting`** — minimal entity references. The scanner caught `waited_in_vehicle: "{You} {wait} in {vehicle}."` Single template, single callsite if any.
- **B3. `telling`** — NPC-target action; same shape as `talking` (already migrated). Mirror the talking patterns.
- **B4. `asking`** — NPC-target action with `{topic}` (a non-entity string param). Migrate `{target}` → `{the:target}` in templates; migrate target callsite to `entityInfoFrom`.
- **B5. `hinting`** — likely thin; structure may resemble `asking`. Audit then migrate.
- **B6. `using`** — generic dispatcher; check for callsites that pass a target name.
- **B7. `turning`** — capability-dispatched verb (no standard semantics; trait/behavior owns the mutation). Migrate the `turning` action's own params; trait behaviors that emit their own events also need audit.
- **B8. `lowering`** and **B9. `raising`** — paired with `turning` (same capability-dispatch pattern). Together with `turning`, may share a helper file analogous to `wearable-shared.ts`.
- **B10. `looking`** — largest blast radius. Affects every room entry, every `> look` command, and is consumed by `going` (auto-look on movement) and `switching_on` (auto-look on lights-on). Migrate `looking-data.ts` alongside `looking.ts`. Ties Phase A1's decision down.

**Phase B acceptance:** Each action's `*-golden.test.ts` is green. The advisory scanner shows the action's findings drop to zero or a documented exception. Article-rendering and rug-trapdoor regression transcripts pass throughout.

**Estimated effort:** ~10 actions × ~15 min/action = ~2.5 hours of focused work, similar to a Phase 3 sub-session. Capability-dispatched actions (turning/lowering/raising) may take longer if their trait behaviors also need migration.

### Phase C — CombatService follow-up

`CombatService` constructs `combat.*` events directly with `targetName: string` (and analogous attacker/weapon name fields). The `attacking` action was migrated, but the events emitted from inside the combat loop bypass the action's params shape.

- **C1.** Audit `CombatService` for every event it emits with a name field. Identify each `combat.*` template and the entity field it carries.
- **C2.** Migrate `CombatService` to construct `EntityInfo` (using `entityInfoFrom` from stdlib's exported helper). The dependency direction is: `CombatService` → stdlib helper. If `CombatService` lives outside stdlib, either move the helper to `if-domain` (separate ADR — out of scope here) or import via stdlib's public API.
- **C3.** Update `combat.*` templates in `lang-en-us` to use the formatter chain.
- **C4.** Update assertions in attacking/combat tests.

**Phase C acceptance:** `combat.*` rendering is article-correct for common-noun targets (e.g., "the troll dies" not "troll dies"). Attacking-golden and combat tests green. Walkthrough chain green for combat-touching transcripts.

**Estimated effort:** ~1–2 hours depending on how many event types `CombatService` emits.

### Phase D — Wrap-up

- **D1.** Re-run `pnpm audit:templates`. Expect total findings under 10. Anything left should be the documented intentional patterns (`taken_multi`, `dropped_multi`) and any acknowledged Phase A exceptions.
- **D2.** Run full Dungeo walkthrough chain. RNG-variable due to thief combat noise; run twice and confirm no new failures vs. baseline.
- **D3.** Update ADR-158's "Implementation Outcome" section: append a follow-up paragraph noting the additional 10 actions + CombatService migrated under this plan, with the final scanner-finding count.
- **D4.** Optional: write a `pattern-recurrence-detector` check or add a README under `docs/work/lang-articles/` so the next session knows the audit:templates command exists and what its expected output is.

## Files Touched (estimate)

- ~10 stdlib action files (`packages/stdlib/src/actions/standard/{asking,hinting,looking,using,waiting,telling,turning,lowering,raising,inventory}/*.ts`) + their data/helper files.
- ~10 corresponding lang files in `packages/lang-en-us/src/actions/`.
- ~10 test files in `packages/stdlib/tests/unit/actions/`.
- 1 file: `packages/world-model/src/services/combat-service.ts` (or wherever `CombatService` lives).
- 1 file: `packages/lang-en-us/src/actions/attacking.ts` (combat.* templates).
- 1 file: `docs/architecture/adrs/adr-158-entity-info-in-message-params.md` (D3).
- Possibly 1 new helper file if `turning`/`lowering`/`raising` share a pattern (analogous to `wearable-shared.ts`).

## Risks

1. **Capability-dispatched actions (turning/lowering/raising).** The trait behaviors that handle these verbs may emit their own events with bare names. Auditing the per-trait behaviors (e.g., `BasketLoweringBehavior`) is part of the migration, not just the action shell. Underestimating this could leave ADR-158 violations in the trait layer.
2. **`looking` is consumed by other actions.** Auto-look events flow from `going` and `switching_on`. Migrating `looking-data.ts` requires that consumers either pass `EntityInfo` or that the data builder constructs it from sharedData. Tested via going-golden and switching_on-golden after migration.
3. **CombatService change has runtime impact.** Combat events fire mid-turn under RNG. A regression here is hard to surface in a single walkthrough run; rely on attacking-golden and combat unit tests for the primary signal, then run the chain twice.
4. **`{combat.targetName}` semantics.** If any handler reads `event.data.targetName` as a domain string (for event sourcing or scoring), changing it to `EntityInfo` breaks them. Audit reads, not just writes — same discipline as ADR-157 ("Migration Audits Enumerate Emissions, Not Just Mutations").

## Test Strategy Summary

- Unit golden tests per action (existing `*-golden.test.ts`); update assertions to `{ name: 'string' }` shape.
- Article-rendering regression transcript (`stories/dungeo/tests/transcripts/article-rendering.transcript`) extended to cover whichever migrated actions exercise common-noun rendering.
- Rug-trapdoor regression transcript (ISSUE-074) continues passing.
- Dungeo walkthrough chain green at end of Phase D (allowing RNG-twice-rule for thief noise).
- Advisory scanner total drops below 10.

## Commit / Branch Discipline

Same as predecessor plan:

- One commit per action in Phase B.
- Phase A decisions: one commit per finding, regardless of whether it migrates code or only documents an exception.
- Phase C: one commit for service migration, one for templates+tests (or single commit if small).
- Phase D: separate commit for ADR update.

If `lang-articles-migration` is merged to `main` before this plan starts, open a fresh branch (`lang-articles-followups`) so this plan's commits stay reviewable independently.

## Open Questions for User

1. **Should this plan run on `lang-articles-migration` (continuing the existing branch) or on a fresh branch after merging the current branch to main?** Defer until after the user reviews the current branch state.
2. **Phase A3 wording for `throwing.ts` `fragile_breaks`** — accept (c) as a documented exception, or pick (a) / (b)? Defer to user; Phase A is explicitly a decision phase.
3. **Phase A1 — should rooms render with articles?** Defer to user; depends on stylistic preference for room-description rendering.

## Estimated Total Effort

- Phase A: ~30 minutes (read + decide + document)
- Phase B: ~3 hours (10 actions, capability-dispatched ones longer)
- Phase C: ~1–2 hours
- Phase D: ~30 minutes

**Total: ~5–6 hours across 1–2 sessions.**

---

## Predecessor Reference

Migration discipline, patterns, and helpers established in `plan-20260424-the-cap-migration.md` and ADR-158's Implementation Outcome section apply unchanged:

- `entityInfoFrom(entity)` from `@sharpee/stdlib/utils` is the only acceptable bridge.
- Diverged params shape: `params` carries `EntityInfo`, top-level event fields stay strings for handlers.
- Re-derive entity in `report()` from `context.command.directObject` with `sharedData.targetName` fallback.
- Validate-path returns must carry `params` when the lang template references the entity.
- IF list-label patterns (`{item}: Taken.`) stay bare; documented exceptions.
