# ADR-151: Unity Integration

## Status: PROPOSAL

## Date: 2026-04-14

## Context

### The Opportunity

Sharpee currently targets web browsers (React client, Zifmia), terminal (CLI), and VS Code (extension). Unity integration would open Sharpee stories to 3D/2D game environments — visual room rendering, character animation, spatial audio, inventory UIs, and the broader Unity ecosystem (consoles, mobile, VR/AR).

The core question: how does a TypeScript IF engine talk to a C# game engine?

### What Sharpee Provides

Sharpee is the authoritative source for:
- **World state**: rooms, entities, traits, locations, containment
- **Command parsing**: natural language input → validated commands
- **Action execution**: four-phase validate/execute/report/blocked cycle
- **Event stream**: semantic events describing what happened (taken, dropped, opened, moved, region_entered, scene_began, etc.)
- **NPC behavior**: turn-based NPC actions, combat, dialogue
- **Scene/region lifecycle**: condition-based activation, boundary crossing detection
- **Scoring, save/restore, undo**

### What Unity Provides

Unity would handle:
- **Rendering**: 3D/2D room visualization, entity models, lighting
- **Animation**: character movement, item interactions, door opening
- **Audio**: spatial sound, music, ambient audio tied to regions/scenes
- **Input**: click-to-interact, gesture, voice input (converted to text commands)
- **UI**: inventory panels, map views, dialogue windows, HUD
- **Platform delivery**: consoles, mobile, VR/AR builds

### The Interface

Regardless of integration approach, the data flow is:

```
Unity (input) ──[text command]──> Sharpee (engine)
Sharpee (engine) ──[events + state]──> Unity (rendering)
```

Unity sends player commands as text strings. Sharpee processes them and returns:
1. **Semantic events** — what happened (item taken, door opened, NPC attacked)
2. **Text output** — prose blocks for display
3. **World state delta** — what changed (entity moved, trait updated, score changed)

Unity maps semantic events to visual/audio responses. The text can be displayed as-is, or Unity can use the semantic events to drive animations and show text as a secondary channel.

## Integration Approaches

### Approach A: Bridge Process (IPC)

Sharpee runs as a separate Node.js process. Unity communicates via IPC (stdin/stdout, WebSocket, or named pipes).

**How it works:**
- Unity spawns a Node.js child process running the Sharpee CLI
- Commands are sent as text over stdin or WebSocket
- Sharpee responds with JSON: events, text blocks, state changes
- Unity deserializes the JSON and drives rendering

**This is essentially the Zifmia pattern** — Zifmia already serializes game state as JSON and communicates over HTTP. A Unity bridge would be a tighter variant of the same architecture.

**Pros:**
- No changes to Sharpee — it stays TypeScript, runs on Node.js
- Clean process isolation — crashes don't take down Unity
- The `--world-json` and `introspect()` infrastructure already exists
- Easy to develop and debug — run Sharpee independently
- Can use the same Sharpee build for web, CLI, and Unity simultaneously

**Cons:**
- IPC latency on every command (typically 1-10ms, but adds up)
- Requires Node.js installed on the target platform (or bundled)
- Two processes to manage — lifecycle, error handling, shutdown
- JSON serialization overhead for large world states
- Mobile/console deployment is harder (Node.js availability)

### Approach B: Embedded JavaScript Runtime

Unity embeds a JavaScript engine and runs Sharpee in-process.

**Options:**
- **Jint** — Pure C# JS interpreter. No native dependencies. Slow for large codebases.
- **ClearScript (V8)** — Google's V8 engine via C# bindings. Fast, but native dependency per platform.
- **JavaScriptCore** — WebKit's engine. Available on Apple platforms.
- **QuickJS** — Lightweight embeddable JS engine. Small binary, decent performance.

**How it works:**
- Unity initializes the JS engine at startup
- Loads the Sharpee bundle (dist/cli/sharpee.js or similar)
- Calls Sharpee functions directly from C# via the engine's interop layer
- Results come back as JS objects, marshalled to C# types

**Pros:**
- Single process — no IPC overhead
- Direct function calls — lower latency than serialization
- No Node.js dependency on target platform
- Simpler deployment (one binary)

**Cons:**
- JS engine adds binary size (V8: ~20MB, QuickJS: ~1MB, Jint: ~500KB)
- Platform-specific native builds for V8/JSC (each console, mobile OS)
- Interop complexity — marshalling between JS objects and C# types
- Jint is pure C# but significantly slower than V8 (10-100x)
- Debugging is harder — JS running inside C# inside Unity
- Sharpee bundle may need modifications to run without Node.js APIs (fs, path, etc.)

### Approach C: WebAssembly (WASM)

Compile Sharpee's TypeScript to WebAssembly and load it in Unity via a WASM runtime.

**How it works:**
- Compile Sharpee to WASM using a toolchain (AssemblyScript, wasm-pack, or emscripten)
- Unity loads the WASM module via a C# WASM runtime (wasmtime, wasmer)
- Function calls cross the WASM/C# boundary with minimal overhead
- Or: compile a C port of the engine to WASM

**Pros:**
- Near-native performance
- Single binary, no external runtime
- Cross-platform by design (WASM is portable)
- Strong sandboxing — WASM modules can't access the host system

**Cons:**
- TypeScript doesn't compile directly to WASM — requires a separate toolchain or a language port
- WASM/C# interop is still maturing in the Unity ecosystem
- Loss of TypeScript ecosystem (npm packages, debugging tools)
- Significant engineering effort to build and maintain the compilation pipeline
- Not a natural fit until TypeScript-to-WASM tooling matures

### Approach D: C# Port

Rewrite the Sharpee engine in C# as a Unity package or .NET library.

**How it works:**
- Port WorldModel, engine, stdlib, parser, and language layer to C#
- Publish as a Unity package or NuGet package
- Stories are authored in C# (or a DSL that compiles to C#)
- Native integration — no bridge, no runtime, no serialization

**Pros:**
- Zero interop overhead — everything is native C#
- Full Unity IDE integration (IntelliSense, debugging, profiling)
- Simplest deployment — just a Unity package
- Can leverage C# features (LINQ for queries, async/await, Unity coroutines)
- Best performance

**Cons:**
- Massive engineering effort — the Sharpee codebase is ~20K+ lines of TypeScript
- Two codebases to maintain (or abandon TypeScript entirely)
- Story authors must write C# instead of TypeScript
- Loses the web/CLI/VS Code ecosystem unless both versions are maintained
- Risk of divergence — features added to one version may not appear in the other

### Approach E: Hybrid — C# Facade over Bridge

A middle ground: a thin C# Unity package that abstracts the communication layer, initially backed by a bridge process, with the option to swap in an embedded runtime later.

**How it works:**
- Define a C# interface: `ISharpeeEngine` with `ProcessCommand(string)`, `GetWorldState()`, etc.
- Initial implementation: bridge to Node.js process (Approach A)
- Future: swap in embedded JS (Approach B) or WASM (Approach C) without changing Unity-side code
- The C# facade handles serialization, event mapping, and Unity lifecycle

**Pros:**
- Start shipping quickly with the bridge (Sharpee unchanged)
- Unity developers code against a clean C# API, not raw JSON
- Can migrate to embedded/WASM later without breaking Unity code
- Testable — mock the interface for Unity-side unit tests

**Cons:**
- Still requires the bridge infrastructure initially
- The facade is additional code to maintain
- May accumulate bridge-specific workarounds that complicate migration

## Data Contract

Regardless of approach, the integration needs a defined contract between Sharpee and Unity. The existing `--world-json` output and `introspect()` API provide a starting point.

### Command Input

```
{ "command": "take lamp" }
```

### Response

```json
{
  "turn": 5,
  "text": [{ "type": "narrative", "content": "Taken." }],
  "events": [
    { "type": "if.event.taken", "data": { "itemId": "lamp", "actorId": "player" } }
  ],
  "stateChanges": [
    { "entityId": "lamp", "field": "location", "from": "living-room", "to": "player" }
  ]
}
```

### World Snapshot (initial load)

The `--world-json` output already provides rooms, entities, NPCs, regions, scenes, actions, traits, behaviors, and messages — everything Unity needs to build its initial scene graph.

## Key Questions for Future Phases

1. **Latency budget** — How fast must command → response be? 1ms (embedded) vs 10ms (bridge) vs 50ms (HTTP)?
2. **Target platforms** — PC only? Mobile? Consoles? VR? This constrains which approaches are viable.
3. **Story authoring** — Do Unity authors write stories in TypeScript (compiled separately) or C# (native)?
4. **Visual mapping** — How do semantic events map to Unity animations? Is this hand-coded per story, or is there a declarative mapping layer?
5. **Save/restore** — Does Unity own saves (including visual state), or does Sharpee own saves (just world state)?
6. **Multiplayer** — Any future multiplayer considerations? This would favor the bridge/server approach.

## Recommendation

No specific approach is recommended at this stage. The decision depends on target platforms, latency requirements, and how much Unity-specific engineering the project can absorb.

**Approach E (Hybrid Facade)** is the lowest-risk starting point — it ships the fastest (bridge is trivial given existing Zifmia infrastructure), provides a clean C# API to Unity developers, and preserves the option to optimize later. But it should be evaluated against the actual requirements once a Unity prototype is in progress.

## References

- Existing Zifmia client: `packages/zifmia/` — web-based bridge pattern
- `--world-json` output: `scripts/bundle-entry.js`, `packages/transcript-tester/src/fast-cli.ts`
- `GameEngine.introspect()`: `packages/engine/src/game-engine.ts`
- Semantic event types: `packages/core/src/` event definitions
