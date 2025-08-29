# Unified Architecture: Semantic Grammar + Sub-Actions

## The Big Picture

You're absolutely right - **ADR-054 (Semantic Grammar)** is the missing piece that makes sub-actions truly powerful. Together, they solve both the organization AND internationalization challenges.

## How They Work Together

### Semantic Grammar (ADR-054)
**Purpose:** Parse commands into semantic properties, not syntactic structures
**Solves:** Actions shouldn't interpret linguistic variations

### Sub-Actions Pattern
**Purpose:** Organize related actions with shared logic
**Solves:** Code duplication and unclear relationships

### The Synergy
Semantic grammar provides **language-agnostic semantics** that sub-actions consume:

```
User Input → Parser (Semantic Grammar) → Semantic Properties → Sub-Actions
"turn on lamp" → { intent: ACTIVATE, target: lamp } → switching/activate/
"encender luz" → { intent: ACTIVATE, target: luz } → switching/activate/
```

## Concrete Example: Switching Actions

### 1. Semantic Grammar Definition
```typescript
// lang-en-us/grammar/switching.ts
grammar
  .define('turn on :target')
  .mapsTo('if.action.switching_on')  // Legacy ID
  .withSemanticMapping({
    intent: 'activate',
    manner: 'normal'
  })
  .build();

grammar
  .define('switch on :target')
  .mapsTo('if.action.switching_on')
  .withSemanticMapping({
    intent: 'activate',
    manner: 'mechanical'  // Implies physical switch
  })
  .build();

grammar
  .define('activate :target')
  .mapsTo('if.action.switching_on')
  .withSemanticMapping({
    intent: 'activate',
    manner: 'technical'  // Implies digital/automated
  })
  .build();
```

### 2. Sub-Action Structure
```
actions/standard/switching/
├── switching-base.ts       # Shared logic
├── activate/
│   └── activate.ts        # Handles 'activate' intent
└── deactivate/
    └── deactivate.ts      # Handles 'deactivate' intent
```

### 3. Action Implementation
```typescript
// switching/activate/activate.ts
export class ActivateAction extends SwitchingBase {
  validate(context: IActionContext): ValidationResult {
    const semantics = context.command.semantics;
    
    // No verb checking! Just semantic properties
    if (semantics?.intent !== 'activate') {
      return { valid: false };
    }
    
    // Different validation based on manner
    if (semantics.manner === 'mechanical' && !item.hasTrait('physical_switch')) {
      return { 
        valid: false, 
        error: 'no_physical_switch' 
      };
    }
    
    return super.validateSwitching(context, 'activate');
  }
}
```

## Language Independence Example

### English Grammar
```typescript
// "turn on" → activate intent
grammar.define('turn on :target')
  .withSemanticMapping({ intent: 'activate' })

// "turn off" → deactivate intent  
grammar.define('turn off :target')
  .withSemanticMapping({ intent: 'deactivate' })
```

### Spanish Grammar
```typescript
// "encender" (lights) → activate with light context
grammar.define('encender :target')
  .withSemanticMapping({ 
    intent: 'activate',
    context: 'illumination'
  })

// "prender" (devices) → activate with device context
grammar.define('prender :target')
  .withSemanticMapping({ 
    intent: 'activate',
    context: 'device'
  })

// Both "apagar" → deactivate (works for both)
grammar.define('apagar :target')
  .withSemanticMapping({ intent: 'deactivate' })
```

### German Grammar
```typescript
// Compound words map naturally
grammar.define('einschalten :target')  // ein=in, schalten=switch
  .withSemanticMapping({ 
    intent: 'activate',
    manner: 'mechanical'
  })

grammar.define('ausschalten :target')  // aus=out
  .withSemanticMapping({ 
    intent: 'deactivate',
    manner: 'mechanical'
  })
```

## Implementation Order

### Option A: Semantic Grammar First
**Pros:**
- Actions immediately benefit from semantic properties
- No need to refactor twice
- Clean from the start

**Cons:**
- Bigger initial change
- All actions need updating
- Parser work required first

### Option B: Sub-Actions First
**Pros:**
- Immediate organization benefits
- Can be done incrementally
- No parser changes needed yet

**Cons:**
- Will need refactoring when semantics added
- Temporary coupling to verb text remains

### Option C: Hybrid Approach (Recommended)
1. **Phase 1:** Create sub-action structure with current implementation
2. **Phase 2:** Add semantic properties to CommandContext (optional use)
3. **Phase 3:** Update grammar rules with semantic mappings
4. **Phase 4:** Refactor sub-actions to use semantics

## The Complete Architecture

```
┌─────────────────┐
│   User Input    │
│ "turn on lamp"  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│     Semantic Grammar        │
│ Maps to semantic properties │
│ { intent: 'activate' }      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│      Action Router          │
│  Routes based on intent     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│      Sub-Actions            │
│  switching/activate/        │
│  (shared logic in base)     │
└─────────────────────────────┘
```

## Benefits of Combined Approach

### 1. True Language Independence
- Semantic properties are universal (activate, deactivate)
- Each language maps naturally to these properties
- No English bias in core architecture

### 2. Clean Separation of Concerns
- **Parser:** Handles ALL linguistic interpretation
- **Actions:** Handle game logic only
- **Language packages:** Map language to semantics

### 3. Powerful Customization
- Story authors can define custom semantic properties
- Actions can respond to nuanced semantics (manner, context)
- Rich gameplay from linguistic variations

### 4. Maintainable Code
- Sub-actions organize related code
- Semantic properties eliminate verb checking
- Single source of truth for behavior

## Example: Complete Switching Implementation

### Grammar Rule (English)
```typescript
grammar
  .define('turn on :target')
  .mapsTo('if.action.switching_on')
  .withSemantics({
    intent: 'activate',
    manner: 'normal'
  })
  .withScope('reachable')
  .build();
```

### Sub-Action
```typescript
// switching/activate/activate.ts
export class ActivateAction extends SwitchingBase {
  validate(context: IActionContext): ValidationResult {
    const { intent, manner } = context.command.semantics || {};
    
    if (intent !== 'activate') {
      return { valid: false };
    }
    
    // Base class handles common validation
    return this.validateActivation(context, manner);
  }
  
  execute(context: IActionContext): ISemanticEvent[] {
    const { manner } = context.command.semantics || {};
    
    // Apply state change
    SwitchableBehavior.get(item)?.activate();
    
    // Build semantic event based on manner
    return this.buildActivationEvent(context, manner);
  }
}
```

## Recommendation

**Implement BOTH patterns together:**

1. Start with sub-actions for organization (1-2 days)
2. Add semantic properties to context (1 day)
3. Implement semantic grammar rules (2-3 days)
4. Refactor actions to use semantics (1-2 days)

Total: ~1 week for a transformative architecture improvement

This unified approach:
- Solves organization (sub-actions)
- Solves internationalization (semantic grammar)
- Eliminates code duplication
- Creates truly language-agnostic actions
- Sets up for any future language

The semantic grammar ADR was prescient - it's exactly what we need to make sub-actions work properly for multiple languages.