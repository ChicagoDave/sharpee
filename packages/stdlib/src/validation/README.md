# CommandValidator

## Overview

The CommandValidator is the second phase of command processing. It takes the
parser's world-agnostic `IParsedCommand`, finds the action, resolves each noun
phrase to an entity against the current world state, checks the action's scope
requirements, and returns an `IValidatedCommand` or a typed validation error.

Which entities a phrase names is not the validator's decision. It asks the
platform's one noun matcher, `matchNoun` in `@sharpee/world-model`, the same
function the parse-time gate, list expansion and the IDE's Incomplete view call
(ADR-385 D1). The validator owns what happens around that answer: scope,
dominance, narrowing, ambiguity and the error it returns.

## Entity resolution

For a single noun phrase (`resolveEntity`):

1. **Candidates.** Every entity in the actor's sight (or, for `AWARE` scope,
   every entity but rooms and the player) that `matchNoun` names at either tier:
   `exact` (the whole phrase equals the name, an alias or the type, tried first
   with its leading articles restored so "The Grail" survives) or `words` (every
   content word is a name word, alias word or authored adjective). A content word
   found nowhere disqualifies the entity. The tiers are ADR-231 D3's.
2. **The gate's answer narrows, never adds** (ADR-385 D4). A phrase from a
   constrained grammar slot carries the ids the parse-time gate admitted as
   `INounPhrase.scope`; the candidates are intersected with them.
3. **`my` narrows softly** (ADR-385 D2). When the phrase carries the actor's
   possessive and some candidate is carried or worn, only those remain;
   otherwise the determiner is ignored.
4. **Scope filter.** Candidates outside the action's required scope level
   (`visible`, `reachable`, `touchable`, `carried`) are set aside.
5. **Exact match out of scope** (GH #206, #245). An out-of-scope entity the
   phrase names exactly resolves ahead of in-scope word matches that do not carry
   the phrase's head as their own head noun, flagged `exactOutOfScope`, so the
   action's own validate refuses it by name.
6. **Dominance** (ADR-231 PIN 2). Among in-scope matches the higher tier wins
   outright; within a tier more matched words win outright. A single survivor
   resolves.
7. **Ties.** A phrase with modifiers that no survivor's vocabulary covers is
   `ENTITY_NOT_FOUND` ("green ball" when only red and blue exist). Otherwise the
   automatic tiebreaks run in order: every modifier matched by exactly one;
   the action's `preferredScope` holds exactly one; exactly one is visible and
   reachable. What remains is `AMBIGUOUS_ENTITY`, carrying the choices and the
   tied phrase's token span so the engine can hold the command and splice the
   player's answer into it (ADR-385 D11).

Articles and determiners are never stripped here. The parser splits them once
and fills `articles`, `determiners`, `modifiers`, `text` and `head`
(ADR-385 D2); the validator reads those fields.

## Lists, `all`, topics

- **A list** (`take sword and lantern`) resolves each item by the path above, in
  order, into `IValidatedCommand.directObjects` (ADR-385 D5). An item naming
  nothing fails the command with `ENTITY_NOT_FOUND` and `listItem: true`, naming
  that item; a tied item fails with `AMBIGUOUS_ENTITY` carrying that item's span.
  Nothing is dropped silently.
- **`all`** resolves nothing here. The action expands it through
  `expandMultiObject` (`helpers/multi-object-handler.ts`), where `all but`
  removes every candidate the matcher names for an exclusion phrase.
- **A topic** (ADR-231 D4) resolves quietly against sight, or against the
  action's `topicCandidates`: a unique match sets `topic.entity`, a miss or tie
  leaves the verbatim text. A topic never produces an error or a prompt.
- **Pronouns** reach the validator already resolved: the parser's
  `PronounContextManager` sets the referent from the previous command's roles
  (ADR-385 D7) and the slot consumer puts the entity on the phrase.

## Scope checks after resolution

The action's metadata declares `directObjectScope` and `indirectObjectScope`.
A resolved entity outside the declared level fails with `ENTITY_NOT_VISIBLE`,
whose details carry the level that failed (`checkEntityScope`: `NOT_CARRIED`,
`NOT_REACHABLE`, `NOT_VISIBLE`, `NOT_AWARE`). An `exactOutOfScope` resolution
skips this check on purpose and reaches the action.

```typescript
interface ActionMetadata {
  requiresDirectObject: boolean;
  requiresIndirectObject: boolean;
  directObjectScope?: ScopeLevel;
  indirectObjectScope?: ScopeLevel;
  preferredScope?: ScopeLevel;
  topicCandidates?: (world: WorldModel, actorId: string) => readonly string[];
  validPrepositions?: string[];
}
```

## Error codes

`ACTION_NOT_AVAILABLE`, `ENTITY_NOT_FOUND`, `AMBIGUOUS_ENTITY`,
`ENTITY_NOT_VISIBLE`, `PRECONDITION_FAILED` (the action's declared
preconditions). The validator emits no prose; the engine turns each into a
`command.failed` event and `lang-en-us` renders it.

## Debug events

With a system event source set (`setSystemEventSource`), the validator emits
`entity_search`, `entity_resolution`, `ambiguity_resolution`,
`disambiguation_required` and `validation_error` events describing each
decision above.

## Usage

```typescript
import { CommandValidator } from '@sharpee/stdlib/validation';

const validator = new CommandValidator(world, actionRegistry);
const result = validator.validate(parsedCommand);

if (result.success) {
  const validated = result.value;
  // validated.actionHandler, validated.directObject?.entity,
  // validated.directObjects (a list), validated.topic
} else {
  // result.error.code, result.error.details
}
```

## Tests

`packages/stdlib/tests/unit/validation/` pins the behavior above:
`word-vocabulary-resolution` (tiers and dominance), `self-words`,
`wall-resolution`, `exact-out-of-scope`, `preferred-scope-disambiguation`,
`scoped-resolution` (the gate's ids), `list-resolution`, `adr-231-d4-topic`,
`command-validator-golden`.
