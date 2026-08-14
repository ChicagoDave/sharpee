# Chord ⇄ Sharpee Parity — Master Implementation Roadmap

**Created**: 2026-07-14
**Umbrella**: ADR-214 (100% Sharpee == 100% Chord)
**Status**: planning artifact — sequences the seven ADR workstreams into a
dependency-correct build order. Per-ADR detailed session plans are produced as
each workstream is picked up (ADR-218's already exists at
`docs/work/chord-foundations/plan.md`).

> **Entry gate (applies to every workstream).** All of this is platform work
> (`packages/chord`, `packages/story-loader`, `packages/world-model`,
> `packages/stdlib`, `packages/parser-en-us`). Per CLAUDE.md, each workstream
> needs David's **explicit go-ahead before any code**, and per the ADR-first rule
> each is implemented from its ACCEPTED ADR (+ this roadmap). The ADRs are done;
> this roadmap orders the *building*, it does not authorize starting it.

## The seven workstreams

| # | ADR | Workstream | Packages | Size |
|---|-----|-----------|----------|------|
| W1 | **218** §1a/§1b/§2 | Foundations — catalog adjectives, `LiquidTrait` (marker), door loading | chord, story-loader, world-model | M (4 phases) |
| W2 | **221** / 218 §3 | Capability-dispatch `on <verb> it` fallback | chord, story-loader, stdlib | M |
| W3 | **219** | Liquids & pouring (pour/fill/empty + mixing/reactions) | world-model, stdlib, parser, chord | L |
| W4 | **220** | Doors & portals (logic-gated exits) | world-model, stdlib, chord | S–M |
| W5 | **217** | Timer & scheduler controls (fuses, bands, full Daemon) | chord, story-loader | M |
| W6 | **215** | Extensions & combat (`use`, manifest, combat, NPC, SM) | chord, story-loader, world-model, stdlib, extensions | XL |
| W7 | **216** | Emit payload & media (nested emit, sugar, assets, channels) | chord, story-loader, parser, platform-browser | L |

## Dependency graph

```
W1 Foundations (218)  ─┬─────────────────────────────► everything (catalog infra,
   LiquidTrait, door,  │                                 ratchet pattern, on-clause)
   catalog adjectives  │
                       ├─► W2 Dispatch (221/218.5) ──► (on-clause verb pattern
                       │                                 reused by W3's `on mixing`)
                       ├─► W3 Liquids (219)   needs LiquidTrait (W1 §1b) + W2 pattern
                       ├─► W4 Doors (220)     additive on door (W1 §2)
                       ├─► W5 Timers (217)    independent (only ratchet infra)
                       └─► W6 Extensions (215) ─► W7 Emit/Media (216)
                                                   (custom-channel renderers ride
                                                    W6's contribution surface)
```

**Hard edges** (must precede):
- W1 → all (it introduces `LiquidTrait`, door loading, the catalog-adjective +
  ratchet mechanics, and the `on <verb> it` compile path everything reuses).
- W1 §1b (`LiquidTrait`) → W3 (pouring reads it; `drinkable` implies `liquid`).
- W1 §2 (door) → W4 (adds optional `IExitInfo.when`/computed-destination on top).
- W2 (on-clause dispatch + `EVENT_VERBS` admission) → W3 (`on mixing with` reuses
  the same `EVENT_VERBS`/on-clause verb machinery).
- W6 (extension contribution surface incl. renderers) → W7 (custom-channel
  *renderers* ride W6; also W6 establishes the vocabulary-manifest mechanism).

**Soft / none**:
- W5 (timers) is independent of the liquids/doors/extensions chains — only needs
  W1's ratchet infra.
- W7's *core* (payloaded `emit`, media sugar, declared assets, `client has`) does
  **not** need W6; only *custom-channel renderers* do. W7 can start before W6 and
  land everything except custom-channel renderers, which wait on W6.

## Recommended build order

Serial critical path, with parallelizable tracks called out:

1. **W1 — Foundations (ADR-218 Phases 1–4).** The base. Already planned
   (`docs/work/chord-foundations/plan.md`). Lands catalog adjectives
   (`enterable`/`climbable`/`drinkable`/`liquid`), the marker `LiquidTrait`, and
   `between` door loading. **Everything else depends on this.**

2. **W2 — Dispatch fallback (ADR-218 Phase 5 / ADR-221).** Already the 5th phase
   of the chord-foundations plan; its ADR block is cleared (221 ACCEPTED). Admits
   the capability-dispatch gerunds to `EVENT_VERBS` and synthesizes a
   `CapabilityBehavior` from `on <verb> it` (reusing the clause interpreter).
   Establishes the on-clause-verb pattern W3 reuses.

   *The numbering below is a recommended sequence, NOT a strict dependency chain —
   the hard edges are only those in the Dependency graph above. Concretely: **W4
   (doors) and W5 (timers) need only W1**, not W2; **W6 (extensions) needs only
   W1**; only **W3 (liquids) additionally needs W2** (for the on-clause-verb
   pattern its `on mixing` reuses); **W7 needs W6**. So after W1, W4/W5/W6 can each
   start immediately and proceed in parallel, subject to one implementer +
   per-workstream go-ahead:*

3. **W3 — Liquids & pouring (ADR-219).** The largest of the mid-tier. New
   `pour`/`fill`/`empty`/`mix` stdlib actions + parser grammar; `LiquidTrait`
   intrinsics (type, reactions); container-as-amount-source-of-truth; `define
   reaction` recipe table + `on mixing with` on-clause. Needs W1 (`LiquidTrait`)
   and W2 (on-clause verbs).

4. **W4 — Doors & portals (ADR-220).** Additive on W1's door: two optional
   `IExitInfo` fields (`when` guard + computed destination) + a small `going`
   hook. No exit-model-shape change. Small–medium.

5. **W5 — Timers (ADR-217).** Independent. First-class fuses (`in N turns`,
   `after N turns as <name>`, `cancel`/`reschedule`/`pause`), `on every N turns`,
   value-expr delays, `early`/`normal`/`late` bands, and widening the loader's
   reduced `SchedulerDaemon` to the real `Daemon`.

6. **W6 — Extensions & combat (ADR-215).** The largest workstream. The `use
   <extension>` surface; the static **vocabulary-manifest mechanism** + conformance
   test (reusable infra); combat (`use combat`, `combatant`/`weapon` adjectives +
   `with`-stats); NPC as core auto-wired vocabulary (`guard`/`patrol`/…);
   state-machine depth (`use state-machines`); the runtime-bundled trusted
   registry (pure-IR); and the three-part extension contribution surface (world
   reg + vocab manifest + channel renderers). Precedes W7.

7. **W7 — Emit payload & media (ADR-216).** Payloaded `emit` (full nested
   `with`-data grammar — a notable shared grammar extension), full media sugar,
   declared assets (`define sound/image … from`, pure-IR data), `client has`
   capability degradation, and custom-channel declaration. Custom-channel
   *renderers* ride W6; the rest can precede W6 if desired.

## Cross-cutting foundations (touched by multiple workstreams)

- **Grammar ratchet (ADR-210).** Every vocab/syntax change in every workstream is
  a dated `docs/architecture/chord-grammar-changes.md` entry, written before the
  code it governs.
- **`with <field> <value>` data grammar.** Exists (`lockable with key`). W6 uses
  the flat form for combat stats (with manifest-declared typed fields); **W7
  extends it to full nested values (arrays/objects)** for emit payloads — the
  heaviest grammar change, a shared primitive. Sequence the nested extension with W7.
- **`EVENT_VERBS` / on-clause verbs.** W2 admits capability-dispatch gerunds; W3
  admits `mixing`. Same mechanism.
- **pure-IR / `hasHatches` discrimination (ADR-210 AC-4).** Refined by W6 (`use` =
  not a hatch) and W7 (asset `define … from "<file>"` = data, not a hatch; code
  `define … from "./x.ts"` = hatch). The check keys on the `define` subject.
- **Vocabulary-manifest mechanism (W6).** The static per-extension manifest +
  conformance test is W6 infra that W7's custom channels and any future extension
  reuse.

## Fixtures & acceptance (uniform, per ADR-214 AC-1..AC-4)

Each workstream ships, per its ADR's ACs: a compiled fixture `.story` per closed
gap (run via `node dist/cli/sharpee.js --test <fixture>` after `./repokit build`)
that flips its row in `docs/work/stdlib-reference/chord-availability-audit.md`;
rejection tests where the ADR specifies; a pure-IR (`hasHatches: false`) check;
and an additivity regression (`cloak`/`zoo` compile unchanged). The audit's parity
scoreboard is the running measure of "100% == 100%."

## Next step

Pick the first workstream to detail-plan and build. W1 (ADR-218 foundations) is
already planned and is the required starting point; on David's go-ahead it can
begin. W3/W4/W5/W6/W7 each get their own `docs/work/<slug>/plan.md` (via
session-planner) when picked up — not before, to avoid stale plans.
