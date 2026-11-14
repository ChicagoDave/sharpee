# Chord Writer

The desktop authoring environment for **Chord** stories. An author opens a
`.story` file, edits it with Chord highlighting, watches Problems and the
project tree update from the source, builds, plays, and runs the story's tests,
with no `package.json`, no `node_modules` and no npm step.

Chord Writer has **two heads** in this directory. They are different programs
that host the same web panes and bundle the same toolchain:

| Head | Source | Stack | State |
|---|---|---|---|
| macOS (Swift) | `SharpeeIDE/`, built from `project.yml` | Swift 6 / AppKit, Sparkle | The shipping app: both macOS slices, published on sharpee.net |
| Avalonia | `PaneHost/`, `PaneHost.sln` | C# / .NET 10, Avalonia, Velopack | The carried-forward cross-platform shell (ADR-351). Packaged for macOS arm64 only, under a provisional identity, and not published |

`PaneHost/README.md` covers the Avalonia head in detail. This file covers what
the two heads share and how each is built, tested and released.

## Identity and versions

Read from `project.yml`, which is the source of truth:

- Product name: Chord Writer. Bundle id: `net.sharpee.chord-writer`.
- Deployment target and `LSMinimumSystemVersion`: macOS 12.0. `package.sh`
  refuses a bundle whose declared floor differs from its binary's.
- Chord Writer has its own version line (ADR-279 D1):
  `CFBundleShortVersionString` and `CFBundleVersion` in `project.yml`. The
  platform and Chord versions are shown beside it, not folded into it.
- The Avalonia package takes its version from the same `project.yml` line and
  its identity from `package-avalonia.sh` (`ChordWriterAvalonia`, provisional).

## The bundled toolchain

A packaged app carries the exact toolchain it was built against (ADR-279 D4):
a vendored Node runtime plus the sealed `@sharpee/devkit` closure, at
`Contents/Resources/toolchain`. `vendor-toolchain.sh` assembles it from the
workspace's own `packages/*/dist`, so **`./repokit build` comes first**: a
stale `dist` vendors without complaint.

The macOS head resolves `sharpee` in three tiers
(`SharpeeIDE/Compose/ComposeRunner.swift`, `resolveSharpee`):

1. the workspace's own `./sharpee` shim, when the story is inside this repository;
2. the first `sharpee` on the login-shell PATH;
3. the toolchain bundled in the app.

A development build does not vendor a toolchain unless
`SHARPEE_VENDOR_TOOLCHAIN=1` is set for `xcodebuild`. The Avalonia head reads
its toolchain from `SHARPEE_IDE_TOOLCHAIN` in a checkout and from the bundle
when packaged (`PaneHost/Hosting/RepoPaths.cs`).

## Requirements

- macOS, with Xcode and [XcodeGen](https://github.com/yonaskolb/XcodeGen)
  (`brew install xcodegen`) for the macOS head.
- The .NET 10 SDK for the Avalonia head, and `vpk` (Velopack) to package it.
  `package-avalonia.sh` looks for `vpk` at `~/.dotnet/tools/vpk`.
- Node and pnpm, with the workspace built (`./repokit build`).

## Build and run

macOS head:

```bash
xcodegen generate --spec tools/ide/project.yml
open tools/ide/SharpeeIDE.xcodeproj      # then ⌘R
```

`SharpeeIDE.xcodeproj` is generated and gitignored; edit `project.yml` and
regenerate. Every build runs four pre-build scripts that rewrite derived
bundles under `SharpeeIDE/Resources/` in place (`build-docs-tab.sh`,
`vendor-play-themes.sh`, `build-testing-surface.sh`,
`vendor-story-templates.sh`). Those bundles are committed, so a build can leave
a diff; commit what it produces.

Avalonia head:

```bash
dotnet build tools/ide/PaneHost.sln
dotnet run --project tools/ide/PaneHost/PaneHost.csproj
```

## Layout

| Path | Purpose |
|---|---|
| `project.yml` | XcodeGen spec for the macOS head: targets, versions, pre-build scripts |
| `SharpeeIDE/` | macOS head sources |
| `SharpeeIDE/Editor/` | Editor pane, `ChordLexer.swift`, `SyntaxHighlighter.swift` |
| `SharpeeIDE/Compose/` | `compose --json` runner and scheduler, Problems, tree state, `ChordVersionCheck.swift` (the pin) |
| `SharpeeIDE/Build/`, `Play/`, `Test/`, `TestingSurface/`, `Publish/` | Build, Play, the test runner, the Testing tab's surface, Publish |
| `SharpeeIDE/Docs/`, `World/`, `Project/`, `Launch/`, `Workspace/`, `Updates/` | Documentation tab, World tab, project pane, launch flow, story detection and headers, Sparkle updates |
| `SharpeeIDE/Generated/` | `SharpeeProtocol.swift`, generated; never edited by hand |
| `SharpeeIDE/Resources/` | Asset catalog and the derived bundles: `docs-tab`, `testing-surface`, `play-themes`, `story-templates` |
| `SharpeeIDETests/` | macOS head test suite |
| `PaneHost/` | Avalonia head: `Shell/`, `Hosting/`, `Editor/`, `Theme/`, and `Generated/SharpeeProtocol.cs` |
| `PaneHost.Tests/` | Avalonia head test suite (xunit) |
| `editor-bridge/` | The Avalonia editor's lexer service: `build.mjs` bundles `packages/chord/src` into `dist/lexer-server.js` (gitignored) |
| `web/docs-tab/`, `web/testing-surface/` | Sources and tests for the two web panes both heads host |
| `vendor/node/` | The vendored Node tarballs and their checksums |
| `vendor-toolchain.sh`, `toolchain-realpath-test.sh` | Assemble the bundled toolchain; prove it builds a story with nothing else installed |
| `package.sh`, `release-all.sh`, `dmg/`, `sparkle/` | macOS head packaging, the two-slice release driver, DMG assembly, Sparkle payloads |
| `package-avalonia.sh`, `build-relocated-app.sh`, `patch-apphost.py`, `presign-payload.sh` | Avalonia head packaging |
| `notary-submit.py` | Notarization through the Notary REST API, without `notarytool` |
| `test-fixtures/` | Frozen story fixtures for the test suites |
| `release/`, `release-avalonia/`, `DerivedData/` | Build and release output, gitignored |

## Generated protocol types

The wire types both heads decode are generated from the TypeScript contract
(ADR-352), never hand-mirrored:

```bash
./repokit protocol           # regenerate SharpeeIDE/Generated and PaneHost/Generated
./repokit protocol --check   # fail if either is stale
```

## Conformance obligations

Three things are duplicated on purpose and must move together.

- **The lexer golden.** `packages/chord/tests/fixtures/lexer-golden/` holds a
  corpus and its token streams. The TypeScript lexer is enforced against it by
  `packages/chord/tests/lexer-golden.test.ts`, and the Swift port by
  `ChordLexerGoldenTests` (ADR-258 D7). A lexer change regenerates the golden
  (`pnpm --filter '@sharpee/chord' golden:lexer`) and updates
  `ChordLexer.swift`. New syntax needs a corpus file that exercises it, or the
  golden proves nothing about it. The Avalonia editor does not port the lexer;
  it runs the real one through `editor-bridge`.
- **The twin keyword sets.** `SharpeeIDE/Editor/SyntaxHighlighter.swift` and
  `PaneHost/Editor/ChordColorizer.cs` each hold the keyword and property word
  lists. `PaneHost.Tests/ChordColorizerTests.cs` reads the Swift file from the
  checkout and fails when the two differ, so a new word goes into both in one
  commit.
- **The pin and the docs bundle.** `supportedLanguageVersion` in
  `ChordVersionCheck.swift` is the Chord language version the macOS head's
  language surfaces were written against; the app warns at launch when the
  installed toolchain speaks a newer one. `ChordVersionCheckTests` compares the
  pin with the workspace CLI, and `DocsTabRealPathTests` compares it with
  `chordLanguageVersion` in `Resources/docs-tab/docs-index.json`. The pin and a
  rebuilt docs tab therefore move in the same commit, after the golden covers
  the new surface.

## Tests

No suite here runs in CI; each is a local gate.

```bash
# macOS head. Opens the app on the desktop for about a minute, no clicks needed.
xcodebuild test -project tools/ide/SharpeeIDE.xcodeproj -scheme SharpeeIDE \
  -destination platform=macOS -derivedDataPath tools/ide/DerivedData

# Avalonia head. The capability tests need a vendored toolchain and a story
# folder in Documents, and fail by name when the variables are unset.
SHARPEE_IDE_TOOLCHAIN=<resources-dir>/toolchain \
SHARPEE_IDE_CAPABILITY_FIXTURE=<story folder in Documents> \
SHARPEE_IDE_CAPABILITY_STORY=<that folder's .story file> \
  dotnet test tools/ide/PaneHost.Tests/PaneHost.Tests.csproj

# Web panes
npx vitest run --root tools/ide/web/docs-tab
npx vitest run --root tools/ide/web/testing-surface

# The lexer golden, TypeScript side
pnpm --filter '@sharpee/chord' test:ci lexer-golden

# Packaging
bash tools/ide/vendor-toolchain.sh <resources-dir> --arch arm64
bash tools/ide/toolchain-realpath-test.sh <toolchain-dir | resources-dir | .app>
bash tools/ide/dmg/dmg-layout-test.sh
bash tools/ide/sparkle/update-realpath-test.sh <stapled-app>
```

`vendor-toolchain.sh` signs the vendored binaries with the Developer ID
certificate, so it needs that identity in the keychain.

## Release

Releasing is local and needs David's Apple credentials: the Developer ID
Application certificate (team RSNGKW5LNH), a notary credential, and the Sparkle
EdDSA key. Nothing here runs in CI.

Both package scripts end by proving the toolchain they bundled. The bundled
`sharpee --version` must read the workspace's own
`Sharpee <packages/devkit version> · Chord <CHORD_LANGUAGE_VERSION>`, and
`toolchain-realpath-test.sh` must scaffold and build a story with it in a
scrubbed environment outside the repository. Either failure stops the script.

**macOS head.** Set the version in `project.yml` and `chordWriter` in
`website/src/lib/versions.json`, commit, then:

```bash
bash tools/ide/release-all.sh        # both slices; drives package.sh per slice
bash tools/ide/package.sh --arch arm64 --no-notarize   # rehearsal: signs, submits nothing
```

`package.sh` runs the platform build, archives, vendors and signs inside out,
proves the toolchain, notarizes and staples the app, builds and notarizes the
DMG, and writes the Sparkle payload. It never waits on Apple: it records the
submission id under `release/<arch>/` and resumes on the next run.
`release-all.sh` polls and re-runs it, then collects everything under
`release/<version>/` with `UPLOAD.md` and `CHECKSUMS.txt`. The files are
uploaded to sharpee.net by hand (zips before appcasts), and the website deploy
serves them. Each architecture has its own Sparkle feed (ADR-279 A3).

**Avalonia head.**

```bash
bash tools/ide/package-avalonia.sh --arch arm64
```

It publishes `PaneHost`, vendors the toolchain, builds the editor bridge from
the workspace's Chord sources, relocates the bundle, signs, packs with `vpk`
and proves the toolchain. Output lands in `release-avalonia/<arch>/`.
Notarization is a separate step through `notary-submit.py`. `--no-sign`
produces a bundle for inspection only: it cannot be shipped, and on Apple
silicon it does not launch, because the relocated AppHost no longer matches its
ad-hoc signature. No hosting or update feed exists for this head.

## Decision records

ADR-258 (the Chord authoring environment), ADR-279 (packaging, the bundled
toolchain, Sparkle), ADR-341 (Windows), ADR-351 (host shape), ADR-352
(generated protocol types). They record decisions as made; read the code for
what is true now.
