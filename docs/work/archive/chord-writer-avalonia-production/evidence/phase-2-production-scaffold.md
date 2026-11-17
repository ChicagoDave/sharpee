# Phase 2 — production scaffold: in-repo home, spike port, capability seam

**Run 2026-09-16, session e923d3, on `main`.** Everything below was executed on this Mac.

## Home

`tools/ide/PaneHost/` and `tools/ide/PaneHost.Tests/`, beside `tools/ide/SharpeeIDE/` (Swift),
which is the plan's proposal taken as written. `tools/ide/PaneHost.sln` ties the two projects so
one command builds both. The three web panes under `tools/ide/web/` are untouched and shared
(ADR-341 D3/AC-3, "panes built once," which ADR-351 does not revoke).

A third directory came in that the plan did not name: **`tools/ide/editor-bridge/`**. The
editor's Chord highlighting runs the real compiler lexer as a Node service, and that service's
source lived in the spike at `editor/src/lexer-server.ts` (71 lines) with its own `build.mjs`.
Without it the ported editor references a bundle no one can build. It is part of the port, not
an addition.

## What the port actually required

A file copy was not the work. Nine absolute paths were, four of them pointing at a **sibling
spike's** staging directory (`/Users/david/repos/spikes/opensilver-ide/…`) for the vendored
`node` and the world index. None of that can live in the repository.

They are replaced by `PaneHost/Hosting/RepoPaths.cs`, which resolves the repository root by
walking up for `pnpm-workspace.yaml` (override: `SHARPEE_REPO`) and **throws** when it cannot
find it, so a misresolved root fails at once instead of degrading into a pile of
missing-asset reports. `SpikePaths.cs` is deleted; `grep -rn SpikePaths` over both projects
returns nothing. The four machine-local dependencies that genuinely cannot be checked in are
named by environment variable and documented in `PaneHost/README.md`.

`build.mjs` carried two hardcoded `/Users/david/repos/sharpee` paths, one of them an absolute
`import` of the repo's esbuild. Both now resolve from the script's own location.

Probe output moved from the spike's `out/` to `~/Library/Caches/net.sharpee.panehost/dev`
(override: `SHARPEE_IDE_DEV_OUT`), preserving the spike's rule that probe output never lands in
a working tree.

## Real-path tests (rule 13a)

```
$ dotnet test tools/ide/PaneHost.Tests/PaneHost.Tests.csproj
Passed!  - Failed:     0, Passed:    20, Skipped:     0, Total:    20, Duration: 2 s
```

Twenty of twenty, first run, in-repo. Nothing is stubbed: the real vendored `sharpee` shim, the
real vendored `node`, a real Documents folder, real processes.

The two dependencies that cannot be checked in — a ~175 MB staged toolchain and a Documents
fixture — were hardcoded constants in the spike and are now required environment variables
that **fail the run with the variable's name when unset**. They do not skip. A skipped
real-path test reports green without exercising anything, which is GH #435's recurring pattern
(5 occurrences), and these are precisely the tests that pattern would hollow out.

The Documents fixture is still the one GH #458 tracks. It is *read and written* by these tests,
as in the spike, and deliberately **not adopted** into the repository — its disposition stays
David's, unchanged by this port.

## The capability seam stayed clean

```
$ grep -rn "^using Avalonia" tools/ide/PaneHost/Hosting/
(nothing)
```

Not one Avalonia type is referenced anywhere in `Hosting/`. The only occurrence of the word in
that directory outside comments is `PaneServer.HostHandlerName = "sharpeeAvaloniaHost"`, a wire
name shared with the panes' JavaScript shim — renaming it would break the panes, so it stays
and is recorded rather than tidied.

Eighteen files carried `Owner context: Avalonia + Velopack ("O6") evaluation spike, Phase N`
headers. All eighteen now name the production owner context and cite the evaluation as the
evidence for their shape. Rule 9 with `documentationStandard: always` makes that part of the
port, not a cleanup pass.

## Build gate

Local and documented, never CI — `PaneHost/README.md` carries it. `DOTNET_ROOT` must be
exported first (not set in a fresh shell on this machine, and its absence produces a misleading
"You must install .NET"). `.gitignore` gained `bin/`, `obj/` and `editor-bridge/dist/`.

```
$ dotnet build tools/ide/PaneHost.sln
Build succeeded.  0 Warning(s)  0 Error(s)
```

Zero warnings, which took one real fix rather than a suppression: making the world index
optional produced a nullable-argument warning at its call site, so the map now draws empty and
logs why when `SHARPEE_IDE_WORLD_INDEX` is unset.

## The deliverable this phase could NOT meet

**ADR-341 D5's generated C# protocol types. The generator does not exist.**

D5 reads: *"the generator's first emitted target is Swift, its first consumer is
`tools/ide/SharpeeIDE`… C# is the second target, added when the Windows shell needs it."*
The plan's Phase 2 instructed pointing "the existing generator (proven against Swift as its
first consumer, per D5)" at `PaneHost`. Verified this session: **there is no such generator.**
`find` over `tools/` and `scripts/` for a generator returns the grammar, genai-api, appendix-D
and meta generators and nothing protocol-related, and the Swift app still hand-mirrors the
types (the project memory *IDE decoder follows IR fields* records the consequence: an IR rename
breaks `ComposeDiagnostics.swift` silently).

The plan read D5's intent as accomplished fact. That is the failure `docs/core-concepts`
names — a claim built from an adjacent fact rather than the thing itself.

**What was done instead of a workaround.** Nothing. `PaneHost` references no
`@sharpee/ide-protocol` types at all, exactly as the spike did, and that is the correct state
while the generator is missing: a hand-written C# mirror is the defect DevArch rule 8b exists
to prevent, and Phase 2's own text forbids it in as many words. D5's ordering also forbids
building the C# target first — Swift is target one, before any second-shell code.

So the deliverable moves to its own phase rather than being dropped or faked. It is not
blocking: the ported app needs no protocol types until it talks to the introspection manifest.
