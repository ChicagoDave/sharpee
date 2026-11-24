# Session Plan: Chord Writer shows the examinable lens's findings and highlights the source where a noun has no text (GH #835, its last bullet)

**Created**: 2026-11-22 (session c68c7b)
**Plan Status**: ABANDONED (David, 2026-11-23: Phases 5 and 6 abandoned; superseded by world-index-noun-spans)
**Superseded by**: docs/work/world-index-noun-spans/plan-20261123-world-index-noun-spans.md
**Overall scope**: Move the examinable lens from a repo-only script into the author CLI as a command Chord Writer can spawn. Give each finding its source: the key of the passage that named it, and the ids of its owner and its target. Carry the lens's JSON across the language boundary as a contract. Then show the findings in Chord Writer's Testing tab, the web pane both heads host (`tools/ide/web/testing-surface/`), highlighting the phrase in the author's prose that names a thing that has no text. Both heads, SharpeeIDE (macOS) and PaneHost (Avalonia), run the lens and answer the pane's source requests (D-1(c), ruled 2026-11-23). Other verbs and GH #836 (the matcher's number forms) are out of scope.
**Bounded contexts touched**: N/A (testing infrastructure, the author CLI and the macOS IDE; no story-domain behavior changes)
**Key domain language**: N/A. Working vocabulary: lens, finding, passage (a world-index prose site), passage key, no-text finding (the lens's `resolved-default` class), soundness line, World tab.

Goal (David, 2026-11-22): weave the examinable lens's results into Chord Writer and highlight the source where nouns have no text. This is GH #835's remaining bullet ("findings in the IDE"), which the description-noun-lens plan (`docs/work/archive/description-noun-lens/plan-20261122-description-noun-lens.md`) left for a later plan. **Phases 2 and 3 change `packages/` (branch-tester, devkit, ide-protocol). Each needs David's explicit go before it starts** (CLAUDE.md: platform changes are discussed first). Approving this plan does not give that go.

## What the code says that the brief did not

Read 2026-11-22 while planning. Each item shapes a phase below.

1. **GAP 1 is mostly closed already: the passage keys are in hand at runtime.** `visibleProse` (`tools/explorer-probe/lens-examinable.js:280`) reads `identity.descriptionId` and `roomTrait.initialDescriptionId`, and the loader sets those from the IR's own keys (`packages/story-loader/src/build/entity.ts:87`, `descriptionId = irEntity.descriptionKey`; `:101` for first-visit text). These are the same strings world-index publishes as `ProseSite.key` (`packages/world-index/src/prose.ts:40`, "the attribution of record"). So no new derivation is needed: a row records `{ key, owner IR id }` where it now records a display name. A passage that comes from a trait-state literal has no key and stays attributed by name only.
2. **The target is named by display name, but its id is on the event.** `classify` (`tools/explorer-probe/lens-examinable.js:192`) keeps `targetName`. `if.event.examined` also carries `targetId` (`packages/stdlib/src/actions/standard/examining/examining-events.ts:24`), and a runtime entity carries its IR id (`packages/branch-tester/src/claims/claims-game.ts:141`, `irIdOf`). With the IR id, the IDE can look up the declaration (world-index's `declarations[id].span`), which is where "Write the description" lands.
3. **The lens's no-text class is the runtime twin of the Incomplete view's Undescribed class.** `deriveUndescribed` (`packages/world-index/src/undescribed.ts:42`) lists every entity whose `descriptionKey` and `initialDescriptionKey` are both absent, whether or not any prose names it. Its card points at the declaration only (`tools/ide/SharpeeIDE/World/WorldIncompleteView.swift:344`, `passage: thing?.span`). The lens adds two facts: where the prose names the thing, and that the walk reached it. This overlap is what makes D-1 a real choice.
4. **No packaged walk has a room hook.** The lens walks with the spike's `explore.js` (`tools/explorer-probe/lens-examinable.js:163`) and loads devkit and world-index from their `dist/` paths (`:165`, `:169`), which only works inside a checkout. The packaged walk, `walkClaims` (`packages/branch-tester/src/claims/claims-walk.ts:119`), walks under a necessary set and calls nothing when a room is first seen. ADR-294 D23 says a lens that leaves `tools/explorer-probe/` borrows that walk. So before the lens can earn a package, someone has to decide which walk it uses (D-3).
5. **The IDE already has the pattern this needs.** A successful build runs `sharpee world-index` in the background (`tools/ide/SharpeeIDE/Build/BuildController.swift:107`) through `WorldIndexRunner` (`tools/ide/SharpeeIDE/World/WorldIndexRunner.swift`). That runner resolves the CLI through the three tiers, drains its pipes, supersedes an older run, and treats failure as a result. A lens runner has the same shape. The difference is the walk's budget, which defaults to 120 seconds.
6. **The world-index document is hand-mirrored; newer contracts are generated.** `tools/ide/SharpeeIDE/World/WorldIndexDocument.swift` copies `document.ts` by hand and claims the language-boundary exemption. ADR-352 generates the `@sharpee/ide-protocol` contracts into Swift and C# instead (`tools/repokit/src/commands/protocol-spec.ts:70`). `packages/ide-protocol/src/claim-output.ts` is the precedent for "what a sharpee command prints as JSON".
7. **The editor already has persistent marks, and ADR-324 constrains new ones.** `setDiagnostics` (`tools/ide/SharpeeIDE/Editor/EditorViewController.swift:439`) underlines compose diagnostics. ADR-324 (DRAFT) says the IDE has exactly two kinds of error and each surface shows one kind (D1), and that an underline must be able to name itself (D3, D7). A lens finding is not an error, so any in-editor mark for it must be a different mark from those underlines, and it must name itself (D-2).
8. **Scullery is the story for "no text", not orchard.** Orchard's pin has no `resolved-default` row (40 not in scope, 6 described, 6 number form). Scullery's OB-54 is the whetstone: named in the room's prose at `test-stories/scullery/scullery.story:19`, declared at `:35` with no description.
9. **Baseline, run once 2026-11-22 (this session):** `node --test tools/explorer-probe/tests/*.test.js` gave 57 tests, 56 pass, 1 fail. The failure is `lens-declared-state`'s secret-letter corpus pin (actual 91, expected 41), the known #805 failure. The whole suite ran in 1.3 s, so the lens's real-path pins on the test stories are cheap.
10. **The Chord pin is current today.** `ChordVersionCheck.supportedLanguageVersion` (`tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift:99`) and `CHORD_LANGUAGE_VERSION` (`packages/chord/src/version.ts:406`) are both 4.1.0. Phases 4 and 5 check this again before their first IDE test run.
11. **GH #837 sits in the same decoder.** It asks Chord Writer to decode the world-index failure cause `no-noun-extractor` (`WorldIndexDocument.swift:755` does not know it yet). A refused lens run is that same cause, so Phase 4 does both.

## Decisions for David (ruled at plan approval)

Approving the plan as written takes each lean below. Any decision can be ruled differently, and each one says which phases change if it is. D-1 is the GAP 3 ruling the brief asked to raise, not decide.

- **D-1. Where the findings appear in Chord Writer.**
  - (a) A section of their own in the World tab, beside Map, Reach and Incomplete. It has its own soundness line and links across to the Undescribed and No-object cards that name the same thing.
  - (b) Folded into the Incomplete view, where lens verdicts annotate the static cards as engine confirmations, and the lens-only classes (number form, a target the static pass missed) join as new card kinds.
  - (c) The Testing tab, as #835's text says ("where findings surface in the Testing tab"). That surface is a TypeScript pane that imports `ide-protocol` directly (ADR-352 Consequences).
  - **Lean (a).** Incomplete's contract is a static, whole-story candidate list that is never an error (ADR-321 D6). The lens's contract is real findings over the rooms it reached, with its budget stated (ADR-322 D7). Putting the lens's soundness line on a list the lens does not fully cover blurs both. ADR-294 D23's "one question per lens" points the same way.
  - Phase 5 is written for (a). Under (b), Phase 5 changes `WorldIncompleteView.swift` instead of adding a view. Under (c), Phase 3 drops the Swift generation and Phases 4 and 5 move to `tools/ide/web/testing-surface/`.
- **D-2. What "highlight the source" means.**
  - (a) Cards whose activation selects the phrase inside its passage. This is the Incomplete view's existing behavior, through `WorldPhraseLocator`. Each card also offers "Write the description" at the target's declaration.
  - (b) Everything in (a), plus persistent in-editor marks on each phrase that names a thing with no text. The marks are distinct from compose underlines and name themselves on hover (item 7).
  - The goal's wording ("highlight the source where nouns have no text") reads as (b). (a) is smaller. Phase 5 carries (b) as a separable deliverable.
- **D-3. How the lens earns a package.**
  - The walk:
    - (a) branch-tester's walk gains a room-first-seen observer and a mode with no necessary set, as ADR-294 D23's note says.
    - (b) The spike's `explore.js` walk moves into a package with the lens. That needs an ADR-294 amendment and leaves two walks.
  - The home: the lens's logic goes in `packages/branch-tester` beside the walk (the precedent is ADR-365 D10's claims runner), and it takes its extractor lookup from devkit, as world-index does (ADR-407 D8). devkit adds the command `sharpee lens examinable`.
  - The spike: once the packaged lens matches the spike's pins, `tools/explorer-probe/lens-examinable.js` and its suite are either (i) removed, with the deletion list posted and David confirming it before anything goes, or (ii) kept as a thin wrapper.
  - **Lean (a), branch-tester, (i).**
- **D-4. The wire.**
  - The lens's JSON document becomes a contract in `@sharpee/ide-protocol` and is generated into Swift by `repokit protocol` (ADR-352). The other option is a hand mirror like `WorldIndexDocument.swift`.
  - Sources cross the wire as passage keys and IR ids. Spans are resolved by the consumer, the split ADR-333 D2 set for the prose wire. The IDE gets them from the world-index document of the same build (`prose[].key` to `span`, `declarations[id].span`). The other option is for the lens to resolve spans itself and ship them.
  - **Lean: generated, keys and ids.**
- **D-5. Does ADR-322 D12 / AC-8 gate this, and when does the lens run?** AC-8: "No IDE integration surface is specified or built before measured sweep numbers exist" for real stories, a state-bit-scaled synthesized story and a declined generative-space story.
  - (a) D12 governs the sweep (L1), not a budgeted lens that never claims exhaustiveness. Phase 1 adds a dated note to ADR-322 saying so.
  - (b) D12 applies. Phase 1 also measures the synthesized and generative cases, and no IDE commit lands before those numbers (AC-8 is checkable by date).
  - **Lean (a).** ADR-294 D23 retired the enumeration in favor of budgeted lenses, and ADR-365's claims runner reached the Testing tab without those measurements.
  - Either way, the trigger is ruled at the end of Phase 1 from its timings: run after every successful build in the background, as world-index does, or run on demand.
- **D-6. Record D-1 to D-5 as ADR-408?** Recommended yes. It adds a second subprocess contract to the IDE (ADR-321 Consequences), a new IDE surface, and the first lens to "earn a package" (ADR-294 D23). If David rules no ADR, the rulings stay in this plan and Phase 1 becomes measurement only (Small).

## Rulings (David, 2026-11-23, session c68c7b)

David approved the plan with option (b) from the plan review:
- **D-1 is ruled (c): the Testing tab.** The findings go in the web pane both heads host, so they reach the Avalonia head as well as macOS. The review found that the plan's lean, (a), would have put them in the macOS head only, while ADR-351 D2 carries Chord Writer forward on Avalonia.
- **D-2 to D-6 take their leans.** D-2 lean (a) with (b) separable, D-3 (a)/branch-tester/(i), D-4 generated with keys and ids, D-5 (a), D-6 yes (ADR-408). Because of D-1(c), D-4's generation is needed only for what a host decodes. The pane imports `@sharpee/ide-protocol` directly (ADR-352 Consequences).
- **The plan review's fixes are folded in:**
  - ADR-187's repokit-first rule. ADR-408 records the devkit-only exception (Phase 1), as world-index and claim already ship.
  - A toolchain too old to have `lens`. Phase 4 adds it as a named failure.
  - The walk with no necessary set. Phase 2 re-times one larger test story on the packaged walk.
  - Phase 1's Demonstration now checks that ADR-408 is ACCEPTED.
- **What D-1(c) opens, to rule in Phase 1 (D-7):**
  - (i) How the lens reaches the pane. Either the hosts spawn `sharpee lens examinable --json` and post the document to the page, or the lens rides `sharpee test`'s run-event wire as a tier that never changes its exit (ADR-356 D7: lenses never gate).
  - (ii) What "highlight" means through the pane. Today `{openSource:{file,line}}` carries a line only (`tools/ide/web/testing-surface/src/main.ts:498`; SharpeeIDE `TestingSurfaceViewController.swift:651`; PaneHost `Shell/TestingSurfacePosts.cs:51`). Selecting the phrase means the request carries a column and a length, in both heads.
  - (iii) Whether "Write the description" is a host edit through a new post, or the card opens the declaration and the author types.

## References consulted
- `docs/architecture/adrs/INDEX.md`: the ADR index, rebuilt for this plan by `adr-index.sh`. 411 records: 29 OPEN, 150 IMPLEMENTED, 52 ABANDONED, 7 IGNORE, 173 unclassified. The index records no Kind for any ADR, so it has no `product` rows. 9 opened: 1 IMPLEMENTED (ADR-407) and 8 unclassified (ADR-277, ADR-294, ADR-321, ADR-322, ADR-324, ADR-333, ADR-352, ADR-395). **Declared deviation:** the rule says to open every OPEN and unclassified record (202 here), and that was not done in full. The 29 OPEN records were judged by their Summary (save, time, clients, dialogue, liquids, doors, perception, room groups, and ADR-154's superseded IDE vision); none bears on a lens, the World tab or a CLI contract. The unclassified records left unopened were ruled out by title, as Chord-language, engine, parser and story decisions this plan does not touch. ABANDONED and IGNORE records were not opened.
- `docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md`: D1, a lens runs in the CLI, and a host may present its findings and refine its own views, but a lens finding never depends on a host refinement. D2 and D6: the lens refuses a language that has no extractor, and the refusal is a failure document (Amendment 3). D7: the engine decides each class. Its Scope names `tools/explorer-probe` "and every later lens", and devkit's world-index command.
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md`: D23. Lenses are a family, one question each. Real path only. The soundness contract: a report names its stop reason and rooms reached against rooms declared. Lenses are built under `tools/` "until one earns a package", and a lens that moves out of the tools directory borrows branch-tester's claims walk (D-3). The amendment authorizes no platform work.
- `docs/architecture/adrs/adr-321-world-index.md`: D6, Incomplete is a candidate list and never an error list. Amendment 3: D23, the card offers and the window applies, and nothing invents prose. D26, Undescribed is derived from the IR. Consequences: the IDE's subprocess contracts are versioned schemas, and failure states must render (AC-9). Where a lens result could live (D-1).
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md`: D1, L2 attribution is a layer, and a finding needs a source span. D7, findings are real, absence is not proof, and the budget is in every report. D8, consume ADR-321's derivations and never rebuild them (passage keys, not a new prose walk). D9, severity uses the compiler's closed set. D12 and AC-8 gate the IDE surface on measurement (D-5).
- `docs/architecture/adrs/adr-333-prose-provenance-and-play-to-write.md`: D1a, descriptions carry the entity's registered key (item 1). D2, the id is the whole stamp and spans belong to the consumer (D-4).
- `docs/architecture/adrs/adr-352-protocol-type-generation.md`: `repokit protocol` generates Swift and C# from `ide-protocol`; `--check` is the freshness gate in `repokit verify`. D4: gates and conveniences stay hand-written beside the generated file. D5: the generator refuses constructs it cannot model, so the lens document's shape must stay inside its model.
- `docs/architecture/adrs/adr-324-ide-error-surfaces.md` (DRAFT): D1, two error kinds, one surface each. D3 and D7, an underline names itself. These bound D-2(b)'s marks.
- `docs/architecture/adrs/adr-277-ide-integrated-testing.md` (status and outline only): `sharpee test --json` writes a contract in `ide-protocol` that the IDE reads. This is the precedent for D-4 and for the Testing tab option in D-1(c).
- `docs/architecture/adrs/adr-395-exploring-tests-run-on-test-stories.md`: D1 and D7, exploring tests run on `test-stories/`, and no Demonstration cites a real story as its floor. The 2026-11-12 note allows on-demand measurement of real stories outside any gate (Phase 1's timings).
- `docs/context/project-profile.md` (2026-11-17, fresh): two IDE heads, of which only SharpeeIDE is in scope. `node:test` for explorer-probe, XCTest for SharpeeIDETests. Protocol types are generated (ADR-352). Real stories other than Dungeo do not gate.
- `docs/context/session-20261122-2314-description-noun-lens.md`: open items #835 (this plan), #837 (folded into Phase 4), #836 and #669 (out of scope; #669 is why this plan is archived by hand).
- `docs/proposals/`: scanned. No templated proposal has an ACCEPTED, unplanned item that bears on this goal.
- Added by the plan review (2026-11-23): `adr-187-devkit-author-only-split-inrepo-build.md` (repokit-first staging, :183-188), `adr-365-claims-under-a-necessary-set.md` (D2, D10, D12), `adr-185-ide-standalone-authoring-tool.md` (the project's own CLI), `adr-351-chord-writer-host-shape.md` (DRAFT; D2, Avalonia carried forward), and GH #653 and #657.
- Product ADRs not consulted (no Scope intersection): none (the index records no product ADRs).

## Phases

### Phase 1: Rule the lens's place in Chord Writer, measure it, and record it as ADR-408
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The decision record and the timings that settle D-5's trigger. No code changes.
- **Entry state**: The plan is approved with D-1 to D-6 ruled, or with the rulings left to this phase's interview. The explorer-probe baseline is 56 of 57, with #805's failure (item 9).
- **Deliverable**: A timings table. It runs the spike lens with `--json` at default budgets on every test story (lodge, bazaar, ferry, orchard, quay, scullery). It also runs, on demand and outside any gate, on the repository's Chord stories (ADR-395's 2026-11-12 note). For each run it records walkMs, stop reason, rooms reached against declared, and phrases executed. Then ADR-408, recording D-1 to D-5 as ruled, D-7 (i)–(iii), the trigger the timings support, and the devkit-only exception to ADR-187's repokit-first staging. It goes through adr-review, the open-questions interview if any questions remain, and David's acceptance. Then a dated note on ADR-187 pointing at ADR-408, a dated note on ADR-322 D12 (D-5 is (a)), and a rebuilt index.
- **Files**: `docs/work/lens-findings-in-ide/timings.md` (new), `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md` (new), `docs/architecture/adrs/INDEX.md`, `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md`, `docs/architecture/adrs/adr-187-devkit-author-only-split-inrepo-build.md`
- **Exit state**: `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md` is ACCEPTED. The trigger and D-7 are ruled. The walk, home and wire for Phases 2 and 3 are fixed.
- **Demonstration**: `bash ~/.claude/scripts/adr-index.sh` rebuilds the index, and `grep -n adr-408 docs/architecture/adrs/INDEX.md` prints one row. `grep -n "^\*\*Status" docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md` prints ACCEPTED. `docs/work/lens-findings-in-ide/timings.md` holds one row per test story with walkMs and stop reason filled in.
- **Demonstrated**: 2026-11-23, session c68c7b. [reported by session, unverified]
  - `bash ~/.claude/scripts/adr-index.sh` rebuilt the index, and `grep -n adr-408 docs/architecture/adrs/INDEX.md` printed one row (line 420: OPEN, technical, with its Scope).
  - `grep -n "^\*\*Status" …adr-408…` printed `**Status**: **ACCEPTED** (David, 2026-11-23…`.
  - `timings.md` holds six test-story rows and seven real-story rows, each with walkMs and stop reason.
  - The trigger and D-7 are ruled as ADR-408 D8–D10 (a `sharpee test` tier at the document's seed, a ranged source request, and a description offer that opens the declaration).
  - The ADR-187 and ADR-322 D12 notes are written.
- **Status**: DONE

### Phase 2: The examinable lens earns a package: `sharpee lens examinable`
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: branch-tester's walk and the lens module, plus devkit's command. Written for D-3's lean; if D-3 is ruled otherwise, this phase follows ADR-408.
- **Entry state**: Phase 1's exit holds, and David has given the go for the `packages/branch-tester` and `packages/devkit` changes.
- **Deliverable**:
  - The walk: branch-tester's breadth-first walk calls an observer on each room's first sighting and runs without a necessary set. It reuses claims-walk's engine fork (save and restore), identity and candidate machinery, and stops when every room has been seen or a budget runs out.
  - The lens module under `packages/branch-tester/src/lens/` (new). It ports classify, the per-room examine, number forms, folding and the language guard from the spike, typed throughout (no `unknown`, no `any`), and takes the extractor lookup from its caller.
  - devkit's command, `packages/devkit/src/commands/lens.ts` (new), registered in `packages/devkit/src/cli.ts`. It takes `--seed`, `--max-states`, `--max-seconds`, `--max-depth`, `--json` and `--all`, and reads the IR the build wrote, as `sharpee world-index` does. A refusal is a one-line failure document with exit 1.
  - A parity census: on orchard (seed 42, 600 states) and scullery, the packaged lens's folded findings and counts equal the spike's pins (OB-35, OB-54 to OB-60). Any difference goes to David before a pin moves.
  - A re-timing on the packaged walk. Orchard and scullery reach only 5 and 2 states, so the largest test story in Phase 1's timings is run again on the packaged walk. Its states, walkMs and rooms reached go beside the spike's row in `timings.md`. With no necessary set, the packaged walk counts states as different on the whole snapshot, less `IDENTITY_IGNORES` (ADR-365 D2, D12). A growth that moves the Phase 1 trigger goes to David. From the same re-timing, Phase 2 sets the `sharpee test` tier's fixed budget (ADR-408 D8) and records the figure in `timings.md` and the tier's code, with David's agreement.
  - Tests derived from Behavior Statements, including real-path runs of the command on orchard and scullery (rule 13a: the real engine, the real walk, the real extractor).
  - The spike's disposition per D-3, with any deletion list posted and confirmed first.
  - **As built (2026-11-23, ADR-408 Amendment 1):**
    - The walk refactor landed. `walk/story-walk.ts` is shared, and the claims runner is its client, with all claims suites unchanged and green.
    - The lens itself reaches rooms by route (`lens/room-routes.ts`), not by the walk. The walk's room hook and null set stay, unused by any client (David's ruling "b").
    - devkit's command takes `--seed`, `--max-seconds`, `--all` and `--json`.
    - The tier's budget is 30 s.
    - The spike lens and its suite are deleted. Its fixture moved to `packages/branch-tester/tests/fixtures/lens-fixture/`, and its fixture, classifier and ADR-407 AC-6 cases moved to branch-tester's tests.
- **Files**: `packages/branch-tester/src/claims/`, `packages/branch-tester/src/lens/` (new), `packages/branch-tester/src/index.ts`, `packages/branch-tester/tests/`, `packages/devkit/src/commands/lens.ts` (new), `packages/devkit/src/cli.ts`, `packages/devkit/tests/`, `tools/explorer-probe/`
- **Exit state**: The packaged command reproduces the spike's orchard and scullery pins. The branch-tester and devkit suites pass. The explorer-probe suite is at baseline (56 of 57), or the lens's half of it has been retired under D-3(i).
- **Demonstration**: `node packages/devkit/dist/cli.js lens examinable test-stories/orchard/orchard.story --seed 42` prints "rooms reached     5 of 5 declared" and "phrases examined  92". (The walk's `--max-states` flag went with the walk, ADR-408 Amendment 1.) The branch-tester and devkit suites (pnpm --filter '@sharpee/branch-tester' test, then the same for '@sharpee/devkit') report no failures.
- **Demonstrated**: 2026-11-23, session c68c7b. [reported by session, unverified]
  - `node packages/devkit/dist/cli.js lens examinable test-stories/orchard/orchard.story --seed 42` printed "rooms reached     5 of 5 declared  (0.1s of 120s, 8 moves typed)" and "phrases examined  92".
  - `pnpm --filter '@sharpee/branch-tester' test`: 43 files, 515 passed. The orchard, scullery and fixture pins pass by route.
  - `pnpm --filter '@sharpee/devkit' test`: 246 passed, 1 skipped (skipped before this work).
  - `node --test tools/explorer-probe/tests/lens-declared-state.test.js`: 18 tests, 17 pass, 1 fail. The failure is the #805 Secret Letter pin (91 against 41), as at baseline. The spike lens's half of the suite is retired under D-3(i).
- **Status**: DONE

### Phase 3: A finding names its source: passage keys, owner and target ids, and the lens contract
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The lens report's attribution (GAP 1) and its wire contract (D-4).
- **Entry state**: Phase 2's exit holds, and David has given the go for the `packages/ide-protocol` change.
- **Deliverable**:
  - Each prose source in a row becomes `{ key, kind, ownerId, ownerName }`:
    - key is the passage key from the description or first-visit id (item 1), or null for a trait-state literal;
    - ownerId is the owner's IR id;
    - kind is description, first-visit or state.
  - Each row carries `targetId`, the IR id read from the examined event's target (item 2). Folding unions sources by key. The report format is bumped to 3 and documented.
  - The document type, as report and refusal, in `packages/ide-protocol/src/lens-output.ts` (new), which the lens writes typed. It is shaped to fit the generator's model: ADR-352 D5 refuses a union of object types, so the document is one shape with an `ok` flag and optional report and refusal parts, the way world-index's response is. The testing surface imports it directly. Under ADR-408 D8 no host decodes it (both pass `sharpee test` lines through undecoded), so the lens types get no generator roots and neither generated file changes.
  - The console form prints file and line for each source, resolved from the IR's phrase spans by devkit as a consumer (ADR-333 D2).
  - A real-path test on scullery: the whetstone's no-text finding carries the room's description key and the whetstone's IR id, and that key equals a `prose[].key` in `sharpee world-index`'s document for the same IR. This test is the join the IDE depends on.
- **Files**: `packages/branch-tester/src/lens/`, `packages/devkit/src/commands/lens.ts`, `packages/ide-protocol/src/lens-output.ts` (new), `packages/ide-protocol/src/index.ts`, `packages/branch-tester/tests/`, `packages/devkit/tests/`
  - **As built (2026-11-23, session 48a616):**
    - `packages/ide-protocol/src/lens-output.ts` holds `LensOutput` = `{ lens, format: 3, story, ok, report?, refusal? }`, where `refusal` is `{ message }`. `lens`, `format` and `story` moved from the report onto the document. `counts` is a `Record<string, number>` and `ended` a boolean, the generator's model (ADR-352 D5). There are no generator roots and no guard, because nothing decodes the document yet.
    - branch-tester writes it typed and imports the row, finding and room types from ide-protocol. They are no longer exported from branch-tester.
    - Two consequences of the keys, folded in:
      - Findings fold by (phrase, kind, detail, targetId). One phrase answered by two different things stays two findings, each naming its own declaration.
      - Every room id is now an IR id. Format 2 gave reached rooms the runtime id and unreached rooms the IR id.
    - The console form's locator lives in `packages/devkit/src/commands/lens-sources.ts` (`resolveSourceSpan`, which Phase 4's tier reuses). A source with no key resolves to its owner's declaration.
    - Orchard and scullery findings and counts are unchanged (44 and 20).
- **Exit state**: On scullery, `--json` yields findings whose keys join world-index's prose list and whose target ids join its declarations. The generated protocol targets are unchanged and fresh.
- **Demonstration**: `./repokit protocol --check` exits 0. The devkit lens tests (pnpm --filter '@sharpee/devkit' test lens) pass, including the scullery join test asserting the whetstone's key and id.
- **Demonstrated**: 2026-11-23, session 48a616. [verified: work-summary-writer re-run 2026-11-23 12:59–13:00 CST, after the last edit at 12:58 — `./repokit protocol --check` "generated protocol types match the TypeScript wire contract"; `pnpm --filter '@sharpee/devkit' test` 37 files 252 passed 1 skipped, `src/commands/lens.test.ts` 7 passed; `pnpm --filter '@sharpee/branch-tester' test` 43 files 525 passed]
  - `./repokit protocol --check` printed "generated protocol types match the TypeScript wire contract" and exited 0.
  - `pnpm --filter '@sharpee/devkit' test lens`: 1 file, 7 passed. Among them is "JOIN — the whetstone's passage key is a prose key in `sharpee world-index`'s document for the same IR, and its target id a declaration at line 35 (ADR-408 AC-2)", which asserts key `scullery.description`, owner `scullery` and target `whetstone`.
  - `pnpm --filter '@sharpee/branch-tester' test`: 43 files, 525 passed.
  - `pnpm --filter '@sharpee/branch-tester' typecheck` reports 5 test-file errors that predate this phase, in `claim-predicates`, `claims-walk`, `derived-one-boot` and `room-routes`, plus the `assembleGame` cast at `examinable-lens-real-path.test.ts:47`. No line this phase changed is among them.
- **Status**: DONE

### Phase 4: The lens rides `sharpee test` as a tier, and the Testing tab folds it
- **Tier**: Medium
- **Budget**: 250
- **Tier note**: Rewritten 2026-11-23 for ADR-408 D8. The lens is a tier of `sharpee test --json`, so neither head gains a runner.
- **Domain focus**: The tier and its two run-event variants (ADR-408 D8), and the page's fold of them.
- **Entry state**: Phase 3's exit holds, and David has given the go for the `packages/devkit` and `packages/ide-protocol` changes this phase makes. The Chord pin equals the toolchain's (item 10); if it is behind, it is bumped with its lexer corpus first (standing permission).
- **Deliverable**:
  - `packages/ide-protocol/src/run-events.ts`: the `lens-finding` and `lens-summary` variants and their guards. They are additive, so `RUN_EVENT_SCHEMA_VERSION` stays 2.
  - `packages/devkit/src/commands/test-lens.ts` (new), called from `test-tree-document.ts` after the claims tier:
    - It runs at the document's seed on the tier's fixed budget, the figure Phase 2 measured, and takes the IR `compileChordStory` made.
    - It resolves each source key and the target's declaration to spans (ADR-333 D2).
    - A refused language is a `lens-summary` carrying the refusal, never an exit code.
  - `tools/ide/web/testing-surface/src/run.ts` folds the two variants. A new `tools/ide/web/testing-surface/src/lens.ts` holds the state the section renders from. A run that ends with no `lens-summary` is named as a toolchain without the lens (ADR-408 AC-4).
  - GH #837, in the macOS World tab, because it is world-index's decode, not the lens's: `WorldFailureCause` decodes `no-noun-extractor`, and the World tab renders its message.
  - Tests:
    - devkit: the tier's events on scullery through the real command; the no-extractor copy (AC-4); and both runs exiting 0 (AC-5).
    - testing-surface vitest: the fold and the state, plus a committed run-event fixture with no lens events (AC-4), plus a real-path test that spawns the real CLI on scullery, as `claims-real-path.test.ts` does through `tests/spawn-cli.ts`.
    - SharpeeIDETests: `WorldIndexTests.swift` for #837.
  - **As built (2026-11-23, session 48a616):**
    - **`transcript-tester`.** `RunEventStream` gained `lensFinding` and `lensSummary`, plus the `StreamableLensFinding`/`StreamableLensSummary` types and their barrel exports. That stream is the only writer of run events, so the tier cannot emit without them. David approved the package "yes, add the two methods".
    - **`stoppedBy`.** The lens report's `reach` gained `stoppedBy: 'every-route' | 'budget'` (`lens-output.ts`, set in `examinable-lens.ts`). It is the summary's "stop reason" (ADR-408 D8).
    - **`refusal`.** A `lens-summary` carries `refusal` in three cases, each with no measurements and no finding: the language has no extractor; the lens threw; the tree run could not find or compile the `.story` file. In none of them does the page call the toolchain lens-less.
    - **The page's absence logic.** It reads the `run-end` exit code. Exit 0 or 1 with no summary names a toolchain without the lens. Exit 2 or 3 names a run that stopped before its tiers.
    - **Scullery's test tree.** Scullery had no test tree, so it gained a one-line one (`test-stories/scullery/scullery.tests/`, OB-61 in its test set).
    - **The AC-4 fixture.** It was recorded from that tree by the devkit before the tier existed: `tools/ide/web/testing-surface/tests/fixtures/scullery-run-without-lens.ndjson`.
    - **Report heading.** The lens report's heading on the console is `Examinable lens:`. No ADR is cited in the author's text, per `record-citations.test.ts`.
    - **Updated assertions.** Three existing assertions about what the stream and report end with now admit the lens tier after the claims (David's "yes"): `devkit tests/test-claims.test.ts` at :127 and :263, and `testing-surface tests/derived-real-path.test.ts:79`.
- **Files**: `packages/ide-protocol/src/run-events.ts`, `packages/devkit/src/commands/test-lens.ts` (new), `packages/devkit/src/commands/test-tree-document.ts`, `packages/devkit/tests/`, `tools/ide/web/testing-surface/src/run.ts`, `tools/ide/web/testing-surface/src/lens.ts` (new), `tools/ide/web/testing-surface/tests/lens.test.ts` (new), `tools/ide/web/testing-surface/tests/lens-real-path.test.ts` (new), `tools/ide/SharpeeIDE/World/WorldIndexDocument.swift` (#837), `tools/ide/SharpeeIDE/World/WorldView.swift` (#837), `tools/ide/SharpeeIDETests/WorldIndexTests.swift` (#837)
- **Exit state**:
  - `sharpee test --json` on scullery emits the whetstone's `lens-finding`, with its key, its span, its target id and the target's declaration span, then a `lens-summary`, and exits 0.
  - The page folds both.
  - The two AC-4 cases each render their own line.
  - The world-index `no-noun-extractor` cause decodes and renders.
- **Demonstration**:
  - The devkit lens tests (`pnpm --filter '@sharpee/devkit' test lens`) report no failures.
  - From `tools/ide/web/testing-surface`, `npx vitest run lens` reports no failures, with the real-path test among the passes.
  - The pinned xcodebuild invocation (project memory ide-xcodebuild-practice), limited to `WorldIndexTests`, reports "with 0 failures".
- **Demonstrated**: 2026-11-23, session 48a616. [verified: work-summary-writer re-run 2026-11-23 12:59–13:00 CST, after the last edit at 12:58 — devkit 37 files 252 passed 1 skipped incl. `tests/test-lens.test.ts` 3 passed; testing-surface `npx vitest run` 28 files 273 passed incl. `tests/lens.test.ts` 7 and `tests/lens-real-path.test.ts` 1; transcript-tester 29 files 386 passed; ide-protocol `test:ci` 7 files 67 passed; branch-tester 43 files 525 passed] [reported by session, unverified: xcodebuild WorldIndexTests "Executed 41 tests, with 0 failures" — not logged by the hooks, not re-run]
  - `pnpm --filter '@sharpee/devkit' test lens`: 2 files, 10 passed. `tests/test-lens.test.ts` runs the real command on scullery: 20 `lens-finding` events. The whetstone's carries `scullery.description` with span line 18–19, target `whetstone` and declaration line 35. One `lens-summary` follows at seed 42 with a 30 s budget, 2 of 2 rooms and `every-route`, then `run-end`, and the exit is 0. The no-extractor IR copy gives one refusal summary and no finding.
  - From `tools/ide/web/testing-surface`, `npx vitest run lens`: 2 files, 8 passed. Among them is "the lens tier from a real run of the scullery test story", which spawns `packages/devkit/dist/cli.js test … --json`. `lens.test.ts` folds the committed no-lens fixture to `toolchain-without-lens`, and an exit-2 run to `run-stopped-early`, each with its own sentence.
  - The pinned xcodebuild with `-only-testing:SharpeeIDETests/WorldIndexTests` printed "Executed 41 tests, with 0 failures". Among them is `testLanguageWithNoNounExtractorRendersItsOwnState`, which runs the real analyzer on Fernhill's IR with its language set to xx-YY.
  - Full suites after the fix-ups:
    - devkit: 37 files, 252 passed, 1 skipped (the skip predates this work).
    - testing-surface: 28 files, 273 passed.
    - branch-tester: 43 files, 525 passed.
    - transcript-tester: 29 files, 386 passed.
    - ide-protocol: 7 files, 67 passed.
  - The Chord pin and the toolchain are both 4.1.0.
- **Status**: DONE

### Phase 5: Chord Writer shows where a noun has no text
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The Testing tab's lens section and the source highlight in both heads (ADR-408 D1, D2, D9, D10).
- **Entry state**: Phase 4's exit holds, and the Chord pin is checked again.
- **Deliverable**:
  - A lens section in the Testing tab, rendered by the testing surface (`tools/ide/web/testing-surface/src/lens-view.ts`, new, beside `claims.ts`), with "In play" as the working title. It is one more section of the run column, never a gate (ADR-356 D7).
  - The section opens with a soundness line: seed, budget, stop reason, rooms reached of declared, and that findings are real but absence is not proof (ADR-322 D7).
  - The classes, each in its strip: No text (resolved-default) first, then Not answered (not in scope, with not-a-thing rows behind a toggle), Number form and Ambiguous. Unclassified rows are shown and never dropped.
  - Each card finds the phrase inside the passage span its `lens-finding` carries (devkit resolved it, ADR-408 D8). It lists the rooms the finding was seen in and links to the target's declaration.
  - The highlight (ADR-408 D9): activating a card posts `{openSource:{file,line,column,length}}`, with a 1-based column and a length in UTF-16 units. SharpeeIDE (`TestingSurfaceViewController.swift`, and the editor it opens) selects that range. So does PaneHost (`Shell/TestingSurfacePosts.cs` and its editor). A request with only a line keeps working as it does today (AC-6).
  - "Write the description" (ADR-408 D10): the No-text card posts a source request for the target's declaration line, and the author types. Neither head gains a post or a buffer edit.
  - Under D-2(b), separable: persistent editor marks on each phrase that names a thing with no text. They are distinct from compose underlines and name the finding on hover (ADR-324 D1, D3, D7), in both heads.
  - Tests:
    - testing-surface vitest on row derivation and the source request's range.
    - An automated real-path test in SharpeeIDETests, in the style of `TestingSurfaceRealPathTests.swift` (no click-through). It builds scullery through the real CLI, runs the lens, and activates the whetstone's No-text card. The editor's selection must equal the whetstone's range on `test-stories/scullery/scullery.story:19`, and the selected text must read "whetstone".
    - PaneHost.Tests: the range request reaches the editor and selects the same range.
    - Both heads: a request with only a line opens that line with no wider selection (AC-6).
- **Files**: `tools/ide/web/testing-surface/src/lens-view.ts` (new), `tools/ide/web/testing-surface/src/main.ts`, `tools/ide/web/testing-surface/src/surface.css`, `tools/ide/web/testing-surface/tests/lens-view.test.ts` (new), `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift`, `tools/ide/SharpeeIDE/MainWindow.swift`, `tools/ide/SharpeeIDE/Editor/EditorViewController.swift`, `tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift` (or a new lens real-path class beside it), `tools/ide/PaneHost/Shell/TestingSurfacePosts.cs`, `tools/ide/PaneHost/Editor/`, `tools/ide/PaneHost.Tests/`, `tools/ide/build-testing-surface.sh` (the bundle that both heads ship)
- **Exit state**: In both heads, scullery's whetstone shows in the Testing tab as a No-text finding. Activating it selects the phrase in the room's prose, and the description offer opens the whetstone's declaration at `test-stories/scullery/scullery.story:35`. The testing-surface, SharpeeIDE and PaneHost tests pass.
- **Demonstration**:
  - From `tools/ide/web/testing-surface`, `npx vitest run lens` reports no failures.
  - The pinned xcodebuild invocation, limited to the lens real-path test, reports "with 0 failures", and that test asserts the selected range's text reads "whetstone".
  - `dotnet test tools/ide/PaneHost.Tests` reports no failures for the range-request tests.
- **Demonstrated**: 
- **Status**: ABANDONED (David, 2026-11-23)

### Phase 6: The gates pass and the records point at what landed
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: The closing gates and the decision-record notes.
- **Entry state**: Phases 1 to 5 are DONE.
- **Deliverable**:
  - The gates, each run once: the full SharpeeIDE scheme; `dotnet test tools/ide/PaneHost.Tests`; the testing-surface suite (`npx vitest run` in `tools/ide/web/testing-surface`); `pnpm --filter '@sharpee/branch-tester' test`; `pnpm --filter '@sharpee/devkit' test`; `pnpm --filter '@sharpee/ide-protocol' test:ci`; `pnpm --filter '@sharpee/world-index' test:ci` (their `test` script is watch-mode vitest); `./repokit verify` (protocol freshness, among others); the explorer-probe suite if it was kept.
  - The records: ADR-408's Planning set to IMPLEMENTED with evidence inline; a dated note under ADR-294 D23 saying the first lens earned a package and naming the walk it borrows; a dated note on ADR-407's Scope; a dated note on ADR-277 for the Testing tab's new section; the index rebuilt.
  - GH #835 and #837 closed with evidence inline. The plan is archived by hand (GH #669).
- **Files**: `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md`, `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md`, `docs/architecture/adrs/adr-407-a-lens-reads-prose-through-the-story-language.md`, `docs/architecture/adrs/adr-277-ide-integrated-testing.md`, `docs/architecture/adrs/INDEX.md`, `docs/work/lens-findings-in-ide/`
- **Exit state**: Every gate is green, or at its recorded baseline. The ADR notes and issue closures name the commits that landed.
- **Demonstration**: `./repokit verify` exits 0. The full SharpeeIDE scheme run reports "with 0 failures", and `dotnet test tools/ide/PaneHost.Tests` reports no failures. `gh issue view 835 --json state` prints "CLOSED".
- **Demonstrated**: 
- **Status**: ABANDONED (David, 2026-11-23)
