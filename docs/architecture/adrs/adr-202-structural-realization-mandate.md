# ADR-202: The Structural Realization Mandate

## Status: ACCEPTED

> Extracted from ADR-201 §1 on 2026-06-30. Dialogue (ADR-201) is what *forced* this
> invariant, but it binds the realization of **every** `Phrase` atom — past (ADR-195
> Slot, ADR-196 Optional/Choice, ADR-197 Pronoun, ADR-198 Numeral, ADR-199 Verb,
> ADR-200 Verbatim) and future. It is recorded as its own ADR so those ADRs cite a
> focused mandate rather than a clause of the dialogue ADR. Reviewed via `/adr-review`
> 2026-06-30 (15ef21, multi-ADR with ADR-201): AC-1 exemption allowlist corrected to
> match the existing realizer; ACCEPTED.

## Date: 2026-06-30

## Terminology

- **Realize / realization** — turning a `Phrase` AST into final text (the Assembler's job).
- **Run** — a flattened fragment of realized text with metadata, the Assembler's
  intermediate representation between the AST and the output string
  (`lang-en-us/src/assembler/english-assembler.ts:67`).
- **Reconciliation pass** — a single post-realization walk over the `Run` sequence that
  resolves capitalization, punctuation merging, empty-absorption, and whitespace using
  each run's metadata — never by pattern-matching prose.

## Context

The phrase-algebra pipeline is structural everywhere it already exists: a typed `Phrase`
union (`if-domain/src/phrase.ts`), a recursive realizer (`english-assembler.ts`),
structural empty-absorption in `renderList`, and a single `collapseWhitespace` authority
(ADR-183). Each atom owns a *bounded, local* surface rule — indefinite article over a
rendered NounPhrase head, `capitalizeSentenceStart` over a NounPhrase when the
`{capitalize}` hint is set (`english-assembler.ts:142`), suppletive/regular verb
morphology over a lemma token (`english-assembler.ts` Verb realizer).

The recurring temptation when a new atom needs a cross-fragment effect — sentence-start
capitalization, a comma before an opening quote, terminal punctuation inside a closing
quote, cleanup of a comma an absorbed clause left behind — is **string post-processing**:
scan the assembled output for a period and capitalize the next letter; find `,"` and fix
spacing; strip a dangling comma. That is regex recovering structure the realizer just
discarded. It cannot get nesting right (a `Quote` inside a `Choice` variant inside a
`Slot`) without quietly becoming an ad-hoc parser, and it bakes one locale's orthography
into scattered string ops. ADR-201 (dialogue) is the first scenario class that forces
several of these at once, which is what surfaced the need to state the rule explicitly.

## Decision

**Invariant.** Text is produced by composing and realizing a typed `Phrase` AST. The
Assembler MAY inspect a node's **own realized surface** to apply a bounded linguistic rule
(indefinite article over the rendered head; capitalizing a fragment's first glyph;
suppletive verb morphology over a lemma token). The Assembler MUST NOT **pattern-match
across the concatenated output** to recover grammatical structure — sentence boundaries,
quote nesting, clause membership, or which punctuation an absorbed clause left behind. No
`regex` / `sed` / `String.replace` is permitted for **structure discovery** in
realization.

**The line, stated crisply:** inspecting *this node's* text to apply *this node's*
linguistic rule = allowed; reading *the neighbours' / the whole output's* text to infer
structure = forbidden (the structure is already in the AST and the run metadata — use it).

**We do NOT re-parse the output.** Re-parsing assembled text to recover its structure is
the forbidden anti-pattern in disguise: it recovers structure the realizer discarded one
step earlier. The correct move is to **keep the structure through realization** — emit it
as `Run` edge metadata and resolve it in one structural reconciliation pass — not to throw
it away and rebuild it.

**Permitted helpers (the exemption allowlist).** A function that applies a *token/run-local*
linguistic rule — or normalizes whitespace — remains allowed even if it uses string ops
internally. The boundary is what the regex *recovers*: a token's own morphology/glyph, or
whitespace, is fine; grammatical structure (sentence boundaries, quote nesting, clause
membership, absorbed-clause punctuation) inferred from prose is not. The current realizer's
compliant uses, which the AC-1 lint MUST exempt by name:

- `regularPluralVerb` — own-lemma verb morphology (`/(?:s|x|z|ch|sh)es$/.test(lemma)`,
  `english-assembler.ts:165`); operates on a single lemma token's own surface.
- `capitalizeSentenceStart` — upper-cases the first glyph of a fragment (`:451`).
- `indefiniteArticle` — reads a head's leading sound.
- `collapseWhitespace` — collapses `\s+` and trims (verbatim-exempt, ADR-183, `:413`). Note
  this helper *does* read the adjacent run's trailing whitespace to join runs; that is
  whitespace normalization, not structure recovery, and is permitted.
- `splitRunsOnNewlines` — segments a run on literal newlines into blocks (`:698`); splits
  on explicit content separators, not inferred grammatical structure.

New helpers join this allowlist only if they meet the same token-local-or-whitespace test.

## Consequences

- **Constrains all future text atoms.** A new atom that needs a cross-fragment effect adds
  `Run` edge metadata and resolves it in the reconciliation pass; it does not post-process
  assembled prose. ADRs introducing atoms cite this ADR rather than re-deriving the rule.
- `capitalizeSentenceStart` is demoted from sentence-start *authority* to a glyph helper:
  it may still upper-case a fragment, but *which* fragment starts a sentence is decided by
  structure (a `Sentence` boundary / `RenderContext` position state — ADR-201 §4), not by
  searching prose for `. `.
- Enforcement is mechanizable: a lint rule banning `RegExp` literals and
  `String.prototype.replace` inside the realizer module (excluding the named glyph helpers
  above) makes a violation fail CI rather than rely on review vigilance.
- No runtime cost: the mandate is a design constraint, not a code path. It removes a class
  of fragile post-processing rather than adding work.
- **Sequencing.** This ADR is the prerequisite: accept it and land its AC-1 lint first or
  alongside ADR-201 (the lint stands alone — it asserts a property of the existing realizer
  and does not need dialogue). AC-3 (a new atom driving structure via run metadata) is
  *verified* when ADR-201's `Sentence`/`Quote` land. The 201↔202 mutual reference is a
  citation cross-link, not a dependency cycle — 202 is foundational; 201's "first
  application" backref is illustrative. Note ADR-201 AC-6 *is* this ADR's AC-1 — one lint,
  implemented once.

## Acceptance Criteria

1. **No structure-recovery string ops.** No `RegExp` / `String.prototype.replace` is used
   for structure discovery (sentence boundaries, quote nesting, clause membership,
   absorbed-clause punctuation) anywhere in the realizer. A lint rule or test asserts this
   over `english-assembler.ts`, exempting the named token-local/whitespace helpers in the
   allowlist above (`regularPluralVerb`, `capitalizeSentenceStart`, `indefiniteArticle`,
   `collapseWhitespace`, `splitRunsOnNewlines`). The current realizer satisfies this lint
   as written — the allowlist is exactly its existing compliant regex uses.
2. **Exempt helpers stay token-local or whitespace-only.** Each allowlisted helper either
   applies a single token/run's own rule or normalizes whitespace; none recovers grammatical
   structure from prose. A test or review note confirms no exempt helper reads adjacent runs
   *to infer structure* (whitespace joining, as in `collapseWhitespace`, is permitted).
3. **Structure flows as metadata.** Any new cross-fragment effect (cap, punctuation merge,
   absorption) introduced after this ADR is driven by `Run` edge metadata + the
   reconciliation pass, demonstrated by at least one atom (ADR-201's `Sentence`/`Quote`).

## Options considered

- **A — Regex / string post-processing on assembled output.** Rejected: cannot handle
  nesting or empty-absorption without becoming an ad-hoc parser; bakes orthography into
  scattered string ops; only end-to-end testable.
- **B — Re-parse the output string into a structure, then fix it.** Rejected: recovers
  structure the realizer just discarded; strictly more work than not discarding it.
- **C — Structured realization: richer runs + reconciliation pass + position state
  (chosen).** Each node's punctuation/casing contract is unit-testable in isolation;
  locale rules stay in the locale realizer; the AST stays language-neutral.

## Relationships

- **Generalizes:** the structural patterns already shipped by ADR-190 (lists/punctuation),
  ADR-183 (whitespace authority — Assembler-owned), ADR-196 `renderList` empty-absorption.
- **Forced by / first applied in:** ADR-201 (Dialogue & Speech Emission) — `Sentence`/
  `Quote` kinds, richer `Run`, the reconciliation pass, and `RenderContext` position state
  are this mandate's first concrete realization.
- **Binds:** ADR-195 (Slot), ADR-196 (Optional/Choice), ADR-197 (Pronoun), ADR-198
  (Numeral), ADR-199 (Verb), ADR-200 (Verbatim), and every future atom ADR.

## Session

Extracted from ADR-201 §1 in session 2026-06-30 (15ef21) during `/adr-review`, per the
decision that a cross-cutting invariant binding all atoms deserves a focused, citable home
rather than living inside the dialogue ADR. Pending `/adr-review` and acceptance.
