# ADR-398: Pulling and the press are generic verbs

**Status**: **ACCEPTED** (David, 2026-11-14, session aa8202: "yes", to "Do you accept ADR-398 as written, D4 included?". Written the same session at his "yes, write the ADR". D1 to D3 and D5 are his rulings of that session, quoted where they were given; D4 was Claude's call, accepted with the record. The code this record describes was built in the same session under those rulings.)

## Date: 2026-11-14

**Kind**: technical

**Scope**: `packages/world-model/src/traits/pullable/`, `packages/stdlib/src/actions/standard/pulling/`, `packages/stdlib/src/actions/standard/pushing/`, `packages/lang-en-us/src/actions/pulling.ts`, `packages/story-loader/src/build/trait-routes.ts`, `packages/story-loader/src/message-alias-map.ts`, `packages/chord/src/message-alias-catalog.ts` (generated), `packages/devkit/fixtures/basic-story/`, and the tests beside each.

## Amends

ADR-378 D6, for the push with no direction only. D6 reads "the thing says it can be pushed", and that stays the rule for a push between rooms: `pushable` on the thing, `admits pushing` on the way or the thing's own `pushing` block. For the press, the thing may say it with a clause instead (D2 below). ADR-378 D6a's reduction of `PushableTrait` to a marker is extended to `PullableTrait` (D1). ADR-378 otherwise stands.

## Context

GH #706 reported two defects in a thing's own `on the player pulling` clause, both seen in play on 2026-11-13.

**Only the first pull reached the clause.** `pulling.ts` refused `already_pulled` when the trait's `state` was `pulled`, and set that state on every successful pull. Nothing in `packages/` ever set it back, and `repeatable`, which defaulted to true, was read by nothing. A `pullable` thing could be pulled once in the life of a story, so ordinal arms (`first time`, `second time`) on a pulling clause could never count past one.

**On a thing without `pullable` the clause compiled and never ran.** The action refused `cant_pull_that` before the clause's body could run. Only a leading `refuse` fired, because an interceptor's `preValidate` runs ahead of the action's own validation. Pushing had the same shape: a clause on a thing without `pushable` was refused `fixed_in_place` or `pushing_does_nothing`.

`PullableTrait` carried twelve fields. The pulling action read three (`state`, `pullCount`, `pullType`) and nothing else read any. This is the condition ADR-378 D6a found in `PushableTrait` and ended.

**The first design kept the word and added a compile error.** A pulling or pushing clause on a thing without the word would not compile, on the strength of ADR-378 D6 and David's "Explicit > Implicit". It was built and withdrawn the same session, for two reasons the build showed:

- Fifty-nine existing test stories wrote such a clause, among them `on the player taking, touching, pushing` with a body of one `refuse`. That clause works today on any thing. Under the rule its author would have to call a sword `pushable` in order to say it cannot be pushed.
- David, on seeing that: "I'm not sure the explicit rule works for generic actions."

**The platform already has a rule for generic verbs.** Turning, lowering, raising and setting have no trait word. Their actions accept a thing that has an implementation of the verb, a capability behavior or an interceptor that claims the thing (`hasInterceptorImplementation`, ADR-371 D1a), and refuse every other thing. A Chord clause is such an interceptor. Once the latch is gone, a pull does nothing but run the thing's own clause, which makes pulling a verb of that kind. A press is the same, apart from toggling a switch.

## Decision

**D1. `PullableTrait` is a marker, and a pull succeeds every time.** The trait has no fields, as `PushableTrait` and `SceneryTrait` have none. The action's `already_pulled` refusal and its writes to `state` and `pullCount` are removed, and `pullCount` and `pullType` leave the `if.event.pulled` payload. A story that wants a pull to work once says `, once` on its clause or refuses on a condition. (David, 2026-11-14: "a", on a design whose first decision this was.)

**D2. A thing can be pulled, or pressed, when it says what that does.** Pulling's validate accepts a target that carries `PULLABLE`, or is attached (ADR-373 D1, unchanged), or has an interceptor for `if.action.pulling` that claims it. Pushing's validate accepts, for a push with no direction, a target that carries `PUSHABLE` or has an interceptor for `if.action.pushing` that claims it. Both read the one check the implementation-dispatching verbs use, `hasInterceptorImplementation`. In Chord this means an `on` or `after the player pulling` clause, or a pushing one, on the thing or on a trait it composes, is enough; the word is not required. (David, 2026-11-14, to "for pulling and the plain press, the clause is what makes the thing pullable or pushable, and no word is required?": "yes, rebuild it that way".)

**D3. A push with a direction still needs `pushable`.** Moving a thing between rooms is a fact about the thing and the way, and ADR-378 D6 decides it. A thing whose only say is a pushing clause refuses a push with a direction as any unmarked thing does.

**D4. A press on a clause alone does not toggle a switch.** (Claude's call, accepted by David with the record, 2026-11-14.) A `pushable`, `switchable` thing is toggled by a press, as before. A switchable thing that is pressed only because a clause claims the push is not toggled: the marker is what says a press works its switch, and an author who wrote a clause is saying what the press does themselves. The alternative, toggling any switchable thing a press reaches, would change the state of a thing whose author asked only for a line of text.

**D5. The words stay, and there is no compile error.** `pullable` and `pushable` remain trait words. A thing with the word and no clause answers with the stock line ("You pull the bell rope."). A clause on a thing without the word is not a diagnostic of any severity. (David, 2026-11-14, as D2.)

**D6. Two lines are retired.** `if.action.pulling.already_pulled` has no emitter after D1, and `if.action.pulling.nothing_happens` never had one. Both leave `lang-en-us`, the action's `requiredMessages`, the loader's alias map and Chord's generated alias catalog.

## Consequences

- An author's first rope works as they write it: a thing with an `on the player pulling` clause is pulled on every `pull`, with or without `pullable`, and ordinal arms count pulls. After the last arm the clause still runs and says nothing, so the stock line stands.
- A clause that only refuses keeps working on any thing, with no exception to state.
- Every `pullable` thing in an existing story becomes pullable more than once. In the repository this moves two things: the ferry's lever and the vehicles story's anchor run their clause again on a second pull, where they used to refuse. No recorded tree pulled either twice.
- The claims walk's state counts fall for a story with a `pullable` thing, since the marker no longer carries a pulled-or-not state. One pinned count was re-recorded: `packages/devkit/tests/claim-broken.test.ts`, the broken ferry, 473 states to 238.
- The claims walk already types a verb for every action a thing's clauses answer to (`vocabulary.entityActions`), so a thing pulled or pressed on its clause alone is offered as a candidate. No test pins that for pulling.
- Pulling and pushing now accept a target on two grounds, a marker or an implementation, where the seven dispatching verbs accept on one. A later record may ask whether the markers still earn their place; this one does not.
- A future session that finds a pulling or pushing clause on a thing without the word has found a working story, not a defect. Requiring the word again, or adding a diagnostic for its absence, reverses D2 and D5 and needs a record of its own.
- Left as they were, and not decided here: the `lang-en-us` pattern list for pulling still names `pull [something] [direction]`, `drag [something] [direction]` and `tug on [something]`, none of which the grammar has; and the two actions word their refusals and their worn checks differently.
- Dungeo composes no `PullableTrait`. Its walkthrough chain was run once after the change: 949 passed.

## Session

aa8202, 2026-11-14, on `main`, under the Chord manual plan's Phase 1 (defects fixed in `packages/`, design to David first). Closes GH #706.
