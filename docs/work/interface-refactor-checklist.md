# Interface Refactor Checklist

Complete checklist for adding I-prefix to all interfaces across the Sharpee codebase.

## Phase 1: Core Package Interfaces ✅ COMPLETED

### core/src/types/
- [x] `Entity` → `IEntity`
- [x] `EntityCreationParams` → `IEntityCreationParams`
- [x] `EntityOperationOptions` → `IEntityOperationOptions`
- [x] `AttributeObject` → `IAttributeObject`
- [x] `AttributeConfig` → `IAttributeConfig`
- [x] `Relationship` → `IRelationship`
- [x] `RelationshipConfig` → `IRelationshipConfig`
- [x] `CommandResult` → `ICommandResult`
- [x] `SaveData` → `ISaveData`
- [x] `SaveMetadata` → `ISaveMetadata`
- [x] `EngineState` → `IEngineState`
- [x] `SerializedEvent` → `ISerializedEvent`
- [x] `SerializedSpatialIndex` → `ISerializedSpatialIndex`
- [x] `SerializedEntity` → `ISerializedEntity`
- [x] `SerializedLocation` → `ISerializedLocation`
- [x] `SerializedRelationship` → `ISerializedRelationship`
- [x] `SerializedTurn` → `ISerializedTurn`
- [x] `SerializedParserState` → `ISerializedParserState`
- [x] `StoryConfig` → `IStoryConfig`
- [x] `SaveRestoreHooks` → `ISaveRestoreHooks`
- [x] `QuitContext` → `IQuitContext`
- [x] `RestartContext` → `IRestartContext`
- [x] `SaveResult` → `ISaveResult`
- [x] `RestoreResult` → `IRestoreResult`

### core/src/events/
- [x] `SemanticEvent` → `ISemanticEvent`
- [x] `EventEmitter` → `IEventEmitter`
- [x] `EventSystemOptions` → `IEventSystemOptions`
- [x] `SemanticEventSource` → `ISemanticEventSource`
- [x] `GenericEventSource` → `IGenericEventSource`
- [x] `SystemEvent` → `ISystemEvent`
- [x] `GameEvent` → `IGameEvent`
- [x] `PlatformEvent` → `IPlatformEvent`
- [x] `SaveContext` → `ISaveContext`
- [x] `RestoreContext` → `IRestoreContext`

### core/src/query/
- [x] `PendingQuery` → `IPendingQuery`
- [x] `QueryContext` → `IQueryContext`
- [x] `QueryResponse` → `IQueryResponse`
- [x] `ValidationResult` → `IValidationResult`
- [x] `QueryHandler` → `IQueryHandler`
- [x] `QueryState` → `IQueryState`
- [x] `QueryEvents` → `IQueryEvents`

### core/src/rules/
- [x] `RuleWorld` → `IRuleWorld`
- [x] `RuleResult` → `IRuleResult`
- [x] `EntityChange` → `IEntityChange`
- [x] `Rule` → `IRule`
- [x] `SimpleRuleSystem` → `ISimpleRuleSystem`
- [x] `RuleSystem` → `IRuleSystem`

### core/src/execution/
- [x] `ExecutionContext` → `IExecutionContext`
- [x] `CommandHandler` → `ICommandHandler`
- [x] `Action` → `IAction` (conflicts with stdlib Action!)
- [x] `CommandRouter` → `ICommandRouter`
- [x] `CommandHandlerFactory` → `ICommandHandlerFactory`
- [x] `CommandExecutionOptions` → `ICommandExecutionOptions`

### core/src/extensions/
- [x] `Extension` → `IExtension`
- [x] `CommandExtension` → `ICommandExtension`
- [x] `AbilityExtension` → `IAbilityExtension`
- [x] `EventExtension` → `IEventExtension`
- [x] `ParserExtension` → `IParserExtension`

### core/src/debug/
- [x] `DebugEvent` → `IDebugEvent`
- [x] `DebugContext` → `IDebugContext`

### core/src/constants/
- [x] `CoreRelationshipConfig` → `ICoreRelationshipConfig`

## Phase 2: World Model Package Interfaces ✅ COMPLETED

### world-model/src/world/
- [x] `WorldModel` → `IWorldModel` ✅
- [x] `CapabilityData` → `ICapabilityData` ✅
- [x] `CapabilitySchema` → `ICapabilitySchema` ✅
- [x] `CapabilityStore` → `ICapabilityStore` ✅
- [x] `CapabilityRegistration` → `ICapabilityRegistration` ✅
- [x] `DataStore` → `IDataStore` ✅
- [x] `ItemSpec` → `IItemSpec` ✅

### world-model/src/commands/
- [x] `ParsedObjectReference` → `IParsedObjectReference` ✅
- [x] `ParsedCommandV1` → `IParsedCommandV1` ✅
- [x] `TokenCandidate` → `ITokenCandidate` ✅
- [x] `Token` → `IToken` ✅
- [x] `VerbPhrase` → `IVerbPhrase` ✅
- [x] `NounPhrase` → `INounPhrase` ✅
- [x] `PrepPhrase` → `IPrepPhrase` ✅
- [x] `ParsedCommand` → `IParsedCommand` ✅
- [x] `ParseError` → `IParseError` ✅
- [x] `ValidatedObjectReference` → `IValidatedObjectReference` ✅
- [x] `ValidatedCommand` → `IValidatedCommand` ✅
- [x] `ValidationError` → `IValidationError` ✅
- [x] `ExecutionError` → `IExecutionError` ✅
- [x] `CommandValidator` → `ICommandValidator` ✅
- [x] `CommandExecutor` → `ICommandExecutor` ✅
- [x] `CommandProcessor` → `ICommandProcessor` ✅

### world-model/src/interfaces/
- [x] `Parser` → `IParser` ✅
- [x] `LanguageProvider` → `ILanguageProvider` ✅

### world-model/src/events/
- [x] `GameEvent` → `IGameEvent` ✅
- [x] `EventHandlers` → `IEventHandlers` ✅
- [x] `EventCapableEntity` → `IEventCapableEntity` ✅

### world-model/src/scope/
- [x] `ScopeContext` → `IScopeContext` ✅
- [x] `ScopeRule` → `IScopeRule` ✅
- [x] `ScopeRuleResult` → `IScopeRuleResult` ✅
- [x] `ScopeEvaluationOptions` → `IScopeEvaluationOptions` ✅
- [x] `ScopeEvaluationResult` → `IScopeEvaluationResult` ✅

### world-model/src/behaviors/
- [x] `WorldAwareBehavior` → `IWorldAwareBehavior` ✅

### world-model/src/traits/
- [x] `Trait` → `ITrait` ✅
- [x] `TraitConstructor` → `ITraitConstructor` ✅

### world-model/src/traits/ (Data Interfaces - 30+ interfaces)
- [x] All trait data interfaces renamed (e.g., `WearableData` → `IWearableData`) ✅
- [x] All behavior result interfaces renamed (e.g., `TakeItemResult` → `ITakeItemResult`) ✅
- [x] Special interfaces like `ContainerCapable` → `IContainerCapable` ✅
- [x] Room interfaces like `ExitInfo` → `IExitInfo` ✅

### world-model/src/extensions/
- [x] `ExtensionMetadata` → `IExtensionMetadata` ✅
- [x] `ExtensionDependency` → `IExtensionDependency` ✅
- [x] `ExtensionTraitDefinition` → `IExtensionTraitDefinition` ✅
- [x] `ExtensionEventDefinition` → `IExtensionEventDefinition` ✅
- [x] `ExtensionActionDefinition` → `IExtensionActionDefinition` ✅
- [x] `ExtensionCommandDefinition` → `IExtensionCommandDefinition` ✅
- [x] `ITraitExtension` (already has I!) ✅
- [x] `ExtensionLanguageData` → `IExtensionLanguageData` ✅
- [x] `IExtensionLoader` (already has I!) ✅
- [x] `IExtensionRegistry` (already has I!) ✅
- [x] `IExtensionManager` (added during refactoring) ✅

### Phase 2 Completion Summary:
- [x] All trait class implementations updated ✅
- [x] All scope-evaluator and scope-registry references fixed ✅
- [x] All extension manager and registry references fixed ✅
- [x] All SemanticEvent imports updated to ISemanticEvent ✅
- [x] All interfaces/language-provider.ts references updated ✅
- [x] Build successful with 0 errors ✅
- [x] All tests passing (1124 tests) ✅

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