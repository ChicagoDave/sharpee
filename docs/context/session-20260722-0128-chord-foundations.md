# Session Summary: 2026-07-22 - chord-foundations (CST)

## Goals
- Author, interview to resolution, review, and accept a family of ADRs closing the Chord `.story` → browser-build gap (no build flag, no package.json, no hand-written renderer).
- Resolve the channel `take`/render-construct question left open by ADR-241/216.
- Decide whether Chord labels may contain dots.

## Phase Context
- **Plan**: No active plan covers this work (the pointed-to plan, `docs/work/adr-251-generalized-import/plan.md`, is unrelated — ADR-251 is already IMPLEMENTED per prior session).
- **Phase executed**: N/A — ADR authoring/interview/review session, not a plan phase.
- **Tool calls used**: 122 (session 74219a, no budget set).
- **Phase outcome**: N/A.

## Completed

### ADR-252 — `.story` as a first-class browser build input (ACCEPTED, amended same session)
- `sharpee build foo.story` builds a browser app by default: no `--browser`/`--platform-*` flag, browser is the default client, a non-default client is declared via a `client:` header field.
- All browser-app metadata (title, author, id, version, blurb) derives from the compiled Story IR (`IRMeta.title`/`author`/`fields`), never `package.json`.
- Client config lives as story-header `key:` lines (`client:`, `themes:`, `default-theme:`, `storage-prefix:`) landing in `IRMeta.fields` — grounded against `packages/chord/src/ir.ts` and `parser.ts:482-486`, which already accepts any `key:value` header field, so no grammar/IR change was needed for the base decision.
- TS projects and Chord `.story` projects are distinct, mutually exclusive project kinds; a hybrid is a build error.
- One build core shared by devkit + repokit, retiring the divergent `devkit/standalone/build-browser.ts` vs `tools/repokit/src/commands/browser.ts` implementations (the source of the `package.json` disagreement documented in the ADR's Context).
- Browser entry is generated from a template; the hand-written `src/browser-entry.ts` escape hatch (fernhill's clock renderer) is retired by ADR-253.
- **Amendment (same session)**: D3 gains `theme:` and `template:` header fields — Chord-native declaration of the theme and template/layout *packages*, reconciling pre-Chord ADR-188 (package.json-based) into the package.json-free `.story` world. `default-theme:` now defaults to a declared `theme:` before falling back to `classic`. Build-time validation cross-checks a declared `template:` against the story's channels: error on a channel the template requires but the story lacks, warn on a story channel the template doesn't place.
- `adr-review`: 12/15 clean → 4 edits folded before flip (D3 grammar hedge resolved to confirmed no-change + unknown-key warning; rejection-cases list added; byte-equivalent AC softened to identical-modulo-build-stamp; `--browser` migration surface enumerated).

### ADR-253 — Channel `return` and render-by-DOM-name convention (ACCEPTED)
- Pivoted from an original "declarative renderers in Chord" stub to: **no render construct at all**. A channel `return`s any construct — a field, a text template (`"The clock: (hour)"`), or a phrase — collapsing `take <field>` + `from event <key>` into one `return <construct> from <event>` clause. `take` is removed. This amends/supersedes the channel syntax of ADR-241 and ADR-216.
- A channel's value renders into a DOM element named for the channel (id/`data-channel` = channel name); `panel.ts` flips from create-in-sidebar to lookup-then-fallback, with the generic sidebar panel remaining the zero-effort fallback for unplaced channels.
- Custom placement rides the rebuilt theme/plugin system (ADR-188), extended from CSS-only to **DOM-contributing** — a theme/layout package contributes named elements that `mountDefaultLayout` adopts, declared via ADR-252's `template:` field and build-validated there.
- Retires ADR-252 D4's escape hatch: fernhill's clock goes fully TypeScript-free, deleting its `browser-entry.ts` renderer. Migration touches exactly one channel — fernhill is the only `define channel` user in the repo.
- `adr-review` found a seam (D3 leaned on an unspecified ADR-252 template capability, which didn't yet exist when 253 was first drafted); resolved by routing through the theme/plugin placement path, with the D2 non-string rendering contract clarified — both folded before flip.
- File renamed `adr-253-declarative-channel-renderers.md` → `adr-253-channel-return-and-dom-render.md` to match the pivoted design.

### ADR-254 — Chord labels are single kebab-case tokens, no dotted keys (ACCEPTED)
- `.` is illegal in every Chord label/key — event keys, phrase keys, exit keys — across all 15 `readDottedKey` call sites; kebab-case single tokens throughout. Completes ADR-231 D1's direction (bare kebab keys are correct; dotted-key escapes are dead branches) rather than reversing it — ADR-231 D1b had left `readDottedKey` (`WORD { "." WORD }`) still permitting dots.
- String literals are exempt (file paths like `"chord-extras.ts"`, prose) — only labels/keys are constrained.
- No platform-event carve-out: verified zero `.story` files reference dotted platform events; `if.event.*` is an internal binding, not an author-facing label.
- Grammar change lands atomically with the fernhill (`estate.clock` → `estate-clock`) and friendly-zoo (`zoo.parrot` etc.) migrations.
- Sequenced before ADR-253 because channel/event naming in 253 assumes single-token labels.

### Housekeeping amendments
- ADR-241 and ADR-216 each gained a supersession pointer (dated 2026-07-22) noting their `take`/`define channel` syntax is superseded in part by ADR-253's `return <construct> from <event>` form.
- ADR-188 gained an extension pointer noting ADR-252 (Chord-native `theme:`/`template:` declaration) and ADR-253 (DOM-contributing themes, growing beyond CSS-only) both extend it.

## Key Decisions

### 1. Browser is Chord's default build target, no flag
A `.story` file builds to a browser app with zero flags and zero `package.json`; a non-default client is opted into via a `client:` header field. Removes the last reason a Chord author needs to touch TypeScript build tooling.

### 2. Story IR is the only metadata source for browser builds
`package.json` is never read for a `.story` build — title/author/id/version/blurb all come from `IRMeta`, keeping ADR-210's "compiled IR is the single product of a `.story`" invariant intact through the build step.

### 3. No render construct in Chord — reuse `return`
Rather than inventing new render syntax, a channel `return`s an existing construct (field/text-template/phrase) and the DOM element is found by channel name. This keeps the "no double-negative, no new surface where an existing one suffices" posture and lets ADR-188's plugin system absorb custom placement instead of growing a second mechanism.

### 4. Dots are categorically illegal in Chord labels
One uniform grammar rule across all label kinds rather than a case-by-case carve-out; closes the ADR-231 gap where the grammar still accepted what the design already rejected.

### 5. Sequencing: 254 → 253; 252 independent
254 must land first because 253's channel/event DOM-naming assumes single-token labels. 252 has no dependency on the other two and is the smallest, most self-contained implementation starting point.

## Next Phase
- No plan exists yet for implementing these ADRs. Recommended entry point for a future session-planner run: ADR-254 first (smallest, self-contained, grammar-only + two-story migration), then ADR-252, then ADR-253 (retires the 252 D4 escape hatch and needs 254's label rule in place).
- **Tier**: N/A — not yet planned.
- **Entry state**: All three ADRs are ACCEPTED and carry no Open Questions; none are implemented. A `session-planner` pass against ADR-254 (or the full 252/253/254 set) is the natural next step.

## Open Items

### Short Term
- Run `session-planner` to decompose ADR-254 (or the full three-ADR set) into implementation phases.
- fernhill's `browser-entry.ts` clock renderer is slated for deletion once ADR-253 lands — do not remove it before then.

### Long Term
- friendly-zoo's dotted keys (`zoo.parrot` etc.) need the same ADR-254 migration as fernhill.
- zifmia's own CSS engine is a separately deferred unification noted in ADR-188 (unrelated to this session's amendments, still open).

## Files Modified

**ADRs authored** (3 files):
- `docs/architecture/adrs/adr-252-story-first-class-browser-build.md` - new, ACCEPTED + amended same session (D3 theme:/template: fields)
- `docs/architecture/adrs/adr-253-channel-return-and-dom-render.md` - new (renamed from `adr-253-declarative-channel-renderers.md` during the pivot), ACCEPTED
- `docs/architecture/adrs/adr-254-chord-single-token-labels.md` - new, ACCEPTED

**ADRs amended** (3 files):
- `docs/architecture/adrs/adr-241-chord-dynamic-channels.md` - supersession pointer to ADR-253's channel syntax
- `docs/architecture/adrs/adr-216-chord-emit-payload-and-media.md` - supersession pointer to ADR-253's channel syntax
- `docs/architecture/adrs/adr-188-themes-as-plugins.md` - extension pointer to ADR-252 (theme:/template: declaration) and ADR-253 (DOM-contributing themes)

## Notes

**Session duration**: ~2.5 hours (started 2026-07-22T02:45:30Z per session-state).

**Approach**: Each ADR was drafted from a grounded Context section (source citations to `ir.ts`, `parser.ts`, `build-browser.ts`, `browser.ts`, `panel.ts`), taken through an open-questions interview where one remained, then run through `adr-review` (single-ADR for 252, multi-ADR cross-check for 252/253/254 together) before David flipped each to ACCEPTED. ADR-253 is notable for pivoting mid-session from its original stub title/shape ("declarative renderers in Chord") to a narrower "no render construct, reuse `return`" design — the file was renamed to match.

**Prior SSH-keepalive fix**: unrelated to this session's ADR work; already recorded in `docs/context/session-20260721-2149-chord-foundations.md` (`scratchpad/fix-ssh-keepalive.sh` — appears in this session's file-touch list only because it was read for context, not modified here).

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (design phase complete; implementation is unscoped future work)
- **Rollback Safety**: safe to revert — all changes are documentation (new/amended ADR files); nothing implemented yet

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-210 (Chord `.story` language), ADR-187 (devkit/repokit split), ADR-188 (themes-as-plugins), ADR-231 D1 (bare kebab key direction), ADR-241/216 (existing channel syntax) — all read and cited as parents/context before drafting.
- **Prerequisites discovered**: None — the session confirmed rather than discovered that `parser.ts:482-486` already accepts arbitrary `key:value` header fields, avoiding a grammar change for ADR-252's base decision (the D3 amendment still required none either, since it reuses the same header-field mechanism).

## Architectural Decisions

- ADR-252 ACCEPTED: `.story` is a first-class browser build input — no flag, IR-sourced metadata, one shared build core.
- ADR-253 ACCEPTED: channels `return` existing constructs (no new render syntax); DOM placement by channel name with theme/plugin override.
- ADR-254 ACCEPTED: Chord labels are single kebab-case tokens, dots illegal everywhere.
- ADR-241, ADR-216 amended: supersession pointers to ADR-253's `return` syntax.
- ADR-188 amended: extension pointers to ADR-252 (theme:/template: header fields) and ADR-253 (DOM-contributing themes).
- Pattern applied: grounded-Context-first ADR drafting (source-file line citations before design), per this session's established style; multi-ADR `adr-review` for cross-referencing sets (252/253/254 reviewed together at 14/14 with one drift item fixed).

## Mutation Audit

- N/A — documentation-only session (ADR authoring/review), no source code mutated.

## Recurrence Check

- NO — no similar prior-session issue found. This is new ADR-drafting work, not a bug fix or blocker resolution.

## Test Coverage Delta

- No test changes this session.

---

**Progressive update**: Session completed 2026-07-22 01:28
