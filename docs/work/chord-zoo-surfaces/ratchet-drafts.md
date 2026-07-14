# Zoo-Surfaces Package Phase 1 — Ratchet Entry Drafts (RE-CUT v2 against ADR-211)

> **RE-CUT 2026-07-12 (session 034f09)** against **ADR-211 ACCEPTED**
> (all Q1–Q7 resolved by David the same day). The v1 drafts' ON HOLD is
> lifted. What changed: Z2 is rewritten (bare fragments stored bare; the
> separator is inserted by the PLATFORM AT RENDER via the site-determined
> join rule — not loader-prepended at compile time as v1 said); CP1
> (mentions home) and CP2 (`nothing`) are RESOLVED by the ADR; two new
> entries join (Z4 `here` deictic — Q3; Z5 adverb rework — Q5); the
> platform-touch forecast is re-cut (ADR-211 core touches 9 packages —
> see CP7'). Z1/Z3/Z3b survive in substance and re-confirm here.

Drafted 2026-07-12 per the owner answers recorded in
`docs/work/chord/zoo-surfaces-proposal.md` (Z1 approved; Z3 = occupant
lifecycle family; Z3b + §3.5 approved) and re-cut per ADR-211's accepted
decisions. **STATUS: APPROVED + TRANSCRIBED (David, 2026-07-12, session
034f09)** — all checkpoints resolved (§Checkpoints) and all six entries
(Z1, Z2, Z3, Z3b, Z4, Z5) transcribed into
`docs/architecture/chord-grammar-changes.md` (the one-way ratchet log)
on David's "transcribe." This file stays as the working draft, Phase-C
precedent; the log rows are normative where they differ.

## Verification notes (v1 notes updated where ADR-211 corrected them)

1. **Z2 needs no new phrase-definition grammar.** `define phrase <key>,
   <strategy>` with `or`-separated variants is shipped (chord-grammar.md:163).
   Authored description prose already compiles to an IR phrase, so a
   `{<key>}` marker in room prose is already `checkMarkers`-validated
   (analyzer.ts:1617). Z2 is a loader compile step onto ADR-209 storage.
   NEW grammar in this package is confined to Z2's gate spelling (`while`
   on a fragment phrase), Z4 (`here`), and Z5 (adverb set).
2. **Two Choice keyspaces exist and must not be conflated** — confirmed
   as ADR-211 Q6: marker sites key `(roomId, marker)` (save-persistent,
   per-room independence, AC-9 sharing); statement emissions key
   `('chord', key)` (runtime.ts:1233). One phrase used both ways keeps
   two counters and gets a separator only at the marker site (AC-8).
3. **The join rule is SITE-determined** (v1's "all shipped fragments are
   comma-led" was wrong — the ADR-211 deep dive found dungeo uses
   sentence fragments). Clause site (marker mid-sentence) → non-empty
   fragment joins with `, `; sentence site (after a terminator/paragraph
   edge) → joins with one space; empty joins nothing. Classification +
   insertion live in lang-en-us via the new `Spliced` atom; the stdlib
   resolver only annotates mode. Reproduces the whole shipped corpus
   byte-identically (ADR-211 Decision 2, Q2 confirmed).
4. **The frozen transcripts never exercise the presence gate** (pins are
   scenery, can't leave the Gift Shop) — still true, but no longer a
   reason to defer: Q3/Q4 shipped the gate surface in full, so the
   migrated zoo.story MAY carry `while the enamel pins is here` for
   documentation value at zero transcript risk, or omit it. Entry Z2
   leaves the gate off the zoo migration (nothing observes it); the
   dungeo trunk case is the first real consumer.
5. **The Z3 lifecycle keys need zero platform touch.** Occupant
   relocation in Chord stories happens only through the loader's own
   `move` statement (runtime.ts:937) and removal paths. `present` rides
   the shipped ADR-195 S1 `{slot:here}` contributor surface.
6. **Spelling collision to resolve (CP3)**: zoo.story's four dormant
   blocks (lines 538/567/607/640) spell `presence`; David's family is
   `entered / present / exited / disappeared` — a one-word ×4 story edit
   if confirmed.
7. **Z1 is genuinely new IR + loader surface**: no `initialDescription`
   in ir.ts or the loader today; the platform field ships
   (looking-data.ts:298).
8. **Z3b compile targets exist as authored trait fields**:
   `SwitchableTrait.detailWhenOn`, `LightSourceTrait.detailWhenLit`,
   read by the world-model state-clauses registry into examine
   `{slot:detail}`.
9. **Adverb blast radius (Z5) is zero stories**: the only shipped
   phrase-strategy adverb in any `.story` is `randomly` (zoo.story ×2),
   which survives. zoo.story's `on every turn …, once` is the RULE
   modifier — a different grammar site, untouched.

## Proposed entries

| # | Form (syntax) | Rationale | Example | Decision |
|---|---------------|-----------|---------|----------|
| Z1 | **`first time` prose block in `create` blocks** (rooms): a `first time` block whose body is bare prose is the first-VISIT description; following bare paragraphs remain the standard description. Compiles to `RoomTrait.initialDescription` — the platform's exact semantics (first `look` shows it, later looks show the standard text). Never-guess: `second time`/`third time` at create scope are load errors (no platform field); `first time` prose on a non-room is a load error until a platform surface exists. Markers (Z2) are legal in BOTH texts and share entries + counters (ADR-209 q5 / ADR-211 Q6, AC-9). | Reuses the existing ordinal concept at a new scope rather than minting a keyword (`initially`); Given 7 holds. Unchanged from v1 (approved). | `create the Zoo Entrance` ⏎ `  a room` ⏎ `  first time` ⏎ `    Your family piles out of the car…` ⏎ ⏎ `  You stand before the wrought-iron gates…` | PROPOSED (design approved by David 2026-07-12; re-confirmed against ADR-211) |
| Z2 | **Snippets are ordinary phrases; fragments are BARE; the platform inserts the separator at render** (ADR-211 Decisions 1–3). A room description (either text) may carry `{<key>}` where `<key>` is a strategy phrase; every variant is a bare fragment (`and a spinning rack of enamel pins wobbles by the register`) — no leading `, `, ever. `nothing` (a variant's entire body) is the explicit empty variant (ADR-211 Decision 1 / CP2 RESOLVED). The loader compile contract (ATOMIC per room, ADR-211 Interface contracts): `{<key>}` → `{snippet:<key>}`; `RoomTrait.snippets[<key>]` populated with the BARE variant texts (`nothing` → `''`); strategy → selector per the Z5 table. Joining is NOT the loader's: the stdlib resolver emits mode-annotated `Spliced` parts (clause site vs sentence site, computed from the authored prose) and lang-en-us inserts `, ` / ` ` / nothing at render — byte-identical to today's verbatim TS entries (ADR-211 AC-1). Gates: an optional `while <condition>` on the fragment phrase — a presence condition (`<entity> is in <this room>`, or Z4's `is here`) compiles to `mentions: <entityId>` data; ANY other condition registers on the gate seam per `(roomId, marker)` at load (Q4: seam built + Chord wired now; no presence-only error). Counters per verification note 2. Never-guess: a variant beginning with punctuation/whitespace is a load error with the fix-it "write the fragment bare — the separator is platform-owned" (AC-3); a clause-site fragment ending in a sentence terminator is a lint warning (author drift); an unresolvable `{key}` stays `analysis.unbound-marker`; a `verbatim` phrase at a description marker is a load error; a single-variant plain phrase at a marker site compiles to a string entry (joined every render). design.md §5.3 gate 5 goes live re-pointed at phrase keys. | David's concern verbatim (2026-07-12): "the author shouldn't care about splicing in commas that connect to an existing sentence. The phrase evaluator should understand how to handle that" — now the platform-wide rule (Q1 full unification: TS entries migrate to bare fragments too, under ADR-211's own package). The comma-strategy kit already expresses variant selection; a dedicated `snippet` block would duplicate it. | `define phrase pins, cycling` ⏎ `  and a spinning rack of enamel pins wobbles by the register` ⏎ `or` ⏎ `  and the enamel-pin rack stands picked half bare` ⏎ `or` ⏎ `  nothing` ⏎ `end phrase` — Gift Shop prose: `…and postcards{pins}. A large souvenir…` → renders `…and postcards, and a spinning rack…` / `…and postcards.` on the empty variant. Gated: `define phrase keeper-note, cycling while the zookeeper is here` ⏎ `  …` ⏎ `end phrase` (CP1': trailing `while` on the header) | PROPOSED — all checkpoints resolved (CP1' 2026-07-12: gate = trailing `while` on the define-phrase header) |
| Z3 | **Occupant lifecycle channel family** — reserved phrase keys on entities, all optional, platform-PULLED (emitting one via a `phrase` statement in a body is a load error; channels are never pushed): **`present`** — feeds the room description's `{slot:here}` (ADR-195 S1) while the owner is in the described room; one contribution per owner, bare content, slot owns joining; contribution order = declaration order. **`entered`** — narrated when the owner's location becomes the player's room (witnessed arrival). **`exited`** — narrated when the owner leaves the player's room for another room (witnessed departure). **`disappeared`** — narrated when the owner leaves play entirely (removed/destroyed) while the player is in its room. All firing is witnessed-only, per D11; unwitnessed transitions narrate nothing and consume nothing. Channel phrases may carry a strategy adverb with `or`-variants (`phrase present, cycling:` — CP3 resolution; the Z5 adverb set applies; counter keying is the owner entity + channel key, implementation-phase detail). Mechanism: loader-internal — `present` = one registered slot contributor; entered/exited/disappeared hook the loader's own `move`/removal paths (runtime.ts:937). The keys join the `br`/`match` reservation class (`analysis.reserved-name`). | David's expansion verbatim: "the author writes ALL the versions of the zookeeper" — one narration family, not one key. Zero new syntax: ordinary owner-attached phrase blocks; the zoo's four dormant blocks light up with a one-word key migration (CP3). Unchanged from v1. | `create the zookeeper` ⏎ `  a person` ⏎ `  in the Main Path` ⏎ ⏎ `  phrase present:` ⏎ `    Sam the zookeeper is here, jingling a ring of keys.` ⏎ ⏎ `  phrase exited:` ⏎ `    Sam heads off, keys jingling.` | PROPOSED — all checkpoints resolved (CP3: keys confirmed + channel adverbs now; CP4: all four keys' runtime ships) |
| Z3b | **`phrase detail while <condition>:` on entities** — each gated block contributes its text to the examine `{slot:detail}` while the condition holds (`it` = the owner). Multiple `detail` blocks per owner are legal (independent contributions, declaration order — the one place a key repeats). Compile target (CP5' resolution — full condition kit): `while it is on` → `SwitchableTrait.detailWhenOn` and `while it is lit` → `LightSourceTrait.detailWhenLit` (the shipped trait fields); ANY other condition registers a loader-registered state-clause provider (the world-model registry the Q4 seam pattern copies) — `while` on prose is never artificially restricted. `phrase detail` with no `while` is a load error (unconditional detail belongs in the description). `detail` joins the reserved-key class with the Z3 family. | Approved as proposed (David 2026-07-12). Trait-config prose (`with detailWhenOn = …`) would put prose on a composition line; a gated channel phrase keeps text in phrase position. Q4's full-generality resolution shifts the consistency argument — see CP5'. | `create the flashlight` ⏎ `  light-source, switchable` ⏎ ⏎ `  phrase detail while it is on:` ⏎ `    It clicks faintly as it powers up.` ⏎ `  phrase detail while it is lit:` ⏎ `    A thin beam plays across the floor.` | PROPOSED — all checkpoints resolved (CP5': full condition kit) |
| Z4 | **The `here` deictic joins the condition kit** (ADR-211 Q3): `while <entity> is here` is a well-formed condition wherever `while` parses — ONE predicate, one choke point (parseCondition / IRCondition / evalCondition), two evaluation contexts: (a) on a description-fragment gate, `here` denotes the DESCRIBED room, and when that is the marker's own room the loader compiles the gate to `mentions: <entityId>` — byte-identical to `is in <this room>` (ADR-211 AC-11); (b) everywhere else (rule/behavior `while`), `here` denotes the player's current room, evaluated via the D11 primitive `playerPresentAt` (runtime.ts:776-786) / transitive containment. Never-guess: `here` with a non-entity subject is a load error; an entity with no location evaluates false (not an error). | Q3 resolution: minted now alongside `is in <room>`, not deferred. Defining it kit-wide (rather than fragment-only) keeps the condition language uniform — one predicate, no context-forbidden spellings — and both evaluation primitives already exist and are keyed correctly (ADR-211 Decision 3). | `define phrase keeper-note, cycling while the zookeeper is here` — or in a rule: `on every turn while the parrot is here` | PROPOSED — kit-wide scope stands (CP1''s pinned spelling exercises `here` on a define-phrase header) |
| Z5 | **Strategy adverbs mirror the Choice selectors 1:1** (ADR-211 Q5/Decision 4): the adverb set becomes `cycling | stopping | randomly | sticky | first-time` → selectors `cycling | stopping | random | sticky | firstTime`. Semantics (from `pickChoiceAlternative`): cycling = in order, wraps; stopping = in order, stays on last; randomly = seeded random each render; sticky = seeded random once, locked forever (save-persistent); first-time = variant 1 on first render, variant 2 thereafter. The retired adverbs `ordered` and `once` are a LOAD ERROR naming the replacement (`stopping` / `first-time`) — ADR-211 AC-13; the rule modifier `once` (`on every turn …, once`) is a different grammar site and still parses. Applies everywhere strategies are legal (define-phrase headers, and channel phrases if/when CP3's tail opens them). Loader table (runtime.ts STRATEGY_SELECTOR) rewritten to the ADR-211 Decision 4 table — the single implementation. | Q5 resolution: `ordered` didn't say it stops; `once` didn't say "first text once, then the second"; and phrase-strategy `once` collided with the rule-modifier `once`. Mirroring removes the mapping table from the author's head. Zero story migration (verification note 9). | `define phrase pins, cycling` ⏎ `define phrase hint, stopping` ⏎ `define phrase chatter, randomly` ⏎ `define phrase mood, sticky` ⏎ `define phrase intro, first-time` | PROPOSED (per Q5, adverb table already ACCEPTED in ADR-211 — this entry is its ratchet transcription) |

## IR wire-type note (not a table row)

Per the log's "what does not count as a grammar change" rule, the IR
additions are schema, recorded here as the single source of truth for
the implementation phases: rooms gain `initialDescriptionKey: string |
null` (Z1) and the loader-compiled snippet association (Z2 — loader-only
derivation vs explicit IR field is an implementation-phase call; the
observable contract is the ADR-209 `RoomTrait.snippets` shape);
`IRPhrase` gains OPTIONAL `condition?: IRCondition` (Z2/Z4 gates —
additive, ADR-211 Interface contracts, `IRPhrase.verbatim?` precedent);
entities gain channel entries for the Z3 family and `detail` blocks (key
+ optional `while` condition). `@sharpee/ide-protocol` re-exports the IR
and must build clean — compatibility surface, ADR-210 Consequences.

**Platform-touch forecast — RE-CUT (supersedes v1's "chord +
story-loader only"):** the zoo-surfaces SURFACES still touch only
`chord` + `story-loader`, but they now ride ADR-211's platform core
(`if-domain` Spliced, `lang-en-us` separator ownership, `stdlib`
resolver annotation + gate seam, `engine` load gate, TS-story
migrations) — a 9-package touch list owned by ADR-211, not by this
package. Sequencing between the two is CP7'. Any touch outside the
combined ADR-211 list is a stop-and-discuss checkpoint.

## Addendum — Z6 (drafted 2026-07-14, session 9ad631; TRANSCRIBED 2026-07-14 on David's "transcribe")

> Minted by ADR-213 Q3 (resolved 2026-07-13 via adr-interview: "mint
> now, spelled `remove`, rides zoo-surfaces Phase 3 as its own ratchet
> entry"). Approval-in-principle is recorded in ADR-213 §4; this row is
> the entry text for David's explicit "transcribe" into
> `chord-grammar-changes.md` BEFORE Phase 3 implementation (the Z1–Z5
> precedent). Two sub-decisions are proposed here beyond ADR-213's
> pinned semantics and need David's eye: the D7/D13 kit memberships and
> the remove-the-player load error.

| # | Form (syntax) | Rationale | Example | Decision |
|---|---------------|-----------|---------|----------|
| Z6 | **`remove <entity>` statement** — takes the entity out of play entirely: compiles to `world.removeEntity`; ADR-213's pre-removal observers fire; a witnessed `phrase disappeared:` on the entity narrates per Z3 (player's room = the entity's last containing room; unwitnessed removals narrate nothing and consume nothing, D11). Removal is permanent — no statement restores a removed entity. Legal wherever `move` is (clause/action/trait bodies, sequence steps — joining D13's sequence mutation kit) and takes the D7 statement `when` suffix (`remove the crumbs when the seagull is here`); entity references resolve as `move`'s do (`it` = clause owner, `the match` inside `each`). Orphaning is deliberately NOT this statement (there is still no null `move` — parked-nowhere is not an author concept). Never-guess: `remove the player` is a load error (`analysis.remove-player` — the platform defines no post-removal player semantics; ADR-213 pins player removal as out of the channel's scope). | Chord's statement roster has no way to take an entity out of play (`move` requires a real destination, runtime.ts:937-944); every shipped disappearance is TS-side. ADR-213 (ACCEPTED 2026-07-13) built the platform signal at the `removeEntity` choke point; Q3 minted the statement now, spelled `remove` to match the one platform API (Given 7 — one form; no `destroy` synonym). | `after buying it` ⏎ `  remove the last balloon` ⏎ `end after` — witnessed, the balloon's `phrase disappeared:` renders; gated: `remove the crumbs when the seagull is here` | Approved + TRANSCRIBED (David, 2026-07-14 — "transcribe", incl. both sub-decisions; approval-in-principle ADR-213 Q3) |

## Checkpoints — ALL RESOLVED by David 2026-07-12 (session 034f09)

- **CP1' (gate attachment spelling)** → **(a) Define-phrase header,
  trailing `while`**: `define phrase keeper-note, cycling while the
  zookeeper is here` — one spelling for every phrase host (matches the
  Z3b `phrase detail while …:` shape and the rule-header `while`). The
  v1 world-blindness objection is moot: ADR-211 sanctions conditions on
  phrases (`IRPhrase.condition`). (Rejected: room-owned `snippet …
  while` binding line — a second gate spelling + a `snippet` keyword.)
- **CP2** — **RESOLVED by ADR-211** Decision 1 (accepted): `nothing` as
  a variant's entire body is the explicit empty variant; blank variants
  are never guessed.
- **CP3 (Z3 spellings)** → **keys confirmed** exactly as `entered`,
  `present`, `exited`, `disappeared`, all optional per occupant
  (zoo.story's `presence` ×4 migrates one word) — **and strategy
  adverbs on channel phrases ship NOW** (not deferred): `phrase
  present, cycling:` with `or`-separated variants is legal in this
  package (Z5 adverb set applies).
- **CP4 (Z3 scope)** → **all four keys' runtime ships this package**
  (loader-internal, fixture-story tested; entered/exited/disappeared
  have no zoo-transcript coverage but are cheap and testable).
- **CP5' (Z3b generality)** → **(b) full condition kit**: `while it is
  on` / `while it is lit` still compile to the shipped trait fields;
  any other condition registers a loader-registered state-clause
  provider (the registry the Q4 seam pattern copies). One uniform rule
  with Q4: `while` on prose is never artificially restricted.
  `phrase detail` with no `while` remains a load error.
- **CP6 (gate mechanics)** → **absorb into the chain, retire the
  originals**: the excluded wt-02/wt-03 assertions are re-authored as
  new chained segments; the files in `walkthroughs/excluded/` are
  DELETED once the chain covers everything they asserted (deletion
  executes at implementation, per this recorded decision). The freeze
  protects the gate files; these four are outside the gate.
- **CP7' (sequencing)** → **(a) two packages, core first**: `211-core`
  lands the platform (Spliced + join rule + gate seam + TS-entry
  migrations) green and byte-identical on the existing corpus
  (AC-1/5/7); `zoo-surfaces` rides it (Z1–Z5, zoo.story migration,
  transcripts rejoining — AC-4/6/8/11/12/13 + Z1/Z3 fixtures). Each
  gate re-entry stays all-or-nothing.
