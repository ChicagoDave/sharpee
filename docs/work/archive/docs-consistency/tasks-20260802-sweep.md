# Docs Consistency Sweep — Task List (2026-08-02)

> Filed as GitHub issue [#213](https://github.com/ChicagoDave/sharpee/issues/213) (the issue mirrors this doc and carries the tracking checklist).

Five parallel read-only audits of the author/developer-facing docs against the working
tree (platform 4.3.0, Chord language 2.2.0, post-ADR-296 merge `0c22fd35`). Scope:
`docs/reference/`, `docs/guides/`, `docs/getting-started/`, `docs/tutorials/fernhill/`.
Excluded by prior ruling: the book (QA'd complete 2026-06-23) and `genai-api/`
(auto-generated).

**Headline**: ~120 findings. The docs largely froze mid-July; ADR-187 (CLI split),
ADR-247 (ClothingTrait fold), ADR-248 (factory contract), ADR-264/267/269/270
(Chord 2.x grammar), ADR-287 (text blocks), ADR-289 (compile gates), ADR-294
(tester rebuild), ADR-295 (computed exits), and ADR-296 (narrative slots) all moved
the ground under them.

Severity: **WRONG** = actively misleads (command fails, code won't compile, behavior
fictional). **STALE** = outdated version / missing shipped feature. **MINOR** = cosmetic
or low-stakes.

Priority: **P0** = author-blocking today (following the doc produces failure).
**P1** = materially misleading. **P2** = gaps and polish.

---

## P0 — Rewrites (patching is not viable)

### T1. Rewrite both transcript-testing docs for ADR-294
Files: `docs/guides/transcript-testing.md`, `docs/reference/transcript-testing.md`

The guide teaches three full chapters of removed grammar; the reference teaches removed
assertions and never-shipped syntax. Neither mentions the golden tier. An author reading
either writes transcripts that hard-fail to parse.

Guide (`docs/guides/transcript-testing.md`, last touched 2026-06-18):
- L339–424: entire "Control Flow Directives" chapter — `[REQUIRES:]`, `[ENSURES:]`,
  `[IF:]`, `[WHILE:]`, `[DO]/[UNTIL]`, `[RETRY:]`, `[NAVIGATE TO:]` — all removed
  grammar with named parse errors (`transcript-tester/src/parser.ts:41-117`,
  ADR-294 D4). Only `[GOAL:]`/`[END GOAL]` survive, as labels. **WRONG**
- L169–185: `[OK: contains_any …]`, `[OK: matches /…/]` — removed (`parser.ts:97-106`). **WRONG**
- L462–476: "Condition Expressions" table — evaluator layer deleted. **WRONG**
- L529–572: walkthrough example uses `[ENSURES:]` — parse error; real wt-01 uses
  `seed: 42` + GOAL only. **WRONG**
- L704–706: "6 attack commands is usually sufficient" — retired practice; output is
  byte-reproducible at a pinned seed post-ADR-293 (ADR-294 lines 21-26, 200). **WRONG**
- L99–108: header table omits `seed`/`seeds`/`channels`/`events`/`locale`/`forces`
  (`parser.ts:33`); goldens require a pinned seed (`runner.ts:168-173`). **WRONG**
- L32–51: opens with `./sharpee build dungeo` — devkit refuses workspace stories,
  exit 2 (`devkit/src/cli.ts:99-106`); correct is `./repokit build dungeo`. **WRONG**
- L150–157: claims contains is case-sensitive; `runner.ts:873` lowercases both sides. **WRONG**
- L655–666: bundle flag table lacks `--story` (required for `--play` since 2026-07-19,
  `scripts/bundle-entry.js:125-129`) and `--bless`. **WRONG**
- L710–715: "Further Reading" points at ADR-092 as current design — its directives are
  exactly what ADR-294 D4 deleted. **STALE**
- L130–142 (`##` section headers — no such concept), L428–440 (save description
  predates format 3.0.0). **MINOR**

Reference (`docs/reference/transcript-testing.md`):
- L96–107: teaches `[OK: any]` — explicit parse error (ADR-294 D2, `parser.ts:113-116`). **WRONG**
- L180–187: `[OK: matches /…/i]` — removed (`parser.ts:102-106`). **WRONG**
- L124–168: "Fenced Literal Payloads" documents backtick fences that never shipped —
  shipped form is `text` … `end text` at column 0 (ADR-287 D2; `parser.ts:142-143`;
  live example `stories/dungeo/tests/transcripts/adr-287-fenced-literals.transcript:16-19`). **WRONG**
- L191–199: `[FAIL: contains …]` documented as an inverted check; the parser treats
  everything after `FAIL:` as an opaque reason and co-located `[OK:]` lines are never
  enforced (`parser.ts:729-732`, `runner.ts:815-826, 894-900`). **WRONG**
- L29–46: header field list missing the six ADR-294 config keys; unseeded transcripts
  can't record goldens. **WRONG**
- Whole doc: no golden tier, `.golden`, `--bless` (`cli.ts:74,119`;
  `scripts/bundle-entry.js:191,235`; 17 committed goldens). **STALE**
- L14–23/L419: teaches the slow package CLI; blessed path is the bundle. Also `--all`
  never reaches `walkthroughs/`. **STALE**
- L158–159 (error list cites removed forms), L167 (says 183 transcripts; 216 exist). **MINOR/STALE**

### T2. Rewrite the Chord language docs for 2.2.0
Files: `docs/reference/chord-language.md`, `docs/reference/chord-grammar.md`
(+ small fixes to `docs/reference/chord.ebnf`, see T13)

Both docs declare 1.4.0 against a 2.2.0 language (`chord/src/version.ts:139`); they
predate the entire ADR-266/267/269/270 grammar-parity program.

`chord-language.md`:
- L9: "Describes Chord 1.4.0". **STALE**
- L1660–1677 (§5.4): documents removed `define verb` — parser emits
  `parse.removed-define-verb` with a fix-it naming `extend action`
  (`parser.ts:1705-1706`, ADR-270 D7). **WRONG**
- `extend action` / `remove from action` — the documented successor — entirely absent
  (ADR-270 D2/D3/D6; `parser.ts:2394,2420`; `chord.ebnf:449-462`). **WRONG**
- Numeric counters (ADR-264) entirely absent — and they shipped in 1.4.0 itself, so the
  doc is incomplete even against its declared version (`ast.ts:176,1044`;
  `chord.ebnf:236-239`). **WRONG**
- §5.8 `define action` missing four grammar-surface constructs: greedy
  `takes the rest of the line` (ADR-267 D10), typed slots `is an instrument`/`is a topic`
  (D11), per-pattern `means` lines (D12), `directions` block (D12)
  (`parser.ts:2351,2652,2689-2707`; `chord.ebnf:427-445`). **STALE**
- Pattern `or`-alternation and `[optional]` elements absent (ADR-267 D8/D9;
  `ast.ts:686-688`). **STALE**
- Grammar files (`grammar "<name>"` file kind, ADR-269 D8) absent
  (`parser.ts:293,309,477-483`). **STALE**
- §6.3 migration table missing the 2.x removals: `parse.removed-define-verb`,
  `parse.removed-slot-spelling` (`(something)` parens / `:slot` colons,
  `parser.ts:2621,2631`) — the errors a pre-2.0 story hits first. **WRONG**
- The four ADR-289 breaking compile gates undocumented anywhere in `docs/reference/`:
  `analysis.refusal-misplaced`/`refusal-after-mutation` (`analyzer.ts:3203-3215`),
  `analysis.duplicate-action`/`duplicate-trait` (`analyzer.ts:2011,2032`),
  `analysis.exit-non-room` (`analyzer.ts:3014`). **WRONG**
- §5.10 `use` list incomplete: ships `combat`, `hunger`, `npc`, `scoring`,
  `state-machines` (`chord/src/manifests/`); doc lists three. **MINOR**
- §1.2 vs appendix block-closing tables disagree; both miss `define machine`,
  `override message`, alteration dedents, grammar header. **MINOR**

`chord-grammar.md` — claims to mirror the parser "exactly" but is frozen pre-2.x:
- L3–6: declares 1.4.0 and cites the pin test — which pins 2.2.0
  (`chord/tests/language-version.test.ts:31`). **WRONG**
- L544–546: `define-verb` still listed as a live production (removed). **WRONG**
- L608: `pattern-line` still uses removed `:slot` spelling; contradicts its own line 546. **WRONG**
- L598–608: `define-action` missing greedy/typed/means/directions; `pattern-elem`
  lacks `[optional]` and `or`. **WRONG**
- L113–117: `declaration` alternation missing ~11 shipped kinds (counters, machine,
  asset, channel, family-channel, topics, pronouns, override-message(s),
  extend-action, remove-from-action) (`chord.ebnf:160-171`). **WRONG**
- L492, 507–508: `import` described at pre-ADR-251 shape — claim is inverted; the
  "parked" bare form is the only legal one (`parser.ts:1986-1999`). Note
  `chord-language.md` §5.11 documents this correctly — three-way inconsistency. **WRONG**

### T3. Replace or delete the extension development guide
File: `docs/getting-started/developers/extension-development-guide.md`

The whole document describes an extension API that does not exist in the tree — not
spot-fixable. Evidence: `IExtension` lifecycle methods vs the real plain descriptor
(`core/src/extensions/types.ts:8-28`); wrong registry signatures
(`world-model/src/extensions/registry.ts:29,60`); nonexistent symbols
(`IExtensionContext`, `IGrammarRule`, `ISemanticGrammar`, `@sharpee/test-utils`,
`world.setCapability`, `world.registerExtension`); `createEntity` object form vs real
`createEntity(displayName, type)`; peer deps `^0.1.0` vs 4.3.0; dead links. Real
in-tree extensions (`packages/extensions/{scoring,hunger,conversation,basic-combat,testing}`)
use a `registerWorld` + lowered-IR shape the guide never describes. **WRONG (whole doc)**

---

## P0 — Heavy patches (doc survives, many fixes)

### T4. Build docs: fold in the ADR-187 repokit/devkit split
Files: `docs/guides/build-system.md`, `docs/guides/npm-publish.md`,
`docs/guides/project-structure.md`, `docs/guides/creating-a-language-implementation.md`

- `build-system.md` L9–10, 68–96: the whole "monorepo via `./sharpee`" block — every
  command fails (workspace stories exit 2; `bundle`/`clean`/`verify` are unknown
  commands; they live in `tools/repokit/src/commands/`). Missing `--zifmia`. **WRONG**
- `build-system.md` L118: `--play` without `--story` won't start. **WRONG**
- `build-system.md` L133–137: `sharpee clean` → `./repokit clean`. **WRONG**
- `build-system.md` L115–121: missing `--bless` and the cold-start bootstrap. **MINOR**
  (Author-side sections L14–65 verified correct.)
- `npm-publish.md` L83–88: `./sharpee test:npm …` — devkit has no such command; owner
  is repokit (`tools/repokit/src/commands/test-npm.ts`). **WRONG**
- `npm-publish.md` L7–24: "clone tsf alongside" — tsf is a devDependency resolved at
  `node_modules/.bin/tsf` (`tools/repokit/src/repo.ts:148-151`). **WRONG**
- `npm-publish.md`: missing the `./repokit verify` gate (runs `tsf build --npm` +
  `tsf publish --tag beta --dry-run`, `tools/repokit/src/commands/verify.ts:78-82`);
  L38 example version four minors stale. **STALE/MINOR**
- `project-structure.md` L275–301: `./sharpee build dungeo`, bare `--play`, and the
  checklist step 8 — all fail per above. **WRONG**
- `project-structure.md` L33: `packages/zifmia` "Desktop runner (React)" — actually
  `tools/zifmia`, the multi-user server (ADR-177). L45: repokit absent from the layout.
  L18: "43 actions" (61 dirs exist). **STALE/MINOR**
- `creating-a-language-implementation.md` L293–303: "add to PLATFORM_PACKAGES in
  `packages/devkit/src/repo.ts`" — moved to `tools/repokit/src/repo.ts:18`; following
  the guide, the new package is never compiled. **WRONG**
  Also: `formatters/` reference dir doesn't exist (L387, L38–74); `LanguageProvider`
  list omits `getTemplate`/`getLocaleSettings` (ADR-192); `0.9.92-beta` examples;
  "43 stdlib actions" list contains 45 entries. **STALE/MINOR**

### T5. `creating-stories.md`: factory contract + trait constructor errors
File: `docs/guides/creating-stories.md`

- L9–14: `npx @sharpee/sharpee init` — no `bin` in `@sharpee/sharpee`; the CLI ships in
  `@sharpee/devkit` (ADR-187). **WRONG**
- L31–65: story shape contradicts the ADR-248 factory-only contract — loader throws
  without `export function createStory(): Story` (`bootstrap/src/index.ts:108-109`). **WRONG**
- L59, 196: `ContainerTrait({ capacity: 100 })` — capacity is
  `{ maxWeight?, maxVolume?, maxItems? }` (`containerTrait.ts:17-26`); same for
  SupporterTrait. TS error. **WRONG**
- L215–218, 282: `LockableTrait({ requiredKey })` — field is `keyId`/`keyIds`
  (`lockableTrait.ts:15,18`). **WRONG**
- L229–232, 287: `LightSourceTrait({ requiresOn: true })` — no such field
  (`lightSourceTrait.ts:16-47`). **WRONG**
- L262, 270, 285: `DrinkableTrait` doesn't exist — it's `EdibleTrait` with
  `liquid: true` (`edibleTrait.ts:17,48`). **WRONG**
  (Grammar-extension and world-API snippets verified correct.)

### T6. `getting-started/authors/README.md`: Chord-default scaffold + version
- L3: "BETA (v0.9.x)" — platform 4.3.0, Chord 2.2.0. **STALE**
- L40–43: `sharpee init` scaffolds TS — default is a Chord `.story` project since
  2026-07-18 (`devkit/src/standalone/init.ts:4-7,125-127`); no `src/index.ts` appears. **WRONG**
- L54–64: "a story is a TypeScript class" — Chord-default plus the ADR-248 factory
  contract never mentioned. **WRONG**
- L47–52: build description predates ADR-252 D1 (Chord build goes straight to
  `dist/web/<id>/`, no `--browser`/`init-browser`). **STALE**
- L10–13: "write against `@sharpee/sharpee`" — umbrella deliberately doesn't re-export
  the authoring surface (ADR-178); traits come from `@sharpee/world-model`. **MINOR**
- L66–77: CLI table omits `test`, `play`, `compose`, `register`, `list`. **MINOR**

---

## P1 — Reference docs: targeted fixes

### T7. `core-concepts.md`
- L404–411: `new GameEngine({ …, textService, … })` — no such option; pipeline is
  internal (`game-engine.ts:226-233,327`, ADR-174). **WRONG**
- L475–482: fictional `perception.blocked.darkness` pipeline case — no such route or
  message id anywhere; event falls through to the generic handler. **WRONG**
- L573–581: module-level `registerCapabilityBehavior` import — it's a per-world
  `WorldModel` method (`WorldModel.ts:240,753`); `hasCapabilityBehavior` doesn't exist. **WRONG**
- L612: `capabilities/capability-registry.ts` — no such file. **WRONG**
- L620–626: `ScopeLevel` listed as `VISIBLE/REACHABLE/AUDIBLE/CARRIED/WORN/IN_ROOM` —
  actual ladder is `UNAWARE/AWARE/VISIBLE/REACHABLE/CARRIED` (`stdlib/src/scope/types.ts:17-32`). **WRONG**
- L785–792: `ISemanticEvent` shape wrong — missing required `id`, `entities`; no `turn`
  field (`core/src/events/types.ts:8-78`). **WRONG**
- L803–811 + L490: documents three-phase actions; headline claims four-phase but
  `blocked` is never documented (`enhanced-types.ts:545-590`). **WRONG**
- L536–570: capability example omits the 4th `sharedData` arg on all four methods. **MINOR**
- ADR-295 traversal split absent (resolveExit, computed-exit contract,
  `registerExitResolver`); ADR-174 decoration model absent; `-messages.ts` file
  missing from action-structure list. **STALE/MINOR**

### T8. `phrase-algebra-primer.md`
- §6/§11/§12: teaches the pre-amendment ADR-206 nested-params contract — the
  2026-07-02 amendment unified binding to `data.params ?? data`
  (`handlers/domain-message.ts:100`); the documented throw/fall-through recovery chain
  can no longer occur. The primer's most load-bearing debugging section. **WRONG**
- §6 L328–338: pipeline described as "Sort (ADR-094 chain order)" — ADR-296 deleted
  the hoists/depth comparator; transactions/slots/anchor cluster undocumented
  (`stages/sort.ts:7-32,108-123,220-226`). **STALE**
- §2: "union has 15 members" — 16 (`Spliced`, ADR-211; `if-domain/src/phrase.ts:328-344`);
  ADR index stops at 206 (missing 209/211/250). **STALE**
- §6 L351–356: `renderViaPhrase` null contract predates the ADR-250 phrasebook read
  point (`phrase-render.ts:93-107`); `__slots__` reserved param undocumented. **STALE**
- §13 + §12 gotcha 6: presented as live bugs; both fixed in-tree (dungeo melee
  messages) — mark historical. **STALE**
- §6 routing list: `help/about` moved to messageId path 2026-07-02; `platform.*`
  branch missing. **MINOR**
- `registerSlotEntry`/`SlotEntry` surface absent (§4.3). **STALE**
- Systematic `file:line` citation drift (~13 sampled, all off) — the primer's stated
  contract is line accuracy. **MINOR but systematic**

### T9. `stdlib-reference.md` + `stdlib-cookbook.md`
- Reference §5.2 + §11: documents removed `ClothingTrait` incl. a "gotcha" that can no
  longer occur (ADR-247; no `CLOTHING` in `trait-types.ts`). **WRONG**
- Reference §10.1: calls the INVENTORY worn-items gap a pending platform fix — fixed
  (`inventory.ts:63-66,132-138`). **WRONG**
- Reference §2.3 vs grammar: no untooled `take X from Y` removing rule — only the
  tooled form (`parser-en-us/src/grammar.ts:189-191`). Cookbook §1 L67 repeats it. **WRONG**
- Cookbook §6 L669–670/736–738: "no bare `cut X`" — wrong; `cut/slice/chop :target`
  exist (`grammar.ts:199-201,217`). Direct contradiction with reference §2.8 (which is
  right). **WRONG**
- Cookbook §6 L867–948: turning taught as needing define-action dispatch scaffold —
  turning has a wired lifecycle interceptor (`registry.ts:59`; `turning.ts:2-16`);
  reference §2.7 is current. **STALE**
- Reference §3.1/§3.4: exits described as static room data only — ADR-295 shipped;
  missing the D7 interceptor caveat (destination unknown at validate → `entering_room`
  interceptors not consulted for computed traversals, `going.ts:156-165`) and the
  resolver `blocked` refusal path. **STALE**
- Smaller: touch refusals understated (REACHABLE gate, `touching.ts:70-77`); `place`
  maps to putting not inserting (`grammar.ts:80`) — affects gerund-registration advice;
  hide/reveal phrasing tables imply nonexistent combos and omit `reveal myself`;
  switching "parser-gated" claim contradicts reference (validate-gated is correct). **MINOR**
- Bonus (platform file, not docs): `packages/stdlib/CLAUDE.md` "verbs with NO standard
  semantics" table still lists TURN — stale vs `turning.ts`/`registry.ts:59`. **STALE**

### T10. `event-handlers.md`
- L160–176: "handlers can return `ISemanticEvent[]`" — adapter discards returns
  (`WorldEventSystem.ts:24,220-224`); real mechanism `world.chainEvent` never
  mentioned. **WRONG**
- L207–209: implies multiple handlers per type — `registerEventHandler` silently
  replaces (Map keyed by type, `WorldEventSystem.ts:115,156-157`); multiplicity is
  `chainEvent`. **WRONG**
- L48: `if.event.moved` with `fromId`/`toId` — room movement is
  `if.event.actor_moved` with `fromRoom`/`toRoom` (`going-events.ts:9-31`);
  `if.event.moved` is climbing's event. **WRONG**
- L276–280: bare `--play` — needs `--story`. **WRONG**
- ADR-296 D4 partition unmentioned (override requires existing trigger messageId;
  messageless-trigger messages are slot-placed phrase emissions; `ChainEventOptions.slot`). **STALE**
- L250–263: `if.event.rung` doesn't exist. **MINOR**

### T11. `audio-enablement.md`
- L347 + every example `src`: paths are relative to `assets/` not `assets/audio/` —
  every documented `src` 404s (build copies `assets/` contents to output root,
  `build-browser.ts:286-298`; live example `fernhill.story:839`). **WRONG**
- L171–208: handler `return events` pattern — discarded (same defect as T10); no audio
  ever plays from the documented pattern. **WRONG**
- L172: `event.data.destinationId` — field is `toRoom`/`destinationRoom`. **WRONG**
- L11–19: `"workspace:*"` dep only resolves in-monorepo. **MINOR**
  (AudioRegistry API surface itself verified accurate.)

---

## P2 — Small fixes

### T12. Scattered single-fix items
- `entity-queries.md` L245–247: `named(itemLocation)` filters on IdentityTrait.name,
  not id — always `undefined`; use `world.getEntity(id)`. **WRONG**
- `entity-queries.md` L259–262: `withoutTrait('player')` — no `player` trait
  (player-ness is `ActorTrait.isPlayer`); player included in "NPCs". **WRONG**
- `scenes.md` L120–126: `(player as any).currentTurn` — always undefined; scene never
  activates. **WRONG** L34–41: SceneOptions table omits `onBegin`/`onEnd` (ADR-186). **MINOR**
- `character-model.md` L243: ADR-142 conversation "not yet implemented" — it shipped
  (`packages/character/src/conversation/`). **WRONG** Package-surface section missing
  goals/influence/propagation/conversation subsystems + five builder methods. **STALE**
- `tutorials/fernhill/state.md` L50–56: `prune :target` colon-slot spelling — removed
  (`parse.removed-slot-spelling`); shipping story uses `prune the target`
  (`fernhill.story:565-566`). **WRONG** `index.md` version/header abridgements. **MINOR**
- `guides/README.md`: index omits `npm-publish.md`; stray
  `audio-enablement-ghost.html` artifact. **MINOR**

### T13. `chord.ebnf` header + import production
- L11–14: coverage header stale ("as of 2026-07-24") vs its own current body
  (ADR-264/267/269/270 all present in the body). **STALE**
- L212–218: `import-phrasebook = "import" "phrasebook" STRING` — pre-ADR-251; the
  generalized `import "<file>"` has no story-file production despite being the only
  form the parser accepts (contradicts its own L60). **WRONG**
- No language-version marker in the file (the pin test carries it). **MINOR**

---

## Verified clean (recorded for coverage)

- `docs/guides/regions.md` — fully consistent.
- `docs/guides/entity-queries.md` — everything except the two T12 items, including the
  concrete-class-only augmentation note.
- `tutorials/fernhill/` world/things/people/time/endings/browser chapters — verified
  against `fernhill.story` in detail (incl. the score-sum-to-50 claim); only state.md's
  colon-slot snippet and minor index drift.
- `character-model.md` — builder API and key-files table all verified except T12 items.
- `stdlib-reference.md` — large verified-consistent set: 38 wired actions, plugin
  priorities, throw limit, Chord surface spot-checks, capability-dispatch (ADR-090)
  guidance in both stdlib docs.
- `build-system.md` author-side sections; `creating-a-language-implementation.md`
  ParserLanguageProvider/grammar/engine sections; fernhill working-loop commands.
- `phrase-algebra-primer.md` §9 decoration layer — consistent with ADR-174.

## Suggested sequencing

1. **T1, T2** — the two rewrites with the highest author damage (transcript grammar,
   Chord language). Both need rewrites, not patches.
2. **T3** — decide: rewrite the extension guide against the real
   `packages/extensions/*` shape, or delete it until the extension surface is settled.
3. **T4–T6** — the ADR-187/248 command/contract fixes (mechanical, high value).
4. **T7–T11** — reference-doc precision passes.
5. **T12–T13** — one-line to one-section fixes; could ride along with any batch.

Cross-cutting rule worth adopting during fixes: docs that state a version should cite
the version *source* (`CHORD_LANGUAGE_VERSION`, package.json) so drift is greppable.
