# Development Documentation

> **BETA** (v0.9.2): Development processes are established. See CONTRIBUTING.md for contribution guidelines.

This directory contains all development-related documentation for contributing to and working with the Sharpee framework.

## Quick Start

1. **[Setup Guide](./setup/setup-guide.md)** - Complete environment setup
2. **[Quick Start Checklist](./setup/quick-start-checklist.md)** - Fast-track setup steps
3. **[Workflow Templates](./setup/workflow-templates.md)** - CI/CD workflow templates

## Directory Structure

- **[setup/](./setup/)** - Setup guides and configuration
- **[standards/](./standards/)** - Coding and documentation standards
- **[guides/](./guides/)** - Development guides and tutorials

## Development Setup

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- TypeScript 5+
- Git

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/your-org/sharpee.git
cd sharpee

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development Workflow

### Building
```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @sharpee/engine build

# Watch mode for development
pnpm dev
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @sharpee/engine test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Code Quality
```bash
# Run linter
pnpm lint

# Run type checking
pnpm typecheck

# Format code
pnpm format
```

## Project Structure

```
sharpee/
├── packages/           # Core packages
│   ├── core/          # Core utilities
│   ├── engine/        # Game engine
│   ├── world-model/   # Entity system
│   ├── stdlib/        # Standard library
│   ├── parser-en-us/  # English parser
│   └── ...
├── stories/           # Example stories
├── docs/             # Documentation
└── scripts/          # Build scripts
```

## Development Guidelines

### Code Standards
- [TypeScript Style Guide](./standards/typescript.md)
- [Testing Standards](./standards/testing.md)
- [Documentation Standards](./standards/documentation.md)
- [Commit Message Guidelines](./standards/commits.md)

### Best Practices
- Write tests for all new features
- Document public APIs with JSDoc
- Follow existing code patterns
- Keep commits atomic and well-described
- Update relevant documentation

## Common Tasks

### Adding a New Package
1. Create package directory under `packages/`
2. Add `package.json` with proper configuration
3. Set up TypeScript configuration
4. Add to workspace in root `pnpm-workspace.yaml`
5. Document the package

### Creating a New Action
1. Define action in `@sharpee/stdlib`
2. Implement action handler
3. Add tests
4. Document usage
5. Update relevant stories

### Debugging
- Use VS Code debugger configurations
- Enable source maps in TypeScript
- Use `console.log` for quick debugging
- Leverage Chrome DevTools for browser debugging

## CI/CD

The project uses GitHub Actions for continuous integration:
- Automated testing on all PRs
- Code quality checks
- Build verification
- Documentation generation

See [Workflow Templates](./setup/workflow-templates.md) for details.

## Troubleshooting

### Common Issues
- **Build failures** - Clear node_modules and reinstall
- **Test timeouts** - Check for async issues
- **Type errors** - Ensure all packages are built
- **Import errors** - Verify package dependencies

### Getting Help
- Check existing issues on GitHub
- Review documentation
- Ask in discussions
- Contact maintainers

## Contributing

We welcome contributions! Please:
1. Read the [Contributing Guide](./guides/contributing.md)
2. Follow the [Code of Conduct](./guides/code-of-conduct.md)
3. Submit PRs with clear descriptions
4. Ensure all tests pass

## Resources

- [Architecture Documentation](../architecture/)
- [API Reference](../api/)
- [Package Documentation](../packages/)
- [Feature Proposals](../features/)

---

*For more detailed information, explore the subdirectories or check specific guides.*