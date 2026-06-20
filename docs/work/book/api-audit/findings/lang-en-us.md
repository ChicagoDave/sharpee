# Findings — @sharpee/lang-en-us

## Author-relevance
Author-facing and extension-facing: messages, formatters, perspective/pronouns, and per-action language tables. The book's Part V "Words" draws on `EnglishLanguageProvider` (message resolution, custom formatters, custom messages/help), the formatter chain (`{a:item}`, `{the:cap:item}`, lists), and perspective placeholders.

## Naming
Mostly clean, with a few flags:
- Abbreviation: `EnglishGrammarUtils.getIndefiniteArticle` is fine, but `abbreviations` const (re-exports) and `expandAbbreviation()` are intentional domain terms, not violations.
- `I`-prefix inconsistency: this package's public interfaces (`EnglishToken`, `EnglishVerbForms`, `EnglishNounProperties`, `EnglishPrepositionProperties`, `FormatterContext`, `EntityInfo`, `NarrativeContext`, `PronounSet`, `VerbDefinition`) carry NO `I` prefix, whereas the `@sharpee/world-model`/`core` interfaces they interoperate with mostly do (`IParsedCommand`, `IEntity`). Mixed convention across the boundary; within this package it's internally consistent (no `I` prefix).
- Casing/suffix: `*Formatter` const suffix is consistent (`aFormatter`, `theFormatter`, `listFormatter`...). `*Language` const suffix (`takingLanguage`, `npcLanguage`, `conversationLanguage`, `standardActionLanguage`) is consistent.
- Symbol-name collisions across packages (not abbreviations, but author-confusing): `IFActions` is also exported by `@sharpee/stdlib`; `PRONOUNS` is exported here AND by `@sharpee/world-model` (and a near-duplicate `PronounSet` interface lives in three packages — here, world-model, parser).

## Should-be-internal
- The per-action language tables exported individually via `export *` from `./actions`, `./npc`, `./perspective` — e.g. `takingLanguage`, `droppingLanguage`, `npcLanguage`, `conversationLanguage`, `influenceLanguage`, `propagationLanguage`, `systemMessages`, `failureMessages`, `parserErrors`, `englishVerbs`, `englishWords`, `cardinalNumbers`, `ordinalNumbers`, `irregularPlurals`, `directionMap`, `ActionFailureReason`. These are the provider's data inputs; an author overrides text through `addMessage()`/`registerFormatter()`, not by importing the raw tables. 35 of 61 symbols are `const` data — the surface is dominated by implementation data that leaks because `index.ts` uses wildcard re-exports.
- `EnglishPartsOfSpeech` / `EnglishGrammarPatterns` / `EnglishGrammarUtils` — internal lexer/parser support; unlikely author API (grammar authoring lives in parser-en-us).

## API shape
- `getMessage(messageId: string, params?: Record<string, any>)` — `any` in the params value type. The newer `formatMessage()` in the formatter registry is precisely typed (`string | number | boolean | string[] | EntityInfo | EntityInfo[]`); `getMessage` was not tightened to match, so the primary public message API is looser than its own helper.
- `getEntityName(entity: any): string` — `any` parameter on a public method.
- `registerFormatter(name, formatter: (value: any, context) => string)` — `any` in the callback value, where the `Formatter` type itself is well-typed; the registration signature is looser than the type it stores.
- `setNarrativeSettings(settings: NarrativeContext)` getter is `getNarrativeContext()` — verb/noun mismatch (set "Settings" / get "Context") for the same concept.
- Return types are present throughout (good). `getActionMessages` returns `Map | null` while `getActionPatterns`/`getActionHelp` return `T | undefined` — inconsistent absent-value convention across sibling getters.

## Documentation (TSDoc)
High on the public class: `EnglishLanguageProvider` and nearly every method have TSDoc with `@param`/`@returns` and ADR references. `sound-messages.ts`, `placeholder-resolver.ts`, formatter types and registry are well-documented. The per-action `*Language` data consts and the `data/words`/`data/verbs` tables are essentially undocumented (object-shape only). Rough share with a doc comment: ~70% of the *intended* public surface (provider + formatters + perspective + sound); near 0% on the leaked data tables.

## Book highlights
- `EnglishLanguageProvider`: `getMessage`, `hasMessage`, `addMessage`, `addActionHelp`, `addActionPatterns`, `registerFormatter`, `setEntityLookup`, `setNarrativeSettings`, `getActionHelp`, `getSupportedActions` — the message-resolution surface authors touch.
- Formatter chain: `createFormatterRegistry`, `formatMessage`, `applyFormatters`, `parsePlaceholder`, and the formatter set (`aFormatter`, `theFormatter`, `someFormatter`, `yourFormatter`, `listFormatter`, `orListFormatter`, `commaListFormatter`, `countFormatter`, `capFormatter`, `titleFormatter`, etc.); types `Formatter`, `FormatterRegistry`, `FormatterContext`, `EntityInfo` (ADR-095/158).
- Perspective: `conjugateVerb`, `resolvePerspectivePlaceholders`, `NarrativeContext`, `Perspective`, `PronounSet`, `PRONOUNS`, `DEFAULT_NARRATIVE_CONTEXT` (ADR-089).
- Sound prose: `soundMessages`, `soundMessageId`, `soundFallbackMessageId`, `SoundMessageId`, `RenderableAudibilityTier` (ADR-172).
