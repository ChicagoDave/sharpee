# ADR-091: Graphical Client Architecture

## Status

Proposed

## Date

2026-01-14

## Context

Sharpee currently outputs semantic events that a language layer converts to text. The terminal client renders this text. However, interactive fiction has a rich history of multimedia support:

- **Hugo** (1995) — Built-in graphics, sound, music commands in the interpreter
- **TADS 3** — HTML TADS with embedded multimedia
- **Inform 7 + Vorple** — Web-based multimedia via JavaScript injection
- **Twine/ChoiceScript** — Fully graphical web-based presentation

We want to enable graphical clients for Sharpee that support:
- Images (room illustrations, object icons, portraits)
- Sound effects
- Background music/ambient audio
- Animations
- Visual transitions
- Custom UI layouts

### Design Question

Where should rendering responsibility live?

**Option A: Engine emits explicit media events** — Story author controls exactly what's displayed
**Option B: Client interprets semantic events** — Client decides presentation based on game semantics
**Option C: Hybrid with hints** — Story suggests media, client decides whether to use it

## Decision

We will implement **Option A: Author-controlled media events**.

The story author has full control over multimedia presentation. The engine emits explicit media directives, and the client renders them. This follows Hugo's proven model while modernizing for web-based delivery.

### Rationale

1. **Author vision** — Interactive fiction is an authored experience. Authors should control what players see and hear.
2. **Rich experiences** — Enables cutscenes, visual puzzles, timed sequences, atmospheric layering.
3. **Proven model** — Hugo, TADS HTML, and graphical IF systems all use author-controlled media.
4. **Simpler client** — Client is a renderer, not an interpreter of game semantics.
5. **Testable** — Can assert specific media events were emitted.

### Graceful Degradation

Graceful degradation is the **author's responsibility**, not the client's. Stories query client capabilities and emit appropriate events:

```typescript
// In story code
if (client.supports('image')) {
  emit('media.image', { src: 'dragon.png', layer: 'main' });
} else {
  emit('if.message', { id: 'dragon_description' });
}
```

This keeps the client simple while giving authors control over fallback behavior.

## Architecture

### Client Capability Negotiation

At session start, client declares its capabilities:

```typescript
interface ClientCapabilities {
  // Display
  text: true;                    // Always true
  images: boolean;               // Static images
  animations: boolean;           // Animated images, sprites
  video: boolean;                // Video playback

  // Audio
  sound: boolean;                // Sound effects
  music: boolean;                // Background music
  speech: boolean;               // Text-to-speech or recorded speech

  // Layout
  splitPane: boolean;            // Multiple text/image panes
  statusBar: boolean;            // Fixed status area
  sidebar: boolean;              // Inventory/map sidebar

  // Input
  clickableText: boolean;        // Hyperlinks in prose
  clickableImage: boolean;       // Image hotspots
  dragDrop: boolean;             // Drag and drop interactions

  // Advanced
  transitions: boolean;          // Fade, dissolve, etc.
  layers: boolean;               // Multiple image layers
  customFonts: boolean;          // Font embedding

  // Dimensions (for layout decisions)
  screenWidth?: number;
  screenHeight?: number;
}
```

Stories access capabilities via `context.client.supports('images')`.

### Media Event Types

#### Images

```typescript
// Display an image
{
  type: 'media.image.show',
  src: string,                   // Asset path or URL
  layer: 'background' | 'main' | 'overlay' | string,
  position?: { x: number, y: number } | 'center' | 'fill',
  size?: { width: number, height: number } | 'contain' | 'cover',
  transition?: TransitionSpec,
  duration?: number,             // For auto-hide (ms)
}

// Hide/clear an image
{
  type: 'media.image.hide',
  layer: string,
  transition?: TransitionSpec,
}

// Preload for performance
{
  type: 'media.image.preload',
  src: string | string[],
}
```

#### Audio

```typescript
// Play sound effect
{
  type: 'media.sound.play',
  src: string,
  channel?: string,              // For managing multiple sounds
  volume?: number,               // 0.0 - 1.0
  loop?: boolean,
}

// Background music
{
  type: 'media.music.play',
  src: string,
  fadeIn?: number,               // ms
  loop?: boolean,
  volume?: number,
}

{
  type: 'media.music.stop',
  fadeOut?: number,              // ms
}

// Ambient audio (layerable)
{
  type: 'media.ambient.play',
  src: string,
  channel: string,               // 'wind', 'rain', 'crowd', etc.
  volume?: number,
  loop?: boolean,
}

{
  type: 'media.ambient.stop',
  channel: string,
  fadeOut?: number,
}
```

#### Transitions

```typescript
interface TransitionSpec {
  type: 'fade' | 'dissolve' | 'slide' | 'wipe' | 'instant';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration: number;              // ms
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// Screen transition (between rooms, scenes)
{
  type: 'media.transition',
  transition: TransitionSpec,
}
```

#### Layout

```typescript
// Configure panes
{
  type: 'media.layout.configure',
  layout: {
    main: { type: 'text', position: 'left', width: '60%' },
    graphics: { type: 'image', position: 'right', width: '40%' },
    status: { type: 'status', position: 'top', height: '32px' },
  }
}

// Update status bar
{
  type: 'media.status.update',
  content: string | StatusBarSpec,
}

// Clear screen / pane
{
  type: 'media.clear',
  target?: 'all' | 'main' | 'graphics' | string,
}
```

#### Animation

```typescript
// Sprite animation
{
  type: 'media.animation.play',
  src: string,                   // Spritesheet or animation file
  layer: string,
  position?: { x: number, y: number },
  loop?: boolean,
  onComplete?: string,           // Event to emit when done
}

// Simple property animation
{
  type: 'media.animate',
  target: { layer: string } | { element: string },
  properties: {
    opacity?: number,
    x?: number,
    y?: number,
    scale?: number,
    rotation?: number,
  },
  duration: number,
  easing?: string,
}
```

### Asset Management

Stories bundle assets in a structured directory:

```
story/
├── src/
│   └── ...
├── assets/
│   ├── images/
│   │   ├── rooms/
│   │   │   ├── cave-entrance.png
│   │   │   └── throne-room.png
│   │   ├── objects/
│   │   │   └── sword.png
│   │   └── characters/
│   │       └── dragon.png
│   ├── audio/
│   │   ├── music/
│   │   │   └── exploration.mp3
│   │   ├── ambient/
│   │   │   └── cave-drips.mp3
│   │   └── sfx/
│   │       └── door-open.mp3
│   └── animations/
│       └── torch-flicker.json
└── story.json
```

Asset paths in events are relative to `assets/`:
```typescript
emit('media.image.show', { src: 'images/rooms/cave-entrance.png', ... });
```

### Client Implementation Requirements

Clients supporting graphical features MUST:

1. **Declare capabilities honestly** — Don't claim support you don't have
2. **Ignore unsupported events gracefully** — Unknown event types logged, not crashed
3. **Handle missing assets** — Show placeholder or log warning, don't crash
4. **Respect layer ordering** — background < main < overlay
5. **Implement transitions** — At minimum, support 'instant' and 'fade'
6. **Manage audio channels** — Stop previous sound on same channel unless layered

Clients MAY:
- Substitute higher-resolution assets
- Adapt layout to screen size
- Provide audio/graphics toggle for player preference
- Cache assets for performance

### Integration with Existing Architecture

Media events flow through the same event pipeline as semantic events:

```
Action.report()
    → ISemanticEvent[] (includes media events)
    → EventProcessor
    → Client receives all events
    → Client renders text via language layer
    → Client renders media directly
```

The language layer does NOT process media events — they pass through unchanged.

### Example: Room Entry with Graphics

```typescript
// In story's room definition or entering handler
function onEnterCave(context: ActionContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  // Always emit semantic event (for text clients, history, etc.)
  events.push(context.event('if.event.entered_room', {
    roomId: 'cave',
    roomName: 'Dark Cave'
  }));

  // Emit media if client supports it
  if (context.client.supports('images')) {
    events.push(context.event('media.image.show', {
      src: 'images/rooms/cave-entrance.png',
      layer: 'main',
      transition: { type: 'fade', duration: 500 }
    }));
  }

  if (context.client.supports('ambient')) {
    events.push(context.event('media.ambient.play', {
      src: 'audio/ambient/cave-drips.mp3',
      channel: 'environment',
      loop: true,
      volume: 0.3
    }));
  }

  return events;
}
```

### Example: Visual Puzzle

```typescript
// Combination lock with clickable interface
if (context.client.supports('clickableImage')) {
  events.push(context.event('media.image.show', {
    src: 'images/puzzles/combination-lock.png',
    layer: 'overlay',
    hotspots: [
      { id: 'dial1', bounds: { x: 10, y: 50, w: 30, h: 30 }, action: 'turn dial 1' },
      { id: 'dial2', bounds: { x: 50, y: 50, w: 30, h: 30 }, action: 'turn dial 2' },
      { id: 'dial3', bounds: { x: 90, y: 50, w: 30, h: 30 }, action: 'turn dial 3' },
    ]
  }));
} else {
  // Text fallback
  events.push(context.event('if.message', {
    id: 'combination_lock_description'
  }));
}
```

## Consequences

### Positive

- Authors have full creative control over presentation
- Rich multimedia experiences are possible
- Clear separation: story orchestrates, client renders
- Capability negotiation enables graceful degradation
- Proven model (Hugo, TADS HTML) with modern implementation
- Events are inspectable, testable, serializable

### Negative

- Stories must handle their own fallbacks for non-graphical clients
- Larger story bundles (assets included)
- Authors need multimedia skills or assets
- More complex story code when targeting multiple client types
- Client implementation is more complex than text-only

### Neutral

- Terminal client unchanged (ignores media events)
- Need to build reference graphical client to prove the design
- Asset pipeline tooling may be needed

## Implementation Plan

### Phase 1: Foundation
- Define event type schemas (TypeScript interfaces)
- Add `ClientCapabilities` to engine context
- Implement capability checking in `ActionContext`
- Update event pipeline to pass media events through unchanged

### Phase 2: Reference Client
- Build web client (React) supporting core features:
  - Images (show/hide/transition)
  - Sound effects
  - Background music
  - Basic layout (main + graphics pane)
- Terminal client: log and ignore media events

### Phase 3: Story Tooling
- Asset bundling in build pipeline
- Preload hints for performance
- Development mode: hot-reload assets

### Phase 4: Advanced Features
- Animations
- Video
- Complex layouts
- Image hotspots / clickable regions

## Alternatives Considered

### Option B: Client Interprets Semantic Events

Client decides presentation based on room atmosphere, entity traits, etc.

- **Pros:** Clean separation, works everywhere, client innovation
- **Cons:** Author loses control, inconsistent experiences, complex clients
- **Rejected:** Authors should control their creative vision

### Option C: Hybrid with Hints

Story suggests media, client decides whether to use.

- **Pros:** Middle ground, graceful degradation
- **Cons:** Ambiguous responsibility, authors may not commit to hints
- **Rejected:** Half-measures lead to lowest common denominator

## References

- Hugo language documentation: Graphics and Sound
- TADS 3 HTML TADS documentation
- Inform 7 Vorple extension
- Glk/Glulx multimedia specifications
