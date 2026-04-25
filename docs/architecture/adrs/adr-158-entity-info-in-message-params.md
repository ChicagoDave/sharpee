# ADR-158: Entity-Valued Message Params Carry `EntityInfo`, Not Bare Names

## Status: PROPOSAL

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

## Session

`session-20260424-2042-main.md` (bug diagnosis and plan draft) → `session-…-lang-articles-migration.md` (implementation).
