# 006 — Native Windows IDE

**Status**: PROPOSED — no ADR exists
**Built?**: none — Chord Writer is macOS-only (`tools/ide/project.yml` declares `platform: macOS`)
**Created**: 2026-08-14 (first recorded as a roadmap item; no prior design doc)
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: TBD
**Traces to**: nothing yet — Chord Writer's own ADRs (ADR-279 packaging, ADR-280 project model) are the closest prior art

---

## What it is

A Chord authoring IDE for Windows. Chord Writer 1.0.0 shipped for macOS; Windows authors
currently have the CLI and a text editor.

## Status

**This is the least-specified item on the roadmap.** There is no ADR, no design document,
and no prior art in the repo beyond Chord Writer's own packaging and project-model ADRs,
which are macOS-specific where they are specific at all.

## What has to be decided before it is an item with a shape

- **Native or shared?** Chord Writer is a native macOS app. A native Windows app means a
  second UI codebase; a cross-platform shell means changing what Chord Writer is on macOS
  too, which is a decision about the shipped product and not only about Windows.
- **What is genuinely shared?** The IDE protocol (`packages/ide-protocol`) and the
  story-loader hatch context already define a narrowed surface an editor may touch. How much
  of Chord Writer sits above that line versus inside AppKit is the question that decides how
  much of a Windows IDE is new work.
- **Which authors is it for?** Chord Writer's design decisions were made against a macOS
  author. Whether a Windows IDE is the same product on another platform or a different
  product for a different author has not been asked.

Until at least the first of those is answered, this item cannot carry a meaningful target.
