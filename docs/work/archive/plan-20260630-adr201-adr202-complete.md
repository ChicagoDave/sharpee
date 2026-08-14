# Session Plan: ADR-201 & ADR-202 — Dialogue & Speech Emission, Structural Realization Mandate

**Created**: 2026-06-30
**Overall scope**: Implement ADR-201 (Dialogue & Speech Emission) and ADR-202 (The Structural
Realization Mandate) across three packages: `packages/if-domain` (Sentence, Quote, Pronoun.capitalize,
RenderPosition), `packages/lang-en-us` (assembler richer Run + reconciliation pass + Sentence/Quote
realizers; parser {quote:} + {capitalize pronoun:} surface), and `packages/lang-en-us` (stdlib dialogue
catalog verb fix). Continues the ADR-192 phrase-algebra roadmap; all prior atoms (ADR-195–200) are
already on `main`. Each phase lands on its own branch following the ADR-196 phase-branch-per-phase
pattern.
**Bounded contexts touched**: N/A — language pipeline platform work (no domain behavior change)
**Key domain language**: N/A — DDD framing does not apply to this platform infrastructure work

## References consulted

- `docs/architecture/adrs/adr-201-dialogue-speech-emission.md` — 10 acceptance criteria, pinned
  TypeScript shapes for Sentence/Quote/Pronoun.capitalize/Run/RenderPosition (§2–§4), parser surface
  (§5), and the §6 stdlib verb-fix that can land first independently of §2–§5.
- `docs/architecture/adrs/adr-202-structural-realization-mandate.md` — ADR-202 AC-1 ESLint gate
  bans RegExp/String.replace in `english-assembler.ts` (exemption allowlist: `regularPluralVerb`,
  `capitalizeSentenceStart`, `indefiniteArticle`, `collapseWhitespace`, `splitRunsOnNewlines`);
  AC-1 here ≡ ADR-201 AC-6 — implement once. The current realizer already satisfies this; the gate
  asserts a property of existing code and stands alone.
- `docs/context/project-profile.md` — Vitest + pnpm workspace; strict TypeScript (`noImplicitAny`,
  `noFallthroughCasesInSwitch`); language-layer separation convention (no English in engine/stdlib);
  `packages/if-domain` must contain no locale logic.
- `docs/context/session-20260630-1610-v2_adr201_dialogue.md` — Open items: §6 stdlib verb fix
  identified as the immediate next slice (ADR-199-only dependency); ESLint gate and AC-10 rejection
  test deferred to implementation phase. Dungeo walkthrough breakage is a pre-existing issue,
  unrelated to this plan.

## AC Coverage Map

| AC | Phase | Test that proves it |
|----|-------|---------------------|
| ADR-201 AC-1 (`{capitalize pronoun:}` + sentence-initial auto-cap) | Phase 4 (realizer) + Phase 5 (parser) | unit: pronoun.test.ts + realize; transcript: NPC says "He says…" |
| ADR-201 AC-2 (Quote glyphs, first-word cap, terminal inside, dynamic utterance) | Phase 4 (realizer) + Phase 5 (parser) | unit: assembler tests; transcript: `{quote:greeting}` with Choice utterance |
| ADR-201 AC-3 (speech verb agrees with speaker number/person) | Phase 1 | transcript: plural-speaker NPC "they say" |
| ADR-201 AC-4 (punctuation reconciliation: one comma, period inside) | Phase 4 | unit: reconciliation-pass test |
| ADR-201 AC-5 (empty-absorption across full run sequence) | Phase 4 | unit: absorbed Optional/Choice adjacent to dialogue tag leaves no stray comma |
| ADR-201 AC-6 ≡ ADR-202 AC-1 (no structure-recovery regex in assembler) | Phase 2 | lint rule / Vitest structural test over the source file |
| ADR-201 AC-7 (stdlib catalogs use `{verb:…}`; plural-speaker transcript) | Phase 1 | talking.ts + transcript |
| ADR-201 AC-8 (locale-neutrality: quote glyphs from LocaleSettings) | Phase 3 (contract) + Phase 4 (realizer reads it) | unit: non-default LocaleSettings yields different glyphs |
| ADR-201 AC-9 (dialogue variation survives save/restore, ADR-196 AC-8 no regression) | Phase 4 | existing ADR-196 AC-8 test passes on the modified assembler |
| ADR-201 AC-10 (parse-time rejection: unbound, unknown head, `{capitalize numeral:}`) | Phase 5 | unit: PhraseParseError thrown synchronously, no partial output |
| ADR-202 AC-2 (exempt helpers stay token-local or whitespace-only) | Phase 2 | lint / test note: allowlist entries verified against live source `:165`, `:698` |
| ADR-202 AC-3 (structure flows as metadata — first atom demonstration) | Phase 4 | unit: Sentence/Quote produce Run edge metadata consumed by reconciliation pass |

## Cross-Package Dependency Ordering

```
Phase 1 (talking.ts verb fix)        — depends on ADR-199 (on main); independent of all others
Phase 2 (ESLint gate)                — depends on nothing; validates existing code; independent
Phase 3 (if-domain contracts)        — additive only; no assembler changes yet; can land after 1 or 2
Phase 4 (assembler core)             — depends on Phase 3 (Sentence/Quote in phrase.ts)
Phase 5 (parser surface)             — depends on Phase 3 (Sentence/Quote kinds exist to produce)
                                       Phase 4 not required, but Phase 5 is not useful without it
```

Phases 1 and 2 are fully independent — either can land first. Phase 3 is a pure-additive if-domain
change. Phases 4 and 5 both require Phase 3. The risky broad work is Phase 4: the Run type extension
ripples through `realizeToRuns` (all recursive calls acquire a `position` parameter), and the
reconciliation pass is new. Phase 5 is contained to the parser.

## Phases

---

### Phase 1: Speech Verb Agreement in Dialogue Catalog (§6 stdlib verb fix)
- **Branch**: `v2_adr201_p1` (cut from `main`, merges back into `main`)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: N/A — language catalog fix in `packages/lang-en-us`

- **Entry state**:
  - `main` has ADR-199 (Verb atom) in the assembler; `{verb:lemma subject}` works end-to-end.
  - `packages/lang-en-us/src/actions/talking.ts` lines 34–39 hardcode the literal string `says` in
    `greets_back`, `formal_greeting`, `casual_greeting`, `greets_again`, `remembers_you` messages.
  - `asking.ts`, `telling.ts`, `answering.ts` have the same literal-verb pattern in their NPC
    attribution messages.

- **Deliverable**:
  - In `talking.ts`, `asking.ts`, `telling.ts`: replace bare `says` (and equivalents `tells`,
    `asks`) in NPC attribution strings with `{verb:says target}` (or the appropriate lemma),
    keeping the quoted literal text in place (the `{quote:greeting}` form comes in Phase 5).
    Example: `"{capitalize the target} says, \"Hello there!\""` →
    `"{capitalize the target} {verb:says target}, \"Hello there!\""`.
  - `answering.ts`: audit; if it has NPC attribution speech verbs in the same pattern, fix them.
  - Unit tests in `packages/lang-en-us/tests/` verifying that the affected messages produce
    "say" for a plural-number `target` param and "says" for a singular one.
  - Transcript test (unit transcript, not full walkthrough): a small Friendly-Zoo-style test
    exercising a plural-speaker NPC reading the corrected message and producing grammatically
    correct "say"/"says" output.

- **ACs satisfied**: ADR-201 AC-3 (speech verb agrees with speaker number), ADR-201 AC-7 (stdlib
  catalogs use `{verb:…}` for attribution; transcript proves agreement).

- **Exit state**:
  - No literal attribution verb in `talking.ts`, `asking.ts`, `telling.ts` (grep confirms). ✓
  - `answering.ts` audited: player-side only (`{say}`/`{answer}`/`{respond}` helpers), no NPC attribution pattern — nothing to fix. ✓
  - Unit tests pass: `tests/dialogue-attribution.test.ts` (9, real shipped catalog strings); full lang-en-us suite 346 green. ✓
  - Real-path integration test pass: `packages/stdlib/tests/integration/dialogue-attribution-realpath.test.ts` (real talkingAction → nounPhraseFor plural → real provider → "say"); full stdlib suite 1286 green. ✓
  - `./repokit build dungeo` — **DEFERRED** (pre-existing stale workspace blocks it: if-domain dist stale, bootstrap unbuilt → repokit won't compile; unrelated to this phase's string edits). Dungeo build is a follow-up.
  - `v2_adr201_p1` merge to `main`: pending user direction.

- **Follow-up (out of scope for Phase 1)**: other catalogs still hardcode attribution `says` and should get the same `{verb:…}` treatment in a later slice — `packages/lang-en-us/src/npc/npc.ts`, `packages/lang-en-us/src/actions/giving.ts`, `stories/dungeo/src/regions/endgame.ts`.

- **Status**: DONE — merged to `main` (merge commit `8ce5b01b`; build verification deferred)

---

### Phase 2: ADR-202 AC-1 — Structural Mandate ESLint Gate
- **Branch**: `v2_adr201_p2` (cut from `main`, merges back into `main`)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: N/A — lint infrastructure in `packages/lang-en-us` (or project root)

- **Entry state**:
  - `main` has `packages/lang-en-us/src/assembler/english-assembler.ts` at ~750 lines.
  - The current realizer already satisfies ADR-202: its five RegExp/String.replace uses are all
    token-local or whitespace-only (`regularPluralVerb` `:165`, `capitalizeSentenceStart` `:451`,
    `indefiniteArticle` `:82`, `collapseWhitespace` `:413`, `splitRunsOnNewlines` `:698`).
  - No lint gate currently enforces this.

- **Deliverable**:
  - A lint rule **or** a Vitest structural test (whichever integrates cleanly with the existing
    `.eslintrc.js` / Vitest setup) that:
    - Scans `english-assembler.ts` for `RegExp` literal constructs and `String.prototype.replace`
      calls used for structure discovery.
    - Exempts by name: `regularPluralVerb`, `capitalizeSentenceStart`, `indefiniteArticle`,
      `collapseWhitespace`, `splitRunsOnNewlines` — the full five-entry allowlist from ADR-202.
    - Fails CI (test suite red) if a new structure-recovery regex or `.replace` appears outside
      the allowlist.
  - A test note (comment or test description) confirming that `collapseWhitespace` reading an
    adjacent run's trailing whitespace is permitted (whitespace joining, not structure recovery —
    ADR-202 AC-2).
  - The gate passes green on the current assembler as written (it is "born compliant").

- **ACs satisfied**: ADR-201 AC-6 ≡ ADR-202 AC-1 (lint gate bans structure-recovery regex),
  ADR-202 AC-2 (exempt helpers are token-local or whitespace-only).

- **Exit state**:
  - CI would catch a future structure-recovery regex addition in the assembler. ✓ (self-check test plants a violation outside the allowlist and asserts it is flagged)
  - Gate is green on the current codebase ("born compliant"). ✓
  - Implemented as a Vitest structural test (no custom-ESLint-plugin infra exists; ADR-202 AC-1 permits "a lint rule **or** test"; a failing test reds CI). Uses the TS compiler AST for accurate enclosing-function scoping. File: `packages/lang-en-us/tests/assembler/structural-mandate.test.ts` (4 tests). Full lang-en-us suite 350 green.
  - `./repokit build dungeo` — DEFERRED (same pre-existing stale-workspace blocker as Phase 1).
  - `v2_adr201_p2` merge to `main`: pending user direction.

- **Status**: DONE (build verification deferred)

---

### Phase 3: Sentence, Quote, and Pronoun.capitalize Phrase Contracts (if-domain)
- **Branch**: `v2_adr201_p3` (cut from `main`, merges back into `main`)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: N/A — language-neutral type contracts in `packages/if-domain`

- **Entry state**:
  - `packages/if-domain/src/phrase.ts` has 13 members in the closed `Phrase` union.
  - `Pronoun` has no `capitalize` field.
  - `LocaleSettings` has no quote-glyph fields.
  - `RenderContext` has no `position` seam.

- **Deliverable**:
  - In `packages/if-domain/src/phrase.ts`:
    - Add `Sentence` interface (pinned shape from ADR-201 §2):
      ```ts
      interface Sentence { kind: 'sentence'; child: Phrase; terminal?: '.' | '?' | '!'; }
      ```
    - Add `Quote` interface (pinned shape from ADR-201 §2):
      ```ts
      interface Quote { kind: 'quote'; utterance: Phrase; terminal?: '.' | '?' | '!'; }
      ```
    - Add `capitalize?: boolean` to `Pronoun` (additive optional field, ADR-201 §2 Q1 resolution).
    - Add `Sentence | Quote` to the closed `Phrase` union (13 → 15 members).
    - Add `isSentence(p: Phrase): p is Sentence` and `isQuote(p: Phrase): p is Quote` type guards.
    - Add `RenderPosition` interface (pinned shape from ADR-201 §4):
      ```ts
      interface RenderPosition {
        sentenceInitial: boolean;
        insideQuote: boolean;
        pendingTerminal?: '.' | '?' | '!';
      }
      ```
    - Add `position?: RenderPosition` to `RenderContext` (optional seam, degrades to
      "not sentence-initial, not in quote" when absent — exact today's behavior).
    - Add quote-glyph fields to `LocaleSettings`:
      ```ts
      openQuote?: string;   // default '"'
      closeQuote?: string;  // default '"'
      ```
  - `isSentence` and `isQuote` exported from the `if-domain` barrel.
  - TypeScript compiles across all packages (`./repokit build dungeo` green). The assembler will
    throw `PhraseNotImplementedError` for Sentence/Quote kinds (as for any unhandled kind) until
    Phase 4.

- **ACs satisfied**: Foundational for ADR-201 AC-1, AC-2, AC-8 (contract only; realization in Phase 4).

- **Exit state**:
  - `phrase.ts` has 15 union members and the pinned shapes from ADR-201 §2/§4. ✓ (Sentence, Quote added; both `extends PhraseBase` to match existing atoms)
  - `Pronoun` gains `capitalize?: boolean`; `RenderContext` gains the optional `readonly position?: RenderPosition` seam. ✓
  - `LocaleSettings` has `openQuote?`/`closeQuote?` knobs (fields only; `"` defaults are realizer-side, Phase 4). ✓
  - `isSentence`/`isQuote` guards added; all exported via the `export * from './phrase'` barrel. ✓
  - No locale logic in `if-domain` (boundary maintained). ✓
  - Verification: if-domain typecheck + build clean; lang-en-us typecheck clean + full suite 350 green; stdlib typecheck clean + full suite 1286 green. (Refreshing the stale if-domain & world-model dist as part of this also cleared the pre-existing downstream stale-dist typecheck errors.) `./repokit build dungeo` still deferred (bootstrap/repokit blocker unchanged).
  - `v2_adr201_p3` merge to `main`: pending user direction.

- **Status**: DONE (build verification via package typecheck/build + suites; dungeo deferred)

---

### Phase 4: Richer Run, Reconciliation Pass, and Sentence/Quote/Pronoun Realization
- **Branch**: `v2_adr201_p4` (cut from `main`, merges back into `main`)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: N/A — assembler core in `packages/lang-en-us/src/assembler/english-assembler.ts`

- **Entry state**:
  - Phase 3 complete: `Sentence`, `Quote`, `Pronoun.capitalize`, `RenderPosition`, and
    `LocaleSettings` quote-glyph fields are in `if-domain`.
  - The assembler throws `PhraseNotImplementedError` for `Sentence`/`Quote` kinds.
  - `Pronoun` realizer ignores `capitalize`.
  - `Run` interface has only `{ text, verbatim, deco }`.
  - No reconciliation pass exists.

- **Deliverable**:

  **1. Extend the `Run` interface** (ADR-201 §3.1 pinned shape):
  ```ts
  interface Run {
    text: string; verbatim: boolean;
    deco: ReadonlyArray<{ className: string; value?: string }>;
    sentenceInitial?: boolean;
    capEligible?: boolean;
    quoteOpen?: boolean;
    quoteClose?: boolean;
    ownsLeadingPunct?: ',' | null;
    ownsTrailingPunct?: '.' | '?' | '!' | null;
  }
  ```

  **2. Thread `RenderPosition` through `realizeToRuns`**: add a `position` parameter with default
  `{ sentenceInitial: false, insideQuote: false }`. All recursive calls pass position; only
  `Sentence` and `Quote` cases mutate it for their children. This is the "broad mechanical
  ripple" — all cases in `realizeToRuns` require an updated call site but the logic per case
  is mechanical (pass through unchanged, or set `sentenceInitial: true` for Sentence/Quote).

  **3. Add `Sentence` realizer case**:
  - Realizes `child` with `position = { sentenceInitial: true, insideQuote: false }`.
  - Marks the first run of the child as `sentenceInitial: true`.
  - Emits a trailing run with `ownsTrailingPunct: terminal ?? '.'` (or `null` if the child's
    last run already owns trailing punctuation).

  **4. Add `Quote` realizer case**:
  - Emits an opening-quote run: `{ text: ctx.settings.openQuote ?? '"', verbatim: true, deco,
    quoteOpen: true }`.
  - Realizes `utterance` with `position = { sentenceInitial: true, insideQuote: true }`.
  - The first run of the utterance gets `capEligible: true, sentenceInitial: true`.
  - Emits a closing-quote run: `{ text: ctx.settings.closeQuote ?? '"', verbatim: true, deco,
    quoteClose: true, ownsTrailingPunct: terminal ?? '.' }`.
  - Signals to the enclosing dialogue tag that an attributive comma is owed via
    `ownsLeadingPunct: ','` on the opening-quote run.

  **5. Update `Pronoun` realizer** for S40 capitalization:
  - If `phrase.capitalize === true`: cap regardless of position.
  - If `phrase.capitalize === false`: never cap.
  - If `phrase.capitalize` is absent and `position.sentenceInitial`: mark run `capEligible: true,
    sentenceInitial: true`.
  - Returns a run with the pronoun text; the reconciliation pass applies the cap using the flags.

  **6. Write the structural reconciliation pass** (ADR-201 §3.2 — four steps in order):
  ```
  Step 1 — Capitalization: for each run with sentenceInitial + capEligible, capitalize its
             first alphabetic glyph (call capitalizeSentenceStart as the glyph helper).
  Step 2 — Punctuation merging: the Quote realizer places both flags on the SAME run —
             the opening-quote run carries both `ownsLeadingPunct: ','` AND `quoteOpen: true`;
             the closing-quote run carries both `quoteClose: true` AND `ownsTrailingPunct`.
             The pass inspects each run individually for these combined flag pairs:
               • A run with (ownsLeadingPunct: ',' AND quoteOpen: true) → emit `, "` (comma
                 before the quote glyph, then the glyph).
               • A run with (quoteClose: true AND ownsTrailingPunct non-null) → emit `."` / `?"` /
                 `!"` (terminal punct inside the closing glyph).
             Never look for a `ownsLeadingPunct` bearer adjacent to a SEPARATE `quoteOpen`
             run — they are always on the same run. Never double or orphan marks.
  Step 3 — Empty-absorption: runs with empty text adjacent to owned punctuation are absorbed;
             the punctuation owner is also dropped if its content is zero-length.
  Step 4 — collapseWhitespace (existing, unchanged) runs last on the reconciled run sequence.
  ```

  **7. Wire the reconciliation pass** into `realize()`:
  ```ts
  realize(tree, ctx) {
    const raw = realizeToRuns(tree, ctx, [], ctx.position ?? { sentenceInitial: false, insideQuote: false });
    const reconciled = reconciliationPass(raw);
    const segments = splitRunsOnNewlines(reconciled);
    // ... (existing block-building logic) ...
  }
  ```

  **8. Update `renderToString`** to pass a neutral position default when calling `realizeToRuns`
  (internal calls for list items, slots, etc. do not carry sentence position).

  **Edge case — author-supplied terminal punctuation / ellipsis (do NOT double-punctuate).**
  Plain author prose with explicit newlines and ellipses is already handled outside this phase:
  `splitRunsOnNewlines` lifts `\n` to block boundaries, `collapseWhitespace` normalizes only
  horizontal whitespace, and per ADR-202 nothing scans prose for `.`/`...`. The new piece this
  phase adds is the `Sentence`/`Quote` auto-terminal (`ownsTrailingPunct: terminal ?? '.'`). When
  the realized content ALREADY ends in author terminal punctuation — `.`, `?`, `!`, or an ellipsis
  `...`/`…` — the reconciliation pass must **suppress the default `.`** rather than append a second
  mark (avoid `"...like this...."` / `"Really?!."`). Rule: emit the explicit `terminal` when the
  author set one; otherwise default to `.` ONLY if the child's last glyph is not already terminal
  punctuation or an ellipsis. This is metadata-driven (inspect the last run's own trailing glyph —
  a node's-own-surface read, ADR-202-permitted), never a cross-output prose scan.

- **Tests**:
  - Unit: Sentence realizes child with first-word cap and terminal period.
  - Unit: Quote over a Literal utterance yields `"Hello."` with period inside.
  - Unit: Quote/Sentence over content already ending in `.`/`?`/`!`/`...`/`…` does NOT append a
    second terminal (`"...like this..."` stays single-ellipsis; `"Really?"` stays single `?`).
  - Unit: Quote over a `Choice` utterance (one variant Empty) — absorbed Optional leaves no stray
    comma on the dialogue tag (AC-5).
  - Unit: Leading dialogue tag + Quote reconciliation: `She {verb:says actor}, {quote:line}` →
    `She says, "Hello."` — exactly one comma, period inside (AC-4).
  - Unit: Pronoun with `capitalize: true` in non-sentence-initial position capitalizes.
  - Unit: Pronoun absent `capitalize` in sentence-initial position capitalizes (S40 auto-cap).
  - Unit: Pronoun with `capitalize: false` in sentence-initial position does NOT capitalize.
  - Unit: Non-default `LocaleSettings` (`openQuote: '«'`, `closeQuote: '»'`) yields guillemets (AC-8).
  - Regression: all existing ADR-196 AC-8 tests (save/restore dialogue variation) pass unmodified (AC-9).
  - Regression: full lang-en-us test suite green (no existing tests broken by Run extension).

- **ACs satisfied**: ADR-201 AC-1 (realizer half), AC-2 (Quote realization), AC-4 (punctuation
  reconciliation), AC-5 (empty-absorption in reconciliation pass), AC-8 (quote glyphs from
  LocaleSettings), AC-9 (no new persisted state; ADR-196 AC-8 regression free), ADR-202 AC-3
  (Sentence/Quote as the first atoms carrying Run edge metadata through the reconciliation pass).

- **Exit state**:
  - `english-assembler.ts` handles `Sentence` and `Quote` via run edge-metadata + a `reconciliationPass` (cap + terminal-inside). ✓
  - `Pronoun` realizer has position-aware capitalization (true/false/absent precedence). ✓
  - Tests: `tests/assembler/sentence-quote.test.ts` (17). Full lang-en-us suite 367 green; stdlib suite 1286 green (real-path dialogue test unaffected). ✓
  - `./repokit build dungeo` — DEFERRED (pre-existing bootstrap/repokit blocker).
  - `v2_adr201_p4` merge to `main`: pending user direction.

- **Implementation notes / deviations from the literal plan** (all confirmed with user before coding):
  - **No deep `position` param ripple.** Instead of threading a `position` arg through all 13 `realizeToRuns` cases, the `Sentence`/`Quote` cases mark the first run of their own realized child (`markFirstSentenceInitial`), and `realize()` honors the top-level `ctx.position` seam. Observably equivalent for v1, far lower-risk (the "broad mechanical ripple" the plan flagged is avoided).
  - **Quote does NOT own the leading comma in v1** (decision #1): the attributive comma stays the template's (`{verb:says target}, {quote:…}`), so AC-4's "exactly one comma" holds without `ownsLeadingPunct`. `ownsLeadingPunct` field omitted; revisit with `{say:}` sugar (post-v1). Corollary: an absorbed quote can leave the template's literal comma stray — accepted limitation, tied to the deferred comma-ownership work.
  - **Ellipsis/terminal suppression** implemented via String methods (`endsWith`/`trimEnd`), NOT regex, so the Phase 2 structural-mandate gate stays green (no new allowlist entry needed).
  - **Empty-absorption (AC-5):** an utterance that absorbs to nothing absorbs the whole quote (no empty `""`); general Optional/Choice/Slot absorption + whitespace cleanup unchanged.

- **Status**: DONE (build via typecheck + suites; dungeo deferred)

---

### Phase 5: {quote:} and {capitalize pronoun:} Parser Surface
- **Branch**: `v2_adr201_p5` (cut from `main`, merges back into `main`)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A — parser in `packages/lang-en-us/src/parser/parse-phrase-template.ts`

- **Entry state**:
  - Phase 3 complete: `Quote` kind exists in `if-domain`.
  - Phase 4 complete: assembler realizes `Quote`.
  - `{quote:utterance}` in a template currently throws PhraseParseError (`'quote' is not a known
    kind prefix`).
  - `{capitalize pronoun:subject}` currently throws PhraseParseError (`'capitalize pronoun' is not
    a known kind prefix` — the `:` in "pronoun:subject" routes to kind-prefix parsing with the
    prefix being "capitalize pronoun").
  - `{capitalize numeral:…}` should throw at parse time but currently does so for the wrong reason.

- **Deliverable**:

  **1. Add `{quote:utterance}` parse rule** to `parsePlaceholder`:
  - A `quote:` prefix is a known kind head. The rest is the param name of the utterance.
  - The utterance param must be bound (PhraseParseError if unbound — AC-10).
  - Produces `{ kind: 'quote', utterance: resolvedPhraseFromParam }`.
  - An optional trailing `?`/`!` sets the `terminal` field (e.g. `{quote:line !}`).
  - `{quote:}` with no param name throws PhraseParseError at parse time.

  **2. Make `{capitalize pronoun:case}` legal**:
  - The current NounPhrase branch processes `capitalize` as a modifier hint before routing to
    NounPhrase (bare-placeholder path). The `:` in "pronoun:subject" causes it to be routed
    to the kind-prefix path first, with prefix = "capitalize pronoun" (wrong).
  - Fix: before kind-prefix routing, pre-strip a leading `capitalize` modifier from the inner
    text. If the remaining text starts with a `pronoun:` head, parse as Pronoun with
    `capitalize: true` set on the produced phrase.
  - `{capitalize pronoun:subject}` → `{ kind: 'pronoun', case: 'subject', capitalize: true }`.
  - `{capitalize pronoun:object}` → same treatment.
  - Parse-time error if the case is unknown.

  **3. Parse-time rejection for `{capitalize numeral:…}` and similar invalid combinations**:
  - Only `pronoun` supports a `capitalize` modifier (NounPhrase already supports it via the
    existing `capitalize` hint path).
  - `{capitalize numeral:coins}`, `{capitalize verb:says target}`, `{capitalize slot:here}` etc.
    must throw `PhraseParseError` at parse time: "capitalize is not a valid modifier for 'numeral'".
  - Never a silent realize-time `Empty` — AC-10.

  **4. Ensure `{sentence:…}` is NOT exposed** (per ADR-201 §5 — not in v1 parser surface). The
  `Sentence` kind is emitted by structure (Quote implies a Sentence boundary for its contents),
  not by author templates. If a template contains `{sentence:…}`, it should throw PhraseParseError
  ("sentence is not an author-facing kind prefix").

  **5. Update dialogue catalog strings to use `{quote:utterance}`** (completing the §6 intent
  deferred from Phase 1). Now that the parser supports `{quote:}`, update `talking.ts`,
  `asking.ts`, and `telling.ts` attribution messages to replace their literal hardcoded quoted
  strings with the structured form. Example: the Phase 1 interim form
  `"{capitalize the target} {verb:says target}, \"Hello there!\""` becomes
  `"{capitalize the target} {verb:says target}, {quote:greeting}"` where `greeting` is a bound
  param. This finalizes the full ADR-201 §6 template shape. The message-key catalog entries
  that use dynamic utterance params need the param wired at the call site; messages with
  static utterances (like greetings) may instead use the `{quote:}` form with a `Verbatim` or
  `Literal` utterance bound at construction time, or remain as Phase 1 interim form with a
  note that `{say:}` sugar (deferred past v1) is the long-term answer for static utterances.

- **Tests**:
  - Parser unit: `{quote:line}` with `line` bound → `Quote` phrase with `utterance` set correctly.
  - Parser unit: `{quote:}` (no param) → PhraseParseError at parse time; no partial output (AC-10).
  - Parser unit: `{quote:missing}` with `missing` not in params → PhraseParseError at parse time
    naming `missing` (AC-10).
  - Parser unit: `{capitalize pronoun:subject}` → `Pronoun { case: 'subject', capitalize: true }`.
  - Parser unit: `{capitalize pronoun:unknown_case}` → PhraseParseError naming the bad case.
  - Parser unit: `{capitalize numeral:coins}` → PhraseParseError: "capitalize is not a valid
    modifier for 'numeral'" (AC-10).
  - Parser unit: `{sentence:content}` → PhraseParseError: not an author-facing kind prefix.
  - End-to-end unit: template `"{capitalize pronoun:subject} {verb:says speaker}, {quote:line}"`
    with params bound → parses to a `Sequence` tree; realizes (via assembler) to
    `"He says, \"Hello.\""` (or similar) with cap on pronoun and period inside quote.
  - Catalog update: affected messages in `talking.ts`, `asking.ts`, `telling.ts` now contain
    `{quote:…}` where previously they had literal `\"…\"` strings; a grep over those files
    confirms no bare hardcoded quoted strings remain in attribution messages (completing ADR-201 §6).

- **ACs satisfied**: ADR-201 AC-1 (parser half: `{capitalize pronoun:subject}` legal), ADR-201
  AC-2 (parser half: `{quote:utterance}` parses), ADR-201 AC-7 (catalog `{quote:}` follow-through
  completing the §6 intent), ADR-201 AC-10 (all three rejection cases: unbound param, unknown
  head, `{capitalize numeral:…}`).

- **Exit state**:
  - `{quote:utterance}` and `{capitalize pronoun:case}` parse correctly in author templates. ✓
  - All AC-10 rejection cases throw `PhraseParseError` at parse time with no partial output (unbound/missing quote param, unknown pronoun case, `capitalize` on a non-pronoun kind, `{sentence:…}`). ✓
  - `{sentence:…}` is blocked from author templates. ✓
  - **Catalog `{quote:}` follow-through: NOT done — deliberately deferred** (decision: Option A, confirmed with user). The static greeting utterances are locale content that must live in the lang catalog template; `{quote:param}` only sources a *bound* param, and authoring the text into a param would put English in stdlib (layer-separation violation). Making static utterances structured `Quote`s needs inline-literal-quote syntax, which exceeds ADR §5 and would pre-empt the Q2-deferred `{say:}` decision (ADR explicitly wanted real usage to validate tag-comma ownership before locking new dialogue syntax). So static greetings stay in their Phase 1 interim form; the `{quote:}` surface ships for dynamic/bound utterances. The asking `responds`/`explains` use `{verbatim:topic}` (reported content) and need no quote.
  - Tests: `tests/parser/quote-pronoun-parse.test.ts` (15, incl. end-to-end round-trip → `He says, "Hello."`). Full parser suite + full lang-en-us suite 382 green.
  - `./repokit build dungeo` — DEFERRED (bootstrap/repokit blocker).
  - `v2_adr201_p5` merge to `main`: pending user direction.

- **Follow-up:** locale-tuned glyphs on *static* catalog utterances await the `{say:}` / static-utterance design (post-v1, Q2). Until then those specific lines render with literal `"` glyphs; dynamic `{quote:param}` utterances are already locale-tuned.

- **Status**: DONE (parser surface; catalog follow-through deferred per Option A; dungeo deferred)

---

## Test Strategy Summary

| Phase | Primary test surface | What it guards |
|-------|---------------------|----------------|
| 1 | lang-en-us unit + small transcript | AC-3, AC-7: verb agreement in attribution messages |
| 2 | Lint rule or Vitest structural test | ADR-201 AC-6 ≡ ADR-202 AC-1/AC-2: structural mandate enforcement |
| 3 | TypeScript compilation | Contracts compile; no locale logic in if-domain |
| 4 | Assembler unit tests (many) + ADR-196 AC-8 regression | AC-1 realizer, AC-2, AC-4, AC-5, AC-8, AC-9, ADR-202 AC-3 |
| 5 | Parser unit tests + end-to-end round-trip | AC-1 parser, AC-2 parser, AC-10 rejection (all 3 forms) |

**The risky phase is Phase 4.** The Run-type extension and the `RenderPosition` threading affect
every case in `realizeToRuns`. The extension is additive (new optional fields on Run do not break
existing test assertions), and the position-threading is mechanical (most cases just forward it),
but the reconciliation pass is new code that must be validated carefully. Run the full lang-en-us
test suite after every significant sub-step within Phase 4, not only at the end.

**No new persisted state in any phase.** `textState` (ADR-196) is the only store that survives
save/restore; `RenderPosition` is per-render ephemeral. ADR-196 AC-8 regression test in Phase 4
guards against accidental state leakage.

**The previous ADR-192 plan (all phases COMPLETE) has been superseded by this plan.**
Archived copy: `docs/work/plan-adr192-complete.md` (from the ADR-192 planning session).
