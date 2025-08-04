/**
 * @file Sound Traveling Test
 * @description Tests scope rules for sounds traveling between locations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../src/world/WorldModel';
import { ScopeRule } from '../../src/scope/scope-rule';
import { IFEntity } from '../../src/entities/if-entity';
import { RoomTrait } from '../../src/traits/room/roomTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { ActorTrait } from '../../src/traits/actor/actorTrait';
import { SceneryTrait } from '../../src/traits/scenery/sceneryTrait';

describe('Sound Traveling Scope Rules', () => {
  let world: WorldModel;
  let player: IFEntity;
  let kitchen: IFEntity;
  let livingRoom: IFEntity;
  let basement: IFEntity;
  let garden: IFEntity;
  let bell: IFEntity;
  let radio: IFEntity;
  let waterfall: IFEntity;

  beforeEach(() => {
    // Create world without default rules for better control
    world = new WorldModel();
    
    // Remove default rules to have full control over visibility
    world.removeScopeRule('default_room_visibility');
    world.removeScopeRule('default_inventory_visibility');

    // Create rooms
    kitchen = world.createEntity('Kitchen', 'room');
    kitchen.add(new RoomTrait());
    kitchen.add(new ContainerTrait());

    livingRoom = world.createEntity('Living Room', 'room');
    livingRoom.add(new RoomTrait());
    livingRoom.add(new ContainerTrait());

    basement = world.createEntity('Basement', 'room');
    basement.add(new RoomTrait());
    basement.add(new ContainerTrait());
    const basementRoom = basement.get<RoomTrait>('room');
    if (basementRoom) {
      basementRoom.isUnderground = true;
    }

    garden = world.createEntity('Garden', 'room');
    garden.add(new RoomTrait());
    garden.add(new ContainerTrait());
    const gardenRoom = garden.get<RoomTrait>('room');
    if (gardenRoom) {
      gardenRoom.isOutdoors = true;
    }

    // Create sound-making objects
    bell = world.createEntity('dinner bell', 'object');
    world.moveEntity(bell.id, kitchen.id);

    radio = world.createEntity('radio', 'object');
    world.moveEntity(radio.id, livingRoom.id);

    waterfall = world.createEntity('waterfall', 'scenery');
    waterfall.add(new SceneryTrait());
    world.moveEntity(waterfall.id, garden.id);

    // Create player
    player = world.createEntity('player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.setPlayer(player.id);

    // Add basic visibility rule
    const basicVisibilityRule: ScopeRule = {
      id: 'basic_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        // For hearing/listening actions, don't include visual-only content
        if (context.actionId === 'hearing' || context.actionId === 'listening' || context.actionId === 'listen_carefully') {
          // Only include the room for orientation
          results.push(context.currentLocation);
          
          // Include carried items (you can always sense what you're carrying)
          const carried = context.world.getContents(context.actorId);
          results.push(...carried.map(e => e.id));
        } else {
          // Normal visibility for other actions
          results.push(context.currentLocation);
          
          // Include contents of current location
          const contents = context.world.getContents(context.currentLocation);
          results.push(...contents.map(e => e.id));
          
          // Include carried items
          const carried = context.world.getContents(context.actorId);
          results.push(...carried.map(e => e.id));
        }
        
        return results;
      },
      priority: 50
    };
    
    world.addScopeRule(basicVisibilityRule);
  });

  it('should hear sounds from adjacent rooms', () => {
    // Set up room adjacency
    world.setStateValue('adjacent_rooms', {
      [kitchen.id]: [livingRoom.id],
      [livingRoom.id]: [kitchen.id]
    });

    // Add sound traveling rule
    const soundRule: ScopeRule = {
      id: 'sound_travel_adjacent',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        const adjacentRooms = context.world.getStateValue('adjacent_rooms');
        
        if (adjacentRooms && adjacentRooms[context.currentLocation]) {
          for (const adjacentRoomId of adjacentRooms[context.currentLocation]) {
            // Check if anything is making sound in adjacent room
            const roomContents = context.world.getContents(adjacentRoomId);
            for (const item of roomContents) {
              if (context.world.getStateValue(`${item.id}_making_sound`)) {
                results.push(item.id);
              }
            }
          }
        }
        
        return results;
      },
      forActions: ['listening', 'hearing'],
      message: (entityId) => `You can hear the ${entityId} from nearby.`,
      priority: 75
    };

    world.addScopeRule(soundRule);
    world.moveEntity(player.id, kitchen.id);
    
    // Radio is not making sound yet
    let audible = world.evaluateScope(player.id, 'listening');
    expect(audible).not.toContain(radio.id);

    // Turn on the radio
    world.setStateValue(`${radio.id}_making_sound`, true);
    
    // Now should hear the radio from kitchen
    audible = world.evaluateScope(player.id, 'listening');
    expect(audible).toContain(radio.id);
  });

  it('should hear loud sounds from further away', () => {
    // Set up room connections (kitchen -> living room -> garden)
    world.setStateValue('room_connections', {
      [kitchen.id]: { [livingRoom.id]: 1 },
      [livingRoom.id]: { [kitchen.id]: 1, [garden.id]: 1 },
      [garden.id]: { [livingRoom.id]: 1 }
    });

    // Add loud sound rule
    const loudSoundRule: ScopeRule = {
      id: 'loud_sound_travel',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        const connections = context.world.getStateValue('room_connections');
        
        // Find all rooms within 2 connections
        const visited = new Set<string>();
        const queue = [{ room: context.currentLocation, distance: 0 }];
        
        while (queue.length > 0) {
          const { room, distance } = queue.shift()!;
          if (visited.has(room)) continue;
          visited.add(room);
          
          if (distance > 0) {
            // Check for loud sounds in this room
            const roomContents = context.world.getContents(room);
            for (const item of roomContents) {
              const loudness = context.world.getStateValue(`${item.id}_loudness`);
              if (loudness && loudness >= distance) {
                results.push(item.id);
              }
            }
          }
          
          // Add connected rooms to queue
          if (distance < 2 && connections[room]) {
            for (const connectedRoom in connections[room]) {
              queue.push({ room: connectedRoom, distance: distance + 1 });
            }
          }
        }
        
        return results;
      },
      forActions: ['listening', 'hearing'],
      message: (entityId) => `You can hear the ${entityId} in the distance.`,
      priority: 80
    };

    world.addScopeRule(loudSoundRule);
    world.moveEntity(player.id, kitchen.id);
    
    // Waterfall is loud (audible 2 rooms away)
    world.setStateValue(`${waterfall.id}_loudness`, 2);
    
    const audible = world.evaluateScope(player.id, 'listening');
    expect(audible).toContain(waterfall.id);
  });

  it('should not hear sounds through solid barriers', () => {
    // Basement is soundproof
    world.setStateValue('soundproof_rooms', [basement.id]);
    
    // Add sound barrier rule
    const soundBarrierRule: ScopeRule = {
      id: 'sound_barriers',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        const soundproofRooms = context.world.getStateValue('soundproof_rooms') || [];
        
        // If current room is soundproof, can't hear outside sounds
        if (soundproofRooms.includes(context.currentLocation)) {
          return results;
        }
        
        // Check adjacent rooms for sounds (but not soundproof ones)
        const adjacentRooms = context.world.getStateValue('adjacent_rooms');
        if (adjacentRooms && adjacentRooms[context.currentLocation]) {
          for (const adjacentRoomId of adjacentRooms[context.currentLocation]) {
            if (!soundproofRooms.includes(adjacentRoomId)) {
              const roomContents = context.world.getContents(adjacentRoomId);
              for (const item of roomContents) {
                if (context.world.getStateValue(`${item.id}_making_sound`)) {
                  results.push(item.id);
                }
              }
            }
          }
        }
        
        return results;
      },
      forActions: ['listening', 'hearing'],
      priority: 90 // Higher priority than normal sound rules
    };

    // Set up adjacency
    world.setStateValue('adjacent_rooms', {
      [basement.id]: [kitchen.id],
      [kitchen.id]: [basement.id]
    });

    world.addScopeRule(soundBarrierRule);
    
    // Ring bell in kitchen
    world.setStateValue(`${bell.id}_making_sound`, true);
    
    // From basement (soundproof), can't hear the bell
    world.moveEntity(player.id, basement.id);
    let audible = world.evaluateScope(player.id, 'listening');
    expect(audible).not.toContain(bell.id);
    
    // From kitchen, can't hear sounds from soundproof basement
    world.moveEntity(player.id, kitchen.id);
    world.moveEntity(radio.id, basement.id);
    world.setStateValue(`${radio.id}_making_sound`, true);
    
    audible = world.evaluateScope(player.id, 'listening');
    expect(audible).not.toContain(radio.id);
  });

  it('should support directional sound', () => {
    const speaker = world.createEntity('speaker', 'object');
    world.moveEntity(speaker.id, kitchen.id);
    
    // Sound that only travels in specific directions
    const directionalSoundRule: ScopeRule = {
      id: 'directional_sound',
      fromLocations: [livingRoom.id],
      includeEntities: (context) => {
        const results: string[] = [];
        
        // Check if speaker is pointing toward the player's location
        const speakerLocation = context.world.getStateValue('speaker_location');
        const speakerDirection = context.world.getStateValue('speaker_direction');
        
        if (speakerLocation === kitchen.id && speakerDirection === livingRoom.id && context.world.getStateValue('speaker_on')) {
          // Player is in living room and speaker points here from kitchen
          results.push(speaker.id);
        }
        
        return results;
      },
      forActions: ['listening'],
      message: 'The speaker is aimed in your direction.',
      priority: 85
    };
    
    world.addScopeRule(directionalSoundRule);
    world.setStateValue('speaker_location', kitchen.id);
    world.setStateValue('speaker_direction', livingRoom.id);
    world.setStateValue('speaker_on', true);
    
    // From living room (where speaker points), can hear it
    world.moveEntity(player.id, livingRoom.id);
    const audible = world.evaluateScope(player.id, 'listening');
    expect(audible).toContain(speaker.id);
    
    // Change direction
    world.setStateValue('speaker_direction', garden.id);
    const notAudible = world.evaluateScope(player.id, 'listening');
    expect(notAudible).not.toContain(speaker.id);
  });

  it('should combine multiple sound rules', () => {
    // Set up connections
    world.setStateValue('adjacent_rooms', {
      [kitchen.id]: [livingRoom.id],
      [livingRoom.id]: [kitchen.id, garden.id],
      [garden.id]: [livingRoom.id]
    });

    // Add multiple sound rules
    const quietSoundRule: ScopeRule = {
      id: 'quiet_sounds',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        const adjacent = context.world.getStateValue('adjacent_rooms');
        
        if (adjacent && adjacent[context.currentLocation]) {
          for (const roomId of adjacent[context.currentLocation]) {
            const contents = context.world.getContents(roomId);
            for (const item of contents) {
              if (context.world.getStateValue(`${item.id}_quiet_sound`)) {
                results.push(item.id);
              }
            }
          }
        }
        
        return results;
      },
      forActions: ['listening'],
      priority: 70
    };

    const echoRule: ScopeRule = {
      id: 'echo_sounds',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        // In certain rooms, hear echoes of sounds
        if (context.world.getStateValue(`${context.currentLocation}_has_echo`)) {
          const contents = context.world.getContents(context.currentLocation);
          for (const item of contents) {
            if (context.world.getStateValue(`${item.id}_making_sound`)) {
              // Add echo version
              results.push(`${item.id}_echo`);
            }
          }
        }
        
        return results;
      },
      forActions: ['listening'],
      priority: 60
    };

    world.addScopeRule(quietSoundRule);
    world.addScopeRule(echoRule);
    
    // Kitchen has echo
    world.setStateValue(`${kitchen.id}_has_echo`, true);
    
    // Bell is ringing (normal sound) in kitchen
    world.setStateValue(`${bell.id}_making_sound`, true);
    
    // Radio is playing quietly in living room
    world.setStateValue(`${radio.id}_quiet_sound`, true);
    
    world.moveEntity(player.id, kitchen.id);
    const audible = world.evaluateScope(player.id, 'listening');
    
    // Should hear the bell's echo in kitchen
    expect(audible).toContain(`${bell.id}_echo`);
    
    // Should hear quiet radio from adjacent room
    expect(audible).toContain(radio.id);
  });

  it('should filter sounds by action type', () => {
    world.setStateValue('adjacent_rooms', {
      [kitchen.id]: [livingRoom.id],
      [livingRoom.id]: [kitchen.id]
    });

    // Different rules for different listening actions
    const activeListeningRule: ScopeRule = {
      id: 'active_listening',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        const adjacent = context.world.getStateValue('adjacent_rooms');
        
        // When actively listening, can hear more
        if (adjacent && adjacent[context.currentLocation]) {
          for (const roomId of adjacent[context.currentLocation]) {
            const contents = context.world.getContents(roomId);
            results.push(...contents.map(e => e.id));
          }
        }
        
        return results;
      },
      forActions: ['listen_carefully'],
      message: 'You focus your hearing...',
      priority: 80
    };

    const passiveHearingRule: ScopeRule = {
      id: 'passive_hearing',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        const adjacent = context.world.getStateValue('adjacent_rooms');
        
        // Passive hearing only picks up active sounds
        if (adjacent && adjacent[context.currentLocation]) {
          for (const roomId of adjacent[context.currentLocation]) {
            const contents = context.world.getContents(roomId);
            for (const item of contents) {
              if (context.world.getStateValue(`${item.id}_making_sound`)) {
                results.push(item.id);
              }
            }
          }
        }
        
        return results;
      },
      forActions: ['hearing'],
      priority: 70
    };

    world.addScopeRule(activeListeningRule);
    world.addScopeRule(passiveHearingRule);
    
    world.moveEntity(player.id, kitchen.id);
    world.setStateValue(`${radio.id}_making_sound`, true);
    
    // Passive hearing only gets active sounds
    let audible = world.evaluateScope(player.id, 'hearing');
    expect(audible).toContain(radio.id);
    expect(audible).not.toContain(bell.id); // Bell not making sound
    
    // Active listening hears everything in adjacent room
    audible = world.evaluateScope(player.id, 'listen_carefully');
    expect(audible).toContain(radio.id); // In adjacent living room
    expect(audible).not.toContain(bell.id); // Bell is in current room, not adjacent
  });
});