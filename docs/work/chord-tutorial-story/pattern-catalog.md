# Chord Tutorial Story — Complex IF Logic Pattern Catalog

**Created**: 2026-07-18 (session d02586) — ADR-233 Phase 7 step 1 (Q-3 ruling: catalog → David selects → story designed around the selection).
**Purpose**: the candidate pool of complex IF logic patterns the new pattern-first tutorial story could teach. Every pattern below is **loadable from Chord today** (post-doors: the audit stands at 52 ✅ / 2 ⚠️ / 0 ❌) unless its row says otherwise. Selection is David's; the ☆ marks are recommendations only (a spine that covers every major subsystem without padding).

Format per row: what the pattern teaches → the Chord surface it exercises → a sample story beat.

## A. World shape & navigation

| # | Pattern | Chord surface | Sample beat | ☆ |
|---|---|---|---|---|
| A1 | Compass network + room descriptions | `create … a room`, exits, prose paragraphs, `aka` | The house and grounds | ☆ (unavoidable) |
| A2 | Locked-door-and-key | `through` exit tail, `a door, lockable with the <key>`, kind-scoped locked default, `starts unlocked` override | The cellar door (this is the ADR-234 flagship — one line + one block) | ☆ |
| A3 | Door manipulated from both sides | ADR-238 two-sided presence (close/lock behind you) | The slammed pantry door — lock it from inside to hide | ☆ |
| A4 | Dark rooms & light sources | `dark` trait, light-source items, `first time` prose | The unlit cellar, the oil lamp | ☆ |
| A5 | Blocked & conditional exits | `<dir> is blocked [while <cond>]: <phrase>` | The snowdrift that melts after the boiler runs | ☆ |
| A6 | Deadly exits / deadly rooms | `<dir> is deadly:`, `deadly:` room marker (ADR-227) | The well shaft | |
| A7 | Regions + crossing reactions | `a region`, `containing`, `after entering/leaving it`, nesting | The Grounds vs the House; weather only outdoors (region-forest precedent) | ☆ |
| A8 | Region/story daemons | region-gated `on every turn`, story-header `on every turn` (broadcast) | Distant clock chimes everywhere; wind only in the Grounds | ☆ |
| A9 | First-visit vs repeat descriptions | `first time` (RoomTrait.initialDescription) | Arrival at the gates | ☆ (cheap) |

## B. Objects & object logic

| # | Pattern | Chord surface | Sample beat | ☆ |
|---|---|---|---|---|
| B1 | Containers & supporters, capacity | `a container`/`a supporter`, `with max items/max weight/capacity`, openable | The trunk, the mantel | ☆ |
| B2 | Keyless tool gates | `openable with the <tool>`, `cuttable with the <tool>`, `diggable with the <tool>` (R3 spelling) | Crate + crowbar; rope + knife; flowerbed + trowel | ☆ (shows R3) |
| B3 | Concealment & searching | `concealed`, `hiding-spot with position <word>` | The key under the mat that `search` reveals | ☆ |
| B4 | Wearables + starting inventory | `wearable`, player `wears`/`carries` | The overcoat with something in its pocket | |
| B5 | Readable text & clues | `readable with text …` | The torn diary page | ☆ (cheap clue channel) |
| B6 | Push/pull/turn machinery | `pushable`/`pullable`, `define action` shadowing for turn-class verbs | The bookcase that slides; the crank | |
| B7 | Switchable devices | `switchable`, `starts on/off` | The boiler (feeds A5's melt) | ☆ |
| B8 | Edible/drinkable consumables | `edible`, `drinkable` | The suspicious soup | |
| B9 | Scenery discipline | `scenery`, per-entity phrases | Everything mentioned in prose is examinable | ☆ (craft habit) |

## C. NPCs & conversation

| # | Pattern | Chord surface | Sample beat | ☆ |
|---|---|---|---|---|
| C1 | Patrolling NPC | `patrol with route [ … ]` (CORE NPC library) | The groundskeeper's rounds | ☆ |
| C2 | Follower / guard / wanderer | `follower`, `guard`, `wanderer with move-chance N percent` | The cat that follows; the porter who blocks the study | ☆ (guard = classic obstacle) |
| C3 | Give/show gating | on-clauses on the NPC (`on giving it …`), state change on receipt | Bribing the porter with the sherry | ☆ |
| C4 | **Topic conversation (ask/tell)** | **RULED IN-GATE (David, 2026-07-18)**: ADR-239 (DRAFT — Chord topic surface over the shipped ADR-231 D4 platform topic; open questions pending interview). Once shipped, freely selectable like any row | Asking the groundskeeper about the locked folly | ☆ |
| C5 | Systemic combat | `use combat`, `combatant with health N and skill N`, `weapon with damage N` | Optional: the aggressive swan | |
| C6 | NPC reactions to world events | `on`/`after` event clauses with role-bound triggers | The porter comments when you first carry the lamp | |

## D. Time, causality & chance

| # | Pattern | Chord surface | Sample beat | ☆ |
|---|---|---|---|---|
| D1 | Fixed timeline (sequence) | `define sequence` + `at turn N` / `N turns later` / `when <owner> becomes <state>` | Dusk falls; the house locks up at night | ☆ |
| D2 | Fuse (countdown with stakes) | sequence steps + `kill the player when`/lose ending | The lit fuse in the folly — defuse or die | ☆ |
| D3 | Presence-gated recurring events | `on every turn` on entity/trait, `, once`, `while <cond>` | The dripping cellar; one-time startle | ☆ |
| D4 | Seeded chance | `chance`-gated clauses (AC-5 determinism design) | The magpie that sometimes steals | |
| D5 | State-machine depth | `use state-machines`, `define machine`, roles, `on enter/exit` | The three-stage boiler startup (order matters) | ☆ (flagship for machines) |

## E. State, logic & custom mechanics

| # | Pattern | Chord surface | Sample beat | ☆ |
|---|---|---|---|---|
| E1 | Entity states + transitions | `states:` lines, `change … to …`, `select`, forward-march vs `reversible` | The greenhouse vine: seedling → flowering → fruiting | ☆ |
| E2 | Authored traits with data fields | `define trait` + `data` fields + keyed named-field config (`with food the …`) | `feedable` animals (zoo precedent) or `waterable` plants | ☆ |
| E3 | Custom verbs | `define verb`/`define action` + hatch or in-language body | `prune`, `wind` (the clock) | ☆ |
| E4 | Interception & refusal | `on <action> it` clauses (veto/react), entity-scoped refusals | The white-hot poker you can't take (troll-axe class) | ☆ |
| E5 | Iteration | `each` blocks + `the match` binder | Counting the seven silver spoons | |
| E6 | Derived properties | derived-property chains | The greenhouse's humidity readout | |
| E7 | Ownership & possession moves | `wears`/`carries`, `move`, possessive reads in payloads | The butler confiscates and shelves your muddy boots | |

## F. Scoring, endings & meta

| # | Pattern | Chord surface | Sample beat | ☆ |
|---|---|---|---|---|
| F1 | Owner-attached scoring | `score <name> worth N` on entities/traits/actions, `award` | Points where they narratively belong | ☆ |
| F2 | Win/lose endings | `win`/`lose`, ending kinds, deadly integration | Solve the estate's secret vs the fuse | ☆ |
| F3 | Death & recovery loop | deadly + death constructs (ADR-227) | The well as a fair, signposted death | |
| F4 | Save/restore/undo as taught habit | platform surfaces (AC-4-class), transcript conventions | A "save before the folly" nudge | |

## G. Text & presentation

| # | Pattern | Chord surface | Sample beat | ☆ |
|---|---|---|---|---|
| G1 | Phrase strategies | `randomly`/`cycling`/`stopping`/`sticky`/`first-time` variants | The fountain's varying murmur | ☆ (cheap, high polish) |
| G2 | Gated snippets & detail | `{key}` description markers, `detail while <cond>`, mentions gate | The mantel clue that appears only after the diary | ☆ |
| G3 | Dynamic text hatches | `define text … from` TS hatch | The engraved dial that reads live state | |
| G4 | Media & channels | `play sound/music`, `show image`, `define channel`, `client has` | Ambient birdsong outdoors; the folly's photograph | (browser-dependent) |
| G5 | Payloaded emits | `emit … with` nested payloads | Custom client panel (pairs with G4) | |

## Coverage notes for selection

- **The two audit ⚠️s**: C4 (ask/tell topics) was the only pattern whose selection would have created new work — **David ruled it in-gate regardless (2026-07-18): ADR-239 designs the Chord topic surface**, so the tutorial can assume it ships. (The other ⚠️, attacking's systemic-combat depth, is covered by C5 through the shipped `use combat`.)
- **A2/A3 + B2 are this month's ratchets** (R2/R3, ADR-237/238) — cheap to include and they showcase exactly what just landed.
- **D5 + E1–E4 are the "complex logic" heart** the Q-3 ruling asked for — a tutorial that skips them teaches furniture, not logic.
- **G4/G5 only shine in the browser client** — worth including only if the tutorial's canonical playthrough is browser-first.
- The ☆ spine (23 patterns) fits one estate-mystery-shaped story: grounds + house, one guard NPC, one patrol NPC, a boiler/greenhouse machine chain, a timeline with a fuse, scored discoveries, two endings.

**Next step (Q-3 ruling step 2)**: David selects the must-include set; step 3 designs the story around the selection and writes `docs/work/chord-tutorial-story/plan.md`.
