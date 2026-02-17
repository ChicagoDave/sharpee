# ADR-130: Zifmia vs Story Installers — Two Separate Products

## Status: PROPOSED

## Date: 2026-02-17

## Context

There are two completely different products that both use Tauri + the Sharpee engine, but they are **not the same thing**:

### Product 1: Zifmia

Zifmia is a **standalone story runner** — a general-purpose application that can open and play any `.sharpee` story bundle. Think of it like a PDF reader or an ebook app: one application, many documents.

- Named "Zifmia", uses Zifmia branding (icon, splash, about page)
- File association for `.sharpee` bundles
- Landing page shows a library or file picker
- Version tracks the Zifmia/Sharpee platform version (e.g., `Zifmia-0.9.90.msi`)
- One installer, plays any story

### Product 2: Story Installers

A story installer is a **native application that IS the story**. The user never sees "Zifmia" or "Sharpee" anywhere. It's the author's game, packaged as a downloadable desktop app.

- Named after the story: "Dungeon", not "Zifmia"
- Installer named after the story: `Dungeon-1.1.0.msi`, `Dungeon-1.1.0.dmg`
- Icon, splash/title screen, window title — all story-specific
- About page credits the story author; may mention "Powered by Sharpee" in fine print
- Version is the **story version**, not the engine version
- No `.sharpee` file association — it only plays its one embedded story
- Each story produces its own separate installer

### Current Problem

`build.sh -c zifmia` conflates both products. It builds a runner with a story bundle baked in, but doesn't customize the Tauri packaging (product name, icons, installer filename) from story metadata. The result looks like "Zifmia" to the user, even though it contains a specific story.

## Decision

### Two completely separate build paths

**1. Zifmia** — Built by `build.sh --runner`

Produces the generic Zifmia story runner with Zifmia branding. Published as "Zifmia". The `-c zifmia` flag in `build.sh` currently builds a runner + story bundle combo; this path continues to work for development/testing but is not the shipping path for story installers.

**2. Story Installers** — Built by `npx sharpee build --installer`

Part of the Sharpee authoring CLI. Takes the current story project and produces a native application that IS the story:

```bash
# Build a Dungeon installer for the current platform
npx sharpee build --installer --version 1.1.0

# With explicit overrides
npx sharpee build --installer --version 1.1.0 --icon path/to/icon.png --name "Dungeon"
```

The command:
1. Reads story metadata from the project's `package.json` (`sharpee.installer` field)
2. Builds the `.sharpee` story bundle
3. Stages a Tauri project configured for the story:
   - Sets `productName` to the story title (not "Zifmia")
   - Sets `version` to the story version
   - Sets `identifier` to the story's bundle ID
   - Copies story-provided icons into the icon directory
   - Sets window title to story title
4. Builds the runner with the story bundle embedded
5. Runs `cargo tauri build` to produce the native installer
6. Outputs: `Dungeon-1.1.0.msi`, not `Zifmia-1.1.0.msi`

### Story packaging metadata

Extend the `sharpee` field in story `package.json`:

```json
{
  "sharpee": {
    "title": "Dungeon",
    "author": "ChicagoDave",
    "headline": "The Great Underground Empire",
    "ifid": "...",
    "installer": {
      "productName": "Dungeon",
      "identifier": "com.chicagodave.dungeon",
      "icon": "installer/icon.png",
      "titleScreen": "installer/title-screen.png",
      "copyright": "Based on the 1981 Mainframe Zork by MIT"
    }
  }
}
```

Fields:
- **productName** — Installer and window title. Defaults to `sharpee.title`.
- **identifier** — Unique app ID for OS registration (reverse domain). **Required.**
- **icon** — Path to icon source (relative to story dir). The build generates required sizes (ICO, ICNS, PNGs). **Required** — the build will fail without it.
- **titleScreen** — Image shown on app launch before the game starts. **Required** — this is the author's product, it needs a title screen.
- **copyright** — Shown in installer metadata and about dialog. Optional.

### Pre-build validation

The `--installer` command runs validation before building and **fails fast** with clear error messages if anything is missing or broken:

**Required metadata** (build refuses to start without these):
- `sharpee.title` — story title
- `sharpee.author` — author name
- `sharpee.installer.identifier` — reverse-domain bundle ID
- `sharpee.installer.icon` — path must exist, file must be a valid image, minimum 512x512px
- `sharpee.installer.titleScreen` — path must exist, file must be a valid image

**Asset verification** (if the story has an `assets/` directory):
- Every asset referenced in story code exists in the assets directory
- Image assets are valid files (not corrupt/truncated)
- Total asset size is reported (warning if over a configurable threshold, e.g., 50MB)
- No stale/unreferenced assets are flagged (warning, not error)

**Version check:**
- `--version` flag is required (no guessing from package.json)
- Version must be valid semver

**Example output on validation failure:**
```
ERROR: Missing required installer fields:
  ✗ sharpee.installer.icon — not specified in package.json
  ✗ sharpee.installer.titleScreen — file not found: installer/title.png

WARNING: Asset issues:
  ! assets/old-map.png is not referenced by any story code (2.1 MB)
  ! Total asset size: 12.3 MB

Run with --help for installer requirements.
```

### Title screen / landing page

When the app launches, before the engine initializes:
- **Zifmia**: Shows the Zifmia library/file picker
- **Story installer**: Shows the author's title screen image (if provided), or goes straight to the game

The runner checks for `titleScreen` in bundle metadata and renders it during the loading phase.

### About dialog

The about dialog adapts based on context:
- **Zifmia**: "Zifmia Story Runner v0.9.90 — Powered by Sharpee"
- **Story installer**: "Dungeon v1.1.0 — by ChicagoDave — Powered by Sharpee Engine v0.9.90"

The story version is prominent. The engine version is secondary.

### Version handling

- **Zifmia**: Version tracks the Sharpee platform (`0.9.90`)
- **Story installer**: Version is the **story version** (`1.1.0`), set via `--version` flag. The engine version appears separately in the about dialog but does not affect the installer filename.
- `npx sharpee build --installer --version` sets the story version in all manifests (tauri.conf.json, Cargo.toml, version.ts)
- Native manifests require semver without pre-release suffixes

### Installer output naming

| Platform | Zifmia | Story Installer |
|----------|--------|-----------------|
| Windows  | `Zifmia-0.9.90.msi` | `Dungeon-1.1.0.msi` |
| macOS    | `Zifmia-0.9.90.dmg` | `Dungeon-1.1.0.dmg` |
| Linux    | `zifmia_0.9.90_amd64.deb` + `.AppImage` | `dungeon_1.1.0_amd64.deb` + `.AppImage` |

### Cross-platform builds

Both Zifmia and `npx sharpee build --installer` build for the **current platform only** (Tauri must compile natively). CI/CD with GitHub Actions can automate a matrix:

- **Windows runner** → MSI
- **Linux runner** → deb + AppImage
- **macOS runner** → DMG

## Consequences

### Positive
- Clear product identity: Zifmia is the runner, story installers are the author's product
- Story authors get a professional, branded native app with their name on it
- Users downloading "Dungeon" see "Dungeon" everywhere — no confusion about what "Zifmia" is
- Version management is clean: story version for story installers, platform version for Zifmia
- Part of the standard Sharpee CLI — authors don't need extra tooling

### Negative
- Installer build adds complexity to the Sharpee CLI (Tauri configuration, icon generation, staging)
- The `--installer` command needs to stage a temporary Tauri project (or patch and restore config files)
- Story authors who want custom icons need to provide them in the right format

### Neutral
- The `.sharpee` bundle format is unchanged — installer metadata lives in story `package.json`, not the bundle
- The Sharpee engine is invisible to end users of story installers (just like Unity is invisible to players of Unity games)
- The existing `-c zifmia` development path continues to work for quick testing
