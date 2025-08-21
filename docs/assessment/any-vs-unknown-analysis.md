# Any vs Unknown for Event Data

## The Key Difference

- **`any`**: Disables TypeScript checking - you can access any property without errors
- **`unknown`**: Forces type checking - you must narrow the type before use

## Current Problem

With `data?: Record<string, unknown>`:
```typescript
// This fails at compile time
const data = event.data as RoomDescriptionData; // Error: can't convert Record to RoomDescriptionData
// Forces ugly double-casting
const data = event.data as unknown as RoomDescriptionData;
```

## Option 1: Using `any`

```typescript
interface ISemanticEvent {
  data?: any;
}

// In text service
private translateRoomDescription(event: ISemanticEvent): string {
  const data = event.data as RoomDescriptionData; // Works! Single cast
  if (!data.roomId) return ''; // No compile error
  return data.roomDescription; // No compile error
}
```

**Pros:**
- Simple, single type assertion
- No double-casting needed
- Matches JavaScript's dynamic nature
- Easy migration path

**Cons:**
- No type safety at all
- Can access non-existent properties without compile-time errors
- Typos won't be caught (`data.romId` instead of `roomId`)

## Option 2: Using `unknown`

```typescript
interface ISemanticEvent {
  data?: unknown;
}

// In text service
private translateRoomDescription(event: ISemanticEvent): string {
  const data = event.data as RoomDescriptionData; // Works! Single cast from unknown
  if (!data.roomId) return ''; // Type-safe after cast
  return data.roomDescription; // Type-safe after cast
}
```

**Pros:**
- Forces explicit type assertion (intentional, not accidental)
- After assertion, full type safety
- Better documents intent
- Catches typos after the cast

**Cons:**
- Can't do quick property checks without casting
- Slightly more verbose for simple checks

## Option 3: Generic Events (Future Enhancement)

```typescript
interface ISemanticEvent<T = unknown> {
  data?: T;
}

// Usage
type RoomEvent = ISemanticEvent<RoomDescriptionData>;

// But in practice, events flow through a general pipeline
// so you lose the generic type anyway
```

## Real-World Usage Patterns

### Pattern 1: Type Guard Functions (works with both)
```typescript
function isRoomDescriptionData(data: unknown): data is RoomDescriptionData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'roomId' in data &&
    typeof (data as any).roomId === 'string'
  );
}

// Usage (same for any or unknown)
if (isRoomDescriptionData(event.data)) {
  // data is now typed as RoomDescriptionData
  console.log(data.roomId);
}
```

### Pattern 2: Runtime Validation (works with both)
```typescript
private translateRoomDescription(event: ISemanticEvent): string {
  if (!event.data) return '';
  
  // With 'any'
  if (typeof event.data.roomId !== 'string') return '';
  
  // With 'unknown' 
  const data = event.data as RoomDescriptionData;
  if (typeof data.roomId !== 'string') return '';
  
  // Continue with validated data...
}
```

### Pattern 3: Direct Access (only with 'any')
```typescript
// Quick checks without casting (only works with 'any')
if (event.data?.roomId) {
  // do something
}

// With 'unknown' you'd need
if ((event.data as any)?.roomId) {
  // defeats the purpose
}
```

## Event Creation Side

Both work the same for creating events:

```typescript
// With any
const event: ISemanticEvent = {
  type: 'room.description',
  data: { roomId: 'r01', description: 'A room' } // No type checking
};

// With unknown  
const event: ISemanticEvent = {
  type: 'room.description',
  data: { roomId: 'r01', description: 'A room' } // No type checking
};
```

## Recommendation: Use `unknown`

After analysis, **`unknown` is the better choice** because:

1. **It's the correct semantic meaning** - we truly don't know what type of data each event carries
2. **Forces intentional type assertions** - you must explicitly say "I know this is RoomDescriptionData"
3. **Single cast works** - `event.data as RoomDescriptionData` works fine with unknown
4. **Better for refactoring** - When we make events atomic, we'll define interfaces for each event's data
5. **Aligns with TypeScript best practices** - `unknown` is preferred over `any` for "I don't know" scenarios

The key insight: **`unknown` doesn't require double-casting** like `Record<string, unknown>` does:

```typescript
// Current (Record<string, unknown>) - REQUIRES double-cast
const data = event.data as unknown as RoomDescriptionData; // Ugly!

// With unknown - SINGLE cast works
const data = event.data as RoomDescriptionData; // Clean!

// With any - SINGLE cast works but less safe
const data = event.data as RoomDescriptionData; // Works but no safety
```

## Migration Path

1. Change to `data?: unknown` (safer than `any`)
2. Use single type assertions in consumers
3. Add runtime validation where needed
4. Eventually define specific event data interfaces
5. Consider generic events in the future if beneficial

## Conclusion

**Use `data?: unknown`** because:
- It's semantically correct (we don't know the type)
- Single type assertion works (no double-casting)
- Forces explicit, intentional type narrowing
- Aligns with TypeScript best practices
- Provides a safer migration path

The problem wasn't `any` vs `unknown` - it was `Record<string, unknown>` being too specific, forcing double-casts. Both `any` and `unknown` fix this, but `unknown` is safer.