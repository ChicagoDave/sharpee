# Session Summary: 2026-09-01 - feat/adr-321-world-index

## Goals
- Work through the five open questions in `docs/work/secret-letter-port/rewrite-pattern.md` §7 with David, one at a time, and record each ruling.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — Phase 7, "Prove the quip-tree to beat-thread rewrite pattern, including per-NPC perception" (P-6a).
- **Phase executed**: Phase 7 (no status change this session — stays CURRENT; this was an open-questions resolution pass within the phase, not its close).
- **Tool calls used**: not tracked in `.session-state-f2553d.json` (`files` array empty — edits made via Bash/python, per the session brief).
- **Phase outcome**: Partially completed — all five open questions ruled; the demonstration conversion (Sandler + Bobby) that the rulings unblock has not started.

## Completed

### Open questions OQ-1 through OQ-5 ruled
- OQ-1: the demonstration = Dame Sandler's first occasion + Bobby's alley conversation, together.
- OQ-2: build the demonstration to the 2009 source's defaults now (standing 2026-08-30 ruling); re-check at the Chapter 2 change-document pass.
- OQ-3: §4's perception mechanism (P1 authored perception / P2 conditioned presentation / P3 marker deferred) confirmed standing for Phase 8; §4 given a STANDING status line.
- OQ-4: Teisha's `define topics` block and the shared ST stallkeeper tree rebuild in Phase 8, first up (David is play-testing them in Phase 6's tail).
- OQ-5: bare answers while an exchange is open, with `say X`/`answer X` as explicit synonyms; filed as GH #346; interim is `ask X about <answer>`.
- `docs/work/secret-letter-port/rewrite-pattern.md` status line flipped DRAFT → RULED.

### David's "set per NPC" framing (new §4a)
- Recorded: the unit of work is the NPC's *set* of conversations; Jack and the NPC float within it — mapped to ADR-320 D14's park/resume-under-thread-strength machinery, verified live against `packages/stdlib/src/actions/helpers/dialogue-selector.ts`. Some sets carry information (concluding threads as state); multi-participant scenes are coming (see below).

### Two platform seams verified and filed
- **Answer-surface seam** (§6, GH #346): re-verified live — `node dist/cli/sharpee.js --exec "yes/no/say yes/answer yes/say hello to kemp" --story branch-stories/ides-of-march/ides-of-march.story` returned "I don't understand that." for all five. ADR-320's Implementation note ("ASK/TELL/SAY/YES/NO already exist") is stale: `packages/lang-en-us/src/actions/answering.ts` plus `constants.ts:87 if.action.answering` are an orphaned surface — no stdlib action directory, no grammar line.
- **Multi-participant scenes seam** (§6, new this session, GH #347): verified every `openScene` call builds a pair (`dialogue-selector.ts:278`, `story-loader/src/runtime.ts:1894`); a participant sits in at most one live scene (`conversation-scene-store.ts:15`); thread status is per pair; at most one open exchange per scene (`runtime.ts:1760`); the selector's own comment says no current path produces a multi-party scene (`dialogue-selector.ts:160-164`). ADR-320 D10 designs the floor for this but nothing builds it, and D14 lists NPC-to-NPC threads as not in v1. David: "we will need multi-NPC conversations" — filed as GH #347 with the source ball's six co-located ballgoer trees (JE/PR/IN/AM/BR/GR) and the "Brief respite ends when every ballgoer in the Ballroom is spoken to" gate (`story.ni:11155`) as the concrete need. Needs an ADR-320 amendment or a companion ADR for the Chord surface and join rules; Phase 8's ball conversions depend on it. The Phase 7 demonstration (one-on-one) is unaffected.

### Plan progress note
- `docs/work/secret-letter-port/plan.md` Phase 7 got a "Progress 2026-09-01 (session f2553d)" note covering the rulings and both filed issues.

## Key Decisions

### 1. All five rewrite-pattern open questions (David)
OQ-1..OQ-5 above — demonstration scope, build-to-defaults timing, perception mechanism standing, Teisha/ST rebuild sequencing, and the bare-answer interim. These unblock the demonstration conversion but no code was written against them yet.

### 2. Multi-NPC conversations are a required capability (David, 2026-09-01)
Not optional scope-creep — the source ball scene requires it. Filed as GH #347; D10's floor/reaction design stands but the Chord authoring surface and join rules are undesigned. Recorded rather than built, per rule 4a (platform changes need discussion) — filing an issue is the correct next step, not an inline platform edit.

## Next Phase
- **Phase 7 continues** (no phase advance this session): next concrete step is the demonstration conversion itself — lay out Dame Sandler's tree quip by quip for David to rule on her set, then Bobby's, then build both against the ruled pattern.
- **Tier**: unchanged from the phase's existing budget (plan.md, not restated here).
- **Entry state**: all five OQ rulings on record; GH #346 and #347 filed as platform-session dependencies for Phase 8's ball work, not blockers for the Phase 7 demonstration.

## Open Items

### Short Term
- Demonstration conversion: Dame Sandler's tree first (David rules her set), then Bobby's, then build.
- Unclaimed-input fallback authorability — the one remaining probe from the prior session's §6, deferred to run during the demonstration build.

### Long Term
- GH #346 (answer-surface seam) — platform session; wires `say`/`answer` synonyms and bare-answer handling into an open exchange.
- GH #347 (multi-NPC conversations) — platform session; needs an ADR-320 amendment or companion ADR before Phase 8's ball conversions can proceed.

## Files Modified

**Documentation** (3 files):
- `docs/work/secret-letter-port/rewrite-pattern.md` - OQ-1..OQ-5 rulings, new §4a ("set per NPC" framing), §6 seam additions (GH #346 re-verified, GH #347 added), status DRAFT → RULED
- `docs/work/secret-letter-port/plan.md` - Phase 7 "Progress 2026-09-01 (session f2553d)" note
- `.devarch/descriptor.json` - version 7.2.0 → 8.0.0 (pre-existing uncommitted devarch-update side effect, included in this session's commit)

## Notes

**Session duration**: single working pass, 2026-09-01 (session f2553d), continuing from session bfb2ce (2026-08-31).

**Approach**: sequential one-at-a-time question resolution with David per rule discipline (no batching); each ruling and each platform seam verified live against the bundle or source before being recorded, not asserted from memory.

**Docs-only session**: no `.chord`/`.ts` touched, no builds or tests run. Tree last green at 562 cards / 953 assertions (2026-08-31), unchanged.

---

## Session Metadata

- **Session**: f2553d
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Status is COMPLETE — the demonstration conversion is the next session's work, not this one's incomplete tail)
- **Rollback Safety**: safe to revert — documentation only

## Dependency/Prerequisite Check

- **Prerequisites met**: the ruled rewrite pattern (§1-§6, status RULED), the standing 2026-08-30 build-to-defaults ruling (OQ-2), the shipped ADR-320 park/resume machinery (verified in `dialogue-selector.ts`), the live bundle for seam verification (`dist/cli/sharpee.js`, `branch-stories/ides-of-march/ides-of-march.story`).
- **Prerequisites discovered**: none new for Phase 7 itself; two platform dependencies discovered for **Phase 8** (GH #346, GH #347) — both filed, neither blocking this phase's demonstration work.

## Architectural Decisions

- None written this session. ADR-320 D10 and D14 were read and cited (not amended) as the basis for GH #347's filing — an ADR-320 amendment or companion ADR is flagged as needed but deferred to the platform session that picks up #347.
- Pattern applied: rule 4a (platform changes need discussion first) — both seams were verified and filed as GitHub issues rather than fixed inline, since `dialogue-selector.ts`, `conversation-scene-store.ts`, and `runtime.ts` are all `packages/` code.

## Mutation Audit

- Files with state-changing logic modified: none — documentation only.
- Tests verify actual state mutations: N/A (no code changed this session; tree last green at 562 cards / 953 assertions, 2026-08-31, unchanged and unexercised this session).

## Recurrence Check

- Similar to past issue? YES — same class as the prior session's self-flagged pattern, but not a recurrence of it: session bfb2ce (2026-08-31) caught "generalizing a pragmatic interim into design intent" before it shipped; that specific pattern did not recur this session. A related-but-distinct pattern surfaced instead: an ADR's Implementation note claiming a surface "already exists" (ADR-320 on SAY/YES/NO) that a live bundle probe disproved. Same family — trusting a written claim over verification — different instance. Caught by the core-concepts "cite a file you read" discipline rather than by feedback recall.
- If YES: no broader audit warranted yet — two occurrences across two sessions, both caught before they propagated. Worth a light watch if a third instance appears.

## Test Coverage Delta

- Tests added: none (no code changed).
- Tests passing before: 562 cards / 953 assertions → after: 562 cards / 953 assertions, unchanged (evidence: 2026-08-31 run, no code edited since; [reported by session, unverified] — no fresh run was performed this session to re-confirm).
- Known untested areas: N/A — no code surface touched this session.

---

**Progressive update**: Session completed 2026-09-01
