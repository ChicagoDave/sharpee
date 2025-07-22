# Save/Restore Implementation Checklist

This checklist tracks the implementation of save/restore functionality as designed in ADR-033.

## ✅ Completed Core Engine Work

### Data Structures (DONE)
- [x] Define `SaveData` interface in core types
- [x] Define `SerializedEvent` interface
- [x] Define `SerializedEntity` interface  
- [x] Define `SerializedLocation` interface
- [x] Define `SerializedRelationship` interface
- [x] Define `SaveRestoreHooks` interface

### Engine Class (DONE)
- [x] Add `saveRestoreHooks` property to Engine
- [x] Implement `registerSaveRestoreHooks()` method
- [x] Implement `save()` method
- [x] Implement `restore()` method
- [x] Implement `createSaveData()` private method
- [x] Implement `loadSaveData()` private method

### Serialization Logic (DONE)
- [x] Implement EventSource serialization
- [x] Implement SpatialIndex serialization
- [x] Implement TurnHistory serialization
- [x] Convert entity references to IDs
- [x] Track events in event source during turn execution

### Deserialization Logic (DONE)
- [x] Implement EventSource deserialization
- [x] Implement SpatialIndex deserialization (basic)
- [x] Implement TurnHistory deserialization
- [x] Add version compatibility validation
- [x] Add story ID verification

## 🚧 Integration Work Needed

### Action-Engine Integration
The save/restore actions already exist in stdlib but need to be connected to the engine:

**Problem**: Actions are synchronous but save/restore operations are async

**Options**:
1. **Event-based approach**: Actions emit save/restore request events, engine listens and handles async
2. **Engine reference**: Pass engine reference to world model so actions can access it
3. **Capability pattern**: Register save/restore as world capabilities that wrap async operations

**Recommendation**: Use event-based approach to maintain clean separation

### Required Integration Steps
- [ ] Decide on integration pattern (event-based vs direct reference)
- [ ] Update saving.ts action to trigger save
- [ ] Update restoring.ts action to trigger restore  
- [ ] Update quitting.ts to handle auto-save
- [ ] Ensure engine listens for save/restore events
- [ ] Handle async completion and UI refresh

## 📝 Known Limitations (TODOs)

### Technical Debt
- [ ] **Trait Factory**: Deserializing traits currently returns raw data instead of proper trait instances
- [ ] **Relationships**: Only location relationships are serialized (not supports, worn-by, etc.)
- [ ] **Parser State**: Currently just empty object - each parser needs its own serialization
- [ ] **Data Validation**: More robust validation of save data structure integrity needed

### Future Enhancements
- [ ] **Event Sourcing**: ADR-034 proposes using pure event replay (simpler approach)
- [ ] **Save Slots**: Client implementations can add UI for multiple saves
- [ ] **Compression**: Clients can compress JSON blobs if needed
- [ ] **Cloud Saves**: Clients can implement cloud storage providers
- [ ] **Migration**: System for upgrading saves when story version changes

## 🧪 Testing Requirements

### Unit Tests Needed
- [ ] Test SaveData serialization/deserialization
- [ ] Test save with complex game state
- [ ] Test restore with validation
- [ ] Test save/restore cycle preserves state
- [ ] Test error handling (corrupted saves, wrong version)

### Integration Tests Needed  
- [ ] Test save command flow end-to-end
- [ ] Test restore command flow end-to-end
- [ ] Test auto-save on quit
- [ ] Test UI refresh after restore

## 📚 Documentation Needed
- [ ] Document SaveRestoreHooks interface for client implementers
- [ ] Add save/restore section to client implementation guide
- [ ] Create example implementations (browser, Node.js, Electron)
- [ ] Document save data format for debugging

## ✨ Summary

The core save/restore functionality is implemented in the engine with:
- Complete data structures for serialization
- Engine methods for save/restore with client hooks
- Basic serialization of world state, events, and turn history
- Validation on restore

The main remaining work is integrating the existing save/restore actions with the new engine functionality, which requires solving the sync/async mismatch between actions and save operations.
