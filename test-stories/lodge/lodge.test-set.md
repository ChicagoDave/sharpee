# Test set: lodge

**Carries**: OB-1 to OB-19
**Read by**: `packages/branch-tester/tests/claims-real-path.test.ts`, `packages/branch-tester/tests/claims-fragment.test.ts`
**Seed**: 1209 for the walks; 42 for the tree

## Obligations

- OB-1: an ending claim is held by a witness at a pinned depth; in this story: "the story can be won".
- OB-2: a placement-in-the-player claim is held by witness; "the deed is in hand".
- OB-3: an event claim (a person asked about a topic) is held by witness; "the warden has been asked about the vault".
- OB-4: a declared-state claim is held by witness; "the ledger has been studied".
- OB-5: a `never` placement-not-in-a-room claim is violated, with its witness and depth; "the strongbox leaves the Vault".
- OB-6: a room claim is held by witness; "the Study is reached".
- OB-7: a `never` room claim is held by exhaustion, with no depth and a pinned state count; "the Study is reached without the brandy".
- OB-8: a readable-flag claim is held by witness; "the notice has been read".
- OB-9: a fired-clause claim is held by witness; "the valve has been turned".
- OB-10: an openable-flag claim that was locked from a tree line is held when walked; "the strongbox is open", locked at the main line's sixth turn.
- OB-11: the run's tally of declared, held, violated and unproven is exact.
- OB-12: one walk per distinct set, each named by its set; the first two claims share the declared set.
- OB-13: every walk stops because its claims settled or its frontier was exhausted, never on a budget.
- OB-14: the whole run finishes inside a wall-clock bound.
- OB-15: witness paths are exact for one held and one violated claim; the win and the strongbox's way out.
- OB-16: the things the cone reports inert are pinned per claim, some claims with and some without, each verdict's count equals the cone's, and no witness command names an inert thing; the hand bell.
- OB-17: the tree's manifest names the claims fragment.
- OB-18: the fragment compiles to exactly the claim set the walked test reads; `lodge.claims.chord` against `lodge.claims.json`.
- OB-19: the story compiles to the same IR with or without the fragment, and the IR carries no claim.
