# Dungeo phrase-cutover cleanup — scope for a future ADR

**Created**: 2026-06-27 (session 491b9c, branch merged to `main` as `a342e0c4`)
**Status**: DEFERRED — David's call (2026-06-27): "We can write an ADR to clean up
Dungeo later." The ADR-192 **platform** cutover is merged and green; this captures
the remaining **dungeo story** reconciliation so the future ADR/session starts scoped.

## Context

The ADR-192/199/200 phrase-algebra cutover replaced the lenient formatter chain
(which left unresolved `{placeholder}` literal) with a strict phrase parser. On the
platform side everything is green (3372 unit tests). On the **dungeo story** side,
the strict parser surfaced a long tail of issues. Deterministic dungeo unit
transcripts sit at ~1369/1481; the walkthrough chain is RNG-dominated
(thief/carousel/combat) and **not a usable signal** — use the unit transcripts.

## Already done this session (on `main`)
- **Article-absorption** across dungeo templates: `the {x}` → `{the x}`, `a {x}` →
  `{a x}` (~63 sites, `messages/*`, `combat/melee-messages.ts`).
- **`handleGameMessage` param fallback** (engine): story events that put bindings at
  the event-data top level (the common dungeo pattern) now bind, matching
  `handleGenericEvent`.
- **Verbatim for pass-through scalars**: GDT `{message}`/`{output}`, `{npcName}`,
  `{entityName}`, `{direction}`, `{destName}`, `{viaName}`. GDT now renders
  "Unknown GDT command: look" (was "an Unknown …").

## Remaining failure categories (the cleanup work)

1. **Pre-existing transcript-format errors (~33)** — NOT cutover-related. Transcripts
   missing `[OK:]`/`[SKIP]` assertions, the `[NOT: contains "x"]` syntax the tester
   doesn't parse, or missing title/story headers. Independent test-authoring cleanup.

2. **Expected-value mismatches (the bulk)** — the new output is *correct* but the
   transcript asserts the *old* formatter text. Examples: "onto the Volcano Bottom"
   (was "the a Volcano Bottom"), articled/grouped lists, "Taken.", proper room
   descriptions. **Work: go transcript-by-transcript, confirm the new output is right,
   update the assertion.** This is judgment, not a sweep.

3. **GDT-mode behavior (~30)** — GDT *renders* correctly now, but the tests fail
   because GDT mode captures the typed command ("look"/"e"/"w"/"pray" → "Unknown GDT
   command"). Pre-existing GDT input-capture behavior; decide whether GDT should pass
   real commands through or the transcripts should `EX` first.

4. **Basket elevator capability — blank output** (`raise/lower basket`). The one clear
   *rendering* bug left: the capability behavior's success message isn't reaching the
   phrase path (likely an unregistered messageId or a top-level-param emit). Targeted fix.

5. **Combat entities residue** — standalone bare `{villain}` (~20), `{weapon}` (~14),
   `{target}` in dungeo combat/melee render "a villain"/"a weapon". They need either
   `{the villain}` / `{capitalize the villain}` in the template **and** the combat
   producer binding `nounPhraseFor(entity)` (currently bound as name strings). Per the
   melee message set.

## Gotchas for the cleanup
- **Do NOT bulk-sed `{x}`** — dungeo action code uses JS template literals `${x}` that
  a naive `s/{x}/{verbatim:x}/` corrupts (hit dig/gdt action code this session;
  reverted). Distinguish message-template string literals from code interpolations.
- Numbers (`{turns}`, `{score}`, `{moves}`, `{num}`, `{maxScore}`, …) stay bare — the
  parser lifts them to `Literal`. Only string/name scalars need `{verbatim:x}`.
- Run the **unit transcripts** as the gate; run any walkthrough chain twice (RNG).

## Recommended ADR framing
A small "Dungeo phrase-grammar reconciliation" ADR: scope = categories 2–5 above
(category 1 is independent). Could pair an expected-value reconciliation pass
(transcript-by-transcript) with the two real fixes (basket capability, combat entity
binding). The GDT-mode decision is its own sub-item.
