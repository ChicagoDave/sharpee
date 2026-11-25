# Test set: scullery

**Carries**: OB-54 to OB-61
**Read by**: `packages/branch-tester/tests/examinable-lens-real-path.test.ts` and `packages/devkit/src/commands/lens.test.ts` (the examinable lens's number forms, its refusal, its sources, and the two parts of OB-35 orchard cannot carry); `packages/devkit/tests/test-lens.test.ts` and `tools/ide/web/testing-surface/tests/lens-real-path.test.ts` (the lens tier of `sharpee test`, OB-61). The spike that first read it, `tools/explorer-probe/lens-examinable.js`, was retired 2026-11-23.
**Seed**: 42

## Obligations

- OB-54: a thing with no description of its own is named in a room's prose, and examining it answers with the default response, so the lens reports it as resolved-default. (Moved from orchard's OB-35, 2026-11-22, David's ruling "b".)
- OB-55: the player carries a thing from the start, and its own text is a finding source in every room the walk reaches; its phrases fold into one finding per phrase naming every room. (Moved from orchard's OB-35, 2026-11-22, David's ruling "b".)
- OB-56: a plural thing with a plural alias is named in a room's prose with no article before either word, so only the tagger finds them; both plurals resolve, and the singular of each fails, each reported as a number-form finding naming the form typed, the form that resolved, its sources and the engine's reason.
- OB-57: a thing's own description names a plural with no article and no entity behind it; the lens tries its singular too, and reports the phrase as not in scope, never as a number form, because neither form resolves.
- OB-58: a singular thing that resolves has its plural tried, and the plural's failure is a number-form finding.
- OB-59: nouns in the prose with no entity behind them are reported as not in scope, and one candidate that is extractor noise is typed and settled by the engine as not in scope.
- OB-60: a copy of the story's compiled IR whose language has no noun extractor is refused by the lens in one line naming the language, with a non-zero exit and no walk.
- OB-61: the story has a test tree (`scullery.tests/`, one line: the opening, then north), so `sharpee test --json` runs its tiers on it, the examinable lens's among them; the run exits 0 with lens findings present. (Added 2026-11-23 for the lens tier.)

## What the story's parts are for

- The jars, also called crocks: the plural thing with a plural alias (OB-56), and the thing whose description names a plural with no article (OB-57).
- The whetstone: the thing with no description (OB-54).
- The chore list, carried by the player: the carried thing's text, read in both rooms (OB-55).
- The cheese: the singular thing whose plural is tried (OB-58).
- The shelf, the sink, the window, the drainboard, the wheel, the slate, the beams and the rind: nouns with nothing behind them (OB-59). The chore list's "Scour" is the extractor noise.
- Two rooms, so a carried thing's phrases recur and fold.

## Language migrations

- 2026-11-24, Chord 4.2.0 (ADR-409, session ce3248): every thing and door in the story is declared `singular` or `plural`, as the language now requires. Each block keeps the number it read as before: an undeclared one is now `singular`, and one already `plural` stays `plural`. No obligation moves.
