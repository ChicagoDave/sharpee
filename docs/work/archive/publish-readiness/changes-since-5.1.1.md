# What changed: Sharpee 5.1.1 → 5.3.0, Chord 3.3.0 → 3.6.0, Chord Writer 1.3.1 → 1.4.0

Raw material for a blog post. Everything here is drawn from the commit log between the
5.1.1 publish (`40954866`, 2026-08-18) and `d936024c` (2026-09-04), from
`docs/architecture/chord-grammar-changes.md`, ADRs 321–332, and the publish-readiness
punch list (`docs/proposals/publish-readiness-defects.md`). Dates are when things
landed on the branch, not when they were published.

Published 2026-09-04: `@sharpee/*@5.3.0` on npm (34 packages; two of them,
`@sharpee/world-index` and `@sharpee/ext-chapters`, for the first time). Chord Writer
1.4.0 is signed and notarized for arm64 as of this writing; the x86_64 slice and the
sharpee.net install page follow. 5.2.0 / Chord 3.5.0 were internal numbers and never
shipped, so the public jump is one release.

---

## Chord, the language (3.3.0 → 3.6.0)

### New things an author can say

- **Timers** (ADR-325). `define timer <name> for <owner> … end timer` with named
  turns (`arriving`, `lingering`), per-turn prose, `meanwhile, one chance in N` rows and
  `interrupted one chance in N`. Verbs: `start`, `stop`, `restart`, `reset`,
  `interrupt`. Reads: `while search is lingering`, `has started`, `has expired`. A
  `when <timer> expires … end when` clause fires exactly once per run.
- **Places** (ADR-325). Possessive locations (`the keeper's location`), `here`,
  `offstage` (the entity keeps its states and timers and can come back), plural
  possessives.
- **Regions with a landing** (ADR-325). `landing <room>` on a region makes it a `move`
  destination; `set <region>'s landing to <room>`; `is in <region>` is a membership
  test through nested regions.
- **`move … to a random adjacent room`** (ADR-326). A computed destination: one
  traversable exit away, drawn at effect time on the mover's own seeded stream. Blocked
  exits and locked doors don't count. Any `move` arrival now fires the destination's
  `entering` clauses and the mover's `when … moves` clauses.
- **The player is a role, not a block** (ADR-327). `create the player` is gone. A
  character is marked `playable`; a `before the game starts … end before` block says
  `change the player to <character>`, and the same statement swaps the player mid-game.
- **Clause heads name their actor** (ADR-327). `on the player taking`, `after the
  guard entering`. Syntactic `it`/`its` left the language everywhere except inside
  `define trait`. Every published example was migrated.
- **The acting statement** (ADR-329). `<character> <verb> [<object>] [<preposition>
  <object>]` has a character perform one standard or story action now, through the
  engine's real execution path — validated, interceptable, witnessed. `the guard opens
  the door`, `Teisha talks to the player`.
- **Goal steps in an action's own words** (ADR-329 D10). A `goal` body line that isn't
  one of the eight planning verbs is an action the character performs when the plan
  reaches it: `open the door`, `go east`, `conjure the key into the Vault`.
- **Chapters** (ADR-330, the `chapters` extension). `use chapters` in the header admits
  `define chapters … end chapters`: one row per chapter (`market - Chapter I:
  Grubber's Market`), an optional description paragraph, and `begins when` one of four
  moments: `the game starts`, `the player visits <room> for the first time`, `<timer>
  expires`, `<entity> becomes <state>`. Chapters are readable: `during <name>`,
  `before <name>`, `after <name>` as conditions, and `during <name>` as a `while`
  shorthand on any head that takes one. A `story.chapter` channel packet announces each.
- **Nested imports** (ADR-251 amended). An imported `.chord` fragment can itself
  import; paths are story-rooted; an import cycle is a named diagnostic.
- **`proper` on any create block**, not only people: a shop, an institution, a place.
- **`, one-way` exits.** `north to the Alley, one-way` connects only the written
  direction; on a door line, the door opens from that side only. Plain exits stay
  bidirectional.
- **`{bare item}`** — the no-article marker hint, beside `{the …}`, `{a …}`, `{some …}`,
  `{capitalize …}`: "another {bare item}" renders "another pear".
- **Story-tier grammar:** tool-less `take :item from :container` and `get … from`
  shapes; `remove … from` no longer re-wears a wearable.
- **Dialogue forms are gated at compile time.** The partner-only predicates (`was
  discussed`, `asked <word>`, `<thread> is concluded`, `subject changes`) are refused
  outside a dialogue body with a diagnostic that says what to use instead. `leave` on
  the speaker's own turn closes the scene.

### Fixed in the language and loader (publish-readiness Phases 2–7)

- A room's `first time` paragraph renders when the player arrives by going (#326) and
  an authorial `move the player to …` describes the destination (#331).
- Possessive names (`the Weaponsmith's Stall`) resolve in conditions and statements
  (#336). `phrase <key> with <p> = <v> when <cond>` parses in either order (#335).
- Inline `kill the player` bodies no longer collide across imported files (#324).
- `{phrase-key}` inside a `define phrase` body renders instead of printing literally
  (#286); `the direction is <word>` matches compass canonicals (#285).
- `remove` marks an entity *gone* rather than deleting it: conditions that mention a
  removed entity read false instead of throwing (#330, #345), and a story-rule failure
  renders as its own message instead of "I don't understand that."
- A phrase emitted in the same arm that moves its owner offstage still renders (#329).
  An authorial `move` of a worn item un-wears it (#334). `x me` honours the player's
  `phrase detail while …` (#325).
- `reachable` includes the actor; items an NPC carries are visible and takeable (#312,
  #313). Refusals select an arm by strategy (#304).
- Blocked-exit arms compose in declaration order, first condition wins (#315); `look`
  and arrival fold gated `phrase detail while` clauses into the room description (#316).
- Compile-time diagnostics carry the file they came from (`Span.file`), so a fragment's
  error points at the fragment (#301).

## Sharpee, the platform (5.1.1 → 5.3.0)

- **Actors are a platform concept** (ADR-328, twelve phases). Every NPC act runs the
  real standard action as that NPC through the same execution entry the player uses.
  `ActionContext.actor` threads through the whole standard-action library; per-actor
  voice on the phrase path; a presence tag at the enrichment funnel so narration knows
  who was there to see it; Dungeo's five NPCs moved onto the pipeline with the
  walkthrough chain byte-identical. `NightVisionTrait` landed with it.
- **Story reactions run before the platform's actor phase** (ADR-332) — turn-phase
  bands, so an `after` clause fires before an NPC's own turn responds to it.
- **Conversation interruption** (ADR-320 D10a): an open exchange can be interrupted by
  the world and resumed.
- **The held command** (ADR — publish-readiness Phase 9): a bare noun after "What do
  you want to drop?" completes the command (#318).
- **Deferred narration** (ADR-323): "say it later" as a prose-pipeline primitive.
- **The World Index** (ADR-321, new package `@sharpee/world-index`): a static analysis
  of a compiled story — map and reach derivation, incomplete-world detection, findings
  that point at the source line and explain themselves. Exposed as `sharpee
  world-index` in the devkit and as Chord Writer's World tab. Chapters ship as
  `@sharpee/ext-chapters`.
- **State-space analysis umbrella** (ADR-322): the layer split and soundness contract
  the World Index sits under; supersedes ADR-303.
- **Text and binding polish** (Phase 10): "a boots (worn)" no longer takes an article
  (#328); "the Jack" no longer appears in third-person act narration (#323); the melee
  no-effect message binds the right noun (#206); an instrument-first pattern fills the
  direct object (#333); thirty-plus orphan message ids gained English templates (#108);
  pronoun capture from error messages that name entities (#97).
- **Arrival and conversation** (Phase 11): room descriptions on entering include
  scenery supporters' contents (#338); the player can answer an open exchange (#346)
  and say goodbye (#300); tool gates accept a held instrument without naming it (#241).
- **The Fernhill defects** (Phase 12): the seven remaining player-visible defects in
  the sample story, fixed across story-loader, stdlib, engine and lang-en-us (#245).
- **Testing:** `sharpee test` runs the ADR-307 tree document, and `story.state` claims
  can be spelled in Chord (`the brass lantern is glowing`) (#355). `sharpee play`
  accepts piped commands (#240). `sharpee test --bless`/`--watch` were closed as
  superseded by the tree document (#239).
- `cloak-of-darkness` ships one implementation — the `.story` file (#231).
- Publishing: the `Publish to npm` GitHub Actions workflow with OIDC trusted
  publishing, dry-run by default; `tsf publish --changed` makes a re-dispatch after a
  partial failure resume where it stopped (it did, at channel-service, on 5.3.0).

## Chord Writer (1.3.1 → 1.4.0)

- Speaks **Chord 3.6.0** and bundles the **Sharpee 5.3.0** toolchain; the status bar
  reads `Chord Writer 1.4.0 · Sharpee 5.3.0 / Chord 3.6.0`. Opening a story that uses
  timers, chapters, landings or `proper` no longer raises the "IDE is behind" warning.
- **`.chord` fragments are Story source** (#287): they appear in the sidebar, are
  highlighted, and recompose the story on save. **File → New Import** and **Extract
  Selection to Import** (#288) create fragments from the editor.
- **World tab** (ADR-321): the World Index inside the IDE — map, reach, incomplete
  findings that point at the line, explain, and act.
- **Menu-less Play pane** and a **Publish** menu option that offers the in-page menu
  (#196); **Restart** clears the Play pane (#195).
- Editor: the wrapped editor never scrolls sideways (#290); the active tab repaints on
  external reload (#295); the gutter clamp origin fix.
- Documentation tab regenerated at Chord 3.6.0: 164 pages, including the new timers,
  chapters, player-role, tree-document testing and sound/music/images guides.
- Under the hood: the compose decoder follows the IR's `isPlayable` field (ADR-327);
  the syntax highlighter colours `timer` and `chapters`; the Chord pin is backed by a
  new lexer-golden corpus that exercises the whole 3.4–3.6 surface. 592 IDE tests green.
- Sparkle auto-update: 1.4.0 is the first release offered to installed 1.2.0+ copies
  through the per-architecture appcasts.

## sharpee.net

- New guide pages: `chord/guide/flow/timers`, `chord/guide/flow/chapters`,
  `chord/guide/world/the-player-role`, `chord/guide/world/sound-music-and-images`,
  `chord/guide/tooling/sharpee-test` (the tree document: seed, cards, branches, the six
  claim families, `auto-assertion:`, flags and exit codes).
- Syntax sweep since 5.1.1 across the hand-written guides: `proper` on any block, nested
  imports and story-rooted paths, every-turn clauses and presence, `move` destinations,
  landings, `is in <region>`, timer reads, `during`/`before`/`after`, the `use`
  extension list (`scoring`, `hunger`, `chapters`), `{bare}` and article hints.
- The inline `authors: <name>` header form was removed on 2026-08-15; eleven pages
  still showed it and now show the indented list form.
- Getting-started no longer recommends `--chain` and `.transcript` files; it teaches
  the tree document. Exits page says in so many words that plain exits are two-way.
- Version strings on the Chord Writer pages are derived from the repository
  (`versions.json`), not typed by hand. 113 files changed under `website/src/app`.

## Stories

- **The Secret Letter** — the Chord port of David's 2009 game: Chapter 1 (Grubber's
  Market) built and test-covered — the eavesdrop, the banana theft, the four cables and
  the Market Escape, the eight stalls and the source's theft rule, Teisha's silk wares
  and the buy verb, the hunted-state sweep on ADR-325 timers, wary stallkeepers;
  Chapters 2–11 as change documents; the ending redesigned. Most of the language work
  above was driven by what this port could not yet say (GH #305–#337 and on).
- **Fernhill** — seven defects fixed (#245); its tree document is the reference for the
  `sharpee test` guide.
- **Dungeo** — five NPCs on the actor pipeline; walkthrough chain byte-identical.
- **Cloak of Darkness** — one implementation, in Chord.

## The publish-readiness punch list

44 items (`docs/proposals/publish-readiness-defects.md`), 38 DONE. Not shipped in this
release, each with a recorded reason:

- **P-11** (#332) only one trait's `on <action>` clause per entity is consulted —
  waits on an ADR-118 amendment defining consultation order across composed traits.
- **P-21** (#317) story-action bare-verb grammar needs scoping or stdlib fall-through
  — waits on an ADR-087/267 amendment.
- **P-29** (#242) entity topics fall through silently when the topic entity is out of
  scope — waits on a scoping ruling in ADR-320.
- **P-37** (#224) the tutorial editions no longer type-check — an edition decision, not
  a patch.
- **P-43** the outside-repo proof (install devkit from npm on a clean machine, ship a
  story) — pending.
- **P-44** the publish itself — npm half done; Chord Writer 1.4.0 in progress.

## ADRs written or accepted in this span

321 World Index · 322 State-space analysis umbrella · 323 Deferred narration · 324
IDE error surfaces (proposed) · 325 Places and timers · 326 Adjacent-room place ·
327 Explicit references · 328 Actors are a platform concept · 329 The acting
statement · 330 Chapters · 331 Rotation (draft) · 332 Story reactions before the
actor phase. Plus amendments to ADR-118, ADR-251, ADR-257 (version consolidation),
ADR-267, ADR-320.

## Release mechanics worth a paragraph

- Two packages had never been published, so the CI release would have failed at the
  first with an E404 and stranded the rest (the 4.5.0 failure mode). Both were
  hand-published first from a TTY and registered as trusted publishers.
- The first real dispatch stalled transiently at channel-service; `--changed` made the
  re-dispatch resume at exactly that package.
- Chord Writer notarization: the orphaned "In Progress" submissions that have dogged
  every release since 2026-08-10 turned out to be `notarytool` itself crashing mid-upload
  (SIGBUS). A completed upload prints `Successfully uploaded file`; without that line
  the submission id is dead on arrival. Five sessions of "Apple is slow" were not.
