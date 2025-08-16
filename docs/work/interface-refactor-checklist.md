# Interface Refactor Checklist

Complete checklist for adding I-prefix to all interfaces across the Sharpee codebase.

## Phase 1: Core Package Interfaces

### core/src/types/
- [ ] `Entity` → `IEntity`
- [ ] `EntityCreationParams` → `IEntityCreationParams`
- [ ] `EntityOperationOptions` → `IEntityOperationOptions`
- [ ] `AttributeObject` → `IAttributeObject`
- [ ] `AttributeConfig` → `IAttributeConfig`
- [ ] `Relationship` → `IRelationship`
- [ ] `RelationshipConfig` → `IRelationshipConfig`
- [ ] `CommandResult` → `ICommandResult`
- [ ] `SaveData` → `ISaveData`
- [ ] `SaveMetadata` → `ISaveMetadata`
- [ ] `EngineState` → `IEngineState`
- [ ] `SerializedEvent` → `ISerializedEvent`
- [ ] `SerializedSpatialIndex` → `ISerializedSpatialIndex`
- [ ] `SerializedEntity` → `ISerializedEntity`
- [ ] `SerializedLocation` → `ISerializedLocation`
- [ ] `SerializedRelationship` → `ISerializedRelationship`
- [ ] `SerializedTurn` → `ISerializedTurn`
- [ ] `SerializedParserState` → `ISerializedParserState`
- [ ] `StoryConfig` → `IStoryConfig`
- [ ] `SaveRestoreHooks` → `ISaveRestoreHooks`
- [ ] `QuitContext` → `IQuitContext`
- [ ] `RestartContext` → `IRestartContext`
- [ ] `SaveResult` → `ISaveResult`
- [ ] `RestoreResult` → `IRestoreResult`

### core/src/events/
- [ ] `SemanticEvent` → `ISemanticEvent`
- [ ] `EventEmitter` → `IEventEmitter`
- [ ] `EventSystemOptions` → `IEventSystemOptions`
- [ ] `SemanticEventSource` → `ISemanticEventSource`
- [ ] `GenericEventSource` → `IGenericEventSource`
- [ ] `SystemEvent` → `ISystemEvent`
- [ ] `GameEvent` → `IGameEvent`
- [ ] `PlatformEvent` → `IPlatformEvent`
- [ ] `SaveContext` → `ISaveContext`
- [ ] `RestoreContext` → `IRestoreContext`

### core/src/query/
- [ ] `PendingQuery` → `IPendingQuery`
- [ ] `QueryContext` → `IQueryContext`
- [ ] `QueryResponse` → `IQueryResponse`
- [ ] `ValidationResult` → `IValidationResult`
- [ ] `QueryHandler` → `IQueryHandler`
- [ ] `QueryState` → `IQueryState`
- [ ] `QueryEvents` → `IQueryEvents`

### core/src/rules/
- [ ] `RuleWorld` → `IRuleWorld`
- [ ] `RuleResult` → `IRuleResult`
- [ ] `EntityChange` → `IEntityChange`
- [ ] `Rule` → `IRule`
- [ ] `SimpleRuleSystem` → `ISimpleRuleSystem`
- [ ] `RuleSystem` → `IRuleSystem`

### core/src/execution/
- [ ] `ExecutionContext` → `IExecutionContext`
- [ ] `CommandHandler` → `ICommandHandler`
- [ ] `Action` → `IAction` (conflicts with stdlib Action!)
- [ ] `CommandRouter` → `ICommandRouter`
- [ ] `CommandHandlerFactory` → `ICommandHandlerFactory`
- [ ] `CommandExecutionOptions` → `ICommandExecutionOptions`

### core/src/extensions/
- [ ] `Extension` → `IExtension`
- [ ] `CommandExtension` → `ICommandExtension`
- [ ] `AbilityExtension` → `IAbilityExtension`
- [ ] `EventExtension` → `IEventExtension`
- [ ] `ParserExtension` → `IParserExtension`

### core/src/debug/
- [ ] `DebugEvent` → `IDebugEvent`
- [ ] `DebugContext` → `IDebugContext`

### core/src/constants/
- [ ] `CoreRelationshipConfig` → `ICoreRelationshipConfig`

## Phase 2: World Model Package Interfaces

### world-model/src/world/
- [ ] `WorldModel` → `IWorldModel`
- [ ] `CapabilityData` → `ICapabilityData`
- [ ] `CapabilitySchema` → `ICapabilitySchema`
- [ ] `CapabilityStore` → `ICapabilityStore`
- [ ] `CapabilityRegistration` → `ICapabilityRegistration`

### world-model/src/commands/
- [ ] `ParsedObjectReference` → `IParsedObjectReference`
- [ ] `ParsedCommandV1` → `IParsedCommandV1`
- [ ] `ValidatedObjectReference` → `IValidatedObjectReference`
- [ ] `ValidatedCommand` → `IValidatedCommand`
- [ ] `ValidationError` → `IValidationError`

### world-model/src/interfaces/
- [ ] `Parser` → `IParser`

### world-model/src/events/
- [ ] `GameEvent` → `IGameEvent` (duplicate of core!)
- [ ] `EventHandlers` → `IEventHandlers`
- [ ] `EventCapableEntity` → `IEventCapableEntity`

### world-model/src/scope/
- [ ] `ScopeContext` → `IScopeContext`
- [ ] `ScopeRule` → `IScopeRule`
- [ ] `ScopeRuleResult` → `IScopeRuleResult`
- [ ] `ScopeEvaluationOptions` → `IScopeEvaluationOptions`
- [ ] `ScopeEvaluationResult` → `IScopeEvaluationResult`

### world-model/src/behaviors/
- [ ] `WorldAwareBehavior` → `IWorldAwareBehavior`

### world-model/src/extensions/
- [ ] `ExtensionMetadata` → `IExtensionMetadata`
- [ ] `ExtensionDependency` → `IExtensionDependency`
- [ ] `ExtensionTraitDefinition` → `IExtensionTraitDefinition`
- [ ] `ExtensionEventDefinition` → `IExtensionEventDefinition`
- [ ] `ExtensionActionDefinition` → `IExtensionActionDefinition`
- [ ] `ExtensionCommandDefinition` → `IExtensionCommandDefinition`
- [ ] `ITraitExtension` (already has I!)
- [ ] `ExtensionLanguageData` → `IExtensionLanguageData`
- [ ] `IExtensionLoader` (already has I!)
- [ ] `IExtensionRegistry` (already has I!)

## Phase 3: IF Domain Package Interfaces (New)

### if-domain/src/actions/
- [ ] Create `IAction` from stdlib `Action`
- [ ] Create `IValidationResult` from stdlib `ValidationResult`
- [ ] Create `IActionContext` from stdlib `ActionContext`
- [ ] Create `IActionRegistry` from stdlib `ActionRegistry`
- [ ] Create `IActionMetadata` from stdlib `ActionMetadata`

### if-domain/src/commands/
- [ ] Create `IValidatedCommand` from stdlib `ValidatedCommand`
- [ ] Create `ICommandObject` from stdlib `CommandObject`
- [ ] Create `IParsedIntent` from stdlib `ParsedIntent`

### if-domain/src/scope/
- [ ] Create `IScopeResolver` from stdlib `ScopeResolver`
- [ ] Create `IScopeContext` from stdlib `ScopeContext`

### if-domain/src/validation/
- [ ] Create `ICommandValidator` from stdlib `CommandValidator`

### if-domain/src/messages/
- [ ] Create `IMessageTemplate` from stdlib `MessageTemplate`
- [ ] Create `IMessageContext` from stdlib `MessageContext`

## Phase 4: Update Stdlib Implementations

### Remove old interfaces and import from packages:
- [ ] Remove local interface definitions
- [ ] Import from if-domain for IF interfaces
- [ ] Import from core for core interfaces
- [ ] Import from world-model for world interfaces

### Update all action files (~30+):
- [ ] opening.ts
- [ ] taking.ts
- [ ] dropping.ts
- [ ] examining.ts
- [ ] going.ts
- [ ] entering.ts
- [ ] exiting.ts
- [ ] looking.ts
- [ ] inventory.ts
- [ ] putting.ts
- [ ] inserting.ts
- [ ] removing.ts
- [ ] giving.ts
- [ ] showing.ts
- [ ] telling.ts
- [ ] asking.ts
- [ ] attacking.ts
- [ ] climbing.ts
- [ ] closing.ts
- [ ] drinking.ts
- [ ] eating.ts
- [ ] listening.ts
- [ ] pulling.ts
- [ ] pushing.ts
- [ ] reading.ts
- [ ] searching.ts
- [ ] switching.ts
- [ ] talking.ts
- [ ] throwing.ts
- [ ] touching.ts
- [ ] waiting.ts
- [ ] wearing.ts

## Phase 5: Update All Package Imports

### Update imports in:
- [ ] engine package
- [ ] parser-en-us package
- [ ] lang-en-us package
- [ ] text-services package
- [ ] event-processor package
- [ ] if-domain package (self-references)
- [ ] platforms/cli-en-us
- [ ] extensions/conversation
- [ ] extensions/blood-magic

## Phase 6: Update Stories

- [ ] stories/cloak-of-darkness
- [ ] Any other test stories

## Phase 7: Update Tests

### Core tests:
- [ ] All unit tests
- [ ] All integration tests

### World-model tests:
- [ ] All unit tests
- [ ] All integration tests

### Stdlib tests:
- [ ] All action tests
- [ ] All scope tests
- [ ] All validation tests

### Story tests:
- [ ] All story-specific tests

## Phase 8: Build Verification

- [ ] Build core package
- [ ] Build world-model package
- [ ] Build if-domain package
- [ ] Build stdlib package
- [ ] Build engine package
- [ ] Build all other packages
- [ ] Run all tests
- [ ] Run integration tests

## Phase 9: Documentation

- [ ] Update all API documentation
- [ ] Update architecture diagrams
- [ ] Update README files
- [ ] Create migration guide
- [ ] Update examples

## Phase 10: Compatibility Layer

- [ ] Add type aliases in stdlib for backward compatibility
- [ ] Add deprecation notices
- [ ] Document migration path

## Automation Opportunities

Many of these changes can be automated with regex replacements:
```bash
# Example for core package
find packages/core -name "*.ts" -exec sed -i 's/export interface \([A-Z]\)/export interface I\1/g' {} \;
find packages/core -name "*.ts" -exec sed -i 's/: \([A-Z][a-zA-Z]*\)</: I\1</g' {} \;
find packages/core -name "*.ts" -exec sed -i 's/implements \([A-Z]\)/implements I\1/g' {} \;
```

## Risk Areas

1. **Name collisions**: Watch for existing interfaces starting with 'I'
2. **Type parameters**: Generic types need careful handling
3. **Declaration merging**: Some may break when separated
4. **Third-party types**: Can't rename external interfaces
5. **Runtime checks**: Any `instanceof` checks will fail

## Rollback Plan

1. Git revert all commits
2. Restore package.json versions
3. Re-publish previous versions
4. Document issues encountered