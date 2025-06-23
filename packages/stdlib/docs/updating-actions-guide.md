# Updating Actions to Use Language System

This document shows the pattern for replacing hard-coded strings with language system messages in action files.

## Pattern

### Before (Hard-coded string):
```typescript
return {
  continue: false,
  events: [
    createEvent(
      StandardEventTypes.ACTION_PREVENTED,
      { reason: 'no_target', message: 'Take what?' },
      { narrate: true }
    )
  ]
};
```

### After (Using language system):
```typescript
return {
  continue: false,
  events: [
    createEvent(
      constants.events.ACTION_PREVENTED,
      { 
        reason: 'no_target', 
        message: context.languageProvider.getMessage('action.taking.no_target') || 'Take what?' 
      },
      { narrate: true }
    )
  ]
};
```

## Key Changes:

1. **Add constants retrieval** at the beginning of each phase:
   ```typescript
   const constants = context.languageProvider.getConstants();
   ```

2. **Replace event type references**:
   - From: `StandardEventTypes.ACTION_PREVENTED`
   - To: `constants.events.ACTION_PREVENTED`

3. **Replace hard-coded messages**:
   - From: `message: 'Some text'`
   - To: `message: context.languageProvider.getMessage('message.key') || 'Some text'`

4. **Update action IDs**:
   - From: `id: 'taking'`
   - To: `id: StandardActions.TAKING`

5. **Fix phase names** (if needed):
   - `check:` → `validate:`
   - `carryOut:` → `execute:`
   - `report:` → `after:`

## Message Key Convention

Use dot notation for message keys:
- `action.{actionName}.{messageType}`
- Examples:
  - `action.taking.no_target`
  - `action.taking.already_held`
  - `action.opening.locked`

## Common Message Types

- `no_target` - When no object is specified
- `not_accessible` - When object can't be reached
- `already_{state}` - When object is already in target state
- `not_{property}` - When object lacks required property
- `cannot_{action}_{target}` - When action can't be performed on target

## Shared Messages

Some messages are shared across actions:
- `container.closed`
- `container.empty`
- `container.contents`
- `container.full`

## Testing

After updating an action:
1. Ensure all imports are correct
2. Verify the action compiles
3. Check that message keys are added to `messages/en-US.ts`
4. Test with and without language provider to ensure fallbacks work
