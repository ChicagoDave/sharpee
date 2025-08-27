# Concrete Example: Switching Actions with Sub-Actions Pattern

## Proposed Directory Structure

```
packages/stdlib/src/actions/standard/switching/
├── index.ts                    # Main exports
├── switching-base.ts           # Shared logic and types
├── switching-types.ts          # Common type definitions
├── on/
│   ├── index.ts               # Sub-action exports
│   ├── switching_on.ts        # Main action implementation
│   ├── switching_on-events.ts # Event definitions
│   └── switching_on-data.ts   # Test data
└── off/
    ├── index.ts               # Sub-action exports
    ├── switching_off.ts       # Main action implementation
    ├── switching_off-events.ts # Event definitions
    └── switching_off-data.ts  # Test data
```

## File Contents

### switching/switching-types.ts
```typescript
import { IFEntity } from '@sharpee/world-model';

export interface SwitchingContext {
  item: IFEntity;
  isSwitchable: boolean;
  isOn: boolean;
  hasPower: boolean;
  switchType: 'light' | 'device' | 'mechanism' | 'generic';
}

export type SwitchingDirection = 'on' | 'off';
```

### switching/switching-base.ts
```typescript
import { ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { SwitchingContext, SwitchingDirection } from './switching-types';

/**
 * Base class for switching actions providing shared validation and event building
 */
export abstract class SwitchingActionBase {
  protected analyzeSwitchingContext(
    context: ActionContext,
    item: IFEntity
  ): SwitchingContext {
    const behavior = SwitchableBehavior.get(item);
    
    return {
      item,
      isSwitchable: item.hasTrait(TraitType.SWITCHABLE),
      isOn: behavior?.isOn ?? false,
      hasPower: behavior?.hasPower ?? true,
      switchType: this.determineSwitchType(item)
    };
  }

  protected determineSwitchType(item: IFEntity): SwitchingContext['switchType'] {
    if (item.hasTrait(TraitType.LIT)) return 'light';
    if (item.hasTrait(TraitType.DEVICE)) return 'device';
    if (item.hasTrait(TraitType.MECHANISM)) return 'mechanism';
    return 'generic';
  }

  protected validateSwitching(
    context: ActionContext,
    item: IFEntity,
    direction: SwitchingDirection
  ): ValidationResult {
    const switchingContext = this.analyzeSwitchingContext(context, item);
    
    // Not switchable
    if (!switchingContext.isSwitchable) {
      return {
        valid: false,
        errorMessage: 'not_switchable'
      };
    }

    // Already in target state
    if (direction === 'on' && switchingContext.isOn) {
      return {
        valid: false,
        errorMessage: 'already_on'
      };
    }
    
    if (direction === 'off' && !switchingContext.isOn) {
      return {
        valid: false,
        errorMessage: 'already_off'
      };
    }

    // No power (only for turning on)
    if (direction === 'on' && !switchingContext.hasPower) {
      return {
        valid: false,
        errorMessage: 'no_power'
      };
    }

    return { valid: true };
  }

  protected buildSuccessEvent(
    context: ActionContext,
    item: IFEntity,
    direction: SwitchingDirection,
    switchType: SwitchingContext['switchType']
  ): ISemanticEvent {
    const messageKey = this.getSuccessMessage(direction, switchType);
    const eventType = direction === 'on' ? 'switched_on' : 'switched_off';
    
    return {
      type: eventType,
      message: messageKey,
      params: {
        item: item.name,
        actor: context.actor.name
      },
      data: {
        actionId: context.actionId,
        item: item.key,
        direction
      }
    };
  }

  private getSuccessMessage(
    direction: SwitchingDirection,
    switchType: SwitchingContext['switchType']
  ): string {
    if (direction === 'on') {
      switch (switchType) {
        case 'light': return 'light_on';
        case 'device': return 'device_humming';
        case 'mechanism': return 'mechanism_activated';
        default: return 'switched_on';
      }
    } else {
      switch (switchType) {
        case 'light': return 'light_off';
        case 'device': return 'device_silent';
        case 'mechanism': return 'mechanism_deactivated';
        default: return 'switched_off';
      }
    }
  }
}
```

### switching/on/switching_on.ts
```typescript
import { Action, ActionContext, ValidationResult } from '../../../enhanced-types';
import { ActionMetadata } from '../../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../../constants';
import { ScopeLevel } from '../../../../scope';
import { SwitchedOnEventData } from './switching_on-events';
import { SwitchingActionBase } from '../switching-base';

class SwitchingOnAction extends SwitchingActionBase implements Action {
  readonly id = IFActions.SWITCHING_ON;

  validate(context: ActionContext): ValidationResult {
    const item = context.directObject;
    if (!item) {
      return {
        valid: false,
        errorMessage: 'no_target'
      };
    }

    // Use base class validation
    return this.validateSwitching(context, item, 'on');
  }

  execute(context: ActionContext): ISemanticEvent[] {
    const item = context.directObject!;
    const switchingContext = this.analyzeSwitchingContext(context, item);
    
    // Apply state change via behavior
    const behavior = SwitchableBehavior.get(item);
    if (behavior) {
      behavior.turnOn();
    }

    // Build and return success event
    return [
      this.buildSuccessEvent(
        context,
        item,
        'on',
        switchingContext.switchType
      )
    ];
  }
}

// Create and export the singleton instance with metadata
export const switchingOnAction: Action & { metadata: ActionMetadata } = 
  Object.assign(new SwitchingOnAction(), {
    metadata: {
      defaultScope: ScopeLevel.SAME_CONTAINER,
      requiresDirectObject: true,
      requiresIndirectObject: false,
      requiresPreposition: false
    }
  });
```

### switching/off/switching_off.ts
```typescript
// Similar structure to switching_on.ts but with direction='off'
import { SwitchingActionBase } from '../switching-base';

class SwitchingOffAction extends SwitchingActionBase implements Action {
  readonly id = IFActions.SWITCHING_OFF;

  validate(context: ActionContext): ValidationResult {
    const item = context.directObject;
    if (!item) {
      return {
        valid: false,
        errorMessage: 'no_target'
      };
    }

    // Use base class validation
    return this.validateSwitching(context, item, 'off');
  }

  execute(context: ActionContext): ISemanticEvent[] {
    const item = context.directObject!;
    const switchingContext = this.analyzeSwitchingContext(context, item);
    
    // Apply state change via behavior
    const behavior = SwitchableBehavior.get(item);
    if (behavior) {
      behavior.turnOff();
    }

    // Build and return success event
    return [
      this.buildSuccessEvent(
        context,
        item,
        'off',
        switchingContext.switchType
      )
    ];
  }
}

export const switchingOffAction = /* ... similar to on ... */
```

### switching/index.ts
```typescript
/**
 * Switching actions for turning things on and off
 */

// Export both sub-actions
export { switchingOnAction } from './on/switching_on';
export { switchingOffAction } from './off/switching_off';

// Export event types
export type { SwitchedOnEventData } from './on/switching_on-events';
export type { SwitchedOffEventData } from './off/switching_off-events';

// Export shared types if needed by other actions
export type { SwitchingContext, SwitchingDirection } from './switching-types';
```

## Benefits Demonstrated

### 1. Clear Hierarchy
The relationship between on/off is immediately visible in the directory structure.

### 2. Shared Code Has a Natural Home
The base class or shared utilities live at the switching/ level, not floating in the root.

### 3. Better Encapsulation
All switching-related code is contained within one directory. Easy to:
- Find all related code
- Understand the full implementation
- Make changes without affecting other actions

### 4. Extensibility
Adding a new switching variant (e.g., switching_to for multi-state switches):
```
switching/
├── on/
├── off/
└── to/  # New sub-action
```

### 5. Type Safety
Shared types (SwitchingContext, SwitchingDirection) are co-located with their consumers.

## Migration Path

### Step 1: Create New Structure (Parallel)
Create the new structure alongside the old:
```
actions/standard/
├── switching_on/     # OLD - keep temporarily
├── switching_off/    # OLD - keep temporarily
├── switching-shared.ts # OLD - keep temporarily
└── switching/        # NEW - implement here
```

### Step 2: Implement & Test
1. Copy logic into new structure
2. Refactor to use base class pattern
3. Run existing tests against new implementation

### Step 3: Update Exports
Change in actions/standard/index.ts:
```typescript
// OLD
export * from './switching_on';
export * from './switching_off';

// NEW
export * from './switching';
```

### Step 4: Remove Old Files
Once validated, remove:
- switching_on/
- switching_off/
- switching-shared.ts

## Conclusion

This concrete example shows that the sub-actions pattern:
1. **Reduces duplication** more elegantly than shared files
2. **Provides better organization** without complexity
3. **Makes relationships explicit** in the structure
4. **Scales better** for future enhancements

The implementation effort is comparable to our current shared files approach, but the long-term benefits are significantly greater.