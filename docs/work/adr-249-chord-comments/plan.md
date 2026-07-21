# Session Plan: ADR-249 — Chord `##` comment lines

**Status: MERGED** (2026-07-20, session 99aee6) — merged into `docs/work/adr-245-phrasebooks/plan.md` as Phases 0a–0c (this plan's Phases 1/2/3 respectively). Phase tracking (CURRENT/PENDING) lives THERE; this file remains the durable fine-grained record only.

**Created**: 2026-07-20 (session 99aee6)
**Overall scope**: Implement the one Chord comment form ADR-249 rules: top-level `##` lines, structurally outside every syntax block, blank-line-delimited on both sides (file start/end count as blank). Two-layer enforcement — lexer flags indent-0 `##` lines and enforces blank delimitation (`lex.comment-blank-lines`); parser skips flagged lines at top-level dispatch and raises `parse.comment-inside-block` everywhere else, including indented `##` lines in code position. No IR shape change: a commented story compiles identically to its uncommented twin.
**Merge note**: This plan is scoped and written standalone at David's direction ("plan it out and merge this plan (once clean) with the 245 plan"). It does **not** touch `docs/context/.current-plan`, which still points at `docs/work/adr-245-phrasebooks/plan.md`. Once this plan is clean (plan-review pass with no unresolved findings), the main session merges it into the ADR-245 plan as that plan's **Phase 0** — ahead of the ADR-245 companion-ADR drafting phase — because the companion's example `.story` fixtures and Phase 6 E2E fixtures want comment syntax available. This file stays the durable record of the ADR-249 work either way; the merge is a copy/renumber into the 245 plan, not a move.

## Gate (blocks Phase 2)
**ADR-249 is DRAFT with zero open questions** (passed `adr-review` 13/13 this session; all six syntax rulings are David's, made in-session). Two separate approvals are required before any code phase starts, per CLAUDE.md ("Platform changes require discussion first... changes to `packages/`... must be discussed with the user before implementation") and the ADR's own Status line:
1. David flips `docs/architecture/adrs/adr-249-chord-comments.md` Status from DRAFT to ACCEPTED.
2. David gives explicit platform-change go-ahead to implement in `packages/chord` (lexer.ts, parser.ts, plus tests and docs).
These are recorded as Phase 1 below — a decision gate, not work — mirroring the gate pattern already used in the ADR-245 plan's Phase 3.

## References consulted
- `docs/architecture/adrs/adr-249-chord-comments.md` — the normative spec: exactly one comment form (`##`, top-level, blank-delimited), two-layer lexer/parser enforcement, the four acceptance-criteria groups this plan's phases must cover, and the DRAFT status this plan gates on.
- `docs/architecture/chord-grammar-changes.md` (row dated 2026-07-20, "`##` comment lines...") — the grammar change is already logged and approved in-session; this plan does not need to add a new log entry, only implement what the row already records.
- `CLAUDE.md` (project instructions) — "Platform changes require discussion first... changes to `packages/`... must be discussed with the user before implementation" (the Gate above); "Never auto-retry failed builds or tests... report the error and WAIT"; "Never delete files without confirmation" (relevant if any fixture/doc needs replacing rather than editing); build/test commands (`./repokit`, never raw `pnpm build`; `pnpm --filter '@sharpee/chord' exec vitest run`, never bare watch-mode `pnpm test` in background; no `2>&1` with pnpm).
- `docs/work/adr-245-phrasebooks/plan.md` — the plan this work merges into as Phase 0; its own References-consulted section and phase numbering are the shape this plan's content must slot into cleanly (its Phase 1 companion-ADR drafting is the first phase after this one lands).
- `docs/context/project-profile.md` — `packages/chord` compiler-frontend staging convention (`lexer.ts` → `parser.ts` → `ast.ts` → `analyzer.ts` → `ir.ts` → `catalog.ts` → `diagnostics.ts` → `span.ts`); TypeScript strict mode; test location convention (`packages/chord/tests/*.test.ts`, Vitest; fixtures under `packages/chord/tests/fixtures/`, including a `gates/` subdir for diagnostic-triggering fixtures).
- `docs/context/session-20260720-2210-chord-foundations.md` (most recent prior session) — records ADR-249 as authored and DRAFT, "awaiting David's ACCEPTED flip; implementation then slots as Phase 0 of the phrasebook plan (packages/chord — platform go-ahead needed)" — exactly the gate this plan's Phase 1 records.
- User memory `docs-example-first` — author-facing reference docs (Phase 3's doc deliverable) must lead with examples, minimal prose ("word soup" ruling).
- User memory `chord-as-elegance-oracle` — checked for applicability: this is a closed grammar addition with no parallel hand-written-TS surface to compare against, so the elegance-parity concern does not bear on this plan; noted per instruction, not acted on.

## Baseline
Commit `c864b3c1`, all suites green (per CLAUDE.md testing discipline — never auto-retry on failure; report and wait).

## Phases

### Phase 1 (gate): David's ACCEPTED flip + platform go-ahead for `packages/chord`
- **Tier**: Small
- **Budget**: 20 tool calls (present the ADR as-is; no ADR edits — it already passed `adr-review` 13/13 with zero open questions)
- **Domain focus**: N/A — decision gate, not work
- **Entry state**: `docs/architecture/adrs/adr-249-chord-comments.md` exists, Status: DRAFT, zero Open Questions, `adr-review` clean (13/13, confirmed this session).
- **Deliverable**: Present the ADR to David for the DRAFT → ACCEPTED flip, and separately obtain his explicit platform-change go-ahead for editing `packages/chord/src/lexer.ts` and `packages/chord/src/parser.ts` per CLAUDE.md's platform-change discussion requirement. Two distinct approvals in the same conversation turn: (a) the ADR content is right, (b) implementation may begin.
- **Exit state**: ADR-249 Status is ACCEPTED; David has explicitly authorized implementation. **No Phase 2 work may start before this exit state is reached.**
- **Status**: see merged plan (Phase 0a)

### Phase 2: Lexer + parser implementation, unit tests (AC groups 1 and 2)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Chord compiler frontend (`packages/chord`) — comment recognition at the lexer's `Line` level, structural comment-position enforcement in the parser.
- **Entry state**: Phase 1 gate closed (ADR-249 ACCEPTED, go-ahead given). Grounded against the current source: `Line` (`packages/chord/src/lexer.ts:45-56`) already carries `afterBlank` (`packages/chord/src/lexer.ts:70,76,99,101` — "start of file counts as a paragraph boundary," so the file-header exception is close to free); `parseFile()`'s top-level dispatch loop (`packages/chord/src/parser.ts:218-296`) is the exact insertion point for skipping flagged comment lines before the `switch (word)`; `TOP_KEYWORDS` (`parser.ts:112`) is unaffected — comments are not a keyword, they are a `Line`-level flag, so `TOP_KEYWORDS` does not grow.
- **Deliverable**:
  - **Lexer** (`lexer.ts`): add a `comment` flag to `Line` for indent-0 lines whose first non-space characters are `##` (`## ` and `##text` both count — prefix is `##`, not `## `). Enforce blank delimitation at lex time: a maximal run of consecutive indent-0 `##` lines not preceded AND followed by a blank line (file start/end count as blank, reusing the existing `afterBlank` computation and its dual — next-line-blank) raises `lex.comment-blank-lines`. The line is never dropped from the `Line[]` stream (comment content stays visible to the parser via the flag, per the ADR's two-layer split).
  - **Parser** (`parser.ts`): skip `comment`-flagged lines at `parseFile()`'s top-level dispatch (`parser.ts:218-296`) — contributes nothing to `declarations`. Raise `parse.comment-inside-block` (fix-it: "comments are only legal outside blocks, at the top level of the story file") in every other position a flagged or `##`-prefixed line can appear:
    - inside `end`-terminated bodies (`define phrasebook/trait/action/machine/channel/topics ... end X` — unambiguous: any comment-flagged line encountered before the matching `end` is inside the block);
    - between a `create` header and its indented body (indent-terminated body — the one case needing the one-line lookahead the ADR specifies: a flagged line whose next non-blank line is indented is inside the construct, even though it may already be blank-delimited and therefore NOT caught by `lex.comment-blank-lines`);
    - an *indented* `##` line at a code position (not prose) — the lexer does not flag indented lines, so this is a parser-side raw-prefix check (`line.raw.trim().startsWith('##')`) applied wherever the parser is about to parse a statement/data/entry line rather than reconstruct prose, distinct from indented `##` inside prose bodies, which renders verbatim per §5.2 opacity and must NOT trigger this diagnostic.
  - **Unit tests** (`packages/chord/tests/`, new file e.g. `comments.test.ts`, plus fixtures under `tests/fixtures/gates/` for the two new diagnostics) covering, verbatim, the ADR's AC groups 1 and 2:
    1. indent-0 `##` line flagged (single and stacked runs);
    2. blank delimitation: missing preceding or following blank raises `lex.comment-blank-lines`; file-start and file-end both count as blank (leading file-header comment and trailing comment both legal);
    3. an indented `##` line is an ordinary unflagged `Line`;
    4. `## ` and `##text` both count as comment lines;
    5. a blank-delimited comment block between two top-level constructs compiles as if absent;
    6. a blank-delimited comment between a `create` header and its indented body raises `parse.comment-inside-block` (lookahead case); the same placement without blanks raises `lex.comment-blank-lines` instead;
    7. a comment line inside an `end`-terminated body (e.g. before `end phrasebook`) raises `parse.comment-inside-block` with the fix-it;
    8. an indented `##` line in prose renders verbatim in compiled text (opacity, unchanged);
    9. an indented `##` line in a code position raises `parse.comment-inside-block`.
- **Exit state**: `pnpm --filter '@sharpee/chord' exec vitest run` green, including the new comment test file and all pre-existing chord suites (no regressions — grep confirmed zero pre-existing `#`-leading lines in any in-repo `.story` file, per the ADR's own Consequences section, so no existing fixture should change behavior). `./repokit build --skip <unaffected>` succeeds through the chord package. No `pnpm build` run directly; no `2>&1` piping.
- **Status**: PENDING

### Phase 3: E2E golden fixture + docs (AC groups 3 and 4)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Chord E2E compilation (IR identity) + author-facing reference docs
- **Entry state**: Phase 2 complete; lexer/parser comment support green.
- **Deliverable**:
  - One in-repo `.story` fixture (new fixture under `packages/chord/tests/fixtures/`, or an existing fixture such as `cloak.story`) gains: a file-header comment (`##` as line 1, no preceding blank), a between-constructs comment, and a stacked multi-line comment block — each blank-delimited per the rule. Golden comparison: the commented fixture's compiled IR is asserted identical to its uncommented twin (no field, span-shape, or content diff attributable to the comments — comments contribute nothing to the IR).
  - If the chosen fixture backs a shipped story or has a smoke transcript, run it via `node dist/cli/sharpee.js --test <transcript>` and confirm unchanged output (rebuild the bundle first via `./repokit build --skip <unaffected>` if lexer/parser changes from Phase 2 aren't yet in `dist/cli/sharpee.js`).
  - **Docs** (example-first, per `docs-example-first` memory policy — worked examples before prose): `docs/reference/chord-grammar.md` and `docs/reference/chord-language.md` gain the `##` comment form — file-header example, between-constructs example, stacked multi-line example, and one negative example (comment inside a block, showing the `parse.comment-inside-block` fix-it) — each with minimal prose. Confirm `docs/architecture/chord-grammar-changes.md`'s 2026-07-20 row needs no edit (it already documents the approved form; this phase implements what it records, it does not re-log it).
- **Exit state**: Golden IR-identity test passes; any exercised smoke transcript passes unchanged; both reference docs updated and example-first; full chord test suite and (if the bundle was rebuilt) the relevant transcript/walkthrough set remain green per the `c864b3c1` baseline — no regressions.
- **Status**: PENDING
