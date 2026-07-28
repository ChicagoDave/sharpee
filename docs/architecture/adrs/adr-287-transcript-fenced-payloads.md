# ADR-287: Transcript grammar — fenced literal payloads

## Status: ACCEPTED (2026-07-27, session fda0f0) — reviewed same day; comparison semantics and grammar rules folded from review findings

**Revisit note (2026-07-27)**: David flagged at acceptance that he may
want to rethink the test text delimiter again. If reopened, this ADR
returns to DRAFT and ADR-282's D2 serialization contract follows whatever
replaces it. Until then, fences as ruled here are the implementation
target.

## Date: 2026-07-27

## Parent: ADR-277 (integrated testing — the format's consumers), ADR-282 (play-to-test blessing — the motivating consumer). Platform change: `packages/transcript-tester`, ruled by David 2026-07-27 ("A is the way": additive fences over a sigil migration).

## Context — verified, not assumed

- **The transcript grammar has no lossless literal form.** Expected-output
  lines are bare prose: a response line shaped like `[...]` is consumed as
  a directive/assertion or silently dropped
  (`packages/transcript-tester/src/parser.ts:121-144`), leading `#`
  becomes a comment, leading `>` becomes a command. Matcher payloads
  (`contains "..."`) are single-line and cannot contain a double quote
  (`parser.ts:375`, regex `[^"]+`).
- **ADR-282's bless captures arbitrary story output.** Verbatim blessing
  must round-trip any response — including bracket-shaped lines (the
  decoration model itself uses `[name:content]` on the wire), quoted
  dialogue, and multi-line prose. Without a literal form, the IDE must
  refuse or silently weaken gestures — both wrong.
- **The alternative — changing the directive sigil** (`@OK:` etc.) — was
  considered and rejected: it migrates every existing transcript yet any
  line-prefix sigil can still collide with prose, so fences would be
  needed anyway. Fences buy losslessness; a sigil swap buys churn.

## Decision

### D1 — Fenced literal blocks, additive to the existing grammar

A fence is a line of **three or more backticks**, opening immediately
after an assertion directive line and closing with a backtick line of
**exactly the same length**. Everything between is literal — brackets,
`>`, `#`, quotes, blank lines, all uninterpreted:

    > read sign
    [OK]
    ```
    [Notice] The vault closes at dusk.
    Beware the "night porter."
    ```

- `[OK]` + fence → **exact match** against the fence content.
- `[OK: contains]` + fence → **contains match** with the fence content as
  the fragment (multi-line contains becomes possible).
- Content containing a three-backtick line is fenced with four (markdown's
  longer-fence rule); the closing fence must match the opening length
  exactly, so shorter runs inside are literal.

**Comparison semantics**: fence content is lossless as *storage*;
*matching* uses the runner's existing semantics — `[OK]` + fence compares
after `normalizeOutput` (the same CRLF/trim normalization bare `[OK]`
uses today, `runner.ts:1568`), and `[OK: contains]` + fence normalizes
the fragment identically and matches case-insensitively, exactly like the
inline form. Blessed tests therefore never flap on whitespace differences
between the play pane's rendered text and headless channel output.

**Grammar rules**:

- A fence may follow exactly **`[OK]`** or **payload-less
  `[OK: contains]`**, on the next line — no intervening blank line. (These
  are assertion lines; directives — `[UNTIL]`, `[WHILE]`, `[NAVIGATE TO]`
  — never take fences, and their matchers keep their single-line quoted
  form: out of scope here.)
- The fence delimiter is a line whose trimmed content is only backticks.
- A command may carry a fence **or** a classic expected-output block,
  never both — validation error.
- `[OK: contains]` with no following fence, an inline-payload assertion
  (`[OK: contains "x"]`) followed by a fence, an empty fence, and a fence
  after any other assertion or directive are all **validation errors** —
  loud, with line numbers (Acceptance 4's path).
- A fenced assertion behaves identically inside `[IF]`/`[WHILE]`/`[RETRY]`
  blocks and under `--chain` — attachment is at the assertion level, so
  parity is inherited; one test pins it.

### D2 — Existing transcripts are untouched

The fence is a new form, not a replacement: inline `contains "..."`,
expected-output blocks, and all directives parse exactly as before. No
migration, no suite churn. **Additive in practice, not by construction**:
the one collision window is a backtick-only line in fence-opening
position — narrowed by D1's attachment rule to lines immediately
following `[OK]`/payload-less `[OK: contains]`. A test pins that the full
existing dungeo/fernhill suites parse identically before and after, and
the format appendix documents the caveat for author-project transcripts.

### D3 — One grammar, both consumers

The fence lands in `transcript-tester`'s parser/runner (shared by
`sharpee test` and the IDE test panel — D3 parity is inherited, not
re-implemented), and the transcript-format appendix in the book/reference
documents it alongside the inline forms. ADR-282's serializer emits:
inline `contains "..."` when the fragment fits, fences otherwise; fenced
exact for verbatim bless.

## Acceptance

1. A transcript asserting a response that contains `[bracket]` lines, `"`
   quotes, `>`-leading and `#`-leading lines via `[OK]` + fence passes
   headless, and fails (with the fence content shown) when the response
   differs — both directions tested.
2. `[OK: contains]` + multi-line fence matches a fragment spanning lines;
   the four-backtick escape round-trips content containing a three-backtick
   line.
3. The existing transcript suites parse with byte-identical results before
   and after the change (D2 pinned).
4. A malformed fence (unclosed, or length-mismatched close) fails
   validation loudly with line numbers — never silently dropped.

## Consequences

- `transcript-tester` grows one parser/runner form; the CLI bundle and IDE
  panel inherit it through the shared package.
- The book's transcript appendix gains the fence section; ADR-282's D2
  serialization contract becomes fully encodable — no refusal or
  degradation path needed in the bless UX.
- Blessed verbatim tests become byte-faithful to story output, which makes
  them *more* prose-brittle than `contains` blesses — the trade is the
  author's per-gesture choice (ADR-282 Q-2 ruling), unchanged by this ADR.

## Session

Drafted 2026-07-27, session fda0f0, from the ADR-282 re-review's encoding
findings and David's fence-over-sigil ruling
(`docs/context/session-20260727-2100-main.md`).
