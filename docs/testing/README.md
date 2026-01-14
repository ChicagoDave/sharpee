# Playtesting Procedure

This directory contains playtest transcripts and their associated fix documentation.

## File Naming Convention

| File | Purpose |
|------|---------|
| `tr-NNN.txt` | Raw playtest transcript with tester comments |
| `tr-NNN-fixes.md` | Issue analysis and solutions |
| `tr-NNN-{context}.txt` | Supporting files (debug traces, actual Zork output) |

## Transcript Format

Playtest transcripts are raw game output with inline tester comments:

```
> open trap door
The trap door opens.

$ This should show a description of the staircase

> look
...

$ debug-trace: tr-001-entity-resolution.txt
```

### Comment Conventions

| Prefix | Meaning |
|--------|---------|
| `$` | Tester observation or issue note |
| `$ debug-trace: filename.txt` | Debug output saved to separate file |

## Issue Categories

When triaging issues, categorize them as:

| Category | Scope | Examples |
|----------|-------|----------|
| **Platform** | engine/stdlib/world-model | Action bugs, trait behavior, event handling |
| **Map** | Room connections | Missing exits, wrong directions |
| **Puzzle** | Game logic | Dam mechanics, scoring, state |
| **Parser** | Grammar/parsing | Command not recognized |
| **Text** | Language layer | Wrong messages, templates |
| **Client** | Transcript-tester/terminal | Display issues |

## Fix Documentation Template

Each `tr-NNN-fixes.md` should include:

```markdown
# TR-NNN Fixes

**Transcript**: `tr-NNN.txt`
**Date**: YYYY-MM-DD
**Tester**: Name

## Issues Found

### Issue 1: Brief description
**Line**: N
**Category**: Category
**Severity**: High/Medium/Low

**Problem**: What's wrong

**Root Cause**: Why it's wrong (after investigation)

**Fix Location**: File path

**Solution**: How to fix

**Status**: [ ] Open / [x] Fixed

---

## Summary

| Issue | Category | Status |
|-------|----------|--------|
| 1. ... | Category | Open/Fixed |
```

## Workflow

1. **Play session**: Save raw output to `tr-NNN.txt`, add `$` comments for issues
2. **Triage**: Create `tr-NNN-fixes.md` with categorized issues
3. **Investigate**: Add debug traces to `tr-NNN-{context}.txt` files
4. **Fix**: Implement fixes, update status in fixes doc
5. **Verify**: Re-run affected transcript tests

## Running Tests

```bash
# Run specific transcript
node packages/transcript-tester/dist/cli.js stories/dungeo \
  stories/dungeo/tests/transcripts/rug-trapdoor.transcript

# Run all transcripts
node packages/transcript-tester/dist/cli.js stories/dungeo --all

# Interactive play mode
node packages/transcript-tester/dist/cli.js stories/dungeo --play

# With debug events visible
node packages/transcript-tester/dist/cli.js stories/dungeo --play
> /debug
```

## Reference Files

For comparing against canonical Zork behavior, use:
- `docs/dungeon-81/` - Original MDL Zork source
- `tr-NNN-actual.txt` - Captured output from reference implementation
