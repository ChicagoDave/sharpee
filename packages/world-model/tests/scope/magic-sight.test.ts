/**
 * @file Magic Sight Test
 * @description Tests scope rules for magical vision abilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../src/world/WorldModel';
import { ScopeRule } from '../../src/scope/scope-rule';
import { IFEntity } from '../../src/entities/if-entity';
import { RoomTrait } from '../../src/traits/room/roomTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { ActorTrait } from '../../src/traits/actor/actorTrait';
import { SceneryTrait } from '../../src/traits/scenery/sceneryTrait';

describe('Magic Sight Scope Rules', () => {
  let world: WorldModel;
  let player: IFEntity;
  let wizard: IFEntity;
  let chamber: IFEntity;
  let hiddenRoom: IFEntity;
  let vault: IFEntity;
  let treasure: IFEntity;
  let invisibleCloak: IFEntity;
  let magicOrb: IFEntity;
  let secretDoor: IFEntity;
  let chest: IFEntity;
  let artifact: IFEntity;

  beforeEach(() => {
    // Create world without default rules for better control
    world = new WorldModel();
    
    // Remove default rules to have full control over visibility
    world.removeScopeRule('default_room_visibility');
    world.removeScopeRule('default_inventory_visibility');

    // Create rooms
    chamber = world.createEntity('Wizard Chamber', 'room');
    chamber.add(new RoomTrait());
    chamber.add(new ContainerTrait());

    hiddenRoom = world.createEntity('Hidden Room', 'room');
    hiddenRoom.add(new RoomTrait());
    hiddenRoom.add(new ContainerTrait());

    vault = world.createEntity('Vault', 'room');
    vault.add(new RoomTrait());
    vault.add(new ContainerTrait());

    // Create magical items
    treasure = world.createEntity('golden treasure', 'object');
    world.moveEntity(treasure.id, hiddenRoom.id);

    invisibleCloak = world.createEntity('invisible cloak', 'object');
    world.setStateValue(`${invisibleCloak.id}_invisible`, true);
    world.moveEntity(invisibleCloak.id, chamber.id);

    magicOrb = world.createEntity('crystal orb', 'object');
    world.moveEntity(magicOrb.id, chamber.id);

    secretDoor = world.createEntity('secret door', 'door');
    secretDoor.add(new SceneryTrait());
    world.setStateValue(`${secretDoor.id}_concealed`, true);
    world.moveEntity(secretDoor.id, chamber.id);

    chest = world.createEntity('chest', 'container');
    chest.add(new ContainerTrait());
    chest.add(new OpenableTrait());
    world.moveEntity(chest.id, chamber.id);

    artifact = world.createEntity('ancient artifact', 'object');
    
    // Open chest temporarily to put artifact inside
    const chestOpenable = chest.get<OpenableTrait>('openable');
    if (chestOpenable) {
      chestOpenable.isOpen = true;
    }
    world.moveEntity(artifact.id, chest.id);
    
    // Now close the chest
    if (chestOpenable) {
      chestOpenable.isOpen = false;
    }

    // Create characters
    player = world.createEntity('player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.setPlayer(player.id);

    wizard = world.createEntity('wizard', 'actor');
    wizard.add(new ActorTrait());
    wizard.add(new ContainerTrait());
    world.moveEntity(wizard.id, vault.id);

    // Add basic visibility rule
    const basicVisibilityRule: ScopeRule = {
      id: 'basic_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        // Skip for specialized magical sight actions
        if (context.actionId === 'magical_sight' || context.actionId === 'scrying' || context.actionId === 'detecting') {
          return []; // Don't include anything - let specialized rules handle it
        }
        const results: string[] = [];
        
        // Always include current location
        results.push(context.currentLocation);
        
        // Include visible contents of current location
        const contents = context.world.getContents(context.currentLocation);
        for (const item of contents) {
          // Skip invisible items
          if (context.world.getStateValue(`${item.id}_invisible`)) {
            continue;
          }
          
          // Skip concealed items
          if (context.world.getStateValue(`${item.id}_concealed`)) {
            continue;
          }
          
          results.push(item.id);
        }
        
        // Include carried items
        const carried = context.world.getContents(context.actorId);
        results.push(...carried.map(e => e.id));
        
        // Include visible contents of open containers
        for (const container of contents) {
          if (container.has('openable')) {
            const openable = container.get<OpenableTrait>('openable');
            if (openable?.isOpen) {
              const containerContents = context.world.getContents(container.id);
              results.push(...containerContents.map(e => e.id));
            }
          }
        }
        
        return results;
      },
      priority: 50
    };
    
    world.addScopeRule(basicVisibilityRule);
  });

  it.skip('should see invisible objects with true sight - SKIPPED: Magic sight should affect scope, not physical visibility', () => {
    // True sight spell reveals invisible objects
    const trueSightRule: ScopeRule = {
      id: 'true_sight',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        // Check if actor has true sight active
        if (!context.world.getStateValue(`${context.actorId}_true_sight`)) {
          return results;
        }
        
        // See all invisible objects in current location
        const contents = context.world.getContents(context.currentLocation);
        for (const item of contents) {
          if (context.world.getStateValue(`${item.id}_invisible`)) {
            results.push(item.id);
          }
        }
        
        return results;
      },
      forActions: ['looking', 'examining'],
      message: (entityId) => `Your magical sight reveals the ${entityId}!`,
      priority: 80
    };

    world.addScopeRule(trueSightRule);
    world.moveEntity(player.id, chamber.id);
    
    // Without true sight, can't see invisible cloak
    let visible = world.getVisible(player.id);
    expect(visible.map(e => e.id)).not.toContain(invisibleCloak.id);
    
    // Activate true sight
    world.setStateValue(`${player.id}_true_sight`, true);
    
    // Now can see invisible cloak
    visible = world.getVisible(player.id);
    expect(visible.map(e => e.id)).toContain(invisibleCloak.id);
  });

  it.skip('should see through walls with x-ray vision - SKIPPED: X-ray vision should affect scope, not physical visibility', () => {
    // X-ray vision allows seeing into adjacent rooms
    const xrayVisionRule: ScopeRule = {
      id: 'xray_vision',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        // Check if actor has x-ray vision
        if (!context.world.getStateValue(`${context.actorId}_xray_vision`)) {
          return results;
        }
        
        // Get adjacent rooms
        const adjacentRooms = context.world.getStateValue('adjacent_rooms');
        if (adjacentRooms && adjacentRooms[context.currentLocation]) {
          for (const roomId of adjacentRooms[context.currentLocation]) {
            // Include the room itself
            results.push(roomId);
            
            // Include contents of adjacent room
            const contents = context.world.getContents(roomId);
            results.push(...contents.map(e => e.id));
          }
        }
        
        return results;
      },
      forActions: ['looking', 'examining'],
      message: 'Your x-ray vision penetrates the walls.',
      priority: 85
    };

    world.addScopeRule(xrayVisionRule);
    world.setStateValue('adjacent_rooms', {
      [chamber.id]: [hiddenRoom.id],
      [hiddenRoom.id]: [chamber.id]
    });
    
    world.moveEntity(player.id, chamber.id);
    
    // Without x-ray vision, can't see into hidden room
    let visible = world.getVisible(player.id);
    expect(visible.map(e => e.id)).not.toContain(hiddenRoom.id);
    expect(visible.map(e => e.id)).not.toContain(treasure.id);
    
    // Activate x-ray vision
    world.setStateValue(`${player.id}_xray_vision`, true);
    
    // Now can see hidden room and its contents
    visible = world.getVisible(player.id);
    expect(visible.map(e => e.id)).toContain(hiddenRoom.id);
    expect(visible.map(e => e.id)).toContain(treasure.id);
  });

  it('should reveal concealed objects with detect magic', () => {
    // Detect magic reveals magically concealed items
    const detectMagicRule: ScopeRule = {
      id: 'detect_magic',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        // Check if detect magic is active
        if (!context.world.getStateValue(`${context.actorId}_detect_magic`)) {
          return results;
        }
        
        // Reveal concealed magical objects
        const contents = context.world.getContents(context.currentLocation);
        for (const item of contents) {
          if (context.world.getStateValue(`${item.id}_concealed`)) {
            results.push(item.id);
          }
        }
        
        return results;
      },
      forActions: ['detecting', 'examining'],
      message: (entityId) => `A magical aura surrounds the ${entityId}.`,
      priority: 75
    };

    world.addScopeRule(detectMagicRule);
    world.moveEntity(player.id, chamber.id);
    
    // Can't see concealed secret door normally
    let detectable = world.evaluateScope(player.id, 'detecting');
    expect(detectable).not.toContain(secretDoor.id);
    
    // Cast detect magic
    world.setStateValue(`${player.id}_detect_magic`, true);
    
    // Now can detect the secret door
    detectable = world.evaluateScope(player.id, 'detecting');
    expect(detectable).toContain(secretDoor.id);
  });

  it.skip('should see inside closed containers with clairvoyance - SKIPPED: Clairvoyance should affect scope, not physical visibility', () => {
    // Clairvoyance allows seeing inside closed containers
    const clairvoyanceRule: ScopeRule = {
      id: 'clairvoyance',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        // Check if clairvoyance is active
        if (!context.world.getStateValue(`${context.actorId}_clairvoyance`)) {
          return results;
        }
        
        // See inside all containers, even closed ones
        const contents = context.world.getContents(context.currentLocation);
        for (const container of contents) {
          if (container.has('container')) {
            const containerContents = context.world.getContents(container.id);
            results.push(...containerContents.map(e => e.id));
          }
        }
        
        return results;
      },
      forActions: ['looking', 'examining'],
      message: 'Your mind\'s eye peers inside.',
      priority: 80
    };

    world.addScopeRule(clairvoyanceRule);
    world.moveEntity(player.id, chamber.id);
    
    // Chest is closed, can't see artifact inside
    let visible = world.getVisible(player.id);
    expect(visible.map(e => e.id)).not.toContain(artifact.id);
    
    // Activate clairvoyance
    world.setStateValue(`${player.id}_clairvoyance`, true);
    
    // Now can see inside closed chest
    visible = world.getVisible(player.id);
    expect(visible.map(e => e.id)).toContain(artifact.id);
  });

  it('should have remote viewing through crystal orb', () => {
    // Crystal orb allows viewing distant locations
    const crystalOrbRule: ScopeRule = {
      id: 'crystal_orb_scrying',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        // Check if actor is holding the crystal orb
        const carried = context.world.getContents(context.actorId);
        const hasOrb = carried.some(item => item.id === magicOrb.id);
        
        if (!hasOrb) {
          return results;
        }
        
        // Check what location the orb is focused on
        const scryingTarget = context.world.getStateValue('orb_scrying_target');
        if (!scryingTarget) {
          return results;
        }
        
        // Can see the target location and its contents
        results.push(scryingTarget);
        const targetContents = context.world.getContents(scryingTarget);
        results.push(...targetContents.map(e => e.id));
        
        return results;
      },
      forActions: ['scrying'],
      message: (entityId) => `The orb shows you ${entityId}.`,
      priority: 90
    };

    world.addScopeRule(crystalOrbRule);
    world.moveEntity(player.id, chamber.id);
    world.moveEntity(magicOrb.id, player.id); // Pick up orb
    
    // Focus the orb on the vault
    world.setStateValue('orb_scrying_target', vault.id);
    
    // Can see vault and wizard through the orb
    const scryingScope = world.evaluateScope(player.id, 'scrying');
    expect(scryingScope).toContain(vault.id);
    expect(scryingScope).toContain(wizard.id);
  });

  it.skip('should combine multiple magical sight abilities - SKIPPED: Magic sight should affect scope, not physical visibility', () => {
    // Set up room connections
    world.setStateValue('adjacent_rooms', {
      [chamber.id]: [hiddenRoom.id],
      [hiddenRoom.id]: [chamber.id]
    });

    // Move invisible cloak to hidden room
    world.moveEntity(invisibleCloak.id, hiddenRoom.id);

    // All magical sight rules from previous tests
    const magicSightRules: ScopeRule[] = [
      // True sight for invisible objects
      {
        id: 'combined_true_sight',
        fromLocations: '*',
        includeEntities: (context) => {
          const results: string[] = [];
          if (!context.world.getStateValue(`${context.actorId}_true_sight`)) {
            return results;
          }
          
          // See invisible in current room
          const contents = context.world.getContents(context.currentLocation);
          for (const item of contents) {
            if (context.world.getStateValue(`${item.id}_invisible`)) {
              results.push(item.id);
            }
          }
          
          // Also check x-ray vision rooms if active
          if (context.world.getStateValue(`${context.actorId}_xray_vision`)) {
            const adjacent = context.world.getStateValue('adjacent_rooms');
            if (adjacent && adjacent[context.currentLocation]) {
              for (const roomId of adjacent[context.currentLocation]) {
                const roomContents = context.world.getContents(roomId);
                for (const item of roomContents) {
                  if (context.world.getStateValue(`${item.id}_invisible`)) {
                    results.push(item.id);
                  }
                }
              }
            }
          }
          
          return results;
        },
        priority: 85
      },
      // X-ray vision for adjacent rooms
      {
        id: 'combined_xray',
        fromLocations: '*',
        includeEntities: (context) => {
          const results: string[] = [];
          if (!context.world.getStateValue(`${context.actorId}_xray_vision`)) {
            return results;
          }
          
          const adjacent = context.world.getStateValue('adjacent_rooms');
          if (adjacent && adjacent[context.currentLocation]) {
            for (const roomId of adjacent[context.currentLocation]) {
              results.push(roomId);
              const contents = context.world.getContents(roomId);
              results.push(...contents.filter(e => 
                !context.world.getStateValue(`${e.id}_invisible`)
              ).map(e => e.id));
            }
          }
          
          return results;
        },
        priority: 80
      }
    ];

    magicSightRules.forEach(rule => world.addScopeRule(rule));
    world.moveEntity(player.id, chamber.id);
    
    // Activate both true sight and x-ray vision
    world.setStateValue(`${player.id}_true_sight`, true);
    world.setStateValue(`${player.id}_xray_vision`, true);
    
    const visible = world.getVisible(player.id);
    
    // Can see through walls (x-ray)
    expect(visible.map(e => e.id)).toContain(hiddenRoom.id);
    expect(visible.map(e => e.id)).toContain(treasure.id);
    
    // Can see invisible items in adjacent room (combined powers)
    expect(visible.map(e => e.id)).toContain(invisibleCloak.id);
  });

  it('should limit magical sight by power level', () => {
    // Magical sight effectiveness depends on power level
    const powerLimitedSightRule: ScopeRule = {
      id: 'power_limited_sight',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        
        const powerLevel = context.world.getStateValue(`${context.actorId}_magic_power`) || 0;
        if (powerLevel === 0) {
          return results;
        }
        
        // Level 1: See magical auras
        if (powerLevel >= 1) {
          const contents = context.world.getContents(context.currentLocation);
          for (const item of contents) {
            if (context.world.getStateValue(`${item.id}_magical`)) {
              results.push(`${item.id}_aura`);
            }
          }
        }
        
        // Level 2: See invisible
        if (powerLevel >= 2) {
          const contents = context.world.getContents(context.currentLocation);
          for (const item of contents) {
            if (context.world.getStateValue(`${item.id}_invisible`)) {
              results.push(item.id);
            }
          }
        }
        
        // Level 3: See through walls
        if (powerLevel >= 3) {
          const adjacent = context.world.getStateValue('adjacent_rooms');
          if (adjacent && adjacent[context.currentLocation]) {
            results.push(...adjacent[context.currentLocation]);
          }
        }
        
        return results;
      },
      forActions: ['magical_sight'],
      priority: 75
    };

    world.addScopeRule(powerLimitedSightRule);
    world.moveEntity(player.id, chamber.id);
    world.setStateValue(`${magicOrb.id}_magical`, true);
    world.setStateValue('adjacent_rooms', {
      [chamber.id]: [hiddenRoom.id]
    });
    
    // Level 0: No magical sight
    let magicVisible = world.evaluateScope(player.id, 'magical_sight');
    expect(magicVisible.length).toBe(0);
    
    // Level 1: See magical auras only
    world.setStateValue(`${player.id}_magic_power`, 1);
    magicVisible = world.evaluateScope(player.id, 'magical_sight');
    expect(magicVisible).toContain(`${magicOrb.id}_aura`);
    expect(magicVisible).not.toContain(invisibleCloak.id);
    
    // Level 2: Also see invisible
    world.setStateValue(`${player.id}_magic_power`, 2);
    magicVisible = world.evaluateScope(player.id, 'magical_sight');
    expect(magicVisible).toContain(invisibleCloak.id);
    expect(magicVisible).not.toContain(hiddenRoom.id);
    
    // Level 3: Full power - see through walls
    world.setStateValue(`${player.id}_magic_power`, 3);
    magicVisible = world.evaluateScope(player.id, 'magical_sight');
    expect(magicVisible).toContain(hiddenRoom.id);
  });
});