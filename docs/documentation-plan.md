# Sharpee Documentation Plan

## Overview

This document outlines the comprehensive documentation strategy for the Sharpee Interactive Fiction platform, targeting two primary audiences:

1. **Authors** - Interactive fiction writers who create stories using Sharpee
2. **Platform Engineers** - Developers who contribute to the platform or create extensions

## Documentation Structure

```
docs/
├── getting-started/           # Quick start guides
│   ├── authors/               # For story writers
│   ├── developers/            # For platform contributors
│   └── extension-creators/    # For extension developers
│
├── guides/                    # In-depth tutorials
│   ├── author-guides/         # Story writing guides
│   ├── developer-guides/      # Platform development
│   └── extension-guides/      # Extension creation
│
├── reference/                 # API and technical reference
│   ├── actions/              # All available actions
│   ├── traits/               # All available traits
│   ├── events/               # Event reference
│   ├── api/                  # API documentation
│   └── cli/                  # Command line tools
│
├── concepts/                  # Core concepts explained
│   ├── architecture/         # System architecture
│   ├── event-driven/         # Event system
│   ├── world-model/          # Entity system
│   └── extensions/           # Extension system
│
├── examples/                  # Example code
│   ├── stories/              # Example stories
│   ├── extensions/           # Example extensions
│   └── snippets/             # Code snippets
│
└── contributing/             # Contribution guidelines
    ├── code-standards/       # Coding standards
    ├── pr-process/           # Pull request process
    └── testing/              # Testing requirements
```

## Author Documentation

### 1. Getting Started Guide
- **Installation**: Setting up Sharpee
- **First Story**: Creating a minimal story
- **Basic Concepts**: Rooms, objects, actions
- **Running Your Story**: Testing and playing

### 2. Story Writing Guide
- **World Building**
  - Creating rooms and connections
  - Placing objects and scenery
  - Setting descriptions
  - Managing visibility and scope
  
- **Objects and Interactions**
  - Basic objects (takeable, container, supporter)
  - Doors and locks
  - Clothing and wearables
  - Light sources
  
- **Actions and Commands**
  - Standard action library
  - Custom responses
  - Event handlers
  - Command aliases
  
- **Advanced Features**
  - Non-player characters (NPCs)
  - Conversation systems
  - Puzzles and mechanics
  - Score and achievements
  - Save/restore system

### 3. Extension Usage
- Finding and installing extensions
- Configuring extensions
- Using extension features
- Troubleshooting

### 4. Story Examples
- **Tutorial Story**: Step-by-step annotated example
- **Classic Patterns**: Common IF patterns
- **Advanced Examples**: Complex mechanics

## Platform Engineer Documentation

### 1. Architecture Overview
- **System Design**
  - Event-driven architecture
  - Package structure
  - Core interfaces (I-prefix convention)
  - Extension points
  
- **Data Flow**
  - Command processing pipeline
  - Event generation and handling
  - State management
  - Text generation

### 2. Core Development
- **Working with Events**
  - Event types and structure
  - Creating custom events
  - Event sequencing
  - Event handlers
  
- **Entity System**
  - Entity structure
  - Traits and behaviors
  - Relationships
  - Spatial indexing
  
- **Action System**
  - Action interface
  - Validate/execute pattern
  - Context and state access
  - Error handling

### 3. Extension Development
- **Creating Extensions**
  - Extension structure
  - Registration and initialization
  - Dependency management
  - Testing extensions
  
- **Extension Components**
  - Custom actions
  - New traits
  - Event handlers
  - Grammar extensions
  - Message templates
  
- **Publishing Extensions**
  - Package preparation
  - Documentation requirements
  - Version management
  - npm publishing

### 4. Contributing to Core
- **Development Setup**
  - Repository structure
  - Build process
  - Testing framework
  - Development tools
  
- **Code Standards**
  - TypeScript guidelines
  - Event patterns
  - Testing requirements
  - Documentation standards
  
- **Pull Request Process**
  - Branch naming
  - Commit messages
  - PR template
  - Review process
  - CI/CD pipeline

### 5. API Reference
- **Core Interfaces**
  - IEntity, IAction, IEvent
  - IWorldModel, IParser
  - Extension interfaces
  
- **Standard Library**
  - Action reference
  - Trait reference
  - Capability reference
  - Helper utilities
  
- **Test Utilities**
  - Mock factories
  - Test helpers
  - Assertion utilities

## Documentation Standards

### Code Examples
- All examples must be runnable
- Include TypeScript types
- Show imports explicitly
- Add comments for clarity

### Writing Style
- Clear and concise
- Active voice preferred
- Include "why" not just "how"
- Progressive disclosure of complexity

### Maintenance
- Keep examples up to date with API changes
- Version documentation with releases
- Include migration guides for breaking changes
- Regular review and updates

## Implementation Priority

### Phase 1: Core Documentation (Immediate)
1. Author getting started guide
2. Basic story writing tutorial
3. Extension development guide
4. Architecture overview

### Phase 2: Reference Documentation (Week 1)
1. Complete action reference
2. Complete trait reference
3. API documentation generation
4. Event catalog

### Phase 3: Advanced Guides (Week 2)
1. Advanced story patterns
2. Extension cookbook
3. Performance optimization
4. Debugging guide

### Phase 4: Examples and Tutorials (Week 3)
1. Complete example stories
2. Extension examples
3. Video tutorials (optional)
4. Interactive playground (future)

## Success Metrics

- **Adoption**: New authors/developers onboarded
- **Clarity**: Reduced support questions
- **Completeness**: API coverage percentage
- **Currency**: Documentation freshness
- **Feedback**: User satisfaction scores

## Tools and Infrastructure

### Documentation Generation
- TypeDoc for API reference
- Markdown for guides
- Mermaid for diagrams
- Docusaurus or similar for site

### Version Management
- Docs versioned with releases
- Migration guides for breaking changes
- Changelog maintenance
- API stability markers

### Community
- Discord for support
- GitHub discussions
- Example repository
- Extension marketplace (future)

## Next Steps

1. Create documentation site structure
2. Write author getting started guide
3. Generate API documentation
4. Create example story with annotations
5. Write extension development tutorial
6. Set up documentation CI/CD
7. Create contribution guidelines
8. Launch documentation site

---

This plan ensures comprehensive coverage for both audiences while maintaining high quality and usability standards.