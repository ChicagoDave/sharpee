# `docs/references/` — authoritative external source material

The opposite of [`docs/unofficial/`](../unofficial/README.md). Everything here is
**canon**: primary source material that live code and active work are checked
against.

These files are git-cold by nature and that is not a staleness signal. A 1981
source archive should never change; if one of these ever does, that is a defect,
not an update.

| Path | What it is |
| --- | --- |
| `dungeon-81/` | The 1981 Mainframe Zork MDL source — the authoritative reference for the Dungeo port. `patched_confusion/` is canon per David (2026-07-15); `original_source/` is the unpatched original. |
| `textfyre/secretletter/` | The 2009 *Jack Toresal and The Secret Letter* Inform 7 source and design archive — the authoritative reference for the Chord port (`docs/proposals/secret-letter-port.md`). **Deliberately modified**: two person-level name substitutions were applied before staging, and its own `README.md` records them. Read that first — the divergence from upstream is intentional, and this directory is the stated exception to the never-changes rule above. |

## Why this directory exists

`dungeon-81/` lived at `docs/internal/` and was classified git-cold by the
2026-08 docs consolidation, which would have quarantined it as unmaintained. It
is neither unmaintained nor superseded: `stories/dungeo/CLAUDE.md` names it *the
authoritative MDL source*, five Dungeo combat sources carry line-level
provenance into it (`melee.ts`, `melee-tables.ts`, `melee-messages.ts`,
`melee-npc-attack.ts`), and six work documents under `docs/work/schism/` and
`docs/work/dungeo/` treat it as the canon they measure completeness against.

Git-coldness is the wrong signal for a frozen reference corpus. That is the
distinction this directory exists to make: **unmaintained** and **unchanging**
look identical in git history and mean opposite things.

## What belongs here

Primary source material the project is checked against, that the project does
not itself author. Not documentation about Sharpee — that is
`docs/core-concepts/`, `docs/architecture/`, or sharpee.net. Not superseded
material — that is `docs/unofficial/`.
