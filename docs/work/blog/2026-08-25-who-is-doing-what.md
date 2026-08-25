# Who is doing what

*Draft, 2026-08-25. On how a small question about a stall in a market turned into Chord saying, on every line, who the actor is.*

I was writing a rule for a market stall. When the stall is blocked and Jack wanders in, the keeper yells and she has to dart away somewhere. Simple enough. The clause looked like this:

```chord
after entering it, while the stall is blocked
  phrase keeper-yells
  move the player to an adjacent room, randomly
end after
```

Two things bothered me about it, and I could not let either one go.

The first was *entering it*. Who is entering? The line reads as if the stall is doing the entering. It is not. The player is. But the language never says so, and it turns out the runtime does not say so either. That clause fires for anyone who walks into the room, including a mercenary on patrol, and when it does, the body still says *move the player*. So a mercenary walks into a blocked stall and Jack gets thrown across the market from wherever she happens to be standing.

The second was the word *it*. I have hated *it* in this language for a while. You cannot read a line on its own. You have to hold the whole enclosing block in your head to know what *it* refers to, and in a clause about two characters it is ambiguous even to a human reader. An interactive fiction language should be explicit about that kind of thing.

So we fixed both. Here is what changed, in the language only.

## Clause heads name their actor

The actor goes in subject position, before the verb, the same way `when the player moves` already read.

Before:

```chord
create the sword
  on taking it
    refuse sword-not-for-you
  end on
```

After:

```chord
create the sword
  on the player taking
    refuse sword-not-for-you
  end on
```

The stall becomes:

```chord
create the Grocery Stall
  a room
  states: open, blocked

  after the player entering, while the Grocery Stall is blocked
    phrase keeper-yells
    move the player to a random adjacent room
  end after
```

Every head in the family is now *actor, verb*: `when the player moves`, `on the player taking`, `after the player entering`. And the actor can be anyone. `on the mercenaries taking` fires when the mercenaries take, and only then.

The one exception is a character's own block. Inside `create Jack`, or `create the wandering mercenaries`, the subject of the block is its owner, so the bare head stays:

```chord
create Jack
  a person
  playable
  starts in the Northwest Junction

  Jack Toresal, who has been a boy in this market for as long as anyone here has
  bothered to look.

  on going while the wandering mercenaries is aggressive
    refuse merc-held
  end on
```

That reads the way `wears the boots` reads. Nobody needs to be told who is wearing them.

## *it* and *its* leave the language

Everywhere *it* was legal, a name already works. Entities have names and `aka` aliases, possessives are written `the keeper's patience`, and timers resolve by name. So the pronoun goes, from statements, conditions, and possessives alike.

Before:

```chord
change it to approaching
reset its lunge
while it is aggressive
```

After:

```chord
change the wandering mercenaries to approaching
reset the wandering mercenaries' lunge
while the wandering mercenaries is aggressive
```

Yes, that repeats the name. Aliases are what keep it bearable, and I would rather read a name three times than guess once.

There is exactly one place *it* survives, because there is exactly one place a name is impossible. A trait composed on several entities has no name for the entity carrying it. Inside `define trait`, and only there, *it* means the carrier:

```chord
define trait kick-escape
  on the player kicking
    refuse when it is oblivious: merc-dont-provoke
    phrase merc-break-free-kick when it is aggressive
    change it to approaching
    reset its lunge
    start its recovery
  end on
end trait
```

That is the one instance where *it* works. The trait can now be composed on more than one character, which is what a trait was for in the first place.

## *the player* is a role, not a character

Once heads name their actor, the question becomes what `the player` means when the player can change. In Chord, `the player` in a clause head is whoever is playing at the moment the clause fires. It is not bound to any particular character, and that is why `create the player` is gone. There is no entity that is the player by construction. There are characters, and one of them holds the role. You say which one before the game starts:

```chord
before the game starts
  change the player to Jack
end before
```

That block is new, and it turned out to be the thing this whole question was asking for: a place for things that happen once, before turn one. Assigning the role is an action, so it belongs in a block that runs, not in a header field that merely states.

A character's own block binds the other way, to the character. So under a switch, a room's `after the player entering` follows the new player, and the old player's own clauses keep firing for that character, who is now just someone else in the world.

And switching is a plain statement:

```chord
create Viola
  a person
  playable
  starts in the Chapel

  Viola.

create the Chapel
  a room

  A chapel.

  after Jack examining the seal
    phrase cut-to-viola
    change the player to Viola
  end after
```

`change X to Y` is already how Chord says that X is now Y. The player is a thing whose current value is a character, so the same statement assigns the role at the start and moves it later. `playable` marks who is allowed to take it.

## Arrivals are arrivals

Walking into a room and being thrown into a room are the same event. A `move` that lands someone in a room fires that room's entering clause exactly as a walked arrival does, for whichever character was moved. That is what makes the stall rule above compose: the eject lands Jack in a blocked stall, the stall's own rule fires, and she is thrown out again. Nothing in the language had to be added for that. It just had to be true.

## The place I started from

The line that started all of this now reads:

```chord
move the player to a random adjacent room
```

A room one exit away from wherever the mover is standing, honouring whatever going would honour: blocked exits, locked doors, a computed exit that happens to be live right now. The randomness is in the noun. There is no strategy word to add, because there is only one way to choose from a set that is recomputed every time.

## Where this leaves NPCs

Most of the above is about the player, but the reason it matters is that none of it is *only* about the player. A head like `on the mercenaries taking` is not decoration. It fires, because the mercenaries take things the same way Jack does, through the same action, with the same refusals and the same reactions. That is the real change underneath the syntax: one way to act in Sharpee, and anyone can be the one acting. The language just finally says so on every line.

For the record, as of today: the adjacent-room place and the arrival rule are in and shipping. The actor-explicit heads, the departure of *it*, the player-as-role rule with its start block, and `change the player to` are decided and written down, and they land next, together with the platform work that makes a mercenary's `on the mercenaries taking` fire for real.
