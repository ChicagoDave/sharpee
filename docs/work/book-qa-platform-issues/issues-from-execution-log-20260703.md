# Platform issues from the 2026-07-03 book acceptance run

Source: `execution-log.md` (repo root) — a front-to-back literal-reader run of
the v2.0.0 book PDF. Book-side fixes were applied directly to
`docs/book/v2.0.0/` and `tutorials/familyzoo/v2.0.0/` (see git diff). The items
below are **platform** changes and need discussion before implementation
(per CLAUDE.md).

## P1 — Looking action lists scenery in room contents (stdlib) — DONE (in working tree)

Implemented 2026-07-03 after discussion: scenery is excluded from the
contents_list prose in both looking (`determineLookingMessage`) and going
(auto-look). `openContainerContents` still scans scenery holders, so "On the
park bench you see a souvenir penny." survives. New golden tests pin the
behavior (scenery excluded; scenery-only room emits no list; scenery
supporter's contents still render; going-side case). stdlib suite: 1343 pass.
Decided against a `listed: true` escape hatch on SceneryTrait — if it belongs
in the enumeration, it isn't scenery. Consequence: dungeo fails 81/1709
transcript assertions because several rooms relied on the auto-listing instead
of naming fixed objects in their prose; filed as
https://github.com/ChicagoDave/sharpee/issues/176 (write scenery into room
descriptions + update transcripts).

### Original finding


`buildListContentsData` / `buildLookingEventData`
(`packages/stdlib/src/actions/standard/looking/looking-data.ts`) filter only the
room and the player out of `context.getVisible()`. Scenery is never excluded, so
the Main Path renders:

> You can see direction signs, a souvenir penny, a park bench, and a staff gate here.

The book (§5.5) documents the intended behavior: "Scenery is not listed this
way; it's expected to be named in the room's description prose." Proposed fix:
exclude `TraitType.SCENERY` from `directInRoom` (three builder sites in
looking-data.ts; check the going action's contents_list path shares the
builder). Watch for stories that rely on the current behavior.

## P2 — `nounPhraseFor` ignores `IdentityTrait.article` (stdlib) — DONE (in working tree)

Implemented 2026-07-03: `nounPhraseFor` now honors the entity's explicit
`article` field when no semantic noun signal outranks it — 'the' → definite,
'some' → some, '' → none, 'a'/'an' (the IdentityTrait default) → indefinite.
Precedence: properName/nounType 'proper' → none, nounType 'mass' → some, and
nounType 'unique' → definite (previously documented in ADR-095 but
unimplemented) all win over the literal field; template hints still override
everything downstream. Only the language-neutral `articleType` is set — the
literal never lands on the NounPhrase (D4 contract preserved). Seven new unit
tests; stdlib 1303 pass, lang-en-us 386, engine 465; dungeo failures unchanged
at the 81 P1-related ones (issue #176). Verified end-to-end: the Nocturnal
Exhibit trio renders "some sugar gliders, some bush babies, and a barn owl".

### Original finding


`packages/stdlib/src/utils/noun-phrase.ts` derives `number` from
`nounType`/`grammaticalNumber` and `articleType` from `properName`/`nounType`,
but never reads `identity.article`. The book teaches `article: 'a' | 'an' |
'the' | 'some' | ''` on nearly every IdentityTrait listing, so entities like
the sugar gliders (`article: 'some'`, no grammaticalNumber) render as
**"a sugar gliders"** in contents lists. Options:
- honor `identity.article` when set (`'some'` → articleType `'some'`, `''` →
  `'none'`), or
- deprecate `article` in favor of `nounType`/`grammaticalNumber` and rewrite the
  book's listings.

## P3 — NPC movement announcement prints raw direction — DONE (in working tree)

Implemented 2026-07-03: `announceMovement` in
`packages/stdlib/src/npc/npc-service.ts` now binds the lowercase surface form
for both departure and arrival (the templates render `{verbatim:direction}`).
Three test assertions updated; stdlib suite 1303 pass. Verified end-to-end in
friendly-zoo: "The zookeeper leaves to the east." Also enabled
`announcesMovement: true` on friendly-zoo's keeper (parity with the tutorial
snapshots); its 34 walkthrough assertions pass.

FOLLOW-UP (same class, not yet fixed): other actions bind raw `DirectionType`
into `{verbatim:direction}` templates — going ('moved'/'went',
'no_exit_that_way' params), throwing ('thrown_direction', 'no_exit'), pushing
('pushed_direction' etc.), turning ('dial_adjusted'). Most are rarely visible
(going's 'went' is superseded by the room description), but any that render
will show 'EAST'. Consider one `directionWord()` helper in stdlib, or a
direction-aware phrase kind in the language layer.

### Original finding


With `announcesMovement: true` (ADR/plan-159), the departure line renders
"The zookeeper leaves to the EAST." — the raw `Direction` enum value lands in
the `{direction}` slot. Lowercase (or map to locale word) where the params are
built in `packages/stdlib/src/npc/npc-service.ts` (~line 645 area). The book's
Ch 20 now teaches `announcesMovement: true`, so this string is player-visible.

## P4 — Transcript tester STATE-assertion ergonomics — DONE (in working tree)

Implemented 2026-07-04 in `packages/transcript-tester/src/runner.ts`
(`findEntity`): (a) `player` is now a reserved word resolving through
`world.getPlayer()` regardless of the entity's name; (b) alias resolution was
present but DEAD — it read the identity trait with the wrong key
(`entity.get('IdentityTrait')`; the trait key is `'identity'`) and assumed
`entity.traits` was a plain object when it's a Map. Fixed to try
`entity.get('identity')` / `traits.get('identity')`. The book's originally
printed form `[STATE: true, player.inventory contains feed]` now works as-is.
Book §29.3 rewritten to teach the friendly forms; transcript-tester README
updated; the package has no unit-test infra, so the behavior is pinned by
`stories/friendly-zoo/tests/transcripts/state-assertions.transcript`
(reserved word, full name, alias, old `yourself` form, and a negative case).

### Original finding


`[STATE: true, player.inventory contains feed]` (the shape the book originally
printed) fails twice over: the left side resolves entities by **name** (no
`player` keyword; the zoo's player is named `yourself`), and the right side
must be the **full entity name**, not an alias. The book now documents the
working form, but consider: a reserved `player` keyword, and alias resolution
for the contains argument. Error messages are good; discoverability is not.

## P5 — Command chaining — DONE (in working tree)

Implemented 2026-07-04 in `packages/engine/src/game-engine.ts`
(`executeTurn` + exported `splitChainedInput`): one input line can chain
statements with `.`, `;`, or the standalone word `then`; each statement runs
as its own full turn (own undo snapshot, own channel packet) via recursive
`executeTurn`; a failed statement flushes the rest of the line (Inform
behavior); commas are NOT separators (multi-object phrases); alternate input
modes (ADR-137) bypass splitting since mode handlers own the raw line; a lone
trailing separator is shed ("look." runs as "look"). Eight new tests in
`tests/command-chaining.test.ts`; engine suite 473 pass. E2E via friendly-zoo:
`unlock gate with keycard; open gate`, `north. west`, and `east then east` all
chain correctly — the exact compound shape the book's original Try-its used.
Dungeo unchanged at the 81 known P1 failures. The book keeps its split
single-command Try-its (clearer teaching, 1:1 with transcripts) and gains a
chaining note in Chapter 4.

### Original finding


`> open gate; south` fails with "You can't see any such thing." (whole line
parsed as one command). Classic IF supports `.`/`then`/`;` chaining. The book's
Try-it blocks used compounds in six chapters (now split as single commands).
Decide: support chaining in parser-en-us, or leave unsupported (book no longer
depends on it).

## P6 — devkit polish

- `init-browser` names the author override stylesheet after **pkg.name**
  (`getProjectInfo` prefers `package.json name` and only falls back to the
  story's `config.id`), while its own comments/output call it
  `browser/<story-id>.css`. Book §26.4.2 now says "named after your package
  name". Either rename the concept or read the real story id first.
- `sharpee init` "Next steps" says `npm run build`; the book teaches
  `sharpee build`. Pick one voice.
- `init-browser` "Next steps" tells the user to `npm install` browser deps, but
  `sharpee build` succeeds immediately without it. Drop or explain the step.
- `sharpee build` output claims "two things in dist/" — dist/ also carries
  `.d.ts` files (book wording now hedged; CLI copy could hedge too).

## P7 — Book production: code measure (build/styles decision)

The print page fits roughly 60–65 monospace characters; ~80 code-block lines in
the book source are longer. WeasyPrint wraps them at spaces **without any
continuation marker** (readers can't tell a wrap from a newline — several
mid-string wraps in Chs 2/4 read as syntax errors), and **clipped** lines with
no break opportunity (Ch 14/15/17 grammar chains, fixed by reformatting; a
`pre { white-space: pre-wrap; overflow-wrap: break-word }` safety net is now in
`styles/print.css` so nothing can be clipped again). Remaining decision: reflow
all long listings to the measure, shrink the code font, or accept marked wraps.

## Transcript testing threaded through the book (2026-07-04)

Author decision: the book now *shows* transcript testing throughout instead of
saving it for Volume VIII. Chapter 2 gained "Prove it: your first transcript
test" (format, `tests/transcripts/`, `npx sharpee build --test`, expected
output); chapters 4, 5, 6, 7, 8, 12, 13, 14, 15, 20, 21, 22, and 23 each gained
a **Test it** section with a complete transcript (Ch 21 had no Try-it — the
scene-edge test is its first verification; Ch 23's doubles as a full-game
walkthrough asserting victory on the 75th-point turn). Chapter 29 was reframed
as the deep dive (events, state, control flow, walkthroughs) over a suite the
reader already owns, and the frontmatter Conventions document the Try-it /
Test-it pairing. Every printed transcript is validated: the 14 files live in
the acceptance-test project (~/repos/test-book/my-zoo/tests/transcripts/) and
pass 159/159. Note: the Ch 20 transcript's "leaves to the east" line assumes
the P3 casing fix ships (the tester's `contains` is case-insensitive, so it
also passes against the current published packages); Ch 20's Try-it timing was
corrected while validating (examine consumes Sam's waitTurns pause, so the
departure lands on the first wait).

## Non-platform notes (already fixed, listed for visibility)

- Book: Ch 6 SupporterTrait import, Ch 12 duplicate-import, Ch 24
  IChannelRegistry/ChannelProduceContext imports, Ch 27 AudioRegistry import +
  `aviary.id`/`nocturnalExhibit.id` + full `getEventProcessor().registerHandler`
  listing, semicolon compounds split in 6 Try-its, §23.5 victory timing
  corrected, §29.1 sample transcript fixed, §29.3 STATE syntax fixed, §9
  regions contradiction resolved, Ch 16 honest unwired note + file names,
  §21 scene "replaces" note, §26.4.2 stylesheet name, §5.7 fence
  cross-reference, §5.7 object() forward reference, dist/-contents wording,
  Ch 20 announcesMovement + onEngineReady merge guidance, frontmatter
  Conventions now cover import accumulation and placement anchors.
- Tutorial: `announcesMovement: true` on the zookeeper in all snapshots;
  v16 transcript now pins the "You have won" message on the turn the 75th
  point lands (previously it only checked `score` output, which is how the
  victory-timing confusion survived). Full suite: 197/197 pass.
- Execution log correction: Ch 23 was originally logged BLOCKED ("victory
  never fires"). Wrong — the daemon fires on the turn the final points land;
  the acceptance transcript asserted it on a later turn, misled by §23.5's
  Try-it annotation. Both the log and the book are corrected.
