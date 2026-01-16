# Implicit Inference Implementation Plan

**Branch**: `infer`
**ADR**: ADR-104 (Implicit Inference and Implicit Actions)
**Status**: In Progress

## Overview

Implement a two-part inference system:
1. **Implicit Object Inference** - when target fails action requirements, find the ONE valid alternative in scope
2. **Implicit Take** - auto-take items when action requires holding

## Critical Constraint

**Inference ONLY triggers when pronouns are used.**

| Command | Behavior |
|---------|----------|
| `read it` (it=mailbox) | Infer leaflet (pronoun used) |
| `read mailbox` | Fail with "not readable" (explicit noun) |
| `take it` | Implicit take if needed (pronoun used) |
| `take leaflet` | Normal take (explicit noun) |

If the player explicitly names an entity, we respect their intent and do NOT infer alternatives. Inference is for resolving pronoun ambiguity where the pronoun resolved to something that doesn't fit the action.

## Architecture Decision

**Option A: Pre-validation Phase** (from ADR-104)

```
Parse → Validate → Infer → ImplicitActions → Execute → Report
```

This keeps actions simple and centralizes inference logic.

## Implementation Phases

### Phase 1: Action Requirements Declaration

**Goal**: Add metadata to Action interface so inference knows what each action requires.

**Files to modify**:
- `packages/stdlib/src/actions/types.ts` - Add fields to Action interface

**New fields**:
```typescript
interface Action {
  // Existing fields...

  // For implicit inference
  targetRequirements?: {
    trait?: string;           // e.g., 'ReadableTrait'
    condition?: string;       // e.g., 'isOpen', 'isLocked'
    description: string;      // e.g., 'readable thing' (for messages)
  };

  // For implicit take
  requiresHolding?: boolean;  // Does target need to be in inventory?

  // Override flags
  allowImplicitInference?: boolean;  // default: true
  allowImplicitTake?: boolean;       // default: based on requiresHolding
}
```

**Actions to update** (with requirements):

| Action | Trait/Condition | requiresHolding |
|--------|-----------------|-----------------|
| reading | ReadableTrait | true |
| eating | EdibleTrait | true |
| drinking | DrinkableTrait | true |
| wearing | WearableTrait | true |
| opening | OpenableTrait + !isOpen | false |
| closing | OpenableTrait + isOpen | false |
| locking | LockableTrait | false |
| unlocking | LockableTrait | false |
| entering | EnterableTrait | false |
| switching_on | SwitchableTrait + !isOn | false |
| switching_off | SwitchableTrait + isOn | false |

**Deliverables**:
- [ ] Update Action interface in types.ts
- [ ] Add requirements to reading action
- [ ] Add requirements to eating action
- [ ] Add requirements to opening/closing actions
- [ ] Add requirements to remaining actions
- [ ] No behavior change yet - just metadata

---

### Phase 2: Implicit Object Inference

**Goal**: When action validation fails due to target not meeting requirements, find the ONE valid alternative in scope.

**New file**:
- `packages/stdlib/src/inference/implicit-inference.ts`

**Core logic**:
```typescript
interface InferenceResult {
  inferred: boolean;
  originalTarget: IFEntity;
  inferredTarget?: IFEntity;
  reason?: string;
}

function tryInferTarget(
  action: Action,
  originalTarget: IFEntity,
  scope: IFEntity[],
  world: WorldModel,
  wasPronoun: boolean  // CRITICAL: only infer if this is true
): InferenceResult
```

**Pronoun detection**:
- `INounPhrase` already has `text` field
- Add `wasPronoun?: boolean` flag to `INounPhrase` (set by parser)
- Or check if `text` matches pronoun list: "it", "them", "him", "her"
- **Recommendation**: Explicit flag is cleaner

**Integration point**:
- Modify `packages/stdlib/src/validation/command-validator.ts`
- After initial validation fails with "wrong trait" type error:
  - Check if noun phrase was a pronoun
  - If YES: call inference
  - If NO: fail normally
- If inference succeeds, retry validation with new target

**Message IDs** (for lang-en-us):
- `if.message.inference.inferred_target` - "(the {inferredTarget})"
- `if.message.reading.not_readable` - "You can't read that."

**Deliverables**:
- [ ] Create implicit-inference.ts with core logic
- [ ] Add helper to check if entity meets action requirements
- [ ] Integrate with command-validator.ts
- [ ] Add message IDs to lang-en-us
- [ ] Test: "read mailbox" → infers leaflet

---

### Phase 3: Implicit Take

**Goal**: When action requires holding target but target isn't held, auto-take first.

**New file**:
- `packages/stdlib/src/inference/implicit-take.ts`

**Core logic**:
```typescript
interface ImplicitAction {
  actionId: string;
  target: IFEntity;
  messageId: string;
}

function checkImplicitTake(
  target: IFEntity,
  action: Action,
  player: IFEntity,
  world: WorldModel
): ImplicitAction | null
```

**Integration point**:
- After inference phase, before execute phase
- If implicit take needed, execute taking action first
- Chain the actions: take → original action

**Message IDs**:
- `if.message.implicit.first_taking` - "(first taking the {item})"
- `if.message.implicit.take_failed` - "(first trying to take the {item})"

**Deliverables**:
- [ ] Create implicit-take.ts with core logic
- [ ] Integrate into command execution pipeline
- [ ] Handle take failure gracefully
- [ ] Add message IDs to lang-en-us
- [ ] Test: "read leaflet" (not held) → takes then reads

---

### Phase 4: Configuration

**Goal**: Allow stories/actions/entities to control implicit behavior.

**Story config** (`StoryConfig` interface):
```typescript
implicitActions?: {
  inference?: boolean;      // default: true
  implicitTake?: boolean;   // default: true
  maxDepth?: number;        // default: 1
}
```

**Entity override**:
- SceneryTrait already prevents taking
- Add `implicitTake: false` option to entity config

**Deliverables**:
- [ ] Add implicitActions to StoryConfig
- [ ] Respect story-level config in inference
- [ ] Respect action-level overrides
- [ ] Test configuration options

---

## Testing Strategy

### Unit Tests
- `packages/stdlib/tests/inference/implicit-inference.test.ts`
- `packages/stdlib/tests/inference/implicit-take.test.ts`

### Transcript Tests
```
stories/dungeo/tests/transcripts/implicit-inference.transcript
```

**Test cases**:

*Inference (pronoun only)*:
1. "open mailbox" then "read it" (it=mailbox) with leaflet inside → infers leaflet, takes, reads
2. "read it" with no readable items in scope → normal failure
3. "read it" with multiple readable items → disambiguation (no inference)
4. "read mailbox" (explicit noun) → "You can't read that." (NO inference)

*Implicit take (both pronouns and explicit nouns)*:
5. "read leaflet" when leaflet in room → implicit take, then read
6. "read it" (it=leaflet) when leaflet in room → implicit take, then read
7. "read leaflet" when leaflet held → no implicit take needed
8. "read inscription" (scenery) → reads without taking (can't take scenery)

---

## File Changes Summary

**New files**:
- `packages/stdlib/src/inference/implicit-inference.ts`
- `packages/stdlib/src/inference/implicit-take.ts`
- `packages/stdlib/src/inference/index.ts`
- `packages/stdlib/tests/inference/implicit-inference.test.ts`
- `packages/stdlib/tests/inference/implicit-take.test.ts`

**Modified files**:
- `packages/stdlib/src/actions/types.ts` - Action interface
- `packages/stdlib/src/validation/command-validator.ts` - Integration
- `packages/lang-en-us/src/messages/inference-messages.ts` - New messages
- Multiple action files - Add requirements metadata

---

## Progress Tracking

### Phase 1: Action Requirements Declaration ✓ COMPLETE
- [x] Update Action interface (`targetRequirements`, `requiresHolding`, flags)
- [x] Add `wasPronoun` flag to `INounPhrase`
- [x] Update parser to set `wasPronoun` when pronoun resolved
- [x] Update reading action with requirements
- [x] Update eating action with requirements
- [x] Update opening/closing actions with requirements
- [x] Build verified

### Phase 2: Implicit Object Inference ✓ COMPLETE
- [x] Core inference logic (`packages/stdlib/src/inference/implicit-inference.ts`)
- [x] Command executor integration (after action.validate fails, try inference)
- [x] Tests pass: `implicit-inference.transcript`
  - "read it" (it=mailbox) → infers leaflet, reads successfully
  - "read mailbox" (explicit) → fails with action.blocked (no inference)

### Phase 3: Implicit Take ✓ COMPLETE
- [x] Core implicit take logic (in `action-context-factory.ts`)
- [x] Pipeline integration via `requireCarriedOrImplicitTake`
- [x] Text service handler for `if.event.implicit.take` → "(first taking the X)"
- [x] Tests pass: all 7 assertions in `implicit-inference.transcript`
  - "read it" (it=mailbox) → infers leaflet, takes implicitly, reads
  - "read leaflet" (dropped) → takes implicitly, reads
  - "read leaflet" (already held) → no implicit take
- [x] Suppressed redundant `action.success` events from implicit take
- [x] Added `if.event.taken` and `if.event.dropped` to STATE_CHANGE_EVENTS

### Phase 4: Configuration
- [ ] Story config
- [ ] Action/entity overrides
- [ ] Tests

---

## Open Questions

1. **Scope definition**: What counts as "in scope" for inference?
   - Current room + inventory + containers player can see into?
   - Follow existing scope rules from grammar.ts

2. **Inference message format**: Should we output something when inferring?
   - Option A: Silent inference (just do it)
   - Option B: "(the leaflet)" - minimal acknowledgment
   - Option C: "You can't read the mailbox, so you read the leaflet instead." - verbose
   - **Recommendation**: Option A for inference, Option B-style for implicit take

3. **Nested implicit actions**: If taking requires opening a container first?
   - ADR-104 suggests limiting to 1 level
   - Start with no nesting, add later if needed
