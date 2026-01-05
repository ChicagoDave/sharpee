# Work Summary: Parser Investigation and ADR-087

**Date**: 2026-01-04 19:00
**Branch**: dungeo → action-grammar

## Investigation Summary

Created platform parser test (`packages/parser-en-us/tests/colored-buttons.test.ts`) to investigate why "press blue button" wasn't resolving in the dam puzzle.

### Key Findings

| Command | Result | Notes |
|---------|--------|-------|
| `push blue button` | ✓ SUCCESS | Multi-word noun parsing works! |
| `push blue` | ✓ SUCCESS | Alias matching works |
| `push button` | ✓ SUCCESS | Parses (no parser-level disambiguation) |
| `press blue button` | ✗ FAIL | **No grammar pattern for `press`** |
| `press blue` | ✗ FAIL | **No grammar pattern for `press`** |
| `push the blue button` | ✗ FAIL | Article handling issue |

### Root Cause

The work summary from earlier was **wrong** about multi-word nouns being the problem. The actual issue:

1. `grammar.ts` defines `push :target`, `shove :target`, `move :target`
2. **`press :target` is missing** from grammar patterns
3. `lang-en-us` declares `verbs: ['push', 'press', 'shove']` but this is only for documentation/help text
4. The parser grammar and lang-en-us verb lists are not connected

### Design Issue Identified

The grammar system is **pattern-centric** when it should be **action-centric**:

```typescript
// Current: repetitive, error-prone
grammar.define('push :target').mapsTo('if.action.pushing').build();
grammar.define('shove :target').mapsTo('if.action.pushing').build();
// Forgot press!

// Better: action-centric with verb aliases
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();
```

## ADR-087: Action-Centric Grammar

Drafted `docs/architecture/adrs/adr-087-action-centric-grammar.md` proposing:

1. New `.forAction()` API with `.verbs()` method for aliases
2. `.directions()` method for direction command aliases (`n`/`north`)
3. Three options for verb source (recommended: self-contained with sync test)
4. Backward compatible - existing `.define()` API remains

## Files Created/Modified

- `packages/parser-en-us/tests/colored-buttons.test.ts` - New parser test for colored buttons
- `docs/architecture/adrs/adr-087-action-centric-grammar.md` - New ADR
- `docs/work/dungeo/context/2026-01-04-1900-parser-investigation-adr087.md` - This summary

## Immediate Fix for Dungeo

While ADR-087 is the proper long-term solution, the immediate fix would be to add `press :target` to grammar.ts (platform change). However, the transcript test workaround (`press blue` using alias) works for now.

## Next Steps

1. Review and approve ADR-087
2. Implement action-centric grammar builder
3. Migrate existing grammar definitions
4. Add sync verification test
5. Update dungeo transcript to use `push blue button` once complete
