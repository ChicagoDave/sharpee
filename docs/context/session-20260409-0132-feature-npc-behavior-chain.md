# Session Summary: 2026-04-08 - feature/npc-behavior-chain (CST)

## Goals
- Review and merge PR #72 from collaborator Johnesco (interceptor onBlocked support)
- Write direction vocabularies author guide
- Add NPC behavior chain patterns to website patterns.json
- Research Sharpee vs TADS/Inform differentiators
- Write ADR-147: Equivalent Objects and Groups

## Phase Context
- **Plan**: No active plan for this session — all prior plan phases are DONE; this session addressed independent authoring tasks and design work
- **Phase executed**: N/A — documentation, ADR, and website content session
- **Tool calls used**: 644 (carried from prior session state)
- **Phase outcome**: N/A

## Completed

### PR #72 Review and Merge
- Reviewed interceptor `onBlocked` support added to `opening` and `closing` actions by collaborator Johnesco
- Verified pattern matches reference implementations in `attacking` and `pushing` actions
- Approved and merged to main

### Direction Vocabularies Author Guide
- New guide: `docs/guides/direction-vocabularies.md`
- Covers built-in vocabularies (compass, naval, minimal), switching vocabularies, custom vocabularies, renaming directions, and aliases
- Committed and pushed directly to main

### NPC Behavior Chain Patterns in Website
- Added 5 new NPC patterns to `website/src/data/patterns.json`:
  - Gossip Network
  - Goal-Directed
  - Influencer
  - NPC Initiative
  - Psychology/Inner State
- Added 5 new Conversation patterns:
  - Constraint-Based Responses
  - Confrontation/Evidence
  - Response Intent
  - Persistent Conversation
  - Eavesdropping
- Added ~29 new edges connecting these patterns to existing nodes
- Derived from ADR-141, 142, 144, 145, 146

### Sharpee vs TADS/Inform Differentiators
- Researched 9 capabilities Sharpee has at platform level that neither TADS 3 nor Inform 7 provide without building from scratch:
  1. Character psychology (emotional/motivational state as typed trait)
  2. Information propagation with provenance (who told whom what, and when)
  3. NPC influence (NPCs can influence player and each other)
  4. Constraint-based conversation with contradiction detection
  5. Direction vocabulary swapping (compass/naval/minimal, runtime-switchable)
  6. Language separation (engine emits events; text lives in lang packages)
  7. Multi-client architecture (same story, browser/CLI/Zifmia clients)
  8. NPC goal pursuit with witnessed steps
  9. NPC initiative (NPCs can initiate conversation and action)
- This analysis supports marketing and positioning for the Forge authoring tool

### ADR-147: Equivalent Objects and Groups
- New ADR: `docs/architecture/adrs/adr-147-equivalent-objects-and-groups.md`
- Addresses the "bag of coins" / stackable item problem
- Key design decisions documented:
  - `equivalenceGroup` flag on `IdentityTrait` (real entities, not virtual quantities)
  - Parser silent resolution for equivalent objects (no "which coin?" disambiguation)
  - Numeric noun phrases: digits and word forms ("6 coins", "six coins")
  - Listing groups in room descriptions and inventory
  - Multi-location scenarios (5 on table, 5 in bag, 17 in pocket — broken down by location)
  - Move-from-to commands for specific subset transfers
  - Compound giving: "pay clerk 6 gold and 1 silver"
  - Sell/trade/barter resolve to same mechanic (left side to NPC, right side to player)
  - Arrow consumption: silent implicit take via `requireCarriedOrImplicitTake({ silent: true })`
- Added OBJ-016 (Equivalent/Stackable) pattern to `patterns.json`

## Key Decisions

### 1. Equivalent Objects Use Real Entities
The ADR rejects virtual quantity tracking in favor of real `IFEntity` instances with an `equivalenceGroup` field on `IdentityTrait`. This preserves all existing world-model invariants (location tracking, containment, event system) and avoids a separate quantity subsystem.

### 2. Silent Implicit Take Extension
Arrow consumption and similar auto-use patterns extend `requireCarriedOrImplicitTake()` with a `{ silent: true }` option rather than special-casing in action logic. This keeps the action layer clean.

### 3. Trade/Sell/Barter Unified Mechanic
All exchange verbs (sell, trade, barter, give X for Y) resolve to the same underlying mechanic: left side moves to NPC, right side moves to player. The grammar layer handles the surface differences; the action layer is unified.

### 4. NPC Patterns Belong in the Website Catalog
The IF design patterns website is the right home for patterns derived from ADRs — it makes the design accessible to authors without requiring them to read implementation documents.

## Next Phase
- Plan complete — all phases done.
- The `feature/npc-behavior-chain` branch still needs to be merged to main (separate from today's work).
- ADR-147 implementation (equivalent objects) is a future platform phase.

## Open Items

### Short Term
- Merge `feature/npc-behavior-chain` branch to main
- Stage ADR-147 implementation as a formal plan phase when ready to implement

### Long Term
- Equivalent objects implementation (ADR-147) — requires world-model changes (IdentityTrait), parser changes (numeric noun phrases, silent resolution), stdlib changes (listing groups, implicit take extension)
- Forge authoring tool — the differentiator research feeds into Forge positioning

## Files Modified

**Documentation** (2 files):
- `docs/guides/direction-vocabularies.md` — New author guide for direction vocabulary system (committed to main)
- `docs/architecture/adrs/adr-147-equivalent-objects-and-groups.md` — New ADR for equivalent/stackable objects

**Website** (1 file):
- `website/src/data/patterns.json` — 11 new pattern nodes (5 NPC, 5 Conversation, 1 Object), ~35 new edges

## Notes

**Session duration**: ~4 hours

**Approach**: Mixed session — code review/merge, documentation authoring, design research, ADR writing. No platform or story code changes.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-141, 142, 144, 145, 146 (NPC behavior chain ADRs) available for pattern derivation; PR #72 branch available for review
- **Prerequisites discovered**: None

## Architectural Decisions

- [ADR-147]: Equivalent Objects and Groups — use real IFEntity instances with equivalenceGroup on IdentityTrait; parser does silent resolution; numeric noun phrases supported; unified exchange mechanic for trade/sell/barter

## Mutation Audit

- Files with state-changing logic modified: None (no platform or story code changed this session)
- Tests verify actual state mutations (not just events): N/A

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- No test changes this session

---

**Progressive update**: Session completed 2026-04-08 01:32 CST
