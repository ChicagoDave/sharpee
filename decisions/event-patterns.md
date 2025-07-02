# Event Patterns

## Description
All game logic flows through events. Behaviors subscribe to events and can modify or veto them. Two separate event streams serve different purposes.

## Event Streams
1. **Event Source** - High-level narrative events for Text Service
   - Player-visible actions (TakeSuccess, OpenDoor, RoomBecameDark)
   - What happened that matters to the story
   - Used by Text Service to generate output

2. **Audit Log** - Detailed state changes for debugging
   - Every property change (lamp.parent: room → player)
   - Internal validations and checks
   - Cascade tracking
   - Only visible in DEBUG mode

## Patterns
- **Attempt Events** - Fired when player tries an action (TakeAttempted)
- **Success Events** - Fired when action completes (TakeSucceeded)
- **Failure Events** - Fired when action is blocked (TakeFailed)
- **Veto Pattern** - Any behavior can preventDefault() on attempt events
- **Past Tense Rule** - All events use past tense (Opened, Moved, Dropped)

## Scenarios
- Multiple behaviors can check TakeAttempted (Fixed trait blocks it, Capacity trait blocks it)
- First veto wins and provides the failure message
- Success events cannot be vetoed (already validated)
- Query state after all events are processed, not during

## Event Recording Examples
Room becoming dark can happen many ways:

1. **Player turns off lamp**:
   - **Event Source**: SwitchedOff, LightLevelChanged
   - **Audit Log**: lamp.isOn: true→false, room.lightSources.count: 1→0, room.isDark: false→true

2. **Player covers lamp with blanket**:
   - **Event Source**: Covered, LightBlocked, LightLevelChanged  
   - **Audit Log**: blanket.parent: floor→lamp, lamp.isCovered: false→true, lamp.emitsLight: true→false, room.isDark: false→true

3. **Lamp breaks**:
   - **Event Source**: Broken, LightExtinguished, LightLevelChanged
   - **Audit Log**: lamp.isBroken: false→true, lamp.isOn: true→false, lamp removed, brokenLamp created, room.isDark: false→true

4. **Lamp runs out of fuel**:
   - **Event Source**: FuelDepleted, LightExtinguished, LightLevelChanged
   - **Audit Log**: lamp.fuel: 1→0, lamp.isOn: true→false, room.lightSources.count: 1→0, room.isDark: false→true

5. **NPC takes lamp and leaves**:
   - **Event Source**: NPCTook, NPCLeft, LightLevelChanged
   - **Audit Log**: lamp.parent: room→thief, thief.location: room→hallway, room.contents changes, room.isDark: false→true

Text Service sees the high-level narrative. Debug mode shows the full state cascade.
