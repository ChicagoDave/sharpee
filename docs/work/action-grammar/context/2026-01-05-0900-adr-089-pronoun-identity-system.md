# Work Summary: ADR-089 Pronoun and Identity System

**Date**: 2026-01-05 09:00
**Duration**: ~45 minutes
**Feature/Area**: Parser / World Model / Identity System
**Branch**: action-grammar

## Objective

Draft a comprehensive ADR for pronoun resolution and identity management that goes beyond simple "it" tracking to support inclusive design, multiple perspectives, and localization.

## What Was Accomplished

### ADR-089 Created

Comprehensive pronoun and identity system design covering:

**Three-part architecture:**
1. **IdentityTrait** (world-model) - Pronouns, honorifics, grammatical gender for entities
2. **NarrativeSettings** (engine) - Story perspective (1st/2nd/3rd person)
3. **PronounContext** (parser) - Runtime "it/them/him/her" tracking

**Key features:**
- `PronounSet` interface with subject/object/possessive/reflexive/verbForm
- Standard pronouns: he/him, she/her, they/them, it
- Neopronouns: xe/xem, ze/zir, ze/hir, ey/em, fae/faer
- Multiple pronoun sets support (he/they, she/they, any pronouns)
- Honorifics: Mr./Mrs./Ms./Mx./Dr./Prof.
- `verbForm` field for singular vs plural verb agreement
- Separation of `pronouns` from `grammaticalGender` for localization

**Narrative perspective:**
- Approved model: `StoryConfig.narrative.perspective`
- Default: 2nd person ("You take the lamp")
- Immutable after game start
- Only specify for 1st or 3rd person stories

**Localization considerations:**
- Languages with grammatical gender (French, German, Spanish)
- Languages without gendered pronouns (Finnish, Turkish)
- Neo-pronouns in other languages (French iel, Spanish elle, Swedish hen)

### Documentation

- Neopronoun reference table with example sentences
- Verb conjugation guidance (singular they uses plural verbs)
- NPC-to-NPC reference patterns
- 10 open questions with recommendations
- 6 testing considerations
- External references (GLAAD, Inform 7, etc.)

### Also Copied

- Copied `~/.claude/agents/work-summary-writer.md` to `docs/agents/` for version control

## Key Decisions

1. **Pronouns separate from gender**: `grammaticalGender` is for linguistic agreement in gendered languages, completely separate from personal pronouns/identity

2. **Multiple pronoun sets**: Array support for people who use he/they, she/they, or any pronouns - first in array is primary for parser

3. **Static perspective**: Story form (1st/2nd/3rd person) set in StoryConfig, immutable - no known IF changes this mid-game

4. **2nd person default**: Standard IF convention, authors only specify if doing something unusual

5. **verbForm field**: Handles "they are" vs "he is" correctly - singular they always uses plural verbs

## Files Created

- `docs/architecture/adrs/adr-089-pronoun-identity-system.md` - Full ADR
- `docs/agents/work-summary-writer.md` - Copy of custom agent config

## Implementation Phases (from ADR)

- Phase A: IdentityTrait (world-model) - additive, no breaks
- Phase B: PronounContext (parser) - enables "light it"
- Phase C: NarrativeSettings (engine) - infrastructure
- Phase D: Message placeholders (lang-en-us) - gradual migration
- Phase E: Verb conjugation - only for 3rd person stories

## Next Steps

1. [ ] Review ADR-089 for approval
2. [ ] Implement Phase A (IdentityTrait) when approved
3. [ ] Continue with Phase 1.1/1.3 of parser rec-plan (pronoun resolution, comma lists)
4. [ ] Consider merging action-grammar branch to main

## Notes

- This ADR originated from discussion about parser pronoun tracking ("it", "them")
- Expanded significantly to cover inclusive design, localization, and narrative perspective
- Design prioritizes defaults that require no author action for standard 2nd-person IF
- Neopronouns and multiple pronoun sets are opt-in complexity
