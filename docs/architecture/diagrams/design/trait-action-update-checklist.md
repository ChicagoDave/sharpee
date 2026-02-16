# Trait-Action Update Checklist

This checklist tracks the implementation of the new trait/behavior and action/command architecture as defined in `action-trait-update.md`.

## Phase 1: Core Infrastructure

- [x] Create base `Behavior` class with trait dependency system
  - [x] Implement `requiredTraits` static property
  - [x] Implement `require<T>()` helper method
  - [x] Add validation for missing traits

- [x] Create `ActionFailureReason` enum in stdlib/constants.ts
  - [x] Define common failure reasons (NOT_REACHABLE, FIXED_IN_PLACE, etc.)
  - [x] Document each reason clearly

- [x] Update world model with scope queries
  - [x] Implement `getVisible(actor)` method
  - [x] Implement `getReachable(actor)` method
  - [x] Implement `canSee(actor, target)` method
  - [x] Implement `canReach(actor, target)` method
  - [x] Add scope override system (addToScope/removeFromScope)

- [x] Create command/action separation types
  - [x] Define `CommandDefinition` interface
  - [x] Define `ActionExecutor` interface
  - [x] Update parser to use command definitions
  - [x] Create CommandRegistry for managing command definitions
  - [x] Create ActionExecutorRegistry for managing executors
  - [x] Create command-aware parser adapter

## Phase 2: Trait Refactoring

### Reorganize existing traits into feature folders:

- [x] Create `/world-model/traits/identity/` folder
  - [x] Move `IdentityTrait` to `identityTrait.ts`
  - [x] Create `identityBehavior.ts` (if needed)

- [x] Create `/world-model/traits/scenery/` folder
  - [x] Create `sceneryTrait.ts` (marks items as untakeable)
  - [x] Create `sceneryBehavior.ts` (custom failure messages)

- [x] Create `/world-model/traits/openable/` folder
  - [x] Move `OpenableTrait` to `openableTrait.ts`
  - [x] Extract logic to `openableBehavior.ts`
  - [x] Remove behavior methods from trait

- [x] Create `/world-model/traits/lockable/` folder
  - [x] Move `LockableTrait` to `lockableTrait.ts`
  - [x] Create `lockableBehavior.ts` with OpenableTrait dependency
  - [x] Remove behavior methods from trait

- [x] Create `/world-model/traits/container/` folder
  - [x] Move `ContainerTrait` to `containerTrait.ts`
  - [x] Extract logic to `containerBehavior.ts`
  - [x] Remove behavior methods from trait

- [x] Create `/world-model/traits/portable/` folder (remove if using scenery approach)
  - [x] Evaluated: redundant with scenery approach. Items are portable by default.
  - [x] Removed. Weight/bulk should be separate trait if needed.

- [x] Create `/world-model/traits/wearable/` folder
  - [x] Move `WearableTrait` to `wearableTrait.ts`
  - [x] Create `wearableBehavior.ts`

- [x] Create `/world-model/traits/edible/` folder
  - [x] Move `EdibleTrait` to `edibleTrait.ts`
  - [x] Create `edibleBehavior.ts`

### Complex traits needing significant refactoring:

- [x] Refactor DialogueTrait
  - [x] Create `/world-model/traits/dialogue/` folder
  - [x] Strip behavior methods from `DialogueTrait`
  - [x] Move all logic to `DialogueBehavior`
  - [x] Ensure trait only contains data

- [x] Refactor DeviceTrait
  - [x] Create `/world-model/traits/device/` folder
  - [x] Simplify trait to just data
  - [x] Move logic to `DeviceBehavior`
  - Note: Used SwitchableTrait instead of DeviceTrait

## Phase 3: Action Refactoring

### Core actions to refactor:

- [x] Create `/actions/taking/` folder
  - [x] Create `takingCommand.ts` with verb reference
  - [x] Create `takingAction.ts` with execution logic
  - [ ] Remove old combined action file

- [x] Create `/actions/dropping/` folder
  - [x] Create `droppingCommand.ts`
  - [x] Create `droppingAction.ts`

- [x] Create `/actions/examining/` folder
  - [x] Create `examiningCommand.ts`
  - [x] Create `examiningAction.ts`

- [x] Create `/actions/opening/` folder
  - [x] Create `openingCommand.ts`
  - [x] Create `openingAction.ts`

- [x] Create `/actions/closing/` folder
  - [x] Create `closingCommand.ts`
  - [x] Create `closingAction.ts`

- [x] Create `/actions/inventory/` folder
  - [x] Create `inventoryCommand.ts`
  - [x] Create `inventoryAction.ts`

- [x] Create `/actions/going/` folder
  - [x] Create `goingCommand.ts`
  - [x] Create `goingAction.ts`

- [x] Create `/actions/looking/` folder
  - [x] Create `lookingCommand.ts`
  - [x] Create `lookingAction.ts`

### Complex actions:

- [x] Create `/actions/unlocking/` folder
  - [x] Create `unlockingCommand.ts`
  - [x] Create `unlockingAction.ts`
  - [x] Use LockableBehavior

- [x] Create `/actions/wearing/` folder
  - [x] Create `wearingCommand.ts`
  - [x] Create `wearingAction.ts`

- [x] Create `/actions/removing/` folder (taking off worn items)
  - [x] Create `removingCommand.ts`
  - [x] Create `removingAction.ts`

## Phase 4: Language Extraction

- [x] Update lang-en-us package structure
  - [x] Create `verbs.ts` with verb mappings (already exists)
  - [x] Create `messages.ts` with failure reason mappings
  - [x] Create `events.ts` with success message templates

- [x] Extract all hardcoded strings from actions
  - [x] Replace with ActionFailureReason constants (already done)
  - [x] Remove string literals from commands (already done)

- [x] Update text service to use new message system
  - [x] Create enhanced text service with message provider
  - [x] Map failure reasons to messages
  - [x] Map events to success messages
  - [x] Support message templating

## Phase 5: Integration and Testing

- [x] Update ActionContext to support behaviors
  - [x] Add `getBehavior()` method
  - [x] Integrate with world model scope queries
  - [x] Create ActionContext implementation
  - [x] Add behavior registry

- [x] Update parser to use command definitions
  - [x] Create command-aware parser that loads from registry
  - [ ] Load verb mappings from language pack (partially done)
  - [x] Match commands to definitions via grammar patterns
  - [ ] Pass to appropriate executors (integration needed)

- [ ] Update existing tests
  - [ ] Fix trait tests for new structure
  - [ ] Fix action tests for new structure
  - [ ] Add behavior tests

- [ ] Create integration tests
  - [ ] Test trait-behavior interaction
  - [ ] Test command-action flow
  - [ ] Test language resolution

## Phase 6: Documentation

- [ ] Update trait documentation
  - [ ] Document new folder structure
  - [ ] Explain trait vs behavior split
  - [ ] Add examples

- [ ] Update action documentation
  - [ ] Document command vs executor split
  - [ ] Explain language integration
  - [ ] Add examples

- [ ] Create behavior documentation
  - [ ] Explain dependency system
  - [ ] Show composition patterns
  - [ ] Add examples

## Phase 7: Cleanup

- [ ] Remove old trait category folders
  - [ ] Delete `/advanced/` folder
  - [ ] Delete `/interactive/` folder  
  - [ ] Delete `/standard/` folder

- [ ] Remove old action files
  - [ ] Delete combined action definitions
  - [ ] Remove old action types if changed

- [ ] Remove deprecated code
  - [ ] Old trait methods
  - [ ] Old action patterns
  - [ ] Unused interfaces

## Notes

- Start with simple traits/actions and work up to complex ones
- Test each phase before moving to the next
- Keep backwards compatibility until Phase 7
- Document breaking changes for story authors
