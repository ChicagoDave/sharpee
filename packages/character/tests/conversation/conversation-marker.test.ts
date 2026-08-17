/**
 * conversation-marker.test.ts — ADR-310 D16 lifecycle rule, marker half:
 * dialogue stamps `activeConversation` on the speaker's trait (D17 — it
 * is serialized state), and freshness is turn distance against the
 * lifecycle's neutral decay threshold. Assertions land on trait state.
 */
import { describe, expect, it } from 'vitest';
import { CharacterModelTrait } from '@sharpee/world-model';
import {
  markConversationTurn,
  conversationSuppressesGoals,
} from '../../src/conversation/conversation-marker';
import { DEFAULT_DECAY_THRESHOLDS } from '../../src/conversation/lifecycle';

describe('markConversationTurn (D16 — the stamp)', () => {
  it('writes the partner and turn onto the trait', () => {
    const trait = new CharacterModelTrait();
    expect(trait.activeConversation).toBeUndefined();

    markConversationTurn(trait, 'player-1', 7);

    expect(trait.activeConversation).toEqual({ partnerId: 'player-1', lastTurn: 7 });
  });

  it('a later stamp overwrites the earlier one', () => {
    const trait = new CharacterModelTrait();
    markConversationTurn(trait, 'player-1', 3);
    markConversationTurn(trait, 'player-1', 9);

    expect(trait.activeConversation).toEqual({ partnerId: 'player-1', lastTurn: 9 });
  });

  it('the marker rides the constructor data path (save/restore shape)', () => {
    const trait = new CharacterModelTrait({
      activeConversation: { partnerId: 'player-1', lastTurn: 5 },
    });

    expect(trait.activeConversation).toEqual({ partnerId: 'player-1', lastTurn: 5 });
  });
});

describe('conversationSuppressesGoals (D16 — the window)', () => {
  const WINDOW = DEFAULT_DECAY_THRESHOLDS.neutral;

  it('no marker → pursuit proceeds (unmarked NPCs, pre-D16 saves)', () => {
    const trait = new CharacterModelTrait();
    expect(conversationSuppressesGoals(trait, 10)).toBe(false);
  });

  it('suppresses from the stamped turn through the last turn inside the window', () => {
    const trait = new CharacterModelTrait();
    markConversationTurn(trait, 'player-1', 10);

    expect(conversationSuppressesGoals(trait, 10)).toBe(true);
    expect(conversationSuppressesGoals(trait, 10 + WINDOW - 1)).toBe(true);
  });

  it('releases once the window has fully elapsed', () => {
    const trait = new CharacterModelTrait();
    markConversationTurn(trait, 'player-1', 10);

    expect(conversationSuppressesGoals(trait, 10 + WINDOW)).toBe(false);
  });
});
