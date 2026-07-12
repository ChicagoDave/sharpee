# ADR-211: Description Variety Rides the Phrase System — Bare Fragments, Platform-Owned Joining, Condition-Gated Snippets

## Status: ACCEPTED (2026-07-12 — Q1–Q7 resolved by David; each resolution recorded inline in §Open questions)

> Drafted 2026-07-12 from the zoo-surfaces Z2 discussion (David: "the
> author shouldn't care about splicing in commas that connect to an
> existing sentence. The phrase evaluator should understand how to handle
> that" → "backtrack to 209 and rethink the entire logic"). Written after
> a three-agent deep dive over the ADR-209 implementation, the phrase
> algebra's joining/selection machinery, and the Chord condition kit;
> every load-bearing claim below carries a file:line citation from that
> dive. **Supersedes ADR-209 in part** (the authoring semantics: verbatim
> splice, `mentions` as an author concept, the selector dialect);
> **preserves ADR-209's machinery in full** (see §What stands / what
> falls). Nothing is normative until accepted. **adr-review round 1
> applied** (2026-07-12, initial verdict NEEDS WORK 5/13 → 12/13 after
> fixes): added Interface contracts (Spliced atom, touched-packages
> list, atomic Chord compile contract + load-order vs engine
> validation), layer ownership of separators (lang-en-us, per the
> language-layer rule), edge rules (adjacent markers, text/paragraph
> boundaries, messageId render-graceful posture), and AC-9/AC-10. The
> one remaining review item is by design: Open Questions 1–7 are
> David's to answer before implementation.
>
> **Accepted 2026-07-12** — David walked Q1–Q7 (session 034f09). Three
> answers go beyond the drafted recommendations and are folded into the
> Decision text: Q3 mints the `here` deictic NOW alongside `is in
> <room>`; Q4 builds the registered-gate seam now AND wires the Chord
> loader to it (any `while <condition>` on a fragment works — no
> presence-only load error); Q5 reworks the adverb vocabulary to mirror
> the machinery 1:1 (`cycling, stopping, randomly, sticky, first-time`;
> `ordered`/`once` retire as phrase-strategy adverbs). AC-11/AC-12
> added for the two now-in-scope behaviors.

## Date: 2026-07-12

## Terminology

- **Fragment** — author-written text a marker splices into prose. Under
  this ADR, always written *bare*: no leading separator, ever.
- **Clause fragment** — a fragment joined into the middle of a host
  sentence (`and a spinning rack of enamel pins wobbles by the register`).
- **Sentence fragment** — a fragment standing as its own sentence(s)
  after a host sentence (`A large oriental rug lies to one side of the
  room.`).
- **Marker site** — the position of a marker in the prose. The site — not
  the fragment, not a setting — determines the join mode.
- **Separator** — the joining characters the platform supplies at a
  marker site (`, ` or ` `). Never author-written.
- **Gate** — a condition that must hold for a fragment to render at all.

## Context

ADR-209 (2026-07-03, implemented 07-07/08) gave rooms marker-spliced
snippets. The deep dive confirms its *machinery* was built right — and
already IS the phrase system:

- The splice emits a standard **`Sequence`** of `Verbatim`/`Literal`/
  `Choice`/`Empty` atoms (snippet-resolver.ts:111-181); the ADR's
  provisional `Seq` kind was never added because `Sequence` already
  existed (if-domain phrase.ts:102-116, decision recorded in the doc
  comment).
- Variety counters are ordinary **Choice counters** in the one
  `(entityId, messageKey)` `textState` capability, save-persistent and
  seeded-deterministic (english-assembler.ts:541-586; save shape
  confirmed on disk: `textState → data → [roomId] → [marker] = n`).
- The Assembler is already the **single counter authority**, including
  the once-per-render rule for duplicated markers
  (english-assembler.ts:529-548).

What has NOT aged well is the **authoring surface**, designed before the
phrase algebra and Chord matured, and it now contradicts the platform's
own principles in four places:

1. **The author writes the joining punctuation.** ADR-209 splices
   verbatim, so entries carry their own separators: `', next to a
   cabinet'`, `' An empty frame hangs on the far wall.'`. The platform's
   stated principle is the opposite — ADR-195 slots join bare
   contributions "under one punctuation authority at realize time"
   (renderSlot, english-assembler.ts:381-392; clause mode already
   inserts `', '` via the platform's sole comma-joiner `joinParts`,
   :281-288). The Z2 discussion tripped over exactly this.
2. **`mentions` is a bespoke conditional.** ADR-209 question 7 ruled "no
   predicate functions, ever; presence gating via `mentions`" — the
   right call when a condition meant a TS callback. Chord now has a
   declarative condition kit with one choke point (parseCondition /
   IRCondition / evalCondition), and its **existing** `is in <room>`
   predicate evaluates transitive containment (evaluator.ts:161-165,
   `isWithin` :407-414) — the *same check* the `mentions` gate performs
   (snippet-resolver.ts:136-141: `getContainingRoom(mentions)?.id ===
   roomId`). `mentions` is now a second spelling of a condition the
   language already says.
3. **Two selection vocabularies.** Snippet selectors
   (`cycling|stopping|sticky|random|firstTime`) and Chord strategies
   (`randomly|cycling|ordered|once`) name the same Choice machinery
   twice, reconciled by a mapping table in the loader
   (runtime.ts:57-60).
4. **Chord has no surface at all**, which is what stranded four zoo
   transcripts outside the AC-2 gate and started this chain of
   proposals.

One more finding forces a design the zoo discussion missed: **shipped
fragments come in two join modes.** Dungeo's nine snippet rooms are
mostly *sentence* fragments (leading space, own terminator: the rug, the
trophy case, the thief-lair frame); the zoo pins and concealment-test
cabinet/mantel are *clause* fragments (leading comma). Any "one comma
rule" is wrong on half the corpus. The rule must decide the mode — and
it can, mechanically (see Decision 2).

## Decision (proposed)

**One sentence: description variety is the phrase system — authors write
bare fragments with variants, strategies, and condition gates; markers
place them; the platform owns every separator.**

### 1. One authoring concept: the fragment phrase

A snippet is a phrase: one or more prose variants, an optional selection
strategy, an optional gate. In Chord that is literally `define phrase`
(or a room-owned phrase) — zero new definition syntax:

```
define phrase pins, cycling
  and a spinning rack of enamel pins wobbles by the register
or
  and the enamel-pin rack stands picked half bare
or
  nothing
end phrase
```

The room's prose places it with an ordinary marker: `…stuffed animals
and postcards{pins}. A large souvenir penny press…`. In TS, the
`SnippetMap` remains the storage/wire shape (see Decision 5), but its
entries become bare fragments too if Open Question 1 resolves to full
unification.

`nothing` (the variant's entire body) is the explicit empty variant — a
gap in the cycle. Blank variants are never guessed.

### 2. The join rule: the marker site decides, mechanically

The separator is determined by where the marker sits in the host prose —
no per-phrase setting, no heuristic over the fragment text:

- **Clause site** — the marker is mid-sentence (the preceding
  non-whitespace character exists and is not a sentence terminator
  `.?!` or paragraph edge). A non-empty fragment joins with **`, `**.
- **Sentence site** — the marker follows a sentence terminator, a
  paragraph edge, or starts the text. A non-empty fragment joins with
  **`  ` (one space)**, or nothing at a paragraph edge/start.
- **Empty fragment** (the `nothing` variant, a gated-out fragment, or a
  runtime-set `''`) joins **nothing** — the host prose renders as if the
  marker were absent, both modes. (This is today's `Empty` absorption,
  english-assembler.ts:721-724, unchanged.)

This reproduces the entire shipped corpus byte-for-byte once entries are
stripped to bare fragments: `postcards` + `, ` + `and a spinning rack…`
equals today's verbatim `, and a spinning rack…`; `door.` + ` ` + `A
large oriental rug…` equals today's `' A large oriental rug…'`. Frozen
transcripts and the concealment-test AC harness stay byte-identical
through the migration.

Never-guess gates: a fragment variant that *begins* with punctuation or
whitespace is a load error (Chord) / lint error (TS) with the fix-it
"write the fragment bare — the separator is platform-owned." A clause
site whose fragment *ends* with a sentence terminator is a lint warning
(likely a sentence fragment at a clause site — author drift).

**Edge rules** (each an AC):

- **Adjacent markers** (`…postcards{a}{b}.`): site mode is computed over
  the AUTHORED prose with markers treated as transparent — the mode
  comes from the nearest preceding non-marker, non-whitespace character.
  `{a}` and `{b}` above are both clause sites; if both render non-empty,
  each gets its own `, `. Mode is static (authored text), never a
  function of what a neighboring marker happened to render this turn.
- **Start of text / paragraph edge**: sentence site, empty separator
  (no leading space at a text or paragraph boundary).
- **`{ messageId }` entries** (ADR-209 AC-10 machinery, unchanged in
  shape): the bare-fragment rule applies to the RESOLVED text. Literal
  texts are checked at load/lint; messageId texts resolve at render, so
  enforcement there is the render-graceful posture — a punctuation-led
  resolved text logs `[snippet]`-style and is joined as-is (broken-build
  log, never a mid-turn throw).

**Layer ownership** (language-layer rule): site-mode *classification*
and separator *insertion* are language conventions (`, ` vs ` `, the
terminator set `.?!`) and belong to **lang-{locale}** — the Assembler,
which already owns the platform's only comma-joiner (`joinParts`) and
the serial-comma setting. The stdlib resolver stays world-facing only
(scan, gate, variant resolution) and emits mode-ANNOTATED parts; it
never concatenates punctuation. See Interface contracts.

### 3. Gates ride the condition kit; `mentions` becomes a compile target

The authoring form for conditionality is `while <condition>` — the same
condition kit used everywhere else (three existing `while` hosts:
conditional trait composition, blocked exits, clause headers; plus the
statement-final `when` on phrase statements — the direct precedent for
condition-gated text).

- **Presence, the canonical case**: `while the enamel pins is in the
  Gift Shop` uses the **existing** `is-in` predicate — zero new grammar.
  When the named room is the marker's own room, the loader compiles the
  gate to the ADR-209 data form — `mentions: <entityId>` — and the
  shipped resolver gate runs it unchanged. `mentions` thus survives as
  the *compiled representation* of a presence gate, not as a concept
  authors learn.
- **The `here` deictic** (`while the enamel pins is here`) SHIPS NOW
  alongside `is in <room>` (Q3 resolution) — the D11 primitive
  `playerPresentAt(world, irEntityId)` (runtime.ts:776-786) and the
  render-side containment check are both already keyed the right way.
  It is new grammar and gets its own ratchet entry in the zoo-surfaces
  package; on a room-description fragment it compiles to the same
  presence form as `is in <this room>` (i.e. `mentions`).
- **Arbitrary gates** (`while after-hours`, `while the cage is open`)
  cannot compile to plain data — `SnippetEntry` is serializable by
  design (ADR-209 q2/q7) and must stay so. They ride a **registered
  gate seam**, BUILT NOW (Q4 resolution): the resolver accepts,
  alongside the data map, gates registered per `(roomId, marker)` by
  the runtime that owns the conditions (the Chord loader), the exact
  pattern the state-clauses registry uses for examine detail
  (world-model state-clauses.ts:49-82). The Chord loader WIRES to the
  seam immediately (Q4 follow-up): any `while <condition>` on a
  fragment phrase works — presence conditions compile to `mentions`
  data; every other condition registers on the seam at load. There is
  no presence-only load error. Registered gates are re-registered at
  load, so save/restore is unaffected (nothing gate-shaped is
  serialized).

The lint half of `mentions` (coverage metadata: "is every scenery entity
mentioned or covered?") is preserved for free: a presence gate *names
its entity*, so the lint reads gates — data `mentions` in TS, compiled
`mentions` from Chord — with no separate annotation surface.

### 4. One selection vocabulary, one mapping, stated once

Chord strategy adverbs MIRROR the Choice selector names 1:1 (Q5
resolution — no mapping table for authors to remember). The table is
fixed here and nowhere else:

| Chord adverb | Choice selector | Behavior |
|---|---|---|
| `cycling` | `cycling` | variants in order, wraps forever |
| `stopping` | `stopping` | variants in order, stays on the last |
| `randomly` | `random` | seeded random pick every render |
| `sticky` | `sticky` | seeded random pick once, locked forever (save-persistent) |
| `first-time` | `firstTime` | variant 1 on first render, variant 2 thereafter |

The old `ordered` and `once` phrase-strategy adverbs RETIRE. No shipped
`.story` uses either as a phrase strategy (zoo.story's only strategy
adverb is `randomly`, which survives unchanged), so story migration is
zero. The rule modifier `once` (`on every turn …, once`) is a different
grammar site and is untouched — retiring the phrase-strategy `once`
removes that same-word collision. The loader's existing table
(runtime.ts:57-60) is rewritten to this table and remains the single
implementation of this paragraph; the adverb renames and `sticky`/
`first-time` additions are chord-grammar ratchet entries in the
zoo-surfaces package.

### 5. Storage, keying, and rendering stay ADR-209's

- **Storage**: `RoomTrait.snippets` (plain, serializable) remains the
  wire/data shape; the TS builder sugar remains. Chord marker sites
  compile INTO it (description string `{key}` → `{snippet:key}` +
  map entry from the phrase's variants/strategy/gate). The
  `{snippet:name}` marker spelling remains the TS/storage form —
  its prefix exists so legacy prose braces stay inert (AC-7), a
  constraint Chord doesn't have; Chord's bare `{key}` is load-validated
  (checkMarkers) and compiles to the prefixed form.
- **Counter keying**: marker sites key `(roomId, marker)` — per-room
  independence, AC-9 sharing across initialDescription/description,
  and the proven save format all depend on it. The SAME phrase emitted
  by a Chord `phrase <key>` *statement* keeps its own
  `('chord', key)` counter and gets NO separator — the join rule is a
  marker-site rule. Two sites, two counters, pinned deliberately.
- **Known hazard carried forward, documentation-only**: snippet counters
  share the room entity's Choice keyspace with story-authored Choices
  (ADR-209 Consequences); no runtime guard, naming convention stands.
  Namespacing the key would break every existing save for a
  hypothetical collision — rejected.
- **Load-loud / render-graceful** posture, the once-per-render
  duplicate-marker rule, engine load validation, and the devkit
  unused-entry lint all stand unchanged.
- **Runtime map mutation** (dungeo's rug-push and thief-death handlers)
  stands — handlers set entries to bare fragments post-migration, same
  `''`-not-delete convention.

### Interface contracts

Per the co-located wire-type rule, the one new phrase value lives in
**`@sharpee/if-domain`** next to `Sequence`/`Choice`:

```typescript
// @sharpee/if-domain — the mode-annotated splice part
export interface Spliced extends PhraseBase {
  kind: 'spliced';
  mode: 'clause' | 'sentence';   // computed from the AUTHORED marker site
  content: Phrase;               // Literal | Choice | Empty (the fragment)
}
```

- **stdlib** `resolveSnippetDescription(text, roomId, snippets, world,
  resolveMessage?)` keeps its signature; its returned `Sequence.parts`
  interleave `Verbatim` prose with `Spliced` wrappers instead of bare
  fragment phrases. The resolver computes `mode` from the authored text
  (edge rules above) and applies the gate; it emits no separator
  characters.
- **lang-en-us** Assembler realizes `Spliced`: realize `content`; if the
  resulting runs are empty → nothing; else prepend the separator (`', '`
  clause / `' '` sentence, empty at text/paragraph boundary — the
  boundary fact is carried by the resolver setting `mode: 'sentence'`
  with a flag or by emitting no `Spliced` wrapper there; implementation
  detail, but the CHARACTERS come from lang-en-us only). Counter
  advancement is untouched (`content` Choice realizes exactly as
  today).
- **engine** `validateRoomSnippets` additionally rejects punctuation-led
  LITERAL fragment texts at load (the bare-fragment gate);
  `lintUnusedSnippetEntries` unchanged.
- **chord / story-loader compile contract** (multi-step, ATOMIC — all
  steps or a LoadError, never a partial room): for each room-description
  phrase text containing `{<key>}` where `<key>` is a declared strategy
  phrase: (1) rewrite the marker to `{snippet:<key>}` in the compiled
  description string; (2) populate `RoomTrait.snippets[<key>]` from the
  phrase (variants → texts with `nothing` → `''`; strategy → selector
  per the Decision 4 mapping); (3) compile a presence `while` gate
  (`<entity> is in <this room>`, or the `here` deictic) to
  `mentions: <entityId>`; any other `while` condition registers on the
  gate seam per `(roomId, marker)` (Q4 resolution). This runs inside
  the loader's entity build — i.e. within `story.initializeWorld`, and
  therefore strictly BEFORE the engine's `validateRoomSnippets` call
  (game-engine.ts:374), whose unbound-marker check then covers compiled
  Chord rooms for free.
- **chord grammar/IR**: where the `while` gate attaches on a fragment
  phrase (define-phrase header vs room-owned phrase header) is pinned by
  the zoo-surfaces ratchet entry that re-cuts against this ADR, not
  here; whatever the spelling, `IRPhrase` gains an OPTIONAL
  `condition?: IRCondition` — additive, so `@sharpee/ide-protocol`'s
  re-export surface keeps building (the `IRPhrase.verbatim?` precedent).

**Touched packages** (complete list): `if-domain` (Spliced + guard),
`lang-en-us` (Spliced realization + separator ownership),
`stdlib` (resolver mode annotation + the registered-gate seam),
`engine` (load gate),
`devkit` (lint message text only, if any), `world-model` (no change —
storage as-is), `chord` (gate attachment per ratchet; `here` deictic;
adverb renames + `sticky`/`first-time`; marker compile metadata),
`story-loader` (compile contract above; strategy table rewritten to
the Decision 4 table; gate registration on the seam), `ide-protocol`
(builds clean against the additive IR field — verification, not code).
Stories per the Migration inventory. Anything outside this list is a
stop-and-discuss checkpoint.

### What stands (from ADR-209) / what falls

| Stands (machinery) | Falls (authoring surface) |
|---|---|
| `Sequence` splice, `Empty` absorption | Verbatim splice — authors writing separators |
| Choice counters, `(roomId, marker)` keying, textState persistence | `mentions` as an author-facing concept (→ compile target of presence `while`) |
| Seeded determinism, single counter authority, once-per-render | The selector dialect as a second author vocabulary (→ one mapping) |
| `RoomTrait.snippets` storage + `{snippet:name}` storage-form marker | ADR-209's "no conditions ever" (→ `while`: presence compiles to data, everything else rides the gate seam) |
| Load validation, unused-entry lint, mutation-at-runtime pattern | — |

## Migration inventory (from the deep dive; all mechanical)

- **dungeo**: 9 rooms / 11 entries (white-house mailbox; house-interior
  trophycase, rug, table; underground door; dam panel, buttons; maze
  frame `''`; frigid-river rainbow; well-room cage — the one existing
  `mentions`), plus 2 handler mutations (rug-push-interceptor.ts:79-81,
  melee-interceptor.ts:227-231). All become bare fragments; per-site
  join mode verified against the rule during migration.
- **friendly-zoo (TS)**: zoo-items.ts pins entry (3 texts + mentions).
- **concealment-test**: the AC harness (study clock; parlor cabinet,
  mantel, dust ×2, trunk) — entries go bare; the 17/17 transcript and
  the mid-cycle save fixture must stay byte-identical (they do, by
  Decision 2's equivalence).
- **Tests**: snippet-resolver.test.ts, snippet-splice.test.ts (AC-1
  byte-exact render stands — inputs change, outputs don't),
  snippet-validation.test.ts untouched.
- **Chord/zoo.story**: the zoo-surfaces package migrates zoo.story to
  the Chord surface (`define phrase pins, cycling` + `{pins}`), which is
  what returns the four excluded transcripts to the AC-2 gate.

## Open questions — ALL RESOLVED by David 2026-07-12 (session 034f09)

1. **TS surface scope.** → **(a) Full unification.** The resolver
   applies the join rule; all TS entries migrate to bare fragments
   (inventory above; byte-identical outputs; frozen transcripts and
   saves untouched). One splice semantics everywhere, per the two
   edicts. (Rejected: Chord-only normalization — two splice semantics
   forever.)
2. **The join rule itself.** → **Confirmed as drafted.**
   Site-determined mode (clause `, ` / sentence ` `), the bare-fragment
   load/lint error, and the clause-site-with-terminator warning all
   stand. (Rejected as guessing: inferring mode from fragment
   capitalization/punctuation.)
3. **Presence spelling in Chord.** → **Both, now.** `is in <room>`
   ships (compiles to `mentions`) AND the `here` deictic is minted in
   the same package as its own ratchet entry, compiling to the same
   presence form. (The drafted defer-`here` recommendation was
   declined.)
4. **The registered-gate seam.** → **Build now AND wire Chord now.**
   The seam ships (state-clauses-registry pattern) and the Chord loader
   registers any non-presence `while` condition on it at load — full
   generality, no presence-only load error. (The drafted defer
   recommendation was declined.)
5. **Selector mapping.** → **Reworked: adverbs mirror the machinery
   1:1** — `cycling, stopping, randomly, sticky, first-time` (table in
   Decision 4). `ordered` and `once` retire as phrase-strategy adverbs
   (no story migration — nothing shipped uses them); the rule-modifier
   `once` is untouched. `sticky` and `first-time` are new adverbs;
   renames + additions land as chord-grammar ratchet entries.
6. **Counter keying.** → **Confirmed.** `(roomId, marker)` for marker
   sites, `('chord', key)` for statement emissions (two independent
   counters per dual-use phrase, AC-8), collision hazard stays
   documentation-only.
7. **ADR-209 bookkeeping.** → **Done** (same session): the one-line
   "superseded in part by ADR-211 (authoring surface)" note is appended
   to 209's Status block; its machinery decisions remain in force.

## Acceptance criteria (each lands as a test when implemented)

- **AC-1**: Bare-fragment entries at a clause site and a sentence site
  render byte-identically to their pre-migration verbatim equivalents
  (the concealment-test transcript passes unedited, 17/17).
- **AC-2**: The `nothing`/empty variant renders the host prose as if the
  marker were absent at both site kinds; counters still advance.
- **AC-3**: A punctuation-led fragment fails at load (Chord) / lint (TS)
  with the bare-fragment fix-it.
- **AC-4**: `while <entity> is in <own room>` on a Chord fragment
  compiles to `mentions` and gates identically to ADR-209 AC-4.
- **AC-5**: Save/restore mid-cycle continues the cycle (existing fixture
  format unchanged: `textState → [roomId] → [marker]`).
- **AC-6**: The four excluded zoo transcripts rejoin the gate unedited
  against the migrated zoo.story.
- **AC-7**: Dungeo's chain stays green through the entry migration,
  including both runtime-mutation handlers.
- **AC-8**: A Chord phrase used at a marker site AND emitted as a
  statement keeps two independent counters and gets a separator only at
  the marker site.
- **AC-9**: Adjacent markers (`{a}{b}` mid-sentence) each classify as
  clause sites from the authored text; both-non-empty renders two
  `, `-joined fragments, either-empty renders as if that marker were
  absent — all four combinations pinned.
- **AC-10**: A `{ messageId }` entry resolves and joins per its site
  mode; a punctuation-led resolved text logs and joins as-is (render
  never throws) — the load-time bare-fragment gate covers literal texts
  only.
- **AC-11**: `while <entity> is here` on a Chord fragment compiles to
  the same `mentions` form as `while <entity> is in <this room>` — the
  two spellings gate identically (byte-identical render both ways).
- **AC-12**: A non-presence `while` gate (e.g. `while after-hours`)
  registers on the gate seam at load and gates its fragment at render;
  after save/restore the gate still holds (re-registered at load,
  nothing gate-shaped serialized); counters advance only when the
  fragment renders per today's gated-Choice behavior.
- **AC-13**: The retired phrase-strategy adverbs `ordered` and `once`
  are a load error naming the replacement (`stopping` / `first-time`);
  the rule-modifier `once` still parses.

## Consequences

- Authors — TS and Chord alike — write words, never separators; the
  platform's punctuation-authority principle holds at every seam
  (slots, lists, and now splices).
- Conditionality on description text becomes ordinary `while`, fully
  general from day one: presence (either spelling) compiles to
  serializable `mentions` data, every other condition rides the
  registered-gate seam — so ADR-209's serializable-data rule survives
  intact.
- One selection vocabulary per audience with one fixed mapping; the
  ratchet governs additions.
- The zoo-surfaces package's Z2 re-cuts against this ADR (the on-hold
  ratchet drafts already point here); Z1/Z3/Z3b are unaffected in
  substance and re-confirm against it.
- Cost: a mechanical migration across three stories and two handler
  call-sites, protected end-to-end by byte-identical output equivalence.

## Session

Deep dive + draft 2026-07-12 (session 86e4c4, branch v2-210-chord-a),
from David's Z2 correction and his call to "backtrack to 209 and rethink
the entire logic." Three-agent implementation dive reports informed every
citation; agents mapped ADR-209's implementation, the Assembler's
joining/selection machinery, and the Chord condition kit.

Accepted 2026-07-12 (session 034f09, same branch): David resolved Q1–Q7
one at a time; resolutions recorded inline and folded into Decisions 3
and 4, the compile contract, the touched-packages list, and AC-11..13.
