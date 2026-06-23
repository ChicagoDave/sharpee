# Session Summary: 2026-06-23 - fix/platform-issues-book-qa (CST)

## Goals
- Implement #159: opt-in NPC movement announcements (per-sense rendering model, ADR-069/070 amendments)
- Resolve #162: ambience channel stale-mood (document-fix, not a platform defect)
- Close all 5 platform-defect issues from the 2026-06-23 book execution-log triage

## Phase Context
- **Plan**: No active plan for this branch — work driven by GitHub triage list
- **Phase executed**: N/A — continuation session, no formal phase
- **Tool calls used**: unknown
- **Phase outcome**: N/A

## Completed

### #159 — Opt-in NPC movement announcements (commit 8a7609cd)
Implemented per-sense rendering model per `docs/work/book-qa-platform-issues/plan-159-npc-movement-announce.md` and ADR-069/070 amendments.
- `packages/if-services/src/perception-service.ts` — new shared wire-types `Rendering`, `PerSenseRenderings`, `SENSE_PRECEDENCE`; generic rendering-selection branch in `filterEvents` (selects `renderings[sense]` by precedence; empty `{}` → perception-blocked; absent → pass-through)
- `packages/world-model/src/traits/npc/npcTrait.ts` — `announcesMovement` flag (default false) + `movementMessages` per-NPC override map
- `packages/stdlib/src/npc/npc-service.ts` — threaded `playerLocation` through executeActions/executeAction/executeMove/executeMoveTo; new `announceMovement` helper emits `npc.moved.witnessed` with per-sense renderings (sight + hearing); imports `getOppositeDirection`
- `packages/stdlib/src/npc/npc-messages.ts` — `NPC_HEARD_ARRIVES`/`NPC_HEARD_DEPARTS`
- `packages/lang-en-us/src/npc/npc.ts` — `npc.heard_arrives`/`npc.heard_departs` templates
- `packages/stdlib/vitest.config.ts` — added `@sharpee/if-services` → src alias (matching engine's config)
- Tests: 7 new npc-service movement tests (includes world-state mutation assertion) + 7 new perception-service rendering-selection tests; all pass

### #162 — Ambience channel stale-mood (commit 4f769b75)
Determined NOT a platform defect — sparse/replace channel's `produce → undefined` means "no change" by design; prior room's mood line lingered because the book's §24.6 example mis-taught `undefined` as the way to clear.
- `docs/book/parts/part-7/24-channels.md` — example returns `''` for unmapped rooms; added prose explaining `undefined` (no-change) vs `''` (clear)
- `tutorials/familyzoo/src/ch24-27-presentation/presentation.ts` — same `?? ''` fix with explanatory comment (defensive; all 7 tutorial rooms are mapped so it never triggered there)

### GitHub issue closure
Closed #154, #155, #158, #159, #162 — each with a note referencing its fix commit. All 5 platform-defect issues from the execution-log triage are closed.

## Key Decisions

### 1. Shared wire-types in `@sharpee/if-services`, not `@sharpee/core`
Plan §3.0 originally stated `Rendering`/`PerSenseRenderings` would go in `@sharpee/core`. `Sense` already lives in `@sharpee/if-services`, and ADR-069's own tech-debt note placed these perception types there. Placing the new types alongside `Sense` avoids splitting the perception vocabulary across two packages. The plan doc was updated to reflect the final location; the ADR is already consistent.

### 2. #162 resolved as documentation fix, no platform change
The channel system works correctly. A code change would have required altering the semantics of `produce → undefined`, which is the correct "no-change" sentinel. Fixing the book example and tutorial defensive code is the right scope.

## Next Phase
- **No active plan on this branch.**
- Remaining open items: 6 documentation-only issues (#152, #153, #156, #157, #160, #161 — book-text). These are separate from the platform defects and require no code changes.

## Open Items

### Short Term
- 6 book-text documentation issues (#152, #153, #156, #157, #160, #161) remain open — editorial work, not platform defects

### Long Term
- End-to-end transcript test for #159 deferred: no story NPC currently uses `announcesMovement: true`; a story-level NPC exercise would complete the acceptance gate

## Files Modified

**if-services** (1 file):
- `packages/if-services/src/perception-service.ts` — new wire-types `Rendering`, `PerSenseRenderings`, `SENSE_PRECEDENCE`; generic rendering-selection branch in `filterEvents`

**world-model** (1 file):
- `packages/world-model/src/traits/npc/npcTrait.ts` — `announcesMovement` + `movementMessages` fields

**stdlib** (3 files):
- `packages/stdlib/src/npc/npc-service.ts` — `playerLocation` threading, `announceMovement` helper
- `packages/stdlib/src/npc/npc-messages.ts` — two new message constants
- `packages/stdlib/vitest.config.ts` — `@sharpee/if-services` src alias

**lang-en-us** (1 file):
- `packages/lang-en-us/src/npc/npc.ts` — two heard-movement templates

**book / tutorial** (2 files):
- `docs/book/parts/part-7/24-channels.md` — §24.6 example and `undefined` vs `''` prose
- `tutorials/familyzoo/src/ch24-27-presentation/presentation.ts` — `?? ''` defensive fix

## Notes

**Session duration**: ~3 hours (continuation of 1620 session)

**Approach**: Feature implementation (#159) followed by investigation-and-documentation (#162); issue closure as final step.

**Continuation session**: Prior session file is `docs/context/session-20260623-1620-fix-platform-issues-book-qa.md`.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (3 new commits on branch, not yet merged to main)

## Dependency/Prerequisite Check

- **Prerequisites met**: `Sense` type in `@sharpee/if-services`; `getOppositeDirection` helper in stdlib; `announcesMovement` plan approved in prior session
- **Prerequisites discovered**: None

## Architectural Decisions

- ADR-069 (perception rendering model) and ADR-070 (NPC event emission) amended this session to reflect final shared wire-type location in `@sharpee/if-services`
- Pattern applied: per-sense rendering selection via `SENSE_PRECEDENCE` in `PerceptionService.filterEvents` — renderings map is emitter-owned; sense selection is perception-layer-owned

## Mutation Audit

- Files with state-changing logic modified: `npc-service.ts` (`announceMovement` emits event + mutates implicit game state via `npc.moved.witnessed`)
- Tests verify actual state mutations (not just events): YES — npc-service tests assert on world-state after movement (position change + announced flag path)

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 14 (7 npc-service movement + 7 perception-service rendering-selection)
- Tests passing before → after: stdlib 1176 → 1190; world-model 47 → 47; lang-en-us 224 → 224
- Known untested areas: end-to-end transcript for `announcesMovement: true` NPC (deferred — no story NPC uses the flag yet)

---

**Progressive update**: Session completed 2026-06-23 19:27 CST
