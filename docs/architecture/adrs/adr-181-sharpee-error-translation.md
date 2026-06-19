# ADR-181: Sharpee Error Translation (author-facing runtime errors)

## Status: ACCEPTED

## Date: 2026-06-18

## Context

When an author plays their story in the Sharpee IDE (the `WKWebView` Play pane), runtime
failures surface as raw JavaScript/TypeScript errors against the **minified** browser
bundle — e.g. `TypeError: world.getLastCreatedEntityId is not a function`. Two problems:

1. The location is meaningless to the author (minified `game.js:115:35364`).
2. The message is in compiler/runtime terms, not Interactive-Fiction-authoring terms.

The IDE already captures these errors (an injected console/`onerror` hook → Swift) and
symbolicates them back to story source via the bundle's source map (ADR-181 builds on the
`SourceMap` + `PlayErrorSymbolicator` work). The open question: should the IDE also
**translate** the error into language an author understands, and if so, where does that
knowledge live?

## Decision

Add a **Sharpee Error Translation** layer in the IDE (`SharpeeErrorTranslator`). It maps a
raw error message (+ the symbolicated source line for context) to an author-facing
`{ title, fix, raw }`:

- **`title`** — a plain-language restatement ("The world has no `getLastCreatedEntityId`
  method").
- **`fix`** — a how-to hint in authoring terms (curated per pattern).
- **`raw`** — the original message, always preserved and shown as "Original error".

It is a **curated rule set** (not inference): each rule matches a known error shape and
emits a translation. The initial rules cover the most common authoring mistakes —
`X is not a function`, `Cannot read properties of undefined (reading 'P')` /
`undefined is not an object`, and `X is not defined`. **Unknown errors fall back to the raw
message** — translation never makes the error *worse* than showing the original.

**Two layers, with a firm boundary:**

- **Layer A — IDE-side translation (this ADR).** The curated rules live in the IDE
  (`tools/ide`), an extensible table that grows as we learn common errors. No platform
  change. This is what ships now.
- **Layer B — richer engine errors (deferred, platform-scoped).** The engine / world-model
  could *throw* domain-typed `SharpeeError`s with author-friendly messages so fewer errors
  need translating. That touches `packages/` and is **out of scope** here — it requires a
  separate platform discussion and its own ADR. Layer A does not depend on Layer B and is
  not blocked by it.

The author-facing presentation (Game Errors tab: translated title → fix → stack →
original) is specified by `docs/work/sharpee-ide/mock-bottom-panel.html`.

## Consequences

- **The IDE owns a curated error knowledge base.** New rules are added in
  `SharpeeErrorTranslator` (Swift) as patterns are observed; this is an ongoing knowledge
  effort, not a one-time list. Each rule is unit-tested.
- **Honest limits.** We cannot meaningfully translate *arbitrary* JS errors — it is
  pattern-matching + graceful fallback. The raw error is always available.
- **Source context is a translator input.** Translation may use the offending source line
  (read via the symbolicated location), so rules can become more precise over time.
- **Layer A/B independence is a constraint.** Future work that wants the *engine* to emit
  domain errors must not assume the IDE translator goes away — the IDE layer handles
  third-party/older stories and any error the engine doesn't yet classify. If Layer B
  lands, the translator's fallback simply fires less often.
- **Presentation is mock-driven.** Changes to the Game Errors UX update the mock first.

## Session

Produced during the 2026-06-18 Sharpee IDE session (P5 Play panel → Game Errors). Builds on
the `SourceMap` source-map consumer and `PlayErrorSymbolicator` from the same session.
