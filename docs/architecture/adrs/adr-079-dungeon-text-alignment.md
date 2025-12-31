# ADR-079: Dungeon Text Alignment

## Status
Accepted

## Context

We have successfully decoded all 1191 messages from the original Dungeon 3.0A FORTRAN source into `docs/dungeon-ref/dungeon-messages.txt`. This provides authoritative reference text for room descriptions, object descriptions, action responses, and puzzle messages.

Currently, Dungeo text was written from memory, secondary sources, and reasonable guesses. While functional, this may diverge from the original game's prose style and specific wording.

## Decision

**All Dungeo text should be squared with `dungeon-messages.txt` where possible.**

### Approach

1. **Room Descriptions**: Match original LDESC (long) and SDESC (short) descriptions
2. **Object Descriptions**: Match original object text
3. **Action Responses**: Use original messages for standard responses (can't go that way, too dark, etc.)
4. **Puzzle Text**: Exact match for puzzle-critical text (trivia questions, Inside Mirror, etc.)

### Implementation Priority

1. **High**: Endgame rooms and puzzles (currently being implemented)
2. **High**: Trivia questions and answers (must be exact for gameplay)
3. **Medium**: Existing room descriptions (audit and update)
4. **Low**: Common action responses (already functional)

### Decoder Reference

```bash
# Find specific message by number
node docs/dungeon-ref/decode-text.js 770

# Export all messages (regenerate if needed)
node docs/dungeon-ref/decode-text.js --export

# Search for text (use grep on output)
grep -i "mirror" docs/dungeon-ref/dungeon-messages.txt
```

### Message Mapping

Document the mapping between Sharpee message IDs and Dungeon message numbers in comments or a separate reference file when aligning text.

Example:
```typescript
// Dungeon message #688
'inside-mirror.description': 'You are inside a rectangular box...'
```

## Consequences

### Positive
- Authentic gameplay experience matching original Dungeon
- Authoritative source for ambiguous or forgotten text
- Consistent prose style throughout

### Negative
- Requires audit of existing text (time investment)
- Some text may need adaptation for Sharpee's event system
- Original text sometimes has typos or awkward phrasing

### Neutral
- `docs/dungeon-ref/` remains gitignored (reference only, not shipped)
- Minor prose adaptations acceptable where Sharpee mechanics differ

## References

- `docs/dungeon-ref/decode-text.js` - Decoder tool
- `docs/dungeon-ref/dungeon-messages.txt` - All 1191 decoded messages
- `docs/work/dungeo/context/2025-12-31-0745-dtext-decoder.md` - Decoder work summary
