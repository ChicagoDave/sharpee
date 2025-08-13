# Documentation Index Plan - Phase 2

## Overview
Create a comprehensive, searchable index of all documentation that Claude Code can efficiently query to find relevant information about the Sharpee platform.

## Index Structure

### 1. Master Index File
**Location**: `/docs/INDEX.md`

```markdown
# Sharpee Documentation Index

## Quick Reference
- [Architecture Overview](#architecture)
- [API Reference](#api-reference)
- [Development Guide](#development)
- [Package Documentation](#packages)
- [Decision Records](#adrs)

## Search Index
[Searchable keyword index with links to relevant docs]
```

### 2. Structured JSON Index
**Location**: `/docs/index.json`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-20",
  "categories": {
    "architecture": {
      "description": "System architecture and design",
      "documents": [
        {
          "title": "Scope and Perception Architecture",
          "path": "/docs/architecture/adrs/adr-046-scope-perception-architecture.md",
          "keywords": ["scope", "perception", "parser", "visibility", "world-model"],
          "summary": "Defines the separation between parser scope and perception systems",
          "related": ["adr-045", "scope-design.md"]
        }
      ]
    }
  },
  "keywords": {
    "scope": [
      "/docs/architecture/adrs/adr-045-scope-management-system.md",
      "/docs/architecture/adrs/adr-046-scope-perception-architecture.md",
      "/docs/stdlib/scope-design.md"
    ]
  }
}
```

### 3. Category-Specific Indexes

#### Architecture Index
**Location**: `/docs/architecture/INDEX.md`
```markdown
# Architecture Documentation

## Core Concepts
- [Entity System](./design/entity-system.md)
- [Event Architecture](./adrs/adr-035-platform-event-architecture.md)
- [Parser Design](./adrs/adr-025-parser-information-preservation.md)

## Decision Records (ADRs)
| ADR | Title | Status | Keywords |
|-----|-------|--------|----------|
| 001 | Parser Debug Events | Implemented | parser, debug, events |
| 046 | Scope Perception Architecture | Implemented | scope, parser, visibility |
```

#### API Index
**Location**: `/docs/api/INDEX.md`
```markdown
# API Reference

## Core APIs
- [Entity API](./core/entity-api.md) - Entity creation and management
- [Event System](./core/event-system.md) - Event emission and handling
- [Registry Pattern](./core/registry-pattern.md) - Service registration

## Package APIs
- [World Model](./world-model/README.md)
  - [Scope System](./world-model/scope-system.md)
  - [Visibility Behavior](./world-model/visibility-behavior.md)
```

### 4. Keyword Mapping System

#### Keywords Database
**Location**: `/docs/keywords.json`
```json
{
  "parser": {
    "description": "Text parsing and command interpretation",
    "documents": [
      {
        "path": "/docs/architecture/adrs/adr-025-parser-information-preservation.md",
        "relevance": "primary"
      },
      {
        "path": "/docs/packages/parser-en-us/grammar-engine.md",
        "relevance": "implementation"
      }
    ],
    "related": ["grammar", "tokenization", "vocabulary", "scope"]
  },
  "scope": {
    "description": "Entity visibility and parser resolution",
    "documents": [
      {
        "path": "/docs/architecture/adrs/adr-046-scope-perception-architecture.md",
        "relevance": "architecture"
      }
    ],
    "subtopics": {
      "parser-scope": "What entities can be referenced in commands",
      "visibility": "Physical line-of-sight calculation",
      "perception": "Actor awareness system"
    }
  }
}
```

### 5. Code Example Index
**Location**: `/docs/examples/INDEX.md`
```markdown
# Code Examples Index

## Common Patterns

### Entity Creation
- [Basic Entity](../examples/entity-creation-basic.md)
- [Room with Traits](../examples/room-creation.md)
- [Actor with Inventory](../examples/actor-creation.md)

### Action Implementation
- [Simple Action](../examples/action-simple.md)
- [Action with Validation](../examples/action-validation.md)
- [Multi-stage Action](../examples/action-complex.md)
```

### 6. Troubleshooting Index
**Location**: `/docs/troubleshooting/INDEX.md`
```markdown
# Troubleshooting Guide

## Common Issues

### Parser Issues
- [Unknown command errors](./parser-unknown-command.md)
- [Scope resolution failures](./parser-scope-issues.md)
- [Vocabulary registration](./parser-vocabulary.md)

### World Model Issues
- [Entity not found](./world-model-entity-lookup.md)
- [Visibility problems](./world-model-visibility.md)
```

## Implementation Tools

### 1. Index Generator Script
**Location**: `/scripts/generate-doc-index.js`
```javascript
// Scan all markdown files
// Extract headers, keywords, and summaries
// Generate index files automatically
// Update JSON databases
```

### 2. Documentation Linter
**Location**: `/scripts/lint-docs.js`
```javascript
// Verify all links are valid
// Check for missing index entries
// Ensure consistent formatting
// Validate keyword mappings
```

### 3. Search Function
**Location**: `/docs/search.js`
```javascript
// Load index.json
// Implement fuzzy search
// Return ranked results
// Support complex queries
```

## Usage Patterns for Claude Code

### 1. Quick Lookup
```
"Where is scope system documented?"
→ Check keywords.json for "scope"
→ Return prioritized list of documents
```

### 2. Implementation Guide
```
"How do I implement a custom action?"
→ Check examples/INDEX.md
→ Find action implementation examples
→ Include related ADRs
```

### 3. Troubleshooting
```
"Parser is not recognizing my command"
→ Check troubleshooting/INDEX.md
→ Find parser troubleshooting guides
→ Include relevant code examples
```

### 4. Architecture Understanding
```
"Explain the relationship between scope and visibility"
→ Check architecture/INDEX.md
→ Find ADR-046
→ Include related design documents
```

## Benefits

1. **Faster Information Retrieval** - Claude Code can quickly find relevant documentation
2. **Better Context Understanding** - Related documents are linked together
3. **Reduced Hallucination Risk** - Clear, indexed information reduces guesswork
4. **Improved Development Flow** - Quick access to examples and patterns
5. **Self-Documenting** - Index itself serves as documentation overview

## Maintenance

### Regular Updates
- Run index generator after documentation changes
- Validate links monthly
- Update keywords based on common queries
- Review and consolidate duplicate content

### Version Control
- Track index changes in git
- Document index schema changes
- Maintain backwards compatibility

## Integration with Claude Code

### CLAUDE.md Integration
Add index references to CLAUDE.md:
```markdown
## Documentation Quick Reference
- Architecture: See /docs/architecture/INDEX.md
- API Reference: See /docs/api/INDEX.md
- Examples: See /docs/examples/INDEX.md
- Troubleshooting: See /docs/troubleshooting/INDEX.md

## Quick Search
For any topic, check /docs/keywords.json first
```

### Prompt Engineering
When Claude Code needs information:
1. First check keywords.json for topic
2. Then check relevant category INDEX.md
3. Finally read specific documents
4. Cross-reference with related documents

This systematic approach ensures comprehensive and accurate responses.