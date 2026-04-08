/**
 * Unit tests for movement profile builder (ADR-145)
 *
 * Verifies that .movement() on CharacterBuilder produces correct
 * MovementProfile in CompiledCharacter output.
 *
 * Owner context: @sharpee/character / goals
 */

import { CharacterBuilder } from '../../src/character-builder';
import { ConversationBuilder } from '../../src/conversation/builder';

describe('CharacterBuilder.movement()', () => {
  test('compiles movement profile with specific rooms and passages', () => {
    const compiled = new CharacterBuilder('guard')
      .movement({
        knows: ['hall', 'garden', 'kitchen'],
        access: ['hall-garden-door', 'hall-kitchen-door'],
      })
      .compile();

    expect(compiled.movementProfile).toBeDefined();
    expect(compiled.movementProfile!.knows).toEqual(['hall', 'garden', 'kitchen']);
    expect(compiled.movementProfile!.access).toEqual(['hall-garden-door', 'hall-kitchen-door']);
  });

  test('compiles movement profile with "all" access', () => {
    const compiled = new CharacterBuilder('colonel')
      .movement({ knows: 'all', access: 'all' })
      .compile();

    expect(compiled.movementProfile!.knows).toBe('all');
    expect(compiled.movementProfile!.access).toBe('all');
  });

  test('compiles movement profile with knows-all but limited access', () => {
    const compiled = new CharacterBuilder('maid')
      .movement({
        knows: 'all',
        access: ['front-door', 'servants-entrance'],
      })
      .compile();

    expect(compiled.movementProfile!.knows).toBe('all');
    expect(compiled.movementProfile!.access).toEqual(['front-door', 'servants-entrance']);
  });

  test('produces no movementProfile when .movement() not called', () => {
    const compiled = new CharacterBuilder('static-npc').compile();
    expect(compiled.movementProfile).toBeUndefined();
  });

  test('defensive copy — mutating input does not change compiled profile', () => {
    const rooms = ['hall', 'garden'];
    const compiled = new CharacterBuilder('guard')
      .movement({ knows: rooms, access: 'all' })
      .compile();

    rooms.push('secret-room');
    expect(compiled.movementProfile!.knows).toEqual(['hall', 'garden']);
  });

  test('available from ConversationBuilder (inheritance)', () => {
    const compiled = new ConversationBuilder('guard')
      .movement({ knows: ['hall'], access: 'all' })
      .compile();

    expect(compiled.movementProfile).toBeDefined();
    expect(compiled.movementProfile!.knows).toEqual(['hall']);
  });
});
