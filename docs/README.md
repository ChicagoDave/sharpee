# Sharpee Documentation

Sharpee is a parser-based Interactive Fiction authoring platform built in
TypeScript. This folder is the repository's own documentation. **The maintained
home of author documentation is [sharpee.net](https://sharpee.net)** — when the
two disagree, the site is canon.

## Quick Start

1. **[Core Concepts](./core-concepts/README.md)** — entities, traits, the
   four-phase action pattern, events. Read this first.
2. **[sharpee.net](https://sharpee.net)** — author guides, the Chord language
   reference, cookbook.
3. **[Main README](../README.md)** — installation, the `sharpee` CLI, package map.

## Documentation Structure

Nine directories are current and maintained. Everything else that used to live
here has been quarantined or archived; see [Where the rest went](#where-the-rest-went).

```
docs/
├── architecture/    # ADRs, diagrams, naming conventions
├── book/            # The Sharpee author/developer manual (v1.5.0, v2.0.0)
├── brainstorm/      # Open-ended exploration, not yet decided
├── context/         # Session summaries and the project profile
├── core-concepts/   # The read-first reference for how Sharpee works
├── design/          # Visual design: palette, mockups, brand assets
├── proposals/       # Templated proposals; the front door for planned work
├── references/      # Frozen external source material, kept verbatim
├── work/            # Active work targets, plus work/archive/
└── unofficial/      # QUARANTINE — unmaintained and superseded. Not current.
```

| Directory | What belongs in it |
|-----------|--------------------|
| [`architecture/`](./architecture/README.md) | Architecture Decision Records (320 and counting), diagrams, [naming conventions](./architecture/naming-conventions.md). The record of what was decided and why. |
| [`book/`](./book/) | The full author/developer manual, split into versioned editions. Its code snippets assemble into runnable checkpoints. |
| [`brainstorm/`](./brainstorm/) | Exploration that has not become a decision. Nothing here is committed to. Long-untouched is normal and does not mean stale. |
| [`context/`](./context/README.md) | Per-session summaries (`session-*.md`) and `project-profile.md`. Also where DevArch's gitignored runtime state lands — see its README for the retention rule. |
| [`core-concepts/`](./core-concepts/README.md) | How the system actually works: entities, traits, actions, behaviors, events, [transcript testing](./core-concepts/transcript-testing.md). The first thing to read, and the first thing to keep accurate. |
| [`design/`](./design/) | Visual design rather than software design: palette, colors, site mockups, brand assets. |
| [`proposals/`](./proposals/) | Accepted and in-progress proposals with `P-n` items. Mechanically load-bearing — `session-planner` reads this directory, so it cannot move. |
| [`references/`](./references/README.md) | External source material kept verbatim as canon, such as the 1981 Mainframe Zork MDL that Dungeo's combat is ported from. **The deliberate opposite of `unofficial/`**: unchanging because it is finished, not because it was abandoned. |
| [`work/`](./work/) | One folder per work target, each with its plan and context notes. Completed targets move to [`work/archive/`](./work/archive/). |

## Where the rest went

Several trees that used to sit at `docs/` top level were quarantined or
archived. They are still in the repository; none of it was deleted.

| Destination | What is in it | How to treat it |
|-------------|---------------|-----------------|
| [`unofficial/`](./unofficial/README.md) | The old `guides/`, `reference/`, and `spec/` trees | **Junk mail.** Unmaintained, unpublished, superseded by sharpee.net. Do not cite it, plan from it, or research in it. Using anything in it means moving it out first, and that is a human decision. |
| [`unofficial/archive/`](./unofficial/archive/) | Git-cold and superseded trees: `getting-started/`, `development/`, `platform/`, `testing/`, `api/`, `publish/`, `tutorials/`, and others | Historical. Same rule as above. |
| [`work/archive/`](./work/archive/) | Completed work targets and their plans | Genuine history of finished work. Safe to read for provenance; not a description of how anything works today. |

An archived tree is not current material. If a search turns up an answer under
`unofficial/`, treat it as a lead to verify against sharpee.net, the ADRs, or
the code — never as the answer.

Two directories were reviewed and deliberately left where they are:
`book/` and `proposals/` are at their original paths, untouched by every move
above. `proposals/` is required to stay: `session-planner` reads it.

## For Story Authors

| Where | What you get |
|-------|--------------|
| [sharpee.net](https://sharpee.net) | Author guides, Chord language reference, cookbook. Start here. |
| [Core Concepts](./core-concepts/README.md) | Entity system, traits, actions, events |
| [Transcript Testing](./core-concepts/transcript-testing.md) | Writing and running `.transcript` tests |
| [The Book](./book/) | The long-form manual, if you prefer to read straight through |

## For Developers

| Where | What you get |
|-------|--------------|
| [Main README](../README.md) | Install, CLI usage, the package map |
| [CLAUDE.md](../CLAUDE.md) | Build commands (`./repokit`), testing workflow, per-package conventions |
| [Architecture Decisions](./architecture/adrs/) | 320 ADRs documenting design rationale |
| [Naming Conventions](./architecture/naming-conventions.md) | ID and naming patterns |
| [Core Concepts](./core-concepts/README.md) | Where logic belongs, and why |

## Architecture

### Key Principles

1. **Actions emit semantic events, not text** — the language layer converts
   message IDs to prose
2. **Behaviors own mutations** — actions coordinate, behaviors perform state
   changes
3. **Traits compose entity capabilities** — container, lockable, wearable, and
   so on
4. **Language layer separation** — all user-facing text goes through
   localizable message IDs

### Key ADRs

| ADR | Topic |
|-----|-------|
| [ADR-051](./architecture/adrs/adr-051-action-behaviors.md) | Four-phase action pattern |
| [ADR-052](./architecture/adrs/adr-052-event-handlers-custom-logic.md) | Event handlers |
| [ADR-070](./architecture/adrs/adr-070-npc-system.md) | NPC system |
| [ADR-087](./architecture/adrs/adr-087-action-centric-grammar.md) | Grammar builder API |
| [ADR-090](./architecture/adrs/adr-090-entity-centric-action-dispatch.md) | Capability dispatch |

## Active Work

Tracked per target under `work/`:

- **[dungeo/](./work/dungeo/)** — Mainframe Zork implementation
- **[chord/](./work/chord/)** — the Chord authoring language
- **[platform/](./work/platform/)** — engine and stdlib improvements

## Links

- [Main README](../README.md) — project overview and quick start
- [sharpee.net](https://sharpee.net) — official site, and canon for author docs
- [npm Package](https://www.npmjs.com/package/@sharpee/sharpee) — install via npm/npx
