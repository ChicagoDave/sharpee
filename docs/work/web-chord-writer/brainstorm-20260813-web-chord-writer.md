# Brainstorm: A web version of Chord Writer

**Date**: 2026-08-13
**Status**: Brainstorm — nothing decided, no ADR written
**Prompted by**: an outside request for "a web version of Chord Writer"
**Premise given**: assume cloud drive access (iCloud, OneDrive, Google Drive) solves storage

---

## 1. The short version

The compile / load / run / test chain is already browser-clean, by deliberate design
across several ADRs. What is macOS-bound is the *shell*: the editor, the project
model, and six subprocess call sites. That is roughly 14k lines of Swift.

The cloud-drive premise mostly holds, with one sharp exception: **iCloud Drive has no
third-party web API.** Google Drive and OneDrive do. This is the finding that most
changes the shape of the answer, and it is the first thing to confirm before any of
the rest is worth planning.

The strongest argument for a web version is not convenience. It is that Chord Writer
is macOS-only, and the IF authoring community is not.

---

## 2. What is already portable (measured, 2026-08-13)

Counted node-builtin imports (`fs`, `path`, `child_process`, `os`, `worker_threads`)
across each package's `src/`:

| Package | Node-bound files | Total | Verdict |
|---|---|---|---|
| `@sharpee/chord` (compiler) | 0 | 20 | browser-clean |
| `@sharpee/engine` | 0 | 52 | browser-clean |
| `@sharpee/story-loader` | 0 | 17 | browser-clean |
| `@sharpee/platform-browser` | 0 | 28 | browser-clean |
| `@sharpee/branch-tester` | **1** | 7 | one I/O shell (`runner.ts`); logic is clean |
| `@sharpee/transcript-tester` | 7 | 15 | half node-bound |
| `@sharpee/devkit` | 40 | 44 | thoroughly node-bound (it is the build tool) |

`@sharpee/chord` also carries zero runtime dependencies. `story-loader` documents
itself as filesystem-free, taking hatch modules as an injected map
(`loader.ts:17,145,282`). `@sharpee/ide-protocol` was written under DEVARCH 8b with an
explicit "no `Buffer`, no `fs`, no DOM" invariant precisely so a Node emitter and a
browser bridge could share it.

**Three of the IDE's panes are already web pages** running in `WKWebView`:
`tools/ide/web/docs-tab`, `tools/ide/web/testing-surface`, `tools/ide/web/testing-tab`,
all TypeScript with vitest suites. Play just serves `dist/web/<id>/index.html`
(`Play/WebBundle.swift`).

Compile-in-browser is not speculative. ADR-233 G2 shipped it and proved it in real
Chromium on a clean machine (2026-07-18). ADR-191 (ACCEPTED) already designs a
Chord-mode-first in-browser playground with CodeMirror 6 chosen.

**Read together: the only thing in the chain that genuinely needs Node is the build
step, and a web IDE does not need a build step.**

---

## 3. What is macOS-bound

89 Swift files, 14,049 lines.

**The editor.** `Editor/ChordLexer.swift`, `SyntaxHighlighter.swift`, `AutoIndenter.swift`,
`BracketMatcher.swift`, `LineNumberRulerView.swift`. A hand-written Chord lexer in
Swift. This is a rewrite, not a port. CodeMirror 6 is the obvious target since ADR-191
already picked it, but that leaves two Chord highlighters to keep in step with the
language, unless ADR-182's tree-sitter grammar becomes the shared source for both.

**Six subprocess sites**: `ComposeRunner`, `BuildRunner`, `TestRunner`,
`IntrospectionRunner`, `ChordVersionCheck`, `ShellEnvironment`. Most shell out to
`sharpee <verb> --json` and parse structured results over already-neutral protocol
types. Compose is the clearest example of accidental distance: it spawns a child
process (`ComposeRunner.swift:54`) to run a compiler that has no Node dependency at
all. In a web build that is a function call.

**The project model** (ADR-280, amended A1 2026-08-06): stories live at
`~/Documents/<Story Title>/`, an editable path. `StoryHome`, `WorkspaceRoot`,
`StoryDetector`, `ProjectTreeViewController`. Chord Writer is a filesystem tool.

**Publishing** (ADR-284) and **assets** (ADR-285) both assume a real directory.

---

## 4. The cloud-drive premise, examined

This is where the assumption needs the most care, because the three named services are
not equivalent for a *web* client.

### 4.1 iCloud Drive — the exception

As far as I know, Apple provides no web API by which a third-party web app reads a
user's iCloud Drive files. iCloud Drive integration is a native-app capability
(document picker, `NSFileProvider`, ubiquity containers). CloudKit JS exists, but it
addresses **your app's own CloudKit container**, not the user's iCloud Drive documents.

That leaves two very different options, and they are not interchangeable:

- **iCloud Drive as visible files** — native app only. A web version cannot see them.
- **A CloudKit container** — reachable from both the Mac app and a web app via
  CloudKit JS, but the projects stop being files the author can see in Finder. They
  become app-managed records.

The second is a genuine architectural fork, and it trades away something ADR-280 was
deliberate about: the author owns a real folder at a path they chose. Turning a Chord
project into opaque records to enable web sync is a meaningful loss, not a detail.

**This is the single highest-value thing to verify before planning anything.** If
iCloud Drive is web-inaccessible, then "iCloud" is an argument *for* the native app,
and the premise as stated does not fully hold.

### 4.2 Google Drive — works, with a scope trap

Drive API v3 plus the Picker API is a well-worn path. The trap worth naming early:
broad scopes (`drive`, `drive.readonly`) are **restricted** and trigger Google's
annual third-party security assessment, which is expensive and recurring. The
`drive.file` scope, which grants per-file access to files the user picked or the app
created, is **not** restricted. Designing to `drive.file` from day one avoids an
ongoing compliance cost. Designing to a broad scope and retreating later is painful.

### 4.3 OneDrive / Microsoft Graph — works

REST API, MSAL for auth, a supported file picker. Personal and work/school accounts
behave differently and both need testing, but there is no structural blocker.

### 4.4 What cloud drives give you, and what they do not

**Give you:**
- Persistence without running a backend (relevant, given zifmia is dormant)
- Cross-device sync for free
- The author owns their data, in their own storage. That fits IF authoring culture
  well, and it fits Sharpee's existing posture better than a hosted service would.

**Do not give you:**
- Low-latency saves. Every write is an HTTP round trip. You need a local working copy
  plus debounced sync, not save-on-keystroke to a REST API.
- Conflict resolution. Two browser tabs, or the Mac app and the web app, editing one
  story is last-writer-wins unless you build something.
- Change notification worth relying on. Drive has push, Graph has delta queries, both
  are work.
- Any notion of a project lock.

**And a Chord project is a directory, not a file.** A `.story`, possibly `.ts` hatches,
assets under ADR-285, and `dist/`. Syncing a tree over a per-file API means N round
trips per open. `dist/` should never sync at all — which a web IDE gets for free,
because it does not produce one.

---

## 5. Architecture sketch

**One storage adapter interface, several implementations.** Something like
`open / list / read / write / delete / watch` over a project tree, with:

- `GoogleDriveAdapter` (`drive.file` scope, Picker-driven)
- `OneDriveAdapter` (Graph)
- `CloudKitAdapter` (only if the container fork in §4.1 is taken)
- `OPFSAdapter` — Origin Private File System, browser-local

**OPFS is not just a fallback, it is the working copy.** Edit against OPFS at native
speed, sync to the cloud adapter on a debounce. This solves latency, gives offline
editing, and creates a place to stage conflicts. It also enables a **zero-signin trial
tier**: open the site, write a story, play it, never authenticate. That tier alone may
be most of the requested value.

**No build step.** Compile the `.story` in-page with `@sharpee/chord`, hand the IR to
`story-loader`, hand the world to `@sharpee/platform-browser`. The desktop app's
`dist/web/<id>/` bundle exists to be served to a `WKWebView`; in a browser the IDE
*is* the browser. This is a place where the web version is genuinely simpler than the
Mac one.

**Testing largely comes along.** `branch-tester`'s only node-bound file is `runner.ts`,
the I/O shell. `auto-assertion.ts`, `channel-assert.ts`, `tree-document.ts`,
`tree-walker.ts` are clean. The testing surface UI is already a web app with its own
vitest suite. Testing intelligence is a stated product differentiator, and it does not
have to be sacrificed to reach the web.

---

## 6. The tier boundary: hatched stories

TypeScript hatches (ADR-210 §5.6, ADR-094) need transpiling. Two honest options:

1. **esbuild-wasm in the browser** — roughly 10MB, already contemplated as ADR-191
   Mode B. Costs cold-start weight for every user, to serve the minority who use hatches.
2. **Pure-Chord only on the web** — hatched stories open read-only, or refuse, with
   "hatches need Chord Writer for Mac."

Option 2 is worth taking seriously rather than treating as a limitation. It gives the
desktop app a clear reason to exist beyond being the older one, and it matches Chord's
interpreter-primary positioning: the web tier is the language, the desktop tier is the
language plus the escape hatch into TypeScript.

---

## 7. What is it actually for?

Four different products hide behind "a web version," and they cost wildly different
amounts:

1. **On-ramp / playground** — one file, compile, play, share a link. Mostly assembly of
   decided-and-proven pieces. Largely ADR-191, already ACCEPTED.
2. **Second device** — write on an iPad, a Chromebook, a work PC, sync to the Mac app.
   Needs the full storage story and conflict handling.
3. **Cross-platform primary** — the real IDE, for authors who have no Mac.
4. **Web primary, Mac as power tool** — inverts the last several months of investment.

**Number 3 is the strongest argument and the one nobody has made yet.** Chord Writer
is macOS-only. Interactive fiction authors are heavily Windows. Inform 7 has been
cross-platform since forever. A macOS-only IDE for a brand-new language is an adoption
ceiling, and web is the way past it without building and maintaining Windows and Linux
native apps.

There is also an asymmetry that is hard to ignore after the last five sessions of
notarization work: Developer ID signing, notarization, stapling, per-arch toolchain
vendoring, DMG assembly, Gatekeeper. A web build pays exactly none of it.

---

## 8. A convergence path, rather than a rewrite

Three Chord Writer panes are already web apps in a `WKWebView`. That suggests an
incremental route rather than a second codebase:

1. Move compose in-process (drop the `sharpee compose` subprocess). The compiler has
   no Node dependency; the subprocess is legacy shape, not necessity.
2. Build the editor as a web component (CodeMirror 6 + a shared Chord mode), and adopt
   it inside Chord Writer as a fourth web pane, replacing the Swift editor.
3. Add the storage adapter layer with an OPFS implementation, plus a native-filesystem
   implementation the Mac app uses.
4. At that point the Swift is a shell: window chrome, menus, subprocess plumbing for
   build and publish. The web app is the same panes hosted in a browser instead.

Each step is independently useful to the Mac app. None is a gamble on the web version
shipping. The failure mode to avoid is a parallel web codebase that drifts from the
Swift one, which is exactly what two Chord highlighters would start.

---

## 9. Open questions

1. **Is iCloud Drive genuinely web-inaccessible to third parties?** Everything in §4.1
   turns on this. Confirm before planning.
2. If yes, is a CloudKit container acceptable, given it makes projects non-visible in
   Finder and contradicts ADR-280 A1's "the author picks the folder"?
3. Which tier from §7 is the actual ask? The request as relayed does not say.
4. Do hatched stories get esbuild-wasm, or become the desktop tier's differentiator?
5. Does the web version share one Chord highlighter with the Mac app (tree-sitter,
   ADR-182), or accept two implementations?
6. Multi-file project sync: how many round trips is acceptable on open, and what
   happens when the Mac app and the web app both have a story open?
7. Is `transcript-tester` (7 of 15 files node-bound) worth porting, or does the web
   tier get `branch-tester` only?

---

## 10. Cost shape, roughly

| Piece | Size |
|---|---|
| Playground tier (§7.1) | small; mostly already decided and proven |
| Storage adapters + OPFS working copy + sync | medium; the OAuth and conflict work is real |
| Editor rewrite (CodeMirror 6 + Chord mode) | medium-large; the single biggest line item |
| Project model, web-side | medium |
| Testing surface | small; already web, `branch-tester` nearly clean |
| Publishing | unknown; ADR-284 assumes a filesystem |
| Build step | **zero** — the web version does not need one |

---

## 11. Recommendation

> **Amended below — see §12.** Sections 1–11 assume the browser is the target. Once a
> cross-platform *desktop* shell is on the table, most of §4's cloud-drive analysis
> becomes moot and the recommendation changes. Read §12 as the current position and
> §1–11 as the browser-specific case, which still stands on its own for the playground
> tier.

Confirm the iCloud question first, because the premise rests on it and it is a
day's work at most to settle.

Then treat this as two decisions, not one. The playground tier is cheap, already
designed, and answers "can I try this without a download." The cross-platform IDE is a
real second product whose cost is dominated by the editor rewrite and the storage
layer, and whose justification is Windows and Linux authors rather than convenience
for Mac users.

If the cross-platform IDE is wanted, §8's convergence path is the way in: every step
improves Chord Writer whether or not the web version ever ships.

**ADR-worthy when decided** (not now, nothing is decided): the storage abstraction and
its cloud adapters; the hatch tier boundary; whether the Chord highlighter is shared;
and any move that supersedes ADR-280's filesystem project model.

---

## 12. Shell technology (added 2026-08-13, after the question "would Tauri be more appropriate?")

### 12.1 The prior art is not what it looks like

Sharpee has Tauri in its history, but every occurrence (ADR-121 story-runner, ADR-130
zifmia packaging, ADR-152 multiuser player, ADR-175 zifmia product) belongs to the
story → runner paradigm David has since discarded. **None of it is IDE precedent.**

For the IDE the question was explicitly left open and never closed:

> "A specific implementation technology (Electron vs Tauri vs native). Implementation
> choice is deferred to the implementation plan." — ADR-154:150
>
> "Phase 0 — prototype shell. Pick implementation technology (Electron or Tauri)."
> — ADR-154:178

Native Swift happened at implementation time with no ADR recording the choice. So this
is an open question, not a settled one, and revisiting it is not re-litigation.

### 12.2 A desktop shell dissolves §4

Almost all of the cloud-drive analysis above exists only because a browser cannot see
the filesystem. A desktop shell reads `~/Library/Mobile Documents/`, a OneDrive folder,
or a Google Drive folder like any other directory, and the user's own sync client does
the work. That removes, in one move: OAuth for three providers, the `drive.file` scope
trap and Google's annual security assessment, storage adapters, conflict resolution,
per-open round trips, and the iCloud Drive web-API gap that §4.1 named as the weak link
in the whole premise.

It also preserves the architecture instead of rebuilding it. ADR-280's real project
folders survive. The six subprocess sites port rather than get rewritten. Hatched
stories build natively, so §6's tier boundary disappears and no esbuild-wasm is needed.
Publishing (ADR-284) and assets (ADR-285) keep their filesystem assumptions.

What it does **not** dissolve: macOS notarization, Developer ID, hardened runtime,
stapling. A desktop shell pays all of it, plus Windows code signing and Linux packaging.

### 12.3 The measurement that decides between shells

`vendor-toolchain.sh` vendors a full Node runtime per arch (`node-v22.23.1-darwin-arm64`
or `-darwin-x64`, checksummed against SHASUMS256.txt) plus a matching
`@esbuild/darwin-*`. In the shipped app:

```
$ du -sh "/Applications/Chord Writer.app/Contents/Resources/toolchain"
165M    /Applications/Chord Writer.app/Contents/Resources/toolchain
```

165MB of the 177MB installed app is the vendored toolchain. The Swift is the small
part. Hand-assembling that closure is what consumed five sessions of packaging work,
and a cross-platform target multiplies it from two arches to six.

**Electron's main process is a Node runtime.** `@sharpee/devkit` becomes an ordinary
app dependency, esbuild resolves through its normal per-platform npm packages, and
`electron-builder` handles per-target packaging and notarization. The bespoke vendoring
problem largely stops existing.

**Tauri's backend is Rust.** It does not bundle Node, so the vendoring problem comes
along unchanged, on six targets instead of two.

### 12.4 The sharper filter: does the shell speak TypeScript?

DEVARCH 8b requires co-located client and server in the same typed language to share
wire types by direct import. Swift cannot, so the IDE hand-mirrors `ProjectManifest`
as `Codable` structs today. That drift risk is live.

- **TypeScript shell** (Electron, Tauri): imports `@sharpee/ide-protocol` directly. The
  drift class disappears. The three existing web panes (docs, testing surface, play)
  port as-is. One language across compiler, engine, protocol, panes, and shell.
- **Non-TypeScript shell** (MAUI, Avalonia, Qt, Flutter, Swift): hand-mirrors the
  protocol, and must embed a webview anyway to reuse the existing panes — at which
  point it is a worse Electron.

**The editor is the exception, and it is the one real fork.** See §12.7 — under the
two-shell posture the Swift editor stays and CodeMirror 6 is additive, not a
replacement.

### 12.5 Ranking, given the driver in §7.3

| Option | Verdict |
|---|---|
| **Electron** | Best fit. TS throughout, bundles Node (kills §12.3), consistent Chromium, mature packaging + notarization tooling, VS Code is the proof case for editor-shaped apps. Cost: ~150MB baseline, which is not a constraint this project actually has. |
| **Tauri** | Same TS front-end benefits, but keeps the Node-vendoring problem and adds WebKitGTK on Linux as its known weak point. Small-binary advantage is irrelevant at 177MB. |
| **Avalonia** | The correct choice *if* .NET is a requirement — genuinely cross-platform including Linux, real desktop focus. Pays wire-type mirroring, no pane reuse. |
| **.NET MAUI** | No. No Linux support, so it misses the stated driver. macOS means Mac Catalyst, an iPad app on the desktop, a downgrade on the one platform that currently has a polished AppKit app (ADR-297). Mobile-first with desktop bolted on. |
| **Flutter / Qt / Compose MP** | Not evaluated in depth. All pay the mirroring cost and none reuse the panes; Flutter's desktop text editing and IME story is the specific worry for an editor. |

The platform is TypeScript and that switch is settled and liked. A C# shell would put
the product back in two languages for nothing the toolkit provides.

### 12.6 Shells are hosts for the panes, not alternatives to each other

The reframe that matters: **the shared asset is the panes, not the shell.** Build the
panes as web, put one abstraction over storage and execution, and the same front-end
runs in every host:

- **Chord Writer (Swift)** backs it with real files and real subprocesses — as it does today
- **A second desktop shell** does the same on Windows and Linux
- **Browser** backs it with OPFS and in-page compile (§5)

§8's convergence path is unchanged; it simply stops being a migration and becomes an
extraction.

### 12.7 The Swift app is not going anywhere (David, 2026-08-13)

**Ruled.** Chord Writer stays. This was anticipated from the start: *"Swift was by far
the fastest path to proving the model."* That is the rationale ADR-154:150 deferred and
no session ever recorded, and it is worth capturing — the Swift app was a
proving vehicle that succeeded, and its durable output is the design itself. ADR-277,
280, 281, 284, 285, and 297 are now *proven* product design rather than speculation.
A second shell inherits a validated model instead of discovering one.

Three consequences:

**The current architecture is already correct.** Three panes web, editor native. Nothing
gets restructured. The work is to make the three web panes host-portable and add a
second host.

**The second shell does not need parity.** It is the "everywhere else" tier while the
Mac app stays the flagship. If it targets Windows and Linux only, it is never notarized,
never needs a macOS toolchain, and never competes with the shipped 1.0.0. That is a far
lower bar than §12.5's ranking assumed.

**The editor is the one real fork, and it should stay native.** Either the second shell
gets CodeMirror 6 while Swift keeps AppKit (two editors), or everything shares one web
editor and the Mac app gives up native text editing. Keep the native editor: it is the
single pane where native genuinely beats web, and it is where the Mac app earns being
the best version. Two editors is the right cost.

### 12.8 Two editors must not mean two grammars — ADR-182 is the answer, and it is dormant

ADR-182 (tree-sitter highlighting) is **ACCEPTED (2026-06-19) and not implemented.** The
Swift editor uses a hand-written lexer with no parse tree:

```
SyntaxHighlighter.swift:3   // key off TokenKind — no parse tree, no tree-sitter.
project.yml:26              # tree-sitter left with the TypeScript author path (D3).
```

Tree-sitter binds to Swift as a C library and to the web as WASM. One grammar, two
editors, no drift. When ADR-182 was accepted its justification was better highlighting.
Under a two-shell posture it becomes the thing that stops Chord's syntax from being
defined in three places: the Swift lexer, a CodeMirror mode, and the real compiler.
That is a substantially stronger case than the one it was accepted on.

**Suggested sequence**: implement ADR-182 in the Swift app first. It is a standalone
improvement that pays for itself, and it forces the grammar to exist as a shared
artifact — so a later CodeMirror mode consumes something that already exists rather
than becoming a second definition of Chord.

### 12.9 Revised open questions

8. Is cross-platform *desktop* the ask, or cross-platform *access*? A second desktop
   shell answers the first, the browser tier answers the second. Not the same request.
9. Does the second shell target Windows and Linux only, or also macOS? Windows/Linux
   only avoids notarization entirely and avoids competing with Chord Writer.
10. Does Electron's Node main process genuinely remove the toolchain vendoring, or does
    esbuild's per-platform binary reintroduce it? This is the load-bearing claim of
    §12.3 and deserves a half-day spike before anything is committed.
11. Windows code signing: EV certificate or Azure Trusted Signing, and who holds it?
12. Which panes are genuinely host-portable today? Docs, testing surface, and play are
    web, but they may have `WKWebView`-specific assumptions (`PlayURLSchemeHandler`,
    `DocsTabSchemeHandler`) that need an abstraction before a second host can serve them.

---

## Relation to current work

This is a divergence from the active plan (`docs/work/chord-writer-intel/plan.md`,
Phase 1: vendor the x86_64 toolchain). Nothing here is scheduled and `.current-plan`
is untouched.
