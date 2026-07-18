# Session Summary: 2026-07-17 21:02 — chord-foundations (session f5c22c)

## Goals
- Open the chord-go-live effort from ADR-233: plan it, run the open-questions interview, start Phase 2 (parity audit re-run).

## Key decisions
- **David ruled the website restructure (ADR-232) + playground (ADR-191) OUT of the launch gate** — post-launch on their own schedules. G3 renamed "Launch tutorial"; former Q-4 resolved by this ruling.
- **ADR-233 interview (Q1–Q3)**:
  - Q-1 (doors) RESOLVED: child ADR designs BOTH forms in-gate — `a door between the Kitchen and the Hall` AND `north to the Hall through the oak door` (reverse side inferred). Invariant: door declaration identical across forms (`a door, lockable with the iron key`). `with key` dropped as redundant (ratchet entry, child ADR carries). General cross-room `between` primitive (windows/bridges) EXCLUDED — needs more thinking, own design conversation; door design must not foreclose it.
  - Q-2 (capability-dispatch verbs/extension surface) DEFERRED by ruling: decide AFTER Phase 2's refreshed audit delivers current numbers.
  - Q-3 (tutorial) RESOLVED: NOT a Family Zoo port — a bigger new story exercising as many complex IF logic patterns as practical. Pattern-first: catalog patterns → David selects → design story. Own plan.
- ADR-233 now DRAFT (1 open question: Q-2). ACCEPTED flip available once Q-2 is ruled.

## Work log
- Recap + pre-session audit: all clear (tsc clean, tree even with origin).
- session-planner wrote docs/work/chord-go-live/plan.md; plan-review caught 1 real contradiction (old U2 checklist's mode-detection item vs ADR-187 AC-3 — excluded from Phase 6) + 1 tension (ADR-191's own 4 open questions — now moot for the gate).
- Plan trimmed to 8 phases after David's website/playground ruling; Phase 1 (interview) COMPLETE; Phase 2 (audit re-run) CURRENT.
- **Phase 2 COMPLETE**: 7 parallel code-grounded investigators re-verified all four parts; refreshed audit rewritten (docs/work/stdlib-reference/chord-availability-audit.md). Headline: **54 player actions (grew from 49): 42 ✅ / 7 ⚠️ / 5 ❌**. Flips vs old audit: pushing/pulling ✅→❌ (catalog↔loader contract break — compile passes, load throws misleading error); lowering/raising ❌→✅ (`define action` shadowing path live); going/searching ✅→⚠️; attacking ❌→⚠️ (narrative combat authorable via `on attacking it`); hiding gap narrowed (grammar half done); locking caveat closed; new rows asking/telling (⚠️ no topic surface), turning (❌), cutting/digging (⚠️ SHARPEE-GAP: no bare-verb grammar).
- Part 2 new findings: presence gating (no story-global daemon surface at all); sequences can't be suspended; TS runOnce vs `, once` semantic delta. Part 3: NpcPlugin/StateMachinePlugin NEVER registered for Chord stories; behavior hatch (`define behavior from`) is dead code — boundBehaviors has no consumer (root of turning gap; 2 agents independently confirmed). Part 4: dotted event types unlexable (sharper than "no payload"); audibility channel missed by old audit; ADR-215/216 accepted but zero implementation; death-channel wire mismatch (message vs messageId); endgame-channel delivery doubtful (unverified).
- 7 defects/latents recorded in the audit's new "Defects & latent findings" table (D1-D7), surfaced per no-silent-gaps policy.

## Open items
- **Q-2 re-raised to David** (his deferral trigger fired: Phase 2 audit numbers now current) — capability-dispatch/extension surface in-gate vs post-launch. ADR-233 ACCEPTED flip available once ruled.
- Defects D1-D7 need David's disposition (fix now as ratchet/defect work vs fold into gate phases).
- Planner's side note: ADR-233 cites ADR-180 U2 without noting ADR-187 partially superseded that checklist — optional one-line amendment, David's call.
- Nothing committed yet this session (plan + ADR-233 amendments + this file uncommitted).
