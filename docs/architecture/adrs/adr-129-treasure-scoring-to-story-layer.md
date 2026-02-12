# ADR-129: Transactional Score Ledger and Treasure Scoring Split

## Status: PROPOSED

## Date: 2026-02-12

## Context

Sharpee's scoring system has three problems:

### 1. TreasureTrait conflates platform and story concerns

TreasureTrait lives in `packages/world-model/src/traits/treasure/` (platform level) with two fields that have different scopes:

- `treasureValue` (MDL: OFVAL) — "points for taking." This is a general IF concept: items have inherent value. Many IF games award points for acquiring key items, not just Zork.
- `trophyCaseValue` (MDL: OTVAL) — "points for placing in trophy case." This is Zork-specific. It assumes a specific game mechanic (a scoring container) that other stories may not have.

Bundling both into one platform trait forces every story into Zork's two-value scoring model.

### 2. ScoringEventProcessor misuses the event system

The `ScoringEventProcessor` registers handlers on `if.event.taken` and `if.event.put_in` to react to actions after the fact. This is architecturally wrong:

- Domain events describe what happened — they are not hooks for side effects
- Scoring is a mutation (changing the score) that belongs in the action execution flow
- The handler approach creates hidden coupling: the taking action doesn't know scoring happens, and the scoring code doesn't know which action triggered it

### 3. ScoringService is over-engineered

The current `ScoringService` requires pre-registered `ScoringDefinition` objects (with `points`, `reasonMessageId`, `category`), a capability-based data store, rank definitions, and a `ScoringEventProcessor` with callbacks and dynamic treasure detection. All of this to increment a number.

### 4. The thief depends on trophyCaseValue in story code

The thief's deposit logic filters by `trophyCaseValue > 0` to decide which items to deposit at his lair (matching MDL's `OTVAL > 0` check). This is story code reaching into a platform trait for a story-specific field.

## Decision

Replace the scoring service with a transactional score ledger on the world model, and split treasure concerns between platform and story.

### Platform: Transactional Score Ledger on WorldModel

The world model stores a list of score entries — a ledger, not a running total. Each entry has a unique ID for deduplication, a point value, and an author-provided description.

```typescript
// Score entry — one per scoring event
interface ScoreEntry {
  id: string;          // Unique key (also prevents double-scoring)
  points: number;      // Points awarded
  description: string; // Author-provided note for FULL SCORE display
}

// WorldModel API
world.awardScore(id: string, points: number, description: string): boolean
world.revokeScore(id: string): boolean
world.hasScore(id: string): boolean
world.getScore(): number              // Sum of all entries
world.getScoreEntries(): ScoreEntry[] // For save/restore/FULL SCORE display
world.setMaxScore(max: number): void
world.getMaxScore(): number
```

- `awardScore` returns `false` if the ID already exists (deduplication).
- `revokeScore` removes an entry (e.g., thief steals from trophy case).
- `getScore()` sums all entries — no cached running total to get out of sync.
- `getScoreEntries()` enables a `FULL SCORE` command that lists every scored item.
- `maxScore` is a simple property for "Your score is X out of Y" display.

### Platform: Add `points` and `pointsDescription` to IdentityTrait

IdentityTrait already lives on every entity and describes "what is this thing." Adding optional scoring fields extends this to "what is this thing worth when acquired."

```typescript
// IdentityTrait (platform — packages/world-model)
export class IdentityTrait implements ITrait {
  name: string;
  aliases?: string[];
  description?: string;
  properName?: boolean;
  article?: string;
  concealed?: boolean;
  scenery?: boolean;
  points?: number;             // Points awarded when player first takes this item
  pointsDescription?: string;  // Description for score ledger (defaults to name)
}
```

The stdlib taking action checks `identity.points` in its execute phase:

```typescript
// In stdlib taking action execute phase
const identity = entity.get(IdentityTrait);
if (identity?.points) {
  context.world.awardScore(
    entity.id,
    identity.points,
    identity.pointsDescription ?? identity.name
  );
}
```

No scoring service needed. The action calls `world.awardScore()` directly — the world model is already available on every `ActionContext`. Deduplication is automatic (taking the sword twice doesn't double-score).

### Story: TreasureTrait moves to Dungeo

The Zork-specific trophy case fields move to a story-level trait:

```typescript
// TreasureTrait (story — stories/dungeo/src/traits/)
export class TreasureTrait implements ITrait {
  static readonly type = 'dungeo.trait.treasure' as const;

  trophyCaseValue: number;            // Points for placing in trophy case (MDL: OTVAL)
  trophyCaseDescription?: string;     // Description for score ledger
}
```

No `treasureId` needed — the world's score ledger uses entity IDs directly.

The thief's deposit logic (`trophyCaseValue > 0`) becomes a clean same-package dependency.

### Story: Trophy Case Scoring via Putting Interceptor

Trophy case scoring uses the existing interceptor system (ADR-118). The trophy case entity gets a `TrophyCaseTrait`, which binds to the putting action's `postExecute` hook.

```typescript
// 1. TRAIT — stories/dungeo/src/traits/trophy-case-trait.ts
export class TrophyCaseTrait implements ITrait {
  static readonly type = 'dungeo.trait.trophy_case' as const;
}

// 2. INTERCEPTOR — stories/dungeo/src/interceptors/trophy-case-putting.ts
export const TrophyCasePuttingInterceptor: ActionInterceptor = {
  postExecute(entity, world, actorId, sharedData) {
    const itemId = sharedData.itemId as string;
    const item = world.getEntity(itemId);
    const treasure = item?.get(TreasureTrait);
    if (treasure?.trophyCaseValue) {
      world.awardScore(
        `trophy:${itemId}`,
        treasure.trophyCaseValue,
        treasure.trophyCaseDescription ?? `Displayed the ${item.identity.name}`
      );
    }
  }
};

// 3. REGISTRATION — stories/dungeo/src/index.ts (in initializeWorld)
registerActionInterceptor(
  TrophyCaseTrait.type,
  'if.action.putting',
  TrophyCasePuttingInterceptor
);

// 4. ENTITY — trophy case gets the trait
trophyCase.add(new TrophyCaseTrait());
```

The flow when the player types `put egg in trophy case`:

1. Putting action finds interceptor via `getInterceptorForAction(trophyCase, 'if.action.putting')`
2. Standard validation runs (is it a container, is it open, etc.)
3. Standard execute runs (`world.moveEntity(egg, trophyCase)`)
4. `postExecute` hook fires — checks egg for `TreasureTrait`, calls `world.awardScore()`
5. Standard report emits `if.event.put_in`

Scoring stays in the action execution flow. No event handlers.

### Story Setup Example

```typescript
// Creating a treasure in Dungeo
egg.add(new IdentityTrait({
  name: 'jewel-encrusted egg',
  points: 5,                                   // Platform: 5 points for taking
  pointsDescription: 'Took the jewel-encrusted egg',
}));
egg.add(new TreasureTrait({
  trophyCaseValue: 10,                          // Story: 10 points for trophy case
  trophyCaseDescription: 'Displayed the jewel-encrusted egg',
}));

// Score ledger after taking and displaying the egg:
// [
//   { id: 'egg',        points: 5,  description: 'Took the jewel-encrusted egg' },
//   { id: 'trophy:egg', points: 10, description: 'Displayed the jewel-encrusted egg' },
// ]
// world.getScore() → 15
```

### Two Author Scenarios

**Scenario 1: Built-in scoring (simple story)**

Author just sets `points` on IdentityTrait. No traits, no interceptors, no services.

```typescript
sword.add(new IdentityTrait({ name: 'sword', points: 10 }));
// Player takes sword → world.awardScore('sword', 10, 'sword')
// Done. Score is 10.
```

**Scenario 2: Custom scoring (Dungeo-style)**

Author uses `IdentityTrait.points` for take-scoring (handled by stdlib) and adds story-level mechanics for everything else. No conflict — the two compose via different score ledger IDs.

```typescript
// Take-scoring: stdlib handles via IdentityTrait.points
// Trophy case: story interceptor on putting action
// Achievements: story code calls world.awardScore() directly
world.awardScore('thief-killed', 25, 'Killed the thief');
// Thief logic: world.hasScore(entity.id) to check which treasures player has found
```

### Remove ScoringService and ScoringEventProcessor

The `ScoringService`, `ScoringEventProcessor`, and platform-level `TreasureTrait` are all replaced by the world model's score ledger. The entire `packages/stdlib/src/services/scoring/` directory can be removed.

Stories that need ranks (score thresholds mapped to titles) compute them from `world.getScore()` in their scoring action — this is story-specific display logic, not platform infrastructure.

## Consequences

### Positive

- **Dead simple**: Scoring is a list of `(id, points, description)` on the world model. No services, no capabilities, no event handlers.
- **Self-documenting**: Every score entry has a description. A `FULL SCORE` command just iterates the ledger.
- **Clean layer split**: Platform owns "items have value" (`IdentityTrait.points`) and the score ledger. Story owns specific mechanics (trophy case, achievements).
- **Composable**: Built-in take-scoring and custom scoring use the same primitive (`world.awardScore`). Different ID conventions prevent conflicts.
- **Correct event usage**: Scoring happens in action execute phases (taking, putting interceptor), not via domain event listeners.
- **Reversible**: `world.revokeScore()` enables loss mechanics (thief steals from trophy case).
- **Thief logic simplified**: `world.hasScore(entity.id)` replaces separate `takenTreasures[]` tracking.

### Negative

- **IdentityTrait grows**: Adding `points` and `pointsDescription` increases its surface area. Both are optional and default to undefined.
- **Two places to set scoring**: Dungeo treasures set `points` on IdentityTrait AND `trophyCaseValue` on TreasureTrait. Intentional — the two concepts live at different layers.
- **No built-in ranks**: Stories that want rank display ("Beginner", "Expert") must implement their own threshold logic. This is trivial (`if (score >= 200) ...`) and story-specific.
- **Migration work**: Region files that use `TreasureTrait.treasureValue` must migrate to `IdentityTrait.points`.

### Migration Scope

**Platform changes:**
- `packages/world-model/src/world/` — add score ledger API (`awardScore`, `revokeScore`, `hasScore`, `getScore`, `getScoreEntries`, `setMaxScore`, `getMaxScore`)
- `packages/world-model/src/traits/identity/` — add optional `points` and `pointsDescription` properties
- `packages/world-model/src/traits/treasure/` — delete
- `packages/world-model/src/traits/all-traits.ts` — remove TreasureTrait registration
- `packages/stdlib/src/actions/standard/taking/` — add `world.awardScore()` call in execute phase
- `packages/stdlib/src/services/scoring/` — delete (ScoringService, ScoringEventProcessor)

**Story changes:**
- `stories/dungeo/src/traits/treasure-trait.ts` — new file with story-level TreasureTrait (`trophyCaseValue` only)
- `stories/dungeo/src/traits/trophy-case-trait.ts` — new file
- `stories/dungeo/src/interceptors/trophy-case-putting.ts` — new putting interceptor
- `stories/dungeo/src/scoring/` — replace DungeoScoringService with simple `world.awardScore()` calls
- `stories/dungeo/src/npcs/thief/` — use `world.hasScore(entity.id)` instead of `takenTreasures[]`
- All region files creating treasures — set `points` on IdentityTrait, update TreasureTrait to new shape

## Alternatives Considered

### Keep ScoringService, just simplify it

Add `awardOnce(entityId, points)` to the existing service. But the service requires capability setup, injection into action context (which doesn't currently support services), and pre-registered definitions. The score ledger on the world model eliminates all of this.

### Keep everything in TreasureTrait, just move it to story

Simpler migration but loses the insight that take-scoring is platform-generic. Every story would need to reinvent take-scoring from scratch.

### Event handler for trophy case scoring

A simple `if.event.put_in` handler calling `world.awardScore()` instead of an interceptor. Works, but scoring should happen in the action execution flow. The interceptor's `postExecute` runs during the putting action's execute phase — the event handler runs after the entire action completes.

### Add points to entity attributes instead of IdentityTrait

Using `entity.attributes.points = 5` instead of `identity.points`. Works but loses type safety and discoverability. IdentityTrait is the natural home for "what is this thing worth."

## References

- ADR-051: Four-Phase Action Pattern
- ADR-090: Entity-Centric Action Dispatch (capability behaviors)
- ADR-118: Action Interceptors (before/after hooks)
- MDL source: `docs/dungeon-81/mdlzork_810722/act1.254` (OFVAL/OTVAL treasure values)
