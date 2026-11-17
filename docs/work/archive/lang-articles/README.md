# lang-articles — ADR-158 Article Migration

This directory tracks the work that fixed the article-rendering bug class
in Sharpee's stdlib and lang layers. The original symptom: `> take white house`
rendered as `"white house is fixed in place."` instead of `"The white house
is fixed in place."`.

## Reading order

1. **[ADR-158](../../architecture/adrs/adr-158-entity-info-in-message-params.md)** —
   the architectural decision: every stdlib `Action` and
   `CapabilityBehavior` populates entity-valued message parameters with
   `EntityInfo` objects (via `entityInfoFrom(entity)`), not bare entity
   names. The "Implementation Outcome" section enumerates everything
   that shipped.
2. **[plan-20260424-the-cap-migration.md](plan-20260424-the-cap-migration.md)** —
   the original four-phase plan covering the helper, pilot, per-action
   rollout, and lock-in.
3. **[plan-20260425-lang-articles-followups.md](plan-20260425-lang-articles-followups.md)** —
   the follow-up plan that closed out the ten actions the original
   manual audit missed plus `CombatService`. Phases A, B, C, D were all
   completed.

## Final state

After the full rollout, the advisory scanner `pnpm audit:templates`
reports **5 findings, all documented intentional exceptions**:

| Finding                                       | Why it's kept                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `switching_on.ts` room-description `name`     | Room titles render proper-style as headings ("Living Room", "West of House"), not articled.                                    |
| `taking.taken_multi`: `"{item}: Taken."`      | IF list-label convention. `"The sword: Taken."` would be wrong in a list context.                                              |
| `dropping.dropped_multi`: `"{item}: Dropped."` | Same.                                                                                                                          |
| `inventory.item_list`: `"  {item}"`           | List-line under a carrying/wearing header. `"  the sword"` would be wrong in a list.                                           |
| `throwing.fragile_breaks`                     | Hand-written `"The fragile {item} breaks…"` wraps an adjective phrase the formatter chain cannot reproduce. Comment-annotated. |

Each is annotated inline with an `ADR-158 exception:` comment so the
scanner output is interpretable without re-reading this README.

## Running the scanner

```bash
pnpm audit:templates
```

The script lives at `scripts/audit-templates.js` and is plain Node — no
extra toolchain dep. It runs two passes:

1. **stdlib pass** — walks `packages/stdlib/src/actions/standard/`,
   parses `params: { … }` blocks (multi-line aware), and flags
   `<identifier>.name` callsites that should be passing
   `entityInfoFrom(<identifier>)`.
2. **lang pass** — walks `packages/lang-en-us/src/actions/`, finds
   entity placeholders (`{item}`, `{target}`, `{container}`, `{supporter}`,
   `{place}`, `{object}`, `{vehicle}`, `{door}`, `{blocking}`, `{key}`,
   `{noun}`) used bare without a `{the:|a:|some:}` formatter prefix.
   Strips JS comments first.

The scanner is **advisory** — it always exits 0. Promote to a blocking
CI step only if the bug class recurs.

## When you're touching a stdlib action

The pattern (codified in ADR-158, captured here for quick reference):

- **Every `params:` shape that references an entity passes
  `entityInfoFrom(entity)`, not `entity.name`.** The helper is at
  `packages/stdlib/src/utils/entity-info.ts` and re-exported from the
  package barrel, so any package depending on `@sharpee/stdlib` can
  use it (including extensions like `basic-combat`).
- **Diverge `params` shape from top-level event data.** The `params`
  object holds `EntityInfo` for the formatter chain; top-level event
  fields (`itemId`, `itemName`, `targetId`, `targetName`) remain
  strings for handler / event-sourcing consumption.
- **Re-derive the entity in `report()`** when only a name string is in
  shared data: `const noun = context.command.directObject?.entity;
  params: { item: noun ? entityInfoFrom(noun) : { name: sharedData.targetName } }`.
- **Validate-path returns must carry `params`** when the lang template
  references the entity. The migration uncovered a pre-existing
  rendering gap in `taking_off` where validate-path returns had no
  `params` and would have rendered `{the:item}` literally.
- **Shared helpers migrate alongside their consumers.** If you migrate
  `locking.ts` you also migrate `lock-shared.ts` because that's where
  the shared `params:` shape lives. The same applied to
  `examining-data.ts`, `dropping-data.ts`, `searching-helpers.ts`,
  `wearable-shared.ts`, `looking-data.ts`, and (most reusable of all)
  `capability-dispatch.ts`.

## When you're touching a lang template

Templates that reference an entity at sentence start use the formatter
chain:

| Goal                              | Template                  | Renders for "white house" | Renders for "Floyd" |
| --------------------------------- | ------------------------- | ------------------------- | ------------------- |
| Definite article, capitalized     | `{the:cap:item}`          | "The white house"         | "Floyd"             |
| Definite article, mid-sentence    | `{the:item}`              | "the white house"         | "Floyd"             |
| Indefinite article, capitalized   | `{a:cap:item}`            | "A white house"           | "Floyd"             |
| Indefinite article, mid-sentence  | `{a:item}`                | "a white house"           | "Floyd"             |
| Mass-noun partitive               | `{some:item}`             | "some water"              | "Floyd"             |

Proper-named entities skip the article automatically because the
formatter respects `IdentityTrait.properName` / `IdentityTrait.nounType`
through `EntityInfo`.

## Out of scope (for now)

- **`IdentityTrait.nameId` (ADR-107) integration.** `entityInfoFrom`
  returns the literal `name` for entities using localized naming. A
  separate ADR will extend the helper when lang supports localized-name
  resolution end-to-end.
- **Story-side templates in `stories/dungeo/src/messages/`.** Stories
  own their templates. The pattern is documented in CLAUDE.md and
  ADR-158; stories may adopt it when convenient.
- **Promoting the scanner to blocking CI.** Per the user decision
  recorded in ADR-158, the scanner stays advisory.
