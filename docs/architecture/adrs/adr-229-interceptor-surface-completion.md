# ADR-229: Interceptor Surface Completion — post-228 rulings

## Status: ACCEPTED (2026-07-16 — all five rulings by David, session 2c43df)

## Date: 2026-07-16

> Follow-up to ADR-228 (Interceptor Lifecycle Engine). ADR-228's program
> (all seven phases implemented and verified, sessions 3ed9fb + 2c43df)
> surfaced five residual questions during implementation. Each was parked
> with a written flag rather than decided unilaterally; David ruled on all
> five on 2026-07-16. This ADR records the rulings. Together they finish
> the interceptor-surface program: no refusal invisible to hooks (R1), no
> command entity unconsulted (R2), no unreachable wired action (R3), no
> double mechanism for one canon behavior (R4), no blank turns from gated
> dispatch clauses (R5).

## Context

ADR-228 turned the ADR-118 interceptor lifecycle into a shared mechanism:
descriptors declare each action's consultable surface, one engine executes
the rulings, a registry-derived set gates Chord registrations at load time,
and the `while`-gate lowering was fixed at all three sites. Five edges
remained, each flagged in the session logs and the plan:

1. `taking_off` (and mirrored in `wearing`) still refuses **inside
   execute** — layering blockers and a `cursed`-flag probe run after
   validation passes, render their failure from `report()` via
   `sharedData.failed`, and never consult `onBlocked`/`postReport` hooks.
   Two producers of blocked events exist; only one consults hooks.
2. `locking`/`unlocking` descriptors are single-slot: the KEY (a genuine
   command entity via `instrument ?? indirectObject`, ADR-080) is never
   consulted. This is the one remaining deviation from D3's "all command
   entities" rule, and the D5 load-time gate cannot catch it — the action
   id IS consulted (on the target slot), so a key-side `on unlocking it`
   registration loads cleanly and silently never fires.
3. `if.action.talking` is player-unreachable without story grammar:
   lang-en-us declares the verbs (`talk`, `speak`, `converse`, `chat`,
   `talk to`), stdlib wires the action (ADR-228 Phase 5), but core grammar
   (parser-en-us `grammar.ts`) has no pattern routing to it — unlike its
   siblings `ask`/`tell`, which have core patterns. Dungeo had to add
   story grammar just to prove the troll interceptor.
4. Dungeo carries two mechanisms for talking to the troll, and they
   disagree by phrasing: the bespoke `talk_to_troll` action (priority-200
   literals) growls when the troll is alive; the generic interceptor route
   passes through to stdlib's greeting logic. Same intent, two canon
   responses.
5. ADR-228 D8 made a false `while` gate sit the whole clause out. On the
   two interceptor routes the standard action shows through; on the
   capability (dispatch-verb) route nothing is behind the clause — the
   behavior claims the dispatch, validates `{valid: true}` with
   `chordSkip`, does nothing, and a body-less action renders a blank turn.

## Decision

### R1: Execute-phase ad-hoc refusals fold into validate (taking_off + wearing)

`checkRemovalBlockers` and `hasRemovalRestrictions` (taking_off) and
`checkWearingConflicts` (wearing) move into `validate()`, after the
standard behavior checks and before the canonical `postValidate` hook
placement. Both are pure reads with no dependence on execution state.
Failures become ordinary `ValidationResult`s → `blocked()` →
`runOnBlocked` — messages, event types, and message ids unchanged. The
`cursed` probe is KEPT and folded (nothing in the repo sets the flag, but
an author-set `(trait as any).cursed` keeps working, now interceptably).
The behavior-result failure branches in execute stay as the true
defensive safety net; `report()`'s `sharedData.failed` path shrinks to
that safety net only. One blocked-shape per action.

### R2: The KEY becomes a consultable slot on locking and unlocking

Both descriptors gain a second slot: `id: 'key'`, same action id
(`if.action.locking` / `if.action.unlocking`), resolving
`context.command.instrument?.entity ?? context.command.indirectObject?.entity`,
published order **target → key** (D3-B). Explicit keys only — an
auto-inferred key is not a command entity (same documented rule as
attacking's inferred weapons). Symmetric seedData per the D3 sub-ruling:
the key consultation receives the target id, mirroring putting/inserting.
Pinning tests mirror the Phase-4 per-action pattern: key hook fires on an
explicit key, a key-side preValidate veto blocks the action (state
asserted), target → key consultation order pinned, and no consultation
when the command names no key.

### R3: Core grammar gains talk patterns (parser-en-us)

`grammar.ts` gains core patterns mapping to `IFActions.TALKING` at
standard priority (100), alongside the existing `ask`/`tell` patterns:
`talk to|with :target`, `speak to|with :target`, `chat with :target`,
`converse with :target`. Story grammar continues to win on priority.
This is the platform half of the Phase-5 discovery; stories no longer
copy per-story talk grammar.

**Amendment (ruled by David mid-implementation, 2026-07-16): the legacy
with→extras shunt is deleted.** english-parser.ts shunted any pattern slot
after a literal `with` into `extras` — which silently broke
`chat/converse with :target` (target never became the direct object) and
made the alternation forms work only by a substring accident. The shunt
predates ADR-080's `.instrument()` slot typing (which is how every
pattern that actually wants its with-slot routed as a tool declares it —
melt, turn-bolt) and had no remaining consumer. With-slots now follow
positional assignment like any other slot; `.instrument()` remains the
declared way to mark a tool slot.

### R4: Dungeo consolidates talk_to_troll onto the interceptor

`TrollTalkingInterceptor` keeps its preValidate KO veto
(`cant_hear_you`) and gains a `postReport` override: when the troll is
alive, the standard talked message is replaced with
`dungeo.troll.growls_at_player`. The bespoke `talk_to_troll` action and
its `talk to troll` / `talk to the troll` literals are deleted (those
phrasings ride R3's core patterns); the `hello troll` phrasing survives
via one story grammar line `hello :target` → `if.action.talking` — a
slot pattern, NOT a literal, because talking's validate requires a
direct object (`no_target` otherwise). Every phrasing now yields
the same canon pair: `cant_hear_you` KO'd, GROWLS alive. Absent-troll
handling moves to standard scope resolution (an improvement over the
action's hand-rolled cross-room troll lookup).

### R5: A gated-out dispatch clause falls through to the miss

"Sits out" means **as if the clause were never declared**. In the Chord
loader's dispatch action (`buildDispatchAction.validate`), a behavior
whose validate returns with `chordSkip` set (false `while` gate, or a
consumed `, once`) is treated as NOT claiming the dispatch: selection
falls through to the action body if present, another trait's behavior,
or the `otherwise refuse` miss. No platform change — both sides of the
contract are Chord-loader-owned (`buildDispatchAction`,
`buildCapabilityBehavior`). The D8 evaluation-point ruling (once per
firing, at validate time) is unchanged.

## Consequences

- The interceptor surface is closed under its own rules: every refusal a
  standard action can produce is hook-visible (R1), every command entity
  is consulted (R2), every wired action is reachable (R3).
- R1 changes WHERE two refusals fire (validate instead of execute) but
  not what the player sees; `postValidate` hooks now run after the folded
  checks per canonical D3 ordering. Pinning tests must cover the folded
  paths through `blocked()`/`onBlocked`.
- R2 makes key-side `on locking/unlocking it` registrations live; no
  existing story registers any (verify by grep before landing).
- R3 is cross-story parser surface: verify with the troll-talking
  transcript and a walkthrough-chain run. Dungeo's story-level generic
  talk patterns (priority 95) become redundant and are removed with R4.
- R4 deletes a story action; `dungeo.event.talked_to_troll` disappears in
  favor of the standard talked/blocked events with overridden messages —
  any transcript asserting on the old event type needs updating.
- R5 makes `otherwise refuse` cover gated-out clauses, the author-visible
  contract. A `, once`-consumed clause falls to the miss the same way —
  uniform, and pinned by tests extending the Phase-7 D8 suite.
- Sequencing note: R4 depends on R3 (the literals it deletes are replaced
  by core patterns).

## Session

Session 2c43df (2026-07-16, chord-foundations). Questions accumulated in
sessions 3ed9fb (Q1-Q4 flags) and 2c43df (Q5, Phase 7); all five ruled by
David 2026-07-16 via structured Q&A. Details per ruling in
`docs/context/session-20260716-1500-chord-foundations.md`.
