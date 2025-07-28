# Text Service Migration Guide

## Overview

The text service has been moved from `@sharpee/engine` to its own packages:
- `@sharpee/text-service` - Core interfaces and base implementation
- `@sharpee/text-service-basic` - Basic text service implementation

## Breaking Changes

### 1. Import Changes

**Before:**
```typescript
import { TextService, TextChannel, createBasicTextService } from '@sharpee/engine';
```

**After:**
```typescript
import { TextService, TextChannel } from '@sharpee/text-service';
import { createBasicTextService } from '@sharpee/text-service-basic';
```

### 2. Engine API Changes

The engine now uses the new text service internally and provides methods to access it:

```typescript
// Get text output after a turn
const output = engine.getTextOutput();

// Get the text service instance
const textService = engine.getTextService();

// Set a custom text service
engine.setTextService(myCustomTextService);
```

### 3. Text Service Architecture

The new text service uses a query-based architecture:
- Text service queries the event source and world model
- All queries are recorded for debugging
- Text is generated after the turn completes

## Migration Steps

### 1. Update Dependencies

```json
{
  "dependencies": {
    "@sharpee/text-service": "^0.0.1",
    "@sharpee/text-service-basic": "^0.0.1"
  }
}
```

### 2. Update Imports

Update all imports to use the new packages as shown above.

### 3. Update Text Output Handling

**Before:**
```typescript
// Text was handled internally by engine
const result = await engine.executeTurn('look');
// Text was written to channels automatically
```

**After:**
```typescript
// Execute turn
const result = await engine.executeTurn('look');

// Get the generated text
const text = engine.getTextOutput();
console.log(text);
```

### 4. Custom Text Services

To create a custom text service:

```typescript
import { BaseTextService, TextServiceMetadata, TextOutput } from '@sharpee/text-service';

class MyTextService extends BaseTextService {
  async generateText(turnNumber: number): Promise<TextOutput> {
    // Query events for this turn
    const events = this.queryEvents({ turn: turnNumber });
    
    // Process events into text
    // ...
    
    return {
      text: generatedText,
      metadata: { turnNumber }
    };
  }
  
  getMetadata(): TextServiceMetadata {
    return {
      id: 'my-text-service',
      name: 'My Custom Text Service',
      description: 'Custom text generation',
      version: '1.0.0'
    };
  }
}

// Use it
const textService = new MyTextService();
engine.setTextService(textService);
```

## Benefits

1. **Separation of Concerns**: Text generation is now completely separate from game logic
2. **Extensibility**: Easy to create custom text services with different styles
3. **Debugging**: All queries are recorded for analysis
4. **Message ID Support**: Full support for the Enhanced Context Pattern

## Enhanced Context Pattern

Actions now emit message IDs instead of direct text:

```typescript
// In action
context.emitSuccess('taken', { object: target });

// Resolves to message ID: 'if.action.taking.taken'
// Language provider returns: "You take the {object}."
// Final output: "You take the red ball."
```

## Backward Compatibility

The basic text service maintains backward compatibility:
- Falls back to direct text in event data
- Handles old event formats
- No changes needed for existing stories

## Further Reading

- [Text Service Documentation](@sharpee/text-service README)
- [Basic Text Service Documentation](@sharpee/text-service-basic README)
- [Enhanced Context Pattern](../../stdlib/docs/enhanced-context-pattern.md)
