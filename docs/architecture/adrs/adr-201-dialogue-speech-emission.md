# ADR-201: Dialogue & Speech Emission, and the Structural Realization Mandate

## Status: ACCEPTED

> Drafted 2026-06-30 by Claude for David's review. Continues the ADR-192 phrase-algebra
> roadmap into the **dialogue** scenario class. Scenario source:
> `docs/work/dynamic-text/dynamic-text-scenarios.md` **§L (S39–S46)**. Composes the
> existing atoms — `Verb` (ADR-199), `Pronoun` (ADR-197), `Choice`/`Optional` (ADR-196),
> `Slot` (ADR-195) — and adds the structural machinery dialogue needs that description
> never forced. **Builds on ADR-202** (The Structural Realization Mandate), which was
> extracted from this ADR's original §1 because it binds every atom, not just dialogue.
> Reviewed via `/adr-review` 2026-06-30 (15ef21); Open Questions Q1/Q2/Q5 resolved (see
> Decision + Open questions below), contract shapes pinned. Lands on `main` via a phase
> branch following the ADR-196/197 pattern.

## Date: 2026-06-30

## Terminology

- **Realize / realization** — turning a `Phrase` AST into final text (the Assembler's job).
- **Run** — a flattened fragment of realized text with metadata, the Assembler's
  intermediate representation between the AST and the output string.
- **Reconciliation pass** — a single post-realization walk over the `Run` sequence that
  resolves capitalization, punctuation merging, empty-absorption, and whitespace using
  each run's metadata — never by pattern-matching prose.
- **Dialogue tag / attribution** — the "X says," / ", she asks" framing around an utterance.
- **Utterance** — the quoted words a character speaks.

## Context

Section L of the scenario inventory enumerated dialogue/speech emission for the first
time. NPC speech is not a new primitive — it *composes* atoms we already ship — but it
composes them in a shape ("someone says something") that exposes invariants description
rendering never hit:

- Sentences that **begin with a pronoun** ("**He** says…") need capitalization the
  `{pronoun:case}` atom can't currently provide (S40 — `{capitalize pronoun:subject}`
  throws; `capitalize` is a NounPhrase-only hint at `english-assembler.ts:141–142`; there
  is no auto sentence-start cap — `capitalizeSentenceStart` is invoked *only* by the
  `np.capitalize` hint). This is the gap that reached ADR-197 as *aspirational prose*
  rather than an acceptance criterion — the trigger for this ADR.
- **Embedded quoted sentences** need a comma before the opening quote, a capital on the
  first quoted word, and terminal punctuation **inside** the closing quote — composed
  cleanly even when the utterance is a bound param, a `Choice` variant, or an `Optional`
  (S42). Today these are literal characters authors hand-type (`talking.ts:34` —
  `says, \"Hello there!\"`), brittle the moment the utterance is dynamic.
- **Speech verbs** must agree with the speaker (S39). The `Verb` atom already conjugates
  arbitrary lemmas (`english-assembler.ts:154–218`), but the stdlib `talking` catalog
  hardcodes the literal `says`, wrong for a plural or 2nd-person speaker.

The recurring temptation when implementing these is **string post-processing**: scan the
assembled output for a period and capitalize the next letter; find `,"` and fix spacing;
strip a dangling comma left by an absorbed clause. That is regex recovering structure the
realizer just discarded — and it cannot get nesting (a `Quote` inside a `Choice` variant
inside a `Slot`) right without quietly becoming an ad-hoc parser. The pipeline is already
structural everywhere else (typed AST, recursive realizer, structural empty-absorption in
`renderList`); dialogue must not be the place it degrades into text hacking.

## Decision

### 1. Foundational dependency: the Structural Realization Mandate (ADR-202)

This ADR's structural machinery (§3 richer runs, §3.2 reconciliation pass, §4 position
state) exists to satisfy the **Structural Realization Mandate**, originally drafted as this
ADR's §1 and now extracted to **ADR-202** because it binds every atom, not only dialogue.

In short (see ADR-202 for the full statement, helpers, and acceptance criteria): text is
produced by realizing a typed `Phrase` AST; the Assembler MAY inspect a node's **own**
realized surface for a bounded linguistic rule, but MUST NOT pattern-match across the
concatenated output to recover structure (sentence boundaries, quote nesting, clause
membership, absorbed-clause punctuation), and MUST NOT re-parse the output. Structure is
carried forward as `Run` edge metadata (§3.1) and resolved in one reconciliation pass
(§3.2) — never rebuilt by regex/`String.replace`. Dialogue is the scenario class that
*forces* this; ADR-202 records it as the general rule.

### 2. New language-neutral `Phrase` kinds (if-domain) — additive to the union

Two kinds join the closed 13-member union (the `export type Phrase` block in
`if-domain/src/phrase.ts`, taking it to 15):

- **`Sentence` (`kind: 'sentence'`)** — wraps content and declares a sentence boundary.
  Owns: leading-capital *requirement* (its first realized glyph is capitalized) and an
  optional terminal punctuation (`.`/`?`/`!`, default `.`) emitted at its close. A
  `Sentence` is the structural carrier of "capitalize the start" — replacing the
  string-scanning `capitalizeSentenceStart` as the *authority* (the function may remain a
  glyph-level helper the pass calls, but sentence-start is now driven by structure).
- **`Quote` (`kind: 'quote'`)** — wraps an utterance `Phrase`. Owns: the surrounding quote
  glyphs (locale-tuned via `LocaleSettings`), capitalization of the utterance's first word,
  terminal-punctuation-**inside** the closing quote, and a signal to its enclosing dialogue
  tag that an attributive comma is owed. A `Quote` implies a `Sentence` boundary for its
  contents.

**Pinned contract shapes** (matching the ADR-196 precedent of declaring the fields, not
just describing them):

```ts
// if-domain/src/phrase.ts — added to the closed union
interface Sentence {
  kind: 'sentence';
  child: Phrase;
  terminal?: '.' | '?' | '!';   // default '.'; emitted at the sentence close
}

interface Quote {
  kind: 'quote';
  utterance: Phrase;            // quote glyphs + first-word cap + terminal-inside are
                                // applied by the realizer; glyphs come from LocaleSettings
  terminal?: '.' | '?' | '!';   // punctuation placed INSIDE the closing quote; default '.'
}

// Pronoun (ADR-197) gains the S40 capitalize seam — additive optional field:
interface Pronoun {
  kind: 'pronoun';
  case: PronounCase;            // existing
  capitalize?: boolean;         // NEW — explicit override; absent → driven by position state
}
```

**`Pronoun` gains capitalization (the S40 fix — Q1 resolved: BOTH mechanisms).** Two paths
that compose, mirroring the existing per-atom case authority:

1. **Structural default.** A `Pronoun` realized in sentence-initial position (per the §4
   position state) capitalizes automatically — "He says…" needs no annotation. This is the
   common dialogue case and the reason S40 "falls out for free."
2. **Explicit override.** `{capitalize pronoun:subject}` sets `Pronoun.capitalize = true`,
   forcing a cap regardless of position (logical clause starts the detector can't see).

   **Precedence:** `capitalize === true` ⇒ cap. `capitalize === false` ⇒ never cap, even
   sentence-initial (an explicit author opt-out). `capitalize` absent ⇒ cap iff
   sentence-initial. (Mechanism, not a third kind.)

A dialogue tag — "The merchant says, '…'" — is **composition**, not a new kind: a
`Sequence`/`PhraseList` of `[ NounPhrase|Pronoun subject, Verb(speech-lemma), Quote ]`.
A `{say:speaker utterance}` parser sugar that would assemble that shape is **deferred past
v1** (Q2 resolved — see §5); the AST stays the primitive kinds either way.

### 3. The richer `Run` and the single reconciliation pass

#### 3.1 Runs carry grammatical-edge metadata

Today `Run = { text, verbatim, deco }` (`assembler/english-assembler.ts:67`). Extend it
with optional edge metadata the realizers emit while walking the AST — never by
concatenating text and grepping for structure. All fields optional, so an absent value
degrades to today's behavior:

```ts
// assembler/english-assembler.ts — extended Run
interface Run {
  text: string;                                          // existing
  verbatim: boolean;                                     // existing (whitespace-exempt)
  deco: ReadonlyArray<{ className: string; value?: string }>; // existing

  sentenceInitial?: boolean;     // this run begins a sentence → cap its first glyph
  capEligible?: boolean;         // first glyph may be capitalized (e.g. a Pronoun run)
  quoteOpen?: boolean;           // run carries an opening quote glyph
  quoteClose?: boolean;          // run carries a closing quote glyph
  ownsLeadingPunct?: ',' | null;            // attributive comma this run owns at its start
  ownsTrailingPunct?: '.' | '?' | '!' | null; // terminal punct this run owns at its end
}
```

The realizer **emits** these as structural facts; the reconciliation pass (§3.2) is the
only consumer. `null` means "this edge is owned and deliberately empty" (distinct from
`undefined` = "no claim"), so the pass can tell an intentionally punctuation-free edge from
an unmarked one.

#### 3.2 One structural reconciliation pass

After realization produces `Run[]`, a single pass resolves, using metadata only:

1. **Capitalization** — capitalize the first glyph of each run flagged `sentenceInitial`
   (or first-in-`Quote`). Driven by flags, never by searching for `. ` in prose.
2. **Punctuation merging** — when a tag owns a comma and an adjacent `Quote` owns a period,
   reconcile to `,"` / `."` per the locale rule; never emit doubled or orphaned marks.
3. **Empty-absorption** — generalize the existing `renderList` empty-drop to the whole run
   sequence so an absorbed `Optional`/`Choice`/`Slot` leaves no stray punctuation/space.
4. **Whitespace collapse** — the existing `collapseWhitespace` runs **last**, unchanged, on
   the reconciled runs — whitespace normalization (ADR-183 authority), an ADR-202-exempt
   helper. (It may read an adjacent run's trailing space to join runs; that's whitespace,
   not structure recovery.)

### 4. `RenderContext` position state threaded through the recursion

`RenderContext` (already carries `textState`, `reference`, `narrative`) gains a small,
read-mostly **position** sub-state, threaded down and updated by the recursive realizer as
it descends:

```ts
// RenderContext gains an optional position seam
interface RenderPosition {
  sentenceInitial: boolean;          // next atom realizes at a sentence start
  insideQuote: boolean;              // currently within a Quote's utterance
  pendingTerminal?: '.' | '?' | '!'; // terminal punct owed when the sentence closes
}
// RenderContext.position?: RenderPosition   // optional — see degradation below
```

A `Pronoun` (or any atom) realized while `position.sentenceInitial` is true marks its run
`capEligible + sentenceInitial` — **the recursive structure that makes S40 fall out without
scanning output** (Q1 mechanism 1). Optional, matching the `nounPhraseFor?` /
`slotContributions?` optional-seam precedent: an absent `position` degrades to "not
sentence-initial, not in quote" — exactly today's behavior, so existing render paths that
don't supply it are unaffected.

### 5. Parser surface (lang-en-us)

- `{quote:utterance}` → a `Quote` over the bound `utterance` param. **In v1.**
- `{capitalize pronoun:subject}` is now **legal** (no longer a parse/realize throw). In v1.
- `{say:speaker utterance}` sugar (the composed tag shape of §2) is **deferred past v1**
  (Q2 resolved). v1 authors build the tag by explicit composition —
  `{capitalize the speaker} {verb:says speaker}, {quote:line}` — so the tag's shape (comma
  ownership, leading- vs trailing-tag, subject article/case) is validated by real usage
  before a single-token syntax locks it. `{say:}` is purely additive when added later; the
  AST primitives are identical, so deferring costs nothing structurally.
- A `{sentence:…}` form is **not** exposed to authors initially — `Sentence` is emitted by
  message structure and by `Quote`; revisit if authors need explicit boundaries.
- All new forms follow the ADR-202 mandate / parser discipline: unknown heads, bad cases,
  or unbound params raise `PhraseParseError` **at parse time**, never a silent realize-time
  `Empty`.

### 6. Fix the stdlib dialogue catalog (S39)

Replace the literal speech verbs in `lang-en-us/src/actions/talking.ts:34–40` (and siblings
`asking`/`telling`/`answering`) with `{verb:says <speaker>}` so attribution agrees with the
speaker's number/person — in the `talking` catalog the speaker param is `target` (e.g.
`greets_back` becomes `{capitalize the target} {verb:says target}, {quote:greeting}`). The
catalog already uses this exact mechanism elsewhere (`nothing_to_say`:
`"{capitalize the target} {verb:has target} nothing particular to say."`,
`talking.ts:45`), so this extends a proven in-file pattern. Low-risk near-term fix that
uses only ADR-199 and does not depend on §2–§5; it can land first as a confidence-builder.

## Options considered

- **A — Regex/string post-processing on assembled output.** Rejected by ADR-202: cannot
  handle nesting or empty-absorption without becoming an ad-hoc parser; bakes English
  orthography into scattered string ops; only end-to-end testable.
- **B — Re-parse the output string into a structure, then fix it.** Rejected: recovers
  structure the realizer just discarded (ADR-202); strictly more work than not discarding it.
- **C — Structured realization: richer runs + reconciliation pass + position state
  (chosen).** Extends the existing recursive realizer; each node's punctuation/casing
  contract is unit-testable in isolation; locale rules stay in the locale realizer; the AST
  stays language-neutral.
- **Speech as a dedicated `Speech` kind vs composition.** Chosen: composition of existing
  kinds + optional `{say:…}` sugar — keeps the union minimal and reuses `Verb`/`Pronoun`/
  `Quote`. Revisit a `Speech` kind only if composition proves too verbose for authors.

## Scope

**In:** `if-domain` (`Sentence`, `Quote` kinds; `Pronoun.capitalize`; `RenderContext`
position state); `lang-en-us` parser (new syntax, legal `{capitalize pronoun}`); `lang-en-us`
assembler (richer `Run`, reconciliation pass, `Sentence`/`Quote` realizers, sentence-start
authority moved off string-scan); stdlib dialogue catalog verb fix (§6).

**Out:** Direct↔reported speech transformation (S43 — needs tense, deferred to S28); output
object pronouns for arbitrary objects (S24/S25 → ADR-D); cross-line last-mentioned scope
beyond a render block (S41/S46 — track here only as far as a single message needs);
adaptive tense/person (S28).

## Consequences

- **Subject to the ADR-202 mandate** — no regex structure-recovery in realization. This
  ADR's `Sentence`/`Quote` are its first concrete application; new atoms emit run metadata,
  they do not post-process prose.
- `capitalizeSentenceStart` stops being the sentence-start *authority* (becomes a glyph
  helper the pass may call); the authority is now structural (`Sentence`/position state).
- The `Run` type change ripples through every `render*` function (they must populate/forward
  edge metadata) — mechanical but broad; do it in one pass with the reconciliation work.
- Save/restore is unaffected: no new persisted state (position state is per-render;
  `textState` for dialogue variation already serializes via ADR-196).
- Author ergonomics improve: dialogue with dynamic utterances, pronoun subjects, and
  agreeing speech verbs becomes expressible without hand-managing commas/caps/quotes.

## Acceptance Criteria

1. `{capitalize pronoun:subject}` parses and realizes; a sentence-initial `Pronoun`
   capitalizes with no explicit hint. (S40)
2. A `Quote` over a dynamic utterance renders correct quote glyphs, first-word capital, and
   terminal punctuation **inside** the closing quote, for utterances bound as a plain param,
   a `Choice` variant, and an `Optional` (including the absorbed-`Empty` case → clean tag).
3. A dialogue tag's speech verb agrees with the speaker: singular → "says", plural → "say",
   player/2nd-person → "say". (S39)
4. Punctuation reconciliation: a leading tag + quoted sentence yields `She says, "…."`
   with exactly one comma and the period inside — no doubled/orphaned marks.
5. Empty-absorption holds across the full run sequence: an absorbed `Optional`/`Choice`/
   `Slot` adjacent to a dialogue tag leaves no stray comma or double space.
6. **No regex/`String.replace`/output re-parse** for structure discovery in the new code
   (ADR-202 mandate). Concretely: an ESLint rule (or equivalent test) bans `RegExp` literals
   and `String.prototype.replace` inside `assembler/english-assembler.ts`, exempting the
   token-local/whitespace allowlist (`regularPluralVerb`, `capitalizeSentenceStart`,
   `indefiniteArticle`, `collapseWhitespace`, `splitRunsOnNewlines`); a violation fails CI.
   **This criterion IS ADR-202 AC-1** — one lint gate, implemented once; listed here so the
   dialogue work inherits it, not so it is built twice.
7. The stdlib `talking`/`asking`/`telling`/`answering` catalogs use `{verb:…}` for
   attribution; a transcript proves a plural-speaker NPC reads grammatically. (§6)
8. Locale-neutrality: quote glyphs and the comma/period-inside rule are read from
   `LocaleSettings`, not hardcoded in shared (language-neutral) code.
9. Round-trip: dialogue variation (first-time/cycling via ADR-196) survives save/restore
   (no regression to ADR-196 AC-8).
10. **Rejection (parse-time, per §5):** `{quote:…}` with an unbound param, an unknown head,
    and `{capitalize numeral:…}` (cap on a non-eligible kind) each raise `PhraseParseError`
    **at parse time** — never a silent realize-time `Empty` or a thrown realize-time error.
    A test asserts the error type and that no partial output is produced.

## Open questions

### Resolved at review (2026-06-30, 15ef21)

- **Q1 — S40 mechanism: RESOLVED → both.** `Pronoun` gains an explicit `capitalize?` flag
  *and* sentence-initial position-state auto-cap, with the precedence rule pinned in §2.
  Mirrors the existing per-atom case authority; auto-cap is near-free given §4 is built for
  `Quote`/`Sentence` anyway, and the flag closes AC-1 (`{capitalize pronoun:subject}` legal).
- **Q2 — `{say:…}` sugar: RESOLVED → deferred past v1.** v1 ships `{quote:}` and explicit
  tag composition (§5); `{say:}` is additive later, after real dialogue validates the tag
  shape (esp. leading- vs trailing-tag comma ownership). `{quote:}` alone makes v1 useful.
- **Q5 — the mandate's home: RESOLVED → extracted to ADR-202.** The Structural Realization
  Mandate binds every atom, so it now lives in its own ADR (ADR-202) that future atom ADRs
  cite directly; ADR-201 §1 is a pointer and "Builds on ADR-202."

### Still open (non-blocking; resolve before/at implementation)

1. **Cross-line last-mentioned (S41/S46):** in scope for this ADR, or deferred to ADR-D?
   Current `lastMentioned` is per-render-block (`english-assembler.ts`); cross-line
   antecedents are out of scope here (see Scope: "Out") unless a single message needs it.
2. **`Speech` kind** ever, or composition forever? Revisit only if `{say:}` composition
   proves too verbose once it lands (Q2).

## Relationships

- **Builds on:** ADR-202 (The Structural Realization Mandate) — this ADR's structural
  machinery (§3 runs, §3.2 pass, §4 position state) is the mandate's first application.
- **Composes:** ADR-197 (Pronoun), ADR-198 (Numeral), ADR-199 (Verb agreement),
  ADR-196 (Optional/Choice + text-state), ADR-195 (Slot), ADR-190 (lists/punctuation),
  ADR-183 (whitespace authority — now Assembler-owned), ADR-158 (entity-valued params).
- **Relates to:** ADR-018 / ADR-142 (conversation state — supplies *which* line), ADR-070
  (NPC system), ADR-089 (perspective resolver — `{You}` viewpoint).
- **Defers to future ADRs:** ADR-D (output object/gender pronouns, S24/S25), S28 (adaptive
  tense/person → reported speech S43), S30 (number-to-words already partly via ADR-198).

## Session

Drafted in session 2026-06-30 (35097e), following Section L of the scenario inventory.
Reviewed via `/adr-review` in session 2026-06-30 (15ef21): contract shapes pinned (§2/§3.1/
§4), Q1/Q2/Q5 resolved, §1 mandate extracted to ADR-202, rejection AC-10 added, AC-6
tightened to a concrete lint gate. Remaining open questions (cross-line last-mentioned;
`Speech` kind) are non-blocking. Ready for implementation once ADR-202 is accepted.
