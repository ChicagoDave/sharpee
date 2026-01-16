# ADR-104: Implicit Inference and Implicit Actions

## Status
PROPOSED

## Context

When a player types a command like "read it" where "it" refers to something unreadable (e.g., a mailbox), but there's exactly one readable thing in scope (e.g., a leaflet inside the mailbox), the game should be smart enough to infer the player's intent.

Additionally, if the inferred object isn't currently held but the action requires holding it, the game should perform an implicit take first.

### Example Scenario

```
> open mailbox
You open the small mailbox.
Inside the small mailbox you see a leaflet.

> read it
(first taking the leaflet)
WELCOME TO DUNGEO!
...
```

Here:
1. "it" resolved to mailbox (last mentioned object)
2. Mailbox isn't readable
3. Leaflet IS readable and is the ONLY readable thing in scope
4. Leaflet isn't held → implicit take
5. Then read the leaflet

### Verbs That Need Implicit Inference

**Require holding + specific trait:**
| Verb | Requires | Trait/Condition |
|------|----------|-----------------|
| READ | held | ReadableTrait |
| EAT | held | EdibleTrait |
| DRINK | held | DrinkableTrait |
| WEAR | held | WearableTrait |
| WAVE | held | (any holdable) |
| WIND | held | WindableTrait |

**Require specific trait (not necessarily held):**
| Verb | Trait/Condition |
|------|-----------------|
| OPEN | OpenableTrait, not already open |
| CLOSE | OpenableTrait, currently open |
| LOCK | LockableTrait |
| UNLOCK | LockableTrait |
| ENTER | EnterableTrait |
| LIGHT | LightSourceTrait |

### Current Behavior

1. Parser resolves "it" to last mentioned entity (correct)
2. Validator checks if entity is in scope (correct)
3. Action validation fails with "not_readable" (unhelpful)
4. No attempt to find alternative valid target
5. No implicit take

## Decision

Implement a two-part inference system:

### Part 1: Implicit Object Inference

When action validation fails because the target doesn't meet requirements, check if there's exactly ONE entity in scope that DOES meet the requirements.

```typescript
interface InferenceResult {
  inferred: boolean;
  originalTarget: IFEntity;
  inferredTarget?: IFEntity;
  reason?: string;  // "only readable thing in scope"
}

// In action validation or a pre-validation phase
function tryInferTarget(
  action: Action,
  originalTarget: IFEntity,
  scope: IFEntity[],
  requirements: ActionRequirements
): InferenceResult {
  // Check if original target meets requirements
  if (meetsRequirements(originalTarget, requirements)) {
    return { inferred: false, originalTarget };
  }

  // Find all entities in scope that meet requirements
  const validTargets = scope.filter(e => meetsRequirements(e, requirements));

  // Only infer if exactly ONE valid target exists
  if (validTargets.length === 1) {
    return {
      inferred: true,
      originalTarget,
      inferredTarget: validTargets[0],
      reason: `only ${requirements.description} in scope`
    };
  }

  // Multiple valid targets → disambiguation needed (don't infer)
  // Zero valid targets → fail normally
  return { inferred: false, originalTarget };
}
```

### Part 2: Implicit Take

When an action requires holding an item but the item isn't held, attempt to take it first.

```typescript
interface ImplicitAction {
  action: string;  // "if.action.taking"
  target: IFEntity;
  message: string;  // "(first taking the leaflet)"
}

function checkImplicitTake(
  target: IFEntity,
  action: Action,
  player: IFEntity
): ImplicitAction | null {
  // Does this action require holding the target?
  if (!action.requiresHolding) return null;

  // Is target already held?
  if (isHeldBy(target, player)) return null;

  // Is target takeable?
  if (!canTake(target, player)) return null;

  return {
    action: 'if.action.taking',
    target,
    message: `(first taking the ${target.name})`
  };
}
```

### Part 3: Execution Flow

```
1. Parse command → "read it" → target = mailbox
2. Pre-validate: Does mailbox meet READ requirements?
   → No (not readable)
3. Implicit inference: Find readable things in scope
   → Found exactly 1: leaflet
   → Infer target = leaflet
4. Pre-validate: Does leaflet meet READ requirements?
   → Yes (readable)
5. Check implicit take: Is leaflet held?
   → No
   → Queue implicit take
6. Execute implicit take
   → Output: "(first taking the leaflet)"
   → Take leaflet
7. Execute read
   → Output: leaflet contents
```

### Action Declaration

Actions should declare their requirements for inference to work:

```typescript
const readingAction: Action = {
  id: 'if.action.reading',

  // For implicit inference
  targetRequirements: {
    trait: 'ReadableTrait',
    description: 'readable thing',
  },

  // For implicit take
  requiresHolding: true,

  // ... rest of action
};
```

## Implementation Location

### Option A: Pre-validation Phase (Recommended)

Add inference as a phase between validation and execution:

```
Parse → Validate → Infer → ImplicitActions → Execute → Report
```

**Pros:**
- Clean separation of concerns
- Actions don't need to know about inference
- Centralized logic

**Cons:**
- New phase in command pipeline

### Option B: Per-Action Logic

Each action handles its own inference in validate phase.

**Pros:**
- Actions have full control
- No new phases

**Cons:**
- Duplicated logic across actions
- Actions become more complex
- Easy to forget/inconsistent

### Option C: Validator Enhancement

CommandValidator gains inference capability.

**Pros:**
- Keeps validation together
- No new phases

**Cons:**
- Validator becomes more complex
- Mixes validation with inference

**Recommendation**: Option A - adds clarity and keeps actions simple.

## Output Messages

Implicit actions should be communicated to the player:

```
> read it
(first taking the leaflet)
WELCOME TO DUNGEO!

> wear it
(first taking the cloak)
You put on the velvet cloak.

> eat it
(first taking the sandwich)
You eat the sandwich. Delicious!
```

Message format: `(first {verb}ing the {noun})`

This should go through the lang layer for localization.

## Edge Cases

### Multiple Valid Targets
```
> read it
Which do you mean, the leaflet, the scroll, or the book?
```
Don't infer when multiple targets are valid - use disambiguation.

### Target Not Takeable
```
> read it
(The inscription is part of the wall and can't be taken.)
You read the inscription...
```
Some readable things (inscriptions, signs) shouldn't trigger implicit take.

### Nested Implicit Actions
```
> unlock door
(first taking the key)
(first opening the backpack)
You take the key.
You unlock the door.
```
Limit to one level of implicit action to avoid confusion.

### Silent Failure
If implicit take fails (too heavy, can't reach), the error should explain:
```
> read it
(first trying to take the leaflet)
The leaflet is stuck to the mailbox and won't come loose.
```

## Configuration

Authors should be able to disable implicit behavior:

```typescript
// Story config
storyConfig: {
  implicitActions: {
    inference: true,      // Find valid target when explicit fails
    implicitTake: true,   // Auto-take when action requires holding
    maxDepth: 1,          // Max nested implicit actions
  }
}

// Per-action override
const readingAction: Action = {
  allowImplicitInference: true,   // default: true
  allowImplicitTake: true,        // default: based on requiresHolding
};

// Per-entity override
const inscription = world.createEntity('inscription', 'object', {
  identity: { name: 'ancient inscription' },
  readable: { text: '...' },
  // Don't auto-take inscriptions
  implicitTake: false,  // or use SceneryTrait
});
```

## Testing

```transcript
title: Implicit inference and take
story: test-story

---

> open mailbox
[OK: contains "leaflet"]

> read it
[OK: contains "first taking"]
[OK: contains "WELCOME"]

> drop leaflet
[OK]

> read mailbox
[OK: contains "first taking"]
[OK: contains "WELCOME"]
```

## Implementation Phases

### Phase 1: Action Requirements Declaration
- Add `targetRequirements` and `requiresHolding` to Action interface
- Update stdlib actions to declare requirements
- No behavior change yet

### Phase 2: Implicit Object Inference
- Add inference phase to command pipeline
- Find valid alternative when target fails requirements
- Output inference message

### Phase 3: Implicit Take
- Check if inferred/explicit target needs to be taken first
- Execute implicit take before main action
- Output "(first taking...)" message

### Phase 4: Configuration
- Story-level config for enabling/disabling
- Per-action overrides
- Per-entity overrides (SceneryTrait already handles this)

## Alternatives Considered

### 1. Always Ask for Clarification
```
> read it
The mailbox isn't readable. Did you mean the leaflet?
```
**Rejected**: Too verbose, breaks flow for obvious cases.

### 2. Require Explicit Commands
Player must always specify exact object and take first.
**Rejected**: Poor UX, not how IF traditionally works.

### 3. Parser-Level Inference
Have parser prefer readable entities when verb is "read".
**Rejected**: Parser shouldn't know about action semantics.

## References

- Inform 7: Chapter 12.8 (Implicit taking)
- Inform 7: Chapter 17.14 (Supplying a missing noun)
- TADS 3: Implicit action handling
- ADR-051: Four-phase action pattern
- ADR-090: Capability dispatch
