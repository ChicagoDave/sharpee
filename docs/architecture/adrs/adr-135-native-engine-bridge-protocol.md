# ADR-135: Native Engine Bridge Protocol

## Status
Proposed

## Context

Sharpee games need to run inside native desktop applications (Swift/macOS, Blazor/Windows) that cannot embed Node.js or V8 directly. The Lantern authoring tool and the Zifmia player are converging into a single native app with two modes — authoring and playing. Both modes need to drive the Sharpee engine and consume its output.

A spike at `sharpee-embed-spike/` proved that running the engine in a persistent Node.js subprocess with JSON-RPC over stdin/stdout works reliably. The engine loads, constructs stories, executes turns, and produces both structured text blocks (ADR-133) and semantic domain events.

### What this ADR covers

The message protocol between a native host process and a Sharpee engine running in a Node.js subprocess. This is the **contract boundary** between two repos (Sharpee in TypeScript, consumers in Rust/Swift/C#) and two release cycles.

### What this ADR does not cover

- How the native front end renders blocks or handles events (client-specific)
- The Lantern inference/codegen pipeline (Lantern-specific)
- How stories are authored or generated (authoring-layer concern)
- The internal structure of `ITextBlock` or `ISemanticEvent` (covered by ADR-096, ADR-133)

## Design

### Architecture

```
┌──────────────────────────────────────────┐
│ Native Host (Rust core + Swift/Blazor UI) │
│  ├── sends commands via stdin (JSON)      │
│  └── receives responses via stdout (JSON) │
└──────────┬───────────────────────────────┘
           │ stdin/stdout (newline-delimited JSON)
┌──────────▼───────────────────────────────┐
│ Node.js subprocess (Sharpee engine)       │
│  ├── engine + parser + language provider  │
│  ├── text service (block production)      │
│  └── bridge script (protocol handler)     │
└──────────────────────────────────────────┘
```

The Node process is long-lived — started once, reused for the entire session. Startup cost (~100ms) is amortized.

### Protocol

Newline-delimited JSON over stdin (host → engine) and stdout (engine → host). Each message is a single JSON object terminated by `\n`. stderr is reserved for diagnostics and is not part of the protocol.

#### Inbound messages (host → engine)

| Method | Fields | Description |
|--------|--------|-------------|
| `start` | `bundle?: string`, `storyPath?: string` | Start the engine. Pass `bundle` for a `.sharpee` file path (play mode) or `storyPath` for a `.ts` file path (authoring mode, compiled on the fly via esbuild). |
| `command` | `text: string` | Execute a player command. |
| `save` | — | Request a save. Engine responds with `platform.save_completed` event containing serialized data. |
| `restore` | `data: string` | Restore from serialized save data. Engine responds with `platform.restore_completed` event. |
| `quit` | — | Shut down the engine process. |

```json
{ "method": "start", "bundle": "/path/to/game.sharpee" }
{ "method": "start", "storyPath": "/path/to/story.ts" }
{ "method": "command", "text": "north" }
{ "method": "save" }
{ "method": "restore", "data": "..." }
{ "method": "quit" }
```

#### Outbound messages (engine → host)

Each turn produces up to three messages in order: `blocks`, `events`, `status`. The `status` message marks the end of a turn — the host should wait for it before sending the next command.

| Type | Fields | Description |
|------|--------|-------------|
| `ready` | `version: string` | Engine started, protocol version announced. |
| `blocks` | `blocks: ITextBlock[]` | Structured text blocks from the text service (ADR-133). Keyed by `room.name`, `room.description`, `action.result`, `error`, or story-defined custom keys. |
| `events` | `events: DomainEvent[]` | Domain and platform events. The bridge forwards `if.event.*` and `platform.*` types. Internal system/lifecycle events are filtered out. |
| `status` | `location: string, turn: number` | Current player location and turn count. Marks end of turn. |
| `error` | `message: string` | Engine error. |
| `bye` | — | Engine shutting down. |

```json
{ "type": "ready", "version": "1.0.0" }
{ "type": "blocks", "blocks": [{ "key": "room.name", "content": ["Foyer"] }] }
{ "type": "events", "events": [{ "type": "if.event.actor_moved", "data": { ... } }] }
{ "type": "status", "location": "Foyer", "turn": 1 }
```

#### DomainEvent shape

```typescript
interface DomainEvent {
  type: string;       // e.g., "if.event.actor_moved"
  data: object;       // event-specific structured data
}
```

Events carry the full structured data from the engine — room snapshots, item lists, directions, entity IDs. The native front end uses this for interactive UI elements (maps, clickable items, navigation). The text blocks carry the rendered prose.

### Standard events

These are the events that cross the bridge. The bridge forwards two namespaces: `if.event.*` (domain events) and `platform.*` (engine lifecycle). All originate from the engine's event system.

#### Domain events (`if.event.*`)

| Event | Key data fields | Front end use |
|-------|----------------|---------------|
| `if.event.looked` | `room`, `visibleItems`, `locationName` | Initial room display |
| `if.event.actor_moved` | `direction`, `sourceRoom`, `destinationRoom`, `firstVisit` | Map updates, transitions |
| `if.event.actor_exited` | `actorId`, `direction`, `toRoom` | NPC tracking |
| `if.event.actor_entered` | `actorId`, `direction`, `fromRoom` | NPC tracking |
| `if.event.room.description` | `roomName`, `roomDescription`, `visibleItems`, `isDark` | Room content |
| `if.event.list.contents` | `directItemNames`, `containers`, `supporters`, `npcs` | Object/NPC lists |
| `if.event.taken` | item data | Inventory updates |
| `if.event.dropped` | item data | Inventory updates |
| `if.event.inventory` | carried items | Inventory display |
| `if.event.examined` | target entity data | Detail view |
| `command.failed` | `reason`, `input` | Error display |

#### Platform events (`platform.*`)

| Event | Key data fields | Front end use |
|-------|----------------|---------------|
| `platform.save_completed` | `data: string` (serialized state) | Host stores save data (file, cloud, etc.) |
| `platform.restore_completed` | — | Confirm restore succeeded |
| `platform.save_requested` | — | Engine-initiated save request (auto-save) |

Platform events let the host react to engine lifecycle without bespoke protocol messages. The host triggers saves and restores via inbound `save`/`restore` commands; the engine responds with platform events through the same event channel as everything else.

These lists are not exhaustive. New events can be added in future Sharpee versions without breaking the protocol (see forward-compatibility below).

### Versioning

The `ready` message includes a `version` field (semver). The host can check compatibility:

- **Patch** (1.0.x): Bug fixes only. No protocol changes.
- **Minor** (1.x.0): New event types or block keys added. Existing messages unchanged. Forward-compatible.
- **Major** (x.0.0): Breaking changes to existing message shapes. Requires coordinated release.

### Forward-compatibility rules

1. **Unknown block keys**: The host routes them to a default content area. No crash, no error.
2. **Unknown event types**: The host logs them for debugging but does not act on them.
3. **New fields on existing messages**: The host ignores fields it doesn't recognize.
4. **Removed fields**: Considered a breaking change (major version bump).

These rules allow Sharpee to add new block keys and event types without requiring a native app update. The native app gracefully degrades.

### Sequencing

Commands are processed sequentially. The host must wait for a `status` (or `error`) response before sending the next command. The bridge script enforces this with an internal queue.

```
Host                    Engine
  │                       │
  ├── start ──────────────►│
  │                        ├── ready
  │                        ├── blocks (banner + room)
  │                        ├── events (looked, room.description)
  │◄── status ────────────┤
  │                       │
  ├── command "north" ────►│
  │                        ├── blocks (room name + description)
  │                        ├── events (actor_moved, room.description)
  │◄── status ────────────┤
  │                       │
  ├── quit ───────────────►│
  │◄── bye ───────────────┤
```

## Bridge script location

The bridge script lives in `packages/bridge/` (`@sharpee/bridge`). The build step produces a standalone `node_bridge.js` bundle via esbuild — a single file with all engine dependencies inlined. This is the canonical implementation of this protocol.

Native apps (Lantern, Zifmia) ship the standalone bundle and spawn it as a subprocess. Node.js consumers can install `@sharpee/bridge` via npm. Consumers do not implement their own bridge scripts.

## Dual-channel design rationale

Both text blocks and domain events cross the bridge because they serve different purposes:

- **Text blocks** are the **presentation layer**. The text service produces them. They carry rendered prose keyed by UI role (`room.name`, `action.result`, custom keys). Authors extend the text service to create custom blocks for custom UI widgets.
- **Domain events** are the **structural layer**. The engine produces them. They carry entity data, spatial relationships, and state changes. The front end uses them for interactive elements (maps, clickable items, navigation buttons) that blocks alone cannot express.

A front end that only receives blocks can render a traditional text game. A front end that also consumes events can build rich interactive UI. Both channels are optional to consume but always emitted.

## Related ADRs

| ADR | Relationship |
|-----|-------------|
| ADR-096 | Defines `ITextBlock` structure — the block format this protocol carries |
| ADR-133 | Structured text output — engine emits `ITextBlock[]` instead of flat strings |
| ADR-125 | Zifmia Panels — block keys map to panel routing, same concept as this protocol's block routing |
| ADR-130 | Zifmia packaging — `.sharpee` bundles, related but distinct from subprocess protocol |

## Open questions

1. **Story loading**: ~~Should the `start` message accept a path to a `.sharpee` bundle, a path to a `story.ts` file, or an inline story object?~~ **Resolved**: Both. The `start` message supports two loading modes via discriminated fields:
   - `{ "method": "start", "bundle": "/path/to/game.sharpee" }` — Play mode. Loads a pre-built `.sharpee` bundle.
   - `{ "method": "start", "storyPath": "/path/to/story.ts" }` — Authoring mode. The bridge compiles the TypeScript file via esbuild programmatically, then loads the result. Used by Lantern when codegen produces a story file.

   Both modes converge to the same engine bootstrap path after loading. The esbuild compilation step is fast enough (~50–100ms) for an interactive authoring loop.
2. **Save/restore**: ~~How do save and restore operations flow through the bridge?~~ **Resolved**: Inbound `save` and `restore` commands trigger the engine's existing save/restore machinery. Responses flow back as `platform.*` events through the standard event channel — no bespoke outbound message types needed. The bridge filter was widened from `if.event.*` only to `if.event.*` + `platform.*`, which also future-proofs any new platform-level capabilities.
3. **Bridge script packaging**: ~~Should `node_bridge.js` be bundled into a standalone file (via esbuild), or distributed as part of `@sharpee/runtime`?~~ **Resolved**: Dedicated `@sharpee/bridge` package. The bridge and runtime are different transport layers targeting different environments (Node.js subprocess/stdin/stdout vs browser iframe/postMessage) — they don't belong in the same package. `@sharpee/bridge` builds to a standalone esbuild bundle (`node_bridge.js`) for native apps, and is also available as an npm package for Node.js consumers. `@sharpee/runtime` remains browser-only.
4. ~~**Multiple concurrent games**: Does the protocol need session IDs for running multiple games in one process?~~ **Resolved**: No. Each game runs in its own Node.js subprocess with isolated state and its own stdin/stdout pipes. The host manages multiple subprocesses independently — no protocol-level session IDs needed.
