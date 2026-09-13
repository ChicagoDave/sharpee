# ADR-341 D2 spike — WPF vs WinUI 3

**This is spike code.** It is evidence, not product. It is never shipped, never
published, and never imported by anything under `packages/` or `tools/winide`.

Per `docs/work/adr-341-spike/plan.md`, spike sources are exempt from this
repository's `documentationStandard: always` beyond a header line stating they are
spike code. That exemption is scoped to this directory and its descendants.

**What gets built here** is the list ADR-341 D2 orders and
`docs/work/adr-341-spike/parity-table.md` flags — the editor first, then WebView2
pane hosting, the project tree, window chrome and the ADR-297 appearance mirror,
the reusable tab strip, and the World map's custom drawing — built twice, once per
toolkit, with the record of what was built, what failed, and how it felt written
inline to `wpf-spike.md` and `winui3-spike.md` beside the plan.

**The toolkit whose spikes pass is the toolkit** (D2). When Phase 6 writes
`decision.md`, this directory has done its job; it is deleted when the shell exists,
not carried forward.
