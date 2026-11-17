# Findings — @sharpee/character

## Author-relevance
Author-facing. This is the primary NPC/character-authoring surface — the fluent `CharacterBuilder` (plus `ConversationBuilder`/`GoalBuilder`/`InfluenceBuilder` chains) and `applyCharacter()` are exactly what the book's programmer layer teaches for building NPCs. Spans five subsystems: character model (ADR-141), conversation (142), propagation (144), goals (145), influence (146). 134 symbols but a small subset is the actual author API; the rest are runtime engine internals and tick-phase plumbing.

## Naming
Mostly clean and consistent with the project's no-abbreviation rule. Concrete observations:
- Builder chains use natural-language method names (`feelsAbout`, `activatesWhen`, `actsWhen`, `resumeOnClear`, `clearsWhen`, `setsContext`, `updatesState`) — readable and consistent.
- Response-action verbs (`tell`/`lie`/`deflect`/`refuse`/`omit`/`confess`/`confabulate`/`askBack`) are a clean closed vocabulary mirrored in `ResponseAction`.
- `I`-prefix is correctly NOT used here (interfaces are domain data: `GoalDef`, `InfluenceDef`, `PropagationProfile`) — but note `ICharacterModelData`/`CognitiveProfile` etc. come from world-model with the `I`-prefix, so authors cross a convention boundary when they touch trait data. Worth a one-line note in the book.
- Suffix conventions are consistent: `*Def` (authored definition), `*State` (serialized), `*Result`, `*Builder`, `*Manager`, `*Tracker`, `*Record`.
- Minor: `Mood | string` and `mood(word: Mood | string)` widen several typed params to `string` (see API shape) — the param is still named clearly.

## Should-be-internal
A large share of the 134 exports are runtime machinery the book would never have an author call directly. Candidates that look like implementation detail leaking into the public barrel:
- Tick-phase factories + registry: `createPropagationPhase`, `createGoalPhase`, `createInfluencePhase`, `CharacterPhaseRegistry`, `CharacterPhaseConfig`. These are wired by the NPC service, not authors. `TickContext` is even declared non-exported in tick-phases (good) but the factories return functions typed against it.
- Pure evaluators: `evaluateConstraints`, `evaluatePropagation`, `evaluatePassiveInfluences`, `evaluateActiveInfluence`, `evaluatePcInfluence`, `evaluateGoalStep`, `checkResistance`, `buildResponseIntent`, `selectMoodVariant`, `applyCognitiveColoring`, `transferFact`, `applyTransfers`, `getVisibilityResult(s)`, `resolvePlayerPresence`, `findNextRoom`. These are engine-internal; an author building NPCs never calls them.
- Managers/trackers exposed whole: `GoalManager`, `InfluenceTracker`, `ConstraintEvaluator`, `ConversationLifecycle`, `AlreadyToldRecord`, `TopicRegistry`. Mostly runtime state holders with `toJSON`/`fromJSON` for save/restore.
- `createConversationData`, `createConversationRecord`, `createEvidenceRecord` (empty-collection factories) and `*State` serialization types (`ConstraintEvaluatorState`, `ConversationLifecycleState`, `ActiveGoalState`) are save/restore plumbing.
- `_getCandidates`, `_buildDef`, `_getTrigger`, `_addResponses`, `_addTrigger` are marked `@internal` in TSDoc but still appear as public class members on the `.d.ts` — they're reachable typed surface.

Net: the genuine author API is roughly `CharacterBuilder`/`ConversationBuilder`/`GoalBuilder`/`InfluenceBuilder`/`TriggerBuilder`/`ResponseChainBuilder`/`VocabularyExtension`, `applyCharacter`+`AppliedCharacter`, `COGNITIVE_PRESETS`/`CognitivePresetName`, the `*Def`/`*Profile`/`*Options` data types, and the three `*Messages` constants. The remaining ~80 symbols are extension- or platform-internal. A sub-entry-point (`@sharpee/character/runtime`) would cleanly separate them.

## API shape
- `unknown` / loose types: `ResponseCandidate.params?: Record<string, () => unknown>` and `stateMutations?: Record<string, unknown>`; `ResponseIntent.params?: Record<string, unknown>`; `DialogueResult.params?: Record<string, unknown>`; `EffectResult`-style payloads. `params` resolver values being `() => unknown` is intentional (deferred render-time resolution) but untyped.
- `Mood | string`, `mood(word: Mood | string)`, `setMood` mutation `mood: Mood | string`, `cognitiveProfile(profile: CognitivePresetName | string | Partial<CognitiveProfile>)` — the `| string` escape hatch defeats the curated vocabulary types for custom-vocabulary support. Reasonable but worth flagging; `ResponseStateMutation.mood?: Mood` (no `| string`) is inconsistent with the builder's `Mood | string`.
- `tick-phases` uses `random: unknown` in its local `TickContext`, vs `SeededRandom` in plugins/scheduler contexts — inconsistent typing of the same concept.
- `TriggerMutation` is a clean discriminated union; `GoalStep`, `StepResult`, `InfluenceResult`, `PcInfluenceResult`, `TopicResolution` are all well-formed discriminated unions — good shape.
- `GoalBuilder<TParent extends { compile(): unknown }>` and `InfluenceBuilder<TParent…>` use a generic-parent pattern with a `compile(): ReturnType<TParent extends {compile(): infer R}…>` return — clever but the conditional-type return signature is hard to read in docs; the book should show usage, not the signature.
- Return types are present everywhere; no missing returns observed.
- Duplicate concept: `PropagationOptions` (builder input) duplicates nearly every field of `PropagationProfile` (compiled output) field-for-field with identical TSDoc — two near-identical interfaces the author could confuse.

## Documentation (TSDoc)
Excellent — among the best in the repo. Essentially ~100% of files have module headers (purpose / public interface / owner context), and ~95%+ of public classes, methods, interfaces, and type members carry doc comments, including `@param`/`@returns` and inline algorithm notes (e.g. `TopicRegistry.resolve`, `evaluatePropagation`, `applyCognitiveColoring`). Notable undocumented items are few: some union-member fields and the `*State` serialization interfaces have terse one-liners; `_`-prefixed `@internal` members are documented as internal. This package does NOT need doc work for the book; it needs surface trimming.

## Book highlights
The programmer-layer NPC essentials:
- `CharacterBuilder` — the entry point. Core methods: `personality()`, `dispositionToward()` + shorthands (`loyalTo`/`likes`/`trusts`/`dislikes`/`distrusts`), `mood()`, `threat()`, `cognitiveProfile()`, `knows()`, `believes()`, `goal()`, `movement()`, `influence()`, `resistsInfluence()`, `propagation()`, `on().becomes()/.feelsAbout()/.shift()/.becomesLucid()` (triggers via `TriggerBuilder`), `definePredicate()`, `withVocabulary()`, `compile()`.
- `applyCharacter(entity, compiled)` → `AppliedCharacter` — the bridge from compiled builder output to a live entity's `CharacterModelTrait`.
- `COGNITIVE_PRESETS` / `CognitivePresetName` / `isCognitivePreset` — named cognitive profiles (stable, ptsd, dementia, etc.); show as the starting-point story.
- Conversation: `ConversationBuilder.topic()`/`.when()`→`ResponseChainBuilder` (`if()/otherwise()`, `tell/lie/deflect/refuse/omit/confess/confabulate/askBack`, `setsContext`, `updatesState`, `betweenTurns`, `onLeaveAttempt`), `.initiates()`, `.offscreen()`, `.witnessed()`. Key types: `ResponseAction`, `TopicDef`, `ConversationIntent`/`ConversationStrength`.
- Goals: `GoalBuilder` (`activatesWhen`/`priority`/`mode`/`pursues`/`actsWhen`/`act`/`interruptedBy`/`onInterrupt`/`resumeOnClear`), `GoalStep` union (`seek`/`acquire`/`waitFor`/`moveTo`/`act`/`say`/`give`/`drop`), `PursuitMode`, `MovementProfile`.
- Influence: `InfluenceBuilder` (`mode`/`range`/`effect`/`duration`/`witnessed`/`resisted`/`schedule`/`lingeringTurns`/`clearsWhen`), `InfluenceMode`/`InfluenceRange`/`InfluenceDuration`, `ResistanceDef`.
- Propagation: `.propagation(PropagationOptions)`, `PropagationProfile`, `PropagationTendency`/`Audience`/`Pace`/`Coloring`, `FactOverride`.
- `VocabularyExtension` — for custom mood/personality words (explains the `| string` widening).
- Note the dependency: nearly everything author-facing references `CharacterModelTrait`, `CognitiveProfile`, `Mood`, `DispositionWord`, `ThreatLevel`, `PersonalityExpr` from `@sharpee/world-model` — the book should introduce those vocabularies alongside this package.
