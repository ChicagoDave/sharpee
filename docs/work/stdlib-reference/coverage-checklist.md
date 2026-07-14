# Standard Library Reference — Coverage Checklist

Every one of the 49 standard action directories
(`packages/stdlib/src/actions/standard/`), 38 traits
(`packages/world-model/src/traits/`), and the runtime plugin/daemon services
mapped to exactly one section of `docs/reference/stdlib-reference.md`. This is
the acceptance check for "the whole standard library is cataloged": no row may
be left unchecked when the plan closes. Check a row (`[x]`) only when its
section has final prose.

**Harness decision (Phase 1): DROPPED** — owner chose "prose only, no harness"
(2026-07-14). Examples are hand-written real Chord syntax, ad-hoc sanity-checked
against `@sharpee/chord` during drafting; there is no committed
`verify-examples.mjs`, no `fixtures/`, and no Phase 9 sweep.

**Verb grounding sources** (read Phase 1): `packages/parser-en-us/src/grammar.ts`
(parse patterns + multi-slot forms) and `packages/lang-en-us/src/data/verbs.ts`
(per-action verb vocabulary). Verbs below are the union; content phases confirm
per-action detail from the action's own `*-messages.ts` / `*-data.ts`.

**Classification** (ADR-090 / `packages/stdlib/CLAUDE.md`): *standard* = one
canonical behavior stdlib implements; *dispatch* = no single behavior, meaning
is per-entity/story-defined (documented as such, never given an invented
default). In the 49 dirs, only `lowering` and `raising` are dispatch verbs
(TURN/WAVE/WIND have no action directory).

## Actions — Manipulation (§2)

- [ ] `taking` — take, get, grab, pick up, take up — *standard* — §2 (portable by default; SceneryTrait blocks)
- [ ] `dropping` — drop, discard, put down — *standard* — §2
- [ ] `putting` — put on/onto (supporter), hang on — *standard* — §2
- [ ] `inserting` — put/insert in/into/inside (container) — *standard* — §2
- [ ] `removing` — remove/take X from container/surface — *standard* — §2 (take-from; distinct from `taking_off`)
- [ ] `giving` — give/offer/hand … to recipient — *standard* (NPC) — §2
- [ ] `showing` — show/display/present … to recipient — *standard* (NPC) — §2
- [ ] `throwing` — throw/toss/hurl … at/to — *standard* — §2
- [ ] `pushing` — push, press, shove, move — *standard* (per-entity extensible) — §2
- [ ] `pulling` — pull, tug, drag, yank — *standard* (per-entity extensible) — §2
- [ ] `touching` — touch, feel, rub, pat, stroke, poke, prod — *standard* (report) — §2
- [ ] `lowering` — lower — **dispatch** (per-entity, story-defined) — §2
- [ ] `raising` — raise, lift — **dispatch** (per-entity, story-defined) — §2

## Actions — Movement (§3)

- [ ] `going` — go/move/walk/run/travel + 10 directions (n/s/e/w/ne/nw/se/sw/up/down) — *standard* — §3
- [ ] `entering` — enter, go in/into, get in, climb in, board (vehicle) — *standard* — §3
- [ ] `exiting` — exit, leave, get out, climb out, disembark, alight, get off — *standard* — §3
- [ ] `climbing` — climb, scale, ascend — *standard* — §3

## Actions — Containers & openables (§4)

- [ ] `opening` — open, unwrap, uncover — *standard* — §4
- [ ] `closing` — close, shut, cover — *standard* — §4
- [ ] `locking` — lock, secure (lock … with :key) — *standard* — §4
- [ ] `unlocking` — unlock, unsecure (unlock … with :key) — *standard* — §4

## Actions — Wearing (§5)

- [ ] `wearing` — wear, put on, don, equip — *standard* — §5
- [ ] `taking_off` — remove, take off, doff, unequip — *standard* — §5

## Actions — Senses & examination (§6)

- [ ] `examining` — examine, x, inspect, check, view, observe, look at — *standard* — §6
- [ ] `looking` — look, l, look around — *standard* — §6
- [ ] `searching` — search, find, locate, look in/inside/through, rummage — *standard* — §6
- [ ] `reading` — read, peruse, study — *standard* — §6
- [ ] `listening` — listen, hear — *standard* — §6
- [ ] `smelling` — smell, sniff — *standard* — §6

## Actions — Devices (§7)

- [ ] `switching_on` — switch on, turn on, activate, start (turn :device on) — *standard* — §7
- [ ] `switching_off` — switch off, turn off, deactivate, stop (turn :device off) — *standard* — §7

## Actions — NPCs & conversation (§8)

- [ ] `talking` — talk, speak, converse, chat, talk to — *standard* (NPC) — §8
- [ ] `attacking` — attack, hit, strike, fight, kill, slay, murder (… with :weapon) — *standard* (combat) — §8
- [ ] `eating` — eat, consume, devour — *standard* — §8
- [ ] `drinking` — drink, sip, quaff, swallow — *standard* — §8
- [ ] `hiding` — (no default grammar/verb binding found — confirm in §8; likely story-provided) — §8

## Actions — Meta/system (§9)

- [ ] `about` — about, info, credits — §9
- [ ] `help` — help, ?, commands — §9
- [ ] `inventory` — inventory, i, inv — §9
- [ ] `scoring` — score, points — §9
- [ ] `saving` — save, save game — §9
- [ ] `restoring` — restore, load, load game — §9
- [ ] `quitting` — quit, q — §9
- [ ] `restarting` — restart — §9
- [ ] `version` — version — §9
- [ ] `again` — again, g — §9
- [ ] `undoing` — undo — §9
- [ ] `waiting` — wait, z — §9
- [ ] `sleeping` — sleep, nap, doze, rest, slumber — §9

## Traits (§10 — catalog; each also introduced in its owning action chapter)

### Manipulation traits (introduced §2)
- [ ] `container` — holds things inside — §2 / §10
- [ ] `supporter` — holds things on top (capacity) — §2 / §10
- [ ] `pushable` — §2 / §10
- [ ] `pullable` — §2 / §10
- [ ] `moveable-scenery` — §2 / §10
- [ ] `attached` — §2 / §10

### Movement / containers traits (introduced §3–§4)
- [ ] `room` — §3 / §10
- [ ] `exit` — §3 / §10
- [ ] `door` — composes openable + lockable — §4 / §10
- [ ] `enterable` — §3 / §10
- [ ] `climbable` — §3 / §10
- [ ] `vehicle` — §3 / §10
- [ ] `openable` — §4 / §10
- [ ] `lockable` — §4 / §10

### Wearing / senses traits (introduced §5–§6)
- [ ] `wearable` — §5 / §10
- [ ] `clothing` — §5 / §10
- [ ] `equipped` — §5 / §10
- [ ] `open-inventory` — §5 / §10
- [ ] `readable` — §6 / §10
- [ ] `scenery` — fixed in place, blocks taking — §6 / §10
- [ ] `concealment` — §6 / §10
- [ ] `acoustic` — §6 / §10
- [ ] `listener` — §6 / §10

### Devices / NPC traits (introduced §7–§8)
- [ ] `switchable` — §7 / §10
- [ ] `light-source` — §7 / §10
- [ ] `button` — §7 / §10
- [ ] `breakable` — §8 / §10
- [ ] `destructible` — §8 / §10
- [ ] `edible` — §8 / §10
- [ ] `actor` — §8 / §10
- [ ] `npc` — §8 / §10
- [ ] `character-model` — §8 / §10
- [ ] `combatant` — §8 / §10
- [ ] `weapon` — §8 / §10

### Structural / authoring traits (no 1:1 verb — introduced §10)
- [ ] `identity` — name/description/aliases — §10
- [ ] `region` — §10
- [ ] `scene` — §10
- [ ] `story-info` — §10

## Plugins & daemons (§11)

- [ ] Turn-plugin concept + `plugins`/`plugin-registry` (priority order: NPC 100, state machines 75, scheduler 50) — §11
- [ ] `plugin-scheduler` — daemons/fuses; what a `define sequence` step-anchor runs on — §11
- [ ] `plugin-npc` — NPC turn plugin — §11
- [ ] `plugin-state-machine` — state-machine plugin — §11
- [ ] `extensions/basic-combat` — worked "plugin built on the standard layers" example — §11

## Cross-cutting notes for content phases
- Every action's "message keys" section shows the **message ID** an author
  overrides via `phrase <key>` / `define phrases`, never invented English as if
  it were the platform default (stdlib emits IDs, not text — `lang-en-us` owns
  text). Confirm each action's keys from its `*-messages.ts`.
- Dispatch verbs (`lowering`, `raising`) get "per-entity, story-defined" prose +
  a cross-link to `chord-language.md`'s `on`/`after` clause chapter — never an
  invented canonical behavior.
- Combat (`attacking`) non-determinism: document the observable outcome range;
  never propose seeding/disabling RNG (project policy).
- Cross-link to `chord-language.md` §5 (`define trait`/`define action`/hatches)
  for "extend it yourself" rather than re-explaining the `define` mechanism.
- genai-api footnote: `genai-api/stdlib.md` says "43 standard actions"; the disk
  has 49 dirs today. Not this plan's to fix (owned by `packages/sharpee/CLAUDE.md`).
