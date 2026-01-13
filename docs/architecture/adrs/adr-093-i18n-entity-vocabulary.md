# ADR-093: Entity Vocabulary and Adjective Disambiguation

## Status: IMPLEMENTED (Phase 1) / DEFERRED (Phase 2)

## Date: 2026-01-12

## Context

### The Problem

When parsing "press yellow button", the system cannot disambiguate between multiple buttons. The dam maintenance room has four buttons (yellow, brown, red, blue) but "press yellow button" returns ENTITY_NOT_FOUND.

### Pipeline Analysis

We traced the full grammar → vocab → command → action pipeline:

```
User Input: "press yellow button"
           ↓
┌──────────────────────────────────────────────────────────────┐
│ EnglishParser.tokenizeRich()                                 │
│   - Lookup each word in VocabularyRegistry                   │
│   - "press" → VERB, "yellow" → UNKNOWN, "button" → UNKNOWN   │
└──────────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────────┐
│ GrammarEngine.findMatches()                                  │
│   - Pattern "press :target" matches                          │
│   - EntitySlotConsumer consumes "yellow button" for :target  │
│   - Returns: { text: "yellow button", head: "button",        │
│               modifiers: [] }  ← GAP: modifiers empty!       │
└──────────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────────┐
│ CommandValidator.resolveEntity()                             │
│   - Find candidates by name "button" → [yellow, brown, red,  │
│     blue]                                                    │
│   - scoreEntities() tries to use modifiers for disambiguation│
│   - getEntityAdjectives() reads identity.adjectives          │
│     → returns [] because field doesn't exist! ← GAP          │
│   - All 4 buttons score equally → AMBIGUOUS or NOT_FOUND     │
└──────────────────────────────────────────────────────────────┘
```

### Identified Gaps

| Component | Gap | Fix |
|-----------|-----|-----|
| IdentityTrait | No `adjectives` field | Add `adjectives: string[]` |
| GameEngine | `updateEntityVocabulary()` hard-codes `adjectives: []` | Read from `identity.adjectives` |
| EntitySlotConsumer | Doesn't populate `modifiers` | Extract adjectives from noun phrase |
| CommandValidator | `getEntityAdjectives()` returns `[]` | Read from trait properly |

### Note on lang-en-us/commonAdjectives

The `commonAdjectives` list in `lang-en-us/src/data/words.ts` was never wired up. It's aspirational code that predates this fix.

**Decision:** Stories own their vocabulary. Each entity declares its adjectives in IdentityTrait. The platform doesn't need a master list of "common" adjectives - that's the story author's responsibility. The `commonAdjectives` list in lang-en-us can be removed or marked as reference-only.

### Architectural Insight: Syntax vs Semantics

**SlotConsumer** handles noun phrase **syntax**:
- "all" / "all but X" / "X and Y" parsing
- Grouping and exclusion
- Returns structured noun phrase, NOT resolved entities

**CommandValidator/EntityResolver** handles **semantics**:
- Adjective extraction from noun phrase text
- Vocabulary lookup and matching
- Scope filtering and disambiguation
- Returns resolved entity IDs

This separation is correct. SlotConsumer should NOT do entity resolution - it should capture the noun phrase structure and let the resolver handle matching.

### I18N Consideration (Deferred)

For future multi-language support, entity vocabulary should be language-agnostic:

| Aspect | English | Spanish |
|--------|---------|---------|
| Nouns | "lamp" | "lámpara" |
| Adjectives | "brass" | "de latón" |
| Word order | "brass lamp" | "lámpara de latón" |
| Articles | "a/the" (no gender) | "una/la" (feminine) |

This would require vocabulary to live in language packages, not IdentityTrait. However, this is significant architectural work that we defer until an actual need arises (e.g., author requests localization).

## Decision

### Phase 1: Adjective Disambiguation (APPROVED - Implement Now)

Minimal changes to unblock Dungeo:

#### 1. Add `adjectives` field to IdentityTrait

**File:** `packages/world-model/src/traits/identity/identityTrait.ts`

```typescript
export class IdentityTrait implements ITrait {
  // ... existing fields ...

  /** Adjectives that can be used to refer to this entity */
  adjectives: string[] = [];
}
```

#### 2. Parser extracts modifiers from noun phrases

**File:** `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts`

When building INounPhrase, extract words before the head noun as modifiers:

```typescript
// "yellow button" → { head: "button", modifiers: ["yellow"], text: "yellow button" }
// "big red ball" → { head: "ball", modifiers: ["big", "red"], text: "big red ball" }
```

Algorithm:
1. Identify head noun (last content word, or known entity noun)
2. Words before head that aren't articles/determiners are modifiers
3. Store in `INounPhrase.modifiers`

#### 3. CommandValidator uses modifiers for scoring

**File:** `packages/stdlib/src/validation/command-validator.ts`

`scoreEntities()` already has modifier matching logic:
```typescript
for (const modifier of modifiers) {
  if (adjectives.includes(modifier)) {
    score += 5;  // modifier_match
  }
}
```

Fix `getEntityAdjectives()` to read from the new field:
```typescript
private getEntityAdjectives(entity: IFEntity): string[] {
  const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  return identity?.adjectives ?? [];
}
```

#### 4. Story entities declare adjectives

**File:** `stories/dungeo/src/regions/dam.ts` (example)

```typescript
const yellowButton = world.createEntity('yellow-button', 'object');
yellowButton.set(IdentityTrait, {
  name: 'yellow button',
  aliases: ['button'],
  adjectives: ['yellow'],  // NEW
});
```

### Phase 2: I18N-Aware Vocabulary (DEFERRED)

Full internationalization architecture for when/if needed:

1. **IdentityTrait becomes language-agnostic**
   - Remove `name`, `aliases`, `article` (English strings)
   - Add `semanticId` for language layer lookup
   - Adjectives become semantic categories: `['color:yellow']`

2. **Vocabulary lives in language packages**
   - `lang-en-us` provides English vocabulary per entity
   - `lang-es` provides Spanish vocabulary
   - Parser reads from language-specific vocabulary

3. **No new packages needed**
   - Vocabulary logic stays in `parser-en-us` (or `parser-es`)
   - Vocabulary data can be in `lang-*` packages
   - Story translation files map semantic IDs to localized text

This is significant work. We'll tackle it when an author actually needs multi-language support.

## Implementation Checklist (Phase 1) - COMPLETED 2026-01-12

**Platform changes (packages/):**
- [x] Add `adjectives: string[]` to IdentityTrait (`packages/world-model`)
- [x] Fix GameEngine.updateEntityVocabulary() to read `identity.adjectives` (`packages/engine`)
- [x] Verify EntitySlotConsumer - not needed, CommandValidator has fallback modifier extraction
- [x] Verify CommandValidator.getEntityAdjectives() - already reads from trait correctly
- [x] Verify CommandValidator.scoreEntities() - already uses modifiers for scoring (+5 per match)

**Story changes (stories/dungeo):**
- [x] Update dam buttons with adjectives: yellow, brown, red, blue

**Testing:**
- [x] Test: "press yellow button" resolves to yellow button
- [x] Run dam-drain.transcript - all 20 tests pass

## Consequences

### Positive
- Disambiguation works for "yellow button", "brass lamp", etc.
- Minimal changes - three files modified
- Backward compatible - `adjectives` defaults to `[]`
- Clear path to i18n when needed

### Negative
- English strings still in IdentityTrait (i18n debt)
- Stories need to add `adjectives` to entities that need disambiguation

### Migration
- No migration needed for Phase 1
- Existing stories work unchanged
- New entities can optionally add `adjectives`

## Related ADRs

- ADR-017: Disambiguation
- ADR-037: Parser Language Provider
- ADR-038: Language-Agnostic Actions
- ADR-044: Parser Vocabulary Gaps
- ADR-048: Static Language Architecture
- ADR-087: Action-Centric Grammar
- ADR-089: Pronoun Resolution

## Open Questions (for Phase 2)

1. Should semantic adjectives use taxonomy (`color:yellow`) or flat strings?
2. How to handle relative adjectives ("small" elephant vs "small" ant)?
3. Where do translation files live - in story or separate package?
4. How does parser handle different word orders (adj-noun vs noun-adj)?
