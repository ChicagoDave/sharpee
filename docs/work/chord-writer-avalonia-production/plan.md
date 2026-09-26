# Session Plan: Production Chord Writer on Avalonia + Velopack (Windows, macOS, Linux)

**Created**: 2026-09-16
**Plan Status**: ACTIVE
**Superseded by**: docs/work/testing-explorer/plan-20260922-examinable-lens.md — still live (2026-09-22, session 760fe6): the lens plan grew out of this plan's channel-IO/testing work and runs first; every phase here is left as it stands and resumes once the testing approach is settled.
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
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` — D1/D2: the tree is the model, one JSON document `<story-id>.tests.json` holds the branch hierarchy, per-turn claims, fork structure, sibling order and the pinned seed; Consequences state the replay driver and its determinism contract "survive intact" through the v1→v2 rewrite — Phase 17's parallel-replay design must extend this coordination structure, not stand up a second one.
- `docs/architecture/adrs/adr-293-choice-points-per-point-streams.md` — one master seed governs a run, per-stream derivation is a frozen versioned hash mix, and "two engine instances in one process stop perturbing each other" is already proven — Phase 17's concurrent branches must preserve that same isolation per branch, not assume it.
- `docs/architecture/adrs/adr-347-the-ending-is-an-explicit-concept.md` — the Ending is a `WorldModel`-queryable concept, not an event to subscribe to, precisely because "the client's own design forbids event-subscription-based ending checks" — this is the constraint both options in Phase 16 must be framed against.
- `docs/context/session-20260918-1730-main.md` — most recent session's Open Items (3) files today, verbatim, the seam this goal calls CRITICAL: the testing surface's driver writes into a `command-input` the platform deliberately disabled past an ending, burning a 15s timeout, and `setInputHeld(false)` then re-enables what the platform disabled — filed as "reported, not fixed; David's call," which Phase 16 exists to resolve.

## Slice ordering (David, 2026-09-16 — supersedes the phase numbering below)

**We build one platform slice at a time, end to end: macOS, then Linux, then Windows.**
A slice is done when that platform has an application a person can install, open and use —
shell, panes, toolchain, installer, signing — not when one concern is finished across three
platforms.

The phase numbering below predates this ruling and cuts the other way: Phase 4 builds one
pane-door contract with all three backends at once, and Phases 5/6/7 then package three
platforms separately. **Read the numbers as a work inventory, not as an order.** The order is:

| Slice | Phases drawn on | Done when |
|---|---|---|
| **1. macOS** | 4 (contract + macOS loopback backend, shell entry point, GH #474), 5 (relocate, sign, notarize, x86_64), 8 (editor), 9 (platform findings), 10 (parity audit vs the Swift app) | a notarized macOS app that installs, opens, and edits a story |
| **2. Linux** | 3b (Linux half — vendoring DONE, real-path test owed), 4 (Linux WebKitGTK backend), 7 (packaging, signing, update round trip) | the same, on Linux |
| **3. Windows** | 3b (Windows half — vendoring DONE, real-path test owed), 4 (Windows virtual-host backend), 6 (Azure Trusted Signing, installer, clean-machine install) | the same, on Windows |
| **terminal** | 12 | the Q-4 recommendation, after all three slices |

**Phase 4 splits across slices.** Its deliverable — one contract, three backends — is built
contract-plus-one-backend in the macOS slice, and each later slice adds its own backend
behind the contract already standing. Building all three before any platform is usable is
what this ordering exists to prevent.

**What this ruling reorders, and why it was wrong before.** Two orderings were corrected on
2026-09-16, in this order. First, the app was behind the installer: Phases 5-7 shipped signed
installers while "is it an application" waited for Phases 10-11. Signing proves nothing about
a payload that is not the product and must be redone when the payload changes — and the
question it would answer was already closed by ADR-351 Q-5 on a real bundle
(`cbcd0706-f65c-4f13-9460-e9be833044ca`, Accepted, stapled). Second, and the deeper one, the
plan was sliced by concern rather than by platform, so no single platform would have reached
"usable" until nearly every phase was done. Slice ordering fixes both: within a slice the app
necessarily precedes its installer, because the slice is not done until someone can open it.

**3b is already out of order and that is fine.** The Windows and Linux Node vendoring was
built before the macOS slice is complete. The work is banked and verified; it simply should
not have been next, and its owed real-path tests now belong to their own slices rather than to
a phase of their own.

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
  `node\bin\node.exe` — a fourth site the original phase did not name. (This line said
  `node\node.exe` until 2026-09-16; that predates the one-layout ruling above and the
  assembler, both of which put the Windows runtime at `node/bin/node.exe`.)
- **Exit state — rule 13a Integration Reality Statement required, this is exactly the
  "runtime, subprocess" phase class it names**: OWNED = the vendored Node runtime, the
  launchers, PaneHost's toolchain resolution. REAL-PATH TEST required on both Windows and
  Linux machines (**needs David's machine time on both, named up front** — this cannot be
  inferred or stubbed per rule 13a and the GH #435 recurrence risk the goal names):
  `compose`/`build` executed from the vendored, network-free toolchain, the same three checks
  Phase 7/8 ran on macOS (`node --version`, `compose --json` exit 0, a streamed `build`).
- **Progress, 2026-09-16 (session 9dd6ac)**: PaneHost resolution is platform-shaped and the
  darwin regression run is DONE — `vendor-toolchain.sh` darwin/arm64 exit 0 at 177M, 2
  binaries signed, seal verified; `dotnet test PaneHost.Tests` against that staged toolchain
  passed 24 of 24 with nothing stubbed. Still open: the Windows and Linux REAL-PATH TESTS,
  which have never executed, and PaneHost's batch-shim spawn path, which is unreachable
  outside Windows. Record: `evidence/phase-3b-toolchain-portability.md`.
- **Status**: **BLOCKED (2026-09-16, session 9dd6ac) — hardware, not design.** Everything
  authorable on the macOS build host is done and verified; what remains is the exit state's
  REAL-PATH TEST, which needs a physical Windows machine and a physical Linux machine. David
  is out of town and has neither in hand. Resume the moment he does — the resume point is one
  `compose`/`build` run per platform from the assembled toolchain, plus whatever the
  batch-shim spawn path reveals on its first real Windows run. Nothing in this plan's macOS
  work depends on it (Sequencing notes: 3b blocks only Phases 6, 7, and Windows/Linux
  real-path tests).

### Phase 4: The pane door — D3's per-platform contract module, GH #464
- **Tier**: Large
- **Budget**: 350
- **Focus**: D3 exists to prevent the outcome it just produced — the pane door answers differently on each platform (macOS: no door, token-scoped loopback; Windows: `ICoreWebView2_3::SetVirtualHostNameToFolderMapping`, real, `hr=0x0`; Linux: `webkit_web_context_register_uri_scheme`, P/Invoked, and per ADR-351's Consequences this is *the mechanism ADR-341 D3 actually specifies*). This phase is where that split gets a single seam instead of three ad-hoc implementations.
- **Entry state**: Phase 2 done (Phase 3b not required — this phase can proceed on macOS alone and add the other two backends once Phase 3b's toolchain lands, since the door itself doesn't need the toolchain to exist, only the panes it serves do).
- **Deliverable**: One C# contract (a single interface `PaneHost` code depends on) with three concrete backends, each ported from its already-proven spike code rather than re-derived: macOS's token-scoped `HttpListener` loopback origin (proven, keep as-is — no equivalent Windows/Linux mechanism exists per D3's Consequences); Windows's `IWindowsWebView2PlatformHandle` → `ICoreWebView2_3` virtual-host mapping (proven in Phase 7 of the spike, `hr=0x0`); Linux's `IGtkWebViewPlatformHandle` → `webkit_web_context_register_uri_scheme` P/Invoke (proven in Phase 8). This module also owns **GH #464**'s fix — the testing surface and play client currently hard-code a WKWebView-shaped bridge (`window.webkit.messageHandlers`), which ADR-351 D6 explicitly assigns to "D3's contract module... in #464's place": the contract module supplies whatever post-door primitive each backend needs (real WebKit handler on macOS, `CoreWebView2.PostWebMessageAsString` on Windows, the GTK equivalent on Linux) behind one API the panes call without naming any of the three.
- **Exit state — rule 13a applies (this phase is squarely "runtime" class)**: OWNED = the three pane-door backends. REAL-PATH TEST per platform: the real, unmodified Docs/Play/Testing panes (`tools/ide/web/{docs-tab,testing-tab,testing-surface}`) served over each platform's real door — not the loopback fallback on Windows/Linux, where a real door exists — with both messaging directions proven (page → host, host → page) the way the macOS loopback origin already proved them.
- **Also in this phase, added 2026-09-16 (session 9dd6ac)**: make the app an app. `App.axaml.cs`
  starts `MainWindow` — the Phase 1 *probe driver*, by its own header — unless `--shell` is
  passed, so an installed bundle opens a probe that runs four seconds and exits. Make the
  shell the default entry point, and fix `RepoPaths` (GH #474) to resolve bundle-relative
  when no checkout sits above the running assembly, instead of throwing
  `DirectoryNotFoundException` for a missing `pnpm-workspace.yaml`. Both belong here rather
  than in Phase 5: they are what makes the thing openable, and the pane door is what makes
  it worth opening.
- **Sliced 2026-09-16 (session 9dd6ac)**: this phase no longer runs as one unit. The macOS
  slice builds the contract plus the **macOS loopback backend only**, together with the shell
  entry point and GH #474 above. The Windows virtual-host backend and the Linux WebKitGTK
  backend are deferred to their own slices, each added behind the contract already standing.
  The macOS half is a port of already-proven spike code, not a discovery — D3 records that no
  custom-scheme mechanism exists on this backend, so the `navigationSucceeded=False` the probe
  reports for `sharpee-play://` is the expected answer, not a defect.
- **Progress, 2026-09-16 (session 9dd6ac) — the app opens**: entry point inverted in
  `App.axaml.cs` (the shell is the default; `--pane-probe`, `--shell-probe` and `--editor`
  select the harnesses), and `ShellWindow` now holds the window instead of closing itself
  after its scripted pass. `RepoPaths` is bundle-aware: product assets (testing-surface,
  docs-tab, editor-bridge, toolchain) resolve at `Contents/Resources/<name>` when bundled,
  the development story is nullable and null whenever bundled — so an .app staged inside a
  working tree still refuses to load fernhill — and every story-dependent surface opens empty
  rather than throwing. `package-avalonia.sh` stages the product assets; fernhill deliberately
  is not among them. **GH #474 closed.** Verified: the packaged bundle, extracted OUTSIDE any
  checkout, opens and holds — log reads `project pane: no development story in this build`,
  `panes: … not started`, `shell: open` — where it previously died on
  `DirectoryNotFoundException`. `dotnet build` clean at 0 warnings; `dotnet test` 24 of 24.
  **The contract module now exists**: `IPaneDoor` (Mechanism, Configure, Open, PaneUri,
  MessageReceived, EvaluateAsync) with `LoopbackPaneDoor` as the macOS backend, and
  `ShellWindow` depends only on the interface — it names no mechanism and holds no
  `LocalOrigin`. Linux and Windows each add one implementation behind it in their own slice.
  Four real-path door tests added (real HttpListener, real bundle, no stubs); suite 28 of 28.
- **Progress, 2026-09-16 (session 374402) — the exit-state run passes; the panes are wired
  into the shell.** `ShellWindow` now navigates each pane through the door and waits for the
  view's own `NavigationCompleted` rather than a fixed sleep, routes every page→host message
  through `OnPaneMessage`, and hands each turn record back to the testing surface through a
  new `PaneRelay` (`tools/ide/PaneHost/Hosting/PaneRelay.cs`) — one delivery at a time, in
  arrival order, because the surface forks a fresh boot when the sequence does not match.
  Without that relay the panes loaded and sat inert. `--pane-exit-state` runs Phase 4's exit
  state over exactly that wiring and exits.

  **Evidence** — `dotnet run --project PaneHost/PaneHost.csproj -- --pane-exit-state`,
  2026-09-16, log at `~/Library/Caches/net.sharpee.panehost/dev/shell-log.txt`. All three
  real panes loaded in the real `ShellWindow` over the real door
  (`token-scoped loopback origin`): Play and Testing `readyState=complete`,
  `title=The Folly at Fernhill`; Docs `title=Sharpee — Documentation`. Both directions
  proven on each pane — host→page read the shim back from the live page
  (`{"via":"webkit.messageHandlers.sharpeeAvaloniaHost","strategy":"assign","installed":true}`),
  page→host delivered a ping posted through the shim's own handler on all three. The full
  round trip on the testing pane: boot replay posted 270 turn records, the relay delivered
  every one, `window.__sharpeeHost({type:'type',command:'inventory'})` → `typed` produced one
  further record, no delivery errors; the surface ended at 179 cards / 1007 anchors. Build
  clean at 0 warnings; door, server and protocol suites 16 of 16.

- **Progress, 2026-09-22 (session 0b21a9) — the capability suite runs; the exit state is
  fully discharged.** The toolchain was staged (`vendor-toolchain.sh` →
  `~/Library/Caches/net.sharpee.panehost/stage/toolchain`, 177 MB, sealed and signed, 2
  binaries Developer ID + hardened runtime + timestamped) and a dedicated Documents fixture
  written — `~/Documents/Sharpee Capability Fixture/capability-fixture.story`, trivial by
  design and never a real story. Writing it cost two removed-grammar errors that nothing in
  the repository warned about (inline `story "T" by "A"`, and `create the player`), so the
  fixture recipe now lives in `tools/ide/PaneHost/README.md` beside the variables it
  satisfies rather than only in this note.

  **Evidence** — `dotnet test PaneHost.Tests/PaneHost.Tests.csproj` with all three variables
  set, 2026-09-22: **88 passed, 0 failed, 0 skipped**. The nine capability tests named
  individually: real vendored node reports `v22.23.1`; `compose --json` through the sealed
  shim returns `schemaVersion` 2 with zero diagnostics and a non-blank title; a missing story
  exits nonzero on stderr; stdout lines spread ≥600 ms across the run, so they are not
  batched at exit; cancellation kills the process and the sentinel is absent from `ps`; the
  Documents write-then-read round trip holds and a missing subdirectory is refused.

  **The falsification check, which is the point.** Re-run with `SHARPEE_IDE_TOOLCHAIN`
  unset: 5 failed, 0 passed, 0 skipped, each failure naming the missing variable from
  `CapabilityPaths.Required`. The suite therefore cannot report green without exercising the
  real dependency — the GH #435 pattern is excluded by construction here, not by assertion.

- **Progress, 2026-09-22 (session 0b21a9) — GH #464 closed; the macOS slice of this phase is
  complete.** David ruled on the cross-app change. The page now addresses its host through
  one module, `packages/platform-browser/src/host-bridge.ts`: `window.sharpeeHost` first,
  `window.webkit.messageHandlers[channel]` as the fallback. All four call sites go through it
  — the play client's `turnEvents` (`turn-events.ts`), the surface's `testingSurface` and
  `testingConsole`, the docs tab's `docsTab` — and each built bundle now carries exactly one
  neutral reference and one fallback reference instead of its own spelling.

  **The macOS app changed by zero lines.** It registers real `WKScriptMessageHandler`s
  (`DocsTabViewController.swift:45` and siblings), so it is served by the fallback exactly as
  before. That is the whole reason the fallback exists; it is for the host that really is
  WKWebView, not for the two that were impersonating one.

  **The Avalonia host stopped impersonating Safari.** `PaneServer.HostShimScript` installed a
  counterfeit `window.webkit` — it replaced the entire object, because WKWebView's real one is
  read-only — so that pages calling a WebKit name would reach a non-WebKit transport. It now
  installs `window.sharpeeHost` and that block is gone.

  **One correction caught before it shipped.** The first pass serialized every body at the
  bridge. The channels do not agree on payload type: the three testing channels carry strings,
  but `docsTab` carries an object WKWebView bridges to `[String: Any]`, which
  `DocsTabViewController` reads with `guard let body = message.body as? [String: Any]`. A
  stringified body would have failed that guard silently and the docs tab would simply have
  gone quiet. The bridge now passes bodies through untouched, and that is an invariant in its
  header, not a convention.

  **Evidence** — three real-path runs, nothing stubbed:
  - `--pane-exit-state` on the real shell over the real door, fernhill: all four channels live
    (`docsTab` 3, `testingConsole` 5, `testingSurface` 3, `turnEvents` 32 — 43 messages),
    69 cards / 118 anchors, no delivery errors.
  - `xcodebuild test -only-testing:SharpeeIDETests/TestingSurfaceRealPathTests`: **17 of 17**,
    a real WKWebView booting the real committed surface bundle against the Swift app's real
    handlers — the shipping app's own path, proven after the rename.
  - `host-bridge.test.ts`: **11 of 11** (both addresses, neutral-preferred, late install,
    object body unserialized, no-host no-op, throwing host swallowed).
  - Regression gates: platform-browser **168 of 168**, PaneHost **88 of 88**, testing-surface
    **131 of 131**, `npx tsc --noEmit` exit 0, `dotnet build` 0 warnings.

  **The comparison that makes the above evidence rather than a green light.** The rewire was
  stashed, every artifact rebuilt identically, and the same probe re-run: baseline and rewired
  agree to the record — `turnEvents 32, cards 69, anchors 118`. The drop from the 270 records
  of 2026-09-16 is real and is NOT this change; it predates it, in `f38e47b7d` (the pane stops
  at an ending) and `de5b2ff34`.

  **Known unrelated failure, left alone:** `tools/ide/web/docs-tab`'s vitest suite fails 3 of
  43 on `Failed to resolve module specifier "./versions.json"` in `loadNav`'s data-URL import.
  Verified identical with the change stashed, so it predates this work. `node build.mjs`
  itself succeeds; only the test harness path fails.

  **Nothing is still open in the macOS portion.** Both gaps this phase carried since
  2026-09-16 — the unrun capability suite and the half-closed GH #464 — are discharged with
  evidence above. What remains of Phase 4 is by design in other slices: the Windows
  virtual-host backend and the Linux WebKitGTK backend, each one implementation behind the
  `IPaneDoor` contract that now stands.
- **Open product question, not decided here**: an installed app opens empty. What it *should*
  open — a welcome state, the last document, a Documents folder per ADR-280 D6 — is David's.
- **Status**: macOS portion **DONE** (2026-09-22, session 0b21a9). The phase stays open for the
  Windows and Linux backends, which belong to slices 3 and 2 respectively — see Slice ordering.
  The macOS slice's next phase is Phase 5.

### Phase 5: macOS shipping integration — the relocation recipe, the x86_64 slice, GH #474
- **Tier**: Medium
- **Budget**: 250
- **Focus**: The macOS bundle-layout recipe is proven on a spike bundle, not on a shipping one. This phase is exactly the gap `docs/work/velopack-macos-bundle-layout/decision.md` names as still owed.
- **Entry state**: Phase 2 done. **Needs David at the keyboard** for the signing/notarization steps — Developer ID Application (RSNGKW5LNH), the App Store Connect API key, and `notary-submit.py`'s REST route (the same identity and route Phase 3 of the velopack-macos-bundle-layout plan used; `notarytool` crashes on upload on this machine — use `notary-submit.py`, not `notarytool`).
- **Deliverable**: Fold `relocate.sh` (payload → `Contents/Resources`) and `patch-apphost.py` (AppHost app-path patch, offset 66088 in the spike binary — re-verify the offset against the production binary rather than assuming it's stable) into real `tools/ide/` release tooling, applied **before** `vpk pack` per the load-bearing ordering constraint the decision record names (packing a pre-relocated `.app` lets `vpk pack --packDir` pass the tree through unchanged; post-processing `vpk`'s own output collides on `sq.version`). ~~Extend to the **x86_64 slice**, unexercised by every prior phase.~~ **WITHDRAWN 2026-09-22 (David): the Avalonia head ships arm64 only.** See the Intel ruling under Status. Fix **GH #474** (the Phase 4 shell probe reads assets from absolute paths outside the bundle, `pane/PaneHost/Shell/ShellWindow.axaml.cs:34-38` in the spike — the production port must read from the bundle-relative, relocated path instead, so the probe becomes evidence about the shipped launch path rather than a host-machine launch path).
- **Exit state — rule 13a applies ("packaging," "deploy" class)**: OWNED = the relocation recipe, the signing/notarization pipeline. REAL-PATH TEST: a production (not spike) `.app`, `arm64` (~~and `x86_64`~~ — withdrawn 2026-09-22, see Status), signed with Developer ID, submitted through `notary-submit.py`, Accepted, stapled, `spctl --assess --type execute` reporting `accepted`/`source=Notarized Developer ID`, and the bundled toolchain still answering from inside the notarized bundle.
- **Exit state, amended 2026-09-16 (session 9dd6ac)**: add a launch check ahead of the
  signing checks — the installed app opens, its window stays up, and the bundled toolchain
  answers from inside it. The original exit state was entirely bytes, signatures and a
  subprocess; an app that exits after four seconds satisfies every one of those, which is
  how this phase ran a full evening green while the artifact was unopenable. That is GH
  #435's shape (green without exercising the real thing), applied to the app instead of the
  toolchain.
- **Progress, 2026-09-17 (session 374402) — the arm64 slice is done; x86_64 is blocked at the
  launch check.** Run against an app that opens, per the resume condition: the exit state's
  launch check ran first and passed, then the signing checks.

  **arm64 — complete, every exit-state line met.** Packaged with `package-avalonia.sh --arch
  arm64` (1.4.0, `ChordWriterAvalonia`). Launch check, from the portable zip extracted OUTSIDE
  any checkout: the app opens and **holds** (killed at 20 s by the timer, exit 124, not by
  itself), log reads `panes: no development story in this build — the pane server is not
  started`, `shell: open`; the bundled toolchain answers from inside the bundle — `node
  v22.23.1`, `Sharpee 5.4.1 · Chord 3.6.0`. Payload census: **20 of 20** Mach-O files carry
  `Developer ID Application: David Cornelson (RSNGKW5LNH)` with `flags=0x10000(runtime)` —
  `presign-payload.sh` holds through `vpk pack`, where the pre-fix census was 4 of 20.
  `codesign --verify --deep --strict`: valid on disk, satisfies its Designated Requirement.
  **Notarized: submission `85f97a6e-3540-4894-ae87-128f4af495d4`, Accepted, first submission**
  (via `notary-submit.py`, with the `Successfully uploaded file` marker that distinguishes a
  live submission from an orphan). Stapled, `stapler validate` worked, `spctl --assess --type
  execute` → `accepted` / `source=Notarized Developer ID`. Relaunched after stapling: opens
  and holds again.

  **x86_64 — packaged and signed, launch unproven, deliberately NOT notarized (GH #481).**
  The slice builds: `Contents/MacOS/PaneHost` is a real `Mach-O 64-bit executable x86_64`, the
  vendored node is x86_64 and answers `v22.23.1` / `Sharpee 5.4.1 · Chord 3.6.0` under
  Rosetta. But the app itself dies at launch with **exit 132 (SIGILL)** — silent, no window,
  no stdout/stderr, no `.ips` crash report. Rosetta is working for at least one x86_64 Mach-O
  in that same payload, so this is specific to the .NET app. What it establishes is that the
  launch check cannot be satisfied on this Apple Silicon machine; it does **not** establish
  failure on real Intel hardware, which needs an Intel Mac or a targeted probe. Notarizing it
  now would be exactly what Key Decision 1 rules out, so it was not submitted.
- **Correction, 2026-09-17 (David ran the installed arm64 build) — the pipeline is done, the
  macOS slice is not.** Everything above is true and none of it adds up to an application.
  The installed app has **no way to open a story**: the File and Story menus and the Build and
  Compose buttons carry no handlers, there is no file or folder picker anywhere in PaneHost,
  and `StartPanesAsync` only ever looks at fernhill — null in a bundle — so the right panel
  stays blank. Working controls: theme flip and the two panel toggles. **GH #482.**
  Every evidence run before this one was made from a checkout, where `RepoPaths` auto-loads
  fernhill and the shell looks alive; that path exercises the installed app's story-opening
  path not at all, because it has none. The amended launch check ("opens, holds, toolchain
  answers") is satisfied by this build and was never sufficient — the slice-ordering rule's
  bar is "install, open **and use**", and only the first two are met. Reporting "every
  exit-state line met" against a checklist that stops short of *use* is the same shape as the
  failure the amendment was added to prevent, one level up.
- **Progress, 2026-09-17 (session 374402, overnight) — the app is an app, and it is
  notarized.** David: "finish the macos app". What GH #482 named is closed:
  - **A story is a parameter, not a constant.** `StoryProject` resolves a chosen `.story`
    file or folder to its id, its built bundle and its tree document; `ShellWindow` holds one
    and every surface follows it. The hard-coded development story is gone from the shell.
  - **Every menu item and button does something.** File ▸ New Story… (folder picker + name
    prompt → `sharpee init` → opens it), Open Story… (file picker), Save (buffer → disk),
    Reveal in Finder; Story ▸ Build, Check (Compose), Run Tests; the Build and Compose
    buttons in the chrome band. All run the **vendored toolchain** — `HostServices.Current`
    is now wired to `RepoPaths.ToolchainRoot`, which it never was, so `ToolchainShim` was
    null in every build ever shipped. Output streams into the bottom panel as it arrives.
    `Item(header, gesture, action)` is the only way the menu is built, so an unwired item
    cannot be constructed.
  - **The panes follow the open story**, and are served from its own `dist/web/<id>`. The
    door gained `Close()` so a second story can be opened. With no story — or one not built
    yet — the door opens on the **docs pane alone**, so the empty state has something in it.
  - **The last story reopens on launch** (`ShellState`). That is the smallest answer to
    GH #479 that invents no product surface; the larger question stays open.
  - **GH #483, found and fixed: the packaged app stalled 35 seconds on every story open.**
    `HttpListener.Start()` resolves this machine's hostname internally, and inside a bundle
    that mDNS lookup needs Local Network Access: measured from inside the app,
    `Dns.GetHostEntry("MacBook-Pro.local")` took **35,011 ms and threw**, against ~1 ms for
    the same call in the same binary run outside a bundle. `LocalOrigin` no longer uses
    `HttpListener` — it binds `IPAddress.Loopback` with a `TcpListener` and speaks the HTTP
    the panes need (GET/HEAD, one request per connection, single byte ranges, 403 without
    the token, 404 for missing). Nothing resolves a name. Door open is now **0.25 s**.

  **Evidence — the authoring loop, run INSIDE the notarized bundle** (`--app-exit-state`,
  which drives the same methods the menu items call; log at
  `~/Library/Caches/net.sharpee.panehost/dev/shell-log.txt`), against a story copied
  **outside the repository** and stripped of its build output:
  - opened an unbuilt story: id `fernhill`, 8 files in the project pane, 1180 lines in the
    editor, `built=False`;
  - **Build** through the vendored shim: exit 0, `gate-clean`, emitted `dist/web/fernhill`;
    door opened on it 0.25 s later;
  - all three panes loaded with both directions proven (shim read back from each live page;
    a ping posted through the shim arrived at the host from each); testing round trip
    replayed **268 turn records, every one relayed back**, `type 'inventory'` → `typed`,
    no delivery errors, surface at 179 cards / 1007 anchors;
  - **Save**: file changed on disk, marker present, source restored;
  - **Check**: `gate-clean`; **Run Tests**: exit 0, **86 cards passing, 104 assertions**.
  - First run with nothing remembered: opens in 0.44 s on the Docs pane, which loads and
    reports ready, and the window holds.
  - `dotnet build` clean, 0 warnings. Tests **48 passing, 0 failures** (door, origin HTTP,
    pane server, protocol, story project). The 8 capability tests still refuse to run
    without `SHARPEE_IDE_TOOLCHAIN`/`SHARPEE_IDE_CAPABILITY_FIXTURE`.
  - **Notarized: submission `4d9ce630-973b-4eb6-bf55-351c9042fb41`, Accepted**, stapled,
    `stapler validate` worked, `spctl --assess --type execute` → `accepted` /
    `source=Notarized Developer ID`. Payload census 20 of 20 at Developer ID with hardened
    runtime. The stapled app is at `tools/ide/release-avalonia/arm64/Chord Writer
    (Avalonia).app`; the copy in `/Applications` is root-owned from the installer and was
    left untouched.
- **Progress, 2026-09-22 (session a5d716) — GH #481 re-diagnosed; it is not a runtime
  fault.** The blocker was recorded as a translation-level SIGILL in JIT or ReadyToRun code,
  with "disable R2R" named as the probe that would tell Rosetta from a real Intel failure.
  That probe was run, with five others, and the diagnosis does not hold. Six conditions on the
  same binary all exit 132: baseline; `DOTNET_ReadyToRun=0`; `DOTNET_TieredCompilation=0`;
  R2R + tiered + AVX all off; `DOTNET_EnableHWIntrinsic=0`; and — the load-bearing one — the
  **unbundled `dotnet publish` output**, which `relocate.sh`, `patch-apphost.py` and
  `presign-payload.sh` have never touched. The packaging recipe is exonerated, and so are the
  JIT, the precompiled code and the vector intrinsics.

  Under `lldb` the fault is a deliberate `ud2` in AppKit's own geometry validator, reached
  from WebKit: `_NSViewValidateGeometry` ← `NSViewValidateRect` ← `-[NSView initWithFrame:]`
  ← `-[WKWebView initWithFrame:configuration:]` ← managed frames. The slice gets through
  dyld, hostfxr, coreclr, the JIT, Avalonia startup and window creation, and dies building the
  **first `NativeWebView`** — `ShellWindow.axaml` declares three, all `IsVisible="False"`.
  `_NSViewValidateGeometry` is the abort path for a non-finite frame rect, which is also why
  no `.ips` is written: an intentional framework assertion, not a collected crash.

  One x86_64-only signal precedes it every run — `CurrentVBLDelta returned 200000 for display
  1 -- ignoring unreasonable value`, then `Bad CurrentVBLDelta for display 1 is zero`. The
  arm64 slice on the same machine and display writes **nothing to stderr at all**, opens,
  holds to the timer and loads all three panes. So the display subsystem reports nonsense to
  the translated process and not to the native one. That is a correlation and is stated as
  one: `CurrentVBLDelta` is refresh rate, not geometry.

  **What this does not settle is unchanged: real Intel hardware.** It is now better bounded —
  the fault is in a path that consumes display information, and the one visible x86_64-only
  input is wrong under translation — but no run on an Apple Silicon machine can decide it.
  Two routes: an Intel Mac, or a one-shot `macos-13` GitHub Actions runner (x86_64 native)
  that launches the slice and reads the same three lines. The second is cheap and definitive
  but this repository runs no macOS CI today (both workflows are `ubuntu-latest`) and standing
  policy is no CI gates for Sharpee — a diagnostic run is not a gate, but it is a new CI
  surface and David's call.
- **Status**: **DONE (2026-09-22, session a5d716).** Every exit-state condition is met, with
  the `x86_64` half withdrawn by David's ruling rather than waived: a production (not spike)
  arm64 `.app`, Developer ID signed with a 20-of-20 payload census at hardened runtime,
  notarized (submission `4d9ce630-973b-4eb6-bf55-351c9042fb41`, Accepted), stapled,
  `stapler validate` worked, `spctl --assess --type execute` → `accepted` /
  `source=Notarized Developer ID`, the bundled toolchain answering `v22.23.1` /
  `Sharpee 5.4.1 · Chord 3.6.0` from inside the notarized bundle, and the amended
  launch-and-use check satisfied — the authoring loop (open, Build, Save, Check, Run Tests,
  all three panes) run INSIDE the notarized bundle against a story outside the repository,
  2026-09-17, session 374402.

  **Three open items survive the phase and do not gate it**, because none was ever an
  exit-state condition: GH #479 (what a first run should show beyond the docs pane),
  GH #480 (bundle identity), and the installer `.pkg`, still unsigned and un-notarized —
  `vpk` warns, and it needs `--signInstallIdentity`, David's call. They are carried forward,
  not closed by this phase going DONE.

  **This does not close the macOS slice.** Under Slice ordering the macOS slice also draws on
  Phases 8 (editor productionization), 9 (platform findings GH #463/#465/#462) and 10 (shell
  parity audit), all PENDING. Phase 5 is the packaging and shipping leg of that slice, and it
  is the leg that is finished.

  Prior status, for the record: **macOS slice: the app is usable and notarized (2026-09-17, session 374402).**
  **Intel dropped — David's ruling, 2026-09-22: "drop the mac intel slice."** The Avalonia
  head ships **arm64 only**; the x86_64 slice leaves this phase's scope and GH #481 is closed
  as not planned. The defect is unresolved, not fixed — settling it would cost an Intel Mac or
  a new macOS CI surface, for a target macOS itself is sunsetting. The diagnosis keeps its
  value regardless: the unbundled `dotnet publish` output fails identically to the relocated,
  patched and signed bundle, so `relocate.sh`, `patch-apphost.py` and `presign-payload.sh` are
  exonerated. **Scope of the ruling: the Avalonia head only.** The shipping Swift Chord
  Writer's Intel installer is a separate live surface under ADR-279 D4 (its own per-arch DMG
  and `appcast-x86_64.xml`) and is untouched. `package-avalonia.sh`'s `--arch x86_64` path and
  `vendor-toolchain.sh`'s darwin/x86_64 vendoring stay as they are — unused by the arm64
  route, shared with tooling the Swift app uses, and not this ruling's to remove.
  Open: GH #479 (what a first run should show beyond the docs pane),
  GH #480 (bundle identity), and the installer `.pkg` is still unsigned and un-notarized (vpk
  warns; needs `--signInstallIdentity`, David's call). **GH #464 closed 2026-09-22** (session
  0b21a9, Phase 4's macOS portion) and is no longer an open item of this phase.
  Superseded status, for the record: **STOPPED (2026-09-16, session 9dd6ac) — deliberately unfinished, nothing
  notarized.** Built and kept: `package-avalonia.sh` (publish → vendor toolchain → icns →
  Info.plist → relocate → presign → `vpk pack --signAppIdentity`), `build-relocated-app.sh`,
  `patch-apphost.py`, `presign-payload.sh`, `dotnet-payload.entitlements`. Verified: the
  AppHost app-path field on the production binary (one occurrence, 13 bytes clear padding);
  a signed, sealed arm64 bundle whose `Contents/MacOS` is native-only and whose bundled
  toolchain answers `v22.23.1` / `Sharpee 5.4.1 · Chord 3.6.0` from inside it. Found: **`vpk
  pack --signAppIdentity` does not sign the relocated payload** — of 20 Mach-O files only 4
  carried our Developer ID; 16 .NET native libraries were still ad-hoc (`flags=0x2`) and
  libSkiaSharp/libHarfBuzzSharp still carried Microsoft's signature with no hardened runtime.
  `presign-payload.sh` closes that and is the durable value of this pass.
  **Not done, on purpose**: notarization, stapling, `spctl`, and the x86_64 slice. ADR-351
  Q-5 already proved the macOS bundle notarizes — submission
  `cbcd0706-f65c-4f13-9460-e9be833044ca`, Accepted first submission, stapled, `spctl`
  accepted (`docs/work/velopack-macos-bundle-layout/decision.md` §2). Re-proving it against a
  payload that is not the product buys nothing and must be redone once the payload is real.
  Resume after Phase 4, against an app that opens.

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

## Phases 13-17 — added 2026-09-18 (session 04d4dd): Index tab, World sub-panes, testing-pane concurrency

David commissioned these five phases directly, ahead of Phase 10's shell-parity audit, covering three
specific gaps that audit would otherwise have surfaced later (no Index tab, no Reach/Incomplete
World sub-panes) plus a design problem in the testing pane (serial-only branch replay, and the
"dead player past an ending" seam this session's own Open Items already filed as item (3)). This
extends the **same** plan rather than starting a new one — same feature, same `tools/ide/PaneHost`
codebase, and Phase 11 already reserves an "onward" placeholder for exactly this class of work.
When Phase 10 eventually runs, it should record Index/Reach/Incomplete as already addressed by
Phases 13-15 rather than re-listing them as open gaps. Phase 4 remains CURRENT — these phases are
queued behind it, not ahead of it; see the ordering note at the end of this section for what is
actually independent.

### Phase 13: Index tab — StoryIndex sections from StoryBuildReport
- **Tier**: Medium
- **Budget**: 250
- **Focus**: The right panel's missing Index tab. Parity target is the Swift `StoryIndex.swift`'s
  `sections(of:)`: seven `IndexSectionKind` cases (rooms, regions, things, people, actions, phrases,
  hatches), each row carrying a title, an optional dim detail, an `isCode` flag, and an optional
  authored `span` for navigate-to-source (D6 navigation).
- **Entry state**: `StoryBuildReport.cs` exists today (uncommitted) and already parses
  `dist/<id>.ir.json`, matching the Swift counts exactly for the build banner. The right panel
  already hosts multiple tabs (four, per Phase 4's progress notes) that a new tab can join.
- **Deliverable**: Extend `StoryBuildReport` (or a sibling type) to emit per-item rows for each of
  the seven sections — not just counts — carrying title, optional detail, and the IR's source span.
  Add the Index tab to the right panel rendering the seven sections with counts in their headers;
  selecting a row navigates the editor to the row's source span, mirroring the Swift
  `IndexRow.span` → editor-jump behavior.
- **Exit state**: For a reference story (fernhill), the Index tab's section counts match
  `StoryBuildReport`'s existing (already-proven-correct) banner counts, and clicking a row in each
  of the seven sections navigates to the right source location. `PaneHost.Tests` gains real-path
  tests asserting on the emitted section/row data against a real IR fixture — not a mock.
- **Status**: DONE (2026-09-18, session 04d4dd)
- **Progress**: `Shell/StoryIndex.cs` reads the IR into sections and rows; `StoryBuildReport` was
  rewritten to count *those rows* rather than walk the IR a second time, so the tab and the build
  banner cannot report different numbers for one story. `Shell/IndexPaneView.cs` draws the sections
  with counts in their headers; double-click reveals through `ShellWindow.RevealAsync`. The right
  panel's tab integers became a named `RightTab` enum on the way — inserting a tab was a
  renumbering hunt across a dozen call sites, and GH #488 has three more tabs to come.
  - **A single-file story's spans carry no `file` at all.** The first reader treated that as "no
    location" and discarded it, which cost fernhill — the reference story — navigation on every
    row. `IndexSpan.File` is now nullable and means "the story's own file".
  - Evidence, `--app-exit-state` inside the packaged bundle against secret-letter, 2026-09-18:
    `index: 390 declaration(s) listed, visible=True`;
    `index sections: Rooms 21, Regions 2, Things 121, People 14, Actions 9, Phrases 223` — the
    same six numbers as the build banner; `index reveal: "Alley" → grubbers-market.chord:45
    (span said grubbers-market.chord:45)`. Nine tests run against fernhill's real IR.

### Phase 14: World pane — Map and Reach sub-panes, segmented control
- **Tier**: Medium
- **Budget**: 250
- **Focus**: The de-risked half of World-pane parity. `sharpee world-index` already emits top-level
  `map` and `reach` JSON sections — the data exists; only the views are missing. Swift reference:
  `WorldMapView.swift` (299 lines) and `WorldReachView.swift` (181 lines) under `WorldView.swift`'s
  segmented control (225 lines), labeled "Map · n", "Reach · n", "Incomplete · n".
- **Entry state**: Avalonia's existing `WorldMapView.cs` (175 lines) is the only World view today —
  no segmented control, no Reach view, no Incomplete view.
- **Deliverable**: A segmented-control container mirroring `WorldView.swift`'s three-way switch,
  hosting Map, Reach, and a placeholder Incomplete tab (built out in Phase 15). Port/adapt the
  existing `WorldMapView.cs` under the new container. Build `WorldReachView.cs` reading the
  world-index JSON's `reach` section, sized to the Swift reference (181 lines).
- **Exit state**: The segmented control shows correct "Map · n" / "Reach · n" counts sourced from
  the same `sharpee world-index` JSON already generated; both views render real data for a
  reference story; switching sub-panes preserves each view's own state.
- **Status**: DONE (2026-09-18, session 04d4dd)
- **Progress**: The World tab is a `TabStripView` over three sub-panes, Incomplete being a
  placeholder that says so rather than an absent tab. `Shell/WorldReachView.cs` ports the Swift
  view's derivation verbatim — headline wording, section order, first-match tinting — so an author
  reading the two heads is not told one finding two ways. `LoadWorldViews` is the single load site
  for all three, because two would eventually show one story's map beside another's findings.
  - **Both new drawn views crashed the window on first real run**: `MeasureOverride` clamped to
    `availableSize.Height`, which is infinity inside a `ScrollViewer`, and Avalonia refuses an
    infinite measure with `Invalid size returned for Measure` (exit 134). `ProjectPaneView` has the
    same shape and is safe only because it is not in a scroller.
  - Evidence, same run: `world tabs: Map · 20 | Reach · 3 | Incomplete · 400`; each sub-pane shows
    exclusively; `world reach: 21 rooms · from northwest-junction · 3 findings`; after switching
    away and back, `3 finding(s), map still holds 20 room(s)`. Ten tests pin the headline and row
    derivation against analyzer-shaped output.

### Phase 15: World pane — Incomplete sub-pane and inline fix workflow
- **Tier**: Large
- **Budget**: 400
- **Focus**: The larger, interactive half of World-pane parity. Swift's Incomplete surface is not a
  passive list — `WorldIncompleteView.swift` (552 lines) is backed by `WorldFindingTable.swift`
  (479), `WorldCandidateCard.swift` (178), `WorldIgnoreStore.swift` (104), `WorldPhraseLocator.swift`
  (84), `WorldProseChunker.swift` (270), and `WorldSourceEdit.swift` (245) — roughly 1,912 of the
  reference's 3,717 total World lines. It is an inline author workflow (find a gap, see candidate
  fixes, apply or ignore, edit source in place), not a report.
- **Entry state**: Phase 14 done — the segmented control and its placeholder Incomplete tab exist.
  The world-index JSON's `incomplete` top-level section is already generated.
- **David's sign-off needed before starting on scope**: the goal's wording ("Map / Reach /
  Incomplete sub-panes, as the shipping app has") is consistent with either a passive findings list
  or the full interactive fix workflow, and the two are very different sizes. Absent a narrower
  instruction this phase is scoped to full parity, below.
- **Deliverable**: A findings table over the `incomplete` JSON section, candidate-fix cards per
  finding, a per-story-persisted ignore store, and inline source editing routed through the same
  editor/span mechanism Phase 13 builds for Index navigation.
- **Exit state**: The Incomplete sub-pane lists real findings for a reference story with a nonzero
  incomplete count; supports viewing candidate fixes; applying or ignoring a finding, with the
  ignore persisted across a reload; and jumping to the source location of a finding.
- **Status**: PENDING

### Phase 16: Testing pane — resolve the story-ending seam (design decision)
- **Tier**: Small
- **Budget**: 150
- **Focus**: The CRITICAL open item this goal names — already filed today as this session's Open
  Item (3): the testing surface is not a `story-ending` channel consumer (zero references in
  `tools/ide/web/testing-surface/src`). `platform-browser`'s `story-ending` renderer disables
  `command-input` and stamps `data-story-ended` once an ending fires; the driver's `typeCommand`
  writes into that element without checking `disabled`, so every replay step past an ending burns a
  15s `awaitNextTurn`/`awaitFence` timeout, and `setInputHeld(false)` then re-enables the box the
  platform deliberately disabled. The only live route past an ending is the client's menu,
  unreachable by the driver. This is a design question, not a port, and touches three ADRs: ADR-347
  (the Ending is queryable state, not an event to subscribe to — the client's own design forbids
  event-subscription-based ending checks), ADR-307 (the tree document and its replay
  driver/determinism contract "survive intact" and must not be disturbed), and ADR-293 (seed
  determinism — whatever detection mechanism is added must not perturb the pinned-seed replay).
- **Entry state**: None — analysis, not implementation. Independent of Phases 13-15.
- **Deliverable**: Present David at least two concrete options: (a) the surface treats an ending as
  terminal for that replay line — detect the disabled `command-input`/`data-story-ended` state and
  stop the branch cleanly instead of timing out; (b) the client grows a host-reachable route through
  the end-game prompt (a programmatic menu-equivalent the driver can invoke) so replay can continue
  past an ending. Name the cost and ADR-347/307/293 consequence of each. This is ADR-worthy by
  rule 11's own bar (it constrains future sessions); ask David whether to write it as an ADR before
  resolving it, per rule 11a.
- **Exit state**: David has ruled which direction to take, recorded as an ADR (or amendment) if he
  asks for one, or as a plan note otherwise. This ruling is Phase 17's entry condition.
- **Status**: DONE (2026-09-26, session 54fb33). Direction (a) shipped in session 04d4dd (the
  surface reads the `story-ending` channel and stops a line at an ending — ADR-353 D8). The
  remaining deliverable — the ended-vs-failed presentation call — was ruled by David on
  2026-09-25 under ADR-356's interview (Q-5): *"an ending is a declarative state. A card would
  block additional commands in that card and show a message for 'END STATE'."* Landed by
  `docs/work/testing-explorer/plan-20260926-adr356-d4-endstate.md` Phase 1 as the END STATE card (ADR-356 D4); the ruling is
  quoted beside ADR-353 D8. Closed on a ruling given, not inferred.

### Phase 17: Testing pane — parallel branch replay, dead-player and failed-card handling
- **Status**: SUPERSEDED by ADR-353 D8 (2026-09-19, session 04d4dd). This phase existed to make an
  eager whole-tree replay affordable by running branches concurrently. ADR-353 D1 removes the eager
  replay instead — the pane visits one line — so there is nothing left to parallelize, no
  per-branch seed isolation to preserve under concurrency, and no cross-branch failure
  coordination to design. Its replacement work is ADR-353 D1-D4, unplanned as yet. Phase 16 is
  NOT superseded: a branch entered by click can still reach an ending mid-prefix.
- **Tier**: Large
- **Budget**: 400 (provisional — re-estimate once Phase 16 rules, especially if it rules direction
  (b); the shape of "handle a dead player" is not knowable before that ruling)
- **Focus**: Today's testing surface (`tools/ide/web/testing-surface/src/main.ts`, `driveFreshBoot`/
  `replayTree`) replays every branch serially through one driver typing into one play client. This
  phase makes branch replay concurrent and applies Phase 16's ruling so a branch that dies (story
  ending) or fails a card does not stall the whole run.
- **Entry state**: Phase 16's ruling recorded. Today's serial replay — proven in Phase 4's progress
  notes at "270 turn records, every one relayed back" — is the regression baseline; parallelizing
  must not break it.
- **Deliverable**: Redesign branch replay to run multiple branches concurrently, each with its own
  play-client/driver instance, while preserving ADR-293's per-branch seed isolation (the same
  isolation already proven between two engine instances in one process) and ADR-307's tree document
  as the single coordination structure (no second source of truth for branch state). Apply Phase
  16's chosen ending-seam handling so a branch hitting an ending, or a branch whose card fails, is
  detected directly and reported rather than timing out.
- **Exit state — rule 13a Integration Reality Statement required (this is the "runtime" phase
  class: concurrent subprocess/play-client instances)**: OWNED = the branch-replay driver, the
  play-client instances it spawns, the tree-document coordination. REAL-PATH TEST: a real
  multi-branch tree replayed with genuine concurrency (not simulated), at least one branch
  deliberately ending and one deliberately failing a card, both handled without a fixed timeout, and
  the full run byte-identical at the pinned seed across repeated executions — verify the project's
  "one run is enough" determinism convention still holds for the new concurrent path before relying
  on it, since that convention was established against today's serial driver.
- *(Everything from Tier down is the phase as written before ADR-353 D8 superseded it, kept for the
  record. The Status is the SUPERSEDED line above; the trailing `**Status**: PENDING` this section
  also carried was removed 2026-09-20, session 1bd093 — two status lines in one phase is a phase
  with no status.)*

**Ordering within Phases 13-17**: Phase 13 (Index) and Phase 14 (World Map/Reach) are independent
of each other and of Phase 16 — any of the three can start next, in any order, alongside or after
Phase 4. Phase 15 depends on Phase 14 (needs the segmented-control scaffold). Phase 16 is pure
design work and should run early regardless of implementation order. *(Amended 2026-09-20, session
1bd093: this sentence also said Phase 17 could not be scoped until Phase 16 resolved. Phase 17 is
SUPERSEDED by ADR-353 D8 and depends on nothing now.)*

## Sequencing notes

- **Phase 1 is the only true hard gate.** Every other phase's PENDING status assumes Phase 1 resolved YES; if it doesn't, stop there and do not execute Phases 2–12.
> **The four bullets below predate the Slice ordering section above and are superseded by it
> wherever they disagree.** They are kept because each records a real dependency that still
> holds *within* a slice; they are wrong only about what runs next. Read them as constraints,
> not as an order.

- **Phases 3b and 4 are independent of each other but both gate everything downstream of them.** Phase 3b (toolchain portability) blocks Phases 6, 7, and any Windows/Linux real-path test. Phase 4 (pane door) blocks the "real panes served" deliverables in Phases 6, 7, and 9's testing-harness fix. They can run in either order or interleaved; neither blocks the other's start. Phase 3a gated neither — it was split out precisely because it needed no machine David does not already have in front of him, and it is DONE.
- **The app comes before the installer (added 2026-09-16, session 9dd6ac).** As written, this
  plan shipped signed installers in Phases 5-7 and only asked whether the thing inside them
  was an application in Phase 10 ("Shell parity audit") and Phase 11+ ("intentionally
  unscoped"). That ordering is backwards, and it showed: Phase 5 ran a full evening against
  its own exit state while the artifact it produced opened a probe that exited after four
  seconds. **Signing proves nothing about a payload that is not the product, and has to be
  redone when the payload changes** — and the question it would answer was already closed by
  ADR-351 Q-5 on a real bundle. So Phase 4 now precedes Phase 5, and carries the entry-point
  and GH #474 fixes that make the app openable. Phases 6 and 7 inherit this: do not build a
  Windows or Linux installer for a payload that is not yet an application.
- **Phases 5, 6, 7 are platform-parallel and each carries its own named keyboard-time cost for David** (macOS: Developer ID + notarization; Windows: Azure Trusted Signing + a clean install machine; Linux: a scoping decision on whether signing applies at all). None blocks another.
- **Phase 8 is shell-only and can run any time after Phase 2.**
- **Phase 9 needs David's sign-off before it starts**, same as Phase 3a did, for the same CLAUDE.md reason (`packages/` edits).
- **Phase 10 is deliberately the last phase before this plan runs out of detail.** It exists so Phases 11+ get planned from an inventory instead of a guess.
- **ADR-341's Consequences still say "Linux is not addressed... under this ADR, Linux waits for its own decision."** That line is superseded by ADR-351 D2's ruling to cover Linux, but ADR-341 is deliberately left unedited while ADR-351 is DRAFT (both ADRs say so). This plan proceeds on ADR-351's ruling; the stale line in ADR-341 gets its cross-reference once ADR-351 leaves DRAFT (after Phase 1), not before — do not fix it mid-plan.
