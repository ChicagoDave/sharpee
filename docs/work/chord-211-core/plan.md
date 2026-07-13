# Session Plan: 211-core — ADR-211 Platform Half (Spliced Atom, Join Rule, Gate Seam, TS Migration)

**PLAN ONLY. No implementation happens from this document by itself.**
**Implementation starts only on David's explicit go-ahead** — this is
platform work (`packages/`), which CLAUDE.md requires discussing with
David before implementation begins. This plan is that discussion artifact.

**Created**: 2026-07-13
**Overall scope**: Land the platform half of ADR-211 (package 1 of 2 per
CP7'): a new `Spliced` phrase atom, the marker-site join rule (clause `, `
/ sentence ` ` / boundary nothing — computed and inserted entirely by the
platform, never by authors), the registered gate seam for non-presence
`while` conditions (Q4, scaffold only — Chord wiring is package 2), the
engine load-time bare-fragment gate, and migration of every existing TS
snippet entry to bare fragments. **No new Chord grammar lands in this
package** — that is `chord-zoo-surfaces` (package 2), which rides this
package's output. Acceptance is all-or-nothing: the existing corpus
(concealment-test, dungeo, friendly-zoo) renders byte-identically
throughout.
**Bounded contexts touched**: `if-domain` (phrase contract), `stdlib`
(snippet resolver, gate seam), `lang-en-us` (Assembler — separator
ownership), `engine` (load-time validation) — plus three story packages
(dungeo, friendly-zoo, concealment-test) for the entry migration.
`chord`/`story-loader`/`ide-protocol` are touched only in the sense of
"must keep building," not code changes, per ADR-211's touched-packages list.
**Key domain language**: fragment (bare, author-written, never carries a
separator), marker site (clause / sentence / boundary — decided by prose
position, not by the fragment), separator (platform-owned punctuation:
`, ` or ` `), gate (a `while`-shaped condition that must hold for a
fragment to render), Spliced (the new phrase atom carrying `mode` +
`content`).

## References consulted

- `docs/architecture/adrs/adr-211-description-variety-phrase-system.md` —
  the accepted decision this plan implements: Spliced atom shape, the
  site-determined join rule, the registered-gate seam (build now, Chord
  wires in package 2), the complete touched-packages list (anything
  outside it is a stop-and-discuss checkpoint), and the migration
  inventory this plan must execute against.
- `docs/architecture/adrs/adr-209-room-description-snippets.md` — the
  machinery ADR-211 preserves in full (Sequence splice, Choice counters,
  `(roomId, marker)` keying, `RoomTrait.snippets` storage, load-loud/
  render-graceful posture); this plan must not re-litigate or regress any
  of it, only replace the authoring-surface parts ADR-211 supersedes.
- `docs/work/chord-zoo-surfaces/ratchet-drafts.md` — CP7' (RESOLVED):
  two packages, 211-core lands the platform byte-identical on the
  existing corpus (AC-1/5/7) before `chord-zoo-surfaces` rides it; the
  re-cut platform-touch forecast confirming this package owns all 9
  touched packages, not just `chord`/`story-loader`.
- `docs/context/project-profile.md` — build/test conventions this plan's
  exit gates must use: `./repokit build dungeo`, `dist/cli/sharpee.js
  --test [--chain]` for transcripts, `pnpm --filter '@sharpee/<pkg>'
  test` for unit suites, the one-good-run rule for dungeo RNG flakes, and
  the language-layer separation rule (separator characters belong in
  lang-en-us, nowhere upstream).
- `docs/context/session-20260712-1656-v2-210-chord-a.md` — the prior
  session's recorded "Next" step: produce the two CP7' package plans
  (211-core first, zoo-surfaces second) and get David's per-package
  go-ahead before any implementation.

## Investigation notes (from source verification, 2026-07-13)

Before decomposing, the cited file:line locations in ADR-211 were checked
against the current tree (branch v2-210-chord-a). All core citations hold;
two drifts are worth flagging to David during review, not blocking:

- **Entry count drift**: ADR-211's migration inventory says "9 rooms / 11
  entries." The actual count is **9 rooms / 10 entries** (white-house
  mailbox; house-interior trophycase + rug + table; underground door; dam
  panel + buttons; maze frame; frigid-river rainbow; well-room cage). No
  11th snippet site exists anywhere in dungeo's `src/`. Phase 4 migrates
  the 10 confirmed entries; the discrepancy is noted for the record, not
  silently "fixed" in the ADR.
- **state-clauses.ts is a shape precedent, not a literal reuse target**:
  `packages/world-model/src/state-clauses.ts:49-82` registers contributors
  keyed by **trait type**, at **module-import time**, with nothing
  serialized or re-registered per world-load. The new gate seam needs
  different keying (`(roomId, marker)`) and different lifecycle
  (re-registered every story load, per ADR-211 Decision 3). Phase 3 builds
  new machinery modeled on the *shape* (Map-based register/lookup,
  idempotent-last-wins) — it is not a call into the existing registry.
- **concealment-test's `dust` entry is an edge case**: its two variants
  (`' Thick dust'`, `' Thin dust'`) have a leading space but no own
  sentence terminator — they feed into following prose ("coats the
  shelves;") rather than standing as a sentence. This doesn't cleanly fit
  either named category (clause = leading comma / sentence = leading
  space + own terminator). Phase 4 resolves this explicitly by reading the
  marker's actual site in the host prose (not the fragment's own leading
  character) before migrating it, and documents the resolution inline.
- **Flag-day analysis (governs phase ordering)**: `resolveSnippetDescription`
  is one function with no per-story flag. The instant it switches from
  passing through author-embedded separators to emitting mode-annotated
  `Spliced` wrappers, **every** snippet-bearing room in **every** story is
  affected simultaneously — a fragment whose author-written separator is
  not yet stripped would receive a second, platform-inserted separator on
  top of it, breaking byte-identity immediately. **This is not safely
  splittable across commits.** The resolver switch and the full TS-entry
  migration (dungeo + friendly-zoo + concealment-test + both handler
  mutations) must land in one atomic phase / one commit. Phases 1-3 below
  are additive and behavior-preserving (they introduce new capability that
  nothing yet exercises), so they can land independently and in any
  relative order; Phase 4 is the unavoidable flag day and depends on all
  three.

## Phases

### Phase 1: Spliced atom in the if-domain phrase contract
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `if-domain` phrase algebra — the mode-annotated splice
  wrapper, sitting next to `Sequence`/`Choice` per the co-located
  wire-type rule (ADR-211 Interface contracts)
- **Entry state**: ADR-211 ACCEPTED. `packages/if-domain/src/phrase.ts` has
  `PhraseBase` (41-44), `Sequence` (102-116), `Choice` (251-268), and a
  15-member closed `Phrase` union (309-324, though the file's own header
  comment stales at "13 members" — pre-existing drift, not introduced
  here). No `Spliced` kind exists yet.
- **Deliverable**: `export interface Spliced extends PhraseBase { kind:
  'spliced'; mode: 'clause' | 'sentence'; content: Phrase }` added beside
  `Choice`; the `Phrase` union extended to 16 members; a type guard
  (`isSpliced`) following the existing guard-function pattern in the same
  file; a unit test exercising the guard. Optionally correct the stale
  "13 members" header count while touching the file (small, in-scope
  cleanup — leave it if it risks scope creep, David's call).
- **Exit state**: `if-domain` builds clean in isolation
  (`pnpm --filter '@sharpee/if-domain' test` and its build step green).
  Nothing else in the tree constructs or consumes a `Spliced` value yet —
  zero *runtime* behavior change anywhere downstream. **Compile-time
  caveat** (project profile: TypeScript strict mode, `noFallthroughCasesInSwitch`):
  widening the closed `Phrase` union to 16 members may break any
  exhaustive `switch`/`assertNever` over phrase kind in downstream
  consumers (the Assembler's `realizeToRuns` switch is the known one,
  addressed by Phase 2; check `stdlib` and `engine` for any other
  exhaustive match over `Phrase` before declaring this phase done). If
  any exist outside `lang-en-us`, add a minimal stub case (e.g. treat
  `Spliced` as its `content` with no separator) in the same phase so the
  whole workspace still builds — do not let Phase 1 land in a
  workspace-broken state even though `if-domain` itself is green.
  Committable on its own once the full-workspace build is confirmed.
- **Status**: CURRENT

### Phase 2: lang-en-us Assembler realizes Spliced (isolated, additive)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `lang-en-us` Assembler — separator ownership at splice
  sites is a language-layer concern (the platform's punctuation-authority
  principle, ADR-195/ADR-211 Decision 2)
- **Entry state**: Phase 1 done (`Spliced` type available for import).
  `packages/lang-en-us/src/assembler/english-assembler.ts` has `joinParts`
  (281-288, the platform's sole comma-joiner), `renderSlot` (381-392),
  Choice-counter machinery (`activeChoicePicks` from 529, `selectChoice`
  541-548, `pickChoiceAlternative` 551-586), and `Empty` absorption via the
  `isSequence` flatMap that consumes `isEmpty` (656) results within a
  `Sequence` (~721-724).
- **Deliverable**: a `realizeSpliced(content, mode, ctx)` path wired into
  the phrase-kind switch inside `realizeToRuns`: realize `content`; if the
  resulting runs are empty, emit nothing (matching today's `Empty`
  absorption); otherwise prepend the separator — `', '` for `mode:
  'clause'`, `' '` for `mode: 'sentence'`. Boundary sites (start-of-text,
  paragraph edge) get an empty separator; **design decision to record**:
  rather than threading a boundary flag through `Spliced`, the resolver
  (Phase 4) simply does not wrap boundary-site content in `Spliced` at
  all — it emits the content phrase directly, since the separator there
  is always empty. This keeps `Spliced.mode` a true two-value enum and
  keeps the boundary rule visible at the call site instead of hidden in a
  third mode. Choice-counter advancement is untouched — `content` realizes
  through the existing Choice path exactly as today. New **isolated** unit
  tests (hand-built `Sequence`/`Spliced` fixtures, not routed through
  `resolveSnippetDescription`) lock down: AC-1 shape (clause- and
  sentence-mode byte-exact separator insertion), AC-2 (empty variant joins
  nothing, counter still advances since the Choice pick still happens),
  AC-9 (adjacent `Spliced` siblings, all four empty/non-empty
  combinations).
- **Exit state**: existing corpus completely untouched — `snippet-resolver.ts`
  still emits its current (pre-ADR-211) shape, so nothing in production
  code paths constructs a `Spliced` yet. New isolated Assembler tests
  green; full `lang-en-us` unit suite green. Committable on its own.
- **Status**: PENDING

### Phase 3: stdlib registered gate seam (scaffold only, Q4)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `stdlib` snippet resolution — the registered-gate seam
  for non-presence `while` conditions, built now per Q4 so package 2's
  Chord loader has a seam to wire into without touching stdlib again
- **Entry state**: Independent of Phases 1-2 (no ordering dependency —
  may run before, after, or interleaved with either). `snippet-resolver.ts`
  `resolveSnippetDescription` (111-181) already applies the `mentions`
  presence gate at 136-141. `world-model/src/state-clauses.ts:49-82` is
  the shape precedent (see Investigation notes above) — new machinery,
  not a shared registry.
- **Deliverable**: a new stdlib module (e.g.
  `snippet-gate-registry.ts`) exposing `registerSnippetGate(roomId,
  marker, predicate)`, and a lookup used inside
  `resolveSnippetDescription`'s existing gate-check step, alongside (not
  replacing) the `mentions` check. Idempotent-last-wins registration,
  Map-based, mirroring the state-clauses shape. Header doc states the
  lifecycle contract explicitly: **nothing here is serialized; callers
  (the Chord loader, in package 2) must re-register every story load** —
  this is what makes save/restore a non-event for gated fragments (Q4).
  Unit tests: register + lookup, a registered gate blocking render, no
  registration falling through unaffected (today's entire corpus has
  zero registrations, so this must be provably a no-op for existing
  behavior), and a render-gating interaction test confirming the Choice
  counter advances only when the gated fragment actually renders (the
  counter-advance clause of AC-12). This lands **AC-12's seam unit test
  scoped to core** — registration, render gating, and the
  no-serialization/re-register-at-load contract. The Chord-side wiring
  test (a `while after-hours` fragment gating correctly end-to-end) is
  package 2's job.
- **Exit state**: existing corpus untouched (zero registrations from any
  current caller, so `resolveSnippetDescription`'s output is provably
  identical to before this phase for every existing room). New seam unit
  tests green; full `stdlib` unit suite green. Committable on its own.
- **Status**: PENDING

### Phase 4: Flag day — resolver switch, full TS-entry migration, engine gate, full regression
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: the marker-site join rule goes live across
  `if-domain`/`stdlib`/`lang-en-us`/`engine` simultaneously with every
  existing TS snippet entry migrated to a bare fragment — one atomic
  commit, per the flag-day analysis above
- **Entry state**: Phases 1-3 done and independently green (Spliced type
  exists; Assembler can realize it in isolation; the gate seam exists but
  has zero registrations). This phase is the first point at which
  production behavior changes, so it must be the last phase to touch main
  behavior before the acceptance gate — and it must complete in full
  before any of its intermediate states are tested against the real
  corpus (a partial migration breaks byte-identity, per the flag-day
  analysis).
- **Deliverable** (sub-steps — internal checkpoints, not separate phases;
  the corpus is not considered green, and nothing is committed, until all
  of the below are done together):
  1. **Resolver switch** (`snippet-resolver.ts`): classify each marker
     site as clause / sentence / boundary from the AUTHORED host text per
     the edge rules — adjacent markers are transparent to classification
     (mode comes from the nearest preceding non-marker, non-whitespace
     character); start-of-text or a paragraph edge is a boundary site.
     Stop concatenating author-embedded separators. Wrap each resolved
     marker phrase in `Spliced { mode, content }`, except at boundary
     sites, which emit `content` directly (Phase 2's design decision).
     Apply both the existing `mentions` gate and the Phase 3 registered
     gate seam.
  2. **Engine load gate** (`packages/engine/src/snippet-validation.ts`,
     `validateRoomSnippets`): reject punctuation/whitespace-led LITERAL
     fragment texts at load (the bare-fragment gate, AC-3's TS half).
     `{ messageId }` texts stay render-graceful per AC-10 — checked at
     render, never at load. `lintUnusedSnippetEntries` is unchanged.
  3. **Migrate every literal TS snippet entry to a bare fragment.**
     Verify each site's join mode against its *surrounding room prose*
     before stripping the leading separator — the site decides, never the
     fragment's own leading character:
     - **dungeo** (9 rooms, 10 entries — see count-drift note above):
       `white-house.ts:65` mailbox; `house-interior.ts:60-61` trophycase +
       rug; `house-interior.ts:67` table; `underground.ts:99` door;
       `dam.ts:68` panel; `dam.ts:78` buttons; `maze.ts:150` frame
       (already the empty-string variant); `frigid-river.ts:192` rainbow;
       `well-room.ts:555` cage (carries `mentions` — confirm the gate
       still fires identically post-migration).
     - **dungeo handler mutations**: `rug-push-interceptor.ts:79-82`,
       `melee-interceptor.ts:227-231` — the runtime-set replacement text
       becomes a bare fragment too, same `''`-not-delete convention.
     - **friendly-zoo**: `zoo-items.ts:89-98` pins entry (3 texts +
       `mentions`).
     - **concealment-test** (`stories/concealment-test/src/index.ts`):
       `clock:68-71`, `cabinet:103`, `mantel:104-108`, `trunk:110`
       (carries `mentions`) migrate directly. **`dust:109` is the flagged
       edge case** — resolve its actual marker site in the host prose
       first, decide its join mode explicitly, migrate it, and leave an
       inline comment recording the resolution (it is the one ambiguous
       case in the whole corpus; do not guess).
  4. **Test updates**: `snippet-resolver.test.ts` and `snippet-splice.test.ts`
     inputs change to bare fragments; asserted outputs stay byte-exact
     (AC-1). `snippet-validation.test.ts` gains AC-3 load-error cases;
     existing unbound-marker/unused-entry tests stay untouched. Add or
     extend coverage for AC-2 (empty variant at both site kinds, counters
     still advance), AC-5 (save/restore mid-cycle continues the cycle,
     fixture format unchanged), AC-9 (all four adjacent-marker
     combinations), AC-10 (messageId resolves and joins per its site
     mode; a punctuation-led resolved text logs and joins as-is,
     never throws).
  5. **Full regression** — run in order; never auto-retry a failure
     (report and wait, per CLAUDE.md):
     - `pnpm --filter '@sharpee/if-domain' test`,
       `'@sharpee/stdlib' test`, `'@sharpee/lang-en-us' test`,
       `'@sharpee/engine' test` — all green.
     - `./repokit build dungeo` (bundle), and confirm friendly-zoo and
       concealment-test build cleanly through the same pipeline (verify
       via `./repokit` help/usage which target(s) cover them — do not
       assume; check before relying on a single build invocation).
     - `node dist/cli/sharpee.js --test stories/concealment-test/tests/transcripts/*.transcript`
       — 17/17, unedited, byte-identical (the AC-1 acceptance harness).
     - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
       and `stories/dungeo/tests/transcripts/*.transcript` — green.
       One-good-run rule applies to thief/combat RNG flakes only; do not
       modify a working transcript to force a pass.
     - friendly-zoo: run its existing frozen transcripts to confirm the
       migrated `zoo-items.ts` pins entry still renders byte-identically.
       This is **not** the zoo-surfaces Chord migration (package 2) — it
       only proves the TS pins entry survives the flag day unchanged in
       observable output.
     - Per ADR-211's touched-packages list, confirm `devkit`'s build-lint
       still catches the new load error from step 2 with a sensible
       message (no devkit code change expected, but verify the catch
       path at `packages/devkit/src/standalone/build.ts:223-232` still
       fires) and confirm `ide-protocol` still builds clean (it isn't
       touched by this package, so this should be a no-op check).
- **Exit state** (all-or-nothing, matches CP7'): every unit suite above
  green; concealment-test 17/17 unedited and byte-identical; frozen
  friendly-zoo transcripts byte-identical; dungeo unit transcripts and the
  walkthrough chain green (one-good-run rule for RNG variance only). AC-1,
  AC-2, AC-3, AC-5, AC-7, AC-9, AC-10, and AC-12 (seam unit test, core
  scope) all landed as tests. One commit lands the entire flag day. This
  is the acceptance gate for the whole `211-core` package — once green,
  `chord-zoo-surfaces` (package 2) can begin riding it.
- **Status**: PENDING
