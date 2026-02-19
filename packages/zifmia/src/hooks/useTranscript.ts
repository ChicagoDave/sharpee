/**
 * useTranscript - Hook for managing transcript display and scrolling
 */

import { useRef, useEffect, useCallback } from 'react';
import { useGameState } from '../context/GameContext';
import type { TranscriptEntry } from '../types/game-state';

interface UseTranscriptResult {
  /** Transcript entries */
  entries: TranscriptEntry[];
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Scroll to bottom of transcript */
  scrollToBottom: () => void;
  /** Current turn number */
  turn: number;
}

/**
 * Hook for accessing and managing the game transcript
 */
export function useTranscript(): UseTranscriptResult {
  const { transcript, turns } = useGameState();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcript updates.
  // Use requestAnimationFrame to ensure DOM has laid out new content.
  useEffect(() => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }, [transcript]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  return {
    entries: transcript,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    scrollToBottom,
    turn: turns,
  };
}
