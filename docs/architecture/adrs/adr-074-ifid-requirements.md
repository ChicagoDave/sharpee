# ADR-074: IFID Requirements

**Status:** Accepted
**Date:** 2025-12-27
**References:** [Treaty of Babel](https://babel.ifarchive.org/babel.html)

## Context

The Interactive Fiction community has established a standard for uniquely identifying IF works called IFID (Interactive Fiction Identifier), defined in the Treaty of Babel. IFIDs enable:

- Cataloging and archiving (IFDB, IF Archive)
- Saved game association with specific works
- Bibliographic metadata exchange
- Tooling interoperability across platforms

As Sharpee matures, stories need proper IFID support to participate in the IF ecosystem.

## Decision

Sharpee will require every story to declare an IFID and will embed it in compiled output following Treaty of Babel conventions.

## IFID Format

Per the Treaty of Babel specification:

- **Length**: 8 to 63 characters
- **Characters**: Uppercase letters (A-Z), digits (0-9), and hyphens (-)
- **Recommended**: UUID format (ISO/IEC 11578:1996), uppercase

Example: `1974A053-7DB0-4103-93A1-767C1382C0B7`

## Story Configuration

### Package.json Declaration

Stories declare their IFID in `package.json`:

```json
{
  "name": "@sharpee/story-dungeo",
  "version": "1.0.0",
  "sharpee": {
    "ifid": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
    "title": "DUNGEO",
    "author": "Dave Cornelson",
    "firstPublished": "2025"
  }
}
```

### Required Metadata

| Field | Description |
|-------|-------------|
| `ifid` | The story's unique IFID (required) |
| `title` | Story title for bibliographic records |
| `author` | Author name(s) |
| `firstPublished` | Year of first publication |

### Optional Metadata

| Field | Description |
|-------|-------------|
| `headline` | Brief tagline (e.g., "An Interactive Fiction") |
| `genre` | Genre classification |
| `description` | Story blurb |
| `language` | Primary language code (e.g., "en") |
| `series` | Series name if part of a series |
| `seriesNumber` | Number in series |
| `forgiveness` | Zarfian forgiveness scale |

## IFID Generation

### New Stories

The Sharpee CLI provides an IFID generation command:

```bash
# Generate a new UUID-format IFID
sharpee ifid generate

# Output: A1B2C3D4-E5F6-7890-ABCD-EF1234567890
```

This uses `crypto.randomUUID()` with uppercase transformation.

### Implementation

```typescript
function generateIfid(): string {
  return crypto.randomUUID().toUpperCase();
}

function validateIfid(ifid: string): boolean {
  const pattern = /^[A-Z0-9-]{8,63}$/;
  return pattern.test(ifid);
}
```

## IFID Lifecycle Rules

Following Treaty of Babel conventions:

| Scenario | IFID Action |
|----------|-------------|
| Bug fix release | Keep same IFID |
| Content update (same story) | Keep same IFID |
| Translation to another language | New IFID |
| Port to different platform | New IFID |
| Sequel or spinoff | New IFID |
| Major revision (different work) | New IFID |

The IFID identifies the **work**, not a specific build or version.

## Build Output

### Sharpee Format

When compiling stories, Sharpee embeds the IFID in the output bundle:

```json
{
  "sharpee": {
    "version": "1.0.0",
    "ifid": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
    "title": "DUNGEO",
    "author": "Dave Cornelson",
    "compiled": "2025-12-27T10:30:00Z"
  },
  "story": { ... }
}
```

### HTML Output

For web-based platforms, include in HTML head:

```html
<meta property="ifiction:ifid" content="A1B2C3D4-E5F6-7890-ABCD-EF1234567890">
```

### iFiction (XML) Export

Sharpee can generate Treaty of Babel compliant iFiction records:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ifindex version="1.0" xmlns="http://babel.ifarchive.org/protocol/iFiction/">
  <story>
    <identification>
      <ifid>A1B2C3D4-E5F6-7890-ABCD-EF1234567890</ifid>
      <format>sharpee</format>
    </identification>
    <bibliographic>
      <title>DUNGEO</title>
      <author>Dave Cornelson</author>
      <firstpublished>2025</firstpublished>
      <language>en</language>
    </bibliographic>
  </story>
</ifindex>
```

## Engine API

### Story Interface

```typescript
interface StoryMetadata {
  ifid: string;
  title: string;
  author: string;
  firstPublished?: string;
  headline?: string;
  genre?: string;
  description?: string;
  language?: string;
}

interface Story {
  metadata: StoryMetadata;
  // ... other story properties
}
```

### Runtime Access

```typescript
// Get IFID at runtime
const ifid = engine.getStoryMetadata().ifid;

// Use in save files
const saveData = {
  ifid: engine.getStoryMetadata().ifid,
  version: engine.getStoryMetadata().version,
  state: engine.serialize()
};
```

## Validation

### Build-Time Checks

The build process validates:

1. IFID is present in story config
2. IFID matches format requirements (8-63 chars, valid characters)
3. IFID is uppercase (warn if not, auto-convert)

```typescript
function validateStoryConfig(config: StoryConfig): ValidationResult {
  if (!config.sharpee?.ifid) {
    return { valid: false, error: 'Missing IFID in sharpee config' };
  }

  if (!validateIfid(config.sharpee.ifid)) {
    return { valid: false, error: 'Invalid IFID format' };
  }

  return { valid: true };
}
```

### CLI Warnings

```
$ sharpee build

⚠ Warning: IFID contains lowercase letters, converting to uppercase
  Before: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  After:  A1B2C3D4-E5F6-7890-ABCD-EF1234567890

✓ Story compiled successfully
```

## Save File Association

Save files include the IFID to ensure they're loaded with the correct story:

```typescript
interface SaveFile {
  ifid: string;        // Story IFID
  created: string;     // ISO timestamp
  turnCount: number;
  state: SerializedState;
}

function loadSave(save: SaveFile, story: Story): void {
  if (save.ifid !== story.metadata.ifid) {
    throw new Error(
      `Save file is for different story (IFID: ${save.ifid})`
    );
  }
  // Load state...
}
```

## Implementation Plan

### Phase 1: Core Support
- [ ] Add `sharpee` config section to story package.json schema
- [ ] Implement `validateIfid()` function
- [ ] Add `sharpee ifid generate` CLI command
- [ ] Validate IFID at build time

### Phase 2: Output Integration
- [ ] Embed IFID in compiled story bundles
- [ ] Add HTML meta tag for web platforms
- [ ] Generate iFiction XML on demand

### Phase 3: Save System
- [ ] Include IFID in save files
- [ ] Validate IFID on save load
- [ ] Warn on IFID mismatch

## Consequences

### Positive

- Stories integrate with IF ecosystem (IFDB, IF Archive)
- Save files reliably associated with correct story
- Enables future tooling (cover art, bibliographic exchange)
- Professional presentation in catalogs

### Negative

- Additional required metadata for story authors
- Authors must understand IFID lifecycle rules
- Potential confusion if IFID rules violated

### Mitigations

- CLI generates IFIDs automatically
- Clear error messages explain requirements
- Documentation includes examples

## References

- [Treaty of Babel](https://babel.ifarchive.org/babel.html)
- [IFDB](https://ifdb.org/) - Uses IFIDs for story identification
- [IF Archive](https://ifarchive.org/) - Community archive
- ADR-033: Save/Restore Architecture
