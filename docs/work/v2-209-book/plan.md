# Session Plan: Book v2.0.0 — ADR-209 snippets section + queued reader-pass fixes

**Created**: 2026-07-08
**Overall scope**: On a new branch `v2-209-book` (cut from `main`), edit `docs/book/v2.0.0/`
and its companion `tutorials/familyzoo/v2.0.0/src/` to (a) teach ADR-209 room-description
snippets in a new ch5 section plus its required ch13/ch19/ch29/ch30/ch31/appendix touches,
and (b) apply a narrow, named slice of the still-open 2026-07-02 change list: the
`python3 -m http.server` → `npx serve` fix, multi-user removal, and CLI/terminal
repositioning. All work is docs/book, code-snippets, and tutorials/familyzoo (story-level) —
no `packages/` changes, so no platform-change discussion gate applies.
**Bounded contexts touched**: N/A — this project does not use `docs/ddd/` notation. The
book's own domain vocabulary (Marker, Snippet, Snippet map, Splice pass, `mentions`
presence gate, Choice counter keyspace) comes from ADR-209 and must be used verbatim in
the new prose.
**Key domain language**: Marker (`{snippet:name}`), Snippet / Snippet map, Splice pass,
`mentions` (presence gate), cycling selector (default), Choice counter keyspace
`(roomId, markerName)`.

## References consulted
- `docs/architecture/adrs/adr-209-room-description-snippets.md` — the ACCEPTED spec the
  new ch5 section teaches verbatim: author surface, semantics 1-9, Non-goals, Interface
  contracts, AC-1..AC-10. Its Consequences section explicitly directs two book edits: state
  the opt-in-braces invariant plainly, and document the `(roomId, markerName)` Choice
  keyspace addition to avoid collisions with story-authored Choices on the same room
  entity. The platform implementation landed in commits `354547a7`/`b56a1827`; the ADR
  header was amended 2026-07-09 (plan-review STALE ADR finding) to say so. This plan is
  documentation-only and needs no further platform go-ahead.
- `docs/architecture/adrs/adr-107-dual-mode-authored-content.md` — establishes
  `initialDescription`/`descriptionMessageId` as the dual-mode (literal-or-messageId)
  first-visit description fields ADR-209 splices into. The book has never taught this ADR
  (zero occurrences of either field in `parts/` or `backmatter/`), which is why the new
  ch5 section's scope (description-only vs. description+initialDescription) is an open
  question this plan surfaces rather than resolves.
- `docs/context/project-profile.md` — binds three things: (1) the Long-Form
  Documentation/Publishing mutation signature — "claiming a chapter fix without re-running
  its walkthrough transcript" is flagged as an *insufficient* test, so every phase below
  ends with an actual transcript/build run, not a read-through; (2) `tools/repokit`/
  `./sharpee` build-CLI split (ADR-187) and `scripts/build-book.sh <version> [format]` as
  the only book-build entry point; (3) the frozen-v1.5 note — `tutorials/familyzoo/v1.5.0/`
  and `docs/book/v1.5.0/` are out of scope and must not be touched even incidentally.
- `docs/context/session-20260708-0130-main.md` (newest session by filename sort) — confirms
  the ADR-209 platform feature and its switching_on follow-up are both implemented, tested
  (dungeo walkthrough 916/916, stdlib suite green), and committed; status COMPLETE, no
  blockers. Nothing deferred that bears on this plan.

**Note on the active-plan pointer**: `docs/context/.current-plan` previously pointed at
`docs/work/adr-209-snippets/plan.md` (the *platform implementation* plan for ADR-209 itself).
That plan's Phase 1 is still marked CURRENT even though its work has already landed per the
commits above — it appears to have gone stale rather than being marked DONE. This plan does
not fix that bookkeeping; it only repoints `.current-plan` at this new, separate book-editing
effort. Flag it to David in case the older plan file should be closed out.

**Out of scope (confirmed, do not re-open)**: the full 2026-07-02 change list beyond the
named slice above (ch19 rewrite of the formatter chain, Appendix D regeneration, ch15
ADR-207 edit, vNN→chapter-name sweep, ADR-158 article-quote sweep, ch9/ch23/ch25/ch27/ch28
individual findings) — that is a separate, larger edition effort. `packages/` changes.
`docs/book/v1.5.0/` and `tutorials/familyzoo/v1.5.0/`.

## Phases

### Phase 1: Branch cut + commit planning docs
- **Tier**: Small
- **Budget**: 60
- **Domain focus**: Repo hygiene — no book content yet.
- **Entry state**: On `main`. Working tree has the two change-list documents
  (`docs/work/book/change-list-v2.0.0-20260702.md` modified,
  `docs/work/book/change-list-v2.0.0-addendum-adr209-20260708.md` untracked) plus this
  plan, all uncommitted. Also present but **unrelated to this effort**:
  `docs/work/blog-v2.md`, `docs/work/phrase-1-prompt-md`, `docs/work/phrase-2-prompt.md` —
  do not stage these.
- **Deliverable**:
  1. Ask David for a commit go-ahead (per repo convention: never commit without
     explicit permission) covering exactly: the two `docs/work/book/change-list-*.md`
     files, `docs/work/v2-209-book/plan.md`, `docs/context/.current-plan`, and the two
     ADR status amendments from the 2026-07-09 plan-review (ADR-209 header flipped to
     IMPLEMENTED with commit refs; ADR-107 PROPOSED → ACCEPTED — IMPLEMENTED).
  2. On go-ahead, commit those files on `main`.
  3. Create and check out branch `v2-209-book` from `main`.
- **Exit state**: `v2-209-book` exists, checked out, contains the committed planning docs;
  `main` unaffected beyond that commit. `git status` on the new branch shows only the
  three unrelated untracked files (still untouched) plus a clean tree otherwise.
- **Status**: DONE (2026-07-10, commit `3b829801`)

### Phase 2: New ch5 snippets section + supporting cross-references
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: Room-description snippets (ADR-209) — author surface, semantics,
  invariants — taught in the book's own voice.
- **Entry state**: Branch `v2-209-book` checked out (Phase 1 done). **Open decision to
  surface to David before writing, not resolve unilaterally**: the book has never taught
  `initialDescription`/`descriptionMessageId` (ADR-107), but ADR-209 splices markers into
  *both* `description` and `initialDescription`. Ask: (a) add a short first-visit-description
  passage to ch4 first, so the new section can honestly teach both texts per ADR-209
  semantics 5, or (b) scope the new section to `description` only, with a one-line pointer
  noting `initialDescription` shares the same snippet map (deferred). Do not proceed with
  drafting until this is answered.
- **Status note**: CURRENT as of 2026-07-10 — awaiting the scope answer above.
- **Deliverable**:
  - `parts/part-2/05-scenery-and-portable-objects.md`: new section after the existing
    scenery material, covering (per the addendum's outline, sourced from the ADR): the
    study author-surface example; string vs. list snippet entries with `cycling` as the
    default selector and the long form for other selectors; `mentions` as both coverage
    metadata and a presence gate (transitive containment); failure posture (load-time
    error naming room+marker for an unbound marker, build-time warning for an unused
    entry, render-time graceful degradation); the opt-in invariant stated plainly (braces
    render verbatim in a room with no snippet map); the description/initialDescription
    scope per the decision above; the "what snippets are not" non-goals paragraph;
    `{ messageId }` entries with a pointer to ch18.
  - `parts/part-1/02-your-first-room.md`: one forward-pointing sentence where
    `description()` is introduced — braces are inert unless the room opts into snippets
    (ch5) — per the addendum's POLISH note; skip if it reads as clutter this early
    (author judgment call, not a blocking decision).
  - `parts/part-2/04-rooms-and-navigation.md`: one-line forward reference from the
    room-prose material to the new ch5 section. If the open decision above chose (a),
    this is also where the new first-visit-description passage lands.
  - `parts/part-4/13-event-handlers.md`: new short aside on handler-driven snippet-map
    mutation (aftermath text; set entries to `''`, never delete), back-pointing to ch5.
    Base it on the dungeo rug-push/melee-interceptor examples read in Phase 3's prep.
  - Prose voice: match v1.5 book voice — no em-dashes, complete sentences (this
    constraint applies to text written into `docs/book/`, not to this plan).
- **Exit state**: All four files edited and internally consistent (ch5 section's scope
  decision matches what ch2/ch4/ch13 say about it). No transcript run required yet — the
  chapter's own worked example is prose-only until Phase 3 lands the companion code that
  backs it.
- **Status**: DONE (2026-07-10). David chose (a) via issue #179: teach both texts. ch4
  gained a "First visits get their own prose" section with the Aviary as the example
  (its arrival prose moved to `initialDescription`, standing description recast); ch5
  gained the full "Room-description snippets" section (Petting Zoo rabbits example,
  string→list→mentions progression, selectors, rules, non-goals, messageId pointer)
  plus a room-snippets transcript block in Test it and a takeaway sentence; ch2 got the
  braces parenthetical; ch13 got the handler-mutation aside (illustrative "shape to
  read" framing — companion code intentionally does NOT ship the mutation, keeping
  Phase 3 scope to the ch5 example). code-snippets regenerated; em-dash check clean;
  `build-book.sh v2.0.0 html` clean, new sections verified in rendered output.
  NOTE for Phase 3: the ch4 Aviary initialDescription change must also land in the
  ch04 companion snapshot and propagate forward, alongside the ch5 changes; the ch5
  rendered-output block and the room-snippets transcript assertions are claims the
  Phase 3 transcript run must prove byte-for-byte.

### Phase 3: Companion familyzoo code + transcript test
- **Tier**: Medium
- **Budget**: 220
- **Domain focus**: The ch5 snippets example made runnable, in the book's own tutorial
  voice and cumulative-snapshot convention.
- **Entry state**: Phase 2's ch5 section text exists and specifies the exact example
  (marker names, snippet map, selector) to implement. Reference implementations to crib
  from: `stories/concealment-test` (snippets story area +
  `tests/transcripts/snippets.transcript`, 17 assertions) and `stories/dungeo`'s 9 P1
  rooms (`src/regions/{white-house,dam,well-room,maze,house-interior,underground,
  frigid-river}.ts`, `src/interceptors/{melee,rug-push}-interceptor.ts`).
- **Deliverable**:
  - `tutorials/familyzoo/v2.0.0/src/ch05-scenery-items.ts`: add the snippets example
    from the new ch5 section (a room description with one or more `{snippet:name}`
    markers and a matching `snippets()` call), consistent with the file's existing zoo
    content and the "book code, cumulative" convention documented in the tutorial's
    `README.md`.
  - Propagate the same snippet map into every later cumulative snapshot that inherits
    `ch05-scenery-items.ts`'s room (check `ch06-containers.ts` onward through
    `ch24-27-presentation/` and `index.ts`'s re-export chain per the README's file↔chapter
    map) so no snapshot regresses to pre-snippet room text.
  - One new transcript under `tutorials/familyzoo/v2.0.0/tests/transcripts/` pinning a
    `cycling` snippet across repeated `look` commands (AC-2 shape: first visit shows entry
    one, second `look` advances to entry two, no adjacent repeat). Follow the existing
    `vNN-*.transcript` header convention (`title`, `story`, `description`, `entry:` if the
    project's transcript runner requires pinning a compiled snapshot — check how existing
    `vNN-*.transcript` files are invoked first).
  - Determine and use the project's actual test-run command for this tutorial (it is a
    standalone `sharpee`-authored project per its own `package.json`, not a `stories/`
    workspace member) — do not assume `dist/cli/sharpee.js --test` applies unmodified;
    verify against how the existing `v01`-`v16` transcripts are currently run before adding
    the new one.
- **Exit state**: New transcript passes against the actual build (real-path test, not a
  hand-rolled stand-in) — run it and show the pass. Existing familyzoo v2.0.0 transcripts
  (`v01`-`v16`) still pass unchanged (no regression from the snippet map propagation).
- **Status**: DONE (2026-07-10), with the verification route adapted after
  investigation:
  - **Test-run mechanism resolved**: the bundle cannot load the standalone tutorial
    (multi-file `index.js` re-export unresolvable by its TS loader), and the tutorial's
    own harness is the Docker/published-npm naive-regression flow — whose published
    `@sharpee` 2.0.x predates ADR-209. Real-path verification therefore ran via
    `stories/friendly-zoo` (workspace mirror, in-repo platform): a gift-shop
    enamel-pins snippet with the book's exact shape (cycling list, empty entry,
    `mentions` gate). `room-snippets.transcript` 8/8; full friendly-zoo suite 47/47
    across 8 transcripts (`node dist/cli/sharpee.js --test --story stories/friendly-zoo`).
    First attempt used the petting zoo and failed instructively: friendly-zoo already
    has rabbits with ADR-195 presence lines (duplicate entity + "not contains" can
    never pass there) — moved to the gift shop.
  - **Tutorial propagation**: all 16 snapshot files edited (subagent, script with
    exact-match assertions): aviary `initialDescription` pair everywhere; petting-zoo
    `{snippet:rabbits}` marker + book-exact snippet map in ch05..ch23; rabbits entity
    + map added to both multi-file snapshots' `zoo-items.ts` (they were MISSING the
    rabbits entity entirely — the dungeo-81 defect class in the wild). ch06's petting
    zoo had a variant text (feed-dispenser sentence), handled. `hop lazily` remains
    only in ch04 by design (book adds the marker in ch5).
  - `tests/transcripts/room-snippets.transcript` written book-exact.
  - **Post-publish verification CLOSED (2026-07-10)**: after David published the
    lockstep 2.2.0, the tutorial was stood up as a standalone project on the published
    packages (`npm install` + `npx sharpee build --test`). First run 201/202: the two
    multi-file snapshots already had a rabbits entity in `characters.ts` (missed by the
    pre-propagation grep, which only covered zoo-map/zoo-items), so the propagation's
    added entity caused a disambiguation clash on `examine rabbits`. Fix: duplicate
    entity + map removed from both `zoo-items.ts`; the snippet map now lives in both
    `characters.ts` after the existing rabbits creation. Re-run: **202/202 across all
    17 transcripts** on published 2.2.0. The full PDF naive-executor round remains
    available as the book-wide gate when David wants a run.

### Phase 4: Remaining small prose edits (ADR-209 addendum tail + change-list slice)
- **Tier**: Medium
- **Budget**: 180
- **Domain focus**: Small, mechanically clear edits — Choice-counter keyspace,
  build-output warnings, determinism, multi-user removal, CLI/terminal repositioning,
  and the http-server command fix. Grouped into one phase because several edits land in
  the same files (ch31, appendix-a) and should not be touched twice across two sessions.
- **Entry state**: Phases 2-3 done (so ch5/ch13 already carry the snippets vocabulary this
  phase's cross-references point back to).
- **Deliverable** — ADR-209 addendum tail:
  - `parts/part-5/19-the-phrase-algebra.md` ~L254: one or two sentences — the Choice
    counter keyspace now has a second consumer, snippets keyed `(roomId, markerName)`,
    alongside `(entityId, messageKey)`; document the convention so story-authored Choices
    on a room entity don't collide with that room's snippet counters (ADR-209
    Consequences). Optional cross-reference near ~L198 ("Branching stays in code"):
    for room-prose variation specifically, authors reach for snippets (ch5) before a
    hand-built `Choice`.
  - `parts/part-8/29-transcript-testing-and-walkthroughs.md` ~L91 (determinism
    paragraph): add snippets to the list of things that stay reproducible — seeded,
    counter-driven selection, so `random`-selector snippets replay identically.
  - `parts/part-8/30-saving-and-restoring.md` ~L18 (save-state list): note that
    selector/Choice counters, including snippet counters, persist with the game and
    mid-cycle save/restore continues the cycle (AC-3).
  - `parts/part-8/31-building-and-publishing.md`: one row/sentence wherever build
    warnings are enumerated — `sharpee build` now also warns (names room and entry) on
    an unused snippet entry.
  - `backmatter/appendix-a-architecture-map.md`: one clause, only if the appendix already
    names packages at that grain — snippet wire types live in `@sharpee/if-domain`,
    scan/gate in stdlib, `Seq` realization in the Assembler, load validation in engine,
    unused-entry lint in devkit. Skip if the appendix's altitude is coarser than that.
- **Deliverable** — change-list slice (only the items named in this plan's Goal, nothing
  else from that document):
  - `parts/part-1/01-installing-sharpee.md` ~L170 and
    `parts/part-8/31-building-and-publishing.md` ~L57: `python3 -m http.server -d
    dist/web` → `npx serve dist/web`; adjust the port mention (8000 → 3000) in both
    places.
  - `code-snippets/ch01-installing-sharpee/07-playing-it.sh` and
    `code-snippets/ch31-building-and-publishing/03-hosting-it.sh`: same command swap.
  - Multi-user removal: `frontmatter/00-preface.md` L6, `parts/part-7/24-channels.md`
    L13, L35, L164 — remove every multi-user mention outright (the "terminal, browser,
    or multi-user server" triples, the preface's "host for many players at once"). No
    forward-looking replacement language.
  - CLI/terminal repositioning: `frontmatter/00-preface.md` L6 (same edit as the
    multi-user removal — recast in one pass), `parts/part-7/24-channels.md` L13,
    L79-81, L164, `parts/part-7/27-media-and-audio.md` L38,
    `parts/part-8/31-building-and-publishing.md` L46,
    `backmatter/appendix-a-architecture-map.md` L44 — recast every terminal mention as
    a testing surface (transcripts, dev REPL) or an accessibility surface (plain-text
    stream ingested by a blind player's screen-reader/TTS tooling); the browser client
    is *the* player-facing client.
  - Prose voice constraint applies to all edits in this phase (no em-dashes, complete
    sentences).
- **Exit state**: All listed files edited; grep confirms zero remaining "multi-user"
  mentions and zero remaining `python3 -m http.server` mentions in `docs/book/v2.0.0/`
  and its `code-snippets/`. No transcript changes needed for this phase (prose-only,
  no quoted command output changes that a transcript exercises).
- **Status**: DONE (2026-07-10, executed ahead of Phases 2-3 while the Phase 2 entry
  gate awaited David's answer — no file overlap with Phases 2-3, all decisions were
  already made. Exit greps clean; `code-snippets/` regenerated via
  `extract-book-snippets.cjs` per `docs/book/CLAUDE.md` rather than hand-edited;
  `build-book.sh v2.0.0 html` clean. Appendix A package-grain clause skipped per its
  own only-if-grain-fits condition; the L44 terminal recast was applied.)

### Phase 5: Regenerate book artifacts + final review
- **Tier**: Small
- **Budget**: 80
- **Domain focus**: Build verification — confirm the edited markdown actually renders,
  per the project-profile's mutation signature for this domain ("claiming a chapter fix
  without re-running" is the named failure mode).
- **Entry state**: Phases 1-4 complete and committed on `v2-209-book` (ask for a commit
  go-ahead per repo convention before this phase's own commit, same as Phase 1).
  `scripts/build-book.sh` confirmed present and usable (`scripts/build-book.sh v2.0.0
  [html|epub|pdf|web|snippets|all]`).
- **Deliverable**:
  - Run `scripts/build-book.sh v2.0.0 all` (or `html` first if the full render is slow)
    and confirm it completes without error against the edited source.
  - Spot-check the rendered ch5 section, the ch13 aside, and one of the small-edit
    chapters (e.g. ch31) in the generated HTML output for the new prose landing
    correctly (no broken markdown, no stray marker syntax leaking into rendered text).
  - Re-run the new familyzoo snippets transcript plus the existing `v01`-`v16` set from
    Phase 3 one more time post-edit, to catch any drift introduced by Phase 4's prose
    changes to files that reference companion code paths.
- **Exit state**: Book build for v2.0.0 completes clean; spot-checked chapters render
  correctly; familyzoo transcripts still green. Ask for a final commit/push go-ahead
  covering all of `v2-209-book`'s changes (book content + companion code).
  `docs/book/v2.0.0/build/` is gitignored (`docs/book/v2.0.0/.gitignore:2`) — rebuilt
  artifacts are never committed; publishing rendered output into `site/` is a separate
  step outside this plan.
- **Status**: PENDING

## Risks / open items to flag to David up front

1. **The initialDescription scope decision (Phase 2 entry gate)** — must be answered
   before ch5 drafting starts; it changes whether ch4 also gets new content.
2. **Familyzoo test-run mechanism (Phase 3)** — the tutorial is a standalone
   `sharpee`-authored project, not a `stories/` workspace member; confirm the real
   test-run path before trusting `dist/cli/sharpee.js --test` applies unmodified.
3. **Unrelated uncommitted files** (`docs/work/blog-v2.md`,
   `docs/work/phrase-1-prompt-md`, `docs/work/phrase-2-prompt.md`) sit in the working
   tree alongside this effort's planning docs — Phase 1 must stage only the intended
   files, not sweep everything with `git add -A`.
4. **Stale sibling plan** — `docs/context/.current-plan` currently points at
   `docs/work/adr-209-snippets/plan.md` (platform implementation), whose Phase 1 is
   still marked CURRENT despite that work having already landed. This plan repoints
   `.current-plan` here; the older plan file's bookkeeping is untouched.
5. **Build-artifact commit policy (Phase 5)** — RESOLVED (2026-07-09 plan-review):
   `docs/book/v2.0.0/build/` is gitignored; artifacts are never committed. Publishing
   into `site/` is out of scope for this plan.
