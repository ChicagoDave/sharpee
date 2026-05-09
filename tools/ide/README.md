# Sharpee IDE

Native macOS authoring environment for Sharpee stories.

> **Status:** Phase 0 — empty 3-pane shell. See `docs/work/sharpee-ide/plan-20260509-phases.md` for the full phase plan.

## Requirements

- macOS 26.0 or later
- Xcode 26.4 or later
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`

## Build / Run

```bash
cd tools/ide
xcodegen generate           # regenerate SharpeeIDE.xcodeproj from project.yml
open SharpeeIDE.xcodeproj   # then ⌘R in Xcode
```

Or from the command line:

```bash
xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -configuration Debug build
```

## Layout

| Path | Purpose |
|------|---------|
| `project.yml` | XcodeGen spec — source of truth for `.xcodeproj` |
| `SharpeeIDE/` | Swift / AppKit sources |
| `SharpeeIDE/Resources/` | Asset catalog, future grammars |

The `.xcodeproj` is **generated** and gitignored. Edit `project.yml` and regenerate; do not edit the project file directly.

## Bundle

- Bundle ID: `net.sharpee.ide`
- Deployment target: macOS 26.0

## Phase plan

See `docs/work/sharpee-ide/plan-20260509-phases.md`.
