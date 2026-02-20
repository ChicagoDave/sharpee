import { useState, useEffect } from 'react';
import { useGameState } from '../context/GameContext';

/**
 * Tracks the current player character ID by watching for game.pc_switched events.
 * Used by ChatOverlay to determine message alignment (PC = right, NPC = left).
 */
export function useCurrentPc(): string {
  const { lastTurnEvents } = useGameState();
  const [pcId, setPcId] = useState<string>('');

  useEffect(() => {
    const switchEvent = lastTurnEvents.find(e => e.type === 'game.pc_switched');
    if (switchEvent) {
      const data = switchEvent.data as { newPlayerId: string };
      setPcId(data.newPlayerId);
    }
  }, [lastTurnEvents]);

  return pcId;
}
