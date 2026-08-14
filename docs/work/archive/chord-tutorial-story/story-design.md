# Story Design — "The Folly at Fernhill" (launch tutorial, ADR-233 G3)

**Created**: 2026-07-18 (session 80ff54) — chord-tutorial-story plan Phase 1.
**Status**: **SIGNED OFF (David, 2026-07-18, session 80ff54)** — title, premise, cast, map, puzzle chain approved as written (incl. the B4/red-herring cheap-win amendments folded in pre-sign-off). Phase 2 may build.
**Slug**: `fernhill` (fixes `<slug>` in every later phase; story lives at `stories/fernhill/fernhill.story`).
**Selection basis**: the catalog SELECTION (☆ spine + G4/G5, browser-first; B4 added by David 2026-07-18 as a cheap win from the 124-pattern design-catalog comparison) — all 33 patterns are mapped below; each beat carries its catalog tag. (Catalog tags only — the external design-pattern ids are headed to ifwiki and will be renumbered, so nothing here references them.)

## Title and premise

**The Folly at Fernhill.** Your great-aunt Verity's estate goes to auction at dawn. Family legend says the deed that would keep Fernhill in the family survived the night the garden folly burned, twenty years ago — hidden somewhere on the grounds by Verity herself, who never spoke of the fire again. You have one winter night, an estate full of locked doors and unhelpful staff, and a folly nobody has entered since. Tone: cozy-gothic estate mystery — Crimson-Hexagon-adjacent, wry rather than grim; death is possible (the folly) but fair and signposted.

The shape is the catalog's estate-mystery spine, unchanged: grounds + house regions, one guard NPC and one patrol NPC, a boiler/greenhouse machine chain, a night timeline with a fuse finale, scored discoveries, two endings.

## Map (13 rooms, 2 regions + folly interior)

**The Grounds** — `a region` containing the six outdoor rooms (A7). Wind/weather daemon fires only here (A8 region daemon); `after entering it` on the region narrates re-entering the cold (A7 crossing reaction).

| Room | Catalog roles |
|---|---|
| Iron Gates | A1; **A9** `first time` arrival prose (the auction notice nailed to the gate) |
| Gravel Drive | A1 connective tissue; scenery discipline showcase (B9) |
| Fountain Court | A1; **G1** the fountain's murmur (`randomly` variants); the doormat at the house door hides the cellar key (**B3** `hiding-spot with position under` + `concealed`) |
| Greenhouse | **E1** the vine; **A5** exit: `east is blocked while the boiler is off: frost-sealed` — the frost-sealed glasshouse door onto Folly Hill thaws when the boiler runs |
| Boiler Shed | **B7** the boiler (`switchable`); **D5** the 3-stage startup machine; the nailed crate (**B2** `openable with the crowbar`) |
| Folly Hill | approach to the folly; the folly door (fire-warped, opens only after Tobias's topic hint — G2-class gating via state, see puzzle chain) |

**The House** — `a region` containing the six indoor rooms (A7). The hall clock's chime is a **story-header daemon** heard everywhere (A8 broadcast) once the clock is wound.

| Room | Catalog roles |
|---|---|
| Entrance Hall | A1 hub; the mantel (**B1** supporter) with Verity's photograph; **G2** `detail while` the diary has been read — the photo's background shows the folly INTACT, with the deed box on Verity's knee; the hall clock (**E3** custom verb `wind`) |
| Study | behind Mrs. Kettle (**C2 guard**); the trunk (**B1** container, `openable`, capacity); the torn diary page (**B5** `readable with text …`) inside |
| Pantry | **A3** the pantry door is a two-sided lockable door — hide inside and lock it behind you when the house "locks up" beat sends Mrs. Kettle on her rounds; the kipper tin (feeds the cat) |
| Kitchen | A1; the sherry bottle (C3's bribe); the shears (**B2** tool — they cut the fuse) |
| Cellar Stairs | A1 connective |
| Cellar | **A4** dark room; reached through **A2** the flagship one-liner: `down to the Cellar through the cellar door` + `a door, lockable with the tarnished key` (kind-scoped locked default); the oil lamp lives on the stairs shelf; **D3** the drip (`on every turn while` player present) + the `, once` startle when first lit |

**The Folly** (interior, outside both regions — a place time forgot): the deed box, the old fireworks cache, the **D2** fuse finale.

## Cast (3 NPCs)

| NPC | Catalog roles | Notes |
|---|---|---|
| **Mrs. Kettle**, the housekeeper | **C2 guard** (blocks the Study door), **C3** give/show gate | Softens if GIVEN the sherry or SHOWN the diary page (`on giving it`/`on showing it` → `change it to softened`, stands aside). States: `guarded, softened` |
| **Tobias**, the groundskeeper | **C1 patrol** (`patrol with route [the Gravel Drive, the Fountain Court, the Boiler Shed]`), **C4 topics** | `define topics for tobias`: entity tier `about the locket` (the greenhouse find — he tells you what it opens); free-text `about "the folly", "the fire"` (body-form row: his answer + `change it to shaken` + it marks the folly door approachable); catch-all `on asking it` shrug. Same table serves TELL (D1 symmetry taught in the tutorial text) |
| **Smoke**, the cat | **C2 follower**, **E2** authored trait | `define trait feedable` with a data field (`with food the kipper`); feed her the kipper → she follows; her nose at the greenhouse flowerbed is the trowel-free hint that something is buried there |

(B9 blanket rule: every NPC and prose noun is examinable scenery at minimum.)

## Objects & mechanisms

| Object | Patterns |
|---|---|
| tarnished key (under the doormat) | B3 find → A2 unlocks the cellar door |
| oil lamp | A4 light source; `switchable`-adjacent taught via light rules, not B7 |
| torn diary page | B5 readable; gates G2 mantel detail; SHOW it to Mrs. Kettle (C3 alternate) |
| sherry bottle | C3 bribe (GIVE path) |
| crowbar (cellar) | B2: the nailed crate in the Boiler Shed is `openable with the crowbar` |
| nailed crate | B2 target; holds the kipper tin's opener + the boiler's brass valve handle (D5 prerequisite) |
| kipper tin | E2 food config target (`feedable with food the kipper`) |
| garden shears | B2: the folly fuse is `cuttable with the shears` — the defusal |
| brass locket (vine fruit) | E1 payoff; C4 entity-tier topic; opens the deed box (keyless `with` spelling again) |
| the boiler | B7 `switchable` + D5 machine (below) |
| furnace poker | **E4** refusal: `on taking it` refuses while the boiler is running (white-hot — troll-axe class) |
| the vine | E1 states `seedling, flowering, fruiting` (forward-march); advances on warmth (boiler running) + watering; **E3** custom verb `prune` (with the shears) tidies it for the fruiting step |
| hall clock | E3 custom verb `wind` — winding it (with the winding key) starts the D1 timeline's chime anchor (and the G5 clock channel) |
| Verity's overcoat (hall hook) | **B4** wearable; its pocket holds the small winding key — wear or search it to find the key that starts the clock (E3/D1 tie) |
| solicitor's letter | B4's starting-inventory half (the player `carries` it from the first turn — the auction summons, also a B5 readable) |
| half-burned letter (trunk) | the **red herring** (craft beat, no pattern row): it suggests the deed went to the bank in town — Tobias's topic answer quietly kills the theory ("bank never had it"); fair misdirection, resolved in-world |
| deed box (folly) | opened `with the brass locket`; opening it lights the **D2** fuse |

## Time, logic & state design

- **D1 fixed timeline** (`define sequence the long night`): wound-clock anchor → chimes mark the hours; `at turn N` dusk deepens; a mid-night step sends Mrs. Kettle on her lock-up rounds (the A3 pantry-hide beat's pressure); near-dawn warning step.
- **D2 fuse**: opening the deed box disturbs the fireworks cache — a sequence chain (`3 turns later …`) ends in `kill the player` unless the fuse is CUT (`cuttable with the shears`, B2) first. Fair: the hiss is narrated every turn (D3-class recurring while present).
- **D3 presence-gated recurring**: the cellar drip (`on every turn while` in the cellar), with a `, once` startle on first lamplight.
- **D5 state machine** (`use state-machines`): `define machine the boiler works` — `cold → filled → primed → running`; transitions on `filling` (watering can), `turning the brass valve` (from the crate), `lighting the furnace`; wrong order clanks back with a phrase. **D5–E1–A5 are one COUPLED chain, deliberately**: running boiler ⇒ thaws the A5 frost-sealed door AND warms the greenhouse so the vine (E1) can flower; watering + pruning (E3) take it to fruiting; the fruit splits to yield the locket. This chain is the tutorial's centerpiece "complex logic" arc.
- **E-group residue**: E1 vine states above; E2 feedable cat; E3 `prune` + `wind`; E4 poker refusal.

## Scoring & endings

- **F1 owner-attached scores** (max 50): key found 5 (doormat), cellar opened 5 (door), boiler running 10 (machine), vine fruited 5 (vine), Kettle softened 5 (her), folly truth learned 5 (Tobias's topic row, `award … once`), fuse cut 5 (fuse), deed recovered 10 (deed box).
- **F2 endings**: **WIN** — holding the deed with the fuse cut, walk out through the Iron Gates: `win` ("Fernhill stays in the family"). **LOSE** (two flavors): the fuse detonates (D2's `kill the player` — death, restart/undo taught here alongside the F-group's save nudge in prose); or the dawn chime arrives deedless (D1 terminal step → `lose` — the auction proceeds).

## Text & presentation plan

- **G1 strategies**: fountain `randomly`; wind lines `cycling`; the drip `stopping` (it fades once remarked); Tobias's patrol grumbles `sticky`; arrival beats `first-time`.
- **G2 gated text**: the mantel photograph's `detail while` the diary has been read (the folly intact + deed box visible); the study desk snippet gates on Kettle softened.
- **G4 media (browser-first, every asset `client has`-gated, named text degradation)**:
  - `play ambient night-wind` in the Grounds (gate `client has sound`; text degrades to the G1 wind lines);
  - `play sound boiler-thump` when the boiler lights (gate `client has sound`; text: the thump line);
  - `show image folly-photograph` on examining the mantel photo (gate `client has images`; text: the G2 detail prose IS the degradation);
  - gentle `play music dawn-theme` on the win ending (gate `client has music`).
- **G5 payloaded emits + custom channel**: the hall clock emits `emit estate.clock with hour <n>` each chime; `define channel clock` (`mode replace`, `from event estate.clock`, `take hour`) renders the hour in the browser sidebar — text-only clients just hear the chime prose. (Teaches the emit→channel pair end to end.)

## Story location decision (recorded, not assumed)

The canonical story lives **in-repo at `stories/fernhill/`** (fernhill.story + tests/transcripts + walkthroughs), built and gated like cloak/zoo: `./repokit build` + `node dist/cli/sharpee.js --test --story stories/fernhill/fernhill.story …`. The Phase 9 teaching documents walk an outside author through building the SAME story with the devkit pipeline (`sharpee init` → paste/grow the story → `sharpee build --browser`) — the in-repo copy is CI truth, the tutorial text is the outside-author path. This split is deliberate and recorded here so Phase 9 doesn't rediscover it.

## Pattern coverage checklist (all 33)

A1 ✓ compass · A2 ✓ cellar door · A3 ✓ pantry door · A4 ✓ cellar+lamp · A5 ✓ frost-sealed door · A7 ✓ two regions · A8 ✓ wind (region) + chimes (story) · A9 ✓ gates · B1 ✓ trunk+mantel · B2 ✓ crowbar/shears/locket (all R3 keyless spelling) · B3 ✓ doormat · **B4 ✓ overcoat + carried letter** · B5 ✓ diary (+ letters) · B7 ✓ boiler · B9 ✓ blanket rule · C1 ✓ Tobias · C2 ✓ Kettle (guard) + Smoke (follower) · C3 ✓ sherry/diary · C4 ✓ Tobias topics (entity + free-text + alias + catch-all) · D1 ✓ the long night · D2 ✓ the fuse · D3 ✓ the drip · D5 ✓ the boiler machine · E1 ✓ the vine · E2 ✓ feedable Smoke · E3 ✓ prune + wind · E4 ✓ the poker · F1 ✓ 8 owner-attached scores · F2 ✓ two endings · G1 ✓ five strategies · G2 ✓ mantel + desk · G4 ✓ four gated assets · G5 ✓ clock channel · (craft, unnumbered: the bank-letter red herring)
