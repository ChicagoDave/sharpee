# Hatch-Context Narrowing + `'chord.'` Lint — Design Proposal

**Status**: DESIGN SETTLED (David, 2026-07-12 — three open questions
answered, see §5) — amended 2026-07-12 after adr-review: the leak site is
the loader's own staging call (`runtime.ts:1110`), not the engine render
path, which already narrows by construction. Awaiting explicit
implementation go-ahead (platform change: `packages/story-loader` +
`packages/devkit`; CLAUDE.md discussion-first rule).
**Origin**: design.md §5.6 hatch legitimacy rule (David, 2026-07-11) —
"Enforcement is by construction, not policy." Tracked as the Phase C
follow-up; Phase C P5 retired the one violating hatch (`gateStatus`), this
proposal builds the wall that makes the next one impossible.

## 1. Problem (the proven leak — corrected mechanics)

`PhraseProducer = (ctx: RenderContext) => Phrase` (if-domain/phrase.ts:479),
where `RenderContext.world` is typed `RenderWorld` — four read methods, no
state access.

The engine's prose pipeline honors that by construction:
`createRenderWorld` (engine/prose-pipeline/render-context.ts:80) hands the
assembler a **fresh object literal with exactly the four delegating
methods**, and the context's `contribute`/`slotContributions` are closures
over turn-scoped stores. A cast on that path finds nothing.

Chord hatch producers never see that context. The story-loader invokes them
**at staging time** (`runtime.ts:1110`, in `phraseEvent`):

```ts
params[marker] = producer({ world: ctx.world } as unknown as Parameters<PhraseProducer>[0]);
```

`ctx.world` is the **raw `WorldModel`**. Both casts in the gateStatus story
were ours: the loader cast the wide object *in*, and the hatch cast the
method *out*:

```ts
const world = (ctx as unknown as { world?: { getStateValue(key: string): unknown } }).world;
const closed = world?.getStateValue('chord.flag.gate-closed');
```

When P4 deleted the `chord.flag.*` namespace, this hatch would have
silently reported the gate permanently open — no compile error, no load
error, no diagnostic. Policy without construction fails; the cast found a
real method because the loader handed over the real object.

The corrected picture *shrinks* the fix: there are no engine members to
mirror, and the seams that don't exist at staging (`textState`,
`contribute`) don't need faking as live objects — legitimate producers
(flavor/aside) already work by returning `Choice` atoms that defer those
seams to the assembler's real context at realization time.

## 2. Contract (from §5.6, restated as requirements)

1. A hatch **cannot misuse what it is never given**: the loader hands
   hatches a narrow, typed, versioned context exposing public surfaces only.
2. A lint for `'chord.'` string literals in hatch modules backstops
   cast-arounds.
3. The narrow context is the **IDE contract** — the IDE can state exactly
   what a hatch *can* touch even when it can't see what the hatch does.
4. The pure-IR profile is untouched (hatches refused before binding, as
   today — loader.ts:171).

## 3. Design

### 3.1 Narrow staging context (construction, the wall itself)

One story-loader-local helper, `stagingRenderContext(world)`, used at the
single producer-invocation site (`runtime.ts:1110`); the existing
`as unknown as` cast there is deleted:

```ts
params[marker] = this.invokeProducer(marker, producer, ctx); // wraps the call, see throw handling
// inside: producer(stagingRenderContext(ctx.world))
```

`stagingRenderContext` returns a genuine `RenderContext` (no cast):

- `world`: a fresh facade exposing **only** `RenderWorld`'s methods —
  `getEntity`, `getEntityContents` (→ `world.getContents`),
  `getContainingRoom`, each delegating to the real world. `nounPhraseFor`
  is omitted (it is optional, stdlib-bound, and staging-time producers do
  not realize noun phrases). Casting the facade finds nothing:
  `getStateValue` does not exist on it. No `Proxy`, no `throw` — absence
  is the enforcement.
- Inert seams, honestly reflecting what staging *is*: `params: {}`; an
  empty `TextStateStore` (get → undefined, set → no-op — the engine's
  world-less fallback shape); `contribute` → no-op; `slotContributions`/
  `position` absent (both optional); `settings`/`narrative` filled with
  the loader's defaults for its locale (exact values an implementation
  detail, constrained by: **no member may expose mutation or state-key
  reads**). Rationale: persistent text state is an assembler-time seam —
  a producer that needs it returns a `Choice` atom (ADR-196), which is
  exactly what flavor/aside do.

**Throwing producers** (new, from review): the staging call is wrapped;
a producer that throws (e.g. legacy code calling a method the facade
doesn't have, without optional chaining) becomes a `LoadError` naming the
hatch and the phrase key — loud at the emit site, consistent with the
loader's atomic-load spirit, instead of an anonymous TypeError from deep
inside `phraseEvent`.

Out of scope, unchanged from the settled design: action/behavior hatches
(`define action|behavior X from`) implement whole platform interfaces
whose contexts are shared with stdlib — per David 2026-07-12, ActionContext
stays as-is.

### 3.2 `'chord.'` lint (backstop for cast-arounds)

Two layers, matching where source is visible:

- **Devkit (authoritative, source scan)**: hatch module paths are declared
  in the `.story` file as source-relative `.ts` paths (`"./chord-extras.ts"`);
  compose resolves them to `dist/<base>.js` **for loading**
  (devkit/commands/compose.ts:20), but the declared `.ts` file itself is
  the scan target, resolved relative to the `.story` file's directory.
  Hosted by `sharpee compose` (`--check` and full mode alike).
  Implementation note (2026-07-12): the devkit standalone build was named
  as a second host, but `standalone/build.ts` is TS-story-only today — it
  never sees `.story` hatch declarations. The lint lives in a shared devkit
  module (`hatch-lint.ts`); build.ts calls it when it grows `.story`
  support.
  **Comments are stripped before scanning** (source is available, so this
  is cheap), then string literals matching `/['"]chord\./` ⇒ **build
  error** citing §5.6 ("the `chord.*` state namespace is loader-private;
  hatches read the world through their context only"), with file:line.
- **Loader (best-effort, bind time)**: the loader receives pre-loaded
  modules, no filesystem (loader.ts:17); it scans the bound export's
  `Function.prototype.toString()` for the same pattern. Hit ⇒ **LoadError**
  at bind (David, 2026-07-12 — same atomic-load discipline as a missing
  export). Two documented imprecisions, both acceptable because the facade
  (3.1) is the actual wall: bundled/minified code may evade the scan
  (false negative — the devkit layer covers it), and a *quoted* `'chord.`
  inside a comment in the compiled output will trip it (false positive —
  the error text says so and the remedy is rewording, precedent: P5
  reworded exactly such a comment in chord-extras.ts).

The lint is a *literal* scan, not a semantic one — `'chord' + '.'` evades
it. Fine: the facade already made the evasion pointless (there is no
method to call with the key).

### 3.3 Versioning + IDE contract

- The narrow context **is** `RenderContext` as declared in if-domain — no
  new type. The change makes the staging object genuinely satisfy the
  declared type (cast deleted); the declaration is already the contract.
- Export one constant from story-loader: `HATCH_CONTEXT_VERSION = 1`,
  bumped only when the *narrowed surface* changes (a member added to
  `RenderContext`/`RenderWorld` that hatches may use).
- **Delivery to the IDE (revised at implementation — David, 2026-07-12):**
  the originally-decided ide-protocol re-export would have violated
  ide-protocol's documented types-only/no-runtime-deps invariant (DEVARCH
  8b, the browser bridge). Instead the constant rides the introspection
  manifest: `ProjectManifest.hatchContextVersion?` (typed in ide-protocol
  beside `SCHEMA_VERSION`), stamped unconditionally by bootstrap's
  `buildManifest` (a property of the emitting platform, not of the story);
  bootstrap gains the story-loader dependency (no cycle). The IDE can
  display "hatches see context v1" from the manifest. Future widenings
  stay deliberate, logged events rather than drift.

### 3.4 Tests (behavior statements, per the derivation rule)

- **stagingRenderContext**: DOES hand the producer a context whose `world`
  has exactly the three facade methods; a gateStatus-style cast reads
  `undefined` for `getStateValue` (re-enacts the exact historical leak);
  the facade's reads delegate correctly (getEntity round-trip). REJECTS
  nothing (facade, not gate).
- **Throwing producer**: DOES surface a producer that calls
  `world.getStateValue(...)` non-optionally as a `LoadError` naming the
  hatch and phrase key. (This is the negative test the review required.)
- **Loader lint**: DOES throw `LoadError` at bind when a bound producer's
  source contains a quoted `'chord.`; a clean producer binds.
- **Devkit lint**: build-error fixture with file:line assertion; a
  comment-only `chord.` mention does NOT error (comment stripping).
- **Regression**: zoo gate (79/79) re-run — flavor/aside are the live
  proof legitimate hatches need nothing outside the facade; story-loader
  hatches.test.ts extended, all suites green.

## 4. What this does NOT change

- Pure-IR profile semantics (refusal before binding) — untouched.
- The engine prose pipeline — already narrow by construction; untouched.
- Hatch declaration syntax, IR shape, ide-protocol wire types (beyond the
  re-exported version constant) — untouched. No grammar change; nothing for
  the ratchet log.
- `stories/` content — zoo/cloak hatches already comply (P5).

## 5. Open questions — RESOLVED (David, 2026-07-12)

1. **Loader-side lint severity**: **LoadError** at bind — same atomic-load
   discipline as a missing export; the devkit source lint covers the
   minified-bundle false-negative.
2. **Action/behavior hatch contexts**: **out of scope** — this change fixes
   the documented producer seam; ActionContext stays as-is.
3. **`HATCH_CONTEXT_VERSION` home**: **story-loader** (the loader owns the
   binding seam). Revised at implementation (David, 2026-07-12): NO
   ide-protocol re-export — it would break ide-protocol's types-only
   invariant; the IDE learns the value via the introspection manifest
   (`ProjectManifest.hatchContextVersion`, stamped by bootstrap's emitter).

## 6. Acceptance criteria (done when)

1. A producer casting for `getStateValue` (the gateStatus re-enactment)
   reads `undefined` on the chord staging path — the only path that ever
   handed producers a wide world; the `as unknown as` cast at the staging
   site is gone.
2. A producer that *calls* a facade-absent method fails as a `LoadError`
   naming the hatch and phrase key.
3. Devkit lint: a hatch module with a quoted `'chord.` literal fails
   `sharpee compose` and the standalone build with file:line; the same
   text in a comment passes.
4. Loader lint: the same literal in a bound export's source fails bind
   with `LoadError`; clean modules bind.
5. `HATCH_CONTEXT_VERSION = 1` exported from story-loader; every
   `buildManifest` output carries `hatchContextVersion: 1` (typed in
   ide-protocol); ide-protocol suite green (wire-surface check).
6. Full regression green: story-loader, chord, ide-protocol, devkit
   suites; Zoo gate 79/79 and Cloak gate 81/81 through the rebuilt bundle.

## 7. Estimate

Small: one staging-context helper + one wrapped call site in story-loader,
one devkit source scan (two command hosts), one loader toString scan,
~6 tests. No story changes, no IR changes. Single session including
regression.
