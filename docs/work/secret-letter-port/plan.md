# Session Plan: Port The Secret Letter (Textfyre, 2009) to Chord

**Created**: 2026-08-21
**Plan Status**: ACTIVE
**Overall scope**: Retarget-port *Jack Toresal and The Secret Letter* from Inform 7/Glulx into a native Chord story at `branch-stories/secret-letter/`. Long-term endeavor — not a sprint. Ten ACCEPTED proposal items (P-1..P-10) from `docs/proposals/secret-letter-port.md`, spanning corpus staging, world/dialogue measurement, a change-document gate, a Chapter 1 vertical slice, a quip-tree-to-beat rewrite pattern proven then applied across ~40 conversations, the remaining chapters/world, and three scoping decisions (Adjacent Rooms, deferred narration, ship target).
**Bounded contexts touched**: N/A — this is Chord story-content authoring against already-accepted platform primitives (`define conversation`, beat-thread runtime, capability dispatch), not new domain modeling. Work lands entirely in `branch-stories/secret-letter/` and `docs/references/textfyre/secretletter/`; no `packages/` changes are in scope for this plan (any that surface — e.g. building an Adjacent-Rooms equivalent, or implementing ADR-323 — require a separate ADR + platform-change discussion per CLAUDE.md and are explicitly deferred out of this plan).
**Key domain language**: quip-tree, beat / beat-thread, `define conversation`, chapter spine, retarget (vs. faithful port), deferred narration (ADR-323), Adjacent Rooms.

## References consulted
- `docs/proposals/secret-letter-port.md` — the source plan input: all ten items ACCEPTED 2026-08-21; carries the hard pre-staging gate on P-1, the P-4 content-authority dependency bounding P-5..P-7, and the platform-change gating on P-8/P-9.
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` — this port is explicitly a separate effort from ADR-322 (David, 2026-08-21): it is not D13's validation corpus and carries neither AC-10 nor AC-11; also the source of the ~1,192 response rules / 32 rooms / 12,635 lines figures P-2 must confirm or correct.
- `docs/architecture/adrs/adr-323-deferred-narration.md` — ACCEPTED but unimplemented and CLAUDE.md-gated as a platform change (`packages/engine`, `packages/chord`, `packages/world-model`); P-9 closes either at an implementing child ADR/plan shipping AC-1 through AC-7, or at an explicit "ships without it" decision — building it is out of this plan's scope either way.
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — `define conversation` and the beat-thread runtime are the verified-real primitives P-5/P-6 build on (`packages/character/src/conversation/`, load-through test at `packages/story-loader/tests/adr-320-phase10-threads.test.ts`); this plan authors content against them, it does not extend the construct.
- `docs/context/project-profile.md` — stack/convention constraints: fernhill-style `.story` + config/recipe/tests/world-ignore layout for `branch-stories/`, `./repokit build` + `dist/cli/sharpee.js --test` for transcript regression, TypeScript strict / Vitest conventions if any tooling is touched.
- `docs/context/session-20260821-1030-feat-adr-321-world-index.md` (most recent session) — open items confirm the CLI bundle is ~2 days stale (this plan's transcript-test phases must rebuild first) and flag ADR-322 D13's unbacked corpus premise as a separate track this plan must not serve.

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
- **Status**: CURRENT (since 2026-08-21)

### Phase 3: Resolve the three port-scoping decisions (P-8, P-9, P-10)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: Decision/documentation only — no code. Two of the three items name a platform-change boundary (CLAUDE.md: discuss before implementing anything in `packages/`); this phase closes each item at its decision, never at implementation.
- **Entry state**: Phase 1 complete (Adjacent Rooms extension source is in the landed corpus). Independent of Phases 2 and 4-8 otherwise — can run any time after Phase 1.
- **Deliverable**: (P-8) The proposal records either an explicit "drop it" decision for an Adjacent-Rooms equivalent with the reason, or a decision to build one — in which case building it is out of this plan's scope until a separate ACCEPTED ADR covering the new language surface exists. (P-9) The proposal records either that an implementing child ADR/plan for ADR-323 exists and will ship with AC-1 through AC-7 satisfied (tracked on its own plan, not this one), or an explicit decision that the port ships without deferred narration. (P-10) The proposal records what "done" means for this port in checkable terms (branch-stories only / browser build / public release / parity with `secretletter.plover.net`).
- **Exit state**: All three decisions recorded in `docs/proposals/secret-letter-port.md`; P-8, P-9, P-10 closed at the decision layer regardless of which branch each took.
- **Status**: PENDING

### Phase 4: Confirm the content-authority gate (P-4)
- **Tier**: Small
- **Budget**: 60
- **Domain focus**: N/A — administrative gate. This is David's own change document, not Claude work; Claude never invents story content. A narrow clearance exists to write dialogue in Michael Gentry's voice for this remake specifically — nothing structural.
- **Entry state**: David has authored the change document covering at least Chapter 1 (external input; not produced by this plan).
- **Deliverable**: The change document is reachable from `docs/proposals/secret-letter-port.md` by path. This phase itself produces no chapter content — it only confirms the gate is open before Phase 5 starts, and Phases 5, 7, and 8 each cite the specific section of the document that authorizes the chapter being built. A chapter the document does not cover is not ported.
- **Exit state**: Change document linked and reachable — P-4 **gate-confirmed, not closed**. Half of P-4's "Done when" is a property of Phases 5, 7, and 8 (each citing the section that authorizes its chapter), which have not run when this phase exits; P-4 closes with Phase 8, when the last citing phase has cited. Its coverage stays a live, re-checked constraint throughout — a chapter added to the document later reopens what Phases 7 and 8 may build.
- **Status**: PENDING

### Phase 5: Chapter 1 vertical slice in `branch-stories/secret-letter/` (P-5)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: First proof that beat-based Chord conversation carries Textfyre's material — exercises `define conversation`, the `packages/character/src/conversation/` thread runtime, and the fernhill-style story layout.
- **Entry state**: Phase 4 confirms the change document covers Chapter 1. `./repokit build` run fresh (CLAUDE.md: the CLI bundle is stale) before any transcript testing.
- **Deliverable**: `branch-stories/secret-letter/` scaffolded following the fernhill layout (`secret-letter.story` plus config/recipe/tests/world-ignore JSON, `assets/`). Chapter 1 plays end to end, including at least one complete conversation authored as `define conversation` beats. Authored transcript tests for Chapter 1 pass against the freshly built bundle (`node dist/cli/sharpee.js --test ...`).
- **Exit state**: Chapter 1 playable and test-covered; P-5 closed; the vertical slice stands as the template Phase 6 generalizes from.
- **Status**: PENDING

### Phase 6: Prove the quip-tree to beat-thread rewrite pattern (P-6a)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Design a general mapping from Textfyre's menu-driven quip tree (quip declarations, `menu text`, `response of` edges, `start conversation with` entry points) to Chord beats — a rewrite, not a translation, since Chord's beat model is a third model again (the I7 source's own commented-out `Conversation Topics` extension was a second, unused model).
- **Entry state**: Phase 5 complete (Chapter 1's conversation is a working existence proof of the beat-thread runtime under real content). `./repokit build` fresh if transcript tests are run in this phase.
- **Deliverable**: A written rewrite pattern stating how quip nodes, menu text, and response edges map to beats, demonstrated end to end on one complete conversation from the corpus (distinct from Chapter 1's, if Chapter 1's conversation was simple) with its own transcript test passing.
- **Exit state**: The pattern is documented and proven on one conversation; Phase 7 applies it at scale. P-6's "prove" half closed.
- **Status**: PENDING

### Phase 7: Apply the rewrite pattern across the remaining conversations (P-6b)
- **Tier**: Large
- **Budget**: 400 (per session — see note)
- **Domain focus**: Convert the remaining ~39 of the ~40 quip-tree conversations (380 quip declarations, 297 `menu text` lines, 307 `response of` edges total across all of them) into beat-threads against the Phase 6 pattern.
- **Entry state**: Phase 6's pattern is proven and documented. `./repokit build` fresh before each transcript-test pass.
- **Deliverable**: Each remaining conversation converted against the Phase 6 pattern, with its own authored transcript test passing.
- **Exit state**: All ~40 conversations from the I7 source exist as Chord beat-threads with passing transcript tests; P-6 fully closed.
- **Status**: PENDING
- **Note**: This is explicitly the largest single item in the endeavor and will not close in one working session. The 400-call budget is a per-session ballpark, not a total — treat this phase as ongoing across many actual sessions, tracked by incremental work summaries per conversation batch rather than by splitting it into more plan phases. Do not compress this into Phase 6 or Phase 8 to make the plan look shorter than the work is. Expected consequence: this phase and Phase 8 will hold CURRENT far past the 14-day threshold the pre-session audit scans for, so this plan will report as stale every session by design — that is not a finding to re-diagnose.

### Phase 8: Port the remaining chapters and world (P-7)
- **Tier**: Large
- **Budget**: 400 (per session — see note)
- **Domain focus**: Everything Phase 5/7 don't cover — rooms, objects, NPCs, scenes, and puzzles for every chapter the Phase 4 change document authorizes, beyond Chapter 1.
- **Entry state**: Phase 2's world inventory exists as the build checklist. Phase 4's change document coverage is re-checked per chapter — a chapter it does not cover is not built. Phase 3's Adjacent-Rooms decision is resolved (if "build," that work happens on a separate platform-change plan/ADR track and this phase proceeds without it, or waits on it, per what Phase 3 decided). `./repokit build` fresh before each transcript-test pass.
- **Deliverable**: Every chapter covered by the change document is playable in `branch-stories/secret-letter/`, each with authored transcript tests passing.
- **Exit state**: The full retargeted game (as scoped by the change document) is playable and test-covered; P-7 closed. Together with Phase 3's P-10 decision, this determines whether the port has reached its defined ship target.
- **Status**: PENDING
- **Note**: Like Phase 7, this is honestly multi-session — 32 rooms and 12,635 lines of source material behind it (Phase 2's inventory gives the precise count). Track it by chapter-batch work summaries, not by further plan-phase splitting.

## Item-to-phase trace
- P-1 -> Phase 1
- P-2 -> Phase 2
- P-3 -> Phase 2
- P-4 -> Phase 4 (gate confirmed; re-checked by Phases 5, 7, 8; closes with Phase 8)
- P-5 -> Phase 5
- P-6 -> Phases 6 and 7 (prove, then apply)
- P-7 -> Phase 8
- P-8 -> Phase 3
- P-9 -> Phase 3
- P-10 -> Phase 3
