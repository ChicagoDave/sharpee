# ADR-063: Sub-Actions Pattern for Related Action Families

## Status
Proposed

## Context

During Phase 5 of the stdlib refactoring, we identified significant code duplication between paired actions:
- switching_on/switching_off (100+ lines duplicated)
- locking/unlocking (80+ lines duplicated)
- wearing/taking_off (100+ lines duplicated)
- opening/closing, entering/exiting, inserting/removing

Current approach uses shared files (switching-shared.ts, lock-shared.ts, wearable-shared.ts) which creates problems:
1. **Proliferation** - Shared files accumulate at root level
2. **Disconnection** - Shared code separated from consumers
3. **No clear relationships** - Paired actions appear unrelated in structure
4. **Naming awkwardness** - lock-shared.ts, wearable-shared.ts pattern
5. **Internationalization issues** - "on/off" is English-centric

Additionally, considering internationalization:
- Spanish: "encender" (lights) vs "prender" (devices) both map to "turn on"
- German: "einschalten/ausschalten" are natural compounds
- French: "allumer/éteindre" have different connotations than English

## Decision

Implement a **Sub-Actions Pattern** that organizes related actions into families with shared base logic, using **semantic intents** rather than English-centric naming.

Structure:
```
actions/standard/
└── switching/                    # Action family
    ├── index.ts                 # Family exports
    ├── switching-base.ts        # Shared logic
    ├── switching-types.ts       # Common types
    └── variants/                # Semantic variants
        ├── activate/            # Not "on"
        │   └── activate.ts
        └── deactivate/          # Not "off"
            └── deactivate.ts
```

Key principles:
1. **Semantic naming** - Use intents (activate/deactivate) not English words (on/off)
2. **Family grouping** - Related actions stay together
3. **Shared base classes** - Common logic in base, variants extend
4. **Language agnostic** - Structure supports any language mapping

## Consequences

### Positive

1. **Better Organization**
   - Related actions visually grouped
   - Shared code has natural home
   - Clear inheritance/composition patterns

2. **Language Independence**
   - Semantic intents work across languages
   - Each language maps naturally to intents
   - No English bias in architecture

3. **Reduced Duplication**
   - Base classes eliminate redundancy
   - Single source of truth for shared logic
   - Easier maintenance

4. **Scalability**
   - Easy to add new variants
   - Pattern works for complex families
   - Supports future growth

5. **Semantic Grammar Ready**
   - Aligns with ADR-054 semantic properties
   - Actions consume intents, not verb text
   - Clean separation of linguistics/logic

### Negative

1. **Migration Effort**
   - 12 actions need restructuring
   - Import paths change (mitigated by TypeScript)
   - Documentation updates needed

2. **Deeper Nesting**
   - One more directory level
   - Slightly longer paths

3. **Learning Curve**
   - New pattern to understand
   - Different from current flat structure

## Implementation Plan

### Phase 1: Pattern Validation
1. Implement switching family as pilot
2. Validate tests pass
3. Team review

### Phase 2: Migration Priority
Based on duplication and complexity:
1. switching (activate/deactivate)
2. locking (secure/unsecure)
3. wearing (equip/unequip)
4. opening (open/close)
5. entering (enter/exit)
6. inserting (insert/remove)

### Phase 3: Semantic Integration
ADR-054 is implemented, but only 'inserting' uses it:
1. Actions consume semantic intents
2. Remove verb text checking
3. Full language independence

## Example Implementation

```typescript
// switching/switching-base.ts
export abstract class SwitchingActionBase {
  protected abstract readonly semanticIntent: 'activate' | 'deactivate';
  
  protected validateSwitching(
    context: ActionContext,
    item: IFEntity
  ): ValidationResult {
    // Shared validation logic
  }
  
  protected buildSuccessEvent(
    context: ActionContext,
    item: IFEntity
  ): ISemanticEvent {
    // Shared event building
  }
}

// switching/variants/activate/activate.ts
export class ActivateAction extends SwitchingActionBase {
  readonly semanticIntent = 'activate';
  readonly id = IFActions.SWITCHING_ON; // Legacy compatibility
  
  execute(context: ActionContext): ISemanticEvent[] {
    SwitchableBehavior.get(item)?.activate();
    return [this.buildSuccessEvent(context, item)];
  }
}
```

## Alternatives Considered

### 1. Keep Shared Files
Continue with *-shared.ts pattern.
- **Rejected**: Proliferation and disconnection problems

### 2. Inheritance Without Sub-directories
Use base classes but keep flat structure.
- **Rejected**: Doesn't show relationships visually

### 3. English-Centric Sub-Actions
Use on/off, open/close naming.
- **Rejected**: Creates internationalization problems

## Migration Impact

- **Tests**: No changes needed (import from package exports)
- **Parser**: No changes (uses action IDs)
- **Engine**: No changes (ID-based references)
- **External**: No breaking changes

## Related

- **ADR-054**: Semantic Grammar - Provides semantic intents
- **ADR-051**: Validate/Execute Pattern - Base classes follow pattern
- **ADR-052**: Event-Driven Actions - Shared event building

## Notes

This pattern emerged from Phase 5 refactoring when shared files became unwieldy. The internationalization consideration led to semantic naming, which aligns perfectly with the planned semantic grammar implementation.

The sub-actions pattern is not just organization - it's preparation for true language independence in interactive fiction.