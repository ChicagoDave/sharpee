# ADR-124: Entity Annotations

## Status: PROPOSED

## Date: 2026-01-30

## Context

### The Problem

ADR-122 proposed an `IllustrationTrait` for attaching presentation metadata (images, styling hints) to entities. During design review, several problems emerged:

1. **Traits are the wrong abstraction.** Traits describe capabilities and behaviors that the action system interacts with (OpenableTrait, ContainerTrait, SwitchableTrait). Illustrations are presentation metadata the engine never touches.

2. **One-per-type constraint.** The trait system uses `Map<TraitType, ITrait>` — each entity can have at most one instance of a given trait type. Illustrations need multiples (a room with both an `on-enter` panorama and an `on-examine` detail image).

3. **Delta save pollution.** Trait state is tracked by the delta save system. Illustration data is mostly static authored config set during `initializeWorld()` — comparing it every save is wasted work.

4. **Future needs beyond illustrations.** Stories will need other presentation hints: actor portraits, voice styling (colored text per character), transcript panel routing for multi-actor stories, map icons for NPC positions, ambient atmosphere indicators. These are all presentation metadata, not game-logic capabilities.

### Goals

- Entities can carry presentation metadata that clients interpret and the engine ignores
- Multiple annotations of the same kind per entity (several illustrations, multiple voice styles)
- Conditional annotations that vary based on game state (different room image after flooding)
- Extensible kind system — new annotation kinds without architecture changes
- Static annotations excluded from delta saves
- Clean separation: annotations declare what's *available*, events declare what's *shown this turn*

### Non-Goals

- Replacing the trait system for anything game-logic related
- Designing specific rendering for every annotation kind (client decides)
- Runtime annotation mutation with save/restore support (defer until needed)

## Decision

### Entity Annotations

A parallel metadata system on entities, separate from traits. Annotations are **presentation hints** — story code declares intent, clients interpret it, the engine passes it through without understanding it.

```typescript
interface Annotation {
  kind: string;            // 'illustration', 'portrait', 'voice', etc.
  id: string;              // unique within entity+kind
  data: Record<string, unknown>;  // kind-specific payload
  condition?: AnnotationCondition;
}

interface AnnotationCondition {
  trait: string;           // trait type to check
  property: string;        // property on that trait
  value: unknown;          // expected value
  scope?: 'self' | 'player' | 'location';  // which entity to check (default: self)
}
```

#### Entity API

```typescript
// Add an annotation
entity.annotate('illustration', {
  id: 'dam-exterior',
  src: 'dam-dry.jpg',
  alt: 'The massive concrete face of Flood Control Dam #3',
  trigger: 'on-enter',
  position: 'right',
});

// Add a conditional annotation
entity.annotate('illustration', {
  id: 'dam-flooded',
  src: 'dam-flooded.jpg',
  alt: 'Water pours over the dam',
  trigger: 'on-enter',
  position: 'right',
  condition: { trait: 'custom', property: 'flooded', value: true },
});

// Query all annotations of a kind
entity.getAnnotations('illustration');  // returns Annotation[]

// Query only annotations whose conditions are met
entity.getActiveAnnotations('illustration', world);  // condition-filtered

// Remove a specific annotation
entity.removeAnnotation('illustration', 'dam-exterior');
```

Storage on the entity: `Map<string, Annotation[]>` keyed by kind. Multiple annotations per kind.

### Annotation Kinds

Annotations are typed but open-ended. Clients render known kinds and ignore unknown ones. The infrastructure supports all kinds equally — only the client interprets kind-specific data.

| Kind | Purpose | Example |
|------|---------|---------|
| `illustration` | Inline images in transcript | Room panorama, object detail |
| `portrait` | Actor/NPC avatar | Sidebar portrait, dialog header |
| `voice` | Text styling per actor | Font color, typeface, CSS class |
| `panel` | Transcript routing | Which panel receives this actor's text |
| `map-icon` | Map marker | NPC position on auto-map |
| `ambient` | Atmosphere hint | Sound icon, weather indicator |

Only `illustration` is implemented initially. The others are designed-for but not built.

### Condition System

Annotations can be conditional — different presentations based on game state. Conditions are pure data (no callbacks), evaluated at query time by checking trait properties on the relevant entity.

```typescript
// Lantern has different images based on switchable state
entity.annotate('illustration', {
  id: 'lantern-lit',
  src: 'lantern-on.jpg',
  trigger: 'on-examine',
  condition: { trait: 'switchable', property: 'isOn', value: true },
});

entity.annotate('illustration', {
  id: 'lantern-off',
  src: 'lantern-off.jpg',
  trigger: 'on-examine',
  condition: { trait: 'switchable', property: 'isOn', value: false },
});
```

**Evaluation rules:**
- No condition → always active
- Condition with `scope: 'self'` (default) → check this entity's trait
- Condition with `scope: 'player'` → check the player entity's trait
- Condition with `scope: 'location'` → check the current room's trait
- Multiple matching annotations → all returned (client decides how to handle)
- No matches → no annotations active

For complex cross-entity conditions beyond this system, story code emits illustration events directly (the `manual` trigger path).

### Event Flow

Illustrations flow through the existing event system. No new action phase is needed — media events are emitted from the `report()` phase alongside text events.

#### Text-to-Image Association

Illustration events carry a `groupId` matching the associated text event's ID, enabling explicit client-side pairing:

```typescript
// In looking action's report phase
const textEvent = context.event('if.event.looked', { ... });
const illustrations = emitIllustrations(room, 'on-enter', textEvent.id, context);
return [textEvent, ...illustrations];
```

#### Shared Helper

```typescript
function emitIllustrations(
  entity: IFEntity,
  trigger: 'on-enter' | 'on-examine' | 'manual',
  groupId: string,
  context: ActionContext
): ISemanticEvent[] {
  const active = entity.getActiveAnnotations('illustration', context.world);
  return active
    .filter(a => a.data.trigger === trigger)
    .map(a => context.event('if.event.illustrated', {
      groupId,
      entityId: entity.id,
      src: a.data.src,
      alt: a.data.alt,
      position: a.data.position ?? 'right',
      width: a.data.width ?? '40%',
    }));
}
```

Called from looking (trigger `on-enter`) and examining (trigger `on-examine`). Story actions call it with trigger `manual` or emit illustration events directly.

#### Re-Illustration on State Change

When game state changes while the player is in a room, the action causing the change is responsible for emitting updated illustration events in its report phase. There is no global re-check mechanism.

| Scenario | Who Emits |
|----------|-----------|
| Enter room | Looking action |
| Examine entity | Examining action |
| Room state changes (flood) | The action/daemon that caused the flood |
| Entity dies (troll) | The killing action |
| Transient effect (explosion) | Story action emits directly, no annotation |

### Transient vs Persistent

- **Annotations** are persistent authored config — set during `initializeWorld()`, static for the life of the game
- **Illustration events** are transient — emitted per-turn, consumed by the client, never stored
- Story actions can emit `if.event.illustrated` directly without any annotation — for one-shot effects (explosions, magical flashes, visions)

### Client Rendering

The client receives illustration events alongside text events in each turn result. It:

1. Groups illustration events with text events via `groupId`
2. Renders paired text+image in an `<div class="illustrated-passage">`
3. Renders unpaired illustrations as standalone image blocks
4. Resolves `src` filenames to blob URLs via the bundle's asset map

CSS classes per ADR-122:
- `.illustration` — base styles (margin, max-width, border-radius)
- `.float-right` / `.float-left` — float with text wrap
- `.center` — centered block, text above and below
- `.full-width` — 100% width block

Player toggle: "Show illustrations" in Settings menu. When off, illustration events are ignored at render time. No upstream changes needed.

CLI clients ignore illustration events or optionally print `[Image: alt text]`.

### Save/Restore

- Annotations are static authored config — part of the baseline, not delta saves
- Conditions reference trait state, which IS captured by delta saves
- After restore, `getActiveAnnotations()` evaluates conditions against restored trait state → correct illustrations automatically
- Runtime annotation mutation (if ever needed) would require extending the save system — deferred

### Asset Lifecycle

- Bundle load extracts all `assets/*` files as blob URLs into `bundle.assets` map
- Loading a second story warns the player and clears all state — no overlapping blob URLs
- `releaseBundle()` revokes all blob URLs on story unload
- Transcript is cleared on new story load, so historical image references don't outlive their blob URLs

## Consequences

### Positive

- **Clean separation** — presentation metadata doesn't pollute the game-logic trait system
- **Multiple per entity** — no one-per-type constraint, natural for illustrations
- **No save overhead** — static annotations excluded from delta comparisons
- **Extensible** — new annotation kinds (portrait, voice, panel, map-icon) require no infrastructure changes
- **Pure data conditions** — no callbacks, serializable, evaluable at any time
- **Familiar event flow** — illustration events use the same event system as text, no new phases or pipelines

### Negative

- **New concept** — annotations are a parallel system to traits, adding cognitive load for story authors
- **Condition limitations** — pure data conditions can't express complex logic (multiple traits, OR conditions, computed values). Story code must emit events directly for those cases.
- **Re-illustration is manual** — the action causing a state change must remember to emit updated illustrations. No automatic re-check means a missed call = stale image.

### Neutral

- Supersedes the `IllustrationTrait` design in ADR-122. ADR-122's rendering and story styling decisions remain valid — this ADR changes only the data model and event source.
- Annotations are invisible to the engine, stdlib, and language layer. Only world-model (storage) and clients (rendering) are aware of them.

## References

- ADR-122: Rich Media and Story Styling (rendering, CSS scoping, player preferences — still valid)
- ADR-090: Entity-Centric Action Dispatch (trait/behavior system this intentionally avoids)
- ADR-051: Four-Phase Action Pattern (report phase emits illustration events)
