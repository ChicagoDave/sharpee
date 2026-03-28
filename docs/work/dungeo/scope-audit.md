# Scope System Audit (ISSUE-065)

**Date**: 2026-03-27
**Status**: Investigation complete — recommendation ready for review

## Summary

Three systems evaluate entity scope. They serve **different phases of the turn cycle** and are not duplicates — they're a pipeline. The primary issue is naming confusion (two unrelated classes named `ScopeEvaluator`) and one case of genuine logic duplication between `StandardScopeResolver` and `VisibilityBehavior`.

---

## The Three Systems

### 1. World-Model ScopeRegistry + ScopeEvaluator

**Location**: `packages/world-model/src/scope/`
**Purpose**: Rule-based, extensible scope system for determining what entities are "in scope" for a given actor.
**When called**: Pre-parse vocabulary update + query-time scope evaluation.

**Call chain**:
```
WorldModel constructor
  └─ registerDefaultScopeRules()
       ├─ default_room_visibility (priority 50): entities in same room + nested contents
       └─ default_inventory_visibility (priority 100): carried items + their contents

VocabularyManager.updateScopeVocabulary()      ← CRITICAL PATH
  └─ world.getInScope(playerId)
       └─ world.evaluateScope(playerId)
            └─ scopeEvaluator.evaluate(context)
                 └─ scopeRegistry.getApplicableRules(context)
```

**Active callers**:
- `VocabularyManager.updateScopeVocabulary()` (engine) — feeds in-scope entities to parser vocabulary before each parse
- `CloakOfDarknessStory` — removes defaults, adds custom scope rules via `world.addScopeRule()`
- 6 test files exercise rule-based scope (window visibility, sound, magic sight, darkness)

**Verdict**: **Actively used at runtime.** The VocabularyManager path is critical — it determines which entities the parser can recognize in commands.

### 2. Parser-EN-US ScopeEvaluator

**Location**: `packages/parser-en-us/src/scope-evaluator.ts`
**Purpose**: Static utility that evaluates grammar slot constraints against the world model during parsing.
**When called**: Parse phase only — inside `EntitySlotConsumer.evaluateSlotConstraints()`.

**Call chain**:
```
GameEngine.executeTurn(input)
  └─ parser.parse(input)
       └─ grammarEngine.findMatches(tokens, context)
            └─ EntitySlotConsumer.consume()
                 └─ evaluateSlotConstraints()
                      └─ ScopeEvaluator.findEntitiesByName(text, constraint, context)
                           └─ ScopeEvaluator.getEntitiesInScope(constraint, context)
                                ├─ context.world.getVisibleEntities(actorId, location)
                                ├─ context.world.getTouchableEntities(actorId, location)
                                ├─ context.world.getCarriedEntities(actorId)
                                └─ context.world.getNearbyEntities(actorId, location)
```

**Key property**: Delegates to WorldModel methods (`getVisibleEntities`, `getTouchableEntities`, etc.) which internally use `VisibilityBehavior`. Does **not** call the world-model ScopeRegistry/ScopeEvaluator.

**Verdict**: **Actively used.** Evaluates grammar `.where()` constraints during parsing. The name collision with the world-model class is the primary confusion.

### 3. Stdlib StandardScopeResolver + CommandValidator

**Location**: `packages/stdlib/src/scope/scope-resolver.ts`, `packages/stdlib/src/validation/command-validator.ts`
**Purpose**: Entity resolution, scope-level calculation, disambiguation, and sensory attribution during command validation.
**When called**: Validation phase — after parsing, before execution.

**Call chain**:
```
CommandExecutor.execute(input)
  └─ validator.validate(parsedCommand)
       ├─ resolveEntity() — candidate search, scope filtering, scoring, disambiguation
       │    ├─ filterByScope() → scopeResolver.getScope(player, entity) for each candidate
       │    └─ scoreEntities() → name/type/synonym/adjective/modifier matching
       ├─ checkEntityScope() — final scope-level validation
       └─ getPerceivedSenses() → scopeResolver.canSee/canHear/canSmell/canReach
```

**Key property**: Completely standalone — does **not** call either the world-model ScopeEvaluator or the parser ScopeEvaluator. Implements its own visibility/reachability logic by walking the containment hierarchy directly.

**Verdict**: **Actively used.** This is the primary entity resolution system.

---

## Pipeline View

The three systems form a pipeline across the turn cycle:

```
┌─────────────────────────────────────────────────────────────────────┐
│ PRE-PARSE                                                           │
│  VocabularyManager.updateScopeVocabulary()                         │
│  └─ World-Model ScopeRegistry/ScopeEvaluator                      │
│     → Determines which entities the parser knows about              │
├─────────────────────────────────────────────────────────────────────┤
│ PARSE PHASE                                                         │
│  EntitySlotConsumer.evaluateSlotConstraints()                      │
│  └─ Parser ScopeEvaluator                                          │
│     → Filters entities matching grammar slot constraints            │
│     → Delegates to WorldModel.getVisibleEntities() etc.            │
├─────────────────────────────────────────────────────────────────────┤
│ VALIDATION PHASE                                                    │
│  CommandValidator.resolveEntity()                                   │
│  └─ StandardScopeResolver                                          │
│     → Full entity resolution with disambiguation and scoring       │
│     → Own visibility/reachability implementation                    │
├─────────────────────────────────────────────────────────────────────┤
│ EXECUTION PHASE                                                     │
│  Action.validate/execute/report via ActionContext                   │
│  └─ ActionContext.canSee/canReach → StandardScopeResolver          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Genuine Concerns

### 1. Naming collision: two `ScopeEvaluator` classes

The world-model `ScopeEvaluator` (rule-based, instance-level) and the parser `ScopeEvaluator` (static utility, constraint-based) share a name but have no relationship. This is the primary source of confusion flagged in ISSUE-065.

### 2. Duplicated visibility logic in StandardScopeResolver

`StandardScopeResolver.canSee()` (stdlib) re-implements container-walk visibility logic that already exists in `VisibilityBehavior.canSee()` (world-model). Both:
- Walk the containment hierarchy
- Check for closed opaque containers
- Handle darkness and light sources
- Treat actors as transparent

This is genuine duplication. If the rules diverge (e.g., Phase 1 of this session changed `VisibilityBehavior` but `StandardScopeResolver` was not updated), the two systems could produce different answers for the same question.

### 3. Dead ScopeService stub

`packages/world-model/src/services/ScopeService.ts` is a stub with `canSee() { return true; }` and `canReach() { return true; }`. No callers. Dead code.

---

## Recommendation

**Path: Rename + document + delete dead code. No consolidation.**

### Why not consolidate?

The three systems serve different pipeline stages with different requirements:
- The world-model scope is **rule-based and extensible** (stories add/remove rules)
- The parser scope evaluates **grammar constraints** (trait filters, property filters)
- The stdlib scope does **disambiguation, scoring, and sensory attribution**

Consolidating them would couple pipeline stages that are currently independent. The architecture is correct — the naming is not.

### Proposed changes (Phase 3)

1. **Rename parser's `ScopeEvaluator`** → `GrammarScopeResolver`
   - File: `packages/parser-en-us/src/scope-evaluator.ts` → `grammar-scope-resolver.ts`
   - Update single caller in `entity-slot-consumer.ts`
   - Add file header explaining its role in the pipeline

2. **Rename world-model's `ScopeEvaluator`** → `RuleScopeEvaluator`
   - File: `packages/world-model/src/scope/scope-evaluator.ts` (class rename only, file name already fine)
   - Update callers in `WorldModel.ts`
   - Add file header explaining its role

3. **Delete dead `ScopeService` stub**
   - File: `packages/world-model/src/services/ScopeService.ts`
   - Verify no imports reference it

4. **Add header comments** to all three scope files and `StandardScopeResolver` clarifying:
   - Which pipeline stage each serves
   - What WorldModel APIs each delegates to
   - Why they are separate

5. **Document the visibility duplication** as a follow-up concern
   - `StandardScopeResolver.canSee()` duplicates `VisibilityBehavior.canSee()` logic
   - Recommend a future issue to have `StandardScopeResolver` delegate to `VisibilityBehavior` instead of reimplementing
   - This is a separate refactor with its own risk surface (stdlib depends on world-model's behavior class directly)

### What this does NOT change

- No public API changes
- No behavioral changes
- No test changes (other than import paths for renamed classes)
- The pipeline architecture stays the same

---

## Dead Code Inventory

| File | Status | Action |
|------|--------|--------|
| `packages/world-model/src/services/ScopeService.ts` | Dead stub, no callers | Delete |

## Files Touched by Rename (Phase 3 estimate)

| File | Change |
|------|--------|
| `packages/parser-en-us/src/scope-evaluator.ts` | Rename file → `grammar-scope-resolver.ts`, rename class → `GrammarScopeResolver` |
| `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts` | Update import |
| `packages/world-model/src/scope/scope-evaluator.ts` | Rename class → `RuleScopeEvaluator` |
| `packages/world-model/src/scope/index.ts` | Update export |
| `packages/world-model/src/world/WorldModel.ts` | Update import and field type |
| `packages/world-model/src/services/ScopeService.ts` | Delete |
| `packages/world-model/src/services/index.ts` | Remove ScopeService export (if exported) |
