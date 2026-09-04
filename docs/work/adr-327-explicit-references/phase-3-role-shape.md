# Phase 3 shape — D9 + D10, the player role (assignment, reassignment, the start block)

Written 2026-08-26 (session ecf3d4) before any edit to `packages/chord`,
`packages/story-loader`, `packages/engine`, or `packages/stdlib`, per the plan's Entry
state. Every "today" claim cites a file and line read this session.

## What exists today

### The player is an entity built outside the world build

- `create the player` is not a keyword. `buildEntity` derives the flag from the block's
  name: `isPlayer = decl.name.words.length === 1 && words[0] === 'player'`
  (`chord/src/analyzer.ts:4707`), and it rides the IR as `IREntity.isPlayer`
  (`chord/src/ir.ts:246-247`).
- The loader **never builds that IR entity into the world**. Pass 1 skips it
  (`story-loader/src/loader.ts:489`), and `createPlayer` mints a *separate* synthetic
  actor instead: `world.createEntity('yourself', 'actor')` with
  `IdentityTrait{ name:'yourself', aliases:['self','me','myself', ...aka], properName:true,
  article:'' }`, `ActorTrait{ isPlayer:true }`, `ContainerTrait{ maxItems:10 }`, and a
  `ChordBehaviorTrait` when the player carries clauses (`loader.ts:707-740`). The IR
  player's id is mapped onto that world id (`loader.ts:730-732`).
- `finalizePlayer` (`loader.ts:747-...`) places it (`starts in`/`in`/`on`, else the first
  declared room), seeds `states[0]` and per-entity counters, and runs the player-block
  composition gate. It runs from whichever of `createPlayer`/`initializeWorld` fires
  second — **both orders are already supported** (`loader.ts:704`, `:737`).
- The analyzer already gates player-block composition: only `a person` is a legal kind
  (`analysis.player-kind`, `analyzer.ts:5396`), and character lines are refused on the
  player (`analysis.character-line-player`, `analyzer.ts:4554`, `:4905`).

### The engine's order, and `switchPlayer` with no callers

- `setStory` calls `story.createPlayer(this.world)` **first** — "Create player first so
  initializeWorld() can place them" (`engine/src/game-engine.ts:386-388`) — then
  `this.world.setPlayer(newPlayer.id)`, adds `ListenerTrait`, and only afterwards runs
  `story.initializeWorld(this.world)` (`:409`). Seven TS `Story` implementations place
  the player during `initializeWorld` and so depend on that order — enumerated in the
  D10 runtime section below, where the ruled design flips it.
- `switchPlayer(entityId)` (`game-engine.ts:1681-1719`) is complete and **has no caller
  today**. It throws on: entity not found, no `ActorTrait`, `!isPlayable`. It clears the
  old `ActorTrait.isPlayer`, sets the new one, `world.setPlayer`, `syncPlayerState`, and
  emits `game.pc_switched`. `syncPlayerState` (`:1798-1817`) re-points `context.player`,
  the parser's world context and pronoun context, scope vocabulary, and narrative
  settings. **It does not move the `me`/`myself`/`self` aliases** — those live on the
  entity's `IdentityTrait` (`loader.ts:716`).
- `ActorTrait.isPlayable` defaults to **`true`** (`world-model/src/traits/actor/actorTrait.ts:154`),
  so the engine's playable check passes for every actor unless something sets it false.
- The first room description is **not** engine-emitted: clients issue `look` after
  `start()` (e.g. `bootstrap/src/assemble-channels.test.ts:66`). `start()` itself
  (`game-engine.ts:699-790`) resolves the prologue, builds channels, and emits
  `game.initialized`/`starting`/`started`. So "before the first room description" is
  satisfied by anything that runs in `setStory` or `onEngineReady`.

### Autonomous behaviour has no role gate

- Entity every-turn daemons (`story-loader/src/runtime.ts:3315-3343`) gate on **presence
  only** (`playerPresentAt`), never on whether the owner is the PC. Same for trait
  every-turn daemons (`:3368-3400`). Story-owned every-turn clauses have no gate by design.
- The NPC tick runs every entity with `TraitType.NPC` that can act —
  `getActiveNpcs` → `canNpcAct(npc)` (`stdlib/src/npc/npc-service.ts:465-468`, `:429-433`);
  `canNpcAct` takes no world, so it cannot ask who holds the role.
- The loader keeps the PC out of the NPC service by construction:
  `if (!irEntity.isPlayer && !entity.has(TraitType.NPC))` before composing a passive
  `NpcTrait` (`loader.ts:877`). That guard is exactly what D9 says must go.

### `change` and the create-block composition grammar

- `change <entity> to <state>` parses the target as a name ref and the state as **one
  word** (`chord/src/parser.ts:6836-6848`) → `ChangeStmt{ entity, state }`
  (`ast.ts:2007`, `ir.ts:1411`). `change the player to Viola` therefore *already parses*
  — as a state change to a state named `viola` — and `change the player to Jack Toresal`
  does not parse at all (two words after `to`).
- Top-level dispatch is a `switch (firstWord(line))` over `TOP_KEYWORDS`
  (`parser.ts:203-205`, `:375-470`), with the removed-form errors (`parse.removed-when`,
  `-once`, `-every`) as siblings. `before` is not in the set.
- A bare (article-less) composition line in a create block routes to
  cognitive-profile → personality adjective → trait composition (`analyzer.ts:4715-4735`),
  so `playable` today lands on the unknown-trait census gate.
- A `person` is built as `ActorTrait` + `IdentityTrait` and **no `ContainerTrait`**
  (`loader.ts:1757-1776`) — the capacity-10 container is `createPlayer`-only.

## Mechanism

### D10 grammar — `playable`, the start block, `create the player`'s removal

1. **`playable`** — a reserved bare composition, matched in `buildEntity`'s composition
   loop *ahead of* profile/personality/trait routing (`analyzer.ts:4715`), setting
   `IREntity.isPlayable: boolean`. Errors: `analysis.playable-non-person` when the block
   is not `a person`.
2. **`before the game starts … end before`** — a new top-level declaration in the
   `on … end on` block family. `'before'` joins `TOP_KEYWORDS`; `case 'before'` requires
   the exact word sequence `before the game starts` (`parse.start-block` otherwise) and
   parses an ordinary statement body terminated by `end before`. AST `StartBlockDecl`,
   IR `ir.startBlock: { body: IRStatement[]; span } | null`. A second block is
   `analysis.duplicate-start-block`.
3. **`create the player` is removed** — `parseCreate` (`parser.ts:1435`) reports
   `parse.removed-create-player` when the name is the single word `player`, with the D10
   fix-it: *"name the character, mark it `playable`, and assign the role in a
   `before the game starts` block."* `IREntity.isPlayer` is **deleted** from the IR
   (`ir.ts:246`) and `analyzer.ts`'s three `isPlayer` gates (`:4707`, `:4552`, `:5396`)
   go with it — a `playable` person composes like any other person, so the player-kind
   and character-line-player gates lose their subject.
4. **`change the player to <entity>`** — a parser special case inside `case 'change'`
   (`parser.ts:6791`): when the target name ref is exactly `the player`, the tail parses
   as a **name ref**, not a single state word, yielding `ChangePlayerStmt{ target }`
   (IR `{ kind: 'change-player'; entity: IRValue }`). Analyzer gates:
   `analysis.player-target-unknown` (unresolved name), `analysis.player-target-not-person`,
   and **`analysis.player-target-not-playable`** — the compile-time gate D9 requires so
   `switchPlayer`'s `isPlayable` throw never reaches a player.
5. **The role must be filled** — `analysis.start-block-missing` when a story has no start
   block, and `analysis.start-block-no-role` when it has one that does not assign the
   role. Both name the block.

**The role assignment may be conditional (Q1 — WITHDRAWN).** Design (A) needed an
unconditional, top-level assignment so the loader could read it statically at
`createPlayer` time. Under the ruled design (C) the start block *executes* against a
finished world, so nothing is read statically and the restriction has no purpose. No
`analysis.start-block-role-conditional`. The unfilled-role case is caught at load
instead — see the runtime backstop below.

### D10 runtime — the engine's order is flipped (RULED: C, 2026-08-26)

`setStory` builds the world first and the player second:

```
validateStoryConfig / narrative settings           (unchanged)
registerConcealedVisibilityBehavior(this.world)    <- moves ABOVE initializeWorld
story.initializeWorld(this.world)                  <- was second, now first
const newPlayer = story.createPlayer(this.world)   <- was first, now second
this.context.player = newPlayer
this.world.setPlayer(newPlayer.id)
ListenerTrait, configureLanguageProviderNarrative  (travel with createPlayer)
validateRoomSnippets / validateCombatantHealth     (unchanged, after both)
```

The concealment registration has to move rather than travel with `createPlayer`: it sits
before `initializeWorld` today precisely so a story's own binding wins last
(`game-engine.ts:400-406`; per-world registration is last-wins, ADR-207). Flipping the
order without moving it would silently reverse that precedence.

**What C buys.** The role-holder is an ordinary world entity that already exists when
`createPlayer` runs, so three pieces of design (A) are simply not needed:

- **`createPlayer` becomes a lookup, not a build.** The loader stops minting a synthetic
  `yourself` actor. It resolves the role-holder, adds the role's own vocabulary
  (`me`/`myself`/`self`), `ContainerTrait{ maxItems: 10 }`, and `ChordBehaviorTrait` when
  the player carries clauses; `finalizePlayer` then places and seeds it exactly as today.
  What it stops doing: naming it `yourself`, describing it as "An adventurer.", forcing
  `properName`/empty article — Jack is Jack, per D10.
- **`ir.initialPlayer` is dropped.** Nothing is read at compile time; the start block
  leaves the answer in `this.playerId`.
- **The early `buildEntity` call and the pass-1 skip are dropped.** The role-holder is
  built by pass 1 like every other person; `loader.ts:489`'s `worldIds.has` check no
  longer has a player case to serve.

`finalizePlayer`'s two-order tolerance (`loader.ts:704`, `:737`) collapses to the single
direct/test order the loader tests already use. Keep the guard anyway — it costs nothing
and the loader is callable outside the engine.

**One statement, two moments.** `change the player to X` executes as an effect in both
cases; the discriminator is `world.getPlayer()`:

- **undefined** — during `initializeWorld`, i.e. inside the start block: set
  `this.playerId = X`. No event, no engine involvement.
- **defined** — any turn after `setStory`: emit
  `if.event.player.switch_requested { entityId }` for the engine to drain, per the D9
  section below.

**The role must be filled — compile gate plus load backstop.** Because the assignment now
executes, a conditional assignment can compile and still not fire. Two gates:

- Compile: `analysis.start-block-missing` (no start block at all) and
  `analysis.start-block-no-role` (a start block carrying no role assignment on any path).
- Load: `createPlayer` throws a named `LoadError` when `this.playerId` is unset after the
  start block ran — the story compiled, but the path taken left the role empty.

**Cost: seven TS files.** Every `Story` implementation that places the player during
`initializeWorld` moves that placement into `createPlayer`, which now runs with a finished
world:

| File | Placement site today |
| --- | --- |
| `stories/dungeo/src/index.ts` | `initializeWorld`, via `world.getPlayer()` |
| `stories/cloak-of-darkness/src/index.ts` | `initializeWorld:139` |
| `stories/family-zoo-tutorial/src/index.ts` | `initializeWorld:290` |
| `stories/concealment-test/src/index.ts` | `initializeWorld:55` |
| `stories/channel-service-test/src/playable-story.ts` | `initializeWorld:87` |
| `packages/engine/tests/stories/minimal-test-story.ts` | `initializeWorld`, via `this._player` |
| `packages/engine/tests/stories/complex-world-test-story.ts` | `initializeWorld` |

`stories/armoured/src/index.ts` never touches the player in `initializeWorld` and is
unaffected. Every `packages/story-loader/tests/*` file already calls `initializeWorld`
then `createPlayer` — the flipped order is the one they already use.
`minimal-test-story.ts:94-96` carries a comment explaining the very workaround this flip
removes; it goes with the change.

The earlier reading of C as "breaks every TS story's contract, not viable" was a
mis-measurement, corrected by counting the call sites (2026-08-26).

### D9 runtime — the switch, event-only

The loader holds no engine handle. `change the player to X` executes as an effect that
emits `if.event.player.switch_requested { entityId }`, following the `triggerEnding` seam
(`loader.ts:1647-1651`). The engine consumes it at turn end and calls `switchPlayer`
— its first caller. A second `switch_requested` in one turn is the named runtime
diagnostic `runtime.double-player-switch` (naming both targets); the first wins.
`game.pc_switched` follows from `switchPlayer` unchanged (`game-engine.ts:1715`).

**Self-aliases follow the role (Q2 — RULED YES).** `syncPlayerState` does not move
`me`/`myself`/`self` today, so after a switch `x me` would still name the old PC. Proposed:
`switchPlayer` moves those three aliases from the old PC's `IdentityTrait` to the new
one's. ADR-327 leaves vocabulary to ADR-319, but this particular three-word set is the
role's own vocabulary, not the character's, and leaving it stale breaks `x me` in every
switched story. Ruled yes 2026-08-26.

### D9 role gate on autonomous behaviour

Fire-time, no stored state, matching `loader.ts:1253`'s shape:

- Entity every-turn daemons (`runtime.ts:3326`) and trait every-turn daemons (`:3388`):
  `if (this.host.entityId(irEntity.id) === ctx.world.getPlayer()?.id) return [];` —
  **before** the presence gate, so the RNG stream and `, once` are untouched while the
  owner holds the role.
- NPC tick: `canNpcAct(npc, world)` gains the world and returns false for
  `world.getPlayer()?.id` (`npc-service.ts:429`); its three call sites already have a
  world in hand (`:219`, `:272`, `:313`). **This is the `packages/stdlib` edit — one
  private method plus its call sites.**
- The loader's `!irEntity.isPlayer` guard on `NpcTrait` (`loader.ts:877`) is deleted:
  every character with a character block carries the trait, and the tick skips the
  role-holder.

### Narration in the start block (Q3 — RULED YES)

The first room description comes from a client-issued `look`, so a `phrase` in the start
block has no sink ahead of it — the loader would have to hold the events for turn one,
which needs a new `Story` hook. Proposed for Phase 3: the start block takes **effect
statements only**; `phrase`/`emit` there is `analysis.start-block-narration` with a
fix-it pointing at the story header's existing `prologue:` field. A `getInitialEvents?()`
hook stays available as later work if David wants narration there.

### Person containers (Q4 — RULED YES)

A `playable` person needs somewhere to carry things. Proposed: the loader gives an entity
marked `playable` a `ContainerTrait{ maxItems: 10 }` at build (what `createPlayer` gives
the player today), leaving non-playable persons exactly as they are. The wider question —
should every `person` carry a container — stays out of this phase.

## Tests

**Chord compile tests** (`packages/chord/tests/adr-327-phase3.test.ts`), Acceptance items
5 and 6's compile halves: `playable` on a person and its non-person error; the start block
at top level and its `end before`; a second start block; a missing start block; a start
block with no role assignment; a conditional role assignment (legal — compiles); `create the player` and its
fix-it text; `change the player to <one-word>` and `<multi-word>` names; a non-`playable`
target; an unknown target; `phrase` inside the start block.

**REAL-PATH tests through a real engine** (rule 13a) — `packages/engine/tests/` driving a
built `.story` fixture, since the assertions are about `switchPlayer`, turn boundaries,
and daemon firing, none of which the loader can witness alone:

1. `world.getPlayer()` is the assigned character at turn one, and the start block's
   effects are visible before the first `look` renders (Acceptance 6).
2. The clause's turn ends with `game.pc_switched`; the next turn's
   `after the player entering` fires for the new PC and not the old one; the old PC's
   own-block clause still fires when the old PC acts (Acceptance 5).
3. Two `change the player to` in one turn raise `runtime.double-player-switch`.
4. D9 Scenario A: Actor1 is the PC, Actor2 an NPC with every-turn clauses; the switch
   silences Actor2's clauses from the next turn and wakes Actor1's.
5. D9 Scenario B: clauses authored on the starting PC stay silent until it stops being
   the PC, then fire — no author-side switch statement.
6. `x me` names the current PC before and after the switch (Q2's pin).

Both D9 scenarios keep the current PC in the room, so they pass under the existing
presence gate and again after ADR-328 retires it.

## Rulings (2026-08-26)

- **D10 runtime — (C), flip the engine's order.** `initializeWorld` runs before
  `createPlayer`. Cost is the seven TS files tabled above; the payoff is that
  `createPlayer` becomes a lookup and (A)'s static role read, `ir.initialPlayer`, and
  pass-1 skip all disappear.
- **Q1 — WITHDRAWN.** C removes the reason for it; a conditional opening PC is legal, and
  the unfilled case is a load-time `LoadError`.
- **Q2 — YES.** `switchPlayer` moves `me`/`myself`/`self` from the old PC's
  `IdentityTrait` to the new one's.
- **Q3 — YES.** The start block takes effect statements only; `phrase`/`emit` there is
  `analysis.start-block-narration`, with a fix-it pointing at the story header's
  `prologue:` field. A `getInitialEvents?()` Story hook stays available as later work.
- **Q4 — YES.** An entity marked `playable` gets `ContainerTrait{ maxItems: 10 }` at
  build; non-playable persons are unchanged. Whether every `person` should carry a
  container stays out of this phase.
- **Q5 — YES.** `IREntity.isPlayer` is deleted from the IR (replaced by `isPlayable`),
  and `IR_FORMAT` bumps again in this phase rather than carrying a dead field. Chord
  stays 4.0.0 — one MAJOR for the whole cutover, per D6.

## Landing notes (2026-08-26/27, session 56856a)

Five things the shape doc did not anticipate, recorded here for the Phase 5
ADR-327 amendment pass.

1. **`analysis.start-block-missing` fires only on a file with a `story`
   header.** A grammar file carries no story, and a headerless fragment is not
   a story either; both are compiled all over the test suites and neither has a
   role to fill.

2. **`analysis.player-target-unknown` was dropped.** `resolveEntityValue`
   already fires the standard unknown-entity gate, and two diagnostics for one
   miss reads as two problems.

3. **`on the player …` inside a character's block is now legal.** The head names
   the ROLE, which some other character may hold, so `analysis.head-actor-is-owner`
   can only fire on the by-name form (`on Alex …` inside Alex's block). Phase 1's
   tests for the player-block case were rewritten. This narrows D1's gate.

4. **A timer must belong to whoever the bare reference resolves against.**
   `define timer waiting for the player` plus a bare `restart waiting` inside
   Alex's block is a genuine mismatch under D10 (the `player` sentinel vs
   `alex`) — the fixtures say `for Alex`.

5. **The two-moment split keys on the start block, not on the world.** The shape
   doc proposed discriminating `change the player to` on whether
   `world.getPlayer()` is defined. That is wrong in practice: `bootstrap` seeds
   a placeholder player before `setStory`, so the world's answer says nothing
   about whether the story has opened. The runtime carries an `inStartBlock`
   flag instead. Related: the switch REQUEST rides the reports pass, not the
   mutations pass — a mutations-pass event is recorded and dropped, which is
   where the request went missing on first run.

Two smaller carries. `finalizeRoleHolder` keeps the ADR-289 D4 first-room
fallback (a protagonist with no placement line starts in the first declared
room) — pass 2 places only what the author wrote, and an unplaced PC is nowhere
to play. And the loader's own `wears` backstop now throws from
`initializeWorld` rather than `createPlayer`, because the role's equipment is
applied when the role is settled.
