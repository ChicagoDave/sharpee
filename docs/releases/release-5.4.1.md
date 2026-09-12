# 5.4.1 — one source for the engine version, and installable packages again

**Status**: PUBLISHED
**Published**: 2026-09-11
**Chord language**: 3.6.0
**Traces to**: ADR-334 · [ChicagoDave/tsf#1](https://github.com/ChicagoDave/tsf/issues/1) · [#433](https://github.com/ChicagoDave/sharpee/issues/433)

## What shipped

Two fixes that both come down to a tool being wrong about something it did not own.

The 5.4.0 packages could not be installed. The build tool that publishes them discarded every
subpath export on the way to npm, so `require("@sharpee/branch-tester")` failed with
`ERR_PACKAGE_PATH_NOT_EXPORTED` on a file that was sitting in the tarball. That is fixed in the
toolchain and this release is the first one published with the fix, which is the main reason it
exists.

The engine version was the second. It is banner text — `Sharpee Engine v5.4.1` under `version`,
`Powered by Sharpee version 5.4.1` under `about` — and it was being carried to the player by five
separate build stampers through a story's own source file. Two of them disagreed: an author build
stamped the compatible-major floor, so a story built on 5.4.0 told its player the engine was 5.0.0.
A story the platform never stamped at all, which is every Chord `.story` file, showed no engine line
in its banner whatsoever. The running engine now reports its own version, and the route that carried
a build tool's opinion of it is deleted.

## Details

- The engine version has one source: the platform constant stamped at platform build time. The
  `version` and `about` actions, the `info` channel, and the opening banner all read it directly.
- **A Chord story's banner now carries its engine line.** `start()` read the version off
  `StoryInfoTrait`, which only a build pipeline writes, so a story loaded from IR emitted
  `game.started` with no version and the banner dropped the `platform-version` block silently.
- **An author build no longer stamps a version range as a version.** The author-side stampers
  computed the value from the `^<major>.0.0` dependency range with its caret stripped, which is how
  every 5.x author build came to report `5.0.0`.
- `engineVersion` is removed from `StoryInfoTrait`, from the story-info projection, from
  `BrowserBuildEnv`, from the browser client's `StoryInfo` config, and from every generated story
  `version.ts`. `STORY_VERSION` and `BUILD_DATE` still stamp — those are per-build facts a story
  owns.
- The `info` channel still carries `engineVersion` for clients that show it, now always present and
  sourced from the constant rather than from whatever the story happened to be stamped with.
- Published packages carry their subpath exports again (tsf 1.0.4). `@sharpee/platform-browser`
  ships `./channels`, `./channels/prose`, `./channels/status`, `./channels/text-content` and
  `./styles/*`; `@sharpee/transcript-tester` ships `./assertion-core`.

## Upgrading

Breaking in its public types, though nothing a story reads:

- `StoryInfoTrait.engineVersion` is removed. A story that set it can drop the line — the value it
  was setting is now supplied by the engine.
- `BrowserBuildEnv.engineVersion` is removed, and `PlaygroundBuildEnv.engineVersion` is renamed to
  `version`: it was the playground's own version pin and never an engine version.
- `StoryInfo.engineVersion` is removed from the browser client's config, and the generated browser
  entries no longer pass it.
- A generated `src/version.ts` no longer exports `ENGINE_VERSION`. A hand-written browser entry that
  imports it should drop the import; the next build restamps the file either way.

Anyone on 5.4.0 should move to 5.4.1 — 5.4.0 remains uninstallable for any package that declares a
subpath entry point.
