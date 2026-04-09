---
name: adr-review
description: Review an ADR for completeness before implementation. Catches underspecified contracts, missing test requirements, and language layer violations.
user_invocable: true
---

Review an Architecture Decision Record for implementation readiness. This skill applies Sharpee-specific architectural knowledge to catch the gaps that cause bugs — underspecified update contracts, missing end-to-end test requirements, language layer violations, and incomplete acceptance criteria.

## Usage

```
/adr-review 143
/adr-review adr-143-naval-compass-directions
/adr-review docs/architecture/adrs/adr-143-naval-compass-directions.md
```

## Process

1. **Find the ADR.** Accept a number, partial name, or full path. Search `docs/architecture/adrs/` for a match.

2. **Read the ADR** and the CLAUDE.md architecture principles (especially Language Layer Separation, Logic Location, and Always Trust the Architecture).

3. **Run the checklist** below against the ADR. For each item, report PASS, FAIL, or N/A with a one-line explanation.

4. **Read the implementation** (if any) — check the packages named in the ADR's Implementation section. Verify the code matches what the ADR specifies.

5. **Present the report** in the format below.

## Checklist

### Architecture Compliance

- [ ] **Language layer separation.** Does any package other than `lang-{locale}` or `parser-{locale}` define user-facing text? Check for English strings in world-model, engine, stdlib, or character. Message IDs are fine; prose is not. (Exception: `fallbackDisplay` fields with explicit fallback documentation.)
- [ ] **Logic location.** Is logic placed in the correct layer per the CLAUDE.md table? Engine for turn cycle/dispatch, world-model for traits/behaviors, stdlib for standard actions, parser for grammar, lang for text, story for game-specific content.
- [ ] **Capability dispatch vs. actions vs. events.** If the ADR introduces new verbs or entity behaviors, does it follow the pattern decision tree in CLAUDE.md? Standard-semantics verbs use stdlib actions + traits. No-standard-semantics verbs use capability dispatch. New verbs use story actions. Reactions use event handlers.

### Contract Completeness

- [ ] **All affected packages named.** Does the Implementation section list every package that needs changes? Check for transitive impacts — if world-model adds a new trait, does the ADR also cover stdlib (actions that check the trait), parser (grammar for new verbs), and lang (messages)?
- [ ] **Update contracts specified.** For multi-step operations (like vocabulary swaps, state transitions, plugin registration), does the ADR name every step and state that they must be performed atomically? A missing step in a multi-step update is the most common source of silent failures.
- [ ] **Interface contracts specified.** Does the ADR define the TypeScript interfaces, method signatures, or event payloads it introduces? Vague descriptions like "the parser updates" are insufficient — specify what method is called with what arguments.
- [ ] **Boundary contracts specified.** If the feature crosses package boundaries (world-model → parser, engine → stdlib), does the ADR define the contract at each boundary? Who calls whom, with what data, and when?

### Test Requirements

- [ ] **End-to-end test specified.** Does the ADR include at least one concrete end-to-end scenario that exercises the full pipeline? "Test that the mapping works" is insufficient. "Call `useVocabulary('naval')`, then `parse('aft')`, assert the result contains `direction: Direction.NORTH`" is sufficient.
- [ ] **Boundary tests specified.** If the feature has vocabulary boundaries, state transitions, or mode switches, does the ADR specify tests for the transition points?
- [ ] **Negative tests specified.** Does the ADR specify what should happen when things go wrong? Invalid input, missing configuration, partial updates?

### Acceptance Criteria

- [ ] **Explicit acceptance criteria.** Does the ADR have a section (or equivalent) that lists concrete, verifiable conditions for "this is done"? If the Implementation section is the only guide, it's underspecified — implementation describes work, not completion.
- [ ] **Save/restore implications.** If the feature adds new state, does the ADR address serialization? State that persists across save/restore needs to be included in the save format.
- [ ] **Backward compatibility.** If the feature changes existing interfaces, does the ADR address what happens to existing stories? Breaking changes need migration guidance.

### Open Questions

- [ ] **No unresolved blockers.** Are all open questions either resolved or explicitly marked as non-blocking for implementation? An ADR with unresolved questions that affect the implementation contract is not ready.

## Report Format

```
ADR Review: ADR-{number} — {title}
Status: {current status}
════════════════════════════════════

Architecture Compliance
  Language layer separation:     {PASS|FAIL} — {explanation}
  Logic location:                {PASS|FAIL|N/A} — {explanation}
  Capability dispatch:           {PASS|FAIL|N/A} — {explanation}

Contract Completeness
  All affected packages named:   {PASS|FAIL} — {explanation}
  Update contracts specified:    {PASS|FAIL|N/A} — {explanation}
  Interface contracts specified: {PASS|FAIL} — {explanation}
  Boundary contracts specified:  {PASS|FAIL|N/A} — {explanation}

Test Requirements
  End-to-end test specified:     {PASS|FAIL} — {explanation}
  Boundary tests specified:      {PASS|FAIL|N/A} — {explanation}
  Negative tests specified:      {PASS|FAIL|N/A} — {explanation}

Acceptance Criteria
  Explicit acceptance criteria:  {PASS|FAIL} — {explanation}
  Save/restore implications:     {PASS|FAIL|N/A} — {explanation}
  Backward compatibility:        {PASS|FAIL|N/A} — {explanation}

Open Questions
  No unresolved blockers:        {PASS|FAIL} — {explanation}

────────────────────────────────────
Score: {pass count}/{total checked}
Verdict: {READY FOR IMPLEMENTATION | NEEDS WORK | BLOCKED}

{If NEEDS WORK or BLOCKED, list the specific items to address.}
```

## Implementation Audit (Optional)

If the ADR status is not DRAFT, also check the implementation:

1. **Read the code** in each package named in the Implementation section.
2. **Compare code to ADR contracts.** Flag any contract the ADR specifies that the code doesn't implement.
3. **Check for hardcoded values** that should be dynamic (like the compass direction list that should have been driven by the vocabulary registry).
4. **Check for missing steps** in multi-step operations (like the tokenizer registry update that was omitted from `setDirectionVocabulary`).
5. **Append to the report:**

```
Implementation Audit
  {package}: {MATCHES|DIVERGES} — {explanation}
  ...
  Missing: {list any ADR requirements not found in code}
  Extra: {list any code patterns not covered by the ADR}
```

## Context: Why This Exists

ADR-143 (Direction Vocabularies) was implemented without this review. The ADR didn't specify the tokenizer registry update contract, didn't require end-to-end tests, and didn't flag the language layer violation. The implementation shipped two silent failures that only surfaced when a collaborator tried to use naval directions. This skill exists to catch those gaps before code is written.
