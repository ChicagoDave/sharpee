# Where secret-letter's test tree churn comes from

**Measured**: 2026-09-29, session e31b07 (Claude Code), at Desktop Claude's request relayed by David. Read-only; nothing in the repository was changed to produce it.
**Subject**: `branch-stories/secret-letter/secret-letter.tests.json`, and the ADR-355 plan at `docs/work/segmented-test-tree/plan-20260929-adr-355.md`.

## 1. Where the churn comes from: almost all of it is formatting

Commits were ranked by lines changed with `git log --numstat -- branch-stories/secret-letter/secret-letter.tests.json`. For the worst three, each side of the commit was also parsed and re-emitted in one canonical form (`json.dumps(sort_keys=True, indent=2)`) and diffed, so only real content differences remain.

| Commit | Raw diff | `git diff -w` | Real change (canonical diff) | What actually changed |
|---|---|---|---|---|
| `35a0b5e7e` (2026-09-22, the 93% rewrite ADR-355 cites) | +6,274 −5,718 | +2,342 −1,786 | +606 −50 | 73 cards added (566 → 639), 77 assertion entries added (965 → 1,042) |
| `3a083b231` (2026-08-31) | +5,972 −5,793 | +179 −0 | +179 −0 | 16 cards added (546 → 562), nothing removed |
| `b84ab98c6` (2026-08-24) | +1,410 −1,389 | +27 −6 | +27 −6 | 2 cards added (155 → 157) |

Real content is 5.5%, 1.5% and 1.2% of those diffs.

The file's history shows why. It has been written in three formats, and it switched between them five times:

- **2-space, keys sorted**, which is `serializeTreeDocument`'s canonical form: `fa1f33db5` (the first commit), then `35a0b5e7e` onward.
- **2-space, keys in insertion order** (`type` before `assertions`): `422529234` through `d248dda8b`, and `b84ab98c6` through `434bfeb88`.
- **1-space, keys in insertion order**: `3037edc0c` through `1a4892aca`, and `3a083b231` through `d1f6eac69`.

`3a083b231` and `b84ab98c6` are almost entirely re-indentation between 1 and 2 spaces, which `-w` hides. `35a0b5e7e` was the first canonical save after the 1-space period, so as well as re-indenting, it re-sorted every card's keys. Sorting moves lines, which `-w` cannot hide; that is why its `-w` diff is still large.

No code in the repository writes 1-space JSON or insertion-ordered keys to a tree document. Those formats came from outside the serializer, most likely edits scripted during the Secret Letter port sessions. That attribution is unconfirmed; no session record says so.

## 2. How cards are identified: by position

- **Cards have no id.** A card is addressed by its index in its parent's `cards` array.
- **A fork is the card that holds a `branches` array.** The only id in the format is each branch's numeric `branch` field.
- **Branch ids are not stable either.** When the testing surface loads a tree, it renumbers colliding branch ids (`tools/ide/web/testing-surface/src/model.ts:173-193`).
- **Every save rewrites the whole tree.** A save calls `serializeTreeDocument(this.doc)` (`model.ts:152`) and posts the full text to the host.
- **A save cannot reorder anything; it can only reformat.** The serializer keeps array order, so it never moves cards or branches. It re-sorts keys and normalizes the indent. The first save after any non-canonical write therefore rewrites every line, which is what happened in `35a0b5e7e`.

## 3. Could `contains` claims become `emitted <phrase-id>`?

All 2,074 `contains` claims (1,378 distinct) were compared, after whitespace normalization, against `branch-stories/secret-letter/dist/secret-letter.ir.json`. That IR has 1,458 phrase keys and 1,620 variants, 42 of which carry markers or placeholders. It was built on 2026-09-27 and the story's sources were last committed on 2026-09-08, so it is current.

| Match against the IR | Claims | Distinct |
|---|---|---|
| Exactly equals one variant of one phrase key | **453** | 383 |
| Exactly equals text shared by several phrase keys | 27 | 18 |
| A fragment of exactly one phrase | 972 | 738 |
| A fragment of several phrases | 165 | 96 |
| Text outside the phrase table (room names such as "Jail Cell", "Southern Gate", "Closed Alleyway") | 300 | 83 |
| Not in the IR verbatim (engine and stdlib text such as "Time passes"; templated text such as "the knife off its display") | 157 | 60 |

- **453 claims (22%) convert cleanly.** Each exactly equals one phrase key's text, so it can be written as `emitted <phrase-id>`.
- **Up to 972 more (47%) could convert.** Each can be traced to a single phrase, but `emitted` would be a different claim: "this phrase fired" instead of "this part of the text appeared".

## 4. Does the ADR-355 plan address causes 1 and 2, or only file size?

Mostly file size. Segmenting limits how far a canonical edit spreads, and it gives forks and branches stable, persisted ids, which fixes the renumbering half of cause 2. It does not touch the measured main cause. Nothing in the plan makes the serializer the only writer, and nothing checks that the files on disk are in canonical form: the new reader accepts any valid JSON regardless of indent or key order. So a scripted edit that rewrites segments in another format would still touch every file it writes, and the next save would touch them all again. Cards inside a segment are also still addressed by position.

Closing cause 1 takes two things: a single canonical writer, and a check that fails whenever a tree file's bytes differ from their canonical form. That is small work, and it would have prevented about 95% of the churn measured above, with or without segmentation.

## Desktop Claude's recommendation, and Claude Code's response

Desktop Claude recommended three steps, in this order:

1. **A canonical gate, now.** One writer, `serializeTreeDocument`, plus a check (a pre-commit hook, or `sharpee test`) that fails when a tree file's bytes differ from its canonical form. It is the `prettier --check` pattern: small work, and it would have prevented about 95% of the measured churn.
2. **Stable card ids, in ADR-355.** Segmenting fixes branch renumbering, but cards are still addressed by position. That causes no churn today, but anything that has to point at a card (impact queries, run history, span links, a future SQLite index) breaks as soon as a card is inserted above it.
3. **`emitted <phrase-id>` for the 453 exact matches.** It is a mechanical conversion, and those claims stop breaking when prose is edited. The 972 fragment matches are a judgment call per claim, since "this phrase fired" is not the same assertion as "this text appeared."

Claude Code agreed with all three, in that order. Checking them against the code turned up one detail for each:

1. **The canonical gate fits the segmented format directly.** "Canonical" becomes: every file equals `segmentTree(assembleTree(files))` byte for byte. Phase 1 of the ADR-355 plan (built, uncommitted, on `feat/segmented-test-tree`) already provides both functions, so the check is about ten lines. It belongs in `sharpee test`, where a non-canonical tree fails with a clear error, and in a local pre-commit hook. Neither runs in CI, so the no-CI-gates rule holds. The reader itself should keep accepting any valid JSON; otherwise a hand edit would make the tree unreadable instead of just flagged.
2. **Card ids amend ADR-355 rather than implement it.** ADR-355's Affected section says cards keep "today's card shape unchanged", so adding an `id` to every card changes what David accepted and needs his ruling. It is not a big lift: Phase 1's id machinery (`createSegmentId`, `ensureSegmentIds`) extends to cards directly. The cost is 1,470 new id lines in secret-letter's tree, and it does not break AC-1, because each card's id lives in its own segment.
3. **`emitted` needs no platform work.** The claim already exists in the assertion core (ADR-356 D3, `packages/transcript-tester/src/assertion-core.ts:171`). The derived tier writes it as `emitted <phraseKey>` (`packages/branch-tester/src/derived-runner.ts:294`), and a tree card carries it as a `states` entry. So the 453-claim conversion is a script over the tree. The catch: the Secret Letter port is on hold, and the tree is that story's content, so converting it means editing a held story. That is David's call.

**Proposed next step (not started; held pending David's go):** add the canonical gate and card ids to the ADR-355 plan as a new Phase 1b, and draft the card-id amendment to ADR-355 for David's ruling. The `emitted` conversion waits until David decides whether secret-letter can be touched while it is on hold.
