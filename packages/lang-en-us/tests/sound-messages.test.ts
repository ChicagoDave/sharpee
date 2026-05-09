/**
 * Tests for the spatial-sound prose defaults (ADR-172 Phase 5).
 *
 * Verifies the per-`(kind, audibility_tier)` defaults are present,
 * that `soundMessageId` and `soundFallbackMessageId` produce the
 * expected ids, and that the language provider resolves the message
 * ids through `getMessage()`.
 *
 * Owner context: `@sharpee/lang-en-us`.
 */

import { describe, it, expect } from 'vitest';
import {
  EnglishLanguageProvider,
  soundMessages,
  soundMessageId,
  soundFallbackMessageId,
} from '../src';

describe('soundMessages — table shape', () => {
  it('ships the four delivered tiers for the default fallback set', () => {
    expect(soundMessages['sound.heard.default.full']).toBeDefined();
    expect(soundMessages['sound.heard.default.muffled']).toBeDefined();
    expect(soundMessages['sound.heard.default.fragments']).toBeDefined();
    expect(soundMessages['sound.heard.default.presence-only']).toBeDefined();
  });

  it('ships the four delivered tiers for the speech kind', () => {
    expect(soundMessages['sound.heard.speech.full']).toBeDefined();
    expect(soundMessages['sound.heard.speech.muffled']).toBeDefined();
    expect(soundMessages['sound.heard.speech.fragments']).toBeDefined();
    expect(soundMessages['sound.heard.speech.presence-only']).toBeDefined();
  });

  it('ships the four delivered tiers for the ambient kind', () => {
    expect(soundMessages['sound.heard.ambient.full']).toBeDefined();
    expect(soundMessages['sound.heard.ambient.muffled']).toBeDefined();
    expect(soundMessages['sound.heard.ambient.fragments']).toBeDefined();
    expect(soundMessages['sound.heard.ambient.presence-only']).toBeDefined();
  });

  it('does not ship a "silent" tier (silent is filtered upstream and never rendered)', () => {
    const keys = Object.keys(soundMessages);
    for (const key of keys) {
      expect(key).not.toMatch(/\.silent$/);
    }
  });

  it('all templates reference {You} (perspective-aware) — ADR-089 compliance', () => {
    const values = Object.values(soundMessages);
    for (const template of values) {
      expect(template).toMatch(/\{You\}/);
    }
  });
});

describe('soundMessageId / soundFallbackMessageId helpers', () => {
  it('soundMessageId composes id from kind + tier', () => {
    expect(soundMessageId('speech', 'muffled')).toBe('sound.heard.speech.muffled');
    expect(soundMessageId('shout', 'full')).toBe('sound.heard.shout.full');
    expect(soundMessageId('door-slam', 'presence-only')).toBe(
      'sound.heard.door-slam.presence-only',
    );
  });

  it('soundFallbackMessageId composes the platform-default id from tier', () => {
    expect(soundFallbackMessageId('muffled')).toBe('sound.heard.default.muffled');
    expect(soundFallbackMessageId('full')).toBe('sound.heard.default.full');
    expect(soundFallbackMessageId('fragments')).toBe('sound.heard.default.fragments');
    expect(soundFallbackMessageId('presence-only')).toBe('sound.heard.default.presence-only');
  });
});

describe('EnglishLanguageProvider — sound message resolution', () => {
  it('resolves the speech-muffled message', () => {
    const provider = new EnglishLanguageProvider();
    const text = provider.getMessage('sound.heard.speech.muffled', {
      content: "I won't sign that paper",
    });
    expect(text).toContain("I won't sign that paper");
    // Perspective placeholders resolve at getMessage time.
    expect(text.toLowerCase()).toContain('you');
  });

  it('resolves the default-fallback messages', () => {
    const provider = new EnglishLanguageProvider();
    expect(provider.getMessage('sound.heard.default.full', { kind: 'gunshot' })).toContain(
      'gunshot',
    );
    expect(provider.getMessage('sound.heard.default.presence-only')).toBeTruthy();
  });

  it('hasMessage reports true for every shipped sound id', () => {
    const provider = new EnglishLanguageProvider();
    for (const key of Object.keys(soundMessages)) {
      expect(provider.hasMessage(key)).toBe(true);
    }
  });

  it('returns the message id for an unregistered (kind, tier) pair (signal to fall back)', () => {
    const provider = new EnglishLanguageProvider();
    const id = soundMessageId('story-defined-bell', 'full');
    // No story-defined-bell.full registered — getMessage falls back to
    // returning the id, which Phase 6's dispatcher then maps to the
    // fallback id via `soundFallbackMessageId`.
    expect(provider.getMessage(id)).toBe(id);
  });
});
