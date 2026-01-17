# Session Summary: 2026-01-16 20:36 - Browser Client Implementation

## Status: Completed

## Goals
- Implement thin browser client for Dungeo (ADR-105)
- DOS-era Infocom aesthetic (white on blue)
- Test and document issues found

## Completed

### 1. Browser Client Infrastructure

**Created bundle script** (`scripts/bundle-browser.sh`):
- Uses esbuild with `--platform=browser`
- Defines `process.env.*` to avoid Node globals
- Copies HTML template and CSS
- Reports bundle size

**Created HTML template** (`templates/browser/index.html`):
- Minimal shell with game container
- Status line, main window, input area
- Placeholders for story name

**Created Infocom CSS** (`templates/browser/infocom.css`):
- DOS blue background (`#0000aa`)
- Cyan status bar (`#00aaaa`)
- White text, monospace font
- 80-column max width
- Mobile responsive

**Created browser entry point** (`stories/dungeo/src/browser-entry.ts`):
- Initializes WorldModel, Parser, LanguageProvider
- Creates GameEngine and wires events
- Handles command input with history (up/down arrows)
- Updates status line (location, score, turns)
- Added PC speaker beep on errors and score changes

### 2. Platform Compatibility Fixes

**Fixed `packages/core/src/ifid/ifid.ts`**:
- Changed `import { randomUUID } from 'crypto'` to `globalThis.crypto.randomUUID()`
- Works in both Node.js 19+ and browsers

**Fixed `packages/core/src/query/query-manager.ts`**:
- Changed `import { EventEmitter } from 'events'` to `import EventEmitter from 'eventemitter3'`
- Added `eventemitter3` dependency to core package
- Changed `NodeJS.Timeout` to `ReturnType<typeof setTimeout>`

**Fixed bundle script**:
- Added `--define:process.env.PARSER_DEBUG=undefined`
- Added `--define:process.env.DEBUG_PRONOUNS=undefined`
- Added `--define:process.env.NODE_ENV=\"production\"`

### 3. Bundle Results

- **Output**: `dist/web/dungeo/` (index.html, dungeo.js, styles.css)
- **Bundle size**: 1.0 MB uncompressed, **264 KB gzipped**
- **Deployment**: Static files only, no server required

### 4. Issues Found During Testing

Documented 8 issues in `docs/work/issues/issues-list.md`:

| Issue | Description | Severity |
|-------|-------------|----------|
| ISSUE-001 | "get all" / "drop all" fails | Medium |
| ISSUE-002 | "in" doesn't enter through window | Low |
| ISSUE-003 | Window doesn't block passage to Kitchen | Critical |
| ISSUE-004 | "kill troll" not recognized | Critical |
| ISSUE-005 | Text output order wrong | Medium |
| ISSUE-006 | Troll doesn't attack player | Critical |
| ISSUE-007 | `{are}` placeholder not resolved | Medium |
| ISSUE-008 | Disambiguation doesn't list options | Medium |

## Files Created

| File | Purpose |
|------|---------|
| `scripts/bundle-browser.sh` | Browser bundle build script |
| `templates/browser/index.html` | HTML shell template |
| `templates/browser/infocom.css` | DOS-era Infocom styling |
| `stories/dungeo/src/browser-entry.ts` | Browser entry point |
| `docs/work/thinweb/README.md` | Implementation plan |

## Files Modified

| File | Change |
|------|--------|
| `packages/core/src/ifid/ifid.ts` | Use globalThis.crypto |
| `packages/core/src/query/query-manager.ts` | Use eventemitter3 |
| `packages/core/package.json` | Add eventemitter3 dependency |
| `docs/work/issues/issues-list.md` | Added 6 new issues |

## Key Decisions

### 1. Vanilla JS over frameworks
**Decision**: No React/Preact/Svelte - just vanilla JS with existing BrowserClient code.
**Rationale**: IF client is simple (text output, input field, status line). Framework overhead not justified. 264KB gzipped is excellent.

### 2. Static deployment
**Decision**: Pure client-side, no server required.
**Rationale**: Can deploy to any static host (GitHub Pages, public_html, itch.io). Maximum portability.

### 3. PC speaker beep
**Decision**: Added Web Audio API beep for errors (800Hz) and score increases (1000Hz).
**Rationale**: Classic Infocom experience. Square wave for authentic PC speaker sound.

## Testing Notes

Browser client successfully runs Dungeo:
- Room navigation works
- Object interaction works (open, take, read)
- Status line updates correctly
- Lantern/darkness works
- NPC movement visible in logs (thief wandering)

Critical issues found:
- Combat not working ("kill troll" not parsed)
- Window blocking not working (can enter Kitchen without opening)
- Troll NPC passive (doesn't attack)

## Next Steps

1. Fix critical issues (window blocking, combat parsing, troll behavior)
2. Fix medium issues (text ordering, templates, disambiguation)
3. Consider PWA manifest for installability
4. Deploy to public hosting for playtesting

---

**Session duration**: ~2 hours
**Approach**: Implement thin browser client per ADR-105, test via browser, document issues found
