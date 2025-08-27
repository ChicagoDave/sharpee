# Sub-Actions and Internationalization Analysis

## Critical Discovery

You've identified a **crucial architectural consideration**. The language differences for paired actions are significant:

### Language Variations for "Switching"

**English:**
- switch on / switch off
- turn on / turn off  
- activate / deactivate

**Spanish:**
- encender / apagar (turn on/off - lights)
- prender / apagar (turn on/off - devices)
- activar / desactivar (activate/deactivate)

**French:**
- allumer / éteindre (turn on/off)
- activer / désactiver (activate/deactivate)
- mettre en marche / arrêter (start/stop)

**German:**
- einschalten / ausschalten (switch on/off)
- anmachen / ausmachen (turn on/off)
- aktivieren / deaktivieren (activate/deactivate)

## Current Architecture Analysis

### Language Package Structure
```
lang-en-us/
├── src/
│   ├── actions/
│   │   ├── switching-on.ts    # Patterns & messages
│   │   ├── switching-off.ts   # Separate file
│   │   └── ...
│   └── data/
│       └── verbs.ts           # Maps verbs to action IDs
```

### Parser Integration
```typescript
// verbs.ts
{
  action: IFActions.SWITCHING_ON,  // 'if.action.switching_on'
  verbs: ['switch on', 'turn on', 'activate', 'start']
}
```

## The Sub-Actions Problem

### Issue 1: Action ID Coupling
Currently, action IDs are baked into the system:
- `IFActions.SWITCHING_ON` = 'if.action.switching_on'
- `IFActions.SWITCHING_OFF` = 'if.action.switching_off'

These IDs are referenced in:
- Parser (verb mapping)
- Language packages (patterns)
- Actions (implementation)
- Tests (validation)

### Issue 2: Conceptual Mismatch

**English conceptualizes as two actions:**
- switching_on (separate action)
- switching_off (separate action)

**Spanish might conceptualize differently:**
- encender (illuminate - specific to lights)
- prender (activate - specific to devices)
- Both are "turning on" but with different semantic nuances

**German compounds naturally:**
- ein·schalten (literally: in-switch)
- aus·schalten (literally: out-switch)
- Natural pairing in the language itself

## Proposed Solution: Language-Agnostic Sub-Actions

### Architecture
```
actions/standard/
└── switching/                      # Action family
    ├── index.ts                    # Exports sub-actions
    ├── switching-base.ts           # Shared logic
    ├── switching-types.ts          # Common types
    └── variants/                   # Language-agnostic variants
        ├── activate/               # Semantic variant
        │   └── activate.ts
        └── deactivate/
            └── deactivate.ts
```

### Key Innovation: Semantic Variants

Instead of `on/off`, use **semantic intent**:
```typescript
// switching-types.ts
export enum SwitchingIntent {
  ACTIVATE = 'activate',    // Turn on, start, enable
  DEACTIVATE = 'deactivate' // Turn off, stop, disable
}
```

### Language Mapping Layer
```typescript
// lang-en-us/actions/switching.ts
export const switchingLanguage = {
  variants: {
    activate: {
      actionId: IFActions.SWITCHING_ON,  // Legacy compatibility
      patterns: ['switch on', 'turn on', 'activate'],
      messages: { /* ... */ }
    },
    deactivate: {
      actionId: IFActions.SWITCHING_OFF,
      patterns: ['switch off', 'turn off', 'deactivate'],
      messages: { /* ... */ }
    }
  }
}

// lang-es/actions/switching.ts
export const switchingLanguage = {
  variants: {
    activate: {
      actionId: IFActions.SWITCHING_ON,  // Same ID
      patterns: ['encender', 'prender', 'activar'],
      messages: { /* Spanish messages */ }
    },
    deactivate: {
      actionId: IFActions.SWITCHING_OFF,
      patterns: ['apagar', 'desactivar'],
      messages: { /* Spanish messages */ }
    }
  }
}
```

## Benefits of This Approach

### 1. Language Independence
- Actions defined by semantic intent, not English words
- Each language maps its natural expressions to intents
- No English bias in the core architecture

### 2. Cultural Flexibility
- Spanish can have different verbs for lights vs devices
- German can leverage compound word structure
- Japanese can use different politeness levels

### 3. Backward Compatibility
- Keep existing action IDs for compatibility
- New structure is additive, not breaking
- Tests continue to work unchanged

### 4. Better Organization
```
switching/
├── variants/
│   ├── activate/     # Clear semantic grouping
│   └── deactivate/   
```
vs current:
```
switching_on/         # English-specific naming
switching_off/        # Scattered in root
```

## Implementation Strategy

### Phase 1: Semantic Core
1. Create switching/ family structure
2. Define semantic variants (activate/deactivate)
3. Implement shared base class

### Phase 2: Language Abstraction
1. Update language packages to use variants
2. Create mapping from verbs to semantic intents
3. Maintain action ID compatibility

### Phase 3: Test Other Families
Apply pattern to other paired actions:
- opening/closing → open_intent/close_intent
- locking/unlocking → secure_intent/unsecure_intent
- wearing/taking_off → equip_intent/unequip_intent

## Example: Multi-Language Switching

### Core Action (Language-Agnostic)
```typescript
// switching/variants/activate/activate.ts
export class ActivateSwitchingAction extends SwitchingActionBase {
  readonly semanticIntent = SwitchingIntent.ACTIVATE;
  
  execute(context: ActionContext): ISemanticEvent[] {
    // Logic is semantic, not language-specific
    const behavior = SwitchableBehavior.get(item);
    behavior?.activate(); // Not "turnOn"
    
    return this.buildSuccessEvent(
      context,
      this.semanticIntent
    );
  }
}
```

### English Mapping
```typescript
// lang-en-us maps "turn on" → ACTIVATE intent
{ 
  verb: 'turn on',
  intent: SwitchingIntent.ACTIVATE,
  actionId: IFActions.SWITCHING_ON
}
```

### Spanish Mapping
```typescript
// lang-es maps both to ACTIVATE with context
{ 
  verb: 'encender',
  intent: SwitchingIntent.ACTIVATE,
  context: 'light',  // For lights specifically
  actionId: IFActions.SWITCHING_ON
},
{ 
  verb: 'prender',
  intent: SwitchingIntent.ACTIVATE,
  context: 'device', // For devices
  actionId: IFActions.SWITCHING_ON
}
```

## Challenges to Address

### 1. Message Keys
Currently: Hard-coded English-centric keys
```typescript
'already_on': "{target} is already on."
```

Better: Semantic keys
```typescript
'state.already_active': "{target} is already active."
```

### 2. Action IDs
Keep for compatibility but document as legacy:
```typescript
// Legacy ID for compatibility
export const SWITCHING_ON = 'if.action.switching_on';
// Preferred semantic reference
export const ACTIVATE_SWITCHING = 'if.intent.switching.activate';
```

### 3. Parser Integration
Parser needs to understand semantic intents:
```typescript
interface ParsedCommand {
  actionId: string;        // Legacy
  semanticIntent?: string; // New
  languageContext?: string; // "light" vs "device"
}
```

## Recommendation

**Proceed with sub-actions BUT with semantic variants**, not English-centric on/off:

1. **Structure:** `switching/variants/activate/` not `switching/on/`
2. **Naming:** Use semantic intents (ACTIVATE) not English words (ON)
3. **Language:** Each language maps its verbs to intents, not to English concepts
4. **Migration:** Start with switching as pilot, prove the pattern works

This approach:
- ✅ Solves the organization problem
- ✅ Eliminates English bias
- ✅ Supports true internationalization
- ✅ Maintains backward compatibility
- ✅ Sets up for future languages

The sub-actions pattern is even MORE valuable when considering i18n - it just needs to be semantic, not linguistic.