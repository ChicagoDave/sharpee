# Saving & Restoring: State Lives in the World

A full play of the zoo runs to dozens of turns across two acts. Players will want to
stop and come back. So how do you make the zoo saveable? The happy answer is the
theme of this whole book: mostly, you don't, because the architecture already did it. This
chapter explains why, and pins down the one case where you *do* write save code.

## State lives in the world, so it saves itself

Every meaningful thing that changes during play lives in the **world model**: where
the player is, what's in their inventory, which animals you've fed (the `fed-…` state
flags), whether the zoo has closed (`zoo.after_hours`), and the scoring ledger from
Volume VI. When the engine saves, it serializes the *entire* world into a single
`ISaveData`, a complete snapshot carried in a compressed `worldSnapshot`.

Because your game state is *in* the world rather than in loose variables scattered
through your code, restoring is just rebuilding the world from that snapshot. Score,
entity positions, container contents, state flags, relationships, the ID counters:
all of it comes back, because all of it was in the world to begin with. The author
who kept state in the world (as every earlier chapter taught) gets save/restore for
free.

## The one thing you must save yourself

There is exactly one trap, and the `ch28-multi-file/` snapshot already walks into it
on purpose so you can see the fix. The after-hours **behavior swap** daemon keeps a local flag so it only fires
once:

```typescript
let behaviorSwapped = false;
scheduler.registerDaemon({
  id: 'zoo.daemon.parrot_behavior_swap',
  condition: (ctx) => !behaviorSwapped && ctx.world.getStateValue('zoo.after_hours') === true,
  run: () => {
    behaviorSwapped = true;
    npcService.removeBehavior('zoo-parrot');
    npcService.registerBehavior(parrotAfterHoursBehavior);
    return [];
  },
  // …
});
```

That `behaviorSwapped` variable lives in a closure, **not** in the world, so the
world snapshot doesn't capture it. Save after the swap, restore, and a naïve daemon
would think the swap hadn't happened and try to run again. The daemon avoids that by
implementing two hooks:

```typescript
  getRunnerState(): Record<string, unknown> { return { behaviorSwapped }; },
  restoreRunnerState(state): void { behaviorSwapped = (state.behaviorSwapped as boolean) ?? false; },
```

`getRunnerState` hands the engine the transient flag to fold into the save;
`restoreRunnerState` reads it back. That's the rule: **any state you hold outside the
world (a counter in a closure, a flag on a daemon) you must surface through these
hooks, or it won't survive a save.** The cleaner your story keeps its state in the
world, the less of this you write.

## How the browser persists a save

The engine produces the `ISaveData`; the *client* decides where to put it. In the
browser client from Volume VII, a save is wrapped in a `BrowserSaveEnvelope`,
the engine snapshot plus a little browser-only metadata (the visible score, the
scrollback transcript), and written to `localStorage`. Two paths use it:

- **Manual save/restore** through the menu, into named slots.
- **Autosave**, which piggy-backs on the per-turn channel packet: every turn boundary
  fires `channel:packet`, so the client captures a fresh autosave each turn with no
  story code at all. Re-open the page and the autosave restores you mid-game.

Restoring reverses the wrap: the client unwraps the envelope and hands the engine
snapshot back, and the engine rebuilds the world from it, which is why the
post-restore status line and score are correct without the client recomputing
anything.

The player-facing prose around these operations ("Saved.", "Restored.", "Previous
turn undone.") renders from the language layer's `platform.*` messages, so a story
can re-voice any of it with a same-id `addMessage` in `extendLanguage`, exactly
like any other message.

## Save formats change with a version

A save is a serialized snapshot, and snapshots have a shape. The envelope carries a
version field precisely so that a future change to the format can be *read* rather
than silently misinterpreted: a newer client can recognize an older save and refuse
or adapt instead of loading garbage. As an author you don't manage this, but it's
worth knowing the format is versioned: a save written by one build won't be
mistaken for a different shape by the next.

## Key takeaway

Save and restore come almost free because game state lives in the **world**: the
engine serializes the whole thing into one `ISaveData` that rebuilds on restore,
score and positions and flags and all. The one thing you handle yourself is
**transient state held outside the world**: a closure flag or daemon counter is
invisible to the snapshot, so expose it through
`getRunnerState`/`restoreRunnerState`, as the `ch28-multi-file/` snapshot's
behavior-swap daemon does. In the
browser, saves are versioned `localStorage` envelopes, autosaved every turn. With
the game tested and persistable, it's time to hand it to players: building and
publishing.
