## 5. Wearing

Putting clothes on and taking them off. One trait — `wearable` — powers the
whole family, and this family's grammar is complete: every verb the help
lists actually parses.

### 5.1 wearing and taking_off

**wear** (`if.action.wearing`) — verbs `wear X`, `don X`, `equip X`,
`put on X` (the phrasal form outranks generic `put`). Needs the `wearable`
trait (`not_wearable` otherwise). You don't have to be holding it — wearing
performs an implicit take first, refusing with the take's own refusal if
that fails. The conflict rules key on the trait's body part and layer: you
cannot put a garment on *under* something already worn over it — but
because every wearable defaults to the same layer, default-built garments
never conflict and simply stack (the §5.2 quirk). Already wearing it →
`already_wearing`. Success sets the worn state and says `worn`; event
`if.event.worn` carries `bodyPart` and `layer` in the payload.

**take off** (`if.action.taking_off`) — verbs `take off X`, `take X off`,
`remove X`, `doff X`, `unequip X`. (Yes — bare `remove X` means undressing,
which is why take-from-container needed its own action, §2.3.) Refuses when
the thing is not worn by you (`not_wearing`), when a higher layer is worn
over it (`prevents_removal`), and when the garment is cursed
(`cant_remove`) — all validate-phase since ADR-229, so a refused removal
never half-happens. Success clears the worn state (`removed`); the item
stays in inventory.

A `wears` line on an actor starts the story dressed (load error unless the
item is `wearable`), and `worn`/`unworn` are live state predicates —
`while the cloak is worn` is story logic.

The author writes:

<!-- fixture: wearing/wearing-taking-off.story -->
```story
create the Vestry
  a room

  Robes and vestments hang from a row of pegs.

create the woolen tunic
  aka tunic
  wearable

  A plain tunic, scratchy but warm.

create the brocade vest
  aka vest
  wearable
  in the Vestry

  A stiff vest sewn with gold thread.

create the iron torc
  aka torc
  wearable
  in the Vestry

  A ring of black iron, hinged like a shackle.

  on taking_off it
    refuse torc-stuck
  end on

  phrase torc-stuck:
    The torc's hinge has seized; it will not open.

create the player
  starts in the Vestry
  wears the woolen tunic
```

The player sees:

<!-- transcript: wearing/wearing-taking-off.story -->
```transcript
> wear the vest
(first taking the brocade vest)

Taken.

You put on the brocade vest.

> take off the tunic
You take off the woolen tunic.

> wear the torc
(first taking the iron torc)

Taken.

You put on the iron torc.

> take off the torc
The torc's hinge has seized; it will not open.
```

Three seams in one scene: `wears` starts the player dressed in the tunic,
the default layers let the vest stack straight over it and the tunic slide
out from underneath (the §5.2 quirk, live), and the torc's `on taking_off
it` guard is a cursed garment in one clause.

| | wear (`if.action.wearing.*`) | take off (`if.action.taking_off.*`) |
|---|---|---|
| Refusals | `no_target` · `not_wearable` · `not_held` · `already_wearing` · `cant_wear_that` · `hands_full` (worn under a higher layer) | `no_target` · `not_wearing` · `prevents_removal` (higher layer on top) · `cant_remove` (cursed) |
| Success | `worn` | `removed` (the item stays in inventory) |
| Events | `if.event.worn` / `if.event.wear_blocked` | `if.event.removed` / `if.event.take_off_blocked` |

Interceptors: `on wearing it` / `on taking_off it` on the garment — a cloak
that reacts to being donned is one clause on the cloak.

### 5.2 Wearing traits

**wearable** (`wearable` — adjective). The one live trait here. Fields
stdlib actually reads: the worn state (`worn`, `wornBy`), `bodyPart`
(default `torso`) and `layer` (default 1) for the conflict rules, plus the
undeclared `cursed` property the removal check probes. The layer-default
quirk: because `layer` defaults to 1, the "same body part, no layers"
conflict branch is unreachable, and garments built with the defaults never
conflict at all — that is why the vest in §5.1 goes on over the worn tunic
and the tunic comes off from underneath it. Set explicit layers (TypeScript
today) and the layering rules engage: `hands_full` on wear,
`prevents_removal` on removal. Several declared fields are dormant (`slot`,
`blocksSlots`, `wearableOver`, `canRemove`, `weight`, `bulk`, the message
overrides) — don't build on them yet.

**clothing** (trait — dormant, and a gotcha). Duplicates the wearable
fields and adds material/style/condition, but **no action reads it** — and
because it is a *different* trait type, an item composed with only
`clothing` fails wearing's `wearable` check and cannot be put on. Use
`wearable` and keep fabric flavor in descriptions.

**equipped** (trait — combat-adjacent). Equipment slots and stat modifiers;
the wearing actions ignore it — `equip` the verb is just a synonym for wear
— and its one live consumer is combat's weapon selection (§8.2).
TypeScript-only.

**open-inventory** (trait — a scope marker, no fields). Composed onto an
NPC, it makes what they carry *reachable*, not just visible — the
difference between admiring the guard's key ring and being able to take it
(§2.1) or use it in a lock (§4.2). TypeScript-only today.
