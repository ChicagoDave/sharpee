# Test stories

These stories exist only as test targets.

- Five rooms at most. A story that needs more is two stories.
- Never published, never a sample, never a design input for the language.
- Written by Claude under David's grant of 2026-11-11, which covers these stories only.
- No decision-record references in a story's content, comments included.
- Each story has a `<story-id>.test-set.md` listing what it must let the tests prove.
- A story is regenerated only when its test set changes or on a deliberate fresh-stories pass. A normal test run uses the committed story.
- Regression here is a test set's pass history: a set that passed and now fails.
- A plan that adds a Chord error compiles this directory in its census, beside `stories/` and `branch-stories/`.
- The transcript harness never reads this directory; these are tree stories.

## The stories

| Story | Rooms | What it is for | Read by |
|---|---|---|---|
| `lodge` | 5 | every kind of claim and every verdict, walked through the real engine | `packages/branch-tester/tests/claims-real-path.test.ts`, `claims-fragment.test.ts` |
| `bazaar` | 3 | a claim whose set is padded with things that cannot bear on it | `packages/branch-tester/tests/claims-cone-acceptance.test.ts` |
| `ferry` | 4 | what `sharpee test` prints around a forked tree: the claims tier, a lock, and two one-line edits that break it | `packages/devkit/tests/test-claims.test.ts`, `claim-broken.test.ts`; `tools/ide/web/testing-surface/tests/claims-real-path.test.ts` |
| `orchard` | 5 | the author narrative's beats: derived rule rows, three endings, a three-way fork, seeded authoring mistakes | `scripts/__tests__/narrative-*.test.ts`; `tools/ide/web/testing-surface/tests/derived-real-path.test.ts`, `line-verdict.test.ts` |

A test finds this directory through its package's test configuration, never by walking up from its own file, so a published package with no test stories skips those tests.

## Changing a story

Change the test set first. Then change the story, run the tests that read it once, and re-record the values they pin (depths, witness paths, state counts). A story's tree is written through branch-tester's canonical writer, and a lock through `sharpee claim`, so the commit gate on test trees and claim fragments passes.
