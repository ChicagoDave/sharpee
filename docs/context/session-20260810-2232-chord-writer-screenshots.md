# Session Summary: 2026-08-10 (CDT) - main

## Goals
- Resize, rename, and integrate five macOS screenshots of Chord Writer into the Chord Writer section of sharpee.net.

## Phase Context
- **Plan**: `docs/work/ifid/plan-20260810-adr-309-tool-owned-ifid.md` — **Plan Status: DONE** (closed in session ed3730, prior to this session).
- **Phase executed**: N/A — this session did off-plan website work; no plan phase was advanced, and none needed to be (the IFID plan was already fully closed before this session started).
- **Tool calls used**: 84 (from `.session-state-c86356.json`; no phase budget applies).
- **Phase outcome**: N/A — not plan work.

## Completed

### Screenshot processing
- Five originals (1767x1012 / 1526x1012 macOS window captures with transparent drop-shadow margin) in `website/src/app/chord-writer/screenshots/` were resized with ImageMagick/Lanczos to 1560px wide (2x the site's 860px content column), `-strip`, png compression 9, and renamed by content into a new directory `website/src/images/chord-writer/`: `play.png` (470K), `play-themes.png` (586K), `testing.png` (697K), `documentation.png` (502K), `publish.png` (618K) — 2.9 MB total.
- `sips` resampling was tried first and rejected (larger files, softer text); 256-color quantization was measured and rejected (704K to 580K only, dithering hurt compression) — ImageMagick/Lanczos with `-strip` won on both size and clarity.
- Originals in `website/src/app/chord-writer/screenshots/` (2.1 MB, untracked) were deleted on David's explicit confirmation ("yes delete the originals").

### `<Screenshot>` component
- New `website/src/components/screenshot.tsx`: a `SHOTS` registry holding one static `next/image` import per screenshot plus its alt text (alt lives with the image, not with whichever page displays it), typed `as const satisfies Record<string, Shot>` so `ScreenshotName` is the union of registry keys.
- Registered in `website/src/mdx-components.tsx` so any `.mdx` file can write `<Screenshot name caption />` with no per-page import.
- Figure cancels the article's horizontal padding (`-mx-6 sm:-mx-10`) to span the full 860px column, adds no border/radius/shadow (captures already carry their own chrome), uses `h-auto w-full` (the static import's intrinsic 1560px width would otherwise overflow), and wraps the image in an anchor to the full-size PNG (`cursor-zoom-in`) since an app window scaled to a text column loses its smallest labels.

### Placement and content corrections
- Placed: `play` + `documentation` on `/chord-writer` (`content.mdx`, under "The window" and after the tab table); `play-themes` + `testing` on `/chord-writer/building-playing-and-testing`; `publish` on `/chord-writer/publishing`.
- Corrected the project-pane group list in the overview — it said "Story, Walkthroughs, Transcript Tests, Assets, Web Template, and Other"; "Transcript Tests" retired with the ADR-307 cutover and "Feelies" was never listed. Fixed against `tools/ide/SharpeeIDE/Project/ProjectArtifacts.swift` (`ArtifactGroup.Kind`: story, walkthroughs, assets, feelies, webTemplate, other).
- Added a new paragraph documenting the Play theme picker (previously undocumented, so the new screenshot of it would have been unexplained): it is app chrome, not a story edit — "Story Default" plays the theme the story header asks for, a manual pick overrides only that pane for that user. Verified against `tools/ide/SharpeeIDE/Play/PlayViewController.swift` (`playSurfaceScript` / theme enforcement).

## Key Decisions

### 1. New image directory, not reuse of the screenshots capture folder
`website/src/images/chord-writer/` holds the processed, committed assets; `website/src/app/chord-writer/screenshots/` was the disposable capture-and-crop workspace and was deleted once processing was verified. Keeps the app-route tree free of source-asset clutter.

### 2. Registry-based `<Screenshot>` component over per-page `next/image` imports
Centralizing alt text with the image (not the page) avoids alt-text drift as screenshots get reused across pages, and gives every `.mdx` file the component for free via `mdx-components.tsx`.

## Next Phase
Plan complete — all phases done (no plan phase was in scope for this session's work).

## Open Items

### Short Term
- The download page and `your-first-story` page remain text-only — only `/chord-writer`, `/chord-writer/building-playing-and-testing`, and `/chord-writer/publishing` were illustrated this session.
- Chord Writer DMG still waiting on Apple notarization: `xcrun notarytool info 90a8dfb6-5989-4c36-898f-5cf74b0191ee --keychain-profile dc-notary`.
- Homepage CTA still points at the CLI install page rather than the new download page.

### Long Term
- ADR-308 testing-navigation interview (5 open questions) not started.
- Splice gesture chrome unruled.
- Module projects have no test path post-ADR-307.
- branch-tester runner carries unreachable transcript-directive support.
- `package.sh` should poll rather than `--wait`.
- Go-live plan bookkeeping (Phases 5/6/6a-6f supersession stamps) outstanding.

## Files Modified

**Website content/component** (4 files):
- `website/src/app/chord-writer/content.mdx` - added `play` and `documentation` screenshots, corrected project-pane group list
- `website/src/app/chord-writer/building-playing-and-testing/content.mdx` - added `play-themes` and `testing` screenshots, documented the Play theme picker
- `website/src/app/chord-writer/publishing/content.mdx` - added `publish` screenshot
- `website/src/mdx-components.tsx` - registered `<Screenshot>` for all `.mdx` files

**New** (6 files):
- `website/src/components/screenshot.tsx` - `SHOTS` registry + `<Screenshot>` figure component
- `website/src/images/chord-writer/play.png`, `play-themes.png`, `testing.png`, `documentation.png`, `publish.png` - processed screenshots (1560px wide, 2.9 MB total)

**Deleted** (untracked, 5 files):
- `website/src/app/chord-writer/screenshots/*` - originals, removed after processing on explicit confirmation

## Notes

**Session duration**: ~25 minutes (22:32-22:57 CDT).

**Approach**: Process images first (compare sips vs ImageMagick vs quantization), build the reusable component, place + verify with a real Next.js build/serve/screenshot round-trip, then delete originals only after visual confirmation.

**Gotcha for future sessions**: macOS screenshot filenames use U+202F (NARROW NO-BREAK SPACE) before AM/PM in the timestamp — `cp "Screenshot ... 10.25.51 PM.png"` fails with "No such file or directory" even though `ls` shows the name correctly. Match by glob fragment (`*10.25.51*`) instead of typing the literal name.

---

## Session Metadata

- **Status**: COMPLETE (unverified: playwright visual placement check, WebP content-type/size verification, search-index generator inspection — narrated by the session, not corroborated against an event-log row or an independent re-run)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (website + docs only, no `packages/` changes)

## Dependency/Prerequisite Check

- **Prerequisites met**: ImageMagick available for resizing; David supplied all five source screenshots; Next.js dev/build toolchain and playwright (1.59.1, repo pnpm store) available for verification.
- **Prerequisites discovered**: None.

## Architectural Decisions

None this session.

## Mutation Audit

N/A — website content/markup and static asset changes only, no state-changing application logic.

## Recurrence Check

- Similar to past issue? NO.

## Test Coverage Delta

- Tests added: 0 (no test suite covers marketing-site content; verification was a manual build/serve/screenshot pass, not an automated test).
- Tests passing before: N/A → after: N/A — no test framework applies to this change.
- Build claim — corroborated: event log `docs/context/.devarch-events-c86356.jsonl` records `{"kind":"build","msg":"Build passed","detail":"npm run build 2>&1 | grep -iE \"error|warn|Compiled|✓|search-index\" | head -20"}` at `2026-08-11T03:40:35Z`, and a second `Build passed` row at `2026-08-11T03:42:51Z` for `npm run build 2>&1 | grep -iE "error|fa..."` — the latter is timestamped after the last edit to `website/src/components/screenshot.tsx` (`2026-08-11T03:42:41Z`), so it is fresh evidence for "build GREEN" as currently written.
- Remaining claims — `[reported by session, unverified]`: `next start` + curl markup check (`<figure>`/`<a>`/`<img>`, generated srcset); `next/image` optimizer serving WebP (`w=1080&q=75` → `image/webp`, 62,172 bytes; full-size PNG 200, 618,206 bytes); headless-Chromium (playwright) full-page screenshots at 1280px on all three modified pages (placement, no horizontal overflow, captions correct); `website/scripts/build-search-index.mjs` inspection confirming its `<[^>]+>` strip handles multi-line `<Screenshot …/>` tags. None of these produced an event-log row this agent could corroborate against, and this write did not independently re-run them.
- Known untested areas: no automated regression coverage for MDX screenshot placement or the search-index generator's tag-stripping behavior — both were checked manually this session only, per the unverified claims above.

---

## Addendum — session corpus consolidated (2026-08-10 23:40 CDT)

After the screenshot work was committed, David asked to **move** the repo's session
archive into the historical corpus "so it's all together" — the first step of a fresh
retrospective he wants Opus 5 or Fable 5 to do over the whole project history.

- **Blocked, then rerouted**: the intended destination,
  `/Volumes/Backup/surface-archive/sharpee-archive/context-history/`, is **NTFS mounted
  read-only** — macOS cannot write it without third-party drivers. rsync failed on the
  first file and the destination was confirmed untouched. David chose
  `/Volumes/Workspace` (APFS, 878 GB free) instead.
- **Consolidated** at `/Volumes/Workspace/sharpee-corpus/`: `context-history/` (1,533
  files, 2025-12 → 2026-08) and `work-history/` (12 files, 2025-01 → 2025-07), 15 MB.
  Union of three sources — the backup drive's two directories plus the repo's
  `docs/context/archive/`. Ten filenames collided (`session-20260218-*-main.md`), all ten
  byte-identical: 1,080 + 463 − 10 = 1,533, reconciled exactly.
- **Verified before deleting anything**: every file from all three sources compared with
  `cmp` against its copy — 1,098 + 20 + 440 checked, zero missing, zero mismatched.
- **Repo side**: `docs/context/archive/` removed (441 tracked deletions — 440 summaries
  plus one `.devarch-events-8c2c77.jsonl` predating the ignore rule; 22 further hidden
  event logs were already ignored). `docs/context/` keeps only the five live August
  summaries, so DevArch's recap and pre-session audit still have their handoff.
- **Provenance written** to the corpus root README: source layout, the count
  reconciliation, why Workspace rather than Backup, the three filename conventions across
  the span, and the ~366 files that are plans/checklists rather than session summaries and
  must be filtered out of any per-session analysis.
- **Corrected an earlier claim of mine**: the corpus does not begin at the 2025-12-27
  kickoff — `work-history/` carries summaries from 2025-01-03 and a June–July 2025 run, so
  the span is ~19 months, not one year.
- **Memory updated**: the note saying to keep `docs/context/archive` in place was rewritten
  to point at the corpus. David's ruling when that prior instruction was raised against the
  move: *"this **is** the analysis."*

Retrospective approach agreed but not started: index mechanically first, read by month
into a fixed schema, then read the monthly digests for throughlines, verifying against git
and ADRs rather than the self-reported summaries. `chat-history/` (36 MB of raw exports) is
deliberately out of scope.

---

## Addendum — retrospective plan run to completion (2026-08-11)

The five-phase retrospective agreed above was planned and executed in full this session
(`docs/work/history-retrospective/plan.md`, **Plan Status: DONE**), covering Sharpee's
development history from the March 2023 C# prototypes through the 2026-08-10 5.0.0 npm
publish.

- **Phase 1 — mechanical indexing**: every source indexed without interpretation — 1,542
  corpus files, 318 ADRs, 235 conversations, 2,055 commits, and the three C# prototypes.
  Six indices (`.md` + `.json` pairs) plus per-month manifests, all machine-generated and
  re-runnable via the ten build/extract scripts now committed under `output/`.
- **Phase 2 — origin narrative**: wrote and dated the pre-repo era (`origin-narrative.md`),
  reversing the prior addendum's scoping of `chat-history/` — the plan brought it back into
  scope (sampled, not read whole) because it is the only record of the 2024 design period,
  nine months before the repo exists.
- **Phase 3 — monthly digests**: 13 parallel readers covered 1,247 session summaries into a
  fixed schema (shipped / broke / decided / carried forward), surfacing 113 contradictions
  between the summaries' self-reported claims and git's actual record
  (`monthly-digests.md`, `gaps-and-anomalies.md`).
- **Phase 4 — throughlines**: eight cross-cutting arcs traced across the whole span (text-service
  born and deleted, the transcript grammar built and cut, Tauri/zifmia set down, Chord's
  invention, and others), each verified against git rather than trusted from the digests
  (`throughlines.md`).
- **Phase 5 — adversarial verification**: 41 load-bearing claims handed to independent
  verifiers — 20 confirmed, 19 corrected, 2 refuted — and only surviving wording made it into
  the deliverables (`verification.md`, `testimony.md`).

**Precedence ruling folded into `docs/proposals/docs-consolidation.md`**: P-3's "out of
scope" bullet for `docs/context/archive/` is stamped SUPERSEDED. David's resolution when the
2026-08-08 standing direction was raised against the 2026-08-10 consolidation: the two
rulings answer different questions — the standing direction governs DevArch's own operation
(where the tooling keeps its session records), the consolidation serves analysis, and
analysis wins when the two collide over the same files.

**Where things live**: the corpus itself (15 MB, 1,545 files) deliberately stays on
`/Volumes/Workspace/sharpee-corpus/` and is not committed — this session commits only the
~2.3 MB of outputs (`docs/work/history-retrospective/output/`: `retrospective.md`,
`timeline.md`, `timeline-graphic.html`, the evidence files, the six indices, the manifests,
and the ten re-runnable scripts), so the work is not held on one external drive. `.current-plan`
now points at `docs/work/history-retrospective/plan.md`.

---

## Addendum — notarization, and a defect this session shipped (2026-08-11 morning)

### The screenshots broke the IDE's Documentation tab, and it reached Apple

The `<Screenshot>` component added last night is read by **two** consumers: the
website, and `tools/ide/web/docs-tab/build.mjs`, which bundles the same
`content.mdx` files into Chord Writer's Documentation tab. The bundler did not
know the component and refused — correctly, by design ("the IDE would silently
drop them"). Three things then went wrong in sequence:

1. `build.mjs` called `rmSync(outDir)` **before** that validation, so the throw
   left the output half-deleted: `pages/` written, but `index.html`, `docs.js`,
   `docs.css` and `docs-index.json` gone.
2. `build-docs-tab.sh` downgraded the failure to a **warning**, so Xcode continued.
3. The archive was built, signed, and **submitted to Apple** with a Documentation
   tab that had pages and no shell to render them. Verified in the artifact:
   `Chord Writer.app/Contents/Resources/docs-tab/` contained exactly `pages`.

Submission `041e7810-8bba-47e2-b99d-91682d607b72` is therefore **defective and
orphaned** — do not ship it even if Apple accepts it.

**Fixes, one per link:**
- `src/mdx.mjs` renders `<Screenshot name caption />` as a markdown image plus an
  emphasised caption; `build.mjs` copies `website/src/images/` into the bundle
  (5 images) so the IDE's docs match the site.
- `build.mjs` now writes everything to `docs-tab.staging/` and swaps it into place
  only on full success. **Real-path test**: injected a deliberate throw — build
  exits 1 and all six entries of the previous bundle survive untouched.
- `build-docs-tab.sh` treats a build script that ran and failed as an **error**
  (absent node stays a warning, which is what that rationale was written for),
  with `DOCS_TAB_OPTIONAL=1` as a deliberate opt-out.

### package.sh: the Ledga m1/m2/m3 resume pattern, ported

`notarytool submit --wait` crashed with `Bus error` 4 of 4 attempts, always inside
the wait, never the submit. David: *"the entire m1-2-3 thing I did for ledga was
because of that --wait error."* Ported that pattern:

- Never waits. Submits, records the id in `release/.notarize-state`, exits 0 with
  "still in the queue". Re-running resumes and staples the moment Apple accepts.
- **Resume is the default**; `--rebuild` is how you ask for a fresh build. A
  rebuild would produce different bytes and orphan a queued ticket.
- The signed app is staged to `release/` immediately after signing and everything
  downstream reads that copy — fixing the 2026-08-10 loss where the app died in
  `/var/folders` while its ticket sat in the queue.
- Both steps idempotent via `stapler validate`; ledger cleared on success.
- **Bugs found by running it, not reading it**: the resume hint printed a flag the
  user never passed (`${VAR:+…}` treats `0` as set), and `--rebuild` did not clear
  the ledger — so it checked the OLD submission and would have tried to staple a
  ticket issued for different bytes. Both fixed.

### Notarization account mystery (resolved enough to proceed)

`info` returned `In Progress` at 09:35 and `Submission does not exist or does not
belong to your team` at 09:40, with `history` empty throughout. Ruled out the
keychain by querying with inline credentials (same Team Key, no stored profile):
identical result, so the stored profile was faithful. After David sorted out
which App Store Connect account he was in and removed a stale Wizely identity
(`security find-identity` went 3 → 2; the Developer ID for `54CCCRZJ3X` untouched),
a fresh submit worked and `history` now lists exactly one submission — today's.
Reading: last night's tickets belonged to a different team. Inference, not fact.

**Current state**: corrected app submitted as
`8fe1892f-d770-41e4-9b93-db7744e50e4a`, ledger seeded, app staged at
`tools/ide/release/Chord Writer.app` with a full docs-tab. `./tools/ide/package.sh`
resumes when Apple answers.

### Open items added
- Chord Writer DMG blocked on notarization of `8fe1892f-…`; `041e7810-…` orphaned.
- The accepted → staple → DMG → submit → staple path in `package.sh` is **untested**
  (Apple has not answered). Read, not run.
- `19519494427` — an Apple reference David supplied; role unidentified, recorded here
  so it is not lost.

---

## Addendum — ADR-310 and ADR-311, written while waiting on Apple (2026-08-11 midday)

### The audit that started it

David asked how much of Sharpee's NPC psychology is mapped to Chord. Answer:
**none of it.** `@sharpee/character` (ADRs 141–146, April 2026) holds personality,
mood, disposition, five-dimension cognitive profiles, goals, influence/resistance
and information propagation. Chord's `npc` manifest holds `guard`, `follower`,
`wanderer`, `patrol`, `route`, `move-chance` — that is `@sharpee/plugin-npc`,
movement only. Conversation is the near-miss: Chord wired ADR-239 topic tables,
not `character/src/conversation/dialogue-extension.ts`.

Two checks David asked for, both run:
- **Has it rotted?** No. 19 test files, **301 tests passing**, `tsc` clean,
  stamped 5.0.0 and published to npm 2026-08-10. A fully working package with
  **zero consumers** — the only reference outside its own source is one line in
  the `@sharpee/sharpee` umbrella's dependencies.
- **Does it fit Chord?** Yes, almost without invention, because ADR-141's
  vocabulary was designed in natural language (`very honest`, `wary of`,
  `nervous`) with word→number tables — which is exactly ADR-222's compile-down.

### ADR-310 — the character model in Chord (DRAFT, D1–D13, 7 open questions)

Written, then expanded three times on David's rulings:
- **Initial draft deferred goals/influence/propagation** as "strategies, not
  attributes." David: those are the ground-breaking capabilities. **D1 records
  the deferral as wrong** — `patrol with route [...] and wait-turns 5` is already
  a declared strategy in shipping Chord. All six subsystems now map (D7 goals as
  named ordered blocks, D8 influence block + one-line `resists`, D9 propagation
  as a manifest where the `selective` keyword disappears entirely).
- **D12**: *"the player must never see or sense the mechanics, only the
  behaviors."* No mood words in prose, no meters, no state readouts. ADR-146's
  `witnessed`/`resisted` messages are already the right shape. Author-side
  introspection rides its own channel (ADR-163) and cannot reach a published
  story.
- **D13**: phrases gate on psychological state. Chord already does this twice —
  `phrase kettle-softened when it is softened` (Fernhill:667) and `define
  phrasebook midnight-voice while midnight` (Fernhill:1133). A phrasebook is a
  voice, so a state selects a voice rather than a hundred conditionals. New work
  is `while`/`when` accepting entity-scoped predicates.
- **D4**: authors compose, name and ship their own cognitive profiles (five
  dimensions × three words), correcting an earlier draft that put custom profiles
  out of scope — contradicting `cognitive-presets.ts`'s own header.
- **D5**: presets renamed to behavior, not diagnosis — `clear-headed`, `fixated`,
  `elsewhere`, `loosened`, `fogged`, `braced`, `unmoored`, `unquiet`. Also
  removes the `stable` preset/`lucidity: stable` name collision.
- **D11a**: David ruled the subsystem greenfield — *"we're safe to normalize it
  and align it to Chord properly."* So the work is not wrapping the builder but
  reshaping both surfaces to one design while zero consumers make it free.

### ADR-311 — the visual novel client (DRAFT, consumes ADR-310)

An author wants to build a visual novel. Thesis: **a portrait is a phrasebook in
another medium** — the same interior state, rendered as image instead of prose.
So it is a renderer (ADR-165), not a fork: one `.story`, one engine, one channel
stream, and the same story must run in both clients.

Most of it already exists — Chord declares `define image`/`define music`/`define
sound` (all three in Fernhill), channels are declarable, and ADR-137's own table
already names a Conversation Mode whose commands are "dialogue choices." D3 keeps
the wire carrying state (`{entity, speaking, state}`) not filenames; D7 notes
ADR-310 D12 is easier to violate here (no affection meters); D8 makes
accessibility a decision that constrains syntax rather than a later pass.

Open question 1 is the deep one: **what does a VN do with the world model**, given
VNs are not spatial and Sharpee's engine is built around a world.

### Notarization

Submission `8fe1892f-d770-41e4-9b93-db7744e50e4a` still In Progress at 12:29
(~2h). Orphan `041e7810` also still queued — ignore whatever it returns.

### Also this session
- **Tagged `v5.0.0` at `87a00365`** (annotated, carries publish run 31444888366),
  not at HEAD: main has moved 18 commits since the npm publish, though
  `packages/` is functionally identical (the one diff is a comment-only header).
  Last tag before this was `v2.2.0` — 3.0.0 and the 4.x series shipped untagged.
  David declined backfilling previous releases.
- Support branch deliberately **not** created: the tag is the durable anchor,
  `git switch -c support/5.0.x v5.0.0` is the response to an actual bug.

---

**Progressive update**: Session completed 2026-08-10 22:57 CDT; addendum 23:40 CDT; retrospective addendum 2026-08-11; notarization/docs-tab addendum 2026-08-11 11:05 CDT; ADR-310/311 addendum 2026-08-11 12:45 CDT
