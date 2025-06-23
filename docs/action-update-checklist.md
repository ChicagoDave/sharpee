# Action Update Checklist

## Pattern to Follow
Use `taking.ts` as the reference implementation. Each action needs these changes:

### 1. Update Imports
```typescript
// OLD
import { IFCommand } from '../parser/if-parser-types';

// NEW
import { ResolvedIFCommand } from '../parser/if-parser-types';
```

### 2. Update Validate Function Signature
```typescript
// OLD
validate: (command: IFCommand, context: GameContext): boolean | string => {

// NEW
validate: (command: ResolvedIFCommand, context: GameContext): boolean | string => {
```

### 3. Update Execute Function Signature
```typescript
// OLD
execute: (command: IFCommand, context: GameContext): SemanticEvent[] => {

// NEW
execute: (command: ResolvedIFCommand, context: GameContext): SemanticEvent[] => {
```

### 4. Fix Entity Access
```typescript
// OLD
const target = command.noun[0].entity;

// NEW
const target = command.noun;  // It's already an Entity, not an array
```

### 5. Fix Actor References
```typescript
// OLD
if (targetId === command.actor) {

// NEW
if (targetId === command.actor.id) {
```

### 6. Remove Array Checks
```typescript
// OLD
if (!command.noun || command.noun.length === 0) {

// NEW
if (!command.noun) {
```

### 7. Handle Second Entity
```typescript
// OLD
const indirect = command.second?.[0]?.entity;

// NEW
const indirect = command.second;  // Already resolved
```

## Files to Update

- [ ] asking.ts
- [ ] closing.ts
- [ ] dropping.ts
- [ ] examining.ts
- [ ] giving.ts
- [ ] going.ts
- [ ] locking.ts
- [ ] opening.ts
- [ ] putting.ts
- [ ] switching-off.ts
- [ ] switching-on.ts
- [x] taking.ts (✓ DONE - use as reference)
- [ ] talking.ts
- [ ] telling.ts
- [ ] unlocking.ts
- [ ] using.ts

## Common Gotchas

1. **Direction entities in going.ts**: Directions may need special handling
2. **Multiple targets**: Actions should handle `command.allTargets` if they support \"ALL\"
3. **Entity hooks**: Check for `onTaking`, `onDropping`, etc. attributes on entities
4. **Implicit objects**: Some actions might need to check `command.implicitSecond`

## Testing Each Action

After updating, verify:
1. Action compiles without TypeScript errors
2. Validation logic still makes sense with single entities
3. Execute phase properly uses entity IDs where needed
4. Events contain correct data

## Next Steps After All Actions Updated

1. Update Story class to use new execution pipeline
2. Register all actions with ActionExecutor
3. Update tests
4. Implement Text Service for event → text conversion