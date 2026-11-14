# ADR-397: `never` is removed from the claims language

**Status**: **ACCEPTED** (David, 2026-11-14, session 4c0c20: "a", accepting this record with its build plan, `docs/work/adr-397-remove-never-claims/plan.md`, and that plan's two file deletions. Written the same session at his direction: "b", abandon the ADR-396 build and take `never` out of the claims language.)

## Date: 2026-11-14

**Kind**: technical

**Scope**: `packages/chord/src/parser.ts`, `packages/chord/src/ast.ts`, `packages/chord/src/claims.ts`, `packages/chord/src/claims-cone.ts`, `packages/chord/src/version.ts`, `packages/chord/chord.ebnf`, `packages/chord/tests/`, `packages/branch-tester/src/claims/`, `packages/branch-tester/tests/`, `packages/ide-protocol/tests/`, `packages/devkit/tests/`, `packages/transcript-tester/tests/run-event-stream.test.ts`, `packages/ide-protocol/src/run-events.ts`, `packages/devkit/src/commands/`, `tools/ide/web/testing-surface/`, `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js`, `tools/ide/SharpeeIDE/Resources/docs-tab/`, `tools/explorer-probe/necessary/`, `docs/work/chord-manual/chapters.md`, `docs/work/chord-manual/game.md`, `docs/architecture/adrs/adr-365-claims-under-a-necessary-set.md`, `docs/architecture/adrs/adr-367-a-reached-state-can-be-locked-as-a-claim.md`, `docs/architecture/adrs/adr-396-a-never-claim-is-watched-and-searched-not-proven.md`, `test-stories/`, `branch-stories/fernhill/fernhill.claims.chord`, `website/src/app/chord/guide/tooling/claims/`, `website/public/chord.ebnf`, `docs/architecture/chord-grammar-changes.md`

## Supersedes

ADR-396 in full. It was accepted on 2026-11-14 and never built; its Status becomes SUPERSEDED by this record.

ADR-365 wherever it gives a claim a negative form: the `never` head, the violated verdict, D3's "held on exhaustion" for a `never`, and AC-4. ADR-367 D5's sentence about a `never` claim. ADR-365 and ADR-367 otherwise stand for positive claims, and their Status lines do not change; the plan that builds this record lists each passage after reading it and adds a dated note pointing here.

## Context

A claim is an author's statement about what a story can reach, checked by a walk that types only the commands a hand-written necessary set allows (ADR-365).

For a positive claim that is sound. A path the walk finds is a real path in the whole story.

For a `never` it is not, and ADR-396 measured why on 2026-11-14. On `test-stories/lodge`, `never the strongbox leaves the Vault` under `needs verbs: turn, take` reported VIOLATED at depth 7. The same claim with `turn` left out of the list reported `HELD — every reachable state under its set was tried`. One forgotten verb turned a real violation into a green line. The same record lists four restrictions under every such HELD (the author's set, the walker's own vocabulary, the state the identity leaves out, the depth limit), of which the author sees one.

ADR-396 answered by keeping `never` and never calling it held: a watch on every played line and every walk, needs as a search bound, `excluding things:`, a positive twin, a NOT VIOLATED verdict and a second ratio. Its own D6 parked the only thing that would let a `never` say something true about the whole story, which is proof, because the cone that proof needs did not finish on a real story in 20 minutes.

At the first design checkpoint of that build, David ended it (2026-11-14, session 4c0c20): "Our attempt to make 'never' work is going nowhere. We can't measure it and we can't enforce it." The best a `never` could read after six phases was NOT VIOLATED, a statement about what a search happened to cover. Meanwhile the shipped tool still prints HELD for a `never`.

## Decision

**D1. A claims block holds positive claims only.** The `never` head is removed from the claims fragment's grammar. A line headed `never` inside `claims` is a parse error with its own code, whose message says that a claim states something the story can reach and that `never` is not part of the claims language. It carries no decision-record reference.

The `never` line of a character's principles and of `define code` (ADR-318) is a different construct and is not touched.

**D2. A claim has two verdicts: held and unproven.** `'violated'` leaves the verdict on the wire (`ClaimVerdictStatus`, `packages/ide-protocol/src/run-events.ts:504`), the `never` field leaves the claim's row, and the violated count leaves the summary. The stored claim (`IRClaim`, the runner's `Claim`, the JSON declaration) loses its `never` flag. The walk, the runner and the report lose every branch that reads it. The writer and the Testing tab, its one reader, change in the same commit, so the run-event schema version stays 2.

**D3. Messages stop pointing at `never`.** The two `claims.predicate-negated` messages that tell an author to head the claim with `never` (`packages/chord/src/claims.ts:318`, `:351`) say only that a claim states what holds.

**D4. The written `never` claims are deleted.** Nine exist, counted 2026-11-14: two each in the lodge's, the ferry's and Fernhill's fragments, one in the bazaar's, one in devkit's `claims-tier` fixture (`grep -rn -E "^\s*never " … --include=*.claims.chord`), and one in the lexer's golden fixture `packages/chord/tests/fixtures/lexer-golden/chord-4-claims.chord:15`, which that grep's file pattern does not reach and the planner found. Each is removed with its JSON twin, its test-set observations and the pins that read its line. No positive claim is invented to stand in for one. A test that existed only to exercise a `never` is removed; a test that used a `never` to reach something else is rewritten on a positive claim.

**D5. Nothing replaces it.** No Sharpee tool states that something can never happen in a story. GH #722 (can the cone prove a `never`) and GH #723 (the ADR-396 build) are closed as not planned. GH #717 keeps its second half, the walk that cannot type a conversation subject, an answer or `wait`, which matters to positive claims; its first half, about a `never` under a turn clock, goes with the construct.

## Consequences

- **The tool stops printing a verdict it cannot support.** No claim line reads HELD on the strength of an exhausted hand-written set.
- **An author's fragment with a `never` stops compiling.** The parse error names the line. Fernhill's fragment is migrated here; an outside author deletes the claim. The release note says so.
- **The claims summary is one ratio again,** held over declared with an unproven count, on every story.
- **The bazaar's fragment has no claim left** once its one `never` goes, and an empty `claims` block is already refused (`parse.claims-empty`). The plan decides, as test-story content, whether the bazaar gains a positive claim or loses its fragment.
- **The Chord manual's claims chapter describes positive claims and locks only.** It was waiting on ADR-396 to show a `never` on its running example; it no longer waits.
- **The grammar gets smaller.** `chord.ebnf` and its website copy lose the alternative, the EBNF hash is re-recorded, and `docs/architecture/chord-grammar-changes.md` gains a removal row.

## Session

Session 4c0c20, 2026-11-14, on `main`. The ADR-396 plan was marked ABANDONED and archived to `docs/work/archive/adr-396-never-claims/` in the same session, before this record was written.
