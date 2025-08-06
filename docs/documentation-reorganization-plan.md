# Documentation Reorganization Plan

## Current State Analysis

Total markdown files found: ~400+ files
Locations: Scattered across multiple directories

## Categorization

### 1. Project Documentation (Root)
- `/README.md` - Main project readme

### 2. Architectural Decision Records (ADRs)
**Location**: `/decisions/`
- 46 ADRs (adr-001 through adr-046)
- Special ADRs in subdirectories:
  - `/decisions/core-systems/` - Core system ADRs
  - `/decisions/outdated/` - Deprecated/outdated documentation
  - `/decisions/batch/` - Code review batch files

### 3. CI/CD Documentation
**Location**: `/cicd/`
- quick-start-checklist.md
- setup-guide.md
- workflow-templates.md

### 4. Design Documentation
**Location**: `/design/`
- Architecture and design documents
- Migration checklists
- Implementation plans

### 5. Main Documentation Hub
**Location**: `/docs/`
- Already organized with subdirectories:
  - `/docs/actions/` - Action system documentation
  - `/docs/archived/` - Archived documentation (large collection)
  - `/docs/design/` - Design documentation
  - `/docs/extensions/` - Extension documentation
  - `/docs/platform/` - Platform documentation
  - `/docs/stdlib/` - Standard library documentation
  - `/docs/stories/` - Story documentation

### 6. Package-Specific Documentation
**Locations**: Various `/packages/*/` directories
- Each package has its own README.md
- Some have additional docs:
  - `/packages/engine/docs/`
  - `/packages/world-model/docs/`
  - `/packages/stdlib/src/actions/migration-guide-adr-041.md`
  - `/packages/stdlib/src/validation/README.md`
  - Test documentation in various test directories

### 7. Story Documentation
**Location**: `/stories/`
- `/stories/cloak-of-darkness/` - Implementation docs
- `/stories/secretletter2025/documents/design/` - Extensive design docs

### 8. Feature Proposals
**Location**: `/features/`
- Feature proposals and enhancements
- Parser enhancement documentation

### 9. Cleanup and Fix Documentation
**Locations**: Various
- `/cleanup-needed/` - Cleanup documentation
- `/fix-action-tests/` - Action test fix documentation

## Proposed Reorganization

### Phase 1: Consolidate into /docs
Move scattered documentation into organized /docs structure:

```
/docs/
├── README.md (Documentation index)
├── architecture/
│   ├── adrs/           (Move from /decisions/)
│   ├── design/         (Move from /design/)
│   └── patterns/       (Extract from various sources)
├── development/
│   ├── setup/          (Move from /cicd/)
│   ├── standards/      (Extract from outdated/)
│   └── guides/         (Various how-tos)
├── api/
│   ├── core/
│   ├── world-model/
│   ├── parser/
│   └── stdlib/
├── packages/           (Package-specific docs)
│   ├── core/
│   ├── engine/
│   ├── world-model/
│   ├── parser-en-us/
│   └── stdlib/
├── stories/            (Keep as is)
├── features/           (Move from /features/)
├── maintenance/        (Move cleanup docs here)
└── archived/           (Keep but review for relevance)
```

### Phase 2: Create Navigation Structure

1. **Main README.md** in /docs with:
   - Quick links to major sections
   - Getting started guide
   - Architecture overview
   - Package documentation links

2. **Section indexes** for each major area:
   - Architecture index with ADR list
   - Package index with links to each package
   - Story/tutorial index

3. **Cross-references** between related documents

### Phase 3: Content Review and Updates

1. **Review archived docs** - Many may be outdated
2. **Update package READMEs** to link to central docs
3. **Consolidate duplicate content**
4. **Update paths** in documents after moves

### Phase 4: Cleanup

1. **Remove empty directories** after moves
2. **Update root README** to point to new doc structure
3. **Add .gitkeep** files where needed
4. **Update any build scripts** that reference docs

## Benefits of Reorganization

1. **Single source of truth** - All docs in /docs
2. **Clear hierarchy** - Easy to find relevant documentation
3. **Better discoverability** - Organized by topic/purpose
4. **Easier maintenance** - Clear where new docs should go
5. **Improved onboarding** - New developers can navigate easily

## Implementation Checklist

- [ ] Create new directory structure in /docs
- [ ] Move ADRs from /decisions to /docs/architecture/adrs
- [ ] Move design docs to /docs/architecture/design
- [ ] Move CI/CD docs to /docs/development/setup
- [ ] Consolidate package docs
- [ ] Review and organize archived content
- [ ] Update all internal links
- [ ] Create navigation indexes
- [ ] Remove old directories
- [ ] Update root README