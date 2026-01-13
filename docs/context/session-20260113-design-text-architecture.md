# Design Session: Text Service & Client Architecture

**Date**: 2026-01-13
**Branch**: chaining
**Subject**: The final design of how the text service and varying types of clients work together.
**Participants**: Dave Cornelson, Claude (Opus 4.5)
**Status**: Architecture finalized, ready for implementation

---

## Overview

This session designed Sharpee's text output architecture from first principles, covering template syntax, TextBlock contracts, and client rendering. The design is inspired by FyreVM channel I/O (2009).

---

## The Challenge

> "We're going to test your ability to juggle complexity"

The goal: think through the entire text output system holistically:

- **lang-en-us**: Templates, formatters, prose
- **text service**: Middleware orchestration
- **client**: How we display the story

---

## Scoping the Problem

### CLI

> "I think we can say CLI is simple and we've more or less already proven how it works"

CLI is solved - just concatenate TextBlocks with whitespace.

### GLK

> "I would say glk is an interesting IF thing, but it's worth an ADR with identified as the status"

GLK is a known future concern - park it as ADR-099 with status "identified".

### Screen Reader / Accessibility

> "There are a lot of blind IF players so I really love the idea of making Sharpee an easy path for authors to make games accessible"

Accessibility is a priority, not an afterthought. ADR-100 for screen reader support.

### React / Electron

> "the big one is react/electron and I think we have to consider them side by side"

React is the main focus. Works in both browser and Electron contexts.

---

## Unified Template Syntax

### The Problem

ADR-091 (Text Decorations) and ADR-095 (Message Templates) had overlapping concerns:

- ADR-095: `{modifier:placeholder}` for formatters
- ADR-091: Needed decorations on both placeholders AND literal text

### The Solution

**Dave**: "yes let's figure out a unified syntax"

Three distinct syntaxes for distinct purposes:

```
{formatter:placeholder}     - Transformations (a, the, list, cap)
[type:content]              - Semantic decorations (item, room, npc)
*emphasis* / **strong**     - Inline prose decoration
```

Can be combined:

```
[item:{a:item}]             - Resolve placeholder, then mark as item-type
*{adverb}*                  - Resolve placeholder, then emphasize
```

**Key insight**: Formatters _transform_, decorations _annotate_. Different operations, different syntax.

---

## Single TextService + Multiple Renderers

### DRY Principle Applied

**Dave**: "let's add some basic developer principles (DRY) into the mix"

With multiple text services, you'd repeat:

- Template resolution logic
- Formatter logic (articles, lists)
- Decoration parsing
- Language layer integration

What actually differs per client: only rendering.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    lang-en-us                           │
│  Templates, formatters, noun types, prose               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    TextService                          │
│  Resolves templates → parses decorations → TextBlocks   │
│  (ONE implementation, shared)                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                     TextBlocks
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │  React  │       │   CLI   │       │  JAWS   │
   │ Renderer│       │ Renderer│       │ Renderer│
   └─────────┘       └─────────┘       └─────────┘
```

Each renderer is small - just maps decoration types to platform output.

---

## Formalized TextBlock Contract

**Dave**: "do we formalize the text blocks?"

Yes - TextBlocks become a concrete, typed contract.

### Package Location

`@sharpee/text-blocks` - pure interfaces, no implementation

### Interface Design

```typescript
type TextContent = string | IDecoration;

interface IDecoration {
  type: string; // Open - 'em', 'item', 'photopia.red'
  content: TextContent[]; // Can nest
}

interface ITextBlock {
  key: string; // Channel - 'room.description', 'status.score'
  content: TextContent[];
}
```

### Language Agnostic

**Dave**: "do text blocks need to be language specific: textblocks-en-us"

No. TextBlocks are a universal container format. The prose inside is localized, but the structure is the same.

```typescript
// Same ITextBlock shape, different language content

// English
{ key: 'action.result', content: ['You take the sword.'] }

// German
{ key: 'action.result', content: ['Du nimmst das Schwert.'] }
```

---

## FyreVM Channel I/O Inspiration

**Dave**: "you just reinvented fyrevm channel IO Mr. Claude (though I actually invented it in 2009 with help from Tara McGrew and inspired by Jeff Panici)"

Credit where due! The architecture draws from proven design.

### Channel = Block Key

```typescript
{ key: 'room.description', content: [...] }  // Channel: room
{ key: 'action.result', content: [...] }     // Channel: action
{ key: 'status.score', content: [...] }      // Channel: status
```

### Key Conventions

| Prefix      | Purpose             | Client Routing           |
| ----------- | ------------------- | ------------------------ |
| `room.*`    | Room info           | Main transcript          |
| `action.*`  | Action results      | Main transcript          |
| `status.*`  | Status bar elements | Fixed header slots       |
| `error`     | System errors       | Main transcript (styled) |
| `prompt`    | Command prompt      | Input area               |
| `{story}.*` | Story-defined       | Configurable             |

### Extensibility

**Dave**: "they start pre-defined, but I created a way for authors to make their own and use them in storytelling"

Same pattern in Sharpee:

- Core keys defined by platform
- Stories can define custom keys
- Clients render unknown keys with sensible defaults

---

## Browser Architecture

**Dave**: "the engine bundles game and sharpee to {game}.js and runs in the browser (we've already done this and it's fast)"

No server. No API layer. Everything runs client-side.

```
┌─────────────────────────────────────────────────────────┐
│  {game}.js (bundled)                                    │
│  Engine + WorldModel + Story + TextService + lang-en-us │
└─────────────────────────────────────────────────────────┘
                          │
                          │ on('turn-complete') → ITextBlock[]
                          ▼
┌─────────────────────────────────────────────────────────┐
│  React Client                                           │
│  Receives ITextBlock[], renders to DOM                  │
└─────────────────────────────────────────────────────────┘
```

---

## Event-Based Client Communication

### The IF Model

**Dave**: "in IF we have one stream of text blocks including any daemons and npcs - the client would never handle anything but one set of text blocks"

One stream. Everything mixed. Client just renders.

```typescript
engine.on('turn-complete', (blocks: ITextBlock[]) => {
  // One array - command results, daemons, NPCs, everything
  setTranscript((prev) => [...prev, ...blocks]);
});
```

No routing logic. No "handling" different event types. Just:

1. Receive blocks
2. Append to transcript
3. Render

---

## Status Line Design

### Not Special

**Dave**: "I see the status line as no different than any other rendered text block"

Status elements are just more blocks with `status.*` keys:

```typescript
{ key: 'status.room', content: [{ type: 'room', content: ['West of House'] }] }
{ key: 'status.score', content: ['0'] }
{ key: 'status.turns', content: ['1'] }
```

### Multiple Blocks, Not One Object

**Dave**: "B is the way I think" (choosing Option B: multiple sub-keyed blocks)

React routes by key to slots:

```tsx
<StatusBar>
  {blocks.filter(b => b.key.startsWith('status.')).map(renderToSlot)}
</StatusBar>
<Transcript>
  {blocks.filter(b => !b.key.startsWith('status.')).map(renderBlock)}
</Transcript>
```

---

## Story-Defined Colors (Photopia Pattern)

**Dave**: "think about how Sharpee would handle Adam Cadre's Photopia colors"

Photopia uses color as narrative. Authors need full creative control.

### Solution

Authors define semantic color names in story config:

```typescript
// stories/photopia/src/config.ts
export const storyColors = {
  'photopia.red': '#cc0000', // Alley's scenes
  'photopia.blue': '#0066cc', // Fantasy scenes
};
```

Templates use semantic names:

```
'[photopia.red:The light was red, like always.]'
```

Client looks up mapping, renders appropriately:

- Web: actual CSS color
- CLI: ANSI approximation
- Screen reader: announces "red text" or ignores

### IDecoration Type is Open

```typescript
interface IDecoration {
  type: string; // Open - 'em', 'item', 'photopia.red'
  content: TextContent[];
}
```

Type is open string, not enum. Core types are conventions, not constraints.

---

## Decoration Types

### Semantic vs Presentational

| Semantic        | Presentational  |
| --------------- | --------------- |
| `item`          | `em` (italic)   |
| `room`          | `strong` (bold) |
| `npc`           | `underline`     |
| `command`       | `strikethrough` |
| `direction`     | `super` / `sub` |
| (story-defined) | (story colors)  |

---

## Decisions Summary

| Topic                | Decision                                                           |
| -------------------- | ------------------------------------------------------------------ |
| Template syntax      | Unified: `{formatter:placeholder}`, `[type:content]`, `*emphasis*` |
| TextService          | Single service, multiple renderers (DRY)                           |
| TextBlocks           | Formalized `ITextBlock` contract, language-agnostic                |
| Decoration type      | Open string (not enum) for extensibility                           |
| Channel keys         | Core prefixes + story-extensible                                   |
| Client communication | Event-based: `on('turn-complete')`                                 |
| Status line          | Multiple `status.*` blocks, not special                            |
| Colors               | Story-defined semantic names                                       |
| Priority/role fields | Dropped (YAGNI)                                                    |

---

## ADR Map

| ADR | Topic             | Action                                   |
| --- | ----------------- | ---------------------------------------- |
| 091 | Text Decorations  | Finalize - hybrid syntax decision        |
| 095 | Message Templates | Update - align with 091                  |
| 096 | Text Service      | New - architecture, ITextBlock, channels |
| 097 | React Client      | New - event-based, components            |
| 099 | GLK Client        | New - status: identified                 |
| 100 | Screen Reader     | New - status: identified                 |

---

## Package Structure

### New Packages

- `@sharpee/text-blocks` - Interfaces (ITextBlock, IDecoration)
- `@sharpee/text-service` - Single service implementation
- `@sharpee/client-react` - React client (greenfield)

### Archived

- `text-services` → archive
- `text-service-browser` → archive
- `text-service-template` → archive

---

## Key Quotes

> "the Sharpee Way would be event based" - Dave

> "you just reinvented fyrevm channel IO" - Dave (on the architecture)

> "I'd toss the current implementation and design for what we're designing now" - Dave (clean slate)

> "everything is greenfield Mr. Claude" - Dave

---

## Next Steps

1. Write/update ADRs (091, 095, 096, 097, 099, 100)
2. Create `@sharpee/text-blocks` package
3. Create `@sharpee/text-service` package
4. Archive existing text-service packages
5. Implement React client

---

_This document preserves the design thinking and decisions from a pivotal architecture session._
