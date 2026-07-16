# Work Summary — Interceptor Lifecycle Engine (ADR-228), Phases 1-5

**Date:** 2026-07-16
**Branch:** chord-foundations
**Target:** `docs/work/interceptor-lifecycle-engine/` (ADR-228)
**Plan:** `docs/work/interceptor-lifecycle-engine/plan.md`
**Session:** `docs/context/session-20260716-1330-chord-foundations.md` (full chronological record, decisions Q&A, flags for David)

## Goal

Replace ADR-118's hand-copied interceptor lifecycle convention (14 drifted implementations,
19 silently-dead surfaces per the ADR-118 hook audit) with a single shared stdlib engine
plus per-action declarative descriptors, per ADR-228's rulings D0-D8.

## What was done

### ADR-228 + plan
David ruled on all D0-D8 forks from the audit (all recommendations accepted). ADR-228
written and accepted; a 7-phase implementation plan authored and plan-reviewed clean.

### Phase 1 — engine + D2 signature change + pinning tests
New `packages/stdlib/src/actions/lifecycle/` module: `descriptor.ts` (ActionLifecycleDescriptor,
EntitySlotSpec, LifecycleContracts), `lifecycle-engine.ts` (resolve → preValidate → postValidate
→ postExecute → postReport → onBlocked; veto-only guard semantics; first-veto-wins consultation
order; sharedData isolation per slot), `multi-object-lifecycle.ts` (D4 per-item lifecycle).
`ActionInterceptor.onBlocked` signature changed in world-model to structured
`{ override?, emit? } | null`. 14 stdlib call sites + 4 Dungeo interceptors (melee, glacier,
sphere-taking, gas-room) migrated. 19 new engine pinning tests + 8 new world-model tests.

### Phases 2-3 — all 14 wired actions migrated onto the engine
Group A (taking, dropping, eating, examining, reading, closing, opening) then group B
(entering, pushing, putting, switching_on, throwing, attacking, going) — zero hand-rolled
lifecycle code remains anywhere in stdlib (grep-verified). Fixed a **live trophy-case
scoring bug**: "put all in case" previously bypassed all 5 hooks on the multi-object path,
awarding no score; now runs the full D4 per-item lifecycle, proven by new
`stories/dungeo/tests/transcripts/trophy-case-put-all.transcript` (score 7 = egg 5 + canary 2).
D7 path-skip repairs folded in (going's dark-destination postReport ordering, throwing's
capability-then-hooks ordering, attacking's postExecute-replaces-combat as a declared
contract). Second-entity gaps closed (throwing's target+item both fire; attacking's weapon
slot consulted; going's door slot consulted).

Also fixed, on David's instruction: 22 pre-existing stale world-model darkness tests using
the removed `RoomTrait.isDark` field (renamed `requiresLight` in an earlier session) —
unrelated to this work but blocking a fully-green suite.

### Phases 4-5 — remaining 19 unwired actions declared, 33/33 coverage
Phase 4: drinking, pulling, touching, switching_off, searching, unlocking, locking, wearing,
taking_off (9 actions, 36 new tests). Phase 5: climbing, smelling, listening, hiding, giving,
showing, talking, removing, inserting, exiting (10 actions, 33 new tests). D6 delegation
seams closed: removing consults removing+taking ids (closes a TrollAxe REMOVE-FROM bypass);
inserting consults inserting then delegates into putting. Fixed a **live troll-talking bug**
end-to-end: `TrollTalkingInterceptor` now fires; discovered core grammar has no `talk to
:target` pattern at all (talking was player-unreachable in any story without custom
grammar) — added Dungeo-level grammar (`talk to`/`speak to` → if.action.talking), proven by
new `stories/dungeo/tests/transcripts/troll-talking.transcript`.

## Verification

- `pnpm --filter '@sharpee/stdlib' test`: 1455 passed (99 files)
- `pnpm --filter '@sharpee/world-model' test`: 1362 passed (73 files)
- `./repokit build dungeo`: green
- Dungeo walkthrough chain: 885/885, one good run

## Open questions for David (carried to Phase 6+)

1. taking_off's execute-phase ad-hoc refusals (checkRemovalBlockers/hasRemovalRestrictions) —
   fold into the interceptor surface, or leave as trait-driven execute checks? (Leaning leave.)
2. unlocking/locking: should KEY become a consultable slot?
3. **Platform gap**: parser-en-us core grammar has no `talk to :target` pattern reaching
   `if.action.talking` — every story needs its own grammar today. Needs discussion (per
   CLAUDE.md, platform changes to `packages/` require discussion first).
4. Dungeo's bespoke `talk_to_troll` story action is now redundant for 3 of its phrasings
   (the interceptor covers the alive-troll passthrough too, but the story action's
   alive-troll GROWLS flavor text is unique) — consolidation is a canon decision, not touched.

## Status

Phases 1-5 of 7 COMPLETE. Phase 6 (D5 registry export + Chord loader fail-fast) and Phase 7
remain. See plan.md for full phase-by-phase detail and the session file for the
decision-by-decision record.
