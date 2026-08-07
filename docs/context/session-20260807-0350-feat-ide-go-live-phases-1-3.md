# Session Summary: 2026-08-07 03:50 — feat/ide-go-live-phases-1-3 (CDT)

## Goals

Go-live work was paused. Two threads instead:

1. A design conversation about pushing the ADR corpus into SQLite (+ MCP). No action taken.
2. A reported bug — the published zip failed to open from `file://` — which turned into
   the publish-artifact work below.

## The `file://` defect

David unzipped a published fernhill and opened `index.html`:
`Fetch API cannot load file:///…/story.story due to access control checks`.

**Cause**: Chord bundles shipped the `.story` SOURCE and compiled it in the browser at boot
(David's ruling 2026-07-18). The entry called `fetch('./story.story')` and
`fetch('./imports.json')`. `fetch` cannot read a `file://` URL in any browser, so the artifact
worked over HTTP (itch.io, a local server) and died on a double-click — which is why it
shipped. Module (non-Chord) projects were unaffected.

**Fix**: embed the compiled IR. `stampStoryIR` writes `story-ir.ts` beside the entry, exactly
as `version.ts`/`hatch-modules.ts` are, and the entry calls `createStory(storyIR)` directly.
No fetches, no compiler on the page. Boot-time gate diagnostics became unreachable by
construction — the build already runs the gates.

## Decisions (David's)

1. **Publishing the `.story` source is an author choice, default NO.** Claude had proposed
   inlining the source and keeping it in the bundle; David reversed it. Inform's
   `Release along with the source text` is the precedent and defaults the same way.
2. **`publish-source:` header field**, kebab in the header / `publishSource` in AST+IR.
   Accepts `yes`/`no` (and `true`/`false`), case-insensitive; anything else is a parse error.
   First boolean header field. Chosen over a CLI flag so the choice travels with the story
   and a terminal publish equals an IDE publish (ADR-284 D1).
3. **`feelies/` folder** — player-facing extras (map, letter, clipping), copied AS A FOLDER,
   distinct from `assets/` (media the story consumes, copied flat). Inform's `.materials`
   was the reference; Sharpee already had the folder half via `assets/`.
4. **The IDE Publish checkbox was built, then removed** — it rendered label-less and
   unclickable (an `NSButton` inside an `NSOutlineView` group-row cell does not receive
   clicks). David: drop it, document the field as part of the Story block instead.
5. **The shipped source keeps the author's filename.** It was renamed `story.story` only
   because the page fetched a fixed path; that reason is gone, and the generic name made a
   received source hard to place and collided between stories.
6. **`sharpee init` scaffolds the folders** with a root `README.md` explaining them —
   "we need to be demonstrative about capabilities."

## Completed

- **chord**: `publish-source:` through `parser.ts` / `ast.ts` / `ir.ts` / `analyzer.ts`, named
  in the closed-schema error and the IDE syntax highlighter. +5 tests.
- **devkit**: IR embedded in the bundle; source + `imports.json` gated on `publishSource` and
  shipped under the author's filename; `feelies/` copied as a folder; `init` scaffolds
  `assets/ feelies/ walkthroughs/ tests/transcripts/` with `.gitkeep` plus a root README.
  +7 tests net.
- **IDE**: `ArtifactGroup.Kind.feelies` — its own project-tree group, folder-backed for
  Reveal in Finder. `StoryHeaderLines` extracted so `StoryHeaderIFID` and the (now unused)
  publish-source reader cannot drift. `EditorViewController.replaceText` generalizes
  `insertText`. +12 tests.
- **Docs**: the header-field table, the closed-schema error, a publishing section and a
  feelies section on sharpee.net (LIVE SITE), plus the IDE's bundled docs rebuilt.

## Evidence

- Real `sharpee publish` of fernhill, artifact unzipped and inspected: zero `fetch('./…')`
  in `game.js`, the compiler-only parser string absent, IR format stamp present.
- The embedded IR loaded through the REAL `story-loader`'s `createStory` in Node —
  "createStory OK : The Folly at Fernhill | id fernhill".
- After David set `publish-source: yes` on fernhill, a second real publish shipped
  `fernhill.story` (not `story.story`).
- Real `sharpee init demo -y`: folders and README present as designed.

## Notes

- **`.gitkeep`, not per-folder READMEs**: the build copies `assets/`+`feelies/` wholesale and
  skips only dotfiles, so a README inside either would ship to players. Pinned by a test.
- **A test used the LIVING fernhill as a fixture** and broke when David added
  `publish-source: yes` to it mid-session. Retargeted to derive its expectation from the
  header, matching what the version assertion already did.
- Three copies of the assets-copy logic exist (browser-core, build-browser, repokit).
  Feelies landed only in browser-core — the path `publish` runs.
- Agents: none run. The DevArch session gate was cleared after doing the startup steps
  inline; this session was told not to call agents unasked.

## Open Items — the tech debt

### Needs David
- **ADR amendments**: this reverses the 2026-07-18 compile-at-boot ruling and touches
  ADR-210/251 (imports resolve at build), ADR-284 (artifact contents), ADR-298 (new field,
  first boolean). Built first per the IDE-primacy directive.
- **`StoryHeaderPublishSource.swift` + its 11 tests are orphaned** since the checkbox came
  out. Delete, or keep for a future Publish-tab read-only display?

### Carried
- **Cover art** — Treaty of Babel, ADR-074 already commits to Babel; the publish artifact has
  no cover-art slot. David's reason for pausing go-live.
- **Nothing surfaces feelies to the player.** They ship; no client UI links them.
- No project-layout page on sharpee.net, so `assets/` is still undocumented there and the
  feelies docs had to go on the story-header page.
- The IDE's `.gitkeep`-only folders show as empty groups until an author adds files —
  unverified how that reads in the tree.

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Suites at session end**: `@sharpee/chord` 739 · `@sharpee/story-loader` 480 ·
  `@sharpee/devkit` 153 (1 skipped) · SharpeeIDE 418. Zero failures.
- **Rollback safety**: one commit; revert restores compile-at-boot.
