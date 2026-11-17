# W4 bulk-cutover analysis — the bare-placeholder semantic fork

**Created**: 2026-06-27 (session 491b9c, branch `v2_phase34`)
**Status**: RESOLVED — Verbatim atom (ADR-200) is the home for non-entity text;
bare `{x}` stays the entity NounPhrase default (ADR-192 §5 unchanged). See
"Resolution" at the bottom.

## Resolution (2026-06-27)

**Option B, done the Sharpee way: implement the reserved `Verbatim` atom**
(ADR-200) rather than redefine the bare-`{x}` parser default (the rejected Option
A workaround). The phrase algebra already reserved `{verbatim:x}` for exactly this;
`Verb` (ADR-199) set the precedent for realizing a reserved atom.

### Finalized W4 migration rules (mechanical)

| Old (`:`-chain / bare) | New | Notes |
|---|---|---|
| `{the:x}` | `{the x}` | 457 sites — the bulk |
| `{the:cap:x}` / `{cap:the:x}` | `{capitalize the x}` | cap carrier (3a) |
| `{a:x}` / `{an:x}` | `{a x}` / `{an x}` | a/an agreed by Assembler |
| `{some:x}` | `{some x}` | |
| `{is:x}` | `{verb:is x}` | ADR-199 |
| `{was:x}` | `{verb:was x}` | ADR-199 (0 live) |
| `{has:x}` | `{verb:has x}` | ADR-199 |
| `{list:x}` | bare `{x}` + producer binds `PhraseList` | W6; needs `-data.ts` change |
| bare `{npcName}` / `{direction}` / `{description}` / `{text}` / names / kinds | `{verbatim:x}` | ADR-200 — non-entity scalars |
| bare `{score}` / `{turn}` / numbers | bare `{x}` | parser lifts number → Literal |
| bare `{item}` (entity) | review → usually `{the item}` | ~25 sites, case-by-case |
| perspective `{You}`/`{your}`/`{take}`/… | untouched | resolved before parse |

**Producer side (W5)**: entity params `entityInfoFrom(e)` → `nounPhraseFor(e[, ctx])`
(236 sites). Scalar params stay raw strings (the `{verbatim:x}` template lifts them).

**Pipeline switch**: prose-pipeline handlers (`domain-message`, `generic`,
`game-message`, `audibility`) move from `getMessage` → `renderMessage(messageId,
params, makeRenderContext(params))` once enough is migrated. ADR-192 forbids a dual
path, so the switch is atomic; the on-branch build/tests are red through the window.

---

## Original analysis (for the record)

## What the scan found (lang-en-us templates)

Formatter `:`-chain placeholders (mechanical to rewrite): **522 occurrences**
- `{the:…}` ×457 (includes `{the:cap:…}`), `{is:…}` ×52, `{list:…}` ×5,
  `{has:…}` ×5, `{a:…}` ×2, `{name:…}` ×1.

Bare `{x}` placeholders (no colon): **1072 occurrences**, three classes:
1. **Perspective** (`{You}` ×342, `{you}`, `{Your}`, `{your}`, and conjugating
   verb words `{take}`/`{see}`/`{have}`/…): resolved by
   `resolvePerspectivePlaceholders` BEFORE parse — **not a problem**.
2. **Entity** (`{item}` ×25, `{container}`, `{npc}`, `{target}`, `{door}`,
   `{actor}`, …).
3. **Non-entity scalars**: names (`{npcName}` ×48, `{saveName}`, `{title}`,
   `{speakerName}`, `{listenerName}`, `{author}`, `{storyTitle}`), `{direction}`
   ×18, free text (`{description}` ×17, `{text}` ×13, `{topic}`, `{content}`),
   `{kind}`, `{actionId}`, and numbers (`{turn}`, `{score}`, `{maxScore}`, …).

## The fork

**Old** bare `{x}` (formatters/registry.ts:150-160):
- string → the string verbatim; number/boolean → `String(value)`;
  **EntityInfo → `value.name` (name only, NO article)**.

**New** parser (`parsePhraseTemplate` / `bindNounPhrase`, ADR-192 §5):
- bare `{x}` → `NounPhrase` `articleType:'indefinite'` → **"a x"**;
  number/boolean → Literal (OK); string → `NounPhrase` indefinite → **"a string"**.

So under the new parser **every bare placeholder changes meaning**:
- `{npcName}` "Aragorn" → "a Aragorn" (broken).
- `{direction}` "north" → "a north" (broken).
- entity `{item}` "lamp" → "a lamp" (was "lamp").

Non-entity scalars have **no verbatim path** today: the reserved `Verbatim`
atom (`{verbatim:x}`) is an unimplemented stub that throws.

## Options

### A. Bare `{x}` = no-article (name / verbatim); articles are opt-in (RECOMMENDED)
Change `bindNounPhrase` so a **hint-less** placeholder renders verbatim:
- string/number → `Literal(String(value))`;
- `NounPhrase` value → force `articleType:'none'` (name + adjectives, no article);
- `{a x}` / `{an x}` / `{the x}` / `{some x}` / `{capitalize …}` opt INTO articles.

Pros: matches the old corpus semantics → migration becomes **mostly mechanical**
(`:`-chains rewrite; bare `{x}` largely unchanged and "just works"); no Verbatim
atom needed; scalars and bare entities both handled by one rule.
Cons: **amends ADR-192 §5** ("bare default → indefinite NounPhrase") and flips the
existing parser test (`{item}` → indefinite). Requires an ADR-192 amendment note.

### B. Keep ADR-192 §5 (bare = indefinite); add a verbatim construct
Implement the `Verbatim` atom (`{verbatim:x}` → Literal of the value) and rewrite
every non-entity scalar placeholder to `{verbatim:x}`; rewrite bare entity `{x}`
that wants name-only to an explicit form.
Pros: keeps ADR-192 §5 as written.
Cons: ~150+ scalar edits to `{verbatim:x}`; per-bare-entity judgment ("a lamp" vs
"lamp"); implements an out-of-scope atom anyway; far more churn and risk.

### C. Producers wrap scalars as Literal/proper NounPhrase
Leave the parser; change the dozens of producer call sites (npc/conversation/
save/score systems) to pass `Literal`/proper-`NounPhrase` values.
Cons: spreads the change across many packages; most invasive.

## Recommendation

**Option A.** It aligns the new bare-`{x}` default with the established corpus
semantics, makes the bulk genuinely mechanical, needs no new atom, and is a clean
one-line amendment to ADR-192 §5 (bare = unmarked/no-article; articles are an
explicit hint). Verbatim stays reserved for a genuine "exempt from whitespace
collapse" need later.
