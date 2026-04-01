# Session Summary: 2026-03-29 - adr-136-context-actions / main

## Goals
- Review Snuux's GitHub reply on Issue #63 (GUI support / context action menus)
- Research community perspectives on parser-game GUI approaches
- Decide disposition of ADR-136 based on findings
- Write second architecture document (engine turn cycle and output pipeline)

**Session started**: 2026-03-29 10:33

## Phase Context
- **Plan**: No active plan — this was a focused review and documentation session
- **Phase executed**: N/A
- **Phase outcome**: All goals completed; session ended with ADR deferred and new architecture doc merged to main

## Completed

### Reviewed Snuux's Reply on GitHub Issue #63
- Read Snuux's comment suggesting context-driven action grouping as the right approach
- Snuux shared link to intfiction.org thread on parser-game GUI approaches
- Surfed the thread and identified strong community validation for ADR-136's approach:
  - Legend Entertainment split-pane model (text + context-sensitive verb buttons)
  - "Clickable text that teaches" pattern — buttons reinforce parser vocabulary
  - Progressive disclosure — surface actions contextually rather than flooding the UI
- The community consensus aligned closely with the hybrid auto-compute approach proposed in ADR-136

### Deferred ADR-136
- David decided based on real-world experience (Textfyre) that context-driven action menus are a solution looking for a game and UX vision
- The feature is technically sound but has no active use case pulling it into production
- Updated ADR-136 status from "Proposed" to "Deferred"
- Added note in the ADR: implementation exists on branch `adr-136-context-actions` (all 7 phases complete), available for any project that brings a concrete use case
- Switched back to `main` branch; `adr-136-context-actions` left un-merged

### Wrote Second Architecture Document
- Created `docs/architecture/sharpee-engine-and-output-ghost.md` (953 lines, ~45 KB)
- Companion to the existing `sharpee-computer-science-ghost.md` (which covers data structures: world model, spatial index, parser, grammar)
- New document picks up where the first leaves off, tracing a command through:
  1. Input arrival and tokenization
  2. Parser and grammar matching
  3. Scope resolution
  4. Command dispatch to the engine turn cycle
  5. Four-phase action pattern (validate / execute / report / blocked)
  6. Capability dispatch (entity-centric, trait-gated)
  7. Event system and event handlers
  8. Text service pipeline
  9. Language layer: perspective system and formatters
  10. Bridge protocol
  11. Client rendering
- Walks through "take brass lantern" as a complete worked example (16 stages from keystroke to rendered text)
- Same CS-concept-first format as the first doc — no IF jargon, grounds every concept in familiar CS vocabulary
- Suitable for publication on Ghost alongside the first article

### v1.0.0 Discussion
- Brief conversation about readiness for Sharpee v1.0
- Consensus: platform is technically ready (engine, stdlib, world-model all solid)
- Prerequisite: playable games (Aspect of God, Reflections) must ship before launch
- Lantern checklist is the forcing function — no launch before it's done

## Key Decisions

### 1. ADR-136 Deferred
The implementation is complete and correct, but the Textfyre experience taught David that a feature this complex needs a game driving it. Without a concrete UX vision and a title that wants parser+GUI, the feature would sit unused. Deferring keeps it available without committing to maintenance burden.

### 2. Engine Document Format
Followed the established "CS-concept-first" pattern from the first architecture article. Readers encounter familiar terms (hash maps, event loops, strategy pattern) before IF-specific terms. This makes the docs useful for recruiting, onboarding, and general technical communication.

## Next Phase
No active plan. Next session will likely resume Dungeo dungeon implementation or begin Aspect of God scaffolding per the v1.0 discussion.

## Open Items

### Short Term
- ADR-136 branch (`adr-136-context-actions`) available but un-merged
- Ghost hero SVG for the new engine document not yet created (can reuse or commission separately)
- Second architecture doc not yet posted to Ghost — requires manual publish step

### Long Term
- v1.0 launch depends on Lantern checklist completion and at least one playable title
- Aspect of God and Reflections still need scaffolding

## Files Modified

**ADR** (1 file):
- `docs/architecture/adrs/adr-136-context-driven-action-menus.md` — status changed from Proposed to Deferred; added note about branch location

**Documentation** (1 file):
- `docs/architecture/sharpee-engine-and-output-ghost.md` — NEW, second architecture article (engine turn cycle, four-phase pattern, capability dispatch, event system, text service, language layer, bridge protocol, client rendering)

## Notes

**Session duration**: ~2 hours (CST morning)

**Approach**: Lightweight review-and-document session. No platform code written. The ADR deferral was the key decision; everything else was documentation output.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-136 branch complete (all 7 phases); community research available via intfiction.org thread
- **Prerequisites discovered**: None

## Architectural Decisions

- ADR-136 deferred — technology exists, needs a game use case to activate
- Engine/output architecture document establishes the canonical reference for how a command flows from input to rendered text

## Mutation Audit

- No state-changing code modified this session
- ADR change is documentation only

## Recurrence Check

- Similar to past issue? NO
- Deferring ADRs pending concrete use cases is a new pattern; previous ADRs were either accepted or rejected

## Test Coverage Delta

- No test changes this session

---

**Progressive update**: Session completed 2026-03-29
