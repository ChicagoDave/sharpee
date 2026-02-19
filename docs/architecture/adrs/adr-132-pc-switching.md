# ADR-132: Player Character Switching

## Status
Proposed

## Context

Reflections requires the player to control three different characters (Thief, Old Man, Girl) at scripted moments during the story. The engine currently has no mechanism for switching the PC mid-game.

## Current Architecture

The engine tracks "who is the player" at three independent layers:

| Layer | API | Set during |
|-------|-----|------------|
| `WorldModel.playerId` | `world.getPlayer()` / `world.setPlayer(id)` | `setStory()` |
| `GameContext.player` | `context.player` (entity ref) | `setStory()` |
| `ActorTrait.isPlayer` | Per-entity boolean flag | `createPlayer()` |

**These are not synchronized.** Changing one does not update the others. All three are set once during `GameEngine.setStory()` and again during `restartGame()`, but nowhere else.

### Existing hooks

- **`ActorTrait.isPlayable`** — Boolean flag separate from `isPlayer`, defaults to `true`. Appears designed for "actors who *could become* the player" but is currently unused by the engine.
- **`ActorTrait.makePlayer()`** — Sets `isPlayer = true` on the trait only. Does not touch `WorldModel` or `GameContext`.
- **`WorldModel.setPlayer(entityId)`** — Updates the world model's canonical reference only. Does not touch `ActorTrait` or `GameContext`.

### What blocks story-level implementation

- `GameEngine.getContext()` returns a spread copy — story code cannot update `context.player`.
- `parser.setWorldContext()` and `updateScopeVocabulary()` are called internally by `executeTurn()` using `context.player` — they cannot be triggered externally.
- Narrative settings (pronouns for 3rd-person narration) are derived from the player entity and are not re-evaluated after initial setup.

## Proposed Solution

Add a `switchPlayer(entityId)` method to `GameEngine` that synchronizes all three layers and resets derived state:

```
switchPlayer(entityId: string): void
  1. Validate: entity exists, has ActorTrait, isPlayable === true
  2. Old PC: set ActorTrait.isPlayer = false
  3. New PC: set ActorTrait.isPlayer = true
  4. WorldModel: call setPlayer(entityId)
  5. GameContext: set context.player = new entity
  6. Parser: call setWorldContext() with new player's location
  7. Vocabulary: call updateScopeVocabulary() for new player
  8. Emit: produce a `pc:switched` event (see Events below)
  9. Narrative: update pronoun settings if in 3rd-person mode
```

### Constraint: between turns only

Switching must happen **between turns**, not mid-action. Mid-action switching would break the pipeline — scope resolution, action context, and event reporting all reference the player who initiated the command. The appropriate call sites are:

- An interceptor's `postExecute()` phase (after the triggering action completes)
- A daemon/fuse callback (runs between player turns)
- A story-specific action's `execute()` phase (the switch *is* the action)

### Calling convention

Story code calls `switchPlayer` from an interceptor or daemon — likely triggered by a scene transition:

```typescript
// In a postExecute interceptor, after a scene-triggering action
engine.switchPlayer('oldMan');
```

**Story code is responsible for positioning the new PC before switching.** If the switch involves teleporting the new character to a specific location, move them first via `world.moveEntity()`, then call `switchPlayer`. Step 6 (parser context) uses the new PC's current location, so the entity must already be where you want them.

### Events

`switchPlayer` emits a `pc:switched` event after completing the sync (step 8). This allows:

- **Story narration**: "You are now the Old Man. You find yourself in the dusty library..."
- **Report service**: Automatically describe the new PC's location
- **Plugins**: React to character transitions (update UI, change music, etc.)

Event shape:

```typescript
{
  type: 'pc:switched',
  data: {
    previousPlayerId: string,
    newPlayerId: string
  }
}
```

### Old PC behavior

When the player switches away from a character, the old PC becomes an **idle actor**. The story decides what happens to them:

- **Freeze in place** (default): The old PC remains where they are with no autonomous behavior. They are still a valid entity in the world and can be interacted with by the new PC if they share a location.
- **Run a daemon/behavior**: The story can attach a daemon that gives the old PC scripted behavior while they are not player-controlled (e.g., the Thief continues to wander and steal).
- **Remove from play**: The story can move the old PC to a limbo location if they should not be interactable.

The engine does not impose a policy here — it only clears `isPlayer` on the old PC. Story code manages the rest.

### Save/restore

`WorldModel.playerId` is serialized via `toJSON()` and restored via `loadJSON()`. However, the other two layers (`GameContext.player` and `ActorTrait.isPlayer`) are reconstructed during `setStory()` / `restartGame()` using the world model's `playerId`.

**Requirement:** The `loadJSON()` → `setStory()` restore path must call the same synchronization logic as `switchPlayer` so that all three layers are consistent after a restore. This can be achieved by having `setStory()` call `switchPlayer(world.getPlayer())` internally, or by extracting the sync steps into a shared private method.

### `isPlayable` enforcement

The engine enforces `isPlayable` as a **precondition in `switchPlayer()` only** (step 1). If the target entity has `isPlayable === false`, the call throws. This prevents accidental switches to NPCs like the troll or the thief — the story controls who is eligible by setting the flag, the engine just respects it.

The engine does **not** enforce `isPlayable` for general NPC interactions. Whether the player can `GIVE SWORD TO OLD MAN` or `TALK TO THIEF` is story-level validation, not an engine concern.
