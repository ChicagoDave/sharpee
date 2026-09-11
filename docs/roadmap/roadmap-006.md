# 006 — Native Windows IDE

**Status**: ACCEPTED — ADR-341, 2026-09-08; the spike is the first phase
**Built?**: none — Chord Writer is macOS-only (`tools/ide/project.yml` declares `platform: macOS`)
**Created**: 2026-08-14 (first recorded as a roadmap item; no prior design doc)
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: TBD
**Traces to**: ADR-341 · issue [#386](https://github.com/ChicagoDave/sharpee/issues/386) · builds on ADR-279 (packaging) and ADR-280 (project model)

---

## What it is

A Chord authoring IDE for Windows. Chord Writer 1.0.0 shipped for macOS; Windows authors
currently have the CLI and a text editor.

## Status

**ADR-341 was written and accepted on 2026-09-08** (session 4a2d5f), which retires this
item's standing description of itself as the least-specified thing on the roadmap. The
three questions below were the ones it had to answer, and it answers them: a **native
Windows mirror** of the macOS app, not a cross-platform shell, with the web panes shared and
the protocol types generated rather than hand-synchronized. The framework choice — WPF or
WinUI 3 — is deliberately left to a spike, which is the item's first phase; the target is
x64, signed through Azure Trusted Signing. Filed as issue
[#386](https://github.com/ChicagoDave/sharpee/issues/386).

Accepting an ADR authorizes no implementation by itself. Nothing is built: `tools/ide/project.yml`
still declares `platform: macOS` and there is no Windows source tree.

## What the ADR settled

- **Native or shared?** Native. A cross-platform shell would have changed what Chord Writer
  is on macOS, which is a decision about the shipped product rather than about Windows.
- **What is genuinely shared?** The web panes, and the IDE protocol
  (`packages/ide-protocol`) whose types are *generated* for the Windows side rather than
  re-declared — the same co-located wire-type rule the repository applies elsewhere, since a
  hand-kept copy drifts silently and a generated one fails the build.
- **Which authors is it for?** The same author, on another platform. Not a different product.

## What is still open

The spike itself: the framework choice, and the three assumptions ADR-341 names with the
spike phase as their check. A target date waits on it.
