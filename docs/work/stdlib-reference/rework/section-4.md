## 4. Containers & openables

Getting things open, and locked. The traits here — `openable`, `lockable` —
compose freely onto containers, doors, and plain things, and the four
actions read them uniformly.

### 4.1 opening and closing

**open** (`if.action.opening`) — verbs `open`, `open up`, `unwrap`,
`uncover` (synonym forms: ADR-230 D4). Only an `openable` opens — anything
else refuses `not_openable` — and lock state gates opening (`locked`);
unlocking is its own step (§4.2). `open X with Y` is still opening
(ADR-230 D3b, no separate action), the named tool a consulted command
entity; an openable can require a tool exactly as a lockable names a key —
`openable with the crowbar` in Chord, `toolId` in TypeScript — refusing
`no_tool` / `tool_not_held` / `wrong_tool`, while an openable with no
requirement ignores an offered tool. A non-empty container's contents are
announced by a separate, replaceable piece: the
`stdlib.chain.opened-revealed` chain handler reacts to `if.event.opened`
and emits `if.event.revealed`; a story that wants a different reveal — or
none — replaces that chain by its key rather than touching the action.

**close** (`if.action.closing`) — verbs `close`, `shut`, `cover`. Refuses
`not_closable`, `already_closed`, and `prevents_closing` — the last both
for one-way openables (`canClose: false`) and for an obstacle named in
`closeRequirements`. Lock state is not checked; closing never locks.

The author writes:

<!-- fixture: openables/opening-closing.story -->
```story
create the Galley
  a room

  A cramped ship's kitchen, all brass and old smoke.

create the anvil
  scenery
  in the Galley

  A blacksmith's anvil, out of place at sea.

create the biscuit tin
  aka tin
  a container, openable
  in the Galley

  A dented tin with a warped lid.

  on closing it
    refuse tin-warped
  end on

  phrase tin-warped:
    The lid is warped; it will not seat again.

create the sea chest
  aka chest
  a container, openable
  in the Galley

  A low sea chest, banded in iron.

create the tin whistle
  aka whistle
  in the sea chest

  A tin whistle on a loop of cord.

create the player
  starts in the Galley

define phrase if.action.closing.closed
  You swing it shut.
end phrase
```

The player sees:

<!-- transcript: openables/opening-closing.story -->
```transcript
> open the anvil
The anvil can't be opened.

> open the biscuit tin
You open the biscuit tin, which is empty.

> close the biscuit tin
The lid is warped; it will not seat again.

> open the sea chest
You open the sea chest.

Inside the sea chest you see tin whistle.

> close the sea chest
You swing it shut.
```

Three seams and the chain in one scene: the anvil refuses with the
platform's `not_openable`, the tin's `on closing it` guard speaks its own
refusal, the story-wide `define phrase` rewrites every plain close — and
the sea chest's contents line is `stdlib.chain.opened-revealed` at work.

| | open (`if.action.opening.*`) | close (`if.action.closing.*`) |
|---|---|---|
| Refusals | `no_target` · `not_openable` · `already_open` · `locked` · `no_tool` · `tool_not_held` · `wrong_tool` | `not_closable` · `already_closed` · `prevents_closing` |
| Success | `opened` · `its_empty` (a container opens onto nothing) | `closed` |
| Events | `if.event.opened`, then `if.event.revealed` via the chain | `if.event.closed` (rich payload: door/container flags, contents count) |

Interceptors: `on opening it` / `on closing it` on the target — the
humming hive box in chord-language.md §3.1 is exactly this seam — and
opening consults an explicitly named tool after the target (target →
tool, the same ordering discipline as lock-and-key, §4.2).

Gaps: the several-tools list `toolIds` is TypeScript today; the trait's
`autoLock` field exists but is inert — closing never locks (flagged, §4.3).

### 4.2 locking and unlocking

**lock** (`if.action.locking`) and **unlock** (`if.action.unlocking`) —
every form is core grammar since ADR-230 D2: `lock X`, `lock X with/using
Y`, keyless `unlock X`, `unlock X with/using Y`, plus the `secure` /
`unsecure` aliases (D4). Both operate on the `lockable` trait. A lock
either names its key — `lockable with the iron key` in Chord,
`keyId`/`keyIds` in TypeScript — or is keyless and turns freely, which
makes the keyless forms safe by construction: a keyed lock still asks
`no_key` when no key is named. The key rules, shared by both actions: a
named key you are not holding refuses `key_not_held`; the wrong key
refuses `wrong_key`. Locking additionally requires the thing be closed
first (`not_closed`), and both refuse the redundant case (`already_locked`
/ `already_unlocked`). One quirk worth knowing: on a *keyless* lock a
named object is neither required nor checked — `lock the box with the
herring` succeeds and even says `locked_with`.

The author writes:

<!-- fixture: openables/locking-unlocking.story -->
```story
create the Vestry
  a room

  Vestments on pegs, and a deep stone niche.

create the reliquary
  a container, openable, lockable with the bone key, starts locked
  in the Vestry

  A silver reliquary, older than the church around it.

create the knucklebone
  in the reliquary

  A saint's knucklebone, brown with age.

create the bone key
  aka key

  A key carved from a bird's hollow bone.

  on locking it
    refuse key-never-seals
  end on

  phrase key-never-seals:
    The bone key turns only one way; it opens, it never seals.

create the player
  starts in the Vestry
  carries the bone key
```

The player sees:

<!-- transcript: openables/locking-unlocking.story -->
```transcript
> open the reliquary
The reliquary is locked.

> unlock the reliquary
What do you want to unlock it with?

> unlock the reliquary with the bone key
You unlock the reliquary with the bone key.

> open the reliquary
You open the reliquary.

Inside the reliquary you see knucklebone.

> close the reliquary
You close the reliquary.

> lock the reliquary with the bone key
The bone key turns only one way; it opens, it never seals.
```

The keyless UNLOCK asks rather than fails, lock state gates opening until
the key turns, and the last command is ADR-229's ordering made visible:
each action consults the **target first, then the key** — the reliquary
has nothing to say, so the bone key's own `on locking it` clause vetoes
its use (and note the key contract resolved even though the bone key is
declared *after* the reliquary — forward references are legal).

| | lock (`if.action.locking.*`) | unlock (`if.action.unlocking.*`) |
|---|---|---|
| Refusals | `not_lockable` · `no_key` · `key_not_held` · `wrong_key` · `not_closed` · `already_locked` | `not_lockable` · `no_key` · `key_not_held` · `wrong_key` · `already_unlocked` |
| Success | `locked` · `locked_with` | `unlocked` · `unlocked_with` |
| Events | `if.event.locked` / `if.event.lock_blocked` | `if.event.unlocked` / `if.event.unlock_blocked` (key, sound, and container/door flags in the payload) |

Interceptors (ADR-229): target first, then the key, each side's clause
seeing the other's identity in its context — and only an *explicitly
named* key is consulted; a key the platform infers is not a command
entity.

Gaps: the several-keys list `keyIds` is TypeScript today.

### 4.3 Openable, lockable, and door

**openable** (`openable` — adjective). Two states, open and closed, owned
by the platform; `startsOpen` defaults to closed, and from Chord the
adjective composes closed with `starts open` on the composition line
seeding it open (ADR-231; chord-language.md §2.11). A required tool
composes too — `openable with the crowbar` (§4.1). The biscuit tin and
sea chest of §4.1 are this trait at work. The remaining settings —
`canClose: false` (one-way openable), `closeRequirements` (a named
obstacle), `openSound`/`closeSound` (ride along in events),
`open/closedDescription` (swap description text) — are TypeScript
territory today.

**lockable** (`lockable`, optionally `with the <key>` — adjective).
Locked/unlocked state — starts unlocked everywhere except on a door,
where a lockable door starts locked until the author says `starts
unlocked` (ADR-234's one kind-scoped default); Chord also seeds `starts
locked` on any composition line (ADR-231), as the reliquary of §4.2 does.
The key contract: `with the <key>` in Chord (`keyId` in TypeScript;
several keys via `keyIds`, TypeScript only), and a lock without keys is a
latch anyone can turn. `lockSound` / `unlockSound` decorate the events.
Two declared fields are inert today — `autoLock` (relock-on-close is
implemented but never invoked) and `acceptsMasterKey` (never read) —
don't build a puzzle on them; flagged.

**door** (`a door` — kind noun, since ADR-234). A door is an entity that
*is* the connection — but the connection is written on the room's exit
line, not the door's block: `down to the Cellar through the cellar door`.
The reverse exit is inferred (opposite direction, no far-room line
needed; a mirrored line is legal but must agree exactly), and the door
block itself is pure declaration — `a door` composes scenery and openable
automatically, starting closed (`starts open` overrides) and, when
lockable, locked (`starts unlocked` overrides). The loader wires
everything through the one platform path (`connectRooms` with a door id,
ADR-237), so going refuses `door_closed` / `door_locked` (§3.1) with no
story code at all, and the door answers from both of its rooms —
ADR-238's two-sided presence, without leaking the far room.

The author writes:

<!-- fixture: openables/cellar-door.story -->
```story
create the Landing
  a room
  down to the Cellar through the cellar door

  A stone landing at the top of a worn stair.

create the Cellar
  a room

  Casks and cobwebs, and a smell of wet earth.

create the cellar door
  a door, lockable with the iron key

  Oak planks strapped with iron, set flush in the floor.

create the iron key
  aka key

  A heavy iron key, cold in the hand.

create the player
  starts in the Landing
  carries the iron key
```

The player sees:

<!-- transcript: openables/cellar-door.story -->
```transcript
> down
The cellar door is locked.

> unlock the cellar door with the iron key
You unlock the cellar door with the iron key.

> down
The cellar door is closed.

> open the cellar door
You open the cellar door.

> down
Cellar
Casks and cobwebs, and a smell of wet earth.

> close the cellar door
You close the cellar door.
```

One exit line and one declaration buy the whole protocol: the lockable
door starts locked by the kind-scoped default, going refuses
`door_locked` then `door_closed` with no story code, the standard
lock-and-key actions work on the door itself, and the final command
closes the same door from its far side — two-sided presence.

`through` never creates a door, and the compiler refuses what it can't
answer — a declared door no exit line connects, a placement line on a
door block (its location IS its room pair), `through` naming a non-door,
conflicting room pairs — each with its own diagnostic.

Gaps: under the trait, `room1`, `room2`, `bidirectional` — one-way doors
(`bidirectional: false`, traversing room1 → room2 only) are
TypeScript-only, and the `, one-way` exit-line modifier is reserved but a
parse error today.
