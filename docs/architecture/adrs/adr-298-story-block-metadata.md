# ADR-298: Story Block Metadata — Fielded Title/Authors, IFID Restored, Prologue

**Status**: ACCEPTED (2026-08-02, session 201a5d) — consolidates GH #187's
issue thread: David's rulings 1–5 (2026-07-29) plus the verified analysis
recorded there. All seven open questions resolved via `/devarch:adr-interview`
and review findings folded, 2026-08-02. Closes GH #187 when implemented.

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
  description: One cold winter night to find the deed that keeps Fernhill in the family.
```

`title:` replaces the positional quoted title; `authors:` (indented list)
replaces `by "…"`; `testers:` is new (indented list); `story-version:` renames
`version:`; `description:` is the field's one spelling (interview 2026-08-02:
the working name `blurb` is dropped — no reason to differentiate from
Sharpee's `StoryConfig.description`).

Per the standing no-backward-compatibility rule this is a one-shot
cutover: the positional form becomes a removed-form parse error with a fix-it
naming the fielded shape, following the `parse.removed-define-verb` /
`parse.removed-slot-spelling` precedent. This is a breaking header change — a
major language version bump (2.2.0 → 3.0.0, ADR-257 discipline).

**`testers:` consumption (resolved 2026-08-02 interview)**: `testers` travels
the full path — IR → `StoryConfig` → `StoryInfoData.testers: string[]` on the
info channel, beside the widened `authors` list (Consequences below) and
plumbed in the same commit. Clients choose whether/where to show credits
(About/info surfaces); the wire carries the names, data-only.

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

### D3 — `description` is metadata; `prologue` is the one new emission field (rulings 2–3)

`description:` is one metadata field, mapped to `StoryConfig.description`
(which `story-loader/src/loader.ts:264` already does for the old spelling),
never emitted in play. `prologue:` names the text emitted **before the
banner** (the Infocom pre-banner text; a channel in fyrevm/channel-io
heritage). Any other start-of-story text is authored with normal story
mechanisms, not header fields. This split is also what keeps GH #200 clean:
`description` has a single build-time value (published page, archive entry);
`prologue` is what a launch selection would vary.

**Emission mechanics (resolved 2026-08-02 interview)**: the prologue is
emitted on a **dedicated prologue channel** (fyrevm/channel-io heritage),
once at story start, sparse-suppressed when the field is absent — the same
pattern as `ifidChannel`. Placement before the banner is the platform's
default client rendering order; authors can restyle per the customizable-
client architecture. ADR-296's slot machinery is not involved:
`beforeEverything` stays platform-only, and turn-narration slots are not
stretched to cover a one-time story-start emission.

The channel is `prologueChannel`, defined beside `ifidChannel` in
`stdlib/src/channels/standard.ts` and fed from the `storyInfo` capability the
engine seeds at startup (`game-engine.ts:426-465`) — the same producer path
as the existing info/ifid channels. When `prologue:` is a phrase reference
(D4), the engine resolves the phrase at emission time, so phrase variants
(cycling, randomly, first-time) behave per their normal semantics.

### D4 — Block values: `description` and `prologue` accept text or a phrase (rulings 4–5)

The header grammar gains block-valued fields: `key:` followed by an indented
body (`authors:`/`testers:` as lists of atoms; `prologue:`/`description:` as
prose). Both `prologue` and `description` may take literal text or a
reference to a `define phrase`.

**Reference form (resolved 2026-08-02 interview)**: a phrase reference is the
bare phrase name — `prologue: story-prologue` — no sigil, no keyword,
matching the existing blocked-exit idiom where the key after the colon names
a phrase (§2.5 of the language doc). Disambiguation is structural, not
resolve-if-exists: a value that is a single kebab atom is **always** a phrase
reference and MUST resolve to a defined phrase (compile error otherwise); any
other value is literal prose. This keeps ruling 2's defect class closed — an
unrelated later phrase can never silently capture existing literal text,
because prose is never a lone atom and a lone atom is never prose.

**Value model (resolved 2026-08-02 interview)**: the parser owns a per-field
schema — `authors:`/`testers:` parse as lists of atoms,
`prologue:`/`description:` as prose blocks, the rest as scalars. The open map
is removed: the schema is closed, so an unknown key is a parse error naming
the known field set — closing the typo'd-key hole where `titel:` would
silently yield a title-less story (the same silent-metadata-loss class D5
repairs for IFID). AST/IR `fields` widens to a typed per-field shape, not
`Record<string, string[]>`.

### D5 — IFID restored to the language

`ifid:` becomes a story-block field carried through AST → IR → `StoryConfig.ifid`
→ `ifidChannel`, repairing the ADR-074 regression.

**Provenance (resolved 2026-08-02 interview)**: `sharpee init` mints the UUID
and writes the `ifid:` line into the new story block; the field is thereafter
immutable — authors don't touch it. Stories that predate init (or lost the
line) use the existing `sharpee ifid` tool to mint one. No registry or
compiler-side duplicate tracking; immutability is a convention the toolchain
establishes at creation, per Treaty of Babel semantics (ADR-074).

**Missing-IFID policy (resolved 2026-08-02 interview)**: a story block with
no `ifid:` compiles with a **warning** — the story still builds and plays,
matching `ifidChannel`'s existing sparse-suppression on empty — and
`sharpee publish` (ADR-284) **hard-errors** without one. Treaty of Babel
compliance is enforced exactly where it matters (publication); test fixtures
and casual/learning stories stay IFID-free with no escape hatch needed.

### D4-A1 — Amendment: ADR-252 D3's client-config keys join the closed set (GH #221, 2026-08-03)

Implementation surfaced a collision this ADR had not reconciled: ADR-252 D3
(ACCEPTED 2026-07-22) deliberately carries the browser build's client config
as story-header `key:` lines — `client:`, `theme:`, `template:`, `themes:`,
`default-theme:`, `storage-prefix:` — read off the then-open `meta.fields`
map, precisely because `.story` projects are package.json-free. D4's closed
schema made all six parse errors and broke devkit's compile.

**Ruling (David, GH #221, 2026-08-03)**: extend the known set. The closed
schema gains ADR-252 D3's six keys as typed fields on `IRStoryFields`
(`themes` parses as a comma list, the rest as scalars). Both ADRs hold:
`.story` stays package.json-free (ADR-252), and typo protection now covers
the client keys too (a misspelled `tempate:` is a compile error naming the
known set, replacing devkit's old build-time warning). Additive grammar —
Chord 3.0.0 → 3.1.0 per ADR-257 D2. devkit's `KNOWN_HEADER_KEYS` set and its
unrecognized-key warning loop are retired; `readClientConfig` reads the typed
fields.

### D6 — Sequencing

This ADR lands before GH #200's launch block (it decides where `prologue`
lives), and its implementation should coordinate with GH #213 T2 (the Chord
language doc rewrite) so the docs are written once, against the post-298 block.

## Acceptance Criteria

- **AC-1 (end-to-end)**: the D1 example block compiles clean; IR meta carries
  the typed fields (title, authors ×2, testers ×2, ifid, id, story-version,
  prologue, description); at runtime `StoryInfoData` carries
  title/authors/testers/version/ifid/description and `prologueChannel` emits
  the prologue before the banner in the platform default rendering order.
- **AC-2 (removed form)**: positional `story "…" by "…"` produces the
  removed-form parse error with a fix-it naming the fielded shape.
- **AC-3 (closed schema)**: an unknown header key produces a parse error
  naming the known field set.
- **AC-4 (phrase reference)**: a lone-kebab-atom `prologue:`/`description:`
  value resolving to a defined phrase renders that phrase's text; a lone atom
  with no matching phrase is a compile error; a multi-word value stays
  literal. Phrase variants (cycling, randomly, first-time) behave per their
  normal semantics at prologue emission.
- **AC-5 (IFID policy)**: a story block with no `ifid:` compiles with a
  warning and plays with `ifidChannel` suppressed; `sharpee publish`
  hard-errors without one; `sharpee init` output contains a minted `ifid:`
  line. *(Amended 2026-08-03: no `sharpee publish` command exists yet — the
  publish-time hard-error is recorded as a day-one requirement in ADR-284;
  this ADR's implementation ships the compile warning and the init minting.)*
- **AC-6 (language version + snapshots)**: languageVersion bumps to 3.0.0;
  the 7 IR snapshot files regenerate; channel-scoped golden recordings that
  capture the info channel are re-blessed for the `author` → `authors` shape
  change — expected churn enumerated in the implementation plan, any diff
  outside it is a stop.

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
  `(meta.fields.blurb ?? '').trim()`. Shape: typed per-field schema (D4);
  unknown keys are a parse error, so no open-extras passthrough survives in
  the IR. The `blurb` → `description` rename (D1) hits the same consumers.
- **Channel-contract touch (resolved 2026-08-02 interview)**:
  `StoryInfoData.author` (`standard.ts:91`) is replaced by
  `authors: string[]` — a one-shot wire cutover per the no-backward-
  compatibility rule; no joined convenience copy. The wire stays data-only:
  consumers (browser client, IDE, zifmia) join/format the names for display
  in their own locale and layout, and every co-located consumer updates in
  the same commit per the shared wire-type discipline.
- **Golden-recording churn (ADR-294 D15)**: channel-scoped golden recordings
  that capture the info channel record the flattened `StoryInfoData` — the
  `author` → `authors` (and new `testers`) shape change diffs those goldens.
  This is expected, bounded churn: the implementation plan enumerates the
  affected recordings and re-blesses exactly that set (AC-6).
- The IDE's window title (ADR-279 Amendment A1, GH #188) reads `meta.title`
  from the IR and is unaffected — only the compiler's extraction changes.
- `docs/reference/chord-language.md` §1 and the grammar docs change again;
  fold into the GH #213 T2 rewrite rather than patching twice.

## Session

Drafted 2026-08-02, session 7dd736, from GH #187's thread (David's rulings 1–5
recorded there 2026-07-29). All seven open questions resolved via
`/devarch:adr-interview`, 2026-08-02, session 201a5d. Amendment D4-A1
(client-config keys, GH #221) ruled by David and folded 2026-08-03, session
e3b2eb, during implementation.
