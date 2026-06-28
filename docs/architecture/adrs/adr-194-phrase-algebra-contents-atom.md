# ADR-194: Phrase Algebra — Contents Atom & the Entity→NounPhrase Bridge

## Status: ACCEPTED

> Accepted 2026-06-27 by David. Continues the ADR-192 atom roadmap; realizes the
> reserved `Contents` kind (ADR-192 §2) and resolves the entity→`NounPhrase` bridge
> the later world-reading atoms need. Lands on `main` via `v2_adr194_contents`.

## Date: 2026-06-27

## Terminology

- **Contents atom** — a `Phrase` kind that renders an entity's **direct contents** as
  a grouped list, read from the **live world at realize time**. `{contents:box}` →
  "a lamp and a key". The deferral (read at end-of-turn, not when the action fired) is
  the point — a plain `PhraseList` built by the producer is resolved eagerly.

## Context

The Assembler can already group/pluralize a `PhraseList` of `NounPhrase`s. What
`Contents` adds is reading the container's contents **from the world during
realization** and turning each into a `NounPhrase`. That last step is the blocker:
`nounPhraseFor` (entity → `NounPhrase`) lives in **stdlib**, the Assembler lives in
**lang-en-us**, and lang-en-us must not depend on stdlib. So realizing world entities
needs a **bridge** injected through the render context.

This bridge is also what `Slot` (ADR-195) and any future world-reading realization
will reuse, so ADR-194 establishes it.

## Decision

Add an optional `nounPhraseFor` to the `RenderWorld` seam, wired by the engine; give
`Contents` its fields and an Assembler case that reuses the list authority.

### 1. The bridge — `RenderWorld.nounPhraseFor` (if-domain)

```ts
interface RenderWorld {
  getEntity(id): IEntity | undefined;
  getEntityContents(id): IEntity[];
  getContainingRoom(id): IEntity | undefined;
  /** Produce the NounPhrase for an entity id (ADR-194). Optional: present when the
   *  engine wired it to stdlib's nounPhraseFor; absent in bare/world-less stubs. */
  nounPhraseFor?(entityId: EntityId): NounPhrase | undefined;
}
```

Optional so existing `RenderContext` stubs (which don't implement it) keep compiling;
the engine's `createRenderWorld` supplies it via `@sharpee/stdlib` `nounPhraseFor`
(engine already depends on stdlib; stdlib does not depend on engine — no cycle).

### 2. The `Contents` kind (language-neutral)

```ts
interface Contents extends PhraseBase {
  kind: 'contents';
  containerRef: string;       // param naming the container (a NounPhrase or an id)
  conj?: 'and' | 'or';        // default 'and'
}
```

### 3. Authoring surface

`{contents:box}` — `box` is a bound param (the container). Bound-at-parse required
(ADR-192 AC-11), like `Verb`'s subject. (`{contents:box or}` for the `or` conjunction
is an additive trailing hint; first cut is `and`.)

### 4. Realization (the Assembler)

1. Resolve `containerRef` to a container id (param is a `NounPhrase` → its
   `referableId`; a string → itself).
2. `ctx.world.getEntityContents(id)` → entities; map each through
   `ctx.world.nounPhraseFor` → `NounPhrase[]`.
3. Render through the existing **list authority** (group / pluralize / serial comma);
   empty → "nothing".

If the bridge or container is unavailable (a bare stub, an unbound/empty container),
render "nothing" — graceful, no throw.

## Options considered

- **Producer pre-resolves contents into a `PhraseList`** — viable and already used by
  `looking` for room contents, but resolves **eagerly** (loses the realize-time
  deferral) and gives `Contents` no reason to exist as a kind. `Contents` is for
  "read the live contents now."
- **Bridge as a top-level `RenderContext` method** instead of on `RenderWorld` —
  rejected: contents resolution is world-derived and per-turn; `RenderWorld` is its
  home. Keeps the per-message `RenderContext` about params/seams.
- **Recursive / relational placement** ("a box, in which is a key"; "on the table") —
  deferred; first cut is direct contents as a grouped list. The template supplies the
  preposition ("In {the box} you see {contents:box}.").

## Scope

**In:** `RenderWorld.nounPhraseFor` (if-domain) + engine wiring; the `Contents` fields;
`{contents:box}` parse rule; the Assembler `Contents` case reusing the list authority.

**Out:** recursive nested-container rendering; relational "in/on" framing inside the
atom; contents filtering (concealed/scenery — the producer's world view decides what
`getEntityContents` returns).

## Consequences

- Realizes the last "combinator" gap for everyday prose; establishes the
  **entity→NounPhrase bridge** `Slot` (195) and future world-reading atoms reuse.
- **Bridge is optional** — existing stubs and world-less construction are unaffected.
- **Boundary held** — `if-domain` gains an interface method returning the
  language-neutral `NounPhrase`; no locale logic. The English realization stays in the
  Assembler.

## Acceptance Criteria

1. `{contents:box}` with `box` containing a lamp and a key → "a lamp and a key"
   (indefinite, serial comma, grouping for identical items).
2. An empty container → "nothing".
3. Contents read at **realize time**: changing the world's contents before realize
   changes the output.
4. Graceful: no bridge / unbound container → "nothing", no throw; an unbound
   `containerRef` param fails at **parse** time (AC-11).
5. The engine's real `RenderWorld.nounPhraseFor` produces a `NounPhrase` for an entity
   (wired to stdlib).
6. Boundary/determinism: no locale strings in `if-domain`; identical world+ctx →
   identical output.

## Relationships

- **Follow-on of** ADR-192 (reserved `Contents` kind). Establishes the bridge for
  ADR-195 (`Slot`). Reuses the ADR-190 list authority. Sibling of 197/198/199/200.

## Session

- Produced in session 491b9c (2026-06-27), the fifth follow-on atom after ADR-193.
