# Stdlib Documentation

This directory contains design documents and implementation notes for the Sharpee stdlib package.

## Scope and Perception System

### Core Design Documents
- [scope-design.md](scope-design.md) - Core scope system design for perception and witnessing
- [scope-integration-design.md](scope-integration-design.md) - How scope integrates with world-model

### Implementation Guides
- [scope-implementation-checklist.md](scope-implementation-checklist.md) - Implementation tasks
- [scope-integration-checklist.md](scope-integration-checklist.md) - Integration checklist

### Analysis and Decisions
- [scope-overlap-analysis.md](scope-overlap-analysis.md) - Analysis of overlapping concerns
- [scope-test-decision.md](scope-test-decision.md) - Testing approach decisions
- [sensory-test-analysis.md](sensory-test-analysis.md) - Sensory perception testing

### Test Documentation
- [scope-dependent-tests.md](scope-dependent-tests.md) - Tests that depend on scope
- [scope-test-assessment.md](scope-test-assessment.md) - Assessment of scope tests
- [scope-validation-test-assessment.md](scope-validation-test-assessment.md) - Validation test assessment
- [sensory-test-issues.md](sensory-test-issues.md) - Known sensory test issues

## Event System
- [event-design.md](event-design.md) - Event system design
- [event-standardization.md.delete](event-standardization.md.delete) - (Marked for deletion)

## Entity Resolution
- [entity-resolution-redesign.md](entity-resolution-redesign.md) - Entity resolution system redesign

## Testing
- [action-test-cleanup-checklist.md](action-test-cleanup-checklist.md) - Action test cleanup tasks
- [failing-tests-assessment.md](failing-tests-assessment.md) - Assessment of failing tests
- [test-cleanup-summary.md](test-cleanup-summary.md) - Test cleanup summary

## Architecture Notes

The stdlib scope system works in conjunction with:
- **World-Model Scope System** - For parser entity resolution (see [ADR-045](../../decisions/adr-045-scope-management-system.md))
- **VisibilityBehavior** - For physical line-of-sight calculations
- **Witness System** - For tracking who observes what

See [ADR-046](../../decisions/adr-046-scope-perception-architecture.md) for the complete architecture.