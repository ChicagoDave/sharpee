# ADR-272 implementation plan — grammar documentation surfaces

Source ADR: `docs/architecture/adrs/adr-272-grammar-documentation-surfaces.md` (ACCEPTED
2026-07-26). Session 52a8f4. Last ADR-266 umbrella child; umbrella closes when this lands.

References consulted: ADR-272 (all decisions), ADR-266 acceptance 16–17, ADR-267 D8–D12
(construct spellings), ADR-268 D2 (ordering model in author terms), ADR-269 D7 (repokit
grammar command + freshness-gate pattern), ADR-270 D2–D8 (alteration semantics the pages
teach), ADR-273 D5 (reachability semantics lines), docs policy ruling 2026-07-19
(example-first).

## Phases

- **Phase 0 — baseline**: story-loader + repokit suites green; `repokit grammar --check`
  fresh; count distinct slot names in `standard-en-us.story` (acceptance 1's "expected 17").
- **Phase 1 — derivation (tools/repokit)**: extend the `grammar` command to emit a second
  committed artifact — the generated data module beside the reference page (action id →
  verbatim block text, provenance-comment-free). Both-directions loudness: parse
  `content.mdx` `## … — \`if.action.X\`` headings; error on entry-without-block (except
  `deadly_room_death`, the ruled exception) and block-without-entry. Extend `--check` to
  the new artifact (repokit verify gate). Repokit tests for both directions + freshness.
- **Phase 2 — reference page (website)**: `<GrammarBlock>` component (renders the fence
  via the existing `CodeBlock` path), registered in `mdx-components.tsx`; 55 component
  calls in `content.mdx` + explicit no-player-grammar note on `deadly_room_death`;
  one-time heading repair informed by the derivation (garbled duplicates fixed — tooling
  does not rewrite the MDX, per Q-1's ruling); frozen-provenance comment retired; stale
  `page.tsx` generator comment removed.
- **Phase 3 — capability page (website)**: `define-action/content.mdx` expansion — every
  ADR-267 construct as a complete loadable `define action` fence (fence discipline, D2);
  non-compass `directions` example; constraint semantics lines (ADR-273 D5); slot-name
  list (as counted in Phase 0); "which pattern wins" paragraph (no numbers). Chord-only
  voice throughout.
- **Phase 4 — alteration pages (website)**: `guide/vocabulary/extend-action/` and
  `guide/vocabulary/remove-from-action/` (content + page.tsx each); reorder idiom on
  extend-action; loud-failure contract with did-you-mean shown; nav.ts rows;
  `chord/reference/grammar` heading fix + links; `multi-file-stories` pointer.
- **Phase 5 — test widening + acceptance**: docs-examples-load enumerates vocabulary
  pages with Chord fences; harness seeds standard grammar via `seedStandard` (+ real
  `defineGrammar` — check story-loader's dev-dep surface first); full acceptance sweep:
  suites green, freshness-gate failure demo (mutate source, observe, revert), voice
  audit, `next build` green, no ADR-265 generator references under `website/`.

## Notes / risks

- Q-1 ruling constrains tooling: the derivation writes ONLY the generated module; all
  MDX edits are one-time hand edits this implementation performs.
- `seedStandard` with the real `defineGrammar` requires story-loader tests to import
  `@sharpee/parser-en-us` — verify the dev-dependency direction is acceptable before
  wiring (ADR-210 direction rule concerns chord/story-loader dependents, not this
  direction; confirm in package.json).
- Slot-name count may differ from 17 (pre-migration figure included 12 platform-TS
  rules) — publish as counted.
