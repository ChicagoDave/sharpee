# ADR-287: Transcript grammar — literal text blocks

## Status: ACCEPTED (2026-07-28, session 2f31b0) — reopened and re-decided under the 2026-07-27 acceptance note's delimiter revisit, then interviewed (1 question resolved) and reviewed clean. Previously ACCEPTED 2026-07-27 with backtick fences; that form is superseded below and does not ship.

## Date: 2026-07-27 (delimiter reopened and re-decided 2026-07-28)

## Parent: ADR-277 (integrated testing — the format's consumers), ADR-282 (play-to-test blessing — the motivating consumer). Platform change: `packages/transcript-tester`, ruled by David 2026-07-27 ("A is the way": an additive literal form over a sigil migration) and re-ruled 2026-07-28 (`text` / `end text` over backtick fences).

## Context — verified, not assumed

- **The transcript grammar has no lossless literal form.** Expected-output
  lines are bare prose: a response line shaped like `[...]` is consumed as
  a directive/assertion or silently dropped (`parser.ts:162` consumes
  any `[...]`-shaped line; `parser.ts:233` sweeps the rest into
  expected-output), leading `#`
  becomes a comment, leading `>` becomes a command. Matcher payloads
  (`contains "..."`) are single-line and cannot contain a double quote
  (`parser.ts:496`, regex `[^"]+`).
- **ADR-282's bless captures arbitrary story output.** Verbatim blessing
  must round-trip any response — including bracket-shaped lines (the
  decoration model itself uses `[name:content]` on the wire), quoted
  dialogue, and multi-line prose. Without a literal form, the IDE must
  refuse or silently weaken gestures — both wrong.
- **The alternative — changing the directive sigil** (`@OK:` etc.) — was
  considered and rejected: it migrates every existing transcript yet any
  line-prefix sigil can still collide with prose, so a literal form would
  be needed anyway. A literal block buys losslessness; a sigil swap buys
  churn.
- **Backtick fences were the 2026-07-27 answer and are withdrawn.** They
  work, but a transcript is an author's artifact and a run of backticks is
  a markdown convention that arrived because the format's first reader was
  a developer. The escape rule ("open with four if the payload holds
  three") is a counting rule, not something an author would reach for.
- **Indentation was considered on 2026-07-28 and rejected on evidence.**
  It is the most author-native option — Chord already delimits every
  description that way — and it needs no escape rule at all. But the
  reader must dedent by the *minimum* indent across the block, which
  is only recoverable when at least one line began at column 0. Dungeo's
  `read leaflet` response is indented 0/25/6/2 and survives; a bless of
  just its centred line (`WELCOME TO DUNGEON`, indent 25) does not — the
  written block's minimum indent is the whole of it, and the reader hands
  back the text at column 0 with no way to know 25 spaces were lost.
  Every-line-indented responses and one-line selections are ordinary, and
  the loss is silent: `normalizeOutput` trims each line before comparing,
  so the assertion still passes while Acceptance 5's "identical to the
  captured response" has quietly stopped being true. Rejected for that.

## Decision

### D1 — Literal `text` blocks, additive to the existing grammar

A literal block opens with a line reading exactly **`text`** immediately
after an assertion directive line, and closes with a line reading exactly
**`end text`**. Everything between is literal, at its original columns —
brackets, `>`, `#`, quotes, blank lines, leading whitespace, all
uninterpreted and all preserved:

    > read sign
    [OK]
    text
    [Notice] The vault closes at dusk.
    Beware the "night porter."
    end text

- `[OK]` + block → **exact match** against the block content.
- `[OK: contains]` + block → **contains match** with the block content as
  the fragment (multi-line contains becomes possible).

**Why a keyword and not a delimiter run**: `text` … `end text` names what
the block is, in the same shape Chord already uses for `on reading it` …
`end on`. An author reading a saved test sees a manuscript direction
rather than a punctuation convention.

**The close rule, exactly** — this is the part a counting delimiter got
for free and a keyword has to state:

- The opener is a line whose content, ignoring trailing whitespace, is
  exactly `text`, with **no leading whitespace**.
- The close is a line whose content, ignoring trailing whitespace, is
  exactly `end text`, with **no leading whitespace**.
- Because both must sit at column 0, an *indented* `end text` inside the
  payload is literal content and does not close the block. Only a payload
  line at column 0 reading exactly `end text` can collide.

**There is no escape — `end text` at column 0 is reserved** (David's
ruling, 2026-07-28). A story must not end a phrase with the reserved
syntax, exactly as it must not name a variable after a keyword in any
other language. No label, no doubling, no counting: one opener, one
closer, nothing to teach beyond the two words.

This is safe to rule because **the collision can never be silent** — it is
already caught by two grammar rules stated below, in every arrangement:

- Payload contains a column-0 `end text` with content after it → the block
  closes early, the remaining payload lines fall through to the classic
  expected-output path (`parser.ts:233`), and the command now carries a
  block *and* an expected-output block → **validation error**.
- Payload's colliding line is its last → same path, with the true
  terminator as the stray expected-output line → **validation error**.
- Payload's colliding line is its first → the block closes with no content
  → **empty block validation error**.

So a story whose prose happens to hit the reserved line fails loudly with
a line number at parse time, and the author reworks the phrase. What is
NOT acceptable, and what this rule avoids, is a block that closes early
and still produces a plausible-looking assertion; the both-forms rule is
what makes that impossible, and a test pins it (Acceptance 2).

**Comparison semantics**: block content is lossless as *storage*;
*matching* uses the runner's existing semantics — `[OK]` + block compares
after `normalizeOutput` (the same CRLF/trim normalization bare `[OK]` uses
today, `runner.ts:1590`), and `[OK: contains]` + block normalizes the
block fragment the same way before matching case-insensitively. **The
inline form is deliberately left alone**: `[OK: contains "x"]` matches
against its raw value exactly as it always has (`runner.ts:1208-1210`
normalizes `assertion.fence` and passes `assertion.value` through
untouched). That divergence is intentional — a multi-line block fragment
could never match without normalization, while an inline payload is a
single line the author typed — and pinning it is part of this ADR's test
surface. Blessed tests therefore never flap on whitespace differences
between the play pane's rendered text and headless channel output.
Storage is byte-faithful even though matching is normalized — that
distinction is what makes the indentation form's silent loss unacceptable
and this form's preservation meaningful.

**Grammar rules**:

- A block may follow exactly **`[OK]`** or **payload-less
  `[OK: contains]`**, on the next line — no intervening blank line. (These
  are assertion lines; directives — `[UNTIL]`, `[WHILE]`, `[NAVIGATE TO]`
  — never take blocks, and their matchers keep their single-line quoted
  form: out of scope here.)
- A command may carry a block **or** a classic expected-output block,
  never both — validation error.
- `[OK: contains]` with no following block, an inline-payload assertion
  (`[OK: contains "x"]`) followed by a block, an empty block, an unclosed
  block, a close whose label does not match the opener, and a block after
  any other assertion or directive are all **validation errors** — loud,
  with line numbers (Acceptance 4's path).
- A block assertion behaves identically inside `[IF]`/`[WHILE]`/`[RETRY]`
  blocks and under `--chain` — attachment is at the assertion level, so
  parity is inherited; one test pins it.

### D2 — Existing transcripts are untouched; backticks do not ship

The block is a new form, not a replacement for the inline matchers:
inline `contains "..."`, expected-output blocks, and all directives parse
exactly as before. No migration of existing suites, no churn.
**Additive in practice, not by construction**: the one collision window is
a column-0 line reading exactly `text` in block-opening position —
narrowed by D1's attachment rule to the line immediately following
`[OK]`/payload-less `[OK: contains]`. A test pins that the full existing
dungeo/fernhill suites parse identically before and after, and the format
appendix documents the caveat for author-project transcripts.

Backtick fences are **not** a second supported form. They were never
released to authors — the only artifact using them is the in-repo fixture
`stories/dungeo/tests/transcripts/adr-287-fenced-literals.transcript`,
rewritten as part of this change. Per standing practice there is no
two-format reader and no migration window: one form, one cutover.

### D3 — One grammar, both consumers

The block lands in `transcript-tester`'s parser/runner (shared by
`sharpee test` and the IDE test panel — D3 parity is inherited, not
re-implemented), and the transcript-format appendix in the book/reference
documents it alongside the inline forms. ADR-282's serializer emits:
inline `contains "..."` when the fragment fits, blocks otherwise; a block
exact-match for verbatim bless.

## Acceptance

1. A transcript asserting a response that contains `[bracket]` lines, `"`
   quotes, `>`-leading and `#`-leading lines via `[OK]` + block passes
   headless, and fails (with the block content shown) when the response
   differs — both directions tested.
2. `[OK: contains]` + multi-line block matches a fragment spanning lines.
   A block whose payload contains a column-0 `end text` line **fails
   validation with a line number** — asserted in all three arrangements
   (colliding line first, middle, last), because the danger the reserved
   ruling accepts is not the failure but a silent early close that still
   produces a plausible assertion. Also pinned: an *indented* `end text`
   inside a payload is content and does not close the block.
3. The existing transcript suites parse with byte-identical results before
   and after the change (D2 pinned).
4. A malformed block (unclosed, empty, or label-mismatched close) fails
   validation loudly with line numbers — never silently dropped.
5. **Storage is byte-faithful**: a response whose every line is indented
   (and a one-line selection carrying leading whitespace) round-trips with
   its indentation intact — the case that ruled out the indentation form.
   Asserted on the stored text, not on whether the test passes, since
   normalization would hide the loss.

## Consequences

- `transcript-tester` grows one parser/runner form; the CLI bundle and IDE
  panel inherit it through the shared package.
- The book's transcript appendix gains the literal-block section; ADR-282's
  D2 serialization contract becomes fully encodable — no refusal or
  degradation path needed in the bless UX.
- Blessed verbatim tests become byte-faithful to story output, which makes
  them *more* prose-brittle than `contains` blesses — the trade is the
  author's per-gesture choice (ADR-282 Q-2 ruling), unchanged by this ADR.
- **`end text` at column 0 becomes reserved in story prose.** This is the
  one thing the format takes from an author that it did not take before,
  and it qualifies ADR-282 D2's "nothing is unencodable": a response ending
  a phrase with the reserved line cannot be blessed verbatim until the
  prose changes. The cost is bounded by the collision being loud rather
  than silent (D1), and by how narrow the reserved shape is — a whole line,
  at column 0, reading exactly those two words. The realistic exposure is
  Sharpee's own teaching material (the book's transcript appendix, the zoo
  tutorial), where an example demonstrating a literal block would trip it;
  those examples must indent the terminator, which the indented-`end text`
  rule makes safe.
- ADR-282's already-implemented Phase 2 serializer emits backtick fences
  and must be reworked to this form before it ships; its Phase 2 tests
  encode the old delimiter and follow. That work is scoped by this ADR, not
  by ADR-282 — which is what its D2 "follows whatever replaces it" clause
  reserved.

## Session

Drafted 2026-07-27, session fda0f0, from the ADR-282 re-review's encoding
findings and David's fence-over-sigil ruling
(`docs/context/session-20260727-2100-main.md`). Delimiter reopened and
re-decided 2026-07-28, session 2f31b0, on evidence from Dungeo's Riddle
Room and `read leaflet` responses rendered in all three candidate forms.
