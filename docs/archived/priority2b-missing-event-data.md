# Priority 2B: Fix Missing Event Data in Actions

## Most Common Missing Fields

### 1. **answering action** - Missing `expectedAnswer` field
```typescript
// Test expects when answer matches expectedResponse:
eventData.expectedAnswer = true

// Fix in answering.ts: Add after line checking expectedResponse
if (pendingQuestion.expectedResponse === normalizedResponse) {
  eventData.expectedAnswer = true;
}
```

### 2. **dropping action** - Missing `toContainer`/`toSupporter` flags
```typescript
// Test expects:
toContainer: true  // when dropping in container
toSupporter: true  // when dropping on supporter

// Fix: Add flags based on destination type
```

### 3. **inventory action** - Missing `items` array
```typescript
// Test expects:
data.items = [
  { id: 'o01', name: 'sword', worn: false },
  { id: 'o02', name: 'cloak', worn: true }
]

// Fix: Build items array from player inventory
```

### 4. **examining action** - Missing fields for doors
```typescript
// Test expects for doors:
isOpen: false
isOpenable: true

// Fix: Add these fields when examining doors
```

### 5. **attacking action** - Missing `willBreak` field
```typescript
// Test expects:
willBreak: undefined  // for non-fragile objects

// Fix: Explicitly set willBreak field
```

## Implementation Order
1. Fix answering action (simple flag addition)
2. Fix dropping action (container/supporter detection)
3. Fix inventory action (build items array)
4. Fix examining action (door fields)
5. Fix other actions with missing fields
