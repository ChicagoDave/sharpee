# ADR-158: Entity-Valued Message Params Carry `EntityInfo`, Not Bare Names

## Status: ACCEPTED

## Date: 2026-04-24

## Relates to

- **ADR-089** (Pronoun Identity System) — handles perspective-varying placeholders (`{You}`, `{your}`, verb conjugation). This ADR is complementary: it governs entity-noun placeholders whose rendering is perspective-invariant.
- **ADR-095** (Message Templates with Formatters) — defines the `{the:…}` / `{a:…}` / `{some:…}` formatter chain. This ADR is what makes those formatters functional end-to-end: without `EntityInfo` in params, the formatters have nothing to branch on.
- **ADR-107** (Dual-Mode Authored Content / `nameId`) — localized entity naming. Out of scope here; a follow-up is needed to make `entityInfoFrom` resolve `nameId` when the lang layer supports it.
- **ADR-051** (Action validate/execute/report/blocked phases) — this ADR constrains the `params:` shape emitted by `report()` and `blocked()`.
- **ADR-090** (Entity-Centric Action Dispatch / Capability Behaviors) — capability behaviors produce effects whose params flow through the same template system and are bound by this ADR.
- **Bug report**: `> take white house` rendered `"white house is fixed in place."` instead of `"The white house is fixed in place."` — triggered this audit.

## Context

Every `Action` and `CapabilityBehavior` in Sharpee emits domain events whose `data` includes message parameters. Those parameters are substituted into template strings by `@sharpee/lang-en-us`, applying optional **formatters** (`{the:cap:item}` → "The white house"; `{a:cap:item}` → "A white house"; `{some:container}` → "some water").

ADR-095 defines how the formatters choose an article. They branch on two pieces of entity metadata:

- `nounType`: `'common' | 'proper' | 'mass' | 'unique' | 'plural'`
- `properName`: boolean fallback when `nounType` is unset
- `article`: author-supplied override (e.g., `'the'` for "the white house")

These are declared on `IdentityTrait` in the world-model — stories already fill them in at entity-construction time.

The bug is that **every stdlib callsite passes the entity's name as a bare string**:

```ts
// packages/stdlib/src/actions/standard/taking/taking.ts:107
return {
  valid: false,
  error: customMessage || TakingMessages.FIXED_IN_PLACE,
  params: { item: noun.name }     // ← "white house", a plain string
};
```

The `theFormatter` / `aFormatter` / `someFormatter` all branch on whether the value is a string or an `EntityInfo` object. When they receive a bare string they have no `nounType` to consult and fall through to naive default behavior. In the audit ~130 templates in `packages/lang-en-us/` are wired to formatters that cannot work as designed.

The audit also confirmed that `setEntityLookup` — the language-provider's hook for resolving an entity id to metadata — is **never wired by the engine**. So there is today no alternative path by which the formatter could recover the metadata from a bare name.

Rendering discipline is not a story-author problem: stories already declare the data. The layer responsibility is:

| Layer | Responsibility |
|---|---|
| story | Populate `IdentityTrait` (`name`, `article`, `properName`, `nounType`) on every entity |
| stdlib action / capability behavior | Construct `params` whose entity-valued keys hold `EntityInfo`, not bare names |
| lang formatter chain | Branch on `nounType` / `properName` to render the correct article |

The middle row is the one we are specifying here.

## Decision

**Every stdlib Action and CapabilityBehavior populates entity-valued message parameters with `EntityInfo` objects, not bare entity names.**

Concretely:

1. A helper `entityInfoFrom(entity: IFEntity): EntityInfo` lives in `packages/stdlib/src/utils/entity-info.ts`. It reads `IdentityTrait` and returns `{ name, article, properName, nounType, adjectives }`. Missing `IdentityTrait` returns `{ name: entity.name }` so callers never need to guard.

2. Every `params` shape that references an entity uses the helper:
    ```ts
    // Before
    params: { item: noun.name, container: containerEntity.name }

    // After
    params: { item: entityInfoFrom(noun), container: entityInfoFrom(containerEntity) }
    ```

3. Template-writer side: every sentence-start entity reference uses the formatter chain:
    - `{the:cap:item}` — capitalized definite article ("The white house")
    - `{a:cap:item}` — capitalized indefinite article ("A sword")
    - `{the:item}` — mid-sentence definite ("you pick up the sword")
    - `{a:item}` — mid-sentence indefinite
    - `{some:item}` — partitive for mass nouns ("some water")

4. The helper is the single acceptable bridge between the world-model's `IFEntity` and the language layer's `EntityInfo`. No ad-hoc object literals with subsets of the fields; authors must call the helper. This keeps the protocol one definition, one code path.

### Placement rationale

The helper lives in **stdlib** rather than world-model because:

- `world-model` (source of `IFEntity`) does not and should not depend on `lang-en-us` (source of `EntityInfo`). Domain does not import presentation.
- `stdlib` already depends on both.
- If a future non-stdlib consumer needs `EntityInfo` construction, the right move is to extract the `EntityInfo` interface itself to `@sharpee/if-domain` — a separate ADR. Relocating the helper at that point is trivial; inverting world-model's dependency direction now would be a real smell.

### Scope of enforcement

- **This ADR binds**: every `Action` and `CapabilityBehavior` in `@sharpee/stdlib`.
- **This ADR guides (but does not block)**: story-defined actions and interceptors. Story authors are encouraged to use the same helper — it is exported from stdlib's public API — but story-specific actions may choose other shapes for story-specific messages at their own risk.
- **Out of scope**: params whose value is *not* an entity (raw strings, numbers, directions, message IDs, pre-rendered combat strings). Those remain unchanged.

## Consequences

### Positive

- The formatter chain from ADR-095 becomes functional end-to-end. Article rendering is correct across all five `nounType` cases (common, proper, mass, unique, plural) without per-template special-casing.
- Stories do not need to change. `IdentityTrait` population is already what they write today.
- The `{You}` / `{your}` perspective system (ADR-089) is untouched. Article rendering is perspective-invariant in English and stays in a separate code path.
- One consistent authoring pattern across all 43 stdlib actions.
- The regression ("white house is fixed in place.") and its ~130-template bug class are killed as a category, not one message at a time.

### Negative / Cost

- Every stdlib `params:` construction site must be migrated. Audit estimates ≈ 100 callsites across ≈ 40 action files.
- Every sentence-start template referencing an entity must be migrated to the formatter chain.
- Walkthrough transcripts that match on broken-output substrings ("white house is fixed", "rug is locked", etc.) must have their `[OK: contains "…"]` assertions rewritten to match the corrected output.
- Story-authored actions that emit their own templates are not covered by stdlib enforcement and may continue to render without articles until the story is audited. Out of scope for this ADR; revisited if needed as a follow-up.

### Constrains Future Sessions

- New stdlib actions **must** use `entityInfoFrom()` for entity-valued message params. PR reviewers reject action code that passes `entity.name` directly in a `params` shape where an entity is referenced.
- New lang-en-us templates **should** use a formatter chain at sentence-start positions. An **advisory** scanner (`scripts/audit-templates.ts`) reports raw `{item}` / `{target}` / `{recipient}` / etc. at sentence start with the suggested fix. The scanner is **not wired into CI**; maintainers run it on demand. The choice is intentional — favors low friction for template authors over mechanical enforcement. If the bug class recurs, future maintainers may promote the scanner to a blocking test.
- CLAUDE.md's "Language Layer Separation" subsection gains: *"Entity-valued template parameters pass `entityInfoFrom(entity)`, not `entity.name`."*

### Does Not Constrain

- Story-author choice between "the X" and "your X" in a template. The formatter chain replaces one article with the right one; the choice of article is still authorial.
- The existing `setEntityLookup` API on `LanguageProvider`. This ADR makes it structurally unnecessary for the article-rendering path; the API remains for future use cases (e.g., resolving entity ids appearing in unstructured narration strings).
- `IdentityTrait.nameId` (ADR-107). When lang supports localized-name resolution end-to-end, `entityInfoFrom` gets a follow-up patch to prefer the resolved `nameId` over literal `name`. That work has its own ADR.

## Migration Plan

See `docs/work/lang-articles/plan-20260424-the-cap-migration.md` for the four-phase migration:
1. Helper + unit tests
2. Pilot (taking action) + regression transcript
3. Per-action rollout, one commit per action
4. Lock-in — guardrail test + CLAUDE.md rule + this ADR merged

## Implementation Outcome

Phase 3 rollout completed 2026-04-24 across three sessions on the `lang-articles-migration` branch. **26 stdlib actions migrated**, one commit per action:

- Sessions 1–2 (commit 6345c7dc + 54b38cdc + bc8ae0d5): taking, pushing, pulling, opening, closing, locking, unlocking, switching_on, switching_off, examining, putting (+ lock-shared, examining-data shared helpers).
- Session 3 (bc8ae0d5): inserting, removing, entering, exiting, throwing, attacking, giving, showing, smelling, listening, touching, dropping (+ dropping-data).
- Session 4 (commits f0181bd9–4a8e472c): talking, climbing, searching, wearing, reading, eating, drinking, taking_off, going (+ wearable-shared, searching-helpers shared helpers).

**Patterns that emerged during implementation** (codified for future migrations):

- **Shared helpers migrate alongside their consumers.** `lock-shared.ts`, `examining-data.ts`, `dropping-data.ts`, `searching-helpers.ts`, `wearable-shared.ts` all hold `params:` shapes consumed by their action(s); migrating one without the other leaves mixed shapes within a single logical unit.
- **Diverged params shape from top-level event data.** Where actions previously used `...params` spread into top-level event data, the spread had to be replaced with explicit shape declarations: `params` carries `EntityInfo` for the formatter chain while top-level event fields (`itemId`, `itemName`, `targetId`, `targetName`) remain strings for handler consumption.
- **Re-derive the entity in `report()` when only a name string is in shared data.** Pattern: `const noun = context.command.directObject?.entity; params: { item: noun ? entityInfoFrom(noun) : { name: sharedData.targetName } }`. Avoids enlarging `SharedData` per-action.
- **Validate-path returns must carry `params`** when the lang template references the entity. The `taking_off` migration caught a pre-existing rendering gap where validate-path returns had no `params` and the template's `{item}` would have rendered unresolved.
- **Multi-take label patterns left unchanged.** `taken_multi` ("`{item}: Taken.`") uses the IF list-label convention; applying `{the:cap:item}` would produce "The sword: Taken." (wrong). Formatter falls through to `EntityInfo.name` when no article formatter is applied — backward compatible.
- **Combat-path strings deferred.** `attacking`'s `combat.*` templates intentionally retained `{targetName}` (bare string). `CombatService` passes a string, not an `EntityInfo`; that migration is a separate task tracked outside this branch.

**Verification:** every migrated action passes its `*-golden.test.ts` in isolation. Regression transcripts (article-rendering, rug-trapdoor) green throughout. Full Dungeo walkthrough chain RNG-variable due to thief-combat noise; not a regression introduced by this branch.

### Follow-up rollout (plan-20260425-lang-articles-followups.md)

The advisory scanner shipped at the end of the original Phase 4 reported **121 findings** — 26 actions had been migrated, but the scanner surfaced 10 additional actions that the manual audit missed because they don't follow the standard validate/execute/report/blocked shape. Follow-up work completed in the same branch (commits 4df199d6 through bd42b7d3):

- **Phase A — three documented exceptions (3 commits).** `switching_on` room-description params (rooms render proper-style as headings, not articled), `inserting-semantic.ts` (deleted as dead reference code from ADR-054), `throwing.ts:fragile_breaks` (manual "The fragile X" prefix wraps an adjective phrase that the formatter chain cannot reproduce).
- **Phase B — 9 actions / shared infrastructure (9 commits).** `inventory` (list-label exception), `waiting` (story-extension hook), `telling` + `asking` (lang-only — actions deferred to a future conversation extension), `using` (deleted as deliberately-rejected verb), `turning` (lang-only — action removed pending TURNABLE trait), `lowering` + `raising` + `capability-dispatch.ts` infrastructure (single-point fix covering the entire ADR-090 dispatcher — pays forward for any future capability-dispatched verb), `looking` + `looking-data.ts` (largest blast radius — auto-look events flow into `going` and `switching_on`).
- **Phase C — CombatService + combat.\* templates (commit e6b335e6).** Last out-of-band channel that bypassed Phase 3. `CombatService` (in `packages/extensions/basic-combat`) constructed `combat.*` events directly with bare `targetName` strings; the action-side `attacking` migration handled the `attack_failed` path but not events fired from inside the combat resolution loop. `basic-combat` already depends on `@sharpee/stdlib` so `entityInfoFrom` is reachable through the public API — no dependency-direction change required. The `messageData` shape now carries both `targetName: string` (handler / event-sourcing compat) and `target: EntityInfo` (formatter chain), same diverged-shape pattern used everywhere else. 22 `combat.*` templates migrated.

**Final scanner state: 5 findings, all documented intentional exceptions** (`switching_on` room title, `dropping_multi`/`taken_multi`/`item_list` IF list-labels, `throwing.fragile_breaks` adjective phrase). Down from 121.

**Verification at follow-up close-out:**
- stdlib unit tests: 1172 passed (27 pre-existing skips).
- lang-en-us: 205/205.
- ext-basic-combat combat-service: 23/23.
- attacking-golden + attacking: 42/42.
- Dungeo walkthrough chain: 872/872 (second run after RNG-noisy first; documented thief-combat noise).
- Article-rendering and rug-trapdoor regression transcripts: green throughout.

## Session

`session-20260424-2042-main.md` (bug diagnosis and plan draft) → `session-20260424-2158-lang-articles-migration.md` (Sessions 1–3) → `session-20260424-2329-lang-articles-migration.md` (Session 4: Phase 3 finish + Phase 4 + follow-up Phases A, B, C, D).
