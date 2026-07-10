# Book v2.0.0 Change List — ADR-209 Addendum (platform @ 2026-07-08)

**Parent document**: `change-list-v2.0.0-20260702.md` (full staleness review vs platform
@ 2026-07-02). This addendum covers only what landed **after** that review:

- **ADR-209 room-description snippets** — commit `354547a7` (2026-07-07): `{snippet:name}`
  markers, `RoomTrait.snippets` + `room().snippets()` sugar, splice pass in
  looking/going/switching_on, engine load-time validation (AC-5), devkit unused-entry
  lint (AC-6), dungeo adoption across 9 P1 rooms.
- **switching_on scenery exclusion** — commit `b56a1827` (2026-07-08): switching_on's
  auto-look contents list now excludes scenery, matching looking/going.
- **Book-QA platform fixes** — commit `8c5ddc30` (2026-07-04, P1 "scenery listing" et
  al.): these aligned the *platform to the book*, so they generate no book edits; noted
  here only because they postdate the parent review.

**Severity key** (parent's, plus one): **NEW** = feature absent from the book entirely ·
WRONG = factually incorrect · OUTDATED = teaches a superseded thing · POLISH = minor ·
CLEAN-VERIFIED = checked against the new behavior, no edit needed.

---

## Executive summary

| Tier | What | Where |
|---|---|---|
| **New section** | Room-description snippets — the entire ADR-209 author surface is untaught; "snippet" appears in the book only as "code snippet" | ch5 (recommended home) |
| **Required edit** | ch19 Choice-counter keyspace claim is now incomplete: `(entityId, messageKey)` is no longer the only keyspace — snippets add `(roomId, markerName)`; ADR-209's Consequences explicitly require documenting the convention to avoid collisions | part-5/19 ~L254 |
| **Required aside** | ch13 event handlers — handler-driven snippet-map mutation (aftermath text; set entries to `''`, never delete) is the ADR's designated home for state-conditional room prose | part-4/13 |
| **Small edits** | ch30 save-state list (+selector counters), ch31 build output (+unused-entry lint warning), ch29 determinism paragraph (+snippets are seeded) | part-8 |
| **Invariant callout** | "a description containing `{` renders differently depending on whether the room has a snippet map" — ADR-209 Consequences: "the book and the trait docs must state it plainly" | new ch5 section + ch2 one-liner |
| **Companion code** | new familyzoo `v2.0.0/src/` snapshot content for the snippets section + a transcript test | tutorial source |
| **Pre-existing gap, now load-bearing** | the book never teaches `initialDescription` (or `descriptionMessageId`, ADR-107); snippets splice into *both* description texts, so the new section either teaches `initialDescription` first or scopes it out explicitly | ch4 or new ch5 section |

**Verified no-impact**: no chapter transcript quotes a "You can see …" contents list
after `switch on` (checked ch2, ch4, ch5, ch8, ch12), so the switching_on scenery
exclusion breaks no quoted output. Appendix B verb table (looking / switching_on rows)
unchanged. Appendix C `scenery` row already says "not listed in room contents." Appendix
D: snippets add no message IDs (`if.room.description_body` keeps its shape; the
render-time `[snippet]` log line is a log, not a message).

---

## The new section: where and what

**Recommended home: ch5 (scenery-and-portable-objects), new section after the scenery
material.** The motivating case *is* scenery: prose that mentions things in passing
instead of enumerating them, and `examine cabinet` rewarding the player who noticed the
aside (identity decoupling — the entity keeps its full name/aliases/description in its
own traits; the room shows only the quiet spliced text). ch4 gets a one-line forward
reference from its room-description material. Anchoring it in ch19 instead was
considered and rejected: ch19 is the *renderer's* contract (phrase values in code);
snippets are an *author-prose* surface and belong with rooms and scenery.

Content the section must cover (source: ADR-209, `docs/architecture/adrs/adr-209-room-description-snippets.md`):

1. **The author surface** — the study example from the ADR (markers in `description()`
   prose + `study.snippets({...})`), rendered output shown. Companion code goes in the
   familyzoo ch05 snapshot; dungeo's 9 P1 rooms (`white-house`, `dam`, `well-room`, …)
   and `stories/concealment-test`'s snippets area + 17-assertion transcript are working
   references to crib from.
2. **String vs list entries**; list default selector is **`cycling`** (no adjacent
   repeats), long form `{ selector: 'random' | 'stopping' | 'sticky' | 'firstTime',
   texts: [...] }` for the rest. All selection is seeded and deterministic — never
   `Math.random`; counters persist through save/restore.
3. **`mentions` does double duty** — coverage metadata for the lint *and* a presence
   gate: a snippet with `mentions: trunk` stops rendering when the trunk leaves the room
   (destroyed, taken, moved) and resumes if it returns. Presence is transitive
   containment within the room.
4. **Failure posture** — unbound marker in a snippet-bearing room = synchronous story-load
   error naming room and marker; unused snippet entry = `sharpee build` warning; at
   render time an unbound marker (possible after handler mutation) splices nothing and
   logs. The convention: handlers set entries to `''` rather than deleting them, so the
   load-time error stays meaningful.
5. **The opt-in invariant, stated plainly** — a room *without* a snippet map never scans
   its description: literal braces render verbatim, zero migration. A room *with* one
   treats every `{snippet:x}` as a marker. (This is the Consequences bullet the ADR
   directs at the book.)
6. **Both description texts** — markers work in `description` *and* `initialDescription`,
   sharing one snippet map and one counter per entry. **Dependency**: the book currently
   teaches neither `initialDescription` nor `descriptionMessageId` (grep-verified: zero
   occurrences in parts/ or backmatter/). Either add first-visit descriptions to ch4
   before this section lands, or explicitly scope the section to `description` with a
   pointer. Flagging rather than deciding here — it widens scope beyond ADR-209.
7. **What snippets are not** — no platform-generated prose ever, no predicate functions
   in snippet data, not a general conditional-text system. One paragraph, matching the
   ADR's Non-goals; it preempts the "why can't I put a function here" question.
8. **`{ messageId }` entries** for multilingual stories, one sentence + pointer to ch18.

---

## Findings by chapter

### Part 1

**02-your-first-room.md**
- (POLISH) Where `description()` is introduced: one forward-pointing sentence — braces
  in description prose are inert *unless* the room opts into snippets (ch5). Cheap
  insurance for the invariant; skip if it reads as clutter this early.

### Part 2

**04-rooms-and-navigation.md**
- (POLISH) One-line forward reference from the room-prose material to the new ch5
  snippets section.
- (Optional, scope decision) If the `initialDescription` gap (item 6 above) is resolved
  by teaching it, this is its natural home.

**05-scenery-and-portable-objects.md**
- (NEW) The room-description snippets section — full outline above. This chapter already
  carries two parent-list findings (ADR-158 article quotes); batch the edits.

**08-light-and-dark.md**
- (CLEAN-VERIFIED) The dark-room reveal flow is where switching_on's auto-look fires,
  but no transcript in the chapter quotes a post-switch-on contents list; the scenery
  exclusion changes nothing quoted. If the v2 edition adds such a transcript, scenery
  must not appear in it.

### Part 3

**12-readable-objects-and-switchable-devices.md**
- (CLEAN-VERIFIED) The radio is scenery and switchable; no quoted output shows a
  contents list after `switch on radio`. Same caution as ch8 for new transcripts.

### Part 4

**13-event-handlers.md**
- (NEW aside) Handler-driven snippet-map mutation: the explosion handler that sets
  `snippets.trunk = ', scorch marks blackening the corner'` for aftermath text, and the
  `''`-not-delete rule. This is the ADR's answer to *all* non-presence conditional room
  prose, so ch13 is where authors should find it; a short aside with a back-pointer to
  ch5 suffices. Dungeo's rug-push and melee interceptor mutations are shipped examples.

### Part 5

**19-the-phrase-algebra.md**
- (WRONG-by-omission, ~L254) "Each Choice keys its progress to `(entityId, messageKey)`"
  — snippets are a second consumer of the Choice counter keyspace, keyed
  `(roomId, markerName)`. ADR-209 Consequences require documenting the convention so
  story-authored Choices on a room entity don't collide with that room's snippet
  counters. One or two sentences here.
- (POLISH, "Branching stays in code" ~L198) Cross-reference: for *room prose* variation
  specifically, authors reach for snippets (ch5) before hand-built `Choice` values.

### Part 8

**29-transcript-testing-and-walkthroughs.md**
- (POLISH, determinism paragraph ~L91) Add snippets to the list of things that stay
  reproducible: selection is seeded and counter-driven, so transcripts with `random`
  snippets replay identically.

**30-saving-and-restoring.md**
- (POLISH, save-state list ~L18) Selector/Choice counters (including snippet counters)
  persist with the game — currently the list stops at "the ID counters". Mid-cycle
  save/restore continuing the cycle (AC-3) is worth the one sentence.

**31-building-and-publishing.md**
- (POLISH) `sharpee build` output now includes the unused-snippet-entry lint warning
  (names room and entry, warns without failing). One row/sentence wherever build
  warnings are enumerated.

### Backmatter

**appendix-a-architecture-map.md**
- (POLISH) "Where does this belong?" — one clause: snippet wire types live in
  `@sharpee/if-domain`; the scan/gate is stdlib's; the Assembler realizes the `Seq`;
  load validation is engine; the unused-entry lint is devkit. Only if the appendix's
  altitude already names packages at that grain — otherwise skip.

**appendix-b-action-catalog.md** — (CLEAN-VERIFIED) no verb changes.

**appendix-c-trait-catalog.md**
- (POLISH) The catalog is "generated from the platform's public `TraitType` map" — no
  new trait type, so the table stands. If regeneration picks up per-trait field notes,
  the `room` row gains `snippets`; no manual edit otherwise.

**appendix-d-message-reference.md** — (CLEAN-VERIFIED) no new message IDs; snippets are
story text by default and `{ messageId }` entries resolve through the existing provider
contract. (Appendix D is already a full regeneration in the parent list.)

---

## Companion code

- familyzoo `v2.0.0/src/` ch05 snapshot: add the snippets example the new section
  teaches, plus one transcript pinning a `cycling` snippet across repeated `look`s
  (AC-2 shape). All later cumulative snapshots inherit it.
- Reference implementations already shipped: `stories/concealment-test` snippets story
  area + transcript (17 assertions), dungeo's 9 P1 rooms and the rug-push / melee
  interceptor map mutations.
