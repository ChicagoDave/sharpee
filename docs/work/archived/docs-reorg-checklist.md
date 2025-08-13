# Documentation Reorganization Checklist

## Pre-Migration Preparation
- [ ] Create backup of current documentation structure
- [ ] Document current file locations for reference
- [ ] Identify any build scripts or tools that reference documentation paths
- [ ] Review and understand cross-references between documents
- [ ] Create migration tracking spreadsheet

## Phase 1: Create New Directory Structure

### Create Main Structure
- [x] Create `/docs/README.md` as documentation index
- [x] Create `/docs/architecture/` directory
- [x] Create `/docs/architecture/adrs/` subdirectory
- [x] Create `/docs/architecture/design/` subdirectory
- [x] Create `/docs/architecture/patterns/` subdirectory
- [x] Create `/docs/development/` directory
- [x] Create `/docs/development/setup/` subdirectory
- [x] Create `/docs/development/standards/` subdirectory
- [x] Create `/docs/development/guides/` subdirectory
- [x] Create `/docs/api/` directory
- [x] Create `/docs/api/core/` subdirectory
- [x] Create `/docs/api/world-model/` subdirectory
- [x] Create `/docs/api/parser/` subdirectory
- [x] Create `/docs/api/stdlib/` subdirectory
- [x] Create `/docs/packages/` directory
- [x] Create `/docs/packages/core/` subdirectory
- [x] Create `/docs/packages/engine/` subdirectory
- [x] Create `/docs/packages/world-model/` subdirectory
- [x] Create `/docs/packages/parser-en-us/` subdirectory
- [x] Create `/docs/packages/stdlib/` subdirectory
- [x] Create `/docs/features/` directory
- [x] Create `/docs/maintenance/` directory

## Phase 2: Move Architectural Documentation

### Move ADRs
- [x] Move `/decisions/*.md` to `/docs/architecture/adrs/`
- [x] Move `/decisions/core-systems/*.md` to `/docs/architecture/adrs/core-systems/`
- [x] Move `/decisions/outdated/*.md` to `/docs/architecture/adrs/outdated/`
- [x] Move `/decisions/batch/*.md` to `/docs/architecture/adrs/batch/`
- [ ] Update ADR numbering if needed
- [x] Create ADR index in `/docs/architecture/adrs/README.md`
- [ ] Update all ADR cross-references

### Move Design Documentation
- [x] Move `/design/*.md` to `/docs/architecture/design/`
- [x] Move architecture diagrams to `/docs/architecture/design/diagrams/`
- [ ] Move migration checklists to `/docs/architecture/design/migrations/`
- [ ] Create design documentation index

### Extract and Organize Patterns
- [ ] Extract architectural patterns from various documents
- [ ] Create pattern documentation in `/docs/architecture/patterns/`
- [ ] Document event patterns
- [ ] Document entity patterns
- [ ] Document action patterns

## Phase 3: Move Development Documentation

### Setup and CI/CD
- [x] Move `/cicd/quick-start-checklist.md` to `/docs/development/setup/`
- [x] Move `/cicd/setup-guide.md` to `/docs/development/setup/`
- [x] Move `/cicd/workflow-templates.md` to `/docs/development/setup/`
- [x] Create consolidated setup guide
- [ ] Update paths in CI/CD configuration files

### Standards and Guidelines
- [x] Extract coding standards from `/decisions/outdated/`
- [x] Create coding standards document in `/docs/development/standards/`
- [ ] Create testing standards document
- [ ] Create documentation standards document
- [ ] Create commit message guidelines

### Development Guides
- [ ] Create getting started guide
- [ ] Create debugging guide
- [ ] Create testing guide
- [ ] Create deployment guide
- [ ] Move any existing how-to guides

## Phase 4: Move Package Documentation

### Core Package
- [ ] Move `/packages/core/README.md` to `/docs/packages/core/`
- [ ] Move any additional core documentation
- [ ] Create API documentation for core package
- [ ] Update package.json documentation links

### Engine Package
- [ ] Move `/packages/engine/README.md` to `/docs/packages/engine/`
- [ ] Move `/packages/engine/docs/*` to `/docs/packages/engine/`
- [ ] Create comprehensive engine API documentation
- [ ] Document engine lifecycle
- [ ] Document event system

### World Model Package
- [ ] Move `/packages/world-model/README.md` to `/docs/packages/world-model/`
- [ ] Move `/packages/world-model/docs/*` to `/docs/packages/world-model/`
- [ ] Document entity system
- [ ] Document trait system
- [ ] Document relationship system

### Parser Package
- [ ] Move `/packages/parser-en-us/README.md` to `/docs/packages/parser-en-us/`
- [ ] Document parser API
- [ ] Document grammar rules
- [ ] Document extension points

### Standard Library Package
- [ ] Move `/packages/stdlib/README.md` to `/docs/packages/stdlib/`
- [ ] Move `/packages/stdlib/src/actions/migration-guide-adr-041.md`
- [ ] Move `/packages/stdlib/src/validation/README.md`
- [ ] Document all standard actions
- [ ] Document capability system
- [ ] Create action development guide

### Other Packages
- [ ] Move lang-en-us documentation
- [ ] Move text-services documentation
- [ ] Move if-services documentation
- [ ] Move platform packages documentation

## Phase 5: Move Feature and Story Documentation

### Features
- [x] Move `/features/*.md` to `/docs/features/`
- [ ] Organize feature proposals by status
- [ ] Create feature proposal template
- [x] Create feature index

### Stories
- [ ] Keep `/docs/stories/` as is (already organized)
- [ ] Move `/stories/cloak-of-darkness/*.md` to `/docs/stories/cloak-of-darkness/`
- [ ] Move `/stories/secretletter2025/documents/design/*` to `/docs/stories/secretletter2025/`
- [ ] Create story development guide
- [ ] Create story template

## Phase 6: Move Maintenance Documentation

### Cleanup and Fixes
- [x] Move `/cleanup-needed/*.md` to `/docs/maintenance/cleanup/`
- [x] Move `/fix-action-tests/*.md` to `/docs/maintenance/fixes/`
- [ ] Create maintenance task tracker
- [ ] Document common maintenance tasks

### Migration Documentation
- [x] Document dynamic load refactoring
- [ ] Document parser migration
- [ ] Document language provider migration
- [ ] Create migration checklist template

## Phase 7: Review and Archive

### Archive Review
- [ ] Review all files in `/docs/archived/`
- [ ] Identify outdated documentation
- [ ] Move relevant content to appropriate new locations
- [ ] Mark truly outdated content with deprecation notices
- [ ] Consider removing very outdated content

### Content Audit
- [ ] Check for duplicate documentation
- [ ] Consolidate similar documents
- [ ] Identify documentation gaps
- [ ] Create list of needed documentation

## Phase 8: Create Navigation and Indexes

### Main Documentation Index
- [ ] Create comprehensive `/docs/README.md`
- [ ] Add quick start section
- [ ] Add navigation to all major sections
- [ ] Add search tips
- [ ] Add contribution guidelines

### Section Indexes
- [x] Create `/docs/architecture/README.md`
- [x] Create `/docs/development/README.md`
- [x] Create `/docs/api/README.md`
- [x] Create `/docs/packages/README.md`
- [x] Create `/docs/features/README.md`
- [x] Create `/docs/maintenance/README.md`

### Cross-References
- [ ] Update all internal document links
- [ ] Create reference map between old and new locations
- [ ] Add "See also" sections to related documents
- [ ] Create glossary of terms

## Phase 9: Update References

### Code Updates
- [ ] Update documentation links in source code
- [ ] Update README files in packages to link to new docs
- [ ] Update JSDoc/TSDoc comments with new links
- [ ] Update test documentation references

### Configuration Updates
- [ ] Update documentation paths in build scripts
- [ ] Update documentation generation tools
- [ ] Update CI/CD documentation tasks
- [ ] Update IDE configuration files

### External Updates
- [ ] Update root `/README.md` with new documentation structure
- [ ] Update CONTRIBUTING.md with documentation guidelines
- [ ] Update wiki or external documentation if any
- [ ] Update documentation in package.json files

## Phase 10: Cleanup and Validation

### Remove Old Structure
- [x] Delete empty `/decisions/` directory
- [x] Delete empty `/design/` directory
- [x] Delete empty `/cicd/` directory
- [x] Delete empty `/features/` directory
- [x] Delete empty `/cleanup-needed/` directory
- [x] Delete empty `/fix-action-tests/` directory
- [ ] Add .gitkeep files where needed

### Validation
- [ ] Run link checker on all documentation
- [ ] Verify all images and diagrams load correctly
- [ ] Test documentation generation tools
- [ ] Verify search functionality works
- [ ] Check that all code examples are valid

### Final Review
- [ ] Review entire documentation structure
- [ ] Get team feedback on new organization
- [ ] Create documentation style guide
- [ ] Document the reorganization process
- [ ] Create maintenance schedule

## Post-Migration Tasks

### Communication
- [ ] Announce documentation reorganization to team
- [ ] Create migration guide for developers
- [ ] Update onboarding documentation
- [ ] Schedule documentation review meeting

### Monitoring
- [ ] Set up documentation metrics
- [ ] Track documentation usage
- [ ] Gather feedback on new structure
- [ ] Plan regular documentation reviews

### Continuous Improvement
- [ ] Create documentation roadmap
- [ ] Identify automation opportunities
- [ ] Plan documentation sprints
- [ ] Establish documentation ownership

## Success Criteria

- [ ] All documentation accessible from `/docs/`
- [ ] No broken links in documentation
- [ ] Clear navigation structure
- [ ] All packages have comprehensive documentation
- [ ] Search functionality works across all docs
- [ ] Team can easily find needed documentation
- [ ] New developers can onboard using docs alone
- [ ] Documentation stays in sync with code

## Notes

- Consider using documentation generation tools for API docs
- May want to integrate with documentation hosting service
- Consider versioning strategy for documentation
- Plan for documentation translation if needed
- Consider adding documentation tests/validation