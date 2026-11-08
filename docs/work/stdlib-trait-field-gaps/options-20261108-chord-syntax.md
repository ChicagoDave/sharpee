# #664 Phase 1 — platform homes and Chord syntax options, for David's rulings

**Date**: 2026-11-08 (session f7e980, main)
**Plan**: `plan-20261108-trait-field-gaps.md`, Phase 1
**Status**: RULED — David, 2026-11-08, "proceed": every row below is ruled as recommended, and
R1a (the `placement` pair, validated by the proof of concept) is ruled as built. The proof of
concept is committed with Phase 1 as the start of the wearable work rather than reverted.

The ruling that frames everything here (David, 2026-11-08): *a Chord story is not the floor; the
floor is "is it an IF standard action?" If it is, we fix the gaps, create a test Chord story, and
close the issue.* Every row of #664 is a standard action, so no row is deleted. This document asks
only *how* each gap is closed and *what word Chord gets*, where it needs one.

Every claim about current code cites a file and line read this session at `0ed88def2`.

---

## Rulings

| # | Question | Recommendation | David's ruling (2026-11-08) |
| --- | --- | --- | --- |
| R1a | Row 6 — platform shape: one class with a required `placement` pair, or two trait classes | The pair, as the proof of concept built it | The pair |
| R1 | Row 6 — Chord word for a wearable's body part | A: `wearable on the <part>` (keyless setting, free word) | A |
| R2 | Row 6 — Chord word for layering | A-iii: none this round; layering stays TypeScript-only, noted for the 5.0 senses round or its own row | A-iii |
| R3 | Row 7 — build the auto-open and auto-close behaviors (they are half-built: flag read, no mutation) | Yes, both, as OpenableBehavior calls in execute | Yes, both |
| R4 | Row 7 — Chord word | C: lines `opens when unlocked` and `closes when switched off` | C |
| R5 | Row 8 — platform home for scent and sound strength | A: two new traits, `ScentTrait` and `SoundingTrait`, the sound side typed by ADR-172's `VolumeTier` | A |
| R6 | Row 8 — Chord words now, or fold into the 5.0 senses row | Do the scope half and the two bare adjectives `smelly` and `loud` now; the per-sense prose lines stay 5.0 and land on the same traits | Now |
| R7 | Row 3 — Chord word for an unremovable wearable | None; the `on the player taking off → refuse` clause is the idiom | None |
| R8 | Row 4 — Chord words for NPC carrying capacity and gift preferences | None for either; capacity is "out" per the 2026-10-12 checklist, refusals are clauses | None |
| R9 | Row 5 — retire talking's pre-ADR-320 `conversation` property | Not in #664; file a separate issue | Separate issue — filed as #665 (2026-11-08) |
| R10 | ADR | One ADR after the rulings, covering R5/R6 (sensory traits) and the Chord words of R1/R4 | One ADR, before Phase 3 — ADR-392, PROPOSED, adr-review 13/13 READY; awaiting acceptance |

---

## What the survey found

**The three "new syntax" rows are not symmetric.** Row 6 has a working platform behavior behind an
unreachable guard. Row 7 has *no* behavior: both auto flags are read into a message parameter and
nothing ever opens or closes. Row 8 has a scope rule reading fields that have no home, beside a
shipped sound model (ADR-172, ADR-374 D6) that already types loudness.

**Two rows in the "realignment" group also have a Chord seam question** that the plan did not list:
row 3's `canRemove` is declared and read by nobody, and Chord has no word for it; row 4's capacity
and preferences are set by nobody in story-loader, and Chord's idiom for both is a clause.

**David already ruled the senses' Chord shape on 2026-10-12** (`docs/work/archive/chord-4-0/standard-if-checklist.md:44`,
`:58`, `:157`): listening, smelling, touching and tasting are deferred to 5.0 together, as "per-sense
prose lines on a thing (sound, smell, feel) lowered to the platform's sensory traits". Row 8's
decision has to sit inside that ruling, not beside it.

---

## Row 6 — a wearable's body part (wearing, taking off)

### Platform facts

- `wearable-shared.ts:53-66`: the body-part conflict fires only when **both** items have
  `layer === undefined`. `WearableTrait`'s constructor sets `this.layer = data.layer ?? 1`
  (`wearableTrait.ts:83`), so for any trait built the real way the guard is false. Two hats go on
  one head.
- `wearable-shared.ts:70-88` (wearing) and `:100-112` (removal) already implement layering: a
  lower-layer item cannot go on under, or come off from under, a higher-layer item on the same
  body part. That half works.
- `wearing.ts:128` maps a conflict to `'hands_full'` when `layer !== undefined`, else
  `'already_wearing'`. Since layer is never undefined, every conflict today would say *"You need
  to have your hands free to put that on"*. The message mapping is part of the fix.
- Chord: `trait-routes.ts:171` lowers `wearable` to `new WearableTrait({})`. No body part, no
  layer. `wears` is placement only (`parser.ts:2621`; `wiring.ts:130` sets `wornBy`).

### Platform fix (not a ruling; stated so the syntax options have a target)

Conflict when another worn item has the **same `bodyPart` and the same `layer`**; different layers
stack and the existing layering rules decide order. A thing with no `bodyPart` never conflicts
(today's behavior for every Chord wearable, preserved). The conflict message becomes a dedicated
id, e.g. `already_wearing_there`: *"You're already wearing {the worn} on your {part}."*
(`lang-en-us/src/actions/wearing.ts:15-23` has no such line today). `lang-en-us` text is David's
call at Phase 3 review.

### R1a — the platform shape, validated by proof of concept (2026-11-08, after the options above were written)

David asked whether the trait should split into a `SimpleWearableTrait` and a
`ComplexWearableTrait`, then asked for a proof of concept of the alternative: **one class, one
`TraitType` key, and a required pair**

```ts
export interface IWearablePlacement { bodyPart: string; layer: number }
// on WearableTrait:  placement?: IWearablePlacement   — absent = simple, present = placed
```

**Why not two classes.** `implementations.ts:99` maps one class per `TraitType` for restore, and
about twenty readers across stdlib, story-loader and branch-tester fetch `TraitType.WEARABLE`
for `worn`/`wornBy` only; two classes under one key means every reader handles both, or a second
key with a second registration everywhere, for a distinction only wearing and taking off use.

**What the POC found that the options above missed.** The constructor defaulted `bodyPart` to
`'torso'` as well as `layer` to `1` (`wearableTrait.ts:83, :91`, old). The "straightforward fix"
(same part and same layer conflicts) would therefore have made **every two plain Chord
wearables collide** — UPPS's satchel and space suit, Fernhill's overcoat and anything else. The
pair removes that: a wearable with no placement is simple and never conflicts, and a placed one
carries both halves or neither.

**POC on the working tree (uncommitted), 19 files**: `wearableTrait.ts` (pair replaces the two
fields, header rewritten), `wearableBehavior.ts` (reads `placement?.layer`), `wearable-shared.ts`
(`checkWearingConflicts` returns `{ item, kind: 'same-layer' | 'under-outer' }`;
`checkRemovalBlockers` on the pair; `hasRemovalRestrictions` reads `!canRemove` — row 3 fell out
for free), `wearing.ts` and `taking-off.ts` (sharedData from the pair), and the fixtures in
twelve test files. Two tests added: *two simple wearables never conflict*, *a placed wearable
ignores a simple one*. Results: world-model `tsc` exit 0, 106 files / 1690 tests passing;
stdlib source and test `tsc` exit 0, 150 files / 1917 tests passing; world-model test `tsc`
back at the #401 ledger's 215 errors, none wearable-related.

**Left as found, for Phase 3:** the `slot` / `blocksSlots` / `wearableOver` vocabulary on the
same trait is read by no action (`WearableBehavior` carries only TODOs against it,
`wearableBehavior.ts:45-46, :91`); it is a second, dead placement model beside the pair. And
`'hands_full'` is still the id for the under-outer refusal; a true message is a lang-en-us line.

**Ruling asked:** keep the pair (the POC as built), or go to two trait classes.

### R1 — Chord word for the body part

**Option A — keyless setting with a preposition, like `attached to` and `powered by`.**
Precedent: `chord.ebnf:1444-1460` already gives `attached to ARTICLE name` and
`powered by ARTICLE name` as composition alternatives; `catalog.ts:62,65`. The value is a bare
word (a body part), not an entity name, which is the one difference from those two.

```chord
## trait-field-test.story — unshipped: `wearable on the <part>`
create the straw hat
  a thing, wearable on the head
  in the Hall
  aka hat

  A wide straw hat.

create the felt cap
  a thing, wearable on the head
  in the Hall
  aka cap

  A soft felt cap.

create the wool scarf
  a thing, wearable on the neck
  in the Hall
  aka scarf

  A long wool scarf.
```

Play: `wear hat` → *You put on the straw hat.* `wear cap` → *You're already wearing the straw
hat on your head.* `wear scarf` → *You put on the wool scarf.*

Free word or closed set? `WearableTrait.bodyPart` is a string the platform only compares for
equality (`wearable-shared.ts:60`, `:83`). A closed list would be English anatomy baked into the
grammar for no platform reason. **Recommend a free word**, with the analyzer refusing an article
or a second word after `on` (`wearable on the left hand` is two words — if David wants multi-word
parts, the setting takes `WORD { WORD }` as `setting` already does, `chord.ebnf:1523`).

**Option B — its own line, `worn on the head`.**
Reads as IF prose, like `servings 2` and `holds 3` are lines. But `worn` is a platform state word
(`catalog.ts:115`, pair `worn`/`unworn`) and `wears` is a placement verb; a third `worn …` form on
the entity block is a parse ambiguity the analyzer would have to disambiguate by the next word.

```chord
## unshipped and NOT recommended
create the straw hat
  a thing, wearable
  worn on the head
  in the Hall
```

**Option C — one adjective per part: `headwear`, `footwear`, `handwear`.**
Fits the closed `TRAIT_ADJECTIVES` catalog shape exactly, but the vocabulary is open-ended
(neckwear? eyewear?) and each new part is a grammar change under `chord-grammar-changes.md`.

```chord
## unshipped and NOT recommended
create the straw hat
  a thing, wearable, headwear
  in the Hall
```

**Recommendation: A.** It is the existing keyless-setting shape, the lowering is one route in
`trait-routes.ts` setting `bodyPart`, and the word list stays the author's.

### R2 — Chord word for layering

The platform layer is a number, default 1. Three options, in increasing cost:

- **A-iii — none this round.** Every Chord wearable is layer 1; two things on the same part
  conflict; a coat over a shirt (both `on the torso`) would conflict too, which is wrong for that
  pair but is also exactly today's behavior for every Chord wearable (no part, no conflict) only
  once an author adds parts. Layering stays a TypeScript-story knob until it has a Chord word.
- **A-i — a numeric line, `layer 2`.** Precedent `servings 2`, `holds 3`. Numbers in a story file
  for an ordering is the thing Chord has avoided elsewhere.
- **A-ii — relative, `wearable on the torso over the shirt`.** The loader derives the coat's
  layer as the shirt's plus one through `resolveEntityRef` (forward references legal, as
  `lockable with` does, `trait-routes.ts:192-196`). Prose-like and number-free, but it is a
  derivation with cycles to refuse, and it is the first Chord setting whose value depends on
  another entity's trait data.

```chord
## unshipped — A-ii, shown only so the shape is visible
create the linen shirt
  a thing, wearable on the torso
  in the Hall

create the long coat
  a thing, wearable on the torso over the linen shirt
  in the Hall
```

**Recommendation: A-iii now.** The conflict path is the unreachable one #664 names; layering
already works in the platform, has a stdlib golden test, and no Chord story has asked for it.
Record A-ii as the shape to take when one does.

---

## Row 7 — auto-open on unlock, auto-close on switch off (unlocking, switching off)

### Platform facts — the behavior does not exist yet

- `unlocking.ts:230-235` reads `autoOpenOnUnlock` through a cast and sets
  `sharedData.willAutoOpen = true`; `:255-257` copies it into the message params. **No
  `OpenableBehavior` call and no `isOpen` write anywhere in `unlocking.ts`** (grep, this session).
  `lang-en-us/src/actions/unlocking.ts:15-26` has no message that renders `willAutoOpen`; the
  player would read *"You unlock the door."* and the door stays shut.
- `switching_off.ts:199-205` reads `autoCloseOnOff` on a thing that is both a container and
  openable and sets `willClose`; `determineSwitchingMessage` turns it into `'door_closes'`,
  which `lang-en-us/src/actions/switching-off.ts:34` renders as *"{The target} switches off and
  closes."* **Nothing closes it.** The message would lie.
- `UnlockedEventData.willAutoOpen` is declared (`unlocking-events.ts:44`), so the event half of
  the unlock side is typed already.
- Neither field exists on `IOpenableData` or `OpenableTrait` (`openableTrait.ts:9-72`).

So "fix the gap" for this row is: declare the two fields (optional, default false, ADR-346 D1),
**and in execute call `OpenableBehavior.open` / `.close`** so the state changes, then report
`unlocked_and_opened` (new message) and `door_closes` (existing) truthfully. The opened or closed
event should also be emitted so a Chord `after the player opening` clause on the door still fires
when the unlock opened it. Whether that counts as the player "opening" is an ADR-level question;
the honest default is to emit `if.event.opened` with the same actor, since that is what happened.

### R3 — build both behaviors

Recommend yes. Both are IF-standard conveniences (Inform's "unlock" does not auto-open, but many
games add it in one line; a cabinet whose door shuts when its light goes off is the switching
case). The alternative, declaring the fields and leaving the branches as message-only, ships a
message that describes a mutation that did not happen, which is the dropping-bug class the
core-concepts README names.

### R4 — Chord word

**Option A — hyphenated adjectives, `self-opening` and `self-closing`.**
Shape precedent: `open-inventory`, `night-vision`, `light-source` (`catalog.ts:35-67`). Each is a
bare word in the closed catalog, one route each in `trait-routes.ts`. The analyzer gates
`self-opening` to a thing that is `lockable` and `self-closing` to one that is `switchable` and
openable, the way `powered` is gated to a switchable container (`catalog.ts:65`).

```chord
## unshipped — A
create the cellar door
  a door, lockable with the iron key, self-opening
  aka grey door

  A heavy grey door. Its latch springs when the lock turns.

create the display case
  a container, openable, switchable, self-closing
  in the Hall
  aka case

  A lit glass case. Its lid drops shut when the light goes out.
```

**Option C — declarative lines, `opens when unlocked` and `closes when switched off`.**
Shape precedent: the entity block already takes prose-shaped lines beside adjectives — `holds 3`,
`servings 2`, `<dir> is blocked while <cond>`, `passage <words> to <room>`
(`chord.ebnf:637`, `:1522`, `:2964`). Each line is one parse rule, one IR flag, one loader route.
The analyzer refuses `opens when unlocked` on a thing that is not lockable, and `closes when
switched off` on one that is not switchable and openable, with the same two diagnostics A needs.

```chord
## unshipped — C (recommended)
create the cellar door
  a door, lockable with the iron key
  opens when unlocked
  aka grey door

  A heavy grey door. Its latch springs when the lock turns.

create the display case
  a container, openable, switchable
  closes when switched off
  in the Hall
  aka case

  A lit glass case. Its lid drops shut when the light goes out.
```

Play: `unlock door with key` → *You unlock the cellar door and it swings open.* `turn off case`
→ *The display case switches off and closes.*

**Option D — no new word; the author writes the reaction clause.**
This is the idiom the 2026-10-12 checklist chose for many rows ("the reaction clause is the
idiom until then"). It needs a clause-body statement that opens a thing. The AST's acting
statements (`act`, `perform`, `give`, `drop`, `move-to`, `ast.ts:1159-1167`) are **goal steps**
for NPC goals (ADR-329 D10, `parser.ts:3702-3712`), not `on`-clause body statements; and `open`
is a platform state word read live and never stored (ratchet D1, `catalog.ts:87-90`), so
`change the door to open` is not available either. **D is not sayable today**, so choosing it
means a different, larger Chord change (acting statements in clause bodies). Not recommended for
this row.

**Recommendation: C.** It says what happens, in the words a player would use, and it keeps the
adjective catalog for *what a thing is* while lines say *what it does*. A is equally cheap and
David may prefer the one-token form; both lower to the same two fields.

### World Index (ADR-321) check, folding the plan-review tension

`packages/world-index/src/reach.ts:6-9` models two obstacles: a locked door (opened when its key
is reached) and a blocked exit. A closed-but-unlocked door is not an obstacle. Neither
`autoOpenOnUnlock` nor `autoCloseOnOff` changes `doorStartsLocked`
(`loader-semantics.ts:112`) or the edge set, so Reach is unchanged by either word. Phase 4 still
re-runs ADR-321 AC-6 because it adds loader semantics.

---

## Row 8 — scent and sound strength (smelling, listening, through scope)

### Platform facts

- `scope-resolver.ts:140-145` (`canHear`): a thing inside a closed container is audible only if
  `identity.customProperties.loud === true`. `:194-197` (`canSmell`): a thing inside a closed
  container is smellable only if `customProperties.verySmelly`. `:385-391` (`hasScent`):
  `smelly` or `verySmelly` gives scent; otherwise edibles and actors have scent.
- `IdentityTrait` declares no `customProperties` (`identityTrait.ts`, read in full). The reads are
  guarded by `'customProperties' in identity`, which is why they typecheck and never fire.
- **The platform already has a typed loudness.** ADR-172 / ADR-374 D6: `ISound.volumeTier` is
  `'whisper' | 'subdued' | 'normal' | 'raised' | 'shouting'` (`if-domain/src/sound/types.ts:44`),
  propagated over rooms and walls by `engine/src/sound/propagation.ts`, heard by
  `ListenerTrait` holders (a presence flag, `listenerTrait.ts:17-18`). `AcousticTrait` is a
  **wall** material tier, not a thing's sound (`acousticTrait.ts:4-10`). There is no scent model
  anywhere.
- Chord has `listener` (ADR-374 D6), `define sound` / `play sound` (media plus world sound), and no
  word for a thing's own smell or sound.
- David's 2026-10-12 disposition (`standard-if-checklist.md:44`): *"listening, smelling, touching —
  5.0: per-sense prose lines on a thing (sound, smell, feel) lowered to the platform's sensory
  traits; the reaction clause is the idiom until then."* Row 58: *"acoustic — a thing's sound,
  read by listening — 5.0, with section A's senses row."*

### R5 — the home

**Option A — two traits, `ScentTrait` and `SoundingTrait`, both in `world-model/src/traits/`.**

```ts
// unshipped shapes, for the ruling only
interface IScentData   { strength?: 'faint' | 'strong'; descriptionId?: string }
interface ISoundingData { tier?: VolumeTier; descriptionId?: string }   // VolumeTier from @sharpee/if-domain
```

`canSmell`'s closed-container rule reads `strength === 'strong'`; `hasScent` reads the trait's
presence, then falls back to edible/actor as today. `canHear`'s closed-container rule reads
`tier` at `'raised'` or above, which is the same scale a `play sound` carries, so a thing that
is *loud* and a sound that is *shouting* are measured on one ruler. The `descriptionId` field is
unused now and is exactly where the 5.0 per-sense prose line lands. This is the alignment answer
to the plan-review tension: no second notion of loudness.

**Option B — fields on `IdentityTrait`: `scent?: 'faint' | 'strong'`, `sound?: VolumeTier`.**
Smaller (no barrels, no dist rebuild), and IdentityTrait already carries physical attributes
(`weight`, `volume`, `size`, `identityTrait.ts:89-95`). But David's ruling says "sensory
traits", and the 5.0 prose lines would then need a second home for their description ids.

**Option C — defer the whole row to the 5.0 senses round.** Then Phase 3 removes the three
`customProperties` reads and the closed-container branches fall back to "no": a loud chime in a
closed box is silent and the cheese in a closed box cannot be smelled until 5.0. The two
scope-integration tests that pin those (`scope-integration.test.ts:231-239`, `:270-330`) would be
deleted or skipped, which is deletion of a reachable standard-action path, the thing the ruling
forbids.

**Recommendation: A.** It is the shape David already chose for 5.0, built one round early for
the strength half only.

**Found during Phase 2 (2026-11-08), an input to R5's ADR:** stdlib's scope layer already
carries two sensory scales of its own in the witness events (`packages/stdlib/src/scope/types.ts:263`,
`:276`): `WitnessSoundEvent.intensity: 'faint' | 'moderate' | 'loud'` and
`WitnessScentEvent.intensity: 'faint' | 'moderate' | 'strong'`, read by no scope module outside
the type file. So a sound strength has two platform scales already (ADR-172's five-tier
`VolumeTier` and the witness three-tier), and scent has one. The ADR should pick one ruler per
sense and name the other as derived or retired; `ScentTrait.strength` fitting the witness scent
scale (`'faint' | 'moderate' | 'strong'`) is the obvious alignment on the scent side.

### R6 — Chord words now

With A in place, the minimal Chord words are two bare adjectives in the closed catalog:

```chord
## unshipped — `smelly`, `loud`
create the ripe cheese
  a thing, edible, smelly
  in the tin box
  aka cheese

  A wedge of very ripe cheese.

create the tin box
  a container, openable, starts closed
  in the Hall
  aka box

  A dented tin box.

create the brass chime
  a thing, loud
  in the Barn
  aka chime

  A brass chime that rings whenever the wind moves.
```

Play, from the Hall with the box closed: `smell` → the cheese is listed (strong scent escapes);
`listen` → *You hear the brass chime from the barn* (listening already crosses connected rooms,
`scope-resolver.ts:156-164`).

Lowering: `smelly` → `new ScentTrait({ strength: 'strong' })`; `loud` → `new SoundingTrait({ tier:
'raised' })`. The two-level `smelly` / `verySmelly` distinction collapses to one word meaning
"strong"; the implicit faint scent of edibles and actors needs no word. The 5.0 round then adds
the prose lines (`smells of …`, `sounds like …`) writing `descriptionId` on the same traits, and
possibly `quiet` / `faint` as the lower tiers.

**Alternative:** hold the Chord words for 5.0 and ship only the platform half now. Then Phase 5's
test story cannot author the cheese or the chime, and those two rows are pinned by stdlib tests
only — the plan's test story would cover six rows, not eight. That is a legitimate scope call;
the recommendation is to ship the two words because they are one catalog entry and one route
each, and the test story then covers the row end to end.

---

## Row 3 — an unremovable wearable (taking off)

### New finding

`wearable-shared.ts:201` reads `cursed`, declared by nobody. `WearableTrait.canRemove` is
declared with default `true` (`wearableTrait.ts:38`, `:90`) and **read by nobody**:
`WearableBehavior.canRemove(item, actor)` (`wearableBehavior.ts:54-66`) checks only `worn` and
`wornBy`, and `taking-off.ts:100-121` calls that, then `hasRemovalRestrictions`. The realignment
is one line — `hasRemovalRestrictions` returns `!wearableTrait.canRemove` — and `'cant_remove'`
(*"You can't take off {the item}."*, `lang-en-us/src/actions/taking-off.ts:19`) is already there.

### R7 — Chord word

Chord has no word for `canRemove: false`. The idiom in the corpus for "this cannot leave you" is a
refusing clause (UPPS satchel, `upps.story:112-114`: `on the player giving → refuse
satchel-is-yours`), and the same clause on `taking off` gives the author their own line instead
of the platform's generic one:

```chord
## shipped syntax — no new word needed
create the iron ring
  a thing, wearable
  in the Hall
  aka ring

  A plain iron ring, cold to the touch.

  on the player taking off
    refuse ring-holds
  end on

define phrase ring-holds
  The ring will not come off.
end phrase
```

**Recommendation: no new word.** The platform knob stays for TypeScript stories and the stdlib
golden test; the Chord seam is the clause, already sayable. Phase 5's test story uses the clause.

---

## Row 4 — NPC carrying capacity and gift preferences (giving)

### Facts

- `giving.ts:192-194` reads `ActorTrait.capacity` and falls back to an undeclared
  `inventoryLimit`. **Story-loader never sets `ActorTrait.capacity`**: a person gets
  `new ActorTrait({ isPlayable })` (`entity.ts:124`) and a *playable* person gets a
  `ContainerTrait` with `capacity: { maxItems: 10 }` (`entity.ts:130-134`) — a different trait,
  which giving does not read. `holds <n>` is parsed for containers, supporters and vehicles only
  (`entity.ts:118`, `:157`, `:175`). So no Chord NPC ever refuses a gift as `inventory_full` or
  `too_heavy`.
- David's 2026-10-12 ruling, checklist row 118 (player's holdall): *"Sharpee imposes no inventory
  limit, so there is nothing to soften."*
- `giving.ts:227-233`, `:274-296`: `customProperties.preferences` with `refuses`, `likes`,
  `dislikes` substring lists. **Set by nobody** in story-loader, character, or any story's
  `src/`; only `giving-golden.test.ts` builds it. Chord's giving refusal is a clause
  (`upps.story:112`, `fernhill.story:692`, `black-gate.chord:1680`, `ball.chord:510`), and
  giving/showing are "sayable today" (checklist row 35).

### R8 — Chord words

**Recommendation: none for either.** Capacity: consistent with row 118, Chord gets no carrying
limit word; Phase 2 drops the `inventoryLimit` fallback and the `capacity` check stays a
TypeScript-story knob. Preferences: the clause is the idiom; the `preferences` knob stays for
TypeScript stories and the golden test. Phase 5's test story refuses a gift with a clause:

```chord
## shipped syntax
create Mira
  a person
  starts in the Barn

  A quiet farmhand.

  on the player giving the ripe cheese
    refuse mira-no-cheese
  end on

define phrase mira-no-cheese
  Mira wrinkles her nose and shakes her head.
end phrase
```

If David wants a declarative word instead (`refuses the cheese`, `likes the apple`), it is the
keyless-setting shape of R1 on a person; the recommendation is not to, because the clause already
gives the author the line.

---

## Row 5 — talking's `conversation` property

### Facts

`talking.ts:177` and `:223` read `customProperties.conversation` (personality `formal` /
`casual`, `relationship`, `remembersPlayer`, `hasGreeted`, `topics`, `isAvailable`), then fall
back to an undeclared bare `conversation`. **Set by nobody** outside `talking-golden.test.ts`
and `dialogue-attribution-realpath`. The same function already consults ADR-320's constructs —
`exchangeGrips`, `threadGrips`, the topic table's lifecycle (`talking.ts:187-200`) — which is
Chord's path (checklist row 36, "sayable today"). The `conversation` property is a pre-ADR-320
TypeScript-story surface; no Chord story can reach `formal_greeting`, `casual_greeting`,
`friendly_greeting` or `remembers_you`.

### R9

Phase 2 drops only the undeclared fallback, as planned. Whether the whole `conversation` property
and its five greeting messages retire in favour of ADR-320 is a separate ruling; recommend filing
it as its own issue rather than widening #664.

---

## Row 1 — a note for Phase 2

`switching-shared.ts:38-39` derives `lightRadius` from an undeclared `radius` falling back to
`brightness`, and `lightIntensity` from an undeclared `intensity` falling back to `'normal'`. Both
flow into `SwitchedOnEventData` (`switching_on-events.ts:21-24`, `switching_on.ts:284-285`) and
are read by nothing else in `packages/stdlib/src`. Phase 2 reads `brightness` for the radius and
drops `lightIntensity` from the analysis and the event data, since it has no source. That is a
small event-contract change on `if.event.switched_on`; no Chord construct or lang-en-us message
reads the field.

---

## The #650 tension, resolved for Phase 5

`touching.ts:176-188` has two liquid paths: a drinkable thing touched directly (`:196-198`,
`texture: 'liquid'`) and liquid inside a container (`:181`, message `liquid_container`). Chord
authors the first with `drinkable` (`trait-routes.ts:214-218`) and cannot author the second while
#650 is open. Phase 5's story touches a drinkable thing directly; the container path stays
pinned by `touching-golden.test.ts` and #650.

---

## ADR-worthiness (R10)

Rows 6 and 7 add Chord grammar, which already requires an entry in
`docs/architecture/chord-grammar-changes.md`. Row 8 adds two traits that the 5.0 senses round
builds on and ties a thing's loudness to ADR-172's `VolumeTier`, which constrains both ADR-172's
and ADR-374 D6's future. Together that is one ADR: *sensory traits and the trait words of #664*.
Recommend writing it after the rulings, before Phase 3. ADR-346 D1 (optional fields, no
constructor policing) and ADR-374 D9 (adjective and state pairing tables extended, not special-
cased) are the parents.

---

## What Phase 5 can author under the recommendations

| Row | Scenario in the test story | Chord needed |
| --- | --- | --- |
| 1 | switch a lamp on and off; message by brightness | shipped (`light-source, switchable`) |
| 2 | touch the cordial | shipped (`drinkable`) |
| 3 | iron ring refuses taking off | shipped (clause) |
| 4 | Mira refuses the cheese | shipped (clause) |
| 5 | talk to Mira with and without a topic table | shipped (ADR-320) |
| 6 | second hat refused, scarf accepted | R1: `wearable on the head` |
| 7 | unlock opens the cellar door; switching the case off closes it | R4: two lines |
| 8 | smell the boxed cheese; hear the barn chime | R6: `smelly`, `loud` |
