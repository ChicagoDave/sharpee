# Migration Guide: ADR-041 Simplified Action Context

This guide helps you migrate actions from the old multi-method context API to the new simplified `event()` method.

## What Changed

The `EnhancedActionContext` interface has been simplified from multiple methods to a single `event()` method:

**Old Methods (Removed):**
- `emitSuccess(messageId, params)` 
- `emitError(messageId, params)`
- `emit(type, data)`
- `emitMany(events)`
- `createEvent(type, data)`
- `resolveMessageId(shortId)`

**New Method:**
- `event(type, data)` - Single method for all event creation

## Migration Patterns

### Simple Error

**Old:**
```typescript
return context.emitError('no_target');
```

**New:**
```typescript
return [context.event('action.error', {
  actionId: this.id,
  messageId: 'no_target'
})];
```

### Error with Parameters

**Old:**
```typescript
return context.emitError('not_closable', { item: noun.name });
```

**New:**
```typescript
return [context.event('action.error', {
  actionId: this.id,
  messageId: 'not_closable',
  params: { item: noun.name }
})];
```

### Simple Success

**Old:**
```typescript
return context.emitSuccess('closed', { item: noun.name });
```

**New:**
```typescript
return [context.event('action.success', {
  actionId: this.id,
  messageId: 'closed',
  params: { item: noun.name }
})];
```

### Multiple Events (with typed data)

**Old:**
```typescript
const events: SemanticEvent[] = [];
events.push(context.emit('if.event.closed', closedData));
events.push(...context.emitSuccess('closed', { item: noun.name }));
return events;
```

**New:**
```typescript
return [
  context.event('if.event.closed', closedData),
  context.event('action.success', {
    actionId: this.id,
    messageId: 'closed',
    params: { item: noun.name }
  })
];
```

### Complex Error with Additional Data

**Old:**
```typescript
return [
  context.emit('action.error', {
    actionId: IFActions.CLOSING,
    reason: 'prevents_closing',
    messageId: 'prevents_closing',
    params: { 
      item: noun.name,
      obstacle: requirement.preventedBy 
    },
    data: errorData
  })
];
```

**New:**
```typescript
return [context.event('action.error', {
  actionId: this.id,
  messageId: 'prevents_closing',
  reason: 'prevents_closing',
  params: { 
    item: noun.name,
    obstacle: requirement.preventedBy 
  },
  ...errorData // Spread additional data
})];
```

## Key Points

1. **Always return an array** - Even for single events, wrap in `[]`
2. **Include actionId** - Always set `actionId: this.id` in action.success/error events
3. **Use messageId for text** - The `messageId` field is used by the text service
4. **Add reason for errors** - Include `reason` field in action.error events
5. **Spread typed data** - For domain events like 'if.event.closed', pass typed data directly

## Benefits

- **Consistency** - Single method for all event types
- **Type Safety** - Works better with TypeScript interfaces for event data
- **Simplicity** - Less to remember, easier to use
- **Future Proof** - Easier to extend without breaking changes
