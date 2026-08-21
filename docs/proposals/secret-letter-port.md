# Proposal: Secret Letter port to Chord

**Status**: PLANNED — all ten items accepted by David 2026-08-21, then planned into `docs/work/secret-letter-port/plan.md` (session 7d2ec9) the same day. `proposal-review` ran the same day (2 blocking, 2 overlap, 3 advisory): both blockers dissolved by David's ruling that this port is a separate effort from ADR-322, and the overlaps and advisories are folded into the items below.
**Date**: 2026-08-21
**Session**: 7d2ec9
**Origin**: conversation — David's decision (2026-08-21) to port *The Secret Letter* (Textfyre, 2009) to Chord as a long-term endeavor landing in `branch-stories/`, building on the scoping done in sessions 502b0b and 7d2ec9 against the `ChicagoDave/textfyre` design archive and Inform 7 extension trees.

This is the third incarnation of the game. The original is Inform 7 / Glulx, shipped 2009 on the Textfyre VM. `~/repos/SecretLetter2026` is an OpenSilver/.NET re-host of that same compiled story file, live at secretletter.plover.net. This proposal covers a genuine port: the game rebuilt native in Chord, not re-hosted.

**It is a retarget, not a faithful port.** The original's "non-IF middle school audience" constraint is gone. David documents the story changes separately; that document is the content authority for anything structural (P-4), and its absence bounds how far the build items can run.

**This port is a separate effort from ADR-322** (David, 2026-08-21). It is not the
validation corpus for D13's state-space sweep and carries none of AC-10 or AC-11.
D13 rests on the 2009 original's deliberate linear spine and its non-IF middle-school
invariant — exactly what the retarget removes — and it never stated how the Inform 7
source would reach a sweep that reads only Chord IR. That gap is ADR-322's to close by
amendment; nothing here waits on it, and no item below may be planned as if it served it.

Two standing person-level constraints apply to every item that touches source material: the excluded Textfyre-programmer name never appears in this repository, and Tara McGrew is credited under her correct name — never the dead name that appears in historical Textfyre material.

## Items

### P-1: Land the reference corpus at `docs/references/textfyre/secretletter/`
Inform 7 source (three variants), the design archive (16 Detail Design revisions, Orphan drafts back to 2007-02, dialogue `.xlsx`, Visio puzzle and map diagrams, recorded bugs), and the Textfyre I7 extension trees. The archive's 18+ compiled builds are **not** landed — they are bulk this repository has no use for. (`~/repos/SecretLetter2026` separately holds five `.ulx` files; that is a different set and not a reason to land these.) Same relationship to this port that `docs/references/dungeon-81/` has to Dungeo.

- **Done when**: the corpus is committed under `docs/references/textfyre/secretletter/`; `grep -ri` returns zero across every text-bearing file in the repository — including the Word design documents converted to text (never yet checked) — for **both** gated names: the excluded programmer's name, and Tara McGrew's dead name, which a 2007-2010 archive is exactly the kind of material to carry and which is corrected to her correct name at every occurrence; and a `README.md` in that directory states both divergences explicitly, so a future session reads them as intentional rather than as corruption of a directory whose own README promises its contents never change.
- **Status**: DONE (2026-08-21, plan Phase 1) — 86 files / 8.5 MB landed; both gated names verified zero repository-wide before staging.

### P-2: Measure the world inventory from the Inform 7 source
The dialogue was measured precisely in prior scoping (~40 conversations, 380 quip declarations, 307 response edges). The world never was.

ADR-322 already records three figures in passing — ~1,192 authored response rules over 32 rooms, 12,635 lines. This item verifies those against the source and extends them, rather than starting fresh, so the two records cannot drift.

- **Done when**: a written inventory exists giving counts for rooms, objects, NPCs, scenes, chapters, and puzzles, plus a chapter-by-chapter map — derived from the I7 source rather than from the playtest transcripts — with ADR-322's three figures each either confirmed or corrected by name.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-3: Convert the five clean playtest transcripts as reference material
They are already in `>command`/response form. Because the port is a retarget, they are **not** the acceptance gate — they are the only surviving record of the original's pacing, prose, and solution path.

Depends on P-1, which is what lands them.

- **Done when**: the five transcripts exist in readable converted form under the reference corpus, each labeled with what it covers, and the record states plainly that they are reference and not a passing-test target **for this port** — a scoping statement about the port, asserting nothing about any other use of them.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-4: David's change document is the port's content authority
Anything structural — what happens, which chapters survive, whether the linear chapter spine holds, who the retargeted audience is — comes from David. Claude may write dialogue in Michael Gentry's voice under the clearance he granted for this remake specifically; it may not invent story.

- **Done when**: the change document exists and is reachable from this proposal by path, and every build item below (P-5 through P-7) cites the section of it that authorizes the chapter being built. A chapter the document does not cover is not ported.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-5: Chapter 1 vertical slice in `branch-stories/secret-letter/`
The first real answer to whether beat-based Chord conversation carries the material. `define conversation` is verified real — Chord parser/IR/analyzer, `packages/character/src/conversation/` thread runtime, and a load-through test at `packages/story-loader/tests/adr-320-phase10-threads.test.ts`.

Depends on P-4: chapter 1 cannot be built before the change document covers chapter 1.

- **Done when**: `branch-stories/secret-letter/` follows the fernhill layout (`.story` plus config/recipe/tests/world-ignore), builds, and plays chapter 1 end to end including at least one complete conversation; authored transcript tests for that chapter pass against a freshly built bundle.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-6: Prove the quip-tree → beat-thread rewrite pattern, then apply it
The original is a menu-driven quip tree: 380 quip declarations, 297 `menu text` lines, 307 `response of` edges, 40 `start conversation with` entry points — roughly 40 conversations averaging 9-10 nodes. Textfyre's own `Conversation Topics` extension sat commented out at `story.ni:206`; they had the topic model and chose the menu. Chord's beats are a third model again, so this is a rewrite, not a translation.

- **Done when**: a written rewrite pattern exists, demonstrated on one complete conversation, stating how quip nodes, menu text, and response edges map to beats; and the remaining conversations are converted against it with their own transcript tests.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-7: Port the remaining chapters and world
- **Done when**: every chapter covered by P-4's change document is playable in `branch-stories/secret-letter/`, each with authored transcript tests passing.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-8: Resolve `Adjacent Rooms`
The one Textfyre extension (13KB) with no identified Chord equivalent. Every other extension is accounted for: ~90KB already solved by the platform (FyreVM Support, channel shims, Image Output, XML Output Toggling → ADR-163 channels; Textfyre Standard Rules → stdlib), Counters → ADR-264/ADR-217, Scripted Events → `define sequence`/`define machine` (ADR-215), Triggers trivial at ~20 lines.

The determination is in scope now. **Building** an equivalent is not: it adds language surface, which is a platform change under CLAUDE.md and a decision at rule 11's bar.

- **Done when**: the proposal records either an explicit decision to drop it with the reason, or a decision to build an equivalent — in which case an ACCEPTED ADR covering the new surface is a precondition of any implementation work, and this item closes at the decision, not at the code.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-9: Decide ADR-323 deferred narration for this port
ADR-323 is ACCEPTED but unimplemented, and it is a platform change (CLAUDE.md-gated). The port runs without it; it exists because Textfyre's Dramatic Priority extension had no Chord equivalent, and this is the story that motivated it.

- **Done when**: either the implementing child ADR/plan exists and the feature ships with AC-1 through AC-7 satisfied, or this proposal records an explicit decision that the port ships without it.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)

### P-10: Define the ship target
`~/repos/SecretLetter2026` already serves the original at secretletter.plover.net. What this port's completion means is not self-evident.

- **Done when**: the proposal records what "done" is — branch-stories only, a browser build, a public release, or parity with the existing site — in terms that can be checked.
- **Status**: PLANNED (docs/work/secret-letter-port/plan.md)
