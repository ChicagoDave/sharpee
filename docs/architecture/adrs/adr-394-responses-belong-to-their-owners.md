# ADR-394: Responses belong to their owners: story traits classify, and noun dispatch in an action is refused

**Status**: **ACCEPTED** (David, 2026-11-10, session 354c36). Rulings 1 and 2 were given in conversation; D3 to D8 are the recommendations David approved with "proceed" the same day. Not yet implemented: the work is `docs/work/chord-ownership-guards/plan-20261110-ownership-guards.md`.

## Date: 2026-11-10

**Kind**: technical

**Scope**: `packages/chord`, `packages/story-loader`, `docs/architecture/chord-grammar-changes.md`

## Context

The UNDERGROUND V1 port (a separate repository, assessed read-only on 2026-11-10) put 1,325 of its 3,045 lines in one file of 47 `define action` blocks. Almost every response lived in an action body as a line gated on which thing the player named (`refuse when the item is the large emerald`, `phrase cat-eats-rat when the item is the rat and the cat is here`). Because a Chord body has no `if`/`else` (removed by design), the port rebuilt first-match-wins out of two flag entities, `the narrator` and `the umpire`, that existed only to be changed and tested. THROW repeated all 45 lines of DROP with one more condition on each.

All of it compiled gate-clean. Chord already has the idiom that makes this unnecessary: a `define action` supplies grammar and guards, and each thing or trait answers with `on the player <gerund>`, where `it` is the carrier and `each` ranges over open conditions. The port never used it, and the compiler never said so.

Four of the port's workarounds rested on silent defects, each confirmed against the source on main:

- `the item is a treasure`, where `treasure` is a story `define trait`, compiles and is always false. `classifiesAs` (`packages/story-loader/src/kind-classification.ts`) reads only the entity's recorded kinds, although the IR records trait compositions beside them. This is what ADR-359 D1 decided: classification widens only `thing`.
- `the item is scenery` compiles and is always false. The analyzer accepts every trait adjective in the catalog after `is`; the evaluator's `symbolHolds` reads only `dark`.
- In a `define action`, a bare `refuse <key>` written after a statement compiles and never runs. ADR-289 D3 refuses that shape in every clause body, but `buildAction` never calls `checkPhaseOrder`. A `refuse when` or `must` written below a statement is hoisted by the parser and runs before the body, so the source misstates the order.
- A story `define action` whose grammar repeats a standard pattern (`take the item`) shadows the standard action. ADR-270 records shadowing as a cost, not a feature.

A census on 2026-11-10 over `stories/`, `branch-stories/`, `packages/`, `tools/` and `docs/` found 163 `define action` blocks in 44 files and no line testing an action's own slot for identity against a named thing. The port has 179 such lines in 13 actions.

## Decision

**D1: A story trait classifies.** `is a <trait>` and `must be a <trait>` hold exactly for the entities whose `create` block composes that `define trait`. The rule is one function shared by the evaluator and the character arbiter's kind scopes. A conditionally composed trait (`<trait> while <condition>`) classifies by declaration, whatever its condition says at the moment, as a kind does. It holds inside `each`, `any` and `no` open conditions as it does anywhere else. (Ruling 1: "the item is a treasure should 100% work".)

**D2: A classifier must name something.** `is a <word>` where the word names neither a kind noun (the catalog's, or a used extension's) nor a declared story trait is a compile error, `analysis.unknown-classifier`, with a nearest-name suggestion. Platform trait adjectives are not classifiers: `is a scenery` is refused, and `is scenery` (D3) is the one spelling. A character line's `a <word>` scope is held to the same set. Because a trait name is now a classifier, a `define trait` named after a kind noun, a platform trait word or an extension's word is `analysis.trait-name-taken` (David, 2026-11-10, "proceed"): `is a container` and a composed `scenery` must each mean one thing.

**D3: A trait adjective after `is` reads the composition.** `the item is scenery` holds when the entity composes that platform trait, through the same rule D1 builds. Every word the analyzer accepts after `is` has a reader in the evaluator, pinned by a conformance test that fails when a word gains acceptance without one. `the match is <word>` validates against declared states plus the platform words, so a misspelt state is `analysis.unknown-value`.

**D4: An action does not dispatch on which thing was named.** In a `define action`, a `refuse when` condition, a requirement, or a statement's `when` suffix that compares one of the action's own entity slots for identity with a named thing is a compile error, `analysis.slot-identity-test`, at any depth of `and`, `or` and `not`, in either polarity and either order. A `select on the <slot>` block whose arms name things is the same test written as a block and is refused under the same code. The fix-it names the thing and the clause to write on it (`on the player <gerund>` in that thing's `create` block) and points at `is a <kind or trait>` for asking what sort of thing it is. Still legal: `is a <kind or trait>`, `holds the <slot>`, a semantic key or direction word compared with a word, any test in a trait's or thing's own clause, and a named condition (`it is the sword`), since that form is legitimate in an owner's clause. (Ruling 2: an error on any occurrence.)

**D5: Refusals lead the action block.** `checkPhaseOrder` runs over the `define action` body. A bare `refuse`, a `refuse when`, a `refuse without` or a requirement written below the first body statement is `analysis.refusal-misplaced`. For the bare `refuse` the line is dead; for the hoisted forms the source would misstate the order they run in. This is a placement rule only: the order in which an action's refusal arms and requirements are evaluated is not changed. `otherwise refuse` is the dispatch miss and may stand anywhere.

**D6: A story action does not repeat standard grammar.** A story `define action` pattern whose shape equals a standard action's is a compile error, `analysis.repeats-standard-grammar`, naming the standard action. The fix-it names `on the player <standard gerund>` on the owning thing or trait first, and `extend action <standard action>` for new wording. Exempt: grammar files, `extend action` blocks, and a pattern whose standard shape the same story removes with `remove from action`, which stays the deliberate way to replace a standard action. A fixed-noun line (`take me`) is not a repeat of the slotted shape and is not caught. Patterns compare by reading (alternations and optionals spelled out), so `pet or stroke the animal` repeats `touching`'s `stroke`. Its census found real stories taking standard words: the zoo's petting, Secret Letter's smell, listen, jump, lift, buy and `hang … on`, and John Googol's mirrored Family Zoo tutorial. David ruled the error stands (2026-11-11, "A and John will update when we publish to npm"). Our stories are rewritten in the owner idiom. A bare `smell` or `listen` consults the actor's room, as a bare `jump` already does, so a room can answer it. The mirrored tutorial is left for its author to update after the publish.

**D7: A flag entity draws a warning.** A thing that declares states, has no placement, no description and no clauses of its own, is not playable, worn or carried, and is referenced only as the target of `change … to` and the subject of `is`, draws `analysis.flag-entity`, a warning: "put the states on the thing they describe, or on the story". A warning never fails a compile or a load.

**D8: Where the gates live, and what moves with them.** A gate that is a fact of the finished IR alone (D2 with its trait-name gate, D4, D6, D7) is written once in `packages/chord/src/validate-ir.ts`, so the loader refuses hand-built IR identically (ADR-389 D4). D3's word closure and D5's placement stay in the analyzer beside the rules they extend. No syntax is added and the IR does not change. Each gate that closes a form or gives one a meaning edits the comment at its production in `chord.ebnf`, re-pins the file's hash with a dated note, and takes a row in `docs/architecture/chord-grammar-changes.md`. `CHORD_LANGUAGE_VERSION` moves at publish, not per landing. Error messages cite no ADR.

**What this supersedes and amends.**
- ADR-359 D1, in its classification rule only ("classification widens only `thing`"): superseded by D1 and D2. Every entity still names its kind.
- ADR-289 D3: amended by D5. The gate reaches the `define action` body, and it refuses hoisted lines written out of place as well as dead ones.
- ADR-270: amended by D6. Repeating a standard pattern at the story tier, which ADR-270 recorded as shadowing at a cost, becomes an error unless the story removes the standard shape.

## Consequences

- An author who writes noun dispatch in an action is stopped at the first offending line, with the owner and the clause named. A story ported in that shape must be rewritten around its things and traits, not patched.
- `is a <trait>` becomes the way to ask what sort of thing a slot holds, so trait-owned clauses, `each` over trait-based open conditions and action-level `must be a <trait>` work together. IDE completion after `is a` should offer trait names; that is IDE work, not part of this decision.
- No word the compiler accepts after `is` or `is a` falls through to a silent false. Adding a word to the catalog now needs a reader or the conformance test fails.
- Replacing a standard action outright now needs a `remove from action` in the same story.
- The next publish is a minor bump (David, 2026-11-10: "this is a minor bump"), although several gates refuse source that compiled before.
- Several gates are breaking for source that compiled before. The corpus census found none of the D4 shape; each phase that adds an error runs its own census first, and a hit in a real story stops the phase.
- Left open, each needing its own ruling: refusal arms are evaluated before requirements regardless of written order; `win` and `lose` do not stop the body; a `define action` cannot test the named thing's own declared state (`analysis.unknown-value`); a platform state adjective on a thing without the trait (`the sword is open`) is false without a diagnostic.

## Session

Session 354c36 (2026-11-10, main): an assessment of the UNDERGROUND port's Chord, the slot-identity census, and the plan at `docs/work/chord-ownership-guards/plan-20261110-ownership-guards.md`, written by the session planner and reviewed by plan-review (one stale record, ADR-359 D1, resolved here).
