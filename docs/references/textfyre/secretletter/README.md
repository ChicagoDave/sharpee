# `textfyre/secretletter/` — the 2009 Secret Letter source and design archive

Primary source material for the Chord port of *Jack Toresal and The Secret
Letter* (Textfyre, 2009), tracked as `docs/proposals/secret-letter-port.md` and
planned in `docs/work/secret-letter-port/plan.md`. This directory stands to that
port as [`dungeon-81/`](../../dungeon-81/README.md) stands to Dungeo: the
authoritative thing the work is checked against.

Provenance: `github.com/ChicagoDave/textfyre`, a ~800 MB archive of the whole
company. What is here is the Secret Letter subset, 8.5 MB across 85 files.

## This copy is deliberately modified

`docs/references/README.md` promises the material here never changes — "if one of
these ever does, that is a defect, not an update." **This corpus is the exception,
and the divergence is intentional and permanent.** Two substitutions were applied
before anything was committed, and a future session must read the difference from
upstream as correct rather than as corruption.

1. **A person-level exclusion.** The programmer on the Textfyre games must not
   appear in anything this project produces. His name is replaced by `Voldemort`
   throughout — 122 occurrences in each `story.ni` variant, 2 in each of 14 design
   documents — as are the initials he signed code comments with, which the
   name-level pass does not catch. One of the occurrences was a runtime credits
   line the shipped game printed to players.

2. **A dead name, corrected.** *Tara McGrew* wrote FyreVM and the `Quick Load`
   extension, and is credited normally and prominently. The 2007-2010 material
   predates her transition and carries the old name; every occurrence is corrected
   here. That includes the I7 extension author *directory*, which Inform's
   `Author/Extension.i7x` convention turns into a path — so the correction is
   structural, not only textual. Two of the occurrences were in `story.ni`,
   including a second runtime credits line, adjacent to the one above.

Both names verify at zero across this directory — content and paths, text and
binary — and that check is the gate any future addition here must also clear.

## Layout

| Path | What it is |
| --- | --- |
| `source/story.ni` | The Inform 7 source, `inform7/trunk` variant — 12,636 lines |
| `source/story-sh-1.2.ni` | The `sh-1.2` branch variant — 12,615 lines |
| `extensions/` | The full I7 extensions library the project used, kept whole rather than narrowed to Secret Letter's own includes, so later reading of any Inform code in the archive resolves |
| `design/` | 33 design documents as converted text — 16 Detail Design revisions, Orphan drafts back to 2007-02, narrative drafts, conversation documents, graphic-arts notes, recorded bugs |
| `diagrams/` | `Grubber's Market Puzzle.vsd` and `Orphan Map.vsd` — the designers' own puzzle and map diagrams |
| `dialogue/` | `Orphan - Dialogue Tables.xlsx` |
| `testing/` | The five clean playtest transcripts, recorded 2007-2010 in `>command` / response format |

## What was deliberately left out

- **The 80 MB of compiled builds** (`Releases/`). `~/repos/SecretLetter2026`
  separately holds five `.ulx` files; neither set belongs in this repository.
- **The original Word binaries.** A name embedded in a legacy `.doc` cannot be
  substituted reliably or verified clean afterward, so landing them would have
  meant committing unverifiable material carrying the excluded name. The gate
  forbids it, which is why `design/` holds converted text and not the originals.
  This also dropped ~32 MB of near-identical revisions.
- **`msproject/SecretLetter.xls`** — same problem in an Excel binary. The
  remaining project-schedule files are clean but carry nothing the port needs.
- **`games/shadow`** — *The Shadow In The Cathedral* is a different game (David,
  2026-08-21).

## What this corpus is not

It is **not** the validation corpus for ADR-322's state-space sweep. That port is
a separate effort (David, 2026-08-21) and carries neither AC-10 nor AC-11: the
Chord port is a *retarget*, and ADR-322 D13's argument rests on the 2009 design
invariant the retarget removes. The five transcripts here are reference material
for the port, and that statement asserts nothing in either direction about any
other use of them.
