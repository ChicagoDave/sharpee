# Sharpee Development Setup Guide

This comprehensive guide covers everything you need to set up a development environment for the Sharpee Interactive Fiction Framework.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Environment](#development-environment)
4. [Building the Project](#building-the-project)
5. [Running Tests](#running-tests)
6. [Development Workflow](#development-workflow)
7. [CI/CD Setup](#cicd-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **pnpm**: Version 8.0.0 or higher
- **Git**: Latest version
- **TypeScript**: Version 5.0.0 or higher (installed via project)

### Recommended Tools

- **VS Code**: With TypeScript and ESLint extensions
- **Chrome/Edge**: For debugging web-based stories
- **GitHub CLI**: For managing PRs and issues

### System Requirements

- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 4GB, recommended 8GB
- **Disk Space**: 2GB free space

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/sharpee.git
cd sharpee
```

### 2. Install pnpm

If you don't have pnpm installed:

```bash
# Using npm
npm install -g pnpm

# Using Homebrew (macOS)
brew install pnpm

# Using Scoop (Windows)
scoop install pnpm
```

### 3. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# This will install dependencies for all packages in the monorepo
```

### 4. Initial Build

```bash
# Build all packages in dependency order
pnpm build

# This ensures all TypeScript is compiled and packages are ready
```

### 5. Verify Installation

```bash
# Run tests to verify everything is working
pnpm test

# You should see all tests passing
```

## Development Environment

### VS Code Setup

1. **Install Extensions**:
   - TypeScript and JavaScript Language Features
   - ESLint
   - Prettier - Code formatter
   - GitLens (optional)

2. **Workspace Settings** (`.vscode/settings.json`):
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  }
}
```

3. **Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test", "${file}"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Environment Variables

Create a `.env` file in the root (not committed):

```bash
# Development settings
NODE_ENV=development
DEBUG=sharpee:*
LOG_LEVEL=debug

# Test settings
TEST_TIMEOUT=30000
```

## Building the Project

### Build Commands

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @sharpee/engine build

# Build package and its dependencies
pnpm --filter @sharpee/engine... build

# Watch mode for development
pnpm dev

# Clean build artifacts
pnpm clean
pnpm build --force
```

### Build Order

Packages must be built in dependency order:
1. `@sharpee/core`
2. `@sharpee/if-domain`
3. `@sharpee/world-model`
4. `@sharpee/lang-en-us`
5. `@sharpee/parser-en-us`
6. `@sharpee/stdlib`
7. `@sharpee/text-services`
8. `@sharpee/if-services`
9. `@sharpee/engine`

## Running Tests

### Test Commands

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @sharpee/engine test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test path/to/test.ts

# Run tests matching pattern
pnpm test --grep "pattern"
```

### Test Organization

Tests are organized by type:
- `tests/unit/` - Unit tests for individual functions
- `tests/integration/` - Integration tests for components
- `tests/e2e/` - End-to-end tests for complete flows

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

describe('Feature', () => {
  let engine, world, player;
  
  beforeEach(() => {
    const setup = setupTestEngine();
    engine = setup.engine;
    world = setup.world;
    player = setup.player;
  });
  
  it('should do something', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

```bash
# Watch for changes and rebuild
pnpm dev

# In another terminal, run tests in watch mode
pnpm test:watch
```

### 3. Format and Lint

```bash
# Format code
pnpm format

# Run linter
pnpm lint

# Fix linting issues
pnpm lint --fix

# Type check
pnpm typecheck
```

### 4. Run Tests

```bash
# Run affected tests
pnpm test

# Run all tests before committing
pnpm test:ci
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve issue"
# or
git commit -m "docs: update documentation"
```

### 6. Create Pull Request

```bash
# Push branch
git push origin feature/your-feature-name

# Create PR using GitHub CLI
gh pr create --title "Feature: Your feature" --body "Description"
```

## CI/CD Setup

### GitHub Actions

The project uses GitHub Actions for CI/CD. Workflows are in `.github/workflows/`:

- **ci.yml** - Runs on all PRs and pushes
  - Builds all packages
  - Runs all tests
  - Checks code quality
  
- **release.yml** - Runs on main branch
  - Creates releases
  - Publishes packages
  - Updates changelogs

### Local CI Testing

```bash
# Run the same tests as CI
pnpm ci:test

# This runs tests in dependency order
pnpm ci:test:sequence
```

### Changesets

For versioning and changelogs:

```bash
# Create a changeset for your changes
pnpm changeset

# Version packages (usually done in CI)
pnpm version

# Build and publish (usually done in CI)
pnpm release
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear all build artifacts
pnpm clean

# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install

# Force rebuild
pnpm build --force
```

#### Test Timeouts

```bash
# Increase test timeout
TEST_TIMEOUT=60000 pnpm test

# Or in test file
test('slow test', { timeout: 60000 }, async () => {
  // test code
});
```

#### Type Errors

```bash
# Ensure all packages are built
pnpm build

# Check for type errors
pnpm typecheck

# Generate missing types
pnpm build:types
```

#### Import Errors

```bash
# Check package.json exports
cat packages/[package]/package.json | grep exports

# Verify tsconfig paths
cat tsconfig.json | grep paths

# Rebuild the specific package
pnpm --filter @sharpee/[package] build
```

### Debug Mode

Enable debug logging:

```bash
# Unix/Linux/macOS
DEBUG=sharpee:* pnpm test

# Windows
set DEBUG=sharpee:* && pnpm test
```

### Performance Issues

```bash
# Profile build time
time pnpm build

# Use turbo for faster builds (if configured)
pnpm turbo build

# Limit concurrent operations
pnpm config set workspace-concurrency 2
```

## Next Steps

1. **Explore Examples**: Check `stories/` directory for example implementations
2. **Read Architecture**: See [Architecture Documentation](../../architecture/)
3. **Review API**: Check [API Reference](../../api/)
4. **Join Community**: Participate in discussions and get help

## Resources

- [Architecture Overview](../../architecture/README.md)
- [Package Documentation](../../packages/README.md)
- [API Reference](../../api/README.md)
- [Contributing Guide](../guides/contributing.md)
- [Testing Guide](../guides/testing.md)

## Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Search [existing issues](https://github.com/your-org/sharpee/issues)
3. Ask in [discussions](https://github.com/your-org/sharpee/discussions)
4. Create a [new issue](https://github.com/your-org/sharpee/issues/new)

---

*Last updated: 2025-08-06*