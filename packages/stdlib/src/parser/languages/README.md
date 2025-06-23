# Language Components for Parser

This directory contains language-specific parsing components that will be migrated to separate language packages in future refactorings.

## Current Status

Most of the language-specific functionality has been moved to the `@sharpee/lang-en-us` package. The remaining components in this directory are tightly coupled to the parser system and will require more extensive refactoring to migrate.

## Migration Plan

1. **Completed**:
   - Text templates → `@sharpee/lang-en-us`
   - Verb definitions → `@sharpee/lang-en-us`
   - Response formatting → `@sharpee/lang-en-us`

2. **In Progress**:
   - Command handlers use language provider system

3. **Future Work**:
   - Refactor parser to use language provider for grammar rules
   - Move tokenization and POS tagging to language package
   - Create clean interface for language-specific parsing

## Architecture

The goal is to have a clear separation between:
- **Core parser interfaces** - Language-agnostic parsing functionality
- **Language-specific implementations** - Grammar rules, tokenization, etc.

This will allow for:
- Multiple language support
- Easier customization by authors
- Better testability and maintainability
