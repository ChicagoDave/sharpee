# ADR-298: Story Block Metadata — Fielded Title/Authors, IFID Restored, Prologue

**Status**: DRAFT (2026-08-02, session 7dd736) — consolidates GH #187's issue
thread: David's rulings 1–5 (2026-07-29) plus the verified analysis recorded
there. Open Questions below must resolve before ACCEPTED. Closes GH #187 when
implemented.

**Parent**: ADR-074 (IFID requirements — the regression this repairs), ADR-133
(info channel), ADR-166 (ifid channel), ADR-257 (language versioning), ADR-284
(publishing, downstream consumer). Related: GH #200 (launch block — sequenced
after this ADR; see D6).

## Context

The Chord story block opens positionally — `story "The Folly at Fernhill" by
"The Sharpee Project"` — while every other datum in the block is a `key: value`
field. `by "…"` can carry only one author string. And the block has no `ifid:`
field at all: a case-insensitive search of `packages/chord/src` and
`packages/story-loader/src` finds nothing, while the platform mints, validates,
and consumes IFIDs everywhere else — `engine/src/story.ts:75-77` defines
`ifid?: string`, dungeo carries a real minted one, and devkit ships `sharpee
ifid` tooling. ADR-074 (Accepted, Treaty of Babel) makes this a spec-compliance
regression for every Chord story, not a missing convenience — the strongest
single driver of this ADR.

The consumer contract already exists under different names: `StoryInfoData`
(`stdlib/src/channels/standard.ts:74-96`) feeds `infoChannel` and
`ifidChannel` with `title`/`author`/`version`/`ifid`/`description`/`buildDate`/
`engineVersion`/`clientVersion`, and `ifidChannel` sparse-suppresses on empty
IFID — so every choice below lands on a contract that already tolerates today's
IFID-less Chord stories.

The current header is an open, untyped map: `parser.ts:659-666` accepts any
`key: value` line (no known-field table, no unknown-field diagnostic),
`analyzer.ts:598` passes it through wholesale, and both `ast.ts:47` and
`ir.ts:132` declare `fields: Record<string, string>`.

## Decision

### D1 — The story block is fielded; the positional form is removed

```
story
  title: The Folly at Fernhill
  authors:
      Ada Lovelace
      Charles Babbage
  testers:
      Joe Mason
      Emily Hark
  ifid: xxxx-xxxx-xxxx-xxxx
  id: fernhill
  story-version: 0.3.0
  prologue: <text or phrase — emitted before the banner>
  blurb: One cold winter night to find the deed that keeps Fernhill in the family.
```

`title:` replaces the positional quoted title; `authors:` (indented list)
replaces `by "…"`; `testers:` is new (indented list); `story-version:` renames
`version:`. Per the standing no-backward-compatibility rule this is a one-shot
cutover: the positional form becomes a removed-form parse error with a fix-it
naming the fielded shape, following the `parse.removed-define-verb` /
`parse.removed-slot-spelling` precedent. This is a breaking header change — a
major language version bump (2.2.0 → 3.0.0, ADR-257 discipline).

### D2 — Generated metadata stays out of the story block (ruling 1)

`story-build:`, `chord-version:`, `sharpee-version:` are NOT story-block
fields. They are emitted in the build log (`tools/repokit/src/commands/build.ts:236`
already prints a version line to extend) and continue to ride the existing
stamp path (devkit `version-stamp.ts` → `StoryInfoTrait`
`buildDate`/`engineVersion`/`clientVersion`). Rationale (verified in-thread): a
build timestamp inside `meta.fields` would churn all 7 IR snapshot files on
every build and destroy the byte-stability that ADR-289 Phase 6's
"diff is exactly four `languageVersion` lines" check depends on. Source-side
version fields would also be author-writable lies the compiler must police.

### D3 — `blurb` is metadata; `prologue` is the one new emission field (rulings 2–3)

`blurb` and `description` are the same thing — one metadata field, mapped to
`StoryConfig.description` (which `story-loader/src/loader.ts:264` already
does), never emitted in play. `prologue:` names the text emitted **before the
banner** (the Infocom pre-banner text; a channel in fyrevm/channel-io
heritage). Any other start-of-story text is authored with normal story
mechanisms, not header fields. This split is also what keeps GH #200 clean:
`blurb` has a single build-time value (published page, archive entry);
`prologue` is what a launch selection would vary.

### D4 — Block values: `blurb` and `prologue` accept text or a phrase (rulings 4–5)

The header grammar gains block-valued fields: `key:` followed by an indented
body (`authors:`/`testers:` as lists of atoms; `prologue:`/`blurb:` as prose).
Both `prologue` and `blurb` may take literal text or a reference to a
`define phrase`. The reference form MUST be syntactically distinguished (the
thread's analysis stands: resolve-if-a-phrase-exists would let an unrelated
later phrase silently convert existing literal text into a reference — the
same defect class ruling 2 avoided). The chosen sigil/keyword is Open
Question 2.

### D5 — IFID restored to the language

`ifid:` becomes a story-block field carried through AST → IR → `StoryConfig.ifid`
→ `ifidChannel`, repairing the ADR-074 regression. Generation/validation
policy is Open Questions 3–4.

### D6 — Sequencing

This ADR lands before GH #200's launch block (it decides where `prologue`
lives), and its implementation should coordinate with GH #213 T2 (the Chord
language doc rewrite) so the docs are written once, against the post-298 block.

## Consequences

- **Breaking cutover**: 139 files declare a `story` block — ~7 shipped stories,
  the rest test fixtures under `packages/chord/tests/fixtures`,
  `packages/story-loader/tests/fixtures`, `packages/devkit/tests/fixtures`,
  plus `packages/devkit/templates/story-chord/story.story.template`. Every
  fixture edit is a snapshot regeneration; the fixture count, not the story
  count, is the real implementation cost.
- **Typed-IR change**: `fields: Record<string, string>` widens to carry
  list/block values (`ast.ts:47`, `ir.ts:132`); consumers assuming strings
  break — e.g. `devkit/src/standalone/browser-core.ts:98`'s
  `(meta.fields.blurb ?? '').trim()`. Shape is Open Question 1.
- **Channel-contract touch**: `StoryInfoData.author` is singular
  (`standard.ts:91`); an `authors:` list must either join into it or widen the
  channel shape (a wire change with its own consumers). Open Question 5.
- The IDE's window title (ADR-279 Amendment A1, GH #188) reads `meta.title`
  from the IR and is unaffected — only the compiler's extraction changes.
- `docs/reference/chord-language.md` §1 and the grammar docs change again;
  fold into the GH #213 T2 rewrite rather than patching twice.

## Open Questions

1. **Header value model**: per-field schema (parser knows `authors` is a list,
   `prologue` is prose — a real departure from today's open map, and forces an
   answer for unknown keys with indented bodies), or the uniform open-map
   alternative from the thread (every block value is `string[]`; list-vs-prose
   is the consumer's reading — parser stays schema-free)?
2. **Phrase-reference syntax** for `prologue:`/`blurb:`: explicit keyword
   (`prologue: phrase opening-blurb`), a sigil, or something else?
3. **IFID provenance**: author-written, or generated at `sharpee init` and
   thereafter immutable?
4. **Missing IFID**: compile error, warning, or silent generation? (Evidence:
   `ifidChannel` already skips emission on empty — a warning has no downstream
   breakage; a hard error is stricter than the channel layer assumes. Does
   `sharpee publish` (ADR-284) require one?)
5. **`StoryInfoData.author`**: join the `authors:` list into the existing
   singular string, or widen the channel shape to a list?
6. **`testers:` consumption**: metadata-only (About/info channel?), or carried
   somewhere specific? (Field is ruled in; its consumer is not yet named.)
7. **Prologue emission mechanics**: its own channel (fyrevm heritage) or a
   pre-banner slot in the existing text flow — and does ADR-296's
   `beforeEverything` (platform-only) slot bear on it?

## Session

Drafted 2026-08-02, session 7dd736, from GH #187's thread (David's rulings 1–5
recorded there 2026-07-29). Not yet interviewed.
