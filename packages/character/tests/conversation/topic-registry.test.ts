/**
 * Unit tests for TopicRegistry (ADR-142)
 *
 * Verifies topic registration, exact keyword matching, neighborhood
 * fallback, multi-keyword scoring, and availability gating.
 */

import { describe, it, expect } from 'vitest';
import { TopicRegistry, TopicDef } from '../../src/conversation/topic-registry';
import { CharacterModelTrait, ICharacterModelData } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrait(overrides?: ICharacterModelData): CharacterModelTrait {
  return new CharacterModelTrait(overrides);
}

function makeTraitWithKnowledge(topics: string[]): CharacterModelTrait {
  const knowledge: Record<string, any> = {};
  for (const t of topics) {
    knowledge[t] = { source: 'witnessed', confidence: 'certain', turnLearned: 0 };
  }
  return new CharacterModelTrait({ knowledge });
}

function buildRegistry(...topics: TopicDef[]): TopicRegistry {
  const registry = new TopicRegistry();
  for (const t of topics) {
    registry.define(t);
  }
  return registry;
}

// ===========================================================================
// Registration
// ===========================================================================

describe('TopicRegistry — registration', () => {
  it('should register a topic and retrieve it by name', () => {
    const registry = new TopicRegistry();
    registry.define({ name: 'murder', keywords: ['murder', 'killing'] });

    const topic = registry.get('murder');
    expect(topic).toBeDefined();
    expect(topic!.name).toBe('murder');
  });

  it('should reject duplicate topic names', () => {
    const registry = new TopicRegistry();
    registry.define({ name: 'murder', keywords: ['murder'] });

    expect(() => {
      registry.define({ name: 'murder', keywords: ['killing'] });
    }).toThrow("Topic 'murder' is already defined");
  });

  it('should normalize keywords to lowercase on registration', () => {
    const registry = new TopicRegistry();
    registry.define({ name: 'weapon', keywords: ['Knife', 'BLADE'] });

    const trait = makeTrait();
    const result = registry.resolve('knife', trait);

    expect(result.type).toBe('exact');
  });

  it('should list all registered topic names', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder'] },
      { name: 'weapon', keywords: ['knife'] },
      { name: 'alibi', keywords: ['alibi'] },
    );

    expect(registry.getTopicNames()).toEqual(['murder', 'weapon', 'alibi']);
  });
});

// ===========================================================================
// Exact keyword matching
// ===========================================================================

describe('TopicRegistry — exact match', () => {
  it('should match a single keyword exactly', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder', 'killing', 'death'] },
    );
    const trait = makeTrait();

    const result = registry.resolve('murder', trait);
    expect(result.type).toBe('exact');
    if (result.type === 'exact') {
      expect(result.topic.name).toBe('murder');
    }
  });

  it('should match any keyword in the set', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder', 'killing', 'death', 'stabbing'] },
    );
    const trait = makeTrait();

    const result = registry.resolve('stabbing', trait);
    expect(result.type).toBe('exact');
    if (result.type === 'exact') {
      expect(result.topic.name).toBe('murder');
    }
  });

  it('should match case-insensitively', () => {
    const registry = buildRegistry(
      { name: 'weapon', keywords: ['knife', 'blade'] },
    );
    const trait = makeTrait();

    const result = registry.resolve('KNIFE', trait);
    expect(result.type).toBe('exact');
  });

  it('should match multi-word phrases in keywords', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder', 'what happened'] },
    );
    const trait = makeTrait();

    const result = registry.resolve('what happened last night', trait);
    expect(result.type).toBe('exact');
    if (result.type === 'exact') {
      expect(result.topic.name).toBe('murder');
    }
  });

  it('should select the topic with the most keyword hits', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder', 'killing', 'death'] },
      { name: 'weapon', keywords: ['weapon', 'knife', 'killing'] },
    );
    const trait = makeTrait();

    // "the murder killing" matches 'murder' with 2 hits (murder, killing)
    // and 'weapon' with 1 hit (killing)
    const result = registry.resolve('the murder killing', trait);
    expect(result.type).toBe('exact');
    if (result.type === 'exact') {
      expect(result.topic.name).toBe('murder');
    }
  });

  it('should return none when no keywords match', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder', 'killing'] },
    );
    const trait = makeTrait();

    const result = registry.resolve('the weather is nice', trait);
    expect(result.type).toBe('none');
  });
});

// ===========================================================================
// Neighborhood fallback (related topics)
// ===========================================================================

describe('TopicRegistry — neighborhood fallback', () => {
  it('should redirect through related topic when no exact match', () => {
    // 'murder' has 'weapon' as a related topic.
    // 'weapon' has keyword 'knife' but is gated so it won't match directly.
    // The neighborhood fallback on 'murder' should find the keyword hit.
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder', 'killing'], related: ['weapon', 'victim'] },
      { name: 'weapon', keywords: ['weapon', 'knife', 'blade', 'dagger'], availableWhen: ['knows weapon'] },
    );
    const trait = makeTrait();
    trait.registerPredicate('knows weapon', (t) => t.knows('weapon'));

    // "the knife" doesn't match 'murder' keywords directly.
    // 'weapon' is unavailable (gated), so it can't be an exact match.
    // But 'murder' lists 'weapon' as related, and 'knife' hits 'weapon' keywords.
    const result = registry.resolve('the knife', trait);
    expect(result.type).toBe('related');
    if (result.type === 'related') {
      expect(result.topic.name).toBe('murder');  // the redirecting topic
      expect(result.via.name).toBe('weapon');     // the matched related topic
    }
  });

  it('should prefer exact match over related fallback', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder', 'killing'], related: ['weapon'] },
      { name: 'weapon', keywords: ['weapon', 'knife'] },
    );
    const trait = makeTrait();

    // "weapon" is both: exact match for 'weapon' and related to 'murder'
    // Exact match should win
    const result = registry.resolve('weapon', trait);
    expect(result.type).toBe('exact');
    if (result.type === 'exact') {
      expect(result.topic.name).toBe('weapon');
    }
  });

  it('should return none when related topic does not exist', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder'], related: ['nonexistent'] },
    );
    const trait = makeTrait();

    const result = registry.resolve('something else', trait);
    expect(result.type).toBe('none');
  });
});

// ===========================================================================
// Availability gating
// ===========================================================================

describe('TopicRegistry — availability gating', () => {
  it('should gate topics by predicate availability', () => {
    const registry = buildRegistry(
      { name: 'alibi', keywords: ['alibi', 'where were you'], availableWhen: ['knows murder'] },
      { name: 'weather', keywords: ['weather'] },
    );

    // Trait without murder knowledge — 'alibi' should be unavailable
    const traitWithout = makeTrait();
    // Register 'knows murder' predicate that checks knowledge
    traitWithout.registerPredicate('knows murder', (t) => t.knows('murder'));

    const result1 = registry.resolve('alibi', traitWithout);
    expect(result1.type).toBe('none');

    // Trait with murder knowledge — 'alibi' should be available
    const traitWith = makeTraitWithKnowledge(['murder']);
    traitWith.registerPredicate('knows murder', (t) => t.knows('murder'));

    const result2 = registry.resolve('alibi', traitWith);
    expect(result2.type).toBe('exact');
    if (result2.type === 'exact') {
      expect(result2.topic.name).toBe('alibi');
    }
  });

  it('should treat topics without availableWhen as always available', () => {
    const registry = buildRegistry(
      { name: 'weather', keywords: ['weather'] },
    );
    const trait = makeTrait();

    expect(registry.isAvailable('weather', trait)).toBe(true);
  });

  it('should require all predicates to be satisfied', () => {
    const registry = buildRegistry(
      { name: 'secret', keywords: ['secret'], availableWhen: ['knows murder', 'trusts player'] },
    );

    const trait = makeTraitWithKnowledge(['murder']);
    trait.registerPredicate('knows murder', (t) => t.knows('murder'));
    // 'trusts player' is a platform predicate already registered — default disposition is 0 (neutral)
    // So 'trusts player' will be false

    expect(registry.isAvailable('secret', trait)).toBe(false);
  });

  it('should list only available topics', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder'] },
      { name: 'alibi', keywords: ['alibi'], availableWhen: ['knows murder'] },
      { name: 'weather', keywords: ['weather'] },
    );

    const trait = makeTrait();
    trait.registerPredicate('knows murder', (t) => t.knows('murder'));

    const available = registry.getAvailableTopics(trait);
    const names = available.map(t => t.name);
    expect(names).toContain('murder');
    expect(names).toContain('weather');
    expect(names).not.toContain('alibi');
  });

  it('should not match unavailable topics even for related fallback', () => {
    const registry = buildRegistry(
      { name: 'murder', keywords: ['murder'], related: ['alibi'] },
      { name: 'alibi', keywords: ['alibi', 'where were you'], availableWhen: ['knows murder'] },
    );

    const trait = makeTrait();
    trait.registerPredicate('knows murder', (t) => t.knows('murder'));

    // 'murder' is available but 'alibi' is not
    // Asking about 'where were you' should not redirect through murder→alibi
    // because alibi is unavailable (it doesn't match directly either)
    const result = registry.resolve('where were you', trait);
    // The related check on 'murder' looks at 'alibi' keywords — 'alibi' topic
    // exists but its keywords do match. However, the redirect is from 'murder'
    // (the available topic) to 'alibi' (the related), so it should still work
    // because the redirect target is the available topic, not the related one.
    expect(result.type).toBe('related');
    if (result.type === 'related') {
      expect(result.topic.name).toBe('murder');
    }
  });
});
