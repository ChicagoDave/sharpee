# Version 6: Openable Things

## What This Version Does

The feed dispenser at the petting zoo and a lunchbox on the main path can now be opened and closed. You must open them before you can see or access what's inside.

## What's New (Compared to V5)

V5 introduced containers you could freely put things in. V6 adds a closed state — containers that must be opened first.

## What You'll Learn

### OpenableTrait

OpenableTrait gives an entity an open/closed state. The player can use the built-in `open` and `close` actions to change it.

```typescript
lunchbox.add(new OpenableTrait({
  isOpen: false,          // Starts closed
  canClose: true,         // Player can close it again
  revealsContents: true,  // Opening shows what's inside
}));
```

By itself, OpenableTrait just tracks whether something is open or closed. Its power comes from combining it with other traits.

### OpenableTrait + ContainerTrait

When an entity has BOTH OpenableTrait and ContainerTrait:

- **Closed container**: contents are hidden. `look in lunchbox` says it's closed. `put map in lunchbox` is blocked.
- **Open container**: contents are visible. All container operations work normally.

This is how you create discoverable containers — the player opens something and finds items inside.

### Key Properties

| Property | Default | What It Does |
|----------|---------|-------------|
| `isOpen` | `false` | Current state — open or closed |
| `canClose` | `true` | Whether the player can close it again after opening |
| `revealsContents` | `true` | Whether opening shows "Inside you can see..." |

### Placing Items in Closed Containers

During world setup, you might need to place items inside a container that starts closed. The engine normally blocks `put X in Y` when Y is closed. The workaround is to temporarily open the container:

```typescript
lunchbox.get(OpenableTrait)!.isOpen = true;   // Temporarily open
world.moveEntity(juice.id, lunchbox.id);       // Place item inside
lunchbox.get(OpenableTrait)!.isOpen = false;   // Close it back
```

### Future Combinations

OpenableTrait becomes even more powerful in V7 when combined with LockableTrait — creating locked containers and doors that must be unlocked before they can be opened.

## Commands to Try

```
> south                     Go to Main Path
> examine lunchbox          It's closed
> open lunchbox             Open it — "Inside you can see a juice box"
> take juice                Take the juice box
> close lunchbox            Close it again
> east                      Go to Petting Zoo
> open dispenser            Open the feed dispenser
> take dispenser            Can't — it's scenery
```

## The Code

See `src/v06.ts` for the complete, commented source.

## Key Takeaway

OpenableTrait adds open/close state. Combined with ContainerTrait, it creates containers that hide their contents until opened. The `open` and `close` actions are built into stdlib.
