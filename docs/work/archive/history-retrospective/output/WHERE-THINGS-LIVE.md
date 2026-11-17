# Where things live

This folder is the **committed copy** of the history retrospective — every
deliverable, index, and script, mirrored into git on 2026-08-11 so the work is
not held on one external drive.

## In this repository (backed up, pushed)

Everything in this folder. Start at `README.md`; the deliverables are
`retrospective.md`, `timeline.md`, and `timeline-graphic.html`.

## On `/Volumes/Workspace` (working copy, not backed up)

```
/Volumes/Workspace/sharpee-corpus/
  context-history/   1,533 session summaries, 2025-06 .. 2026-08
  work-history/         12 files
  retrospective/     ← this folder, as generated
```

The corpus itself stays out of git: 15 MB and 1,545 files of raw material, and
the repository is not where a reading corpus belongs. The scripts here expect it
at that path — edit the constants at the top of each if it moves.

## On `/Volumes/Backup` (read-only NTFS snapshot)

`surface-archive/sharpee-archive/` holds the pre-2026-02 half of the corpus plus
the sources that exist nowhere else: the three C# prototypes under
`archives/repos-old/`, the five ChatGPT design dumps, and the 230 Claude
conversation exports. macOS cannot write to it.

## The one thing that is safe by accident

The corpus's 2026 half — the 441 files removed from `docs/context/archive/` when
it was consolidated — is still in this repository's history. It is recoverable
without the drive:

```bash
git show a72bcef5^:docs/context/archive/session-20260810-1535-feat-testing-tab-embed.md
git ls-tree -r a72bcef5^ --name-only -- docs/context/archive | wc -l   # 441
```

The pre-2026-02 half has no such fallback: it exists on the Backup drive and on
Workspace, and nowhere else.

## Regenerating

Every index and both extractions are re-runnable, in this order:

```bash
node build-index.mjs            # corpus index (needs the corpus)
zsh  build-git-index.sh         # git baseline (needs the three clones)
node build-adr-index.mjs        # ADR index (needs this repo)
node build-chat-index.mjs       # conversations (needs the Backup drive)
node build-genai-index.mjs      # model attribution (needs this repo)
node build-timeline-graphic.mjs # the graphic
```

`extract-digests.mjs`, `extract-throughlines.mjs` and `extract-verdicts.mjs` each
take a workflow journal path and cannot be re-run without their original agent
runs — `monthly-digests.json`, `throughlines.json` and `verification.json` are
the durable form of those, which is why they are committed rather than treated as
build output.
