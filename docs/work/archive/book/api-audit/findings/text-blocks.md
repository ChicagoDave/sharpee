# Findings — @sharpee/text-blocks

## Author-relevance
Extension-facing / wire-contract: pure type-only package defining the structured-text output contract between the prose pipeline and clients (CLI, browser). The book's programmer layer references it to explain how story output is shaped (`ITextBlock` channels, `IDecoration` for `[name:content]` styling) and consumed by custom renderers. Authors rarely construct these directly but read them constantly when writing client/render code.

## Naming
Clean and consistent:
- `I`-prefix used uniformly on the interfaces (`IDecoration`, `ITextBlock`) — matches core/world-model convention (unlike lang-en-us/parser, which drop it). This is the one package in the trio that follows the platform `I`-prefix style.
- `TextContent` type (union) sensibly unprefixed.
- Const naming consistent: `CORE_BLOCK_KEYS`, `BLOCK_KEY_PREFIXES` (SCREAMING_SNAKE); guard functions camelCase (`isDecoration`, `isTextBlock`, `hasKeyPrefix`...). No abbreviations.
- One alias: `CORE_BLOCK_KEYS` is also exported as `BLOCK_KEYS`. Two public names for one value is a minor smell, but harmless.

## Should-be-internal
None obvious. The whole package is a deliberately small, public contract (12 symbols); everything exported is part of the wire/render boundary.

## API shape
Strong. No `any` anywhere. The one `unknown` is correct and idiomatic: `isTextBlock(value: unknown): value is ITextBlock` — proper use for a runtime type guard. All interfaces use `readonly` fields and `ReadonlyArray` (good immutability discipline for a wire type). Type guards have explicit predicate return types. `extractPlainText(content: ReadonlyArray<TextContent>): string` — clean. No loose types, no missing returns, no duplicate concepts.

## Documentation (TSDoc)
Excellent — effectively 100%. Package-level `@packageDocumentation` with ADR links (ADR-091/096/174/183); every interface, field, const, and guard has TSDoc, most with `@example` blocks (plain vs decorated content, nested decorations, status blocks, plain-text extraction). The `tight` and `className` fields on `ITextBlock` and the `value` field on `IDecoration` carry detailed invariant notes. This is the best-documented package of the three.

## Book highlights
- `ITextBlock` — the channel/key model (FyreVM-style routing: `room.name`, `action.result`, `status.score`, story-defined keys); `tight` and `className` fields for layout/semantic styling.
- `IDecoration` — the `sharpee-`-prefixed span+class decoration model (ADR-174), `value` for parameterized decorations (ADR-183, e.g. `sharpee-center` width, `sharpee-indent` level).
- `TextContent` union — plain string vs decoration, with nesting.
- `CORE_BLOCK_KEYS` / `BLOCK_KEY_PREFIXES` — the platform's reserved channel keys and prefixes.
- Guards: `isDecoration`, `isTextBlock`, `hasKeyPrefix`, `isStatusBlock`/`isRoomBlock`/`isActionBlock`, `extractPlainText` — the toolkit a custom renderer uses to route and flatten output.
