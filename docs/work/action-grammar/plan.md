# Implementation Plan: ADR-087 + ADR-088

## Overview

Two related refactors to the parser grammar system:

| ADR | Focus | Current State | Target State |
|-----|-------|---------------|--------------|
| ADR-088 | Grammar Engine | 1355-line monolith | 5 focused modules (~300 lines each) |
| ADR-087 | Grammar Builder | Pattern-centric, repetitive | Action-centric with verb aliases |

**Order of operations:** ADR-088 first (refactor infrastructure), then ADR-087 (add new API).

---

## Phase 1: ADR-088 - Slot Consumer Infrastructure

**Goal:** Create the slot consumer interface and registry without moving any code yet.

### 1.1 Create SlotConsumer Interface
```
packages/parser-en-us/src/slot-consumers/slot-consumer.ts
```

- [ ] Define `SlotConsumer` interface with `slotTypes` and `consume()` method
- [ ] Define `SlotConsumerContext` type for shared dependencies (vocabulary, scope evaluator)
- [ ] Export types

### 1.2 Create SlotConsumerRegistry
```
packages/parser-en-us/src/slot-consumers/index.ts
```

- [ ] Create `SlotConsumerRegistry` class
- [ ] Implement `register(consumer)` method
- [ ] Implement `consume(slotType, ...)` dispatcher method
- [ ] Export registry and default instance

### 1.3 Wire Registry into Grammar Engine

- [ ] Add `slotConsumers` constructor parameter to `EnglishGrammarEngine`
- [ ] Keep existing `consumeSlot` switch for now (will delegate later)
- [ ] Verify all existing tests still pass

**Checkpoint:** Infrastructure in place, no behavior changes.

---

## Phase 2: ADR-088 - Extract Entity Slot Consumer

**Goal:** Move the most complex slot consumption logic (multi-object parsing) to its own module.

### 2.1 Create EntitySlotConsumer
```
packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts
```

Move from `english-grammar-engine.ts`:
- [ ] `consumeEntitySlot()` → `EntitySlotConsumer.consume()`
- [ ] `consumeAllSlot()` → private method
- [ ] `consumeExcludedEntities()` → private method
- [ ] `consumeEntityWithListDetection()` → private method
- [ ] `evaluateSlotConstraints()` → private method

### 2.2 Register and Delegate

- [ ] Register `EntitySlotConsumer` for `SlotType.ENTITY` and `SlotType.INSTRUMENT`
- [ ] Update `consumeSlot` switch to delegate these types to registry
- [ ] Remove old methods from grammar engine

### 2.3 Test

- [ ] Run existing parser tests
- [ ] Run `colored-buttons.test.ts`
- [ ] Run dungeo transcript tests

**Checkpoint:** ~350 lines extracted, grammar engine ~1000 lines.

---

## Phase 3: ADR-088 - Extract Text Slot Consumer

### 3.1 Create TextSlotConsumer
```
packages/parser-en-us/src/slot-consumers/text-slot-consumer.ts
```

Move from `english-grammar-engine.ts`:
- [ ] `consumeTextSlot()` → handles `SlotType.TEXT`
- [ ] `consumeGreedyTextSlot()` → handles `SlotType.TEXT_GREEDY`
- [ ] `consumeQuotedTextSlot()` → handles `SlotType.QUOTED`
- [ ] `consumeTopicSlot()` → handles `SlotType.TOPIC`

### 3.2 Register and Delegate

- [ ] Register for `TEXT`, `TEXT_GREEDY`, `QUOTED`, `TOPIC` slot types
- [ ] Update `consumeSlot` switch
- [ ] Remove old methods

### 3.3 Test

- [ ] Run parser tests (especially quoted string tests)
- [ ] Run ADR-080 tests

**Checkpoint:** ~150 more lines extracted, grammar engine ~850 lines.

---

## Phase 4: ADR-088 - Extract Typed Slot Consumer

### 4.1 Create TypedSlotConsumer
```
packages/parser-en-us/src/slot-consumers/typed-slot-consumer.ts
```

Move from `english-grammar-engine.ts`:
- [ ] `consumeNumberSlot()` → handles `SlotType.NUMBER`
- [ ] `consumeOrdinalSlot()` → handles `SlotType.ORDINAL`
- [ ] `consumeTimeSlot()` → handles `SlotType.TIME`
- [ ] `consumeDirectionSlot()` → handles `SlotType.DIRECTION`

### 4.2 Register and Delegate

- [ ] Register for `NUMBER`, `ORDINAL`, `TIME`, `DIRECTION` slot types
- [ ] Update `consumeSlot` switch
- [ ] Remove old methods

### 4.3 Test

- [ ] Run ADR-082 typed slots tests

**Checkpoint:** ~250 more lines extracted, grammar engine ~600 lines.

---

## Phase 5: ADR-088 - Extract Vocabulary Slot Consumer

### 5.1 Create VocabularySlotConsumer
```
packages/parser-en-us/src/slot-consumers/vocabulary-slot-consumer.ts
```

Move from `english-grammar-engine.ts`:
- [ ] `consumeAdjectiveSlot()` → handles `SlotType.ADJECTIVE`
- [ ] `consumeNounSlot()` → handles `SlotType.NOUN`
- [ ] `consumeVocabularySlot()` → handles `SlotType.VOCABULARY`
- [ ] `consumeMannerSlot()` → handles `SlotType.MANNER`
- [ ] `getVocabulary()` → shared helper

### 5.2 Register and Delegate

- [ ] Register for `ADJECTIVE`, `NOUN`, `VOCABULARY`, `MANNER` slot types
- [ ] Update `consumeSlot` switch (should now be empty/minimal)
- [ ] Remove old methods and `getVocabulary`

### 5.3 Test

- [ ] Run all parser tests
- [ ] Full test suite

**Checkpoint:** ADR-088 complete. Grammar engine ~300 lines, 4 consumer modules.

---

## Phase 6: ADR-088 - Cleanup and Unit Tests

### 6.1 Simplify Grammar Engine

- [ ] Remove the `consumeSlot` switch entirely (all delegation via registry)
- [ ] Clean up imports
- [ ] Add JSDoc comments

### 6.2 Add Unit Tests for Consumers

```
packages/parser-en-us/tests/slot-consumers/
├── entity-slot-consumer.test.ts
├── text-slot-consumer.test.ts
├── typed-slot-consumer.test.ts
└── vocabulary-slot-consumer.test.ts
```

- [ ] Test each consumer in isolation with mock context
- [ ] Test edge cases that were hard to test before

### 6.3 Update Exports

- [ ] Export consumers from `packages/parser-en-us/src/index.ts`
- [ ] Document public API

**Checkpoint:** ADR-088 fully complete with tests.

---

## Phase 7: ADR-087 - Action-Centric Grammar Builder

**Goal:** Add new `.forAction()` API to GrammarBuilder.

### 7.1 Extend GrammarBuilder Interface
```
packages/if-domain/src/grammar/grammar-builder.ts
```

- [ ] Add `forAction(actionId: string): ActionGrammarBuilder` method
- [ ] Create `ActionGrammarBuilder` interface:
  - `verbs(verbs: string[]): this`
  - `pattern(pattern: string): this`
  - `patterns(patterns: string[]): this`
  - `directions(map: Record<Direction, string[]>): this`
  - `where(slot, constraint): this`
  - `withPriority(priority): this`
  - `withSemantics(fn): this`
  - `build(): void`

### 7.2 Implement ActionGrammarBuilder
```
packages/parser-en-us/src/action-grammar-builder.ts
```

- [ ] Implement `ActionGrammarBuilder` class
- [ ] Generate multiple patterns from verb list + pattern template
- [ ] Handle direction aliases specially (attach direction semantics)
- [ ] Delegate to existing `.define()` API for each generated pattern

### 7.3 Test New API

```
packages/parser-en-us/tests/action-grammar-builder.test.ts
```

- [ ] Test verb alias expansion: `['push', 'press']` + `:target` → 2 patterns
- [ ] Test multiple patterns: `['push', 'press']` + `[':target', ':target :direction']` → 4 patterns
- [ ] Test direction aliases: `{ NORTH: ['north', 'n'] }` → 2 patterns with direction semantics
- [ ] Test constraints applied to all generated patterns

**Checkpoint:** New API works, existing `.define()` API unchanged.

---

## Phase 8: ADR-087 - Migrate Existing Definitions

### 8.1 Migrate Pushing/Pulling Actions

**Before:**
```typescript
grammar.define('push :target').where(...).mapsTo('if.action.pushing').build();
grammar.define('shove :target').where(...).mapsTo('if.action.pushing').build();
grammar.define('move :target').where(...).mapsTo('if.action.pushing').build();
```

**After:**
```typescript
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();
```

- [ ] Migrate pushing (add `press`!)
- [ ] Migrate pulling
- [ ] Test: "press blue button" now works

### 8.2 Migrate Direction Commands

**Before:**
```typescript
grammar.define('north').mapsTo('if.action.going').withSemantics(...).build();
grammar.define('n').mapsTo('if.action.going').withSemantics(...).build();
// ... 24 more
```

**After:**
```typescript
grammar
  .forAction('if.action.going')
  .directions({
    [Direction.NORTH]: ['north', 'n'],
    [Direction.SOUTH]: ['south', 's'],
    // ...
  })
  .build();
```

- [ ] Migrate all 12 directions with abbreviations
- [ ] Verify semantics include direction value

### 8.3 Migrate Other Action Groups

Identify and migrate other verb synonym groups:
- [ ] Opening/closing (open, unlock → different actions, skip)
- [ ] Taking (take, get, pick up, grab)
- [ ] Dropping (drop, put down, discard)
- [ ] Looking/examining (look, examine, x, l)
- [ ] Others as identified

### 8.4 Test Full Migration

- [ ] Run all parser tests
- [ ] Run all transcript tests
- [ ] Verify dungeo "press blue button" works

**Checkpoint:** ADR-087 complete. Grammar definitions DRY and action-centric.

---

## Phase 9: Sync Verification

### 9.1 Create Sync Test

```
packages/parser-en-us/tests/grammar-lang-sync.test.ts
```

- [ ] For each action in lang-en-us, verify grammar has patterns for all declared verbs
- [ ] Warn if grammar has verbs not in lang-en-us (intentional extensions)
- [ ] Fail if lang-en-us has verbs not in grammar (the bug we found)

### 9.2 Document Migration

- [ ] Update CLAUDE.md with new grammar patterns
- [ ] Add examples to ADRs showing before/after

**Checkpoint:** Both ADRs complete with safety net.

---

## Summary

| Phase | ADR | Deliverable | Lines Changed |
|-------|-----|-------------|---------------|
| 1 | 088 | Slot consumer infrastructure | +100 |
| 2 | 088 | EntitySlotConsumer | +350, -350 |
| 3 | 088 | TextSlotConsumer | +150, -150 |
| 4 | 088 | TypedSlotConsumer | +250, -250 |
| 5 | 088 | VocabularySlotConsumer | +150, -150 |
| 6 | 088 | Cleanup + unit tests | +200 |
| 7 | 087 | ActionGrammarBuilder | +200 |
| 8 | 087 | Migrate definitions | ~0 (refactor) |
| 9 | 087 | Sync verification | +50 |

**Total:** ~1450 lines added, ~900 lines removed, net +550 (but much better organized)

---

## Test Commands

```bash
# Parser unit tests
pnpm --filter '@sharpee/parser-en-us' test

# Colored buttons test (verifies press works)
npx vitest run packages/parser-en-us/tests/colored-buttons.test.ts

# Dungeo transcript tests
./scripts/fast-transcript-test.sh stories/dungeo --all

# Full test suite
pnpm test
```

---

## Rollback Plan

If issues arise mid-implementation:
1. Each phase is independently committable
2. Existing `.define()` API never removed
3. Can revert individual consumer extractions
4. Grammar engine can fall back to inline methods
