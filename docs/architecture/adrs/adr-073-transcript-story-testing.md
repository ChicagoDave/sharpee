# ADR-073: Transcript-Based Story Testing

**Status:** Accepted
**Date:** 2025-12-27
**Replaces:** ADR-056

## Context

Story authors need a simple way to test their interactive fiction games. The previous approach (ADR-056) proposed a complex TypeScript DSL with world builders, expectation checkers, and extensive infrastructure. This was overkill for the primary use case: verifying that a sequence of commands produces expected output.

Interactive fiction has a long tradition of transcript-based testing, where authors write scripts of commands and annotate expected results. This approach is:
- Easy to write and read
- Requires no programming knowledge
- Can be created by playing the game and annotating output
- Serves as documentation of gameplay

## Decision

Implement a simple transcript-based testing system using `.transcript` files.

## Format Specification

### Basic Structure

```
# Comment lines start with hash
# Test metadata uses YAML-style headers

title: Basic Mailbox Interaction
story: dungeo
author: Test Author

---

> look
West of House
You are standing in an open field west of a white house, with a boarded front door.
[OK]

> open mailbox
You open the small mailbox, revealing a leaflet.
[OK]

> inventory
You are carrying nothing.
[OK]
```

### Elements

| Element | Description |
|---------|-------------|
| `# text` | Comment (ignored by runner) |
| `title:` | Test name (in header) |
| `story:` | Story package to load |
| `---` | Separator between header and commands |
| `> command` | Player input |
| Output lines | Expected output (between command and tag) |
| `[OK]` | Output matches exactly |
| `[OK: contains "X"]` | Output must contain string X |
| `[OK: matches /regex/]` | Output must match regex |
| `[FAIL: reason]` | Known failure, document why |
| `[SKIP]` | Run command but don't verify output |
| `[TODO: note]` | Test not yet implemented |

### Output Matching

**Exact match (default):**
```
> look
West of House
You are standing in an open field west of a white house.
[OK]
```

**Contains match:**
```
> look
[OK: contains "West of House"]
```

**Regex match:**
```
> look
[OK: matches /west of.*house/i]
```

**Multiple conditions:**
```
> look
[OK: contains "West of House"]
[OK: contains "mailbox"]
[OK: not contains "dark"]
```

**Skip output check:**
```
> take all
[SKIP]
```

### Known Failures

Mark tests that document bugs or unimplemented features:

```
> unlock door with key
[FAIL: door unlocking not implemented yet - Issue #42]
```

The runner treats `[FAIL]` as expected - test passes if it fails, fails if it passes.

### Multi-line Output

For exact matching, include all expected lines:

```
> inventory
You are carrying:
  a leaflet
  a brass lantern
[OK]
```

For partial matching, use contains:

```
> inventory
[OK: contains "leaflet"]
[OK: contains "lantern"]
```

### State Verification (Optional)

For testing game state beyond output:

```
> take leaflet
Taken.
[OK]
[STATE: player.inventory contains "leaflet"]
[STATE: mailbox.contents empty]
```

## Runner Implementation

### Command Line

```bash
# Run all transcripts for a story
sharpee test stories/dungeo/tests/

# Run specific transcript
sharpee test stories/dungeo/tests/mailbox.transcript

# Run with verbose output
sharpee test --verbose stories/dungeo/tests/

# Generate transcript from playthrough
sharpee record stories/dungeo --output tests/new-test.transcript
```

### Output Format

```
Running: mailbox.transcript
  > look                      PASS
  > open mailbox              PASS
  > take leaflet              PASS
  > read leaflet              PASS
  > go east                   EXPECTED FAIL (door blocked)

Results: 4 passed, 0 failed, 1 expected failure
```

### Verbose Mode

```
Running: mailbox.transcript

> look
  Expected: West of House
            You are standing in an open field...
  Got:      West of House
            You are standing in an open field...
  Result:   PASS

> open mailbox
  Expected: contains "mailbox"
  Got:      You open the small mailbox, revealing a leaflet.
  Result:   PASS
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed (including expected failures) |
| 1 | One or more tests failed unexpectedly |
| 2 | Transcript parse error |
| 3 | Story failed to load |

## File Organization

```
stories/dungeo/
├── src/
├── tests/
│   ├── transcripts/
│   │   ├── mailbox.transcript
│   │   ├── navigation.transcript
│   │   ├── combat.transcript
│   │   └── full-playthrough.transcript
│   └── unit/
│       └── (traditional vitest tests)
└── package.json
```

## Integration with CI

```yaml
# In package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:story": "sharpee test tests/transcripts/",
    "test:all": "npm run test && npm run test:story"
  }
}
```

## Example Transcripts

### Basic Navigation Test

```
title: White House Navigation
story: dungeo

---

> look
[OK: contains "West of House"]

> n
[OK: contains "North of House"]

> e
[OK: contains "Behind House"]

> s
[OK: contains "South of House"]

> w
[OK: contains "West of House"]
```

### Object Interaction Test

```
title: Mailbox and Leaflet
story: dungeo

---

> x mailbox
[OK: contains "small mailbox"]

> open mailbox
[OK: contains "opening"]
[OK: contains "leaflet"]

> take leaflet
[OK: contains "Taken"]

> read leaflet
[OK: contains "DUNGEO"]
[OK: contains "adventure"]

> i
[OK: contains "leaflet"]
```

### Failure Documentation

```
title: Known Issues
story: dungeo

---

# This documents a bug where the door description is wrong
> x door
[FAIL: should mention "boarded" but currently says "locked" - Issue #15]

# This feature isn't implemented yet
> knock on door
[TODO: knock action not implemented]
```

## Benefits

1. **Simplicity**: No TypeScript knowledge required
2. **Readability**: Transcripts are self-documenting
3. **Playability**: Create tests by playing and annotating
4. **Maintainability**: Easy to update when output changes
5. **CI Integration**: Simple pass/fail for automation
6. **Bug Tracking**: `[FAIL]` tags document known issues

## Drawbacks

1. **Brittle to Output Changes**: Exact matches break when prose changes
2. **Limited State Verification**: Primarily tests output, not internal state
3. **Sequential Only**: Can't test branching scenarios easily
4. **No Randomization**: Can't test random elements

## Mitigations

- Use `contains` and `matches` for flexible matching
- Use `[STATE:]` tags for critical state verification
- Create multiple transcripts for different paths
- Mock random seeds in test mode

## Implementation Plan

### Phase 1: Core Runner
- [ ] Transcript parser
- [ ] Story loader integration
- [ ] Basic output matching (exact, contains)
- [ ] CLI interface

### Phase 2: Enhanced Matching
- [ ] Regex matching
- [ ] Multiple conditions per command
- [ ] State verification tags

### Phase 3: Tooling
- [ ] Record mode (play and generate transcript)
- [ ] VS Code syntax highlighting
- [ ] Diff output on failures

## References

- Inform 7 test scripts
- Infocom's internal testing tools
- ADR-056 (replaced)
