# Census: sharpee.net against main at the Chord 4.0.0 / Sharpee 5.5.0 cut

Measured 2026-10-26, session 63b2a2, on main 44e20ddd2 plus the uncommitted version cut. Script: the session scratchpad's `census.py` (regex sweep over every `.mdx`/`.tsx` under `website/src/app/{chord,learn,sharpee}`, 332 files, 165 routes; fenced code blocks parsed for the create-block check; internal links resolved against the route set and `website/public/`). Every coarse hit was read by hand before it was counted; the two compiler probes below settle the syntax rules the regexes could not.

## (h) Counts

| Category | Count |
|---|---|
| Grammar-log rows since 2026-10-13 (excluding the 2026-10-26 bump row) | 35 |
| … present (the construct is documented on a guide, cookbook, stdlib or reference page) | 30 |
| … stale (the page states the old form, or a number that moved) | 2 |
| … missing (no page states it) | 3 |
| ADRs 366–387 | 22 |
| … with a website obligation | 10 |
| … none | 12 |
| Create blocks on the site | 365 |
| … not led by a kind (ADR-359) | 0 |
| Hatch forms `define text|action|chain … from` (ADR-361) | 0 |
| Stale 4.0 syntax blocks (any rule) | 0 |
| Parser statements contradicting ADR-382–387 | 1 page section |
| Internal links checked / broken | 252 / 0 |
| Generated copies stale (`grammar-blocks.ts`, `public/chord.ebnf`) | 0 |
| Version data stale | 2 files (`versions.json` 5.4.1/3.6.0; `releases-data.json` 5.4.1 is the latest *published*, which is true) |

**Compiler probes.** (1) `create the shipping crate` / `aka crate` / `a container, openable` compiles clean: `aka` before the kind line is admitted, so the first sweep's 91 "not kind-led" blocks were the heuristic's error, not the site's. (2) `create the Potting Shed, a room` with an `exits: north to the Mine` line and `exits, one-way: …` compiles clean: the inline-kind form and the `exits:` line are shipped 4.0 syntax, so the remaining 6 flagged blocks are fine. The site has **no pre-4.0 create block**.

## (a) The 35 grammar-log rows

| # | Row (ADR) | State | Where / what |
|---|---|---|---|
| 1 | gerund list heads (368) | present | guide/behavior/on-and-after |
| 2 | `transparent` (369) | present | guide/world/kinds-traits-and-settings, stdlib traits |
| 3 | `holds <n>` (369) | present | kinds-traits-and-settings (the old `with max items` is named there as removed), learn/fernhill/things |
| 4 | `in`/`out` exits (369) | present | guide/world/exits-and-blocked-exits |
| 5 | stock verbs without an object side (370) | present | stdlib/reference (29 mentions), on-and-after, the-statements |
| 6 | lowering/raising take the clause body (371) | present | stdlib/manipulation/lowering-and-raising |
| 7 | `flammable` (371) | present | kinds-traits-and-settings, stdlib/reference |
| 8 | `settable` / `setting … to` (371) | present | kinds-traits-and-settings, stdlib/senses/traits |
| 9 | counterpart tail (372 D1) | present | on-and-after ("name it at the end of the head", `throwing at the sorting machine`) |
| 10 | `asking_for` (372 D3) | present | on-and-after, stdlib/reference |
| 11 | `consult` / `define topics` on a readable (372 D4) | present | guide/behavior/topic-tables, stdlib |
| 12 | `costs` / buying (372 D5) | present | kinds-traits-and-settings, stdlib/reference |
| 13 | `attached to` / `detachable` (373 D1) | present, **ADR-381 pending** | kinds-traits-and-settings §A thing can be fixed to another; stdlib/manipulation/traits. ADR-381 (ACCEPTED 2026-10-22) removes these words, the tying actions and `AttachedTrait` — but the code still ships them (`packages/chord/src/catalog.ts:62`, `packages/stdlib/src/actions/standard/tying`, `packages/world-model/src/traits/attached`). The site matches the code. **Finding for David, not website work:** ADR-381's cutover never landed; the record and the code disagree. The site changes when the code does. |
| 14 | `breakable`, `fragile`, `starts broken` (373) | present | kinds-traits-and-settings, on-and-after, throwing, starting-state |
| 15 | `after the player breaking` (373 D3) | present | on-and-after, kinds-traits-and-settings |
| 16 | tying is a stock action (373 D6) | present, ADR-381 pending | stdlib/reference §tie, §untie (as row 13) |
| 17 | backdrop (374 D1, D2) | present | guide/world/placing-and-wearing ("in the Sorting Room and the Loading Dock"), conditions |
| 18 | `night-vision`, `can see`/`can reach` (374) | present | conditions, kinds-traits-and-settings, people |
| 19 | `listener`, `after hearing`, `define sound` (374 D6) | present | guide/world/sound-music-and-images, stdlib/senses |
| 20 | lamps: `light`/`put out`, `light-source with`, `starts lit`, `powered by` (374 D9, D10) | present | kinds-traits-and-settings (11), stdlib/devices, cookbook/switching-on-and-off |
| 21 | `dark` reserved as a state name (374 D8) | **missing** | no page says a declared state named `dark` is refused |
| 22 | the vehicle kind (366) | present (reference), **no guide page** | guide/vocabulary/use (7), reference/grammar (12), stdlib/movement; nothing under guide/world explains a vehicle |
| 23 | state machines are core (377) | present | stdlib/plugins/npc-and-state-machine-plugins says `use state-machines` is a compile error |
| 24 | two tails on one owner are two clauses (372/371 correction) | present | on-and-after line 205 ("the tail splits at the inner one") |
| 25 | `use expanses` (376) | present (reference), **no guide page** | guide/vocabulary/use (8), stdlib/reference (16) |
| 26 | `start <vehicle> heading <direction>` (376 D3) | present | use, reference/grammar, stdlib/reference |
| 27 | `use sailing` (375) | present (reference), **no guide page** | guide/vocabulary/use (8), define-action (2), stdlib/reference (10) |
| 28 | passages, hidden exits, `admits`, gated head (378) | present | guide/world/exits-and-blocked-exits (25), doors |
| 29 | the `pushing` block (378 D6b) | present | exits-and-blocked-exits |
| 30 | the passage block, `[the]` in patterns, `pace:` (380) | present | exits-and-blocked-exits, use, reference/grammar |
| 31 | `play sound` never gated (374/216) | present | sound-music-and-images |
| 32 | `→` cardinality refused (382) | present | define-action line 35 says it is refused; every other `→` on the site is prose |
| 33 | optional slot constrained and seated, removal by shape, `[the]` (382) | present | define-action, extend-action, remove-from-action |
| 34 | one seat per action; extension names a known slot (383 D3, D4) | **missing** | the word "seat" appears only on stdlib/containers/opening-and-closing; define-action never says how the direct and indirect object are chosen |
| 35 | `about` rows on a define action (383 D9) | present | guide/behavior/topic-tables (3), define-action |

Stale: rows 13/16 are **not** stale on the site today (see the ADR-381 finding); the two stale items are (i) the stdlib reference header "67 standard actions" against 77 `define action` blocks in the standard grammar and 78 entries on the page (`deadly_room_death` is platform-only), and (ii) define-action §Which pattern wins (next section).

## (b) ADR-366 … 387, website obligation

| ADR | Obligation |
|---|---|
| 366 vehicle | **yes** — a guide page (vehicles: the kind, `movement:` line/streets/flight/compass/open/none, `admits`, `to outside`, boarding, the driving statements); today only the `use` page and the grammar reference carry it |
| 367 lock | none — guide/tooling/claims §Locking a reached state covers `sharpee claim` and the necessary set |
| 368 gerund heads | none (present) |
| 369 container settings, in/out | none (present) |
| 370 stock verbs | none (present) |
| 371 object-side adjectives | none (present) |
| 372 two-noun clauses | none (present) |
| 373 physical state | none (present); see 381 |
| 374 scope and senses | **small** — one sentence that `dark` is a reserved state name (row 21) |
| 375 sailing | **yes** — a guide page (`use sailing`: bearings, the naval set, wind, sails, the sailing block) |
| 376 expanses | **yes** — a guide page (`use expanses`: the expanse kind, open movement, landmarks, drift, edges, `start … heading`) |
| 377 state machines core | **small** — a guide page under flow for `define machine` (today only the stdlib plugins page), or a pointer from guide/flow |
| 378 passages and pushing | none (present in exits-and-blocked-exits) |
| 379 systems | none (platform-internal) |
| 380 passage block | none (present) |
| 381 connectors replace attachment | **none until implemented** — finding for David above |
| 382 structured grammar parts | none (present: `→` refused, optional slots, `[the]`) |
| 383 seats | **yes** — define-action: how slots take their seat (first entity slot direct, second indirect, `is an instrument`/`is a topic` take none; a slot name keeps one seat across an action's lines; failure questions ask by the seat) |
| 384 ranking without confidence | **yes** — define-action §Which pattern wins is wrong on two points: it says a story's grammar *always* outranks the standard library's (ADR-384: literal specificity ranks before tier, so a more specific standard line beats a broader story line; `remove from action` is the way to take its words), and it omits ADR-386's noun rank (a reading whose items name fewer nothings wins before specificity) |
| 385 one noun matcher | **small** — the same section: a slot's `must be …` requirement is checked by the one matcher at parse time, a name found but out of the slot's base is refused by name ("You aren't holding the brass lantern.") |
| 386 slot-extent search | **small** — the same section: `and` and a comma are list readings; `take salt and pepper shaker` is one item when only the shaker is present |
| 387 word tables, per-parser state | none (internal; no author-visible claim on the site) |

## (c) Parser pages

`website/src/app/sharpee/platform/content.mdx` names parser-en-us in one table row ("grammar patterns, command parsing") and says nothing the review changed. `website/src/app/sharpee/actions-and-traits/content.mdx` mentions a `parser.md` reference only. The one parser statement that contradicts the record is define-action §Which pattern wins (ADR-384, 386 above); the seat rule (ADR-383) is absent rather than wrong. The `confidence` hits the sweep found are the characters' confidence trait, not the parser.

## (d) Syntax sweep

365 create blocks, 0 not led by a kind (after the two compiler probes); 0 hatch forms; `use state-machines` appears once, correctly, as the compile error it is; `with max items` appears once, correctly, as the removed spelling. The learn/fernhill tutorial's 11 create blocks are all 4.0 form; it carries `holds <n>` and `define machine`. **No tutorial-edition question arises** (plan-review's advisory): nothing in learn/ is stale.

## (e) Version and release data

`website/src/lib/versions.json`: `sharpee 5.4.1`, `chord 3.6.0`, `chordWriter 1.4.0` — derived by `sync-versions.mjs` from `packages/sharpee/package.json` and `CHORD_LANGUAGE_VERSION`; reads 5.5.0 / 4.0.0 on the next sync. `releases-data.json`: latest 5.4.1 — correct until 5.5.0 is published (`docs/releases/README.md`: Status PUBLISHED is the only value; Published is the registry date). No `docs/releases/release-5.5.0.md`; Phase 2 drafts it outside `docs/releases/`.

## (f) Generated copies

`./repokit grammar --check`: committed docs blocks (`website/src/app/chord/stdlib/reference/grammar-blocks.ts`) match the Chord source. `website/public/chord.ebnf` is byte-identical to `packages/chord/chord.ebnf`. Nothing to regenerate.

## (g) Links

252 internal `href`/markdown links resolved against the 165 routes and `website/public/`: 0 broken.

## (i) Corrections to the plan

Phase 3 shrinks to Small: the site has no stale 4.0 syntax; its two stale statements are the reference header count and the ranking section (the latter moves to Phase 5). Phase 4 names its pages: vehicles, sailing, expanses, a `define machine` guide, the `dark` sentence, the reference count. Phase 5 names the one section and the three ADR points it must state. The ADR-381 finding goes to David.
