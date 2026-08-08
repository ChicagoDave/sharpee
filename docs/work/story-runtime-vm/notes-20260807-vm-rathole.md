# Notes: a VM for Chord/Sharpee, and the runtime-spec question

**Date**: 2026-08-07 (session a9d8ca, branch `feat/ide-go-live-phases-1-3`)
**Status**: EXPLORATORY. No decision, no plan, no ADR. Conversation capture only.
**Purpose**: preserve a design thread so a later session resumes cold instead of re-deriving it.
**Owner context**: cross-cutting — Chord compiler (`packages/chord`), the Sharpee runtime
(`packages/{engine,stdlib,world-model,parser-en-us,lang-en-us}`), and `docs/spec/`.

Origin question (David): *"if you had to expand Chord, how hard would it be to target the
Z-machine as a separate effort?"* — which walked to *"what would a new VM look like?"* and
landed on *"what's different about a story runtime from the VM?"*

---

## 1. Targeting the Z-machine — explored, set aside

**The language is the easy part.** `packages/chord/src/ir.ts` (974 lines) is a *closed* IR:

| Category      | Count | Notes |
| ------------- | ----- | ----- |
| `IRStatement` | 19 `kind` strings (18 union members; `raise`/`lower` share a member) | `refuse`, `phrase`, `emit`, `set`, `change`, `move`, `remove`, `award`, `raise`/`lower`, `win`, `lose`, `kill`, `must`, `refuse-when`, `select-on`, `select-strategy`, `ordinal`, `each` |
| `IRValue`     | 10 | `literal`, `entity`, `player`, `it`, `story`, `field`, `counter`, `slot`, `match`, `symbol` |
| `IRCondition` | 12 | `and`, `or`, `not`, `chance`, `condition`, `story-state`, `any-of`, `none-of`, `satisfies`, `client-has`, `predicate`, `compare` |

No user-defined functions, no recursion, no arbitrary arithmetic, no dynamic allocation, no
general loops (only `each` over world entities). That shape maps cleanly onto Inform 6.

**The runtime is the entire job.** Chord compiles to configuration for the Sharpee platform:
290 files in `packages/stdlib/src`, 190 in `packages/world-model/src`, 149 across
`parser-en-us` + `lang-en-us` + `engine`. All of that must exist on the far side.

ADR-265 closes the shortcut: stdlib in Chord form is reference-only, the implementation stays
TypeScript. There is no "recompile the library through a second backend" path.

**Conclusions reached:**

- Emit **Inform 6 source**, never Z-code. Let the I6 compiler and library supply parser,
  object model, and disambiguation. Writing a backend *and* a library is the version that
  never ships.
- Target **Glulx, not the Z-machine**. Z v8 caps at 512KB with far tighter dynamic memory, and
  Chord is text-heavy (phrasebooks, variants, `override message`). More to the point, fyrevm
  already did channel I/O on Glulx, and Sharpee's channel model descends from it.
- **What genuinely hurts**: action-model divergence (four-phase validate/execute/report plus
  ADR-090 capability dispatch, versus I6's `before`/`after` ordering); the capability cliff
  (`client has` per ADR-216, dynamic channels per ADR-241, media, the `[name:content]`
  decoration model per ADR-174 — Glk has styles, not classes); TS event handlers don't port at
  all; and a permanent parity tax where every future Chord feature needs two implementations or
  an exclusion list.
- **The asset**: deterministic transcript chains at a pinned seed are already a differential-test
  harness for a second backend. Would need PRNG/seed alignment or pinned `forces:`/`point-seed:`.
- **Middle path if ever revisited**: a *portable-subset profile* — a compile flag where the
  analyzer rejects any construct the backend can't honor, surfaced through ADR-276's
  source-authoritative diagnostics. Turns silent drift into a compile error.

**Verdict (David, 2026-08-07): "too much for not enough return."** The distribution win is real
but a publishing path already exists (ADR-284); the cost is owning a second runtime in parity
forever. Would only flip for a specific external need (IFComp, IF Archive norms), and even then
the portable-subset profile beats a real backend.

---

## 2. Post-turn text emission — the deepest mismatch

David's observation, and the sharpest point in the thread.

Inform prints imperatively; output order *is* execution order. Sharpee inverts this: a turn
produces a semantic event stream, and a **separate report pass afterward** turns that stream into
text blocks which channels carry. Nothing decides prose until the turn is over.

Three things that buys, none available inline:

1. **Deciding prose with the whole turn in hand.** Inline printing commits early — a behavior
   that fails halfway has already emitted text it can't retract.
2. **Coalescing.** Three take events fold into "Taken: lamp, sword, rope."
3. **One stream, many projections.** Status line, room title, score, media are the same events
   read differently (ADR-163). This is what makes per-user renderers possible at all.

**It ports better than it first looks.** The report pass is a pure function from event stream to
text blocks — data in, data out, no dependency on the TS object graph. And the event arena is
*per-turn*, so it's sized to the worst-case turn, not to the story. Kilobytes.

The part that genuinely doesn't fit is `emit` with structured payloads (ADR-216: nested objects
and arrays, unbounded by construction) — but that's the TS-extension path, which wasn't porting
anyway.

**Concrete mechanism if ever built**: redirect I6's own output into the arena (`@output_stream 3`
on Z, Glk stream-to-memory on Glulx), or the library's parser errors and disambiguation prompts
print to screen while buffered events are still queued and the ordering interleaves wrong. That
means fighting the I6 library's assumptions rather than riding them, which erodes the
"let I6 do the work" argument.

---

## 3. What a Chord/Sharpee-native VM would look like

**Thesis**: Z-machine and Glulx are general-purpose machines with the IF-ness in the library.
Every IF system then reimplements object model, scope, and text assembly on top, differently.
A machine designed for this workload puts the object model, scope, and the per-turn event log
*in the machine*.

### Memory — typed regions, not a flat byte array

- **Entity store** — fixed-shape records. Traits are declared in the story header, so slot
  layout is computed at compile time and property access is an indexed load (no `get_prop`
  linear scan).
- **Relation store** — containment links plus a per-room cached visible set, invalidated on
  move. Scope recomputation is the hot path in every parser game.
- **Text region** — immutable, compressed, addressed by message key. Phrase variants are a table.
- **Event arena** — per-turn bump allocator, resets each turn. No analogue in existing IF VMs.
- **Counter bank** — score, Chord counters (ADR-264), and `select-strategy` occurrence
  counters (ADR-289 D2).

### Instructions — small register machine plus domain opcodes

```
MOVE ent, dest         ; fires observers
REMOVE ent
ISA / IN / HOLDS / WEARS / HAS      → bool
CANSEE a, b  /  CANREACH a, b
SCOPE room                          → entity-set
EACH cond                           ; Chord's each, as an opcode
ANY cond / NONE cond                → bool
EMIT tag, payload                   ; append to arena
SAY key, params                     ; append — does NOT print
CHANCE n                            ; seeded
SELECT id, strategy, n              ; consults the counter bank
```

- **Entity sets as a first-class type.** Bitsets over entity ids (1000 entities = 125 bytes).
  Scope, `any`, `no`, `each` all become intersect/union/test. Every IF library reinvents this
  with linked lists.
- **`SELECT` is the tell.** ADR-289's persisted per-select counters are awkward on any existing
  VM and trivial when the machine has a counter bank keyed by select id.

### The machine has no print instruction

The design's center. Output is `(channel, tag, payload)` appended to the arena; the host drains
it at end of turn. Decoration becomes a payload concern, media becomes a channel, multi-user
becomes N drains over one log. This is fyrevm's channel I/O promoted from bolt-on extension to
the machine's *only* output mechanism.

### Determinism as a machine property

Seed in the header, PRNG state in the saved region, `CHANCE` and `SELECT` the only entropy
sources. A save plus an input list then reproduces a run byte-for-byte by construction rather
than by discipline — which feeds the testing-intelligence surface directly (ADR-294 D13–D16).

### Deliberately dropped

No general heap, no arbitrary pointers, no floats, no dynamic code loading. The smaller the
spec, the cheaper a second implementation.

### Honest cost

Same fatal shape as the Z-machine idea: the IR is ready (a VM is just a serialization target for
it), but 290 stdlib files have to become VM code or VM-callable. And v1 runs *slower* than today,
because the first interpreter would be written in TypeScript for the web anyway. The payoff only
arrives when a second implementation exists and somebody wants it.

---

## 4. VM spec vs runtime spec

**A VM spec says how instructions execute. A runtime spec says what a turn observably does,
regardless of how you execute it.**

Questions only a runtime spec answers:

- Does `MOVE` fire observers before or after the containment change commits?
- Does the report pass see events in emission order, or may it reorder?
- When is scope recomputed relative to a mid-turn move?
- Is `each` iteration creation-order? (The IR comment says yes — a runtime-spec fact currently
  living in a code comment.)
- If a `must` fails after three statements already ran, what's in the event log?
- Does an interceptor see the event an observer emitted?

Two VMs with byte-identical opcodes could disagree on every one of those and both be conforming
machines. These are also exactly the questions that cause drift between implementations.

**Z-machine is the illustrative case.** The Standards Document is a VM spec: bytecode, object
tree format, text encoding, save semantics. It does *not* specify IF behavior — what "taking"
means, how scope works, disambiguation, action ordering. That lives in libraries, which is why
I6, I7, and TADS games behave differently while some share a machine.

Sharpee's distinctive value sits on the side that went unspecified there. The Z-machine's was
representational (fit a game in 128K). Different halves.

**What only a VM gives you** (the spec doesn't subsume it): a portable binary artifact;
resource bounds with no host GC; sandboxing; byte-level version stability.

---

## 5. Correction — the spec already exists

The conversation's closing recommendation was "write the runtime spec first, you don't have one."
**That premise was wrong.** Checked at the end of the session:

- `docs/spec/` holds nine documents, 4,843 lines: `01-data-model` … `08-text-service`, plus
  `glossary.md` and `index.md`.
- Produced by `docs/work/spec-extraction/plan-20260416-reverse-engineer-spec.md`, whose stated
  goal was exactly this: *"detailed enough that a competent engineer could re-implement Sharpee
  in Rust, C#, Python, or any other language without consulting the TypeScript source."*
- Last swept 2026-06-21 (`efc6998f`, "sweep remaining stale 'text service' references").
- `05-engine.md` has a **normative turn cycle** section (line 406) and a conformance table
  marking rows **Required**.
- Determinism is already normative with MUST language: `01-data-model.md` invariant 6 — *"Given
  the same initial world, the same random seed, and the same command sequence, the same event
  sequence MUST be produced"* — plus a `SeededRandom` contract and RNG-seed-in-save requirement.

So the actionable residue is much narrower than "write a spec." Candidates, unverified:

1. **`03-parser.md` and `04-grammar.md` are untouched since 2026-04-16** — they predate the
   Chord grammar ADRs (267, 268, 269, 271, 275) and ADR-087 work. Every other spec file got the
   June sweep; these two did not.
2. **`08-text-service.md` still carries the old subsystem's name** in its filename despite the
   June content sweep, and text-service was removed by ADR-174 (prose pipeline + channel I/O).
   Worth checking whether the file's content matches current reality or only lost the phrase.
3. **No conformance suite binds the spec to the transcript corpus.** The deterministic
   walkthrough chains could serve as executable conformance tests against the normative turn
   cycle. Today the spec is prose that nothing checks.
4. **The §4 questions above may not be answered anywhere.** Worth grepping `docs/spec/` for
   observer ordering, report-pass ordering guarantees, and mid-turn scope invalidation before
   assuming they are.

---

## Open questions for the next session

- Does `docs/spec/` actually answer the §4 ordering questions, or does it stop at structure?
- Is a conformance suite over the existing transcript corpus worth building on its own merits,
  independent of any VM?
- If the answer to both is yes, does a VM ever become more than a curiosity — or does the spec
  plus the TS runtime plus the existing publishing path already cover every real need?

**Nothing here is a commitment.** Both the Z-machine target and the native VM were explicitly
set aside during the conversation that produced this note.
