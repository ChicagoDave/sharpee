# ADR-403: A machine's action trigger is its thing's answer to the verb

**Planning**: IMPLEMENTED

**Summary**: A Chord machine's `when <gerund> the <role>` trigger counts as the named thing implementing that verb, so a self-dispatching verb (turning, pulling, lowering and the like) succeeds on a thing with no clause of its own and the machine advances; and a refused action never advances a machine, because plugins read the executor's `refused` flag.

**Status**: **ACCEPTED** (David, 2026-11-15, session 5f3320: "yes", after ruling the change ADR-worthy on GH #750: "a"). Both decisions below are David's ruling in session 58d051 on GH #712 ("b" of three options), and both are built and pushed (`4f292b687`). The record was written after the build. No question is open.

## Date: 2026-11-15

**Kind**: technical

**Scope**: `packages/story-loader` (the clause-less interceptor arm for a machine trigger's thing), `packages/engine` (the plugin tick's `actionResult.success`), `packages/plugin-state-machine` (reads that flag; unchanged).

## Parent

- **ADR-371 D1 and D1a** (implementation-dispatching verbs; an interceptor counts only for the things it claims). A dispatching verb refuses a target that has neither a capability behavior nor a claiming interceptor. This record adds a third way a Chord thing comes to have one.
- **ADR-119 and ADR-120** (state machines). The machine whose action triggers this record gives meaning to.
- **ADR-239** (topic tables). The clause-less interceptor arm this record reuses.

## Context — read in the source, 2026-11-15

**A machine advanced on a turn its action refused.** The plugin tick built the plugins' `actionResult.success` from event flags alone, `blocked: true` or `failed: true` (`wasRefused`, `packages/engine/src/turn/plugin-tick.ts:79-84`). Turning's refusal is an event of its own type, `if.event.turn_blocked`, which carries neither flag, so the state-machine plugin saw a success. With `packages/chord/tests/fixtures/drawbridge.story`, `turn winch` printed the refusal and the drawbridge moved anyway (GH #712).

**Fixing the flag alone would have left the machine unreachable.** The self-dispatching verbs have no standard meaning: each refuses with its `cantDoThat` message unless the target has a capability behavior or a claiming interceptor (`packages/stdlib/src/actions/standard/dispatch-shared.ts:178-183`). A thing a machine names in `when turning the <role>`, with no `on the player turning` clause of its own, had neither. So the action would always refuse and the trigger could never fire.

## Decision

**D1 — A refused action never advances a machine.** The plugins' `actionResult.success` is `result.success && !result.refused && !actionRefused` (`packages/engine/src/turn/plugin-tick.ts:107`): the executor's own record of a refusal comes first, and the event flags remain as the second check. This holds for every turn plugin, not only state machines.

**D2 — A machine's action trigger is its thing's answer to the verb.** (David, 2026-11-15, on GH #712: "b".) The author who writes `when turning the <role>` has said the thing can be turned. At bind, the loader gives every thing a machine action trigger names a clause-less interceptor arm for the trigger's gerund (`packages/story-loader/src/runtime/on-clauses.ts:154-167`). The thing is found by `machineTriggerTargets()` (`:221-239`): a `$<role>` target resolved through the machine's roles, or an entity id as written; a trigger with no target names no thing. The arm exists only for a gerund the binding consults, and a thing that already has its own clause for that gerund keeps the one arm it has. `markArmOwner` (`:242`) marks the thing, the same step topic tables take, so the existing dispatching interceptor serves it and there is no new dispatch path.

The result: the verb finds an answer on the thing, runs, prints its stock success line, and the machine advances on that success. Where the thing also has `on` or `after` clauses for the verb, they run as they did.

### On paper

```
create the rusty winch
  in the Gatehouse

  A winch, stiff with rust.

define machine drawbridge
  roles
    crank: the rusty winch
  states
    raised
      when turning the crank
        phrase chains-pay-out
        go to lowering
    lowering
end machine
```

`turn winch` prints "You turn the rusty winch." and then the machine's line. Before this record it printed the turning refusal.

## Consequences

- Naming a thing in a machine's action trigger changes what the player can do to it: the verb succeeds on that thing in every machine state, including states with no transition for it, and prints the stock success line there. An author who wants a refusal in some state writes an `on the player <gerund>` clause on the thing.
- A Chord thing now has three ways to implement a dispatching verb: its own clause, a topic table (for asking and telling), and a machine trigger. `ActionInterceptor.claims` answers for all three from the loader's per-thing arms (ADR-371 D1a).
- A turn plugin can no longer treat a refused action as a success, whatever event the refusal emits. A plugin that wants to react to a refusal reads `actionEvents`.
- Verbs with standard semantics (taking, opening) are unchanged: their triggers fire on the action's own success, and the arm is added only for gerunds the binding consults.
- Nothing new is saved: the arms are registration, redone at every load.

## Acceptance

Both discharged in session 58d051 by `packages/story-loader/tests/gh-712-machine-trigger-answers-verb.test.ts` (5 tests, real engine through `bootTurns`, machine state read from the `StateMachinePlugin` registry); results as that session's summary recorded them.

1. A refused turn leaves the machine in its state. With the `plugin-tick.ts` line reverted the case failed (`expected 'lowering' to be 'raised'`); this is that session's report and was not re-run.
2. A thing named only by a machine trigger, by role or by entity id, answers the verb and the machine advances on the success.

## Session

Decisions: session 58d051, 2026-11-15, branch `main` (GH #712, commit `4f292b687`). Record: session 5f3320, 2026-11-15, at David's ruling on GH #750.
