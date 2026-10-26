# lang-en-us — Claude Instructions

> Scoped to `packages/lang-en-us/`. See the root `CLAUDE.md` for project-wide policy.

## Language Layer Separation (lang side)

**All user-facing text lives here.** Code in engine/stdlib/world-model emits semantic events with message IDs; this package maps those IDs to actual English prose.

- lang-en-us provides text via message ID → string/function mapping.
- stdlib defines the message IDs in `*-messages.ts` files; never hardcodes English.
- Other language implementations follow the same pattern.

## Entity-Valued Template Parameters (ADR-158)

Pass `entityInfoFrom(entity)`, not `entity.name`. Bare strings strip the `nounType`/`properName`/`article` metadata the formatter chain (`{the:cap:item}`, `{a:item}`, `{some:item}`) needs to choose the correct article. Use the formatter chain at sentence-start positions in templates.

## Parser vs Language Layer

Patterns in `lang-en-us` action files are for **documentation/help**, not parsing. Grammar lives in `parser-en-us`. See `packages/parser-en-us/CLAUDE.md` for grammar conventions.

`data/verbs.ts` is different from the per-action `patterns` lists: it feeds the parser's **verb classification** — comma-chained command splitting ("take sword, drop sword") and word lookup for candidates/failures. It is NOT what makes grammar literals parse (verified 2026-07-20: `restart` parsed with no entry), but a grammar action missing here silently breaks chaining for its verbs. The `grammar-vocabulary-sync` test in parser-en-us enforces that every core-grammar action id has an entry. The parser registers these into its own `VocabularyRegistry`, one per parser instance (ADR-387 D4); there is no shared registry to clear.

## The One Word Table (ADR-387)

**`data/words.ts` is the one home of every English word the parser, the matcher and the validator read**: articles, determiners (each possessive with whose it is), pronouns, self words, all and except words, list separators, manner adverbs, name stopwords, the direction table (ids are world-model's `Direction` constants; words and abbreviations exactly as the standard grammar accepts them) and the number words. `EnglishLanguageProvider` is the only reader of the file; every other package asks the provider (`getDeterminers`, `getDirections`, `getListSeparators`, `getMannerAdverbs`, `getLanguageWords`, `parseCardinal`, …), and world-model receives its words (`selfWords`, `nameStopwords`) from the engine at install. `tests/one-home.test.ts` fails on a second declaration of any list anywhere under `packages/*/src`, and on any lang-en-us import in parser-en-us. To change a word, change it here and nowhere else.

**The parser's seat questions and failure sentences are templates here too** (`language-provider.ts`, core messages): `parser.error.noInput`, `unknownVerb` (+ `.noVerb`), `missingObject` (+ `.noVerb`), `missingIndirect` (+ `.noVerb`), `entityNotFound` (+ `.noNoun`), `notUnderstood`, and the three `scopeViolation.*` ids. The parser hands the engine an id and its bindings (`verb`, `noun`, `slot`); a capitalised placeholder (`{Verb}`) takes the capitalised value, as `{You}` does beside `{you}`. `tests/parser-error-templates.test.ts` pins the wording.
