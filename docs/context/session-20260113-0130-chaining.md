# Session Summary: 2026-01-13 01:30 - chaining

## Status: Completed

## Goals
- Implement Phase 3 of ADR-094 Event Chaining: Language Layer Support
- Render `if.event.revealed` as "Inside the chest you see a sword, a key, and a map."

## What Actually Happened

Started implementing Phase 3 but discovered the implementation plan's approach was flawed. The text service shouldn't have hardcoded English rendering logic. This led to designing a proper template system.

## Key Discovery

The language layer needs a proper template system that:
1. Handles lists with articles ("a sword, an apple, and Excalibur")
2. Respects noun types (common, proper, mass, unique, plural)
3. Produces structured output for multiple client types
4. Lets authors control composition (embedded vs separate blocks)

## ADR-095: Message Templates with Formatters

Wrote a new ADR covering:

### Template Syntax
Modifier prefix format: `{modifier:modifier:placeholder}`

```typescript
'Inside the {container} you see {a:items:list}.'
'{You:cap} {take} {the:item}.'
```

### Formatters
| Formatter | Example | Result |
|-----------|---------|--------|
| `a` | `{a:item}` | "a sword" / "an apple" |
| `the` | `{the:item}` | "the sword" |
| `list` | `{items:list}` | "x, y, and z" |
| `cap` | `{name:cap}` | "Sword" |

### Noun Types
Entities carry noun type metadata:
- `common`: "a sword", "the sword"
- `proper`: "Excalibur" (no article)
- `mass`: "some water"
- `unique`: "the sun"
- `plural`: "the scissors"

### Conditional Templates
Count-based variants:
```typescript
'if.event.revealed': {
  zero: '',
  one: 'Inside the {container} you see {a:item}.',
  other: 'Inside the {container} you see {a:items:list}.'
}
```

### Text Service Output Model
Key insight: Text service produces structured blocks, not final prose.

```typescript
interface TextBlock {
  key: string;      // 'room.description', 'action.result'
  text: string;     // Resolved template text
  priority?: number;
}
```

Clients (web, CLI, GLK, screen reader) render blocks according to their capabilities.

### Related ADRs
ADR-095 is part of a larger architecture:

| ADR | Topic |
|-----|-------|
| ADR-089 | Pronoun and Identity System (foundation) |
| ADR-094 | Event Chaining (consumer) |
| ADR-095 | Message Templates (this ADR) |
| ADR-096 | Text Service (planned) |
| ADR-097 | Web/React Client (planned) |
| ADR-098 | CLI Client (planned) |
| ADR-099 | GLK Client (planned) |
| ADR-100 | Screen Reader/JAWS (planned) |

## Reverted Changes

Removed premature StandardTextService changes that had:
- Hardcoded `if.event.revealed` case
- Inline English article/list formatting
- Bypassed the language layer

## Files Created

- `docs/architecture/adrs/adr-095-message-templates.md` - New ADR

## Files NOT Changed (Reverted)

- `packages/text-services/src/standard-text-service.ts` - Reverted to original

## Blocking Issues

**ADR-094 Phase 3 is blocked** until ADR-095 (template system) is implemented.

The implementation order should be:
1. ADR-095: Template system in lang-en-us
2. ADR-096: Text service refactor to use templates
3. ADR-094 Phase 3: Register revealed event template

## Key Decisions

### 1. Template Syntax
**Decision**: Modifier prefix with colons (`{a:items:list}`)

**Rationale**: Reads left-to-right, familiar syntax, `{a:item}` reads naturally as "a item" → "a sword"

### 2. Structured Output
**Decision**: Text service returns TextBlock array, not string

**Rationale**: Different clients (web, CLI, GLK, screen reader) need to render differently. Authors control semantic structure, clients control presentation.

### 3. Client-Agnostic Templates
**Decision**: Templates don't assume whitespace, styling, or layout

**Rationale**: Screen readers are linear, CLI has limited formatting, web has full CSS - templates must work for all.

## Open Questions (from ADR)

1. How to handle "first mention" vs "subsequent mention" (a → the)?
2. Should formatters have access to world state?
3. How to handle gendered pronouns for NPCs in templates?
4. What's the exact TextBlock structure?
5. How do clients negotiate capabilities?

## Notes

This session pivoted from implementation to design. The original Phase 3 plan in the implementation doc assumed simple event rendering in text service - but that violates language layer separation and doesn't support the multi-client architecture.

The new design is more complex but properly separates concerns:
- stdlib: emits semantic events with messageIds
- lang-en-us: registers templates for messageIds
- text service: resolves templates, produces TextBlocks
- clients: render TextBlocks appropriately

---

**Session duration**: ~1 hour
**Branch**: chaining
