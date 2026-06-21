::: {.part-page .has-poem}

# Volume III — Making It Interactive {.part .unnumbered}

| He drew a circle that shut me out—
| Heretic, rebel, a thing to flout.
| But Love and I had the wit to win:
| We drew a circle that took him in!

*— Edwin Markham, "Outwitted" (1915)*
:::

# The Standard Actions & the Four-Phase Model

So far the zoo has been a place to *be*: rooms to walk through, objects to examine,
containers to open. Everything the player could do already worked — `take`, `drop`,
`open`, `go`, `examine` — and you never wrote a line of code to make it so. This
volume is about how a world *responds*, and it starts with the machinery you've been
leaning on all along: the standard action library, and the four-phase model every
action in Sharpee obeys.

## The verbs you got for free

Sharpee's standard library (`@sharpee/stdlib`) ships a full vocabulary of
interactive-fiction verbs. The moment you created a room and an object, the player
could already act on them. The standard actions fall into three groups:

- **World-changing actions** alter the game state: `take` and `drop`, `open` and
  `close`, `go`, `put` and `insert`, `lock` and `unlock`, `switch on`/`off`,
  `wear` and `remove`, `eat` and `drink`, `push`, `pull`, `give`, `enter` and
  `exit`.
- **Query actions** only look: `examine`, `look`, `read`, `search`, `inventory`.
  They report what's there without changing anything.
- **Meta actions** speak to the game rather than the world: `save`, `restore`,
  `quit`, `wait`, `again`, `help`, `score`.

You don't register any of these; they come with the platform, wired to the traits
you've already met. `OpenableTrait` is what makes `open` work on the lunchbox;
`SwitchableTrait` is what makes `switch on` work on the flashlight. Add the trait,
and the matching verb lights up. (The full catalog lives in Appendix B.)

## One shape for every action

Every action — the standard ones above, and the custom ones you'll write in Volume
IV — has the same four-part structure. Chapter 3 sketched it as "check, change,
report"; here is the whole contract:

```typescript
const someAction: Action = {
  id: 'if.action.taking',

  validate(context): ValidationResult { /* can this happen? */ },
  execute(context): void           { /* change the world */ },
  report(context): ISemanticEvent[]  { /* record what happened */ },
  blocked(context, result): ISemanticEvent[] { /* explain the refusal */ },
};
```

The engine calls these in a fixed order, and each has exactly one job.

### validate — can this happen?

`validate` is the gatekeeper. It checks preconditions and returns either
`{ valid: true }` or `{ valid: false, error: '...' }`. Taking something checks that
it's here, that it's not already in your hands, that it's not scenery bolted to the
floor. `validate` decides; it never changes anything.

### execute — change the world

If validation passed, `execute` runs and performs the actual mutation — moving the
item into the player's inventory, flipping `isOpen` to `true`. This is the *only*
phase that changes game state, and it's meant to be small: the real work usually
lives in a **behavior** (more on those in Volume IV), with `execute` just
coordinating it.

### report — record what happened

`report` produces the **events** for the turn — the `if.event.taken`,
`if.event.opened` records you met in Chapter 3, each carrying a message id rather
than text. It generates events; it doesn't mutate. Anything `execute` learned that
`report` needs is handed forward through `context.sharedData`, never smuggled onto
the context itself.

### blocked — explain the refusal

If `validate` returns `{ valid: false }`, the engine skips `execute` and `report`
and calls `blocked` instead. Its job is to turn the validation error into an event
the player can understand — "You can't take that." A refused action is still a
complete, well-formed turn; it simply reports a different outcome.

## Why the discipline matters

Splitting an action into four phases with strict rules — *mutations only in
execute, events only in report* — is not bureaucracy. It's what makes the whole
system predictable and extensible:

- **Validation can be trusted.** Because `validate` never changes anything, the
  engine can ask "would this work?" without side effects — which is how the parser
  can disambiguate and how a command can be checked before it commits.
- **Every action reads the same way.** Learn the shape once and you can read any
  action in the library, and write your own that slots in beside them.
- **The world stays inspectable.** State changes happen in one phase; the record of
  them happens in another. That clean seam is what lets event handlers (Chapter 13)
  react to what an action did, and what makes saved games and replays reliable.

You won't write an action in this chapter — the standard library already covers the
zoo. But the four-phase model is the backbone of everything ahead: custom actions in
Chapter 14 fill in all four phases by hand, capability dispatch in Chapter 15
delegates them per entity, and event handlers in Chapter 13 hang new consequences
off the events `report` emits.

## Key takeaway

The standard library gives you a complete set of IF verbs for free, each wired to
the traits you add to entities — no registration required. Behind every verb is the
same four-phase contract: **validate** (can it happen?), **execute** (change the
world), **report** (record what happened as events), and **blocked** (explain a
refusal). Mutations live only in `execute`, events only in `report`, and data passes
between them through `context.sharedData`. That single, uniform shape is what makes
Sharpee actions predictable to read, safe to validate, and ready to extend.
