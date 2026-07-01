# Scope & Visibility: What the Player Can Reach

When the player types `take key`, two quiet questions get answered before anything
happens: *which* key, and *can the player refer to it at all?* A key in the room is
fair game; a key locked inside a closed box, or sitting in the next room, is not,
even though both exist in the world. The system that draws that line is **scope**,
and you've been relying on it since your very first room without touching it.

## What scope is

Scope is the set of entities a command can refer to and act on *right now*. It's
computed fresh each turn from where the player is and what they can perceive: the
room they're in, the things in it, what they're carrying, what's inside open
containers nearby. When the parser resolves the word "key," it searches scope, not
the whole world, which is why `examine sign` found the welcome sign in Chapter 2
but `examine sign` from a different room would not.

Think of scope as the answer to "what could the player plausibly mean?" Everything
outside it is, as far as this command is concerned, invisible.

## Degrees of access

Not everything in scope is equally available. Sharpee distinguishes a few degrees,
because different verbs need different things:

- **In the room**: present in the player's location.
- **Visible**: can be *seen* (subject to light; see below).
- **Reachable**: can be physically *touched*.
- **Carried** / **worn**: already in the player's hands or on their body.
- **Audible**: can be *heard* even if not seen.

These overlap but aren't identical, and the gap between them is where good puzzles
live. You can *see* a fish through the glass of an aquarium but not *reach* it. You
can *hear* the parrot squawking from the next room without it being *visible*. Most
of the time the standard actions pick the right degree for you (`examine` wants
visibility, `take` wants reach), so you rarely think about it. You reach for the
distinction yourself only when you write a custom action whose verb needs a
different degree.

## Sight and darkness

Visibility isn't free: it depends on light. In a dark room, such as the nocturnal exhibit
from *Light & Dark*, the player can't see, so visual scope collapses to almost
nothing. The objects are still physically present, but a `look` or `examine` can't
reach them; the engine's perception layer steps in and replaces "you see…" output
with the darkness message instead. Bring a lit flashlight and visibility (and the
room's contents) snap back.

This is why darkness works as a gate: it doesn't remove objects, it removes the
player's *perception* of them. Sight is the sense most puzzles gate on, but the same
rule covers the others: a sound the player can't hear is out of scope too.

## Permissive parser, strict action

The parser is deliberately **permissive**, and this is worth understanding even
though you rarely configure it: when it resolves a noun, it accepts anything the
player could plausibly be touching, and leaves the harder judgment to the action. The action's `validate` phase then applies the *strict* rule: does
this verb actually require sight? reach?

The payoff is commands like attacking, pushing, or grabbing in the dark: the parser
still resolves "the lever" by touch, and the action decides whether doing it
blind is allowed. If the parser demanded full visibility up front, every
in-the-dark interaction would fail with "you can't see any such thing" before the
action ever got a say. (When you write your own grammar in Volume V, you can set a
pattern's scope explicitly; until then, the standard verbs already strike this
balance.)

Inside an action, the checks are simple helpers, `context.canSee(entity)` and
`context.canReach(entity)`, so a custom action can be as strict or as lenient as
its verb demands.

## Key takeaway

Scope is the per-turn set of things a command can refer to, computed from the
player's location and senses. The parser searches it, not the whole world, which
is how `take key` finds the right key and ignores the one locked away. Within scope,
verbs care about different degrees of access: **visible**, **reachable**,
**carried**, **audible**. Visibility depends on light, so darkness shrinks sight-based
scope without deleting the objects. And because the parser resolves permissively
while each action validates strictly, the player can still act in the dark when the
verb allows it.
