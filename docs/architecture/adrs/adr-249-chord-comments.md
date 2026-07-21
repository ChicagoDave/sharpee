# ADR-249: Chord comments — top-level `##` lines only

## Status: ACCEPTED (2026-07-20 — all six syntax rulings made by David in-session 99aee6; adr-review 13/13 same session; ACCEPTED flip + platform go-ahead given by David same session, Phase 0a gate of docs/work/adr-245-phrasebooks/plan.md)

## Date: 2026-07-20

## Parent: ADR-210 (Chord story language). Governance: docs/architecture/chord-grammar-changes.md (Open Question 4 log — entry added with this ADR). Raised as a prerequisite to the ADR-245 phrasebook companion, so example/story files can carry author notes.

## Context

Chord has no comment syntax at all — nothing in the lexer, parser,
design.md, the grammar reference, or any shipped `.story` file. An
author cannot annotate a story file, leave a TODO, or label a section
without the text becoming prose or a parse error.

David raised the gap 2026-07-20 ahead of the phrasebook work ("I think
we need Chord to enable comments for end of line and comment blocks").
The design conversation then ran into the language's own constraint:
**prose is opaque to the parser** (design.md §5.2 — prose lines are
reconstructed from raw source, and the lexer cannot tell code from
prose). Any end-of-line marker stripped from arbitrary lines would eat
legitimate prose (`wait -- what?`, `jersey #12`), and any
inside-block comment rule inherits that ambiguity. Successive rulings
narrowed the surface: `#` for EOL and `##` for whole lines, then EOL
comments excluded from prose, then — David, closing the discussion —
"actually let's simplify this. no EOL comments - only ## comments
outside of all of our syntax blocks."

## Decision

Chord gains exactly one comment form:

1. **`##` comment lines, between top-level constructs only.** A line
   whose first non-space characters are `##` and which sits *outside
   every syntax block* is a comment: the line is discarded and
   contributes nothing to the program. "Outside" is **structural, not
   lexical** (David's ruling, this session: "create is a block — no
   comments in blocks"): a construct spans its header through its last
   body line (or `end X` terminator), and a `##` line anywhere in that
   span — even at indent 0 between the header and its indented body —
   is *inside* the block and is an error, never a comment. Legal
   positions are exactly: before the story header, between two
   top-level constructs, and after the last one.

   **Hard delimitation rule** (David, same session): a comment block —
   a maximal run of consecutive indent-0 `##` lines — must be
   **preceded and followed by blank lines**. A `##` line not
   blank-delimited is an error, never a comment. This makes the rule
   mechanically checkable at lex time and makes the between-constructs
   position self-evident in the source. **Explicit exception** (David,
   same session): the top of the file — `##` as the very first line is
   legal with no preceding blank; this is the file-header comment, the
   expected common case. Symmetrically, end of file counts as the
   trailing blank.

   ```story
   ## The ghost's locket drives chapter 3.
   ## Everything below is the winter voice.

   define phrasebook winter while the season is winter
     …
   end phrasebook
   ```

2. **Multi-line comments are stacked `##` lines.** There is no block
   construct (`comment … end comment` was considered and rejected) —
   consistency ruling: every line of a multi-line comment carries the
   `##` prefix.

3. **No end-of-line comments.** Trailing-`#` comments do not exist, on
   any line. A `#` anywhere in prose is prose and renders verbatim
   (prose opacity untouched); a `#` in a code position remains whatever
   it lexes as today (prose punctuation / parse error).

4. **Inside blocks, `##` has no comment meaning.** In prose positions it
   renders as prose, per opacity. In code positions it is a parse error
   like any stray tokens; when a code-position line begins with `##`,
   the parser raises the dedicated diagnostic
   **`parse.comment-inside-block`** with the fix-it "comments are only
   legal outside blocks, at the top level of the story file" —
   diagnostics wording, not grammar, per the governance log's scope
   note. (An *indented* `##` line is by definition inside a block or a
   stray line, so it is never dropped: prose renders it, code positions
   raise `parse.comment-inside-block`.)

5. **Two-layer enforcement; layout transparency is free.** Block extent
   is parser knowledge and blank lines are lexer knowledge, so the two
   rules split naturally:

   - The **lexer** flags indent-0 `##` lines as comment lines (it never
     drops them) and enforces the delimitation rule: any comment run
     not preceded AND followed by a blank line (or file boundary)
     raises **`lex.comment-blank-lines`** ("a ## comment must have a
     blank line before and after it").
   - The **parser** skips comment lines at its top-level dispatch
     position and raises **`parse.comment-inside-block`** on a comment
     line anywhere inside a construct — including the header/body
     split, which the delimitation rule already rejects at lex time:

     ```story
     create the locket
     ## still deciding on the chain material
       a thing, portable
     ```

     fails `lex.comment-blank-lines` (no blank delimiters), and the
     blank-delimited variant of the same placement fails
     `parse.comment-inside-block` (a `create` spans header through
     body; the comment is inside it).

   Paragraph state needs no special pass-through: a valid comment block
   is blank-delimited by rule, so the following line's `afterBlank` is
   `true` exactly as it would be with the comment absent.

Implementation seam: the lexer (`packages/chord/src/lexer.ts`) marks
indent-0 `##` lines (first non-space chars `##`) with a `comment` flag
on `Line` and raises `lex.comment-blank-lines` for runs missing a blank
delimiter; the parser skips flagged lines at top-level dispatch and
raises `parse.comment-inside-block` elsewhere — for indent-terminated
bodies (`create`), a flagged line whose next non-blank line is indented
is inside the construct (one-line lookahead); for `end`-terminated
bodies the position is unambiguous. Because recognition is by raw
prefix at indent 0, no token forms change and prose reconstruction is
untouched — indented `##` lines are ordinary lines.

## Acceptance criteria

1. **Lexer unit tests** (`packages/chord/tests`):
   - an indent-0 `##` line is emitted flagged as a comment line (single
     and stacked runs);
   - blank delimitation: a comment run without a preceding blank, or
     without a following blank, raises `lex.comment-blank-lines`
     (file start/end count as blank — a leading file-header comment
     and a trailing comment are both legal);
   - an *indented* `##` line is an ordinary unflagged `Line`;
   - `## ` with no text, and `##text` with no space, both count as
     comment lines (the prefix is `##`, not `## `).
2. **Parser/analyzer tests**:
   - a blank-delimited comment block between two top-level constructs
     is skipped — compiles as if absent;
   - a blank-delimited comment between a `create` header and its
     indented body raises `parse.comment-inside-block` (lookahead
     rule); the same placement without blanks raises
     `lex.comment-blank-lines`;
   - a comment line inside an `end`-terminated body (e.g. before
     `end phrasebook`) raises `parse.comment-inside-block` with the
     fix-it;
   - an indented `##` line in phrase prose renders verbatim in the
     compiled text (prose opacity);
   - an indented `##` line in a code position raises
     `parse.comment-inside-block` (the dedicated diagnostic applies at
     any indent when a code-position line's first non-space characters
     are `##`).
3. **End-to-end**: one in-repo `.story` fixture (or an existing story)
   gains top-level `##` comments — file header, a between-constructs
   note, and a stacked multi-line block — and compiles to an IR
   identical to the uncommented file **modulo source spans** (comments
   occupy source lines, so spans after a comment legitimately shift;
   the golden comparison strips spans), then plays a smoke transcript
   unchanged.
4. **Docs**: docs/reference/chord-grammar.md and
   docs/reference/chord-language.md document the form (example-first);
   the grammar-changes log row exists (landed with this ADR).

## Consequences

- Authors get file-level annotation (headers, TODOs, section labels)
  with zero risk to prose fidelity — no character of prose can ever be
  eaten by comment stripping, because nothing is ever stripped from a
  line that isn't wholly a comment at top level.
- Inside-block annotation does not exist. A `##` note accidentally
  placed inside a prose block **renders to the player** — prose opacity
  is absolute and this ADR accepts that hazard in exchange for the
  simplest possible rule. A lint for suspicious `##`-leading prose
  lines would be a future amendment if it bites in practice.
- Commenting-out code (disabling a `define` block by prefixing it) only
  works at top level and requires prefixing every line of the construct
  (stacked `##`); partially-prefixed blocks fail to parse loudly rather
  than half-disable.
- `##` at indent 0 becomes reserved at top level. No existing surface
  collides: no top-level construct begins with punctuation, and none of
  the in-repo `.story` files (3 at time of writing — verified by grep)
  contains a `#`-leading line.
- The grammar is extended by one form (a closed addition, Given 7
  clean: one concept — the comment — one form). Logged in
  chord-grammar-changes.md as an approved dated entry.
- Docs to update when implemented: docs/reference/chord-grammar.md,
  docs/reference/chord-language.md (and the site's Chord section, with
  the phrasebook docs phase).

## Session

session 99aee6, 2026-07-20
(`docs/context/session-20260720-2210-chord-foundations.md`) — raised by
David as a prerequisite before starting the ADR-245 phrasebook
companion; all rulings made in the same conversation (marker `#` →
superseded; `##` whole-line; simplification to top-level-only `##`
with no EOL comments; "create is a block — no comments in blocks"
structural ruling; blank-line delimitation hard rule; file-top
exception for the header comment).
