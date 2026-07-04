# Session Summary: 2026-07-03 - v2_familyzoo_split (book-v2-edition Phases 1-2)

## Goals
- Execute Phase 1 of `docs/work/book-v2-edition/plan.md`: full rewrite of
  `docs/book/v2.0.0/parts/part-5/19-the-formatter-chain.md` (formatter chain →
  Phrase Algebra, per change-list Part 5 + `docs/reference/phrase-algebra-primer.md`)
  and the two ch18 fixes (Parameters quoted-output claim, dead formatter-chain
  forward-reference).

## Completed
- **ch19 full rewrite** → new file `docs/book/v2.0.0/parts/part-5/19-the-phrase-algebra.md`
  ("The Phrase Algebra: Grammar in the Template, Not the Text"); old
  `19-the-formatter-chain.md` git-rm'd (rename explicit in the approved plan);
  `book.yaml` input-files entry updated. Covers all change-list GAP items: hint-word
  NounPhrase grammar (`{the item}`, `{a/an item}`, `{some item}`,
  `{capitalize the item}`), `nounPhraseFor(entity)` (ADR-158 mechanics),
  the Assembler's single-authority role, `{verb:is item}` agreement (real
  `fixed_in_place` template quoted), code-side PhraseList + count-grouping,
  `{contents:box}`, `{number:… words/ordinal}`, `{pronoun:…}`, `{verbatim:…}` +
  the stray-"a " hazard, `{slot:…}` aside, Optional/Choice as code-side producers
  (friendly-zoo-style plain object literals, all five Choice selectors, determinism +
  save persistence), the ADR-206 nested-`params` contract, and loud `PhraseParseError`
  behavior (legacy colon chains, unknown hints, unbound params — exact error strings
  verified against the parser).
- **ch18 fixes**: photo template now teaches `{the target}` (definite-article hint);
  quoted output "the toucan" stays truthful; forward-reference now names the
  **phrase algebra** (template grammar + Assembler) instead of the dead
  "formatter chain".
- **Companion consistency edits** (same template quoted elsewhere):
  `tutorials/familyzoo/v2.0.0/src/ch20-npcs.ts:672` (per the change-list's own
  instruction) and `docs/book/v2.0.0/parts/part-4/14-custom-actions.md:269` (+ one
  prose sentence noting the hint) — both `{target}` → `{the target}`.
- **Rename-fallout terminology fixes** (one-liners; Phases 5/6 must NOT double-fix):
  ch3 `03-the-play-loop.md:81` ("text formatters" → template placeholders),
  ch26 `26-decoration-and-theming.md:12` ("formatter chain" → "phrase algebra"),
  appendix-a (both "formatter chain" mentions → phrase algebra / Assembler).
- **Snippets re-extracted** (`node scripts/extract-book-snippets.cjs` from
  `docs/book/v2.0.0/`): new `ch19-the-phrase-algebra/` (5 author snippets); incidental
  diffs in ch07/ch12/ch13/ch18/ch24 snippets are benign regeneration drift (snippet
  tree was stale vs. current chapter sources — verified punctuation-only).

## Key Decisions
- ch18 "Parameters" fix: took the change-list's second option — teach `{the target}`
  rather than rewording the output to "a toucan" (pedagogically sets up ch19's hint
  syntax). Tutorial transcript assertions only check "Click"/"toucan", so rendering
  "the toucan" still passes; render verified byte-exact via the real Assembler.
- Serial-comma claim: the change list marked "a story can turn it off" WRONG
  ("no story-facing toggle found"), but `EnglishLanguageProvider.setSerialComma()`
  (added 2026-06-27, commit `06856360`) is public, reachable from `extendLanguage`,
  and flows via `getLocaleSettings()` → engine render context → Assembler. The new
  ch19 states the toggle accurately (`language.setSerialComma(false)`).
- ADR-089 perspective placeholders (`{You}`, bare-verb conjugation pre-pass) exist in
  platform templates but are NOT taught in ch19 — outside the change-list GAP scope
  and absent from the primer; flagged here in case David wants them documented later.
- ch19 deliberately shows legacy colon-chain forms (`{the:item}`, `{the:cap:item}`)
  in its "Mistakes fail loudly" section — as *rejected* syntax with the exact thrown
  error, satisfying the change-list's "loud synchronous parse errors" GAP. The
  "no colon-chain forms remain" exit criterion is read as "none taught as working
  syntax".

## Verification
- **Template parse/render harness** (scratchpad `verify-ch19-templates.cjs`, drives the
  real `packages/lang-en-us/dist` parser + EnglishAssembler): 23/23 chapter templates
  parse; 4/4 documented-rejected forms throw `PhraseParseError` with the exact messages
  the chapter quotes; 8/8 quoted outputs render byte-exact ("The pygmy goats are fixed
  in place.", "a goat, two rabbits, and a parrot", "an owl", pronoun "It", Optional
  comma-absorption, ch18's "the toucan" with a *string* param, `{number:… words}`
  "seven").
- `./scripts/build-book.sh v2.0.0 html`: clean; new title present in built HTML; zero
  "formatter chain" in the built book.
- Grep: only colon forms remaining in ch18/ch19 are valid kind prefixes + the two
  documented-rejected examples; zero "formatter" mentions in live book content outside
  ch19's intentional historical references (testing/ audit logs untouched — historical
  records).
- Tutorial edit not separately run in-repo (no node_modules; registry-install
  verification is exactly Phase 7's dry run). The changed string's runtime behavior is
  covered by the render harness above.
- Mutation-verification agent: skipped — docs/yaml edits plus one string-literal change
  inside `extendLanguage`; no new or changed side-effect function.

## Files Modified
- `docs/book/v2.0.0/parts/part-5/19-the-phrase-algebra.md` — NEW (full rewrite)
- `docs/book/v2.0.0/parts/part-5/19-the-formatter-chain.md` — DELETED (git rm)
- `docs/book/v2.0.0/parts/part-5/18-the-language-layer.md` — 2 fixes
- `docs/book/v2.0.0/book.yaml` — input-files entry
- `docs/book/v2.0.0/parts/part-4/14-custom-actions.md` — `{the target}` + prose
- `tutorials/familyzoo/v2.0.0/src/ch20-npcs.ts` — line 672 template
- `docs/book/v2.0.0/parts/part-1/03-the-play-loop.md`,
  `parts/part-7/26-decoration-and-theming.md`,
  `backmatter/appendix-a-architecture-map.md` — rename-fallout terminology
- `docs/book/v2.0.0/code-snippets/**` — regenerated (new ch19 dir + stale-drift)
- `docs/work/book-v2-edition/plan.md` — Phase 1 → DONE, Phase 2 → CURRENT (gated)

# Phase 2 (same session, go-ahead: "phase 2"): Appendix D Regeneration

## Completed (Phase 2)
- **New `scripts/generate-appendix-d.cjs`** (committed tooling, not scratch — the phase's
  repeatability requirement): instantiates `EnglishLanguageProvider` from
  `packages/lang-en-us/dist`, enumerates `getAllMessages()` (public API), groups ids by
  strip-last-segment, emits the same `## \`group\` {.unnumbered .unlisted}` +
  `| Message ID | Default text |` structure as the original (newlines flattened to
  spaces, pipes escaped), header count computed live.
- **Appendix D regenerated**: 821 messages in 84 groups (was stale 808/82). Header now
  names the generator script.

## Verification (Phase 2)
- **ID-set diff old→new is exactly the change-list findings, nothing else**:
  removed = 3 renamed help keys (`general_help`/`first_time_help`/`help_topic`);
  added = 16 (`if.action.help.general`/`.first_time`/`.topic`, `if.action.about.success`,
  `if.action.taking.nothing_to_take`, 6× `platform.*`, 4× `npc.*`,
  `if.room.description_body`). 808 − 3 + 16 = 821.
- Regenerated content: 123 `{verb:…}` templates, ADR-203 `{capitalize the speaker}`
  forms, zero legacy colon-chain templates, zero `npcName`.
- Spot-checked against source (not the old table): `taking.ts:28` nothing_to_take,
  `platform-messages.ts:20-21`, character.conversation speaker templates — byte-match
  modulo table flattening.
- `./scripts/build-book.sh v2.0.0 html` clean; TOC contains the Appendix D entry but
  none of the 84 group headings (suppression intact; earlier false-negatives were
  pandoc line-wrap artifacts in my grep, re-verified with normalized whitespace).

## Session Metadata
- **Status**: DONE — Phases 1 and 2 complete, all exit criteria met. Uncommitted;
  Phase 3 (ch15 ADR-207 edit) awaits go-ahead.
- **Blocker**: N/A
- **Rollback Safety**: docs + one tutorial string + one new script; reverts cleanly.
