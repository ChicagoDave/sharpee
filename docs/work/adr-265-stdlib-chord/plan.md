# Plan: ADR-265 — the standard library in readable Chord form

**Branch**: `adrs-264-265-counters-stdlib-reference` · **Status**: COMPLETE · **Started**: 2026-07-25

Implements ADR-265 (ACCEPTED): the entire core stdlib rendered as a **generated, reference-only**
Chord-form artifact — real implementation stays TypeScript (a projection, not a port). Load-bearing
constraint (D2): an enforced `reference-only` marker the loader refuses.

## Verified ground truth (from code scouts)

- **Marker/enforcement**: `ChordStory` constructor (`story-loader/src/loader.ts:243`) is the single load
  chokepoint — every CLI path (`bundle-entry.js`, devkit `author-game.ts`, compose, browser) funnels
  through `createStory`. Precedent: the pure-IR hatch refusal (loader.ts:278-286) throws `LoadError`
  before any world build. `ir.meta.fields` carries raw header `key: value` pairs — `reference-only: true`
  lands there with **no parser/grammar/version change** (the generic field handler, parser.ts:568). So
  the marker is a header field, machine-readable off the IR, and the loader refuses it.
- **Generator inputs** (all static): `standardActions` (`stdlib/src/actions/standard/index.ts`) — the
  master action list; each action's `id`/`group`/`metadata`/`requiredMessages`. `actionLifecycleDescriptors`
  (`lifecycle/registry.ts`) → consulted slot names + `interceptorConsultingActionIds`. `standardActionLanguage`
  (`lang-en-us/src/actions/index.ts`) → `patterns` (verbs), `messages` (ids + prose), `help`.
  `MESSAGE_ALIAS_TO_ACTION_ID` (`story-loader/src/message-alias-map.ts`) → override aliases (filter by
  `<actionId>.`). NOT static: event ids (string literals in `report()` — regex-scan or hand-map),
  slot→trait mapping, free-form "what it does" (only `help.summary`).
- **Generator precedent**: `scripts/generate-genai-api.js` (plain Node, reads built dist, writes
  per-group `.md`), wired into `tools/repokit/src/commands/build.ts` (`generateGenaiApi`, gated by
  `--no-genai`). Output convention: `docs/reference/` (hand-curated) vs `packages/sharpee/docs/genai-api/`
  (generator-owned). **Drift precedents**: EBNF SHA pin (`chord/tests/language-version.test.ts`),
  live-registry conformance (`story-loader/tests/event-id-map.test.ts`), source-scan completeness
  (`stdlib/tests/.../lifecycle-registry.test.ts`).

## Design decisions

- **Marker = header field `reference-only: true`** (not a new grammar keyword) → zero grammar/version
  change; loader reads `ir.meta.fields['reference-only']` and throws. Plus each generated file opens with
  a prominent comment banner (the human "banner"; D2's two-part marker).
- **Rendering shape**: each action → a **valid, compiling** reference-only `.story` file under
  `docs/reference/stdlib-chord/<name>.story`. It compiles (minimal room) so `sharpee --play` reaches the
  loader's refusal; the action's surface (verbs, consulted slots, messages, override aliases, event ids,
  the D4 change mechanisms) is rendered as structured comments + real `override message` example lines.
  It is Chord-shaped and readable, never the implementation.
- **Canonical set**: iterate `standardActions` (the fullest list), join descriptors by `actionId`.

## Phases

- **P1 — the enforced marker (D2). ✅ DONE.** `ChordStory` constructor (loader.ts) throws a `LoadError`
  naming the marker when `ir.meta.fields['reference-only'] === 'true'`, before any world build — every
  CLI path funnels through it. No grammar/version change (header field). Test `reference-only.test.ts` 3:
  a reference compiles + carries the marker + is refused; a normal story is unaffected.
- **P2 — the generator (D1/D3). ✅ DONE.** `scripts/generate-stdlib-chord.js` reads the built platform
  metadata (`standardActions`, `actionLifecycleDescriptors`, `standardActionLanguage`,
  `MESSAGE_ALIAS_TO_ACTION_ID`) + regex-scans event ids, and renders each standard action to a
  **compiling** reference-only `.story` under `docs/reference/stdlib-chord/<name>.story`: banner +
  `reference-only: true` + the action surface (verbs, group, objects, consulted slots, emitted events,
  the message→override-alias table, and the three D4 change seams) as `##` comment blocks around a
  minimal room. 56 action references + a generated README. Exports `renderAll()` (pure) for drift.
- **P3 — drift + validity + build wiring. ✅ DONE.** `stdlib-chord-reference.test.ts` 3: completeness
  (one reference per standard action), validity+enforcement (every reference compiles, is marked, and
  the loader **refuses** it — AC-6), and drift (regenerating reproduces the committed tree byte-for-byte
  — AC-4, so a stdlib change without regeneration fails the build; a missing marker fails it too).
  Registered in `repokit` build (`generateStdlibChord`, alongside `generateGenaiApi`, `--no-genai`-gated),
  so it regenerates with the build.

- **P4 — website integration (the intended end result). ✅ DONE.** The generator also emits ONE website
  page — `website/src/app/chord/stdlib/reference/content.mdx` — every action as an anchored section
  (verbs, group, objects, slots, emitted events, the message→override-alias table in a fenced block so
  `{You}` templates stay literal/MDX-safe, and the D4 change seams). Stable route wrapper `page.tsx`
  (`<DocPage title="Chord reference">`); nav entry under **Chord → Standard Library → Chord reference**
  (`website/src/lib/nav.ts`). Rides the existing search index (regenerated: 144 pages, the reference
  indexed as "Chord reference"). The drift test also asserts the MDX is fresh. MDX hazard scan: 0 bare
  `{`/`<` outside fences, fences balanced. (Full `next build` not run here — website deps aren't
  installed in this container; verified structurally + via the search-index generator.)

## Final state — ADR-265 COMPLETE
57 generated references under `docs/reference/stdlib-chord/` + one generated website page in the
Standard Library section. Green: story-loader 373 (reference-only 3 + stdlib-chord 4, no collateral),
repokit builds, search index regenerates with the page. No implementation moved into Chord — a
read-only, enforced-reference projection (D5), surfaced on the website as intended.

## Process
Per-phase green before next. The generator reads BUILT dist. Per ADR-265 D5, no implementation moves
into Chord — a read-only projection.
