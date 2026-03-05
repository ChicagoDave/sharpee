# ADR-134: Generic IF Transcript Tester

**Status:** Exploratory
**Date:** 2026-03-05
**Context:** Could Sharpee's transcript tester be extracted into a standalone tool for any IF engine?

## Background

Sharpee's transcript tester (`packages/transcript-tester`) provides a directive-rich testing language for interactive fiction that goes well beyond simple command/response verification. Features include:

- **GOAL blocks** with REQUIRES/ENSURES pre/postconditions
- **WHILE/DO-UNTIL loops** for non-deterministic scenarios (combat, thief movement)
- **RETRY with rollback** — snapshots world state, restores on failure
- **IF conditionals** — skip blocks based on game state
- **NAVIGATE TO** — automatic pathfinding between rooms
- **Chained walkthroughs** — state persists across transcript files
- **Rich assertions** — contains, not-contains, regex, event counts, state checks

The existing IF testing landscape is limited:

| Tool | Format | Capabilities |
|------|--------|-------------|
| Inform's `TEST` | Inline source | Command lists only, no assertions |
| RegTest (Plotkin) | Python script | Command/response matching, regex |
| regtest-html | Puppeteer | RegTest for browser interpreters |

None support control flow, state rollback, goal-based testing, or walkthrough chaining.

## Proposal

Extract the transcript tester into a generic, engine-agnostic CLI tool with an adapter interface for different IF platforms.

### Architecture

```
@iftf/transcript-tester (generic core)
├── parser.ts          — .transcript file format (engine-agnostic)
├── runner.ts          — control flow, directive execution
├── reporter.ts        — colored terminal output, diffs
├── assertions.ts      — text matching, regex, contains
└── types.ts           — Transcript, Directive, Assertion types

Adapter interface:
├── executeCommand(input: string) → Promise<string>
├── save?() → unknown
├── restore?(state: unknown) → void
├── queryLocation?() → string | undefined
├── queryInventory?() → string[] | undefined
├── findPath?(from: string, to: string) → string[] | undefined
```

### Adapter Tiers

**Tier 1 — Text I/O only (any IF engine)**

Works with any engine that accepts text input and produces text output. No world state access. Supports all text-based assertions and control flow directives.

Available immediately for:
- Inform via dfrotz (Z-machine, subprocess)
- Inform via glulxe+cheapglk (Glulx, subprocess)
- Inform via glulx-typescript (Glulx, in-process TypeScript/WASM)
- TADS via subprocess
- Any CLI-based IF interpreter

At this tier, conditions like `location = "Kitchen"` would not work. Authors use text assertions instead: `[OK: contains "Kitchen"]`.

**Tier 2 — Text I/O with save/restore**

Adds Quetzal save/restore support, enabling RETRY blocks with state rollback. glulx-typescript already has Quetzal support. dfrotz supports save/restore via commands.

**Tier 3 — Full world state (engine-specific)**

Engines that expose a queryable world model get the full feature set: location/inventory conditions, entity state checks, automatic pathfinding. Sharpee provides this natively via its TypeScript WorldModel.

For Inform, this tier would require either:
- A custom Inform extension that responds to meta-commands (`$query location`, etc.)
- Direct VM memory reading of the object table (documented but fragile)
- Rebuilding FyreVM channel support for Inform 10 (non-trivial)

None of these are practical short-term.

### Inform Integration Options

| Approach | Runtime | World State | Complexity |
|----------|---------|-------------|------------|
| dfrotz subprocess | Z-machine | None | Low |
| glulxe+cheapglk subprocess | Glulx | None | Low |
| glulx-typescript in-process | Glulx | None (potential) | Medium |
| glulx-typescript + VM memory | Glulx | Object table | High |
| Inform extension + meta-commands | Either | Via text parsing | High |

The `thiloplanz/glulx-typescript` repo provides a TypeScript Glulx VM with:
- `EngineWrapper` — load game from ArrayBuffer, `run()`, `receiveLine()`
- `Quetzal` — save/restore game state
- Standard Glk I/O via `GlkWrapper`
- FyreVM channel I/O (would require a non-trivial Inform 10 extension to use)

The repo targets FyreVM-compiled games and notes "Inform7 not so much" — it would need updating for standard Glk Inform 10 output.

### What Gets Extracted from Sharpee

| Component | Sharpee-Specific? | Extraction |
|-----------|-------------------|------------|
| Parser (`.transcript` format) | No | Direct extract |
| Runner (control flow) | No | Direct extract |
| Reporter (terminal output) | No | Direct extract |
| Assertions (text matching) | No | Direct extract |
| Condition evaluator | Yes (trait queries) | Abstract behind adapter |
| Navigator (pathfinding) | Yes (room trait exits) | Abstract behind adapter |
| Story loader | Yes | Replace with adapter factory |
| Event assertions | Yes (SequencedEvent) | Drop or make optional |

Roughly 80% of the code is engine-agnostic.

## Value Proposition

For the broader IF community, the directive system is the differentiator:

- **RegTest** can verify "command X produces output containing Y"
- **This tool** can verify "after navigating to the Troll Room, fighting the troll (with retry on death), taking the sword, and going north, the output contains 'Treasury'" — as a single reproducible test

For Inform authors specifically:
- Walkthrough verification with assertions (not just "it doesn't crash")
- Non-deterministic scenario testing (combat, random NPC behavior)
- Regression testing across Inform compiler versions

### Silent World Model Queries via VM Memory Introspection

The most promising path to full world-state access for Inform games doesn't go through text I/O or FyreVM channels at all. Since `glulx-typescript` runs the VM in-process, the test harness can **read VM memory directly** between turns — silently, without consuming a game turn or producing output.

The Glulx object table format is documented in the Glulx spec. Objects are stored as a tree with:
- **Parent/child/sibling pointers** — gives location and containment
- **Properties** — name strings, descriptions, custom values
- **Attributes** — binary flags for open, lit, locked, worn, etc.

A `GlulxWorldQuery` layer on top of `MemoryAccess` could provide:

```typescript
interface GlulxWorldQuery {
  // Object tree traversal
  findObjectByName(name: string): GlulxObject | undefined;
  getParent(obj: GlulxObject): GlulxObject | undefined;      // location
  getChildren(obj: GlulxObject): GlulxObject[];               // contents
  hasAttribute(obj: GlulxObject, attr: number): boolean;       // state

  // Higher-level queries (built on the above)
  getPlayerLocation(): string;
  getInventory(): string[];
  isEntityInRoom(name: string, room: string): boolean;

  // Room connections (read direction properties)
  getRoomExits(room: GlulxObject): Map<string, GlulxObject>;
  findPath(from: string, to: string): string[];               // BFS over exits
}
```

This would give Inform games **full Tier 3 parity** with Sharpee's native adapter — conditions, pathfinding, NAVIGATE TO, the works. The game never knows it's being inspected. No Inform extension needed, no FyreVM channels, no text parsing.

The main challenge is mapping Inform's compiled object table layout (which varies by compiler version and settings) to a stable query interface. The Z-machine object table is simpler and more stable than Glulx, but both are well-documented specs.

This is the rathole worth going down if this project ever gets serious.

## Decision

Recorded as an exploratory ADR. No immediate implementation planned. The extraction is technically feasible and the transcript format is genuinely more capable than existing IF testing tools, but the audience size and effort need to be weighed against other priorities.

If pursued, the recommended path is:
1. Extract generic core as a standalone npm package
2. Build Tier 1 Inform adapter using dfrotz subprocess (simplest, works today)
3. Evaluate glulx-typescript for in-process Tier 2 if there's demand

## References

- ADR-092: Smart Transcript Directives
- `packages/transcript-tester/` — current implementation
- `thiloplanz/glulx-typescript` — TypeScript Glulx VM
- `erkyrath/remglk` — JSON I/O for Glk interpreters
- `curiousdannii/emglken` — Emscripten-compiled IF interpreters in JS
- `curiousdannii/ifvms.js` — Z-machine VM in JavaScript
