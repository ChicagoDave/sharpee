# Phase 13 rework brief — stdlib reference, example-first

Shared instructions for every section-rework agent. Your assignment message
names your section(s) and your output file.

## The ruling

David (2026-07-19): the shipped reference is "way too much word soup — the
stdlib should show examples for everything and only basic explanations."
Approved entry template: **§2.1 taking and dropping** in
`docs/reference/stdlib-reference.md`. Read it first; it is the shape you
are reproducing. Its parts, in order:

1. Per-action lead paragraph(s): bold verb + action id, verb list, what
   makes an entity eligible, the handful of basics an author must know —
   one sentence each, no check-order narration.
2. `The author writes:` — a fixture-backed ```story fence showing a small
   scene that exercises the entry's override seams (guards, phrase
   overrides, trait composition — whatever the entry is really about).
3. `The player sees:` — a ```transcript fence, REAL engine output only.
4. One-sentence takeaway naming what the scene demonstrated.
5. One compact table: Refusals / Success / Events rows (message keys with
   short parentheticals where a key needs one).
6. One-line interceptor note and any cross-references.
7. Honest gaps (no-grammar verbs, dormant fields, TS-only surfaces) stay —
   ONE line each, never silently dropped.

Trait entries follow the same spirit: composition line + data-field basics,
an example (or a pointer to the action entry whose example already shows
the trait), states one-liners.

## Hard rules

- **Facts are already verified.** The current section text was code-grounded
  and currency-swept to 3.2 (Phase 11, 2026-07-19). Re-present those facts;
  do NOT re-derive, extend, or invent claims. If your rework needs a fact
  the current text doesn't state, verify it empirically with a fixture run
  before writing it, or leave it out.
- **Never invent transcript output.** Capture it:
  `cd docs/work/stdlib-reference && node verify.mjs --run <fixture-rel> "cmd" …`
  and paste the engine's words. If output surprises you, that's reality —
  document it or reshape the scene.
- **Never edit `docs/reference/stdlib-reference.md`.** Write your full
  replacement section text to your assigned `rework/section-*.md` file —
  from your section's `## N.` heading line up to (excluding) the next `##`
  heading. The fold is central.
- **Fixtures**: write under `docs/work/stdlib-reference/fixtures/<your dir>/`,
  kebab-case names. A ```story fence must be a contiguous verbatim excerpt
  of its fixture (uniform indent shift allowed) with
  `<!-- fixture: <relpath> -->` on the line directly above; a ```transcript
  fence takes `<!-- transcript: <relpath> -->`. Every fixture needs
  `create the player` / `starts in <room>`.
- **Manifest fragments**: if you need RNG tolerance (`anyOf`) or an
  expected-fail load-error demo (`expect: "fail"` + `codes`), do NOT edit
  `fixtures/manifest.json` (shared). Write your entries to
  `rework/section-*.manifest.json` next to your section file; they are
  merged centrally. Conventions are documented in
  `docs/work/stdlib-reference/verify.mjs`'s header.
- **RNG**: never seed or disable story randomness and never propose it.
  The harness seeds Chord's own stream (seed 1); genuinely unseeded stdlib
  outcomes (throwing breakage, combat) get one genuine captured run in the
  doc plus `anyOf` alternatives — enumerate them by running the command
  repeatedly. See `docs/work/stdlib-phrasebook/fixtures/manifest.json` for
  the proven pattern.
- **No platform changes.** You touch nothing under `packages/`. If a fixture
  surfaces what looks like a platform defect or a gap the doc doesn't
  already flag, STOP working around it and report it prominently in your
  final result instead.
- **Voice**: match the existing doc (and chord-language.md): complete
  sentences, plain language, em-dashes as the doc already uses them, no
  invented syntax. Keep all §-cross-references that remain true; if your
  rework moves content a cross-reference targets, say so in your result.
- **Compile check**: your fixtures must compile clean (or per your
  expect-fail fragment). `node verify.mjs --run <fixture> "look"` is the
  cheapest smoke.
- Examples should differ from the Phrasebook's scenes
  (`docs/reference/stdlib-phrasebook.md` — read your verbs' pages) — the
  phrasebook teaches phrasing; this reference showcases the platform
  behavior and override seams. Reuse of a scene idea is fine; byte-copies
  are not.

## Result format

Your final message: (a) list of fixtures written and commands captured,
(b) anything that surprised you at runtime, (c) suspected platform issues
(if any), (d) cross-references into or out of your section that the fold
must watch. Keep it short — the section file is the deliverable.
