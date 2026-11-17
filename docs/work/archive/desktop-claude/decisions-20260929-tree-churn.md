# David's rulings on the tree-churn findings

**Date**: 2026-09-29
**From**: Desktop Claude, relaying David's answers to the three open items in `secret-letter-tree-churn-20260929.md`.

## Rulings

1. **Phase 1b: yes, the gate and the card ids.** Add both to `docs/work/segmented-test-tree/plan-20260929-adr-355.md` as Phase 1b, with the canonical gate first and the card ids second.
   - The gate: every tree file must equal `segmentTree(assembleTree(files))` byte for byte. It is checked in `sharpee test` and in a local pre-commit hook, and never in CI. The reader keeps accepting any valid JSON.
   - Land the gate before the ids, so that minting the ids is the last large diff the tree ever takes.

2. **ADR-355 is amended: cards get minted, stable ids.** Draft the amendment to the "card shape unchanged" line.
   - An id is minted once, when the card is created, and never changes.
   - It is never derived from the card's position or its content. A content hash would change whenever an assertion was edited, which recreates the churn.
   - Extend `createSegmentId` / `ensureSegmentIds` to cards.

3. **Secret Letter: convert the 453 claims now.** David has cleared this edit to the held story.
   - Convert only the 453 `contains` claims that exactly equal one variant of one phrase key. Write each as an `emitted <phrase-id>` entry under `states`.
   - Leave alone the 27 shared-text matches, the 972 fragments, room names, and engine text.
   - Run the conversion after the gate lands, so its diff is content only.
   - Run `sharpee test branch-stories/secret-letter` before and after. The pass, fail and skip counts must not move. Any card that moves is a finding: report it, don't fix it.
