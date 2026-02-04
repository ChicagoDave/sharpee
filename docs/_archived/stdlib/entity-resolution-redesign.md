# Entity Resolution Redesign

## Current Problem

The CommandValidator is doing fuzzy text matching on entity names using `name.includes(word)`, which causes incorrect matches like:
- "gem" matching "chest" 
- "bell" matching "door bell"
- General substring matching that's too loose

## Proposed Solution

### 1. Add Name Index to WorldModel

WorldModel should maintain an index of entity names for efficient lookup:

```typescript
interface WorldModel {
  // New method
  getEntitiesByName(name: string): IFEntity[];
  
  // Internal name index
  private nameIndex: Map<string, Set<string>>; // name -> entity IDs
}
```

### 2. Redesign Entity Resolution Flow

Current flow:
1. CommandValidator gets all entities
2. Filters by scope
3. Does fuzzy scoring on names

New flow:
1. CommandValidator gets candidate entities by exact name match
2. If no exact matches, try type/synonym matches
3. Filter candidates by scope
4. Score only the filtered candidates

### 3. Improve Scoring Algorithm

Replace substring matching with:
- Exact word matches only
- No partial string matching
- Prioritize exact matches over fuzzy matches
- Use vocabulary candidates from parser

### 4. Implementation Steps

1. **Update WorldModel** to maintain name index
2. **Update CommandValidator.resolveEntity** to:
   - First try exact name lookup via WorldModel
   - Then filter by scope
   - Only score entities that pass scope check
3. **Fix scoring algorithm** to remove substring matching

## Benefits

1. **Performance**: O(1) name lookup instead of O(n) iteration
2. **Accuracy**: No more false positives from substring matching
3. **Predictability**: Players get what they type, not fuzzy matches
4. **Scope-first**: Only considers entities in scope

## Example

When player types "take gem":
- Old: Iterates all entities, "chest" scores because it contains "e"
- New: Looks up entities named "gem", finds none in scope, returns ENTITY_NOT_FOUND