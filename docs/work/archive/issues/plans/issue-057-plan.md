# Plan: ISSUE-057 — Multi-word aliases don't resolve in the parser

## Problem
Entity aliases with spaces (e.g., "bush babies", "brass lantern") don't resolve when used in player commands.

## Scope
- Severity: Medium (highest player-visible impact)
- Component: parser-en-us, stdlib (command-validator)
- Blast radius: 171 alias declarations across 22 Dungeo files

## Root Cause Analysis

The parser pipeline was traced end-to-end. The failure is **not** in tokenization or slot consumption — those work correctly. The failure is in **two places** downstream.

### How the pipeline works today

For `examine bush babies` with pattern `examine :target`:

1. **Tokenization**: `["examine", "bush", "babies"]` — correct
2. **Grammar matching**: literal `examine` matches token[0] — correct
3. **Slot consumption** (`entity-slot-consumer.ts:326-342`): The "standard consumption" loop consumes ALL remaining tokens until a delimiter or "and". So `entityWords = ["bush", "babies"]`, `text = "bush babies"` — **correct, already multi-token**
4. **Constraint evaluation** (`entity-slot-consumer.ts:380-396`): If the grammar rule has `.where()` constraints, calls `ScopeEvaluator.findEntitiesByName("bush babies", ...)`. This does exact match against entity names/aliases — **works if alias "bush babies" exists**
5. **Noun phrase construction** (`english-parser.ts:856-864`):
   ```typescript
   const phrase: INounPhrase = {
     text: slotData.text,            // "bush babies" — correct
     head: slotTokens[last].normalized,  // "babies" — LAST TOKEN ONLY
     candidates: [slotData.text]     // ["bush babies"]
   };
   ```
   **`head` is set to the last token only** — this is the first problem.

6. **Command validation** (`command-validator.ts:640`):
   ```typescript
   const searchTerm = ref.head || ref.text;  // "babies", NOT "bush babies"
   ```
   **The validator searches by `head` ("babies"), not `text` ("bush babies")** — this is the second problem.

7. **Entity search** (`command-validator.ts:666-674`): Searches by name, type, and synonym using "babies". No entity has "babies" as a name or alias → **"You can't see any such thing."**

### Why some multi-word names work

Entities like "brass lantern" work because they have a single-word alias "lantern" that matches the `head` token. The multi-word alias "brass lantern" is never actually used — it's the fallback "lantern" alias doing the work.

### Why the constraint path sometimes works

When grammar rules have `.where()` constraints (step 4), the parser's `ScopeEvaluator.findEntitiesByName` correctly matches the full text "bush babies" against aliases. But this only validates whether the grammar rule matches — the actual entity resolution in step 6 uses the broken `head`-based search. The constraint check is a gate on pattern acceptance, not the entity resolution itself.

## Fix: Maximal Munch in the Command Validator

The fix applies the **maximal munch** algorithm (longest match first) from compiler tokenization. The parser already does its job — slot consumption correctly builds multi-word text. The fix is in how the command validator resolves that text to an entity.

### Approach

**Primary fix in `command-validator.ts:resolveEntity()`** — search by full `text` first, fall back to `head`:

```typescript
// Current (broken):
const searchTerm = ref.head || ref.text;

// Fixed (maximal munch):
// Try full text first (longest match), fall back to head noun
let candidates = this.findCandidatesByText(ref.text);
if (candidates.length === 0 && ref.head && ref.head !== ref.text) {
  candidates = this.findCandidatesByText(ref.head);
}
```

Where `findCandidatesByText(term)` encapsulates the existing name/type/synonym/adjective search chain.

This is the compiler maximal munch pattern: try the longest token sequence first, fall back to shorter ones. The "vocabulary" is the set of entity names/aliases in scope.

### Why this works

- For `examine bush babies`: tries "bush babies" first → exact alias match → found
- For `take brass lantern`: tries "brass lantern" first → exact alias match → found. If no alias, falls back to "lantern" → single-word alias match → still works
- For `take lantern`: `text` = "lantern", `head` = "lantern" → same as today
- For `put brass lantern on brass table`: each slot is consumed separately by the entity-slot-consumer (delimited by "on"), so direct object text = "brass lantern", indirect object text = "brass table" — each resolved independently

### Secondary fix: `head` construction in `english-parser.ts`

Consider also fixing how `head` is set. Currently it's always the last token, which is a naive heuristic. For multi-word entity names, the head should be the full text or at least a smarter extraction. But this is optional — the primary fix in the validator is sufficient and lower risk.

## Detailed Impact on Dungeo

### Entities that currently work by accident (single-word fallback)

These entities have multi-word aliases that silently fail, but single-word aliases save them:

| Entity | Multi-word alias (broken) | Single-word fallback (works) | Files |
|--------|--------------------------|------------------------------|-------|
| brass lantern | "brass lantern" | "lantern", "lamp" | `house-interior.ts` |
| nasty knife | "nasty knife" | "knife" | `objects/weapons.ts` |
| jeweled egg | "jeweled egg" | "egg" | `objects/treasures.ts` |
| crystal trident | "crystal trident" | "trident" | `objects/treasures.ts` |
| ivory torch | "ivory torch" | "torch" | `objects/treasures.ts` |
| gold coffin | "gold coffin" | "coffin" | `objects/treasures.ts` |
| rusty knife | "rusty knife" | "knife" (ambiguous with nasty knife!) | `objects/weapons.ts` |
| rope perches | "rope perches" | "perches" | various |
| wooden door | "wooden door" | "door" | various |

**After the fix**: Multi-word aliases will resolve correctly. The single-word fallbacks still work too. No behavior change for the player — they just get more ways to reference the same entity.

### Entities that currently fail (no single-word fallback)

These are the player-visible bugs the fix resolves:

| Multi-word alias | Why it fails | Expected match |
|-----------------|--------------|----------------|
| "pile of plastic" | head = "plastic", no entity named "plastic" | pile-of-plastic entity |
| "stick of incense" | head = "incense", no entity named "incense" | incense entity |
| "thief knife" | head = "knife", ambiguous with player's knife | thief's knife specifically |
| "bush babies" (Family Zoo) | head = "babies", no entity named "babies" | bush-babies entity |

### Disambiguation impact

The fix could change disambiguation behavior in some edge cases:

**Before fix**: `take rusty knife` → head = "knife" → finds both rusty knife and nasty knife → disambiguation prompt
**After fix**: `take rusty knife` → full text "rusty knife" matches exactly → no disambiguation needed

This is strictly better — the player was more specific, and the system now respects that specificity. The maximal munch principle: longer matches are more specific and should be preferred.

### Transcript impact

- **Walkthroughs (wt-01 through wt-17)**: All use single-word references (`lantern`, `knife`, `egg`). No changes expected. These should pass unchanged.
- **Unit transcripts**: Same — authors used single-word forms as workarounds. No changes expected.
- **New transcripts**: After the fix, new transcripts CAN use multi-word references, but existing ones don't need to change.

### GDT debug commands

GDT uses `:arg...` greedy slots as a workaround for multi-word names. These consume ALL remaining tokens as raw text and join them manually (e.g., `ao.ts:33`). This path is unaffected by the fix since it doesn't go through entity slot consumption.

## Implementation Steps

1. **Extract `findCandidatesByText()` helper in `command-validator.ts`**
   - Factor out lines 666-702 (the name/type/synonym/adjective search chain)
   - Make it accept a search term and return candidate entities
   - This is a pure refactor — no behavior change

2. **Implement maximal munch in `resolveEntity()`**
   - Try `ref.text` first (full multi-word phrase)
   - Fall back to `ref.head` if no match
   - ~10 lines of code change

3. **Also fix the AWARE scope path** (line 654-662)
   - Same issue: uses `searchTerm` which is `head`-based
   - Apply same maximal munch: try full text first

4. **Update disambiguation scoring** (line 1020-1030)
   - Exact match on full text should score higher than match on head alone
   - Add a `full_text_match` scoring tier above `exact_name_match`

5. **Write unit tests**
   - `examine bush babies` → resolves to bush-babies entity
   - `take brass lantern` → resolves to brass-lantern (no disambiguation)
   - `take lantern` → still works (single-word)
   - `put brass lantern on brass table` → both resolve correctly
   - `take knife` when two knives in scope → disambiguation (unchanged behavior)
   - `take rusty knife` when two knives in scope → resolves to rusty knife (improved)

6. **Regression test**
   - Full walkthrough chain: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
   - All unit transcripts: `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript`
   - Build required first: `./build.sh -s dungeo`

7. **Also fixes ISSUE-061**
   - Story grammar `:thing` slots go through the same command-validator path
   - The fix applies to all entity slot types, not just stdlib grammar

## Effort Estimate

Small-medium — 1 session. The fix is ~30 lines of code change in one file (`command-validator.ts`), plus tests. The investigation was the hard part.

## Dependencies
None.

## Risks

- **Low risk**: The fix is additive — it tries a longer match first, then falls back to existing behavior. If the full-text search finds nothing, the head-based search runs exactly as before.
- **Disambiguation changes**: Some commands that previously triggered disambiguation (because `head` was ambiguous) will now resolve directly (because full `text` is unambiguous). This is an improvement, not a regression, but could cause transcript assertions to change if any tests expect disambiguation prompts for multi-word inputs. (No current transcripts do this.)
- **Performance**: One additional `findWhere` pass over entities when the full-text search succeeds. Negligible — entity counts are small (< 500 even in Dungeo).
- **"of" and articles**: Phrases like "pile of plastic" include the preposition "of". The entity's alias must include "of" too (e.g., alias "pile of plastic"). If it doesn't, the full-text search fails and falls back to head ("plastic"). This is correct behavior — the author controls alias strings.
