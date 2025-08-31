# Opening Action Event Data Analysis

## Current Event Structure

### Events Emitted

The opening action emits three events on success:

1. **`opened`** (Domain Event)
   ```typescript
   {
     targetId: EntityId,
     targetName: string,
     customMessage?: string,      // From IOpenResult
     sound?: string,              // From IOpenResult
     revealsContents?: boolean    // From IOpenResult
   }
   ```

2. **`if.event.opened`** (Action Event)
   ```typescript
   {
     // From data builder (openedDataConfig):
     target: string,
     targetSnapshot: EntitySnapshot,
     contentsSnapshots: EntitySnapshot[],
     targetId: EntityId,
     
     // Added manually in report():
     containerId: EntityId,           // Duplicate of targetId
     containerName: string,           // Duplicate of targetName
     isContainer: boolean,
     isDoor: boolean,
     isSupporter: boolean,
     hasContents: boolean,
     contentsCount: number,
     contentsIds: EntityId[],
     revealedItems: number,          // Same as contentsCount
     item: string                    // Same as targetName
   }
   ```

3. **`action.success`**
   ```typescript
   {
     actionId: string,
     messageId: 'opened' | 'its_empty',
     params: {
       item?: string,      // For 'opened'
       container?: string  // For 'its_empty'
     }
   }
   ```

### Error Events

On failure, emits `action.error`:
```typescript
{
  actionId: string,
  error: string,
  reason: string,
  messageId: string,
  params: {
    item?: string,
    targetSnapshot?: EntitySnapshot,
    indirectTargetSnapshot?: EntitySnapshot
  }
}
```

## Issues Found

### 1. Data Redundancy
- `containerId` duplicates `targetId`
- `containerName` duplicates `targetName` 
- `item` duplicates `targetName`
- `revealedItems` duplicates `contentsCount`

### 2. Inconsistent Data Building
- Data builder creates minimal structure
- Report method manually adds many fields
- Not using the data builder pattern effectively

### 3. Missing Type Safety
- `fullEventData` built as generic Record<string, any>
- No type checking for event data structure
- OpenedEventData interface exists but isn't enforced

### 4. Unclear Separation
- Domain event (`opened`) has behavior-specific data
- Action event (`if.event.opened`) has everything
- Some data appears in multiple events

## Recommendations

### 1. Clean Up Redundancy
Remove duplicate fields from `if.event.opened`:
- Use `targetId` instead of `containerId`
- Use `targetName` instead of `containerName` and `item`
- Use `contentsCount` instead of `revealedItems`

### 2. Improve Data Builder Usage
Move more logic into the data builder:
```typescript
export const buildOpenedData: ActionDataBuilder<OpenedEventData> = (
  context: ActionContext
): OpenedEventData => {
  const noun = context.command.directObject?.entity;
  if (!noun) return { targetId: '', targetName: 'nothing' };
  
  const isContainer = noun.has(TraitType.CONTAINER);
  const isDoor = noun.has(TraitType.DOOR);
  const isSupporter = noun.has(TraitType.SUPPORTER);
  const contents = isContainer ? context.world.getContents(noun.id) : [];
  
  return {
    targetId: noun.id,
    targetName: noun.name,
    targetSnapshot: captureEntitySnapshot(noun, context.world, false),
    isContainer,
    isDoor,
    isSupporter,
    hasContents: contents.length > 0,
    contentsCount: contents.length,
    contentsIds: contents.map(e => e.id),
    contentsSnapshots: captureEntitySnapshots(contents, context.world)
  };
};
```

### 3. Type Safety
- Use `OpenedEventData` type explicitly
- Remove manual field additions in report()
- Ensure data builder returns typed data

### 4. Event Data Philosophy

#### What Stdlib Should Provide
- **Core facts**: What was opened, what it contains
- **State snapshots**: For atomic event processing
- **Type indicators**: isContainer, isDoor, etc.
- **Basic metrics**: contentsCount, hasContents

#### What Stdlib Should NOT Provide
- Display formatting hints
- Message customization (beyond messageId)
- Story-specific metadata

### 5. Proposed Clean Structure

**Domain Event (`opened`)**
```typescript
{
  targetId: EntityId,
  targetName: string,
  // Behavior results only if they affect domain logic
  revealsContents?: boolean
}
```

**Action Event (`if.event.opened`)**
```typescript
{
  targetId: EntityId,
  targetName: string,
  targetSnapshot: EntitySnapshot,
  
  // Type info
  isContainer: boolean,
  isDoor: boolean,
  isSupporter: boolean,
  
  // Contents info
  hasContents: boolean,
  contentsCount: number,
  contentsIds: EntityId[],
  contentsSnapshots: EntitySnapshot[]
}
```

**Success Event (`action.success`)**
```typescript
{
  actionId: string,
  messageId: string,
  params: {
    item: string,
    isEmpty?: boolean
  }
}
```

## Implementation Priority

1. **Phase 1**: Remove redundant fields (backward compatibility concern)
2. **Phase 2**: Improve data builder to handle all data construction
3. **Phase 3**: Add proper TypeScript types throughout
4. **Phase 4**: Consider standardizing this pattern across all actions

## Backward Compatibility Notes

Removing redundant fields could break existing story event handlers that expect:
- `containerId` (use `targetId` instead)
- `containerName` (use `targetName` instead)
- `revealedItems` (use `contentsCount` instead)

Consider deprecation strategy or maintaining for compatibility.