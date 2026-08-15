#!/usr/bin/env bash
# -------------------------------------------------------------------
# vendor-story-templates.sh — mirror @sharpee/devkit's Chord story template into
# Chord Writer's own resources.
#
# Owner context: tools/ide — packaging.
#
# Public interface:
#   vendor-story-templates.sh    # no arguments
#
# Mirrors packages/devkit/templates/story-chord/ into
# SharpeeIDE/Resources/story-templates/, which project.yml registers as a folder
# resource — so StoryScaffold can render `story.story.template` from the app
# bundle in EVERY build configuration.
#
# WHY THIS EXISTS. Before it, `story.story.template` reached Contents/Resources
# only inside the OPT-IN vendored toolchain (ADR-279 D4,
# Resources/toolchain/devkit/templates/story-chord/) — three directories below
# where StoryScaffold looks, and absent entirely from any build that did not set
# SHARPEE_VENDOR_TOOLCHAIN=1. New Story therefore failed with "Story template is
# missing: story.story.template" in every configuration. Scaffolding a story must
# not depend on the 176MB opt-in toolchain.
#
# The mirror is committed, for the same reason Resources/docs-tab and
# Resources/play-themes are: XcodeGen resolves folder resources at generate time,
# so a gitignored mirror would make a fresh clone silently produce an app that
# cannot create a story. This script runs as a preBuild phase (cheap — one small
# directory copy) so the mirror can never go stale against devkit.
#
# INVARIANT — this is a MIRROR, not a source: never edit files under
# SharpeeIDE/Resources/story-templates/ directly. @sharpee/devkit owns the
# templates; this script owns the copy. The mirror is faithful, so it also
# carries package.json.template, which the IDE deliberately does not render
# (ADR-258 D2: a `.story` needs no package.json).
# -------------------------------------------------------------------
set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "$IDE_DIR/../.." && pwd)"
readonly SOURCE_DIR="$REPO_ROOT/packages/devkit/templates/story-chord"
readonly TARGET_DIR="$IDE_DIR/SharpeeIDE/Resources/story-templates"

die() { echo "vendor-story-templates: $*" >&2; exit 1; }

[ -f "$SOURCE_DIR/story.story.template" ] \
  || die "no story.story.template at $SOURCE_DIR — devkit's Chord template moved?"

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR/." "$TARGET_DIR/"

# The one file StoryScaffold renders. Its absence is the bug this script fixes,
# so assert it rather than trusting the copy.
[ -f "$TARGET_DIR/story.story.template" ] || die "mirror has no story.story.template"
echo "vendor-story-templates: mirrored $(find "$TARGET_DIR" -type f | wc -l | tr -d ' ') files into SharpeeIDE/Resources/story-templates"
