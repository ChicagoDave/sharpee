# The Zoo-Surfaces Package — initialDescription, Snippets, Slot Contributors (Proposal)

**Status**: DRAFT — not reviewed. Nothing here is approved; §7 lists every open
call. Written against the gate-scope decision + 2026-07-12 addendum in
docs/work/chord-phase-b/zoo-gate-audit.md: four frozen zoo transcripts are
excluded from the Chord AC-2 gate because three host-shell phrase-algebra
features have no Chord surface. This package proposes the surfaces. The four
files rejoining the gate — frozen, byte-unedited — IS the acceptance test.

## 1. What exists today

**Platform (all shipped, TS-story-proven; no platform gaps):**
- `RoomTrait.initialDescription` — the looking action renders it on the first
  visit, the standard description after (stdlib looking-data.ts:298).
- ADR-209 snippets — `RoomTrait.snippets` map; `{snippet:name}` markers in
  description prose; entries = selector (`cycling` default) + texts (empty
  string legal) + optional `mentions` presence gate; Choice counters keyed
  `(roomId, marker)`, save-persistent.
- ADR-195 slots — `{slot:here}` in the platform room-description body (S1;
  fed via `engine.registerSlotContributor`) and the examine `{slot:detail}`
  channel (S2; fed from the world-model state-clauses registry, which today
  reads `SwitchableTrait.detailWhenOn` / `LightSourceTrait.detailWhenLit`).

**Chord:**
- None of the three has a surface. zoo.story's entrance has only the standard
  description; the Gift Shop prose has no marker; radio/flashlight compose
  `switchable`/`light-source` with no detail text.
- zoo.story ALREADY declares `phrase presence:` on the zookeeper, parrot,
  goats, and rabbits (lines ~539/568/608/…) — carrying the exact four S1
  lines the transcripts assert. The keys are dormant: nothing consumes them.
- design.md §5.3 gate 5 already anticipates the snippet surface: "`{snippet:x}`
  must resolve to a snippet map entry."
- The hatch (§5.6 `define text`) is NOT the path: the gate-scope decision
  classifies these as grammar backlog, and hatches produce marker text inside
  one phrase — they cannot stage slot contributions or first-visit selection.

**The 9 failing assertions** (verified against zoo.story, 2026-07-12; 17 of
the excluded files' 26 pass already):

| File | Failing assertion | Producing feature |
|---|---|---|
| entrance-initial-description | look 1: contains "Your family piles out of the car" | `initialDescription` |
| room-snippets | arrival: contains "wobbles by the register" | ADR-209 cycling entry 1 |
| room-snippets | look 2: contains "picked half bare" | ADR-209 cycling entry 2 |
| room-snippets | look 4: contains "wobbles by the register" (wrap) | ADR-209 cycle wrap |
| wt-02-slot-occupants | Main Path: "Sam the zookeeper is here, jingling a ring of keys." | S1 `{slot:here}` |
| wt-02-slot-occupants | Petting Zoo: "Three pygmy goats mill about hopefully" AND "Holland Lop rabbits lounges near the hay bale" (one command, two asserts) | S1, N contributions |
| wt-02-slot-occupants | Aviary: "A scarlet macaw watches you with one bright, knowing eye." | S1 |
| wt-03-slot-detail | radio on: "It hums softly." | S2 `detailWhenOn` |
| wt-03-slot-detail | flashlight on: "It clicks faintly as it powers up." AND "A thin beam plays across the floor." | S2, two traits contribute |

## 2. Motivating cases

Exactly the four frozen files above — no invented cases. Each maps to one
surface: entrance → Z1; room-snippets → Z2; wt-02 → Z3a; wt-03 → Z3b.
Dungeo conversion will also want all three (initial-visit flavor, quiet
scenery mentions per the dungeo-81 audit that produced ADR-209, occupant
lines) but this package is sized to the zoo gate only.

## 3. Ratchet-entry drafts (for David's approval)

### Z1 — `first time` prose block inside `create` blocks
The `first time` ordinal (already canonical inside rule bodies, kept by D5)
gains a description-scope host: inside a `create` block, a `first time` block
whose body is bare prose is the first-visit description. The following bare
paragraph(s) remain the standard description. Compiles to
`RoomTrait.initialDescription` — first-VISIT semantics, exactly the platform's
(the transcript's second `look` shows the standard text).

```
create the Zoo Entrance
  a room
  aka entrance, gates, gate
  south to the Main Path

  first time
    Your family piles out of the car, buzzing with excitement — a whole day
    at the zoo! You straighten the strap of your backpack and take it all
    in. You stand before the wrought-iron gates of the Willowbrook Family
    Zoo. …

  You stand before the wrought-iron gates of the Willowbrook Family Zoo. …
```

Rationale: reuses the existing ordinal concept at a new scope rather than
minting a keyword (`initially`, `first visit`); Given 7 holds because the
concept — "this text, the first time only" — is the same one `first time`
already names. Never-guess: `second time`/`third time` in create position are
load errors (the platform has no such field); `first time` prose on a
non-room is a load error until a platform surface exists.

### Z2 — `snippet <name> … end snippet` room-owned block + `{snippet:name}` marker
A block inside `create` room blocks. Header: `snippet <name>[ mentions
<entity>][, <strategy>]`. Body: prose entries separated by `or` (the
`define phrase` variant separator); the keyword `nothing` is the explicit
empty entry (a blank entry is never guessed). Default strategy `cycling`
(ADR-209 question 3 parity). The room's description prose may then carry
`{snippet:name}`; §5.3 gate 5 (marker must resolve) goes live. Compiles to
`RoomTrait.snippets` — counters, save persistence, and the `mentions`
presence gate all ride the shipped ADR-209 machinery.

```
create the Gift Shop
  a room

  A small zoo gift shop crammed with stuffed animals and
  postcards{snippet:pins}. A large souvenir penny press machine stands near
  the door. …

  snippet pins mentions the enamel pins
    , and a spinning rack of enamel pins wobbles by the register
  or
    , and the enamel-pin rack stands picked half bare
  or
    nothing
  end snippet
```

Rationale: a snippet is not a phrase — it is a mid-sentence fragment bound to
a marker, with a presence gate; giving it its own block keeps `define phrase`
untouched. Whitespace: entries keep their leading comma/space verbatim (the
splice is mechanical; ADR-209). Never-guess: marker with no block = load
error (`analysis.unbound-snippet`); block whose marker appears in no
description = warning (ADR-209 question 4 parity); `mentions` naming an
undeclared entity = load error.

### Z3a — `presence` reserved channel phrase (S1 occupant lines)
`phrase presence:` on an entity — the form zoo.story already writes — flips
from dormant to live: it feeds the room description's `{slot:here}` whenever
the owner is in the described room. Bare content, one contribution per owner;
the slot owns all joining (ADR-195). Contribution order = declaration order
(the each-package enumeration precedent; matches the TS story's fixed 0–3
order). Compiles to one loader-registered slot contributor.

```
create the zookeeper
  a person
  in the Main Path

  phrase presence:
    Sam the zookeeper is here, jingling a ring of keys.
```

Rationale: zero new syntax for the zoo — four already-written blocks light
up. `presence` joins `br`/`match` as a reserved name (`analysis.reserved-name`
class): a phrase key `presence` means this channel, nothing else; emitting it
via `phrase presence` in a body is a load error (channel phrases are pulled
by the platform, never pushed).

### Z3b — `detail` reserved channel phrase with a `while` gate (S2 examine detail)
`phrase detail while <condition>:` on an entity — each gated block
contributes its text to the examine `{slot:detail}` while the condition
holds (with `it` = the owner). Multiple `detail` blocks on one owner are
legal (the one place a key repeats — each is an independent contribution;
declaration order). Conditions come from the existing kit; the zoo needs
only D1 state adjectives (`on`, `lit`).

```
create the flashlight
  light-source, switchable
  in the Supply Room

  A heavy-duty yellow flashlight.

  phrase detail while it is on:
    It clicks faintly as it powers up.
  phrase detail while it is lit:
    A thin beam plays across the floor.
```

Rationale: the TS story authors this as trait config (`detailWhenOn`,
`detailWhenLit`), but Chord composing text into `with` settings would put
prose on a composition line (no prose-block form). A gated channel phrase
keeps text in phrase position and generalizes past the two shipped trait
hooks. Implementation: for `while it is on`/`while it is lit` the loader may
compile straight to `detailWhenOn`/`detailWhenLit`; arbitrary conditions need
the loader to register per-entity state-clause providers (world-model
registry hook exists) — see §7.5. `phrase detail` with no `while` is a load
error (unconditional detail belongs in the description).

### 3.5 Pipeline + compile-to contracts
- Lexer: no new tokens (`snippet`, `nothing`, `mentions`, `presence`,
  `detail`, `first time` are words). Parser: Z1 create-scope ordinal block;
  Z2 block form; Z3 phrase-header extensions (`while` gate on inline owner
  phrases). Analyzer: the never-guess gates above + §5.3 gate 5.
- IR: room gains `initialDescription` and `snippets` (wire-type — ide-protocol
  must build clean); entities gain `presence`/`detail` channel entries.
- Loader: sets the two RoomTrait fields; registers ONE slot contributor for
  `here` (presence phrases of entities in the player's room, declaration
  order); wires detail per §7.5. **Platform-touch forecast: chord +
  story-loader only** — every runtime mechanism already ships.

## 4. Interactions (checked against shipped semantics)

- **Given 9 / ownership (D1–D13)**: all three surfaces are owner-attached —
  the room owns its first-visit text and snippets; each occupant owns its
  presence line; the examined object owns its detail. No floating forms.
- **Decision 10 / D11 narration**: presence and detail are pulled at render
  for the player's own room/examine — witnessed by construction; nothing here
  consumes `, once` or rolls RNG off stage. Snippet counters advance only on
  render (ADR-209 rule 8), same witnessed property.
- **§2.6 phrases**: snippet entries and channel phrases are prose blocks (the
  only phrase-text form); `or` and the strategy adverbs are reused verbatim;
  `cycling` maps to the same Choice machinery, keyed `(roomId, marker)` for
  snippets per ADR-209 — save/restore already proven (the excluded wt files
  pin post-restore behavior empirically).
- **D1 state adjectives**: Z3b's zoo gates are exactly `on`/`lit` from the
  D1 catalog — no new predicates.
- **Reserved names**: `presence`/`detail` extend the `br`/`match` reservation
  class; `nothing` is reserved only inside snippet bodies.
- **each package (E1–E3)**: no overlap — channels contribute per-owner; no
  quantifier or iteration is involved.

## 5. Verification

- **The acceptance test is the gate**: the four frozen files rejoin, byte
  unedited, and pass against the migrated zoo.story. Migration edits touch
  zoo.story only (entrance `first time` block; `{snippet:pins}` + snippet
  block on the Gift Shop; radio/flashlight detail phrases; the four presence
  phrases need no edit).
- Analyzer gate fixtures with exact-code tests per never-guess rule (§3).
- Loader tests: initialDescription field set; snippets map shape incl.
  `nothing` → `''` and `mentions` id resolution; presence contributor order;
  detail 0/1/N.
- Existing gates untouched: Zoo 5 atomic files + chained wt (37 asserts) and
  Cloak 81/81 stay green through the rebuilt bundle (cloak declares none of
  these forms — its own no-regression proof).

## 6. Acceptance criteria (done when)

1. Ratchet log carries Z1, Z2, Z3a, Z3b as Approved with the §7 answers.
2. zoo.story migrated; the four excluded files pass unedited against it and
   are moved back into the gate per §7.6's decided mechanics.
3. Analyzer gates land with fixtures + exact-code tests; §5.3 gate 5 live.
4. ide-protocol builds clean against the IR additions; chord-grammar doc and
   design.md examples re-cut.
5. All suites green; existing Zoo gate + Cloak 81/81 untouched.

## 7. Checkpoints requiring David's decision

1. **Z1 spelling**: reuse `first time` at create scope (proposed), or a
   distinct keyword (`initially` / `first visit`)? Reuse is Given-7-clean but
   overloads an ordinal whose rule-body meaning is per-clause, not per-visit.
2. **Z2 form**: dedicated `snippet` block (proposed) vs reusing owner-scoped
   `phrase <name>, cycling` + marker binding (fewer forms, but then
   `mentions` and the empty entry need homes on `phrase`, leaking channel
   concerns into the general phrase form). Also: is `nothing` the right
   empty-entry spelling?
3. **Z2 mentions**: keep ADR-209's `mentions <entity>` keyword (proposed,
   platform parity) vs expressing the gate through the condition kit
   (`while the enamel pins is in it`) — more uniform, more verbose, and a
   second way to say presence.
4. **Z3 channel-phrase class**: confirm reserved phrase keys (`presence`,
   `detail`) as the mechanism — this creates a small closed catalog of
   platform-pulled keys. Alternative: dedicated statement-less lines
   (`presence: …` without the `phrase` keyword). And: should `presence`
   support strategy adverbs (varied presence lines) now or later?
5. **Z3b generality**: gate conditions limited to D1 state adjectives on the
   owner for this package (compiling to `detailWhenOn`/`detailWhenLit`), or
   the full condition kit from day one (needs loader-registered state-clause
   providers — more machinery, zero zoo need today)?
6. **Gate mechanics**: the two excluded wt files predate the chained-run
   rework — do they rejoin as standalone probes beside the atomic tests
   (proposed; they were authored unchained), or get absorbed into the chain
   like old wt-01/04/05 were (which would mean editing frozen files —
   against the freeze)?
7. **Sequencing**: one package landing all three surfaces (proposed — the
   gate re-entry is all-or-nothing per file anyway), or split (Z3a is the
   cheapest win; Z2 the largest grammar addition)?

## Owner answers (David, 2026-07-12 — recorded verbatim intent)

- **Z1 APPROVED** as proposed (`first time` prose in create blocks).
- **Z2 REDIRECTED**: no dedicated `snippet` block — "the phrase evaluator
  should handle commas": snippets are ORDINARY PHRASES using the existing
  comma-strategy kit (`define phrase shop-bustle, cycling … or … end
  phrase`) referenced from description prose via the normal `{<key>}`
  marker (checkMarkers already resolves phrase keys). Open sub-question
  for the ratchet draft: where the ADR-209 `mentions <entity>` presence
  gate lives once snippets are plain phrases (phrase-level `when`? a
  marker-site gate?) — draft options, David decides.
- **Z3a REDIRECTED/EXPANDED**: not a single `presence` key — the author
  writes ALL the lifecycle versions of an occupant's narration: e.g.
  `entered`, `present`, `exited`, `disappeared` — a reserved key FAMILY
  covering arrival/presence/departure/vanishing. Draft must propose the
  exact key names, which are optional, and what each feeds
  ({slot:here} for present; movement narration for entered/exited).
- **Z3b APPROVED** as proposed (`phrase detail while <condition>:`).
- **§3.5 APPROVED** (pipeline/IR contracts section as drafted).

Next step: P1-style ratchet-entry drafts honoring these answers
(new session; this session closed at context limit).
