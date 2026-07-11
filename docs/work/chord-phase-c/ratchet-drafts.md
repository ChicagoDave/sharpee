# Phase C Phase 1 — Ratchet Entry Drafts (PROPOSED)

Drafted 2026-07-11 per plan.md Phase 1. **STATUS: ALL APPROVED — David,
2026-07-11 ("Approve all as drafted"; CP2 = loader-internal mechanism
confirmed; CP5 = top-level `define score` REMOVED; CP6 = named-entity
mutations from sequences confirmed). All 13 entries plus the consolidated
removals entry are transcribed into the official log
(`docs/architecture/chord-grammar-changes.md`, 2026-07-11 rows) — the log
is normative; this file is the working draft kept for the Phase 1 record.
Phase 2 is unblocked.**

## Spike result (Risk 1 — gates entry D3)

Run 2026-07-11 against Phase B machinery (temporary test, since removed):
an `ActionInterceptor` registered for a dispatch action ID
(`chord.action.petting`) resolves correctly in the registry
(`getInterceptorForAction` returns it) but **zero hooks fire** during the
dispatch action's validate/execute/report cycle — `buildDispatchAction`
never consults the interceptor registry. Mechanism chosen for `after` on
dispatch verbs: **loader-internal** — the Chord runtime builds the dispatch
actions itself and already invokes derived-verb when-rules in their report
phase (`fireActionRules`, runtime.ts:557); owner-attached `after` clauses
compile into that same post-behavior slot. For standard-semantics verbs,
`after` uses the existing interceptor `postExecute`/`postReport` append
path (Phase B shipped those hooks in examining/opening/closing/reading).
**Zero platform changes needed** — the plan's feared
`CapabilityBehavior`-hook fallback is not required. Checkpoint 2 is
therefore a confirm-the-mechanism question, not a platform-change request.

## Proposed entries

| # | Form (syntax) | Rationale | Example | Decision |
|---|---------------|-----------|---------|----------|
| D1 | **State adjectives join the condition kit**: `open`, `closed`, `locked`, `unlocked`, `on`, `off`, `worn`, `lit` as `is [not] <adj>` predicates, read live from world trait state (OpenableTrait.isOpen, LockableTrait.isLocked, SwitchableTrait.isOn, the worn relation, computed light). Same closed-catalog governance as the capability adjectives; growth = ratchet entry. | Leg 1: derivable facts must be derivable or authors shadow them into flags (`gate-closed`). | `south is blocked while the staff gate is closed: staff-gate-blocked` | PROPOSED |
| D2 | **Story states**: `states:` line in the story header; the story starts in the first declared state; `change the story to <state>`; bare state names remain valid condition refs (`while after-hours`). | Leg 2: story phases are a state machine, not flags. | `story "Friendly Zoo" …` ⏎ `  states: open, after-hours` | PROPOSED |
| D3 | **`on` / `after` clause split**: `on <verb> it` intercepts (may `refuse`; its `phrase` output is the primary message); `after <verb> it` reacts (`refuse` is a parse error inside `after`; its `phrase` output appends). Terminators `end on` / `end after`. Standard verbs: `after` = interceptor postExecute/postReport append. Dispatch verbs: `after` compiles into the dispatch action's report phase (loader-internal — see spike result above). | Decision 1: the §5.4 routing boundary drawn on the page; DDD review §2. | `after entering it` ⏎ `  award visit` ⏎ `end after` | PROPOSED (mechanism per spike; keyword `after` per decision 1) |
| D4 | **`states, reversible:`** — a state set is forward-only by default (a backward `change` is load error `analysis.irreversible-state` with the declared order in the message); `reversible` (single-word modifier, given-7 adverb rule) permits any declared-to-declared transition. | Decision 2: back-transitions are a defined capability, not free. | `states, reversible: hungry, content` | PROPOSED (word `reversible` needs confirmation) |
| D5 | **`, once` clause-header modifier** — gates a whole `on`/`after`/every-turn clause to a single lifetime firing. `first time` body ordinals stay; the two forms are different scopes (clause vs branch within a firing), both canonical at their scope. | Decision 4. | `on every turn while after-hours, once` | PROPOSED |
| D6 | **`must` requirements**: `<subject> must <predicate>: <phrase-key>` as (a) a `define action` line and (b) a behavior-body statement. Requirement fails ⇒ refusal with the key. Companion gate: `refuse when` whose condition has a top-level `not` is load error `analysis.negated-requirement` with a must-form fix-it ("state requirements positively"). `refuse without <slot>` and `otherwise refuse` unchanged. | Decision 6 ("single closed"): requirements positive, prohibitions positive, one form per polarity. | `the actor must have its food: no-feed` | PROPOSED |
| D7 | **Statement `when` suffix**: `<statement> when <condition>` executes the statement only if the condition holds at that moment (`award farewell when …`). Legal on `award`/`phrase`/`emit`/`move`/`change`/`win`/`lose`; NOT a new block form. Positionally distinct from select-arm `when <value>` (statement-final vs arm-header); the final log entry names the homonym explicitly. | Decision 7: `if` is removed; this is the moment-conditional replacement. The freed keyword comes from leg 3's deletion of floating when-rules. | `award farewell when the player can see it` | PROPOSED |
| D8 | **Trait-declared states**: `states[, reversible]: <a>, <b>[, …]` as a `define trait` line (alongside `data`); every composer gets the set; the trait body and ANY other composed trait's body may reference the states (`restless` reads feedable's `hungry`) — resolution is across the composer's full trait set; the same state name declared by two composed traits is load error `analysis.state-collision` with a rename fix-it. The `flag` field type is REMOVED from trait data. | Decision 5: booleans gone at every scope; `fed: flag` was `hungry`/`content` in disguise. | `define trait feedable` ⏎ `  states, reversible: hungry, content` | PROPOSED |
| D9 | **Three-ring boolean-state gate** (pattern detection over every declared state set — story, trait, entity): ring 1 `analysis.boolean-state` (error): literal `true`/`false`/`yes`/`no`. Ring 2 `analysis.shadow-state` (error): a set reproducing a platform pair (`open`/`closed`, `locked`/`unlocked`, `on`/`off`, `lit`/`unlit`, `worn`/`unworn`) — fix-it: compose the owning trait. Ring 3 `analysis.negated-state` (error): one name is a negation of another (`not-`/`un-`/`non-`/`no-` prefixes, `-less` suffix, shared-stem pairs like `fed`/`unfed`, `active`/`inactive`) — fix-it draft: "`unfed` names the absence of `fed`, not a condition of the goats. Name what they are when not fed — feedable's answer was `hungry`/`content`. A state names what the thing IS, never the absence of another state." | Decision 8 + David's clarification: catch pos/neg states, encourage real states. | `states: fed, unfed` → error ring 3 | PROPOSED (fix-it wording open to edits) |
| D10 | **Sequence step anchors**: `when <owner> becomes <state>` joins `at turn N` / `N turns later` as a step header. The step arms when the transition occurs; subsequent `N turns later` steps chain from its firing. `at turn N` stays absolute from story start. | Decision 9: timelines chain off phases and events, not just the wall clock. | `when the story becomes after-hours` ⏎ `  phrase …` | PROPOSED |
| D11 | **Owner-scoped narration** (semantics entry — no new syntax; recorded because it changes clause-firing behavior): story-owned schedules broadcast; entity-owned every-turn clauses fire only when the player is in the owner's location (presence, not sight); `, once` therefore cannot be consumed unwitnessed; RNG conditions in entity clauses roll only on stage. | Decision 10: a phrase's reach follows its owner; hand-written `can see it` scoping was the flag disease in narration form. | goats' confession fires when the player shows up, not at the after-hours instant | PROPOSED |
| D12 | **Owner-attached scores**: `score <name> worth N` as a line in `create` blocks (ANY entity — rooms, animals, items), `define trait` blocks, `define action` blocks, and the story header. The identity is owner-scoped (goats' `fed` ≠ rabbits' `fed`); max score = load-time sum across owners; `award <name>` inside an owner's clauses resolves to the owner's score. | Decision 3: the owner provides the namespace; the `visit-*` prefix taxonomy dies. | `create the zoo map` ⏎ `  score collected worth 5` | PROPOSED (pending Checkpoint 5 on `define score`) |
| D13 | **Sequence-scope mutation rule** (reconciliation, Checkpoint 6): sequences (story-owned) may mutate world state — `change` on the story or any NAMED entity, and `move` — plus `phrase`/`award`/`emit`/`win`/`lose`. The firm constraint: sequences bind no `it` (no implicit-target statements). This supersedes the proposal's narrower leg-2 recommendation, which conflicted with the approved sketch's `change the pygmy goats to hungry`. | The approved sketch is the spec where the two disagree; recorded explicitly rather than silently. | `change the pygmy goats to hungry` (from `define sequence feeding time`) | PROPOSED |

## Removals list (Phase 2 scope boundary)

Removed from the grammar, each with a parse-error fix-it naming its
replacement: top-level `when` rules (→ `after`/`on` clauses on the owner),
top-level `once <cond>` rules (→ `, once` clause modifier), top-level
`every N turns` rules (→ story-owned schedule forms; `define sequence`
stays), `define flag` (→ story/trait/entity states or derived conditions),
the `flag` trait-field type (→ trait-declared states), `if`/`else`/`end if`
(→ `must` guards, statement `when` suffix, `select`), `refuse when not …`
(→ `must`, gated by D6). **Pending Checkpoint 5**: top-level
`define score X worth N` (→ owner-attached `score … worth N`; removal
recommended under given 7).

## Unchanged, only extended

`first time` ordinals; `select on` / `select <strategy>`; `change` (gains
story/trait-state targets and the D4/D9 gates); `set` (shrinks to
non-state trait fields: entity/number/name); capability adjectives and
kind nouns; `refuse without` / `otherwise refuse`; `define sequence` step
bodies; `define phrase` strategy/verbatim forms; `define verb`;
`define condition`; hatches (`define text/action/behavior … from`);
`emit`; `award … , once`; prose/formatting rules; `{br}`; markers.

## Checkpoint questions for David

- **CP2 (mechanism)**: confirm the spike's loader-internal mechanism for
  `after` on dispatch verbs (no platform change) — D3 is signed on this.
- **CP5 (define score)**: remove top-level `define score` (recommended,
  given 7) or keep it as the story-header form?
- **CP6 (sequence mutations)**: confirm D13's reconciled rule.
- Everything else: approve per row, or per-row edits.
