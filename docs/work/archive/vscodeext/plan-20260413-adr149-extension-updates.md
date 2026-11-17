# Plan: VS Code Extension — ADR-149/150 Integration

**Created**: 2026-04-13
**Branch**: feature/vscode-ext-tier2
**Prereq**: ADR-149 (Regions & Scenes) and ADR-150 (EntityQuery API) merged to main

## Context

ADR-149/150 added regions, scenes, and the EntityQuery API to the platform. The VS Code extension's `--world-json` output and World Explorer tree need updates to surface this data. This is a focused integration pass — not the full Tier 3 webview rewrite.

## Audit Summary

- **Zero breaking changes** — extension doesn't reference `RoomTrait.region` or hardcode entity types
- New entity types (REGION, SCENE) already appear in trait lists automatically
- Region grouping, scene status, and EntityQuery usage require explicit changes

---

## Phase 1: Extend `--world-json` with Region and Scene Data

**Files**: `packages/transcript-tester/src/fast-cli.ts`

### Step 1: Add `regionId` to room objects

In the room building loop (line 438-444), extract `roomTrait?.regionId`:

```typescript
rooms.push({
  id: entity.id,
  name,
  aliases: identity?.aliases || [],
  isDark: roomTrait?.isDark || false,
  regionId: roomTrait?.regionId || null,  // NEW
  exits,
});
```

### Step 2: Add regions collection

After the entity loop, collect all region entities:

```typescript
const regions: any[] = [];
for (const entity of allEntities) {
  const regionTrait = entity.get('region') as any;
  if (regionTrait) {
    regions.push({
      id: entity.id,
      name: regionTrait.name,
      parentRegionId: regionTrait.parentRegionId || null,
    });
  }
}
```

### Step 3: Add scenes collection

After regions, collect all scene entities:

```typescript
const scenes: any[] = [];
for (const entity of allEntities) {
  const sceneTrait = entity.get('scene') as any;
  if (sceneTrait) {
    scenes.push({
      id: entity.id,
      name: sceneTrait.name,
      state: sceneTrait.state,
      recurring: sceneTrait.recurring,
    });
  }
}
```

### Step 4: Update output object

```typescript
const output = {
  storyPath: options.storyPath,
  rooms,
  entities,
  npcs,
  actions: storyActions,
  regions,   // NEW
  scenes,    // NEW
};
```

### Step 5: Filter regions and scenes from generic entities list

Currently, region and scene entities would fall into the catch-all `entities` array. Add exclusion:

```typescript
} else if (entity.type !== 'player'
           && !traitTypes.includes('region')
           && !traitTypes.includes('scene')) {
  entities.push({ ... });
}
```

---

## Phase 2: Update World Explorer Tree

**Files**: `tools/vscode-ext/src/world-explorer.ts`

### Step 1: Extend interfaces

```typescript
interface WorldRoom {
  // ... existing fields
  regionId: string | null;  // NEW
}

interface WorldRegion {           // NEW
  id: string;
  name: string;
  parentRegionId: string | null;
}

interface WorldScene {            // NEW
  id: string;
  name: string;
  state: 'waiting' | 'active' | 'ended';
  recurring: boolean;
}

interface WorldData {
  // ... existing fields
  regions: WorldRegion[];         // NEW
  scenes: WorldScene[];           // NEW
}
```

### Step 2: Group rooms by region in `buildRoomsCategory()`

Currently rooms are a flat alphabetical list. Change to:

- If regions exist: group rooms under region parent nodes
- Rooms with no region go under an "Unassigned" group
- If no regions defined at all: keep flat list (backward compat)

### Step 3: Add Regions category (optional — only if regions exist)

Show region hierarchy with parent/child nesting. Each region node shows its rooms as children.

### Step 4: Add Scenes category (optional — only if scenes exist)

Show all scenes with state indicators:
- `$(play)` icon for active scenes
- `$(circle-outline)` for waiting
- `$(check)` for ended

### Step 5: Update entity completions

`src/entity-completions.ts` — add region IDs and scene IDs as completion candidates in appropriate contexts (e.g., `regionId: '`, `createRegion(`, `isSceneActive(`).

---

## Phase 3: Build and Test

- Rebuild extension: `cd tools/vscode-ext && npm run compile`
- Rebuild platform with `--world-json` changes: `./build.sh --skip stdlib -s dungeo`
- Test `--world-json` output includes regions/scenes fields
- Verify World Explorer tree shows region grouping (if Dungeo has regions assigned)
- Package new VSIX

---

## Dependency Order

```
Phase 1 (fast-cli.ts)
  └─► Phase 2 (world-explorer.ts + entity-completions.ts)
        └─► Phase 3 (build + test)
```

## Notes

- Dungeo doesn't have rooms assigned to regions yet (Phase 8 of ADR-149 was skipped), so the region grouping will show "Unassigned" for all rooms. This is correct behavior — it validates the feature works with empty region data.
- Scene data will also be empty until a story creates scenes via `createScene()`.
- The extension changes are purely additive — existing features remain unchanged.
