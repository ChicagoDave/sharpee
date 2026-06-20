# Findings — @sharpee/if-domain

## Author-relevance
Extension-facing with a thin author-facing slice: the book's programmer layer uses the grammar builders (`GrammarBuilder`, `ActionGrammarBuilder`, `PatternBuilder`, `ScopeBuilder`), action contracts (`IAction`, `IActionContext`, `ValidationResult`), the channel/sound wire types for custom UI/audio, and `GamePrompt`. The bulk (vocabulary registry, parser internals, language-provider plumbing) is platform/extension wiring an author rarely touches.

## Naming
Mixed, not clean.
- **Abbreviation violations (standard is none):** `CmgtPacket`/`cmgt` (channel-management — opaque acronym in a public wire-facing packet type), `prep`/`PREP` referenced in `GrammarPattern` element docs. `expandAbbreviation`/`abbreviations` are acceptable as domain terms. `Cmgt` is the worst offender.
- **I-prefix inconsistency is pervasive.** With I-prefix: `IAction`, `IActionContext`, `IActionRegistry`, `IScopeResolver`, `IEventProcessorWiring`, `IOChannel`, `IChannelRegistry`, `IGrammarVocabularyProvider`, `ISound`, `ISoundContent`, `IAudibilityEvent`. Without, same kind of contract: `Parser`, `BaseParser`, `LanguageProvider`, `ParserLanguageProvider`, `LanguageProviderRegistry`, `VocabularyProvider`, `VocabularyRegistry`, `GrammarBuilder`, `ScopeBuilder`, `GrammarEngine`. Side-by-side disagreements: `IActionRegistry`/`IChannelRegistry` vs `LanguageProviderRegistry`/`VocabularyRegistry`; `IGrammarVocabularyProvider` vs `VocabularyProvider`.
- **Suffix/casing:** `ScopeBuilderImpl` leaks an `Impl` suffix. `*Packet`/`*Vocabulary`/`*Builder`/`*Provider` families are otherwise consistent.

## Should-be-internal
- `ScopeBuilderImpl` — `Impl` suffix leaking; callers should use the `scope()` factory + `ScopeBuilder` interface.
- `parser-internals` symbols re-exported through `parser-contracts/index` despite being marked `@internal` and the file header saying it "should not be exported as part of the public API": `CandidateCommand`, `InternalParseResult`, `ParseError`, `ParseErrorType` (one of the package's two enums — an internal leak).
- `CompiledPattern`, `PatternToken`, `PatternCompiler`, `SlotMatch` — compiler internals; authors define patterns via strings.
- `vocabularyRegistry` (lowercase singleton) + `VocabularyRegistry` class — platform-wired implementation detail.

## API shape
- **`any` in public signatures (numerous):** `WorldState` = `{ [key: string]: any }`; `IActionContext.getWorldCapability(): any`, `.event(type, data: any)`; `BaseParser.parse(input): any` (untyped return on the core parser entry point); `Parser.setWorldContext(world: any, …)`, `setPlatformEventEmitter(emitter: (event: any) => void)`; `ParserLanguageProvider.getEntityName(entity: any)`; `GrammarContext.world: any`; `SemanticProperties`/`CommandSemantics.custom` use `[key: string]: any`; `SemanticMapping.compute(match: any)`. `ChannelProduceContext.world` is `unknown` (defensible) — inconsistent with grammar's `world: any`.
- **Duplicate/overlapping concepts:** `Parser` vs `BaseParser` (latter returns `any`, former extends with everything optional); `LanguageProvider` vs `ParserLanguageProvider` (latter carries ~12 optional `get*` "alternative to" methods duplicating `getVerbs`/`getDirections`/`getSpecialVocabulary`); two `GrammarPattern` concepts (`vocabulary-types.GrammarPattern` elements[] vs `LanguageGrammarPattern` pattern-string — latter's doc admits the collision); two vocabulary providers (`VocabularyProvider` vs `IGrammarVocabularyProvider`, disambiguated by a header comment = smell); `SemanticProperties` vs `CommandSemantics` near-identical shapes defined twice; two scope models (`ScopeConstraint` vs `ScopeLevel`/`IScopeResolver`).
- **Deprecated members still public:** `Parser.setDebugCallback`, `SlotType.ADJECTIVE`/`NOUN`, `PatternBuilder.adjective`/`.noun`.
- Return types are present throughout (good).

## Documentation (TSDoc)
High coverage, roughly **90%+** of exported symbols carry a doc comment; channels and sound files are exemplary (field-level docs + ADR cross-refs). Thin spots: `WorldChangeType`, `WorldState`/`WorldConfig`/`FindOptions`/`ContentsOptions` (terse), `changes.d.ts` duplicating `contracts.WorldChange.type` with no cross-link, `SemanticMapping.compute` (`match: any`, undocumented param). The `@internal` parser-internals are well-documented but shouldn't be public.

## Book highlights
- **Grammar (authoring):** `GrammarBuilder.define`/`.forAction`, `ActionGrammarBuilder` (`.verbs`, `.pattern(s)`, `.directions`, `.hasTrait`, `.where`, `.mapsTo`), `PatternBuilder` slot typers (`.text`, `.number`, `.ordinal`, `.time`, `.direction`, `.manner`, `.quotedText`, `.topic`, `.fromVocabulary`), `ScopeBuilder` + `scope()`, `SlotType`.
- **Actions:** `IAction`, `IActionContext`, `ValidationResult`, `CommandInput`, `CommandSemantics`, `EntityReference`, `ScopeLevel`/`IScopeResolver`.
- **Story vocabulary:** `IGrammarVocabularyProvider` (`.define`/`.extend` with `when` predicate).
- **Custom UI:** `IOChannel`, `ChannelProduceContext`, `IChannelRegistry`, `ClientCapabilities`, `WirePacket` family (`HelloPacket`/`CmgtPacket`/`TurnPacket`/`CommandPacket`), `MainEntry`.
- **Audio:** `ISound`, `IAudibilityEvent`, `VolumeTier`, `AudibilityTier`, `VOLUME_TIER_BUDGETS`.
- **Prompt:** `GamePrompt`, `DefaultPrompt`, `PROMPT_STATE_KEY`. **Events:** `IFEvents` const + `IFEventType`.
- Skip for the book: `ParserFactory`, `VocabularyRegistry`/`vocabularyRegistry`, `GrammarEngine`, `PatternCompiler`, `ScopeBuilderImpl`, all `parser-internals`.
