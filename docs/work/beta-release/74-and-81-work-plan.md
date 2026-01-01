# Beta Release Work Plan: ADR-074 + ADR-081

**Branch**: `beta-release`
**Target Version**: `0.9.0-beta.1`
**ADRs**:
- ADR-074: IFID Requirements
- ADR-081: npm Release Strategy

## Overview

Prepare Sharpee for first npm release by implementing IFID support and package publishing infrastructure.

---

## Phase 1: IFID Core (ADR-074)

### 1.1 IFID Validation & Generation

**Location**: `packages/core/src/ifid/`

- [ ] Create `ifid.ts` with:
  ```typescript
  function generateIfid(): string
  function validateIfid(ifid: string): boolean
  ```
- [ ] Export from `@sharpee/core`
- [ ] Unit tests

### 1.2 Story Metadata Interface

**Location**: `packages/core/src/metadata/`

- [ ] Define `StoryMetadata` interface:
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
  ```
- [ ] Add to Story interface in engine

### 1.3 CLI Command

**Location**: `packages/sharpee/src/cli/`

- [ ] Add `sharpee ifid generate` command
- [ ] Add `sharpee ifid validate <ifid>` command

### 1.4 Update Dungeo

**Location**: `stories/dungeo/package.json`

- [ ] Add `sharpee` config section with IFID
- [ ] Generate IFID for Dungeo

---

## Phase 2: Package Preparation (ADR-081)

### 2.1 Package.json Updates

For each package in `packages/`:

| Package | Priority |
|---------|----------|
| core | High |
| world-model | High |
| engine | High |
| stdlib | High |
| parser-en-us | High |
| lang-en-us | High |
| if-domain | High |
| sharpee | High (meta-package) |
| text-services | Medium |
| transcript-tester | Low (dev tool) |

**Required fields for each:**
- [ ] `version`: `0.9.0-beta.1`
- [ ] `description`: Package-specific
- [ ] `main`: `dist/index.js`
- [ ] `module`: `dist/index.mjs`
- [ ] `types`: `dist/index.d.ts`
- [ ] `exports`: Proper ESM/CJS/types
- [ ] `files`: `["dist"]`
- [ ] `publishConfig`: `{ "access": "public" }`
- [ ] `repository`: GitHub link with directory
- [ ] `homepage`: `https://sharpee.dev` or GitHub
- [ ] `bugs`: GitHub issues link
- [ ] `license`: `MIT`
- [ ] `keywords`: IF-related terms

### 2.2 Package READMEs

Create `README.md` for each published package:

- [ ] `@sharpee/sharpee` - Main getting started guide
- [ ] `@sharpee/core` - Core types and utilities
- [ ] `@sharpee/world-model` - Entity system docs
- [ ] `@sharpee/engine` - Game engine usage
- [ ] `@sharpee/stdlib` - Standard library reference
- [ ] `@sharpee/parser-en-us` - Parser configuration
- [ ] `@sharpee/lang-en-us` - Language customization
- [ ] `@sharpee/if-domain` - Grammar builder API

### 2.3 License Files

- [ ] Add `LICENSE` (MIT) to each package
- [ ] Verify dependency licenses are compatible

---

## Phase 3: Build System

### 3.1 esbuild Configuration

**Location**: `scripts/build-npm.sh` or per-package build

- [ ] Configure esbuild for each package:
  - CJS output → `dist/index.js`
  - ESM output → `dist/index.mjs`
- [ ] Generate declaration files → `dist/index.d.ts`
- [ ] Test both output formats work

### 3.2 Build Script

- [ ] Create unified build script for release
- [ ] Ensure proper build order (dependencies first)
- [ ] Verify `dist/` contents are correct

### 3.3 Pack Testing

- [ ] Run `npm pack` on each package
- [ ] Install tarballs in test project
- [ ] Verify imports work correctly

---

## Phase 4: CI/CD (Optional for Beta)

### 4.1 GitHub Actions

**Location**: `.github/workflows/release.yml`

- [ ] Create release workflow triggered by tags
- [ ] Build, test, publish pipeline
- [ ] Configure npm token secret

### 4.2 Changesets (Optional)

- [ ] Install changesets
- [ ] Configure for synchronized versions
- [ ] Set up changeset bot

---

## Phase 5: Documentation

### 5.1 Root README

- [ ] Update main README with npm install instructions
- [ ] Quick start example
- [ ] Link to documentation

### 5.2 Getting Started Guide

**Location**: `docs/getting-started.md`

- [ ] Installation steps
- [ ] First story tutorial
- [ ] Project structure guide

### 5.3 API Documentation (Future)

- [ ] TypeDoc or similar setup
- [ ] Hosted docs site

---

## Phase 6: First Release

### 6.1 Pre-Release Checks

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Pack test succeeds
- [ ] Documentation complete
- [ ] Dungeo has valid IFID

### 6.2 Publish

```bash
# Manual first release
cd packages/core && npm publish --tag beta
cd packages/world-model && npm publish --tag beta
cd packages/if-domain && npm publish --tag beta
cd packages/engine && npm publish --tag beta
cd packages/stdlib && npm publish --tag beta
cd packages/parser-en-us && npm publish --tag beta
cd packages/lang-en-us && npm publish --tag beta
cd packages/sharpee && npm publish --tag beta
```

### 6.3 Post-Release

- [ ] Verify packages on npmjs.com
- [ ] Test installation in fresh project
- [ ] Create GitHub release with changelog
- [ ] Announce (if applicable)

---

## Task Prioritization

### Must Have (Beta Gate)
1. IFID validation/generation
2. Package.json updates for all packages
3. Working build output (CJS/ESM/types)
4. Basic READMEs
5. LICENSE files

### Should Have
1. CLI `sharpee ifid` commands
2. Dungeo IFID configured
3. Getting started guide
4. Root README updated

### Nice to Have
1. GitHub Actions workflow
2. Changesets integration
3. TypeDoc API docs
4. sharpee.dev landing page

---

## Estimated Scope

| Phase | Effort |
|-------|--------|
| Phase 1: IFID Core | Small |
| Phase 2: Package Prep | Medium |
| Phase 3: Build System | Medium |
| Phase 4: CI/CD | Small (defer) |
| Phase 5: Documentation | Medium |
| Phase 6: Release | Small |

**Total**: ~2-3 focused sessions

---

## Dependencies

```
Phase 1 (IFID) ─────────────────────────────────────┐
                                                     │
Phase 2 (Packages) ──────┬───────────────────────────┼──> Phase 6 (Release)
                         │                           │
Phase 3 (Build) ─────────┘                           │
                                                     │
Phase 5 (Docs) ──────────────────────────────────────┘
```

Phase 4 (CI/CD) is independent and can be done post-beta.
