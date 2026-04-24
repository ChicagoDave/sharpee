# Proposed DevArch Rule: Co-Located Wire-Type Sharing

## The ask

Evaluate whether the rule below belongs in DevArch's Coding Discipline section (the
rule family that includes Invariants, Cohesive Modularity, Clear Boundaries, Boundary
Statements, Documentation Standards, etc.), and if so, where it should sit and how
its text should be shaped to match DevArch's voice.

## Motivating incident

In a monorepo with a Node/TS server and a React/TS client that communicate over
WebSocket, the wire protocol types (`ClientMsg`, `ServerMsg`, `Tier`, event envelopes)
were originally co-located in a file that also held server-internal persistence types
containing Node-only dependencies (`Buffer`). The client's tsconfig correctly
excluded `@types/node`; when the Docker build copied the shared file into the client
compile chain, `tsc` tripped on `Buffer`.

Two fixes were considered:
1. Duplicate the wire types on the client side — rejected (drift vector).
2. Extract wire primitives into their own file with a hard "no Node-only types"
   invariant — taken.

The deeper lesson: **when a client and a server share a wire protocol and live in
the same repository, they should share the protocol types through direct import,
not through any mechanism that can drift.** The co-location that was already real
(same repo, same language, same type system) was being underused. The refactor
made the sharing mechanical instead of aspirational.

## The rule (draft text, DevArch-style)

> **Co-Located Wire-Type Sharing.** When a client and a server share a wire
> protocol and live in the same repository under the same typed language, they
> MUST share the protocol's type definitions via direct import — not through
> duplication, hand-synchronized interfaces, runtime JSON schemas, or codegen.
>
> **Why:** Protocol drift between co-located client and server is mechanically
> preventable. A direct import makes a server-side type change either compile
> the client in the same commit or fail `tsc --noEmit` in the same commit. Any
> weaker coupling — two files that "stay in sync," a codegen step, an OpenAPI
> intermediary — introduces a window in which one side is wrong and CI doesn't
> know.
>
> **How to apply:**
> - Identify wire primitives (message envelopes, event shapes, discriminators,
>   enums) and extract them into a file with a documented invariant: **no
>   runtime-specific types** (no `Buffer`, no `fs.Stats`, no `DOMException`).
>   Both sides must be able to import the file without dragging in a runtime
>   they don't have.
> - Both the client and the server import from that file. No re-declaration.
>   No re-export chains that could diverge. No "I'll keep these in sync."
> - If the client and server live in separate tsconfig projects, wire the
>   project references or path aliases so a single build step checks both.
> - Do NOT apply this rule across repository boundaries (use a schema format
>   there), across language boundaries (use codegen there), or to external-SDK
>   public protocols where explicit versioning is the point.

## Anti-patterns this catches

- Two files `client/types.ts` and `server/types.ts` defining the same `Message`
  discriminated union that slowly drift.
- `any`-typed WebSocket handlers on the client because "the types live on the
  server side and we didn't want to copy them."
- A `protocol.md` treated as source of truth with hand-maintained TS interfaces
  on both client and server.
- A codegen pipeline that translates one TS file into another TS file in the
  same repo for no reason other than "keeping them separate feels clean."

## What the rule does not say

- It does not say client and server must share *implementation* — only types.
- It does not say tests must share fixtures.
- It does not say the client must live under the server's tree, only that type
  imports cross the boundary directly once they're co-located.
- It does not forbid schema-based protocols (OpenAPI, Protocol Buffers) in
  general — only when both sides are the same typed language in the same repo.

## Edge cases worth enumerating in the rule

- **Runtime type contamination.** The motivating incident. A shared wire file
  with a Node-only type in it silently broke the client. Sub-invariant:
  shared wire types must be runtime-neutral.
- **Client-only serialization quirks.** Sometimes the client receives a JSON
  payload that contains fields the server sends but the client handles
  differently (e.g., timestamp as ISO string vs. Date object). These are not
  type-level differences; they're parse-time concerns. The rule still applies;
  the type is still `string`, and the Date is a local derivation.
- **Build-time type erasure.** Both sides erase TS types at build time. The
  shared import is a compile-time coupling, not a runtime one. No bundler
  surprise: the wire file emits zero bytes into either runtime.

## Sizing

Fits in the same structural family as the Boundary Statement rule (one
paragraph of rule, a Why line, a How to apply line, a short "when it doesn't
apply" note). Probably 15–25 lines at rule-density.

## Questions for the DevArch session

1. Is this one rule, or two (the import mechanic AND the runtime-neutrality
   sub-invariant)? Leaning one, with the sub-invariant in the How-to-apply.
2. Does DevArch want to name a fixup path? ("If you find duplicate wire types
   during a session, extract them and update both sides in one commit.")
3. Should the rule include an enforcement hook suggestion (e.g., a grep check
   for `Buffer|fs\.|process\.` inside files named `wire/` or `protocol/`) or
   stay rule-only?

## Priority

Not urgent. This is a capture-while-fresh exercise, motivated by one real
incident plus the observation that the same pattern will recur wherever a repo
has co-located TS client + TS server sharing a WebSocket or HTTP protocol.
