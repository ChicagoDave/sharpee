# The Shadow In The Cathedral — reference corpus

*The Shadow In The Cathedral* (Textfyre, Inc.). Designed by Ian Finley and Jon Ingold,
written by Jon Ingold. Inform 7 / Glulx on the Textfyre VM; the staged source is the
Version 2.0 (Windows 8 Store) build, © 2013.

**This is reference material, not a port target.** It is staged for one reason: it is the
model for the Vedd idiom layer in the *Secret Letter* remake — see
`docs/work/secret-letter-port/vision.md` §2, "The mechanism: an idiom layer." Nothing in
this project ports, adapts, or ships any part of this game.

## Contents

| Path | What |
|---|---|
| `source/story.ni` | Inform 7 source, 22,301 lines / 1.3 MB |

## Divergence from upstream: the two-name gate was applied

The gate defined in `../secretletter/README.md` binds every addition under
`docs/references/textfyre/`. Both gated names were present in this source as staged and
have been corrected in place. **The file therefore differs from upstream, deliberately:**

1. **The person-level exclusion.** The programmer on the Textfyre games must not appear in
   anything this project produces. **62 occurrences**, all the identical `G. <name>` form in
   the changelog's Who column (no in-game character shares the name — checked before
   substituting), replaced with `G. Voldemort`, matching the form already used throughout
   `../secretletter/source/`.
2. **Tara McGrew's dead name.** The FyreVM engine credit at `source/story.ni:106` carried
   it. **1 occurrence**, corrected to her correct name. She is credited normally.

Verified after the substitutions: **zero repository-wide hits** for both names, which is the
property the gate exists to preserve. Line count is unchanged at 22,301 — only the names moved.

Applied 2026-08-22, session 5c4a1e.

## What the corpus was read for

The Vedd idiom technique, catalogued in `vision.md` §2 with line citations: idiom
substitution (`story.ni:750`, "I know all the hymns by gear"), its presence in narration and
response text rather than only NPC dialogue (`750`, `16778`), clockwork as the sacred order
rather than the local industry (`3108`), and the calibration finding that the figurative layer
is far lighter than the literal machinery vocabulary suggests.
