# Book v2.0.0 Change List — full staleness review vs platform @ 2026-07-02

**Scope**: all 36 content chapters + 5 appendices of `docs/book/v2.0.0/` ("The Sharpee
Author and Developer Manual, v2.0 — Phrase Algebra edition").
**Method**: 4 parallel reviewers (frontmatter+ch1–9 / ch10–16 / ch17–23 / ch24–31+appendices),
every code snippet and API claim verified against current package source, genai-api docs,
and the migrated `tutorials/familyzoo/v2.0.0/src/` chapter snapshots before being reported.
**Context**: the v2.0.0 tree is a byte-copy of the 1.x book (single commit `e6540ec0`,
"will receive Phrase Algebra content") — it has had **no** v2 content work yet. This list
is the work plan for that edition.

**Severity key**: BROKEN = snippet/link fails outright · WRONG = factually incorrect ·
OUTDATED = works/reads but teaches a superseded thing · POLISH = minor.

> **Addendum (2026-07-08)**: platform changes after this review — ADR-209
> room-description snippets and the switching_on scenery exclusion — are covered in
> `change-list-v2.0.0-addendum-adr209-20260708.md`.

---

## Executive summary

| Tier | What | Where |
|---|---|---|
| **Rewrite** | ch19 "The Formatter Chain" — every template form it teaches now throws `PhraseParseError`; the titular system was deleted by phrase algebra (ADR-192…206) | part-5/19 |
| **Regenerate** | Appendix D message reference — pre-phrase-algebra templates throughout, renamed help keys, missing `about.success` / `platform.*` / `nothing_to_take` groups | backmatter |
| **Focused edit** | ch15 Capability Dispatch — ADR-207 world-method registration (3 non-compiling snippets) | part-4/15 |
| **Chapter fixes** | ch18, ch20, ch23, ch25, ch27, ch29, ch9, ch5, ch6, ch3, frontmatter | listed below |
| **Book-wide sweeps** | (a) `tutorials/familyzoo/src/` paths → `v2.0.0/src/`; (b) "v17/v18" naming → chapter-snapshot names; (c) pre-ADR-158 article-less transcript quotes; (d) multi-user removal (theme 6); (e) terminal → testing/accessibility repositioning (theme 7) | multiple |
| **Companion code fix** | inverted daemon-priority comment in `tutorials/familyzoo/v2.0.0/src/ch23-scoring.ts:453` | tutorial source |

**Clean chapters** (verified, no findings): introduction, ch2, ch4, ch7, ch8,
ch10, ch11, ch12, ch13, ch16, ch17, ch21, ch22, ch26, ch30, ch31, Appendices A*, B, C, E.
(*A has one polish clause.)

---

## Cross-cutting themes (fix once, apply everywhere)

1. **ADR-207/208 — per-world registration (2026-07-02).** All capability-behavior and
   action-interceptor registration is `world.registerCapabilityBehavior(...)` /
   `world.registerActionInterceptor(...)` in `initializeWorld` — idempotent last-wins,
   **no guards**. The free functions (`registerCapabilityBehavior`, `hasCapabilityBehavior`,
   `getBehaviorForCapability`, `registerActionInterceptor`, `hasActionInterceptor`,
   `getInterceptorForAction`, `getAll*Bindings`, `unregister*`, `clear*Registry`) are
   deleted from `@sharpee/world-model`. Lookups: `context.world.getBehaviorForCapability(...)`
   / `context.world.getInterceptorForAction(...)`. Canonical prose lives in the rewritten
   teaching comments of `tutorials/familyzoo/v2.0.0/src/ch15-capability-dispatch.ts`.
   → Hits ch15 hard; one clause in Appendix A.
2. **Phrase algebra (ADR-192…206, landed 2026-06-27 — after the book was written).**
   Colon-chain formatters (`{the:item}`, `{the:cap:item}`, `{is:item}`, `{list:items}`)
   are gone and now *throw*; v2 forms are space-hint NounPhrase atoms (`{the item}`,
   `{capitalize the item}`), `{verb:is item}`, `{verbatim:text}`, `{pronoun:…}`,
   `{number:…}`, `{contents:…}`, code-side `PhraseList`/`nounPhraseFor(entity)`, nested
   `params` (ADR-206 as amended). Reference: `docs/reference/phrase-algebra-primer.md`.
   → ch19 rewrite, ch18 fixes, Appendix D regeneration.
3. **ADR-158 article rendering.** Standard-action outputs now carry articles
   ("**The** iron fence is fixed in place.", "You put **the** zoo map in **the** backpack.").
   Several chapters still quote the article-less pre-ADR-158 output.
   → ch5 (×2), ch6, ch18 (claimed "the toucan" where default is "a toucan").
4. **Tutorial split (commit 22efc457).** Companion code is now
   `tutorials/familyzoo/v2.0.0/src/chNN-*.ts` (chapter-named cumulative snapshots);
   `v01–v18` are retired history; GitHub links without `v2.0.0/` will 404.
   → frontmatter how-to-read, ch24, ch27, ch28.
5. **2026-07-02 message-layer decisions (P1–P9).** Fully-qualified capability-effect
   messageIds required; help keys renamed (`general`/`first_time`/`topic`); ABOUT renders
   `if.action.about.success` and the engine auto-creates StoryInfo from StoryConfig;
   `platform.*` outcome events render prose ("Saved.", "Previous turn undone." …),
   author-overridable; `taking.nothing_to_take` added.
   → Appendix D regeneration, ch15 aside, optional ch30 sentence.
6. **Multi-user removal (per David, reader pass 2026-07-08; decision confirmed same
   day: remove, do not futureize).** Multi-user is back at the design stage; **remove**
   every mention from the book — the "terminal, browser, or multi-user server" triples
   and the preface's "host for many players at once". No forward-looking language
   either; the book simply doesn't speak of it.
   → preface L6; ch24 L13, L35, L164.
7. **CLI/terminal positioning (per David, reader pass 2026-07-08).** The terminal is
   not a general-audience play surface. Couch every terminal mention as one of two
   things: (a) a **testing** surface (transcripts, dev REPL), or (b) an **accessibility**
   surface — a plain-text stream a blind player's tooling (screen reader / text-to-speech)
   ingests directly. The browser client is *the* player-facing client. Supporting fact:
   the devkit CLI has no `play` command anyway (`packages/devkit/src/cli.ts:47` reserves
   `test, play` for later) — the book's terminal mentions are rhetorical, never a flow
   the reader actually runs.
   → preface L6; ch24 L13, L79–81, L164; ch27 L38; ch31 L46; Appendix A L44.

---

## Findings by chapter

### Frontmatter

**00-preface.md**
- (WRONG, reader pass 2026-07-08) L6: "run in a terminal, ship to the web, or host for
  many players at once" — the multi-user clause promises a capability that's back at the
  design stage (theme 6), and "run in a terminal" positions the CLI as a play surface
  (theme 7). Recast: the web is where players play; the terminal serves testing and
  accessibility (screen-reader/TTS ingestion).

**02-how-to-read.md**
- (WRONG) "How the zoo grows" ~L70: companion path/GitHub URL point at pre-split
  `tutorials/familyzoo/src/` → `tutorials/familyzoo/v2.0.0/src/` (+ URL).
- (WRONG) ~L67: "code is versioned: `v01`… `v02`…" → chapter-named cumulative snapshots
  (`ch02-first-room.ts`, `ch04-navigation.ts`, …), one per book chapter.

### Part 1

**01-installing-sharpee.md**
- (POLISH) "CLI at a glance" ~L176: table omits `sharpee register <location> [--name]`
  and `sharpee list` (ADR-187 registry); drop "full set" or add rows.
- (POLISH) file tree ~L117: `sharpee init` also writes `.gitignore`.
- (WRONG, reader pass 2026-07-08) ~L170: `python3 -m http.server -d dist/web` assumes
  Python 3, which the prerequisites (~L9: Node.js, npm, editor) never mention and the
  book never installs; fails outright on a stock Windows box (`python3` not on PATH).
  Worse, the devkit's own post-build hint prints `npx serve <dir>`
  (`packages/devkit/src/standalone/build-browser.ts:360`), so the book contradicts the
  CLI hint right after telling the reader to trust the book over hints (~L161). Fix:
  use `npx serve dist/web` (rides the Node toolchain already installed, matches the CLI
  hint); same fix in `code-snippets/ch01-installing-sharpee/07-playing-it.sh`. Note
  `serve` prints port 3000, not 8000 — adjust any port mention.

**03-the-play-loop.md**
- (WRONG) "Events become text" ~L76: "nothing subscribes to them" — contradicted by
  `world.registerEventHandler` (ADR-052), used in ch9 of this same book. Soften: events
  are records first, but the world *can* react to them via handlers (ch13).
- (POLISH) snippet ~L66: `messageId: 'if.action.taken.success'` is a wrong-shaped id →
  `if.action.taking.taken` (or short key `'taken'` + prefixing note).

### Part 2

**05-scenery-and-portable-objects.md**
- (WRONG) ~L54 and "Try it" ~L215: quoted output "iron fence is fixed in place." is the
  pre-ADR-158 form → "**The** iron fence is fixed in place." (current template:
  `{capitalize the item} {verb:is item} fixed in place.`).
- (POLISH) "How taking actually decides" ~L137: "The map is fixed in place." → entity
  name is `zoo map` → "The zoo map is fixed in place."

**06-containers-and-supporters.md**
- (WRONG) transcript ~L20: "You put zoo map in backpack." / "…penny on park bench." →
  "You put **the** zoo map in **the** backpack." / "…**the** souvenir penny on **the**
  park bench." (ADR-158).

**09-the-map-and-regions.md**
- (BROKEN) "Crossing the boundary" ~L94: `if (event.data.regionId === …)` — `data` is
  typed `unknown`; doesn't compile under the scaffolded strict tsconfig. →
  `const data = event.data as { regionId?: string } | undefined; if (data?.regionId === 'reg-staff') …`
- (OUTDATED, advisory) "Nesting and querying" ~L121: `world.rooms.inRegion(...)` is a
  prototype monkeypatch activated by a side-effect import — the pattern the platform is
  retreating from (doesn't survive bundling; cf. `createHelpers(world)`). At minimum show
  the required `import '@sharpee/queries';`, or teach the non-monkeypatch route.

### Part 3 — ch10, ch11, ch12 all CLEAN.

### Part 4

**13-event-handlers.md** — CLEAN.

**14-custom-actions.md**
- (POLISH) "Passing data between phases" ~L136: `sharedData` described as "the sanctioned
  way" — it now carries a `@deprecated` note for validate→later phases;
  `ValidationResult.data` is the newer channel. Soften.

**15-capability-dispatch.md** — the ADR-207 hot spot; registration placement (end of
`initializeWorld`) is already right, the content of the blocks is not:
- (BROKEN) import block ~L13–23: imports the deleted `registerCapabilityBehavior`,
  `hasCapabilityBehavior`, `getBehaviorForCapability`. → match the tutorial's list
  (`CapabilityBehavior, CapabilityValidationResult, CapabilitySharedData,
  CapabilityEffect, createEffect, findTraitWithCapability, ITrait, IFEntity` — only
  `findTraitWithCapability` survives as a free helper).
- (BROKEN) "Registration that links trait to behavior" ~L119–133: guarded
  `if (!hasCapabilityBehavior(...)) { registerCapabilityBehavior(...) }` + "Guard it…
  so it only registers once" prose → bare
  `world.registerCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID, pettingBehavior);`
  + per-world/idempotent prose (take it from the tutorial's rewritten teaching comment).
- (BROKEN) dispatch `validate()` ~L157: free `getBehaviorForCapability(trait, …)` →
  `context.world.getBehaviorForCapability(trait, PETTING_ACTION_ID)`.
- (WRONG) "How it fits together" trace ~L280: shows free-function resolution → world-method.
- (WRONG) "Key takeaway" ~L304: "`registerCapabilityBehavior()` links them" →
  "`world.registerCapabilityBehavior()` links them per world, in `initializeWorld`".
- (POLISH) "mistake everyone makes once" ~L113–117: "The registry" reads global →
  "Each world's registry… a later registration overwrites the earlier one."
- (OUTDATED) "Worth knowing" ~L199–202: recommending `createCapabilityDispatchAction()`
  as the usual route — its short-key messageId prefixing is legacy (2026-07-02 P1
  decision); keep as an aside, drop the recommendation, add one sentence making the
  fully-qualified-messageId rule explicit.

**16-custom-traits-and-behaviors.md** — CLEAN.

### Part 5

**17-extending-the-grammar.md** — CLEAN.

**18-the-language-layer.md**
- (WRONG) "Parameters" ~L55–58: claimed output "…photo of **the** toucan" — a bare
  `{target}` bound to a string defaults to indefinite → "a toucan". Either fix the quoted
  output or teach `{the target}` in the template (keep the tutorial's `ch20-npcs.ts:672`
  consistent if the template changes).
- (OUTDATED) ~L58–61: forward-ref "that machinery is the **formatter chain**" — dead
  terminology; rename to whatever ch19 becomes ("the phrase template grammar and the
  Assembler").

**19-the-formatter-chain.md** — **FULL REWRITE** (title included). Everything it teaches
throws `PhraseParseError` under v2 (`parse-phrase-template.ts:135`):
- (BROKEN) `{formatter:param}` / `{the:item}`, `{some:item}`, `{a:item}` → space hints:
  `{the item}`, `{a item}`, `{an item}`, `{some item}`.
- (BROKEN) "article formatters … and `your`" — no `your`; `articleType` is
  `indefinite|definite|some|none`.
- (BROKEN) `{the:cap:item}` + "text formatters are `cap`, `upper`, `lower`, `title`" →
  only `capitalize`, spelled in full, on NounPhrase heads and `{pronoun:…}`.
- (BROKEN) `{is:item}` / `{was:item}` / `{has:item}` → Verb atom `{verb:is item}` etc.
  (ADR-199; irregulars in `IRREGULAR_VERBS`, regular verbs work too).
- (BROKEN) `{list:items}` / `{the-list:items}` / `{count:items}` → code-side `PhraseList`
  params, `{contents:box}` (ADR-194), automatic count-grouping, `{number:coins words}`
  (ADR-198).
- (OUTDATED) "pass the entity, not its name" — concept survives; mechanics are
  `nounPhraseFor(entity)` → NounPhrase param (ADR-158).
- (WRONG, minor) "serial comma… a story can turn it off" — `serialComma` is
  language-provider `LocaleSettings`; no story-facing toggle found.
- (GAP) rewrite must add: `{verbatim:text}` (and the stray-"a " hazard of bare `{param}`
  on prose strings), `{pronoun:…}`, `{number:…}`, `{contents:…}`, `{slot:…}`,
  Optional/Choice as code-side producers, ADR-206 nested-`params` contract, loud
  synchronous parse errors. Base it on `docs/reference/phrase-algebra-primer.md`.

### Part 6

**20-non-player-characters.md**
- (OUTDATED) ~L139, L151: `data: { npcName: 'parrot', text: phrase }` — `npcName` is dead
  (ADR-203 `speaker` NounPhrase; `npc.speech`/`npc.emote` templates are `{verbatim:text}`).
  Drop `npcName`; canonical `ch20-npcs.ts:383,387` passes `{ text }` only.

**21-scenes.md** — CLEAN. **22-timed-events-and-daemons.md** — CLEAN.

**23-scoring-and-endgame.md**
- (WRONG) "The victory daemon" ~L199 + callout ~L249–252 + takeaway ~L271: priority
  semantics **inverted** — the scheduler runs daemons *highest priority first*
  (`plugin-scheduler/src/types.ts:51`), so `priority: 100` runs the victory daemon
  *first*, not last; and the concern is moot anyway (all scoring happens during command
  processing, before the scheduler tick). Correct the semantics and reframe the callout.
  **Companion code fix**: the same inverted comment is in
  `tutorials/familyzoo/v2.0.0/src/ch23-scoring.ts:453` ("Run last, after all other
  daemons").

### Part 7

**24-channels.md**
- (POLISH) channels table ~L59: add the `lifecycle` event channel (or say "including").
- (OUTDATED) ~L134: "Family Zoo v18 ships exactly this" → snapshot is
  `ch24-27-presentation/` (naming-drift sweep).
- (WRONG, reader pass 2026-07-08) L13, L35, L164: the "terminal, browser, or multi-user
  server" portability pitch — multi-user is design-stage: **remove** the clause outright
  (theme 6, no futureizing). Same pass recasts the terminal mentions here and at
  L79–81 per theme 7: the text-only client is
  the testing/accessibility surface, and capability gating is *why* a screen-reader
  stream never receives media payloads — that framing strengthens the chapter's own
  argument.

**25-the-web-client.md**
- (WRONG) ~L45: "`sharpee build --browser` generates the entry point and the host page" —
  build **errors** without `src/browser-entry.ts`; `sharpee init-browser` scaffolds the
  entry once, build regenerates only the host page. (ch31 states it correctly.)
- (OUTDATED) ~L69: `registerDefaultBrowserRenderers` covers the *static* media set;
  `ambient:*` renderers are story-registered (cross-ref ch27).
- (POLISH) ~L35: `engineVersion: ''` "filled by build" — actually imported as
  `ENGINE_VERSION` from build-stamped `./version.js`; reword or show the import.

**26-decoration-and-theming.md** — CLEAN, except:
- (POLISH) platform-vocabulary table ~L38: it's an excerpt; the real `PLATFORM_VOCABULARY`
  is much larger (`direction`, `quote`, `color-*`, `size-*`, `br`, `p`, …) — an author
  naming a class `quote` gets platform-prefixed unexpectedly. Mark as excerpt + point at
  the full list.

**27-media-and-audio.md**
- (WRONG) table ~L14 + ~L20: `ambient:*` presented as platform defaults — they are
  **story-registered on both sides** (engine: `registry.add(createAmbientChannel('environment'))`
  in `Story.registerChannels`; browser: `createAmbientChannelRenderer(...)`). The
  room-atmosphere walkthrough never shows either line — a reader gets silence. Add both
  registration lines (the tutorial has them: `ch24-27-presentation/presentation.ts:169`,
  `browser-entry.ts:162–165`).
- (OUTDATED) ~L117, L169: "v18" naming drift.

### Part 8

**28-the-multi-file-story.md**
- (BROKEN) ~L32: GitHub link `tutorials/familyzoo/src/ch28-multi-file` → 404 after the
  split; insert `v2.0.0/`.
- (OUTDATED) ~L18, L106: "version 17" naming drift.

**29-transcript-testing-and-walkthroughs.md**
- (WRONG) key takeaway ~L107: "walkthroughs (`wt-*`, run with `--chain`)" — the author
  tool has **no** `--chain` flag; `sharpee build --test` chains `walkthroughs/wt-*`
  automatically (`--chain` is the in-repo bundle CLI, which the book doesn't teach).
- (POLISH) header example ~L16: mention the `entry:` header (devkit threads it to pin
  which compiled story a transcript runs against — the tutorial's own transcripts use
  `entry: ch23-scoring`); soften the `##` "section header" claim (any `#` line is a
  comment).

**30-saving-and-restoring.md** — CLEAN.
- (POLISH, optional) add one sentence: save/undo outcome prose now renders from
  lang-en-us `platform.*` messages ("Saved.", "Previous turn undone.", …),
  author-overridable via same-id `addMessage`.

**31-building-and-publishing.md**
- (WRONG, reader pass 2026-07-08) "Hosting it" ~L57: same undeclared-Python finding as
  ch1 ~L170 — `python3 -m http.server -d dist/web` → `npx serve dist/web`, and the next
  line's "open the printed http://localhost:8000" becomes port 3000. Same fix in
  `code-snippets/ch31-building-and-publishing/03-hosting-it.sh`. (Otherwise CLEAN:
  repokit correctly absent; devkit flow verified.)

### Appendices

**A — architecture map**
- (POLISH) layers table ~L17–18: add "per-world capability-behavior and
  action-interceptor registries" to the world-model row; stdlib "capability dispatch
  (consulting the world's registries)".

**B — action catalog** — CLEAN (all 67 ids match current `IFActions`).

**C — trait catalog** — CLEAN (all 40 type strings match).

**D — message reference** — **REGENERATE from the current language provider**:
- (OUTDATED, systematic) every default-text column uses pre-phrase-algebra colon
  formatters (`{the:item}`, `{the:cap:item}`) — the ADR-192 migration (2026-06-27)
  rewrote nearly every template (`{the item}`, `{capitalize the item}`, `{verb:is item}`,
  `{verbatim:…}`).
- (WRONG) help keys: `general_help`/`first_time_help`/`help_topic` → current emitted ids
  `if.action.help.general` / `.first_time` / `.topic` (an author overriding the printed
  id gets nothing).
- (WRONG) about group: missing the primary `if.action.about.success` key (P3).
- (OUTDATED) missing `platform.*` group (P4: save/restore/undo outcome texts).
- (OUTDATED) missing `if.action.taking.nothing_to_take` (P7).
- (OUTDATED) header counts ("808 messages in 82 groups") stale once regenerated.

**E — grammar reference** — CLEAN on ~20-rule sample; no parser drift found.

---

## Suggested execution order

1. **ch19 rewrite** + **ch18 fixes** (one author pass over the language pair; primer as source).
2. **Appendix D regeneration** (tooling pass — regenerate, don't hand-edit).
3. **ch15 ADR-207 edit** (lift prose from the tutorial's rewritten teaching comments).
4. **Book-wide sweeps**: split paths/URLs, vNN→chapter naming, ADR-158 article quotes.
5. **Single-chapter fixes**: ch23 priority (+ tutorial comment), ch25, ch27, ch29, ch9,
   ch3, ch20, ch14.
6. **Polish batch**: ch1, ch24, ch26, ch30, Appendix A.

## Related but out of scope for this list
- The 2026-06-22 completeness audit (`docs/book/v2.0.0/testing/2026-06-22-completeness-audit-full-book.md`)
  documents a different defect class (elided imports/frames in excerpts) — still open,
  independent of staleness.
- v1.5.0 book: frozen with the 1.x platform — none of the above applies (per the
  2026-07-02 direction, v1.5 artifacts are not part of v2 work).
