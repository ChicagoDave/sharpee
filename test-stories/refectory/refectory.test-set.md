# Test set: refectory

**Carries**: OB-62 to OB-64
**Read by**: `scripts/__tests__/forms-real-path.test.ts` (OB-62, OB-63, through the CLI bundle); the World Index tests in both Chord Writer heads (OB-64, once they land)
**Seed**: 42

## Obligations

- OB-62: a thing declared `plural` with a plural alias answers to the singular of each, worked out by the language's rule: `examine candle` and `examine pricket` print the candles' description, as `examine candles` and `examine prickets` do.
- OB-63: a thing declared `singular of mice` answers to the plural its author wrote: `examine mice` prints the mouse's description, as `examine mouse` does.
- OB-64: the composed story's World Index lists each thing's forms and where each came from: the candles' `candle` and their alias's `pricket` as worked out, and the mouse's `mice` as written.

## What the story's parts are for

- The candles, also called prickets: the plural thing whose singular and whose alias's singular are worked out (OB-62, OB-64).
- The mouse: the singular thing whose plural is written, because no rule gives `mice` (OB-63, OB-64).
- One room, because nothing here needs a second.
