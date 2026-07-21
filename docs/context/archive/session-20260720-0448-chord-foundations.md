# Session Summary: 2026-07-20 04:48 UTC - chord-foundations (session e5911b)

## Goals
- Triage all 15 fixture-grounded platform issues recorded in `session-20260719-2147-chord-foundations.md` (session 7692ef) — get an explicit David ruling on each, with live code verification and reproduction where needed.
- Turn the rulings into an executable plan (no implementation this session).

## Phase Context
- **Plan**: `docs/work/platform-issue-sweep/plan.md` — "Fix the 13 confirmed-FIX platform defects surfaced by the stdlib-reference Phase 13 fixture harness... park the 2 design-scoped items... re-verify."
- **Phase executed**: none (this session predates Phase 1 execution — it produced the plan itself, then set Phase 1 CURRENT).
- **Tool calls used**: 138 / 250 (Medium tier, per `.session-state-e5911b.json`).
- **Phase outcome**: N/A — planning session, no phase attempted.

## Completed

### Full triage of all 15 platform issues (13 FIX, 2 PARK)
Each issue was re-verified against live code and, for several, reproduced against `dist/cli/sharpee.js` using the Phase 13 fixture `docs/work/stdlib-reference/fixtures/wearing/wearing-taking-off.story`. David ruled on all 15:

- **FIX #1** — article-slot misrenders (`found_concealed`/`cant_hide_there`): per-shape message IDs in lang-en-us, prepositions removed from stdlib, `nounPhraseFor`-wrapped params. Resolves the §6.2 publish-or-hold via forced re-capture.
- **FIX #2** — concealed items leak into LOOK/EXAMINE: fix lands in the shared visibility layer so scope-resolver, looking, and examining all consult one definition of "visible."
- **FIX #3** — descriptionless EXAMINE renders blank: generalized fallback for all trait shapes, David's exact wording "The {noun} is just a {noun}."
- **FIX #5** — `after putting it` swallowed on the insert path: unify the two divergent `ActionContext.event()` implementations (engine closure factory vs. stdlib `EnhancedActionContext.createEventInternal`), pass-through as the default.
- **FIX #6** — plain mirror exit unwires a door: analyzer compile gate requiring the door be named + defensive throw in the loader.
- **FIX #7** — bare climbable silent no-op: honest refusal in validate plus an invariant throw in execute; David's ruling — bare `climbable` does NOT imply a place to be, no auto-composed destination.
- **FIX #8** — worn items invisible to INVENTORY: root cause revised mid-session (see Key Decisions) — `includeWorn:true` narrow fix now, broad `getContents()` default flip gated behind a new ADR, plus a rehydration/`isWorn`-getter investigation.
- **FIX #9** — `restart` unparseable on the Chord path: missing `RESTARTING` entry in `lang-en-us/src/data/verbs.ts` + a new grammar↔vocabulary cross-check test.
- **FIX #10** — ineffective attack renders blank: world-model's `attack.ts` returns English prose whose trailing period satisfies `attacking.ts:373`'s `includes('.')` "fully-qualified message ID" heuristic; fix is reason codes + lang-en-us templates + a tightened heuristic + an `AttackResult.message` consumer audit.
- **FIX #11** — state-machine transitions fire on refused actions: add a `success` flag to `EvaluationContext`, gate both the action-trigger and event-trigger paths on it.
- **FIX #13** — dispatch actions' refuse-without-target arm is unreachable: add a bare-verb grammar pattern for ALL `define-action`s (also fixes friendly-zoo's `pet`/`feed`).
- **FIX #14** — inline `phrase` prose rejected in story-header/`define machine` bodies: add the 2 missing `collectInlineTexts` call sites.
- **FIX #15** (a-d) — approved as a bundle: stale version banner, `again`-after-`drop` parse-level refusal, silent misparse of `refuse <key> when <cond>` (wrong argument order), and `is deadly while` failing at load instead of compile.
- **PARK #4** — concealment auto-reveal: David reframed this as a SENSORY design question (per-sense action signatures vs. per-observer capabilities — invisibility cloak, night-vision goggles in darkness, noisy pickups breaking concealment aurally), not a flat `SILENT_ACTIONS` allowlist. Folds into ADR-246's not-yet-written design companion; explicitly do NOT wire the naive listener.
- **PARK #12** — heavy/moveable `pushTypes` unreachable from Chord: recorded as a parity-backlog row in `docs/work/stdlib-reference/chord-availability-audit.md`, no code change.

### Plan created
`docs/work/platform-issue-sweep/plan.md` — 10 phases (1-8 independent fixes, 9 record-only parks, 10 verification sweep last). `.current-plan` now points to it. Phase 1 (article-slot fixes) set CURRENT.

## Key Decisions

### 1. Fifteen explicit David rulings (2026-07-20, in-conversation triage)
Satisfies CLAUDE.md's "platform changes require discussion first" gate for every phase in the plan — the plan cites this triage conversation as its authorization, so no further discussion gate applies unless a phase's investigation surfaces a materially different fix than described.

### 2. #8's diagnosis was revised, not just re-confirmed
Prior session (7692ef) suspected a loader bug. This session found the real cause: `WorldModel.getContents()` filters worn items OUT by default (`WorldModel.ts:979-988`) while `inventory.ts:60` calls it optionless and assumes it returns everything. Reproduced live (`wear vest` → "You aren't carrying anything."). `undo` "fixing" the symptom is now suspected to be a second bug — rehydration possibly losing the `isWorn` getter — deferred to Phase 5's investigation step rather than assumed.

### 3. Default-behavior change gated behind a new ADR (Phase 5)
Flipping `getContents()`'s worn-item filter default is platform-wide and requires ADR-0247 (number to be re-checked at draft time — other work may claim it first) before the broad fix proceeds; the narrow `includeWorn:true` fix at the inventory call site unblocks the reproduced bug without waiting on the ADR.

### 4. plan-review verdict: TENSIONS ONLY, one advisory
`lang-en-us/CLAUDE.md`'s "patterns are documentation-only" framing conflicts with `verbs.ts` being parsing-load-bearing (relevant to Phase 6's restart fix). A clarifying CLAUDE.md line was folded into Phase 6's deliverable rather than raised as a blocking issue.

## Next Phase
- **Phase 1**: "Article-slot message-shape fixes (concealment/hiding prepositions)" — per-shape message IDs replacing the English-preposition-synthesizing `getLocationPreposition` in `searching-helpers.ts`; fixes `hiding.ts:132`'s bare `target` param.
- **Tier**: Medium (250 tool-call budget).
- **Entry state**: awaiting David's explicit go-ahead to start — no plan phase has been executed yet (rule: never proceed from planning to implementation without permission).

## Open Items

### Short Term
- David's go-ahead on which phase to start (Phase 1 is CURRENT).
- `rework/` intermediates and `BRIEF.md` keep-or-clean call (still pending from session 7692ef).
- ADR-245/246 design companions + go-ahead (still pending from session 7692ef).

### Long Term
- Phase 5's ADR-0247 (getContents default flip) once drafted — interview if it carries Open Questions.
- Phase 9's ADR-246 design-companion pointer for item #4 (sensory/per-observer perception) needs to actually get written when that companion work starts.

## Files Modified

**Planning** (1 file):
- `docs/work/platform-issue-sweep/plan.md` - new 10-phase plan covering all 15 triaged issues.

**Session bookkeeping**:
- `docs/context/.current-plan` - repointed to the new plan.
- `docs/context/.session-state.json` / `.session-state-e5911b.json` - session tracking.

## Notes

**Session duration**: single triage conversation, 2026-07-20.

**Approach**: Went issue-by-issue through the 15-item list from the prior session, re-verifying each against live code (several reproduced against `dist/cli/sharpee.js` via the wearing-taking-off fixture and `/debug`), asked David for a ruling on each, then handed the 15 rulings to session-planner to produce the phase plan. No implementation code was touched.

---

## Session Metadata

- **Status**: COMPLETE (as a triage/planning session — implementation not started, and none was expected this session).
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (planning complete; remaining work is the 10 phases in the plan, each independently scoped/budgeted there).
- **Rollback Safety**: safe to revert.

## Dependency/Prerequisite Check

- **Prerequisites met**: session 7692ef's 15-issue list existed and was fixture-grounded; `dist/cli/sharpee.js` was current enough to reproduce issues live; ADR-246 (ACCEPTED) existed to anchor item #4's park destination.
- **Prerequisites discovered**: none — the plan itself calls out that Phase 5 needs a new ADR (ADR-0247) before its broad fix, but that's a prerequisite for a future phase, not one missing from this session's own work.

## Architectural Decisions

- No ADR was written or amended this session. Phase 5 of the new plan will require drafting ADR-0247 (getContents worn-item default flip) before its broad fix proceeds — flagged as a future gate, not decided here.
- Pattern applied: ADR-first workflow (memory: `adr-first-workflow.md`) — the plan explicitly gates Phase 5's broad fix behind an ADR rather than implementing the default flip directly.

## Mutation Audit

- Files with state-changing logic modified: none — no source files were edited this session.
- Tests verify actual state mutations (not just events): N/A (planning-only session).

## Recurrence Check

- Similar to past issue? YES — this session's #8 diagnosis (`getContents()` filtering worn items) revises the prior session's own diagnosis of the same symptom (session-20260719-2147-chord-foundations.md recorded it as a loader/rehydration issue). Not a new recurrence class, but worth noting the root cause moved between sessions before landing on `WorldModel.ts:979-988`.
- If YES: no broader audit needed — Phase 5 already carries the rehydration follow-up investigation as an explicit step.

## Test Coverage Delta

- Tests added: 0 (no implementation this session).
- Tests passing before: N/A → after: N/A.
- Known untested areas: all 13 FIX items remain untested until their respective plan phases execute.

---

**Progressive update**: Session completed 2026-07-20
