# Findings — @sharpee/parser-en-us

## Author-relevance
Extension-facing, with one strongly author-facing seam. The book's Part V "Words" uses the grammar-extension entry point: `EnglishParser.getStoryGrammar()` returns the `GrammarBuilder` stories use for `.define(...)`/`.forAction(...)`. Pronoun resolution and parse-failure analysis are mostly platform-internal but worth a sidebar.

## Naming
Mostly clean:
- Aliased exports: `EnglishParser` is also exported as `Parser`, and `@sharpee/if-domain`'s `Parser` is re-exported as `ParserInterface`. So this package's public surface has BOTH a class named `Parser` (the impl) and a type named `ParserInterface` (the contract) — the inverted convention (impl gets the clean name, interface gets the suffix) is the reverse of the `I`-prefix style used in core/world-model. Author-confusing alongside `@sharpee/if-domain`'s own `Parser` interface.
- `RECOGNIZED_PRONOUNS` / `RecognizedPronoun` / `isRecognizedPronoun` — consistent SCREAMING_SNAKE const + PascalCase type + camelCase guard trio. Clean.
- `INANIMATE_IT` / `INANIMATE_THEM` — clear, no abbreviations.
- No abbreviations elsewhere. `metadata` const is generic but acceptable.

## Should-be-internal
- `getPronounContextManager()` / `setPronounContextManager()` — module-global singleton accessors documented as "used by slot consumers" / "called by parser". These are internal wiring between the parser and its slot-consumer modules, not author API.
- `PronounContextManager` class — its own TSDoc says `getContext()` and `getPronounContextManager()` are "for testing/debugging". The whole class reads as engine-internal pronoun bookkeeping; authors don't construct or drive it.
- `analyzeBestFailure`, `PartialMatchFailure`, `SlotFailure`, `MatchFailureReason` — parse-error diagnostics consumed internally to build error messages; unlikely to be a public author surface.
- `EntityReference` (parser's own) — internal pronoun-context record; note it collides by name with `@sharpee/if-domain`'s `EntityReference` and the one re-exported here transitively.

## API shape
- `setWorldContext(world: any, actorId: string, currentLocation: string)` — `any` for the world model on a public method (the rest of the parser carefully imports concrete types from world-model, so this is an outlier).
- `setPlatformEventEmitter(emitter: ((event: any) => void) | undefined)` — `any` event payload.
- `setDebugCallback` uses typed `ISystemEvent`, but `setPlatformEventEmitter` uses `any` — inconsistent event typing across two sibling setters.
- `registerGrammar(...)` is marked `@deprecated` yet remains exported on the public class; the book should point only at `getStoryGrammar()`.
- `addVerb(actionId, verbs, pattern?, prepositions?)` takes a stringly-typed `pattern?: string` (grammar pattern name) rather than the `EnglishGrammarPatternName` union that exists in lang-en-us — loose where a named type is available.
- `parse()` returns `CommandResult<IParsedCommand, CoreParseError>` (good, typed Result). Return types present throughout.
- `updateFromCommand(command, world: any, turnNumber)` and `registerEntity(..., world: any, ...)` on `PronounContextManager` — `any` world params.

## Documentation (TSDoc)
High. `EnglishParser` and nearly every public method carry TSDoc with `@param`/ADR references and worked examples (chaining, pronouns). `parse-failure.ts` and `pronoun-context.ts` interfaces are field-documented. Rough share with a doc comment: ~85% of public symbols. Notable: `metadata` const undocumented beyond a one-line "Package metadata".

## Book highlights
- `EnglishParser` (exported as `Parser`): `getStoryGrammar()` is THE grammar-extension entry point (ADR-084/087); also `addVerb`, `addNoun`, `addAdjective`, `addPreposition`, `registerVerbs`, `registerVocabulary` for vocabulary extension. `parse` / `parseChain` for the parse contract; `parseChain` doc explains period/comma chaining well.
- `ParserInterface` (the `@sharpee/if-domain` `Parser` contract) — the type a story-side parser is written against.
- Pronoun sidebar: `RECOGNIZED_PRONOUNS`, `isRecognizedPronoun`, `INANIMATE_IT`/`INANIMATE_THEM`, `PronounContext` (ADR-089) — explains "it"/"them"/"her" resolution.
- Error-message sidebar: `analyzeBestFailure` + `PartialMatchFailure`/`SlotFailure` show how partial-match diagnostics become player-facing error text.
