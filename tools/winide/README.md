# Chord Writer for Windows

**Reserved.** This directory is the Windows application directory ADR-341's Scope
names. David named it `tools/winide` on 2026-09-11, session `89f9e0`, and ADR-341's
Scope was amended the same session to carry the name outright — including striking
the "no abbreviations" qualifier it used to carry, on the reason that `tools/ide` is
the macOS app and a mirror (D1) should read as one at a glance.

**It is deliberately empty.** Nothing is built here until ADR-341's D8 order reaches
the shell, and D8 puts three steps ahead of it: the D2 spike phase (the toolkit is
decided on evidence, not argument), ADR-182 in the Swift app (the grammar must exist
before a second editor consumes it), and D5's generator with the Swift mirror as its
first consumer. The D3 host contract comes after those, and the shell after that.

**The spike does not live here.** ADR-341 D2's WPF and WinUI 3 spikes are throwaway
evidence, not product, and they live under `tools/spikes/adr-341/` so that no spike
code is ever mistaken for the shell. See `docs/work/archive/adr-341-spike/plan.md`.

**Not `packages/`.** This is a tool, like `tools/ide` (the macOS app) and
`tools/repokit` (the in-repo platform build). It is never published to npm.
