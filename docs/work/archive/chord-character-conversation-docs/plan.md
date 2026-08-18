# Session Plan: Document the Chord character model and conversation system for authors

**Created**: 2026-08-18
**Plan Status**: DONE (2026-08-18, session ade288 — all four phases DONE; 15 pages shipped, docs-tab at 159 pages, IDE suite 493/493)
**Overall scope**: The Chord Writer Documentation tab has zero author-facing coverage of the character model (ADR-310/318, Chord 2.x) and the conversation system (ADR-320, Chord 3.1.0-3.3.0). This plan adds a new nav group of pages to the website (canon source), rebuilds the IDE's bundled docs-tab from it, and keeps the version-parity gate (`chordLanguageVersion` == `ChordVersionCheck.supportedLanguageVersion` == `CHORD_LANGUAGE_VERSION`, all 3.3.0) and the IDE test suite green.
**Bounded contexts touched**: N/A — this is author-documentation content work, not domain modeling. The "bounded context" language of this template does not apply; phases are named for the two Chord subsystems being documented (character, conversation) because that is the vocabulary the docs and the ADRs already use.
**Key domain language**: personality/temperament/principles/mood/goals (character model); manner/greetings/recency/exchange/initiative/conversation-thread (conversation system) — see the Construct Inventory in Phase 2/3 below for the full list.

## References consulted
- `packages/chord/src/version.ts` — authoritative construct inventory and the 3.1.0/3.2.0/3.3.0 history entries for the conversation grammar; every documented spelling must be verified against the shipped compiler, not this file's prose (David's standing rule: ADRs and version notes are reference, not spec).
- `website/src/lib/nav.ts` — the single nav model (`NAV`). The `Chord` section is at version `3.3.0` already (matches `CHORD_LANGUAGE_VERSION`); a new group inserts as a sibling of `Behavior`/`Flow & Progression` inside that section's `groups` array — no new top-level `NavSection`.
- `website/src/app/chord/guide/world/people/content.mdx` — existing adjacent page (17 lines): confirms house style (dense prose, failure modes named, exactly one fenced example) and is a cross-link target for the character-model group (`proper`/`pronouns` are entity-creation constructs, not character-model ones — stays in The World).
- `website/src/app/chord/guide/behavior/topic-tables/content.mdx` — existing adjacent page (20 lines): confirms the same house style and is a cross-link target for the conversation group's recency page (`define topics` predates and coexists with the recency predicate).
- `tools/ide/build-docs-tab.sh` + `tools/ide/web/docs-tab/build.mjs` — the render pipeline (nav.ts -> HTML fragments -> `docs-index.json`). `EXCLUDED_GROUPS` contains only `{section: 'Chord', group: 'Getting Started'}`, and `EXCLUDED_PAGES` contains only `/chord-writer/download` — a new group placed anywhere else ships automatically; Phase 4 must confirm the build's reported page/excluded counts move by exactly the expected amount.
- `tools/ide/SharpeeIDETests/DocsTabRealPathTests.swift` — asserts bundled `docs-index.json`'s `chordLanguageVersion` equals `ChordVersionCheck.supportedLanguageVersion` equals the live `CHORD_LANGUAGE_VERSION` in `version.ts` (all 3.3.0 today). This plan does not bump the language version, so the assertion must still hold unchanged after every phase.
- `docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md` (D9) — "the IDE tracks the Chord language version": the design reason the version-parity gate above exists; this plan's job is to not break it, not to extend it.
- `docs/architecture/adrs/adr-310-character-model-in-chord.md` — source ADR for the character-model constructs. Reference only: every spelling it names gets re-verified against `sharpee compose --check` before it goes in a page (ADR prose has drifted from shipped syntax before).
- `docs/architecture/adrs/adr-318-normative-character-layer.md` — amends ADR-310. Same reference-not-spec caveat.
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — source ADR for the conversation-system constructs, landed across Phases 3/4/D14 (Chord 3.1.0-3.3.0). Same reference-not-spec caveat; this is the ADR most likely to have drifted since it shipped same-day as its own vocabulary freezes three times.

## Structural decision (settled by this plan)

**New nav group, "Characters & Conversation," inside the existing `Chord` `NavSection`, positioned after `Behavior` and before `Flow & Progression`.** Not a new top-level section (`Chord Writer` and `Chord` are the only two, and this content is squarely Chord-the-language). Not folded into `Behavior` or `The World`: the surface is 15 constructs across two related but distinct systems (who a character is vs. how that plays out in dialogue) — comparable in size to the existing `Vocabulary & Text` group (13 flat items), too big to bolt onto `Behavior`'s nine items without burying it.

**`People` stays in The World; `Topic tables` stays in Behavior — cross-linked, not moved.** Moving either changes a shipped URL for no reader benefit (both are complete, working pages) and would need an entry in `EXCLUDED_PAGES`-adjacent bookkeeping to avoid a dangling old href. Instead: the new group's Overview page links to both, and the People and Topic-tables pages each get a one-line "See also" pointing into the new group (Topic-tables -> the recency page in particular, since recency predicates extend the same `define topics` machinery).

**Flat item list, no `children` nesting** — matching `Vocabulary & Text`'s precedent for a dense, many-page group rather than `Standard Library`'s nested-by-subsystem style, because none of these 15 constructs naturally subgroups the way manipulation/movement/containers do.

Page list (all under `/chord/guide/characters-and-conversation/...`, one `content.mdx` + `page.tsx` per item, matching the People page's `<DocPage title="...">` wrapper):

| # | Title | Slug | Phase |
|---|---|---|---|
| 1 | Overview | (group root) | 1 |
| 2 | Personality & temperament | `personality-and-temperament` | 2 |
| 3 | Principles | `principles` | 2 |
| 4 | Mood | `mood` | 2 |
| 5 | Feelings & knowledge | `feelings-and-knowledge` | 2 |
| 6 | Goals | `goals` | 2 |
| 7 | Influence & face-acts | `influence-and-face-acts` | 2 |
| 8 | Conscience | `conscience` | 2 |
| 9 | Manner | `manner` | 3 |
| 10 | Greetings | `greetings` | 3 |
| 11 | Topic recency | `topic-recency` | 3 |
| 12 | Exchanges | `exchanges` | 3 |
| 13 | Initiative | `initiative` | 3 |
| 14 | Conversation threads | `conversation-threads` | 3 |
| 15 | Continuation prompts | `continuation-prompts` | 3 |

## Verified against the shipped compiler (2026-08-18, session ade288)

Groundwork done before writing: two scratch stories were driven to **gate-clean
`sharpee compose --check` at Chord 3.3.0** — `packages/chord/tests/fixtures/lexer-golden/conversation-surface.story`
(the conversation half, written earlier this session) and a character-model scratch. Findings
the pages MUST carry, several of which contradict what ADR prose would have produced:

1. **The built-in personality vocabulary is exactly 14 words** — `honest, loyal, cowardly,
   paranoid, cruel, cunning, curious, stubborn, generous, vain, devout, impulsive, remorseful,
   untroubled` (`packages/chord/src/character-manifest.ts`, `CHARACTER_MANIFEST.personality`).
   Anything else is a compile error (`analysis.trait-not-declared`) until declared with
   `define personality <word>` — which is a real construct I would have missed
   (`stories/thealderman/chord/thealderman.story:81` declares `defensive` this way).
   **`character-manifest.ts` is the authoritative source for every frozen word list the docs
   quote** — intensities, moods and their modifiers, dispositions, threats, confidences, fact
   sources, audiences, goal priorities, influence modes/ranges, forces, act categories, face
   acts, pressure bands, cognitive dimensions and profile presets. Quote it, never an ADR.
2. **One feeling per target per block** — a second `feels` line naming the same target is
   `analysis.feels-duplicate`.
3. **`burdened by <topic>` requires the topic be held in the same block** — `knows <topic>,
   <source>` must accompany it, or `analysis.burdened-unheld` fires. A named diagnostic worth
   documenting as the failure mode.
4. **A goal's `active when` takes character/story state conditions, not fact values** — `it is
   breaking` (band), `it is not calm` (mood), a story state, or a compound with `and`. Writing
   a fact-value condition (`the ledger is forged`) fails with `analysis.unknown-entity`.
5. **Dispositions carry their own preposition** — `devoted to`, `dislikes toward`, `wary of`;
   the word and its preposition are one unit, not a free choice.

**Open item RESOLVED (2026-08-18, ahead of Phase 2)**: `states:` on a person IS the same
`The World > States` construct — `stories/thealderman/chord/thealderman.story:298` declares
`states: denying, confessed` on a person and drives it with `change it to confessed when it is
breaking`. Goals therefore cross-links the existing States page; no separate paragraph needed.

**Superseded open item**: the `states:`/`change <person> to <state>` construct used by Goals (`stories/ides-of-march/chord/ides-of-march.story:8,197`) reads like the same `states:` declaration documented at `The World > States`, applied to a person rather than an object. Phase 2 must confirm this against the compiler/grammar before deciding whether Goals merely cross-links `The World > States` (expected) or needs its own paragraph — do not assume either way going in.

## Phases

### Phase 1: Nav scaffold and Overview page
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: The `Characters & Conversation` group's shape — nav entry, directory scaffold, cross-links from People and Topic-tables.
- **Entry state**: This plan approved; no `characters-and-conversation` directory exists yet under `website/src/app/chord/guide/`.
- **Deliverable**:
  - `website/src/lib/nav.ts`: new group `{ title: 'Characters & Conversation', items: [...] }` inserted into the `Chord` section's `groups` array between `Behavior` and `Flow & Progression`, with all 15 item entries (titles + hrefs from the table above) plus the group-root Overview.
  - `website/src/app/chord/guide/characters-and-conversation/content.mdx` + `page.tsx` — the Overview page: what the character model is, what the conversation system is, and how they relate (character state feeds conversation behavior), each with a one-line pointer to `The World > People` and `Behavior > Topic tables`.
  - One-line "See also" addition to `website/src/app/chord/guide/world/people/content.mdx` and `website/src/app/chord/guide/behavior/topic-tables/content.mdx`, pointing into the new group.
  - Empty placeholder directories are NOT created for items 2-15 — Phases 2 and 3 create each page's directory when they write it, so `next build`/the docs-tab build never sees a linked-but-missing page mid-plan.
- **Exit state**: `nav.ts` lists all 15 forthcoming hrefs; only the Overview page's files exist on disk. Running the website locally (`pnpm --filter website dev` or equivalent) would 404 on items 2-15 until Phases 2/3 land — that is expected and this phase does not need to run the docs-tab build (Phase 4 owns that gate).
- **Status**: DONE (2026-08-18, session ade288). Evidence: `Characters & Conversation` group added to the `Chord` section between `Behavior` and `Flow & Progression`; Overview page written (`content.mdx` + `page.tsx`, the latter copying the People page's `DocPage` wrapper verbatim rather than authoring novel Next.js, per `website/AGENTS.md`); "See also" cross-links appended to `world/people` and `behavior/topic-tables`. Build green: `node tools/ide/web/docs-tab/build.mjs` reports **145 pages in nav order, 5 excluded, Chord 3.3.0** (144 + the Overview), confirming the new group is not caught by `EXCLUDED_GROUPS`/`EXCLUDED_PAGES` and that the corrected 159 target is right.
  - **CONSTRAINT DISCOVERED — corrects this plan's phase boundaries.** The docs-tab build **hard-errors** on a nav entry whose page does not exist ("Add the page, or remove the entry from website/src/lib/nav.ts"). Registering all 15 entries up front, as this phase originally specified, would leave the docs build broken from Phase 1 until Phase 3 finished — including at every commit in between. Nav entries must therefore land **in the same change as their pages**: Phase 1 registers only the Overview; Phases 2 and 3 each add their own seven entries alongside their seven pages. The committed bundle is not damaged by the failure (the build refuses to overwrite it), but the repo would not build.

### Phase 2: Character-model pages
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: The character model (ADR-310/318): personality, temperament, principles, mood, feelings, knowledge/gossip, goals, influence, face-acts, conscience.
- **Entry state**: Phase 1's nav scaffold and Overview page exist; the seven hrefs for items 2-8 are already listed in `nav.ts` but not yet backed by files.
- **Deliverable**: For each of items 2-8 (Personality & temperament, Principles, Mood, Feelings & knowledge, Goals, Influence & face-acts, Conscience): a `content.mdx` + `page.tsx` pair matching the People/Topic-tables house style (dense prose naming failure modes, exactly one fenced ```chord example per page, 15-25 lines). Constructs to place across these seven pages:
  - personality adjectives with `very`/`slightly` modifiers; `temperament <X> over <Y>` (e.g. duty over fear, honor over duty)
  - `principles` (e.g. `never betrays a confidence`)
  - `mood <word>`; `define mood <X> like <Y>, but darker`
  - `feels <verb> toward|to <target>`
  - `knows <fact>, witnessed|told, certain`; `spreads <fact> to trusted|anyone`
  - goals: `goal <name>, <priority>` with `active when`, `say <phrase> to <target>`, `seek <person>`, `move to <room>` — plus the resolved `states:`/`change <person> to <state>` question from the Structural decision above
  - influence; face-acts
  - conscience bands (burdened/breaking)
  - Every example is pulled from (not invented for) `stories/ides-of-march/chord/ides-of-march.story`, `stories/thealderman`, or `stories/character-acceptance/chord/*.story`.
- **Exit state**: All seven pages exist and render the correct construct; every fenced example in them has been run through a real compile (see Acceptance below) and passed.
- **Acceptance** (run before marking DONE):
  1. Assemble every fenced example from this phase's pages into one scratch story (or extend one already-passing fixture like `stories/character-acceptance/chord/p10-threads.story`), and run `./sharpee compose --check <file>` — must exit gate-clean.
  2. `grep -rn "content.mdx" website/src/app/chord/guide/characters-and-conversation/` — confirm exactly 8 files exist (Overview + 7 new).
- **Status**: DONE (2026-08-18, session ade288). Evidence: seven pages written — personality-and-temperament, principles, mood, feelings-and-knowledge, goals, influence-and-face-acts, conscience — each `content.mdx` + `page.tsx` in house style (dense prose naming the failure mode, one fenced example). Their seven nav entries landed in the same change as the pages, per the Phase 1 constraint. **Every fenced example was assembled verbatim into one scratch story and driven to gate-clean `sharpee compose --check` at Chord 3.3.0**, so no page ships syntax the compiler rejects. Frozen word lists (personality 14, intensities, moods + modifiers, dispositions, threats, confidences, sources, audiences, priorities, influence modes/ranges, forces, act categories, face acts, bands) quoted from `character-manifest.ts`, never from an ADR. Build: `node tools/ide/web/docs-tab/build.mjs` reports **152 pages, 5 excluded, Chord 3.3.0** (145 + 7).

### Phase 3: Conversation-system pages
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: The conversation system (ADR-320, Chord 3.1.0-3.3.0): manner/mood-driven delivery, greetings, topic recency, exchanges, initiative, conversation threads, and the player-facing continuation prompts.
- **Entry state**: Phase 2 complete; the eight hrefs for items 9-15 are listed in `nav.ts` but not yet backed by files.
- **Deliverable**: For each of items 9-15 (Manner, Greetings, Topic recency, Exchanges, Initiative, Conversation threads, Continuation prompts): a `content.mdx` + `page.tsx` pair in the same house style. Constructs to place:
  - `define manner` — `when it is <mood>:` with `beat "..."` rotation and `voice <word>`
  - `define greetings` — `first time:`, `on return:`, `on return, again so soon:`, `on return, after days:`, `asked once|again|many times:`, `on leaving:`
  - the recency predicate `<topic> is fresh|recent|stale` (including the `refuse when <recency>: <phrase-key>` topic-table row form), `<topic> was discussed`, `the subject changes` — cross-linked from and to `Behavior > Topic tables`
  - `define exchange <key> for <person>[, passive|assertive|blocking]` — `answer "...", "..."` / `answer the <entity>` / act rows (`on leaving:`) / `on silence:`
  - `define initiative for <person>` — occasions (`on an open floor`, `on silence`, `on <act>` e.g. `on harm:`, `when the subject changes`, each with an optional `, when <condition>` refinement); the conversation-row statements `then asks <exchange>` / `then invites <exchange>`, `deflect to "<topic>"`, `leave`, `hold their tongue`
  - `define conversation <key> for <person>[, strength]` threads — `about "...", "..."`, `opens when <condition>`, ordered `beat:` / `beat, when <condition>:` rows, `on parting:` / `on resuming:` / `on refusing:`, exactly one `conclusion:`, and the `<thread> is concluded` predicate
  - the four player-facing continuation prompts ("tell me more", "continue", "go on", "and?") that advance an active thread
  - Every example is pulled from `stories/ides-of-march/chord/ides-of-march.story` (the three authored threads), `stories/thealderman`, `stories/character-acceptance/chord/*.story`, or `packages/chord/tests/fixtures/lexer-golden/conversation-surface.story` (the fixture that already enumerates the full surface in one gate-clean file — the cheapest source to draw from for constructs not otherwise demonstrated in a story).
- **Exit state**: All seven pages exist and render the correct construct; every fenced example has been run through a real compile and passed.
- **Acceptance** (run before marking DONE):
  1. Assemble every fenced example from this phase's pages into a scratch story (or extend `conversation-surface.story`), and run `./sharpee compose --check <file>` — must exit gate-clean.
  2. `grep -rn "content.mdx" website/src/app/chord/guide/characters-and-conversation/` — confirm exactly 15 files exist (Overview + 7 from Phase 2 + 7 from this phase).
- **Status**: DONE (2026-08-18, session ade288). Evidence: seven pages written — manner, greetings, topic-recency, exchanges, initiative, conversation-threads, continuation-prompts — with their nav entries landing in the same change. **Every fenced example assembled into one scratch story and gate-clean under `sharpee compose --check` at Chord 3.3.0, first run.** The continuation-prompts page uses a transcript-style fence rather than a `chord` fence, since the four prompts are player input and need no authoring. Build after this phase: **159 pages, 5 excluded, Chord 3.3.0** — the corrected target exactly.

### Phase 4: Verification, docs-tab rebuild, IDE suite
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: The pipeline from website content to the IDE's bundled Documentation tab (ADR-258 D9's version-parity gate).
- **Entry state**: Phases 1-3 complete: 16 pages exist (Overview + 15 constructs), nav.ts lists all of them, and every fenced example has independently compile-checked within its own phase.
- **Deliverable**:
  1. Full-corpus compile check: assemble every fenced example across all 16 new/touched pages (not just per-phase subsets) into one scratch story and run `./sharpee compose --check` once more, catching any cross-page interaction the per-phase checks missed.
  2. Rebuild the docs-tab bundle: `tools/ide/build-docs-tab.sh` (or `node tools/ide/web/docs-tab/build.mjs` directly). Confirm the reported page count is `144 + 15 = 159` pages in nav order (15 new: Overview + 14 constructs), and the excluded count is unchanged at 5 (the new group is not caught by `EXCLUDED_GROUPS`/`EXCLUDED_PAGES` — confirmed during reference consultation, re-verify the actual build output here rather than trusting that analysis).
  3. Confirm `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json`'s `chordLanguageVersion` is still `3.3.0` (this plan adds pages, not language surface — the version must not move).
  4. Run the full IDE test suite (per `project_ide_xcodebuild_practice`: `-derivedDataPath ./DerivedData`) and confirm `DocsTabRealPathTests` passes and the suite total is >= 493/493 (the pre-existing baseline; new tests, if any were added, are additive, not replacements).
  5. Stage and commit: the nav.ts change, the 16 new content.mdx/page.tsx pairs, the two "See also" edits, and the regenerated `docs-index.json`.
- **Exit state**: `docs-index.json` reflects the full new content, the version-parity gate still holds at 3.3.0/3.3.0/3.3.0, and the IDE suite is green.
- **Acceptance** (exact commands):
  1. `./sharpee compose --check <scratch-full-corpus-file>` — gate-clean.
  2. `node tools/ide/web/docs-tab/build.mjs` — inspect the summary line for `159 pages in nav order` and `5 excluded by EXCLUDED_GROUPS/EXCLUDED_PAGES`.
  3. `grep -o '"chordLanguageVersion":"[^"]*"' tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` — must read `3.3.0`.
  4. `xcodebuild test -project tools/ide/SharpeeIDE.xcodeproj -scheme SharpeeIDE -derivedDataPath ./DerivedData` (or the project's standing equivalent) — `DocsTabRealPathTests` passes; suite total >= 493/493.
- **Status**: DONE (2026-08-18, session ade288). Evidence, all run 2026-08-18:
  - `tools/ide/build-docs-tab.sh` — **159 pages in nav order, 5 excluded by EXCLUDED_GROUPS/EXCLUDED_PAGES, Chord 3.3.0**: exactly the corrected target (144 + 15), with exclusions unchanged, confirming the new group ships and is not caught by either exclusion list.
  - All 15 pages verified present as rendered fragments in the bundle (`ls .../docs-tab/pages/ | grep characters-and-conversation` = 15), not merely as nav entries.
  - **Version-parity gate holds**: bundled `chordLanguageVersion` 3.3.0 == `ChordVersionCheck.supportedLanguageVersion` 3.3.0 == `CHORD_LANGUAGE_VERSION` 3.3.0.
  - **Full `SharpeeIDETests`: 493 of 493 passing, TEST SUCCEEDED** — the 493/493 baseline is held, `DocsTabRealPathTests` included.
  - `npx tsc --noEmit` in `website/` — clean, so the 15 new `page.tsx` wrappers typecheck (each copies the existing People page's `DocPage` shape verbatim rather than authoring novel Next.js, per `website/AGENTS.md`).
  - Compile verification across both content phases: three scratch stories driven to gate-clean `sharpee compose --check` at Chord 3.3.0 — the character-model surface, every Phase 2 page example, and every Phase 3 page example.

## Non-goals
- `docs/book` (the Sharpee author/developer manual) is complete and QA'd — this plan does not touch it.
- `docs/reference/chord-language.md` is known to lag the website and is not the canon source — this plan does not update it.
- No language-version bump. If Phase 2 or 3 discovers a construct that does not compile as the ADRs describe it, that is a compiler-or-ADR discrepancy to report to the user, not something this plan resolves by inventing a new spelling.
