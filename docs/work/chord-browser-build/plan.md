# Session Plan: Implement ADR-254 / ADR-255 / ADR-252 / ADR-253 (Chord single-token labels, message-override ACL, `.story` browser build, channel `return`/DOM render)

**Created**: 2026-07-22 · **Updated**: 2026-07-22 (session 818d28 — Phase 1 conflict resolved; ADR-255 authored + ACCEPTED and inserted as Phase 2; doc/website sweep split into Phase 5)
**Overall scope**: Implement a family of ACCEPTED, not-yet-implemented ADRs in ruled sequence — 254 (grammar: ban dotted labels) → 255 (`override message` message-override ACL, restoring the capability 254 removed the dotted spelling of) → 252 (`.story` is a first-class browser build input, one shared build core) → 253 (channel `return` + DOM-name rendering) — then a doc/website sweep (Phase 5) that teaches the ACL name rather than the retired dotted form. Compiler-grammar, loader, and build-tooling work, not domain modeling — phases are framed in plain technical terms (files, functions, grammar productions), not DDD bounded contexts.
**Bounded contexts touched**: N/A — infrastructure/tooling (Chord compiler frontend, `@sharpee/story-loader`, devkit/repokit build CLIs, platform-browser client). No `docs/ddd/notation.yaml` exists and none of this work introduces new domain modeling.
**Key domain language**: N/A for DDD. Technical vocabulary: Story IR / `IRMeta`, channel, `readDottedKey`, `override message` / `override messages <locale>`, ACL alias (`<action>-<message-key>`), Interface Contract 3, `return <construct> from <event>`, build core (devkit + repokit).

## References consulted
- `docs/architecture/adrs/adr-254-chord-single-token-labels.md` — ACCEPTED (amended session 818d28); `.` illegal in every Chord label/key, one rule; supersedes ADR-231 D1b; the dotted platform-message-override **spelling** is removed but the **capability** is retained via ADR-255.
- `docs/architecture/adrs/adr-255-message-override-acl.md` — ACCEPTED (session 818d28); dedicated `override message` / `override messages <locale>` constructs with full `define phrase` parity; hand-maintained `<action>-<message-key>` alias catalog; all messages overridable; Interface-Contract-3 split (chord `catalog.ts` names, `@sharpee/story-loader` dotted mapping); loader-side completeness pinning; story-wide-default precedence.
- `docs/architecture/adrs/adr-255-alias-catalog.md` — the ADR-255 D7 appendix: 54 actions, 734 aliases, 0 dotted aliases, 0 collisions, generated deterministically from built `lang-en-us` action modules.
- `docs/architecture/adrs/adr-252-story-first-class-browser-build.md` — ACCEPTED (amended); `.story` builds a browser app with no flag/`package.json`, metadata from `IRMeta` only, client config via header `key:` lines, one shared build core, template-based entry generation, D3 `theme:`/`template:` fields with build-time channel validation.
- `docs/architecture/adrs/adr-253-channel-return-and-dom-render.md` — ACCEPTED; `return <construct> from <event>` replaces `take`+`from event`; value renders into a DOM element named for the channel; placement rides ADR-188's theme/plugin system; retires ADR-252 D4's hand-written-entry escape hatch; depends on ADR-254's label rule.
- `docs/architecture/adrs/adr-231-player-surface-contract-rulings.md` (D1b) — the ADR that shipped the dotted platform-message-override mechanism; **superseded by ADR-254/255** (pointer added session 818d28).
- `docs/architecture/adrs/adr-241-chord-dynamic-channels.md` / `adr-216-chord-emit-payload-and-media.md` — current `take`/`from event`/`emit` channel syntax ADR-253 supersedes in part.
- `docs/architecture/adrs/adr-188-themes-as-plugins.md` — themes-as-plugins system ADR-252/253 extend; constrains Phase 4 to route custom placement through this system.
- `docs/architecture/adrs/adr-187-devkit-author-only-split-inrepo-build.md` — devkit = author tool, repokit = in-repo platform build; constrains Phase 3's "one build core, two callers" (rule 8b).
- `docs/architecture/adrs/adr-210-story-language.md` — parent; compiled Story IR is the single product of a `.story`; constrains all phases to stay IR-derived.
- `catalog.ts` "Interface Contract 2" (`packages/lang-en-us`/`chord` event-selector split) — the pattern ADR-255 extends to messages (Interface Contract 3).
- `docs/context/project-profile.md` — Chord test-assertion bar (assert on IR shape / diagnostic code+span, never "compiled without throwing"); two build CLIs by design.
- `docs/context/session-20260722-0128-chord-foundations.md` / `session-...818d28` — the ADR-authoring sessions; 254→252→253 sequencing, fernhill `browser-entry.ts` not deleted before ADR-253, friendly-zoo dotted-key migration.

## Phase 1 conflict — RESOLVED (session 818d28)

The original grounding surfaced a real contradiction: ADR-254's dot-ban vs. ADR-231 D1b's shipped, tested dotted platform-message-override mechanism (`define phrase if.action.taking.fixed_in_place`; `dotted-keys-all-sites.test.ts`; `state-machine.test.ts`'s `if.event.opened` trigger; `chord-language.md` §5.2/§5.3). David ruled directly:

- **Dots are illegal everywhere** — ADR-254 **supersedes ADR-231 D1b** (no carve-out). No real `.story` uses dotted platform keys (verified); the only consumers were synthetic tests.
- **The override *capability* stays**, behind a curated kebab **anti-corruption layer** — the raw `if.action.*` id never appears in a `.story`. This is **ADR-255** (now Phase 2).
- **Already done this session** (code): `packages/chord/tests/dotted-keys-all-sites.test.ts` deleted; `state-machine.test.ts` migrated `if.event.opened` → kebab `gate-opened` (chord suite green, 445 tests). ADR-254 amended (supersession + corrected "vestigial/unused" framing); ADR-231 D1b SUPERSEDED pointer added.

Phase 1 is therefore **unblocked** — no open gate remains before the grammar change. The `chord-language.md` §5.2/§5.3 + website doc work moves out of Phase 1 into **Phase 5** (it must teach ADR-255's `override message`, so it waits on Phase 2).

## Phases

### Phase 1: ADR-254 — single-token Chord labels (`readDottedKey` → single-`WORD` read), fernhill + friendly-zoo migration
- **Tier**: Medium · **Budget**: 250
- **Domain focus**: `packages/chord/src/parser.ts` (`readDottedKey`, 1 definition + 14 call sites), `packages/chord/src/diagnostics.ts` (new `parse.dotted-key` code), `stories/fernhill/fernhill.story` (`estate.clock` → `estate-clock`, 3 sites: 2 `emit` + 1 `from event`), `stories/friendly-zoo/zoo.story` (8 inline `phrase <key>` sites: `zoo.pa.closing-3/-2/-1/closed`, `zoo.feeding-time.announced` ×4).
- **Entry state**: ADR-254 ACCEPTED, conflict RESOLVED (see above) — uniform ban on author labels. The dotted-key test rework was already done (session 818d28); no further gate before code.
- **Second conflict, discovered during implementation (session 818d28) — resolved by applying David's framework, not re-asking**: the blanket dot-ban also broke **ADR-216's dotted event types** (`emit media.sound.play`, `from event chord.compass.updated`, machine `when event …`). Verified these are **platform-bound ids** — `stdlib/src/channels/media.ts` *consumes* `media.*`, `audibility.ts` treats `media.sound.play` as a channel id — so per the established framework (author label → kebab; platform id → curated kebab ACL) they are **not** author labels. Rather than break a platform-bound capability before its replacement exists (the same principle as ADR-254 keeping message override behind ADR-255), Phase 1 **scopes the ban to author-label sites** and leaves event-type sites working. Event types get their own ACL in **Phase 2b (ADR-256)**.
- **Deliverable** (DONE unless noted):
  1. ✅ `readDottedKey` → `readLabelKey(c, opts?)`. Author-label sites (phrase, exit, refusal keys — 11 sites) reject a `.` with `parse.dotted-key` (kebab fix-it at the dot). Event-type sites (`emit`, channel `from event`, machine `when event` — 3 sites) pass `{ allowDotted: true }` and keep the dotted form pending ADR-256.
  2. ✅ `stories/fernhill/fernhill.story`: `estate.clock` → `estate-clock` (3 sites); `media-degrade.transcript` assertion updated.
  3. ✅ `stories/friendly-zoo/zoo.story`: 8 dotted phrase keys → kebab.
  4. ✅ New `dotted-key-rejection.test.ts` (rejection at define-phrase + blocked-exit sites; D3 quoted-string/prose exemption).
  5. ✅ Chord's own test fixtures/tests migrated: `fixtures/zoo-timeline.story` + `zoo-phase-c.story` dotted author keys → kebab; inline assertions in `parser-phase-b`/`analyzer-phase-b`; golden snapshots re-recorded; phrasebook guardrail (`phrasebooks.test.ts`) updated — a dotted platform id now raises `parse.dotted-key` (rejection moved parser-side, ahead of `analysis.phrasebook-dotted-key`).
  6. ✅ `packages/chord` suite green — **31 files, 450 tests**.
  7. ✅ Bundle rebuilt; fernhill transcripts green (**495 tests / 18 files**), friendly-zoo green (**71 / 7**).
- **Exit state**: No `.story` contains a dotted **author** label; `parse.dotted-key` fires at the 11 author-label sites; quoted strings/prose unaffected; ADR-216 event types still work (dotted, pending ADR-256). fernhill/friendly-zoo compile with kebab labels. (Doc/website updates deferred to Phase 5.)
- **Status**: DONE (code) — chord unit 450, fernhill 495, friendly-zoo 71, all green. Uncommitted. ADR-256 (below) finishes the ban at the event-type sites.

### Phase 1b: ADR-256 — story-loader Chord-id → platform-id event translation (finishes ADR-254's ban)
- **Tier**: Medium · **Budget**: 300
- **Domain focus**: `packages/story-loader/src/` (new Chord-event-id → platform-event-id map + application at the emit executor **[seam TBD — locate it]**, channel `from event` `loader.ts:741`, machine `when event` `loader.ts:1563`), `packages/chord/src/parser.ts` (drop `allowDotted` from the 3 event-type sites), `.story` sources + chord fixtures (dotless event ids), the chord tests asserting the dotted IR form.
- **Entry state**: Phase 1 complete (author-label ban in place; event types still `allowDotted`). ADR-256 ACCEPTED. David go-ahead to touch `packages/story-loader` + `packages/chord`.
- **Deliverable**:
  1. story-loader translation map (Chord id → platform id) with the `media.*` entries (ADR-256 D2 table), applied at all 3 event seams; author events pass through as their kebab string (no map entry).
  2. Conformance test pinning the media map against the live `stdlib/channels/media.ts` registry (a media rename fails the build).
  3. Locate + pin the emit executor seam (ADR-256 marks it TBD).
  4. Drop `allowDotted` from the 3 parser sites; a dotted event id raises `parse.dotted-key`.
  5. Migrate `.story` + chord fixtures to dotless event ids; update the chord tests asserting the dotted IR form (`emit-payload`, `channel-capability`, `dynamic-channels`, `state-machine`).
  6. chord + story-loader + fernhill + friendly-zoo suites green.
- **Exit state**: Chord is fully dotless (ADR-254 uniform — no `allowDotted`); the platform is untouched; `media.*` events translate; author events are kebab.
- **Status**: DONE (code) — session 448562 (2026-07-22). Uncommitted.
  - **Emit seam pinned**: the sole chokepoint is `runtime.ts:1491` (`execStatements` `emit` case → `rawEvent`); translation applied to `stmt.event` at the call site, NOT inside `rawEvent` (which also mints the internal `chord.phrase` event). Channel seam `loader.ts:741` (translate `fromEvent` once), machine seam `loader.ts:1563` (translate `t.trigger.event`).
  - New `story-loader/src/event-id-map.ts` (`translateEventId` + `CHORD_TO_PLATFORM_EVENT_ID` media map); conformance test `event-id-map.test.ts` pins it against live `MEDIA_EVENT_TYPES` (5 tests). `allowDotted` dropped from the 3 parser sites AND removed as an option; +3 event-site rejection tests in `dotted-key-rejection.test.ts`. Media sugar (analyzer) lowers to dotless IR. Fixtures + chord IR assertions migrated to dotless.
  - **Green**: chord 453; story-loader 314/315 (see below); fernhill 500; friendly-zoo 71 + 56 walkthroughs. `mutation-verification` surfaced one gap — the machine `when event` seam's non-identity (media) translation was untested — closed with `event-id-map-machine.test.ts` (compiled machine fires on dotted `media.sound.play`, not the dotless id).
  - **Surfaced pre-existing Phase 1 fallout** (chord/dist is gitignored → Phase 1's local dist was stale, hiding these; Phase 1 never ran the story-loader suite): (1) `scheduler.test.ts` assertions were dotted while Phase 1 had migrated the `zoo-timeline.story` fixture to dotless — **fixed** this session (dotted→dotless, per David). (2) `dotted-phrase-keys.test.ts` tests the ADR-254-superseded dotted override capability (sibling `dotted-keys-all-sites.test.ts` deleted in Phase 1; this one missed) — **PARKED** per David (its ADR-255 kebab replacement is Phase 2). This is the 1 remaining story-loader red.

### Phase 2: ADR-255 — `override message` message-override ACL (Interface Contract 3)
- **Tier**: Large · **Budget**: 400
- **Domain focus**: `packages/chord/src/parser.ts` (new `override message <alias> … end override` and `override messages <locale>` constructs, reusing the `define phrase` body reader — D1), `packages/chord/src/ast.ts`/`ir.ts` (override decl shape: alias + phrase body), `packages/chord/src/analyzer.ts` (`analysis.unknown-message-alias` — D4), `packages/chord/src/catalog.ts` (the valid-alias name set — D4, language side), `packages/story-loader` (alias → `if.action.*` mapping + resolution + D6 precedence + D5 completeness conformance test), `docs/architecture/adrs/adr-255-alias-catalog.md` (source of the 734 aliases).
- **Entry state**: Phase 1 complete (dots banned — the ACL alias is itself a single kebab token). ADR-255 ACCEPTED. David has given explicit go-ahead to touch `packages/chord` and `packages/story-loader` for this phase.
- **Deliverable**:
  1. **Grammar (D1/D2)**: `override message <alias>` (full `define phrase` body: variants/`cycling`/strategy/`with` params/markers, via the shared body reader) and the `override messages <locale>` flat-entry locale block parse; the IR carries the alias and its resolved `if.action.*` id.
  2. **Alias catalog (D2/D7)**: the 734-entry `<action>-<message-key>` catalog lands as data — the valid-name set in `catalog.ts` (language side, names only) and the alias → `if.action.*` mapping in `@sharpee/story-loader` (platform side). Sourced from `adr-255-alias-catalog.md`.
  3. **Unknown-alias rejection (D4)**: `override message <alias>` with an alias absent from `catalog.ts` raises `analysis.unknown-message-alias`; the compile fails.
  4. **Resolution precedence (D6)**: loader resolves standard-action messages on-clause refusal → per-entity phrase → `override message` → platform default; pinned by test.
  5. **Completeness pinning (D5)**: a `@sharpee/story-loader` conformance test asserts the catalog is a total bijection with the live `lang-en-us` message-id set — a stdlib message without an alias fails the build.
  6. Tests per ADR-255 Acceptance: worked override (cycling) renders; `override messages <locale>` localizes; unknown alias rejected; D6 precedence honored; catalog completeness green.
  7. `packages/chord` + `packages/story-loader` suites green.
- **Exit state**: A story overrides any standard-action message via `override message <alias>` / `override messages <locale>` with no dotted id in sight; the ACL catalog is complete and pinned; precedence preserves per-entity/on-clause specificity. The capability ADR-254 removed the dotted spelling of is fully restored.
- **Status**: DONE (code) — session 448562 (2026-07-22). Uncommitted.
  - **Catalog is 748/56, not the authored 734/54**: live `lang-en-us` had grown by `cutting`+`digging` (ADR-230, 7 msgs each). Per D3+D5 the catalog covers all live messages; appendix regenerated, ADR-255 count note added (David's call). Generated `chord/src/message-alias-catalog.ts` (alias names) + `story-loader/src/message-alias-map.ts` (alias→`if.action.*`), pinned bijective-to-live by `message-alias-map.test.ts` (D5).
  - **Grammar** (D1): `override message <alias>` (full `define phrase` body via the extracted shared `readPhraseBody`) + `override messages <locale>` (mirrors `parsePhrasesBlock`). New AST/IR (`OverrideMessage`/`OverrideMessages`, `IRMessageOverrides`). `override` is a new top-level keyword.
  - **Rejection** (D4): unknown alias → `analysis.unknown-message-alias`; duplicate → `analysis.duplicate-message-override`; dotted alias → `parse.dotted-key` (ADR-254).
  - **Resolution** (D6): overrides register on the **phrasebook resolution seam** (`world.registerEvaluator(phrasebookTemplateKey(<resolved dotted id>))`), reusing the extracted `derivePhraseTemplate` — full flat+cycling parity; wins over platform default, loses to per-entity/on-clause (which emit their own ids). Alias→id resolved loader-side (Interface Contract 3). D6 precedence falls out; no engine change.
  - **NB — cycling parity mechanism**: the ADR didn't name it, but `override message … cycling` for a stdlib-emitted message id required the ADR-250 phrasebook evaluator seam (`renderViaPhrase` consults it before the platform default). Implementation reuses that seam; verified by a `{variants}` Choice-atom test.
  - **Green**: chord 461 (4 golden-IR snapshots updated for the additive `messageOverrides` field), story-loader 326/327 (only the Phase-1b-parked `dotted-phrase-keys.test.ts` red — its replacement now exists but the test still asserts the dotted spelling), fernhill (all pass), friendly-zoo 71. +20 new tests (chord 8, loader 12).
  - **Follow-up**: the parked `dotted-phrase-keys.test.ts` can now migrate to `override message` (its ADR-255 replacement exists) — not done this session; raise with David.

### Phase 3: ADR-252 — `.story` as a first-class browser build input, one shared build core
- **Tier**: Large · **Budget**: 400
- **Domain focus**: `packages/devkit/src/standalone/build-browser.ts` (`getProjectInfo` and its `package.json`/`src/index.ts` reads), `packages/devkit/src/cli.ts` (build dispatch, `--browser` flag, USAGE), `tools/repokit/src/commands/browser.ts` (`readThemes`, the divergent sibling build), `packages/chord/src/ir.ts` (`IRMeta.fields` — read-only consumer), the devkit browser-entry template, `CLAUDE.md`'s `--browser` examples.
- **Entry state**: Phase 1 complete (label rule in place — new header fields `client:`/`theme:`/`template:` are single kebab tokens). Independent of Phase 2. David has given explicit go-ahead to touch `packages/devkit` and `tools/repokit` for this phase.
- **Deliverable**:
  1. **Build-target dispatch (D1)**: `sharpee build <file>.story` accepts a bare `.story` with no `package.json`/`src/index.ts`; a directory with both a `.story` and `src/index.ts` is a build error; no `--browser`/`--platform-*` flag on the `.story` path (browser default; non-default via `client:`).
  2. **IR-sourced metadata (D2)**: title/id/version/author/blurb from `IRMeta`; `getProjectInfo`'s `package.json`/`src/index.ts` reads removed from the `.story` path (TS project kind unchanged).
  3. **Header-field client config (D3)**: `client:`/`theme:`/`template:`/`themes:`/`default-theme:`/`storage-prefix:` from `IRMeta.fields` (no grammar change — `parser.ts:482-486` already captures header `key:` lines); ADR-252 defaults; unknown client-config key warns; build-time `template:`-vs-`define channel` validation (generic channel-id presence, not renderer-specific).
  4. **Generated entry (D4)**: browser entry instantiated from the devkit template, parameterized by IR metadata + client-config — **fernhill keeps its hand-written `src/browser-entry.ts` in this phase** (retired in Phase 4).
  5. **One build core (D5)**: collapse `devkit/standalone/build-browser.ts` and `tools/repokit/src/commands/browser.ts` into one shared implementation both callers invoke (repokit stays the in-repo entry point, delegates); resolve the `package.json`-required-vs-tolerated drift.
  6. **Migration surface**: remove `--browser`/`--platform-*` from the `.story` build path in `cli.ts`, `init.ts` hint, and `CLAUDE.md` examples — out of scope: `./repokit build dungeo --browser` (TS/package project kind, distinct path).
  7. Rejection tests: hybrid project error; unknown `client:` error; unrecognized client-config key warns; a `.story` with diagnostics fails before emit.
  8. `sharpee build stories/fernhill/fernhill.story` produces `dist/web/fernhill/` with no `package.json`/`src/index.ts`; devkit and repokit outputs identical modulo build stamp.
- **Exit state**: a bare `.story` builds to a browser app with zero flags and zero `package.json`; metadata all IR-traced; devkit/repokit share one build core; fernhill still plays via its (present) hand-written entry. Suites green.
- **Status**: DESIGNED (not implemented) — session 448562. Concrete implementation design (shared-core location = `@sharpee/devkit` with an injected `BrowserBuildEnv` resolver; resolution-mode reconciliation; file-by-file changes; 6-step green-at-each-step order; REAL-PATH acceptance gate) in [`phase3-design.md`](phase3-design.md). David ruled (session 448562): high-blast-radius build refactor — design now, implement next session with fresh budget. Not started.

### Phase 4: ADR-253 — channel `return`/DOM-name rendering; retire fernhill's hand-written entry
- **Tier**: Large · **Budget**: 400
- **Domain focus**: `packages/chord/src/parser.ts` (`define channel` body — `from event`/`take` → `return <construct> from <event>`), `packages/chord/src/ast.ts`/`analyzer.ts`/`ir.ts` (channel decl `return` construct type), `packages/platform-browser/src/channels/panel.ts` (create-in-sidebar → lookup-then-fallback), the ADR-188 theme/plugin system (CSS-only → DOM-contributing), `stories/fernhill/fernhill.story` (channel `clock` → `return "The clock: (hour)" from estate-clock`), `stories/fernhill/src/browser-entry.ts` (deleted — the last `define channel` user).
- **Entry state**: Phase 1 complete (channel/event labels single kebab tokens). Phase 3 complete (ADR-252's generated entry + `template:` field + build-time channel validation exist to retire fernhill's hand-written entry into). David has given explicit go-ahead to touch `packages/chord`, `packages/platform-browser`, and the ADR-188 theme system.
- **Deliverable**:
  1. **Grammar (D1)**: `define channel` gains `return <construct> from <event>` (`<construct>` = field / text template with phrase slots / phrase); `take` removed (a `take` line is a parse error naming `return`); `return` missing `from <event>` is a parse error; `return` of a field the event lacks is an analyzer error.
  2. **DOM-name rendering (D2)**: renderer looks up element by `id`/`data-channel` = channel name, renders returned value as `textContent`; `panel.ts` flips create-in-sidebar → lookup-then-fallback (generic panel box remains the fallback); structured return with no text-template form falls back to key/value rows.
  3. **Theme/plugin placement (D3)**: extend ADR-188 from CSS-only to DOM-contributing — a theme/layout package supplies named elements `mountDefaultLayout` adopts; no new Chord syntax.
  4. **fernhill migration**: `define channel clock` → `return "The clock: (hour)" from estate-clock`; `src/browser-entry.ts` deleted (ADR-252 D4 escape hatch retired — fernhill builds from the generated entry + a theme/layout package contributing `<span id="clock">`); confirm fernhill's `template:`/`theme:` fields name that package.
  5. Rejection/edge tests: no named element → generic panel (not an error); `return` of unknown field → analyzer error; malformed `return` (no `from`) → parse error; bare `take` → parse error pointing at `return`.
  6. Full regression: `packages/chord`, `packages/platform-browser`, fernhill transcripts (`wt-*` + unit, `--chain`), and a real browser build of fernhill confirming the clock renders in the status bar with zero story TypeScript.
- **Exit state**: `return` parses; `take` is gone (a parse error); a channel renders into an author-named element when present, generic panel otherwise; fernhill's clock works with no story TS / no `browser-entry.ts`; ADR-252 D4 escape hatch retired for the renderer case. ADRs 254, 255, 252, 253 fully implemented (code).
- **Status**: PENDING

### Phase 5: ADR-254 + ADR-255 doc/website sweep — teach `override message`, drop the dotted form
- **Tier**: Medium · **Budget**: 300
- **Domain focus**: `docs/reference/chord-language.md` (§5.2/§5.3 dotted-override sections, plus the "dotted key is legal" lines at §2.5, §3.6, §3.7, phrasebook note), `docs/reference/chord-grammar.md`, the ~10 `website/src/app/chord/**/content.mdx` guide/cookbook/stdlib pages that teach `define phrase if.action.*` (refusals, exits, define-phrase, define-phrases, define-phrasebook, manipulation/container cookbook + stdlib pages).
- **Entry state**: Phase 2 complete (ADR-255's `override message` construct + alias catalog exist, so the docs have a real replacement to teach). This phase teaches the ACL name, it does not delete the capability.
- **Deliverable**:
  1. `chord-language.md` §5.2/§5.3: replace the dotted `define phrase if.action.taking.fixed_in_place` override teaching with `override message taking-fixed-in-place` / `override messages <locale>`; update the fixture; remove the "a dotted key is legal at every site" claims (§2.5, §3.6, §3.7, phrasebook note) — keys are single kebab tokens (ADR-254), overrides use the ACL name.
  2. `chord-grammar.md`: `readDottedKey`/`phrase-key = WORD { "." WORD }` productions replaced by single-`WORD` keys + the `override message`/`override messages` productions.
  3. Website `chord/guide` + cookbook + stdlib `content.mdx` pages: move every `define phrase if.action.*` example to `override message <alias>`; drop dotted-key legality statements. (The `.next/` build output regenerates — source `.mdx` only.)
  4. Spot-check: no author-facing doc presents a dotted platform id or the dotted-override form; the `dotted-override.story` fixture is replaced by an `override message` fixture.
- **Exit state**: no author-facing Chord doc or website page teaches dotted keys or raw `if.action.*` ids; the message-override guidance points authors at the ACL. (Split-big-sweeps: run the website `.mdx` edits as narrow parallel agents, ~2-3 files each.)
- **Status**: PENDING
