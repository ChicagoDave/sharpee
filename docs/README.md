# Sharpee Documentation

> ⚠️ **ALPHA SOFTWARE DOCUMENTATION**: Sharpee is in alpha. Documentation may be incomplete, contain errors, or reference features that are planned but not yet implemented. We're actively improving the documentation.

Welcome to the Sharpee Interactive Fiction Framework documentation. This guide will help you navigate the various documentation resources available.

## Quick Links

- [Architecture & Design](./architecture/) - System architecture, ADRs, and design patterns
- [Development Guide](./development/) - Setup, standards, and development guides
- [API Documentation](./api/) - Complete API reference for all packages
- [Package Documentation](./packages/) - Detailed documentation for each package
- [Features](./features/) - Feature proposals and enhancement documentation
- [Maintenance](./maintenance/) - Cleanup tasks, fixes, and migration guides

## Getting Started

If you're new to Sharpee, start here:

1. **[Quick Start Guide](./development/setup/quick-start.md)** - Get up and running quickly
2. **[Architecture Overview](./architecture/overview.md)** - Understand the system design
3. **[Core Concepts](./architecture/patterns/core-concepts.md)** - Learn the fundamental concepts

## For Story Authors

- [Story Development Guide](./stories/) - How to create interactive fiction with Sharpee
- [Standard Library Actions](./stdlib/) - Available actions for your stories
- [Language & Parser](./packages/parser-en-us/) - Understanding natural language processing

## For Developers

- [Contributing Guide](./development/guides/contributing.md)** - How to contribute to Sharpee
- [Testing Guide](./development/guides/testing.md)** - Writing and running tests
- [Code Standards](./development/standards/coding.md)** - Coding conventions and standards
- [Build System](./development/setup/build.md)** - Understanding the build process

## Package Overview

Sharpee is organized into several core packages:

| Package | Description | Documentation |
|---------|-------------|---------------|
| `@sharpee/core` | Core utilities and types | [View Docs](./packages/core/) |
| `@sharpee/engine` | Game engine and runtime | [View Docs](./packages/engine/) |
| `@sharpee/world-model` | Entity and world modeling | [View Docs](./packages/world-model/) |
| `@sharpee/stdlib` | Standard library of actions | [View Docs](./packages/stdlib/) |
| `@sharpee/parser-en-us` | English language parser | [View Docs](./packages/parser-en-us/) |
| `@sharpee/lang-en-us` | English language provider | [View Docs](./packages/lang-en-us/) |
| `@sharpee/text-services` | Text formatting and output | [View Docs](./packages/text-services/) |
| `@sharpee/if-services` | Interactive fiction services | [View Docs](./packages/if-services/) |

## Architecture Decision Records (ADRs)

Important architectural decisions are documented in ADRs:

- [View All ADRs](./architecture/adrs/)
- [Core System ADRs](./architecture/adrs/core-systems/)
- [Recent ADRs](./architecture/adrs/recent.md)

## Legacy Documentation

- [stdlib/](stdlib/) - Standard library scope, perception, and witness system docs
- [platform/](platform/) - Platform documentation
- [extensions/](extensions/) - Extension system documentation
- [design/](design/) - Design documents
- [api/](api/) - API documentation
- [ADRs](../decisions/) - Architecture Decision Records

## Implementation Guides
- [actions/](actions/) - Action system documentation
- [stories/](stories/) - Story development guides
- [tutorials/](tutorials/) - Tutorial documentation

## Recent Work
- [world-model-test-triage.md](world-model-test-triage.md) - Analysis of world-model test failures
- [world-model-implementation-plan.md](world-model-implementation-plan.md) - Plan for fixing scope/visibility separation
- [scope-systems-clarification.md](scope-systems-clarification.md) - Clarification of parser vs perception scope

## Archived
- [archived/](archived/) - Older documentation kept for reference