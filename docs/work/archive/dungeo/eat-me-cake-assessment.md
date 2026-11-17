# "Eat Eat-Me Cake" Parser Failure — Deep Assessment

## Executive Summary

The original diagnosis was "verb 'eat' collides with entity name 'eat-me'." This is **partially correct but masks the actual root cause**: the eating action has no grammar pattern in `grammar.ts`, so `eat <anything>` fails to parse. The entity name collision is a secondary issue that will need attention after the primary fix.

---

## Root Cause Analysis

### Finding 1: Eating Has No Grammar Pattern (PRIMARY)

The eating action is defined in `packages/lang-en-us/src/data/verbs.ts` (line 255):

```typescript
{
  action: IFActions.EATING,
  verbs: ['eat', 'consume', 'devour'],
  requiresObject: true
}
```

However, **this only registers "eat" in the vocabulary registry for tokenization** (POS tagging). It does NOT create grammar rules.

Grammar rules are created ONLY by:
1. `defineGrammar()` in `packages/parser-en-us/src/grammar.ts`
2. `parser.addVerb()` at runtime
3. `parser.getStoryGrammar()` for story extensions

**Eating is absent from all three.**

Compare with taking, which works correctly:

```typescript
// grammar.ts line 89-93 — HAS explicit pattern
grammar
  .forAction('if.action.taking')
  .verbs(['take', 'get', 'grab'])
  .pattern(':item')
  .build();
```

No equivalent exists for eating. This means:
- `eat cake` → parse fails (no grammar rule)
- `eat blue cake` → parse fails (no grammar rule)
- `eat eat-me cake` → parse fails (no grammar rule)
- `consume apple` → parse fails (no grammar rule)

**All eating commands fail**, not just "eat eat-me cake".

#### Verification Path

The parsing pipeline in `english-parser.ts`:

1. `tokenizeRich(input)` — splits into tokens, assigns POS from vocabulary
2. `findCommandStructures(tokens)` — calls `grammarEngine.findMatches(tokens, context)`
3. Grammar engine iterates over `this.rules` — only rules from `defineGrammar()` and runtime additions
4. No eating rule → no matches → parse error

There is **no fallback path** that auto-generates `VERB :item` patterns from vocabulary definitions.

### Finding 2: Other Missing Grammar Patterns

Cross-referencing `verbs.ts` against `grammar.ts`, several verbs likely have the same problem:

| Verb | In verbs.ts? | In grammar.ts? | Status |
|------|:---:|:---:|--------|
| eat/consume/devour | Yes | **No** | BROKEN |
| drink/sip/quaff | Yes | **No** | BROKEN |
| climb/scale/ascend | Yes | **No** | Likely broken |
| listen/hear | Yes | **No** | May work (no object) |
| smell/sniff | Yes | **No** | May work (no object) |
| sleep/rest | Yes | **No** | May work (no object) |
| wear/don/equip | Yes | **No** | BROKEN |
| remove/take off | Yes | **No** | BROKEN (phrasal in grammar) |
| lock/secure | Yes | **No** | Likely broken |
| unlock/unsecure | Yes | **No** | Likely broken |

Note: Some of these (lock/unlock) have compound patterns in grammar.ts (e.g., `unlock :door with :key`) but not simple ones.

### Finding 3: Entity Name Collision (SECONDARY)

Even after adding eating to grammar.ts, "eat eat-me cake" faces a secondary challenge:

**Tokenization of "eat eat-me cake":**
- Token 0: `"eat"` → POS: VERB (maps to eating action)
- Token 1: `"eat-me"` → POS: NOUN (maps to eat-me cake entity via vocabulary)
- Token 2: `"cake"` → POS: UNKNOWN (unless registered)

**With a grammar rule `eat :item`:**
1. Grammar engine matches `"eat"` against the literal verb ✓
2. Entity slot consumer starts at token 1 (`"eat-me"`)
3. `consumeEntityWithListDetection()` in `entity-slot-consumer.ts` (line 326-343) greedily consumes all remaining tokens until a delimiter
4. Passes `"eat-me cake"` to `ScopeEvaluator.findEntitiesByName()`
5. Entity aliases include `"eat-me cake"` → exact match ✓

**This should work** because:
- The hyphenated `"eat-me"` is a single token (tokenizer splits on whitespace, not hyphens)
- After consuming the verb `"eat"`, remaining tokens `["eat-me", "cake"]` are consumed as entity name
- `findEntitiesByName("eat-me cake")` finds the entity via its alias

**However**, there may be an issue if the token `"eat-me"` gets POS=VERB (because "eat" substring matches), which could confuse slot consumption. Need to verify after adding the grammar pattern.

---

## Evidence: Vocabulary Registry Flow

### Registration (parser init)

```
EnglishParser constructor
├── defineGrammar(grammar)        → creates GrammarRules (e.g., "take :item")
└── initializeVocabulary()
    ├── adaptVerbVocabulary()      → converts verbs.ts to VerbVocabulary[]
    └── vocabularyRegistry.registerVerbs(verbs)  → creates VocabularyEntries (POS only)
        └── Does NOT call grammarEngine.addRule()
```

### Tokenization

`vocabularyRegistry.lookup("eat")` returns:
```
[{ word: "eat", partOfSpeech: VERB, mapsTo: "if.action.eating", source: "base" }]
```

`vocabularyRegistry.lookup("eat-me")` returns:
```
[{ word: "eat-me", partOfSpeech: NOUN, mapsTo: "eat-me-cake-entity-id", source: "entity" }]
```

### Grammar Matching

`grammarEngine.findMatches(tokens)` iterates `this.rules`. There is NO rule with:
- pattern: `eat :item`
- action: `if.action.eating`

So findMatches returns `[]` → parse fails.

---

## Recommended Fix

### Step 1: Add Eating + Drinking Grammar Patterns (Platform)

In `packages/parser-en-us/src/grammar.ts`, after the taking/dropping section:

```typescript
// Eating (ADR-087: using forAction)
grammar
  .forAction('if.action.eating')
  .verbs(['eat', 'consume', 'devour'])
  .pattern(':item')
  .build();

// Drinking (ADR-087: using forAction)
grammar
  .forAction('if.action.drinking')
  .verbs(['drink', 'sip', 'quaff'])
  .pattern(':item')
  .build();
```

This is a **minimal platform change** — adding patterns for verbs that already exist in `verbs.ts` but were never given grammar rules. This is a bug fix, not a new feature.

### Step 2: Verify "eat eat-me cake" Parses

After adding the grammar pattern, test:
1. `eat cake` → should resolve to any cake
2. `eat blue cake` → should resolve to blue cake
3. `eat eat-me cake` → should resolve to eat-me cake (via alias match)
4. `consume cake` → should work (verb alias)

If step 3 still fails, investigate:
- Whether `"eat-me"` token gets dual POS (VERB + NOUN)
- Whether entity slot consumer handles the `"eat-me"` token correctly
- Whether `ScopeEvaluator.findEntitiesByName("eat-me cake")` returns the entity

### Step 3: Audit Other Missing Patterns

Add grammar patterns for all `requiresObject: true` verbs in verbs.ts that lack grammar.ts rules. Priority candidates:
- `wear/don/equip` → `if.action.wearing`
- `lock/secure` → `if.action.locking` (simple pattern without "with")
- `unlock` → `if.action.unlocking` (simple pattern without "with")
- `climb/scale` → `if.action.climbing`

### Alternative: Entity Rename (Not Recommended)

Renaming the cake to avoid "eat" in the name would be a workaround, not a fix. The grammar pattern gap would remain, breaking all eating commands.

---

## Risk Assessment

| Fix | Risk | Blast Radius | Recommendation |
|-----|------|-------------|----------------|
| Add eating/drinking grammar patterns | Low | All games using these verbs | Do it |
| Add other missing patterns | Low-Med | Needs testing per verb | Do after eating works |
| Rename eat-me cake entity | None | Story only | Not recommended (masks real bug) |
| Parser changes for hyphenated names | High | All entity resolution | Only if Step 2 fails |

---

## Files Involved

| File | Role |
|------|------|
| `packages/parser-en-us/src/grammar.ts` | **FIX HERE**: Add eating/drinking patterns |
| `packages/lang-en-us/src/data/verbs.ts` | Verb definitions (reference only, no changes) |
| `packages/parser-en-us/src/english-grammar-engine.ts` | Grammar matching logic (no changes expected) |
| `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts` | Entity slot consumption (verify after fix) |
| `packages/parser-en-us/src/scope-evaluator.ts` | Entity name matching (verify after fix) |
| `stories/dungeo/src/regions/well-room.ts` | Entity definition with aliases (no changes) |
