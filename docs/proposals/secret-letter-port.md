# Proposal: Secret Letter port to Chord

**Status**: IN PROGRESS — **6 of 10 items DONE** (P-1, P-2, P-3 via plan Phases 1-2; P-8, P-9, P-10 via plan Phase 3). P-4 through P-7 remain PLANNED, and P-4 is blocked on David's change document, which this plan does not produce. All ten accepted by David 2026-08-21, then planned into `docs/work/secret-letter-port/plan.md` (session 7d2ec9) the same day. `proposal-review` ran the same day (2 blocking, 2 overlap, 3 advisory): both blockers dissolved by David's ruling that this port is a separate effort from ADR-322, and the overlaps and advisories are folded into the items below.
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
- **Status**: DONE (2026-08-21, plan Phase 2) — `docs/references/textfyre/secretletter/INVENTORY.md`. 84 rooms by book, 47 NPCs, 23 quip trees / 380 quips, ~300 object declarations, 56 scenes, the book spine, and the puzzle path from the source's own `Book X` walkthrough. ADR-322 D13: 12,635 lines **confirmed exactly**; 1,192 response rules **confirmed exactly** (= `Instead` 778 + `After` 244 + `Before` 127 + `Check` 43); 32 rooms **corrected to 84** — the cited figure was a naive `grep 'is a room'` that missed five other declaration forms.

### P-3: Convert the five clean playtest transcripts as reference material
They are already in `>command`/response form. Because the port is a retarget, they are **not** the acceptance gate — they are the only surviving record of the original's pacing, prose, and solution path.

Depends on P-1, which is what lands them.

- **Done when**: the five transcripts exist in readable converted form under the reference corpus, each labeled with what it covers, and the record states plainly that they are reference and not a passing-test target **for this port** — a scoping statement about the port, asserting nothing about any other use of them.
- **Status**: DONE (2026-08-21, plan Phase 2) — `docs/references/textfyre/secretletter/testing/README.md` labels all five by command count, build, how far each reaches, and what each is good for; two of the five are complete runs to the ending. Conversion applied: 20 U+FFFD replacement characters restored to `©` (8) and `é` (12), verified against the I7 source, nothing else touched. The not-the-acceptance-gate note is stated and explicitly scoped to this port.

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
- **Status**: DONE (2026-08-21, plan Phase 3) — **decided: no platform equivalent is built. The behaviour is authored as story content in Chord.**

**What the extension actually does.** `Adjacent Rooms` (13 KB, 7 chapters) gives a room a `distant description` — what it looks like *from somewhere else* — and a `dead-end description`, then wires `examine`/`look at`/`search` and the movement verbs to print them when the noun is a visible-but-not-current room or a bare direction. It is used heavily: **101 `distant description` and 41 `dead-end description` texts** in `story.ni`, 23 of them in Grubber's Market and 78 elsewhere. Many interpolate `quick best route from the location to X`, a pathfinding call.

**Why no platform change.** Every piece it needs already exists, and the 142 texts are story content that has to be authored for the port either way:

| What it needs | What Chord/Sharpee already has |
| --- | --- |
| `look <direction>` as a story verb | `define action` + a `directions` block bound to the `direction` slot (ADR-267 D12) — live in `stories/nautical/nautical.story` |
| Per-room "seen from elsewhere" text | `define phrases` keyed per room, or `define text`; the 142 texts are content regardless of mechanism |
| Room-to-room adjacency | ADR-173 wall adjacency primitive, ACCEPTED and implemented, which names examination as a consumer |
| "lies to the [best route]" | `WorldModel.findPath` (BFS), `packages/world-model/src/world/WorldModel.ts:1355` |

Building a platform-level adjacent-rooms construct would add language surface to serve **one story's house style**. If the pattern proves general across several Chord stories later, promote it then, with its own ADR at rule 11's bar. Verified absent today: no `distant`/`remote`-room concept anywhere in `packages/chord`, `packages/world-model`, or `packages/stdlib`, and `looking` has no direction handling — so this is a genuine gap, deliberately left to the story layer rather than closed in the platform.

**The one unverified step**, stated rather than buried: whether a per-room text is cleanest as a phrase key, a `define trait` on the room, or a room-body field was not settled here — that is a small spike inside Phase 5's Chapter 1 slice, where the first distant descriptions get written. If that spike finds the story layer genuinely cannot carry it, this decision reopens and an ADR is the precondition, exactly as the item requires.

### P-9: Decide ADR-323 deferred narration for this port
ADR-323 is ACCEPTED but unimplemented, and it is a platform change (CLAUDE.md-gated). The port runs without it; it exists because Textfyre's Dramatic Priority extension had no Chord equivalent, and this is the story that motivated it.

- **Done when**: either the implementing child ADR/plan exists and the feature ships with AC-1 through AC-7 satisfied, or this proposal records an explicit decision that the port ships without it.
- **Status**: DONE (2026-08-21, plan Phase 3) — **decided: the port ships without deferred narration.** ADR-323 stays ACCEPTED and alive on its own track; this decision binds the port, not the ADR.

**Measured, not assumed.** The original's `Dramatic Priority` use is small: **18 `dramatic event` declarations** across the whole 12,635-line source — roughly 12 atmospheric (`ATMOS_*`) and 6 plot beats (`EVENT_*`: mercenary arrival / warning / approach / grab, the monkey, Fossville). The six-level ladder is referenced by 27 `current tension` reads. That is not a load-bearing subsystem; it is 18 texts with a priority word.

**Three reasons the port does not wait on it.**

1. **Its original justification is exactly what the retarget removes.** ADR-323's own Context says so: Dramatic Priority existed because a non-IF middle-school reader would not dig a plot beat out from under atmosphere. That audience constraint is gone from this port by definition.
2. **Three quarters of the mechanism is already present** (ADR-323's own table): ADR-296 narrative slots give placement, ADR-320 D7 `define initiative` / `hold their tongue` gives suppression, ADR-310 D8 gives a ladder. Only *deferral* — "not this turn, but soon" — is missing, and with 18 events across 84 rooms the collision it prevents is rare here.
3. **It is a platform change needing an implementing child ADR and its own plan.** Blocking a story port on unbuilt platform work inverts the dependency. The plan already puts building it out of scope; this makes the port's independence explicit rather than implied.

**This is not a judgment on ADR-323.** Its generalising argument stands on `fernhill`'s three random-chance daemons, not on this game. If the child ships while the port is still running, the port adopts it — nothing here is one-way, and no port content is authored against its absence.

### P-10: Define the ship target
`~/repos/SecretLetter2026` already serves the original at secretletter.plover.net. What this port's completion means is not self-evident.

- **Done when**: the proposal records what "done" is — branch-stories only, a browser build, a public release, or parity with the existing site — in terms that can be checked.
- **Status**: DONE (2026-08-21, plan Phase 3) — **decided: a public release** (David, 2026-08-21).

The port is finished when the Chord *Secret Letter* is a real, playable, published game — not when it merely runs in the repo. Checkable terms:

1. Every chapter David's change document (P-4) covers is playable end to end, with authored transcript tests passing against a freshly built `dist/cli/sharpee.js`.
2. `./repokit build secret-letter --browser` produces a self-contained client under `dist/web/secret-letter/`.
3. That build is hosted at a public URL and reachable by someone who has never seen this repository.
4. It has a landing page and its own IFID.
5. It is announced.

**This is the most ambitious of the four options and it changes the shape of the work.** The current plan (`docs/work/secret-letter-port/plan.md`) ends at Phase 8 — "every chapter is playable and test-covered" — which satisfies item 1 only. Items 2 through 5 pull art, client presentation, polish, hosting, and a landing page into scope, and **no phase covers any of them today.**

That gap is recorded here deliberately rather than closed by inventing phases now: the release work cannot be planned usefully until the game exists and its presentation needs are known. **The plan needs a re-plan pass when Phase 8 nears completion**, and until that happens the plan reaching Phase 8 must not be read as the port being done. Tracked as an open item in the session record.

Two constraints already known for that later pass: the existing OpenSilver re-host at `secretletter.plover.net` serves the *2009* game, so the Chord port needs its own address rather than silently replacing it, and a public release is a real work David's name goes on — the standing GenAI-out-of-real-works constraint applies to anything shipped, with the narrow dialogue clearance in P-4 the only exception.
