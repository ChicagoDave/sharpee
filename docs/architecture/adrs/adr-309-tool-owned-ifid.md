# ADR-309: The Tool Owns the IFID — Identity Lives in the Story Config

**Status**: ACCEPTED (2026-08-10, session ed3730 — all four open questions
resolved by interview the same day; `adr-review` 13/19 NEEDS WORK → five
findings folded (D5, D6, E2E scenario, ACs, flip owner) → 19/19 READY FOR
IMPLEMENTATION; accepted by David on the re-reviewed result. Implementation
lands pre-DMG; the ADR-298/284 amendment stamps land with it, never
before.)
**Date**: 2026-08-10 (session ed3730)
**Amends**: ADR-298 D5 (the `analysis.missing-ifid` warning is removed —
there is nothing to warn about when the tool guarantees the field), ADR-284
(the publish-time hard gate stays, but becomes unreachable-by-construction
for tool-built stories). Retires go-live item 5 (the diagnostic wording
question is moot when the diagnostic is gone).
**Flip owner**: the implementing session stamps the amendment pointers onto
ADR-298 D5 and ADR-284 in the same edit set that deletes the diagnostic —
never before (the warning ships until then). The ADR-307 flip pattern.

---

## Context

A story's IFID (Treaty of Babel, ADR-074) must exist and must never change
across the story's lifetime — saves, publication, and registration all key
on it. The toolchain treated it as an author responsibility: a compile
warning when missing, a Generate IFID quick-fix in Problems, a `sharpee
ifid` utility, and a publish-time refusal. That put a stability-critical
identifier in the one place it can be casually lost or edited: the story
source. An author who deletes the line and re-mints has silently forked
their story's identity.

David's ruling (2026-08-10): *"the IDE controls the ifid... period... the
author never cares and should never change it and we state that in the
docs."* Qualified same session: *"someone will come along with 'I just want
the CLI tool for Chord and don't want to use the IDE'"* — so "the tool"
means the TOOLCHAIN. Chord Writer and the devkit CLI are two hosts of one
behavior; a CLI-only author is mainline, not an edge.

## Decision

### D1 — `{story-name}.config.json` is the identity's home

A tool-owned sidecar beside the `.story` file records the minted IFID. The
config is CANON: the header `ifid:` line in the story source is the tool's
*rendering* of the config value, not an input.

### D2 — Born with identity; adoption is the legacy edge only

Create Story in Chord Writer AND `sharpee init` on the CLI mint the IFID at
creation and write the config before the author types a word (resolved Q-2,
David 2026-08-10: CLI-only authors are mainline) — in the mainline, the
"story with no config" case never occurs. The adoption path
exists only for stories predating this ADR or authored bare outside the
tool: first sight of a config-less story adopts the existing header
`ifid:` into a new config (recording existing identity, not author
choice), or mints once if the header has none.

### D3 — The header line is maintained, not policed

No diagnostic. The tool reconciles the source to the config: a missing
`ifid:` line is re-inserted; an edited one is overwritten back. The value
the config holds is the value the story carries — the author cannot change
identity from the source file, and deleting the line never re-mints.

**Reconciliation happens on save** (resolved Q-1, David 2026-08-10): Chord
Writer reconciles the buffer as the file is written to disk — the one
moment that is both prompt and expected, so live typing is never fought and
every on-disk state is correct. The CLI reconciles at its own read/write
moments (`build`/`compose`), which is the same rule from the file's point
of view.

### D4 — The docs say so

Author documentation states plainly: the IFID is the tool's; you never
need to touch it, and edits to it don't stick. No remedy instructions,
because there is nothing to remedy.

### D5 — A broken config is a named error, never a guess

A config that exists but cannot be read as identity — malformed JSON, a
missing or invalid `ifid` value — is an ERROR named to the author (a
Problems row in Chord Writer, a non-zero named refusal on the CLI). The
tool never silently re-mints over a broken config: re-minting is exactly
the identity fork this ADR exists to prevent, and a config that once held
the identity may be recoverable from history precisely because it is
committed (Consequences). Absence and breakage are different states:
ABSENT triggers adoption/minting (D2); BROKEN stops the line.

### D6 — Publish reconciles through the same shared function

`sharpee publish` reconciles through the SAME function `build`/`compose`
use, wired into its own gate path (`checkPublishable` compiles
independently of build — plan-review corrected this ADR's original "publish
builds first" wording, 2026-08-10) — so a published story's header and
config always agree by construction. ADR-284's refusal remains only as the
backstop for a bare story that never passed through any host path at all.

## Consequences

- `analysis.missing-ifid` is deleted from the analyzer; the Problems
  Generate IFID quick-fix loses its trigger (the fix action itself may be
  retired with it).
- Hosts own minting and reconciliation (compiler stays pure — `compile()`
  neither mints nor writes). Chord Writer reconciles on its write paths;
  `sharpee build`/`compose` reconcile identically on theirs (resolved Q-2).
- ADR-284's publish refusal remains as the backstop for bare hand-built
  stories that never passed through a host.
- **Lands pre-DMG** (resolved Q-4, David 2026-08-10): the fresh-install
  walkthrough that accepts the DMG exercises Create Story and the bundled
  Fernhill sample with the config present from day one, and the bundled
  docs describe the final behavior.
- `{story-name}.config.json` is **designed-open** (resolved Q-3, David
  2026-08-10 — "opens the door for other config items"): minimal today
  (`version` + `ifid`, nothing speculative), and the declared home for
  future durable tool-owned per-story settings. Durable facts only — view
  ephemera stay in their own sidecar (the D7 lesson). The file is
  **committed to the author's repository** — gitignoring it would lose
  identity on clone, defeating its purpose; the docs say never to ignore
  it.

## End-to-End Scenario

Create Story "Harbor" (or `sharpee init harbor`): `harbor.config.json`
exists before the first keystroke, carrying `version` and a minted `ifid`;
the `.story` header renders the same value. Delete the `ifid:` line and
save — the line is back, byte-identical value, no new mint. Edit the value
to something else and save — overwritten back from the config. Open a
pre-ADR story that has a header `ifid:` but no config — the first host
contact writes the config carrying the header's exact value (adoption, no
re-mint). Corrupt the config JSON — the next save/build is a named error;
nothing mints, nothing reconciles, the line stops. Compile a bare story
with no `ifid:` anywhere — no warning appears (the diagnostic is gone);
`sharpee publish` on that never-hosted story still refuses per ADR-284.

## Acceptance Criteria

- **AC-1 (born with identity)**: a fresh Create Story / `sharpee init`
  project has `{story-name}.config.json` with `version` + `ifid`, and the
  `.story` header carries the identical value. Self-verifying.
- **AC-2 (reconciliation)**: deleting the header line then saving restores
  the identical value; editing it then saving overwrites it back; the
  config file's bytes are untouched by both. Asserted on file contents
  through the real save path, both hosts.
- **AC-3 (adoption, no re-mint)**: a header-only legacy story's first host
  contact writes a config whose `ifid` equals the header's exact prior
  value — value equality asserted, not just presence.
- **AC-4 (broken config stops the line)**: malformed config → named error
  (Problems row / CLI non-zero), no mint, no reconcile.
- **AC-5 (diagnostic retired, backstop stands)**: compiling a bare story
  emits no `analysis.missing-ifid` (grep confirms the code is deleted);
  `sharpee publish` on a never-hosted bare story still refuses.

## Session

2026-08-10, session ed3730 — ruled while closing go-live item 5.

