# Session Summary: 2026-01-22 - dungeo

## Status: In Progress

## Goals
- Create website scaffold for sharpee.net marketing site
- Fix npm publishing workflow to properly handle workspace dependencies
- Create CLI commands for story authors (init, build)

## Completed

### 1. Website Scaffold (sharpee.net)

**Commit**: d7ae11a "feat: Add Astro website scaffold for sharpee.net"

Created a complete Astro-based marketing website with:

**Core Infrastructure**:
- Astro 5.1.4 with TypeScript and Tailwind CSS
- Three content collections with Zod schemas:
  - `docs/` - Documentation pages with sidebar ordering
  - `demos/` - Interactive demos with cover images
  - `games/` - Published games with author info

**Layouts**:
- `BaseLayout.astro` - Base template with navigation, footer, responsive design
- `DocsLayout.astro` - Documentation with automatic sidebar from collection

**Components**:
- `Navigation.astro` - Site header with mobile-friendly nav
- `Footer.astro` - Site footer with links and social icons
- `GameCard.astro` - Visual card for games gallery
- `DocsSidebar.astro` - Auto-generated navigation from docs collection

**Pages**:
- `index.astro` - Homepage with hero, features, CTA
- `docs/[...slug].astro` - Dynamic docs routing with TOC
- `demos.astro` - Demos gallery with cards
- `games.astro` - Published games showcase

**Sample Content**:
- Getting Started: Installation guide, quick start, core concepts
- Author Guide: Story structure, grammar, actions
- Dungeo demo entry (placeholder for interactive demo)

**Design**:
- Clean, modern UI with Tailwind utilities
- Responsive layout (mobile, tablet, desktop)
- Accessible navigation and semantic HTML
- Ready for content expansion

### 2. npm Publishing Fix

**Issue**: `npm publish` doesn't resolve `workspace:*` dependencies, causing broken packages on npm.

**Solution**: Updated `scripts/publish-npm.sh`:
- Changed from `npm publish` to `pnpm publish`
- Added `--tag beta` for prerelease versions (format: X.Y.Z-beta.YYYYMMDD.HHMM)
- pnpm automatically converts `workspace:*` to actual version numbers during pack/publish

**Result**: Future publishes will have correct dependency versions in package.json on npm registry.

### 3. CLI Commands for Story Authors (Partial)

**Goal**: Make it easy for authors to start new projects and deploy to web.

**Templates Created** (`packages/sharpee/templates/`):

Browser client template:
- `browser/index.html` - Web UI with command input, output display, status bar
- `browser/styles.css` - Clean, readable styling with dark theme
- `browser/browser-entry.ts.template` - Client initialization with story name variable

Story template:
- `story/index.ts.template` - Basic story structure with metadata and starter room
- `story/package.json.template` - Dependencies and scripts
- `story/tsconfig.json.template` - TypeScript configuration

**CLI Commands Created** (`packages/sharpee/src/cli/`):

1. **init.ts** - `sharpee init <story-name>`
   - Creates new story project from template
   - Sets up package.json, tsconfig.json, src/ structure
   - Initializes with basic room and empty grammar/worldmodel

2. **init-browser.ts** - `sharpee init-browser`
   - Adds browser client to existing story project
   - Creates browser/ directory from template
   - Replaces story name variables in templates

3. **build-browser.ts** - `sharpee build-browser`
   - Bundles story for web deployment using esbuild
   - Outputs to dist/web/ with all assets
   - Minified, production-ready build

**Updated**: `packages/sharpee/src/cli/index.ts` to register new commands.

## Key Decisions

### 1. Astro for Website

**Rationale**:
- Content collections perfect for docs, demos, games
- Fast static generation with optional dynamic routes
- Component-based architecture (like React but simpler)
- Excellent DX with TypeScript and Tailwind
- Low JavaScript footprint (ships minimal client JS)

### 2. Separate Browser Template from Stories

**Rationale**:
- Browser client is optional - authors might want terminal-only
- Easier to maintain browser UI separately from game logic
- Authors can customize browser UI without touching story code
- `init-browser` command adds it when needed

### 3. Templates in sharpee Package

**Rationale**:
- CLI is in `@sharpee/sharpee` package
- Templates need to be distributed with CLI for `sharpee init` to work
- Alternative (separate package) adds complexity
- Templates are lightweight text files

## Open Items

### Short Term

**Must complete before CLI is usable**:

1. **Package Configuration**:
   - [ ] Update `packages/sharpee/package.json` to include templates in `files` array
   - [ ] Ensure templates are included in npm package

2. **Build Integration**:
   - [ ] Update `scripts/build-client.sh` to use templates from `@sharpee/sharpee/templates`
   - [ ] Test that dungeo web build still works with new structure

3. **Testing**:
   - [ ] Build sharpee package: `pnpm --filter '@sharpee/sharpee' build`
   - [ ] Test `sharpee init my-story` command
   - [ ] Test `sharpee init-browser` in new story directory
   - [ ] Test `sharpee build-browser` produces working web bundle
   - [ ] Verify generated story runs in browser

4. **Documentation**:
   - [ ] Update Cloak of Darkness tutorial with baby steps using CLI
   - [ ] Document all CLI commands in README or website docs
   - [ ] Add examples of template customization

### Long Term

**Website Content**:
- [ ] Add interactive Dungeo demo (embed browser client)
- [ ] Write comprehensive author guide sections
- [ ] Create video tutorials
- [ ] Add community showcase (user-submitted games)
- [ ] Set up analytics and feedback mechanisms

**CLI Enhancements**:
- [ ] `sharpee test` - Run transcripts
- [ ] `sharpee play` - Interactive testing
- [ ] `sharpee deploy` - Deploy to itch.io, GitHub Pages, etc.
- [ ] Project templates for common game genres

**Platform Features**:
- [ ] Save/restore in browser (localStorage)
- [ ] Mobile-optimized browser client
- [ ] Electron desktop client template
- [ ] Progressive Web App (PWA) support

## Files Modified

**Website** (28 files created):
- `website/package.json` - Project configuration
- `website/tsconfig.json` - TypeScript config
- `website/tailwind.config.mjs` - Tailwind configuration
- `website/astro.config.mjs` - Astro configuration
- `website/src/layouts/BaseLayout.astro` - Base page template
- `website/src/layouts/DocsLayout.astro` - Documentation template
- `website/src/components/Navigation.astro` - Site header
- `website/src/components/Footer.astro` - Site footer
- `website/src/components/GameCard.astro` - Game display card
- `website/src/components/DocsSidebar.astro` - Docs navigation
- `website/src/pages/index.astro` - Homepage
- `website/src/pages/demos.astro` - Demos gallery
- `website/src/pages/games.astro` - Games showcase
- `website/src/pages/docs/[...slug].astro` - Dynamic docs routing
- `website/src/content/config.ts` - Content collection schemas
- `website/src/content/docs/getting-started/*.md` (3 files)
- `website/src/content/docs/author-guide/*.md` (3 files)
- `website/src/content/demos/dungeo.md` - Sample demo entry
- `website/.gitignore` - Astro ignores

**Templates** (6 files created):
- `packages/sharpee/templates/browser/index.html` - Web UI
- `packages/sharpee/templates/browser/styles.css` - Browser styling
- `packages/sharpee/templates/browser/browser-entry.ts.template` - Client code
- `packages/sharpee/templates/story/index.ts.template` - Story scaffold
- `packages/sharpee/templates/story/package.json.template` - Story package
- `packages/sharpee/templates/story/tsconfig.json.template` - Story config

**CLI** (4 files created/modified):
- `packages/sharpee/src/cli/init.ts` - New story command
- `packages/sharpee/src/cli/init-browser.ts` - Add browser command
- `packages/sharpee/src/cli/build-browser.ts` - Build for web command
- `packages/sharpee/src/cli/index.ts` - Register commands

**Scripts** (1 file modified):
- `scripts/publish-npm.sh` - Use pnpm publish instead of npm

## Architectural Notes

### Template System Pattern

Templates use simple string replacement with `{{STORY_NAME}}` placeholders:
- Keeps templates readable and easy to maintain
- No complex templating engine needed
- Works well for small number of variables
- Future: Could upgrade to handlebars/mustache if complexity grows

### CLI Command Structure

Following established pattern from transcript-tester:
- Each command in separate file
- Exports `register(program: Command)` function
- Main CLI imports and calls register functions
- Clean separation of concerns

### Website Content Collections

Astro content collections provide:
- Type-safe frontmatter with Zod schemas
- Automatic routing from file structure
- Build-time validation of content
- Easy to query and filter in components

Pattern works well for:
- Documentation (hierarchical with ordering)
- Demos (featured content with metadata)
- Games (showcase with author info)

### Build System Integration

Current approach for browser builds:
1. Story builds to `dist/` (TypeScript → JavaScript)
2. `build-browser` bundles story + browser client with esbuild
3. Output to `dist/web/` with all assets

This keeps story compilation separate from web bundling, allowing:
- Terminal-only stories (no browser build needed)
- Different deployment targets (browser, Electron, mobile)
- Faster iteration (rebuild only what changed)

## Notes

**Session duration**: ~3 hours

**Approach**: Bottom-up implementation - built all pieces before integration testing. Next session must focus on integration and testing the complete workflow.

**Key Learning**: npm publish doesn't handle workspace dependencies correctly - must use pnpm publish for monorepo packages. This was blocking proper npm releases.

**Next Session Start**:
1. Read this summary
2. Update package.json files array
3. Test complete CLI workflow (init → build → deploy)
4. Fix any issues discovered during testing

---

**Progressive update**: Session paused 2026-01-22 17:55 - CLI commands created but not tested
