# Sharpee IDE — Phase Plan

**Date**: 2026-05-09
**Branch**: main
**Status**: DRAFT — pending Phase 0 kickoff

## Goal

A native macOS IDE for Sharpee story authoring, mirroring `docs/work/sharpee-ide/mock-v1.html`:

- Title bar · Left rail · Project panel · Editor · Play panel · Status bar
- Sharpee-aware project tree (Rooms / Objects / NPCs / Regions / Grammar)
- Side-by-side live Play
- Inline trait hints
- Extensions / Plugins panel with version info

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Location | `tools/ide/` (in-monorepo) | Co-located with TS toolchain it drives |
| 2 | UI framework | AppKit | Author preference; native control over editor surface |
| 3 | Editor highlighter (Swift side) | TextMate grammars | Cheaper than tree-sitter Swift bindings; AST work lives Node-side |
| 4 | Project introspection | Node-side helper using TS Compiler API | Reuses existing TS toolchain; one parser stack |
| 5 | Toolchain bridge (build, lint, introspect) | Long-running Node subprocess (option **B**) | Locked in Phase 4 |
| 6 | Play bridge | WKWebView embedding `dist/web/{story}` (option **D**) | Locked in Phase 5; engine already runs in browser |
| 7 | Phase ordering | Working loop first, polish after | Shortest path to a demoable IDE |

**Bridge summary**: Hybrid — option **B** for build/introspection, option **D** for the Play pane. Option C (JavaScriptCore) rejected — Sharpee bundle assumes Node runtime. Option A (per-command spawn) rejected — turn latency would feel sluggish.

## Phase Order — Optimized for Earliest Working Loop

```
P0  Skeleton
P1  Open project + raw editor
P4  Build integration                ← cheap, jumps ahead
P5  Play (WKWebView + web bundle)    ← cheap, jumps ahead
─── WORKING LOOP: edit raw → build → play ───
P2  TS-aware editor (TextMate grammars)
P3  Sharpee-aware project view
P7  Outline & Problems               ← reuses P3's parser, nearly free
P6  Trait hints                      ← most expensive: editor + parser
P8  Distribution (codesign, notarize, DMG)
```

---

## Phases

### P0 — Skeleton

**Scope**

- Xcode project at `tools/ide/SharpeeIDE.xcodeproj`
- AppKit app target, deployment target macOS 26+
- Main `NSWindow` containing:
  - Title bar (custom or system)
  - `NSSplitView` (horizontal): Rail · Project · Editor · Play
  - Status bar
- App launches and shows empty panes
- README in `tools/ide/` covering build/run

**Out of scope**: file I/O, menus beyond default, anything that loads content.

**Deliverable**: app launches, panes visible, no functionality.

**Dependencies**: none.

---

### P1 — Open Project + Raw Editor

**Scope**

- File menu: Open Project (folder picker, remember recents)
- Project panel renders filesystem tree (no Sharpee semantics yet)
- Click a file → opens in a tab
- Editor uses `NSTextView` with monospaced font
- Save (`⌘S`), dirty marker on tabs, undo/redo via `NSUndoManager`
- Multiple tabs, close tab, switch tabs

**Out of scope**: syntax highlighting, search, find/replace.

**Deliverable**: open any folder, edit and save text files. The editor works as a generic text editor.

**Dependencies**: P0.

---

### P4 — Build Integration *(jumps ahead)*

**Scope**

- Build menu / status bar action: trigger `./build.sh -s {story}` via `Process` (NSTask)
- Detect story name from project (look for `stories/*/package.json`)
- Stream stdout/stderr to a Build panel (toggle from rail)
- Parse `tsc` errors → click jumps to `file:line` in editor
- Build status indicator in status bar (idle / building / OK / failed)
- Cancel running build

**Decision point — bridge protocol**: lock in **option B** (long-running Node subprocess) for any future toolchain ops beyond build. Build itself is a one-shot `Process`, but the protocol shape established here informs P3.

**Out of scope**: incremental builds, warning suppression UI, build configurations.

**Deliverable**: clicking Build runs `./build.sh`, surfaces output and errors, navigates to error sites.

**Dependencies**: P1 (editor must exist for the jump-to-error target).

---

### P5 — Play Panel *(jumps ahead)*

**Scope**

- Play panel embeds `WKWebView` pointing at `file://.../dist/web/{story}/index.html`
- Header: Restart button, Log button, indicator dot
- After a successful build, reload the WebView
- "Play after build" toggle (default on)

**Decision point — bridge**: option **D** (WKWebView) confirmed; engine runs entirely in-browser inside the WebView. Swift talks to JS only for: trigger restart, set theme, capture transcript log.

**Out of scope**: the command input row in the mock — the web client already provides one. Skip duplicating it.

**Deliverable**: build a story, play it side-by-side with the editor.

**Dependencies**: P4 (need a build to play). The web bundle (`dist/web/{story}`) must already be produced by the existing build pipeline; no platform-side changes expected.

**🎯 Milestone**: at end of P5, the IDE is *useful for real work* — open a Sharpee story, edit raw `.ts`, build, play. Everything from P2 onward is polish.

---

### P2 — TS-Aware Editor

**Scope**

- Syntax highlighting via TextMate grammars (bundle `TypeScript.tmLanguage` + a theme)
- Line number gutter
- Find / replace (`⌘F`, `⌘⌥F`)
- Bracket matching, auto-indent on newline
- Configurable theme (start with one dark theme matching the mock)

**Library options to evaluate at P2 kickoff**:
- Apple's built-in `NSTextView` + `NSTextStorage` with manual TM tokenization
- Wrap a tokenizer like `oniguruma`/`Onigmo` via SPM
- Borrow from existing open-source AppKit editors (CodeEdit, etc.) — license check required

**Out of scope**: completion (P6), refactoring, multi-cursor.

**Deliverable**: editing TS files feels like editing TS files, not plaintext.

**Dependencies**: P1.

---

### P3 — Sharpee-Aware Project View

**Scope**

- Replace filesystem tree with virtual folders matching the mock:
  - Rooms · Objects · NPCs · Regions · Grammar · Story Settings
- Node-side helper (`tools/ide/helper/`) uses the TypeScript Compiler API to:
  - Scan a Sharpee project
  - Identify each `.ts` file's primary export(s) by trait composition (e.g., `RoomTrait` → Room, `OpenableTrait` → Object)
  - Emit a JSON manifest the Swift side renders
- Helper runs as the long-running Node subprocess from P4's bridge decision
- Re-scan on file save
- Extensions panel: read project `package.json`, show `@sharpee/*` deps with versions
- Plugins panel: same, filtered to plugin packages

**Out of scope**: drag-and-drop reorganization, "create new room" wizard.

**Deliverable**: project panel matches the mock structurally — categories not folders.

**Dependencies**: P1 (filesystem tree to replace), P4 (bridge protocol established).

---

### P7 — Outline & Problems

**Scope**

- Outline panel: rooms / objects / NPCs in the *currently active file* (subset of the P3 manifest)
- Problems panel: TS compiler diagnostics (already produced by build) + Sharpee lints
- Sharpee lints (initial set):
  - Room with no `exits`
  - Item with no `description`
  - Trait used without required co-trait (e.g., `LockableTrait` without `OpenableTrait`)
  - Wall referenced but not declared (post ADR-173)
- Click a problem → jump to `file:line`

**Out of scope**: quick-fix actions, fix-all.

**Deliverable**: Outline + Problems panels populated and navigable.

**Dependencies**: P3 (reuses the Node helper's parsed manifest).

---

### P6 — Trait Hints

**Scope**

- Hover any trait property in the editor → render the inline hint bubble from the mock
- Knowledge source: parse `packages/sharpee/docs/genai-api/*.d.ts` for trait/action signatures
- Curated descriptions in `tools/ide/data/trait-hints.json` (hand-edited for prose)
- (Optional, time permitting) basic completion: typing `lit` shows a snippet for the trait

**Out of scope**: full LSP, semantic refactoring, find-references.

**Deliverable**: the `lit` hint shown in the mock works; same for a curated set of common traits.

**Dependencies**: P2 (editor must support inline decorations) + P3 (parser to identify trait positions).

---

### P8 — Distribution

**Scope**

- Code signing (Developer ID Application cert)
- Notarization via `notarytool`
- DMG packaging via `create-dmg` or similar
- Versioning scheme (likely `0.1.0` for first cut)
- Auto-update via Sparkle (deferred — manual download for v1 is fine)
- README + getting-started in `tools/ide/`

**Deliverable**: a downloadable, signed, notarized DMG.

**Dependencies**: all prior phases stable.

---

## Out of Scope for v1

Defer to a v2 plan:

- Git integration (commits, branch switching, diff)
- Multiple project workspaces
- Theming (UI themes; story themes stay author-controlled)
- Transcript file preview (viewing `.transcript` files as runnable tests)
- Walkthrough player UI
- VS Code extension parity
- Linux / Windows ports

## Risks / Unknowns

1. **TextMate grammar tokenization in AppKit** — no first-party Apple framework for this. Choice between rolling our own tokenizer over an Oniguruma binding vs. depending on a third-party Swift lib. Resolve at P2 kickoff.
2. **WKWebView ↔ Swift JS bridge ergonomics** — fine for restart/log/theme, but if Play needs deeper introspection (breakpoints, world-state inspector), the bridge gets thicker. Acceptable for v1.
3. **Node subprocess lifecycle** — crash recovery, unresponsive helper, version mismatch with the project's pinned Sharpee version. Defer formal protocol versioning to P4.
4. **Sharpee version compatibility** — IDE ships against one Sharpee version's API surface; older/newer projects may mismatch. v1 assumes IDE and project are aligned; surface a clear warning if not.

## File / Folder Layout (proposed)

```
tools/ide/
├── SharpeeIDE.xcodeproj/
├── SharpeeIDE/                    # Swift / AppKit sources
│   ├── App/
│   ├── Editor/
│   ├── Project/
│   ├── Play/
│   ├── Build/
│   └── Bridge/                    # Node subprocess client
├── helper/                        # Node-side analyzer
│   ├── package.json
│   ├── src/
│   └── tsconfig.json
├── data/
│   └── trait-hints.json
├── Resources/
│   └── grammars/                  # .tmLanguage files
└── README.md
```

## Confirmed Pre-P0 Settings

- Minimum macOS deployment target: **26.0**
- Location: **`tools/ide/`**
- Bundle identifier: **`net.sharpee.ide`**
- App icon / branding deferred to P8 — placeholder fine for P0–P7

---

**Next action**: kick off P0 — generate the Xcode project skeleton and the empty 3-pane window. No content loading.
