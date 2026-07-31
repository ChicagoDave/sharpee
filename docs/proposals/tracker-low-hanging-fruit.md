# Proposal: Tracker Low-Hanging Fruit

**Status**: ACCEPTED ITEMS COMPLETE — all five (P-1, P-2, P-5, P-7, P-8) DONE (2026-07-30); P-3, P-4, P-6 remain PROPOSED, blocked on ADR work
**Origin**: issue set — the small, unblocked, well-understood items from the 36 open GitHub issues, surveyed 2026-07-29 after the full triage pass of session 3ef8b98a
**Date**: 2026-07-29
**Session**: 5c4586

Every open issue was read; the eight below are the ones whose fix is already
understood, small in blast radius, and gated on nothing. Origin material is
summarized per item — the tracker is not a live reference.

Excluded deliberately, and why:

- **Blocked on a decision** — #79, #82, #95, #129 (four ADR rulings outstanding);
  #192–#196, #198 (ADR-290 is DRAFT, "do not implement"); #200, #197 (need ADRs).
- **Blocked otherwise** — #120 (on P-1 below), #131 (on TypeScript 7.1's
  programmatic API).
- **Real but not small** — #106, #108 (mechanical but broad); #97, #188 (need
  design); #86, #94, #132, #135–#139, #143 (curation efforts).

Five items (P-1 is tooling; P-2 through P-6) touch `packages/`, which CLAUDE.md
places behind a discussion gate. Recording them here is the discussion; nothing
is implemented until the item is ACCEPTED.

## Items

### P-1: Make `repokit test:npm --local` work again under npm 12 (#199)

`tools/repokit/src/consumer-gen.ts:130` reads `npm pack --json` output as an
array. npm 12.0.1 emits an object keyed by package name, so `JSON.parse(out)[0]`
is `undefined` and the tool dies with a bare "Cannot read properties of
undefined" that names neither `npm pack` nor the package. Affects `--local` only;
the registry branch never calls `pack()`.

- **Done when**: `./repokit test:npm dungeo --local` gets past package staging
  and installs; `pack()` accepts both the array and keyed-object shapes; and when
  neither yields a filename it throws an error naming `npm pack --json` and the
  package. Re-running #120's comparison is then possible.
- **Status**: DONE — `docs/work/tracker-low-hanging-fruit/plan.md` Phase 1, completed
  2026-07-30 (session 405116). `pack()` shape fix in `78f5c4ec` (was `a83b2604`);
  the install half needed two further defects cleared — #201 (dev-dep closure never
  vendored) and the stale local staging tree. `./repokit test:npm stories/dungeo
  --local` now reports **115 passing, 0 failures**.
  **Caveat**: the bare-name form this Done-when literally names
  (`test:npm dungeo --local`) still fails at `lookupStory` — that is #202, filed
  separately and out of P-1's scope. The explicit-path form is what was verified.

### P-2: Widen `CheckpointData.version` off the string literal (#142)

`packages/extensions/testing/src/types.ts:248` types `version: '1.0.0'`. A
literal-typed format version makes every bump a breaking type change, which is
the opposite of the versioned-reader approach used for save formats.

- **Done when**: `version` is typed `string`; the checkpoint reader validates the
  version at runtime rather than relying on the type; the testing extension's
  tests pass.
- **Status**: DONE — `docs/work/tracker-low-hanging-fruit/plan.md` Phase 2, completed
  2026-07-30 (session af7835). `version` is `string`; version support moved to the reader
  (`deserializeCheckpoint` throws naming the version and the readable list);
  `validateCheckpoint` is now structural only, which is what stops an unreadable
  checkpoint from reading back as "not found" at the store layer. 17 tests added — the
  extension's first suite. Platform build clean.
- **Review note**: no ADR governs the checkpoint format's version field
  (ADR-033/034/049 cover save-restore but not `CheckpointData`). Advisory only —
  worth an ADR if this becomes the pattern for save formats generally.

### P-3: Remove deprecated-but-still-exported symbols (#141)

`@sharpee/stdlib` still exports `EnhancedActionContext`, `ScopeLevelStrings`, and
`Action.canExecute`; `@sharpee/parser-en-us` still exports `registerGrammar`;
`@sharpee/event-processor`'s `EventHandler` is stale after ISSUE-068 removed
entity handlers. No back-compat is owed.

- **Done when**: each symbol is either removed or carries a comment saying why it
  is retained; removal is confirmed against the **generated** `docs/genai-api/`
  output, not the source barrels (source absence is not proof — see session
  3ef8b98a's #141 correction); the tree builds and the full suite passes.
- **Status**: PROPOSED
- **Blocked by** (proposal-review, STALE ADR): ADR-041 (ACCEPTED) still defines
  `EnhancedActionContext` as the action-execution context and specifies its
  shape; the code marks it `@deprecated` and the ADR was never amended.
  Removing the export leaves an ACCEPTED ADR describing a type that no longer
  exists. Mark ADR-041 superseded — almost certainly by ADR-051's four-phase
  context — in the same commit that removes the symbol.

### P-4: Narrow `where()`'s constraint type to the scope builder (#163 + #89)

Two issues, one change. `where(slot, constraint: Constraint)` takes a union
(`grammar-builder.ts:54-61`) whose callback members have different parameter
shapes, so a bare `scope => scope.touchable()` fails TS7006 and authors must
write `(scope: any)` — which the book teaches, reluctantly, in a beginner
chapter. Separately, `PropertyConstraint` and `FunctionConstraint` are the exact
two members the entity slot consumer never evaluates
(`entity-slot-consumer.ts:484`, `// TODO: Handle property constraints`) — so they
are also the two forms that silently no-op. Narrowing `where()` to
`ScopeConstraintBuilder` fixes inference and deletes two broken public forms at
once; both types stay in place for `matching()` (`:82`), which does evaluate them.

- **Done when**: `where('animal', scope => scope.touchable())` compiles with no
  annotation under `noImplicitAny`; `where()` no longer accepts the property or
  function forms; parser-en-us and stdlib suites pass; the dungeo walkthrough
  chain runs clean.
- **Status**: PROPOSED
- **Blocked by** (proposal-review, STALE ADR): ADR-231 D2a (ACCEPTED,
  `adr-231:153-154`) deleted `.hasTrait()` on the premise that ".where()
  function constraints remain the one parse-time gating mechanism for rules
  that genuinely need it." That mechanism does not exist —
  `entity-slot-consumer.ts:480` warns "FunctionConstraint in slot constraints
  not yet supported" and evaluates nothing, so Sharpee currently has **no**
  working parse-time gating. P-4 deletes the exact form the ADR names as the
  sole survivor. Amend ADR-231 D2a first: either implement function
  constraints in the slot consumer, or record that parse-time gating is gone
  and refusal belongs wholly to action `validate()`. P-4 then discharges the
  amendment rather than contradicting the record.

### P-5: Collapse the eleven literal `trace` grammar patterns into one (#81)

`packages/parser-en-us/src/platform-grammar.ts:33-43` defines eleven literal
patterns for one command with two optional parameters.

- **Done when**: the eleven `define('trace …')` calls are one parameterized
  pattern; `trace`, `trace on|off`, and `trace <parser|validation|system|all>
  on|off` all still map to `author.trace` with the same parameters; a parser test
  covers the matrix.
- **Status**: DONE — `docs/work/tracker-low-hanging-fruit/plan.md` Phase 3, completed
  2026-07-30 (session af7835). **11 → 2 patterns, not 1**: `[x]` marks only the next
  *word* optional (no optional groups), so a single `trace [category] [state]` would also
  accept `trace parser` and widen the language. `trace [on|off]` plus
  `trace parser|validation|system|all on|off` accept exactly what the eleven literals did.
  Literal alternates, not slots — `TraceAction` reads `parsed.tokens` and binds no slots.
  `tests/platform-grammar.test.ts` (24 tests) covers the matrix plus seven rejections and
  was run green against the eleven literals first. No stdlib change.

### P-6: Fix `@sharpee/helpers` across the bundle/story boundary (#146)

`node dist/cli/sharpee.js --story tutorials/familyzoo --play` dies with
`world.helpers is not a function`. The bundle builds the world from its own copy
of `@sharpee/world-model`; the story's `import '@sharpee/helpers'` patches
`WorldModel.prototype` on the story's copy. `@sharpee/helpers` is absent from
`STORY_RUNTIME_BASELINE` (`packages/story-runtime-baseline/src/index.ts:19-34`) —
that omission is the bug. Affects every `--story` load that calls
`world.helpers()`; the browser build (one module graph) is unaffected.

- **Done when**: the documented `--story <external> --play` command reaches the
  first prompt for a helper-using story — via a baseline entry or by retiring the
  prototype augmentation, whichever the implementation shows is right; the
  baseline package's `exports.test.ts` passes.
- **Status**: PROPOSED
- **Blocked by** (proposal-review, DECISION-IN-DISGUISE + UNPLANNABLE):
  ADR-178's Decision states "Bumping the baseline is an ADR-amendment to this
  one," and Invariant 4 requires ADR-level justification for additions ("I want
  X is not sufficient"). Promoting `@sharpee/helpers` is exactly that bump. The
  alternative path in the Done-when — retiring the prototype augmentation —
  separately reverses ADR-140's declaration-merging mechanism, and offering two
  mutually exclusive outcomes leaves `session-planner` no single exit criterion.
  Amend ADR-178 (v2 baseline) to settle the path, then restate the outcome as
  one assertable condition. Related: ADR-178 Invariant 2 limits stories to
  baseline packages, so `tutorials/familyzoo` importing `@sharpee/helpers` is
  already a baseline violation today.

### P-7: Copy the story CSS override in the monorepo `--browser` build (#147)

The standalone devkit flow copies `browser/<story-id>.css` to
`dist/web/<id>.css` and links it last — the documented single author CSS surface.
The in-repo build does not, so a story-shipped theme is silently dropped from the
web output. `browser.ts` carries two mirror implementations: a full-recursive
`mirrorToWebsite` and an inline hand-picked mirror that still enumerates files by
name.

- **Done when**: a `--browser` build of a story with a `browser/<id>.css`
  override emits that file into `dist/web/<id>/` and links it last in
  `index.html`; the two mirror implementations converge on one path.
- **Status**: DONE — `docs/work/tracker-low-hanging-fruit/plan.md` Phase 4, completed
  2026-07-30 (session af7835). The copy was only half of it: `templates/browser/index.html`
  was missing devkit's `<link rel="stylesheet" href="{{STORY_ID}}.css">` line entirely, so
  the fix adds the link, a two-line `{{STORY_ID}}` substitution (duplicated per ADR-187 R1,
  devkit's `processTemplate` is private), and the copy — with a placeholder written when a
  story ships no override, so the unconditional link never 404s. The hand-picked mirror is
  replaced by `mirrorToWebsite()`; verified real-path on `website/public/web/dungeo/`,
  which now carries the override CSS, `audio/`, and the sourcemap the enumeration dropped.
- **Review note**: reinforced by ADR-188 R4 — the author override stylesheet
  must load *after* the engine/`:root` CSS so its `[data-theme]` overrides win.
  In-repo `--browser` builds violate that cascade contract today.

### P-8: Drop dungeo's redundant `SceneryTrait` adds (#170)

ADR-189 made `createEntity(name, EntityType.SCENERY)` auto-add a `SceneryTrait`.
The book and the Family Zoo tutorial were aligned in #169; dungeo was not.
`stories/dungeo/src/` has ~70 `new SceneryTrait()` adds across ten region files
against ~35 `EntityType.SCENERY` sites. Story-level work — no platform gate.

- **Done when**: no `new SceneryTrait()` remains on a SCENERY-typed entity in
  `stories/dungeo/src/`, while adds on non-SCENERY types and any add carrying a
  custom can't-take message are preserved; the dungeo walkthrough chain runs
  clean.
- **Status**: DONE — `docs/work/tracker-low-hanging-fruit/plan.md` Phase 5, completed
  2026-07-30 (session af7835). **34 of 70 adds removed, 36 preserved**: the configured
  `frame` (AC-3) plus 35 adds on non-SCENERY types (ITEM 17, OBJECT 10, CONTAINER 5,
  DOOR 1), where the add is the only thing making the entity scenery. Every site was
  paired with its `createEntity` call by a read-only audit before any edit — all 70
  resolved, none ambiguous. Walkthrough chain **873/873 clean** (after RNG-noisy runs the
  standing rule says to re-run); unit transcripts unchanged at 1757 passed / 10 expected
  failures / 4 skipped; `--exec` spot-check confirms tree, kitchen table, and rug still
  answer "… is fixed in place".

---

## Review record

`proposal-review` ran 2026-07-29 (session 5c4586) against 302 references — 299
ADRs, `docs/context/project-profile.md`, the newest session summary, and the
active plan. No notation; no other proposals.

Verdict: **BLOCKING FINDINGS** on P-3, P-4, P-6 — each recorded on its item
above. P-1, P-2, P-5, P-7, P-8 clean and ACCEPTED by owner decision the same
session, then PLANNED the same session into `docs/work/tracker-low-hanging-fruit/plan.md`
(Phases 1-5 respectively); the three blocked items stay PROPOSED pending ADR work.

One set-level advisory, not item-scoped: `docs/work/adr-279-chord-writer-packaging/plan.md`
Phase 3 (archive/sign/notarize/DMG) is **CURRENT and not DONE**. Planning from
this proposal opens a second front while that phase sits mid-flight, and its
`.current-plan` pointer was deleted in session 3ef8b98a, so nothing surfaces it
automatically anymore.
