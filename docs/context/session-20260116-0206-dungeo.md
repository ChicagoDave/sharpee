# Session Summary: 20260116-0206 - infer

## Status: Complete (Phases 1-2)

## Goals
- Implement ADR-104: Implicit Inference and Implicit Actions
- Phase 1: Action Requirements Declaration
- Phase 2: Implicit Object Inference

## Completed

### Phase 1: Action Requirements Declaration

Added metadata to Action interface for inference system:

**New fields in `Action` interface** (`packages/stdlib/src/actions/enhanced-types.ts`):
- `targetRequirements?: { trait, condition, description }` - What the target must have
- `requiresHolding?: boolean` - Does action need item in inventory
- `allowImplicitInference?: boolean` - Enable/disable inference
- `allowImplicitTake?: boolean` - Enable/disable implicit take

**Added `wasPronoun` flag** (`packages/world-model/src/commands/parsed-command.ts`):
- `INounPhrase.wasPronoun?: boolean` - True when noun phrase was a pronoun

**Parser updated** (`packages/parser-en-us/src/english-parser.ts`):
- Sets `wasPronoun: true` when pronoun is resolved

**Actions updated with requirements**:
- `reading`: trait=READABLE, requiresHolding=true
- `eating`: trait=EDIBLE, requiresHolding=true
- `opening`: trait=OPENABLE, condition=not_open, requiresHolding=false
- `closing`: trait=OPENABLE, condition=is_open, requiresHolding=false

### Phase 2: Implicit Object Inference

**Core module** (`packages/stdlib/src/inference/implicit-inference.ts`):
```typescript
function tryInferTarget(
  originalTarget: IFEntity,
  wasPronoun: boolean,
  action: Action,
  scope: IFEntity[],
  world: WorldModel
): InferenceResult
```

Logic:
1. Only infer when `wasPronoun === true`
2. Check if original target meets action's `targetRequirements`
3. If not, find entities in scope that DO meet requirements
4. If exactly ONE valid target exists, infer it
5. If zero or multiple, don't infer (fail normally or disambiguate)

**Command executor integration** (`packages/engine/src/command-executor.ts`):
- After `action.validate()` fails, check if pronoun was used
- If yes, call `tryInferTarget()` with visible entities
- If inference succeeds, create modified command and retry validation
- If retry passes, proceed with inferred target

### Test Results

```
Running: implicit-inference.transcript
  > open mailbox                     PASS
  > read it                          PASS  (inferred leaflet!)
  > examine it                       PASS  (pronoun still = mailbox)
  > read mailbox                     PASS  (blocked - no inference)

4 passed
```

## Critical Constraint

**Inference ONLY triggers for pronouns:**
- `read it` (it=mailbox) → Infers leaflet
- `read mailbox` (explicit) → Fails with "You can't read that."

## Files Created

- `packages/stdlib/src/inference/implicit-inference.ts`
- `packages/stdlib/src/inference/index.ts`
- `stories/dungeo/tests/transcripts/implicit-inference.transcript`
- `docs/work/infer/implementation-plan.md`

## Files Modified

- `packages/stdlib/src/actions/enhanced-types.ts` - Action interface
- `packages/stdlib/src/index.ts` - Export inference module
- `packages/world-model/src/commands/parsed-command.ts` - wasPronoun flag
- `packages/parser-en-us/src/english-parser.ts` - Set wasPronoun
- `packages/stdlib/src/actions/standard/reading/reading.ts` - Requirements
- `packages/stdlib/src/actions/standard/eating/eating.ts` - Requirements
- `packages/stdlib/src/actions/standard/opening/opening.ts` - Requirements
- `packages/stdlib/src/actions/standard/closing/closing.ts` - Requirements
- `packages/engine/src/command-executor.ts` - Inference integration

## Open Items

- Phase 3: Implicit Take (auto-take when action requires holding)
- Phase 4: Configuration (story/action/entity overrides)

## Notes
- Session started: 2026-01-16 02:06
- Branch: `infer` (created from `dungeo`)
