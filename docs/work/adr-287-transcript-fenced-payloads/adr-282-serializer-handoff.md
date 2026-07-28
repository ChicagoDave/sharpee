# Handoff: what ADR-282's bless serializer can rely on

**Written**: 2026-07-28, on completion of ADR-287 Phases 1–2.
**Audience**: whoever implements ADR-282's play-to-test save flow (IDE/Swift
side, Mac-only). This records the *implemented* grammar so that session does not
have to re-derive it from the ADR text.

ADR-282 D2 says a bless "never refuses a gesture or silently weakens an
assertion." That is now true — every response shape is encodable. Below is the
contract, verified against the shipped parser and runner.

## Which form to emit

| Gesture | Emit |
| --- | --- |
| Verbatim bless, no selection | `[OK]` + fence containing the response lines |
| Selection that fits inline | `[OK: contains "<selection>"]` |
| Selection that does not fit inline | `[OK: contains]` + fence containing the selection |
| Untagged turn | `[OK: any]` + the response as `#` comment lines (ADR-277 D5, unchanged) |

**"Fits inline" means all three**: single line, contains no `"`, and is
non-empty. The inline payload is parsed as `"[^"]+"` — a double quote genuinely
cannot appear, which is exactly why fences exist. When in doubt, emit a fence;
it is never wrong.

## Emitting a fence correctly

- Open with three backticks. If any response line is itself a run of three or
  more backticks, open with **one more backtick than the longest such run**; the
  close must repeat the opening length exactly.
- The fence must start on the line **immediately after** the assertion tag. A
  blank line between them detaches it and the backticks become prose.
- Write the response lines verbatim — do not trim, re-wrap, or collapse blank
  lines. Blank lines are meaningful (see normalization below).
- Do **not** also write an expected-output block for that command. A command
  carrying both is a validation error.
- A turn whose response is empty carries no bless affordance (ADR-282 D2
  already says this): an empty fence is a validation error.

## What matching does with it

Storage is lossless; *matching* uses the runner's existing normalization, so
blessed tests do not flap on whitespace:

- Both sides are normalized — CRLF → LF, every line trimmed, whole string
  trimmed. **Blank lines are preserved**, so a paragraph break is part of an
  exact match.
- `[OK]` + fence → exact equality after that normalization.
- `[OK: contains]` + fence → case-insensitive containment, fragment normalized
  identically. (The *inline* form matches its payload raw — a deliberate
  divergence, pinned by a test. Do not assume they behave the same.)

This is the practical consequence for capture parity: because normalization
trims each line but keeps paragraph breaks, the serializer must preserve the
response's blank lines but need not preserve trailing spaces or indentation.
ADR-282 D2's rule — serialize the **channel-flattened text**, never DOM
`textContent` — still stands, and this is why: the two differ precisely on
paragraph boundaries, which normalization does *not* smooth away.

## Error surface

Malformed fences are validation errors with line numbers, surfaced through
`validateTranscript`. Both consumers inherit them from that one return value:

- `sharpee test --json` (`packages/devkit/src/commands/test.ts`) turns them into
  a transcript-level `status: 'error'` NDJSON record whose `errorMessage`
  carries the line-numbered text — this is what the IDE Tests panel displays
  (pinned by a test in `packages/devkit/tests/test-json.test.ts`).
- The platform bundle's reporter prints them and skips the transcript.

A serializer that follows the rules above cannot produce these, but the panel
will show them for hand-edited transcripts.

## Failure display

A failing fenced assertion prints its fence content under `Expected (fenced):`.
Blank lines now render in the `Output` block too — without them, an exact-match
failure caused by a paragraph break displayed as two identical-looking texts.
Relevant to ADR-282's re-bless view: the old-vs-new diff must show blank lines
or the author cannot see why a verbatim bless broke.

## One finding worth carrying over

ADR-282 assumes stories emit arbitrary text, including bracket-shaped and
`>`/`#`-leading lines. In Chord today they **cannot** arrive as separate lines
from a plain description block: the compiler flattens a multi-line description
onto one line (verified — the compiled IR holds
`"[Notice] … Beware the \"night porter.\" > not a command # not a comment"` as a
single `sign.description` variant). Quotes and brackets do occur in real story
text; `>`- and `#`-*leading lines* may not be reachable from descriptions at
all. Channels or other emitters may still produce them, so the fence grammar
covers the case regardless — but the risk ADR-282 was guarding against is
narrower than it assumed, and the bless UX need not be designed around it.
