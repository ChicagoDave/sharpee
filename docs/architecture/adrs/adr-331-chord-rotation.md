# ADR-331: A rotation in Chord — one holder passed along an ordered group

**Status**: **DRAFT** (2026-09-02, session 6a3da1). Not settled — David: *"I'm still not
satisfied with the syntax. This may end up being a story specific extension."* The construct's
shape (a two-sided pair over an ordered group, one holder, one statement to pass it) is the
part in agreement; the spelling and whether it is core or a `use` extension are open below.
Nothing is built. Companion to GH #348, which it does not resolve and does not depend on.

**Scope**: `packages/chord`, `packages/story-loader` — if core; a `packages/ext-*` package if an
extension (ADR-215).

## Context

The Secret Letter ball is ruled a dance (change document, Chapter 11 — David, 2026-09-02): the
guests move in concentric circles, Jacqueline is passed from hand to hand, one or two turns with
each. The W-10 prototype (`branch-stories/secret-letter/prototypes/w10-dance/`) wrote the
rotation in shipped Chord and it works, but it reads like this per hand:

```
      when jacobs
        change the dance to princess
        change Jacobs to waiting
        change the Princess to dancing
        phrase hand-off
```

Three problems, in the order David raised them:

1. **Nothing conserves the invariant.** "Exactly one partner is dancing" is the whole design,
   and three independent `change` lines let an author leave two dancing or none. (Rule 6: an
   invariant stated as a comment is not an invariant.)
2. **The dance's own state is redundant.** `change the dance to princess` and moving the
   partners' sides say the same thing twice; the dance's state exists only so the arm knows
   who is next. Round counting was proposed alongside and struck the same way — the threads
   already carry memory across passes (a parked cursor, `on resuming`, `was discussed`).
3. **It must not be a ballroom construct.** A watch rota, a turn order at a table, a relay of
   shopkeepers, three lamps lit in turn — anyone or anything taking turns is the same shape.

Spellings walked through on the way here, each rejected for the reason given: `switch
ball-dance: dancing, waiting` + `switch Jacobs and the Princess` (a swap of two named
entities — but the arm still had to name who is next, so the dance's state stayed);
`define circle` + `turn` (the order moved into the declaration, which removed the state and
the `select`, but the words are the ballroom's). `switch` as a statement keyword is also the
player's verb for lamps and the switching action's gerund.

## The blocks first

Every line marked UNSHIPPED is proposed; everything else is shipped Chord today.

A watch rota:

```
define rotation the watch: on-duty, off-duty      ## UNSHIPPED
  the first guard
  the second guard
  the third guard
end rotation

create the guardroom
  a room

  when the watch-bell expires
    advance the watch                             ## UNSHIPPED
    phrase changing-of-the-guard
    restart the watch-bell
  end when

create the first guard
  a person

  on the player talking while it is off-duty
    refuse guard-asleep
  end on
```

The ball:

```
define rotation ball-dance: dancing, waiting      ## UNSHIPPED
  Jacobs
  the Princess
  the Duke of Inhyron
  the Baron of Amhyron
  the Earl of Bresa
end rotation

create the dance
  scenery
  in the Ballroom

  when hand expires
    advance ball-dance                            ## UNSHIPPED
    phrase hand-off
    restart hand
  end when

define conversation jacobs-hand for Jacobs, passive
  opens when Jacobs is dancing
  beat:
    phrase je1
  on parting:
    phrase je11
  on resuming:
    phrase je12
  conclusion:
    phrase je20
end conversation
```

## Decision

- **D1 — A rotation is a two-sided pair over an ordered group with one holder.** The
  declaration names the rotation, its two sides (the author's words), and its members in
  order. Exactly one member is on the first side at any time; every other member is on the
  second. The first member listed starts as the holder.
- **D2 — `advance` is the only way the holder moves.** It passes the first side to the next
  member in declared order, wrapping at the end; the previous holder takes the second side in
  the same statement. There is no `change <member> to <side>`: a side is not written
  directly (the analyzer refuses it), which is what makes D1 hold by construction.
- **D3 — Sides read as states do.** `Jacobs is dancing`, `while it is off-duty`,
  `opens when the Princess is dancing`, `select on … state`, `each` over a named condition —
  every existing read works on a side with no new condition grammar. A rotation is a separate
  axis from a member's own `states:` line, as `mood` is.
- **D4 — Members are any entities.** Not only people: three lamps, three doors. A member may
  belong to at most one rotation (never-guess: a second membership is a load error).
- **D5 — The rotation knows nothing about what it rotates.** No music, no conversation, no
  timers: the ball's hand-off is a timer's expiry clause that happens to `advance`; the
  yielding of the outgoing partner's conversation scene is GH #348's, not this ADR's.

## Non-goals

- **Round counting.** Struck (David, 2026-09-02). Memory across passes is the conversation
  runtime's (ADR-320 D14).
- **The hand-off of the player's conversation.** GH #348 (ADR-320 D10's interruption,
  unbuilt). A story using this ADR without #348 has a working rotation and a late hand-off,
  exactly as the prototype does today.
- **A holder value** (`the watch's holder` as something to `move`). Possibly useful; not asked
  for; not here.

## Consequences

- If core: additive grammar in `packages/chord` (a `define rotation` block, an `advance`
  statement, sides admitted wherever a state word is), loader state for the holder index,
  MINOR by ADR-257 D2. If an extension: a `use rotations` gate (ADR-215) admitting the block,
  and the same lowering behind it.
- The W-10 prototype's rotation collapses from a five-arm `select` plus per-partner `states:`
  lines to one declaration and one statement; its test tree is the acceptance run for either
  packaging.
- Adds a keyword (`advance`, and `rotation` in declaration position). `advance` collides with
  nothing in the standard grammar today; this is checked at implementation, not assumed.

## Open Questions

1. **The spelling.** `define rotation … end rotation` and `advance <name>` are the current
   candidates, after `switch`/`swap` and `circle`/`turn`. David is not satisfied yet. The
   shape (D1–D5) is what is agreed; the words are not.
2. **Core or extension.** David: *"This may end up being a story specific extension."* If the
   only consumer stays the Secret Letter ball, it is a `use` extension (ADR-215) or story-side
   under that story's own package; if a second story reaches for it, core. Decide when a
   second use appears or when Chapter 11 is built, whichever is first.
3. **Membership changing mid-story.** Change document Chapter 11 gap 4: the Princess leaves
   after PR15/PR16, the Duke turns his back after IN14. Candidates: `advance` skips a member
   that is offstage (no new syntax; the author `move`s the Princess away); or explicit leave
   and join statements. David's.
4. **Starting holder.** D1 says the first member listed. Whether an explicit `starts <member>`
   line is wanted, as `define machine` has `starts <state>`.

## Session

- 2026-09-02, session 6a3da1 — drafted from the W-10 check and David's three rulings in
  conversation (conserve the invariant; the dance's state is redundant; no round counting;
  must be reusable outside a dance). Session file:
  `docs/context/session-20260902-0413-feat-adr-321-world-index.md`.
