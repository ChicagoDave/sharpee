/**
 * Debug test to understand scope resolution
 */

import { describe, expect, it } from 'vitest';
import { WorldModel, AuthorModel, TraitType, EntityType } from '@sharpee/world-model';
import { StandardScopeResolver } from '../src/scope/scope-resolver';

describe('Scope Debug', () => {
  it('should handle closed containers', () => {
    const world = new WorldModel();
    const author = new AuthorModel(world.getDataStore(), world);
    const scopeResolver = new StandardScopeResolver(world);
    
    // Create room
    const room = author.createEntity('room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    
    // Create player
    const player = author.createEntity('player', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    world.setPlayer(player.id);
    author.moveEntity(player.id, room.id);
    
    // Create closed box (AuthorModel allows this)
    const box = author.createEntity('box', EntityType.CONTAINER);
    box.add({ type: TraitType.CONTAINER });
    box.add({ type: TraitType.OPENABLE, isOpen: false }); // Closed from the start
    author.moveEntity(box.id, room.id);
    
    // Create coin and put in closed box (AuthorModel allows this)
    const coin = author.createEntity('coin', EntityType.OBJECT);
    author.moveEntity(coin.id, box.id);
    
    // Debug output
    console.log('Box traits:', box.traits);
    console.log('Box container trait:', box.get(TraitType.CONTAINER));
    console.log('Coin location:', world.getLocation(coin.id));
    console.log('Can see coin?', scopeResolver.canSee(player, coin));
    console.log('Can reach coin?', scopeResolver.canReach(player, coin));
    console.log('Coin scope level:', scopeResolver.getScope(player, coin));
    
    // Test expectations
    expect(world.getLocation(coin.id)).toBe(box.id);
    expect(scopeResolver.canSee(player, coin)).toBe(false); // Can't see inside closed box
    expect(scopeResolver.canReach(player, coin)).toBe(false); // Can't reach inside closed box
  });
});