# ADR-239: Chord topic conversation — exposing ask/tell topics to on-clauses

## Status: ACCEPTED (2026-07-18 — all three open questions ruled by David, session d02586; adr-review 13/14 post-flip, AC enumeration + stale-ref fixes applied; D3 AMENDED same day by David — `define topics for <entity>` table block supersedes the clause-header spelling)

## Date: 2026-07-18

## Parent: ADR-233 (go-live gate — closes the parity audit's last two ⚠️ rows, asking/telling, ruled in-gate by David 2026-07-18, session d02586); builds on ADR-231 D4 (first-class validated topic)

## Context

David's ruling (2026-07-18): **ask/tell needs to be available on the
platform and in Chord.** The parity audit's two remaining ⚠️ rows are
asking and telling — "Chord has zero topic surface."

Platform reality, verified 2026-07-18: the platform half is already
complete —

- Parser: `ASK :recipient ABOUT :topic` / `TELL :recipient ABOUT
  :topic` grammar ships; `command.topic` is the first-class validated
  topic (ADR-231 D4) — verbatim free text plus `topic.entity` when the
  topic quietly resolved to an in-scope entity.
- stdlib `asking`/`telling`: validate reads `command.topic.text`
  (missing topic → `unknown_topic`); report emits `if.event.asked` /
  the telling counterpart carrying `{topic, topicEntityId, …}`;
  interceptors can key on `topicEntityId`.
- Chord: `on asking it` / `on telling it` clauses already fire through
  the generic gerund path — but they cannot see the topic, so an NPC
  can give exactly ONE blanket answer. No `topic` spelling exists
  anywhere in `packages/chord` or `packages/story-loader`.

So this ADR designs a **Chord-only surface** (grammar + analyzer + the
loader/runtime exposure of the event payload the platform already
emits). No stdlib/parser change is expected; if implementation finds a
platform seam missing, it is raised to David, never silently bridged.

The audit's own recommendation, recorded 2026-07-17: "expose topic to
on-clauses, e.g. `on asking it about \"sword\"` or a `the topic is …`
condition (one surface serves asking+telling)."

## Decision

### D1 — One surface serves asking and telling

Whatever spelling ships, it is identical for `on asking it …` and
`on telling it …` (and composes with `after` the way every event
clause does). The two actions share the platform topic shape; Chord
mirrors that symmetry. (Per the audit recommendation.)

### D2 — The topic surface is a ratchet entry

The chosen spelling lands as a grammar-ratchet row (the R-series
discipline every surface addition has followed), with David's approval
recorded, and grammar references (chord-grammar.md, chord.ebnf)
updated in the same workstream.

### D3 — Spelling: the `define topics for <entity>` table block (David, 2026-07-18; AMENDED same day superseding the clause-header form)

**[Amendment, 2026-07-18, later the same session: David refined the
surface from per-topic clause headers to an explicit table construct —
"we need a table of topics + responses" is LITERAL syntax, not the
compiled collection of clauses. The clause-header spelling below the
amendment is superseded; its two `about` forms survive as the table's
row keys.]**

The topic table is a `define`-family block — one block per entity,
holding **any number of topic rows** (multiple topics per block is a
hard requirement):

```
define topics for the porter
  about the sword: phrase sword-reply
  about "treasure" or "the hoard": phrase treasure-reply
  about "the folly":
    phrase folly-reply
    change the porter to nervous
end topics
```

- Row keys are the two ruled `about` forms: `about the <entity>`
  (entity tier — the platform's quiet `topicEntityId` resolution) and
  `about "<text>"` (free-text tier); `or` declares aliases on a row
  (D4).
- A one-line row names its response directly; a row may instead open
  an indented statement body for rich beats (state changes,
  conditions) — one construct scaling from simple to rich, no
  separate clause form and therefore no `from`/`it` anywhere.
- `for the <entity>` names the owner once; a second `define topics`
  block for the same entity is a compile error (the define-family
  duplicate discipline — the table lives in one place).
- Per D1 the table serves `ask` and `tell` about its topics alike; if
  a story needs divergent ask/tell answers, that per-verb row marking
  is a future ratchet conversation, not designed here.
- The superseded alternatives: per-topic `on asking about …` clause
  headers (the original D3), the `while the topic is …` condition
  form, and both-forms — all rejected; the table block is the one
  form (Given 7).

### D4 — Free text is DEFINED: the topic table (David, 2026-07-18)

A quoted topic is a **definition, not a pattern**. The entity's
`define topics for …` block (D3, as amended) IS its declared **table
of topics + responses** — a closed, compile-visible set, in the same
spirit as every other Chord vocabulary (never-guess: the story
declares what can be asked about; nothing fuzzy-matches at runtime).

- **Matching is table lookup**, not search: the player's topic text is
  normalized (case-insensitive, leading article stripped — the same
  normalization entity-name resolution already applies) and looked up
  against the declared entries. No substring or word-subset matching.
- **Alternate phrasings are declared, never inferred** — a topic with
  several spellings declares them (the alias spelling — e.g. `or`
  between quoted forms in one header — is fixed at ratchet time with
  the implementation, like every surface detail).
- **Overlap is compile-decidable and gated**: because both tiers are
  declarations, the analyzer can refuse a duplicate row (entity or
  quoted, aliases included) within an owner's table, a quoted entry
  that collides with the name/aka of an entity used in an entity-tier
  row of the same table, and a second `define topics` block for the
  same entity — the cross-tier precedence question dissolves (no
  runtime tie-break rule exists; collisions are compile errors).
- An asked topic that matches NO declared entry falls to the catch-all
  (D5).

### D5 — Catch-all: the unfiltered clause owns misses; hits own their response (David, 2026-07-18)

The existing unfiltered `on asking it` clause is the **catch-all**: it
fires only when the asked topic matches no declared table entry — the
NPC's own "I don't know about that" voice. With no catch-all declared,
stdlib's standard `unknown_topic` default speaks. On a table hit, the
matched entry **fully owns the response** — the catch-all is
suppressed, never appended (the ISSUE-074/rug lesson: append-vs-
override semantics are load-bearing and are decided here, not
discovered later). `on telling it` mirrors identically (D1).

### D6 — Acceptance criteria for the follow-on implementation plan

- **AC-1**: a Chord-loaded NPC with declared topic entries answers
  per-topic through the REAL `asking` action — entity-tier and
  free-text-tier entries each proven on emitted message ids.
- **AC-2**: a declared alias spelling reaches the same response as its
  primary; an undeclared paraphrase does NOT (lookup, not search —
  asserted both ways).
- **AC-3**: every compile gate has a rejection test asserting its
  specific diagnostic: duplicate row (entity or quoted, aliases
  included) within a table, cross-tier collision (quoted entry vs
  entity name/aka used in the same table), and a second `define
  topics` block for the same entity.
- **AC-4**: catch-all semantics proven both ways — a miss fires the
  unfiltered clause (and the stdlib `unknown_topic` default when none
  is declared); a hit suppresses the catch-all entirely.
- **AC-5**: `on telling about …` proven symmetric with one test per
  tier.
- **AC-6**: ratchet row landed with David's approval recorded;
  chord-grammar.md + chord.ebnf carry the forms; the audit's
  asking/telling rows close (54 ✅ / 0 ⚠️ / 0 ❌).

## Consequences

- The audit's asking/telling rows close on implementation — Part 1
  reaches 54 ✅ / 0 ⚠️ / 0 ❌, a completely clean action table.
- The tutorial pattern catalog's C4 row (topic conversation) stops
  being "the one selection that creates new platform work" — it
  becomes ordinary shipped surface the tutorial may freely include.
- Implementation follows the established child-workstream shape:
  interview → follow-on plan → phases with REAL-PATH tests
  (a real `asking` action driven against a Chord-loaded NPC, asserting
  per-topic branching on emitted message ids) → ratchet row → audit
  closure.

## Session

d02586 (2026-07-18), branch `chord-foundations`.

