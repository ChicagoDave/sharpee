# Session Summary: 2026-01-22 - dungeo

## Status: Completed

## Goals
- Complete the npx workflow for `@sharpee/sharpee` CLI commands
- Make it easy for authors to create new projects with `npx @sharpee/sharpee init`
- Ensure templates are included in npm package

## Completed

### 1. Fixed Template Publishing
- **Problem**: Templates directory wasn't being included in npm package
- **Solution**: Added `"templates"` to the `files` array in `packages/sharpee/package.json`
- **Impact**: Templates now ship with the package, making `npx @sharpee/sharpee init` work correctly

### 2. Added Non-Interactive Mode
- **Added**: `-y/--yes` flag to `sharpee init` command
- **Purpose**: Enable scripted/automated project creation without prompts
- **Implementation**: `packages/sharpee/src/cli/init.ts`
- **Usage**: `npx @sharpee/sharpee init my-story -y`

### 3. Verified Complete Workflow
Tested the full author experience from zero to web deployment:

```bash
# 1. Create new project (no global install needed)
npx @sharpee/sharpee init my-story -y

# 2. Install dependencies
cd my-story && npm install

# 3. Add browser client support
npx sharpee init-browser

# 4. Build for web deployment
npm run build:browser
```

### 4. Template System Validation
Confirmed all template placeholders work correctly:

**Story Templates** (`packages/sharpee/templates/story/`):
- `index.ts.template` - Basic story with one room
- `package.json.template` - Project config with Sharpee dependency
- `tsconfig.json.template` - TypeScript configuration

**Browser Templates** (`packages/sharpee/templates/browser/`):
- `browser-entry.ts.template` - Browser client entry point
- `index.html` - HTML template with Infocom-style layout
- `styles.css` - Retro terminal styling

**Placeholder Replacement**:
- `{{STORY_ID}}` → kebab-case project name
- `{{STORY_TITLE}}` → Title Case project name
- `{{STORY_DESCRIPTION}}` → Default or user-provided description

### 5. Published to npm
- **Version**: 0.9.53-beta.20260122.1800
- **Package**: `@sharpee/sharpee`
- **Registry**: npm (public)
- **Verified**: `npx @sharpee/sharpee init` works from clean environment

## Key Decisions

### 1. Include Templates in npm Package
**Decision**: Add templates to `files` array in package.json rather than using `.npmignore` exclusions.

**Rationale**: Explicit inclusion is safer than exclusion patterns. Ensures templates always ship with the CLI.

### 2. Support Non-Interactive Mode
**Decision**: Add `-y/--yes` flag for automated project creation.

**Rationale**: Enables testing, CI/CD workflows, and scripted setup. Doesn't complicate the interactive experience.

## Generated Project Structure

When authors run `npx @sharpee/sharpee init my-adventure`, they get:

```
my-adventure/
├── src/
│   ├── index.ts          # Story code with basic room
│   └── browser-entry.ts  # (after init-browser) Browser client
├── browser/              # (after init-browser)
│   ├── index.html        # Customizable HTML template
│   └── styles.css        # Infocom-style CSS
├── package.json          # With @sharpee/sharpee dependency
├── tsconfig.json         # TypeScript configuration
└── .gitignore           # Ignores node_modules, dist/
```

## Open Items

### Short Term
- Document the complete workflow in website tutorials section
- Add more story templates (examples: minimal, multi-room, NPC demo)
- Consider adding `--template` flag to choose between starter templates

### Long Term
- Add `sharpee new` commands for generating rooms, NPCs, regions
- Create template validator to catch placeholder issues before publish
- Add interactive tutorial mode that guides new authors through first story

## Files Modified

**packages/** (2 files):
- `packages/sharpee/package.json` - Added `templates` to files array, version bump to 0.9.53-beta
- `packages/sharpee/src/cli/init.ts` - Added `-y/--yes` flag for non-interactive mode

**Published**:
- Version 0.9.53-beta.20260122.1800 published to npm registry

## Architectural Notes

### CLI Template System
The template system uses a simple placeholder replacement approach:
1. Read template files from `packages/sharpee/templates/`
2. Replace `{{PLACEHOLDER}}` strings with actual values
3. Write files to target directory with `.template` extension removed

**Why this works**: Templates are simple enough that a full templating engine (Handlebars, EJS) would be overkill. The placeholder syntax is obvious and maintainable.

### npx Workflow Benefits
Using `npx` provides zero-install experience:
- No need for global `npm install -g @sharpee/sharpee`
- Always uses latest published version
- Works in CI/CD environments
- Familiar pattern for Node.js developers

### Browser Build Integration
The `init-browser` command integrates with the project's package.json by adding:
- `build:browser` script that runs `sharpee build-browser`
- Browser-specific dependencies (if needed in future)
- Sets up browser/ directory for HTML/CSS customization

This keeps the browser client optional while making it trivial to add.

## Notes

**Session duration**: ~1 hour

**Approach**: Incremental testing of each CLI command, fixing issues as discovered, then end-to-end validation with fresh project creation.

**Testing method**: Used `/tmp/test-sharpee-*` directories to verify npx workflow in clean environments, confirming templates, dependencies, and build process all work correctly.

---

**Progressive update**: Session completed 2026-01-22 18:48
