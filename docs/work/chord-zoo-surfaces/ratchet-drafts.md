# Zoo-Surfaces Package Phase 1 — Ratchet Entry Drafts (ON HOLD)

> **ON HOLD (David, 2026-07-12)**: the Z2/CP1 discussion exposed that
> ADR-209's snippet logic needs rethinking against the matured phrase
> algebra (verbatim-comma splice vs punctuation authority; `mentions` vs
> the condition kit; selector vs strategy dialects). A deep dive + new
> ADR (adr-211 draft) supersedes this file's Z2 entry; Z1/Z3/Z3b likely
> survive but are not normative until re-cut against the new ADR.

Drafted 2026-07-12 per the owner answers recorded in
`docs/work/chord/zoo-surfaces-proposal.md` (David, 2026-07-12: Z1 approved
as proposed; Z2 redirected to plain phrases — "the phrase evaluator should
handle commas"; Z3 expanded to the occupant lifecycle key family; Z3b and
§3.5 approved). **STATUS: PROPOSED — nothing here is normative until David
approves each entry.** On approval, entries transcribe into
`docs/architecture/chord-grammar-changes.md` (the one-way ratchet log);
this file stays as the working draft, Phase-C precedent.

## Verification notes (claims checked against the code, 2026-07-12)

1. **Z2 needs no new phrase grammar.** `define phrase <key>, <strategy>`
   with `or`-separated variants is shipped (`define-phrase`,
   chord-grammar.md:163; strategies `randomly|cycling|ordered|once`).
   Authored description prose already compiles to an IR phrase
   (`descriptionKey`, loader.ts:631 `phraseText`), so a `{<key>}` marker in
   room prose is already validated by `checkMarkers` (analyzer.ts:1617) —
   it resolves against declared phrase keys today and renders as literal
   braces only because nothing compiles it. Z2 is a loader compile step,
   not a parser addition.
2. **Two Choice keyspaces exist and must not be conflated.** A strategy
   phrase emitted by a `phrase <key>` statement rides a Choice atom keyed
   `('chord', <key>)` (runtime.ts:1233). ADR-209 snippets ride counters
   keyed `(roomId, marker)`, save-persistent, with the splice pass, the
   duplicate-marker rule, and the `mentions` gate all shipped and
   zoo-TS-proven. Z2 compiles description-marker references onto the
   ADR-209 keyspace (see entry).
3. **One join rule covers every real snippet.** David's Z2 concern
   (clarified 2026-07-12): the author must never hand-write the `, ` that
   stitches a fragment into an existing sentence — the evaluator owns
   joining, exactly as ADR-195's slot channel already joins bare
   contributions "under one punctuation authority." Checked against every
   shipped snippet entry — dungeo's (`, next to a cabinet`, the three
   mantel variants) and the zoo's pins pair — ALL are comma-led, so a
   single mechanical rule (non-empty fragment at a mid-sentence marker
   joins with `, `; empty joins nothing) reproduces today's output
   byte-identically with zero guessing. The connective word (`and`,
   `its`, `next to`) is part of the author's fragment; only the
   separator is platform-owned. ADR-209's verbatim-splice rule stays
   as-is at the TS surface; the Chord loader supplies the separator when
   compiling fragments into snippet texts.
4. **The frozen transcripts never exercise the `mentions` gate.**
   room-snippets.transcript asserts cycle entries 1/2, the empty entry
   ("not contains enamel"), and the wrap — the pins are scenery and cannot
   leave the Gift Shop, so the presence gate is unobservable in the gate
   files. The TS story sets `mentions` (zoo-items.ts:96) but no assertion
   reaches it. This is why Z2-a below offers deferral as an option.
5. **The Z3 lifecycle keys need zero platform touch.** Occupant relocation
   in Chord stories happens only through the loader's own `move` statement
   (runtime.ts:937) and removal paths — witnessed-arrival/departure hooks
   are loader-internal. `present` rides the shipped ADR-195 S1
   `{slot:here}` contributor surface (zoo TS index.ts:330 is the model).
6. **Spelling collision to resolve**: zoo.story's four dormant blocks
   (lines 538/567/607/640) spell the key `presence`; David's stated family
   is `entered / present / exited / disappeared`. zoo.story is migratable
   (only the transcripts are frozen), so this is a one-word ×4 story edit
   if `present` is confirmed — flagged as CP3.
7. **Z1 is genuinely new IR + loader surface**: no `initialDescription`
   exists in ir.ts or the loader today. The platform field
   (`RoomTrait.initialDescription`) ships (looking-data.ts:298).
8. **Z3b compile targets exist as authored trait fields**:
   `SwitchableTrait.detailWhenOn` (switchableTrait.ts:65),
   `LightSourceTrait.detailWhenLit` (lightSourceTrait.ts:48), read by the
   world-model state-clauses registry into the examine `{slot:detail}`.

## Proposed entries

| # | Form (syntax) | Rationale | Example | Decision |
|---|---------------|-----------|---------|----------|
| Z1 | **`first time` prose block in `create` blocks** (rooms): a `first time` block whose body is bare prose is the first-VISIT description; following bare paragraphs remain the standard description. Compiles to `RoomTrait.initialDescription` — the platform's exact semantics (first `look` shows it, later looks show the standard text). Never-guess: `second time`/`third time` at create scope are load errors (no platform field); `first time` prose on a non-room is a load error until a platform surface exists. Markers (Z2) are legal in BOTH texts and share entries + counters (ADR-209 q5/AC-9). | Reuses the existing ordinal concept at a new scope rather than minting a keyword (`initially`); Given 7 holds — the concept is the same one `first time` already names. | `create the Zoo Entrance` ⏎ `  a room` ⏎ `  first time` ⏎ `    Your family piles out of the car…` ⏎ ⏎ `  You stand before the wrought-iron gates…` | PROPOSED (design approved by David 2026-07-12) |
| Z2 | **Snippets are ordinary phrases; the evaluator owns the joining punctuation** — zero new grammar. A room description (either text) may carry `{<key>}` where `<key>` is a `define phrase` with a strategy; the author writes each variant as a BARE FRAGMENT (`and a spinning rack of enamel pins wobbles by the register`) — never the stitching `, `. Join rule (one rule, no guessing): a non-empty fragment at a mid-sentence marker joins the sentence with `, `; the empty entry joins nothing, leaving the sentence intact. The connective word (`and`, `its`, `next to`) belongs to the fragment; only the separator is platform-owned (ADR-195 punctuation-authority precedent). The loader compiles the marker site onto the shipped ADR-209 machinery: `{<key>}` becomes `{snippet:<key>}`, and `RoomTrait.snippets[<key>]` is populated from the phrase with the separator supplied at compile time (fragment → `', ' + fragment`, `nothing` → `''`; strategy → selector: `cycling`→`cycling`, `randomly`→`random`, `ordered`→`stopping`, `once`→`firstTime`) — output byte-identical to today's verbatim TS entries. Counters therefore key `(roomId, marker)` — per-room, save-persistent, ADR-209 parity; two rooms referencing the same phrase cycle independently; the SAME phrase emitted via a `phrase <key>` statement keeps its own `('chord', key)` counter and gets NO separator (the join rule is a marker-site rule). Never-guess: a marker-site variant that BEGINS with punctuation is a load error with a fix-it ("write the fragment bare — the joining comma is platform-owned"); an unresolvable `{key}` stays `analysis.unbound-marker`; a `verbatim` phrase at a description marker is a load error; a single-variant plain phrase at a marker site compiles to a string entry (joined every render). design.md §5.3 gate 5 goes live re-pointed at phrase keys. | David's concern verbatim (2026-07-12): "the author shouldn't care about splicing in commas that connect to an existing sentence. The phrase evaluator should understand how to handle that." Verification note 3: every shipped snippet entry is comma-led, so the single join rule reproduces all of them. The comma-strategy kit already expresses variant selection; a dedicated `snippet` block would duplicate it. | `define phrase pins, cycling` ⏎ `  and a spinning rack of enamel pins wobbles by the register` ⏎ `or` ⏎ `  and the enamel-pin rack stands picked half bare` ⏎ `or` ⏎ `  nothing` ⏎ `end phrase` — Gift Shop prose: `…and postcards{pins}. A large souvenir…` → renders `…and postcards, and a spinning rack…` / `…and postcards.` on the empty entry | PROPOSED (mentions gate per CP1; `nothing` per CP2) |
| Z3 | **Occupant lifecycle channel family** — reserved phrase keys on entities, all optional, platform-PULLED (emitting one via a `phrase` statement in a body is a load error; channels are never pushed): **`present`** — feeds the room description's `{slot:here}` (ADR-195 S1) while the owner is in the described room; one contribution per owner, bare content, slot owns joining; contribution order = declaration order. **`entered`** — narrated when the owner's location becomes the player's room (witnessed arrival). **`exited`** — narrated when the owner leaves the player's room for another room (witnessed departure). **`disappeared`** — narrated when the owner leaves play entirely (removed/destroyed) while the player is in its room. All firing is witnessed-only, per D11 (a phrase's reach follows its owner); unwitnessed transitions narrate nothing and consume nothing. Mechanism: loader-internal — `present` = one registered slot contributor; entered/exited/disappeared hook the loader's own `move`/removal paths (runtime.ts:937). The keys join the `br`/`match` reservation class (`analysis.reserved-name`). | David's expansion verbatim: "the author writes ALL the versions of the zookeeper" — arrival, presence, departure, vanishing are one narration family, not one key. Zero new syntax: they are ordinary owner-attached phrase blocks; the zoo's four dormant blocks light up with a one-word key migration (CP3). | `create the zookeeper` ⏎ `  a person` ⏎ `  in the Main Path` ⏎ ⏎ `  phrase present:` ⏎ `    Sam the zookeeper is here, jingling a ring of keys.` ⏎ ⏎ `  phrase exited:` ⏎ `    Sam heads off, keys jingling.` | PROPOSED (spellings + scope per CP3/CP4) |
| Z3b | **`phrase detail while <condition>:` on entities** — each gated block contributes its text to the examine `{slot:detail}` while the condition holds (`it` = the owner). Multiple `detail` blocks per owner are legal (independent contributions, declaration order — the one place a key repeats). This package compiles exactly the D1 pair: `while it is on` → `SwitchableTrait.detailWhenOn`, `while it is lit` → `LightSourceTrait.detailWhenLit`; any other condition is a load error naming the two supported forms (never-guess; generality per CP5). `phrase detail` with no `while` is a load error (unconditional detail belongs in the description). `detail` joins the reserved-key class with the Z3 family. | Approved as proposed (David 2026-07-12). Trait-config prose (`with detailWhenOn = …`) would put prose on a composition line; a gated channel phrase keeps text in phrase position. | `create the flashlight` ⏎ `  light-source, switchable` ⏎ ⏎ `  phrase detail while it is on:` ⏎ `    It clicks faintly as it powers up.` ⏎ `  phrase detail while it is lit:` ⏎ `    A thin beam plays across the floor.` | PROPOSED (generality per CP5) |

## IR wire-type note (not a table row)

Per the log's "what does not count as a grammar change" rule, the IR
additions are schema, recorded here as the single source of truth for the
implementation phases: rooms gain `initialDescriptionKey: string | null`
(Z1) and the loader-compiled snippet association (Z2 — whether this is a
loader-only derivation from the existing phrase table or an explicit IR
field is an implementation-phase call; the observable contract is the
ADR-209 `RoomTrait.snippets` shape); entities gain channel entries for the
Z3 family and `detail` blocks (key + optional `while` condition).
`@sharpee/ide-protocol` re-exports the IR and must build clean —
compatibility surface, ADR-210 Consequences. **Platform-touch forecast:
chord + story-loader only** (every runtime mechanism — ADR-209 splice,
ADR-195 slots, trait detail fields — already ships). Any surprise touch
outside those two packages is a stop-and-discuss checkpoint.

## Checkpoint questions for David

- **CP1 (Z2 mentions gate)** — where does ADR-209's presence gate live now
  that snippets are plain phrases? Options:
  - **(a) DEFER (recommended)**: no `mentions` surface this package. The
    frozen gate files never observe the gate (verification note 4); the
    migrated zoo.story simply omits it; byte-identical transcript behavior
    holds. The real customer is the dungeo conversion (the trunk case) —
    draft the surface when a story needs it.
  - **(b) Phrase-header clause**: `define phrase pins, cycling, mentions
    the enamel pins` — one line, but it puts a world reference on the
    world-blind general phrase form (the same leak that killed the
    dedicated block).
  - **(c) Room-owned binding line**: a one-liner in the `create` block
    (`snippet pins mentions the enamel pins`) associating the marker with
    its gate — keeps `define phrase` clean, reintroduces a `snippet`
    keyword at smaller scope.
- **CP2 (Z2 empty entry)** — is `nothing` the right spelling for the
  explicit empty variant (reserved only as a variant's entire body)?
- **CP3 (Z3 spellings)** — confirm the family keys exactly as `entered`,
  `present`, `exited`, `disappeared`, all optional per occupant. Note:
  zoo.story's four dormant blocks spell `presence` — confirming `present`
  means a one-word ×4 story migration (story edits are in scope; only
  transcripts are frozen). Also: strategy adverbs on channel phrases
  (varied presence lines) now, or later as their own entry (recommended:
  later — the zoo needs none)?
- **CP4 (Z3 scope)** — ship all four keys' runtime this package
  (loader-internal, fixture-story tested; recommended — entered/exited/
  disappeared have no zoo-transcript coverage but are cheap and testable),
  or ship `present` only with a load error ("not yet supported") on the
  other three until a story needs them?
- **CP5 (Z3b generality)** — D1 pair only, compiling to the shipped trait
  fields, other conditions a load error (recommended — zero zoo cost, no
  new machinery), or the full condition kit via loader-registered
  state-clause providers from day one?
- **CP6 (gate mechanics, carried from proposal §7.6)** — the excluded
  wt-02/wt-03 predate the chained rework: rejoin as standalone probes
  beside the atomic tests (proposed; they were authored unchained), or
  absorb into the chain (would mean editing frozen files — against the
  freeze)?
- **CP7 (sequencing, carried from proposal §7.7)** — one package landing
  all surfaces (proposed — gate re-entry is all-or-nothing per file), or
  split?
