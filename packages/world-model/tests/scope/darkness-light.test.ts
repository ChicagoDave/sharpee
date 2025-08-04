/**
 * @file Darkness and Light Source Test
 * @description Tests visibility rules for darkness and light sources
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../src/world/WorldModel';
import { ScopeRule } from '../../src/scope/scope-rule';
import { IFEntity } from '../../src/entities/if-entity';
import { RoomTrait } from '../../src/traits/room/roomTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { LightSourceTrait } from '../../src/traits/light-source/lightSourceTrait';
import { SwitchableTrait } from '../../src/traits/switchable/switchableTrait';
import { ActorTrait } from '../../src/traits/actor/actorTrait';
import { SceneryTrait } from '../../src/traits/scenery/sceneryTrait';

describe('Darkness and Light Source Scope Rules', () => {
  let world: WorldModel;
  let player: IFEntity;
  let darkCave: IFEntity;
  let litRoom: IFEntity;
  let torch: IFEntity;
  let lantern: IFEntity;
  let treasure: IFEntity;
  let inscription: IFEntity;
  let originalRoomVisibilityRule: any;

  beforeEach(() => {
    // Create world without default rules for better control
    world = new WorldModel();
    
    // Remove default rules to have full control over visibility
    world.removeScopeRule('default_room_visibility');
    world.removeScopeRule('default_inventory_visibility');

    // Create a dark cave
    darkCave = world.createEntity('Dark Cave', 'room');
    darkCave.add(new RoomTrait());
    darkCave.add(new ContainerTrait());
    const caveRoom = darkCave.get<RoomTrait>('room');
    if (caveRoom) {
      caveRoom.isDark = true;
    }

    // Create a lit room
    litRoom = world.createEntity('Entrance', 'room');
    litRoom.add(new RoomTrait());
    litRoom.add(new ContainerTrait());

    // Create light sources
    torch = world.createEntity('torch', 'object');
    torch.add(new LightSourceTrait());
    torch.add(new SwitchableTrait());
    const torchSwitch = torch.get<SwitchableTrait>('switchable');
    if (torchSwitch) {
      torchSwitch.isOn = false; // Start off
    }

    lantern = world.createEntity('lantern', 'object');
    lantern.add(new LightSourceTrait());
    lantern.add(new SwitchableTrait());
    const lanternLight = lantern.get<LightSourceTrait>('lightSource');
    if (lanternLight) {
      lanternLight.isLit = true; // Already on
    }
    const lanternSwitch = lantern.get<SwitchableTrait>('switchable');
    if (lanternSwitch) {
      lanternSwitch.isOn = true;
    }

    // Create objects in the cave
    treasure = world.createEntity('treasure', 'object');
    world.moveEntity(treasure.id, darkCave.id);

    inscription = world.createEntity('ancient inscription', 'scenery');
    inscription.add(new SceneryTrait());
    world.moveEntity(inscription.id, darkCave.id);

    // Create player
    player = world.createEntity('player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
    
    // Add a single unified visibility rule that handles both darkness and normal visibility
    const unifiedVisibilityRule: ScopeRule = {
      id: 'unified_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        const location = context.world.getEntity(context.currentLocation);
        const roomTrait = location?.get<RoomTrait>('room');
        const results: string[] = [];
        
        // Always include current location
        results.push(context.currentLocation);
        
        // Always include carried items
        const carried = context.world.getContents(context.actorId);
        results.push(...carried.map(e => e.id));
        
        // Check if room is dark
        if (roomTrait?.isDark) {
          // Check for light sources
          let hasLight = false;
          
          // Check carried items
          for (const item of carried) {
            const lightTrait = item.get<LightSourceTrait>('lightSource');
            if (lightTrait?.isLit) {
              hasLight = true;
              break;
            }
          }
          
          // Check room contents
          if (!hasLight) {
            const roomContents = context.world.getContents(context.currentLocation);
            for (const item of roomContents) {
              const lightTrait = item.get<LightSourceTrait>('lightSource');
              if (lightTrait?.isLit) {
                hasLight = true;
                break;
              }
            }
          }
          
          // If no light, only see carried items and unlit light sources in room
          if (!hasLight) {
            const roomContents = context.world.getContents(context.currentLocation);
            for (const item of roomContents) {
              if (item.has('lightSource')) {
                results.push(item.id);
              }
            }
            return results; // Early return - can't see anything else
          }
        }
        
        // Normal visibility (or lit dark room)
        const contents = context.world.getContents(context.currentLocation);
        results.push(...contents.map(e => e.id));
        
        // Include nested contents
        for (const entity of contents) {
          const nested = context.world.getAllContents(entity.id);
          results.push(...nested.map(e => e.id));
        }
        
        return results;
      },
      priority: 100
    };
    
    world.addScopeRule(unifiedVisibilityRule);
  });

  it('should not see objects in dark room without light', () => {
    world.moveEntity(player.id, darkCave.id);
    world.moveEntity(torch.id, litRoom.id); // Leave torch behind

    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);

    // Can't see treasure or inscription in darkness
    expect(visibleIds).not.toContain(treasure.id);
    expect(visibleIds).not.toContain(inscription.id);
    
    // Can still "see" the room itself (know where you are)
    expect(visibleIds).toContain(darkCave.id);
    
    // Should ONLY see the room
    expect(visibleIds.length).toBe(1);
  });

  it('should see objects when carrying lit light source', () => {
    world.moveEntity(player.id, darkCave.id);
    world.moveEntity(lantern.id, player.id); // Carry lit lantern
    
    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);

    // Can now see everything in the room
    expect(visibleIds).toContain(treasure.id);
    expect(visibleIds).toContain(inscription.id);
    expect(visibleIds).toContain(darkCave.id);
    expect(visibleIds).toContain(lantern.id);
  });

  it('should not see when light source is off', () => {
    world.moveEntity(player.id, darkCave.id);
    world.moveEntity(torch.id, player.id); // Carry unlit torch
    
    // Debug info
    console.log('Player location:', world.getLocation(player.id));
    console.log('Torch location:', world.getLocation(torch.id));
    console.log('Torch ID:', torch.id);
    console.log('Player ID:', player.id);

    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);
    console.log('Visible IDs:', visibleIds);

    // Can see the torch itself
    expect(visibleIds).toContain(torch.id);
    
    // But not other objects
    expect(visibleIds).not.toContain(treasure.id);
    expect(visibleIds).not.toContain(inscription.id);
  });

  it('should see when light source is turned on', () => {
    world.moveEntity(player.id, darkCave.id);
    world.moveEntity(torch.id, player.id);

    // Turn on the torch
    const torchSwitch = torch.get<SwitchableTrait>('switchable');
    const torchLight = torch.get<LightSourceTrait>('lightSource');
    if (torchSwitch && torchLight) {
      torchSwitch.isOn = true;
      torchLight.isLit = true;
    }

    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);

    // Can now see everything
    expect(visibleIds).toContain(treasure.id);
    expect(visibleIds).toContain(inscription.id);
  });

  it('should see when room has light source', () => {
    world.moveEntity(player.id, darkCave.id);
    world.moveEntity(lantern.id, darkCave.id); // Put lit lantern in room

    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);

    // Room is lit, can see everything
    expect(visibleIds).toContain(treasure.id);
    expect(visibleIds).toContain(inscription.id);
    expect(visibleIds).toContain(lantern.id);
  });

  it('should work normally in lit rooms', () => {
    world.moveEntity(player.id, litRoom.id);
    world.moveEntity(torch.id, litRoom.id);

    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);

    // Normal visibility in lit room
    expect(visibleIds).toContain(litRoom.id);
    expect(visibleIds).toContain(torch.id);
  });

  it.skip('should support partial darkness with specific visibility - SKIPPED: Scope rules should not affect physical visibility', () => {
    // Add a glowing crystal that provides dim light
    const crystal = world.createEntity('glowing crystal', 'object');
    crystal.add(new SceneryTrait());
    world.moveEntity(crystal.id, darkCave.id);

    // Add rule for dim light
    const dimLightRule: ScopeRule = {
      id: 'dim_light_visibility',
      fromLocations: [darkCave.id],
      includeEntities: (context) => {
        // In dim light, can only see large/glowing objects
        const results: string[] = [];
        const roomContents = context.world.getContents(context.currentLocation);
        
        for (const item of roomContents) {
          // Can see glowing things
          const name = item.attributes.displayName || item.id;
          if (name.includes('glowing') || name.includes('crystal')) {
            results.push(item.id);
          }
          // Can see large things like treasure
          if (item.id === treasure.id) {
            results.push(item.id);
          }
        }
        
        return results;
      },
      condition: (context) => {
        // Check if crystal is in room
        const roomContents = context.world.getContents(context.currentLocation);
        return roomContents.some(e => e.id === crystal.id);
      },
      priority: 150 // Between darkness and normal
    };

    world.addScopeRule(dimLightRule);
    world.moveEntity(player.id, darkCave.id);

    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);

    // Can see crystal and treasure in dim light
    expect(visibleIds).toContain(crystal.id);
    expect(visibleIds).toContain(treasure.id);
    
    // But not the inscription (too small/faint)
    expect(visibleIds).not.toContain(inscription.id);
  });

  it('should handle underground darkness differently', () => {
    // Make cave underground (never has natural light)
    const caveRoom = darkCave.get<RoomTrait>('room');
    if (caveRoom) {
      caveRoom.isUnderground = true;
    }

    // Add time-based lighting rule
    const naturalLightRule: ScopeRule = {
      id: 'natural_light',
      fromLocations: '*',
      includeEntities: () => [], // No effect on entity visibility
      condition: (context) => {
        const location = context.world.getEntity(context.currentLocation);
        const roomTrait = location?.get<RoomTrait>('room');
        
        // Underground rooms never get natural light
        if (roomTrait?.isUnderground) {
          return false;
        }
        
        // Outdoor rooms get light during day
        if (roomTrait?.isOutdoors) {
          const timeOfDay = context.world.getStateValue('timeOfDay');
          return timeOfDay === 'day';
        }
        
        return false;
      },
      priority: 180
    };

    world.addScopeRule(naturalLightRule);
    world.setStateValue('timeOfDay', 'day');
    world.moveEntity(player.id, darkCave.id);

    const visible = world.getVisible(player.id);
    const visibleIds = visible.map(e => e.id);

    // Still dark underground even during day
    expect(visibleIds).not.toContain(treasure.id);
    expect(visibleIds).not.toContain(inscription.id);
  });
});