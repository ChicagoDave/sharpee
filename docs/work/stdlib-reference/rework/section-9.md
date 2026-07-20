## 9. Death

Killing the player. Death is not `lose`: `lose` (chord-language.md §4.6)
ends the game with an ending event, while the constructs here run the
platform's death machinery — a died event, a story-visible veto window,
and then the defeat ending. chord-language.md §4.7 teaches the same
constructs from the author's side; this chapter carries the machinery
detail.

### 9.1 kill the player

**kill the player** (statement, peer to `win` and `lose`) — forms `kill
the player`, `kill the player <phrase-key>`, optional `when <condition>`
suffix; legal anywhere statements go: `on` and `after` clauses (entity or
trait), `on every turn [while …]` daemons, `define action` bodies, inside
`select` and `each` blocks. The phrase key is the death text (define it
like any phrase) and doubles as the recorded cause; a bare `kill the
player` records the cause `killed` and shows only the platform's ending
text.

The machinery, in order: the death text speaks, the platform's
`if.event.player.died` event fires, and at end of turn the engine
re-checks the player's actual life state — that re-check, not the event,
is the final word. A story policy that revives the player during the turn
(Dungeo's death-penalty machinery works this way) vetoes the ending;
otherwise the game ends in defeat (`game.lost`, the `death` and `endgame`
channels). Because the decision waits for end of turn, statements after
the `kill` in the same body still run. There is no built-in "restart or
undo?" prompt — that is client/story territory.

The author writes:

<!-- fixture: death/kill-player.story -->
```story
create the Generator Room
  a room

  Pipes and cables hum along every wall.

create the bare wire
  aka wire
  scenery
  in the Generator Room
  states: live, dead

  A stripped cable sags from the ceiling conduit.

  on touching it
    kill the player shock-death when it is live
    phrase wire-cold when it is dead
  end on

create the breaker lever
  aka lever, breaker
  scenery
  pullable
  in the Generator Room

  A heavy knife-switch bolted beside the door.

  on pulling it
    change the bare wire to dead
    phrase breaker-thrown
  end on

create the player
  starts in the Generator Room

define phrases en-US
  shock-death:
    The current takes you before you can let go.
  wire-cold:
    Cold and inert. The breaker did its job.
  breaker-thrown:
    The breaker slams over and the hum dies with it.
```

The player who touches the wire straight away sees the death text and
nothing after it — the game has ended in defeat:

<!-- transcript: death/kill-player.story -->
```transcript
> touch the wire
The current takes you before you can let go.
```

The player who throws the breaker first (a fresh game) lives:

<!-- transcript: death/kill-player.story -->
```transcript
> pull the lever
The breaker slams over and the hum dies with it.

> touch the wire
Cold and inert. The breaker did its job.
```

The `when` suffix is the whole gate — live wire, the `kill` fires; dead
wire, it is skipped. Note the second `when` on `phrase wire-cold`:
statements after a `kill` still run, so follow-up text must gate itself
off the fatal case.

### 9.2 Deadly exits and deadly rooms

**`<direction> is deadly: <phrase>`** marks one fatal direction,
mirroring `is blocked:`. The fatal direction is deliberately not an exit
at all — typing `north` (or `n`) never runs the going action: the command
is rewritten before validation into the internal death action (§9.3), so
the player sees the death text and nothing else, no movement prose, no
refusal.

**`deadly: <phrase>`** on a room is the rarer, harsher form: every verb
except a safe allowlist — look and examine by default — is fatal,
including objectless ones like WAIT and INVENTORY that no per-entity
clause could catch. In TypeScript the underlying trait adds two more
dials: `safeVerbs` (verb names or full action ids, matched tolerantly)
and `chance` (0–1) for probabilistic hazards à la grue — rolled on the
engine's seeded RNG, and a survived roll simply lets the verb run
normally, with no message. Neither dial is expressible from Chord today.

The author writes:

<!-- fixture: death/deadly-places.story -->
```story
create the Basalt Ledge
  a room
  down to the Steam Vault
  north is deadly: geyser-death

  Black rock, slick with spray. The geyser mutters somewhere north;
  a crevice drops away underfoot.

create the Steam Vault
  a room
  deadly: steam-death

  Scalding fog, wall to wall. There is no air to spare in here.

create the player
  starts in the Basalt Ledge

define phrases en-US
  geyser-death:
    The geyser chooses that moment. The column of boiling water makes
    the question of footing irrelevant.
  steam-death:
    The steam finds your lungs.
```

The player who walks north sees no movement prose and no refusal — only
the death text:

<!-- transcript: death/deadly-places.story -->
```transcript
> north
The geyser chooses that moment. The column of boiling water makes the question of footing irrelevant.
```

The player who climbs down (a fresh game) arrives safely — looking is on
the allowlist — and dies to the first verb that is not:

<!-- transcript: death/deadly-places.story -->
```transcript
> down
Steam Vault
Scalding fog, wall to wall. There is no air to spare in here.

> look
Steam Vault
Scalding fog, wall to wall. There is no air to spare in here.

> inventory
The steam finds your lungs.
```

The deadly exit killed without going ever running; the deadly room let
LOOK repeat but made INVENTORY — an objectless verb no `on` clause could
catch — fatal.

One gap: the conditional form `is deadly while <condition>:` parses but
is not wired yet. This compiles clean —

<!-- fixture: death/deadly-while.story -->
```story
create the Dam Top
  a room
  states: holding, burst
  east is deadly while it is burst: flood-death

  The dam hums underfoot.
```

— and then the loader refuses the story with: `` `is deadly while
<condition>` is not wired yet — the conditional deadly exit is post-scope
(mirror: role-bound trait clauses). Use an unconditional `is deadly:` or
an `on going` clause with `kill the player when <condition>`. `` The
suggested `kill the player when …` clause is §9.1's pattern.

### 9.3 Death traits and internals

**deadly-room** (trait; authored via `deadly:` above, or in TypeScript
for `safeVerbs`/`chance`). Fields: `cause` (defaults to the phrase key
from Chord, `'hazard'` in TS), `messageId`, `safeVerbs`, `chance`. The
Steam Vault in §9.2 is this trait's Chord surface.

**health** (trait — Chord-reachable only through combat: under `use
combat`, `combatant with health 20 and max-health 30` seeds it,
auto-attached; there is no standalone `health` adjective). The single
life-state model (ADR-226): `health`/`maxHealth`, a consciousness
threshold, an `asleep` flag, and the terminal `dead`/`causeOfDeath` pair;
the behavior owns `takeDamage`/`heal`/`kill` and the derived
`isAlive`/`isConscious`. Entities without it are simply alive — it is
opt-in, and the platform attaches one to the player lazily the first time
something kills them. Combat (§8.2) damages through it.

**deadly-room-death** (internal action — no grammar, never typed). The
redirect target both deadly forms rewrite commands into: it validates
unconditionally ("death is inevitable once redirected"), calls the
platform death sink, and reports the died event. Interceptors never see
it. One wire-shape nuance for event listeners: on this path the death
text rides the died event's `messageId`; on the `kill the player` path
the text is a separate phrase event and the died event carries only the
cause — same visible result, different payloads:

| | `kill the player` (§9.1) | deadly exit / deadly room (§9.2) |
|---|---|---|
| Refusals | none — a statement, not an action; the `when` suffix is the only gate | none — the redirect validates unconditionally, and interceptors never see it |
| Death text | the phrase key, spoken as a separate phrase event | the phrase key, riding `if.event.player.died`'s `messageId` |
| Events | `if.event.player.died` (carries only the cause) | `if.event.player.died` (carries cause and `messageId`) |
| Ending | `game.lost` on the `death` and `endgame` channels — unless a story policy revives the player inside the veto window | same |

No shipped `.story` uses these constructs yet; the live production use of
the same machinery is Dungeo's Aragain Falls (a TypeScript transformer on
the identical seam — `falls-deadly-exit.transcript` pins the behavior),
plus its gas, grue, and poison deaths through `killPlayer`.
