# ADR-209: Room-Description Snippets — Author-Written Text Spliced at Explicit Markers

## Status: DRAFT

> Proposed 2026-07-03 from a design discussion with David (session daf0f1).
> **All seven open questions resolved by David the same day** (see the Open
> Questions section; each records its decision and the rejected alternatives).
> Not yet reviewed (`/adr-review` pending) and not scheduled for
> implementation.

## Date: 2026-07-03

## Terminology

- **Marker** — a named placeholder the author writes inside their own room
  description prose, e.g. `{cabinet}`.
- **Snippet** — author-written text that replaces a marker: a single string, or
  a list of strings the platform selects among.
- **Snippet map** — the room's marker→snippet table, supplied by the author.
- **Splice pass** — the mechanical substitution of snippets into the
  description at render time. There is no generation, no inference, and no
  rewriting; the platform only ever emits text the author wrote.

## Context

Room prose in a well-written game does not enumerate its scenery. Authors hide
things, or mention them in passing, and the player decides what matters. That
convention collided with tooling twice:

1. The dungeo audit produced **81 findings** rooted in one assumption: that
   scenery would be surfaced in room text automatically. It isn't, by design —
   but with prose as an opaque string, nobody can verify which scenery an
   author *meant* to leave unmentioned versus forgot.
2. Authors who want **variety** in a description (a detail that reads
   differently across visits) or a **tunable aside** (a subtle mention they can
   adjust without rewriting the paragraph around it) have no mechanism short of
   overriding the whole description from code.

The design constraint that shaped this ADR, stated by David: the mechanism must
be **non-AI and purely mechanical** — author-written snippets embedded into
author-written text at author-chosen points. Three richer designs were
considered and rejected during the discussion:

- **Per-entity mention blurbs** (a `mention` field on `SceneryTrait`, appended
  via the `{slot:here}` channel — the TADS `specialDesc` shape). Rejected: the
  interesting mentions span several entities in one clause and belong to the
  room's prose, not to any one entity.
- **Room-authored claiming templates** (sentences written as phrase templates
  binding entities as NounPhrase params). Rejected: too heavy; the author's
  prose should stay prose.
- **Platform-generated relational sentences** (tuples like
  `embed(cabinet, 'next to', doorway)` rendered from platform template pools,
  with anchor-finding in the prose). Rejected: the platform writing sentences
  the author didn't write is exactly what this feature must not do.

## Decision (proposed)

Let a room description carry **explicit markers**, resolved from an
**author-supplied snippet map**, spliced mechanically at render time. Fully
opt-in: a room with no snippet map renders exactly as today.

### Author surface

```typescript
study.description(
  'The study has a doorway to the north{snippet:cabinet} and encompassing ' +
  'the entire south wall is a custom designed marble fireplace with ' +
  'nymphs holding poker and broom{snippet:mantel}.'
);

study.snippets({
  cabinet: ', next to a cabinet',
  mantel: [
    ', the mantel holding sentimental items',
    ', its mantel crowded with keepsakes',
    ', a few sentimental items on the mantel',
  ],
});
```

Rendered (one possible visit):

> The study has a doorway to the north, next to a cabinet and encompassing the
> entire south wall is a custom designed marble fireplace with nymphs holding
> poker and broom, the mantel holding sentimental items.

### Semantics

1. **String snippet** → spliced verbatim, every render.
2. **List snippet** → one entry selected via the existing seeded **Choice**
   machinery (`@sharpee/if-domain` phrase contract): deterministic, keyed
   `(roomId, markerName)`, counter persisted in saves, never `Math.random`.
   Transcript tests stay reproducible. An empty-string entry is legal and makes
   the snippet absent on some visits.
3. **Selector** is author-choosable per snippet (`random`, `cycling`,
   `firstTime`, `sticky`, `stopping`) via the long form
   `{ selector: 'cycling', texts: [...] }`; the short list form uses the
   default (see open question 3).
4. **Identity decoupling** — the point of the feature. The entity keeps its
   full name, aliases, and `examine` description in its own traits; the room
   shows only the quiet spliced text. `examine cabinet` rewards the player who
   noticed the aside. Nothing forces the spliced text to name the entity the
   way the world model does.
5. **Opt-in parsing** — a description is scanned for markers **only when the
   room has a snippet map**. Rooms without one remain pure
   `{verbatim:description}`: braces in existing prose keep meaning nothing,
   so the change is additive with zero migration.
6. **Mistakes fail loudly**, per house style: in a snippet-bearing room, a
   marker with no snippet entry is a synchronous error at story load (same
   posture as `PhraseParseError`). A snippet entry whose marker never appears
   in the description is a build-time lint warning (likely author drift, not
   fatal).
7. **Optional `mentions` — coverage metadata and presence gate** (still
   optional per snippet, but with behavior when set):

   ```typescript
   study.snippets({
     cabinet: { text: ', next to a cabinet', mentions: cabinet },
   });
   ```

   `mentions` is a serializable entity reference doing two jobs. First,
   coverage: a future lint can answer mechanically whether every non-hidden
   scenery entity in the room is either named in the prose or covered by a
   snippet. Second, presence gating (resolved question 7): a snippet with
   `mentions` renders only while that entity is present in the room, so a
   trunk that gets blown up, taken, or moved stops being mentioned with no
   author bookkeeping. Aftermath text and non-presence conditions go through
   event handlers mutating the map (set an entry to `''` rather than deleting
   it; the load-time unbound-marker error stays meaningful). A gated-out or
   empty snippet renders as nothing.

### Non-goals

- No platform-generated prose, ever. Every rendered character is
  author-written.
- No anchor inference, no scanning prose for entity names, no reading
  containment relations to produce text.
- No automatic scenery listing, and no change to rooms that don't opt in.
- Not a general conditional-text system: no predicate functions in snippet
  data, ever. The one world-state input is presence gating via `mentions`
  (resolved question 7); all other state-dependence goes through event
  handlers mutating the map, or the existing homes (`Optional` phrases,
  `descriptionMessageId`).

### Touched layers (sizing, not a plan)

- **world-model**: snippet-map storage on `RoomTrait` (alongside the ADR-107
  `descriptionMessageId` and `initialDescription` fields) and the
  builder/helper surface.
- **stdlib (looking)**: pass the snippet map (or the pre-split description
  parts) into the room-description params instead of one opaque string.
- **lang-en-us / Assembler**: realize the spliced description as a sequence of
  verbatim segments interleaved with Literal/Choice values, so Choice counters
  advance under the Assembler's single authority as they do everywhere else.
  `if.room.description_body` (`{verbatim:description}{slot:here}`) keeps its
  shape; the `description` param's *value* becomes composite.

## Open questions (all resolved by David, 2026-07-03)

1. **Marker syntax.** ~~Open~~ **RESOLVED (David, 2026-07-03): `{snippet:name}`.**
   Brace syntax with an explicit kind prefix, matching the `{slot:…}` /
   `{contents:…}` house pattern. Self-documenting in prose, and the prefix
   makes clear this is the splice mechanism, not the phrase grammar, so
   authors don't expect hint-word forms to work inside descriptions.
   (Rejected: bare `{name}`, expectation-drift risk; `[[name]]`, a second
   placeholder syntax to teach.)
2. **Snippet-map home.** ~~Open~~ **RESOLVED (David, 2026-07-03):
   `RoomTrait.snippets` trait data + `room().snippets()` builder sugar**,
   matching how `initialDescription` landed. Serializes with the world,
   visible to `introspect`, reachable by direct-trait authors (dungeo style)
   without the builder. (Rejected: builder-only, which locks out direct-trait
   construction; a separate `SnippetTrait`, whose generality is speculative
   until question 5 expands scope — if that day comes, moving the storage is
   an internal refactor, not an author-facing change.)
3. **Default selector for the short list form.** ~~Open~~ **RESOLVED (David,
   2026-07-03): `cycling`.** No adjacent repeats is the better default:
   `random` with a short list can pick the same entry back to back, which
   authors read as a bug. Authors who want randomness write
   `{ selector: 'random', texts: [...] }` explicitly and get the seeded,
   deterministic behavior.
4. **Failure severity for an unused snippet entry.** ~~Open~~ **RESOLVED
   (David, 2026-07-03): build/lint warning, not a load error.** The asymmetry
   justifies it: an unbound marker puts broken text on screen and stays fatal
   at load (house style); an unused entry renders nothing and is usually
   mid-edit drift, so it warns without breaking the build.
5. **Scope of splicing.** ~~Open~~ **RESOLVED (David, 2026-07-03): both
   `description` and `initialDescription`** — required, not optional; an
   author splicing the main description rightly expects markers to work in
   the first-visit text too. Both texts share the room's one snippet map, and
   a marker used in both draws from the same snippet entry and the same
   selector counter. Entity `examine` descriptions are explicitly deferred to
   a follow-up ADR if stories ask for them.
6. **i18n form.** ~~Open~~ **RESOLVED (David, 2026-07-03): text-first, with
   `{ messageId }` supported.** Snippets are story text, so raw strings are
   the normal path; nothing is shoveled through the language layer by
   default. But a multilingual story pushes all its text into the language
   provider, so a snippet entry may be `{ messageId }` instead (consistent
   with NPC actions' `{ text } | { messageId }` split). Lists stay on the
   story side (`[{ messageId: 'a' }, { messageId: 'b' }]`); the provider
   contract is untouched.
7. **State-conditional snippets.** ~~Open~~ **RESOLVED (David, 2026-07-03):
   no predicate functions, ever. Presence-gating via `mentions`, plus
   handler-driven map mutation for everything else.** The motivating case
   (the PC blows up a trunk mentioned by a snippet) is a *presence* question,
   not an arbitrary-state question: when the entity leaves the room
   (destroyed, taken, moved), its mention should evaporate. So `mentions`
   does double duty — it is both the coverage-lint metadata *and* a gate: a
   snippet with `mentions: trunk` renders only while the trunk is present in
   the room. It stays a serializable entity reference, so `RoomTrait.snippets`
   remains plain data (question 2 holds). Everything past presence goes
   through event handlers, which own logic in this architecture: the
   explosion handler mutates the map
   (`snippets.trunk = ', scorch marks blackening the corner'`) for aftermath
   text, and non-presence conditions (`zoo.after_hours` and kin) swap entries
   the same way. Two rules make this safe: a gated-out or empty-string
   snippet renders as nothing, and authors set entries to `''` rather than
   deleting them, so the load-time unbound-marker error stays meaningful.
   A snippet that should outlive its entity ("scorch marks where the trunk
   stood") simply omits `mentions` on that text.

## Consequences

- Authors get subtle, tunable, optionally randomized scenery mentions without
  surrendering prose to the platform — and without it, nothing changes.
- Randomized room text becomes deterministic and save-stable by construction,
  because it rides the existing Choice counters instead of ad-hoc randomness.
- The dungeo-81 defect class gets a mechanical answer *if* authors adopt the
  optional `mentions` metadata; the feature is useful without it, but the lint
  is only as complete as the metadata.
- One new invariant to hold: a room description containing `{` renders
  differently depending on whether the room has a snippet map. The opt-in rule
  keeps this safe, but the book and the trait docs must state it plainly.
- Adds a second consumer of the Choice counter keyspace (`(roomId, marker)`
  alongside `(entityId, messageKey)`); the persistence format already
  accommodates arbitrary keys, but the keying convention must be documented to
  avoid collisions with story-authored Choices on the same room entity.

## Session

Designed in conversation with David, 2026-07-03 (session `daf0f1`), following
the Phase 7 book dry run and the dungeo-81 discussion. This document is the
deliverable; no implementation is planned until the draft is reviewed
(`/adr-review`) and accepted.
