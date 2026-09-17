# Session Plan: Production Chord Writer on Avalonia + Velopack (Windows, macOS, Linux)

**Created**: 2026-09-16
**Plan Status**: ACTIVE
**Overall scope**: Turn the Avalonia + Velopack spike (`/Users/david/repos/spikes/avalonia-ide/`, outside the repo) into a shipping, cross-platform Chord Writer — one codebase, natively rendered, reaching Windows, macOS and Linux — carried forward on ADR-351 D2. The macOS Swift app (`tools/ide/SharpeeIDE`, 18,921 lines, shipping at 1.4.0) is not retired by this plan; the plan reaches a gated evidence point and stops there (Phase 12), per the framing instruction this plan was given.
**Bounded contexts touched**: N/A — this is infrastructure/tooling work (a native shell, a packaging/signing pipeline, a subprocess toolchain). It does not change `packages/` domain behavior except where named explicitly (GH #448, GH #457, GH #463, GH #465), each of which is flagged as a platform change requiring David's discussion first per CLAUDE.md.
**Key domain language**: N/A (see above). The technical vocabulary this plan uses throughout: **the pane door** (D3's per-platform contract for serving the three web panes to a native `WebView`/`WebView2`/WebKitGTK host), **the toolchain** (the vendored Node runtime + `bin/sharpee` shim `tools/ide/vendor-toolchain.sh` produces), **the shell** (the native chrome: tab strip, menu bar, project tree, editor — everything that is not a pane), **felt comparison** (Q-3 — David's subjective judgment of the Avalonia shell against the shipping Mac app, unmeasurable by any spike).

## References consulted
- `docs/architecture/adrs/adr-351-chord-writer-host-shape.md` — D2 carries the shape forward conditional on three things, two discharged, one outstanding (Q-3, David's felt comparison) — this plan's Phase 1 exists because that condition gates execution, not planning; D3 records the pane door splits by platform (macOS loopback, Windows virtual-host mapping, Linux custom URI scheme) and assigns the fix to "D3's contract module," which this plan builds in Phase 4; D6 names three owed platform findings (GH #463, #464, #465) this plan closes in Phases 4 and 9; Consequences state plainly that nothing in the ADR authorizes retiring the Swift app (Q-4) — this plan must not plan that retirement, only produce the evidence for it (Phase 12).
- `docs/architecture/adrs/adr-341-chord-writer-windows.md` — D2's WPF ruling is superseded by ADR-351 D3, but D3 (three-pane host contract), D4 (one grammar, native editor), D5 (generated protocol types, not hand-mirrored — rule 8b), D6 (real folders, x64-only Node vendoring is the accepted pattern this plan's Windows/Linux vendoring extends), D7 (Windows-native release, Azure Trusted Signing under David's own account) and the AC-1..AC-7 acceptance criteria are the bar this plan's phases are built to satisfy, adapted to three platforms instead of one. Per the ADR's own text, it is "deliberately not edited while ADR-351 is DRAFT" — this plan does not edit it either.
- `docs/work/avalonia-ide-evaluation/decision.md` — the source of nearly every phase in this plan: §11 ("Owed regardless of the ruling"), §12 (Phase 7 Windows addendum — the toolchain gap, not the toolkit, is the real Windows blocker), §13 (Packaging addendum — the macOS bundle now seals, signs, notarizes, and what's still owed is the shipping integration and the x86_64 slice).
- `docs/work/velopack-macos-bundle-layout/decision.md` — the macOS relocation recipe (`relocate.sh`, `patch-apphost.py`, pre-`vpk pack` ordering) this plan folds into shipping tooling in Phase 5; its own "still owed" list (shipping integration, x86_64 slice, GH #474) is this plan's Phase 5 deliverable list almost verbatim.
- `docs/context/project-profile.md` — pnpm workspace with `packages/devkit` as the author-tool package this plan's Phase 3 must touch (GH #448) under CLAUDE.md's platform-change discussion rule; no CI gates for Sharpee (`pnpm exec turbo run test:ci` plus `pnpm typecheck` are the mandatory local legs, not CI); TypeScript strict mode and the layer-separation convention (`lang-en-us` owns user-facing text) apply to any `packages/` edit this plan makes.
- `docs/context/session-20260916-0228-main.md` — most recent session's Open Items: GH #462 items (2)/(3)/(4) and GH #474 are untouched and explicitly named as this-plan's-scope by the goal; also notes `pre-session-audit` mis-reported the `.current-plan` pointer once this session, worth knowing but not load-bearing for this plan.

## Phases

### Phase 1: The Q-3 gate — David's felt comparison, recorded
- **Tier**: Small
- **Budget**: 100
- **Focus**: ADR-351 D2's third and only outstanding condition. Nothing else in this plan should be built on the assumption this resolves yes.
- **Entry state**: The notarized, stapled spike `.app` exists at `/Users/david/repos/spikes/avalonia-ide/out/signed-verify/ChordWriterAvaloniaSpike.app` (proven 2026-09-16, session e923d3) and passes `spctl --assess --type execute`. Two shell screenshots exist (`evidence/phase-4-shell-dark.png`, `phase-4-shell-light.png` under the Avalonia evaluation directory).
- **Deliverable**: David runs the notarized spike `.app` directly (not a screenshot) on his own Mac, types in the AvaloniaEdit editor window, and compares it against the shipping `SharpeeIDE.app`. **This needs David at the keyboard — there is no way to spike or infer this answer.** The outcome is recorded as an amendment to ADR-351's Open Questions (Q-3 resolved) and its Session section, per rule 11a discipline (this plan does not resolve the open question itself — David's answer does, through his own confirmation).
- **Exit state — two branches, and they are not symmetric**:
  - **YES**: Q-3 resolves favorably. ADR-351's three D2 conditions are now all discharged; nothing blocks the ADR from being asked whether to move DRAFT → ACCEPTED (that ask is a separate rule-11a-adjacent step, not this plan's job). Phase 2 begins.
  - **NO**: Q-3 resolves against. This plan's remaining phases are voided at the gate exactly as ADR-351 §9 says they would be ("if the felt comparison of the whole shell comes back wrong... this is the one condition no amount of further spiking answers"). Do not proceed past Phase 1. Report back to David for a new planning pass — do not decide the fallback shape (Q-2, the pure web application) unasked.
- **Status**: DONE (2026-09-16) — **YES, unqualified.** David ran the notarized, stapled artifact beside Chord Writer 1.4.0 and ruled option (a): *“it’s damn near perfect”*. No reservations named, so none are folded into later phases. Record: `evidence/phase-1-felt-comparison.md`. ADR-351 amended (Q-3 retired, Status and D2 updated); the ADR stays DRAFT on Q-2, Q-4 and Q-6, none of which is about the shape.

### Phase 2: Production scaffold — in-repo home, spike port, capability seam
- **Tier**: Medium
- **Budget**: 200
- **Focus**: Move from spike code outside the repo to a real in-repo project, without yet adding any capability the spike didn't already prove.
- **Entry state**: Phase 1 resolved YES.
- **Deliverable**: Confirm with David (one question, not a silent choice) the in-repo home for the production app — proposed: `tools/ide/PaneHost/` (mirroring the spike's `pane/PaneHost/` naming), living alongside `tools/ide/SharpeeIDE/` (Swift) for the duration of the parity period, sharing `tools/ide/web/{docs-tab,testing-tab,testing-surface}` unchanged (ADR-341 D3/AC-3's "panes built once," which ADR-351 does not revoke). Port the spike's `PaneHost` project and its 20 real-path tests (`pane/PaneHost.Tests`) into that location, targeting the pinned versions Phase 7/8 already validated: Avalonia 12.1.2, `Avalonia.Controls.WebView` 12.1.0, `Avalonia.AvaloniaEdit` 12.0.0, .NET 10.0.300, `vpk` 1.2.0. Decide and document the local build gate (this project is not `tsf`/`turbo`-built; per CLAUDE.md's "Hulk hates stairs" exception, publishing CI is the only CI exception this project makes, so `dotnet build`/`dotnet test` stays a local, documented manual gate the way `tools/ide/package.sh` is today — not wired into `./repokit`). **Wire ADR-341 D5's generator to a C# target, not a hand-mirrored copy**: the spike carries no `@sharpee/ide-protocol` types at all (checked — nothing under `pane/PaneHost` references them), so this is not a port, it's the generator's second target, exactly as D5 anticipated ("C# is the second target, added when the Windows shell needs it" — this app needs it on day one, all three platforms). Point the existing generator (proven against Swift as its first consumer, per D5) at `PaneHost`'s project, and fold the freshness check into whatever local gate this phase's build-gate decision established, alongside the grammar and ADR-276 manifest checks `./repokit verify` already runs. Rule 8b applies directly: a hand-written C# mirror of the protocol types is the defect rule 8b exists to prevent, not a shortcut to take because the shell is a spike port.
- **Exit state**: `dotnet test` passes 20/20 in-repo on this Mac, in code that names Avalonia nowhere in the capability seam (the spike's own discipline, ported forward). No feature beyond what Phases 0–6 of the spike already proved. `PaneHost`'s C# protocol types are generated, not hand-written — no `Codable`-style hand mirror exists in the new project.
- **Status**: **DONE (2026-09-16) on every deliverable except the protocol types, which moved to Phase 2a because the generator this phase was told to point at does not exist.** Home: `tools/ide/PaneHost/` + `PaneHost.Tests/` + `PaneHost.sln`, plus `tools/ide/editor-bridge/` (the lexer bridge's source, which the plan did not name but the port requires). `dotnet build` clean at 0 warnings; `dotnet test` **20/20, first run**. Capability seam still references no Avalonia type. Nine absolute paths — four pointing at a *sibling* spike's staging directory — replaced by `PaneHost/Hosting/RepoPaths.cs`; `SpikePaths.cs` deleted. The two uncheckable real dependencies are now named environment variables that **fail loudly rather than skip** (GH #435's pattern). Build gate documented in `PaneHost/README.md`. Record: `evidence/phase-2-production-scaffold.md`.

### Phase 2a: ADR-341 D5's protocol-type generator — Swift first, then C#
- **Tier**: Medium
- **Budget**: 250
- **Focus**: The deliverable Phase 2 could not meet. **This is a correction to this plan, not a discovered extra**: Phase 2 was written to "point the existing generator" at `PaneHost`, and there is no existing generator. Verified 2026-09-16 — `tools/` and `scripts/` carry the grammar, genai-api, appendix-D and meta generators and nothing protocol-related, and `tools/ide/SharpeeIDE` still hand-mirrors the `@sharpee/ide-protocol` types.
- **Entry state**: Phase 2 DONE. `PaneHost` references no protocol types, so no rule 8b defect exists to unwind — this phase adds the missing mechanism rather than replacing a mirror in the new app.
- **Deliverable**: Build the generator D5 specifies: it reads the TypeScript source of `packages/ide-protocol` and emits native types, with a freshness check folded into the same local gate the grammar and ADR-276 manifest checks use. **Swift is target one and `SharpeeIDE` is consumer one, per D5's resolved Q-5 ("now, the generator needs a real consumer first") — C# is target two.** AC-6 applies unchanged: `SharpeeIDETests` passes after the migration with no test change beyond the type source. Then point it at `PaneHost` and delete nothing by hand.
- **David's sign-off needed before starting**: the generator reads `packages/ide-protocol`, which ADR-341's Scope permits ("no `packages/` change beyond the generator's read of `ide-protocol`") but CLAUDE.md's platform-change rule still makes a discuss-first item. The Swift migration also touches the shipping app's type source.
- **Exit state**: One generator, two emitted targets, no hand-written mirror on either side, and a red gate when either drifts from the protocol. The memory *IDE decoder follows IR fields* — an IR rename breaking `ComposeDiagnostics.swift` silently — stops being true.
- **Status**: **DONE (2026-09-16, session 33ba00)** — `repokit protocol` emits both targets from
  one model: `tools/ide/SharpeeIDE/Generated/SharpeeProtocol.swift` (245 lines) and
  `tools/ide/PaneHost/Generated/SharpeeProtocol.cs` (426 lines), with `protocol --check` wired into
  `repokit verify`. Swift went first and `SharpeeIDE` is consumer one: its two hand-written mirrors
  are now extensions holding only the decode gates and reading conveniences, and the suite is
  **593 tests, 0 failures** — unchanged in count. `dotnet build` clean at 0 warnings;
  `ProtocolTypeTests` 4/4 decode the same fixture bytes the Swift suite decodes. The IR projection
  lives in `tools/repokit`, NOT `packages/ide-protocol` — no platform code produces or consumes it —
  so ADR-341's Scope holds as written and no `packages/` source changed. The drift guarantee was
  demonstrated, not asserted: renaming a projected field fails `tsc`. **AC-6 deviation**: two test
  sites needed a change (the phrasebook is now the wire's map, so the phrase key is the dictionary
  key), approved by David before the edit. Record: `evidence/phase-2a-protocol-generator.md`.

### Phase 3a: Toolchain correctness — GH #457, GH #448
- **Tier**: Small
- **Budget**: 120
- **Focus**: The half of the original Phase 3 that needs no vendored bytes and no
  Windows or Linux machine time. GH #457 is the urgent one — it stops the shipped
  toolchain building any Chord story, on macOS, today.
- **Entry state**: Phase 2a done. The estimate (Phase 3's own deliverable 1) exists at
  `evidence/phase-3-estimate.md` and David approved the split and the `packages/` edits
  on 2026-09-16, which is the platform-change discussion CLAUDE.md requires.
- **Deliverable**: GH #457's manifest edits and GH #448's two subprocess sites.
- **Exit state — rule 13a Integration Reality Statement required**: OWNED = the
  `pnpm deploy` closure `vendor-toolchain.sh` assembles, devkit's own esbuild subprocess,
  the `bin/sharpee` shim. REAL-PATH TEST: the issue's own reproduce — assemble a toolchain,
  build a Chord `.story` through the sealed shim — plus a test that actually drives the
  TypeScript browser branch, which no existing test does.
- **Status**: **DONE (2026-09-16, session 9f9266).** Five manifests: `dist-esm` added to
  `files` in `character`/`bootstrap`/`sharpee`; `module` and `exports["."].import` dropped
  from `bridge`/`runtime` (David's ruling — neither had a `dist-esm` directory at all, and
  nothing in the repo depends on either package). Two subprocess sites: `build-browser.ts`'s
  TypeScript branch now spawns devkit's own esbuild through `resolveEsbuild()`;
  `consumer-gen.ts` names `npm.cmd` on win32. A third candidate (`build.ts:122`, `npx tsc`)
  was **ruled out, not fixed** — the TS story template ships `typescript` as a devDependency
  and the Chord path returns thirty lines earlier; no `typescript` dependency was added to
  devkit. Results: devkit typecheck clean, **183 passed / 1 skipped / 0 failures**,
  `tsf validate --publish` exit 0 across 34 packages. Both real-path tests carry a negative
  control: hiding `dist-esm` in the sealed copy reproduces #457's exact error, and breaking
  the esbuild spawn turns the new test red. Record:
  `evidence/phase-3a-toolchain-correctness.md`.

### Phase 3b: Toolchain portability — Windows and Linux Node vendoring, the launcher
- **Tier**: Large
- **Budget**: 400 (unchanged from the original Phase 3; the estimate found the job larger
  than the plan assumed, not smaller — split at that point rather than padding, per the
  budget note this phase inherited)
- **Focus**: The single largest blocker to any non-macOS artifact. Everything downstream of
  this phase (Phases 4, 6, 7, and any real-path test on Windows or Linux) depends on its
  exit state.
- **Entry state**: Phase 3a done. **RULED, David 2026-09-16: cross-assemble from macOS,
  defer signing to the Windows box.** The Windows toolchain is assembled by the same bash
  running on the macOS build host; Authenticode signing is not this phase's problem and
  happens on the Windows box in Phase 6.
- **Shape this ruling produced** (probed against the real closure 2026-09-16, not inferred —
  each claim below was measured):
  - **One target-aware assembler, not a second script.** The estimate's "second assembler"
    conclusion was premised on the assembler running *on Windows*; the ruling removes that
    premise, so steps 1, 2, 2.5, 4 and 4.5 stay shared and only the target-varying parts
    branch. A copied script would duplicate the devkit-closure assembly, which is the part
    most likely to change (rule 7: one reason to change).
  - **esbuild is the only native binary in the whole closure** — verified by scanning the
    deployed tree: 1 Mach-O, 0 `.node` files, all other deps pure JS (`fflate` plus
    workspace packages). Cross-assembly risk is bounded to node + esbuild.
  - **`@esbuild/win32-x64` ships `esbuild.exe` at the package ROOT, no `bin/`** (verified by
    unpacking 0.27.2); `@esbuild/linux-x64` keeps `bin/esbuild`. esbuild resolves it at
    `lib/main.js:1641-1642` as `require.resolve('@esbuild/win32-x64/esbuild.exe')`. The
    existing graft's `[ -x .../package/bin/esbuild ]` precondition and its
    `file | grep x86_64` assertion are both darwin-shaped and fail on Windows for two
    different reasons (`PE32+ … x86-64`, hyphen not underscore; ELF likewise).
  - **Windows cannot ship the symlinked closure**, and naive dereferencing is not the fix:
    `cp -RL` of the pruned closure measured **523 MB against the symlinked 69 MB**, because
    pnpm keeps one real copy per package and every consumer link duplicates it. The fix is
    pnpm's own `--config.node-linker=hoisted`, which produced a flat closure at **69 MB with
    3 symlinks** (all in `node_modules/.bin`, all internal). This also *simplifies* the
    graft: the hoisted layout is flat, so the `.pnpm`-store surgery and consumer-link
    re-pointing the darwin path needs collapses to one `rm -rf` plus one `cp -R`.
  - **Ordering is load-bearing.** The deploy root's `@sharpee/devkit` self-link points into
    the live checkout (`…/Users/david/repos/sharpee/packages/devkit`, read directly). It
    must be pruned by the seal step BEFORE any dereference or hoist, or the shipped
    toolchain silently absorbs the developer's working tree — the exact failure the script
    header says step 4.5 exists to prevent.
  - **One layout across platforms**, platform-specific leaf only: `node/bin/node` on POSIX,
    `node/bin/node.exe` on Windows — even though the official win zip puts `node.exe` at the
    dist root. Keeping the shape identical means the launcher, the seal, and PaneHost each
    differ by a filename rather than by a path structure.
- **What the estimate found** (`evidence/phase-3-estimate.md`, 2026-09-16), and why this is
  not the "launcher rewrite" the original phase priced: **`vendor-toolchain.sh` cannot be
  extended to Windows.** Its own header says it is "Mac-only by nature"
  (`tools/ide/vendor-toolchain.sh:6`), and four mechanisms make that structural rather than
  incidental — step 4.6 codesigns Mach-O binaries against `EXPECTED_TEAM`; the esbuild graft
  (`:200–285`) rewrites pnpm store entries and re-points consumer **symlinks** with `ln -s`,
  asserting arch by grepping `file`'s output for `x86_64`; the seal enforcement (`:345–420`)
  is a symlink-escape scan, and pnpm on Windows uses junctions (Node reports those through
  `isSymbolicLink()`, so this *may* survive — a probe, not an assumption); and only the
  fourth, the `#!/bin/sh` launcher at `:298` requiring `$root/node/bin/node` at `:311`, is
  what the original phase priced. Windows therefore needs a **second assembler**. Linux is
  genuinely cheap by comparison: the POSIX shim and `node/bin/node` layout both hold, so it
  needs the tarball, an `ESBUILD_PKG` case for `@esbuild/linux-x64`, a non-Mach-O path around
  step 4.6, and a replacement for the `file | grep x86_64` arch assertion.
- **Deliverable**: vendor `win-x64` and `linux-x64` Node assets into `tools/ide/vendor/node/`
  (~+55 MB of permanent git history; the directory holds 25.9 MB + 27.5 MB today).
  **`linux-arm64` is out of this pass — David, 2026-09-16.** Build the Windows assembler in
  the shape decided at entry; extend the existing script for Linux. Give PaneHost a
  platform-shaped toolchain resolution: `tools/ide/PaneHost/Hosting/NativeHostServices.cs:39,41`
  hard-code `bin/sharpee` and `node/bin/node`, which Windows spells `bin\sharpee.cmd` and
  `node\node.exe` — a fourth site the original phase did not name.
- **Exit state — rule 13a Integration Reality Statement required, this is exactly the
  "runtime, subprocess" phase class it names**: OWNED = the vendored Node runtime, the
  launchers, PaneHost's toolchain resolution. REAL-PATH TEST required on both Windows and
  Linux machines (**needs David's machine time on both, named up front** — this cannot be
  inferred or stubbed per rule 13a and the GH #435 recurrence risk the goal names):
  `compose`/`build` executed from the vendored, network-free toolchain, the same three checks
  Phase 7/8 ran on macOS (`node --version`, `compose --json` exit 0, a streamed `build`).
- **Status**: CURRENT

### Phase 4: The pane door — D3's per-platform contract module, GH #464
- **Tier**: Large
- **Budget**: 350
- **Focus**: D3 exists to prevent the outcome it just produced — the pane door answers differently on each platform (macOS: no door, token-scoped loopback; Windows: `ICoreWebView2_3::SetVirtualHostNameToFolderMapping`, real, `hr=0x0`; Linux: `webkit_web_context_register_uri_scheme`, P/Invoked, and per ADR-351's Consequences this is *the mechanism ADR-341 D3 actually specifies*). This phase is where that split gets a single seam instead of three ad-hoc implementations.
- **Entry state**: Phase 2 done (Phase 3b not required — this phase can proceed on macOS alone and add the other two backends once Phase 3b's toolchain lands, since the door itself doesn't need the toolchain to exist, only the panes it serves do).
- **Deliverable**: One C# contract (a single interface `PaneHost` code depends on) with three concrete backends, each ported from its already-proven spike code rather than re-derived: macOS's token-scoped `HttpListener` loopback origin (proven, keep as-is — no equivalent Windows/Linux mechanism exists per D3's Consequences); Windows's `IWindowsWebView2PlatformHandle` → `ICoreWebView2_3` virtual-host mapping (proven in Phase 7 of the spike, `hr=0x0`); Linux's `IGtkWebViewPlatformHandle` → `webkit_web_context_register_uri_scheme` P/Invoke (proven in Phase 8). This module also owns **GH #464**'s fix — the testing surface and play client currently hard-code a WKWebView-shaped bridge (`window.webkit.messageHandlers`), which ADR-351 D6 explicitly assigns to "D3's contract module... in #464's place": the contract module supplies whatever post-door primitive each backend needs (real WebKit handler on macOS, `CoreWebView2.PostWebMessageAsString` on Windows, the GTK equivalent on Linux) behind one API the panes call without naming any of the three.
- **Exit state — rule 13a applies (this phase is squarely "runtime" class)**: OWNED = the three pane-door backends. REAL-PATH TEST per platform: the real, unmodified Docs/Play/Testing panes (`tools/ide/web/{docs-tab,testing-tab,testing-surface}`) served over each platform's real door — not the loopback fallback on Windows/Linux, where a real door exists — with both messaging directions proven (page → host, host → page) the way the macOS loopback origin already proved them.
- **Status**: PENDING

### Phase 5: macOS shipping integration — the relocation recipe, the x86_64 slice, GH #474
- **Tier**: Medium
- **Budget**: 250
- **Focus**: The macOS bundle-layout recipe is proven on a spike bundle, not on a shipping one. This phase is exactly the gap `docs/work/velopack-macos-bundle-layout/decision.md` names as still owed.
- **Entry state**: Phase 2 done. **Needs David at the keyboard** for the signing/notarization steps — Developer ID Application (RSNGKW5LNH), the App Store Connect API key, and `notary-submit.py`'s REST route (the same identity and route Phase 3 of the velopack-macos-bundle-layout plan used; `notarytool` crashes on upload on this machine — use `notary-submit.py`, not `notarytool`).
- **Deliverable**: Fold `relocate.sh` (payload → `Contents/Resources`) and `patch-apphost.py` (AppHost app-path patch, offset 66088 in the spike binary — re-verify the offset against the production binary rather than assuming it's stable) into real `tools/ide/` release tooling, applied **before** `vpk pack` per the load-bearing ordering constraint the decision record names (packing a pre-relocated `.app` lets `vpk pack --packDir` pass the tree through unchanged; post-processing `vpk`'s own output collides on `sq.version`). Extend to the **x86_64 slice**, unexercised by every prior phase. Fix **GH #474** (the Phase 4 shell probe reads assets from absolute paths outside the bundle, `pane/PaneHost/Shell/ShellWindow.axaml.cs:34-38` in the spike — the production port must read from the bundle-relative, relocated path instead, so the probe becomes evidence about the shipped launch path rather than a host-machine launch path).
- **Exit state — rule 13a applies ("packaging," "deploy" class)**: OWNED = the relocation recipe, the signing/notarization pipeline. REAL-PATH TEST: a production (not spike) `.app`, both `arm64` and `x86_64`, signed with Developer ID, submitted through `notary-submit.py`, Accepted, stapled, `spctl --assess --type execute` reporting `accepted`/`source=Notarized Developer ID`, and the bundled toolchain still answering from inside the notarized bundle.
- **Status**: PENDING

### Phase 6: Windows signed installer and install run
- **Tier**: Small
- **Budget**: 150
- **Focus**: AC-7-equivalent for Windows — closing the one thing Phase 7 of the spike explicitly left owed.
- **Entry state**: Phases 3b and 4's Windows backends done. **Needs David's Azure Trusted Signing identity and his Windows machine** — this is the single most keyboard-time-bound phase in the plan besides Phase 1; name it up front rather than discovering it at the wall. `vpk` 1.2.0's `--azureTrustedSignFile` flag exists and the code-sign step already runs as its own phase (proven in Phase 7 of the spike, unsigned).
- **Deliverable**: A signed `Setup.exe` built with `--azureTrustedSignFile` against David's identity, installed on a clean Windows machine (not the dev box that built it), and a parity check in the AC-4 shape — a story created and saved on macOS opens, composes, and plays unchanged on the installed Windows app.
- **Exit state — rule 13a applies ("deploy" class)**: OWNED = the Windows signing and install path. REAL-PATH TEST: the actual signed installer, actually run on a clean machine — not a dry-run pack, per the GH #435 recurrence risk the goal names.
- **Status**: PENDING

### Phase 7: Linux signing, update round trip, real panes served
- **Tier**: Medium
- **Budget**: 220
- **Focus**: Linux is checked but not proven end-to-end. Phase 8 of the spike built and ran the AppImage; nothing beyond that.
- **Entry state**: Phases 3b and 4's Linux backends done.
- **Deliverable**: Decide with David whether Linux needs a signing identity at all (AppImages commonly ship unsigned with a detached GPG signature as the convention, unlike Windows/macOS's OS-enforced code signing) — this is a real open scoping question, not a default to assume either way. Prove the Velopack delta-update round trip on Linux the way Phase 2 of the velopack-macos-bundle-layout plan proved it on macOS (apply a delta, verify the result runs). Serve the real, unmodified Docs/Play/Testing panes over the Phase 4 Linux door end-to-end (Phase 8 of the spike only proved the AppImage executed, not that the panes worked over the scheme).
- **Exit state — rule 13a applies ("deploy," "runtime" class)**: OWNED = the Linux packaging, update, and pane-serving path. REAL-PATH TEST: a real AppImage, a real delta apply, and the real panes served and exercised (not launched-and-quit) over the custom URI scheme.
- **Status**: PENDING

### Phase 8: Editor productionization — light palette, transport and indexing cost
- **Tier**: Medium
- **Budget**: 200
- **Focus**: The editor already answers D4 (native control, compiler's own lexer, no C# grammar port). This phase closes the two costs the spike deliberately left naive so the 7.41 ms/keystroke number would be attributable, plus the one visible defect.
- **Entry state**: Phase 2 done (does not depend on Phase 3b/4 — this is shell-only work).
- **Deliverable**: **GH #462 item (3)** — `ChordColorizer` currently holds its own brush constants instead of reading `ThemeTokens` (per `project_ide_decoder_follows_ir_fields` and ADR-297's token model), so the light palette's syntax colors don't flip; fix is named in the spike record as a one-edit change. Attack the two costs the 7.41 ms/keystroke figure attributed away from rendering: the unoptimized JSON-over-pipe transport to the vendored-Node lexer bridge (3.93 ms of the 7.41 ms) — move to a binary/length-prefixed frame instead of line-delimited JSON; the unoptimized whole-document C# index rebuild (3.86 ms, walking all 8,545 tokens on every keystroke) — rebuild only the changed line range. Target: get materially closer to the lexer's own 0.49 ms cost, not a specific number (this is optimization, not a scenario with a pass/fail bar).
- **Exit state**: Light palette flips correctly (screenshot evidence, mirroring `phase-4-shell-light.png`'s dark counterpart). Style-pass timing re-measured on the same 1755-line file used throughout this evaluation, with the new number and its attribution recorded the same way the original 7.96 ms/7.41 ms were.
- **Status**: PENDING

### Phase 9: Platform findings — GH #463, GH #465, GH #462 items (2) and (4)
- **Tier**: Large
- **Budget**: 350
- **Focus**: D6's remaining owed findings, which apply "under whichever shape wins" and are not specific to Avalonia, plus the two spike-debt items GH #462 left open.
- **Entry state**: Phase 2 done. **Confirmed with David before any `packages/` edit begins** (CLAUDE.md platform-change rule) — GH #463 (testing harness has no browser entry point; browser-clean logic sits behind node-bound barrels — locate the package this touches before scoping, likely `packages/branch-tester` or the testing-surface's bridge to it) and GH #465 (`story-loader` statically imports four `@sharpee/ext-*` packages regardless of a story's `use` declaration — `packages/story-loader`) are both `packages/` changes.
- **Deliverable**: Fix GH #463 (a browser-reachable entry point for the testing harness, so the testing surface doesn't depend on a node-bound barrel it can't actually import from a `WebView`/browser context). Fix GH #465 (conditional import of `@sharpee/ext-*` packages based on the story's `use` declaration, so every bundle doesn't carry all four regardless). Investigate and close **GH #462 item (2)** — the ADR-307 replay over-run (274 turn records / 12 `forkBoot`s against OpenSilver's 31/1 on the same document; relay ordering, boot payload, persisted state, and client double-delivery were each ruled out in the spike, so this needs a fresh angle, not a repeat of what already came back negative) and **item (4)** — `localStorage` persistence across an actual app restart (never exercised; the spike's probe closes its window without relaunching).
- **Exit state — rule 13a applies to GH #463's browser-entry-point fix ("integration" class)**: OWNED = the testing harness's browser reachability. REAL-PATH TEST: the testing surface actually running the branch-tester's tree/coverage/assertion logic from inside a `WebView` (or browser) context, not a Node-side stub of it. The replay over-run and localStorage items get ordinary behavioral tests per rules 12/13, not 13a (they are not subprocess/runtime integrations).
- **Status**: PENDING

### Phase 10: Shell parity audit
- **Tier**: Medium
- **Budget**: 220
- **Focus**: This is the phase whose real deliverable is the estimate for everything after it, not code — the goal's instruction "where a phase's real cost is unknown, say so and make its first deliverable the estimate" applies to the whole remaining product surface at once here, because inventing the shell-parity phases now would build them on an adjacent fact (the Swift app's structure) rather than on an audit of it.
- **Entry state**: Phases 4 and 8 done (the pane door and the editor are both settled enough that the remaining shell surface can be judged against a stable baseline).
- **Deliverable**: A parity table in the shape of ADR-341 AC-1 — one row per `tools/ide/SharpeeIDE` feature folder (`Build`, `Compose`, `Docs`, `Editor`, `Launch`, `Menus`, `Persistence`, `Play`, `Project`, `Publish`, `Settings`, `Test`, `TestingSurface`, `UI`, `Updates`, `Workspace`, `World` — 17 folders, 18,921 lines total) against the Avalonia shell's current coverage. Per `docs/work/avalonia-ide-evaluation/decision.md` §8, the known gaps already on record: the project tree lacks expand/collapse, keyboard navigation, and Assets recursion (a painted list; `TreeView` shipped but unused); the right-panel tabs are four against the Swift app's eight (no Index, no Reach, no Incomplete, no compose scheduler, no test relay, no auto-indent); the menu bar has two of seven menus built (File, Story). Each row gets a status (shipped / gap / not attempted) and an owner-and-reason the way ADR-341's AC-1 requires, plus a rough size estimate. This phase's exit state is a proposed set of follow-on phases (names, tiers, dependency order) to append to this plan — not the phases themselves, since appending them now would be planning from a guess rather than from the audit this phase produces.
- **Exit state**: The parity table exists, reviewed with David, and this plan is amended (new phases inserted after this one, PENDING) to cover the surface it names, sequenced by the same risk/independence logic used for Phases 1–9.
- **Status**: PENDING

### Phase 11 onward: Shell parity implementation — intentionally unscoped here
- **Tier**: Unknown — set per-phase when inserted
- **Budget**: Unknown — set per-phase when inserted
- **Focus**: The remaining `tools/ide/SharpeeIDE` product surface Phase 10's audit names as gaps.
- **Entry state**: Phase 10's parity table and follow-on phase proposal exist and are reviewed with David.
- **Deliverable**: Not defined by this document. This is a placeholder marking where Phase 10's output gets inserted as real phases — doing that here would be citing a fact (the size and shape of the remaining Swift surface) this plan has not yet gathered.
- **Exit state**: All inserted phases DONE; the Avalonia shell reaches the same acceptance bar ADR-341's AC-1 through AC-7 set for the Windows mirror, now applied to all three platforms.
- **Status**: PENDING (unscoped)

### Phase 12: Parity evidence and the Q-4 recommendation to David
- **Tier**: Small
- **Budget**: 120
- **Focus**: The terminal phase of this plan. It does not retire the Swift app — ADR-351's Consequences are explicit that nothing in it authorizes that, and the goal this plan was written from repeats the instruction directly: "reach parity, then stop and put the retirement question to David with evidence. Do not plan the retirement itself."
- **Entry state**: Phase 11's inserted phases are DONE (or David decides to gate this phase on partial parity — his call, not this plan's).
- **Deliverable**: Assemble the parity table (Phase 10, updated), the felt-comparison evidence (Phase 1), the cost actually spent across Phases 2–11, and every AC-4-shaped cross-platform check this plan ran (Phases 6, 7) into one record. Present it to David as the evidence for **Q-4** — when the macOS Swift app retires, and how ADR-341's D1 ("mirror") and D4 (editor) get amended in place versus superseded. State a recommendation; do not decide it.
- **Exit state**: David rules on Q-4. This plan ends here regardless of which way he rules — the retirement itself, if ordered, is its own plan.
- **Status**: PENDING

## Sequencing notes

- **Phase 1 is the only true hard gate.** Every other phase's PENDING status assumes Phase 1 resolved YES; if it doesn't, stop there and do not execute Phases 2–12.
- **Phases 3b and 4 are independent of each other but both gate everything downstream of them.** Phase 3b (toolchain portability) blocks Phases 6, 7, and any Windows/Linux real-path test. Phase 4 (pane door) blocks the "real panes served" deliverables in Phases 6, 7, and 9's testing-harness fix. They can run in either order or interleaved; neither blocks the other's start. Phase 3a gated neither — it was split out precisely because it needed no machine David does not already have in front of him, and it is DONE.
- **Phases 5, 6, 7 are platform-parallel and each carries its own named keyboard-time cost for David** (macOS: Developer ID + notarization; Windows: Azure Trusted Signing + a clean install machine; Linux: a scoping decision on whether signing applies at all). None blocks another.
- **Phase 8 is shell-only and can run any time after Phase 2.**
- **Phase 9 needs David's sign-off before it starts**, same as Phase 3a did, for the same CLAUDE.md reason (`packages/` edits).
- **Phase 10 is deliberately the last phase before this plan runs out of detail.** It exists so Phases 11+ get planned from an inventory instead of a guess.
- **ADR-341's Consequences still say "Linux is not addressed... under this ADR, Linux waits for its own decision."** That line is superseded by ADR-351 D2's ruling to cover Linux, but ADR-341 is deliberately left unedited while ADR-351 is DRAFT (both ADRs say so). This plan proceeds on ADR-351's ruling; the stale line in ADR-341 gets its cross-reference once ADR-351 leaves DRAFT (after Phase 1), not before — do not fix it mid-plan.
