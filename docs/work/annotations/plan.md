# Plan: Implement ADR-124 Entity Annotations (All Platform Changes)

## Summary

Implement the full annotation system across both platform packages: world-model (infrastructure) and stdlib (event emission). This covers Phases 1-2 from the Zifmia UX plan — everything that touches `packages/`.

---

## Phase 1: Annotation Infrastructure (world-model)

### 1a. New file: `packages/world-model/src/annotations/types.ts`

```typescript
export interface Annotation {
  kind: string;
  id: string;
  data: Record<string, unknown>;
  condition?: AnnotationCondition;
}

export interface AnnotationCondition {
  trait: string;
  property: string;
  value: unknown;
  scope?: 'self' | 'player' | 'location';
}
```

### 1b. New file: `packages/world-model/src/annotations/index.ts`

Barrel export.

### 1c. Modify: `packages/world-model/src/entities/if-entity.ts`

Add to `IFEntity`:
- Private field: `annotations: Map<string, Annotation[]>` (keyed by kind)
- `annotate(kind, data)` — add an annotation (data includes `id` field)
- `getAnnotations(kind)` — all annotations of a kind (unfiltered)
- `getActiveAnnotations(kind, world)` — condition-filtered; resolves trait state on self/player/location via world
- `removeAnnotation(kind, id)` — remove by kind+id
- Update `clone()` to deep-copy annotations
- Update `toJSON()` / `fromJSON()` for serialization
- **Not** in delta save comparisons (static authored config)

### 1d. Modify: `packages/world-model/src/index.ts`

Add `export * from './annotations';`

### 1e. Tests: `packages/world-model/tests/annotations.test.ts`

- Add/retrieve by kind
- Multiple annotations per kind
- Conditional filtering (trait-based, `scope: self/player/location`)
- Remove by kind+id
- Clone preserves annotations
- toJSON/fromJSON round-trip

---

## Phase 2: Illustration Event Emission (stdlib)

### 2a. New file: `packages/stdlib/src/actions/helpers/emit-illustrations.ts`

Shared helper called from action report() phases:

```typescript
function emitIllustrations(
  entity: IFEntity,
  trigger: 'on-enter' | 'on-examine' | 'manual',
  groupId: string,
  context: ActionContext
): ISemanticEvent[]
```

- Calls `entity.getActiveAnnotations('illustration', context.world)`
- Filters by `data.trigger === trigger`
- Maps each to `context.event('if.event.illustrated', { groupId, entityId, src, alt, position, width })`
- Returns empty array if no matching annotations

### 2b. Modify: `packages/stdlib/src/actions/standard/looking/looking.ts`

In `report()`:
- After creating the main `if.event.looked` text event, call `emitIllustrations(room, 'on-enter', textEvent.id, context)`
- Spread results into the returned event array

### 2c. Modify: `packages/stdlib/src/actions/standard/examining/examining.ts`

In `report()`:
- After creating the main `if.event.examined` text event, call `emitIllustrations(target, 'on-examine', textEvent.id, context)`
- Spread results into the returned event array

### 2d. Tests: `packages/stdlib/tests/emit-illustrations.test.ts`

- Entity with no annotations → empty array
- Entity with matching trigger → illustration events emitted
- Entity with non-matching trigger → filtered out
- Conditional annotations → only active ones emitted
- groupId pairing → matches provided textEvent id

---

## Files Touched

| File | Action | Package |
|------|--------|---------|
| `packages/world-model/src/annotations/types.ts` | Create | world-model |
| `packages/world-model/src/annotations/index.ts` | Create | world-model |
| `packages/world-model/src/entities/if-entity.ts` | Edit | world-model |
| `packages/world-model/src/index.ts` | Edit | world-model |
| `packages/world-model/tests/annotations.test.ts` | Create | world-model |
| `packages/stdlib/src/actions/helpers/emit-illustrations.ts` | Create | stdlib |
| `packages/stdlib/src/actions/standard/looking/looking.ts` | Edit | stdlib |
| `packages/stdlib/src/actions/standard/examining/examining.ts` | Edit | stdlib |
| `packages/stdlib/tests/emit-illustrations.test.ts` | Create | stdlib |

## What This Does NOT Include

- Client rendering (Zifmia Phases 3-4) — not platform, can proceed autonomously
- Story CSS scoping, player preferences, CLI degradation (Phases 5-7)
- Any new annotation kinds beyond `illustration`

## Verification

```bash
pnpm --filter '@sharpee/world-model' test annotations
pnpm --filter '@sharpee/stdlib' test emit-illustrations
./build.sh -s dungeo   # full build to verify no breakage
```
