/**
 * useProgress - Hook for tracking game progress
 */

import { useMemo } from 'react';
import { useGameState } from '../context/GameContext';

interface ProgressStats {
  /** Current score */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Score as percentage (0-100) */
  percentage: number;
  /** Number of turns taken */
  turns: number;
  /** Number of rooms visited */
  roomsVisited: number;
  /** Total rooms discovered (may include unvisited adjacent rooms) */
  roomsDiscovered: number;
}

interface UseProgressResult {
  /** Current progress statistics */
  stats: ProgressStats;
  /** Formatted score string (e.g., "50/350") */
  scoreText: string;
  /** Formatted percentage string (e.g., "14%") */
  percentageText: string;
}

/**
 * Hook for tracking and displaying game progress
 */
export function useProgress(): UseProgressResult {
  const { score, maxScore, turns } = useGameState();

  const stats = useMemo<ProgressStats>(() => {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return {
      score,
      maxScore,
      percentage,
      turns,
      roomsVisited: 0, // TODO: Track from map context
      roomsDiscovered: 0, // TODO: Track from map context
    };
  }, [score, maxScore, turns]);

  const scoreText = maxScore > 0 ? `${score}/${maxScore}` : String(score);
  const percentageText = `${stats.percentage}%`;

  return {
    stats,
    scoreText,
    percentageText,
  };
}
