# ADR-016: Author Recorded Event Metadata

## Status
Future Enhancement (Not Implemented)

## Context
During the implementation of ADR-014 (Unrestricted World Model Access), we identified three modes of operation:
1. **WorldModel** - Enforces rules and records gameplay events
2. **AuthorModel** - Bypasses rules, no events (pure setup)
3. **AuthorModel with Events** - Bypasses rules but records authoring events

For the initial implementation, we chose a simple boolean flag to control event recording:
```typescript
author.moveEntity('Fridge', 'Kitchen', true); // record events
author.moveEntity('Fridge', 'Kitchen', false); // don't record events
```

However, there's potential value in recording richer metadata with author events to support debugging, tooling, and story analysis.

## Proposed Enhancement

Replace the boolean flag with an options object that supports metadata injection:

```typescript
interface AuthorEventOptions {
  recordEvent?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
  phase?: 'setup' | 'runtime' | 'test';
}

// Usage examples
author.moveEntity('Key', 'Drawer', {
  recordEvent: true,
  metadata: {
    hint: 'Players need to find this key to progress',
    difficulty: 'hidden',
    sourceFile: 'mansion.ts',
    lineNumber: 45
  },
  tags: ['puzzle', 'critical-path']
});
```

## Use Cases

### 1. Source Tracking
Track where in story files entities were created and modified:
```typescript
{
  type: 'author:entity:created',
  entity: 'Golden Key',
  metadata: {
    sourceFile: 'stories/mansion.ts',
    lineNumber: 45,
    functionName: 'setupLibrary()',
    storyName: 'The Haunted Mansion'
  }
}
```

### 2. Debugging Context
Rich debugging information for development tools:
```typescript
{
  type: 'author:entity:moved',
  entity: 'Poison',
  to: 'Wine Glass',
  metadata: {
    stackTrace: [...],
    authorNote: 'This is how the murder happens',
    phase: 'puzzle-setup'
  }
}
```

### 3. Tool Integration
Support for visual editors and external tools:
```typescript
{
  type: 'author:entity:moved',
  entity: 'Bookshelf',
  to: 'Library',
  metadata: {
    tool: 'SharpeeVisualEditor',
    version: '1.0.0',
    userName: 'StoryAuthor42',
    position: { x: 100, y: 200 },
    undoGroup: 'move-furniture-batch-1'
  }
}
```

### 4. Testing and Validation
Test metadata for verification and debugging:
```typescript
{
  type: 'author:entity:created',
  entity: 'Test Cabinet',
  metadata: {
    test: true,
    testName: 'container-hierarchies.test.ts',
    testCase: 'should handle closed containers',
    expectedBehavior: 'medicine should be invisible until opened'
  }
}
```

## Benefits

### Development Tools
- **Visual Story Debugger**: Timeline view of world construction
- **Story Validation**: Ensure critical items are properly placed
- **Author Analytics**: Understand how authors build worlds
- **Debugging**: Trace where and why entities were created

### Example Tool Usage
```typescript
// Visual debugger could show construction timeline
const timeline = events
  .filter(e => e.type.startsWith('author:'))
  .map(e => ({
    time: e.metadata.timestamp,
    action: e.type,
    location: `${e.metadata.sourceFile}:${e.metadata.lineNumber}`,
    preview: generatePreview(e)
  }));

// Validate story completeness
const criticalItems = events
  .filter(e => e.metadata?.tags?.includes('critical-path'))
  .map(e => e.entity);
```

## Implementation Considerations

### Backward Compatibility
Support both boolean and options object:
```typescript
class AuthorModel {
  moveEntity(
    entityId: string, 
    targetId: string, 
    options?: AuthorEventOptions | boolean
  ): void {
    // Handle legacy boolean
    const opts = typeof options === 'boolean' 
      ? { recordEvent: options } 
      : options;
    
    if (opts?.recordEvent && this.events) {
      this.events.emit('author:entity:moved', {
        entityId,
        targetId,
        ...this.defaultMetadata,
        ...opts.metadata
      });
    }
  }
}
```

### Default Metadata
The AuthorModel could automatically inject:
- Timestamp
- Stack trace (in development mode)
- Current phase (setup/runtime/test)
- Source location (if available)

### Performance
- Metadata collection should be optional
- Stack traces expensive - only in development
- Consider lazy evaluation of expensive metadata

## Migration Path

1. **Phase 1**: Current implementation with boolean flag
2. **Phase 2**: Add options object support while maintaining boolean compatibility
3. **Phase 3**: Deprecate boolean in favor of options object
4. **Phase 4**: Remove boolean support in major version

## Decision

**Status: Deferred**

For now, we're implementing the simple boolean flag approach. This enhancement can be added later when:
- We have real-world usage patterns to inform the metadata design
- Tools exist that would benefit from the metadata
- Performance impact is better understood
- Clear use cases emerge from author feedback

The boolean flag provides the essential functionality (recording author events) while keeping the API simple. We can extend to rich metadata when the need becomes clear.

## References
- ADR-014: Unrestricted World Model Access
- Event Sourcing patterns
- Development tool integration patterns in game engines
