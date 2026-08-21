# Session Plan: Port The Secret Letter (Textfyre, 2009) to Chord

**Created**: 2026-08-21
**Plan Status**: ACTIVE
**Overall scope**: Retarget-port *Jack Toresal and The Secret Letter* from Inform 7/Glulx into a native Chord story at `branch-stories/secret-letter/` — plus two things that are not a port at all: an original coda authored outright (no source to translate) and a structural redesign of the middle/late game (the market's open-with-pressure model replacing the source's own linear rails). Long-term endeavor — not a sprint. Ten ACCEPTED proposal items (P-1..P-10) from `docs/proposals/secret-letter-port.md` remain the spine; `vision.md` (below) adds scope this plan now carries as phases, gated on David's own change document authorizing each piece — never on the capture itself.
**Bounded contexts touched**: N/A — this is Chord story-content authoring against already-accepted platform primitives (`define conversation`, beat-thread runtime, capability dispatch), not new domain modeling. Work lands entirely in `branch-stories/secret-letter/` and `docs/references/textfyre/secretletter/`; no `packages/` changes are in scope for this plan. If any phase surfaces a genuine platform need (a transformation mechanic, a new pacing primitive, a scene-state construct for the endgame), that need is flagged for a separate ADR + discussion per CLAUDE.md, never planned or built as part of this plan.
**Key domain language**: quip-tree, beat / beat-thread, `define conversation`, chapter spine, retarget (vs. faithful port), deferred narration (ADR-323), Adjacent Rooms, the Vedd, coda, gender sight (per-NPC perception), push/pull/quiet pacing.

**Vision capture**: `docs/work/secret-letter-port/vision.md` — a record of David's stated vision for the remake (2026-08-21): Jack is a trans girl, a Vedd prayer-circle coda after the rescue, Miradania's world rules on gender and the talent, the Maiden House rewrite, and the market-as-template structural redesign. It is a capture, **not** the P-4 change document — Phase 4 stays gated on David. §8's consequences are now folded into Phases 5, 7, 8, 9, 10, and 11 below.

**Companion doc**: `docs/work/secret-letter-port/watch-list.md` — scale watch list. This port is ~5x the largest Chord story ever written; the watch list names what that stresses (import ergonomics, diagnostic file attribution, compile-time curve, conversation volume) and how to check each. Consult and append to it as phases land.

## References consulted
- `docs/proposals/secret-letter-port.md` — the source plan input: all ten items ACCEPTED 2026-08-21; carries the hard pre-staging gate on P-1, the P-4 content-authority dependency bounding P-5..P-7, and the platform-change gating on P-8/P-9.
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` — this port is explicitly a separate effort from ADR-322 (David, 2026-08-21): it is not D13's validation corpus and carries neither AC-10 nor AC-11; also the source of the ~1,192 response rules / 32 rooms / 12,635 lines figures P-2 must confirm or correct.
- `docs/architecture/adrs/adr-323-deferred-narration.md` — ACCEPTED but unimplemented and CLAUDE.md-gated as a platform change (`packages/engine`, `packages/chord`, `packages/world-model`); P-9 closes either at an implementing child ADR/plan shipping AC-1 through AC-7, or at an explicit "ships without it" decision — building it is out of this plan's scope either way.
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — `define conversation` and the beat-thread runtime are the verified-real primitives P-5/P-6 build on (`packages/character/src/conversation/`, load-through test at `packages/story-loader/tests/adr-320-phase10-threads.test.ts`); this plan authors content against them, it does not extend the construct.
- `docs/context/project-profile.md` — stack/convention constraints: fernhill-style `.story` + config/recipe/tests/world-ignore layout for `branch-stories/`, `./repokit build` + `dist/cli/sharpee.js --test` for transcript regression, TypeScript strict / Vitest conventions if any tooling is touched.
- `docs/context/session-20260821-1030-feat-adr-321-world-index.md` (most recent session) — open items confirm the CLI bundle is ~2 days stale (this plan's transcript-test phases must rebuild first) and flag ADR-322 D13's unbacked corpus premise as a separate track this plan must not serve.
- `docs/work/secret-letter-port/vision.md` — captures David's vision decisions (trans-girl reframe, Vedd coda, world rules on gender/the talent, the resolved Maiden House rule, the market-as-template redesign) plus two open questions (the Vedd-foreshadow mechanism, the endgame fight scene) — reshapes Phases 5, 7, 8, 9, 10, and 11 below. It is a capture of what David said, never itself the content-authority citation — that stays the P-4 change document (§8 states this explicitly, and this plan holds to it).

## Phases

### Phase 1: Land the reference corpus with the pre-staging name gate (P-1)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A — infrastructure/reference-material staging, no domain modeling.
- **Entry state**: `docs/proposals/secret-letter-port.md` ACCEPTED; source corpus available (Inform 7 source, three variants; design archive incl. Word docs never yet checked; dialogue `.xlsx`; Visio diagrams; recorded bugs; Textfyre I7 extension trees). No files staged yet.
- **Deliverable**: A **two-name** gate verified at zero via `grep -ri` across every text-bearing file in the repository — including the Word design documents converted to text for the first time — run and passing BEFORE any corpus file is committed:
  1. the excluded Textfyre-programmer name, which never appears in this repository; and
  2. Tara McGrew's dead name, which the 2007-2010 archive is precisely the kind of material to carry — every occurrence corrected to her correct name. Prose that merely *promises* she is credited correctly is not a gate; this is the gate.

  Only after both clear: the corpus committed under `docs/references/textfyre/secretletter/`, excluding the archive's 18+ compiled builds (not landed at all — `~/repos/SecretLetter2026` separately holds five `.ulx` files, which is not the same set and not a reason to land these). The directory's `README.md` records **both** divergences from upstream explicitly, mirroring `docs/references/dungeon-81/README.md`'s pattern of an intentional divergence note.
- **Exit state**: Corpus present at `docs/references/textfyre/secretletter/`; zero **repository-wide** hits for both gated names — repository-wide, not corpus-wide, because that is the property that currently holds and must survive the staging; README explains both divergences; P-1 closed.
- **Status**: DONE (2026-08-21) — gate cleared repository-wide for both names before staging; 86 files / 8.5 MB landed.

### Phase 2: Measure the world and stage the playtest transcripts (P-2, P-3)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — measurement and reference-material conversion, not new domain modeling.
- **Entry state**: Phase 1 complete — I7 source and the five clean playtest transcripts are landed under the reference corpus.
- **Deliverable**: (P-2) A written inventory — rooms, objects, NPCs, scenes, chapters, puzzles, plus a chapter-by-chapter map — derived from the I7 source (not the transcripts), with ADR-322's three figures (~1,192 response rules, 32 rooms, 12,635 lines) each confirmed or corrected by name so the two records never drift. (P-3) The five playtest transcripts converted to readable form under the reference corpus, each labeled with what it covers, with an explicit note that they are reference material and not the acceptance gate for this port. That note is scoped to this port and asserts nothing — in either direction — about any other use of the transcripts.
- **Exit state**: Inventory document and converted transcripts both committed under the reference corpus; P-2 and P-3 closed.
- **Status**: DONE (2026-08-21) — `INVENTORY.md` and `testing/README.md` landed under the corpus. ADR-322 D13's figures reconciled: 12,635 lines and 1,192 response rules confirmed exactly, **32 rooms corrected to 84**. Phase 8's build checklist now exists.

### Phase 3: Resolve the three port-scoping decisions (P-8, P-9, P-10)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Decision/documentation only — no code. Two of the three items name a platform-change boundary (CLAUDE.md: discuss before implementing anything in `packages/`); this phase closes each item at its decision, never at implementation.
- **Entry state**: Phase 1 complete (Adjacent Rooms extension source is in the landed corpus). Independent of Phases 2 and 4-8 otherwise — can run any time after Phase 1.
- **Deliverable**: (P-8) The proposal records either an explicit "drop it" decision for an Adjacent-Rooms equivalent with the reason, or a decision to build one — in which case building it is out of this plan's scope until a separate ACCEPTED ADR covering the new language surface exists. (P-9) The proposal records either that an implementing child ADR/plan for ADR-323 exists and will ship with AC-1 through AC-7 satisfied (tracked on its own plan, not this one), or an explicit decision that the port ships without deferred narration. (P-10) The proposal records what "done" means for this port in checkable terms (branch-stories only / browser build / public release / parity with `secretletter.plover.net`).
- **Exit state**: All three decisions recorded in `docs/proposals/secret-letter-port.md`; P-8, P-9, P-10 closed at the decision layer regardless of which branch each took.
- **Status**: DONE (2026-08-21) — all three recorded in the proposal. **P-8**: no platform equivalent for `Adjacent Rooms`; its 142 distant/dead-end texts are authored as story content against `define action` + `directions` (ADR-267 D12), ADR-173 adjacency, and `WorldModel.findPath` — with a small per-room-text spike carried into Phase 5. **P-9**: the port ships without ADR-323 deferred narration (18 `dramatic event` declarations in the whole source; the ADR stays alive on its own track). **P-10**: **a public release** (David) — hosted, landing page, IFID, announced.
- **Consequence for this plan**: P-10's target is not satisfied by Phase 8. Phase 8's exit state covers only the first of P-10's five checkable terms; the browser build, hosting, landing page, IFID, and announcement have **no phase**. A re-plan pass is required as Phase 8 nears completion — until then, reaching Phase 8 does not mean the port is done.

### Phase 4: Confirm the content-authority gate (P-4)
- **Tier**: Small
- **Budget**: 60
- **Domain focus**: N/A — administrative gate. This is David's own change document, not Claude work; Claude never invents story content. A narrow clearance exists to write dialogue in Michael Gentry's voice for this remake specifically — nothing structural.
- **Entry state**: David has authored the change document covering at least Chapter 1 (external input; not produced by this plan).
- **Deliverable**: The change document is reachable from `docs/proposals/secret-letter-port.md` by path. This phase itself produces no chapter content — it only confirms the gate is open before Phase 5 starts, and Phases 5, 7, and 8 each cite the specific section of the document that authorizes the chapter being built. A chapter the document does not cover is not ported.
- **Exit state**: Change document linked and reachable — P-4 **gate-confirmed, not closed**. Half of P-4's "Done when" is a property of Phases 5, 7, and 8 (each citing the section that authorizes its chapter), which have not run when this phase exits; P-4 closes with Phase 8, when the last citing phase has cited. Its coverage stays a live, re-checked constraint throughout — a chapter added to the document later reopens what Phases 7 and 8 may build.
- **Status**: CURRENT (since 2026-08-21) — blocked on external input: David's change document is not produced by this plan.

### Phase 5: Decide the Vedd foreshadow (vision.md §2, open)
- **Tier**: Small
- **Budget**: 60
- **Domain focus**: Decision only — no code, no authored content. Determines whether the Vedd (the spiritual order performing Jack's coda transformation, Phase 11) are seeded earlier in the ported chapters or introduced cold at the coda.
- **Entry state**: David has not yet decided. vision.md §2 records the question as raised, not answered — "we should probably foreshadow the Vedd somehow — TBD" — alongside candidate existing furniture the thread could attach to (the Library, Jack's body as an examinable object, the existing become-Jacqueline mirror scene, "Ascension"), offered as evidence of what's available in the source, not as a proposal for what to write. Independent of Phase 4's change document arriving — David can decide this whenever, though the decision will typically end up recorded in the change document once made.
- **Deliverable**: A recorded decision, in the proposal or the change document, choosing one of:
  1. **Unseeded** — the Vedd appear only at the coda (Phase 11); the ported chapters (Phases 6, 8, 10) need no Vedd-related changes; near-zero ripple, as vision.md §2 states.
  2. **Seeded** — a mechanism for foreshadowing the Vedd earlier (David's own candidate: Jack reading about them and imagining being reborn); once chosen, the specific chapters/scenes it touches become new authorized content that Phases 8 and/or 10 build against — cited to the change document when they do, not to this capture.

  Either branch closes this phase; neither is assumed in the phases below until David decides.
- **Exit state**: The branch is on record; Phases 8, 10, and 11 read it rather than guessing. Reopening this decision after Phase 10 has already built chapters against "unseeded" would mean revisiting completed content, so the decision should be made as early as practical — but this phase does not block Phase 6 (Chapter 1), which sits upstream of most of the candidate furniture named above.
- **Status**: PENDING

### Phase 6: Chapter 1 vertical slice in `branch-stories/secret-letter/` (P-5)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: First proof that beat-based Chord conversation carries Textfyre's material — exercises `define conversation`, the `packages/character/src/conversation/` thread runtime, and the fernhill-style story layout. Also the first place the P-8 per-room-text spike (Adjacent Rooms) runs, and, if Phase 5 decides "seeded," a candidate first place for Vedd-foreshadow content.
- **Entry state**: Phase 4 confirms the change document covers Chapter 1. Phase 5's Vedd-foreshadow decision is on record — most of the candidate furniture vision.md §2 names (the Library, the mirror scene) sits in later chapters, so "unseeded" likely leaves Chapter 1 untouched either way, but the decision should exist before this phase assumes that. `./repokit build` run fresh (CLAUDE.md: the CLI bundle is stale) before any transcript testing.
- **Deliverable**: `branch-stories/secret-letter/` scaffolded following the fernhill layout (`secret-letter.story` plus config/recipe/tests/world-ignore JSON, `assets/`). Chapter 1 plays end to end, including at least one complete conversation authored as `define conversation` beats. The P-8 spike (whether a per-room "seen from elsewhere" text is cleanest as a phrase key, a `define trait`, or a room-body field) runs here, against Chapter 1's first distant-room descriptions, per the proposal's own note. Authored transcript tests for Chapter 1 pass against the freshly built bundle (`node dist/cli/sharpee.js --test ...`).
- **Exit state**: Chapter 1 playable and test-covered; the P-8 spike answered — or, if it finds the story layer genuinely cannot carry the pattern, escalated per P-8's own reopening clause (an ADR precondition, not inline platform work); P-5 closed; the vertical slice stands as the template Phase 7 generalizes from.
- **Status**: PENDING

### Phase 7: Prove the quip-tree to beat-thread rewrite pattern, including per-NPC perception (P-6a)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Design a general mapping from Textfyre's menu-driven quip tree (quip declarations, `menu text`, `response of` edges, `start conversation with` entry points) to Chord beats — a rewrite, not a translation, since Chord's beat model is a third model again (the I7 source's own commented-out `Conversation Topics` extension was a second, unused model). The pattern must also carry per-NPC perception (vision.md §3d): whether a given speaking character sees Jack or Jacqueline is a **standing rule** affecting forms of address, pronouns, and dialogue across every conversation, not a per-scene beat — so the rewrite pattern needs a mechanism for it, proven here rather than reinvented per conversation in Phase 8.
- **Entry state**: Phase 6 complete (Chapter 1's conversation is a working existence proof of the beat-thread runtime under real content). Phase 4's change document names which characters see Jack as Jacqueline as it reaches them, citing vision.md §3d's starting set (Teisha, Dame Sandler, Bobby, Widow Shannon see her; Widow Theresa and Widow Fiona do not) as evidence, not as the authorization itself. `./repokit build` fresh if transcript tests are run in this phase.
- **Deliverable**: A written rewrite pattern stating (a) how quip nodes, menu text, and response edges map to beats, and (b) how per-NPC perception is represented and read by the beat-thread for address/pronoun/dialogue selection — demonstrated end to end on one complete conversation from the corpus (distinct from Chapter 1's, if Chapter 1's conversation was simple) with its own transcript test passing. Chosen, where practical, from a perceiving character (Teisha or Dame Sandler) so the perception mechanism is exercised alongside the tree-to-beat mapping, not proven separately later.
- **Exit state**: The pattern is documented and proven on one conversation, including the perception mechanism; Phase 8 applies both at scale. P-6's "prove" half closed.
- **Status**: PENDING

### Phase 8: Apply the rewrite pattern across the remaining conversations (P-6b)
- **Tier**: Large
- **Budget**: 400 (per session — see note)
- **Domain focus**: Convert the remaining ~39 of the ~40 quip-tree conversations (380 quip declarations, 297 `menu text` lines, 307 `response of` edges total across all of them) into beat-threads against the Phase 7 pattern, applying per-NPC perception across all 23 conversation trees as it goes. Includes the Maiden House widows' conversations (Theresa, Fiona, Shannon), rewritten per vision.md §4's resolved rule: Shannon has the gender sight and already says "Miss Jacqueline" in the source (`SH1`, `SH7`, `SH13`); Theresa and Fiona do not, and their existing bare "Jacqueline" lines become "Jack." The Shannon dress scene (`story.ni:10574`) stands as written under this reading — only the perception flag changes, not the scene.
- **Entry state**: Phase 7's pattern (tree-to-beat and perception mechanism) is proven and documented. Phase 4's change document names the perceiving/non-perceiving set per character as this phase reaches them, chapter by chapter. `./repokit build` fresh before each transcript-test pass.
- **Deliverable**: Each remaining conversation converted against the Phase 7 pattern, with per-NPC perception applied per character, and its own authored transcript test passing.
- **Exit state**: All ~40 conversations from the I7 source exist as Chord beat-threads with passing transcript tests, perception-correct per character; P-6 fully closed.
- **Status**: PENDING
- **Note**: This is explicitly the largest single item in the endeavor and will not close in one working session. The 400-call budget is a per-session ballpark, not a total — treat this phase as ongoing across many actual sessions, tracked by incremental work summaries per conversation batch rather than by splitting it into more plan phases. Do not compress this into Phase 7 or Phase 10 to make the plan look shorter than the work is. Expected consequence: this phase and Phase 10 will hold CURRENT far past the 14-day threshold the pre-session audit scans for, so this plan will report as stale every session by design — that is not a finding to re-diagnose.

### Phase 9: Design a fix for the endgame fight scene (vision.md §7, blocked on external input)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Design only — this phase produces a plan for restructuring the Fossville skirmish/capture sequence, not an implementation. Implementation happens in Phase 10, against whatever this phase authorizes. **No solution is proposed here unasked** — David has said he doesn't know how to fix it either.
- **Entry state**: David has not yet found Michael Gentry's notes on the endgame, if they exist — he said he will dig. This phase is blocked exactly as Phase 4 is: on an external artifact this plan cannot produce. vision.md §7's structural diagnosis is available as evidence of *why* it's broken, not as a proposed fix: a single hand-maintained `current script` list (`story.ni:11911`, `FOSS0`-`FOSS12`, with `FOSS3`/`FOSS4` missing — beats cut or reordered and the list patched by hand), no scene-boundary trigger of its own (the Skirmish scene "begins when FOSS6 is fired"), and two separate places that force-empty the list to terminate it.
- **Deliverable**: One of:
  1. Gentry's notes surface, and this phase's output is a design translating them into a Chord-buildable shape, cited by Phase 10 when it builds the scene; or
  2. they don't surface, and David makes his own call on how to redesign the sequence, recorded here before Phase 10 builds it; or
  3. an explicit decision to ship the sequence close to the original's shape, deferring the redesign.

  If the design calls for a mechanic the platform doesn't have (e.g. a purpose-built scene-state construct beyond `define sequence`/`define machine`), that need is flagged for a separate ADR + discussion — not built here, not assumed available. Whatever the design decides, it hands off directly into Phase 11 — vision.md §7 notes the fight sits immediately before the coda.
- **Exit state**: A recorded design (or an explicit "ship close to as-is" decision) that Phase 10 can build the actual scene against, and that Phase 11 can hand off from.
- **Status**: PENDING — blocked on external input (David digging for Michael Gentry's notes; may resolve to "no notes found, David decides").

### Phase 10: Build the remaining chapters — port, redesign, and the Maiden House rewrite (P-7)
- **Tier**: Large
- **Budget**: 400 (per session — see note)
- **Domain focus**: Everything Phases 6 and 8 don't cover — rooms, objects, NPCs, scenes, and puzzles for every chapter the Phase 4 change document authorizes, beyond Chapter 1. This is **not purely a port** — vision.md §8 names it a spec for a different game sharing Part 1's world, plot, and most of its prose, and three distinct kinds of work fold into this phase together:
  1. **Ported material** — the majority: existing rooms, objects, scenes, and prose retargeted under the trans-girl reframe (vision.md §1), much of which the source's own interior prose already supports without rewriting (e.g. `story.ni:1408`, `3025`, `1469`).
  2. **The Maiden House rewrite** (vision.md §4, RESOLVED) — Widow Shannon has the gender sight; Widow Theresa and Widow Fiona do not, treating Jack as Jack, dismissive of children generally. The dialogue side of this (Phase 8) is a perception-flag change on an existing tree; this phase covers the location/scene text around it — no new plot logic is needed, the tell already exists in the corpus.
  3. **The structural redesign** (vision.md §5) — de-railroading the middle/late game using Grubber's Market's own pattern as the template (an open sub-map with a mobile pursuer whose proximity is a state machine — `oblivious`/`approaching`/`grabbing`/`nearby`, `story.ni:1875-1878` etc. — rather than the source's actual 17-scene linear hint chain, `story.ni:1065-1087`), following David's push/pull/quiet pacing spine (mercenaries push, shops quiet, Maiden House rewritten per above, mercenaries push, Bobby pulls, Townhouse/Library/Bath pull, remainder mixed). vision.md §5's own open question — what supplies "keep moving" pressure outside a mercenary chase (a clock, an alarm, a draining resource) — is raised, not answered; each region's pressure source is authorized content from the change document, not invented here.
- **Entry state**: Phase 2's world inventory exists as the build checklist. Phase 4's change document coverage is re-checked per chapter — a chapter it does not cover is not built. Phase 3's Adjacent-Rooms decision is resolved (P-8: no platform equivalent; texts authored as story content). Phase 5's Vedd-foreshadow decision is on record — if "seeded," the chapters/scenes it names are additional authorized content this phase builds; if "unseeded," this phase needs no Vedd-related content. Phase 9's endgame-fight design is on record before that chapter is built. `./repokit build` fresh before each transcript-test pass.
- **Deliverable**: Every chapter covered by the change document is playable in `branch-stories/secret-letter/`, each with authored transcript tests passing — including the Maiden House rewrite and the redesigned middle/late-game pacing, both scoped to what the change document authorizes.
- **Exit state**: The full retargeted-and-redesigned game (as scoped by the change document) is playable and test-covered; P-7 closed. Together with Phase 3's P-10 decision, this determines whether the port has reached its defined ship target — reaching this phase's exit state satisfies only item 1 of P-10's five checkable terms. Phase 3's carried consequence still stands unchanged by this restructuring: no phase covers items 2-5 (browser build, hosting, landing page, IFID, announcement), and a re-plan pass is required as this phase nears completion.
- **Status**: PENDING
- **Note**: Like Phase 8, this is honestly multi-session — 84 rooms and 12,635 lines of source material behind it (Phase 2's inventory gives the precise, corrected count), now carrying redesign work that source figure doesn't capture at all. Track it by chapter-batch work summaries, not by further plan-phase splitting.

### Phase 11: Author the coda — the Vedd prayer-circle transformation (vision.md §2, original content)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The one part of the remake authored outright rather than translated — there is no source to port from (the Vedd appear exactly once in the entire 12,635-line source, as a title fragment, `story.ni:12224`). A new scene after the rescue: a Vedd prayer circle in which Jack is physically transformed into the body she has envisioned, replacing the original's unwritten sequel hook (the hooded-men "capture," `story.ni:12214`, is reframed as a rescue). If Phase 9's design needs new mechanics this scene also depends on (e.g. a transformation event), that platform-level need is flagged for separate ADR + discussion, not built here.
- **Entry state**: Phase 4's change document covers the coda specifically — cited by path and section, per this plan's own citation rule (not by this capture, not by vision.md directly). Phase 5's Vedd-foreshadow decision is on record — it determines whether this scene stands alone or pays off threads planted earlier, though vision.md §2 states the ripple is near-zero either way since nothing in the existing material runs after this scene. Phase 9's endgame-fight design is on record, since the fight hands off directly into this scene. Phase 10 need not be fully complete — the coda is self-contained new content, not a modification of already-ported chapters — but the ending chapter(s) it hands off from must be built.
- **Deliverable**: The coda scene playable in `branch-stories/secret-letter/`, authored against the change document's own wording (never against vision.md's capture directly), with its own transcript test passing.
- **Exit state**: The coda playable and test-covered. Together with Phase 9 and Phase 10, this completes the full arc vision.md §8 describes — "a spec for a different game that shares Part 1's world, plot, and most of its prose" — which is why Phase 10 was reworded from "port the remaining chapters" rather than left as-is.
- **Status**: PENDING

## Item-to-phase trace
- P-1 -> Phase 1
- P-2 -> Phase 2
- P-3 -> Phase 2
- P-4 -> Phase 4 (gate confirmed; re-checked by Phases 6, 8, 10 per the proposal's own "Done when," which cites P-5 through P-7; also re-checked by the vision-derived Phases 5, 9, and 11 below, which are additional scope beyond the ten proposal items and cite the change document under the same rule; closes with Phase 10, the last of the P-numbered citing phases)
- P-5 -> Phase 6
- P-6 -> Phases 7 and 8 (prove, then apply)
- P-7 -> Phase 10
- P-8 -> Phase 3
- P-9 -> Phase 3
- P-10 -> Phase 3 (decision recorded); its release-terms gap (checkable terms 2-5: browser build, hosting, landing page, IFID, announcement) still has no phase — carried forward unchanged from Phase 3's own "Consequence for this plan" note, not absorbed by this restructuring.

## Vision-derived phases (vision.md §8, not P-numbered)
vision.md §8 named five consequences for this plan. All five are now applied:
1. "This is not a port" — Phase 10's name and deliverable reworded to state the port + Maiden House rewrite + structural redesign explicitly, rather than "port the remaining chapters and world."
2. Per-NPC perception is a standing rule across all dialogue — folded into Phases 7 (prove the mechanism) and 8 (apply it across all 23 trees).
3. The endgame fight needs its own phase or explicit deferral, blocked on external input — Phase 9, structured like Phase 4.
4. The Vedd-foreshadow decision changes the size of Phases 8 and 10 — Phase 5, a decision gate read by Phases 8, 10, and 11.
5. The P-10 release-terms re-plan obligation still stands — preserved verbatim in Phase 3 and restated in Phase 10's exit state; not absorbed.

The coda itself (vision.md §2) is Phase 11, and the Maiden House rewrite (vision.md §4, RESOLVED) is folded into Phases 8 (dialogue) and 10 (location/scene text).
