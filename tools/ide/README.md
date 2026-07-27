# Sharpee IDE

Native macOS authoring environment for **Chord** stories (ADR-258): open a
`.story` file (or the folder around it), edit with in-process Chord
highlighting, watch the project tree and Problems update live from the source
via `sharpee compose --json`, then Build and Play the browser bundle — no
`package.json`, no `node_modules`, no npm step, ever.

> **Status:** ADR-258 implemented — the IDE is a Chord authoring environment;
> the TypeScript author path (ADR-185) is retired. See
> `docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md` and the
> implementation plan at `docs/work/adr-258-ide-swift/plan.md`.

## What it does

- **Editor** — `ChordLexer.swift`, an in-process port of the Chord lexer,
  drives highlighting; the port is pinned against the same committed golden
  token stream as the TS lexer
  (`packages/chord/tests/fixtures/lexer-golden/lexer-golden.json`).
- **Problems** — structured diagnostics from `sharpee compose --json`
  (severity, stable code, full span), recomposed on a debounce as you type;
  clicking a row selects the exact offending range.
- **Project tree** — sourced from the Story IR of the same compose run, no
  build required; retains the last good compile (marked stale) while the
  source has errors; click-to-open jumps to the exact authored span.
- **Build / Play** — `sharpee build <file>.story` (PATH-resolved CLI), Play
  serves `dist/web/<id>/` where `<id>` comes from the story's header. A
  grammar-header `.story` opens for editing but cannot Build or Play.
- **Version check** — warns at launch when the installed toolchain speaks a
  newer Chord than the IDE (`sharpee --version`).

## Requirements

- macOS 26.0 or later
- Xcode 26.4 or later
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`
- The `sharpee` CLI on your login-shell PATH (for compose/build/play)

## Build / Run

```bash
cd tools/ide
xcodegen generate           # regenerate SharpeeIDE.xcodeproj from project.yml
open SharpeeIDE.xcodeproj   # then ⌘R in Xcode
```

Or from the command line:

```bash
xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -configuration Debug build

# Run the test suite (drives the real devkit CLI against real .story fixtures)
xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination 'platform=macOS' test
```

## Layout

| Path | Purpose |
|------|---------|
| `project.yml` | XcodeGen spec — source of truth for `.xcodeproj` |
| `SharpeeIDE/` | Swift / AppKit sources |
| `SharpeeIDE/Compose/` | compose --json decoder, runner, scheduler, Problems, tree state |
| `SharpeeIDE/Editor/` | editor pane, ChordLexer, highlighting |
| `SharpeeIDE/Resources/` | Asset catalog |

The `.xcodeproj` is **generated** and gitignored. Edit `project.yml` and regenerate; do not edit the project file directly.

## Bundle

- Bundle ID: `net.sharpee.ide`
- Deployment target: macOS 26.0

## Conformance obligations

Two language surfaces are duplicated on purpose and pinned:

- **Lexer** — `ChordLexerGoldenTests` asserts the Swift port against the
  committed golden; the TS-side vitest (`@sharpee/chord` `lexer-golden.test.ts`)
  reddens in CI when `lexer.ts` drifts. A lexer change regenerates the golden
  (`UPDATE_GOLDEN=1`) **and** updates the Swift port.
- **Wire schema** — `ComposeJsonPayload` mirrors `@sharpee/ide-protocol`'s
  `compose-diagnostics.ts` (`COMPOSE_JSON_SCHEMA_VERSION`); the Swift decoder
  rejects an unknown `schemaVersion` loudly.

The IDE's test suite runs locally in Xcode only (no macOS CI job yet — recorded
in ADR-258's consequences).
