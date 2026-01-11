# Work Summary: Mainframe Zork Scoring Audit

## Date: 2026-01-11

## Summary

Decoded the FORTRAN DINDX.DAT data file to extract complete treasure point values (OFVAL/OTVAL) and room values (RVAL). Identified all 32 treasures and their correct point values. Compared with Dungeo implementation and documented discrepancies.

## Key Findings

### Scoring Formula Decoded
- **MXSCOR = 616** = OFVAL(260) + OTVAL(231) + RVAL(115) + LTSHFT(10)
- **EGMXSC = 100** = Endgame room visit points (separate score)

### Scoring Components
1. **OFVAL** - Points for first-time treasure acquisition (260 pts)
2. **OTVAL** - Bonus points when treasure placed in trophy case (231 pts)
3. **RVAL** - Points for visiting 7 special rooms (115 pts)
4. **LTSHFT** - Light shaft puzzle bonus (10 pts)

### Unknown Objects Identified
Decoded DTEXT.DAT to identify treasure names:
- Obj 6: Jade Figurine (10 pts)
- Obj 27: Pearl Necklace (14 pts)
- Obj 31: Ruby (23 pts)
- Obj 32: Crystal Trident (15 pts)
- Obj 37: Sapphire Bracelet (8 pts)
- Obj 43: Grail (7 pts)
- Obj 60: Painting (11 pts)
- Obj 95: Large Emerald (15 pts)
- Obj 108: Crown (25 pts)
- Obj 118: Stamp (14 pts)

### Dungeo Issues Found
1. Wrong max score (shows 716, should be 616)
2. Missing 5 treasures (85 pts)
3. Wrong treasure values (~88 pts)
4. No room points system (115 pts)
5. No LTSHFT bonus (10 pts)

## Files Created

### Reference Documents
- `docs/dungeon-ref/complete-scoring.md` - Full FORTRAN scoring reference
- `docs/dungeon-ref/decode-otval.js` - Script to extract OTVAL values
- `docs/dungeon-ref/analyze-scoring.js` - Script to analyze scoring breakdown
- `docs/dungeon-ref/treasure-values.md` - Auto-generated treasure table

### Work Documents
- `docs/work/dungeo/scoring-audit.md` - Comparison with Dungeo implementation
- `docs/work/dungeo/scoring-fix-plan.md` - Plan to fix scoring (TABLED)

## Status

Audit complete. Scoring fix plan written and tabled while working on parser regression/transcript tests.

## Next Steps

1. Continue with transcript testing (parser regression)
2. Return to scoring fixes after parser work complete
