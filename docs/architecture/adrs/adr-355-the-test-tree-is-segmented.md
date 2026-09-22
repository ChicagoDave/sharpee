# ADR-355: The test tree is segmented, not one document

**Status**: **ACCEPTED** (David, 2026-09-22, session a5d716) — all four open questions resolved by interview the same day, `adr-review` clean at 20/20, and the acceptance taken on that review. There is no Open Questions section, which is the condition ADR-0009 Decision 2 requires of an ACCEPTED record. D1 records David's ruling of 2026-09-22 (session a5d716): *"the branch json file can't be one tree....it has to be segmented."* Everything else here is measurement. **No implementation is authorized by this ADR in any state.** D1 through D5 settle that the single document is wrong, where the cuts fall, where segments live, what holds story-level state, and what identifies a segment.

**Scope**: `packages/branch-tester` — which owns the format. The decisions reach one consumer outside that path, `tools/ide/web/testing-surface`, which imports `tree-document.ts` as source under rule 8b and therefore moves in the same commit; the header takes one path and this is the owning one. The Affected section names every module on both sides.

## Date: 2026-09-22

## Parent

- **ADR-307** (testing tree model v2) — D1 and D2 are what this supersedes. This document does not restate them; it records that their single-document premise does not hold at story scale and that the tree is segmented instead.
- **ADR-353** (the testing pane visits one line) — its D7 promises *"the tree document, the CLI, the assertion core and the pinned seed do not change."* That promise is broken by this ADR, and naming it is part of the record.
- **ADR-340** (one assertion core for the two testing runtimes) — its **D5 ("The facade does not move")** lists `<story>.tests.json` among the things that *"keep their names and shapes."* D3 changes that name and that shape, so D5 is superseded in that one particular. Everything else D5 pins — `runTranscript`, `goldenPathFor`, the CLI flags, `RunEventStream`, the `.transcript` grammar and its serializer, the walker's and the IDE's imports from `@sharpee/branch-tester` — is untouched, and D1's assertion-core ownership is untouched entirely.

## Context — measured, not assumed

**Observed, 2026-09-22.** `branch-stories/secret-letter/secret-letter.tests.json` is **202,002 bytes across 6,732 lines**, holding **639 cards, 60 branches, and a maximum branch depth of 3** under 148 top-level cards, at `version: 1` and `seed: 1209`. Every other tree document in the repository is an order of magnitude smaller: fernhill 21,329 bytes, ides-of-march 11,878, the w10-dance prototype 4,255, thealderman 1,515, and the `state-pins` fixture 801. So this is a defect that only appears once a real story has a real test surface, which is why it reads from the outside as a display problem at scale.

**Observed, same day, and this is the finding that decides D1.** The working tree carried an uncommitted change to that document of **6,274 lines added against 5,718 deleted, in a 6,732-line file** — 93% of it rewritten. What produced that change is not established here and does not need to be: the document is serialized whole on every change by construction, so *any* edit is capable of that diff. ADR-307 D1 says so in as many words — *"every change serializes it back out fresh"* — and `packages/branch-tester/src/tree-document.ts:161` (`serializeTreeDocument`) takes the whole `TreeDocument` and returns the whole text, with the module's own invariant block pinning deterministic whole-document output as a property the format guarantees.

**The document is authored content that an author commits.** It sits beside the `.story` file at the project root (ADR-307 D2, Q-2), and ADR-353 D4b relies on that placement being authored territory when it rules that a branch-image cache must never be written there because *"a cache landing in it would appear in their `git status`."* The same sentence condemns the current arrangement from the other side: what does appear in an author's `git status` is a near-total rewrite of a 6,700-line file after a testing session, which is unreviewable as a diff and collides with any other edit to any part of the tree.

**A line has no identity, and that is the same defect seen from another angle.** ADR-307 D2 resolved Q-8 as *"derived labels only … nothing persisted, no rename affordance"* — with the hedge that *"an optional `label` field remains a purely additive possibility later"*, which is worth carrying because D5 does add a persisted field, though an id rather than a label — and deleted the collision machinery along with the naming scheme, because in a single recursive document a line is not an entity — it is a path, so its name must be computed from where the path runs. ADR-353 D2 then measured what that costs at scale, against this same story: **61 lines, 37 distinct labels, 31 of the 61 sharing a label**, so the run column folds **385 of 566 card results**, later results overwriting earlier ones under the same key. That is filed as **GH #494** ("packages/branch-tester needs a stable line id") and is recorded there as a platform change ADR-353 declined to take.

**Derived, and marked as such**: segmentation and line identity look like one problem rather than two, because a segment is a thing that can carry a name while a path cannot. That was derived rather than observed when D1 was taken, and it is what D2 and D5 went on to settle — the boundary makes a segment a thing, and D5 gives it an id. Nothing in D1 rested on it.

**Two consumers move together, by rule 8b.** `tree-document.ts` is a shared wire-type module: its header records that `tools/ide/web/testing-surface` imports the **source file** directly through a tsconfig path, a vitest alias and a `build.mjs` alias, and that it must therefore stay free of `fs`, Node types and DOM. Any change to the at-rest shape is a change both the CLI and the IDE pane take in the same commit — which is the point of that arrangement, and means segmentation cannot land on one side first.

**The candidate boundaries are priced, against the same story** (observed 2026-09-22). The tree has **19 fork points** carrying 60 branches, and the three boundaries that have been named cost very differently:

| Boundary | Segments | Cards stored | Largest segment |
| --- | --- | --- | --- |
| One line, standalone (root-to-leaf, prefix included) | 61 | **3,988** (6.2× duplication) | 148 cards |
| One branch run (main line whole, each branch's own cards) | 61 | 639 (no duplication) | **148 cards ≈ 47 KB** |
| Cut at every fork point, main line included | 79 | 639 (no duplication) | 81 cards ≈ 26 KB |

Two things in that table are worth stating rather than leaving to be read off it. **Standalone lines cost 6.2× the content** because every shared prefix is written once per line that passes through it — the same multiplication ADR-353 measured in the time domain, where 565 authored commands became 3,854 executed. And **branch-run segmenting does not touch the main line**, which stays one 148-card artifact at roughly 47 KB: the largest single file and the one an author edits most, so the boundary that looks most natural leaves the churn problem standing where it is worst. Segment sizes under that boundary are also extremely uneven — nine segments of a single card against one of 148.

**What is not in evidence.** No measurement has been taken of read or write latency on the 202 KB document, of merge-conflict frequency in practice, or of memory cost in either head. D1 does not rest on any of them: it rests on the whole-file rewrite of committed authored content, which is a property of the format rather than a performance figure.

## Decision

**D1 — The test tree is segmented at rest. One document per story does not hold.** David's ruling, 2026-09-22. `<story-id>.tests.json` as ADR-307 D2 defines it — a single card-recursive JSON document carrying the entire branch hierarchy — is superseded. The tree remains the model (ADR-307 D1's first half stands); what changes is that its at-rest projection is many artifacts rather than one, so that a change to one part of the tree touches one part of the stored form.

**D2 — A segment is the run of cards between fork points, and the main line is cut like any other run** (David, 2026-09-22, Q-1: "c"). A fork point is a card carrying branches. Every such card ends the run it sits in, and each of its branches begins new runs of its own. The boundary is one the model already has rather than one imposed on it by size or depth.

Measured against `secret-letter`: **79 segments holding all 639 cards with nothing duplicated**, median 4 cards, largest 81 (roughly 26 KB). The main line is cut by its own fork points rather than kept whole.

**Rejected: one standalone line per segment**, which costs **6.2× the content** — 3,988 cards stored against 639 — because every shared prefix is written once per line passing through it. It buys a line being a single self-contained artifact, and the price is the same multiplication ADR-353 measured in the time domain.

**Rejected: one segment per branch run with the main line left whole**, which duplicates nothing but leaves the main line a single 148-card artifact at roughly 47 KB — the largest file and the one an author edits most. It is the boundary that looks most natural and it declines to touch the case the churn is worst in, which is the whole reason D1 exists.

**What D2 costs, named rather than discovered later.** A line stops being one artifact. It is a sequence of segments, so reassembling it — to replay it, to run it, to name it in the run column — requires each segment to be identifiable. D2 therefore makes identity structural rather than optional, which is what D5 settles the form of.

**D3 — Segments live in a directory beside the `.story` file: `<story-id>.tests/`** (David, 2026-09-22, Q-2: "a"). ADR-307 D2's placement ruling is preserved rather than reopened — the artifact is still named after the story and still sits next to it; only its kind changes, from one file to a folder of them. A rebuild, a clean or a conversion gets a single directory to act on.

The `git status` difference is the whole of D1's purpose made concrete: today a testing session rewrites 93% of one 6,732-line file, and under D3 it touches only the segments it actually changed, each small enough to read as a diff.

**Rejected: a `tests/<story-id>/` subfolder.** ADR-307 D2 deleted the `tests/` folder because it held nothing else once transcripts stopped being loose files, and while that reasoning no longer applies, reinstating it moves the artifact away from the story it belongs to for no gain.

**Rejected: flat per-segment files beside the story** (`<story-id>.tests.<id>.json`). It is the smallest change from today's rule and the worst outcome — 79 files at the project root, beside the `.story` file the author actually opens.

**A segment's filename is its id** (D5). D3 fixes the directory; D5 fixes what the files inside it are called, and the two were taken in that order deliberately so the layout did not commit the naming scheme in advance.

**D4 — A manifest holds story-level state; segments carry their own parentage** (David, 2026-09-22, Q-3: "a"). One manifest inside `<story-id>.tests/` holds `version`, `story` and `seed`. Each segment declares the segment it descends from and the fork ordinal it descends at; the manifest does not hold the tree's shape.

The property this buys is that **the manifest changes only when the seed or the version changes, never when the tree does.** Adding, reworking or deleting a branch touches the segments involved and nothing else, which is D1's purpose applied to the one file that would otherwise see every edit. It also gives ADR-293's pinned seed exactly one home, which is what that contract requires of it, and keeps the version that gates the reader living with the thing it gates.

**Rejected: a manifest that also holds the tree shape.** It buys the whole structure in one read instead of a directory walk, and it costs a single file that every structural change rewrites — small in bytes, but a hotspot two authors adding branches in different parts of the tree would both edit. That is a miniature of the problem D1 exists to remove, and the read it saves is obtainable by walking the directory once.

**Rejected: no manifest at all**, with `seed` and `version` moving into the story project's config. Fewest artifacts, but it puts ADR-293's pinned-run contract somewhere that is not the test tree, and separates the version from what it gates.

**The manifest's filename is not ruled on here.** It is a fixed, well-known name inside `<story-id>.tests/` — it has to be, since it is what a reader opens first — and which name it is decides nothing this ADR is about. The Affected section leaves it to the plan.

**D5 — A segment carries an opaque stable id, generated once and persisted; display labels stay derived** (David, 2026-09-22, Q-4: "a"). The id is short, meaningless, written into the segment, used as its filename, and is what a child segment names when it declares its parent. Nothing about it encodes position, so nothing about it moves when the tree does.

**This is the "stable identity distinct from its display label" ADR-353 D2 named as missing**, and it retires **half** of ADR-307 Q-8: "nothing persisted" no longer holds, while "labels are derived" stands unchanged. The two rulings were bundled together on the reasoning that a line is a path and therefore not a thing that can be named; D2 makes a segment a thing, which separates them.

**GH #494 is closed by construction rather than fixed.** Sixty-one lines may share thirty-seven derived labels with nothing colliding, because after D5 nothing keys on a label. The run column folding 385 of 566 card results is not a defect to repair under this scheme; it is a state that cannot be reached.

**Rejected: a path-derived id** (`main`, `main.b1@12`). Readable and free to compute, and it changes whenever the tree changes — insert a card upstream and every id below it moves. That is today's defect in a different hat, since a derived id is unstable for exactly the reason a derived label collides, and it would make AC-1 unsatisfiable: an upstream edit would rewrite the filenames of segments whose bytes should be untouched.

**Rejected: author-visible segment names with a rename affordance.** Most legible in a diff and in the run column, and it reinstates both the naming scheme and the collision machinery ADR-307 deleted, while asking an author to name seventy-nine things. Whether authors should be able to name parts of their test tree is a product question about authoring, and this ADR should not settle it as a side effect of choosing a storage key.

**D6 — Each superseded decision gains a note, written by the plan phase that lands the change.** Three decisions elsewhere are overridden by this one, and an unowned Status flip is how a corpus acquires unreliable Status lines. The owner is in every case **the plan phase that lands D1-D5**, and the trigger is that phase's completion — not this ADR's acceptance, which authorizes nothing:

| Superseded | What is overridden | What the owner writes |
| --- | --- | --- |
| **ADR-307 D2** | "The canonical serialization is one JSON document", and the Q-2 resolution naming `<story-id>.tests.json` | A note beside D2 recording that the serialization is segmented by ADR-355 D1-D5, and that D1's "the tree is the model; files are a projection" is what survives |
| **ADR-307 Q-8** | "nothing persisted, no rename affordance" — half of it | A note recording that ADR-355 D5 persists an opaque id; "derived labels only" stands, and no rename affordance is added |
| **ADR-353 D7** | "the tree document … do not change", and "an author on devkit sees nothing" | A note recording that ADR-355 changes the at-rest format and therefore does reach devkit authors; D7's other three subjects — the CLI's role, the assertion core, the pinned seed — are untouched |
| **ADR-340 D5** | `<story>.tests.json` "keeps its name and shape" | A note recording that this one item of the facade moves, and that every other item D5 lists does not |

No ADR's **Status** line flips on account of this: ADR-307, ADR-353 and ADR-340 each keep theirs, because a superseded decision inside a document is not a superseded document. What changes is that each carries a pointer forward.

## Affected

Named because the review found "all affected modules named" failing, and because rule 8b makes this list the definition of what must move together.

**`packages/branch-tester` — the owner.**
- `src/tree-document.ts` — the format itself; `TreeDocument`/`TreeCard`/`TreeBranch`, `TREE_DOCUMENT_VERSION`, `treeDocumentFileNameFor` (`:138`), `serializeTreeDocument` (`:161`), `deserializeTreeDocument` (`:173`). Its closed-grammar and deterministic-serialization invariants carry over to segments unchanged; what changes is the unit they apply to.
- `src/tree-walker.ts` — imports the document types at `:63` and replays them.
- `src/index.ts` — re-exports the format at `:40`.

**`packages/devkit` — the filesystem owner.** `src/commands/test-tree-document.ts`, `src/commands/test.ts` and `src/standalone/story-config.ts` discover, read and write the artifact. Discovery moves from "a file named `<story-id>.tests.json`" to "a directory named `<story-id>.tests/`", which is where the one-shot conversion belongs.

**`tools/ide/web/testing-surface` — the source importer (rule 8b).** `src/main.ts` (`deserializeTreeDocument`), `src/model.ts`, `src/outline.ts` and `src/compose.ts` import from `@sharpee/branch-tester/tree-document`, resolved by three separate aliases that must agree: `tsconfig.json:26`, `build.mjs:30,53`, `vitest.config.ts:26-28`.

**`tools/ide/PaneHost` — the Avalonia head, and the one consumer rule 8b does not protect.** `Shell/StoryProject.cs` and `MainWindow.axaml.cs` resolve the tree artifact by name in C#. They are not type-checked against the TypeScript contract except through ADR-352's generated protocol types, so a name change reaches them silently. The shipping Swift head resolves it too and is in the same position.

**The conversion, which is one-shot and not a migration path.** Six artifacts exist at `version: 1`: `secret-letter`, `fernhill`, `ides-of-march`, the `w10-dance` prototype, `thealderman`, and `packages/branch-tester/tests/fixtures/state-pins`. Steps: read each document with today's reader; cut at fork points per D2; allocate an id per segment per D5; write the directory per D3 and the manifest per D4; delete the old file. `TREE_DOCUMENT_VERSION` moves, so a reader that meets an unconverted document refuses it by the invariant that already exists rather than by a new check. There is no shim, and nothing reads the old shape afterward.

**What the artifacts must carry**, which the decisions determine even though the key names do not follow from them. A **segment** carries: its own id (D5), the id of the segment it descends from and the fork ordinal it descends at (D4) — absent on the root — and its ordered run of cards, each keeping today's card shape unchanged. A **manifest** carries: `version`, `story`, `seed` (D4) and nothing else; in particular not the tree's shape. **The concrete key names, the manifest's filename and the id's alphabet are left to the plan** — they commit the format but decide nothing this ADR decides, and inventing them here would put rulings in David's mouth that he did not give.

**Two failure modes segmentation newly makes representable**, which a single nested document made structurally impossible and which the reader must therefore answer for:
- **A dangling parent** — a segment naming a parent id that no segment in the directory carries.
- **An absent or unreadable manifest** — a directory of segments with no version, story or seed.

Both must be reported the way the existing reader reports what it cannot understand: as MALFORMED, never thrown, with the caller degrading to a fresh empty tree — the behavior `tree-document.ts`'s invariant block already pins. Neither may be silently repaired, because a tree that quietly loses a subtree reads as an author having deleted tests they did not delete.

## End-to-End Scenario

`secret-letter`, whose numbers are the ones measured throughout this document.

**Given** `branch-stories/secret-letter/secret-letter.tests.json` at `version: 1` — 202,002 bytes, 639 cards, 19 fork points, 60 branches.

**When** the conversion runs, **then** `branch-stories/secret-letter/secret-letter.tests/` holds a manifest carrying `seed: 1209` and **79 segment artifacts** whose card counts sum to exactly 639, the largest holding 81 cards, and `secret-letter.tests.json` no longer exists.

**When** an author then adds one command to a branch three levels deep and the tree is written, **then** exactly one segment's bytes change. The manifest does not change, because the seed and version did not. Every other segment is byte-identical, and `git status` shows one small modified file where today it shows a 6,732-line file rewritten by 93%.

**When** an author inserts a card into the main line ahead of the first fork, **then** the segment holding that run changes and every other segment's id, filename and parent reference stay as they were — the property the rejected path-derived id scheme could not offer.

## Acceptance Criteria

Each names what decides it. All are **not met today**, which is expected — this ADR authorizes no implementation.

1. **AC-1 — A change confined to one inter-fork run changes one segment's bytes.** A test mutates a single card in a tree with several fork points, reserializes, and asserts that every other segment's bytes are byte-identical. **SELF-VERIFYING** — under the superseded format the assertion cannot pass, since whole-document serialization rewrites everything; under D2 it can. **Not met today**, and now writable: D2 says what a segment is, so the test can name what should be unchanged.
2. **AC-2 — The cut falls on fork points and nowhere else.** A test builds a tree whose fork points are known and asserts the segment count and each segment's card count match the inter-fork runs exactly — for `secret-letter`, 79 segments totalling 639 cards. **SELF-VERIFYING** — a boundary drawn by size or depth instead produces different counts and fails. **Not met today.**
3. **AC-3 — Nothing is duplicated.** The sum of all segments' cards equals the card count of the tree they came from. **SELF-VERIFYING**, and it is the assertion that rules out the rejected standalone-line boundary, which would report 3,988 against 639. **Not met today.**

4. **AC-4 — An upstream edit does not move any other segment's id.** A test inserts a card ahead of a fork in a multi-level tree and asserts every existing segment's id, filename and parent reference are unchanged. **SELF-VERIFYING** — the rejected path-derived scheme fails it by construction, which is the reason it was rejected. **Not met today.**
5. **AC-5 — Two lines sharing a derived label do not share anything that is keyed on.** A test builds the measured condition — two lines whose derived labels are equal — and asserts their segments carry distinct ids and that no lookup resolves one to the other. **SELF-VERIFYING**, and it is GH #494's assertion restated as a property of the format. **Not met today.**

6. **AC-6 — A segment round-trips byte-identically.** `serialize → deserialize → serialize` is the identity on each segment's emitted bytes, and on the manifest's. **SELF-VERIFYING**, and it is today's AC-1 in `tree-document.ts`'s invariant block applied to the new unit rather than a new requirement.
7. **AC-7 — A dangling parent is MALFORMED, not repaired and not thrown.** A test writes a directory whose segment names a parent id no segment carries, reads it, and asserts the reader reports MALFORMED and does not throw. **SELF-VERIFYING** — a reader that silently drops the orphaned subtree returns a well-formed tree and fails the assertion, which is the outcome the criterion exists to catch.
8. **AC-8 — An absent manifest is MALFORMED, not defaulted.** A test writes a directory of valid segments with no manifest and asserts the reader reports MALFORMED rather than inventing a seed. **SELF-VERIFYING** — a defaulted seed would produce a tree that runs and whose results mean nothing, which is worse than a refusal and is why this is stated as a criterion rather than left to judgment.
9. **AC-9 — The conversion is lossless.** Converting each of the six `version: 1` artifacts and reassembling the tree from its segments yields a tree equal to the one the old reader produced from the old file — same cards, same order, same assertions, same seed. **SELF-VERIFYING** — it compares against the artifact's own prior content, so it cannot pass against a conversion that dropped anything. This is the criterion the one-shot conversion is gated on.

## Consequences

- **ADR-307 D2 is superseded, and D1 is halved.** "The tree is the model; files are a projection" stands and is in fact what makes segmentation expressible. "The canonical serialization is one JSON document" does not. ADR-307's Q-2 resolution is half carried forward and half replaced: D3 keeps the placement it chose — beside the `.story` file, named after the story — and changes the artifact's kind from a file to a directory.
- **ADR-353 D7 is broken, and it was load-bearing for that ADR's framing.** D7 promised that an author on devkit sees nothing, because ADR-353 confined itself to one pane's replay strategy. Segmentation reaches the at-rest format, so it reaches the CLI, `packages/branch-tester`, both heads and the author's repository. ADR-353's other decisions are unaffected — D1's lazy visiting, D4's branch images and D4b's cache location are all indifferent to how the tree is stored — but its claim to be invisible to devkit users is not.
- **GH #494 is subsumed, not fixed separately** (settled by D5). The derived-label collision that breaks the run column stops being a thing to repair and becomes a thing that cannot arise, because nothing keys on a label after D5. The issue should be closed against this ADR rather than worked, and **ADR-353's AC-3** — an unvisited line reads as unvisited, never as its namesake — becomes satisfiable, which it is not today.
- **ADR-307 Q-8 is half retired.** "Derived labels only" stands; "nothing persisted, no rename affordance" does not, since D5 persists an id. The two were bundled on the reasoning that a line is a path and cannot be named; D2 makes a segment a thing, which separates them. No rename affordance is added — D5's id is opaque and not something an author names.
- **Five tree documents exist at `version: 1` and will need converting** — secret-letter, fernhill, ides-of-march, the w10-dance prototype, thealderman, plus the `state-pins` test fixture. Under this project's no-backwards-compatibility rule this is a one-shot conversion, not a supported migration path, and `TREE_DOCUMENT_VERSION` moving is how a reader refuses what it cannot understand. There is no shim to write.
- **ADR-340 D5 is superseded in one particular.** Its facade list promises `<story>.tests.json` keeps its name and shape; D3 changes both. Nothing else on that list moves, and D1's assertion-core ownership is untouched — segmentation is a change to the tree document, which D2 of that ADR already assigns to `branch-tester`.
- **Both consumers move in one commit — and a third does not get that protection.** Rule 8b and `tree-document.ts`'s own header make the IDE surface a direct source importer, so segmentation cannot be staged CLI-first: it lands on both sides together or fails the type checker on both. The Avalonia and Swift heads resolve the artifact by name in C# and Swift and are **not** covered by that guarantee, so their update is a deliberate step rather than one the compiler forces.
- **The assertion core and the pinned seed are not in scope.** ADR-340 D1/D3 put the assertion machinery in `transcript-tester` with `branch-tester` importing it, and ADR-293's seed determinism is a property of the run rather than of the file. Segmentation must leave both untouched. Where the seed is *stored* is settled by D4 — the manifest, exactly one home — which is a different question from what it does.

## Session

Session **a5d716**, 2026-09-22, on `main`. Written at David's rule-11 confirmation ("yes, start the ADR") after he named the problem directly: *"there is a more fundamental problem...the branch json file can't be one tree....it has to be segmented."* The session reached it from the other end — the IDE's branch-testing display degrading on a large surface — and the measurements in Context were taken in that session against `branch-stories/secret-letter/`. The display symptom, the label collision (GH #494) and this format decision were treated as three views of one root only after the numbers were in; the Context section marks which of those connections is observed and which is derived.

**Interviewed and accepted the same session.** Q-1 through Q-4 were resolved one at a time under rule 11a, each folded into the record before the next was posed, becoming D2 through D5. `adr-review` then scored the result **8/20, NEEDS WORK**, and two of its findings were substantive rather than cosmetic: a third superseded decision (**ADR-340 D5**, which promises `<story>.tests.json` keeps its name and shape) was unnamed and was found only by opening the cited target; and the ADR named no owner for any of its supersessions, now answered by **D6** on the pattern ADR-340 D1 set for itself. The remainder were repairs to the interview's own folds — eleven stale `Q-n` references, a D3/D5 contradiction over filenames, a stray sentence left by a deleted block, and a hedge dropped from the ADR-307 Q-8 quotation. An **Affected** section, an **End-to-End Scenario** and **AC-6 through AC-9** were added in the same pass; re-review came back clean at 20/20, and David accepted on it.

**One deferral is deliberate and is not an omission.** The concrete key names, the manifest's filename and the id's alphabet are left to the plan. They commit the format but decide nothing this ADR decides, and writing them here would record rulings that were never given.

