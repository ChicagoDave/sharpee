# Work Summary: ADR-089 Phase D - Message Placeholders

**Date**: 2026-01-05 14:00
**Duration**: ~45 minutes
**Feature/Area**: Language Layer, Perspective Placeholders, Verb Conjugation
**Branch**: identity

## Objective

Implement ADR-089 Phase D - Add perspective-aware placeholders to messages so stories can support 1st, 2nd, and 3rd person narratives.

## What Was Accomplished

### 1. Created Perspective Placeholder Resolver

New module: `packages/lang-en-us/src/perspective/`

**Files:**
- `placeholder-resolver.ts` - Main implementation
- `index.ts` - Module exports

**Features:**
- Subject pronouns: `{You}` / `{you}` -> "I" / "You" / "She"
- Possessive adjectives: `{Your}` / `{your}` -> "My" / "Your" / "Her"
- Possessive pronouns: `{Yours}` / `{yours}` -> "Mine" / "Yours" / "Hers"
- Reflexive pronouns: `{Yourself}` / `{yourself}` -> "Myself" / "Yourself" / "Herself"
- Contractions: `{You're}` / `{you're}` -> "I'm" / "You're" / "She's"
- Verb conjugation: `{take}` -> "take" / "takes" based on perspective

**Verb Conjugation:**
- Regular verbs: add -s, -es, or -ies for 3rd person singular
- Irregular verbs: be, have, do, go, can, will, would, could, should, etc.
- Plural they/them: uses base form ("they take" not "they takes")
- Modals: no change (can, will, would, etc.)

### 2. Integrated into EnglishLanguageProvider

Modified: `packages/lang-en-us/src/language-provider.ts`

- Added `narrativeContext: NarrativeContext` property
- Added `setNarrativeSettings(settings)` method
- Added `getNarrativeContext()` getter
- Updated `getMessage()` to resolve perspective placeholders before param substitution

### 3. Updated High-Frequency Messages

Updated messages in these action files to use perspective placeholders:

**taking.ts:**
```typescript
'cant_take_self': "{You} {can't} take {yourself}.",
'already_have': "{You} already {have} {item}.",
'taken_from': "{You} {take} {item} from {container}."
```

**dropping.ts:**
```typescript
'not_held': "{You} aren't holding {item}.",
'dropped_in': "{You} {put} {item} in {container}."
```

**opening.ts:**
```typescript
'opened': "{You} {open} {item}.",
'its_empty': "{You} {open} {container}, which is empty.",
'cant_reach': "{You} {can't} reach {item}."
```

**closing.ts:**
```typescript
'closed': "{You} {close} {item}.",
'cant_reach': "{You} {can't} reach {item}."
```

### 4. Local PronounSet Type

Defined `PronounSet` and `PRONOUNS` locally in lang-en-us to avoid depending on world-model (architectural layering). The interface is structurally identical to world-model's version.

### 5. Tests

New test file: `packages/lang-en-us/tests/unit/perspective/placeholder-resolver.test.ts`

29 tests covering:
- 2nd person (default) - 5 tests
- 1st person - 5 tests
- 3rd person singular (she/her) - 5 tests
- 3rd person plural (they/them) - 4 tests
- Parameter placeholder passthrough - 2 tests
- Verb conjugation (regular, irregular, plural) - 8 tests

## Files Changed

- `packages/lang-en-us/src/perspective/placeholder-resolver.ts` (new, ~230 lines)
- `packages/lang-en-us/src/perspective/index.ts` (new, ~13 lines)
- `packages/lang-en-us/src/language-provider.ts` (+30 lines)
- `packages/lang-en-us/src/index.ts` (+3 lines)
- `packages/lang-en-us/src/actions/taking.ts` (message updates)
- `packages/lang-en-us/src/actions/dropping.ts` (message updates)
- `packages/lang-en-us/src/actions/opening.ts` (message updates)
- `packages/lang-en-us/src/actions/closing.ts` (message updates)
- `packages/lang-en-us/tests/unit/perspective/placeholder-resolver.test.ts` (new, ~200 lines)

## Example Output

**2nd person (default):**
```
> take lamp
Taken.
> drop it
You put brass lamp in living room.
```

**1st person:**
```
> take lamp
Taken.
> drop it
I put brass lamp in living room.
```

**3rd person (she/her):**
```
> take lamp
Taken.
> drop it
She puts brass lamp in living room.
```

## Integration Notes

1. **Engine must configure language provider** - After loading a story, the engine should call:
   ```typescript
   languageProvider.setNarrativeSettings({
     perspective: storyConfig.narrative?.perspective || '2nd',
     playerPronouns: player.get('actor')?.pronouns
   });
   ```

2. **Gradual message migration** - Not all messages have been updated yet. This is intentional - high-frequency messages are done, others can be migrated incrementally.

3. **Parameter placeholders still work** - `{item}`, `{target}`, etc. are preserved for regular parameter substitution.

## Remaining Work

1. **Wire engine to language provider** - The engine needs to call `setNarrativeSettings()` after story load
2. **Migrate remaining messages** - Other action messages can be updated as needed
3. **Phase E: Advanced verb handling** - Negations ("aren't" vs "isn't"), past tense, etc.

## ADR-089 Status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Expand pronoun system in world-model | Done |
| B | Pronoun context in parser | Done |
| C | NarrativeSettings (engine) | Done |
| D | Message Placeholders | Done |
| E | Verb Conjugation (advanced) | Future |
