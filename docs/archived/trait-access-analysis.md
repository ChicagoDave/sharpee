# Trait Access Solutions Harvey Ball Analysis

## Rating Criteria
- **Type Safety**: Does TypeScript know the shape at compile time?
- **Refactor Safety**: How well does it handle trait schema changes?
- **Readability**: How clear is the code?
- **Consistency**: Can we use the same pattern everywhere?
- **Performance**: Runtime overhead

## Rating Scale
- ● = Excellent (5/5)
- ◕ = Good (4/5)
- ◗ = Fair (3/5)
- ◔ = Poor (2/5)
- ○ = Very Poor (1/5)

## Solutions Overview

### Solution A: Entity Convenience Getters
```typescript
if (entity.isOpen) { ... }
```

### Solution B: Cast Trait with Type
```typescript
const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
if (openable?.isOpen) { ... }
```

### Solution C: Generic Type Assertion
```typescript
const trait = entity.get(TraitType.OPENABLE);
if ((trait as any).isOpen) { ... }
```

### Solution D: Interface Casting
```typescript
const openable = entity.get(TraitType.OPENABLE) as { isOpen: boolean };
if (openable?.isOpen) { ... }
```

## Analysis by Trait

### OPENABLE (isOpen, canClose, etc.)
| Solution | Type Safety | Refactor Safety | Readability | Consistency | Performance | Overall |
|----------|------------|-----------------|-------------|-------------|-------------|---------|
| A (entity.isOpen) | ◕ | ◗ | ● | ◔ | ● | ◗ |
| B (as OpenableTrait) | ● | ● | ◕ | ● | ◕ | ● |
| C (as any) | ○ | ○ | ◗ | ● | ● | ◔ |
| D (as interface) | ◕ | ◗ | ◕ | ● | ● | ◕ |

**Notes**: Entity already has `isOpen` getter, but not all properties are exposed

### CONTAINER (capacity, isTransparent, etc.)
| Solution | Type Safety | Refactor Safety | Readability | Consistency | Performance | Overall |
|----------|------------|-----------------|-------------|-------------|-------------|---------|
| A (entity.capacity) | ○ | ○ | ● | ○ | ● | ◔ |
| B (as ContainerTrait) | ● | ● | ◕ | ● | ◕ | ● |
| C (as any) | ○ | ○ | ◗ | ● | ● | ◔ |
| D (as interface) | ◕ | ◗ | ◕ | ● | ● | ◕ |

**Notes**: No convenience getters for container properties

### LOCKABLE (isLocked, keyId, etc.)
| Solution | Type Safety | Refactor Safety | Readability | Consistency | Performance | Overall |
|----------|------------|-----------------|-------------|-------------|-------------|---------|
| A (entity.isLocked) | ◕ | ◗ | ● | ◔ | ● | ◗ |
| B (as LockableTrait) | ● | ● | ◕ | ● | ◕ | ● |
| C (as any) | ○ | ○ | ◗ | ● | ● | ◔ |
| D (as interface) | ◕ | ◗ | ◕ | ● | ● | ◕ |

**Notes**: Entity has `isLocked` getter but not other properties like `keyId`

### IDENTITY (name, description, nouns, adjectives)
| Solution | Type Safety | Refactor Safety | Readability | Consistency | Performance | Overall |
|----------|------------|-----------------|-------------|-------------|-------------|---------|
| A (entity.name) | ◕ | ◗ | ● | ◔ | ● | ◗ |
| B (as IdentityTrait) | ● | ● | ◕ | ● | ◕ | ● |
| C (as any) | ○ | ○ | ◗ | ● | ● | ◔ |
| D (as interface) | ◕ | ◗ | ◕ | ● | ● | ◕ |

**Notes**: Entity has `name` and `description` getters, but not `nouns` or `adjectives`

### WEARABLE (isWorn, wearSlot, etc.)
| Solution | Type Safety | Refactor Safety | Readability | Consistency | Performance | Overall |
|----------|------------|-----------------|-------------|-------------|-------------|---------|
| A (entity.isWorn) | ○ | ○ | ● | ○ | ● | ◔ |
| B (as WearableTrait) | ● | ● | ◕ | ● | ◕ | ● |
| C (as any) | ○ | ○ | ◗ | ● | ● | ◔ |
| D (as interface) | ◕ | ◗ | ◕ | ● | ● | ◕ |

**Notes**: No convenience getters for wearable properties

### ROOM (visited, exits, etc.)
| Solution | Type Safety | Refactor Safety | Readability | Consistency | Performance | Overall |
|----------|------------|-----------------|-------------|-------------|-------------|---------|
| A (entity.isRoom) | ◔ | ◔ | ● | ○ | ● | ◔ |
| B (as RoomTrait) | ● | ● | ◕ | ● | ◕ | ● |
| C (as any) | ○ | ○ | ◗ | ● | ● | ◔ |
| D (as interface) | ◕ | ◗ | ◕ | ● | ● | ◕ |

**Notes**: Only has `isRoom` check, no property getters

## Summary

### Overall Rankings by Solution
1. **Solution B (Cast to Trait Class)**: ● - Best overall
   - Pros: Full type safety, refactor-safe, consistent
   - Cons: Requires importing trait classes

2. **Solution D (Cast to Interface)**: ◕ - Good compromise
   - Pros: Good type safety, no imports needed
   - Cons: Must maintain interface definitions

3. **Solution A (Convenience Getters)**: ◗ - Limited use
   - Pros: Most readable, fastest
   - Cons: Only covers some properties, inconsistent

4. **Solution C (as any)**: ◔ - Not recommended
   - Pros: Works everywhere
   - Cons: No type safety, error-prone

## Recommendation

**Primary Pattern**: Use Solution B (Cast to Trait Class) for most cases
```typescript
const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
if (openable?.isOpen) { ... }
```

**Secondary Pattern**: Use Solution A where convenience getters exist
```typescript
// For simple boolean checks
if (entity.isOpen) { ... }
if (entity.name === 'sword') { ... }
```

**Fallback Pattern**: Use Solution D for external packages that can't import trait classes
```typescript
const container = entity.get(TraitType.CONTAINER) as { capacity?: number };
```

## Implementation Notes

1. **Import Management**: Solution B requires importing trait classes. Consider re-exporting all traits from a single location.

2. **Type Guards**: Consider adding type guard functions for traits:
```typescript
function isOpenableTrait(trait: Trait): trait is OpenableTrait {
  return trait.type === TraitType.OPENABLE;
}
```

3. **Missing Convenience Getters**: Add more getters to IFEntity for commonly accessed properties:
```typescript
get capacity(): number | undefined {
  const container = this.get(TraitType.CONTAINER) as ContainerTrait;
  return container?.capacity?.maxItems;
}
```
