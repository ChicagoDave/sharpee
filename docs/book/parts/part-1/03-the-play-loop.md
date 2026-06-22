# The Play Loop & How a Turn Works

In the last chapter you built a room and played it: you typed a command, pressed
Enter, and read a response. This chapter opens the hood on that exchange — what the
engine does in the moment between the player's keystroke and the next prompt. You
won't write any new code here. Understanding the loop is what makes everything
after it make sense.

## The loop

A running Sharpee story is a simple cycle, repeated until the player quits:

1. Show the player where they are and a prompt.
2. Wait for a typed command.
3. Run the **turn** — interpret the command and apply its effects.
4. Show the result.
5. Go back to step 2.

This is the **play loop**, and the engine provides it. You never write it; you
supply the world it operates on. A "turn" is one trip through step 3 — and that
step has more going on inside it than it looks.

## Anatomy of a turn

When the player types `examine sign` and presses Enter, the engine takes that line
through a short pipeline. Each stage hands its result to the next.

### Parse

The **parser** turns the raw text into a structured command — a verb and its noun
phrases. `examine sign` becomes "the examining action, applied to something the
player called *sign*." At this point "sign" is just words; no particular object is
attached yet.

### Resolve scope

Next the engine matches those words to actual entities — and only the ones the
player can currently perceive. This is **scope**: the welcome sign in the room
resolves; an object locked in another room does not. Scope is also what lets the
player call things by their aliases — the `aliases` you put on an `IdentityTrait`
back in Chapter 2. If nothing matches, the turn ends right here with a "you can't
see any such thing" message.

### Run the action — validate, execute, report

With a verb and a resolved object in hand, the matching **action** runs. Every
action — the standard ones, and any you write later — moves through the same
phases:

- **validate** — *can this happen?* Is the sign here, and is it something you can
  examine? If not, the action is **blocked** and reports why.
- **execute** — *change the world,* if anything changes. (Examining changes
  nothing; taking moves an item into your hands.)
- **report** — *record what happened.*

Volume III, *Making It Interactive*, takes these phases apart in detail. For now,
the shape — check, change, report — is all you need.

### Events become text

Here's the part that surprises newcomers: **actions never print anything.**
Instead, the report phase emits **events** — small records of what happened — and
each one carries a *message id*, not a finished sentence:

```typescript
context.event('if.event.taken', {
  messageId: 'if.action.taken.success',
  params: { item: 'brass key' },
});
```

(That snippet is illustrative — the zoo has no brass key. It just shows the
*shape* of an event: a type, a message id, and parameters.)

At the end of the turn the engine's **prose pipeline** takes those events, looks
each message id up in the language layer, and renders the actual words the player
reads.

Why the indirection? Because it keeps every player-facing word in one place. The
same event can be rendered in another language, restyled in different prose, or
suppressed entirely — when a room is dark, a "you see…" event is filtered out
before it ever becomes text (that's *Light & Dark*, later in Volume II). Volume V,
*Words*, is devoted to that language layer.

### Everyone else takes a turn

A turn isn't only the player's. Once the player's action resolves, the rest of the
world gets to move: NPCs act, and timed events — countdowns and background
processes — tick forward. The zookeeper's patrol and the parrot's squawk in Volume
VI happen here. Then the engine shows the turn's result and returns to the prompt.

## One turn, start to finish

Put it together with a single command in the one-room zoo from Chapter 2:

```
> examine sign
```

- **Parse** — the examining action, applied to "sign."
- **Scope** — "sign" resolves to the welcome sign in the room.
- **Action** — examining validates (the sign is here and in scope), executes
  (nothing to change), and reports an event carrying the sign's description.
- **Text** — the engine renders that event into the sign's description, and it
  prints.
- **Other actors** — nothing else lives in this tiny world yet, so the turn ends.
- The prompt returns, and the loop comes back around.

Every command you type follows that same path, whether it's `look`, `take key`, or
a custom verb you invent ten chapters from now.

## Key takeaway

A turn is a short pipeline: parse the text, resolve the words to objects in scope,
run the matching action (validate → execute → report), turn the resulting events
into text, then let NPCs and timed events move. The engine drives this loop; your
job is to supply the world it runs on. Carry one idea forward above the rest:
**actions emit events, not text** — the words are produced later, by the language
layer — and that single separation is what makes a Sharpee story translatable,
restylable, and able to stay quiet in the dark.
