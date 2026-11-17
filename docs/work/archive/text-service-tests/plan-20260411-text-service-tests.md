# Session Plan: Text Service Test Coverage (Issue #91)

**Created**: 2026-04-11
**Overall scope**: The `@sharpee/text-service` package has 16 source files with real logic but zero
tests. This plan restores the test harness and writes comprehensive GREEN-grade tests for all six
testable units: the three pipeline stages (filter, sort, assemble), the decoration parser, the CLI
renderer, and the event handlers.
**Bounded contexts touched**: N/A — infrastructure/tooling work (text rendering pipeline)
**Key domain language**: N/A

---

## Background

The `"test": "vitest"` script was removed from `package.json` during a CI fix. The `vitest.config.ts`
and `devDependencies` entry for `vitest` are still present, so the harness needs only the script
restored, not reinstalled. The `tests/` directory exists but is empty.

All pure functions (filter, sort, decoration parser, assemble, renderer) can be tested without a
`LanguageProvider`. Handlers that resolve message IDs need a minimal stub that maps known IDs to
known strings.

### Stub `LanguageProvider` pattern

```typescript
function makeProvider(map: Record<string, string>): LanguageProvider {
  return {
    getMessage(id: string, params?: Record<string, unknown>): string {
      const template = map[id];
      if (!template) return id; // echoes the key = "not found"
      // Naive param substitution: {key} → value
      return template.replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ''));
    },
  };
}
```

---

## Phases

### Phase 1: Harness Restoration and Pipeline Stage Tests
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — infrastructure
- **Entry state**: `package.json` lacks `"test"` script; `tests/` directory is empty
- **Deliverable**:
  - `package.json` gains `"test": "vitest"` script
  - `tests/stages/filter.test.ts` — tests for `filterEvents`
  - `tests/stages/sort.test.ts` — tests for `sortEventsForProse` and `getChainMetadata`
  - `tests/stages/assemble.test.ts` — tests for `createBlock` and `extractValue`
  - All tests pass under `pnpm --filter '@sharpee/text-service' test`
- **Exit state**: CI-ready test harness with GREEN coverage of the three pipeline stages
- **Status**: CURRENT

#### filter.test.ts behaviour statements

**filterEvents**
- DOES: returns only events whose `type` does not start with `system.` or `platform.`
- WHEN: given a mixed array of system, platform, and domain events
- BECAUSE: prevents internal plumbing events from producing visible output
- REJECTS WHEN: N/A (pure filter — never throws, drops silently)

Specific cases:
- `system.tick` → dropped
- `platform.save_requested` → dropped
- `if.event.room.description` → passed through
- `game.message` → passed through
- Empty array → empty result
- All-system array → empty result

#### sort.test.ts behaviour statements

**sortEventsForProse**
- DOES: returns a new array with lifecycle events first, then events sorted by: implicit_take
  before others within same transaction, room.description before action.* within same transaction,
  action.* before non-action within same transaction, then ascending `_chainDepth`
- WHEN: given events with and without `_transactionId` / `_chainDepth` metadata
- BECAUSE: prose must read in the correct narrative order even when engine emits events in
  emission order
- REJECTS WHEN: N/A (pure sort — never throws)

Specific cases:
- Lifecycle events (`game.started`, `game.starting`) sort before all others regardless of
  transaction
- Events in different transactions preserve their relative order (stable sort guarantee)
- Within one transaction: `if.event.implicit_take` before `action.success`
- Within one transaction: `if.event.room.description` before `action.success`
- Within one transaction: `action.success` before `if.event.revealed`
- Chain depth ordering: depth-0 before depth-1 within same transaction
- Events without transaction ID maintain original order relative to each other

**getChainMetadata**
- DOES: returns `{ _transactionId, _chainDepth, _chainedFrom, _chainSourceId }` extracted from
  `event.data`
- WHEN: event data may or may not have chain metadata fields
- BECAUSE: provides typed extraction of chain metadata that other pipeline stages use
- REJECTS WHEN: N/A; returns undefined values when fields absent

#### assemble.test.ts behaviour statements

**createBlock**
- DOES: returns an `ITextBlock` with the given `key` and `content` array; uses decoration parser
  when decoration markers (`[`, `*`) are present in text, otherwise wraps text as a plain string
- WHEN: given a key string and text string
- BECAUSE: uniform block creation gateway for all handlers
- REJECTS WHEN: N/A

Specific cases:
- Plain text → `content: ['the text']`
- Text with `[item:sword]` → `content: ['', { type: 'item', content: ['sword'] }]` or similar
- Text with `*em*` → `content` contains `{ type: 'em', ... }`
- Empty string → `content: ['']` (hasDecorations returns false for empty)

**extractValue**
- DOES: returns the string representation of `value` when value is truthy; returns `null` when
  falsy
- WHEN: value may be a direct string, number, function returning a string, or falsy
- BECAUSE: handlers receive data fields that may be function-wrapped or direct values
- REJECTS WHEN: returns `null` if the wrapped function throws

Specific cases:
- String `'hello'` → `'hello'`
- Number `42` → `'42'`
- Function `() => 'world'` → `'world'`
- Function that throws → `null`
- `null` / `undefined` / `''` → `null`

---

### Phase 2: Decoration Parser Tests
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — text decoration syntax (ADR-091)
- **Entry state**: Phase 1 complete; test harness running
- **Deliverable**:
  - `tests/decoration-parser.test.ts` — comprehensive tests for `parseDecorations` and
    `hasDecorations`
  - All tests GREEN
- **Exit state**: Full coverage of the recursive decoration parser including nesting and escapes
- **Status**: PENDING

#### decoration-parser.test.ts behaviour statements

**parseDecorations**
- DOES: returns `TextContent[]` splitting the string at decoration markers; string segments become
  plain strings, bracket markers become `IDecoration` objects, asterisk markers become `em` or
  `strong` decorations; nested markers are parsed recursively
- WHEN: given any string; recursive call handles decoration content
- BECAUSE: handlers emit text with decoration syntax; the renderer needs a parsed structure
- REJECTS WHEN: N/A (malformed markers treated as literal text)

Specific cases:
- Empty string → `[]`
- Plain string `'hello'` → `['hello']`
- `'[item:sword]'` → `[{ type: 'item', content: ['sword'] }]`
- `'You take [item:the sword].'` → `['You take ', { type: 'item', ... }, '.']`
- `'*emphasis*'` → `[{ type: 'em', content: ['emphasis'] }]`
- `'**strong**'` → `[{ type: 'strong', content: ['strong'] }]`
- `'[room:[item:Treasure Room]]'` → nested decoration (room wrapping item)
- `'\\*not emphasis\\*'` → `['*not emphasis*']` (escape preserved)
- `'\\[not a bracket'` → `['[not a bracket']`
- Unclosed `[item:sword` → treated as literal text (no matching bracket)
- `'[nocolon]'` → treated as literal text

**hasDecorations**
- DOES: returns `true` if the string contains `*` or `[`; returns `false` otherwise
- WHEN: given any string (used as fast-path guard before calling `parseDecorations`)
- BECAUSE: avoids costly parser invocation for strings with no decoration markers
- REJECTS WHEN: N/A

Specific cases:
- `'hello'` → `false`
- `'[item:x]'` → `true`
- `'*em*'` → `true`
- `''` → `false`

---

### Phase 3: CLI Renderer Tests
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — text rendering layer
- **Entry state**: Phase 2 complete
- **Deliverable**:
  - `tests/cli-renderer.test.ts` — tests for `renderToString` and `renderStatusLine`
  - All tests GREEN
- **Exit state**: Renderer behaviour is verified including smart joining, ANSI output, status
  block filtering, and custom story colors
- **Status**: PENDING

#### cli-renderer.test.ts behaviour statements

**renderToString**
- DOES: returns a single string by rendering each non-status `ITextBlock` in order, joining
  consecutive blocks of the same `key` with a single `\n` and consecutive blocks of different
  `key` with `\n\n` (or the configured `blockSeparator`); strips blocks whose rendered text is
  whitespace-only; when `ansi: true`, wraps `room.name` blocks in bold+yellow ANSI and
  `action.blocked`/`error` blocks in red ANSI; excludes status blocks unless `includeStatus: true`
- WHEN: given any array of `ITextBlock` and optional options
- BECAUSE: CLI clients need a printable string with sane whitespace separation
- REJECTS WHEN: N/A

Specific cases:
- Empty array → `''`
- Single block → text content with no separator
- Two blocks with same key → joined with `\n`
- Two blocks with different keys → joined with `\n\n`
- Status block filtered by default; included when `includeStatus: true`
- `ansi: false` (default): `em` decoration renders as `*text*`, `strong` as `**text**`
- `ansi: true`: `em` → italic ANSI, `strong` → bold ANSI
- `ansi: true`, `room.name` block → bold+yellow wrapping
- `ansi: true`, `action.blocked` block → red wrapping
- `ansi: true`, custom story color hex → mapped to approximate ANSI code
- Whitespace-only blocks excluded from output

**renderStatusLine**
- DOES: returns a ` | `-joined string of status blocks in fixed order: room, score (prefixed with
  `Score: `), turns (prefixed with `Turns: `), then any custom status blocks in document order;
  blocks absent from the input are omitted from the result
- WHEN: given any array of `ITextBlock`; only status blocks (those matching `isStatusBlock`)
  are considered
- BECAUSE: status bar needs a single-line summary string
- REJECTS WHEN: N/A

Specific cases:
- No status blocks → `''`
- Only `status.room` → room name only
- All three standard blocks → `'Room | Score: 5 | Turns: 3'`
- Custom status block → appended after standard blocks with ` | ` separator
- Non-status blocks in input are ignored

---

### Phase 4: Event Handler Tests
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — event-to-block translation layer (ADR-096, ADR-107)
- **Entry state**: Phase 3 complete; stub `LanguageProvider` pattern established
- **Deliverable**:
  - `tests/handlers/room.test.ts`
  - `tests/handlers/game.test.ts`
  - `tests/handlers/revealed.test.ts`
  - `tests/handlers/generic.test.ts`
  - `tests/handlers/help.test.ts`
  - `tests/handlers/about.test.ts`
  - All tests GREEN
- **Exit state**: All six exported handler functions and the three inline handlers in `TextService`
  are covered by GREEN tests
- **Status**: PENDING

#### Handler test notes

All handler tests share a minimal setup:
```typescript
function makeEvent(type: string, data: unknown): ISemanticEvent {
  return { id: 'test-id', type, timestamp: 0, data } as ISemanticEvent;
}
```

**handleRoomDescription** (room.ts)
- DOES: returns `[]` when event data has no room info; returns `[room.name block, room.description
  block]` in verbose mode when both name and description are present; returns only
  `[room.description block]` in non-verbose mode; resolves `nameId` / `descriptionId` through
  language provider if provided, falling back to literal `name`/`description` fields
- WHEN: `verbose` flag in event data controls whether name block is emitted; ADR-107 dual-mode
  means ID fields take precedence over literal fields
- REJECTS WHEN: N/A (missing fields produce fewer blocks, never errors)

Specific cases:
- `verbose: false`, description literal → one `room.description` block
- `verbose: true`, name + description literals → two blocks
- `roomDescriptionId` resolves via provider → block content from provider
- `roomDescriptionId` not in provider → falls back to literal description
- No name or description → `[]`

**handleGameStarted** (game.ts)
- DOES: returns `[game.banner block]` with content resolved from `game.started.banner` template;
  returns `[]` when no story data or language provider returns the key unchanged
- WHEN: event data has `story` sub-object with `title`, `author`, `version`
- REJECTS WHEN: N/A

Specific cases:
- Full story data + provider with template → one banner block with substituted params
- No story data → `[]`
- Provider returns key unchanged → `[]`
- No language provider → `[]`

**handleRevealed** (revealed.ts)
- DOES: returns `[action.result block]` with direct `message`/`text` if present; otherwise
  tries language provider with event type as key; falls back to hardcoded
  `"Inside the {container} you see {items}."` when items array is non-empty
- WHEN: event type is `if.event.revealed`
- REJECTS WHEN: N/A

Specific cases:
- `data.message = 'Foo'` → block with `'Foo'`
- Provider resolves `if.event.revealed` → block with resolved text
- Provider returns key unchanged, items present → fallback sentence
- Provider returns key unchanged, items absent → `[]`

**handleGameMessage** (generic.ts)
- DOES: returns `[game.message block]` with text from language provider if `messageId` resolves,
  otherwise from `data.text` or `data.message`, otherwise `[]`
- WHEN: event type is `game.message`
- REJECTS WHEN: N/A

Specific cases:
- `messageId` resolves via provider → block with resolved text
- `messageId` not found, `data.text` present → block with literal text
- Neither messageId nor text → `[]`

**handleGenericEvent** (generic.ts)
- DOES: returns `[action.result block]` with `data.message` or `data.text` if present; otherwise
  tries provider with `event.type` as key; then tries `data.messageId`; returns `[]` if nothing
  resolves
- WHEN: fallback handler for unrouted events
- REJECTS WHEN: N/A; `data` missing → `[]`

Specific cases:
- `data.message` present → block with message text
- `data.text` present → block with text
- Provider resolves `event.type` → block with resolved text
- Provider resolves `data.messageId` → block with resolved text
- Nothing resolves → `[]`
- `data` is `null`/`undefined` → `[]`

**handleHelpDisplayed** (help.ts)
- DOES: always returns exactly one `help.text` block containing the hardcoded help text string
- WHEN: any event data (handler ignores it)
- REJECTS WHEN: N/A

**handleAboutDisplayed** (about.ts)
- DOES: returns `[about.text block]` with banner from language provider if resolved; falls back
  to `"{title}\nBy {author}"` format when provider returns key unchanged
- WHEN: event data may carry `params` with `title`, `author`, etc.
- REJECTS WHEN: N/A

---

### Phase 5: TextService Integration Tests
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — pipeline integration
- **Entry state**: Phase 4 complete; all unit tests GREEN
- **Deliverable**:
  - `tests/text-service.test.ts` — integration tests for `TextService.processTurn()`
    covering the full filter→sort→process pipeline and the three inline handlers
    (`handleImplicitTake`, `handleCommandFailed`, `handleClientQuery`)
  - All tests GREEN
- **Exit state**: End-to-end pipeline behaviour verified; Issue #91 acceptance criteria met
- **Status**: PENDING

#### text-service.test.ts behaviour statements

**TextService.processTurn (full pipeline)**
- DOES: returns `[]` for empty input; filters `system.*` and `platform.*` events before routing;
  sorts lifecycle events first; routes each event to the correct handler; concatenates all
  returned blocks in order
- WHEN: given any array of `ISemanticEvent`
- REJECTS WHEN: N/A (individual handler failures return `[]`, not throws)

**handleImplicitTake (inline)**
- DOES: returns one `action.result` block with `"(first taking the {itemName})"`, using
  `"something"` when `itemName` is absent
- WHEN: event type is `if.event.implicit_take`

**handleCommandFailed (inline)**
- DOES: returns one `error` block; message from provider via `core.entity_not_found` when reason
  includes `ENTITY_NOT_FOUND`; via `core.command_not_understood` when reason includes `NO_MATCH`;
  via `core.command_failed` otherwise; falls back to hardcoded English if provider absent
- WHEN: event type is `command.failed`

**handleClientQuery (inline)**
- DOES: returns `[]` when `data.source !== 'disambiguation'`; when source is `disambiguation`,
  formats candidates with Oxford comma style and returns one block with the disambiguation prompt
- WHEN: event type is `client.query`

Oxford comma cases:
- 0 candidates → `''` in options
- 1 candidate → `'the X'`
- 2 candidates → `'the X or the Y'`
- 3+ candidates → `'the X, the Y, or the Z'`

**tryProcessDomainEventMessage (via processTurn)**
- DOES: when `data.messageId` present and provider resolves it, returns a block with the resolved
  message; when provider echoes the key, falls back to `data.message`/`data.text`; skips
  `client.query` events regardless of messageId presence
- WHEN: any event with `data.messageId`

---

## Acceptance Checklist

- [ ] `package.json` `scripts` has `"test": "vitest"` restored
- [ ] `pnpm --filter '@sharpee/text-service' test` exits 0
- [ ] All tests in Phases 1–5 grade GREEN (assert on actual output values)
- [ ] No mock-only assertions (handlers are pure enough to test without mocks)
- [ ] `filterEvents`, `sortEventsForProse`, `parseDecorations`, `hasDecorations`,
      `createBlock`, `extractValue`, `renderToString`, `renderStatusLine` covered
- [ ] All six named handlers covered
- [ ] Three inline `TextService` handlers covered via integration tests

## References

- GitHub Issue #91
- ADR-091: Text Decorations
- ADR-094: Event Chaining
- ADR-096: Text Service Architecture
- ADR-097: IGameEvent Deprecation (dual-mode events)
- ADR-107: Dual-mode message ID / literal text
