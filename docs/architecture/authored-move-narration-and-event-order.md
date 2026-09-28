# Authored-Move Narration and Event Order

What an authored move — `move <entity> to <place>`, `move <entity> offstage`,
`remove <entity>` — narrates and fires, in what order, and how that lines up
with a walked move (`going`). Written for the secret-letter-port-platform-defects
plan, Phase 2 (P-6), 2026-09-06, from the source as it stands after GH #367,
#368, #373 and #275 landed. Every claim below names the file that carries it.

This is the order document for *moves*. The publish-readiness tick-order audit
(ADR-332's bands) covers where plugins run inside a turn and is not repeated
here; this document only says where a move's consequences land relative to
those bands.

## 1. The two paths

A **walked move** is the `going` action. Its report emits `if.event.actor_moved`
first and the room description after it (`stdlib/src/actions/standard/going/going.ts`,
"Return movement events first"). The executor applies the report's events and
runs the world's event chains on them (`engine/src/command-executor.ts`,
`processEvents`); the loader bound every `after <actor> entering` clause as a
chain on `actor_moved` (`story-loader/src/runtime.ts`, `bindEventClause`), so the
clauses' narration is appended to the action's events as *reactions*, after
the description.

An **authored move** runs inside a clause body. The loader moves the entity
itself (`runtime.ts`, `moveWithLifecycle`) and — because no `actor_moved` is
emitted for it, so the engine's chains never see it — fires the arrival
clauses itself (`fireMoveArrival`). Where that narration lands is the whole
subject of this document.

## 2. The order for an authored move of the player

For `move the player to <room>` with the engine running, in this order:

1. **The mover's clause narrates its own text** — every `phrase` before and
   after the `move` statement in the same body, in body order. This is the
   body's return: an interceptor's report, an `after` clause's reaction, a
   story action's report.
2. **The room is described** — the real `looking` action, run as the player
   through the engine's execution entry (`describeArrival`). Its events wait in
   the act queue (`pendingActEvents`).
3. **The destination's `after the player entering` clauses, then every
   `when the player moves` clause** fire (`fireMoveArrival`). Their narration
   joins the act queue *behind* the description, spliced in at the position
   the queue had before the clause bodies ran.
4. **The act queue drains** — the `chord.acted-events` plugin, first of the
   story-reactions band (`story-loader/src/loader.ts`,
   `TURN_BANDS.storyReactions.floor + 90`), right after the player's action
   and ahead of the scheduler, the actor phase, and every watcher. A move
   made inside a daemon body drains on the `chord.act-drain` daemon instead,
   on the same tick.
5. **Watchers and chapter triggers** run in the watchers band and see the
   finished turn: the world state the move and its clauses left.

So the player reads: what the clause said, the room header and description,
then what happens in the room. That is the walked order, and it is what
GH #367 asked for.

**Re-entry chains.** When a destination's entering clause moves the player
again, each level repeats steps 2–3 for its own room: the room is described
before its clauses run, and the clause's own text is spliced ahead of
anything a nested move deferred. A body that yells and then ejects the player
reads: first room, the yell, second room — exactly what a walked bounce
prints. (This withdraws the 2026-09-03 "only the outermost move describes"
rule of ADR-326 D5's addendum; see the corrected addendum there.) The cap is
eight nested arrivals (`runtime.move-arrival-reentry`).

**The one ordering the deferral cannot give.** A body that moves the player,
says a phrase, and moves the player again narrates the phrase first and both
arrivals after it — the phrase is body-return narration, the arrivals are
deferred. The acting statement has the same contract (an act narrates right
after the report that caused it), and the two-pass interceptor body (a
mutations pass, then a reports pass) leaves no finer interleaving to offer.

**Before the engine is ready** (a move in `before the game starts`) nothing is
described — the boot look shows the start room — and the arrival clauses'
narration takes the channel queue described in §3.

## 3. The order for an authored move of another entity

For `move <npc> to <room>`:

1. The mover's clause narrates its own text (as above).
2. The **witness rows** — the mover's `exited` row stamped with the source
   room and `entered` row stamped with the destination — are enqueued on the
   channel queue (`witnessMove`; ADR-325 D2 as amended by ADR-328 D3). The
   client hides what the player was not present for.
3. The destination's `after <npc> entering` clauses and every
   `when <npc> moves` clause fire; their narration follows the witness rows
   on the channel queue.
4. The channel queue drains at the end of the enclosing body's
   report-collecting pass (`execStatements`, "Z3: witnessed lifecycle
   narration"), so it is part of that body's return — a mutations-only pass
   never drains it, the reports pass that follows does.

Nothing is described: a moved NPC shows the player no room.

## 4. What a move offstage fires

`move <entity> offstage`, and `remove <entity>` (the same lifecycle under
ADR-325 Z6 as amended), when the entity leaves a room for nowhere:

- the `disappeared` witness row, stamped with the room left (`witnessMove`);
- every `when <entity> moves` clause for the mover (`fireMoveDeparture`,
  GH #373) — the completed move's event carries the source room and no
  destination, so no room's entering clause can match it and none fires.
  An offstage mover has no location: `its location` in the body refuses, as
  ADR-325 D1 says.

The narration takes the channel queue (§3). An entity already offstage moved
offstage again has not moved — nothing fires. A move within the same room
(into a container, onto a supporter) is not a room transition and fires none
of this.

ADR-325 D3h was amended in the same landing: `when <entity> moves` fires on
the completed move of the named entity, walked, authored, or offstage.

## 5. Where the chapter trigger reads

`begins when the player visits <room> for the first time` does not read the
player's location when the chapters plugin runs. It reads the **visited
fact** `chord.visited.<room-world-id>` (`story-loader/src/state-keys.ts`),
stamped `true` on the arrival event by both paths — the walked path through
one chain on `actor_moved` registered in `bind()`, the authored path in
`moveWithLifecycle` — in the same firing that runs the room's entering
clauses. The plugin's `first-visit` trigger is lowered to that key
(`loader.ts`) and holds when it is set (`extensions/chapters/src/chapters-plugin.ts`,
`holds`), once, under the row's fired flag.

Consequences:

- A room whose own entering clause moves the player on in the same turn
  still begins its chapter that turn (GH #368) — the arrival happened.
- A move made in a daemon body, after the watchers have run, is seen on the
  next turn, as the location read was.
- The start room is not an arrival, so a `visits <start room>` row never
  begins. ADR-330 requires the opening to be a `the game starts` row, which
  is the moment that covers it.
- The fact is ordinary world state: a save carries it.

## 6. The clock the scenes read (GH #275)

Not a move, but the same class of defect the plan grouped here: two writers
on two scales. `character.turn` mirrors the last *completed* character-model
tick and is written as the tick finishes (`character/src/tick-phases.ts`,
`createCharacterModelPhase`), so `dialogueTurn()` reads the current turn on
both sides of the boundary — during turn T's player action and during turn
T's tick. Every scene stamp (`subjectChangedTurn`, `lastMoveTurn`, the
conversation markers, the thread-cycle stamp) and every read of it is on that
one scale, and the `- 1` offsets that bridged the old entry-advanced mirror
are gone (`runtime.ts`, `buildThreadTurnReady` and the thread-turn advance).

## 7. The tests that pin this

- `story-loader/tests/authored-move-order.test.ts` — §2 from an `on the
  player entering` mover and an `after` mover; the re-entry chain; §5 walked
  and authored; §4 for `move … offstage` and `remove`.
- `story-loader/tests/authorial-move-describes.test.ts` — the GH #331
  description, now also pinned before the arrival clause.
- `story-loader/tests/adjacent-room-runtime.test.ts` — the blocked-stall
  bounce and `when <entity> moves` on a moved arrival (ADR-327 D5).
- `story-loader/tests/adr-330-chapters.test.ts` — the chapters real path,
  walked and authored first visits.
- `story-loader/tests/gh-275-subject-change-occasion.test.ts` and
  `character/tests/tick-phases/scene-sub-step.test.ts` — §6, through the real
  asking action and through the tick phase.
