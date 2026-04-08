/**
 * Unit tests for propagation builder API (ADR-144 layer 5)
 *
 * Verifies that .propagation() on CharacterBuilder produces correct
 * PropagationProfile in CompiledCharacter output.
 *
 * Owner context: @sharpee/character / propagation
 */

import { CharacterBuilder } from '../../src/character-builder';
import { ConversationBuilder } from '../../src/conversation/builder';
import { PropagationProfile } from '../../src/propagation/propagation-types';

describe('CharacterBuilder.propagation()', () => {
  test('compiles chatty profile with defaults', () => {
    const compiled = new CharacterBuilder('maid')
      .propagation({ tendency: 'chatty' })
      .compile();

    expect(compiled.propagationProfile).toBeDefined();
    expect(compiled.propagationProfile!.tendency).toBe('chatty');
    // Optional fields should not be present when not set
    expect(compiled.propagationProfile!.audience).toBeUndefined();
    expect(compiled.propagationProfile!.pace).toBeUndefined();
  });

  test('compiles selective profile with full options', () => {
    const compiled = new CharacterBuilder('cook')
      .propagation({
        tendency: 'selective',
        audience: 'trusted',
        excludes: ['colonel'],
        spreads: ['murder', 'weapon'],
        pace: 'gradual',
        coloring: 'conspiratorial',
        receives: 'as belief',
        playerCanLeverage: false,
        schedule: { when: ['alone with listener'] },
      })
      .compile();

    const profile = compiled.propagationProfile!;
    expect(profile.tendency).toBe('selective');
    expect(profile.audience).toBe('trusted');
    expect(profile.excludes).toEqual(['colonel']);
    expect(profile.spreads).toEqual(['murder', 'weapon']);
    expect(profile.pace).toBe('gradual');
    expect(profile.coloring).toBe('conspiratorial');
    expect(profile.receives).toBe('as belief');
    expect(profile.playerCanLeverage).toBe(false);
    expect(profile.schedule).toEqual({ when: ['alone with listener'] });
  });

  test('compiles mute profile', () => {
    const compiled = new CharacterBuilder('colonel')
      .propagation({ tendency: 'mute' })
      .compile();

    expect(compiled.propagationProfile!.tendency).toBe('mute');
  });

  test('compiles profile with per-fact overrides', () => {
    const compiled = new CharacterBuilder('maid')
      .propagation({
        tendency: 'chatty',
        withholds: ['secret-affair'],
        overrides: {
          murder: {
            to: 'anyone',
            spreadsVersion: 'lie',
            witnessed: 'maid-gossips-about-murder',
          },
        },
      })
      .compile();

    const profile = compiled.propagationProfile!;
    expect(profile.withholds).toEqual(['secret-affair']);
    expect(profile.overrides!['murder'].to).toBe('anyone');
    expect(profile.overrides!['murder'].spreadsVersion).toBe('lie');
    expect(profile.overrides!['murder'].witnessed).toBe('maid-gossips-about-murder');
  });

  test('produces no propagationProfile when .propagation() not called', () => {
    const compiled = new CharacterBuilder('gardener').compile();
    expect(compiled.propagationProfile).toBeUndefined();
  });

  test('defensive copy — mutating input does not change compiled profile', () => {
    const excludes = ['colonel'];
    const compiled = new CharacterBuilder('maid')
      .propagation({ tendency: 'chatty', excludes })
      .compile();

    excludes.push('gardener');
    expect(compiled.propagationProfile!.excludes).toEqual(['colonel']);
  });

  test('available from ConversationBuilder (inheritance)', () => {
    const compiled = new ConversationBuilder('maid')
      .propagation({ tendency: 'chatty', audience: 'anyone' })
      .topic('murder', { keywords: ['murder', 'killing'] })
      .compile();

    expect(compiled.propagationProfile).toBeDefined();
    expect(compiled.propagationProfile!.tendency).toBe('chatty');
    expect(compiled.propagationProfile!.audience).toBe('anyone');
  });
});
