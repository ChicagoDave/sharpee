# ADR-209: Room-Description Snippets — Author-Written Text Spliced at Explicit Markers

## Status: ACCEPTED — IMPLEMENTED (commits `354547a7`, `b56a1827`, 2026-07-07/08)

> Accepted 2026-07-03 by David. Proposed the same day from a design
> discussion (session daf0f1); **all seven open questions resolved by David**
> (see the Open Questions section; each records its decision and the rejected
> alternatives). **adr-review round 1 applied** (initial verdict NEEDS WORK,
> 8/13 → 13/13 after fixes): added Interface contracts (wire types in
> if-domain, `Seq` phrase value, stdlib-owns-scan boundary resolution),
> render-time graceful degradation for runtime map mutation,
> duplicate-marker and presence-definition edge rules, and AC-1..AC-10.
> **Implemented** across all six planned phases in commit `354547a7`
> (2026-07-07; wire types, RoomTrait storage, splice pass, engine validation,
> devkit lint, dungeo adoption) with the switching_on auto-look scenery
> exclusion following in `b56a1827` (2026-07-08). All AC-1..AC-10 landed as
> tests; dungeo walkthrough chain green.

## Date: 2026-07-03

## Terminology

- **Marker** — a named placeholder the author writes inside their own room
  description prose, e.g. `{snippet:cabinet}`.
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
6. **Mistakes fail loudly at load, degrade gracefully at render.** In a
   snippet-bearing room, a marker with no snippet entry is a synchronous
   error at story load (same posture as `PhraseParseError`). Because
   handlers may mutate the map at runtime (semantics 7), the render path
   must also cope: an unbound marker encountered at render time splices
   nothing and logs
   `[snippet] room "study": marker 'cabinet' has no entry` — the same
   treat-the-log-as-a-broken-build posture as `renderMessage` failures. The
   render path never throws mid-turn. A snippet entry whose marker never
   appears in either description text is a build-time lint warning (likely
   author drift, not fatal).
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

- **if-domain**: `SnippetText` / `SnippetEntry` / `SnippetMap` wire types and
  the `Seq` phrase kind (see Interface contracts).
- **world-model**: `RoomTrait.snippets` storage (alongside the ADR-107
  `descriptionMessageId` and `initialDescription` fields) and the
  builder/helper surface (`room().snippets()`).
- **stdlib (looking)**: the scan/gate/resolve pass; binds the `Seq` as the
  `description` param (see Boundary resolution).
- **lang-en-us / Assembler**: realize `Seq` by in-order concatenation; Choice
  counters advance under the Assembler's single authority as everywhere else.
  `if.room.description_body` (`{verbatim:description}{slot:here}`) keeps its
  shape; the `description` param's *value* becomes composite.
- **engine**: load-time marker validation after `initializeWorld`.
- **devkit**: the unused-entry build lint (warning).

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
8. **Duplicate markers resolve once per render.** If the same marker appears
   twice in one description, both occurrences splice the same resolved text,
   and the entry's selector counter advances once for that render.
9. **Presence is transitive containment within the room.** For the `mentions`
   gate, an entity is "present" when its containing room is this room,
   however deeply nested (the trunk inside a crate in the parlor still
   counts). It stops being present when its containing room changes or the
   entity is destroyed — matching the scope system's notion of "here."

### Interface contracts

The snippet map's wire shape is shared by world-model (storage), stdlib
(scan/gate), and lang-en-us (realization), so per the co-located wire-type
rule it lives in **`@sharpee/if-domain`**, next to the phrase contract:

```typescript
// @sharpee/if-domain
export type SnippetText = { text: string } | { messageId: string };

export type SnippetEntry =
  | string                                    // one text, spliced every render
  | string[]                                  // short form: cycling over texts
  | (SnippetText & { mentions?: string })     // one text with optional gate
  | {
      selector?: 'cycling' | 'stopping' | 'sticky' | 'random' | 'firstTime';
      texts: Array<string | SnippetText>;
      mentions?: string;                      // entity id; gates the whole entry
    };

export type SnippetMap = Record<string, SnippetEntry>;
```

```typescript
// @sharpee/world-model — RoomTrait gains one optional field
snippets?: SnippetMap;
```

The spliced description reaches the Assembler as a **`Seq` phrase value**
(new in if-domain unless `PhraseList` with no conjunction proves honest at
implementation time): `{ kind: 'seq', parts: Phrase[] }`, realized as plain
in-order concatenation with no joining punctuation. Parts are `Verbatim`
literals (the author's prose segments) interleaved with `Literal` / `Choice`
values (the resolved snippet entries). Choice *picks* still happen at
realize time inside the Assembler, so selector counters advance under its
single authority, keyed `(roomId, markerName)`.

**Boundary resolution (stdlib ↔ lang):** the stdlib looking action owns the
scan and the gate — it splits the description text at markers, resolves each
marker to its entry, applies the `mentions` presence check via world queries,
resolves `{ messageId }` texts through the language provider interface, and
binds the resulting `Seq` as the `description` param. The Assembler stays
world-blind and simply realizes what it is handed. Load-time marker
validation runs in the **engine** at story initialization (after
`initializeWorld` returns); the unused-entry lint runs in the **devkit**
build.

## Acceptance criteria

Each AC lands as a test: unit tests in the owning package for scan, gate, and
realization, plus one story-level transcript exercising AC-1 through AC-4,
AC-8, and AC-9 end to end.

- **AC-1**: The study example (Author surface) renders byte-exactly as shown
  on first visit (default `cycling` picks the first entry).
- **AC-2**: Repeated `look` advances a `cycling` snippet in declaration order
  and wraps; a `random` snippet is seeded-deterministic and replays
  identically in the same transcript.
- **AC-3**: Saving mid-cycle and restoring continues the cycle where it left
  off (counter persisted with the game).
- **AC-4**: A snippet with `mentions: trunk` stops rendering once the trunk
  leaves the room (destroyed, taken, or moved) and resumes if it returns;
  the same entry mutated by a handler to `''` renders nothing without error.
- **AC-5**: Story load fails synchronously, naming room and marker, when a
  description or initialDescription contains `{snippet:x}` with no `x` entry.
- **AC-6**: `sharpee build` warns, naming room and entry, when a snippet
  entry's marker appears in neither description text.
- **AC-7**: A room with no snippet map whose description contains literal
  braces renders them verbatim — behavior identical to today.
- **AC-8**: A marker appearing twice in one description splices the same
  resolved text at both sites and advances the counter once.
- **AC-9**: `description` and `initialDescription` share entries and
  counters: a cycling entry advances across a first-visit render
  (initialDescription) followed by a second-visit render (description).
- **AC-10**: A `{ messageId }` entry resolves through the language provider;
  an unknown id follows the platform's existing missing-message behavior.

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
