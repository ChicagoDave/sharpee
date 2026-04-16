# Sharpee Text Service Specification

**Subsystem**: Text rendering — stateless event → TextBlock pipeline
**Prerequisites**: `01-data-model.md` (semantic event envelope), `05-engine.md` (turn cycle), `06-stdlib.md` (message-ID protocol), `07-language-layer.md` (template source)
**Version**: 1 (derived from code as of 2026-04-16)

---

## Purpose

The text service is the final stage of the turn cycle. It consumes the turn's semantic events and produces **structured text output** (`TextBlock[]`) that a client renders. It is **locale-neutral** — it delegates all template resolution to the `LanguageProvider` (see `07-language-layer.md`) and knows nothing about English specifically.

Responsibilities:

1. **Event → TextBlock transformation.** Turn a list of semantic events into an ordered list of structured blocks.
2. **Delegation to language provider.** Every message-ID lookup goes through the installed `LanguageProvider.getMessage`.
3. **Decoration parsing.** Convert inline decoration syntax in resolved templates (`[item:sword]`, `*em*`, `**strong**`) to structured `Decoration` records.
4. **Channel routing.** Assign each block a key (channel) so clients can route to UI regions.
5. **Event sorting for prose.** Within a transaction (ADR-094 chain metadata), order events so primary results precede consequences.

---

## Invariants

1. **Stateless transform.** `processTurn(events)` is a pure function of `events + languageProvider`. It MUST NOT mutate the world.
2. **Events carry IDs, not prose.** Upstream code (actions, plugins, engine) never emits English. All prose resolution happens here.
3. **Missing message IDs produce visible errors.** If a `messageId` does not resolve, the service emits an `error` block the player sees. Silent drops are not acceptable.
4. **Block keys are stable channels.** Core keys (`room.name`, `room.description`, `action.result`, etc.) MUST be emitted for standard output so clients can route deterministically.
5. **Decorations are structural.** Decorations describe *semantic type* (this is a room name, this is an item), not display (this is italicised). Clients decide presentation.
6. **Language provider is the sole template source.** The service does not carry its own templates; it always asks the provider.
7. **Block ordering is stable across runs.** Given the same event list and provider, the output block sequence is identical.

---

## Public Contract

### TextService interface

```
interface TextService {
    processTurn(events: List<SemanticEvent>) -> List<TextBlock>
}
```

The engine calls `processTurn` after a turn completes (step 10 of the turn cycle in `05-engine.md`). The input is the full, ordered event list for the turn (including chained events). The output is the sequence of `TextBlock`s the client will render.

A concrete service is constructed with a language provider:

```
createTextService(languageProvider) -> TextService
```

### TextBlock

```
TextBlock {
    key:     String                       // channel (e.g., "room.name")
    content: List<TextContent>            // plain strings and/or decorations
}

TextContent = String | Decoration

Decoration {
    type:    String                       // e.g., "item", "em", "photopia.red"
    content: List<TextContent>            // nested
}
```

Blocks are emitted in rendering order. A client that only renders the "main narrative" channel filters by key prefix; a richer client routes status blocks to the status bar, prompts to the input line, etc.

### Core block keys

```
CORE_BLOCK_KEYS = {
    ROOM_NAME:        "room.name"
    ROOM_DESCRIPTION: "room.description"
    ROOM_CONTENTS:    "room.contents"
    ACTION_RESULT:    "action.result"
    ACTION_BLOCKED:   "action.blocked"
    STATUS_ROOM:      "status.room"
    STATUS_SCORE:     "status.score"
    STATUS_TURNS:     "status.turns"
    ERROR:            "error"
    PROMPT:           "prompt"
    GAME_MESSAGE:     "game.message"
    GAME_BANNER:      "game.banner"
}
```

Block keys are dotted namespaced strings. Client routing by prefix:

- `room.*` → main narrative
- `action.*` → main narrative (after room output)
- `status.*` → status bar / header
- `error` → error region
- `prompt` → input prompt
- `game.*` → main narrative (banners, messages)
- Story-defined keys (e.g., `dungeo.thief.taunt`) → main narrative unless the client handles them

### Core decoration types

```
CORE_DECORATION_TYPES = {
    EM:            "em"              // emphasis (typically italic)
    STRONG:        "strong"          // strong emphasis (typically bold)
    ITEM:          "item"            // item / object name
    ROOM:          "room"            // room / location name
    NPC:           "npc"             // character name
    COMMAND:       "command"         // suggested command
    DIRECTION:     "direction"       // exit direction
    UNDERLINE:     "underline"
    STRIKETHROUGH: "strikethrough"
    SUPER:         "super"
    SUB:           "sub"
}
```

Decorations are nestable. Story-defined types use a namespaced string (`photopia.red`, `dungeo.thief`). Clients that do not understand a decoration type SHOULD render its content as plain text (strip the decoration) rather than fail.

### Decoration inline syntax (ADR-091)

Templates embed decorations with a compact inline syntax. The decoration parser converts:

| Syntax                      | Output                                                |
|-----------------------------|-------------------------------------------------------|
| `[item:brass lantern]`      | `{ type: "item", content: ["brass lantern"] }`        |
| `[room:West of House]`      | `{ type: "room", content: ["West of House"] }`        |
| `*carefully*`               | `{ type: "em", content: ["carefully"] }`              |
| `**important**`             | `{ type: "strong", content: ["important"] }`          |
| `[photopia.red:The light]`  | `{ type: "photopia.red", content: ["The light"] }`    |
| `\*literal\*`               | `"*literal*"` — escaped                               |
| Nested: `[item:[em:glowing] lantern]` | Nested decoration                             |

---

## Processing Pipeline

```
events: List<SemanticEvent>
   │
   ├─ 1. Filter
   │     Remove events that should not produce text (system.*, internal events).
   │
   ├─ 2. Sort for prose (ADR-094 chain metadata)
   │     Within each transaction, order:
   │       1. Primary action event first
   │       2. Then chained consequences by _chainDepth (ascending)
   │     Stable sort preserves cross-transaction order.
   │
   ├─ 3. Process / route to handler
   │     For each event:
   │       a) If event.data.messageId is set (ADR-097):
   │          - Resolve via languageProvider.getMessage(messageId, params)
   │          - Parse decorations; emit TextBlock with key derived from event
   │          - If resolution fails, emit an `error` block (invariant 3)
   │       b) Else: route to a specialised handler by event type.
   │       c) Handler returns List<TextBlock>.
   │
   ├─ 4. Assemble
   │     Concatenate handler outputs in order. Produce final List<TextBlock>.
   │
   └─ blocks: List<TextBlock>
```

Each stage is a pure function of its input; the service orchestrates them.

### Specialised event handlers

The text service ships a small set of handlers for events that don't follow the simple messageId pattern:

| Event type                   | Handler                                                       |
|------------------------------|---------------------------------------------------------------|
| `if.event.room.description`  | Emits `room.name` + `room.description` + `room.contents` blocks |
| `if.event.revealed`          | Emits "Inside you see …" or similar                            |
| `if.event.implicit_take`     | Emits "(first taking the X)"                                   |
| `command.failed`             | Emits `error` block with parse / validation failure text      |
| `client.query`               | Emits disambiguation prompt formatted via `formatList`         |
| `game.message`               | Emits `game.message` block                                    |

### Generic fallback handler

Any event whose `type` matches a template key in the language provider is rendered using the event type as the message ID and `event.data` as template params. This makes the text service extensible without code changes for many story events: add a template for `dungeo.thief.appears`, emit an event of that type, and it renders.

### Block-key assignment

When an event with `messageId` is resolved, the block key comes from:

1. `event.data.blockKey` if explicitly set by the action, OR
2. A convention mapping event type → block key:
   - `if.event.opened / closed / locked / …` → `action.result`
   - `*_blocked` → `action.blocked`
   - `if.event.room.*` → `room.*`
   - `game.*` → `game.message` or `game.banner`
3. Default `action.result` if no mapping applies.

Stories MAY emit events with arbitrary `blockKey` values to route to custom channels.

---

## CLI Rendering (reference)

A reference CLI renderer converts `List<TextBlock>` to a string for terminal output. Provided as an example; any renderer over `TextBlock[]` is acceptable.

```
interface CLIRenderOptions {
    ansi?:            Boolean         // emit ANSI color/styling
    blockSeparator?:  String          // default "\n\n"
    colors?:          Map<DecorationType, AnsiColor>
    includeStatus?:   Boolean         // include status.* blocks
}

renderToString(blocks, options?) -> String
renderStatusLine(blocks, options?) -> String   // single line for status bar
```

Smart joining: consecutive blocks of the same key receive a single newline; different keys receive a double newline. This keeps related output together while separating distinct sections.

Web / TUI / desktop clients provide their own renderers.

---

## Event / Command Catalog

The text service emits no semantic events. It consumes:

**Events with `event.data.messageId`** (the primary pattern, ADR-097):
- All `if.event.*` events from stdlib actions
- All `message.success` / `message.failure` / `message.info` / `message.warning` / `message.debug` events

**Events with specialised handlers**:
- `if.event.room.description`, `if.event.revealed`, `if.event.implicit_take`
- `command.failed`, `client.query`, `game.message`

**Generic fallback**: any event whose `type` has a template in the language provider.

See `06-stdlib.md` for the full stdlib event catalogue, and `01-data-model.md` for platform / lifecycle events.

---

## Extension Points

1. **Custom block keys.** Actions and handlers MAY emit blocks under story-namespaced keys (`dungeo.thief.taunt`). Clients decide how to route.
2. **Custom decoration types.** Story-namespaced (`photopia.red`). Clients that don't know the type strip it.
3. **Alternative renderers.** Any code that consumes `TextBlock[]` — CLI, browser, TUI, audio, screen-reader — is a renderer.
4. **Story-registered event templates.** Register a message ID matching an event type (e.g., `dungeo.thief.appears`) in the language provider; the generic fallback renders emitted events of that type.

All locale-specific extension (templates, formatters, vocabulary, narrative) happens in the **language layer** (see `07-language-layer.md`), not here.

---

## Mandatory vs Optional

| Feature                                       | Required | Notes |
|-----------------------------------------------|----------|-------|
| `processTurn(events) -> List<TextBlock>`       | **Required** |       |
| Stateless transform                            | **Required** |       |
| Core block keys                                | **Required** | Clients depend on these |
| Story-namespaced block keys                    | Recommended |       |
| Core decoration types                          | Recommended | Clients may ignore, but renderers expect them |
| Decoration parsing (`[type:content]`)          | **Required** |       |
| `*em*` / `**strong**` shorthand                 | Recommended |       |
| Nested decorations                             | Recommended |       |
| Event sort by chain depth                      | Recommended | Needed for correct prose order with ADR-094 chains |
| `command.failed` / `client.query` handlers     | **Required** |       |
| Room description handler (`if.event.room.description`) | **Required** |       |
| `if.event.implicit_take` handler               | Recommended |       |
| `if.event.revealed` handler                    | Recommended |       |
| Generic event → template-key fallback          | Recommended | Enables low-friction story events |
| Visible error on unresolved message ID          | **Required** | No silent drops |
| CLI renderer                                   | Optional | Reference only; any renderer works |
| Status-bar blocks (`status.*`)                  | Recommended |       |
| `game.banner` for opening / end-of-game         | Recommended |       |

---

## Implementation Notes

**ADR-029 (Superseded by ADR-096)** — Original text-service architecture.

**ADR-091 (Accepted)** — Text decorations. Inline `[type:content]` syntax and `*em*` / `**strong**` shorthand. Decoration types are open strings.

**ADR-094 (Accepted)** — Event chaining. Chain metadata (`_transactionId`, `_chainDepth`, `_chainedFrom`, `_chainSourceId`) is set by the event processor and used by the sort stage to order events within a transaction.

**ADR-096 (Accepted)** — Text service architecture. Stateless transformer; 4-stage pipeline (filter → sort → process → assemble); FyreVM-style channel model. This is the current canonical design.

**ADR-097 (Accepted)** — Domain events carry `messageId` directly, eliminating the earlier pattern of paired `action.success` / `action.error` events. Most stdlib events follow this shape.

**ADR-133 (Accepted)** — Structured text output. `TurnResult.blocks` is `List<TextBlock>`.

**Locale neutrality.** The text service has no locale-specific code. All language decisions — template text, article selection, pluralisation, perspective, narrative tense — live in the language layer (see `07-language-layer.md`). A conforming text service MUST NOT hard-code any natural-language strings; even "Inside you see" for `if.event.revealed` is resolved via a message ID.

**Decoration type vs text style**. Decorations describe semantic types (`item`, `room`, `npc`, `em`) — not visual styles (italic, red). Clients map semantic types to visual styles. A client targeting visual-impairment or audio output MAY render all types as plain text without losing game information.

**Dual-mode rendering** (ADR-107, partial). The text service resolves message IDs when present and uses literal text directly when the language provider returns raw strings — supporting both templated and literal rendering.

---

## Glossary (local)

- **TextBlock** — A structured chunk of output with a channel key and content.
- **Channel / block key** — Dotted namespaced string identifying a UI region.
- **Decoration** — Semantic annotation wrapping a substring of content.
- **Pipeline** — The filter → sort → process → assemble sequence inside the service.
- **Handler** — Function that converts a specific event type into text blocks.
- **Generic fallback** — Handler that treats event type as message ID for events without specialised handlers.

A full glossary is in `glossary.md`. The template / formatter / narrative-context vocabulary lives in `07-language-layer.md`.

---

*End of 08-text-service.md*
