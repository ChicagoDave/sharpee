# Text Service Assessment: Architecture vs. Reality

**Date**: 2026-02-08
**Scope**: TextService pipeline, ITextBlock rendering, HTML construction for web/Zifmia clients

## Executive Summary

The text service has a well-designed architecture (ADR-096) inspired by FyreVM channel I/O.
The type system (`ITextBlock`, `IDecoration`, `TextContent`) is clean, extensible, and
well-documented. The TextService pipeline (filter → sort → route → assemble) is correct.

**The problem is at the boundary.** The engine destroys the structured `ITextBlock[]` output by
flattening it to a plain string before emitting to clients. This single shortcut invalidates
the entire decoration system for web clients and forces both the browser and Zifmia clients into
crude string-to-HTML conversion that loses all semantic information.

### Severity Rating

| Area | Quality | Notes |
|------|---------|-------|
| `@sharpee/text-blocks` types | Excellent | Clean, extensible, well-documented |
| `@sharpee/text-service` pipeline | Good | Correct filter/sort/route/assemble |
| Decoration parser | Good | Handles nesting, escapes, edge cases |
| CLI renderer (`renderToString`) | Good | Does what it's supposed to (ANSI output) |
| **Engine → Client boundary** | **Poor** | Flattens ITextBlock[] to string, discards structure |
| **Browser client rendering** | **Minimal** | `p.textContent = text` — no formatting at all |
| **Zifmia client rendering** | **Poor** | `dangerouslySetInnerHTML` with naive formatter |
| `text:channel` event | Dead code | Declared in type, never emitted |

---

## Part 1: What's Working Well

### 1.1 The Type System (`@sharpee/text-blocks`)

The `ITextBlock` / `IDecoration` / `TextContent` hierarchy is well-designed:

```
ITextBlock { key: string, content: TextContent[] }
  └─ TextContent = string | IDecoration
       └─ IDecoration { type: string, content: TextContent[] }  // recursive
```

- **Open string `type`** allows story extensions (`photopia.red`, `dungeo.thief`)
- **Recursive nesting** supports `[item:*glowing* lantern]`
- **Channel keys** (`room.name`, `action.result`, `status.score`) enable smart routing
- **Pure interfaces package** with zero runtime dependencies

### 1.2 The TextService Pipeline

The four-stage pipeline in `text-service.ts` is clean:

1. **Filter** (`filter.ts`): Removes `system.*` and `platform.*` events — 30 lines, clear
2. **Sort** (`sort.ts`): Orders events for prose — lifecycle → implicit take → room → action → chain depth
3. **Route** (`text-service.ts:110-162`): Pattern-match on event type → handler
4. **Assemble** (`assemble.ts`): `createBlock(key, text)` → parse decorations → `ITextBlock`

The ADR-097 migration path (domain events carrying `messageId` directly) is correctly
implemented alongside the legacy `action.success` pattern.

### 1.3 The Decoration Parser

`decoration-parser.ts` handles:
- `[type:content]` with balanced bracket matching and nesting
- `**strong**` before `*emphasis*` (correct precedence)
- Escape sequences (`\*`, `\[`, `\]`, `\\`)
- Quick-check optimization (`hasDecorations` uses regex before full parse)

### 1.4 The CLI Renderer

`cli-renderer.ts` is the correct renderer for terminal output:
- Maps decoration types to ANSI codes (item=cyan, room=yellow, npc=magenta)
- Smart block joining (single `\n` between same-key, double `\n` between different)
- Story-defined hex colors approximated to nearest ANSI color
- Block-level styling (room.name bold+yellow, errors red)

---

## Part 2: The Core Problem — The String Bottleneck

### 2.1 ADR-096 Says One Thing, The Code Does Another

**What ADR-096 specifies** (line 282):
```typescript
// Inside Engine (simplified)
const blocks = textService.processTurn(events);
this.emit('turn-complete', blocks);
```

**What the engine actually does** (`game-engine.ts:684-687`):
```typescript
const blocks = this.textService.processTurn(turnEvents);
const output = renderToString(blocks);    // ← FLATTENED HERE
if (output) {
  this.emit('text:output', output, turn); // ← STRING, not ITextBlock[]
}
```

The engine builds the full `ITextBlock[]` tree with semantic decorations, channel keys, and
structured content — then immediately destroys it by calling `renderToString()` (the CLI
renderer) and emitting a flat string.

**This is the classic "get it done" shortcut.** It got text on screen quickly but bypasses the
entire rendering architecture.

### 2.2 What Gets Lost

When `renderToString()` flattens the blocks (with `ansi: false`, the default):

| Had (ITextBlock) | Gets (string) |
|-------------------|---------------|
| `{ key: 'room.name', content: [{ type: 'room', content: ['West of House'] }] }` | `"West of House"` |
| `{ key: 'action.result', content: ['You take ', { type: 'item', content: ['the sword'] }, '.'] }` | `"You take the sword."` |
| `{ key: 'action.blocked', ... }` | `"You can't do that."` |
| `{ key: 'status.score', content: ['42'] }` | (filtered out entirely) |

Lost information:
- **Channel key**: Can't distinguish room name from action result from error
- **Decoration type**: Can't distinguish item names from room names from NPC names
- **Block boundaries**: Merged into `\n\n`-separated text
- **Emphasis**: `*text*` rendered back as `*text*` (round-trip but fragile)

### 2.3 Dead Code: `text:channel`

The engine type signature declares:
```typescript
'text:channel': (channel: string, text: string, turn: number) => void;
```

This event is **never emitted anywhere in the codebase**. It appears to be a planned feature
for per-channel output that was never implemented. Even if it were, it would still only carry
strings, not structured blocks.

---

## Part 3: Client Rendering — Making the Best of a Bad Situation

### 3.1 Browser Client (`TextDisplay`)

**File**: `packages/platform-browser/src/display/TextDisplay.ts`

```typescript
displayText(text: string): void {
  const paragraphs = text.split(/\n\n+/);
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed) {
      const p = document.createElement('p');
      p.style.whiteSpace = 'pre-line';
      p.textContent = trimmed;         // ← textContent, no HTML
      this.textContent.appendChild(p);
    }
  }
}
```

**Assessment**: This is the safest possible approach (no XSS risk via `textContent`), but it
means:
- No bold/italic/color for any decoration
- No semantic distinction between room names, items, errors
- No room title styling
- No error highlighting
- Emphasis markers (`*text*`) appear as literal asterisks

The browser client essentially renders everything as monochrome plain text paragraphs.

### 3.2 Zifmia Client (`Transcript`)

**File**: `packages/zifmia/src/components/transcript/Transcript.tsx`

```typescript
function formatText(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => {
      const lines = p.split('\n').join('<br>');
      return `<p>${lines}</p>`;
    })
    .join('');
}

// Used as:
<div
  className="transcript-text"
  dangerouslySetInnerHTML={{ __html: formatText(entry.text) }}
/>
```

**Assessment**: Multiple issues here:

#### Issue 1: No Sanitization
`formatText` takes arbitrary text from the engine, wraps it in `<p>` tags, and injects it via
`dangerouslySetInnerHTML`. The text comes from the game engine (not user input), so the XSS
risk is low in practice, but it's still architecturally unsound. If a story author accidentally
includes HTML characters in a room description, they'll be interpreted as HTML.

#### Issue 2: No Decoration Rendering
Like the browser client, all semantic information is lost. The function is purely structural
(paragraph breaks and line breaks), with no understanding of decoration types.

#### Issue 3: CSS Heuristics Instead of Semantic Markup

The Zifmia theme CSS tries to compensate for the lost structure:

```css
/* themes.css:752-756 */
.transcript-text p:first-child strong,
.transcript-text p:first-child b {
  color: var(--sharpee-room-title);
  font-size: 18px;
  font-weight: 600;
}
```

This assumes the room title will be the first paragraph's bold text — a fragile heuristic that
only works if:
1. The room name happens to be wrapped in `**` or `<b>` (it currently isn't)
2. The room description is the first output in a turn (not always true)
3. No other bold text appears first

In practice, this CSS rule **never fires** because `renderToString()` with `ansi: false`
renders `**strong**` as just the text content (no HTML strong/bold tags). The CSS is dead code
waiting for a rendering system that doesn't exist yet.

#### Issue 4: Paper Theme Assumes Structure

```css
[data-theme="paper"] .transcript-text p {
  text-indent: 1.5em;
}
[data-theme="paper"] .transcript-text p:first-child {
  text-indent: 0;
}
```

This indents all paragraphs except the first — a nice typographic touch, but it applies
uniformly to all turns, including error messages, inventory listings, and help text where
paragraph indentation is inappropriate.

---

## Part 4: Architecture Diagram — Designed vs. Actual

### What ADR-096 Designed

```
SemanticEvents
     │
     ▼
┌─────────────┐     ┌──────────────┐
│ TextService  │────▶│ ITextBlock[] │──┬──▶ CLI Renderer  → ANSI string
│ (pipeline)   │     │ (structured) │  ├──▶ React Renderer → ReactNode
└─────────────┘     └──────────────┘  ├──▶ GLK Renderer   → GLK ops
                                       └──▶ Screen Reader  → ARIA
```

Each client gets the full `ITextBlock[]` and renders it natively.

### What Actually Happens

```
SemanticEvents
     │
     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ TextService  │────▶│ ITextBlock[] │────▶│renderToString│
│ (pipeline)   │     │ (structured) │     │ (CLI only)   │
└─────────────┘     └──────────────┘     └──────┬──────┘
                         DISCARDED              │
                                          plain string
                                                │
                    ┌───────────────────────────┤
                    ▼                           ▼
           Browser Client              Zifmia Client
           p.textContent=text          dangerouslySetInnerHTML
           (no formatting)             (paragraph structure only)
```

All clients get the same flat string. The decoration parser, the IDecoration tree, the channel
keys — none of it reaches the client.

---

## Part 5: Specific Code Smells

### 5.1 Engine Hardcodes the CLI Renderer

`game-engine.ts:36`:
```typescript
import { ITextService, createTextService, renderToString } from '@sharpee/text-service';
```

The engine imports `renderToString` (the CLI renderer) and uses it for ALL clients. This
couples the engine to CLI rendering and prevents clients from receiving structured data.

### 5.2 Double Event Pattern (Legacy + New)

The TextService maintains two parallel paths:

1. **Legacy**: `action.success` events carry `messageId` → handler resolves text
2. **ADR-097**: Domain events carry `messageId` directly → `tryProcessDomainEventMessage()`

Plus a `STATE_CHANGE_EVENTS` set that suppresses domain events when they DON'T have messageId
(to avoid double output). This works but creates three code paths through the same pipeline,
making it harder to reason about which events produce text.

### 5.3 Implicit English in TextService

`text-service.ts:217`:
```typescript
private handleImplicitTake(event: ISemanticEvent, _context: HandlerContext): ITextBlock[] {
  const data = event.data as { itemName?: string };
  const itemName = data.itemName || 'something';
  return [createBlock(BLOCK_KEYS.ACTION_RESULT, `(first taking the ${itemName})`)];
}
```

This constructs English text directly in the TextService, bypassing the language provider.
Should use `context.languageProvider.getMessage('if.event.implicit_take', { item: itemName })`.

Similarly, `handleCommandFailed()` has hardcoded English fallbacks:
```typescript
const message = context.languageProvider?.getMessage('core.entity_not_found')
  ?? "I don't see that here.";  // ← hardcoded English
```

These are minor (fallbacks), but they violate the language layer separation principle.

### 5.4 Candidate List Formatting in TextService

`text-service.ts:283-296` contains English article logic:
```typescript
private formatCandidateList(names: string[]): string {
  const withArticles = names.map(n => `the ${n}`);
  // ...Oxford comma...
}
```

This should be in `lang-en-us`, not in the TextService.

### 5.5 Action Handler Fallback Chain

`handlers/action.ts:44-71` has a complex fallback for message resolution:
```typescript
// 1. Try actionId.messageId (e.g., "if.action.taking.taken")
// 2. If that returns itself, try just messageId (e.g., "taken")
// 3. If still nothing, fall back to data.message or data.text
```

This triple-fallback suggests the message ID conventions aren't consistent across actions.
A standard convention would eliminate the need for fallback logic.

---

## Part 6: What a Fix Looks Like

The fix has two independent tracks. Track 1 is essential; Track 2 is cleanup.

### Track 1: Deliver ITextBlock[] to Clients (Essential)

**Step 1**: Change the engine to emit blocks, not strings.

```typescript
// game-engine.ts — change this:
'text:output': (text: string, turn: number) => void;

// to this:
'text:output': (blocks: ITextBlock[], turn: number) => void;
```

Remove the `renderToString()` call from the engine. Let each client decide how to render.

**Step 2**: Update the CLI client to call `renderToString()` itself.

The CLI/transcript tester currently receives the string from `text:output`. It would call
`renderToString(blocks, { ansi: true })` locally.

**Step 3**: Create a proper HTML renderer.

```typescript
// New: packages/text-service/src/html-renderer.ts
export function renderToHTML(blocks: ITextBlock[]): string {
  // ITextBlock[] → semantic HTML with data-attributes and CSS classes
}
```

This renderer would produce:
```html
<div class="text-block text-block--room-name">
  <span data-decoration="room">West of House</span>
</div>
<div class="text-block text-block--action-result">
  You take <span data-decoration="item">the sword</span>.
</div>
```

**Step 4**: Update Zifmia's Transcript to use the HTML renderer (or better, a React renderer).

Option A — HTML renderer:
```typescript
<div
  className="transcript-text"
  dangerouslySetInnerHTML={{ __html: renderToHTML(entry.blocks) }}
/>
```

Option B — React renderer (preferred):
```typescript
function TextBlockRenderer({ blocks }: { blocks: ITextBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <div key={i} className={`text-block text-block--${block.key.replace('.', '-')}`}>
          {renderContent(block.content)}
        </div>
      ))}
    </>
  );
}

function renderContent(content: ReadonlyArray<TextContent>): React.ReactNode {
  return content.map((item, i) => {
    if (typeof item === 'string') return item;
    return (
      <span key={i} className={`decoration decoration--${item.type}`}>
        {renderContent(item.content)}
      </span>
    );
  });
}
```

**Step 5**: Update Zifmia theme CSS to use real classes instead of heuristics.

```css
.decoration--room { color: var(--sharpee-room-title); font-weight: 600; }
.decoration--item { color: var(--sharpee-item-color); }
.decoration--npc  { color: var(--sharpee-npc-color); }
.decoration--em   { font-style: italic; }
.text-block--action-blocked { color: var(--sharpee-error); }
```

### Track 2: Cleanup (Low Priority)

1. Remove hardcoded English from `TextService` (implicit take, command failed, candidate list)
2. Standardize message ID conventions to eliminate fallback chains
3. Remove or implement `text:channel` event (currently dead code in the type signature)
4. Complete ADR-097 migration (eliminate `STATE_CHANGE_EVENTS` set)

---

## Part 7: Impact Assessment

### What Breaks If We Do Track 1

| Consumer | Impact | Migration |
|----------|--------|-----------|
| CLI client (`platform-cli`) | Receives blocks instead of string | Add `renderToString()` call locally |
| Browser client (`platform-browser`) | Receives blocks instead of string | Add `renderToHTML()` call or block renderer |
| Zifmia client | Receives blocks instead of string | Replace `formatText()` with block renderer |
| Transcript tester | Receives blocks instead of string | Add `renderToString()` for comparison |
| `TranscriptEntry.text` | Changes from `string` to `ITextBlock[]` | Update type + serialization |
| Save/restore | Transcript data shape changes | Migration needed for saved transcripts |

### What We Gain

1. **Semantic styling in web clients** — room names, items, NPCs get distinct colors/fonts
2. **Proper error highlighting** — `action.blocked` blocks render in error style
3. **Story-defined decorations work** — `[dungeo.thief:text]` gets custom styling
4. **Accessibility** — decoration types can map to ARIA roles
5. **Theme system works fully** — CSS selectors target real classes, not heuristics
6. **Status bar routing** — clients can extract `status.*` blocks for proper status display

### Risk

Low-medium. The structured data already exists — we just need to stop destroying it.
The main risk is in save/restore compatibility (transcript shape change) and ensuring
the transcript tester still works correctly.

---

## Appendix: File Map

| File | LOC | Role | Assessment |
|------|-----|------|------------|
| `packages/text-blocks/src/types.ts` | 175 | Type definitions | Excellent |
| `packages/text-blocks/src/guards.ts` | ~50 | Type guards | Good |
| `packages/text-service/src/text-service.ts` | 310 | Pipeline orchestration | Good (minor English leaks) |
| `packages/text-service/src/decoration-parser.ts` | 203 | Markup → IDecoration | Good |
| `packages/text-service/src/cli-renderer.ts` | 253 | ITextBlock[] → ANSI string | Good |
| `packages/text-service/src/stages/filter.ts` | 30 | Remove system events | Clean |
| `packages/text-service/src/stages/sort.ts` | 92 | Prose ordering | Clean |
| `packages/text-service/src/stages/assemble.ts` | 39 | String → ITextBlock | Clean |
| `packages/text-service/src/handlers/action.ts` | 110 | Action event handling | Good (fallback chain smell) |
| `packages/text-service/src/handlers/room.ts` | 109 | Room description handling | Good |
| `packages/text-service/src/handlers/generic.ts` | 97 | Fallback handling | Good |
| `packages/engine/src/game-engine.ts` | ~1200 | Engine (text emit site) | **String bottleneck here** |
| `packages/platform-browser/src/display/TextDisplay.ts` | 89 | Browser text rendering | Minimal |
| `packages/zifmia/src/components/transcript/Transcript.tsx` | 104 | React transcript rendering | Needs rework |
| `packages/zifmia/src/styles/themes.css` | ~800 | Theme definitions | Dead heuristic selectors |

---

## Conclusion

The text service architecture (ADR-096) is sound. The implementation up through `ITextBlock[]`
creation is correct. The problem is precisely two lines in `game-engine.ts`:

```typescript
const output = renderToString(blocks);    // line 685/902
this.emit('text:output', output, turn);   // line 687/906
```

These should be:
```typescript
this.emit('text:output', blocks, turn);
```

Everything else follows from that fix. The types exist. The decorations are parsed. The channel
keys are assigned. We just need to stop throwing it all away at the last step.
