# Stdlib Test Suite - Fix Templates & Patterns

## Overview
This document provides templates and patterns for fixing common test issues in the stdlib test suite.

## 1. TestData.basicSetup() Fix Pattern

### Problem
```typescript
const { world, player, room } = TestData.basicSetup();
```

### Solution
```typescript
const { world, player, room } = setupBasicWorld();
```

### Bulk Fix Command
```bash
# Find all occurrences
grep -r "TestData\.basicSetup" packages/stdlib/tests/

# Replace (be careful with sed on different platforms)
find packages/stdlib/tests -name "*.ts" -exec sed -i 's/TestData\.basicSetup/setupBasicWorld/g' {} \;
```

## 2. Command Structure Fix Pattern

### Problem - Two-object commands
```typescript
const command = createCommand(IFActions.PUTTING,
  { entity: item },
  { entity: container }
);
```

### Solution
```typescript
const command = createCommand(IFActions.PUTTING, {
  entity: item,
  secondEntity: container,
  preposition: 'in'  // if needed
});
```

### Affected Actions
- PUTTING (put X in/on Y)
- GIVING (give X to Y)
- SHOWING (show X to Y)
- THROWING (throw X at Y)
- UNLOCKING (unlock X with Y)
- LOCKING (lock X with Y)
- INSERTING (insert X into Y)
- REMOVING (remove X from Y)

## 3. Event Property Separation Pattern

### Problem - Mixed event data and message params
```typescript
const eventData = {
  item: noun.name,
  container: target.name,
  preposition: 'in'  // Not needed for message
};
events.push(...context.emitSuccess('put_in', eventData));
```

### Solution - Separate concerns
```typescript
// Rich data for world model event
const eventData = {
  itemId: noun.id,
  targetId: target.id,
  preposition: 'in'
};
events.push(context.emit('if.event.put_in', eventData));

// Minimal params for message
const messageParams = {
  item: noun.name,
  container: target.name
};
events.push(...context.emitSuccess('put_in', messageParams));
```

## 4. Entity Resolution Pattern

### Problem - Using non-existent method
```typescript
const box = world.getEntityByName('wooden box')!;
```

### Solution A - Use TestData return value
```typescript
const { world, player, room, object: box } = TestData.withObject('wooden box', {
  // traits...
});
```

### Solution B - Use helper function
```typescript
const box = findEntityByName(world, 'wooden box')!;
```

### Solution C - Use created entity directly
```typescript
const box = world.createEntity('wooden box', 'object');
// ... add traits ...
// Use box directly - no need to find it!
```

## 5. Player Setup Pattern

### Problem - No player set
```typescript
test('should do something', () => {
  const world = new WorldModel();
  // Missing player setup!
});
```

### Solution
```typescript
test('should do something', () => {
  const { world, player, room } = setupBasicWorld();
  // Player is now set!
});
```

## 6. Trait Addition Pattern

### Problem - Missing type property
```typescript
item.add({
  weight: 5,
  damage: 10
}); // Error: Invalid trait: must have a type property
```

### Solution
```typescript
item.add({
  type: TraitType.IDENTITY,
  weight: 5
});
```

## 7. Message ID Pattern

### Problem - Fully qualified IDs
```typescript
// Test expects
expect(messageId).toBe('brief_nap');

// But action outputs
'if.action.sleeping.brief_nap'
```

### Solution - Fixed in resolveMessageId
```typescript
resolveMessageId(shortId: string): string {
  // Return the message ID as-is
  return shortId;
}
```

## 8. Parser Integration Pattern

### Template for parser helper
```typescript
// In test-utils/index.ts
import { Parser } from '@sharpee/parser-en-us';

export function createParserWithWorld(world: WorldModel) {
  const parser = new Parser({
    world,
    language: 'en-us'
  });
  return parser;
}

// In tests
const parser = createParserWithWorld(world);
const parsedCommand = parser.parse('take the red ball');
```

## 9. Capability Pattern

### Problem - Missing setCapability
```typescript
world.setCapability(StandardCapabilities.COMMAND_HISTORY, historyData);
// TypeError: world.setCapability is not a function
```

### Solution - Mock or implement capability system
```typescript
// Option 1: Mock in tests
const mockWorld = {
  ...world,
  setCapability: jest.fn(),
  getCapability: jest.fn()
};

// Option 2: Skip capability tests until implemented
test.skip('should work with capabilities', () => {
  // ...
});
```

## 10. Common Test Patterns

### Basic Action Test Structure
```typescript
describe('actionName (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(action.id).toBe(IFActions.ACTION_NAME);
    });
    
    test('should declare required messages', () => {
      expect(action.requiredMessages).toContain('message_id');
    });
  });
  
  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.ACTION_NAME);
      const context = createRealTestContext(action, world, command);
      
      const events = action.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target')
      });
    });
  });
  
  describe('Successful Execution', () => {
    test('should perform action', () => {
      const { world, player, room } = setupBasicWorld();
      // ... setup ...
      
      const events = action.execute(context);
      
      expectEvent(events, 'if.event.action_completed', {
        // expected data
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('success_message')
      });
    });
  });
});
```

### Event Validation Pattern
```typescript
// Use expectEvent helper
expectEvent(events, 'if.event.taken', {
  itemId: item.id,
  fromLocation: room.id
});

// For flexible message ID matching
expectEvent(events, 'action.success', {
  messageId: expect.stringContaining('taken'),
  params: { item: 'gold coin' }
});
```

### Test Data Builder Pattern
```typescript
// Create world with specific setup
const { world, player, room, object } = TestData.withObject('red ball', {
  [TraitType.IDENTITY]: {
    type: TraitType.IDENTITY,
    weight: 1
  }
});

// Create container with object
const { world, player, room, container, object } = TestData.withContainer(
  'wooden box',
  'gold coin'
);

// Create world with NPC
const { world, player, room, npc } = TestData.withNPC('guard', {
  [TraitType.CONVERSABLE]: {
    type: TraitType.CONVERSABLE
  }
});
```

## Bulk Fix Scripts

### Safe Pattern Update Process
1. **Always backup first**
   ```bash
   cp -r packages/stdlib/tests packages/stdlib/tests.backup
   ```

2. **Find occurrences**
   ```bash
   grep -r "pattern" packages/stdlib/tests/ > occurrences.txt
   ```

3. **Test on single file first**
   ```bash
   sed -i.bak 's/old_pattern/new_pattern/g' single_test_file.ts
   diff single_test_file.ts.bak single_test_file.ts
   ```

4. **Apply to all if safe**
   ```bash
   find packages/stdlib/tests -name "*.ts" -exec sed -i 's/old_pattern/new_pattern/g' {} \;
   ```

5. **Verify compilation**
   ```bash
   cd packages/stdlib && pnpm tsc --noEmit
   ```

6. **Run tests to check**
   ```bash
   cd packages/stdlib && pnpm test
   ```

## Common Pitfalls to Avoid

1. **Don't assume all patterns are identical**
   - Check for variations in spacing, line breaks
   - Some patterns span multiple lines

2. **Don't break multiline structures**
   - TestData.withObject often spans multiple lines
   - Command creation can be multiline

3. **Don't forget imports**
   - Adding findEntityByName requires import update
   - Using new test utilities needs imports

4. **Don't mix test utilities**
   - Use either TestData patterns OR direct world manipulation
   - Don't mix approaches in same test

5. **Don't ignore TypeScript errors**
   - Fix type issues immediately
   - Don't use `as any` to bypass problems
