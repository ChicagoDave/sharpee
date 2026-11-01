/**
 * read-world-snapshot.test.ts — the walk's snapshot takes the role holder
 * from the live world (ADR-390 D1): the world's JSON carries no player id,
 * so `readWorldSnapshot` derives `playerId` from `playerCharacter`.
 */
import { describe, expect, it } from 'vitest';
import { ActorTrait, WorldModel } from '@sharpee/world-model';
import { readWorldSnapshot } from '../src/claims/claims-game.js';

describe('readWorldSnapshot (ADR-390 D1)', () => {
  it('carries the live role holder as playerId, and none when no actor holds the role', () => {
    const world = new WorldModel();
    expect(readWorldSnapshot(world).playerId).toBeUndefined();

    const room = world.createEntity('hall', 'room');
    const player = world.createEntity('player', 'actor');
    player.add(new ActorTrait({ isPlayable: true }));
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    const snapshot = readWorldSnapshot(world);
    expect(snapshot.playerId).toBe(player.id);
    expect(JSON.parse(world.toJSON()).playerId).toBeUndefined();
  });
});
