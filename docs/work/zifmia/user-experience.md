# Zifmia Rich Media & Story Styling Plan

Implements ADR-122 with a broader **Entity Annotation** system instead of IllustrationTrait. Annotations are a presentation hint layer — story code declares intent, clients interpret it, the engine passes it through without understanding it.

## Design Decisions

### Annotations, Not Traits

Illustrations (and future presentation metadata) do NOT belong in the trait system because:

- Traits describe **capabilities and behaviors** the action system interacts with
- Illustrations are **presentation metadata** the engine never touches
- Trait system is one-per-type (`Map<TraitType, ITrait>`) — illustrations need multiple per entity
- Illustration data is mostly static authored config, not game state — shouldn't pollute delta saves

**Entity Annotations** are a parallel metadata system on entities, purpose-built for client-facing presentation hints.

### Annotation Kinds

Annotations are **typed but open-ended**. Each has a `kind` and kind-specific data. Clients render known kinds and ignore unknown ones. First kind: `illustration`. Future kinds designed-for but not yet implemented:

| Kind | Purpose | Example |
|------|---------|---------|
| `illustration` | Inline images in transcript | Room panorama, object detail |
| `portrait` | Actor/NPC avatar | Sidebar portrait, dialog header |
| `voice` | Text styling per actor | Font color, typeface, CSS class |
| `panel` | Transcript routing | Which panel text appears in |
| `map-icon` | Map marker | NPC position on auto-map |
| `ambient` | Atmosphere hint | Sound icon, weather indicator |

The annotation infrastructure supports all of these. Only `illustration` ships in v1.

### Condition System

Annotations can be **conditional** — different presentations based on game state. Conditions reference entity state as pure data (no callbacks):

```typescript
// Static — always shown
entity.annotate('illustration', {
  id: 'dam-exterior',
  src: 'dam-dry.jpg',
  alt: 'The massive concrete face of Flood Control Dam #3',
  trigger: 'on-enter',
  position: 'right',
});

// Conditional — shown only when entity state matches
entity.annotate('illustration', {
  id: 'dam-flooded',
  src: 'dam-flooded.jpg',
  alt: 'Water pours over the dam',
  trigger: 'on-enter',
  position: 'right',
  condition: { trait: 'custom', property: 'flooded', value: true },
});

// Conditional — lantern states
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

**Evaluation**: When emitting illustration events, the annotation helper checks each annotation's condition against the entity's current trait state. First match wins (ordered by annotation insertion order, or explicit priority).

**Player state conditions** (e.g., room looks different in the dark): use a special condition form:
```typescript
condition: { scope: 'player', trait: 'inventory', check: 'hasLightSource' }
```
Or defer to story code emitting manual illustration events for complex cross-entity conditions.

### Re-Illustration Triggers

When game state changes while the player is in a room, illustrations may need updating. Scenarios:

| Scenario | Trigger | Mechanism |
|----------|---------|-----------|
| Enter room | Looking action fires | Report phase emits illustration events |
| Examine entity | Examining action fires | Report phase emits illustration events |
| Room state changes (flood) | Story action/daemon | Action's report phase re-checks annotations for current room |
| Entity state changes (troll dies) | Kill action completes | Report phase emits updated illustrations |
| Transient event (explosion) | One-shot | Action directly emits `if.event.illustrated` — no annotation needed |

**Key principle**: The action that causes the state change is responsible for emitting updated illustration events in its report phase. There is no global "re-check all annotations" mechanism — that would be fragile and over-engineered. A helper function `emitIllustrations(entity, trigger, context)` makes this easy for any action to call.

### Text-to-Image Association

Illustration events carry a `groupId` that matches the associated text event's ID. The client uses this to pair images with their text blocks for correct layout (float alongside the right paragraph).

```typescript
// In report phase
const textEvent = context.event('if.event.looked', { ... });
const illustrationEvent = context.event('if.event.illustrated', {
  groupId: textEvent.id,  // explicit pairing
  src: 'dam-exterior.jpg',
  alt: '...',
  position: 'right',
  width: '45%',
});
return [textEvent, illustrationEvent];
```

### Transient vs Persistent

- **Annotations** are persistent authored config on entities — static presentation hints
- **Illustration events** are transient — emitted per-turn, consumed by the client, not stored
- Story actions can emit illustration events directly without any annotation (explosions, magical effects, one-shots)
- This is clean separation: annotations declare what's *available*, events declare what's *shown this turn*

### Asset Lifecycle

- Bundle load creates blob URLs for all assets in `bundle.assets`
- Loading a second story **warns the player** that current game state will be lost, then clears everything
- `releaseBundle()` revokes all blob URLs — no overlaps, no leaks
- Images in transcript history: blob URLs remain valid until bundle release (transcript is cleared on new story load anyway)

### Story CSS

- Authors can override anything — their responsibility to test
- Error states (missing assets, malformed CSS) are the author's problem
- Runner scopes story CSS to `#story-content` via `@scope` but does not sanitize

### Save/Restore

- Annotations are **static authored config** — they're set during `initializeWorld()` and don't change
- Therefore they're part of the baseline, not delta saves — no serialization overhead
- If story code mutates annotations at runtime (rare), that would need save/restore support — defer this until needed
- Conditions reference trait state, which IS saved — so conditional illustrations restore correctly automatically

### Future: Reflections Multi-Actor (Not In Scope)

The annotation system is designed to support future multi-actor presentation:
- `voice` annotations per actor → colored text, typeface per character
- `panel` annotations → route text to separate transcript panels
- `portrait` annotations → actor avatar in sidebar/header
- Perspective shifts → emit a presentation event on actor switch

None of this is implemented now, but the annotation infrastructure doesn't preclude it.

---

## Implementation Phases

### Phase 1: Annotation Infrastructure (world-model — platform change)

**Files:**
- `packages/world-model/src/annotations/annotation.ts` — types and interfaces
- `packages/world-model/src/annotations/index.ts` — exports
- `packages/world-model/src/entities/if-entity.ts` — add annotation support

```typescript
interface Annotation {
  kind: string;          // 'illustration', 'portrait', 'voice', etc.
  id: string;            // unique within entity+kind
  data: Record<string, unknown>;  // kind-specific payload
  condition?: AnnotationCondition;
}

interface AnnotationCondition {
  trait: string;
  property: string;
  value: unknown;
  // OR for cross-entity:
  scope?: 'self' | 'player' | 'location';
}

// On IFEntity:
annotate(kind: string, entry: { id: string; [key: string]: unknown }): void;
getAnnotations(kind: string): Annotation[];
getActiveAnnotations(kind: string, world: WorldModel): Annotation[];  // condition-filtered
removeAnnotation(kind: string, id: string): void;
```

Storage: `Map<string, Annotation[]>` keyed by kind. Multiple annotations per kind allowed.

### Phase 2: Illustration Event Emission (stdlib)

**Files:**
- `packages/stdlib/src/actions/shared/illustration-helper.ts` — shared helper
- `packages/stdlib/src/actions/standard/looking/looking-action.ts` — call helper in report phase
- `packages/stdlib/src/actions/standard/examining/examining-action.ts` — call helper in report phase

```typescript
// illustration-helper.ts
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

Looking action calls `emitIllustrations(room, 'on-enter', textEvent.id, context)`.
Examining action calls `emitIllustrations(target, 'on-examine', textEvent.id, context)`.

### Phase 3: Asset Map Plumbing (Zifmia)

**Files:**
- `packages/zifmia/src/context/GameContext.tsx` — add `assetMap: Map<string, string>` to context
- `packages/zifmia/src/runner/index.tsx` — pass `bundle.assets` into GameContext

### Phase 4: Client Illustration Rendering (Zifmia)

**Files:**
- `packages/zifmia/src/components/transcript/Transcript.tsx` — handle `if.event.illustrated`
- `packages/zifmia/src/styles/themes.css` — illustration CSS classes

Transcript renderer:
1. Receives turn events (text + illustration)
2. Groups illustration events with their text events via `groupId`
3. Renders `<div class="illustrated-passage">` wrapping paired text + image
4. Unpaired illustrations render as standalone image blocks

CSS classes per ADR-122:
- `.illustration` — base (margin, max-width: 100%, border-radius)
- `.float-right` / `.float-left` — float with text wrap
- `.center` — centered block
- `.full-width` — 100% width block

Player toggle: "Show illustrations" in Settings menu → localStorage, skip rendering when off.

### Phase 5: Story CSS Scoping (Zifmia)

**Files:**
- `packages/zifmia/src/components/GameShell.tsx` — inject scoped story CSS, wrap content in `#story-content`
- `packages/zifmia/src/runner/index.tsx` — pass `themeCSS` from bundle

Scoping via CSS `@scope (#story-content) { ... }`. Authors can override anything inside the story content area. Runner chrome (menus, dialogs) lives outside `#story-content`.

### Phase 6: Player Preferences (Zifmia)

**Files:**
- `packages/zifmia/src/hooks/useTheme.ts` — respect `metadata.preferredTheme`
- `packages/zifmia/src/components/menu/MenuBar.tsx` — Settings menu additions
- `packages/zifmia/src/types/story-metadata.ts` — add `preferredTheme?: string`

Settings:
- Show illustrations toggle
- Use story theme toggle
- Font size override (+/-)
- High contrast mode

Override cascade: Runner defaults → Story preferredTheme → Story theme.css → Player preferences

### Phase 7: CLI Graceful Degradation

CLI already ignores unknown events. Verify no crash. Optionally print `[Image: alt text]` for illustration events.

---

## Implementation Order

1. **Phase 1** — Annotation infrastructure (platform change — discuss/approve first)
2. **Phase 2** — Illustration event emission from looking/examining
3. **Phase 3** — Asset map plumbing
4. **Phase 4** — Client rendering
5. **Phase 5** — Story CSS scoping
6. **Phase 6** — Player preferences
7. **Phase 7** — CLI fallback

## Verification

1. **Unit test**: Entity with illustration annotations, looking action → illustration event emitted with correct groupId
2. **Conditional test**: Entity with two conditional illustrations, verify correct one emits based on trait state
3. **Integration test**: Load `.sharpee` bundle with `assets/test.jpg` and `theme.css`:
   - Image renders in transcript with correct float layout
   - Story CSS applies inside `#story-content` only
   - Runner chrome unaffected by story CSS
4. **State change test**: Change entity state mid-room, verify illustration updates on next action
5. **Preference test**: Toggle illustrations off → images disappear. Toggle story theme off → story CSS removed.
6. **CLI test**: Run story with illustrations in CLI → no crash, optional `[Image: alt]` output
7. **Build**: `./build.sh -s dungeo` and `./build.sh --runner -s dungeo` both succeed
8. **Save/restore**: Save game with conditional illustrations active, restore, verify correct illustrations show
