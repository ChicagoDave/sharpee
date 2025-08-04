# Scope System Implementation Checklist

## Phase 1: Core Scope System ✅
- [x] Create scope/types.ts with core interfaces
  - [x] ScopeLevel enum
  - [x] SenseType enum  
  - [x] ScopeResolver interface
  - [x] WitnessSystem interface
  - [x] EntityKnowledge interface

- [x] Implement basic ScopeResolver (scope/scope-resolver.ts)
  - [x] getScope method
  - [x] canSee method (basic same-room visibility)
  - [x] canReach method (basic reachability)
  - [x] getVisible method
  - [x] getReachable method

- [x] Add container visibility rules
  - [x] Closed containers block sight
  - [x] Open containers allow sight
  - [x] Nested container traversal

- [x] Add supporter visibility rules
  - [x] Items on supporters inherit visibility
  - [x] Height affects reachability

- [x] Create scope tests
  - [x] Same room visibility
  - [x] Container blocking
  - [x] Supporter visibility
  - [x] Reachability tests

## Phase 2: Witnessing System ✅
- [x] Create witness/types.ts
  - [x] StateChange interface
  - [x] WitnessRecord interface
  - [x] WitnessLevel enum
  - [x] EntityKnowledge interface

- [x] Implement WitnessSystem (witness/witness-system.ts)
  - [x] recordWitnesses method
  - [x] determineWitnesses logic
  - [x] updateKnowledge method
  - [x] getKnownEntities method
  - [x] hasDiscovered method

- [x] Add discovery tracking
  - [x] beenSeen flags
  - [x] lastKnownLocation tracking
  - [x] discoveredBy actor lists

- [x] Integrate with WorldModel
  - [x] Hook into moveEntity
  - [x] Hook into setProperty
  - [x] Hook into create/destroy

- [x] Create witness tests
  - [x] Movement witnessing
  - [x] Discovery persistence
  - [x] Multi-actor knowledge

## Phase 3: Sensory Extensions ✅
- [x] Add hearing scope
  - [x] canHear method
  - [x] Sound through doors
  - [x] Sound through walls (blocked for now)
  - [x] Distance attenuation (same room only for now)

- [x] Add smell scope
  - [x] canSmell method
  - [x] Air path requirements
  - [x] Lingering scents (customProperties: smelly/verySmelly)

- [x] Add darkness handling
  - [x] Light trait checking
  - [x] Darkness blocking sight
  - [x] Other senses in darkness

- [x] Create sensory tests
  - [x] Hearing through barriers
  - [x] Smell propagation
  - [x] Darkness effects

## Phase 4: Integration ✅
- [x] Update ActionContext
  - [x] Add scope resolver property
  - [x] Add witness system property
  - [x] Update canSee/canReach to use scope

- [x] Update command validator
  - [x] Use knowledge for entity resolution (via scope)
  - [x] Filter by scope level
  - [x] Generate scope-appropriate errors

- [x] Update affected actions
  - [x] Looking action (use scope for visibility)
  - [x] Taking action (check reachability)
  - [x] Examining action (check visibility)
  - [x] All object manipulation actions (via metadata)

- [x] Fix failing tests
  - [x] Update test utilities to support scope
  - [x] Fix command validator tests
  - [x] Update action tests for scope

## Phase 4.5: Entity Resolution Improvements ✅
- [x] Fix fuzzy matching issues
  - [x] Replace substring matching with exact word matching
  - [x] Special handling for AUDIBLE/DETECTABLE scopes
  - [x] Fix "gem" matching "chest" bug
  
- [x] Fix door connection logic
  - [x] Update getRoomConnection to check room1/room2 properties
  - [x] Fix test door setup to use correct properties
  
- [x] Fix action metadata
  - [x] Update listening action metadata structure
  - [x] Ensure all sensory actions have proper metadata
  
- [x] Fix scope filtering
  - [x] AUDIBLE uses canHear method
  - [x] DETECTABLE uses canSmell method
  - [x] Remove generic "not OUT_OF_SCOPE" check

## Phase 5: Advanced Features
- [ ] Hidden object discovery
  - [ ] LOOK UNDER/BEHIND/ON commands
  - [ ] Discovery state updates
  - [ ] Searching action updates

- [ ] Partial visibility
  - [ ] Glimpse mechanics
  - [ ] Peripheral vision
  - [ ] Confidence levels

- [ ] Scope modifiers
  - [ ] Fog/smoke effects
  - [ ] Enhanced senses
  - [ ] Magical sight

- [ ] Memory decay (optional)
  - [ ] Forgetting old locations
  - [ ] Uncertainty over time

## Testing & Documentation
- [ ] Unit tests for all components
- [ ] Integration tests for scope + witness
- [ ] Update action documentation
- [ ] Add scope examples to docs
- [ ] Migration guide for existing code

## Performance Optimization
- [ ] Cache scope calculations
- [ ] Optimize container traversal
- [ ] Batch witness updates
- [ ] Profile common operations