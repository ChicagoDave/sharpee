# Save Data Assessment: Delta Serialization

## Current State

The browser client (`SaveManager.captureWorldState()`) serializes **every entity** in the world on every save/autosave:

- **All entity locations** — even rooms and objects that haven't moved
- **All trait properties** — even traits that haven't changed since world creation

For Dungeo with ~191 rooms plus hundreds of objects, this means localStorage holds a full snapshot of the entire world every turn (autosave), even though only a handful of entities change per session.

### Current Save Format (`BrowserSaveData`)

```typescript
{
  version: '2.0.0-browser',
  timestamp: number,
  turnCount: number,
  score: number,
  locations: Record<string, string | null>,   // ALL entities
  traits: Record<string, Record<string, unknown>>,  // ALL entities
  transcriptHtml?: string   // compressed
}
```

### What's Good Already

- **No full entity recreation** — only locations and trait properties are saved, not entity definitions, behaviors, or event handlers.
- **Restore mutates in place** — `restoreWorldState()` updates existing entities rather than rebuilding, preserving all handlers and object references.
- **Transcript is compressed** — uses `lz-string` (`compressToUTF16`).

## Problem

With ~191 rooms + hundreds of objects + traits on each, the save data is unnecessarily large. Most of it is identical to the initial world state that's already encoded in the source code. This wastes localStorage space and slows autosave (runs every turn).

## Proposed: Delta Serialization

### Concept

Since the world is deterministically built from code on every startup, the initial state is already known. Only serialize what **changed** from that baseline.

### Implementation

#### 1. Capture baseline after world initialization

After `initializeWorld()` completes (before the first turn), snapshot the initial state:

```typescript
// In BrowserClient.start(), after engine.initialize()
this.baselineState = this.saveManager.captureWorldState();
```

#### 2. Save only deltas

```typescript
captureDelta(): DeltaSaveData {
  const current = this.captureWorldState();
  const delta: DeltaSaveData = { locations: {}, traits: {} };

  for (const [id, loc] of Object.entries(current.locations)) {
    if (loc !== this.baseline.locations[id]) {
      delta.locations[id] = loc;
    }
  }

  for (const [id, entityTraits] of Object.entries(current.traits)) {
    const baseTraits = this.baseline.traits[id] || {};
    for (const [traitName, traitData] of Object.entries(entityTraits)) {
      const baseTrait = baseTraits[traitName] as Record<string, unknown> | undefined;
      if (!baseTrait || !shallowEqual(traitData, baseTrait)) {
        delta.traits[id] = delta.traits[id] || {};
        delta.traits[id][traitName] = traitData;
      }
    }
  }

  return delta;
}
```

#### 3. Restore: rebuild world, then apply deltas

The restore path barely changes — `restoreWorldState()` already applies locations and traits on top of existing entities. It just receives a smaller payload.

#### 4. Handle new/destroyed entities

If entities are created or destroyed mid-game (rare in Zork-style IF, but possible):

- **Created entities**: Store full entity data in a `created` array in the delta
- **Destroyed entities**: Store entity IDs in a `destroyed` array

### New Save Format

```typescript
interface DeltaSaveData {
  version: '3.0.0-delta',
  timestamp: number,
  turnCount: number,
  score: number,
  locations: Record<string, string | null>,     // ONLY changed locations
  traits: Record<string, Record<string, unknown>>,  // ONLY changed traits
  created?: SerializedEntity[],                  // entities not in baseline
  destroyed?: string[],                          // entity IDs removed
  transcriptHtml?: string,
}
```

### Expected Size Reduction

In a typical early-game save (20-30 turns), likely changes:
- Player location: 1 entry
- Items picked up: ~5-10 location changes
- Doors opened/locked: ~2-3 trait changes
- Lamp lit: 1 trait change

**Estimate**: ~15-20 entries vs ~500+ entries currently. Roughly **95%+ reduction** in save data size.

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Baseline must match exactly on rebuild | World is deterministic from code — same build = same baseline |
| Code changes between saves invalidate deltas | Version the save format; on mismatch, treat as incompatible (already done for major version bumps) |
| `shallowEqual` on trait data needs to handle nested objects | Most trait properties are primitives; deep-equal for any complex ones |
| Autosave captures baseline before first command | Capture baseline in `start()` after `initializeWorld()` but before first LOOK |

## Files to Modify

| File | Change |
|------|--------|
| `packages/platform-browser/src/managers/SaveManager.ts` | Add `captureBaseline()`, `captureDelta()`, update `performSave()` |
| `packages/platform-browser/src/types.ts` | Add `DeltaSaveData` interface, bump version |
| `packages/platform-browser/src/BrowserClient.ts` | Call `captureBaseline()` after init |

## Obfuscation / Anti-Cheat

With full snapshots, localStorage contains readable JSON with entity IDs, room names, and trait values — a player can open DevTools and see puzzle state, hidden object locations, etc.

### Options

| Approach | Spoiler Protection | Effort | Notes |
|----------|-------------------|--------|-------|
| **lz-string compression** (already used for transcript) | Low — `decompressFromUTF16()` is trivial to call in console | None — already available | Deters casual browsing but not intentional peeking |
| **Base64 + compression** | Low | Trivial | Same deterrent level, slightly less obvious |
| **XOR / simple cipher** | Medium | Small | Key is in the JS bundle, so reversible by determined players |
| **AES encryption** (Web Crypto API) | High | Medium | Key management is the problem — key must live client-side, so a motivated player can still extract it |

### Recommendation

**Compress the entire JSON payload with lz-string before storing**, which we already do for transcripts. This:

1. Reduces localStorage size further (on top of delta savings)
2. Makes save data unreadable in DevTools without effort
3. Requires zero new dependencies
4. Is sufficient for IF — we're not protecting financial data, just discouraging casual spoilers

```typescript
// Save
const json = JSON.stringify(deltaData);
const compressed = compressToUTF16(json);
localStorage.setItem(key, compressed);

// Load
const compressed = localStorage.getItem(key);
const json = decompressFromUTF16(compressed);
const deltaData = JSON.parse(json);
```

With deltas, the spoiler surface is much smaller anyway — a player would only see IDs of changed entities, not room descriptions or puzzle text. Combined with compression, casual cheating becomes impractical.

## Effort

Small — the restore path is unchanged, the save path gets a diff loop, and `BrowserClient` captures a baseline snapshot at startup. Compression of the full payload is a one-line wrapper using existing `lz-string`. No engine or stdlib changes needed.
