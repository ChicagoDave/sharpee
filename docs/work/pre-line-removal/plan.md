# Plan: Remove `white-space: pre-line` from the prose pane

**Status**: PROPOSED — execution deferred to a future session
**Created**: 2026-05-12
**Source**: session-20260512 — follow-up to GH #111 (System 6 newlines)

## Motivation

The browser main-channel renderer sets `p.style.whiteSpace = 'pre-line'` on
every prose paragraph (`packages/platform-browser/src/channels/main.ts:51`).
`TextDisplay` does the same. This is load-bearing: many templates and
handlers embed literal `\n` inside a single block's text content, and
without `pre-line` those collapse to spaces.

The goal of this refactor is to make every line break in the prose pane
*structural* (a block boundary), so the CSS no longer needs `pre-line`. This
is a cleaner architecture: newlines become semantic, not whitespace-coded.

## Definition of "done"

- `channels/main.ts` and `display/TextDisplay.ts` no longer set
  `white-space: pre-line` on any prose element.
- No `ITextBlock`'s `content` carries a string with `\n` in it.
- Visual parity with current rendering — multi-line content that today
  appears flush (book text under "Sign reads:", banner lines under the
  title) remains flush. The "tight" policy was confirmed in
  session-20260512.

## Touched packages

`@sharpee/engine`, `@sharpee/lang-en-us`, `@sharpee/channel-service`,
`@sharpee/platform-browser`. Likely an ADR-165 amendment for the wire
shape; possibly a small ADR-174 note about no-`\n`-in-string-TextContent.

## Phase 1 — Wire metadata for "tight" entries

Today the `main` channel value is `TextContent[][]` — an array of entries,
each a TextContent array. Each entry becomes a `<p class="main-entry">`
with the prose-pane's `<p>` margin.

Extend the per-entry shape so the renderer can mark continuation lines:

```ts
type MainEntry = { content: TextContent[]; tight?: boolean };
// channel value becomes MainEntry[]  (was TextContent[][])
```

Renderer change (one file): when `tight === true`, add the class
`main-entry--tight` to the `<p>`. CSS rule:

```css
.sharpee-prose-pane p.main-entry--tight {
  margin-top: 0;
  margin-bottom: 0;
}
```

ADR-165 amendment captures the entry shape and the `tight` semantics
("this block continues the previous paragraph visually; engine guarantees
that a tight entry never appears first in a packet").

## Phase 2 — Channel-service flattener

`packages/channel-service/src/utils/flatten.ts` (and any sibling) turns
`ITextBlock[]` into the wire shape. Extend it to honor a `tight?` hint
that handlers attach to blocks.

Block shape stays the same on the engine side; the hint rides on the
block via either a new optional field or a derivation from `block.key`
(prefer a field — keys are noisy).

## Phase 3 — Engine handler refactors

Every handler that currently emits multi-line block content needs to
split it. Concrete targets:

- `packages/engine/src/prose-pipeline/handlers/about.ts:58`
  `` `${title}\nBy ${author}` `` → two blocks; second is `tight: true`.
- `packages/engine/src/prose-pipeline/handlers/room.ts` —
  already two blocks today; verify no `\n` leaks via raw room
  `description` (story content). If it does, treat as a Phase 4
  story-data concern.
- Any other handler that builds a string with `\n` and hands it to
  `createBlock` — search: `\\n` inside `createBlock` arguments.

## Phase 4 — lang-en-us template refactors

Templates that embed `\n` move from a single message ID to a *family*
of message IDs the handler stitches together. Inventory:

- `actions/reading.ts:21–25` — `read_text`, `read_book`, `read_book_page`,
  `read_sign`, `read_inscription`. Each splits into `…_header` +
  `…_body`. Handler emits header, then `tight` body.
- `actions/restoring.ts:25` — `restore_details` → three lines
  (saveName, score, moves). Three blocks; second and third `tight`.
- `actions/help.ts:18,25,28,31,34,41` — multi-line help text. Each
  bullet becomes its own block. Family of IDs per topic, OR a single
  array-of-lines structure (lang side decides).
- `actions/about.ts:19` — `game_info` → four lines (title, version,
  author, release date). Four blocks.
- `language-provider.ts:77` — `game.started.banner` → at least two
  blocks (title+by, instructions). Decide whether the blank line stays
  or is dropped.
- `data/events.ts:298–340` — inventory list. Per-item blocks (tight)
  with a header block, instead of one concatenated string.

## Phase 5 — Remove `pre-line`

- Delete `p.style.whiteSpace = 'pre-line'` from
  `packages/platform-browser/src/channels/main.ts:51`.
- Delete `p.style.whiteSpace = 'pre-line'` from
  `packages/platform-browser/src/display/TextDisplay.ts:31`.
- Verify nothing in the dist HTML carries `pre-line` for prose
  elements. Browser visual regression test against the dungeo
  walkthroughs.

## Phase 6 — Cleanup

- Remove the `\n\n+` split in `TextDisplay.displayText` — paragraph
  breaks are now block boundaries; the function shouldn't split text
  internally.
- Add a lint rule or test that asserts no `string` TextContent in
  any emitted block contains `\n`.

## Acceptance criteria

- AC-1: All 415 engine tests pass.
- AC-2: All lang-en-us tests pass (216 today).
- AC-3: All dungeo walkthrough transcripts pass under the bundle.
- AC-4: Visual screenshot under each theme: banner, book text, help
  text, inventory, room entry all render flush where they used to.
- AC-5: `grep` over `dist/web/*` shows no `pre-line` on prose
  elements.

## Risks

- **Wire-shape change**: any other channel consumer that depends on
  the existing `TextContent[][]` shape (the zifmia/shite parts-bin,
  any tests in `tools/`) needs updating. Audit before Phase 1 lands.
- **Visual regression on themes other than System 6**: the prose-pane
  `<p>` margin varies per theme (0.4–0.8em). The CSS rule for tight
  entries must override all themes — global `.main-entry--tight`
  with `margin: 0`, not theme-scoped.
- **Story content with `\n`**: room descriptions and item descriptions
  in dungeo's source may contain raw `\n`. Phase 3 needs an audit
  pass; possible Phase 7 to refactor story content.
