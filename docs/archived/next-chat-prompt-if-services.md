# Next Chat Prompt: Implement if-services Package

## Context
We've identified that the TextService interface in @sharpee/if-domain creates inappropriate dependencies because it needs WorldModel from @sharpee/world-model. After careful analysis (see ADR-030), we've decided to create a new @sharpee/if-services package for runtime service interfaces.

## Current State
- TextService interface is currently in if-domain/src/text-service.ts
- if-domain depends on world-model (which it shouldn't)
- Several packages import TextService from if-domain

## Task
Implement the @sharpee/if-services package by:
1. Creating the new package structure
2. Moving TextService interface from if-domain to if-services
3. Updating all dependencies and imports
4. Building and testing the changes

## Implementation Checklist Location
`/packages/if-services-implementation-checklist.md`

## Key Architecture Points
- if-domain should be a pure domain package (only depend on core)
- if-services will house runtime service interfaces that need world-model access
- This pattern will be used for future services (audio, graphics, analytics, etc.)

## Success Criteria
- if-domain no longer imports from world-model
- TextService implementations still work
- All packages build and tests pass
- Clean dependency graph maintained
