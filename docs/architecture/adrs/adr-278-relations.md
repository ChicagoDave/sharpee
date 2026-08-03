# ADR-278: Relations (exploratory umbrella — Sharpee 5.0.0 / Chord 3.0.0 candidate)

## Status: EXPLORATORY (2026-07-27, session 7ca178) — no commitment. Maps the design space for an author-facing relations feature (declared, constrained, queryable entity-to-entity relationships in the Inform 7 sense). Candidate anchor feature for the next major pair (Sharpee 5.0.0 / Chord 3.0.0, lockstep via `tsf version`). If pursued, this becomes an UMBRELLA ADR: child ADRs carry the decisions and implementation; this document is never implemented directly.

## Date: 2026-07-27

## Origin: community request (Nathaniel, 2026-07-27) — "Any chance on having a relations feature? Those also improve the story writing experience significantly." Second request from the same author; treated as a signal that relations rank high in perceived authoring value.

## Parent: none (would become the parent). Adjacent: ADR-210 (Chord story language), ADR-052 (event handlers), ADR-090 (capability dispatch). The Sharpee↔Chord parity goal ("100% Sharpee == 100% Chord") applies to anything decided here — the feature must land in both the canonical TS surface and Chord, at equal elegance.

## Context — verified, not assumed

- **A relationship store already exists in WorldModel, and it is dormant.**
  `packages/world-model/src/world/WorldModel.ts:1154-1206` implements
  `addRelationship` / `removeRelationship` / `getRelated` / `areRelated`,
  keyed by an arbitrary string `relationshipType`. Zero callers in stdlib,
  engine, or any story (grep, 2026-07-27). It has never been exercised by a
  shipped feature.
- **The store survives save/load.** `WorldSerializer.ts:26,54,104-111`
  serializes and restores the relationships map. Persistence is not a gap.
- **The store is forward-only and unconstrained.** `addRelationship` writes
  one direction only (`WorldModel.ts:1179` — "Add forward relationship");
  reverse queries would require a full scan. No cardinality, no declared
  types, no symmetry, no events on change. Any string is accepted.
- **Chord has no relations surface.** Its only relation-shaped constructs are
  spatial placement (`in` | `on` | `starts-in`, `chord/src/ast.ts:496`) and
  trait ordering (`before`/`after`, `ast.ts:601`). There is no way to
  declare, assert, mutate, or query a general relation from a `.story` file.
- **The canonical TS surface has no relations either** — parity starts from
  zero on both sides; neither side has an idiom the other must chase.
- **Prior art.** Inform 7 relations: declared name + domain kinds +
  cardinality (one-to-one / one-to-many / many-to-many), optional symmetry,
  assertion sentences, condition queries, enumeration, and relation
  route-finding. TADS 3.1 added a comparable relations module. Both are cited
  by authors as major expressiveness wins — consistent with Nathaniel's
  framing.
- **Existing ad-hoc pair state exists that relations could subsume.** The
  wall entity's `between` relation (`world-model/src/entities/wall-entity.ts`),
  conversation participants (`stdlib/src/capabilities/conversation.ts`), and
  door connections are all hand-rolled two-entity relationships today.

## Decision

**None.** This ADR records an exploration, not a commitment. Nothing below
constrains future sessions except the umbrella discipline itself: if the
feature proceeds, decisions are made in child ADRs, each with its own
review, and this document is updated to index them.

## Exploration — the shape of the feature

Four layers, roughly bottom-up. Each is a candidate child ADR.

### E1 — World-model relation registry (harden the dormant store)

Declared relation types replace free strings: a registry entry carries the
relation's id, participant constraints (which entity kinds may appear on
each side), cardinality (`one-to-one`, `one-to-many`, `many-to-many`), and
mutuality (symmetric relations maintain both directions atomically).
`addRelationship` against an undeclared type or in violation of cardinality
is rejected loudly. Reverse lookup becomes indexed, not a scan. Relation
changes emit events (`if.relation.added` / `if.relation.removed`, past-tense
per event discipline) so story handlers can react (ADR-052). Save/load
already works and is kept.

### E2 — Chord surface (declare / assert / mutate / query)

The bulk of the design work, and the elegance bar is set by Inform 7.
Illustrative sketches only — **no syntax is proposed for decision here**;
all forms below exist to make the design space concrete and must survive
the usual Chord syntax scrutiny (English-reading, positive forms primary,
no front-`not`):

```
## declaration (top-level construct)
relation knows
  between actors
  many to many
  mutual

## assertion at world-build (inside a create block, or top-level)
create the Hermit
  an actor
  knows the Innkeeper

## query (rule conditions — reads like existing `while the player has the deed`)
after entering it while the player knows the Hermit
  phrase a-familiar-face
end after

## mutation (inside a rule body)
on greeting the Hermit
  now the player knows the Hermit
end on
```

### E3 — Canonical TS authoring surface (parity)

The same declare/assert/mutate/query verbs on the TS side, at equal
elegance (Chord-as-elegance-oracle cuts both ways: if the Chord form is
cleaner, that exposes a Sharpee API seam to close, and vice versa).
Likely shape: registry declaration at story setup, fluent assertion on
entities or world, `getRelated`/`areRelated` kept as the query core.

### E4 — Text and enumeration surface

Conditions in rules cover the boolean case; the remaining case is
enumeration — "list everyone the player knows" — which lands in the text
rendering layer (phrase algebra, ADRs 192-206) as a list source, subject
to that layer's blank-text rules.

### Explicitly parked (not in any first cut)

- **Relation route-finding** (I7's "next step via R") — high cost, rare use.
- **Relations to values** (entity-to-number/string) — entity-to-entity only
  until a concrete story needs otherwise.
- **Parser integration** (genitive phrases "the hermit's donkey", queries
  like "everyone who knows X" as commands) — a separate seam with its own
  grammar implications (ADR-087 territory); noted, not scoped.

## Consequences (if adopted — none while exploratory)

- Version pegging: a relations feature is major-release-worthy on both
  surfaces — candidate anchor for **Sharpee 5.0.0 / Chord 3.0.0** (current
  published pair: 4.3.0 / 2.2.0 as of 2026-07-29, ADR-289). Not a breaking
  change per se (the dormant store has no users to break), but a headline
  capability that warrants the major pair and lockstep versioning.

  > **Note (ADR-289, 2026-07-29).** The reservation is unaffected by the
  > releases since: relations as *declared syntax* would be **additive**, and
  > additive syntax is a **minor** by ADR-257 D2's ordinary rule. What earns
  > 3.0.0 here is the headline capability, not the grammar delta — so the
  > reservation is a naming decision, deliberately held above the line D2
  > would otherwise draw. Chord's public line has meanwhile reached 2.2.0
  > (2.0.0 → 2.1.0 → 2.2.0); the interim landing history in
  > `chord/src/version.ts` also spends a `3.0.0`, which is history and not a
  > claim on this reservation.
  >
  > **Reservation released (2026-08-03, David, ADR-298 implementation).**
  > ADR-298's fielded story block is a *breaking* grammar change — a major
  > by ADR-257's ordinary rule, not a naming decision — and takes **Chord
  > 3.0.0**. An accepted, shipping breaking change outranks this exploratory
  > reservation. Relations, if pursued, anchors whatever major pair is next
  > when it actually happens (Sharpee N+1 / Chord 4.0.0 by today's line);
  > the lockstep principle is unchanged, only the numbers move.
  >
  > **Sharpee 5.0.0 also spent (2026-08-03, David, session f382ed).** The
  > `@sharpee/*` packages (lockstep, 4.3.0 today; next npm publish 4.4.0,
  > continuing the 4.x line through the IDE work) move to **5.0.0** when
  > David cuts the release; the Chord language is frozen at 3.0.0. So
  > neither half of the original 5.0.0/3.0.0 pair remains reserved for
  > relations — it anchors whatever pair is current when it lands.
- Umbrella discipline: child ADRs (E1-E4 are the candidates) carry all
  decisions; this ADR only indexes them once they exist.
- The existing ad-hoc pair state (wall `between`, conversation participants,
  doors) is NOT automatically migrated — whether relations subsume any of it
  is a child-ADR question, not an assumption.

## Open Questions

1. **Go / no-go and timing** — is this pursued at all, and if so, is it the
   anchor of 5.0.0/3.0.0 or does the world-model hardening (E1) land
   quietly in a 4.x minor first?
2. **Cardinality set** — which constraints does the registry support?
   (1:1, 1:N, N:N, symmetric are the I7 baseline; equivalence "groups" are
   a further step.)
3. **Chord assertion style** — verb-like assertions (`knows the Innkeeper`)
   vs explicit relation blocks; how mutation reads in rule bodies (`now …`
   is not currently a Chord idiom).
4. **Subsumption** — do doors, wall `between`, or conversation participants
   migrate onto relations, or do relations stay a purely additive authoring
   feature?
5. **Event surface** — are relation changes first-class events handlers can
   react to, and do they participate in event chains?
6. **Scope/visibility interaction** — do relations ever affect scope or
   parser resolution, or are they invisible to the parser by design?

## Session

Explored and drafted in session 7ca178 (2026-07-27), prompted by
Nathaniel's feature request. No implementation, no plan, no commitment.
