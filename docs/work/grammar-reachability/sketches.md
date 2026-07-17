# Phase 6 Design Sketches — deferred verbs, orphan families, and flagged surfaces

Status: AWAITING DAVID RULINGS (Phase 6 review deliverable per pins.md rulings 3 + A1)
Each sketch ends with **Options** — nothing here is implemented; the gate carries
documented exceptions until each ruling executes.

## 1. `turning` (turn/rotate/twist)

Bare `turn` already parses (switching's `turn :device on|off` forms); rotate/twist
parse nothing. ADR-090's own table documents TURN as **deliberately entity-specific
dispatch** (wheel rotates, dial sets, crank activates) — a generic stdlib turning
action would contradict that ruling.

Sketch of a generic implementation, if wanted: full-delegation capability action
(`createCapabilityDispatchAction`, exactly lowering/raising) — no standard mutation,
entities claim `if.action.turning` via trait+behavior; grammar `turn|rotate|twist
:target` at 100 (below the 110 switching phrasal forms so `turn lamp on` keeps
winning); Chord surface = `on turning it` (routes as capability once the id is a
dispatch action, or as interceptor if wired like cutting).

**Options:** (a) full-delegation capability action like lowering/raising —
consistent, small; (b) cutting-style trait-gated action (TurnableTrait) — heavier,
no evident need; (c) drop rotate/twist from verbs.ts and leave TURN entity-specific
per ADR-090. **Recommend (a)** — it makes `wind`/`wave` siblings trivial later.

## 2. `using` (use/utilize/employ)

Deleted from stdlib constants as "not idiomatic IF." A generic USE has no
semantics — classic IF responds "you'll have to be more specific."

**Options:** (a) minimal refusal action (validates target exists, always refuses
with an interceptable "be more specific" message — story can intercept per entity);
(b) drop use/utilize/employ from verbs.ts. **Recommend (b)** — a refusal action
teaches players a verb that never works; better absent than advertised.

## 3. `answering` (answer/respond/reply)

The parked action (`removed/answering.ts.removed`) responded to NPC questions —
there is no question system to answer into today. **Options:** (a) revive with the
conversation family (below); (b) drop from verbs.ts until a question system exists.
**Recommend (b), revisit with the conversation decision.**

## 4. Conversation family (asking, telling, saying, saying_to, shouting, whispering)

All six have live core grammar (`ask :recipient about :topic`, `say :message [to
:recipient]`, `shout :message`, `whisper :message to :recipient`, …) and NO action:
they parse and runtime-fail in every story. asking/telling actions exist parked in
`stdlib/src/actions/removed/`; `@sharpee/ext-conversation` is a 5-line stub. Dungeo
ships its own SAY story action instead.

**Options:** (a) revive asking/telling into the conversation extension (real actions,
extension opt-in, grammar stays; gate exception moves to "extension-provided");
(b) delete all six grammar rules until the conversation system lands — parse error
("I don't understand") instead of runtime confusion, cleanest gate; (c) minimal
stdlib stubs that refuse helpfully ("X doesn't seem interested") and are
interceptable. **Recommend (b) for saying/saying_to/shouting/whispering + (a)-shaped
work as a real conversation-extension project later; asking/telling could take (c)
now since ask/tell are core IF verbs players constantly try.**

## 5. Writing family (writing, writing_on)

`write :message [on :surface]` parses, no action, no WritableTrait. **Options:**
(a) delete grammar until a writing system is designed; (b) cutting-template
implementation (WritableTrait + per-entity implementation). **Recommend (a)** —
no story has asked for it; the cutting template makes (b) a known-cost project
when one does.

## 6. Tool-verbs: `digging`, `taking_with`

Same shape as opening_with/cutting were:
- `dig :location with|using :tool` — cutting-template candidate: DiggableTrait
  (tool config) + per-entity implementation (dual-surface), loader check included.
- `take :item from :container with|using :tool` (`taking_with`) — remap candidate:
  map to `if.action.removing` with an `.instrument()` tool slot (the D3b opening
  treatment: removing's descriptor gains target→tool consultation; a tool
  requirement could ride ContainerTrait or stay interceptor-only).

**Recommend:** taking_with → remap onto removing (D3b treatment); digging →
implement via the cutting template only when a story needs it, else delete the
grammar (it predates any consumer). Both are mechanical now that the templates
exist.

## 7. `carries the <entity>` (player start inventory) — Phase 5 discovery

`create the player … carries the knife` **compiles silently and does nothing**
(IR has only `wears`). Two defects in one: a silent-accept parse hole and a
missing authoring surface every story wants.

**Sketch:** parser accepts `carries the X` in the player (and NPC?) block →
IR `carries: string[]` next to `wears` → loader `finalizePlayer` moves each into
inventory (no worn flag). Symmetric with `wears` at every layer; small.
**Options:** (a) implement (recommended — it's the missing half of an existing
surface); (b) make it a parse error until designed. Either kills the silent accept.

## 8. Patterns-array unmappables (PIN 4b flags)

Promoted this phase (grammar added): munch/nibble (+on), imbibe, drink from,
sip from, release, let go of, collect, extract-from, open up, power on/off.
Deleted as junk: `unclose`.

Still advertised by lang `patterns` arrays with no grammar — need a keep-or-trim
call each: `draw`, `greet`, `say hello to`, `notify`, `query`, `save as`, `spin`
(turning family), `stick`, `taste` (no tasting action; eating? own action? trim?).
**Recommend trim all nine** (patterns arrays are docs — they should stop
advertising these until real verbs exist; `spin` rejoins if turning ships,
`taste` is a one-line eating alias if ever wanted).
