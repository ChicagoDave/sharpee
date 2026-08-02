# ADR-118 Full-Coverage: Contract Decisions

**Date**: 2026-07-16 (session c39d83). Companion to `audit.md` (same directory).
**Scope set by David**: 100% coverage — every action, every path, every entity. Not a high-value-target triage.
**Purpose**: each decision below is a genuine fork with pros and cons, written for David to read and rule on. Recommendations are marked but nothing is decided here. Once ruled, these become the ADR (new or ADR-118 amendment) that the implementation plan derives from.

The structural exemptions that survive 100% coverage, for the record: actions with no entity to key on (about, again, help, inventory, quitting, restarting, restoring, saving, scoring, sleeping, undoing, version, waiting, looking) — `on <verb> it` is unexpressable for them — and lowering/raising, which are full-delegation capability actions by ADR-118's own design. Everything else gets wired.

---

## D0. The framing decision — does the interceptor lifecycle stay a convention or become a mechanism?

**The gap behind all the gaps.** Today the ADR-118 lifecycle is a *convention*: each action hand-copies the resolve→preValidate→postValidate→postExecute→postReport→onBlocked pattern inline. The audit is the empirical verdict on whether convention holds: 14 hand-rolled copies drifted into two guard semantics, two onBlocked semantics, three multi-object behaviors, and per-path skips — and 19 actions never picked the convention up at all. Every defect class in this document except D8 is a consequence of hand-rolling. Fixing the 33 files individually reproduces the conditions that caused the drift.

This is NOT a question about the architecture itself: the four-phase action pattern (ADR-051), the (trait, actionId) registry, capability dispatch (ADR-090), and the hook vocabulary are all sound and unchanged under every option below. The question is solely who owns the lifecycle's execution.

### Option A — Keep per-action wiring; fix all defects file by file
- **Pros**: No new abstraction; each fix is small and independently shippable; no observable ordering changes beyond the specific bug fixes.
- **Cons**: 33 hand-rolled copies of a contract that demonstrably drifted 3 ways in 14 implementations; D3 (multi-entity) and D4 (multi-object) multiply the copied complexity in every file; every future action re-runs the risk; the D5 registry must be hand-maintained because nothing structural marks an action as wired. Coverage rots back.

### Option B — A shared lifecycle engine in stdlib; actions declare their interceptor surface
One module owns the lifecycle. Each action supplies a small declarative descriptor: which command entities carry interceptors under which action ids (including implicit-entity resolvers — going's source/destination/door, exiting's current container), how multi-object items map to per-item lifecycles, plus the rare explicit special contract (attacking's postExecute-replaces-combat). The shared engine implements the D1/D2/D3/D4 rulings exactly once; actions call into it at their four phase boundaries.

- **Pros**: Correctness becomes structural — drift is impossible because there is nothing to drift; the 19 unwired actions become descriptor declarations, not 19 re-implementations; the D5 registry falls out mechanically (an action is "wired" iff it has a descriptor — the stdlib export IS the descriptor table, no hand-maintained list); pinning tests live once against the engine instead of 33 times; matches the logic-location table (stdlib owns standard-action patterns) and the "extend existing patterns" edict.
- **Cons**: A real refactor — all 33 actions touched, one new abstraction for platform devs to learn; canonicalizing hook placement changes some observable orderings (e.g. taking's postValidate currently runs before capacity checks; under the canonical order it runs after ALL standard validation) — each such change needs blessing and transcript coverage; the descriptor API must be designed carefully or it becomes a second convention.

### Option C — Engine-level generic interception (CommandExecutor wraps every action)
Move consultation out of actions entirely: the engine resolves interceptors around the validate/execute/report calls, driven by the same descriptor metadata.

- **Pros**: Absolute coverage including story-custom actions, zero stdlib code per action; precedent exists (engine already has capability-dispatch-helper.ts).
- **Cons**: Blocked by D4 unless multi-object commands are expanded upstream (the per-item loops live INSIDE action execute/report, invisible to the engine) — i.e., C forces the big engine change that D4-B deliberately defers; the engine layer gains knowledge of a stdlib concept, inverting the dependency direction; mid-phase placement flexibility disappears entirely rather than by ruling.

**Recommendation**: **B.** It is the difference between "edit 33 files to be correct today" and "make incorrectness inexpressible." C is the theoretically purest form but is coupled to the upstream multi-object expansion (D4-B) that is explicitly out of scope; the ADR can name C as the natural second step IF D4-B ever happens. A is how the codebase got here.

**Sequencing consequence if B is chosen**: rulings D1–D4 first (they ARE the shared engine's spec) → build the lifecycle module + pinning tests → migrate the 14 wired actions onto it (each migration deletes hand-rolled code and fixes that action's path gaps) → declare the 19 new surfaces → D5 registry export + Chord fail-fast → D8 loader fix. The live bugs (trophy-case multi-put, troll talking) fall out of the migration rather than being spot-patched twice.

---

## D1. pre/postValidate guard semantics — what does `{valid: true}` from a hook mean?

**The gap.** ADR-118 contradicts itself: its prose says hooks "Return ValidationResult to **block** action... Return null to continue," but its own example code short-circuits on ANY non-null result. The codebase split follows: 6 actions treat `{valid: true}` as fall-through (taking, eating, examining, reading, closing, opening); 8 treat it as "approved — skip all remaining validation" (dropping, entering, pushing, putting, switching_on, throwing, attacking, going). In `going`, a source hook returning `{valid: true}` even skips the destination room's hook; in `attacking` it skips visibility, reach, and self-attack checks.

**Grounding fact**: no interceptor in the repo returns `{valid: true}` today (verified — all `{valid: true}` hits are capability behaviors, a different API). Chord-generated hooks return a result only to refuse. So EITHER choice is behavior-preserving right now; this is purely about what the contract promises going forward.

### Option A — Veto-only (fall-through on valid)
Hooks may block; only `result.valid === false` acts. `{valid: true}` and `null` both mean "no objection, continue."

- **Pros**: Safe by default — a story hook can never accidentally bypass reach/visibility/capacity/self-attack checks by returning the "wrong" truthy shape. Matches the ADR prose and the exemplar (taking.ts). One less trap for Chord codegen and for authors hand-writing TS interceptors. Preserves the ADR-118 consequence line "forgetting an interceptor just means standard behavior" in spirit: a confused interceptor degrades to standard behavior rather than to an exploit.
- **Cons**: No force-allow. An interceptor cannot say "yes, you CAN take this scenery / enter this normally-blocked thing." Any future puzzle needing that must be a story action or capability behavior instead. Contradicts ADR-118's example code (the docs need fixing either way).

### Option B — Short-circuit on any non-null
`{valid: true}` means "approved, skip remaining standard validation and later validate hooks."

- **Pros**: Force-allow exists — an interceptor can whitelist an action that standard validation would refuse, without replacing the whole action. Matches the ADR example code and the majority (8 of 14) of current implementations, so fewer files change.
- **Cons**: Dangerous default. `null` vs `{valid: true}` look interchangeable ("both mean OK") but differ radically; the failure mode is silent check-bypass, i.e., exploits rather than missing flavor. Interactions are subtle and per-action (which checks come "after" the hook varies by file). The going case shows hooks canceling each other. Force-allow-by-shape is invisible at the call site.

### Option C — Veto-only plus an explicit force-allow marker
Fall-through semantics per Option A, plus a distinct, deliberate signal for force-allow (e.g. `{ valid: true, force: true }` or a separate `InterceptorResult` kind), which skips remaining standard validation but never skips other entities' hooks.

- **Pros**: Both capabilities, zero ambiguity — approval is opt-in and greppable. Fixes the going hook-cancels-hook problem by defining force as "skip standard checks," not "skip other interceptors."
- **Cons**: API addition to `InterceptorResult` (world-model change); one more concept for authors; no current consumer needs force-allow, so it may be speculative surface.

**Recommendation**: **A now, with C's marker reserved in the ADR as the sanctioned future extension** (documented but unimplemented until a real consumer appears). Rationale: zero real consumers of short-circuit today, and the safe default matters more than saving edits in 8 files we are editing anyway.

---

## D2. onBlocked semantics — replace or append the standard blocked event?

**The gap.** 10 actions REPLACE the standard blocked event when onBlocked returns non-null (and `[]` suppresses it entirely, silently); 3 actions APPEND after it (taking, examining, reading — where `[]` appends nothing). ADR-118's prose ("Return additional effects **or** custom blocked message. Return null to use standard blocked handling") supports replace, but says "additional" in the same sentence.

**Grounding facts**: the primary custom-refusal path does not go through onBlocked at all — a pre/postValidate hook returns `{valid: false, error: customMessageId}` and the blocked event renders that message (this is how the white-hot axe works). So onBlocked's real job is side effects and presentation control on refusal. Also: Chord's generated dispatching interceptor has no onBlocked arm at all today — Chord refusals ride the validate-error path — so this decision constrains hand-written TS interceptors and future Chord surface, not existing stories.

### Option A — Replace (non-null wins, `[]` suppresses)
- **Pros**: Full control, including deliberate silence. Majority semantics already (10 files). Matches ADR prose reading.
- **Cons**: The standard blocked event is also the machine-readable record (`if.event.take_blocked` etc.) that tests and downstream systems key on; replacing it can silently break EVENT assertions and any state machine listening for blocked events. `[]`-suppresses-everything is a footgun.

### Option B — Append (standard event always emitted)
- **Pros**: The record event always exists; interceptors add color without being able to eat it. Simplest contract.
- **Cons**: No presentation control — cannot prevent a double message when the custom effect narrates its own refusal. (Mitigated by the fact that message override belongs to the validate-error path, but "emit a richer refusal scene instead" stops being expressible.)

### Option C — Structured result, symmetric with postReport
onBlocked returns `InterceptorReportResult`-style `{ override?, emit? }` instead of a bare effects array: `override` swaps the blocked event's messageId/params (record event survives with its type intact), `emit` appends effects; returning `{}` or null means standard handling.

- **Pros**: Message control WITHOUT losing the machine-readable event; identical mental model to postReport (already shipped as `applyInterceptorReportResult`); `[]`-ambiguity disappears because append and override are separate named fields.
- **Cons**: Signature change to `ActionInterceptor.onBlocked` (world-model API), touching all current onBlocked implementations (few exist in stories; the stdlib call sites are being edited anyway). Slightly more API than A/B.

**Recommendation**: **C**. It is the only option that keeps the event record intact AND keeps presentation control, and the symmetry with postReport makes the whole interceptor API teachable as one pattern.

---

## D3. Multi-entity resolution — which command entities get their interceptors consulted?

**The gap.** Every action currently consults exactly one entity (by per-action convention: taking→item, putting→container, throwing→target-else-item single-winner). Dead slots: weapon in attacking, door in going, item-side in putting, destination container in dropping, thrown item when the target has an interceptor. Authors cannot know which entity "owns" a verb without reading stdlib source; Chord authors get no signal at all.

### Option A — One designated entity per action (status quo, documented)
- **Pros**: No new semantics; cheapest; each action's choice is arguably the "natural" one.
- **Cons**: Fails the 100%-coverage goal — `on attacking it` on a weapon, `on going through it` on a door, `on putting it` on the ITEM stay dead forever. The convention table becomes load-bearing documentation that authors must memorize. Throwing's target-else-item rule shows conventions drift into arbitrariness.

### Option B — All command entities, defined order, all hooks
Each action resolves an interceptor per command entity (direct object, indirect object/instrument, and the action-specific implicit entities: door + source room + destination room for going, current container for exiting). Each resolved interceptor gets its own sharedData and all five hooks; validate-phase order is fixed and published (e.g. direct object → instrument/indirect → implicit); first veto stops the chain; postExecute/postReport run for every entity that survived.

- **Pros**: The author's model becomes trivially simple: "a clause on any entity involved in the command fires." Kills the entire second-entity gap class in one rule, including throwing's single-winner (both target AND item hooks run). Chord parity by construction. sharedData isolation per entity avoids cross-talk.
- **Cons**: More registry lookups per action (negligible — map lookups). Two-veto interplay needs a rule (first-veto-wins is simple but means entity order is observable). Existing interceptors that assumed exclusivity (throwing's target-keyed `itemId` handoff) need review. Slightly more wiring code per action — argues for a shared helper (see D4).
- **Sub-decision if B**: does the ITEM-side hook in putting/inserting receive the container in its sharedData (mirroring how the container's hook receives itemId today)? Recommend yes — symmetric context.

### Option C — All entities resolved, first-found-wins (generalize throwing)
- **Pros**: Cheap; one interceptor per command keeps interplay trivial.
- **Cons**: Two traits on different entities cannot both react; which one wins is invisible to authors; this is exactly the rule the audit flagged as a defect in throwing, generalized.

**Recommendation**: **B**. It is the only option consistent with "we are doing everything," and first-veto-wins with a published order is the whole complexity cost.

---

## D4. Multi-object commands ("take all", "put all in case") — how do hooks run?

**The gap.** putting's multi path bypasses all five hooks (live trophy-case scoring bug); dropping's bypasses all five; taking's runs four but never onBlocked. The class exists because each action hand-rolls its multi loop.

### Option A — Per-item full lifecycle, enforced by a shared helper
Complete taking's model and extract it: the multi-object helper owns resolve→preValidate→postValidate per item, postExecute/postReport per successful item, onBlocked per failed item. Actions supply only their standard per-item logic.

- **Pros**: One implementation of the lifecycle, so the bypass class cannot silently recur; preserves aggregated output ("You take: x, y, z"); contained to stdlib actions; directly fixes the trophy-case bug and taking's onBlocked gap.
- **Cons**: The helper's API has to accommodate per-action differences (putting's shared target vs taking's per-item entity); actions keep two code paths (single vs multi), just with the risky half centralized.

### Option B — Expand multi-object commands upstream into N single commands
Engine/command layer rewrites "take all" into N single-object commands before actions see them.

- **Pros**: Eliminates the class permanently — actions have exactly one path; every future action is multi-correct for free.
- **Cons**: Big engine change (command splitting, turn semantics, transactionality of partial failures); aggregated report output would need re-grouping at the text layer or output format changes; walkthrough transcripts asserting grouped output would churn. Wrong size for this program.

### Option C — Document hooks as single-object-only
- **Pros**: No work.
- **Cons**: Leaves a live scoring bug in Dungeo and makes "put all in case" a permanent trap. Fails the stated goal outright. Listed only for completeness.

**Recommendation**: **A** now; note B in the ADR as a possible future simplification, explicitly out of scope.

---

## D5. Chord loader validation — what happens to `on <gerund> it` for a bad gerund?

**The gap.** The loader registers interceptors for ANY gerund (analyzer routing checks only whether it's a Chord-declared action). Even after 100% stdlib coverage, three dead-registration cases remain: typos ("on tuching it"), constants with no implemented action (tasting, kissing, waving, turning, setting, emptying, consulting, jumping...), and lowering/raising where interceptors are inapplicable by design.

### Option A — Fail-fast at load against an authoritative wired-action registry
stdlib exports the set of interceptor-consulting action ids (compile-time-probed, like event-contract.ts's payload probe); the loader rejects unknown gerunds with a diagnostic, and rejects lowering/raising with a pointed message ("use a capability behavior / Chord dispatch action").

- **Pros**: Closes the authoring trap completely and permanently; the registry export gives Sharpee and Chord a single source of truth (the elegance-parity seam); matches the loader's existing fail-fast precedents (role clauses, `is deadly while`). A typo becomes a load error instead of a silent no-op.
- **Cons**: stdlib grows a small public surface that must be maintained (mitigated: derive it mechanically from the actions that call the shared wiring helper). Stories doing exotic things with custom action ids need an escape hatch (registering a custom action already goes through different Chord surface, so likely moot).

### Option B — Warning diagnostic only
- **Pros**: Non-breaking for any hypothetical story relying on late-registered custom actions.
- **Cons**: Warnings get ignored; the silent-death class survives in practice. Chord's design language is fail-fast elsewhere.

### Option C — Rely on 100% coverage, no validation
- **Pros**: No work.
- **Cons**: Typos and unimplemented-id gerunds still die silently; lowering/raising stay a trap. Coverage does not solve the vocabulary problem.

**Recommendation**: **A**, with the registry derived from stdlib rather than hand-maintained in story-loader (drift risk otherwise).

---

## D6. Delegation seams — removing and inserting

**The gap.** `remove X from Y` re-implements taking (own moveEntity, emits `if.event.taken`) but consults no interceptors under any id — the TrollAxe taking-block is bypassable whenever the guarded item sits in/on something. `insert X in Y` delegates wholesale to putting, so hooks fire but only under `if.action.putting` — `on inserting it` is dead.

### Option A — Alias to the primary action's id
removing consults `if.action.taking` interceptors (it IS a take, and emits taken); inserting keeps consulting `if.action.putting` only. `on removing it` / `on inserting it` become load-time errors or documented aliases in Chord (per D5 registry).

- **Pros**: One id per semantic operation — an author guards "taking" once and every phrasing honors it (closes the TrollAxe bypass with no author action). No double-firing questions.
- **Cons**: `on inserting it` / `on removing it` are natural author phrasings that now error (or need Chord-side aliasing); an author cannot distinguish "remove from container" from plain take even when they want to.

### Option B — Both ids, primary first
removing consults `if.action.removing` AND `if.action.taking` on the item (specific id first, both run under D3's multi-interceptor rule); inserting consults `if.action.inserting` then delegates into putting's `if.action.putting` hooks.

- **Pros**: Author intent expressible at either granularity; TrollAxe bypass still closed (taking hooks always consulted); consistent with D3's "everything involved fires" philosophy.
- **Cons**: One physical operation can fire hooks under two ids — postExecute double-mutation hazards if an author registers the same trait under both (needs an ADR note: a trait should pick one id); slightly harder to explain than A.

**Recommendation**: **B** for removing (the bypass MUST close via taking's id regardless, and removing-specific hooks cost nothing extra under D3), and for inserting: consult `if.action.inserting` before delegating (cheap, symmetric). Either way the ADR states the both-ids-fire rule explicitly.

---

## D7. Path-skip repairs in already-wired actions (mostly rulings, not forks)

These are defects under any of the above contracts; listed so the ADR can bless the fixes explicitly:

1. **going, dark destination**: report() returns early before both postReport hooks on exactly the path that emits `if.event.went`. Fix: run hooks before the early return. No real alternative.
2. **throwing, capability path**: when the target has an ADR-090 capability behavior, execute/report return before the (item-keyed) interceptor's postExecute/postReport. Under D3-B both should run; order question (capability behavior first, then interceptors) needs one line in the ADR. Recommend capability-then-interceptors, matching the validate-phase order that already exists.
3. **attacking, non-combatant branch**: postExecute skipped for non-combatant targets, postReport skipped on failed non-combat attacks. Fix to unconditional under the standard lifecycle. Note the existing comment says interceptor postExecute REPLACES combat resolution for combatants — that special contract should be called out (or normalized) in the ADR.
4. **postReport guards on re-read entities** (eating/entering/reading/switching_on re-read `directObject?.entity` at report time): standardize on the stashed validated entity so the hook cannot silently vanish.
5. **Cosmetic normalization** (no decision needed, just permission): IFActions constants instead of string literals (examining, reading); one sharedData key convention (`_interceptor` vs `interceptor`); delete opening's dead local; one shared wiring helper so all of the above stops being 14 hand-rolled copies. The helper is what makes 100% coverage maintainable — recommend the ADR mandates it.

---

## D8. Chord lowering bug — `while` gates do not gate refusals (found while answering D1)

**Status**: confirmed by two-sided code reading (lowering code + language spec + fixtures); NOT pinned by any test; not yet reproduced live. Surfaced 2026-07-16 while verifying that D1 loses no Chord clauses (it doesn't — Chord never returns `{valid: true}` from entity-clause hooks, so refusals block identically under either D1 semantic).

**The language rule is unambiguous.** design.md treats `while <condition>` as the universal clause qualifier ("All qualifiers ride on one connective (`while`)"); parser comment says "`while <condition>` — legal on every binding" (parser.ts:1753); the chord fixtures legally combine a `while` gate with leading refusals (`on prodding it while any alarm-trigger` followed by `must`/`refuse when` — each-package.story:19-20, each-compile.story:19-21). No analyzer diagnostic rejects the combination. The natural reading: the whole clause, refusals included, sits out when the gate is false.

**The lowering disagrees, at three sites** (packages/story-loader/src/runtime.ts):

1. **Entity on-clauses** (`buildInterceptor`): `preValidate` runs `findRefusal(clause.body)` unconditionally (:332-337); `clause.condition` is only evaluated in `postValidate` (:342-344, setting `chordSkip` for postExecute/postReport). Since every wired stdlib action calls preValidate before postValidate, a `while`-gated clause's leading refusal fires even when the gate is FALSE. Mutations and reports sit out correctly — only refusals leak through the gate.
2. **Trait on-clauses, interceptor route** (`buildTraitInterceptor`, :462-479): `clause.condition` is never evaluated at all — no chordSkip anywhere. A `while`-gated trait clause fires unconditionally: refusals, mutations, AND reports. The occurrence counter also increments with no `clause.once` check (the entity path checks `once` at :348; this path doesn't), so `, once` looks unenforced here too.
3. **Trait clauses, capability route** (`buildCapabilityBehavior`, :420-441): same as (2) — `validate` runs findRefusal with no `clause.condition` check and increments occurrence with no `once` check.

**Why no test caught it**: the only runtime `while`-gate test is Cloak's stumble clause (`after entering it while in-darkness`, story-loader runtime.test.ts:89) — an `after` clause on the EVENT path, which evaluates the gate correctly in its own binding. No test exercises `on <action> it while <cond>` with a leading refusal and a false gate, and no runtime test exercises trait-clause `while`/`once` at all.

**Fix shape** (not a real fork): evaluate `clause.condition` at the top of preValidate/validate (before findRefusal) at all three sites, and set/honor chordSkip + `once` uniformly in the trait paths. One design ruling to record: the gate is then evaluated in preValidate AND postValidate (entity path) — no mutation occurs between those phases inside one action, so double-evaluation is safe, but the ADR should state the gate's evaluation point ("once per firing, at validate time") so save/restore and future phases can't drift. Pinning tests: while-false + leading-refusal (entity + trait clause, both routes), trait-clause `, once`, and a regression run of the stumble suite.

**Interaction with the coverage program**: this fix is Chord-loader work, independent of the stdlib wiring — but it lands in the same program because 100% coverage makes `while`-gated refusal clauses reachable on 19 more actions.

---

## Coverage matrix — audit gap → decision that resolves it

| Audit finding | Resolved by |
|---|---|
| 19 unwired actions (silent Chord clauses) | wiring program + D5 registry |
| trophy-case multi-put scoring (LIVE) | D4 |
| troll "can't hear you" dead registration (LIVE) | wiring program (talking) |
| take-all loses onBlocked; drop-all loses everything | D4 |
| weapon/door/item-side/single-winner entity gaps | D3 |
| REMOVE-FROM bypasses TrollAxe; inserting id mismatch | D6 |
| guard-semantics split (8 vs 6 files) | D1 |
| onBlocked replace-vs-append split | D2 |
| going dark-path, throwing capability-path, attacking branch skips | D7 |
| lowering/raising accept dead registrations | D5 |
| `while` gate doesn't gate refusals; trait clauses ignore `while`/`once` (Chord lowering) | D8 |
| switching_on/off asymmetry, eating/drinking asymmetry | wiring program |

**Proposed next step once you've ruled on D0–D6 (D7/D8 need only a go-ahead)**: fold the rulings into the ADR (new ADR referencing 118, or ADR-118 amendment — your call from the earlier question stands), then session-planner phases the implementation. Under D0-B the natural phasing is: lifecycle module + pinning tests → migrate the 14 → declare the 19 → D5 registry + Chord fail-fast → D8 loader fix; the live bugs fall out of the migration.
