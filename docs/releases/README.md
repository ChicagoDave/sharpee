# Release notes

One file per published Sharpee release, `release-<version>.md`. These are the
**source of truth** for the release notes on sharpee.net:
`website/scripts/sync-releases.mjs` derives `website/src/lib/releases-data.json`
from this directory at `prebuild`/`predev`, and `/notes/releases` renders it.

Do not hand-edit the JSON, and do not restate a release's content in the page
component. Same rule as `docs/roadmap/`: a published page that restates
repository content drifts from it silently, and notes that disagree with what
shipped are worse than none.

## Only published versions get a file

A version that was bumped but never published to npm does not appear here — the
notes describe what an author can install. The one such gap in the 5.x line is
**5.2.0**, whose landings shipped inside 5.3.0; `release-5.3.0.md` says so rather
than leaving a reader to wonder where 5.2.0 went.

## Required header block

Every file carries these, in this order, or the sync script fails the build:

| Field | Meaning |
| --- | --- |
| `**Status**` | `PUBLISHED` — the only value today; a yanked release would say so here |
| `**Published**` | ISO date the npm publish landed, from the registry, not the bump commit |
| `**Chord language**` | `CHORD_LANGUAGE_VERSION` as of that release (ADR-257 — it moves on its own cadence) |
| `**Traces to**` | ADRs and GitHub issues a reader can follow, `·`-separated |

Then a `## What shipped` section whose **first paragraph** becomes the summary on
the site, and a `## Notes` section of bullets, each of which becomes one line.
Prose below those two sections stays in the repository and is not published.

## Writing them

Derive the content from the commit range between version bumps
(`git log <previous-bump>..<this-bump>`), not from memory. Name the ADR or issue
that a line traces to wherever one exists — a note a reader cannot follow to a
decision is close to useless.
