# Session Plan: ADR-245 — Chord phrasebooks (named, predicated phrase collections)

**Created**: 2026-07-20 (session 99aee6)
**Amended**: 2026-07-20 (same session) — the ADR-249 Chord-comments plan (docs/work/adr-249-chord-comments/plan.md, plan-review clean) is MERGED in as Phases 0a–0c at David's direction ("plan it out and merge this plan (once clean) with the 245 plan"): comments land before phrasebook work so the companion's example `.story` fixtures and the Phase 6 E2E fixtures can carry author annotations. The companion ADR is numbered **ADR-250** (249 was taken by the comments ADR after this plan was first written; references below are corrected).
**Overall scope**: ADR-245 is ACCEPTED but records ruled *intent*, not a design — its own Decision closing paragraph states "nothing may be built from this ADR alone." This plan therefore has two halves with a hard approval gate between them: (1) author a design-level companion ADR that pins block grammar, IR/registry shapes, the affected-module list, `use phrasebook <unknown>` rejection behavior, acceptance criteria, and a concrete unreliable-narrator E2E scenario as the spine, run it through `devarch adr-review` and (if it carries Open Questions) the rule-11a interview gate, and get David's explicit ACCEPTED flip plus platform-change go-ahead; then (2) implement the Chord surface, the IR/registry/rendering seam, the E2E acceptance test, and the docs rename sweep, each phase re-derived at fine grain once the companion pins the exact shapes. No implementation phase in this plan may start before Phase 3's gate closes.
**Bounded contexts touched**: No `docs/ddd/notation.yaml` in this repo — this is platform/language-design work, not domain modeling, so formal DDD decomposition does not apply. The plan is still phrased in the project's own domain language. Architectural areas touched: Chord compiler frontend (`packages/chord` — lexer/parser/analyzer/IR), Natural-Language Text Rendering / Phrase Algebra (`lang-en-us`, `text-blocks` — the formatter-chain lookup layer), the engine/lang save-shape seam (variant-state persistence, ADR-034 event-sourcing family), and the docs/site cookbook surface.
**Key domain language**: phrasebook, arbitration (first-predicate-match-in-declaration-order, per key), fallback chain (per-entity → story `define phrase` → active book → platform default), predicate-derived voice (never stored, ADR-240 family), variant state per (book, key) (cycling / first-time / sticky).

## References consulted
- `docs/architecture/adrs/adr-249-chord-comments.md` — the Chord comments ADR (DRAFT, adr-review 13/13, zero open questions; all six syntax rulings David's, 2026-07-20): the normative spec for Phases 0a–0c. Its grammar-changes log row (docs/architecture/chord-grammar-changes.md, 2026-07-20) is already approved and landed.
- `docs/work/adr-249-chord-comments/plan.md` — the standalone comments plan merged in as Phases 0a–0c (plan-review clean, 8 references, no conflicts); stays the durable fine-grained record of that work.
- `docs/architecture/adrs/adr-245-chord-phrase-books.md` — the source ADR: ACCEPTED, all six open questions ruled, but its own Decision closing paragraph gates all implementation on a design-level companion (grammar, IR/registry shapes, affected-module list, `use phrasebook <unknown>` rejection, acceptance criteria, E2E spine) plus David's explicit go-ahead. This plan's two-phase-then-gate-then-implement structure exists to satisfy that gate, not to route around it.
- `docs/architecture/adrs/adr-230-grammar-reachability-completion.md` — established the D5 pattern this project uses for registry-vs-grammar drift: assert `registry ⊆ reachable ∪ documented-exceptions` and fail the build on drift rather than silently no-opping. The companion's `use phrasebook <unknown>` diagnostic and the competing-definitions registry should follow this fail-loud precedent, not invent a softer one.
- `docs/architecture/adrs/adr-215-chord-extensions-and-combat.md` — established the `use <extension>` one-word, top-level, one-per-extension distribution precedent (resolved 2026-07-14) that `use phrasebook <name>` must stay disambiguated from per ADR-245's own text (the `phrasebook` sub-word is the disambiguator; plain `use <extension>`'s strict one-word grammar is untouched).
- `docs/architecture/adrs/adr-235-extension-surface-golive-disposition.md` — **STALE**: as written (2026-07-17) it claims the ADR-215/216 `use` mechanism has zero implementation landed and is its own multi-session go-live workstream (S3) gating ADR-233 G4. This is no longer true — commits `7ff300ac` and `ca688adb` ("extension surface COMPLETE") landed the full S3 slice before this plan's baseline (`c864b3c1`), and `packages/chord/src/parser.ts`/`analyzer.ts` confirm `use <extension>` parsing, manifest-vocabulary gating, and the `use state-machines` depth all exist today. ADR-235's Status/Consequences were never updated to reflect this. **Plan impact**: Phase 4 builds `use phrasebook` as a disambiguation branch alongside the *existing* `case 'use'` handling (parser.ts ~line 269/355-359) — it is not building on unbuilt ground, and the affected-module list should say so, not hedge. Recommend amending ADR-235 (or filing a short follow-up note) to record the S3 slice as landed; do not let this plan's Phase 4 re-scope itself as "build `use` from scratch."
- `docs/architecture/adrs/adr-243-chord-story-person.md` — DRAFT (not yet ACCEPTED), all questions resolved pending the flip. ADR-245's D4 person-orthogonality depends on the `{You}` realization-slot family this ADR defines; the companion should flag this as a soft dependency (person-neutral phrasing works today regardless, since it degrades to third person unset, but the full realization contract ADR-243 defines is not yet platform-accepted).
- `docs/architecture/adrs/adr-240-live-derived-state.md` — the point-of-use, no-cache, no-invalidation-list evaluation pattern (`registerSnippetGate`, ADR-211/212 sibling) that ADR-245's D3 ("derived at render time, never stored") must follow. This is the pattern to reuse, not the recompute-and-stamp cache-plus-invalidation-list pattern ADR-240 replaced — the companion's predicate-evaluation design should cite this ADR by name as its implementation model.
- `docs/architecture/adrs/adr-158-entity-info-in-message-params.md` — the formatter-chain / entity-valued message-param contract (`entityInfoFrom(entity)`, article-choosing `{the:cap:item}` family) that sits immediately downstream of wherever the phrasebook lookup layer resolves a key to text; the seam must not bypass this contract.
- `docs/reference/phrase-algebra-primer.md` (covering ADRs 192–206, phrase-model assembler/atom system) — the rendering machinery ADR-245's Consequences say gains "exactly one lookup layer" between the story `define phrase` table and the platform default; the companion must locate this chain precisely before specifying the new layer.
- `docs/context/project-profile.md` — TypeScript strict mode across the monorepo; `packages/chord` compiler-frontend staging is `lexer.ts` → `parser.ts` → `ast.ts` → `analyzer.ts` → `ir.ts` → `catalog.ts` → `diagnostics.ts` → `span.ts`; language-layer separation convention ("all user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit semantic events with message IDs only") that the companion's IR/registry design must respect.
- `docs/context/session-20260720-2125-chord-foundations.md` — most recent substantive prior session. Its Open Items (royal-puzzle-basic pre-existing RNG flake, dungeo residual module-level state, armoured/thealderman reboot wiring, ext-testing packaging) are the post-ADR-248 open-items sweep — explicitly a separate effort per this plan's Out of Scope, not folded in here.
- `CLAUDE.md` (project instructions) — "Platform changes require discussion first. Any changes to `packages/`... must be discussed with the user before implementation" (this plan's Phase 3 gate is that discussion point); "Never auto-retry failed builds or tests... report the error and WAIT"; "Never delete files without confirmation."

## Out of scope
The post-ADR-248 open-items sweep (royal-puzzle RNG flake gate, dungeo module-state, armoured/thealderman reboot wiring, ext-testing packaging, ADR-247 `GetContents` implementation) — a separate effort. Generalized `import <file>` for any story source (explicitly PARKED in ADR-245 for its own ADR — the companion must shape `import phrasebook` so the keyword generalizes later, but must not decide the generalization now). zifmia. v1.5 (`familyzoo-v1.5-out-of-scope`).

## Phases

### Phase 0a (gate): ADR-249 ACCEPTED flip + platform go-ahead for `packages/chord` comments
- **Tier**: Small
- **Budget**: 20 tool calls (present the ADR as-is; no ADR edits — it passed `adr-review` 13/13 with zero open questions)
- **Domain focus**: N/A — decision gate, not work
- **Entry state**: `docs/architecture/adrs/adr-249-chord-comments.md` exists, Status: DRAFT, zero Open Questions, adr-review clean (13/13, this session).
- **Deliverable**: Two distinct approvals from David: (a) ADR-249 DRAFT → ACCEPTED flip; (b) explicit platform-change go-ahead for editing `packages/chord/src/lexer.ts` and `parser.ts` (plus tests and docs) per CLAUDE.md's platform-change discussion requirement.
- **Exit state**: ADR-249 Status is ACCEPTED; implementation explicitly authorized. **No Phase 0b work may start before this exit state is reached.**
- **Status**: COMPLETE (David, 2026-07-20 — "go": flip + go-ahead in one)

### Phase 0b: Comments — lexer + parser implementation, unit tests (ADR-249 AC groups 1–2)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Chord compiler frontend (`packages/chord`) — comment recognition at the lexer's `Line` level, structural position enforcement in the parser
- **Entry state**: Phase 0a gate closed. Grounded against current source: `Line` (`lexer.ts:45-56`) already carries `afterBlank` ("start of file counts as a paragraph boundary" — the file-header exception is close to free); `parseFile()`'s top-level dispatch loop (`parser.ts:218-296`) is the insertion point for skipping flagged lines; `TOP_KEYWORDS` does not grow (comments are a `Line`-level flag, not a keyword).
- **Deliverable**: Lexer: `comment` flag on indent-0 `##` lines (`## ` and `##text` both count; never dropped from the stream), `lex.comment-blank-lines` for runs not blank-delimited on both sides (file start/end count as blank). Parser: skip flagged lines at top-level dispatch only; `parse.comment-inside-block` (fix-it: "comments are only legal outside blocks, at the top level of the story file") everywhere else — `end`-terminated bodies, the blank-delimited `create`-header/body split (one-line lookahead: a flagged line whose next non-blank line is indented is inside the construct), and indented `##` at code positions (raw-prefix check; indented `##` in prose renders verbatim per §5.2 — never diagnosed). Unit tests (`packages/chord/tests/comments.test.ts` + `tests/fixtures/gates/` fixtures) covering ADR-249 AC groups 1 and 2 verbatim. Full detail: docs/work/adr-249-chord-comments/plan.md Phase 2.
- **Exit state**: `pnpm --filter '@sharpee/chord' exec vitest run` green (new comment tests + all pre-existing chord suites, no regressions — grep confirmed zero `#`-leading lines in any in-repo `.story` file); `./repokit build --skip <unaffected>` succeeds through chord.
- **Status**: COMPLETE (2026-07-20 — chord 416 green incl. 18 new comment tests; full `./repokit build dungeo` clean)

### Phase 0c: Comments — E2E golden fixture + docs (ADR-249 AC groups 3–4)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Chord E2E compilation (IR identity) + author-facing reference docs
- **Entry state**: Phase 0b complete; lexer/parser comment support green.
- **Deliverable**: A `.story` fixture gains file-header (`##` as line 1, no preceding blank), between-constructs, and stacked multi-line comments — golden comparison asserts the compiled IR is identical to the uncommented twin; smoke transcript unchanged if the fixture backs one (rebuild bundle first via `./repokit build --skip <unaffected>` if needed). Docs: `docs/reference/chord-grammar.md` + `docs/reference/chord-language.md` gain the `##` form, example-first (file-header, between-constructs, stacked, and one negative example showing the `parse.comment-inside-block` fix-it). The grammar-changes log row needs no edit (already landed with the ADR). Full detail: docs/work/adr-249-chord-comments/plan.md Phase 3.
- **Exit state**: Golden IR-identity test passes; docs updated example-first; chord suite and any exercised transcripts green per the c864b3c1 baseline.
- **Status**: COMPLETE (2026-07-20 — comments-golden.story vs cloak.story identical modulo spans; fernhill.story annotated live: wt-01 walkthrough 76 PASS + 483/483 unit transcripts; chord-language.md §1.3 + chord-grammar.md Comments section + chord.ebnf updated)

### Phase 1: Companion ADR — draft the phrasebook design (block grammar, IR/registry, fallback chain, diagnostics, E2E spine)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Chord compiler frontend + phrase-rendering seam design (no code changes — this phase is a document)
- **Entry state**: ADR-245 read in full (ACCEPTED, amendment incorporated); sibling ADRs 230, 215, 235, 243, 240, 158, and the phrase-algebra family (192–206) read for the constraints listed above; `packages/chord/src/parser.ts` inspected for the real grammar surface (`TOP_KEYWORDS` currently `{story, create, define, when, once, every}`; `use` handled as its own dispatch, not in `TOP_KEYWORDS`; `define-phrase`/`define-phrases` AST node shapes already exist and are reusable for book entries).
- **Deliverable**: New child ADR at `docs/architecture/adrs/adr-250-chord-phrasebook-design.md` (status DRAFT), pinning:
  - **Block grammar**: `define phrasebook <name> [while <condition>] … end phrasebook`; entries are ordinary `define-phrase`-shaped items (`<key>[, strategy]:` + `or` variants, all five strategies); single kebab-case book names; `while` as a structural word (no name/`while` boundary ambiguity, per David's 2026-07-20 syntax ruling).
  - **`use phrasebook <name> [while <cond>]`**: distribution spelling, registry-disambiguated from plain one-word `use <extension>` (grammar of the latter untouched); stacking multiple `use phrasebook` lines with varying predicates; predicate binds at the use site; a used book with no binding is `always`.
  - **`import phrasebook "<file>"`**: filename/extension conventions, resolution rules, import-site-as-arbitration-position semantics; imported files are part of the story project (predicates may reference story entities); shaped so the `import` keyword generalizes later without foreclosing the parked generalized-`import` ADR — `TOP_KEYWORDS` gains `import`.
  - **IR shapes and the competing-definitions registry per key** — replaces today's replace-once dotted-key `define phrase` semantics for book-owned keys only (story-level `define phrase` keeps replace-once); this is the platform change (engine/lang seam) requiring explicit go-ahead.
  - **Fallback chain wiring**: per-entity phrase → story `define phrase` → active book (first predicate-match in declaration order, per key, `use`d and `define`d books arbitrating by file-appearance order) → platform default.
  - **Variant state per (book, key)**: cycling/first-time/sticky counters belong to the entry, not the bare key; save-shape keyed accordingly (undo/save relevant — cite the event-sourcing save/restore ADRs for the shape convention).
  - **Render-time predicate evaluation**: derived only, never stored, modeled directly on ADR-240's `registerSnippetGate` pattern; document the observable mid-turn voice-shift property explicitly (per ADR-245 Consequences — "implementations and docs must state, not hide" it).
  - **Diagnostics**: entry-level `while` disallowed inside a book (book predicate is the sole gate, same rule as chord's `analysis.override-gate`); `use phrasebook <unknown>` rejection (model on ADR-230's D5 fail-loud precedent).
  - **Affected-module list**: concretely enumerate every file in `packages/chord` (lexer/parser/analyzer/ir/catalog/diagnostics), the rendering seam (`lang-en-us`/`text-blocks`), and the save-shape (wherever event-sourced world state serializes) that the design touches.
  - **Q-2 re-confirmation as an Open Question** (do NOT pre-decide): whether dotted platform message IDs remain legal inside a book. ADR-245 recorded "any key" pre-amendment; the amendment flags it for re-confirmation. This becomes the companion's Open Questions section, resolved only through David via `/devarch:adr-interview` or his own edit — never resolved silently in this phase.
  - **Acceptance criteria and the concrete unreliable-narrator E2E scenario** as the spine (a story exercising at least two books with overlapping keys, one predicate-gated and one `always`, demonstrating arbitration, fallback, and mid-turn voice-shift).
- **Exit state**: `docs/architecture/adrs/adr-250-chord-phrasebook-design.md` exists, status DRAFT, with every item above pinned except Q-2 (captured as a non-empty Open Questions section) — ADR must not be marked ACCEPTED while Open Questions remain (rule 11a).
- **Status**: COMPLETE (2026-07-21 — adr-250-chord-phrasebook-design.md written, DRAFT, D1–D9 + AC 1–7 pinned; Q-1 (= ADR-245's Q-2) the sole Open Question; grounded by three parallel source audits against HEAD)

### Phase 2: Companion ADR — review and resolve open questions
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Same as Phase 1 (document-only; no code changes)
- **Entry state**: Phase 1's DRAFT companion ADR exists with a non-empty Open Questions section (Q-2 dotted-key re-confirmation, plus any others `adr-review` surfaces).
- **Deliverable**: Run `/devarch:adr-review` against `adr-250-chord-phrasebook-design.md` (and, since it cross-references ADR-245/230/240/158/215/235/243, consider the multi-ADR cross-seam mode); fold every finding back into the ADR. Ask David the rule-11a question — "Do you want to start the open questions interview now?" — and if yes, run `/devarch:adr-interview` one question at a time (Q-2 first) until the Open Questions section is empty. Do not resolve Q-2 or any other open question unasked.
- **Exit state**: `adr-review` reports the companion clean (or all findings addressed); Open Questions section is empty; companion ADR is ready for the DRAFT → ACCEPTED flip pending David's own action (the flip itself is Phase 3, not this phase — rule 11a: resolution happens through the interview or David's edits, the ADR's status flip is David's call).
- **Status**: COMPLETE (2026-07-21 — Q-2/dotted-keys ruled NO by David directly, no interview needed; multi-ADR review 245+250 run: 1 contradiction (ADR-245 D1 "any key" superseded — amended), 2 small (evaluator return shape pinned; 245 mid-turn wording refinement note added); Open Questions empty)

### Phase 3 (gate): David's platform-change go-ahead — companion ADR ACCEPTED
- **Tier**: Small
- **Budget**: 20 tool calls (present the companion summary and diffs since ADR-245; no code, no further ADR edits)
- **Domain focus**: N/A — decision gate, not work
- **Entry state**: Phase 2 complete; companion ADR has zero Open Questions and a clean `adr-review` pass.
- **Deliverable**: Present the companion ADR to David for the DRAFT → ACCEPTED flip, and separately obtain his explicit platform-change go-ahead per CLAUDE.md ("Any changes to `packages/`... must be discussed with the user before implementation") and per ADR-245's own closing gate ("plus David's explicit go-ahead per the platform-change gate"). These are two distinct approvals recorded in the same conversation turn: (a) the ADR content is right, (b) implementation may begin.
- **Exit state**: Companion ADR status is ACCEPTED; David has explicitly authorized implementation. **No Phase 4+ work may start before this exit state is reached — this is a hard boundary, not a formality to skip.**
- **Status**: COMPLETE (2026-07-21 — "proceed": flip + go-ahead. Late rulings folded pre-flip: Q-2 dotted keys NO; intent clarification; default-phrasebook naming; used-book manifest-keys gap fixed in final review)

### Phase 4: Chord surface — parser/lexer/analyzer for `define phrasebook`, `use phrasebook`, `import phrasebook`
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Chord compiler frontend (`packages/chord`) — block grammar, registry-disambiguated `use phrasebook`, `import phrasebook` file resolution, diagnostics
- **Entry state**: Phase 3 gate closed (companion ACCEPTED, go-ahead given). This phase's exact scope is re-derived from the companion's pinned grammar/diagnostics sections at start — the item list below is the coarse sketch from ADR-245 alone and WILL be refined against the companion before coding starts.
- **Deliverable** (coarse — refine against the ACCEPTED companion before implementing):
  - Lexer/parser: `define phrasebook <name> [while <condition>] … end phrasebook` block, reusing `define-phrase` entry parsing; `TOP_KEYWORDS` gains `import`; `import phrasebook "<file>"` file-inclusion parsing; `use phrasebook <name> [while <cond>]` distribution parsing disambiguated from the existing one-word `use <extension>` dispatch (parser.ts ~line 269/355-359).
  - Analyzer: entry-level `while` inside a book rejected as a diagnostic; `use phrasebook <unknown>` rejected as a diagnostic; book-name uniqueness/kebab-case validation.
  - IR: phrasebook AST nodes lower into the IR shapes the companion pins (competing-definitions registry entries keyed per (book, key)).
- **Exit state**: `pnpm --filter '@sharpee/chord' test` green for new/updated parser, analyzer, and IR unit tests covering the grammar and both new diagnostics; `./repokit build --skip <unaffected>` succeeds through the chord package.
- **Status**: COMPLETE (2026-07-21 — chord 444/444 incl. 28 new phrasebook tests; goldens gained only usePhrasebooks/phrasebooks empty keys, verified; full repokit build clean)

### Phase 5: Rendering seam — registry, fallback chain, variant-state save-shape
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Phrase-rendering seam (`lang-en-us`/`text-blocks` formatter chain) + engine/lang save-shape
- **Entry state**: Phase 4 complete (IR shapes exist and are lowered); companion's fallback-chain, registry, and variant-state sections are the spec.
- **Deliverable** (coarse — refine against the ACCEPTED companion before implementing):
  - The one new lookup layer in the rendering chain (per-entity → story `define phrase` → active book, first-predicate-match-in-declaration-order per key → platform default), wired alongside the ADR-158 formatter-chain contract, not bypassing it.
  - Render-time predicate evaluation modeled on ADR-240's `registerSnippetGate` (derived only, no cache, no invalidation list).
  - Variant-state (cycling/first-time/sticky) counters keyed per (book, key) in the save/undo shape.
- **Exit state**: Unit tests demonstrate arbitration (first-match-per-key across two books), fallback-through (uncovered key falls to platform default), story-override-always-wins (a story `define phrase` beats every book), and save/restore round-trips variant-state counters correctly per (book, key). Full monorepo build green.
- **Status**: CURRENT (started 2026-07-21)

### Phase 6: E2E acceptance — unreliable-narrator scenario
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Test-story authoring + transcript testing (the companion's acceptance-criteria section is the spec)
- **Entry state**: Phase 5 complete; full suite green.
- **Deliverable**: A test story (new purpose-built story, or an addition to `stories/fernhill`) exercising the companion's concrete unreliable-narrator scenario — at least two books with overlapping keys, one predicate-gated, one `always`, demonstrating arbitration, fallback, and the documented mid-turn voice-shift property — via `.transcript` walkthrough/unit tests run through `dist/cli/sharpee.js --test`.
- **Exit state**: New transcript(s) pass; full walkthrough chain and unit suite remain green per the c864b3c1 baseline (no regressions); the mid-turn voice-shift property is demonstrated and asserted, not just implemented.
- **Status**: PENDING

### Phase 7: Docs — finish the cookbook rename sweep + author-facing phrasebook reference
- **Tier**: Medium
- **Budget**: 200 tool calls
- **Domain focus**: Docs/site (Q-6's docs rename sweep, `docs-example-first` policy for the new construct's own reference doc)
- **Entry state**: Verified during planning: the Q-6 rename sweep is **already substantially done** — `website/src/app/chord/cookbook/` and `docs/reference/stdlib-cookbook.md` already use "cookbook," not "phrasebook." Loose ends remain: `docs/work/stdlib-cookbook/render-site.mjs` still titles the page "Standard Library Phrasebook" (title + meta description); story fixtures under `docs/work/stdlib-cookbook/fixtures/*.story` still use `"Phrasebook: <Topic>"` titles and `phrasebook-<topic>` ids (e.g. `switching.story`). Phase 4-6 implementation should have landed by the time this phase starts, satisfying Q-6's "before or with the first phrasebook implementation" ordering.
- **Deliverable**:
  - Finish the sweep: rename the remaining `render-site.mjs` title/meta strings and the `fixtures/*.story` titles/ids away from "Phrasebook" (exact replacement term is whatever the site already settled on — confirm "Cookbook" is final, not a placeholder, before touching ~17 fixture files).
  - New author-facing reference doc for the runtime `phrasebook` construct itself (distinct from the cookbook) — example-first per the `docs-example-first` policy: worked `define phrasebook`/`use phrasebook`/`import phrasebook` examples before any prose explanation, using the ADR-245 winter/springtime example as the seed.
  - Site page + nav entry for the new construct doc (mirroring how `use <extension>` and other Chord constructs are documented).
- **Exit state**: `grep -ri phrasebook docs/work/stdlib-cookbook/ website/src/app/chord/cookbook/` returns no stray "Phrasebook" cookbook-surface references; the new phrasebook-construct reference doc exists, builds, and is linked from nav; docs build (`website`) succeeds.
- **Status**: PENDING

## Phase-2/rule-11a note
Phase 2 explicitly includes the consent-gated interview ask required by rule 11a — do not run `/devarch:adr-interview` unasked, and do not resolve Q-2 (or any open question the review surfaces) by inference. If David declines the interview in that session, Phase 2 stays open until he resolves the questions another way (direct edit, or asking for the interview later) — Phase 3's gate cannot open with a non-empty Open Questions section.
